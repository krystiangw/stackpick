import { discover, normalizeDomain, searchNpmForDomain, type Discovered } from './discover'
import { AGENT_UA, fetchUrl, fetchWithRetries, inParallel, visibleTextLength, type Fetched } from './http'
import { scanFunnel, type FunnelFindings } from './funnel'
import { scanMachineContext, type MachineFindings } from './machine'
import { checkNpm, type NpmFindings } from './npm'
import { scanRobots, type RobotsFindings } from './robots'

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
  robots: RobotsFindings
  machine: MachineFindings
  funnel: FunnelFindings
  npm: NpmFindings
}

export class UnreachableDomainError extends Error {}

const CREDENTIAL_PAGE_HINTS =
  /(api[-_ ]?key|authentication|auth(\/|$)|credential|token|management|provisioning|admin|account|getting[-_ ]?started|quickstart|reference)/i

/** Follows a few same-host documentation links that look like they discuss credentials. */
async function readDeeper(docsUrl: string, html: string): Promise<Fetched[]> {
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
    if (candidates.length === 3) break
  }

  const pages = await inParallel(candidates, (url) => fetchUrl(url))
  return pages.filter((page) => page.ok)
}

export type ScanProgress = (step: { label: string; done: number; total: number }) => void

const STEPS = 5

export async function scanDomain(input: string, onProgress?: ScanProgress): Promise<ScanFindings> {
  const startedAt = Date.now()
  const domain = normalizeDomain(input)
  const report = (label: string, done: number) => onProgress?.({ label, done, total: STEPS })

  report(`Resolving ${normalizeDomain(input)}`, 0)
  const found: Discovered = await discover(domain)

  // A 403 to a plain request is not a failed scan, it is the strongest finding this tool
  // can produce: the site turns agents away at the door. Only a dead name is an error.
  if (found.home.status === 0) {
    throw new UnreachableDomainError(
      found.home.error?.startsWith('Blocked:')
        ? found.home.error.replace('Blocked: ', '')
        : `${domain} did not respond. Check the spelling, or the site may be down.`,
    )
  }

  // The door test, run as the thing being tested. Three tries, because bot gates answer
  // inconsistently and one 403 out of three is a different finding from three out of three.
  const asAgent = await fetchWithRetries(found.site, { ua: AGENT_UA })

  report(found.docs ? `Reading ${new URL(found.docs).pathname}` : 'Looking for documentation', 1)
  const docsPage = found.docsPage
  const docsText = docsPage?.ok ? docsPage.body : ''
  // One documentation page is a lottery: cloudinary describes its Provisioning API on a page
  // we never opened, then failed the check for not describing it. Follow the pages an agent
  // hunting for credentials would follow.
  const deeperDocs = docsPage?.ok && found.docs ? await readDeeper(found.docs, docsPage.body) : []

  report('Checking robots.txt against 13 AI crawlers', 2)
  const robots = await scanRobots(found.site)

  report('Probing llms.txt, .well-known and OpenAPI', 3)
  const [machine, scraped] = await Promise.all([
    scanMachineContext(found.site, found.docs),
    checkNpm(found.npmPackage),
  ])

  // A name lifted from a page that the registry has never heard of is our parsing error
  // far more often than it is a missing SDK, so we ask the registry before scoring a zero.
  let npm = scraped
  if (found.npmPackage && !scraped.found && found.npmSource !== 'registry-search') {
    const searched = await searchNpmForDomain(domain, found.githubRepo)
    if (searched && searched.name !== found.npmPackage) {
      const retried = await checkNpm(searched.name)
      if (retried.found) {
        npm = retried
        found.npmPackage = searched.name
        found.npmSource = 'registry-search'
        found.npmConfidence = searched.confidence
      }
    }
  }

  // The funnel greps documentation prose, so the corpus is every docs page we read plus home.
  report('Testing signup and agent entry points', 4)
  const corpus = [docsText, ...deeperDocs.map((page) => page.body), found.home.body].join('\n')
  const funnel = await scanFunnel(domain, found.site, corpus, found.pricing, found.signup, found.pricingPage)
  report('Scoring', STEPS)

  return {
    domain,
    site: found.site,
    scannedAt: new Date().toISOString(),
    homeStatus: asAgent.status,
    browserStatus: found.home.status,
    agentStatus: asAgent.status,
    agentStatusesSeen: asAgent.statusesSeen,
    blocksPlainRequests: !asAgent.ok,
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
    robots,
    machine,
    funnel,
    npm,
  }
}

export { normalizeDomain }
