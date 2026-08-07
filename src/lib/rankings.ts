import { CATEGORIES, type Category } from './categories'
import { getStore, type Report } from './store'

export type RankedEntry = { domain: string; total: number; max: number; reportId: string }
export type RankedCategory = { category: Category; entries: RankedEntry[]; median: number }

/**
 * Rendered on the landing page as proof rather than as a claim: a ranking of real domains
 * is harder to dismiss than an adjective about what the scanner can do.
 */
export async function loadRankings(): Promise<RankedCategory[]> {
  const reports = await getStore().listReports(500)
  const latest = new Map<string, Report>()
  for (const report of reports) {
    const held = latest.get(report.domain)
    if (!held || report.scannedAt > held.scannedAt) latest.set(report.domain, report)
  }

  return CATEGORIES.map((category) => {
    const entries = category.domains
      .map((domain) => latest.get(domain))
      .filter((report): report is Report => Boolean(report))
      .map((report) => ({
        domain: report.domain,
        total: report.scorecard.total,
        max: report.scorecard.max,
        reportId: report.id,
      }))
      .sort((a, b) => b.total - a.total || a.domain.localeCompare(b.domain))

    const totals = entries.map((entry) => entry.total).sort((a, b) => a - b)
    const median = totals.length === 0 ? 0 : totals[Math.floor(totals.length / 2)]
    return { category, entries, median }
  })
    .filter((ranked) => ranked.entries.length >= 4)
    .sort((a, b) => b.entries.length - a.entries.length)
}
