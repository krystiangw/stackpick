import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'

/**
 * What one week of free monitoring would actually cost, measured rather than assumed.
 *
 * The pricing question is whether the deterministic half of the product can be given away. That
 * turns on the marginal cost of a rescan, which we have never put a number on: 1009 stored scans
 * each carry the wall clock and the probe count of the run that produced them.
 *
 *   MONGODB_URI=$(heroku config:get MONGODB_URI -a stackpick) npx tsx scripts/watch-cost.mts
 */
const store = getStore()

const seconds: number[] = []
let rows = 0
let stored = 0

for (const domain of CURATED_DOMAINS) {
  const report = await store.latestForDomain(domain)
  if (!report) continue
  if (report.findings.durationMs) seconds.push(report.findings.durationMs / 1000)
  rows += 1
  stored += Buffer.byteLength(JSON.stringify(report))
}

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)

console.log(`${rows} wierszy, ${seconds.length} z zapisanym czasem\n`)
console.log(`mediana czasu skanu:      ${median(seconds).toFixed(1)} s`)
console.log(`najdluzszy skan:          ${Math.max(...seconds).toFixed(1)} s`)
console.log(`laczny czas przebiegu:    ${(sum(seconds) / 60).toFixed(1)} min dla ${seconds.length} domen`)
console.log(`srednia waga wiersza:     ${(stored / rows / 1024).toFixed(1)} kB`)

// A dyno-hour is the only thing Heroku charges for, so the honest unit is dyno time per week.
for (const domains of [100, 1000, 10_000]) {
  const dynoHours = (domains * median(seconds)) / 3600
  const storageMb = (domains * (stored / rows)) / 1024 / 1024
  console.log(
    `\n${domains} obserwowanych domen: ${dynoHours.toFixed(1)} h dyno/tydzien, ` +
      `${storageMb.toFixed(0)} MB na kazdy zachowany tydzien`,
  )
}
process.exit(0)
