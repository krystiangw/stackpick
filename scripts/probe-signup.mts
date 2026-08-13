import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'

const store = getStore()
let failing = 0
const renders: string[] = []
const shapes = new Map<string, string[]>()

for (const domain of CURATED_DOMAINS) {
  const report = await store.latestForDomain(domain)
  if (!report) continue
  const check = report.scorecard.checks.find((c) => c.id === 'signup_reachable')
  if (!check || check.points === check.max || check.inconclusive || check.notApplicable) continue
  failing += 1
  const s = report.findings.funnel.signup
  if (s.rendersFormWithoutJs) renders.push(domain)
  const shape = `renders=${s.rendersFormWithoutJs} status=${s.status} reachable=${s.reachable}`
  shapes.set(shape, [...(shapes.get(shape) ?? []), domain])
}
console.log(`${failing} oblewa signup_reachable, ${renders.length} renderuje formularz bez JS`)
for (const [shape, list] of [...shapes].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${String(list.length).padStart(3)}  ${shape}   np. ${list.slice(0, 4).join(', ')}`)
}

for (const domain of ['contentful.com', 'pandadoc.com', 'namecheap.com']) {
  const report = await store.latestForDomain(domain)
  if (!report) continue
  const f = report.findings
  console.log(`\n${domain}: browser=${f.browserStatus} agent=${f.agentStatus}`)
  console.log('  ' + (report.scorecard.checks.find((c) => c.id === 'answers_plain_request')?.detail ?? ''))
}
process.exit(0)
