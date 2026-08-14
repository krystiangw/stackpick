import { CURATED_DOMAINS } from '../src/lib/categories'
import { FORMULA_VERSION } from '../src/lib/score'
import { getStore } from '../src/lib/store'

/**
 * The domains a reseed would actually change, and nothing else.
 *
 * A full reseed writes 340 reports across two passes. When the cluster is a megabyte from its
 * quota that is the difference between finishing and blocking half way, and half way is how the
 * corpus ended up split across two formula versions in the first place: we publish the majority
 * version, so an abandoned reseed takes the published set from 170 vendors to 88 without
 * producing an error anywhere.
 *
 *   npx tsx scripts/stale-domains.mts            # one per line
 *   DOMAINS=$(npx tsx scripts/stale-domains.mts) scripts/reseed.sh
 */
const store = getStore()
const stale: { domain: string; version: string }[] = []
const cohort = new Map<string, number>()

for (const domain of CURATED_DOMAINS) {
  const report = await store.latestForDomain(domain)
  // Never scanned is stale too: it is missing from the corpus and one scan adds it.
  if (report && report.scorecard.formulaVersion === FORMULA_VERSION) continue
  const version = report?.scorecard.formulaVersion ?? 'brak'
  stale.push({ domain, version })
  cohort.set(version, (cohort.get(version) ?? 0) + 1)
}

/**
 * Biggest stale cohort first, because a window can close at any moment and not every write is
 * worth the same. We publish the majority formula version, so rescanning a row from the largest
 * cohort moves the crossover by two: one off the leader, one onto the current version. Rescanning
 * a row from a small cohort moves it by one. On 14 August the published set sat three writes from
 * flipping and a window gave out after forty, so the order these go out in decides whether a short
 * window buys a correct corpus or only a smaller one.
 */
stale.sort((a, b) => (cohort.get(b.version) ?? 0) - (cohort.get(a.version) ?? 0))

console.error(`${stale.length} z ${CURATED_DOMAINS.size} domen nie jest na formule ${FORMULA_VERSION}`)
console.error(`kolejnosc: ${[...cohort.entries()].sort((a, b) => b[1] - a[1]).map(([v, n]) => `${v}(${n})`).join(' ')}`)
console.log(stale.map((row) => row.domain).join('\n'))
process.exit(0)
