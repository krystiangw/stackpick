/**
 * Migawka PELNYCH werdyktow SPRZED przemiatu na 9.57, robiona ZANIM ruszy.

 * PREDYKCJA, zapisana zanim zobaczylem wynik. 9.56 nauczylo mnie, ze predykcje o formule pisze sie
 * WASKO - tam napisalem zdanie o calym swiecie i cztery dni dryfu vendorow je obalily.
 *
 * 1. 9.57 moze korpusowi prozy tylko DODAC tekstu, wiec check frazowy nie moze przez NIA stracic
 *    punktu. Kazdy spadek na `programmatic_provisioning` jest dryfem vendora, nie nasza zmiana.
 * 2. vercel.com: programmatic_provisioning 0/2 -> 2/2.
 * 3. Cztery firmy (tigrisdata.com, typesense.org, courier.com, vercel.com) dostaja w zdaniu
 *    llms_txt slowa "llms.txt and llms-full.txt present". Punkty llms_txt u zadnej z nich nie ruszaja.
 * 4. Poza vercel.com zaden inny wiersz nie zmieni punktow Z POWODU 9.57. Zmierzone wczesniej na 26
 *    domenach lokalnie: ruszyl jeden check i to w kierunku, ktorego ta zmiana wywolac nie moze.
 *
 *   MONGODB_URI=... npx tsx scripts/przed-9-57.mts
 *
 * Zapisuje `src/data/przed-9-57.json`. Czyta trzy checki, ktorych dotyka 9.57, i zapisuje
 * werdykt, a nie punkty: przejscie z oskarzenia w „niemierzalne" nie rusza punktow, a jest dokladnie
 * tym, co potrafi zrobic zmiana w tym, co skan przeczytal.
 */
import { writeFileSync } from 'node:fs'
import { MongoClient } from 'mongodb'
import { CURATED_DOMAINS } from '../src/lib/categories'
import { refuseIfNothingMeasured } from './nothing-measured'

if (!process.env.MONGODB_URI) {
  console.log('MONGODB_URI nie jest ustawione. Uruchom:')
  console.log('  MONGODB_URI=$(heroku config:get MONGODB_URI -a stackpick) npx tsx scripts/przed-9-57.mts')
  process.exit(1)
}

const WATCHED = [
  'programmatic_provisioning',
  'llms_txt',
  'mcp_present',
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
writeFileSync('src/data/przed-9-57.json', `${JSON.stringify(snapshot, null, 2)}\n`)

const versions = new Map<string, number>()
for (const row of snapshot) versions.set(row.formulaVersion, (versions.get(row.formulaVersion) ?? 0) + 1)
console.log(`zapisane wiersze: ${snapshot.length}`)
console.log([...versions].map(([v, n]) => `  ${v}: ${n}`).join('\n'))
await client.close()
process.exit(0)
