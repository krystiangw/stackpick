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
  durationMs: number
  discovered: { docs: string | null; pricing: string | null; signup: string | null; npmPackage: string | null; githubRepo: string | null }
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

  if (!found.home.ok) {
    throw new UnreachableDomainError(
      found.home.error ? `${domain} did not respond (${found.home.error})` : `${domain} answered ${found.home.status}`,
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
    durationMs: Date.now() - startedAt,
    discovered: {
      docs: found.docs,
      pricing: found.pricing,
      signup: found.signup,
      npmPackage: found.npmPackage,
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
