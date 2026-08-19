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
import { CATEGORIES, categoryFor } from '../src/lib/categories'
import { quotedAbout, readsAsPolish, whoWentFirst } from '../src/lib/vendors'
import { categoryOfWatch } from '../src/lib/watch'
import { readWithGuest } from '../src/lib/guest-cell'
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

  const category = categoryOfWatch(watch, categoryFor, CATEGORIES) as (typeof CATEGORIES)[number] | null
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
  // A customer we do not publish was never searched for in these answers, so the stored rows say
  // zero about them and it is not an answer. Their name goes into the list and everybody is counted
  // again, which is what the paid report already does and what this mail used to skip: without it a
  // guest would be told they were named in none of ten runs by a script that never looked.
  const guest = !category.domains.includes(watch.domain)
  const live = guest ? readWithGuest(held, watch.domain, category.domains, watch.brand ?? null) : null
  const namedAcross = (of: string) =>
    live ? (live.named.get(of) ?? 0) : held.reduce((sum, one) => sum + (one.rows.find((row) => row.domain === of)?.named ?? 0), 0)
  const named = namedAcross(watch.domain)
  const first = live
    ? (live.first.get(watch.domain) ?? 0)
    : held.reduce((sum, one) => sum + (one.rows.find((row) => row.domain === watch.domain)?.first ?? 0), 0)
  // Across every tool, like the headline. Off one cell the list inverted: netlify.com read
  // "named in 3 of 11" and then "named more often than you: render.com: 6 of 6", two numbers on
  // two scales in one mail, and eight pairs in the corpus where the vendor listed as ahead was
  // behind once both tools were counted.
  const ahead = (live ? category.domains : held[0].rows.map((row) => row.domain))
    .filter((other) => other !== watch.domain && namedAcross(other) - namedAcross(watch.domain) > 1)
    .sort((a, b) => namedAcross(b) - namedAcross(a))
  // Attributed, because two tools both have a run 1 and because one of them answers in Polish:
  // an unattributed foreign-language sentence under "what a run said about you" reads like a
  // mistake rather than like evidence from a named run.
  const said = held
    .flatMap((one) =>
      one.answers.map((answer) => ({
        tool: one.tool.split(' ')[0],
        run: answer.run,
        said: saidAbout(answer.text, watch.domain, guest ? [...category.domains, watch.domain] : category.domains),
      })),
    )
    .filter((entry) => entry.said !== null)
  const quote = said[0]
  // For a guest the stored `first` was decided without their name in the list, so it can name
  // somebody an answer only led because we were not looking for the customer in it.
  const winners = live
    ? [...live.first.keys()].filter((who) => who !== watch.domain)
    : [...new Set(held.flatMap((one) => one.answers).map((answer) => answer.first).filter((who) => who && who !== watch.domain))]

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
    // How many there are, because taking the first one is arbitrary and "what run 1 said" reads as
    // if run 1 were the verdict. A vendor named in ten runs can be quoted the one sentence that
    // reads worst, and the count is what tells them the rest is a click away rather than absent.
    const oneOf = said.length > 1 ? `One of the ${said.length} sentences the runs wrote about you` : 'The one sentence a run wrote about you'
    // The same marker the paid report carries, for the same reason: the claude cells run on a
    // machine whose operator instructions ask for Polish, and an unexplained foreign sentence in a
    // mail to a vendor reads as a mistake. Attribution alone said which run, never which language.
    const language = readsAsPolish(quote.said as string) ? ' (in Polish, and we quote rather than translate)' : ''
    lines.push(`${oneOf} (${quote.tool} run ${quote.run})${language}:`, `  "${quote.said}"`, '')
  } else {
    lines.push('No run wrote a sentence about you. That is an absence rather than a bad review, and it is', 'the thing worth acting on.', '')
  }
  const othersFirst = live
    ? [...live.first.entries()].filter(([who]) => who !== watch.domain).reduce((sum, [, count]) => sum + count, 0)
    : held.flatMap((one) => one.answers).filter((answer) => answer.first && answer.first !== watch.domain).length
  const wentFirst = whoWentFirst(winners as string[], first, othersFirst)
  if (wentFirst) {
    lines.push(wentFirst, '')
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
