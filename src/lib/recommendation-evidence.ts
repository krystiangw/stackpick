import { createHash } from 'node:crypto'
import type { Report } from './store'

/** Excludes delivery metadata; includes everything the scanner observed and scored. */
export function recommendationReviewInput(report: Report, question: string | null) {
  return {
    domain: report.domain,
    question,
    scanFingerprint: createHash('sha256').update(JSON.stringify({
      domain: report.domain, scannedAt: report.scannedAt, findings: report.findings, scorecard: report.scorecard,
    })).digest('hex'),
    checkIds: report.scorecard.checks.map((check) => check.id),
    requiredCheckIds: report.scorecard.checks
      .filter((check) => !check.notApplicable && (check.inconclusive || check.points < check.max))
      .map((check) => check.id),
  }
}
