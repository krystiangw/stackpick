import assert from 'node:assert/strict'
import { budgetDecision, isAccountLimit } from '../src/lib/discovery-budget'
const state={notBefore:'2026-09-11T08:00:00Z',paused:false}
assert.equal(budgetDecision(state,new Date('2026-09-10T23:59:59Z')),'waiting')
assert.equal(budgetDecision(state,new Date(state.notBefore)),'ready')
assert.equal(budgetDecision({...state,lastAttemptAt:state.notBefore},new Date('2026-09-11T23:59:59Z')),'waiting')
assert.equal(budgetDecision({...state,lastAttemptAt:state.notBefore},new Date('2026-09-12T08:00:00Z')),'ready')
assert.equal(budgetDecision({...state,paused:true},new Date('2027-01-01')),'paused')
assert.throws(()=>budgetDecision({...state,notBefore:'invalid'},new Date()),/Invalid/)
assert.ok(isAccountLimit("ActionRequiredError: You've hit your usage limit Get Cursor Pro"))
assert.ok(isAccountLimit('ActionRequiredError: Named models unavailable Free plans can only use Auto'))
assert.ok(!isAccountLimit('The recommended API has a usage limit.'))
console.log('PASS: reset date, one-request-per-UTC-day allowance, persistent quota pause and non-error text are distinguished.')
