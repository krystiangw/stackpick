/**
 * Migawka PELNYCH werdyktow SPRZED przemiatu na 9.55, robiona ZANIM ruszy.
 *
 *   MONGODB_URI=... npx tsx scripts/przed-9-55.mts
 *
 * Zapisuje `src/data/przed-9-55.json`. Czyta szesc checkow, ktorych dotknely 9.53, 9.54 i 9.55, i
 * zapisuje werdykt, a nie punkty: przejscie z oskarzenia w „niemierzalne" nie rusza punktow, a jest
 * dokladnie tym, co potrafi zrobic 9.54.
 */
import { writeFileSync } from 'node:fs'
import { MongoClient } from 'mongodb'
import { CURATED_DOMAINS } from '../src/lib/categories'
import { refuseIfNothingMeasured } from './nothing-measured'

if (!process.env.MONGODB_URI) {
  console.log('MONGODB_URI nie jest ustawione. Uruchom:')
  console.log('  MONGODB_URI=$(heroku config:get MONGODB_URI -a stackpick) npx tsx scripts/przed-9-55.mts')
  process.exit(1)
}

const WATCHED = [
  'agent_entry_point',
  'signup_no_captcha',
  'user_agents_allowed',
  'no_crawl_delay',
  'typed_package',
  'oauth_dcr',
] as const

type Check = { id: string; points: number; max: number; inconclusive?: boolean; notApplicable?: boolean }

const verdictOf = (c: Check | undefined) =>
  c === undefined ? null : `${c.points}/${c.max}${c.inconclusive ? ' niemierzalne' : ''}${c.notApplicable ? ' nie-dotyczy' : ''}`

const client = await MongoClient.connect(process.env.MONGODB_URI)
const reports = client.db(process.env.MONGODB_DB || 'stackpick').collection('reports')

const latest = new Map<string, { formulaVersion: string; scannedAt: string; checks: Record<string, string | null> }>()
for await (const row of reports.find({}, { projection: { domain: 1, scannedAt: 1, scorecard: 1 }, sort: { scannedAt: -1 } })) {
  const domain = row.domain as string
  if (!CURATED_DOMAINS.has(domain) || latest.has(domain)) continue
  const scorecard = row.scorecard as { formulaVersion: string; checks: Check[] }
  latest.set(domain, {
    formulaVersion: scorecard.formulaVersion,
    scannedAt: String(row.scannedAt).slice(0, 19),
    checks: Object.fromEntries(WATCHED.map((id) => [id, verdictOf(scorecard.checks.find((c) => c.id === id))])),
  })
}

refuseIfNothingMeasured(latest.size, 'wierszy korpusu')

const snapshot = [...latest]
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([domain, row]) => ({ domain, ...row }))
writeFileSync('src/data/przed-9-55.json', `${JSON.stringify(snapshot, null, 2)}\n`)

const versions = new Map<string, number>()
for (const row of snapshot) versions.set(row.formulaVersion, (versions.get(row.formulaVersion) ?? 0) + 1)
console.log(`zapisane wiersze: ${snapshot.length}`)
console.log([...versions].map(([v, n]) => `  ${v}: ${n}`).join('\n'))
await client.close()
process.exit(0)
