/**
 * The delivered report as data, so the portal can draw it and the markdown can print it from one
 * computation. Two renderers reading two computations is how "named in 9 of 10" ends up beside a
 * table saying 5, which this project has already done to itself once.
 *
 * Written by `scripts/client-report.mts` at the moment it writes the markdown, from the same
 * variables. Nothing recomputes it later.
 */
import type { BriefReview } from './report-brief'
import type { RecommendationReview } from './recommendation-review'

export type ReportModel = {
  domain: string
  category: string
  preparedAt: string
  formulaVersion: string
  /** What the scanner runs today, when that is not the version the scan was taken under. */
  formulaNow: string | null
  scannedAt: string
  /** True when the vendor is not one of the providers the runs were collected for. */
  guest: boolean
  /**
   * Answers carrying the vendor's name as a word without naming their domain, which we did not
   * count. Zero for everybody whose name is theirs alone; non-zero for a company that moved domain,
   * where the bare count would otherwise read as a confident zero.
   */
  missedByWord: number
  score: { total: number; measurable: number; max: number }
  stages: { title: string; question: string; points: number; measurable: number }[]
  question: string | null
  /** Absent on older stored deliveries; absence is displayed as unreviewed. */
  briefReview?: BriefReview | null
  recommendationReview?: RecommendationReview | null
  /** Where every answer can be read in full. Null when we hold no runs for the category yet. */
  runsUrl: string | null
  /** `blind` is a run that could read none of the operator's local instructions, which is the clean case. */
  runs: { tool: string; version: string; model: string; ran: string; count: number; named: number; blind: boolean }[]
  named: { named: number; first: number; of: number }
  /** Everyone named more often than the subject, worst gap first. */
  rivals: { domain: string; named: number; first: number; clear: boolean }[]
  /** What the runs said, about the subject and about whoever was chosen instead. */
  quotes: { tool: string; run: number; said: string; about: 'you' | 'winner'; who: string }[]
  failing: { label: string; points: number; max: number; detail: string; unblock: string | null }[]
  unmeasured: { label: string; detail: string }[]
  /** Checks that do not apply to this product, and why. They are why the denominator is smaller. */
  notApplicable: { label: string; detail: string }[]
  fixes: { label: string; gain: number; effort: string; how: string; verify?: string }[]
  fixClaim: string | null
  /** Points behind checks nothing could evaluate, so they are outside the fix arithmetic. */
  behindUnmeasured: number
}
