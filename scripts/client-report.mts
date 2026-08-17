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

const [domain, ...rest] = process.argv.slice(2)
if (!domain) {
  console.error('usage: npx tsx scripts/client-report.mts <domain> [--out FILE]')
  process.exit(2)
}
const outAt = rest.indexOf('--out')
const out = outAt === -1 ? `report-${domain.replace(/\./g, '-')}.md` : rest[outAt + 1]

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
const report = await getStore().latestForDomain(domain, true) ?? (await getStore().latestForDomain(domain))
if (!report) {
  console.error(`brak skanu dla ${domain}. Uruchom: npm run scan ${domain}`)
  process.exit(1)
}

const card = report.scorecard
const measurable = card.measurable ?? card.max
const failed = card.checks.filter((check) => !check.inconclusive && !check.notApplicable && check.points < check.max)
const unmeasured = card.checks.filter((check) => check.inconclusive)

const mine = cell?.rows.find((row) => row.domain === domain)
const ahead = cell?.rows.filter((row) => row.named > (mine?.named ?? 0)) ?? []

/** The sentence a run wrote about them, or the winner's sentence when there is none about them. */
function saidAbout(text: string, name: string): string | null {
  const at = text.toLowerCase().indexOf(name.split('.')[0].toLowerCase())
  if (at === -1) return null
  const from = Math.max(text.lastIndexOf('. ', at) + 1, at - 120)
  return text.slice(from, at + 200).replace(/\s+/g, ' ').trim()
}

const lines: string[] = []
lines.push(`# ${domain}: what an AI agent does with you`)
lines.push('')
lines.push(`Prepared ${new Date().toISOString().slice(0, 10)} by Let Agents In. Category: ${category.label}.`)
lines.push('')
lines.push('## 1. Whether an agent names you at all')
lines.push('')
if (!cell) {
  lines.push('We hold no agent runs for this category yet, so this half is not answered and you have not been charged for it.')
} else {
  lines.push(
    held.length > 1
      ? `We put one buying question to an agent ${runsAll} times across ${held.length} different tools (${held.map((one) => `${one.tool.split(' ')[0]}: ${one.runs}`).join(', ')}), each run a separate session with nothing carried between them. A result that survives two tools is about you rather than about the machine we ran it on.`
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
  if (ahead.length > 0) {
    lines.push('Named more often than you, in the same runs:')
    lines.push('')
    for (const row of ahead) lines.push(`- ${row.domain}: ${row.named}/${cell.runs} on ${cell.tool.split(' ')[0]}, first in ${row.first}`)
    lines.push('')
  }
  // Named by tool as well as by number: two tools both have a run 1, and "Run 1" twice in one
  // report is the kind of small confusion that makes a buyer doubt the rest of it.
  const quotes = held
    .flatMap((one) => one.answers.map((answer) => ({ tool: one.tool.split(' ')[0], ...answer })))
    .map((answer) => ({ run: answer.run, tool: answer.tool, said: saidAbout(answer.text, domain) }))
    .filter((entry) => entry.said !== null)
  if (quotes.length > 0) {
    lines.push('What the runs said about you, quoted:')
    lines.push('')
    for (const quote of quotes) lines.push(`- **${quote.tool} run ${quote.run}**: “${quote.said}”`)
  } else {
    lines.push('No run wrote a sentence about you. That is the finding: not a bad review, an absence.')
    const winners = [...new Set(held.flatMap((one) => one.answers).map((answer) => answer.first).filter(Boolean))]
    if (winners.length > 0) lines.push('')
    if (winners.length > 0) lines.push(`The runs chose ${winners.join(', ')} instead.`)
  }
  lines.push('')
  lines.push(`${runsAll} runs separate a wall from silence and nothing finer: two vendors a run apart are not ranked by this.`)
  if (cell.operatorContext.length > 0) {
    lines.push('')
    lines.push(`These runs could read the operator instructions on the machine they ran on (${cell.operatorContext.join(', ')}), so they describe an agent there rather than an agent at your customer. We say so rather than print the number alone.`)
  }
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
lines.push('It is not a ranking, and it is not a promise that fixing a row moves an agent. Two of our fifteen checks are the only ones we can show a relationship with being named, and we publish which two rather than implying all fifteen matter equally. Everything above is reproducible: the formula is published, the question is printed, and the runs are quoted.')
lines.push('')
lines.push('Let Agents In · https://letagentsin.com/methodology')

writeFileSync(out, `${lines.join('\n')}\n`)
console.log(`${out} zapisany, ${lines.length} linii`)
console.log(`${domain}: ${card.total}/${measurable} w skanie, wymieniony ${mine?.named ?? 0}/${cell?.runs ?? 0} w biegach`)
process.exit(0)
