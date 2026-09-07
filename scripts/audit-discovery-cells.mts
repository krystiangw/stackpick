import assert from 'node:assert/strict'
import { appendDiscoveryCells, discoveryCell, type DiscoveryRun } from '../src/lib/discovery-cell'
const category = { id: 'email', domains: ['loops.so', 'postmarkapp.com'] }
const run: DiscoveryRun = { question: 'Which email API?', answer: 'I would use Loops (loops.so).', meta: { run: 1, exitCode: 0, timedOut: false, model: 'auto', cli: 'cursor-agent fixture', finishedAt: '2026-09-07T12:00:00Z', operatorContext: ['/private/operator/AGENTS.md'], toolSettings: ['mode=ask'] } }
const cell = discoveryCell(category, [run, {...run, meta: {...run.meta, run: 2, exitCode: 1}}])!
assert.equal(cell.runs, 1); assert.equal(cell.model, 'auto'); assert.equal(cell.rows[0].named, 1)
assert.deepEqual(cell.operatorContext, ['AGENTS.md']); assert.deepEqual(cell.toolSettings, ['mode=ask'])
for (const meta of [{exitCode:1}, {timedOut:true}, {exitCode:null}]) assert.equal(discoveryCell(category,[{...run,meta:{...run.meta,...meta}}]),null)
assert.equal(discoveryCell(category,[{...run,answer:' '}]),null)
for (const change of [{model:'other'},{cli:'other'},{finishedAt:'2026-09-08T12:00:00Z'},{toolSettings:[]}]) assert.throws(()=>discoveryCell(category,[run,{...run,meta:{...run.meta,run:2,...change}}]),/mixed/)
assert.throws(()=>discoveryCell(category,[run,{...run,question:'Different',meta:{...run.meta,run:2}}]),/mixed/)
assert.throws(()=>discoveryCell(category,[run,run]),/duplicate/)
assert.throws(()=>discoveryCell(category,[{...run,question:''}]),/missing/)
assert.deepEqual(appendDiscoveryCells([cell],[cell]),[cell])
const historical = {...cell, toolSettings: undefined}
const reordered = {...cell, answers: cell.answers.map(answer => ({ first: answer.first, named: answer.named, text: answer.text, run: answer.run })), toolSettings: []}
assert.strictEqual(appendDiscoveryCells([historical], [reordered])[0], historical)
assert.throws(()=>appendDiscoveryCells([cell],[{...cell,answers:cell.answers.map(answer=>({...answer,text:'Changed evidence'}))}]),/refusing/)
assert.throws(()=>appendDiscoveryCells([cell],[{...cell,rows:cell.rows.map(row=>({...row,named:9}))}]),/refusing/)
assert.throws(()=>appendDiscoveryCells([cell],[{...cell,runs:9}]),/refusing/)
assert.throws(()=>appendDiscoveryCells([cell],[{...cell,tool:'agy fixture',question:'Different'}]),/question differs/)
const next={...cell,tool:'agy fixture'};assert.deepEqual(appendDiscoveryCells([cell],[next]),[cell,next])
console.log('PASS: failed calls excluded; frozen question/configuration protected; historical cells cannot be replaced; metadata paths stripped.')
