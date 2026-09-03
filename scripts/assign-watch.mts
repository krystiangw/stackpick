/**
 * Place a watched domain into a category we measure, so its owner can be served.
 *
 *   MONGODB_URI=... npx tsx scripts/assign-watch.mts <domain> <email> --category <id> [--brand Name]
 *
 * Every paying customer needs this. The corpus is the domains we chose to publish about, the people
 * who buy are the ones who are not on it, and the monthly agent run needs a category to have a
 * question at all. Which category is a person's decision and not a guess: "email" for email.com
 * would count every sentence about email as a mention of them.
 *
 * A person, not a form, because the same decision refused automatically is the honest answer we
 * already send: `/pricing` promises we say so before anybody pays.
 */
import { CATEGORIES, categoryFor } from '../src/lib/categories'
import { getStore } from '../src/lib/store'
import { brandTaken } from '../src/lib/vendors'
import { CURATED_DOMAINS } from '../src/lib/categories'

const [domain, email, ...rest] = process.argv.slice(2)
const at = rest.indexOf('--category')
const categoryId = at === -1 ? null : rest[at + 1]
const brandAt = rest.indexOf('--brand')
const brand = brandAt === -1 ? null : rest[brandAt + 1]

if (!domain || !email || !categoryId) {
  console.error('usage: npx tsx scripts/assign-watch.mts <domain> <email> --category <id> [--brand Name]')
  console.error(`kategorie: ${CATEGORIES.map((one) => one.id).join(', ')}`)
  process.exit(2)
}

const category = CATEGORIES.find((one) => one.id === categoryId)
if (!category) {
  console.error(`nie ma kategorii ${categoryId}. Sa: ${CATEGORIES.map((one) => one.id).join(', ')}`)
  process.exit(2)
}

const ours = categoryFor(domain)
if (ours) {
  console.error(`${domain} jest juz publikowana w kategorii ${ours.id}, wiec nie ma czego przypisywac`)
  process.exit(2)
}

const store = getStore()

// A brand that belongs to somebody we publish would silently move their mentions onto a stranger's
// mail, and no wording in the document could undo that. The same is true of a brand another guest
// already holds, which the corpus list cannot see: both customers would then be credited every
// occurrence of the word, and both counts would be wrong in the same month.
if (brand) {
  const taken = brandTaken(brand, [...CURATED_DOMAINS])
  if (taken) {
    console.error(`nazwa "${brand}" nalezy juz do ${taken}. Podaj inna albo pomin --brand.`)
    process.exit(2)
  }
  const held = await store.watchWithBrand(brand)
  if (held && held.domain !== domain) {
    console.error(`nazwa "${brand}" jest juz przypisana do ${held.domain}. Dwie obserwacje pod jedna marka licza te same zdania dwa razy.`)
    process.exit(2)
  }
}
// The address identifies who asked, and the placement applies to every watch on the domain: which
// category a product belongs to is a fact about the product, not about the subscriber. Placing it
// per address let two people watching one domain be read against two different categories, and the
// report then picked whichever the database returned first.
const mine = (await store.listWatchesForEmail(email)).filter((watch) => watch.domain === domain)
if (mine.length === 0) {
  console.error(`${email} nie obserwuje ${domain}`)
  process.exit(1)
}
const watches = await store.watchesForDomain(domain)
const others = [...new Set(watches.filter((watch) => watch.email !== email.toLowerCase()).map((watch) => watch.email))]
if (others.length > 0) {
  console.error(`uwaga: ${domain} obserwuje tez ${others.join(', ')} - przypisanie dotyczy wszystkich, bo kategoria jest cecha produktu`)
}

for (const watch of watches) {
  watch.placedIn = category.id
  watch.brand = brand
  await store.saveWatch(watch)
}
console.log(`${domain} dla ${email}: kategoria ${category.id}${brand ? `, marka "${brand}"` : ', bez marki (szukamy samego adresu)'}`)
console.log(`Sprawdz, co dostanie: MONGODB_URI=... npx tsx scripts/cell-email.mts ${domain}`)
process.exit(0)
