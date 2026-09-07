import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import attempts from '../src/data/agent-attempts.json'
import cells from '../src/data/cells.json'
import { AgentCoverageNotice } from '../src/components/agent-coverage-notice'
import { modelLabel } from '../src/lib/agent-label'
for(const batch of attempts){
 assert.ok(Number.isInteger(batch.attempted)&&batch.attempted>0)
 assert.ok(Number.isInteger(batch.answered)&&batch.answered>=0&&batch.answered<=batch.attempted)
 if(batch.answered<batch.attempted)assert.ok(batch.reason)
 const matched=cells.filter(cell=>cell.category===batch.category&&cell.tool===batch.tool&&cell.model===batch.model&&cell.ranAt===batch.date)
 assert.equal(matched.reduce((sum,cell)=>sum+cell.runs,0),batch.answered)
 const html=renderToStaticMarkup(createElement(AgentCoverageNotice,{batches:[batch]}))
 assert.equal(html.includes('Missing answers are excluded'),batch.answered<batch.attempted)
}
const missing={tool:'agy fixture',model:'gemini-fixture',date:'2026-09-07',attempted:5,answered:0,reason:'Fixture timeout'}
const html=renderToStaticMarkup(createElement(AgentCoverageNotice,{batches:[missing]}))
assert.ok(html.includes('Antigravity'));assert.ok(html.includes('0/5'));assert.ok(!html.includes('Cursor'))
assert.equal(modelLabel('auto'),'Auto (model not disclosed)')
console.log('PASS: attempt denominators match published answers; unsuccessful tools remain visible; Auto is not assigned an invented model.')
