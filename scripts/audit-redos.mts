/**
 * Which of our regexes a hostile page can hang us with.
 *
 *   npx tsx scripts/audit-redos.mts
 *
 * The scanner reads bodies it did not write, with dozens of patterns, and one of them has already
 * cost 10.1 s on 600 kB of unclosed tags. A scan that stalls is not a security incident on its own,
 * but it burns the 27 second budget and publishes several verdicts as unmeasured, which is a lie
 * about the vendor produced by us.
 *
 * Feeds shapes a page can actually take, at the size the scanner caps bodies at, through the real
 * readers. Reports anything over a fifth of a second: the whole budget is 27, and one page has no
 * business taking that much of it.
 *
 * Runs nothing over the network and needs no database.
 */
import { stripCodeBlocks, visibleTextLength, withoutTags, looksLikeHtml, isRealTextFile } from '../src/lib/scan/http'

const CAP = 400_000

const SHAPES: { name: string; body: string }[] = [
  { name: 'niezamkniete tagi', body: '<script '.repeat(CAP / 8) },
  { name: 'niezamkniety komentarz', body: `<!--${'a'.repeat(CAP - 4)}` },
  { name: 'zagniezdzone tagi', body: '<div>'.repeat(CAP / 10) },
  { name: 'same spacje', body: ' '.repeat(CAP) },
  { name: 'jedno slowo bez konca', body: 'a'.repeat(CAP) },
  { name: 'cudzyslowy bez pary', body: '"'.repeat(CAP) },
  { name: 'atrybuty bez wartosci', body: `<a ${'href '.repeat(CAP / 10)}>` },
  { name: 'ukosniki', body: '</'.repeat(CAP / 2) },
  { name: 'znaki mniejszosci', body: '<'.repeat(CAP) },
  { name: 'encje bez srednika', body: '&amp'.repeat(CAP / 4) },
]

const READERS: { name: string; read: (body: string) => unknown }[] = [
  { name: 'stripCodeBlocks', read: (body) => stripCodeBlocks(body) },
  { name: 'withoutTags', read: (body) => withoutTags(body) },
  { name: 'visibleTextLength', read: (body) => visibleTextLength(body) },
  { name: 'looksLikeHtml', read: (body) => looksLikeHtml(asFetched(body)) },
  { name: 'isRealTextFile', read: (body) => isRealTextFile(asFetched(body)) },
  // The one the price rule runs on every pricing page, and the shape it takes there.
  { name: 'wzorzec cenowy na widocznym tekscie', read: (body) => withoutTags(body).toLowerCase().match(/\$\d/g)?.length ?? 0 },
]

const asFetched = (body: string) =>
  ({ ok: true, status: 200, url: 'https://x.test/a', body, headers: { 'content-type': 'text/html' }, truncated: false }) as never

const SLOW_MS = 200
let slow = 0

console.log(`\nkazdy ksztalt ma ${CAP.toLocaleString('pl-PL')} znakow, czyli tyle, ile najwyzej czytamy\n`)
for (const reader of READERS) {
  const times: string[] = []
  for (const shape of SHAPES) {
    const started = process.hrtime.bigint()
    reader.read(shape.body)
    const ms = Number(process.hrtime.bigint() - started) / 1_000_000
    if (ms >= SLOW_MS) {
      slow += 1
      times.push(`${shape.name}: ${ms.toFixed(0)} ms`)
    }
  }
  console.log(`  ${reader.name.padEnd(30)} ${times.length === 0 ? 'wszystkie ksztalty ponizej 200 ms' : times.join(', ')}`)
}

console.log(
  slow === 0
    ? '\nZaden ksztalt nie zabiera zauwazalnej czesci budzetu skanu.\n'
    : `\n${slow} par czytelnik-ksztalt powyzej 200 ms. Kazda z nich to kawalek z 27 sekund, ktory vendor moze nam zabrac.\n`,
)
