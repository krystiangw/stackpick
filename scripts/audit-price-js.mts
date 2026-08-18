/**
 * Does a price really not reach a plain client on the pages we say it does not?
 *
 *   npx tsx scripts/audit-price-js.mts
 *
 * `pricesVisibleWithoutJs: false` drives a published sentence and is a candidate for a check of its
 * own, so it gets asked again before it is trusted with more. The scanner's own signal list is
 * dollars, euros and English billing words; a page priced in pounds or in Polish would read the
 * same as a page with no price at all, and that is a false accusation rather than a finding.
 *
 * Three questions per page: the scanner's own count (must be zero), a wider net over the same
 * visible text (a hit here is our blind spot), and the raw body including script payloads (a hit
 * only there is the finding: the price exists and JavaScript assembles it).
 *
 * The control runs the wider net over pages we credited, because a probe that can only return
 * "nothing here" proves nothing.
 */
import { fetchUrl, stripCodeBlocks, withoutTags } from '../src/lib/scan/http'

const ACCUSED = [
  'https://bunny.net/pricing', 'https://filestack.com/pricing', 'https://auth0.com/pricing/',
  'https://sendgrid.com/pricing', 'https://posthog.com/pricing', 'https://mixpanel.com/pricing/',
  'https://amplitude.com/pricing?siteLocation=nav', 'https://qdrant.tech/pricing',
  'https://plaid.com/pricing', 'https://split.io/pricing', 'https://www.elastic.co/pricing',
  'https://orama.com/pricing', 'https://twilio.com/pricing', 'https://telnyx.com/pricing',
  'https://sinch.com/pricing/', 'https://restate.dev/pricing', 'https://daily.co/pricing',
  'https://cal.com/pricing', 'https://here.com/pricing', 'https://bigcommerce.com/pricing',
  'https://commercetools.com/pricing', 'https://deepl.com/pricing', 'https://crowdin.com/pricing',
  'https://tolgee.io/pricing', 'https://hover.com/pricing',
]

const CONTROL = ['https://resend.com/pricing', 'https://vercel.com/pricing', 'https://sentry.io/pricing']

const SCANNER = [/\$\d/g, /€\d/g, /per month/g, /\/mo\b/g, /\bper user\b/g, /\bbilled (annually|monthly)\b/g]
// Everything a price can look like that the list above does not carry: other currencies, the
// amount before the code, and the two spellings of a monthly rate in words.
const WIDER = [
  /£\s?\d/g, /¥\s?\d/g, /₹\s?\d/g, /\d+\s?(zl|pln|usd|eur|gbp|chf|sek|brl)\b/g,
  /\b(usd|eur|gbp)\s?\d/g, /\bper (seat|member|agent|request|credit)\b/g,
  /\b\d+[.,]?\d*\s?(a|per) (month|year|mo)\b/g, /\bmiesi/g, /\bmensuel/g, /\bmonatlich/g,
]

// The sentence says "your pricing page". A request to /pricing that ends somewhere else has not
// found one, and judging where it landed is judging a page the vendor never called their pricing.
const stillOnPricing = (url: string): boolean => {
  try {
    return /pricing|plans/i.test(new URL(url).pathname)
  } catch {
    return false
  }
}

const visibleOf = (body: string) => withoutTags(stripCodeBlocks(body)).toLowerCase()
const hits = (text: string, patterns: RegExp[]) =>
  patterns.flatMap((pattern) => [...text.matchAll(pattern)].map((match) => match[0])).slice(0, 4)

const ask = async (url: string) => {
  const page = await fetchUrl(url)
  if (!page.ok) return { url, status: page.status, landedAt: '', scanner: [], wider: [], raw: [] as string[], chars: 0 }
  const visible = visibleOf(page.body)
  const raw = page.body.toLowerCase()
  return {
    url,
    status: page.status,
    landedAt: page.url && !stillOnPricing(page.url) ? page.url : '',
    chars: visible.replace(/\s+/g, ' ').trim().length,
    scanner: hits(visible, SCANNER),
    wider: hits(visible, WIDER),
    // Only interesting where the visible text carried nothing: the price is in the payload.
    raw: hits(raw, SCANNER).slice(0, 3),
  }
}

console.log('KONTROLKA: strony, ktorym cene zaliczylismy\n')
for (const url of CONTROL) {
  const row = await ask(url)
  console.log(`  ${row.status}  ${url}  skaner:[${row.scanner.join(' ')}] szerzej:[${row.wider.join(' ')}]`)
}

console.log('\nOSKARZONE: strony, o ktorych mowimy, ze nie pokazuja ceny\n')
let blind = 0
let wrong = 0
let inPayload = 0
let confirmed = 0
for (const url of ACCUSED) {
  const row = await ask(url)
  const wrongPage = row.landedAt !== ''
  const ourBlindSpot = !wrongPage && row.scanner.length === 0 && row.wider.length > 0
  const onlyInPayload = !wrongPage && row.scanner.length === 0 && row.wider.length === 0 && row.raw.length > 0
  if (wrongPage) wrong += 1
  else if (ourBlindSpot) blind += 1
  else if (onlyInPayload) inPayload += 1
  else if (row.status === 200) confirmed += 1
  const verdict = wrongPage ? 'NIE ICH CENNIK' : ourBlindSpot ? 'NASZA SLEPOTA' : onlyInPayload ? 'cena w payloadzie' : row.status === 200 ? 'potwierdzone' : `HTTP ${row.status}`
  console.log(
    `  ${String(row.status).padEnd(3)} ${verdict.padEnd(17)} ${row.chars.toString().padStart(6)} zn  ${url}` +
      `${row.landedAt ? `  wyladowalo na ${row.landedAt}` : ''}${row.wider.length ? `  szerzej:[${row.wider.join(' ')}]` : ''}${row.raw.length && !ourBlindSpot ? `  payload:[${row.raw.join(' ')}]` : ''}`,
  )
}

console.log(`\n${confirmed} potwierdzonych, ${inPayload} z cena tylko w payloadzie, ${blind} naszej slepoty, ${wrong} nie na ich cenniku`)
