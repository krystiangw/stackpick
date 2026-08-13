import { categoryFor , CURATED_DOMAINS } from './categories'
import { publishedCorpus } from './published'
import { checkHelpUri, CHECKS, MAX_SCORE, refusesAgentsAtSignup, type ScoredCheck } from './score'

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
  /**
   * Whether any OAuth grant this vendor advertises finishes without a person. Null when they
   * publish no registration endpoint, or publish one and no grant list. Separate from the
   * oauth_dcr verdict on purpose: the point is for the endpoint existing, and 45 of the 68
   * vendors that have one advertise nothing an unattended agent can complete.
   */
  unattendedGrant: boolean | null
  /**
   * Whether the signup refused an agent while serving a browser at the same URL. Published
   * because /findings states it and nothing in this file let a reader check it: the guard was
   * matching a sentence instead, and on 2026-08-11 the sentence and the computation disagreed.
   */
  refusesAgentsAtSignup: boolean
  /**
   * The registrable domain this row was actually measured on, when the home page landed on
   * somebody else's. sendgrid.com answers robots.txt with a redirect to twilio.com/robots.txt,
   * so its row credits Twilio's file to SendGrid while twilio.com sits in the corpus scoring the
   * same file. The scorecard has said so in a banner for weeks; the dataset did not, and the
   * dataset is what anybody computing a market number reads.
   */
  measuredOn: string | null
  scorecardUrl: string
  /** Stable per-vendor address. Unlike scorecardUrl it does not change when we rescan. */
  vendorUrl: string
  checks: { id: string; verdict: CorpusVerdict; points: number; max: number; detail: string }[]
}

export type Corpus = {
  formulaVersion: string
  generatedAt: string
  domains: number
  /**
   * How many vendors we hold in total, against the `domains` we could publish under one formula.
   * Never omitted: a machine reading this file has no other way to tell a corpus of 88 from a
   * corpus of 170 caught mid-reseed, and this product exists to argue that machines should be
   * told things rather than left to infer them.
   */
  curated: number
  awaitingRescan: number
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
  const { reports, formulaVersion } = await publishedCorpus()
  if (reports.length === 0) return null

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
        refusesAgentsAtSignup: report.findings ? refusesAgentsAtSignup(report.findings) : false,
        measuredOn: report.findings?.resolvedElsewhere?.finalDomain ?? null,
        unattendedGrant: report.findings?.funnel?.oauth?.grantTypes
          ? Boolean(report.findings.funnel.oauth.unattendedGrant)
          : null,
        // The scan that produced the row, and the address that survives the next reseed. A
        // citation pointing at /r/<id> rots the moment we rescan, which is every few days.
        scorecardUrl: `${baseUrl}/r/${report.id}`,
        vendorUrl: `${baseUrl}/v/${report.domain}`,
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
    curated: CURATED_DOMAINS.size,
    awaitingRescan: Math.max(0, CURATED_DOMAINS.size - rows.length),
    max: MAX_SCORE,
    methodology: `${baseUrl}/methodology`,
    terms: 'Free to use, quote and republish with attribution to Let Agents In and a link to the methodology.',
    notes: [
      'One row per domain, the most recent scan we hold, scored under a single formula version.',
      'domains is how many we can publish under one formula and curated is how many we hold. When they differ, a reseed is part way through: scores from two formula versions are not comparable, so the rest wait for their next scan rather than appear here under a number that cannot be compared with the others.',
      'share is total divided by measurable, not by max. A domain that refused our requests has a smaller denominator, not a worse number, so ranking on total alone would be wrong.',
      'A verdict of unmeasured means we could not evaluate the check, and notApplicable means it does not apply to a product of this kind. Neither is a failure and neither counts in measurable.',
      'unattendedGrant is null when a vendor publishes no registration endpoint or no grant list, false when every advertised grant needs a person at a browser, true when client_credentials is among them. device_code counts as false: approving on another screen is still a person.',
      'rateLimited means the host answered 429 during that scan, so some checks are unmeasured for a reason that is ours and not theirs. Those rows are thinner than the site, and filtering them out is reasonable.',
      'measuredOn names the domain a row was actually read on, when the home page landed somewhere else. Those rows describe the journey an agent takes from the domain in the name, and the files they score belong to the domain in measuredOn: sendgrid.com answers robots.txt with a redirect to twilio.com/robots.txt, and twilio.com is a row of its own, so anything counted across the corpus counts that file twice.',
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
    'measured_on',
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
          row.measuredOn,
        ]
          .map(escape)
          .join(','),
      )
    }
  }
  return `${lines.join('\n')}\n`
}
