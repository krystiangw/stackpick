import { discover, normalizeDomain, type Discovered } from './discover'
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
    githubRepo: string | null
  }
  homeTextChars: number
  docsTextChars: number
  robots: RobotsFindings
  machine: MachineFindings
  funnel: FunnelFindings
  npm: NpmFindings
}

export class UnreachableDomainError extends Error {}

export async function scanDomain(input: string): Promise<ScanFindings> {
  const startedAt = Date.now()
  const domain = normalizeDomain(input)
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

  const docsPage = found.docs ? await fetchUrl(found.docs) : null
  const docsText = docsPage?.ok ? docsPage.body : ''

  const [robots, machine, npm] = await Promise.all([
    scanRobots(found.site),
    scanMachineContext(found.site, found.docs),
    checkNpm(found.npmPackage),
  ])

  // The funnel greps documentation prose, so the corpus is docs plus whatever llms.txt exposes.
  const corpus = docsText + found.home.body
  const funnel = await scanFunnel(found.site, corpus, found.pricing, found.signup)

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
      githubRepo: found.githubRepo,
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
