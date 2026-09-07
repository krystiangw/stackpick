import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ReportView } from '../src/app/d/[id]/report-view'
import type { ReportModel } from '../src/lib/client-report-model'
import { readBriefReview, reportQuestion, requirePublishableBrief } from '../src/lib/report-brief'
import cells from '../src/data/cells.json'

// Every saved review must still describe the exact question in the recorded batches.
const reviewFiles = readdirSync('docs/brief-reviews').filter((file) => file.endsWith('.json'))
for (const file of reviewFiles) {
  const input = JSON.parse(readFileSync(`docs/brief-reviews/${file}`, 'utf8'))
  readBriefReview(input, {
    domain: file.slice(0, -5),
    category: input.category,
    question: reportQuestion(cells.filter((cell) => cell.category === input.category)),
  })
}
console.log(`Validated ${reviewFiles.length} saved brief reviews against recorded questions.`)

const expected = { domain: 'loops.so', category: 'transactional-email', question: reportQuestion(cells.filter((cell) => cell.category === 'transactional-email')) }
const raw = JSON.parse(readFileSync('docs/brief-reviews/loops.so.json', 'utf8'))
const review = readBriefReview(raw, expected)
assert.doesNotThrow(() => requirePublishableBrief(review))
assert.throws(() => requirePublishableBrief(null), /documented product fit/)
for (const status of ['partial', 'mismatch'] as const) assert.throws(() => requirePublishableBrief({ ...review, status }), /local drafts only/)
assert.throws(() => readBriefReview(raw, { ...expected, domain: 'transloadit.com' }), /different domain/)
assert.throws(() => readBriefReview(raw, { ...expected, question: 'Which marketing automation service should I use?' }), /different domain/)
assert.throws(() => readBriefReview(raw, { ...expected, category: 'file-storage' }), /different domain/)
assert.throws(() => readBriefReview({ ...raw, sources: [] }, expected), /at least one/)
assert.throws(() => readBriefReview({ ...raw, sources: [{ url: 'javascript:alert(1)', note: 'source' }] }, expected), /HTTP URLs/)
assert.throws(() => readBriefReview({ ...raw, reviewedAt: '2026-02-30' }, expected), /valid review date/)
assert.throws(() => readBriefReview({ ...raw, reviewedAt: '2999-01-01' }, expected), /future date/)
assert.throws(() => reportQuestion([{ question: 'Store screenshots' }, { question: 'Process uploaded video' }]), /different or empty/)
assert.throws(() => reportQuestion([{ question: '' }]), /different or empty/)
assert.equal(reportQuestion([]), null)
assert.equal(reportQuestion([{ question: 'Same task' }, { question: 'Same\n task ' }]), 'Same task')

// An old stored delivery must retain its numbers and visibly disclose the missing fit review.
const legacy: ReportModel = {
  domain: 'loops.so', category: 'Transactional email APIs', preparedAt: '2026-09-07',
  formulaVersion: '9.57', formulaNow: null, scannedAt: '2026-09-07', guest: false, missedByWord: 0,
  score: { total: 14, measurable: 17, max: 18 }, stages: [], question: expected.question, runsUrl: null,
  runs: [{ tool: 'codex', version: 'fixture', model: 'fixture', ran: '2026-09-07', count: 5, named: 0, blind: true }],
  named: { named: 0, first: 0, of: 5 }, rivals: [], quotes: [], failing: [], unmeasured: [], notApplicable: [],
  fixes: [{ label: 'Provisioning', gain: 2, effort: 'an afternoon', how: 'Document the existing key-creation path.' }],
  fixClaim: null, behindUnmeasured: 0,
}
const oldHtml = renderToStaticMarkup(createElement(ReportView, { model: legacy }))
assert.ok(oldHtml.includes('Question fit has not been reviewed'))
assert.ok(oldHtml.includes(' / 5 runs'))
assert.ok(oldHtml.indexOf('The task tested') < oldHtml.indexOf('Named by an agent'))
assert.equal(oldHtml.split(expected.question!).length - 1, 1)
const currentHtml = renderToStaticMarkup(createElement(ReportView, { model: {
  ...legacy, briefReview: review,
} }))
assert.ok(currentHtml.includes('Use case supported by product documentation'))
assert.ok(currentHtml.includes('https://loops.so/docs/transactional'))
assert.ok(currentHtml.includes('Recommendations have not been reviewed'))
assert.ok(!currentHtml.includes(legacy.fixes[0].how))
assert.ok(!currentHtml.includes('Question fit has not been reviewed'))
console.log('Report scope: question identity, review validation, delivery eligibility and legacy/current rendering passed.')
