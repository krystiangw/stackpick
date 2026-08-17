/**
 * The forty-nine dollar report, produced by one command.
 *
 *   MONGODB_URI=... npx tsx scripts/client-report.mts <domain> [--out FILE]
 *
 * Until now the paid one-off existed on the pricing page and nowhere else: somebody would have had
 * to run the harness by hand, read five answers and write prose. That is how a product with a
 * price and no delivery path quietly becomes a refund.
 *
 * It writes markdown, because the buyer forwards it to somebody who does not have our site open,
 * and because a report we cannot paste into an email is a report nobody reads.
 *
 * Two halves, and they are deliberately different kinds of evidence:
 *   the scan     deterministic, reproducible, the published formula, no model involved
 *   the cell     what an agent actually answered, quoted, with the spread across runs visible
 */
import { writeFileSync } from 'node:fs'
import cells from '../src/data/cells.json'
import { CATEGORIES, categoryFor } from '../src/lib/categories'
import { getStore } from '../src/lib/store'
import { FORMULA_VERSION } from '../src/lib/score'
import { quotedAbout } from '../src/lib/vendors'
import { normalizeDomain } from '../src/lib/scan/discover'
import { SITE_URL } from '../src/lib/site'

const [given, ...rest] = process.argv.slice(2)
if (!given) {
  console.error('usage: npx tsx scripts/client-report.mts <domain> [--out FILE]')
  process.exit(2)
}
// A buyer writes the domain the way they say it out loud. Without this, `www.stripe.com` was told
// it belongs to none of the categories we measure, about a domain sitting in the corpus.
const domain = normalizeDomain(given)
const outAt = rest.indexOf('--out')
const named = outAt === -1 ? undefined : rest[outAt + 1]
if (outAt !== -1 && !named) {
  console.error('--out potrzebuje sciezki')
  process.exit(2)
}
const out = named ?? `report-${domain.replace(/\./g, '-')}.md`

const category = categoryFor(domain)
if (!category) {
  // The promise on /pricing is that we say this BEFORE anybody pays, so the tool that produces the
  // report has to be able to say it too, in the same words.
  console.error(`${domain} nie nalezy do zadnej z ${CATEGORIES.length} mierzonych kategorii, wiec nie ma celi do uruchomienia.`)
  console.error('To jest odpowiedz, ktora dajemy PRZED platnoscia, nie po.')
  process.exit(1)
}

// Every tool we hold for the category, cleanest first. /pricing promises ten runs on two tools,
// and one tool is five: a report that quietly delivered half of that would be the first thing a
// buyer could catch us on.
const held = cells
  .filter((candidate) => candidate.category === category.id)
  .sort((a, b) => a.operatorContext.length - b.operatorContext.length)
const cell = held[0]
const runsAll = held.reduce((sum, one) => sum + one.runs, 0)
const namedAll = held.reduce((sum, one) => sum + (one.rows.find((row) => row.domain === domain)?.named ?? 0), 0)
const firstAll = held.reduce((sum, one) => sum + (one.rows.find((row) => row.domain === domain)?.first ?? 0), 0)
// Newest, not the corpus row. The corpus row is what makes vendors comparable to each other, and
// this report compares nobody: a buyer who fixed their llms.txt yesterday and rescanned would have
// been sold last week's scorecard under a heading written in the present tense.
const report = await getStore().latestForDomain(domain)
if (!report) {
  console.error(`brak skanu dla ${domain}. Uruchom: npm run scan ${domain}`)
  process.exit(1)
}

const card = report.scorecard
const measurable = card.measurable ?? card.max
const failed = card.checks.filter((check) => !check.inconclusive && !check.notApplicable && check.points < check.max)
const unmeasured = card.checks.filter((check) => check.inconclusive)

const mine = cell?.rows.find((row) => row.domain === domain)

/**
 * Counts across every tool, because the headline is across every tool. Read off one cell, the
 * comparison inverted: godaddy.com was told "you were named in 5 of 10 runs" and then handed
 * gandi.net and porkbun.com as "named more often than you, in the same runs", when across those
 * same ten runs it led both. Eight pairs in the corpus read that way, and four more vendors were
 * shown nobody at all because they happened to top the one cell we looked at.
 */
const namedAcross = (of: string) => held.reduce((sum, one) => sum + (one.rows.find((row) => row.domain === of)?.named ?? 0), 0)
const firstAcross = (of: string) => held.reduce((sum, one) => sum + (one.rows.find((row) => row.domain === of)?.first ?? 0), 0)
const rivals = (cell?.rows.map((row) => row.domain) ?? [])
  .filter((other) => other !== domain && namedAcross(other) > namedAll)
  .sort((a, b) => namedAcross(b) - namedAcross(a))
// A run apart is inside the noise this many runs can resolve, and the closing sentence says so.
// Printing one list would have that sentence contradict the list above it in the same document.
const ahead = rivals.filter((other) => namedAcross(other) - namedAll > 1)
const level = rivals.filter((other) => namedAcross(other) - namedAll === 1)

const saidAbout = (text: string) => quotedAbout(text, domain, category.domains)

