/**
 * Predykcja z `przed-9-57.mts` skonfrontowana z korpusem po przemiecie.
 *
 *   MONGODB_URI=... npx tsx scripts/po-przemiacie-9-57.mts
 */
import { readFileSync } from 'node:fs'
import { MongoClient } from 'mongodb'
import { CURATED_DOMAINS } from '../src/lib/categories'
import { refuseIfNothingMeasured } from './nothing-measured'

if (!process.env.MONGODB_URI) {
  console.log('MONGODB_URI nie jest ustawione.')
  process.exit(1)
}

const WATCHED = ['programmatic_provisioning', 'llms_txt', 'mcp_present'] as const
type Check = { id: string; points: number; max: number; detail?: string; inconclusive?: boolean; notApplicable?: boolean }
const verdictOf = (c: Check | undefined) =>
  c === undefined ? null : `${c.points}/${c.max}${c.inconclusive ? ' niemierzalne' : ''}${c.notApplicable ? ' nie-dotyczy' : ''}`

const before = new Map<string, { checks: Record<string, string | null> }>(
  (JSON.parse(readFileSync('src/data/przed-9-57.json', 'utf8')) as { domain: string; checks: Record<string, string | null> }[])
    .map((r) => [r.domain, { checks: r.checks }]),
)

const client = await MongoClient.connect(process.env.MONGODB_URI)
const reports = client.db(process.env.MONGODB_DB || 'stackpick').collection('reports')

const after = new Map<string, { version: string; checks: Record<string, string | null>; llms: string }>()
for await (const row of reports.find({}, { projection: { domain: 1, scannedAt: 1, scorecard: 1 }, sort: { scannedAt: -1 } })) {
  const domain = row.domain as string
  if (!CURATED_DOMAINS.has(domain) || after.has(domain)) continue
  const card = row.scorecard as { formulaVersion: string; checks: Check[] }
  after.set(domain, {
    version: card.formulaVersion,
    checks: Object.fromEntries(WATCHED.map((id) => [id, verdictOf(card.checks.find((c) => c.id === id))])),
    llms: card.checks.find((c) => c.id === 'llms_txt')?.detail ?? '',
  })
}
refuseIfNothingMeasured(after.size, 'wierszy po przemiecie')

const stale = [...after].filter(([, r]) => r.version !== '9.57').map(([d]) => d)
console.log(`wierszy: ${after.size}, na 9.57: ${after.size - stale.length}${stale.length ? `, na starej formule: ${stale.join(', ')}` : ''}`)

let provDown = 0
let provUp = 0
const moved: string[] = []
for (const [domain, now] of after) {
  const was = before.get(domain)
  if (!was) continue
  for (const id of WATCHED) {
    const a = was.checks[id]
    const b = now.checks[id]
    if (a === b) continue
    moved.push(`${domain.padEnd(22)} ${id.padEnd(26)} ${a} -> ${b}`)
    if (id !== 'programmatic_provisioning') continue
    const points = (v: string | null) => Number((v ?? '0/0').split('/')[0])
    if (points(b) < points(a)) provDown++
    else if (points(b) > points(a)) provUp++
  }
}

console.log(`\n== ruszone werdykty na trzech obserwowanych checkach: ${moved.length}`)
console.log(moved.join('\n'))

console.log('\n== PREDYKCJE')
const czworka = ['tigrisdata.com', 'typesense.org', 'courier.com', 'vercel.com']
const nazwane = czworka.filter((d) => after.get(d)?.llms.includes('llms.txt and llms-full.txt present'))
console.log(`1. provisioning nie spada Z POWODU 9.57 (spadkow: ${provDown}) ${provDown === 0 ? 'TRAFIONA' : 'DO SPRAWDZENIA: kazdy spadek to dryf vendora albo blad modelu'}`)
console.log(`2. vercel.com provisioning ${before.get('vercel.com')?.checks.programmatic_provisioning} -> ${after.get('vercel.com')?.checks.programmatic_provisioning} ${after.get('vercel.com')?.checks.programmatic_provisioning === '2/2' ? 'TRAFIONA' : 'OBALONA'}`)
console.log(`3. czworka mowi "llms.txt and llms-full.txt present": ${nazwane.length}/4 (${nazwane.join(', ')}) ${nazwane.length === 4 ? 'TRAFIONA' : 'OBALONA'}`)
console.log(`4. provisioning w gore: ${provUp} wierszy`)

await client.close()
process.exit(0)
