/**
 * Does the pricing page still carry no way in that an agent can take?
 *
 *   MONGODB_URI=... npx tsx scripts/audit-selfserve.mts [ile]
 *
 * The last accusation surface with any size: `self_serve` fails on twenty-odd rows, and its
 * sentences are unusually specific - "the only free-tier wording is a question the page asks", "the
 * only free wording is a button". Both name the page, so both can be re-asked.
 *
 * Prints every place the scanner's own `SELF_SERVE_PATTERNS` match on the live page, with a window
 * of the words around it. It deliberately does not re-decide whether a match is a button or a
 * question: that is the check's job, and a second opinion about it would find different things.
 * Twenty rows is few enough to read by hand, which is what the 30th and 31st passes did.
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'
import { SELF_SERVE_PATTERNS } from '../src/lib/scan/funnel'
import { howManyRows, reportCap } from './how-many'

const PAUSE_MS = 350
const store = getStore()
const most = howManyRows(30)

let checked = 0
/** Domen, przez ktore petla naprawde przeszla. Sufit trafiony na ostatniej z nich to nie obciecie. */
let visited = 0
const unread: string[] = []

const visible = (html: string) =>
  html
    .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')

for (const domain of CURATED_DOMAINS) {
  if (checked >= most) break
  visited += 1
  const report = await store.latestForDomain(domain, true)
  const check = report?.scorecard.checks.find((one) => one.id === 'self_serve')
  if (!check || check.inconclusive || check.notApplicable || check.points > 0) continue
  const pricing = (report?.findings as unknown as { discovered?: { pricing?: string | null } })?.discovered?.pricing
  if (!pricing) continue
  await new Promise((done) => setTimeout(done, PAUSE_MS))
  try {
    const answer = await fetch(pricing, { headers: { accept: 'text/html' }, signal: AbortSignal.timeout(10_000) })
    if (!answer.ok) {
      unread.push(`${domain} (${answer.status})`)
      continue
    }
    const text = visible(await answer.text())
    checked += 1
    // Every occurrence of every pattern, not the first of each: a page whose navigation says "Try
    // for free" and whose plan table says "Free tier, no card" would have shown only the button,
    // and the button against the statement is the distinction this whole check is about.
    const windows = new Set<string>()
    for (const pattern of SELF_SERVE_PATTERNS) {
      for (const hit of text.matchAll(new RegExp(pattern.source, `${pattern.flags.replace('g', '')}g`))) {
        if (hit.index === undefined) continue
        windows.add(text.slice(Math.max(0, hit.index - 60), hit.index + 80).trim())
      }
    }
    const shown = [...windows]
    console.log(`\n${domain}  ${shown.length === 0 ? 'nic nie pasuje' : `${shown.length} miejsc`}`)
    console.log(`   wiersz mowi: ${check.detail.slice(0, 110)}`)
    // Nothing is dropped silently: a page with more is said to have more, with the count.
    for (const one of shown.slice(0, 12)) console.log(`   ...${one}...`)
    if (shown.length > 12) console.log(`   (i ${shown.length - 12} dalszych miejsc - przeczytaj recznie)`)
  } catch {
    unread.push(`${domain} (brak odpowiedzi)`)
  }
}

reportCap(visited, CURATED_DOMAINS.size, checked)

console.log(`\n${checked} cennikow przeczytanych${unread.length > 0 ? `, ${unread.length} nie odpowiedzialo: ${unread.join(', ')}` : ''}`)
console.log('Kazde dopasowanie przeczytaj: przycisk i pytanie to nie jest oferta, i o to wlasnie ten check pyta.')
process.exit(0)
