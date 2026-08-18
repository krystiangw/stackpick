import type { ScanFindings } from './scan'
import { registrableDomain } from './scan/http'

/**
 * What refused this scan, and whose door it was.
 *
 * Lives on its own because three sentences on the scorecard and two scripts all need the same
 * answer, and the one thing this project keeps relearning is that a concept computed in several
 * places drifts exactly where it hurts.
 */
export type EdgeLimits = { onSite: number; challenges: number; hosts: string[] }

/**
 * The registry refuses us constantly and that is a fact about our traffic to npm rather than about
 * the vendor: ten of bunny.net's limits were api.npmjs.org and none of them was bunny.net.
 */
/**
 * Callers hold one of two things and neither is a hostname: scripts hold `example.com` and the
 * checks hold `f.site`, which is `https://example.com`. Read as a hostname the second one becomes
 * the two-label string `https://example.io`, which matches nothing, so the branch that names a
 * vendor's wall would have been dead in exactly the place it was written for.
 */
function hostOf(domainOrUrl: string): string {
  const bare = domainOrUrl.includes('://') ? new URL(domainOrUrl).hostname : domainOrUrl
  return bare.replace(/^www\./, '').toLowerCase()
}

function siteOf(domainOrUrl: string): string {
  return registrableDomain(hostOf(domainOrUrl))
}

export function limitsAtTheirEdge(
  findings: ScanFindings | undefined,
  domain: string,
  onHost?: string | null,
): EdgeLimits {
  const met = findings?.limitsMet ?? []
  const site = siteOf(domain)
  const host = onHost ? hostOf(onHost) : null
  const theirs = met.filter((one) => {
    try {
      const where = new URL(one.url).hostname
      return siteOf(where) === site && (host === null || hostOf(where) === host)
    } catch {
      return false
    }
  })
  const challenged = theirs.filter((one) => one.challenge)
  return {
    onSite: theirs.length,
    challenges: challenged.length,
    hosts: [...new Set(challenged.map((one) => new URL(one.url).hostname))],
  }
}

/**
 * The limits that carried a challenge marker, when there were any, or null.
 *
 * A 429 never takes a point away here and this does not change that. What it changes is the
 * sentence beside the unmeasured check. `cf-mitigated: challenge` is an edge choosing to challenge
 * rather than to throttle, which is a wall a browser passes invisibly and an HTTP client cannot
 * pass at all, so telling the vendor "nothing for you to do, we rescan later" is false in both
 * directions: there is nothing for us to wait out, and there is something for them to fix.
 * Measured 2026-08-18 on the whole corpus: 13 domains met a limit at their own edge and 11 of them
 * carried a marker, ten of those on every request they refused. No formula version rides on this:
 * the points are untouched, and bumping one would expire the directus erratum, whose fix is not
 * written yet.
 */
export function challengedUs(
  findings: ScanFindings | undefined,
  domain: string,
  /**
   * The host whose refusal is being explained, when the caller knows it. Without it the answer is
   * domain-wide, and a challenge met at `app.vendor.com` would explain away a plain limit met at
   * `docs.vendor.com`: two different doors, one sentence, and the sentence would be wrong about the
   * one it names.
   */
  onHost?: string | null,
): EdgeLimits | null {
  const limits = limitsAtTheirEdge(findings, domain, onHost)
  return limits.challenges > 0 ? limits : null
}

/**
 * Said once, because it appears beside three different unmeasured checks. Names the host rather
 * than the company: three of the four walls we found sit on a documentation subdomain whose apex
 * answers 200, and "this company blocks agents" would be untrue of the company.
 */
export function challengeSentence(limits: EdgeLimits): string {
  const where = limits.hosts.join(', ')
  // The denominator is what we were refused, not what we asked. `limitsMet` holds refusals only,
  // so "13 of our 13 requests" would claim every request was refused on a scan that read the site
  // fine and met two limits at the end of it.
  const refusals = limits.onSite === 1 ? 'the one request it refused' : `${limits.challenges} of the ${limits.onSite} requests it refused`
  return `${where} answered ${refusals} with a browser challenge rather than a limit, so this is not a burst that passes`
}

/** Aimed at the vendor, because with a challenge there is nothing on our side left to wait out. */
export const CHALLENGE_UNBLOCK =
  'Let plain HTTP clients read your documentation host, or allow the named agents through your bot rules, and this becomes measurable.'
