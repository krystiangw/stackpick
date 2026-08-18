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
  discovered?: { pricing?: string | null; linkSources?: { pricing?: string } }
}

// Two unrelated things end up as `pricesVisible: false`. A canonical /pricing that carries no price
// is a fact about the vendor; a fallback page we picked because nothing canonical answered is a fact
// about our discovery, and the score already calls that one unmeasurable. Counting them together
// would size a check on a surface half of which we are not entitled to accuse.
const isCanonicalPricingPath = (url: string): boolean => {
  try {
    return /^\/(pricing|plans)\/?$/i.test(new URL(url).pathname)
  } catch {
    return false
  }
}

const store = getStore()
let read = 0
const noPricingPage: string[] = []
const visible: string[] = []
const invisible: string[] = []
const thin: string[] = []
const onCanonical: string[] = []
const elsewhere: string[] = []

for (const domain of CURATED_DOMAINS) {
  const report = await store.latestForDomain(domain, true)
  if (!report) continue
  read += 1
  const stored = report.findings as unknown as Stored
  const funnel = stored.funnel ?? {}
  if (funnel.pricesVisibleWithoutJs === null || funnel.pricesVisibleWithoutJs === undefined) {
    noPricingPage.push(domain)
    continue
  }
  if (funnel.pricesVisibleWithoutJs) visible.push(domain)
  else {
    const url = stored.discovered?.pricing ?? ''
    const source = stored.discovered?.linkSources?.pricing ?? 'unknown'
    if (url && isCanonicalPricingPath(url)) onCanonical.push(`${domain} (${url}, ${source})`)
    else elsewhere.push(`${domain} (${url || 'brak adresu'}, ${source})`)
    invisible.push(domain)
  }
  // A page of navigation and a button is a different failure from a page that renders its tiers in
  // JavaScript, and telling them apart decides whether a check would accuse or explain.
  if ((funnel.pricingTextLength ?? 0) < 1200) thin.push(domain)
}

console.log(`korpus: ${read} wierszy odczytanych\n`)
console.log(`${String(visible.length).padStart(3)} z ${read}  cena widoczna dla zwyklego pobrania`)
console.log(`${String(invisible.length).padStart(3)} z ${read}  strona cennika jest, ceny w niej nie widac`)
console.log(`${String(noPricingPage.length).padStart(3)} z ${read}  zadnej strony cennika nie znalezlismy`)
console.log(`${String(thin.length).padStart(3)} z ${read}  strona cennika ponizej 1200 znakow tekstu`)
console.log(`\n  z tego na kanonicznym /pricing lub /plans: ${onCanonical.length}`)
console.log(`  z tego na stronie, ktora wybralismy sami: ${elsewhere.length}`)
console.log(`\nkanoniczne, czyli te, ktore wolno nam oskarzyc:`)
for (const row of onCanonical) console.log(`  ${row}`)
console.log(`\nnasz wybor strony, czyli te, ktorych nie wolno:`)
for (const row of elsewhere) console.log(`  ${row}`)
