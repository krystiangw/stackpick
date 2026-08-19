/**
 * Does the pricing description we quote still say nothing about the price?
 *
 *   MONGODB_URI=... npx tsx scripts/audit-snippet-live.mts [ile]
 *
 * `price_in_snippet` fails on ninety-odd rows and quotes the exact string it read, which makes it
 * the easiest verdict in the corpus to check and the easiest to be wrong about: the string is one
 * meta tag that marketing edits weekly.
 *
 * Rerunning our own predicate would only agree with itself, so this reads the live tag with the
 * scanner's `readSnippet` and then asks a **looser** question on top: does a plain search for money
 * or an entry condition see something the rule did not? Those are the rows a false accusation would
 * hide in, and they are printed to be read by hand, the way the 30th and 31st passes were.
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'
import { readSnippet } from '../src/lib/scan/funnel'
import { howManyRows, reportCap } from './how-many'
import { refuseIfNothingMeasured } from './nothing-measured'
import { AGENT_UA, CONTACT } from '../src/lib/scan/http'

const PAUSE_MS = 350
const store = getStore()
const most = howManyRows(40)

/** Deliberately careless, because its job is to find what a careful rule refuses to credit. */
const LOOSE_MONEY = /[$€£]\s?\d|\b\d+(?:[.,]\d+)?\s?(?:usd|eur|gbp|pln)\b|\bper (?:month|user|seat|request)\b/i
const LOOSE_ENTRY = /\bfree\b|\btrial\b|\bno credit card\b|\bfree tier\b|\bstarts? at\b/i

type Row = { domain: string; kind: string; read: string }
const found: Row[] = []
const nowPasses: string[] = []
const moved: string[] = []
/** Only snippets we actually read. A page that would not answer is not a snippet we inspected, and
 * counting it made "nothing to read" a sentence about requests rather than about descriptions. */
let checked = 0
/** Domen, przez ktore petla naprawde przeszla. Sufit trafiony na ostatniej z nich to nie obciecie. */
let visited = 0
const unread: string[] = []

for (const domain of CURATED_DOMAINS) {
  if (checked >= most) break
  visited += 1
  const report = await store.latestForDomain(domain, true)
  const check = report?.scorecard.checks.find((one) => one.id === 'price_in_snippet')
  if (!check || check.inconclusive || check.notApplicable || check.points > 0) continue
  const pricing = (report?.findings as unknown as { discovered?: { pricing?: string | null } })?.discovered?.pricing
  if (!pricing) continue
  await new Promise((done) => setTimeout(done, PAUSE_MS))
  try {
    const answer = await fetch(pricing, { headers: { 'user-agent': AGENT_UA, from: CONTACT, accept: 'text/html' }, signal: AbortSignal.timeout(10_000) })
    if (!answer.ok) {
      unread.push(`${domain} (${answer.status})`)
      continue
    }
    const snippet = readSnippet(await answer.text())
    checked += 1
    const read = snippet.description ?? snippet.opening ?? ''
    // The row is stale rather than wrong: they edited the tag since we read it.
    if (snippet.says.length > 0) {
      nowPasses.push(`${domain} (${snippet.says.join(', ')})`)
      continue
    }
    const quoted = check.detail.match(/“([^”]+)”/)?.[1]?.replace(/\.\.\.$/, '')
    if (quoted && !read.startsWith(quoted.slice(0, 60))) moved.push(domain)
    // The one that matters: a careless reader sees money or a way in, and the rule credited none.
    if (LOOSE_MONEY.test(read)) found.push({ domain, kind: 'kwota', read })
    else if (LOOSE_ENTRY.test(read)) found.push({ domain, kind: 'warunek wejscia', read })
  } catch {
    unread.push(`${domain} (brak odpowiedzi)`)
    continue
  }
  console.log(`${checked} opisow przeczytanych, ${found.length} do przejrzenia`)
}

reportCap(visited, CURATED_DOMAINS.size, checked)

console.log(`\n${checked} opisow przeczytanych na zywo${unread.length > 0 ? `, ${unread.length} cennikow nie odpowiedzialo: ${unread.join(', ')}` : ''}`)
console.log(
  found.length === 0
    ? 'nic do czytania: w zadnym opisie nie widac ani kwoty, ani warunku wejscia, ktorego regula by nie skredytowala'
    : `${found.length} OPISOW, w ktorych luzny czytelnik cos widzi, a regula nie - do przeczytania po kolei:`,
)
for (const one of found) console.log(`  ${one.domain.padEnd(20)} [${one.kind}] ${one.read.slice(0, 150)}`)
if (nowPasses.length > 0) console.log(`\n${nowPasses.length} wierszy juz by przeszlo (opis zmieniony po naszym skanie): ${nowPasses.join(', ')}`)
if (moved.length > 0) console.log(`\n${moved.length} wierszy cytuje string, ktorego juz tam nie ma: ${moved.join(', ')}`)
// Zero przeczytanych wierszy to nie jest „zdanie sie trzyma", tylko przebieg, ktory o niczym nie
// mowi. Bez tej bramki audyt uspokaja tym glosniej, im mniej zmierzyl.
refuseIfNothingMeasured(checked, 'opisow')

process.exit(0)
