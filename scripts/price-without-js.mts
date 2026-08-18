/**
 * How many pricing pages state a price to a plain fetch, on the corpus we already hold.
 *
 *   MONGODB_URI=... npx tsx scripts/price-without-js.mts
 *
 * The scanner records `pricesVisibleWithoutJs` and nothing scores it. Kevin Indig's runs (100 B2B
 * products, 3 buying tasks, 5 runs each) put the pricing task last of three on first-party answer
 * rate and found agents falling back to directories when a price was not there to read, so the
 * surface is worth a number before it is worth a check.
 *
 * Reads only. A check costs questions and a place on the card, so the count comes first.
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'

type Stored = {
  funnel?: {
    pricingFetched?: boolean
    pricesVisibleWithoutJs?: boolean | null
    pricingTextLength?: number
    pricingTruncated?: boolean
  }
}

const store = getStore()
let read = 0
const noPricingPage: string[] = []
const visible: string[] = []
const invisible: string[] = []
const thin: string[] = []

for (const domain of CURATED_DOMAINS) {
  const report = await store.latestForDomain(domain, true)
  if (!report) continue
  read += 1
  const funnel = (report.findings as unknown as Stored).funnel ?? {}
  if (funnel.pricesVisibleWithoutJs === null || funnel.pricesVisibleWithoutJs === undefined) {
    noPricingPage.push(domain)
    continue
  }
  if (funnel.pricesVisibleWithoutJs) visible.push(domain)
  else invisible.push(domain)
  // A page of navigation and a button is a different failure from a page that renders its tiers in
  // JavaScript, and telling them apart decides whether a check would accuse or explain.
  if ((funnel.pricingTextLength ?? 0) < 1200) thin.push(domain)
}

console.log(`korpus: ${read} wierszy odczytanych\n`)
console.log(`${String(visible.length).padStart(3)} z ${read}  cena widoczna dla zwyklego pobrania`)
console.log(`${String(invisible.length).padStart(3)} z ${read}  strona cennika jest, ceny w niej nie widac`)
console.log(`${String(noPricingPage.length).padStart(3)} z ${read}  zadnej strony cennika nie znalezlismy`)
console.log(`${String(thin.length).padStart(3)} z ${read}  strona cennika ponizej 1200 znakow tekstu`)
console.log(`\nbez widocznej ceny: ${invisible.join(', ')}`)
