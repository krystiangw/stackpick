import { publishedCorpus } from '../src/lib/published'
const c = await publishedCorpus()
const hit = c.reports.filter((r) =>
  (((r.findings as unknown as { funnel?: { entryPointsFound?: string[] } }).funnel?.entryPointsFound) ?? []).some(
    (p) => p.includes('agent-card.json') || p.includes('agent.json'),
  ),
)
console.log('kart A2A:', hit.length, 'z', c.reports.length)
console.log(hit.map((r) => r.domain).join(', '))
