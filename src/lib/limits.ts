import type { ScanFindings } from './scan'
import { registrableDomain } from './scan/http'

/**
 * What refused this scan, and whose door it was.
 *
 * Lives on its own because three sentences on the scorecard and two scripts all need the same
 * answer, and the one thing this project keeps relearning is that a concept computed in several
 * places drifts exactly where it hurts.
 */
export type EdgeLimits = {
  /** Every refusal at the vendor's own edge, whatever host it came from. */
  onSite: number
  challenges: number
  hosts: string[]
  /**
   * Refusals from the hosts that challenged us, which is the only denominator a sentence naming
   * those hosts may use. Counting every refusal on the registrable domain made `app.vendor.com`
   * answer for a limit that `docs.vendor.com` sent.
   */
  refusedWhereChallenged: number
}

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
  const hosts = [...new Set(challenged.map((one) => new URL(one.url).hostname))]
  return {
    onSite: theirs.length,
    challenges: challenged.length,
    hosts,
    refusedWhereChallenged: theirs.filter((one) => hosts.includes(new URL(one.url).hostname)).length,
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
  const refusals =
    limits.refusedWhereChallenged === 1
      ? 'the one request it refused'
      : `${limits.challenges} of the ${limits.refusedWhereChallenged} requests it refused`
  // Written to be appended after a clause that already says what we could not do, so it reads as
  // the reason rather than as a second sentence bolted on: "..., because X answered ...".
  return `${where} answered ${refusals} with a browser challenge rather than a limit, which is not a burst that passes`
}

/** Aimed at the vendor, because with a challenge there is nothing on our side left to wait out. */
export const CHALLENGE_UNBLOCK =
  'Let plain HTTP clients read your documentation host, or allow the named agents through your bot rules, and this becomes measurable.'

/**
 * Ilu vendorow z korpusu odmowilo nam na wlasnym brzegu, i ilu z nich wyzwaniem przegladarkowym.
 *
 * `/pricing` niosl te liczby **wpisane recznie** razem z data przemiatu, wiec zmienialy sie dokladnie
 * wtedy, kiedy nikt na nie nie patrzyl: 2026-08-20 strona mowila 15 i 11, a korpus dawal 14 i 10.
 * Straznik w `after-reseed` to lapal i kazal poprawiac, ale poprawianie liczby po kazdym przemiacie
 * to nie jest rozwiazanie, tylko przypomnienie. Liczone raz, tutaj, i czytane przez strone.
 */
/**
 * Kiedy korpus byl czytany, powiedziane tak, zeby bylo prawda takze wtedy, gdy nie w jednym dniu.
 * Data najnowszego wiersza podana jako data calego przemiatu jest falszem przy kazdym niepelnym
 * przebiegu - a te sa normalne: domena, ktora padla, wraca dzien pozniej (codex).
 */
export function sweptOn(rows: { scannedAt: string }[]): { from: string; to: string; oneDay: boolean } | null {
  if (rows.length === 0) return null
  const days = rows.map((row) => row.scannedAt.slice(0, 10)).sort()
  const from = days[0]
  const to = days[days.length - 1]
  return { from, to, oneDay: from === to }
}

export function edgeRefusalsInCorpus(
  rows: { domain: string; findings?: ScanFindings }[],
): { domains: number; refused: number; challenged: number } {
  let refused = 0
  let challenged = 0
  for (const row of rows) {
    const edge = limitsAtTheirEdge(row.findings, row.domain)
    if (edge.onSite === 0) continue
    refused += 1
    if (edge.challenges > 0) challenged += 1
  }
  return { domains: rows.length, refused, challenged }
}
