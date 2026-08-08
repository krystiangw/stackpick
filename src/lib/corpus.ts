import { categoryFor, CURATED_DOMAINS } from './categories'
import { checkHelpUri, CHECKS, MAX_SCORE, type ScoredCheck } from './score'
import { getStore, type Report } from './store'

/**
 * The corpus as data rather than as a page. OpenSSF Scorecard publishes every result it has as a
 * queryable dataset, and that is what makes it citable instead of merely readable; we had 51
 * domains locked inside HTML. One formula version only, for the same reason the industry report
 * uses one: scores from different versions were never comparable.
 */

export type CorpusVerdict = 'pass' | 'partial' | 'fail' | 'unmeasured' | 'notApplicable'

export type CorpusRow = {
  domain: string
  category: string | null
  total: number
  measurable: number
  max: number
  share: number | null
  scannedAt: string
  /** True when the host rate limited us during that scan, so the row is thinner than the site. */
  rateLimited: boolean
  scorecardUrl: string
  checks: { id: string; verdict: CorpusVerdict; points: number; max: number; detail: string }[]
}

export type Corpus = {
  formulaVersion: string
  generatedAt: string
  domains: number
  max: number
  methodology: string
  terms: string
  notes: string[]
  checks: { id: string; stage: string; label: string; max: number; helpUri: string }[]
  rows: CorpusRow[]
}

export function verdictOf(check: ScoredCheck): CorpusVerdict {
  if (check.notApplicable) return 'notApplicable'
  if (check.inconclusive) return 'unmeasured'
  if (check.points === check.max) return 'pass'
  return check.points > 0 ? 'partial' : 'fail'
}

export async function buildCorpus(baseUrl: string, now: string): Promise<Corpus | null> {
  const all = (await getStore().latestPerDomain(500)).filter((report) => CURATED_DOMAINS.has(report.domain))
  if (all.length === 0) return null

  const byVersion = new Map<string, Report[]>()
  for (const report of all) {
    const version = report.scorecard.formulaVersion
    byVersion.set(version, [...(byVersion.get(version) ?? []), report])
  }
  const [formulaVersion, reports] = [...byVersion.entries()].sort((a, b) => b[1].length - a[1].length)[0]

  const rows: CorpusRow[] = reports
    .map((report) => {
      const measurable = report.scorecard.measurable ?? report.scorecard.max
      return {
        domain: report.domain,
        category: categoryFor(report.domain)?.label ?? null,
        total: report.scorecard.total,
        measurable,
        max: report.scorecard.max,
        share: measurable > 0 ? Number((report.scorecard.total / measurable).toFixed(4)) : null,
        scannedAt: report.scannedAt,
        rateLimited: Boolean(report.findings?.rateLimitedUs),
        scorecardUrl: `${baseUrl}/r/${report.id}`,
        checks: report.scorecard.checks.map((check) => ({
          id: check.id,
          verdict: verdictOf(check),
          points: check.points,
          max: check.max,
          detail: check.detail,
        })),
      }
    })
    .sort((a, b) => a.domain.localeCompare(b.domain))

  return {
    formulaVersion,
    generatedAt: now,
    domains: rows.length,
    max: MAX_SCORE,
    methodology: `${baseUrl}/methodology`,
    terms: 'Free to use, quote and republish with attribution to StackPick and a link to the methodology.',
    notes: [
      'One row per domain, the most recent scan we hold, scored under a single formula version.',
      'share is total divided by measurable, not by max. A domain that refused our requests has a smaller denominator, not a worse number, so ranking on total alone would be wrong.',
      'A verdict of unmeasured means we could not evaluate the check, and notApplicable means it does not apply to a product of this kind. Neither is a failure and neither counts in measurable.',
      'rateLimited means the host answered 429 during that scan, so some checks are unmeasured for a reason that is ours and not theirs. Those rows are thinner than the site, and filtering them out is reasonable.',
      'These are vendors we have no relationship with. Every check is one HTTP request with a published rule, so any row here can be reproduced or disputed.',
    ],
    checks: CHECKS.map((check) => ({
      id: check.id,
      stage: check.stage,
      label: check.label,
      max: check.max,
      helpUri: checkHelpUri(check.id, baseUrl),
    })),
    rows,
  }
}

/** One row per domain and check, because that is the shape a spreadsheet or a notebook wants. */
export function corpusToCsv(corpus: Corpus): string {
  const escape = (value: string | number | null) => {
    const text = value === null ? '' : String(value)
    // A cell opening with one of these is a formula to Excel and Sheets, and forty cells in this
    // file already start with an @ because npm scopes do.
    const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
  }
  const header = [
    'domain',
    'category',
    'formula_version',
    'scanned_at',
    'total',
    'measurable',
    'max',
    'share',
    'check_id',
    'verdict',
    'points',
    'check_max',
    'detail',
    'rate_limited',
  ]
  const lines = [header.join(',')]
  for (const row of corpus.rows) {
    for (const check of row.checks) {
      lines.push(
        [
          row.domain,
          row.category,
          corpus.formulaVersion,
          row.scannedAt,
          row.total,
          row.measurable,
          row.max,
          row.share,
          check.id,
          check.verdict,
          check.points,
          check.max,
          check.detail,
          row.rateLimited ? 'true' : 'false',
        ]
          .map(escape)
          .join(','),
      )
    }
  }
  return `${lines.join('\n')}\n`
}
