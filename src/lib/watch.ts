import { randomBytes } from 'node:crypto'
import type { Report } from './store'
import type { ScoredCheck } from './score'
import { verdictOf, type CorpusVerdict } from './corpus'

/**
 * Somebody asking to be told when their agent readiness changes. The scan already answers "how
 * are you doing today", and a vendor who fixes something and then breaks it six weeks later
 * finds out from us or from nobody: the failures we measure are the kind nobody notices, because
 * a WAF rule that starts refusing agents changes nothing a person sees in a browser.
 */
export type Watch = {
  id: string
  email: string
  domain: string
  createdAt: string
  /** Null until the address is confirmed by following the link we mail. */
  confirmedAt: string | null
  /** What the last alert was measured against, so a change is against what we told them. */
  lastReportId: string | null
  lastTotal: number | null
  lastMeasurable: number | null
  checkedAt: string | null
  /** Kept rather than deleted when someone stops, so an unsubscribe cannot be undone by us. */
  stoppedAt: string | null
  plan: 'trial' | 'paid'
  /** Set when a payment provider tells us a subscription exists. */
  subscriptionId: string | null
}

export type WatchChange = {
  checkId: string
  label: string
  from: CorpusVerdict
  to: CorpusVerdict
  detail: string
  /** True when the vendor lost ground, which is the half worth an email at all. */
  worse: boolean
}

const RANK: Record<CorpusVerdict, number> = { fail: 0, partial: 1, pass: 2, unmeasured: -1, notApplicable: -1 }

/**
 * What moved between two scans of one domain, in the vendor's language rather than ours.
 *
 * Verdicts that cannot be ranked against each other are still reported, because "we could not
 * measure your signup this week" is news to somebody who passed it last week, but they are not
 * called worse: a check going unmeasured usually says something about our reach, not their site.
 */
export function changesBetween(before: ScoredCheck[], after: ScoredCheck[]): WatchChange[] {
  const held = new Map(before.map((check) => [check.id, check]))
  const changes: WatchChange[] = []
  for (const check of after) {
    const previous = held.get(check.id)
    if (!previous) continue
    const from = verdictOf(previous)
    const to = verdictOf(check)
    if (from === to) continue
    const comparable = RANK[from] >= 0 && RANK[to] >= 0
    changes.push({ checkId: check.id, label: check.label, from, to, detail: check.detail, worse: comparable && RANK[to] < RANK[from] })
  }
  return changes
}

/**
 * A scan is worth an email when a verdict moved between two states we could both measure. A score
 * moving without a verdict is arithmetic, and a verdict moving in or out of "unmeasured" is
 * usually us: the note on changesBetween says so, and 2026-08-15 put a number on it. Between the
 * two passes of one reseed, 21 of the 22 verdicts that moved went unmeasured to pass, sixteen of
 * them because the first pass asked npm with a cold cache and the second found the answer. A
 * watcher active that hour would have been told their typed SDK now passes, about a change that
 * happened entirely inside our scanner.
 *
 * Such a change is still listed in the mail when something else earned it, which is what the
 * comment on changesBetween asks for: "we could not measure your signup this week" is news to
 * somebody who passed it last week. It is not, on its own, a reason to write.
 */
export function worthTelling(changes: WatchChange[], theirEdgeTurnedUsAway = false): boolean {
  if (changes.some((change) => RANK[change.from] >= 0 && RANK[change.to] >= 0)) return true
  // The exception, and it is the whole product. A check falls to "unmeasured" for two unrelated
  // reasons: our own cache or clock, and their edge deciding to turn a non-browser away. The
  // second is exactly the failure the landing page promises to catch, because it changes nothing
  // a person sees in a browser. Requiring a measured change on both sides silenced it: a customer
  // switching on bot protection would have moved three checks from pass to unmeasured and heard
  // nothing from us.
  return theirEdgeTurnedUsAway && changes.some((change) => change.to === 'unmeasured')
}

/** Their edge, not our reach: the two signals that mean a scan was turned away rather than slow. */
export function turnedAwayAtTheEdge(findings: { blocksPlainRequests?: boolean; robots?: { unreadable?: boolean } }): boolean {
  return Boolean(findings.blocksPlainRequests || findings.robots?.unreadable)
}

/**
 * Whether two scorecards are a before and an after at all. They are not when the formula moved
 * between them: we reseed every few days and the rules move with the reseed, so comparing across
 * versions mails every watcher a list of verdicts that changed because we changed our mind, under
 * a subject line saying their site lost ground. On formula 9.3 that would have been the first
 * email several people ever got from us.
 */
export function comparableScorecards(
  before: { formulaVersion: string } | null | undefined,
  after: { formulaVersion: string },
): boolean {
  return before?.formulaVersion === after.formulaVersion
}

export function newWatch(email: string, domain: string, now: string): Watch {
  return {
    id: randomBytes(16).toString('hex'),
    email: email.toLowerCase(),
    domain,
    createdAt: now,
    confirmedAt: null,
    lastReportId: null,
    lastTotal: null,
    lastMeasurable: null,
    checkedAt: null,
    stoppedAt: null,
    plan: 'trial',
    subscriptionId: null,
  }
}

export const measurableOf = (report: Report) => report.scorecard.measurable ?? report.scorecard.max
