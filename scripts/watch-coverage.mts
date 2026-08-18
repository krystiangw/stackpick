/**
 * Can we actually deliver what monitoring promises, for the domains people actually watch?
 *
 * `/pricing` says a watched domain gets real agents once a month: the same question put to an
 * agent five times, and how many of the five named you. That promise has a hole nobody had
 * looked at, because it was written the same day the harness was: **a discovery cell needs a
 * category and a question, and a visitor can watch any domain in the world.** One of the three
 * watches today is vercel.com, which we removed from the corpus on 2026-08-11 for having no
 * category we measure. There is no cell we can run for them, and nothing said so.
 *
 *   MONGODB_URI=... npm run watch-coverage
 *
 * It prints one line per watch and refuses to be reassuring: a watch we cannot serve is listed as
 * BRAK KATEGORII, which is the state that has to be fixed before somebody pays for it.
 */
import { existsSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { CATEGORIES, categoryFor } from '../src/lib/categories'
import { categoryOfWatch } from '../src/lib/watch'
import { getStore } from '../src/lib/store'

const runsRoot = process.env.LETAGENTSIN_RUNS ?? join(homedir(), '.letagentsin-runs')
const asks = join(new URL('.', import.meta.url).pathname, '..', 'harness', 'asks')

/** When a cell for this category last ran, read from the runs on disk rather than from a note. */
function lastCell(categoryId: string): string | null {
  const dir = join(runsRoot, 'ask', categoryId)
  if (!existsSync(dir)) return null
  const runs = readdirSync(dir).filter((name) => name.startsWith('run-'))
  const stamps = runs
    .map((name) => join(dir, name, 'RUN.json'))
    .filter((path) => existsSync(path))
    .map((path) => statSync(path).mtimeMs)
  return stamps.length === 0 ? null : new Date(Math.max(...stamps)).toISOString().slice(0, 10)
}

const store = getStore()
const watches = await store.listWatchesDue(500)
if (watches.length === 0) {
  console.log('brak aktywnych obserwacji')
  process.exit(0)
}

console.log(`${watches.length} aktywnych obserwacji\n`)
/** A cell is owed once a month, which is what /pricing promises a watched domain. */
const CELL_DUE_DAYS = 30
const daysSince = (day: string | null) =>
  day === null ? Number.POSITIVE_INFINITY : Math.floor((Date.now() - Date.parse(day)) / 86_400_000)

console.log('domena                kategoria              pytanie   ostatnia cela  stan')
let unservable = 0
/** Categories whose monthly cell is owed. Printed as commands, because a list nobody can act on
 * is how a promise made on the pricing page quietly stops being kept. */
const due: string[] = []
for (const watch of watches) {
  const category = categoryOfWatch(watch, categoryFor, CATEGORIES) as (typeof CATEGORIES)[number] | null
  if (!category) {
    unservable += 1
    console.log(`${watch.domain.padEnd(22)} BRAK KATEGORII         -         -`)
    continue
  }
  const question = existsSync(join(asks, `${category.id}.md`))
  if (!question) unservable += 1
  const ran = lastCell(category.id)
  const overdue = daysSince(ran) > CELL_DUE_DAYS
  if (overdue && question) due.push(category.id)
  console.log(
    `${watch.domain.padEnd(22)} ${category.id.padEnd(22)} ${(question ? 'jest' : 'BRAK').padEnd(9)} ${(ran ?? 'nigdy').padEnd(14)} ${
      overdue ? 'DO URUCHOMIENIA' : 'aktualna'
    }`,
  )
}

console.log(
  `\n${unservable} z ${watches.length} obserwacji nie da sie dzis obsluzyc biegiem rozpoznawczym, a strona obiecuje go co miesiac`,
)

// Druga polowa tej samej obietnicy. Skan robi `watch.yml` codziennie o 04:17, a endpoint uznaje
// pomiar za stary dopiero po szesciu dniach, wiec obserwacja miedzy 144 h a nastepnym przebiegiem
// czeka NORMALNIE, nie z awarii. Prog jest ten sam, ktorego pilnuje alarm w `quota.yml`, i LICZONY
// TAK SAMO: endpoint podaje dni zaokraglone, a workflow pada dopiero powyzej osmiu, wiec naprawde
// chodzi o 8,5 dnia. Liczac to inaczej, ten skrypt krzyczalby przez pol dnia, w ktorym alarm jest
// zdrowy, i przy pierwszej awarii nikt by nie wiedzial, ktoremu wierzyc.
// Od pierwszego skanu, a nie od nieskonczonosci: obserwacja zalozona przed chwila nie czeka za
// dlugo, tylko czeka. Liczone od POTWIERDZENIA, bo dopiero wtedy trafia do kolejki, wiec „nigdy nie
// skanowana" staje sie problemem dopiero wtedy, gdy naprawde minela kadencja od chwili, gdy dalo
// sie ja obsluzyc.
const waited = watches.map((watch) => ({
  domain: watch.domain,
  hours: (Date.now() - Date.parse(watch.checkedAt ?? watch.confirmedAt ?? watch.createdAt)) / 3600_000,
  everScanned: watch.checkedAt !== null,
}))
const isLate = (hours: number) => Math.round(hours / 24) > 8
const late = waited.filter((one) => isLate(one.hours))
const oldest = waited.reduce((worst, one) => (one.hours > worst.hours ? one : worst), { domain: 'brak', hours: 0, everScanned: true })
console.log(
  `\nkadencja skanow: najdluzsze czekanie to ${oldest.hours.toFixed(0)} h (${oldest.domain}${oldest.everScanned ? '' : ', jeszcze ani razu nie skanowana'}), alarm pada powyzej 8 zaokraglonych dni, a skan nalezy sie po 144 h`,
)
if (late.length > 0) {
  console.log(`${late.length} obserwacji CZEKA ZA DLUGO, dluzej niz obiecana kadencja z zapasem, wiec workflow Rescan watched domains albo nie chodzi, albo nie nadaza:`)
  for (const one of late) console.log(`  ${one.domain}: ${one.hours.toFixed(0)} h${one.everScanned ? '' : ' i ani jednego skanu od zalozenia'}`)
  console.log('  Sprawdz przebiegi workflow `Rescan watched domains` w GitHub Actions.')
} else {
  console.log('zadna obserwacja nie czeka dluzej, niz obiecujemy')
}
const owed = [...new Set(due)]
if (owed.length > 0) {
  console.log(`\n${owed.length} kategorii ma cele starsza niz ${CELL_DUE_DAYS} dni. Do uruchomienia:`)
  for (const id of owed) console.log(`  npm run ask -- ${id} claude sonnet 5`)
} else {
  console.log('\nkazda obserwowana kategoria ma cele mlodsza niz miesiac')
}
// Dwa rozne przypadki, ktore `categoryFor` zwraca tak samo: produkt, ktorego nie mierzymy wcale, i
// produkt z mierzonej kategorii, ktorego nie ma na naszej liscie. Drugi da sie dzis obsluzyc, ale
// tylko z decyzja czlowieka o kategorii i marce, bo zgadniete "email" dla email.com liczyloby kazde
// zdanie o mailu.
console.log(
  `Domena spoza naszych ${CATEGORIES.length} kategorii nie ma pytania, wiec nie ma celi. To jest do zamkniecia zanim ktos zaplaci.`,
)
console.log(
  'Jesli produkt NALEZY do mierzonej kategorii, a nie ma go na liscie, raport jednorazowy juz go obsluzy:',
)
console.log('  npx tsx scripts/client-report.mts <domena> --category <id> [--brand Nazwa]')
console.log('Miesieczna cela dla takiej obserwacji wymaga zapisania tej decyzji przy obserwacji, czego jeszcze nie ma.')
process.exit(0)
