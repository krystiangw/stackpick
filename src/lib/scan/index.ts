import {
  discover,
  isFiledAsDocumentation,
  normalizeDomain,
  searchNpmForDomain,
  type Discovered,
  type ResolvedElsewhere,
} from './discover'
import {
  AGENT_UA,
  fetchUrl,
  fetchWithRetries,
  inParallel,
  inPhase,
  isBotChallenge,
  looksLikeHtml,
  NAMED_CRAWLERS,
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
   * How much less an agent user-agent is served on the documentation page than a browser is, as
   * a share of the browser's visible text. Null when there is no documentation page or the agent
   * was refused outright, because a refusal is a different finding and already has its own check.
   */
  docsThinnerForAgents: number | null
  /**
   * Named AI crawlers refused at a documentation URL a browser is served. Separate from the door
   * test, which asks as us: robots.txt can permit an agent while the edge in front of it does not,
   * and only one of those two is what a crawler experiences.
   */
  crawlersRefused: { name: string; status: number }[]
  /**
   * Whether anything substantive was read despite the door being shut. vonage.com answered 403 on
   * its marketing host while we successfully read its llms.txt, its documentation and its package,
   * and five checks still dropped out saying every request had been refused.
   */
  readAnything: boolean
  /** 429 is us asking too often, not the site refusing agents. Never a finding about them. */
  rateLimitedUs: boolean
  /**
   * The edge answered with a JavaScript challenge rather than a limit. This is the opposite of
   * rateLimitedUs and has to be scored, not excused: a challenge a browser solves invisibly is
   * one no HTTP client can solve at all, which is precisely the difference this scan measures.
   */
  botChallenge: boolean
  /**
   * Set when the domain we were asked about serves another company's site, so every measurement
   * below is off that other site and says so. Null on nearly every scan.
   */
  resolvedElsewhere: ResolvedElsewhere | null
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
  /**
   * The most text any documentation page in this scan rendered to a plain fetch. Measured over
   * every page we read, not over the entry point alone: the entry point is a navigation shell on
   * exactly the sites this check is meant to catch, and answering "can an agent read your docs"
   * with the thinnest page we hold is a verdict against evidence already in hand.
   */
  docsTextChars: number
  /** Which page that number came off, so the claim names a page a vendor can fetch themselves. */
  docsTextCharsFrom: string | null
  /** How many documents the provisioning grep actually had to read. */
  docsPagesRead: number
  /** Which ones. A verdict about documentation is only reproducible if we name what we read. */
  docsPagesReadUrls: string[]
  /**
   * Documentation pages we picked and then could not fetch. Silence in a page we never got is not
   * silence in their documentation: postmark.com answers its credential page here and refused it
   * to the dyno, and the scan published "no programmatic credential creation described" about a
   * vendor whose Account API creates keys.
   */
  docsPagesUnread: number
  robots: RobotsFindings
  machine: MachineFindings
  funnel: FunnelFindings
  npm: NpmFindings
  /** Null on a scan that finished inside its budget, which is nearly all of them. */
  truncation: ScanTruncation | null
}

export class UnreachableDomainError extends Error {}

const CREDENTIAL_PAGE_HINTS =
  /(api[-_ ]?(?:app[-_ ]?)?keys?|authentication|auth(\/|$)|credential|token|management|provisioning|admin|account|getting[-_ ]?started|quickstart|reference)/i

/**
 * We read three documentation pages out of what can be hundreds, so which three decides the
 * verdict. Taking them in the order the page or the sitemap happens to list them made that a
 * lottery: amplitude.com scored 1 of 7 provisioning phrases on one scan and 0 on the next, from
 * a different three. Ranking by how directly a path promises credentials makes the sample the
 * same every time, and makes it the sample most likely to answer the question.
 */
