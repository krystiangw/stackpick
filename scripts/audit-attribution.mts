/**
 * Which package attribution picks today, against the one the published corpus stands on.
 *
 *   MONGODB_URI=... npx tsx scripts/audit-attribution.mts [ile]
 *
 * Written for the shape-ranking change (#47): `directus` outranked `@directus/sdk` on the shape of
 * the name alone, while the SDK had seven times the downloads and says what it is on the registry.
 * A change to that ranking touches every row, so it cannot ship on one example.
 *
 * Registry only: no vendor site is fetched, the corpus is read but never written, and nothing here
 * scores anything. **Do not run it while a sweep is in flight** - the scanner is asking npm the same
 * questions at the same time, and a rate limit reached here arrives there as a package nobody
 * publishes.
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'
import { searchNpmForDomain } from '../src/lib/scan/discover'
import { howManyRows } from './how-many'

const wszystkie = [...CURATED_DOMAINS]
const most = howManyRows(wszystkie.length, wszystkie.length)
const store = getStore()

let compared = 0
let same = 0
const moved: { domain: string; was: string; now: string }[] = []
const lost: string[] = []

/**
 * Slowly, and asking twice. A search returns nothing when ANY of its registry calls was refused,
 * which is deliberate - ranking half a shelf would answer off whichever request npm happened to
 * serve - but a loop over the whole corpus hits that refusal constantly where a scan, spread over
 * minutes and one domain at a time, does not. Three of the first six came back empty and none of
 * them had changed. Without this the measurement reads its own rate limit as a regression.
 */
const PAUSE_MS = 2500
const wait = (ms: number) => new Promise((done) => setTimeout(done, ms))

for (const domain of wszystkie.slice(0, most)) {
  const report = await store.latestForDomain(domain, true)
  const found = report?.findings as unknown as {
    discovered?: { npmPackage?: string | null; npmSource?: string | null; githubRepo?: string | null }
  }
  const was = found?.discovered?.npmPackage
  // Only rows the search decided. A package named on the vendor's own page is not chosen by the
  // ranking at all, so it says nothing about a change to it.
  if (!was || found?.discovered?.npmSource !== 'registry-search') continue
  compared += 1
  // The repositories the scan found on their site, because the search uses them for its queries and
  // for proving ownership. Asking with an empty list is a different question: three of the first six
  // came back empty that way and none of them is a regression.
  const repos = found?.discovered?.githubRepo ? [found.discovered.githubRepo.toLowerCase()] : []
  await wait(PAUSE_MS)
  let now = await searchNpmForDomain(domain, repos)
  if (!now) {
    // One more time, after a longer pause. A second silence is still not proof the vendor lost a
    // package, so it is reported apart from the ones that really moved.
    await wait(PAUSE_MS * 4)
    now = await searchNpmForDomain(domain, repos)
  }
  if (!now) {
    lost.push(`${domain} (bylo ${was})`)
    continue
  }
  if (now.name === was) same += 1
  else moved.push({ domain, was, now: now.name })
}

console.log(`${compared} wierszy wybranych przez wyszukiwarke, ${same} bez zmiany`)
if (lost.length > 0) {
  console.log(`\n${lost.length} wierszy, dla ktorych teraz NIC nie wychodzi (rejestr mogl odmowic, sprawdz zanim uznasz to za regresje):`)
  for (const one of lost) console.log(`  ${one}`)
}
if (moved.length > 0) {
  console.log(`\n${moved.length} wierszy zmienia paczke:`)
  for (const one of moved) console.log(`  ${one.domain}: ${one.was} -> ${one.now}`)
}
process.exit(0)
