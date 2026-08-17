/**
 * The monthly agent-run email, drafted for every watched domain.
 *
 *   MONGODB_URI=... npx tsx scripts/cell-email.mts [domain]
 *
 * Monitoring promises two things and only one of them had a delivery path. The weekly checks mail
 * themselves when a verdict moves; the monthly agent run had nothing at all: the runs happen on a
 * laptop, the result lived in a JSON file, and nobody was told. This writes what a watcher is owed,
 * one draft per watched domain.
 *
 * It prints rather than sends, on purpose. Mailing a stranger is a decision a person makes, and the
 * drafts are short enough to read before anybody does.
 */
import { getStore } from '../src/lib/store'
import { categoryFor } from '../src/lib/categories'
import cells from '../src/data/cells.json'

const BASE_URL = process.env.STACKPICK_BASE_URL ?? 'https://letagentsin.com'
const only = process.argv[2]

const store = getStore()
const watches = await store.listWatchesDue(500)
const wanted = only ? watches.filter((watch) => watch.domain === only) : watches
if (wanted.length === 0) {
  console.error(only ? `${only} nie jest obserwowana` : 'brak aktywnych obserwacji')
  process.exit(1)
}

/**
 * One sentence a run wrote about them, so the mail quotes rather than summarises.
 *
 * Every occurrence is scored rather than taking the first, because the first is often a cell in a
 * comparison table: the first draft for stripe.com quoted a window that opened inside a markdown
 * link and spent most of its words on Paddle. A window loses points for markdown, for links and for
 * every other vendor in it, so the sentence that survives is the one about this vendor.
 */
function saidAbout(text: string, domain: string, others: readonly string[]): string | null {
  const brand = domain.split('.')[0].toLowerCase()
  const lower = text.toLowerCase()
  let best: { quote: string; noise: number } | null = null
  for (let at = lower.indexOf(brand); at !== -1; at = lower.indexOf(brand, at + 1)) {
    const from = Math.max(text.lastIndexOf('. ', at) + 1, at - 100)
    const quote = text.slice(from, at + 160).replace(/\s+/g, ' ').trim()
    const rivals = others.filter((other) => other !== domain && quote.toLowerCase().includes(other.split('.')[0].toLowerCase()))
    const noise = rivals.length * 2 + (/\]\(|https?:\/\//.test(quote) ? 3 : 0) + (/^[a-z\])]/.test(quote) ? 2 : 0)
    if (!best || noise < best.noise) best = { quote, noise }
    if (noise === 0) break
  }
  return best?.quote ?? null
}

const seen = new Set<string>()
for (const watch of wanted) {
  if (seen.has(`${watch.email}:${watch.domain}`)) continue
  seen.add(`${watch.email}:${watch.domain}`)

  const category = categoryFor(watch.domain)
  if (!category) {
    // The promise covers the categories we measure, and a watcher outside them is owed the truth
    // rather than silence. This is the sentence /pricing says we send before, not after.
    console.log(`--- ${watch.domain} -> ${watch.email}`)
    console.log(`TEMAT: ${watch.domain}: no agent run this month, and why`)
    console.log(
      `\n${watch.domain} is not in one of the categories we measure, so there is no buying question to put to an agent for you and we would rather invent nothing than invent that. The weekly checks continue as normal.\n`,
    )
    continue
  }

  const held = cells
    .filter((cell) => cell.category === category.id)
    .sort((a, b) => a.operatorContext.length - b.operatorContext.length)
  if (held.length === 0) {
    console.log(`--- ${watch.domain}: brak celi dla ${category.id}, uruchom: npm run ask -- ${category.id} claude sonnet 5`)
    continue
  }

  const runs = held.reduce((sum, one) => sum + one.runs, 0)
  const named = held.reduce((sum, one) => sum + (one.rows.find((row) => row.domain === watch.domain)?.named ?? 0), 0)
  const first = held.reduce((sum, one) => sum + (one.rows.find((row) => row.domain === watch.domain)?.first ?? 0), 0)
  const ahead = held[0].rows.filter((row) => row.named > (held[0].rows.find((r) => r.domain === watch.domain)?.named ?? 0))
  const quote = held
    .flatMap((one) => one.answers)
    .map((answer) => saidAbout(answer.text, watch.domain, category.domains))
    .find((said) => said !== null)

  const lines = [
    `${watch.domain} was named in ${named} of ${runs} agent runs this month, and named first in ${first}.`,
    '',
    `The question we asked, the one your buyers type:`,
    `  ${held[0].question}`,
    '',
  ]
  if (quote) {
    lines.push('What a run said about you:', `  "${quote}"`, '')
  } else {
    lines.push('No run wrote a sentence about you. That is an absence rather than a bad review, and it is', 'the thing worth acting on.', '')
  }
  if (ahead.length > 0) {
    lines.push('Named more often than you:', ...ahead.map((row) => `  ${row.domain}: ${row.named} of ${held[0].runs}`), '')
  }
  lines.push(
    `Every answer, in full and unedited: ${BASE_URL}/c/${category.id}/runs`,
    `How the counting works: ${BASE_URL}/methodology#named`,
    '',
    `${runs} runs separate a wall from silence and nothing finer, so two vendors a run apart are not`,
    'ranked by this. The number worth reacting to is the one that moves next month.',
  )

  console.log(`--- ${watch.domain} -> ${watch.email}`)
  console.log(`TEMAT: ${watch.domain}: named in ${named} of ${runs} agent runs`)
  console.log(`\n${lines.join('\n')}\n`)
}
process.exit(0)