const HINT_PRIORITY = [
  // datadoghq.com files theirs at /account_management/api-app-keys, which "api-key" does not
  // match, so the page the check is asking about ranked below their access-control page.
  /api[-_ ]?(?:app[-_ ]?)?keys?/i,
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

/**
 * Pages about somebody else's credentials. Datadog documents every cloud resource its agent can
 * see, so the three best-ranked pages on the whole site were gcp_apikeys_key, aws_location_api_key
 * and aws_apigateway_apikey, while account_management/api-app-keys, which is the page the check is
 * asking about, was never opened. A path can carry the word and be about another company.
 */
const THIRD_PARTY_CREDENTIAL_PAGES = /resource[-_]catalog|\/integrations?\/|(^|[/_])(aws|gcp|azure|google|alibaba)[-_]/i

function hintRank(pathname: string): number {
  if (THIRD_PARTY_CREDENTIAL_PAGES.test(pathname)) return HINT_PRIORITY.length + 1
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
  // The documentation is not always on the name we were asked about: postmark.com redirects to
  // postmarkapp.com, and all 50 credential pages in the sitemap we had open were thrown away by a
  // same-site test written against the scanned name, leaving one link off the front page as the
  // whole evidence for the provisioning check. Widened to the documentation host and nothing
  // above it: that host is one this scan already accepted as the vendor's documentation, while
  // its registration can be a public suffix that would let a stranger's pages in.
  const ownSites = [...new Set([domain, base.hostname.replace(/^www\./, '')])]
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

    // Filtered on the raw string before anything is parsed, because truncating first threw away
    // the answer: algolia.com's API-key pages sit from entry 816 and launchdarkly.com's whole
    // /docs/api/access-tokens section from 853, and both were cut before ranking ever ran. The
    // hint is a substring test on the URL, so the full sitemap costs no URL object per entry, and
    // what survives it is small enough to sort. Kept as a cap of its own against a hostile file.
    const ranked = pages
      .filter((page) => CREDENTIAL_PAGE_HINTS.test(page))
      .slice(0, 2_000)
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
      const host = url.hostname.replace(/^www\./, '')
      const sameSite = ownSites.some((site) => host === site || host.endsWith(`.${site}`))
      if (!sameSite || seen.has(clean)) continue
      if (!CREDENTIAL_PAGE_HINTS.test(url.pathname)) continue
      if (!isDocumentationPage(clean, docsUrl)) continue
      seen.add(clean)
      found.push(clean)
    }
    if (found.length >= want) break
  }
  return found
}

/** Follows a few same-host documentation links that look like they discuss credentials. */
async function readDeeper(
  domain: string,
  docsUrl: string,
  html: string,
  /**
   * Set only when the scanned brand redirects into another company's site. sendgrid.com lands on
   * twilio.com, whose documentation covers a dozen products, and every page we read was about
   * Twilio Chat and Authy. We published those numbers under SendGrid's name.
   */
  mustMention: string | null = null,
): Promise<{ pages: Fetched[]; unreadable: number }> {
  const base = new URL(docsUrl)
  const seen = new Set<string>([docsUrl])
  const fromLinks: string[] = []

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
    if (!isDocumentationPage(url, docsUrl)) continue
    seen.add(url)
    fromLinks.push(url)
  }

  // Both sources are ranked together rather than one being tried only when the other comes up
  // short. Being in the served HTML said nothing about being the better page: elastic.co links
  // /docs/cloud-account and /docs/reference from its docs front page, and the pages that answer
  // the question are in its sitemap, which we never opened because three links were enough.
  const fromSitemap = await sitemapCandidates(domain, docsUrl, seen, 3)
  const onBrand = (url: string) => !mustMention || url.toLowerCase().includes(mustMention)
  const candidates = [...fromLinks, ...fromSitemap].filter(onBrand).sort(byHint).slice(0, 3)

  const pages = await inParallel(candidates, (url) => fetchUrl(url))
  const readable = pages.filter((page) => page.ok)
  return { pages: readable, unreadable: pages.length - readable.length }
}

/**
 * Whether a page belongs to the documentation, as opposed to somewhere else on the same site
 * whose URL happens to carry a credential word. A sitemap read whole is full of them:
 * ckeditor.com/solutions/content-management and a liveblocks.io blog post about rolling API keys
 * both outrank real documentation on the hint alone, and the verdict then calls them "the
 * documentation pages we read".
 */
function isDocumentationPage(pageUrl: string, docsUrl: string): boolean {
  let page: URL
  let docs: URL
  try {
    page = new URL(pageUrl)
    docs = new URL(docsUrl)
  } catch {
    return false
  }
  // Off the host the documentation is on, where the vendor files the page is all we have.
  if (page.origin !== docs.origin) return isFiledAsDocumentation(pageUrl)
  const section = docs.pathname.split('/').filter(Boolean)[0]
  return !section || page.pathname.split('/').filter(Boolean)[0] === section
}

/**
 * How much of the documentation renders without JavaScript, measured over every documentation
 * page this scan read rather than over the one page the ranker chose to call the entry point.
 * Those two questions have different answers on the sites where it matters: chargebee.com's docs
 * front page is a navigation shell rendering 14 characters, and the same scan had already read
 * 8,856 characters off /docs/billing/2.0/site-configuration/api_keys. Publishing the shell as the
 * measurement of the whole site was a claim we held the evidence against.
 */
