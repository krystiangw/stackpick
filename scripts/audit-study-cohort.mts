import assert from 'node:assert/strict'
import { buildStudy } from '../src/lib/study'
import cells from '../src/data/cells.json'
import { CURATED_DOMAINS } from '../src/lib/categories'
import type { Report } from '../src/lib/store'
const reports = [...CURATED_DOMAINS].map((domain, index) => ({ domain, findings: { npm: { weeklyDownloads: index * 100 } }, scorecard: { checks: [{ id: 'oauth_dcr', points: index % 2 }] } } as unknown as Report))
const baseline = cells.filter(cell => cell.tool.startsWith('claude') || cell.tool.startsWith('codex'))
const added = {...baseline[0], tool:'agy fixture', model:'new', answers:[], rows:baseline[0].rows.map(row=>({...row,named:5,first:5}))}
const a=buildStudy(reports,baseline),b=buildStudy(reports,[...baseline,added])
assert.deepEqual(b.tools,a.tools)
assert.equal(b.namedAtLeastOnce,a.namedAtLeastOnce)
assert.equal(b.vendors,a.vendors)
for (const tool of a.tools) for (const measure of ['share','ever'] as const) assert.deepEqual(b.gap('oauth_dcr',tool,measure),a.gap('oauth_dcr',tool,measure))
assert.ok(!b.tools.includes('agy'))
console.log('PASS: selected-category expansion does not alter the original two-tool association study or turn missing observations into zero mentions.')
