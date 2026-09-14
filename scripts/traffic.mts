/**
 * Kto naprawde odwiedza serwis: ludzie, agenty, nazwane crawlery, przemiatarki.
 *
 *   MONGODB_URI=... npx tsx scripts/traffic.mts [dni]
 *
 * Istnieje po to, zeby nikt drugi raz nie przeczytal kubelka `browser` jako „tylu ludzi". 14.09
 * licznik pokazywal 5200 renderow z rodzin przegladarkowych i wygladalo to na ruch. Rozbicie
 * pokazalo cos innego: 2186 wpisow pod `/r/<domena>` z MEDIANA 1, czyli ktos otwieral kilkadziesiat
 * roznych raportow dziennie, kazdy raz. Czlowiek tak nie czyta; tak chodzi przemiatarka podajaca sie
 * za Safari, a naszego licznika nie da sie o to zapytac wprost, bo swiadomie nie trzyma nic, po czym
 * dalo by sie rozpoznac wracajacego goscia.
 *
 * Dlatego ten skrypt nie drukuje jednej liczby „uzytkownicy". Drukuje trzy rzeczy obok siebie:
 * rendery wg rodzaju klienta, test przemiatu (ile roznych sciezek dziennie i ile renderow przypada
 * na sciezke) oraz interakcje, ktorych przemiatarka nie wykonuje - klikniecie w CTA, lead, watch.
 * Ta ostatnia sekcja jest jedyna twarda podloga ruchu ludzkiego, jaka mamy.
 *
 * Do czytania recznie. Nigdy w trakcie przemiatu.
 */
import { MongoClient } from 'mongodb'
import { kindOf, pathOf } from '../src/lib/visits'
import { refuseIfNothingMeasured } from './nothing-measured'

/** Pole `family` doszlo do licznika 24.08.2026; wczesniejsze wiersze maja sam rodzaj klienta. */
const FAMILY_SINCE = '2026-08-24'

/** Rodziny, za ktorymi MOZE siedziec czlowiek. Nie znaczy, ze siedzi: od tego jest test przemiatu. */
const BROWSER_FAMILIES = new Set(['chrome', 'safari', 'firefox', 'edge', 'opera'])

if (!process.env.MONGODB_URI) {
  console.log('MONGODB_URI nie jest ustawione. Uruchom:')
  console.log('  MONGODB_URI=$(heroku config:get MONGODB_URI -a stackpick) npx tsx scripts/traffic.mts')
  process.exit(1)
}

const days = Number(process.argv[2] ?? 30)
if (!Number.isFinite(days) || days < 1) {
  console.error(`"${process.argv[2]}" nie jest liczba dni.`)
  process.exit(1)
}

const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)
const client = await MongoClient.connect(process.env.MONGODB_URI)
const db = client.db(process.env.MONGODB_DB || 'stackpick')

type VisitRow = { day: string; path: string; count: number; family?: string }
// `probe` to wiersz kontrolny licznika, nie dzien; wpuszczony do sum klamalby o ostatniej dobie.
const rows = (await db.collection<VisitRow>('visits').find({ day: { $gte: since, $lte: '9999' } }).toArray()).filter(
  (row) => /^\d{4}-\d{2}-\d{2}$/.test(row.day),
)
refuseIfNothingMeasured(rows.length, 'wierszy licznika')

const add = (map: Map<string, number>, key: string, by: number) => map.set(key, (map.get(key) ?? 0) + by)
const ranked = (map: Map<string, number>, limit = 20) => [...map].sort((a, b) => b[1] - a[1]).slice(0, limit)
const pad = (value: number | string, width = 7) => String(value).padStart(width)

const byKind = new Map<string, number>()
const crawlers = new Map<string, number>()
const families = new Map<string, number>()
const browserPaths = new Map<string, number>()
// Renderow na SCIEZKE, nie na wiersz. Mongo trzyma osobny wiersz per rodzina, wiec jedna strona
// odwiedzona tego samego dnia z chrome'a i z firefoksa daje dwa wiersze po 1. Liczona po wierszach
// mediana wychodzila wtedy 1 i test przemiatu oskarzal o przemiat zwyklego ruchu z dwoch
// przegladarek, czyli dokladnie ten falszywy wniosek, przed ktorym ten skrypt ma bronic.
const perDay = new Map<string, Map<string, number>>()
let unclassified = 0