function docsWithoutJs(docsUrl: string | null, pages: Fetched[]): { chars: number; from: string | null } {
  let best: { chars: number; from: string | null } = { chars: 0, from: null }
  if (!docsUrl) return best
  for (const page of pages) {
    // HTML only: a markdown file renders all of itself without JavaScript by construction, and
    // reading one would answer a different question than the one this check asks.
    if (!page.ok || !looksLikeHtml(page) || !isDocumentationPage(page.url, docsUrl)) continue
    const chars = visibleTextLength(page.body)
    if (chars > best.chars) best = { chars, from: page.url }
  }
  return best
}

export type ScanProgress = (step: { label: string; done: number; total: number }) => void

const STEPS = 5

/** Well inside the scan budget, so a slow registry cannot take the rest of the scan with it. */
const NPM_PHASE_BUDGET_MS = 9_000

type Phase = 'discovery' | 'door' | 'docs' | 'robots' | 'machine' | 'funnel' | 'npm'

/**
 * Cloaking, measured rather than asserted. Only counted when the agent was answered at all: a
 * 403 is the door test's finding and reporting it twice would charge a vendor twice for one fact.
 * The threshold is deliberately coarse, because a page that renders a personalised banner to a
 * browser differs by a few percent and that is not cloaking.
 */
