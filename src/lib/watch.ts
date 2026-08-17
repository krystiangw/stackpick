import { randomBytes } from 'node:crypto'
import type { Report } from './store'
import type { ScoredCheck } from './score'
import { verdictOf, type CorpusVerdict } from './corpus'
import { inReleaseOrder, isOlderThan } from './formula'

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

/**
 * Which checks had their scoring rule changed in each formula version.
 *
 * When the formula moves between two measurements the cron rescores the older findings, and that
 * is honest only where the current rule reads a stored measurement. Where the rule does its own
 * reading during the scan - matching phrases across documentation pages, probing addresses - the
 * report keeps what matched, not the pages it matched in, so a rescore reproduces the OLD reading
 * and the difference is our rule rather than the vendor. 9.32 tightened `programmatic_provisioning`
 * from a bare phrase to a phrase with its evidence beside it, which would have read as up to
 * nineteen vendors losing a point they never had taken from them.
 *
 * A version missing from here is a version that changed no scoring rule. Keeping the list by hand
 * is the price of not having to decide, per check and per release, whether the evidence we still
 * hold is the evidence the new rule wants.
 */
const CHECK_RULE_CHANGED: Record<string, readonly string[]> = {
  '9.31': ['signup_reachable', 'mcp_present', 'oauth_dcr'],
  '9.32': ['programmatic_provisioning', 'oauth_dcr'],
  '9.33': ['oauth_dcr'],
  // 9.35 did not touch the rule, it changed which pages the rule reads: the sample no longer lets
  // one family of words take all three slots. A rescore reproduces the old reading either way, so
  // a vendor must not be told they lost ground because we looked somewhere else.
  '9.35': ['programmatic_provisioning'],
  // 9.36 reads the same description with a wider eye: an amount with the currency symbol after the
  // number, and "no card needed" beside "no credit card".
  '9.36': ['price_in_snippet'],
}

/**
 * Checks whose rule moved between two formula versions, so a change in them is ours to explain
 * rather than the vendor's to answer for. Order does not matter: a rescan under an older formula
 * is as incomparable as one under a newer.
 *
 * Ordered by `isOlderThan` rather than by reading the version as a number, which was wrong in the
 * one direction nobody would notice. A baseline of 9.9 is older than every entry here, but as a
 * float it is larger than 9.35, so the window came out empty and the whole guard fell silent for
 * exactly the oldest measurements: the ones that crossed the most rule changes.
 */
export function rulesChangedBetween(before: string, after: string): Set<string> {
  const [low, high] = inReleaseOrder(before, after)
  const moved = new Set<string>()
  for (const [version, checks] of Object.entries(CHECK_RULE_CHANGED)) {
    // The version a measurement was taken under is the version it already contains, so only the
    // releases AFTER the older measurement can have moved anything under it.
    if (isOlderThan(low, version) && !isOlderThan(high, version)) for (const check of checks) moved.add(check)
  }
  return moved
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
