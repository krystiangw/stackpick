/**
 * Where is the signup we could not find?
 *
 *   MONGODB_URI=... npx tsx scripts/audit-signup-discovery.mts [ile]
 *
 * Twenty rows of the corpus say "we found no link to an account signup on the pages we read, while
 * you publish prices at ...". That sentence is honest about being our gap rather than their fault,
 * and it is still two checks the vendor gets nothing out of: `signup_reachable` and
 * `signup_no_captcha` both go unmeasured, which is the whole signup stage silent on a product that
 * plainly sells accounts.
 *
 * This reads the same pages the scan read - home page and pricing page - and prints every link
 * whose address or text looks like a way in, whether or not our hints match it. The output is a
 * list to read by hand: the point is to see what shape of link we are missing, not to widen the
 * rule automatically. Widening it is an attribution-style change and needs its own measurement.
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'
import { SIGNUP_HINTS } from '../src/lib/scan/discover'
import { howManyRows } from './how-many'
import { refuseIfNothingMeasured } from './nothing-measured'
import { AGENT_UA, CONTACT } from '../src/lib/scan/http'

const PAUSE_MS = 400
const store = getStore()
const most = howManyRows(25, CURATED_DOMAINS.size)

/** Deliberately looser than the rule: this is a search for what the rule does not see. */
const LOOKS_LIKE_A_WAY_IN = /sign[_ -]?up|register|create[_ -]?account|get[_ -]?started|start[_ -]?free|try[_ -]?(it|free)|free[_ -]?trial|join|new[_ -]?account/i

const linksOn = (html: string, base: string) => {
  const out: { url: string; text: string }[] = []
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["']([^>]*)>([\s\S]{0,120}?)<\/a>/gi)) {
    let url: string
    try {
      url = new URL(match[1].replace(/&amp;/gi, '&'), base).toString()
    } catch {
      continue
    }
    const text = match[3].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    out.push({ url, text })
  }
  return out
}

const get = async (url: string) => {
  await new Promise((done) => setTimeout(done, PAUSE_MS))
  try {
    const answer = await fetch(url, { headers: { 'user-agent': AGENT_UA, from: CONTACT, accept: 'text/html' }, signal: AbortSignal.timeout(10_000) })
    return answer.ok ? await answer.text() : null
  } catch {
    return null
  }
}

let checked = 0
for (const domain of [...CURATED_DOMAINS].slice(0, most)) {
  const report = await store.latestForDomain(domain, true)
  const check = report?.scorecard.checks.find((one) => one.id === 'signup_reachable')
  if (!check?.inconclusive || !check.detail.includes('no link to an account signup')) continue
  const pricing = (report?.findings as unknown as { discovered?: { pricing?: string | null } })?.discovered?.pricing
  checked += 1
  const pages = [`https://${domain}`, ...(pricing ? [pricing] : [])]
  const seen = new Set<string>()
  const candidates: { url: string; text: string; matched: boolean }[] = []
  for (const page of pages) {
    const html = await get(page)
    if (!html) continue
    for (const link of linksOn(html, page)) {
      if (seen.has(link.url)) continue
      seen.add(link.url)
      const byText = LOOKS_LIKE_A_WAY_IN.test(link.text)
      const byUrl = LOOKS_LIKE_A_WAY_IN.test(link.url)
      if (!byText && !byUrl) continue
      candidates.push({ ...link, matched: SIGNUP_HINTS.some((hint) => hint.test(link.url)) })
    }
  }
  const missed = candidates.filter((one) => !one.matched)
  console.log(`\n== ${domain} (${candidates.length} kandydatow, ${missed.length} poza nasza regula)`)
  for (const one of missed.slice(0, 6)) console.log(`   "${one.text.slice(0, 40)}" -> ${one.url.slice(0, 100)}`)
  if (missed.length === 0) console.log('   nic, czego regula by nie widziala: link jest gdzie indziej albo strona jest z JS')
}
// Zero przeczytanych wierszy to nie jest „zdanie sie trzyma", tylko przebieg, ktory o niczym nie
// mowi. Bez tej bramki audyt uspokaja tym glosniej, im mniej zmierzyl.
refuseIfNothingMeasured(checked, 'domen')

console.log(`\n${checked} domen przejrzanych`)
process.exit(0)
