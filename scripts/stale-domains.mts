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
const stale: string[] = []

for (const domain of CURATED_DOMAINS) {
  const report = await store.latestForDomain(domain)
  // Never scanned is stale too: it is missing from the corpus and one scan adds it.
  if (!report || report.scorecard.formulaVersion !== FORMULA_VERSION) stale.push(domain)
}

console.error(`${stale.length} z ${CURATED_DOMAINS.size} domen nie jest na formule ${FORMULA_VERSION}`)
console.log(stale.join('\n'))
process.exit(0)