function thinnerForAgents(asBrowser: Fetched | null | undefined, asAgent: Fetched | null): number | null {
  if (!asBrowser?.ok || !asAgent?.ok) return null
  const browserText = visibleTextLength(asBrowser.body)
  if (browserText < 2_000) return null
  const share = 1 - visibleTextLength(asAgent.body) / browserText
  return share > 0.5 ? share : null
}

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

  // A brand living on another company's site has its own section of that documentation, and
  // reading the host's index instead measures the host. twilio.com/docs/sendgrid is SendGrid's;
  // twilio.com/docs is Twilio's.
  const brandOnHost = found.resolvedElsewhere ? domain.split('.')[0].toLowerCase() : null
  const brandSection =
    brandOnHost && found.docs && !found.docs.toLowerCase().includes(brandOnHost)
      ? await fetchUrl(`${found.docs.replace(/\/$/, '')}/${brandOnHost}`)
      : null
  if (brandSection?.ok && visibleTextLength(brandSection.body) > 0) {
    found.docs = brandSection.url
    found.docsPage = brandSection
  }

  report(found.docs ? `Reading ${new URL(found.docs).pathname}` : 'Looking for documentation', 1)
  const docsPage = found.docsPage
  const docsText = docsPage?.ok ? docsPage.body : ''

  // Nothing below this line depends on anything else below it, and running the six of them
  // one after another was most of a scan: the door test waited on nobody and went third.
  const doorPending = phase('door', () => fetchWithRetries(found.site, { ua: AGENT_UA }))
  // The documentation page as an agent sees it. Every other read on this scan is a browser, so
  // a site that serves agents a thinner page than it serves Chrome was invisible to us anywhere
  // except the front door. Same URL, same moment, only the user-agent differs.
  const docsAsAgentPending = phase('docs', async () =>
    found.docs ? fetchUrl(found.docs, { ua: AGENT_UA, fresh: true }) : null,
  )
  // The same page asked as the crawlers an edge has heard of. Our own user agent is a string
  // nobody has a rule for, which is a clean measurement of a question nobody asked.
  const namedCrawlersPending = phase('docs', async () =>
    found.docs
      ? inParallel([...NAMED_CRAWLERS], async (crawler) => ({
          name: crawler.name,
          got: await fetchUrl(found.docs as string, { ua: crawler.ua, fresh: true }),
        }))
      : [],
  )
  // One documentation page is a lottery: cloudinary describes its Provisioning API on a page
  // we never opened, then failed the check for not describing it. Follow the pages an agent
  // hunting for credentials would follow.
  // Only the pages filed under the brand we were asked about, when that brand's site is
  // somebody else's. Everything on twilio.com/docs is documentation; almost none of it is
  // SendGrid's, and a scorecard headed sendgrid.com must not be measuring Twilio Chat.
  const docsPending = phase('docs', async () =>
    docsPage?.ok && found.docs
      ? readDeeper(domain, found.docs, docsPage.body, brandOnHost)
      : { pages: [], unreadable: 0 },
  )
  const robotsPending = phase('robots', () => scanRobots(found.site))
  const machinePending = phase('machine', () =>
    scanMachineContext(
      found.site,
      found.docs,
      docsPending.then((deeper) => deeper.pages.map((page) => page.url)),
    ),
  )
  // Capped on its own, because it is the phase that grew: attribution went from 7.8 to 14.2
  // registry requests per domain and sentry.io then spent the whole scan budget, losing six
  // checks that had nothing to do with npm. One check coming back unmeasured is a far better
  // failure than six, and the registry is the one host we can give up on without a finding.
  const npmPending = phase('npm', () =>
    Promise.race([
      resolvePackage(domain, found),
      new Promise<NpmFindings>((resolve) =>
        setTimeout(() => resolve({ package: null, found: false }), NPM_PHASE_BUDGET_MS),
      ),
    ]),
  )
  const funnelPending = phase('funnel', () =>
    scanFunnel({
      domain,
      site: found.site,
      // The funnel greps documentation prose, so the corpus is every document this scan read:
      // the docs pages, the home page, and the files the vendor publishes for machines. Leaving
      // llms.txt out of it meant trigger.dev scored zero for not documenting the Management API
      // named in the llms.txt we had open. It is handed over unresolved: the grep is the last
      // thing the funnel does, so nothing here waits on it.
      corpus: Promise.all([docsPending, machinePending]).then(([deeper, machine]) =>
        [docsText, ...deeper.pages.map((page) => page.body), found.home.body, machine.llmsCorpus].join('\n'),
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

  const [asAgent, docsAsAgent, namedCrawlers, deeperDocs, robots, machine, npm, funnel] = await Promise.all([
    doorPending,
    docsAsAgentPending,
    namedCrawlersPending,
    docsPending,
    robotsPending,
    machinePending,
    npmPending,
    funnelPending,
    progress,
  ])
  // A 429 carrying a challenge marker is the vendor's wall, not our load, and the two have to be
  // told apart before either is scored: pandadoc.com answers every request this way and was
  // getting six checks lifted out of its denominator for it.
  const botChallenge = isBotChallenge(asAgent)
  // Only when a 429 is all we ever got. postmark.com answered 200, 429, 200 and the whole door
  // test went unmeasurable with the sentence "Unmeasurable: answered 200", which is nonsense: two
  // of three tries told us exactly what we asked.
  const rateLimitedUs =
    !botChallenge &&
    asAgent.statusesSeen.length > 0 &&
    asAgent.statusesSeen.every((status) => status === 429)
  report('Scoring', STEPS)

  const readable = docsWithoutJs(found.docs, [...(docsPage ? [docsPage] : []), ...deeperDocs.pages])
  const documentsRead = [
    ...(docsPage?.ok && found.docs ? [found.docs] : []),
    ...deeperDocs.pages.map((page) => page.url),
    ...machine.llmsUrls,
  ]

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
    docsThinnerForAgents: thinnerForAgents(docsPage, docsAsAgent),
    // Only when the browser was served: a page nobody can read is not a page that discriminates.
    // Not 429. That is our own load speaking, and the rest of this scanner already says so: a 429
    // makes a check unmeasurable rather than failed. savvycal.com was published as refusing
    // ChatGPT-User on the strength of one, and answers every named agent 200 when asked once.
    crawlersRefused: docsPage?.ok
      ? namedCrawlers
          .filter(({ got }) => got.status >= 400 && got.status !== 429)
          .map(({ name, got }) => ({ name, status: got.status }))
      : [],
    readAnything:
      docsText.length > 0 ||
      machine.findings.hasLlmsTxt ||
      robots.present ||
      Boolean(found.pricingPage?.ok) ||
      Boolean(funnel.signup.url),
    rateLimitedUs,
    botChallenge,
    resolvedElsewhere: found.resolvedElsewhere,
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
    docsTextChars: readable.chars,
    docsTextCharsFrom: readable.from,
    // The corpus and the count of what it was read from have to be the same thing, or the
    // sentence describes a body of evidence the verdict was not taken from.
    docsPagesRead: documentsRead.length,
    docsPagesReadUrls: documentsRead,
    docsPagesUnread: deeperDocs.unreadable,
    robots,
    machine: machine.findings,
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

  const searched = await searchNpmForDomain(domain, found.githubRepo ? [found.githubRepo] : [])
  if (!searched || searched.name === found.npmPackage) return scraped
  const retried = await checkNpm(searched.name)
  if (!retried.found) return scraped

  found.npmPackage = searched.name
  found.npmSource = 'registry-search'
  found.npmConfidence = searched.confidence
  return retried
}

export { normalizeDomain }
