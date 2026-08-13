import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'

const store = getStore()
const withFile: { domain: string; url: string; failing: string[] }[] = []
for (const domain of CURATED_DOMAINS) {
  const r = await store.latestForDomain(domain)
  if (!r?.findings.machine.hasLlmsTxt) continue
  const failing = r.scorecard.checks
    .filter((c) => ['agent_entry_point', 'programmatic_provisioning', 'signup_reachable'].includes(c.id))
    .filter((c) => c.points < c.max)
    .map((c) => c.id)
  withFile.push({ domain, url: `https://${domain}/llms.txt`, failing })
}
console.log(`${withFile.length} domen ma llms.txt`)
console.log(withFile.filter((d) => d.failing.length > 0).length, 'z nich oblewa co najmniej jeden check o drzwiach dla maszyny')
console.log(withFile.map((d) => d.domain).join(' '))
process.exit(0)
