import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readRecommendationReview, requireRecommendationReview } from '../src/lib/recommendation-review'
import { recommendationReviewInput } from '../src/lib/recommendation-evidence'
import type { Report } from '../src/lib/store'
import type { ReportModel } from '../src/lib/client-report-model'
import { ReportView } from '../src/app/d/[id]/report-view'

const expected = { domain: 'example.com', question: 'Send a test message', scanFingerprint: 'fixture', checkIds: ['machine_readable_api', 'mcp_present'], requiredCheckIds: ['machine_readable_api', 'mcp_present'] }
const item = { title: 'Use the existing API description', checkIds: expected.checkIds, disposition: 'no-change', finding: 'The guide already links to the spec.', nextStep: 'Test discovery from the guide.', validation: 'Record the retrieved specification URL.', sources: [{ url: 'https://example.com/docs', note: 'API guide.' }] }
const raw = { domain: expected.domain, question: expected.question, scanFingerprint: expected.scanFingerprint, reviewedAt: '2026-09-07', summary: 'Verify before proposing a new spec.', items: [item] }
const review = readRecommendationReview(raw, expected)
assert.doesNotThrow(() => requireRecommendationReview(review))
assert.throws(() => requireRecommendationReview(null), /Delivery needs/)
for (const changed of [{ domain: 'another.com' }, { question: 'Buy storage' }, { scanFingerprint: 'new-scan' }]) {
  assert.throws(() => readRecommendationReview(raw, { ...expected, ...changed }), /does not match/)
}
assert.throws(() => readRecommendationReview({ ...raw, items: [{ ...item, checkIds: ['machine_readable_api'] }] }, expected), /unreviewed/)
assert.throws(() => readRecommendationReview({ ...raw, items: [item, item] }, expected), /repeated/)
assert.throws(() => readRecommendationReview({ ...raw, items: [{ ...item, sources: [] }] }, expected), /sources/)
assert.throws(() => readRecommendationReview({ ...raw, items: [{ ...item, disposition: 'pass' }] }, expected), /disposition/)
assert.throws(() => readRecommendationReview({ ...raw, items: [{ ...item, sources: [{ url: 'javascript:alert(1)', note: 'bad' }] }] }, expected), /public HTTP/)
for (const reviewedAt of ['2026-02-30', '2999-01-01']) assert.throws(() => readRecommendationReview({ ...raw, reviewedAt }, expected), /date/)

// The signature must invalidate a review even when a stored scan changes in place.
const scan = { domain: 'example.com', scannedAt: '2026-09-07', findings: { fixture: 'original' }, scorecard: { checks: [{ id: 'machine_readable_api', points: 0, max: 1 }] } } as unknown as Report
const signature = recommendationReviewInput(scan, expected.question)
const changedScan = structuredClone(scan)
changedScan.scorecard.checks[0].points = 1
assert.notEqual(signature.scanFingerprint, recommendationReviewInput(changedScan, expected.question).scanFingerprint)
assert.notEqual(signature.scanFingerprint, recommendationReviewInput({ ...scan, scannedAt: '2026-09-08' }, expected.question).scanFingerprint)

const model: ReportModel = {
  domain: 'example.com', category: 'Fixture', preparedAt: '2026-09-07', scannedAt: '2026-09-07', formulaVersion: '9.57', formulaNow: null,
  guest: false, missedByWord: 0, score: { total: 7, measurable: 16, max: 18 }, stages: [], question: expected.question,
  named: { named: 0, first: 0, of: 15 }, runs: [{ tool: 'fixture', version: 'fixture', model: 'fixture', ran: '2026-09-07', count: 15, named: 0, blind: true }], runsUrl: null,
  rivals: [], quotes: [], failing: [], unmeasured: [], notApplicable: [],
  fixes: [{ label: 'Legacy advice', gain: 1, effort: 'minutes', how: 'Publish a new OpenAPI file.' }], fixClaim: 'Legacy gain claim', behindUnmeasured: 0,
}
for (const recommendationReview of [null, review]) {
  const html = renderToStaticMarkup(createElement(ReportView, { model: { ...model, recommendationReview } }))
  assert.ok(!html.includes('Publish a new OpenAPI file.'))
  assert.ok(!html.includes('Legacy gain claim'))
  assert.ok(html.includes(' / 15 runs'))
  if (recommendationReview) {
    for (const text of [item.title, item.finding, item.nextStep, item.validation, item.sources[0].url]) assert.ok(html.includes(text))
    assert.ok(html.includes('No change justified by this finding'))
    assert.ok(!html.includes('Recommendations have not been reviewed'))
  } else assert.ok(html.includes('Recommendations have not been reviewed'))
}
console.log('Recommendation review: scan binding, coverage, sources, publication gate and safe legacy/current rendering passed.')
