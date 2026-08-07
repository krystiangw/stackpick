import { checkRateLimit, clientKey, recordUse } from './rate-limit'
import { normalizeDomain } from './scan/discover'
import { getStore, type Report } from './store'

/**
 * Who is allowed to run a scan, and what we do instead of refusing.
 *
 * The old rule counted every scan against one IP, so a shared office address ran out after
 * ten and got a red error where the only call to action used to be. Two changes: a domain
 * scanned minutes ago is served from the store for free, and the limit is mostly per domain,
 * with a loose per-caller ceiling left as an abuse backstop.
 */

const REUSE_WINDOW_MS = 15 * 60 * 1000
const PER_DOMAIN_PER_HOUR = 5
const PER_CALLER_PER_HOUR = 30

export type ExampleReport = { id: string; domain: string; total: number; max: number }

export type Gate =
  | { kind: 'invalid'; error: string }
  | { kind: 'cached'; report: Report }
  | { kind: 'limited'; error: string; retryAfterSeconds: number; example: ExampleReport | null; domain: string }
  | { kind: 'go'; domain: string; charge: () => void }

/** The best scorecard we hold, so a refusal can still show what good looks like. */
export async function bestExample(): Promise<ExampleReport | null> {
  const reports = await getStore().listReports(200)
  const best = reports.reduce<Report | null>((held, report) => {
    if (!held) return report
    if (report.scorecard.total !== held.scorecard.total) {
      return report.scorecard.total > held.scorecard.total ? report : held
    }
    return report.scannedAt > held.scannedAt ? report : held
  }, null)
  if (!best) return null
  return { id: best.id, domain: best.domain, total: best.scorecard.total, max: best.scorecard.max }
}

export async function gateScan(request: Request, rawDomain: string, bypass = false): Promise<Gate> {
  let domain: string
  try {
    domain = normalizeDomain(rawDomain)
  } catch {
    return { kind: 'invalid', error: 'That does not look like a domain. Try example.com.' }
  }

  if (bypass) return { kind: 'go', domain, charge: () => {} }

  const store = getStore()
  const held = await store.latestForDomain(domain)
  if (held && Date.now() - new Date(held.scannedAt).getTime() < REUSE_WINDOW_MS) {
    return { kind: 'cached', report: held }
  }

  const caller = clientKey(request)
  const perDomain = checkRateLimit(`domain:${domain}`, PER_DOMAIN_PER_HOUR)
  const perCaller = checkRateLimit(`ip:${caller}`, PER_CALLER_PER_HOUR)
  const blocked = !perDomain.allowed ? perDomain : !perCaller.allowed ? perCaller : null

  if (blocked) {
    const minutes = Math.max(1, Math.ceil(blocked.retryAfterSeconds / 60))
    return {
      kind: 'limited',
      error: !perDomain.allowed
        ? `${domain} has been scanned ${PER_DOMAIN_PER_HOUR} times in the last hour. The next one is free in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`
        : `That is ${PER_CALLER_PER_HOUR} scans in an hour from this address, which is where we stop. The next one is free in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`,
      retryAfterSeconds: blocked.retryAfterSeconds,
      example: await bestExample(),
      domain,
    }
  }

  return {
    kind: 'go',
    domain,
    charge: () => {
      recordUse(`domain:${domain}`)
      recordUse(`ip:${caller}`)
    },
  }
}