for (const row of rows) {
  const path = pathOf(row.path)
  const kind = kindOf(row.path)
  add(byKind, kind === 'agent' || kind === 'browser' ? kind : 'crawler', row.count)
  if (kind !== 'agent' && kind !== 'browser') add(crawlers, kind, row.count)
  if (kind !== 'browser') continue
  if (row.day < FAMILY_SINCE || !row.family) {
    unclassified += row.count
    continue
  }
  add(families, row.family, row.count)
  if (!BROWSER_FAMILIES.has(row.family)) continue
  add(browserPaths, path, row.count)
  const day = perDay.get(row.day) ?? new Map<string, number>()
  add(day, path, row.count)
  perDay.set(row.day, day)
}

/** Ile z okna jest starsze niz pole `family`, czyli o ilu dniach ponizsze sekcje nie mowia nic. */
const blindDays = since < FAMILY_SINCE ? [since, FAMILY_SINCE] : null

console.log(`# ruch od ${since} (${days} dni), ${rows.length} wierszy licznika\n`)

console.log('## rendery wg rodzaju klienta')
for (const [kind, count] of ranked(byKind)) console.log(pad(count), kind)
console.log(`\n## nazwane crawlery (ktory indeks ma szanse nas trzymac)`)
for (const [name, count] of ranked(crawlers)) console.log(pad(count), name)

console.log(`\n## kubelek "browser" wg rodziny`)
for (const [family, count] of ranked(families)) console.log(pad(count), family)
if (unclassified > 0) console.log(pad(unclassified), `bez rodziny (wiersze sprzed ${FAMILY_SINCE}, nie da sie zaklasyfikowac)`)

console.log('\n## test przemiatu: rodziny przegladarkowe, dzien po dniu')
console.log('  dzien       rendery  sciezki  mediana renderow na sciezke')
for (const [day, paths] of [...perDay].sort()) {
  const counts = [...paths.values()].sort((a, b) => a - b)
  const median = counts[Math.floor(counts.length / 2)]
  const renders = counts.reduce((sum, one) => sum + one, 0)
  console.log(`  ${day}  ${pad(renders)}  ${pad(paths.size)}  ${pad(median)}`)
}
console.log('  Mediana 1 przy kilkudziesieciu sciezkach dziennie to przemiat, nie czytelnik.')
if (blindDays) console.log(`  Bez ${blindDays[0]}..${blindDays[1]}: te wiersze nie maja rodziny.`)

console.log('\n## najczestsze sciezki rodzin przegladarkowych')
for (const [path, count] of ranked(browserPaths, 15)) console.log(pad(count), path)
if (blindDays) console.log(`  Bez ${blindDays[0]}..${blindDays[1]}: te wiersze nie maja rodziny.`)

console.log('\n## interakcje, ktorych przemiatarka nie wykonuje')
const clicks = [...browserPaths].filter(([path]) => path.startsWith('/click/'))
console.log(`klikniecia w CTA: ${clicks.reduce((sum, [, count]) => sum + count, 0)}`)
for (const [path, count] of clicks.sort((a, b) => b[1] - a[1])) console.log(pad(count), path)
if (blindDays) console.log(`  Bez ${blindDays[0]}..${blindDays[1]}: te wiersze nie maja rodziny.`)

const leads = await db.collection('leads').find({ createdAt: { $gte: since } }).sort({ createdAt: -1 }).toArray()
console.log(`\nleady: ${leads.length} w tym oknie, ${await db.collection('leads').countDocuments()} od poczatku`)
for (const lead of leads) console.log(' ', String(lead.createdAt).slice(0, 10), lead.domain, `(${lead.source})`)

const watches = await db.collection('watches').find({ createdAt: { $gte: since } }).toArray()
const confirmed = watches.filter((watch) => watch.confirmedAt).length
console.log(`\nwatche: ${watches.length} w tym oknie (${confirmed} potwierdzonych), ${await db.collection('watches').countDocuments()} od poczatku`)
for (const watch of watches) console.log(' ', String(watch.createdAt).slice(0, 10), watch.domain, watch.confirmedAt ? 'potwierdzony' : 'niepotwierdzony')

await client.close()
