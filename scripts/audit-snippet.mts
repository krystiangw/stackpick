/**
 * The sixteenth check, put in front of pages it has never seen.
 *
 *   npx tsx scripts/audit-snippet.mts <domain> [...]
 *
 * `price_in_snippet` accuses a vendor of publishing a pricing description that names no amount and
 * no entry condition, which is a sentence about their marketing rather than their server, so a
 * false accusation is cheap to make and expensive to publish. This prints what the production
 * reader saw next to the words it read, on domains outside the corpus, so the verdict can be
 * argued with by a person before it lands on every row.
 */
import { fetchUrl } from '../src/lib/scan/http'
import { readSnippet } from '../src/lib/scan/funnel'
import { getStore } from '../src/lib/store'

const domains = process.argv.slice(2)
if (domains.length === 0) throw new Error('podaj domeny')

// The address the scanner found, when we have it. Guessing /pricing measures a page the check may
// never read, and this fetches the document without storing a report, so the corpus does not age
// and the reseed cooldown does not move.
const store = process.env.MONGODB_URI ? getStore() : null
const pricingUrl = async (domain: string) => {
  const report = store ? await store.latestForDomain(domain, true) : null
  return report?.findings.discovered?.pricing ?? `https://${domain}/pricing`
}

for (const domain of domains) {
  const url = await pricingUrl(domain)
  const got = await fetchUrl(url)
  if (!got?.ok) {
    console.log(`\n${domain}: ${url} nie odpowiedzialo (${got?.status ?? "brak"}), pomijam`)
    continue
  }
  const snippet = readSnippet(got.body)
  const read = snippet.description ?? snippet.opening
  console.log(`\n${domain} ${snippet.says.length > 0 ? `PRZECHODZI (${snippet.says.join(', ')})` : 'OBLEWA'}`)
  console.log(`  zrodlo: ${snippet.description ? 'description' : 'BRAK description, pierwsze slowa strony'}`)
  console.log(`  przeczytane: ${read.slice(0, 240)}`)
  if (snippet.quotes.length > 0) console.log(`  cytat: ${snippet.quotes.join(' | ')}`)
}
process.exit(0)
