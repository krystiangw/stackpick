import { categoryFor, type Category } from './categories'
import { getStore, type Report } from './store'

export type Peer = { domain: string; total: number; max: number; isSubject: boolean }

export type Comparison = {
  category: Category | null
  /** Ranked peers we have actually scanned. Never padded with assumptions. */
  peers: Peer[]
  rankInCategory: { position: number; outOf: number } | null
  /** Position against every domain ever scanned here, which always exists. */
  percentile: { betterThan: number; outOf: number } | null
  /** Checks a peer passes and the subject does not. The most quotable part of the report. */
  beatenOn: { checkLabel: string; peers: string[] }[]
}

const SAMPLE_FLOOR = 5

function latestPerDomain(reports: Report[]): Map<string, Report> {
  const latest = new Map<string, Report>()
  for (const report of reports) {
    const held = latest.get(report.domain)
    if (!held || report.scannedAt > held.scannedAt) latest.set(report.domain, report)
  }
  return latest
}

export async function buildComparison(subject: Report): Promise<Comparison> {
  const all = latestPerDomain(await getStore().listReports(500))
  all.set(subject.domain, subject)

  const category = categoryFor(subject.domain)
  const scanned = [...all.values()]

  const percentile =
    scanned.length >= SAMPLE_FLOOR
      ? {
          betterThan: scanned.filter((report) => report.scorecard.total < subject.scorecard.total).length,
          outOf: scanned.length,
        }
      : null

  if (!category) return { category: null, peers: [], rankInCategory: null, percentile, beatenOn: [] }

  const peerReports = category.domains
    .map((domain) => all.get(domain))
    .filter((report): report is Report => Boolean(report))

  const peers: Peer[] = peerReports
    .map((report) => ({
      domain: report.domain,
      total: report.scorecard.total,
      max: report.scorecard.max,
      isSubject: report.domain === subject.domain,
    }))
    .sort((a, b) => b.total - a.total || a.domain.localeCompare(b.domain))

  const position = peers.findIndex((peer) => peer.isSubject) + 1
  const rankInCategory = position > 0 && peers.length >= 3 ? { position, outOf: peers.length } : null

  const beatenOn = subject.scorecard.checks
    .filter((check) => check.points < check.max && !check.inconclusive)
    .map((check) => {
      const winners = peerReports
        .filter((report) => report.domain !== subject.domain)
        .filter((report) => {
          const theirs = report.scorecard.checks.find((peerCheck) => peerCheck.id === check.id)
          return theirs !== undefined && theirs.points === theirs.max
        })
        .map((report) => report.domain)
      return { checkLabel: check.label, peers: winners }
    })
    .filter((entry) => entry.peers.length > 0)
    .sort((a, b) => b.peers.length - a.peers.length)
    .slice(0, 4)

  return { category, peers, rankInCategory, percentile, beatenOn }
}
