import { refusesAgentsAtSignup } from './score'
import { CATEGORIES, type Category } from './categories'
import { publishedCorpus } from './published'
import type { Report } from './store'

export type RankedEntry = {
  domain: string
  total: number
  max: number
  reportId: string
  stages: Report['scorecard']['stages']
}
export type RankedCategory = { category: Category; entries: RankedEntry[]; median: number }

/**
 * How much of the formula we can actually reach from outside. It is the honest footnote under
 * every "16 points" claim on the site, and it is also the argument for the paid audit: the gap
 * between the paper maximum and what a scanner can see is the part somebody has to run agents for.
 */
export type CorpusCoverage = {
  domains: number
  max: number
  averageMeasurable: number
  fullyMeasurable: number
  /** The stage the free scanners from Google and Cloudflare both stop short of. */
  signupRefusesAgents: number
  signupNeedsJavaScript: number
}

export type RankingsView = { categories: RankedCategory[]; coverage: CorpusCoverage }

/**
 * Rendered on the landing page as proof rather than as a claim: a ranking of real domains
 * is harder to dismiss than an adjective about what the scanner can do.
 */
export async function loadRankings(): Promise<RankingsView> {
  const latest = new Map(
    (await publishedCorpus()).reports.map((report) => [report.domain, report]),
  )

  const scanned = [...latest.values()]
  const coverage: CorpusCoverage = {
    domains: scanned.length,
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
    signupNeedsJavaScript: scanned.filter(
      (report) =>
        report.findings.funnel.signup.reachable && !report.findings.funnel.signup.rendersFormWithoutJs,
    ).length,
  }

  const categories = CATEGORIES.map((category) => {
    const entries = category.domains
      .map((domain) => latest.get(domain))
      .filter((report): report is Report => Boolean(report))
      .map((report) => ({
        domain: report.domain,
        total: report.scorecard.total,
        max: report.scorecard.measurable ?? report.scorecard.max,
        reportId: report.id,
        stages: report.scorecard.stages,
      }))
      // A site that refuses our requests scores against a smaller denominator, not a worse
      // number. Publishing a name next to a number we did not fully measure is the one place
      // this tool could do real damage.
      .sort((a, b) => b.total / b.max - a.total / a.max || b.total - a.total || a.domain.localeCompare(b.domain))

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
