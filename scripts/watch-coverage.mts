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
import { categoryFor } from '../src/lib/categories'
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
console.log('domena                kategoria              pytanie   ostatnia cela')
let unservable = 0
for (const watch of watches) {
  const category = categoryFor(watch.domain)
  if (!category) {
    unservable += 1
    console.log(`${watch.domain.padEnd(22)} BRAK KATEGORII         -         -`)
    continue
  }
  const question = existsSync(join(asks, `${category.id}.md`))
  if (!question) unservable += 1
  const ran = lastCell(category.id)
  console.log(`${watch.domain.padEnd(22)} ${category.id.padEnd(22)} ${(question ? 'jest' : 'BRAK').padEnd(9)} ${ran ?? 'nigdy'}`)
}

console.log(
  `\n${unservable} z ${watches.length} obserwacji nie da sie dzis obsluzyc biegiem rozpoznawczym, a strona obiecuje go co miesiac`,
)
console.log('Domena spoza naszych 25 kategorii nie ma pytania, wiec nie ma celi. To jest do zamkniecia zanim ktos zaplaci.')
process.exit(0)
