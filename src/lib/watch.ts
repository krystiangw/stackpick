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

/** A scan is worth an email when a verdict moved. A score moving without one is arithmetic. */
export function worthTelling(changes: WatchChange[]): boolean {
  return changes.length > 0
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
