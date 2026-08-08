import { discover, normalizeDomain, searchNpmForDomain, type Discovered } from './discover'
import {
  AGENT_UA,
  fetchUrl,
  fetchWithRetries,
  inParallel,
  inPhase,
  ranOutOfTime,
  SCAN_BUDGET_MS,
  visibleTextLength,
  withScanBudget,
  type Fetched,
} from './http'
import { scanFunnel, type FunnelFindings } from './funnel'
import { scanMachineContext, type MachineFindings } from './machine'
import { checkNpm, type NpmFindings } from './npm'
import { scanRobots, type RobotsFindings } from './robots'

/**
 * Set only when the scan hit its wall-clock budget with work still outstanding, and never on a
 * scan that finished. Every check named here has no evidence behind it, so it has to be
 * reported as unmeasured: a truncated scan that reads like a complete one is a worse product
 * than the 503 this budget replaces, because a measured zero is an accusation.
 */
export type ScanTruncation = {
  budgetMs: number
  elapsedMs: number
  /** The phases that were still fetching when time ran out, in the words the report uses. */
  incompletePhases: string[]
  /** Check ids from score.ts whose only evidence is one of those phases. */
  unmeasuredChecks: string[]
  /** The sentence to show in place of a measured result. */
  detail: string
}

export type ScanFindings = {
  domain: string
  site: string
  scannedAt: string
  homeStatus: number
  /** What the site answers a browser, kept so we can show the pair. */
  browserStatus: number
  /** What it answers an honest agent user-agent, which is the finding that matters. */
  agentStatus: number
  agentStatusesSeen: number[]
  blocksPlainRequests: boolean
  /**
   * Whether anything substantive was read despite the door being shut. vonage.com answered 403 on
   * its marketing host while we successfully read its llms.txt, its documentation and its package,
   * and five checks still dropped out saying every request had been refused.
   */
  readAnything: boolean
  /** 429 is us asking too often, not the site refusing agents. Never a finding about them. */
  rateLimitedUs: boolean
  durationMs: number
  discovered: {
    docs: string | null
    pricing: string | null
    signup: string | null
    npmPackage: string | null
    npmSource: 'site' | 'docs' | 'llms' | 'registry-search' | null
    npmConfidence: 'strong' | 'weak' | null
    npmEntryShape: boolean | null
    githubRepo: string | null
    linkSources: { docs: string | null; pricing: string | null; signup: string | null }
  }
  homeTextChars: number
  docsTextChars: number
  /** How many documentation pages the provisioning grep actually had to read. */
  docsPagesRead: number
  /** Which ones. A verdict about documentation is only reproducible if we name what we read. */
  docsPagesReadUrls: string[]
  robots: RobotsFindings
  machine: MachineFindings
  funnel: FunnelFindings
  npm: NpmFindings
  /** Null on a scan that finished inside its budget, which is nearly all of them. */
  truncation: ScanTruncation | null
}

export class UnreachableDomainError extends Error {}

const CREDENTIAL_PAGE_HINTS =
  /(api[-_ ]?key|authentication|auth(\/|$)|credential|token|management|provisioning|admin|account|getting[-_ ]?started|quickstart|reference)/i

/**
 * We read three documentation pages out of what can be hundreds, so which three decides the
 * verdict. Taking them in the order the page or the sitemap happens to list them made that a
 * lottery: amplitude.com scored 1 of 7 provisioning phrases on one scan and 0 on the next, from
 * a different three. Ranking by how directly a path promises credentials makes the sample the
 * same every time, and makes it the sample most likely to answer the question.
 */
const HINT_PRIORITY = [
  /api[-_ ]?key/i,
  /credential/i,
  /provisioning/i,
  /token/i,
  /management/i,
  /admin/i,
  /authentication|auth(\/|$)/i,
  /account/i,
  /getting[-_ ]?started|quickstart/i,
  /reference/i,
]

function hintRank(pathname: string): number {
  const index = HINT_PRIORITY.findIndex((pattern) => pattern.test(pathname))
  return index === -1 ? HINT_PRIORITY.length : index
}

/** Ties break on the shorter path: /docs/api-keys is the page, /docs/api-keys/rotating is a detail. */
const byHint = (a: string, b: string) => {
  const ranked = hintRank(new URL(a).pathname) - hintRank(new URL(b).pathname)
  return ranked !== 0 ? ranked : new URL(a).pathname.length - new URL(b).pathname.length
}

