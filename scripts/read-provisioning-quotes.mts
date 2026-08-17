/**
 * What the credited rows of `programmatic_provisioning` actually stand on.
 *
 *   MONGODB_URI=... npx tsx scripts/read-provisioning-quotes.mts
 *
 * Three of the seven patterns are bare noun phrases - `management api`, `provisioning api`,
 * `account api` - and a bare phrase cannot tell "here is how to create a key from code" from a
 * heading in a comparison table. Until the reseed of 9.31 there was nothing to read: the quotes
 * were not stored, so tightening the rule would have been guesswork about our own corpus.
 *
 * It reads only, changes nothing, and prints the rows whose credit rests on one of those three
 * with the words that earned it.
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'
import { PROVISIONING_PATTERN_LABELS, corroboratesBareProvisioning } from '../src/lib/scan/funnel'

const BARE = new Set(['management api', 'provisioning api', 'account api'])

const store = getStore()
let credited = 0
const onBare: { domain: string; points: number; quotes: string[] }[] = []
const labelCount = new Map<string, number>()

for (const domain of CURATED_DOMAINS) {
  const report = await store.latestForDomain(domain, true)
  const check = report?.scorecard.checks.find((one) => one.id === 'programmatic_provisioning')
  if (!report || !check || check.points === 0 || check.inconclusive || check.notApplicable) continue
  credited += 1
  const findings = report.findings as unknown as { funnel?: { provisioning?: { programmatic?: string[]; programmaticQuotes?: string[] } } }
  const matched = findings.funnel?.provisioning?.programmatic ?? []
  const quotes = findings.funnel?.provisioning?.programmaticQuotes ?? []
  for (const label of matched) labelCount.set(label, (labelCount.get(label) ?? 0) + 1)
  // Only where every pattern that fired is one of the bare three: a row that also matched the
  // conjunction rule has evidence a tightening would not take away.
  if (matched.length > 0 && matched.every((label) => BARE.has(label))) onBare.push({ domain, points: check.points, quotes })
}

console.log(`${credited} wierszy z punktem za programmatic_provisioning\n`)
console.log('ile razy zadzialal ktory wzorzec:')
for (const label of PROVISIONING_PATTERN_LABELS) {
  const short = label.length > 60 ? `${label.slice(0, 57)}...` : label
  console.log(`  ${String(labelCount.get(label) ?? 0).padStart(3)}  ${short}`)
}

// Replayed against the stored quotes, which ARE the windows the tightened rule reads, so this is
// the measurement rather than a guess about it. A rescan can only confirm it.
const phraseIn = (quote: string) => [...BARE].find((bare) => quote.toLowerCase().includes(bare)) ?? ''
const keeps = onBare.filter((row) => row.quotes.some((quote) => corroboratesBareProvisioning(quote, phraseIn(quote))))
const loses = onBare.filter((row) => !keeps.includes(row))

console.log(`\n${onBare.length} wierszy stoi WYLACZNIE na golej frazie.`)
console.log(`Po zaostrzeniu: ${keeps.length} zostaje, ${loses.length} traci punkt.\n`)
console.log('ZOSTAJE (cytat niesie dowod):')
for (const row of keeps) {
  console.log(`  ${row.domain} (${row.points} pkt)`)
  for (const quote of row.quotes) console.log(`      "${quote.slice(0, 130)}"`)
}
console.log('\nTRACI PUNKT:')
for (const row of loses) {
  console.log(`  ${row.domain} (${row.points} pkt)`)
  for (const quote of row.quotes) console.log(`      "${quote.slice(0, 130)}"`)
}
process.exit(0)
