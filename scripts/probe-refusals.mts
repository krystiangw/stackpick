import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'

const store = getStore()
const states = new Map<string, string[]>()
const answersState = new Map<string, string[]>()

for (const domain of CURATED_DOMAINS) {
  const report = await store.latestForDomain(domain)
  if (!report) continue
  const s = report.findings.funnel.signup
  if (s.url) {
    const key = `reachable=${s.reachable} status=${s.status}`
    states.set(key, [...(states.get(key) ?? []), domain])
  }
  const a = report.scorecard.checks.find((c) => c.id === 'answers_plain_request')
  if (a && a.points < a.max && !a.inconclusive && !a.notApplicable) {
    const f = report.findings
    const same = f.browserStatus === f.agentStatus
    const key = `browser==agent? ${same} (browser ${f.browserStatus})`
    answersState.set(key, [...(answersState.get(key) ?? []), domain])
  }
}
console.log('stany strony rejestracji, wszystkie wiersze:')
for (const [k, v] of [...states].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${String(v.length).padStart(3)}  ${k}  ${v.slice(0, 5).join(', ')}`)
}
console.log('\nanswers_plain_request, tylko oblewajace:')
for (const [k, v] of answersState) console.log(`  ${String(v.length).padStart(3)}  ${k}  ${v.join(', ')}`)
process.exit(0)