/**
 * Documentation navigation is assembled by JavaScript on most of the sites that have the most
 * documentation, so the served HTML carries no links and we read one page and concluded nothing:
 * auth0.com, supabase.com and workos.com all failed the provisioning check that way. A sitemap is
 * static, so it survives the same rendering that hides the nav.
 */
async function sitemapCandidates(domain: string, docsUrl: string, seen: Set<string>, want: number): Promise<string[]> {
  const base = new URL(docsUrl)
  // The docs section usually has its own sitemap under its first path segment. Trying the whole
  // documentation path instead sent us to /docs/get-started/sitemap.xml, which nobody publishes.
  const section = base.pathname.split('/').filter(Boolean)[0]
  // The page a home page links to as "developers" is not always the documentation: auth0.com
  // links a developer portal whose sitemap is events and newsletters, so the reference we
  // needed was never in the corpus. Fall back to where documentation conventionally lives.
  const roots = [
    ...(section ? [`${base.origin}/${section}/sitemap.xml`] : []),
    `${base.origin}/sitemap.xml`,
    `https://${domain}/docs/sitemap.xml`,
    `https://docs.${domain}/sitemap.xml`,
  ]
  const found: string[] = []

  for (const root of [...new Set(roots)]) {
    const got = await fetchUrl(root, { accept: 'application/xml, text/xml' })
    if (!got.ok) continue
    const locs = [...got.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((match) => match[1])

    // A sitemap index points at more sitemaps. Follow one, and only one that looks like docs.
    const nested = locs.find((loc) => loc.endsWith('.xml') && /doc|guide|reference/i.test(loc))
    const pages = nested ? [...locs.filter((loc) => !loc.endsWith('.xml'))] : locs
    if (nested) {
      const child = await fetchUrl(nested, { accept: 'application/xml, text/xml' })
      if (child.ok) pages.push(...[...child.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((match) => match[1]))
    }

    // Bounded and keyed before sorting: a hostile sitemap can carry twenty thousand entries, and
    // comparing them built three URL objects per comparison on the thread serving every request.
    const ranked = pages
      .slice(0, 500)
      .map((page) => {
        try {
          return { page, path: new URL(page).pathname }
        } catch {
          return null
        }
      })
      .filter((entry): entry is { page: string; path: string } => entry !== null)
      .sort((a, b) => hintRank(a.path) - hintRank(b.path) || a.path.length - b.path.length)
      .map((entry) => entry.page)
    for (const page of ranked) {
      if (found.length >= want) break
      let url: URL
      try {
        url = new URL(page)
      } catch {
        continue
      }
      const clean = url.toString().split('#')[0]
      // Same site rather than same host, because the fallback roots are deliberately elsewhere.
      // On the label boundary: without the dot, scanning ank.com would follow mybank.com.
      const sameSite = url.hostname === domain || url.hostname.endsWith(`.${domain}`)
      if (!sameSite || seen.has(clean)) continue
      if (!CREDENTIAL_PAGE_HINTS.test(url.pathname)) continue
      seen.add(clean)
      found.push(clean)
    }
    if (found.length >= want) break
  }
  return found
}

/** Follows a few same-host documentation links that look like they discuss credentials. */
async function readDeeper(domain: string, docsUrl: string, html: string): Promise<Fetched[]> {
  const base = new URL(docsUrl)
  const seen = new Set<string>([docsUrl])
  const candidates: string[] = []

  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)) {
    let absolute: URL
    try {
      absolute = new URL(match[1].replace(/&amp;/gi, '&'), docsUrl)
    } catch {
      continue
    }
    const url = absolute.toString().split('#')[0]
    if (absolute.hostname !== base.hostname || seen.has(url)) continue
    if (!CREDENTIAL_PAGE_HINTS.test(absolute.pathname)) continue
    seen.add(url)
    candidates.push(url)
  }
  candidates.sort(byHint)
  candidates.splice(3)

  if (candidates.length < 3) {
    candidates.push(...(await sitemapCandidates(domain, docsUrl, seen, 3 - candidates.length)))
  }

  const pages = await inParallel(candidates, (url) => fetchUrl(url))
  return pages.filter((page) => page.ok)
}

export type ScanProgress = (step: { label: string; done: number; total: number }) => void

const STEPS = 5

type Phase = 'discovery' | 'door' | 'docs' | 'robots' | 'machine' | 'funnel' | 'npm'

