import { refusesAgentsAtSignup, signupNeedsJavaScript, FORMULA_VERSION } from './score'
import { CATEGORIES, CURATED_DOMAINS, type Category } from './categories'
import { publishedCorpus } from './published'
import type { Report } from './store'

export type RankedEntry = {
  domain: string
  total: number
  max: number
  reportId: string
  stages: Report['scorecard']['stages']
  /** Too little of the card was reachable for this share to be compared with the others. */
  undermeasured: boolean
}

/**
 * How much of the seventeen-point card has to have been readable before a share is ranked
 * against the others. Three quarters of it.
 *
 * Without a floor, refusing our requests is a way to win. bitmovin.com answers our user-agent
 * with a 403 and a JavaScript challenge, which left eleven checks measurable instead of sixteen,
 * and 9 of 11 put it top of Video hosting and streaming on 2026-08-12, above vendors we could
 * read in full. A share is only a comparison when both sides were measured to a similar depth.
 *
 * Counted against what we could not read, never against what does not apply. Those are two
 * different denominators wearing the same number: prosemirror.net is an open-source library with
 * no account to make and no key to issue, so four of its checks are not questions about it at
 * all, and its 4 of 10 is a complete measurement. The first version of this floor read the
 * denominator alone and marked the whole editor category unreliable, which was a worse mistake
 * than the one it fixed.
 */
export const RANKABLE_MEASURABLE = 13

export type RankedCategory = { category: Category; entries: RankedEntry[]; median: number }

/**
 * How much of the formula we can actually reach from outside. It is the honest footnote under
 * every "16 points" claim on the site, and it is also the argument for the paid audit: the gap
 * between the paper maximum and what a scanner can see is the part somebody has to run agents for.
 */
export type CorpusCoverage = {
  domains: number
  /** How many we hold, against the `domains` we can publish under one formula version. */
  curated: number
  max: number
  averageMeasurable: number
  fullyMeasurable: number
  /**
   * The formula the published rows were measured under, and the one the scanner runs now. They
   * are the same whenever a reseed has finished. While one is stuck they are not, and the page
   * said "the rest are waiting for a rescan under the current formula", which reads as a promise
   * that the published rows are current. On 13 August they were three versions behind, including
   * the version that stopped calling three documentation pages live MCP servers.
   */
  publishedFormula: string
  currentFormula: string
  /** The stage the free scanners from Google and Cloudflare both stop short of. */
  signupRefusesAgents: number
  signupNeedsJavaScript: number
}

export type RankingsView = { categories: RankedCategory[]; coverage: CorpusCoverage }

/**
 * Rendered on the landing page as proof rather than as a claim: a ranking of real domains
 * is harder to dismiss than an adjective about what the scanner can do.
 */
/**
 * The home page is the scan form and the argument for running it, and neither needs the corpus.
 * On 2026-08-11 one failing database query returned 500 on every page for 44 minutes, including
 * this one, where the rankings are a supporting exhibit. An unreadable corpus now costs the
 * exhibit and nothing else.
 */
export async function loadRankings(): Promise<RankingsView> {
  let reports: Awaited<ReturnType<typeof publishedCorpus>>['reports']
  try {
    reports = (await publishedCorpus()).reports
  } catch (error) {
    console.error('rankings: corpus unreadable, rendering without them', error)
    return {
      categories: [],
      coverage: { domains: 0, curated: CURATED_DOMAINS.size, publishedFormula: FORMULA_VERSION, currentFormula: FORMULA_VERSION, max: 0, averageMeasurable: 0, fullyMeasurable: 0, signupRefusesAgents: 0, signupNeedsJavaScript: 0 },
    }
  }
  const latest = new Map(reports.map((report) => [report.domain, report]))

  const scanned = [...latest.values()]
  const coverage: CorpusCoverage = {
    domains: scanned.length,
    curated: CURATED_DOMAINS.size,
    publishedFormula: scanned[0]?.scorecard.formulaVersion ?? FORMULA_VERSION,
    currentFormula: FORMULA_VERSION,
    max: scanned[0]?.scorecard.max ?? 0,
    averageMeasurable:
      scanned.length === 0
        ? 0
        : scanned.reduce((sum, report) => sum + (report.scorecard.measurable ?? report.scorecard.max), 0) /
          scanned.length,
    fullyMeasurable: scanned.filter(
      (report) => (report.scorecard.measurable ?? report.scorecard.max) === report.scorecard.max,
    ).length,
    signupRefusesAgents: scanned.filter((report) => refusesAgentsAtSignup(report.findings)).length,
    signupNeedsJavaScript: scanned.filter(signupNeedsJavaScript).length,
  }

  const categories = CATEGORIES.map((category) => {
    const entries = category.domains
      .map((domain) => latest.get(domain))
      .filter((report): report is Report => Boolean(report))
      .map((report) => {
        const max = report.scorecard.measurable ?? report.scorecard.max
        // Points, not checks: two of the fifteen are worth two, so counting rows would understate
        // the card by one the day either of them gains a notApplicable branch.
        const doesNotApply = report.scorecard.checks
          .filter((check) => check.notApplicable)
          .reduce((sum, check) => sum + check.max, 0)
        return {
          domain: report.domain,
          total: report.scorecard.total,
          max,
          reportId: report.id,
          stages: report.scorecard.stages,
          undermeasured: max + doesNotApply < RANKABLE_MEASURABLE,
        }
      })
      // A site that refuses our requests scores against a smaller denominator, not a worse
      // number. Publishing a name next to a number we did not fully measure is the one place
      // this tool could do real damage, so the shallow rows sort below the comparable ones
      // whatever their share, and only then by share.
      .sort(
        (a, b) =>
          Number(a.undermeasured) - Number(b.undermeasured) ||
          b.total / b.max - a.total / a.max ||
          b.total - a.total ||
          a.domain.localeCompare(b.domain),
      )

    // The upper middle is not the median, and a median of raw totals is not comparable when
    // every row has its own denominator.
    const shares = entries.map((entry) => (entry.max === 0 ? 0 : entry.total / entry.max)).sort((a, b) => a - b)
    const middle = Math.floor(shares.length / 2)
    const median =
      shares.length === 0 ? 0 : shares.length % 2 === 0 ? (shares[middle - 1] + shares[middle]) / 2 : shares[middle]
    return { category, entries, median }
  })
    .filter((ranked) => ranked.entries.length >= 4)
    .sort((a, b) => b.entries.length - a.entries.length)

  return { categories, coverage }
}
