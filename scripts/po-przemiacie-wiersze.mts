/** Piec wierszy, o ktorych STATE.md zapisal predykcje przed przemiatem na 9.44. */
import { getStore } from '../src/lib/store'

const store = getStore()
const asked = [
  ['bigcommerce.com', 'agent_entry_point'],
  ['sentry.io', 'agent_entry_point'],
  ['calendly.com', 'agent_entry_point'],
  ['growthbook.io', 'programmatic_provisioning'],
  ['uploadcare.com', 'mcp_present'],
] as const

for (const [domain, id] of asked) {
  const report = await store.latestForDomain(domain, true)
  const check = report?.scorecard.checks.find((one) => one.id === id)
  const verdict = check === undefined ? 'BRAK CHECKU' : check.inconclusive ? 'NIEMIERZALNY' : (check.points ?? 0) > 0 ? `ZALICZONY ${check.points}` : 'OBLANY'
  console.log(`${domain.padEnd(18)} ${id.padEnd(28)} ${(report?.scorecard.formulaVersion ?? '?').padEnd(6)} ${verdict}`)
  if (check) console.log(`   ${check.detail.slice(0, 200)}`)
}
process.exit(0)
