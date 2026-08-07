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
  fail: number
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
  stages: { stage: Stage; letter: string; title: string; question: string; share: number }[]
  checks: CheckTally[]
  best: { domain: string; total: number; reportId: string }[]
  worst: { domain: string; total: number; reportId: string }[]
}

function latestPerDomain(reports: Report[]): Report[] {
  const latest = new Map<string, Report>()
  for (const report of reports) {
    const held = latest.get(report.domain)
    if (!held || report.scannedAt > held.scannedAt) latest.set(report.domain, report)
  }
  return [...latest.values()]
}

const MINIMUM_SAMPLE = 20

export async function buildIndustryReport(): Promise<IndustryReport | null> {
  const all = latestPerDomain(await getStore().listReports(500))
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
  const middle = Math.floor(totals.length / 2)
  const median = totals.length % 2 === 0 ? (totals[middle - 1] + totals[middle]) / 2 : totals[middle]
  const mean = totals.reduce((sum, total) => sum + total, 0) / totals.length

  const stages = STAGES.map((stage) => {
    const shares = reports.map((report) => {
      const scored = report.scorecard.stages.find((entry) => entry.stage === stage.id)
      return scored && scored.max > 0 ? scored.points / scored.max : 0
    })
    return {
      stage: stage.id,
      letter: stage.letter,
      title: stage.title,
      question: stage.question,
      share: shares.reduce((sum, share) => sum + share, 0) / shares.length,
    }
  })

  const checks: CheckTally[] = CHECKS.map((check) => {
    const tally = { id: check.id, label: check.label, stage: check.stage, pass: 0, fail: 0, unmeasurable: 0 }
    for (const report of reports) {
      const scored = report.scorecard.checks.find((entry) => entry.id === check.id)
      if (!scored) continue
      if (scored.inconclusive) tally.unmeasurable += 1
      else if (scored.points === scored.max) tally.pass += 1
      else tally.fail += 1
    }
    return tally
  })

  const ranked = [...reports].sort((a, b) => b.scorecard.total - a.scorecard.total)
  const asEntry = (report: Report) => ({
    domain: report.domain,
    total: report.scorecard.total,
    reportId: report.id,
  })
  const scanTimes = reports.map((report) => report.scannedAt).sort()

  return {
    sampleSize: reports.length,
    formulaVersion,
    max: reports[0].scorecard.max,
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