/**
 * What each phase is the sole evidence for. A phase that never finished cannot support a
 * verdict on any of its checks, and score.ts has to read them off this list rather than
 * scoring the empty findings the phase left behind.
 */
const PHASE_EVIDENCE: Record<Phase, { doing: string; checks: string[] }> = {
  discovery: {
    doing: 'finding your documentation, pricing and signup pages',
    checks: [
      'docs_without_js',
      'programmatic_provisioning',
      'self_serve',
      'signup_no_captcha',
      'signup_reachable',
      'typed_package',
    ],
  },
  door: { doing: 'testing what you answer an agent user-agent', checks: ['answers_plain_request'] },
  docs: { doing: 'reading your documentation pages', checks: ['programmatic_provisioning'] },
  robots: { doing: 'reading robots.txt', checks: ['user_agents_allowed', 'no_crawl_delay'] },
  machine: {
    doing: 'probing llms.txt, .well-known and OpenAPI',
    checks: ['llms_txt', 'machine_readable_api', 'mcp_present'],
  },
  funnel: {
    doing: 'probing agent entry points, MCP, OAuth, signup and pricing',
    checks: [
      'agent_entry_point',
      'oauth_dcr',
      'mcp_present',
      'signup_no_captcha',
      'signup_reachable',
      'self_serve',
    ],
  },
  npm: { doing: 'reading the package registry', checks: ['typed_package'] },
}

function truncationOf(incomplete: Set<Phase>, budgetMs: number, elapsedMs: number): ScanTruncation | null {
  if (incomplete.size === 0) return null
  const phases = [...incomplete].map((phase) => PHASE_EVIDENCE[phase])
  return {
    budgetMs,
    elapsedMs,
    incompletePhases: phases.map((phase) => phase.doing),
    unmeasuredChecks: [...new Set(phases.flatMap((phase) => phase.checks))],
    // Read once per check, so it says what happened to that check rather than reciting the
    // whole list of what else was still running. The list is above, for the report to show once.
    detail: `Unmeasurable: the scan ran out of time after ${Math.round(elapsedMs / 1000)} seconds and this was never tested. It is not a finding about you, and a rescan usually completes.`,
  }
}

export async function scanDomain(input: string, onProgress?: ScanProgress): Promise<ScanFindings> {
  const domain = normalizeDomain(input)
  return withScanBudget(SCAN_BUDGET_MS, () => scanWithinBudget(domain, onProgress))
}

