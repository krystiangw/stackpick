/**
 * Czy opublikowany czas skanu nadal opisuje ostatnie siedem dni w magazynie.
 *
 *   MONGODB_URI=... npx tsx scripts/scan-latency.mts
 */
import { readFileSync } from 'node:fs'
import { MongoClient } from 'mongodb'
import { refuseIfNothingMeasured } from './nothing-measured'

if (!process.env.MONGODB_URI) {
  console.log('MONGODB_URI nie jest ustawione. Uruchom:')
  console.log('  MONGODB_URI=$(heroku config:get MONGODB_URI -a stackpick) npx tsx scripts/scan-latency.mts')
  process.exit(1)
}

const windowEnd = new Date()
const windowStart = new Date(windowEnd.getTime() - 7 * 24 * 60 * 60 * 1000)
const client = await MongoClient.connect(process.env.MONGODB_URI)
const reports = client.db(process.env.MONGODB_DB || 'stackpick').collection('reports')
const rows = await reports
  .find(
    { scannedAt: { $gte: windowStart.toISOString(), $lte: windowEnd.toISOString() }, 'findings.durationMs': { $type: 'number' } },
    { projection: { 'findings.durationMs': 1 } },
  )
  .toArray()
await client.close()

// Czas stoi w `findings.durationMs`, nie na wierzchu wiersza. Pierwsza wersja czytala
// `durationMs` z korzenia i widziala ZERO skanow - straznik „zero pomiarow" zlapal to przy
// pierwszym uruchomieniu, zamiast wydrukowac percentyle pustego zbioru.
const durations = rows
  .map((row) => (row as unknown as { findings?: { durationMs?: number } }).findings?.durationMs)
  .filter((one): one is number => typeof one === 'number')
  .sort((a, b) => a - b)
console.log(`przeczytanych skanow: ${durations.length}`)
console.log(`okno: ${windowStart.toISOString()} - ${windowEnd.toISOString()}`)
refuseIfNothingMeasured(durations.length, 'skanow z durationMs')

function percentile(values: number[], fraction: number): number {
  const position = (values.length - 1) * fraction
  const lower = Math.floor(position)
  const remainder = position - lower
  return values[lower] + ((values[lower + 1] ?? values[lower]) - values[lower]) * remainder
}

const medianSeconds = percentile(durations, 0.5) / 1000
const p90Seconds = percentile(durations, 0.9) / 1000
const withinTenPercent = durations.filter((duration) => duration <= 10_000).length / durations.length * 100
console.log(`mediana: ${medianSeconds.toFixed(1)} s`)
console.log(`p90: ${p90Seconds.toFixed(1)} s`)
console.log(`w 10 s: ${withinTenPercent.toFixed(1)}%`)

type Claim = { median: number; p90: number; withinTen: number; measuredOn: string; scans: number }
function publishedClaim(path: string): Claim {
  // Zdanie w pliku jest ZAWINIETE, wiec dopasowanie liczy sie na tekscie ze splaszczonymi bialymi
  // znakami. Bez tego kontrolka oblewala nie dlatego, ze zdania nie ma, tylko dlatego, ze ma dwie linie.
  const text = readFileSync(path, 'utf8').replace(/\s+/g, ' ')
  const match = /Half of our scans finish in ([\d.]+) seconds and nine in ten within ([\d.]+) seconds; ([\d.]+) percent are done inside 10 seconds \(measured over the 7 days to (\d{4}-\d{2}-\d{2}), (\d+) scans\)\./.exec(text)
  if (!match) {
    console.error(`KONTROLKA OBLANA: parser nie znalazl mediany, p90 i udzialu w ${path}; cisza nie oznacza braku rozjazdu`)
    process.exit(1)
  }
  return { median: Number(match[1]), p90: Number(match[2]), withinTen: Number(match[3]), measuredOn: match[4], scans: Number(match[5]) }
}

let drift = false
for (const path of ['public/agents.md', 'public/agent-signup.md']) {
  const claim = publishedClaim(path)
  for (const [label, published, measured] of [
    ['mediana', claim.median, medianSeconds],
    ['p90', claim.p90, p90Seconds],
  ] as const) {
    if (Math.abs(published - measured) / measured > 0.3) {
      console.error(`${path}: ${label} opublikowana ${published.toFixed(1)} s, zmierzona ${measured.toFixed(1)} s`)
      drift = true
    }
  }
  if (Math.abs(claim.withinTen - withinTenPercent) > 10) {
    console.error(`${path}: udzial w 10 s opublikowany ${claim.withinTen.toFixed(1)}%, zmierzony ${withinTenPercent.toFixed(1)}%`)
    drift = true
  }
  // Data i liczba skanow to tez czesc tego zdania i tez potrafia sie zestarzec w ciszy, gdy same
  // sekundy trzymaja sie w tolerancji (codex). Ale bramka „data musi byc dzisiejsza" byla by
  // czerwona kazdego dnia i nikt by jej nie czytal, wiec: po 30 dniach przypomnienie, po 90
  // oblanie - wtedy zdanie opisuje juz inny ruch niz ten, ktory mamy.
  const dni = Math.floor((windowEnd.getTime() - new Date(`${claim.measuredOn}T00:00:00Z`).getTime()) / 86_400_000)
  if (dni > 90) {
    console.error(`${path}: zdanie mowi „measured ... to ${claim.measuredOn}", czyli ${dni} dni temu - przelicz je i wpisz nowa date`)
    drift = true
  } else if (dni > 30) {
    console.log(`PRZYPOMNIENIE: ${path} niesie pomiar sprzed ${dni} dni (${claim.measuredOn}); liczby wciaz sie zgadzaja, ale data starzeje sie sama`)
  }
  if (claim.scans > 0 && Math.abs(claim.scans - durations.length) / durations.length > 0.5) {
    console.log(`PRZYPOMNIENIE: ${path} mowi o ${claim.scans} skanach, dzisiejsze okno ma ${durations.length}`)
  }
}

// Cisza czyta sie jak awaria czytnika, wiec zgodnosc mowi o sobie i nazywa oba pliki.
if (!drift) console.log('oba pliki dla agentow mowia to, co zmierzone: public/agents.md, public/agent-signup.md')
process.exit(drift ? 1 : 0)
