import { checkRateLimit, clientKey, recordUse } from './rate-limit'
import { publishedCorpus } from './published'
import { RANKABLE_MEASURABLE } from './rankings'
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

export const REUSE_WINDOW_MS = 15 * 60 * 1000
export const PER_DOMAIN_PER_HOUR = 5
export const PER_CALLER_PER_HOUR = 30

/**
 * Keyed on the registrable name, so a.victim.com and b.victim.com share one budget. One scan
 * is roughly eighty requests to the target, which makes an unkeyed limit an amplifier
 * pointed at a third party.
 */
function registrableName(hostname: string): string {
  const labels = hostname.split('.')
  if (labels.length <= 2) return hostname
  // Two-label public suffixes (co.uk, com.pl) need three labels to identify the registration.
  const suffix = labels.slice(-2).join('.')
  const compound = /^(co|com|net|org|gov|edu|ac|or|ne)\.[a-z]{2}$/.test(suffix)
  return labels.slice(compound ? -3 : -2).join('.')
}

export type ExampleReport = { id: string; domain: string; total: number; max: number }

export type Gate =
  | { kind: 'invalid'; error: string }
  | { kind: 'cached'; report: Report }
  | { kind: 'limited'; error: string; retryAfterSeconds: number; example: ExampleReport | null; domain: string }
  | { kind: 'go'; domain: string }

/** The best scorecard we hold, so a refusal can still show what good looks like. */
export async function bestExample(): Promise<ExampleReport | null> {
  // From the curated corpus only, and out of the same denominator as everywhere else.
  const all = (await publishedCorpus()).reports
  // The same floor the rankings use, and for the same reason: the highest share we hold is
  // otherwise likely to be a domain that refused most of the card. "Look what good looks like"
  // has to point at a domain we could actually read.
  const deep = all.filter(
    (report) =>
      (report.scorecard.measurable ?? report.scorecard.max) +
        report.scorecard.checks
          .filter((check) => check.notApplicable)
          .reduce((sum, check) => sum + check.max, 0) >=
      RANKABLE_MEASURABLE,
  )
  const reports = deep.length > 0 ? deep : all
  const best = reports.reduce<Report | null>((held, report) => {
    if (!held) return report
    const share = (candidate: Report) =>
      candidate.scorecard.total / (candidate.scorecard.measurable ?? candidate.scorecard.max)
    if (share(report) !== share(held)) return share(report) > share(held) ? report : held
    return report.scannedAt > held.scannedAt ? report : held
  }, null)
  if (!best) return null
  return {
    id: best.id,
    domain: best.domain,
    total: best.scorecard.total,
    max: best.scorecard.measurable ?? best.scorecard.max,
  }
}

export async function gateScan(request: Request, rawDomain: string, bypass = false): Promise<Gate> {
  let domain: string
  try {
    domain = normalizeDomain(rawDomain)
  } catch {
    return { kind: 'invalid', error: 'That does not look like a domain. Try example.com.' }
  }

  if (bypass) return { kind: 'go', domain }

  const store = getStore()
  const held = await store.latestForDomain(domain)
  if (held && Date.now() - new Date(held.scannedAt).getTime() < REUSE_WINDOW_MS) {
    return { kind: 'cached', report: held }
  }

  const caller = clientKey(request)
  const budget = registrableName(domain)
  const perDomain = checkRateLimit(`domain:${budget}`, PER_DOMAIN_PER_HOUR)
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

  // Charged before the work. Six POSTs for a domain that does not resolve used to return six
  // 422s and cost the caller nothing, while costing us a full discovery pass each time.
  recordUse(`domain:${budget}`)
  recordUse(`ip:${caller}`)
  return { kind: 'go', domain }
}
