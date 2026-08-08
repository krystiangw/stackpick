import { CURATED_DOMAINS } from './categories'
import { CHECKS, STAGES, type Stage } from './score'
import { getStore, type Report } from './store'

/**
 * The industry picture, computed from the store at request time. Hardcoding the numbers
 * would make the page a claim; recomputing makes it the same measurement anyone can rerun
 * against the same domains.
 */

export type CheckTally = {
  id: string
  label: string
  stage: Stage
  pass: number
  /** Scored above zero but below the maximum. Counting these as failures made a vendor
   *  answering two of nine entry paths read as answering none. */
  partial: number
  zero: number
  unmeasurable: number
}

export type IndustryReport = {
  sampleSize: number
  formulaVersion: string
  max: number
  median: number
  mean: number
  scannedFrom: string
  scannedTo: string
  stages: {
    stage: Stage
    letter: string
    title: string
    question: string
    /** Share of the points we could actually measure, not of the points on paper. */
    share: number
    /** How many domains contributed a measurable check at this stage. */
    measuredOn: number
  }[]
  checks: CheckTally[]
  best: { domain: string; total: number; measurable: number; reportId: string }[]
  worst: { domain: string; total: number; measurable: number; reportId: string }[]
}

const MINIMUM_SAMPLE = 20

export async function buildIndustryReport(): Promise<IndustryReport | null> {
  const all = (await getStore().latestPerDomain(500)).filter((report) => CURATED_DOMAINS.has(report.domain))
  if (all.length === 0) return null

  // Mixing formula versions would compare scores that were never comparable, so the report
  // is always about one formula: whichever version most of the corpus was scored under.
  const byVersion = new Map<string, Report[]>()
  for (const report of all) {
    const version = report.scorecard.formulaVersion
    byVersion.set(version, [...(byVersion.get(version) ?? []), report])
  }
  const [formulaVersion, reports] = [...byVersion.entries()].sort((a, b) => b[1].length - a[1].length)[0]
  if (reports.length < MINIMUM_SAMPLE) return null

  const totals = reports.map((report) => report.scorecard.total).sort((a, b) => a - b)
  const measurableOf = (report: Report) => report.scorecard.measurable ?? report.scorecard.max
  const middle = Math.floor(totals.length / 2)
  const median = totals.length % 2 === 0 ? (totals[middle - 1] + totals[middle]) / 2 : totals[middle]
  const mean = totals.reduce((sum, total) => sum + total, 0) / totals.length

  // Denominator is the points we could measure. Folding our own blind spots into the
  // market's failures would make the funnel collapse look worse than we can prove it is,
  // which is exactly the sentence printed two sections below on the same page.
  const stages = STAGES.map((stage) => {
    const shares: number[] = []
    for (const report of reports) {
      const inStage = report.scorecard.checks.filter((check) => check.stage === stage.id && !check.inconclusive)
      const available = inStage.reduce((sum, check) => sum + check.max, 0)
      if (available === 0) continue
      shares.push(inStage.reduce((sum, check) => sum + check.points, 0) / available)
    }
    return {
      stage: stage.id,
      letter: stage.letter,
      title: stage.title,
      question: stage.question,
      share: shares.length > 0 ? shares.reduce((sum, share) => sum + share, 0) / shares.length : 0,
      measuredOn: shares.length,
    }
  })

  const checks: CheckTally[] = CHECKS.map((check) => {
    const tally = { id: check.id, label: check.label, stage: check.stage, pass: 0, partial: 0, zero: 0, unmeasurable: 0 }
    for (const report of reports) {
      const scored = report.scorecard.checks.find((entry) => entry.id === check.id)
      if (!scored) continue
      if (scored.inconclusive) tally.unmeasurable += 1
      else if (scored.points === scored.max) tally.pass += 1
      else if (scored.points > 0) tally.partial += 1
      else tally.zero += 1
    }
    return tally
  })

  const ranked = [...reports].sort(
    (a, b) => b.scorecard.total / measurableOf(b) - a.scorecard.total / measurableOf(a) || b.scorecard.total - a.scorecard.total,
  )
  const asEntry = (report: Report) => ({
    domain: report.domain,
    total: report.scorecard.total,
    measurable: measurableOf(report),
    reportId: report.id,
  })
  const scanTimes = reports.map((report) => report.scannedAt).sort()

  return {
    sampleSize: reports.length,
    formulaVersion,
    // Every report in the slice shares a formula version, so they share a maximum.
    max: Math.max(...reports.map((report) => report.scorecard.max)),
    median,
    mean,
    scannedFrom: scanTimes[0],
    scannedTo: scanTimes[scanTimes.length - 1],
    stages,
    checks,
    best: ranked.slice(0, 5).map(asEntry),
    worst: ranked.slice(-5).reverse().map(asEntry),
  }
}
