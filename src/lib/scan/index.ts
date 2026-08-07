import { discover, normalizeDomain, searchNpmForDomain, type Discovered } from './discover'
import { fetchUrl, visibleTextLength } from './http'
import { scanFunnel, type FunnelFindings } from './funnel'
import { scanMachineContext, type MachineFindings } from './machine'
import { checkNpm, type NpmFindings } from './npm'
import { scanRobots, type RobotsFindings } from './robots'

export type ScanFindings = {
  domain: string
  site: string
  scannedAt: string
  homeStatus: number
  blocksPlainRequests: boolean
  durationMs: number
  discovered: {
    docs: string | null
    pricing: string | null
    signup: string | null
    npmPackage: string | null
    npmSource: 'site' | 'docs' | 'llms' | 'registry-search' | null
    npmConfidence: 'strong' | 'weak' | null
    githubRepo: string | null
    linkSources: { docs: string | null; pricing: string | null; signup: string | null }
  }
  homeTextChars: number
  docsTextChars: number
  robots: RobotsFindings
  machine: MachineFindings
  funnel: FunnelFindings
  npm: NpmFindings
}

export class UnreachableDomainError extends Error {}

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

  report(found.docs ? `Reading ${new URL(found.docs).pathname}` : 'Looking for documentation', 1)
  const docsPage = found.docs ? await fetchUrl(found.docs) : null
  const docsText = docsPage?.ok ? docsPage.body : ''

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

  // The funnel greps documentation prose, so the corpus is docs plus whatever llms.txt exposes.
  report('Testing signup and agent entry points', 4)
  const corpus = docsText + found.home.body
  const funnel = await scanFunnel(found.site, corpus, found.pricing, found.signup)
  report('Scoring', STEPS)

  return {
    domain,
    site: found.site,
    scannedAt: new Date().toISOString(),
    homeStatus: found.home.status,
    blocksPlainRequests: !found.home.ok,
    durationMs: Date.now() - startedAt,
    discovered: {
      docs: found.docs,
      pricing: found.pricing,
      signup: found.signup,
      npmPackage: found.npmPackage,
      npmSource: found.npmSource,
      npmConfidence: found.npmConfidence,
      githubRepo: found.githubRepo,
      linkSources: found.linkSources,
    },
    homeTextChars: visibleTextLength(found.home.body),
    docsTextChars: visibleTextLength(docsText),
    robots,
    machine,
    funnel,
    npm,
  }
}

export { normalizeDomain }