const lines: string[] = []
lines.push(`# ${domain}: what an AI agent does with you`)
lines.push('')
lines.push(`Prepared ${new Date().toISOString().slice(0, 10)} by Let Agents In. Category: ${category.label}.`)
lines.push('')
lines.push('## 1. Whether an agent names you at all')
lines.push('')
if (!cell) {
  // No money sentence here. The report has no way to know what was invoiced, and a document that
  // volunteers "you have not been charged for it" is making a commitment nobody in it can keep.
  lines.push('We hold no agent runs for this category yet, so this half is unanswered. Tell us and we will run it or refund it.')
} else {
  lines.push(
    held.length > 1
      ? `We put one buying question to an agent ${runsAll} times across ${held.length} different tools (${held.map((one) => `${one.tool.split(' ')[0]}: ${one.runs}`).join(', ')}), each run a separate session with nothing carried between them. Two tools rather than one because a result that appears on only one of them is about the tool.`
      : `We put one buying question to an agent ${cell.runs} times, each in a separate session with nothing carried between them.`,
  )
  lines.push('')
  lines.push(`> ${cell.question}`)
  lines.push('')
  lines.push(`**You were named in ${namedAll} of ${runsAll} runs, and named first in ${firstAll}.**`)
  if (held.length > 1) {
    lines.push('')
    for (const one of held) {
      const there = one.rows.find((row) => row.domain === domain)
      lines.push(`- ${one.tool.split(' ')[0]}: ${there?.named ?? 0} of ${one.runs}${one.operatorContext.length === 0 ? ', a tool that read none of our instructions' : ''}`)
    }
  }
  lines.push('')
  const standing = (other: string) => `- ${other}: ${namedAcross(other)}/${runsAll}, named first in ${firstAcross(other)}`
  if (ahead.length > 0) {
    lines.push('Named more often than you, across the same runs:')
    lines.push('')
    for (const other of ahead) lines.push(standing(other))
    lines.push('')
  }
  if (level.length > 0) {
    lines.push('One run ahead of you, which is inside what this many runs can separate:')
    lines.push('')
    for (const other of level) lines.push(standing(other))
    lines.push('')
  }
  // Named by tool as well as by number: two tools both have a run 1, and "Run 1" twice in one
  // report is the kind of small confusion that makes a buyer doubt the rest of it.
  const quotes = held
    .flatMap((one) => one.answers.map((answer) => ({ tool: one.tool.split(' ')[0], ...answer })))
    .map((answer) => ({ run: answer.run, tool: answer.tool, said: saidAbout(answer.text) }))
    .filter((entry) => entry.said !== null)
  if (quotes.length > 0) {
    lines.push('What the runs said about you, quoted:')
    lines.push('')
    for (const quote of quotes) lines.push(`- **${quote.tool} run ${quote.run}**: “${quote.said}”`)
  } else {
    lines.push('No run wrote a sentence about you. That is the finding: not a bad review, an absence.')
  }
  // Which provider was picked instead is sold as its own line on /pricing, so it cannot live in
  // the branch that only fires when nothing was said about the buyer. Being named and still losing
  // to somebody is the common case, and it was the one case this never printed.
  const winners = [...new Set(held.flatMap((one) => one.answers).map((answer) => answer.first).filter((who) => who && who !== domain))]
  if (winners.length > 0) {
    lines.push('')
    lines.push(`Picked ahead of you, the provider a run named before any other: ${winners.join(', ')}.`)
  }
  lines.push('')
  lines.push(`${runsAll} runs separate a wall from silence and nothing finer: two vendors a run apart are not ranked by this.`)
  // Every cell, not the cleanest one. `held` is sorted by how little the runs could read, so this
  // read the empty list every time and the disclosure never printed for any of the 26 categories.
  const context = [...new Set(held.flatMap((one) => one.operatorContext))]
  if (context.length > 0) {
    lines.push('')
    lines.push(
      `Not a clean measurement, and the free pages say so too: ${held
        .filter((one) => one.operatorContext.length > 0)
        .map((one) => one.tool.split(' ')[0])
        .join(', ')} ran on a machine whose operator instructions they could read (${context.join(', ')}). Both tools ran on one laptop, so this describes an agent there rather than an agent at your customer.`,
    )
  }
  lines.push('')
  lines.push(`Every answer above in full, unedited and marked where a vendor is named: ${SITE_URL}/c/${category.id}/runs`)
}

lines.push('')
lines.push('## 2. Whether an agent could use you once it names you')
lines.push('')
lines.push(`Scanned ${report.scannedAt.slice(0, 10)} under formula ${card.formulaVersion}${card.formulaVersion === FORMULA_VERSION ? '' : ` (the scanner now runs ${FORMULA_VERSION})`}: **${card.total} of ${measurable} measurable points**.`)
lines.push('')
lines.push('| Stage | Points |')
lines.push('|---|---|')
for (const stage of card.stages) lines.push(`| ${stage.title} | ${stage.points}/${stage.max} |`)
lines.push('')
if (failed.length > 0) {
  lines.push('### What an agent hits, in the order it hits it')
  lines.push('')
  for (const check of failed) {
    lines.push(`**${check.label}** (${check.points}/${check.max})`)
    lines.push('')
    lines.push(`${check.detail}`)
    if (check.unblock) {
      lines.push('')
      lines.push(`*Fix:* ${check.unblock}`)
    }
    lines.push('')
  }
}
if (unmeasured.length > 0) {
  lines.push('### What we could not measure, and why that is not held against you')
  lines.push('')
  for (const check of unmeasured) lines.push(`- **${check.label}**: ${check.detail}`)
  lines.push('')
}
lines.push('## 3. What this report is not')
lines.push('')
lines.push(
  `It is not a ranking, and it is not a promise that fixing a row moves an agent. Two of our fifteen checks are the only ones we can show a relationship with being named, and we publish which two rather than implying all fifteen matter equally: ${SITE_URL}/findings. Everything above is reproducible: the formula is published, the question is printed, and the runs are quoted.`,
)
lines.push('')
lines.push(`Let Agents In · ${SITE_URL}/methodology`)

writeFileSync(out, `${lines.join('\n')}\n`)
console.log(`${out} zapisany, ${lines.length} linii`)
console.log(`${domain}: ${card.total}/${measurable} w skanie, wymieniony ${mine?.named ?? 0}/${cell?.runs ?? 0} w biegach`)
process.exit(0)
