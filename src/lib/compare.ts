import { categoryFor, type Category } from './categories'
import { publishedCorpus } from './published'
import type { Report } from './store'

export type Peer = { domain: string; total: number; max: number; isSubject: boolean }

/** Ranking on the paper maximum punished vendors whose sites we could not fully read. */
const share = (peer: { total: number; max: number }) => (peer.max === 0 ? 0 : peer.total / peer.max)

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

export async function buildComparison(subject: Report): Promise<Comparison> {
  // Ranking a frozen 2.1 score against peers rescored under 3.0 moved a vendor's position
  // while nothing about the vendor changed. Only like-for-like formulas are comparable.
  const all = new Map(
    // A visitor's own scan is compared against the published corpus, never added to it.
    (await publishedCorpus()).reports
      .filter((report) => report.scorecard.formulaVersion === subject.scorecard.formulaVersion)
      .map((report) => [report.domain, report]),
  )
  all.set(subject.domain, subject)

  const category = categoryFor(subject.domain)
  const scanned = [...all.values()]

  const percentile =
    scanned.length >= SAMPLE_FLOOR
      ? {
          betterThan: scanned.filter(
            (report) =>
              report.scorecard.total / (report.scorecard.measurable ?? report.scorecard.max) <
              subject.scorecard.total / (subject.scorecard.measurable ?? subject.scorecard.max),
          ).length,
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
      max: report.scorecard.measurable ?? report.scorecard.max,
      isSubject: report.domain === subject.domain,
    }))
    .sort((a, b) => share(b) - share(a) || b.total - a.total || a.domain.localeCompare(b.domain))

  const position = peers.findIndex((peer) => peer.isSubject) + 1
  const rankInCategory = position > 0 && peers.length >= 3 ? { position, outOf: peers.length } : null
  // A league table whose only row is the reader is not a comparison. It happened whenever a
  // visitor scanned the first domain we held in their category, and it read as a made-up ranking.
  if (peers.length < 3) return { category, peers: [], rankInCategory: null, percentile, beatenOn: [] }

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
