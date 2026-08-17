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
import { quotedAbout } from '../src/lib/vendors'
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

const saidAbout = quotedAbout

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
  // Across every tool, like the headline. Off one cell the list inverted: netlify.com read
  // "named in 3 of 11" and then "named more often than you: render.com: 6 of 6", two numbers on
  // two scales in one mail, and eight pairs in the corpus where the vendor listed as ahead was
  // behind once both tools were counted.
  const namedAcross = (of: string) => held.reduce((sum, one) => sum + (one.rows.find((row) => row.domain === of)?.named ?? 0), 0)
  const ahead = held[0].rows
    .map((row) => row.domain)
    .filter((other) => other !== watch.domain && namedAcross(other) - namedAcross(watch.domain) > 1)
    .sort((a, b) => namedAcross(b) - namedAcross(a))
  // Attributed, because two tools both have a run 1 and because one of them answers in Polish:
  // an unattributed foreign-language sentence under "what a run said about you" reads like a
  // mistake rather than like evidence from a named run.
  const quote = held
    .flatMap((one) => one.answers.map((answer) => ({ tool: one.tool.split(' ')[0], run: answer.run, said: saidAbout(answer.text, watch.domain, category.domains) })))
    .find((entry) => entry.said !== null)
  const winners = [...new Set(held.flatMap((one) => one.answers).map((answer) => answer.first).filter((who) => who && who !== watch.domain))]

  // Dated from the runs, not from the day the mail goes out. Nothing here records that a mail was
  // sent and cells.json is a committed file, so "this month" was a claim about the calendar that
  // the data could not keep: run the script twice in a week and both mails say it.
  const ran = [...new Set(held.map((one) => one.ranAt))].sort()
  const when = ran.length > 1 ? `${ran[0]} to ${ran[ran.length - 1]}` : ran[0]
  const lines = [
    `${watch.domain} was named in ${named} of ${runs} agent runs, and named first in ${first}. The runs are dated ${when}.`,
    '',
    `The question we asked, the one your buyers type:`,
    `  ${held[0].question}`,
    '',
  ]
  if (quote) {
    lines.push(`What ${quote.tool} run ${quote.run} said about you:`, `  "${quote.said}"`, '')
  } else {
    lines.push('No run wrote a sentence about you. That is an absence rather than a bad review, and it is', 'the thing worth acting on.', '')
  }
  if (winners.length > 0) {
    lines.push(`Picked ahead of you, the provider a run named before any other: ${winners.join(', ')}.`, '')
  }
  if (ahead.length > 0) {
    lines.push('Named more often than you, on the same scale:', ...ahead.map((other) => `  ${other}: ${namedAcross(other)} of ${runs}`), '')
  }
  const context = [...new Set(held.flatMap((one) => one.operatorContext))]
  lines.push(
    `Every answer, in full and unedited: ${BASE_URL}/c/${category.id}/runs`,
    `How the counting works: ${BASE_URL}/methodology#named`,
    '',
    `${runs} runs separate a wall from silence and nothing finer, so two vendors a run apart are not`,
    'ranked by this. The number worth reacting to is the one that moves next month.',
  )
  // The same admission the free pages carry. A mail that quotes a run without it reads like a
  // measurement of an agent at your customer, which is the one thing these runs are not.
  if (context.length > 0) {
    lines.push(
      '',
      `Not a clean measurement: these ran on one laptop, and ${held
        .filter((one) => one.operatorContext.length > 0)
        .map((one) => one.tool.split(' ')[0])
        .join(', ')} could read the operator instructions on it (${context.join(', ')}).`,
    )
  }

  console.log(`--- ${watch.domain} -> ${watch.email}`)
  console.log(`TEMAT: ${watch.domain}: named in ${named} of ${runs} agent runs`)
  console.log(`\n${lines.join('\n')}\n`)
}
process.exit(0)
