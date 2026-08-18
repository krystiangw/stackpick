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

const PAUSE_MS = 350
const store = getStore()
const most = Number(process.argv[2] ?? 30)

let checked = 0
const unread: string[] = []

const visible = (html: string) =>
  html
    .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')

for (const domain of CURATED_DOMAINS) {
  if (checked >= most) break
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
    const windows: string[] = []
    for (const pattern of SELF_SERVE_PATTERNS) {
      const hit = text.match(pattern)
      if (hit?.index === undefined) continue
      windows.push(text.slice(Math.max(0, hit.index - 60), hit.index + 80).trim())
      if (windows.length >= 3) break
    }
    console.log(`\n${domain}  ${windows.length === 0 ? 'nic nie pasuje' : `${windows.length} dopasowan`}`)
    console.log(`   wiersz mowi: ${check.detail.slice(0, 110)}`)
    for (const one of windows) console.log(`   ...${one}...`)
  } catch {
    unread.push(`${domain} (brak odpowiedzi)`)
  }
}

console.log(`\n${checked} cennikow przeczytanych${unread.length > 0 ? `, ${unread.length} nie odpowiedzialo: ${unread.join(', ')}` : ''}`)
console.log('Kazde dopasowanie przeczytaj: przycisk i pytanie to nie jest oferta, i o to wlasnie ten check pyta.')
process.exit(0)