async function scanWithinBudget(domain: string, onProgress?: ScanProgress): Promise<ScanFindings> {
  const startedAt = Date.now()
  const report = (label: string, done: number) => onProgress?.({ label, done, total: STEPS })

  const incomplete = new Set<Phase>()
  /** Runs a phase and remembers whether the deadline took any of its evidence with it. */
  const phase = async <T>(name: Phase, run: () => Promise<T>): Promise<T> => {
    const { value, lostEvidence } = await inPhase(run)
    if (lostEvidence > 0) incomplete.add(name)
    return value
  }

  report(`Resolving ${domain}`, 0)
  const found: Discovered = await phase('discovery', () => discover(domain))

  // A 403 to a plain request is not a failed scan, it is the strongest finding this tool
  // can produce: the site turns agents away at the door. Only a dead name is an error.
  if (found.home.status === 0) {
    throw new UnreachableDomainError(
      ranOutOfTime(found.home)
        ? `${domain} did not answer within the ${Math.round(SCAN_BUDGET_MS / 1000)} seconds we allow for a scan.`
        : found.home.error?.startsWith('Blocked:')
          ? found.home.error.replace('Blocked: ', '')
          : `${domain} did not respond. Check the spelling, or the site may be down.`,
    )
  }

  report(found.docs ? `Reading ${new URL(found.docs).pathname}` : 'Looking for documentation', 1)
  const docsPage = found.docsPage
  const docsText = docsPage?.ok ? docsPage.body : ''

  // Nothing below this line depends on anything else below it, and running the six of them
  // one after another was most of a scan: the door test waited on nobody and went third.
  const doorPending = phase('door', () => fetchWithRetries(found.site, { ua: AGENT_UA }))
  // One documentation page is a lottery: cloudinary describes its Provisioning API on a page
  // we never opened, then failed the check for not describing it. Follow the pages an agent
  // hunting for credentials would follow.
  const docsPending = phase('docs', async () =>
    docsPage?.ok && found.docs ? readDeeper(domain, found.docs, docsPage.body) : [],
  )
  const robotsPending = phase('robots', () => scanRobots(found.site))
  const machinePending = phase('machine', () => scanMachineContext(found.site, found.docs))
  const npmPending = phase('npm', () => resolvePackage(domain, found))
  const funnelPending = phase('funnel', () =>
    scanFunnel({
      domain,
      site: found.site,
      // The funnel greps documentation prose, so the corpus is every docs page we read plus
      // home. It is handed over unresolved: the grep is the last thing it does.
      corpus: docsPending.then((deeper) =>
        [docsText, ...deeper.map((page) => page.body), found.home.body].join('\n'),
      ),
      pricingUrl: found.pricing,
      signupUrl: found.signup,
      alreadyFetchedPricing: found.pricingPage,
      pricesVisibleWithoutJs: found.pricesVisibleWithoutJs,
    }),
  )

  // Reported in a fixed order so the bar never runs backwards, and awaited in the same
  // expression as the work so a phase that rejects has a handler before anything is awaited.
  const progress = (async () => {
    await robotsPending
    report('Checking robots.txt against 13 AI crawlers', 2)
    await machinePending
    report('Probing llms.txt, .well-known and OpenAPI', 3)
    await funnelPending
    report('Testing signup and agent entry points', 4)
  })()

  const [asAgent, deeperDocs, robots, machine, npm, funnel] = await Promise.all([
    doorPending,
    docsPending,
    robotsPending,
    machinePending,
    npmPending,
    funnelPending,
    progress,
  ])
  // Only when a 429 is all we ever got. postmark.com answered 200, 429, 200 and the whole door
  // test went unmeasurable with the sentence "Unmeasurable: answered 200", which is nonsense: two
  // of three tries told us exactly what we asked.
  const rateLimitedUs =
    asAgent.statusesSeen.length > 0 && asAgent.statusesSeen.every((status) => status === 429)
  report('Scoring', STEPS)

  return {
    domain,
    site: found.site,
    scannedAt: new Date().toISOString(),
    homeStatus: asAgent.status,
    browserStatus: found.home.status,
    agentStatus: asAgent.status,
    agentStatusesSeen: asAgent.statusesSeen,
    // Still "we could not read it", so everything downstream stays unmeasurable rather than
    // silently becoming a measured absence. What changes is who it is a finding about: a 429
    // says we asked too often. auth0.com read as blocked only after we had scanned it four
    // times in a row while testing repeatability, and calling that a WAF would be an accusation.
    blocksPlainRequests: !asAgent.ok,
    readAnything:
      docsText.length > 0 ||
      machine.hasLlmsTxt ||
      robots.present ||
      Boolean(found.pricingPage?.ok) ||
      Boolean(funnel.signup.url),
    rateLimitedUs,
    durationMs: Date.now() - startedAt,
    discovered: {
      docs: found.docs,
      pricing: found.pricing,
      signup: found.signup,
      npmPackage: found.npmPackage,
      npmSource: found.npmSource,
      npmConfidence: found.npmConfidence,
      npmEntryShape: found.npmEntryShape,
      githubRepo: found.githubRepo,
      linkSources: found.linkSources,
    },
    homeTextChars: visibleTextLength(found.home.body),
    docsTextChars: visibleTextLength(docsText),
    docsPagesRead: (docsPage?.ok ? 1 : 0) + deeperDocs.length,
    docsPagesReadUrls: [...(docsPage?.ok && found.docs ? [found.docs] : []), ...deeperDocs.map((page) => page.url)],
    robots,
    machine,
    funnel,
    npm,
    truncation: truncationOf(incomplete, SCAN_BUDGET_MS, Date.now() - startedAt),
  }
}

/**
 * A name lifted from a page that the registry has never heard of is our parsing error far more
 * often than it is a missing SDK, so we ask the registry before scoring a zero.
 */
async function resolvePackage(domain: string, found: Discovered): Promise<NpmFindings> {
  const scraped = await checkNpm(found.npmPackage)
  if (!found.npmPackage || scraped.found || found.npmSource === 'registry-search') return scraped

  const searched = await searchNpmForDomain(domain, found.githubRepo)
  if (!searched || searched.name === found.npmPackage) return scraped
  const retried = await checkNpm(searched.name)
  if (!retried.found) return scraped

  found.npmPackage = searched.name
  found.npmSource = 'registry-search'
  found.npmConfidence = searched.confidence
  return retried
}

export { normalizeDomain }
