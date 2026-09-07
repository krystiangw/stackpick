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
import { randomBytes } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import cells from '../src/data/cells.json'
import { CATEGORIES, CURATED_DOMAINS, categoryFor } from '../src/lib/categories'
import { getStore, type Report } from '../src/lib/store'
import { FORMULA_VERSION } from '../src/lib/score'
import { brandTaken, certain, mentionsIn, nameGuest, quotedAbout, readsAsPolish } from '../src/lib/vendors'
import { normalizeDomain } from '../src/lib/scan/discover'
import { SITE_URL } from '../src/lib/site'
import { buildFixPlan } from '../src/lib/fixfirst'
import { scoreSection } from '../src/lib/report-numbers'
import type { ReportModel } from '../src/lib/client-report-model'
import { readRecommendationReview, requireRecommendationReview, RECOMMENDATION_LABELS, RECOMMENDATION_LIMIT, UNREVIEWED_RECOMMENDATIONS } from '../src/lib/recommendation-review'
import { recommendationReviewInput } from '../src/lib/recommendation-evidence'
import { BRIEF_LABELS, BRIEF_LIMIT, SCAN_ACTION_LIMIT, UNREVIEWED_BRIEF, readBriefReview, reportQuestion, requirePublishableBrief, verifyScanAction } from '../src/lib/report-brief'

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many)

const [given, ...rest] = process.argv.slice(2)
if (!given) {
  console.error('usage: npx tsx scripts/client-report.mts <domain> [--out FILE] [--category ID] [--brand NAME] [--brief-review FILE] [--recommendation-review FILE] [--scan-file FILE] [--publish]')
  process.exit(2)
}
// Sprawdzane PRZY ARGUMENTACH, nie przed samym zapisem: `--id` i `--sample` bez `--publish` byly
// cicho ignorowane, wiec skrypt konczyl sie sukcesem, drukowal „zapisany" i zostawial stara probke
// pod adresem. Zlapalem to na sobie, odswiezajac `/d/sample` po czterech podbiciach formuly, i przez
// chwile szukalem bledu w `saveDelivery`. Pierwsza wersja tego sprawdzenia stala tuz nad publikacja,
// czyli po wygenerowaniu calego raportu - odmowa po zmarnowanej pracy to nadal zmarnowana praca.
const publishOnly = ['--id', '--sample'].filter((flag) => rest.includes(flag))
if (!rest.includes('--publish') && publishOnly.length > 0) {
  console.error(`${publishOnly.join(' i ')} dziala tylko razem z --publish; bez niego powstaje sam plik i nic sie nie zmienia pod adresem`)
  process.exit(2)
}

// A buyer writes the domain the way they say it out loud. Without this, `www.stripe.com` was told
// it belongs to none of the categories we measure, about a domain sitting in the corpus.
const domain = normalizeDomain(given)
// One timestamp for both renderings. Two `new Date()` calls either side of midnight put a different
// date on the document and on the page that serves it.
const preparedAt = new Date().toISOString()
const outAt = rest.indexOf('--out')
const named = outAt === -1 ? undefined : rest[outAt + 1]
if (outAt !== -1 && !named) {
  console.error('--out potrzebuje sciezki')
  process.exit(2)
}
const out = named ?? `report-${domain.replace(/\./g, '-')}.md`

// A buyer is almost never in the corpus. The corpus is the domains we chose to publish about, and
// `categoryFor` matches that list, so every real prospect - an email provider we simply had not
// listed - was told their product is in none of the categories we measure. The category is the
// unit we sell, not the list, so a domain outside it can be placed into one by hand and read
// against the same answers. What that must never do is change the runs: the question, the answers
// and the other providers stay exactly as they were, and only the reading includes the newcomer.
const askedAt = rest.indexOf('--category')
const placedIn = askedAt === -1 ? null : rest[askedAt + 1]
if (askedAt !== -1 && !placedIn) {
  console.error('--category potrzebuje id kategorii')
  process.exit(2)
}
// Validated on its own, before anything falls back to the corpus. A typo in --category on a domain
// we already publish would otherwise be swallowed and the operator would read a report for the
// right vendor produced by the wrong instruction.
const placedInto = placedIn ? (CATEGORIES.find((one) => one.id === placedIn) ?? null) : null
if (placedIn && !placedInto) {
  console.error(`nie ma kategorii o id ${placedIn}. Sa: ${CATEGORIES.map((one) => one.id).join(', ')}`)
  process.exit(2)
}
// What the monthly mail already knows about this customer. A domain we do not publish can have been
// placed into a category by a person, and that decision is stored on their watch: reading it here
// means the report and the mail describe one customer the same way, and the operator does not have
// to remember a flag that has already been decided once.
const placedWatches = (await getStore().watchesForDomain(domain)).filter((one) => one.placedIn)
// Two watches disagreeing is not something to resolve by picking one: whichever the database
// returned first would be a different category from the one the other subscriber's mail uses.
// Marka porownywana bez wielkosci liter, bo tak samo dziala jej wylacznosc i sam matcher:
// „Mailtrap" i „mailtrap" to jedno przypisanie, a nie sprzecznosc.
const disagreement = [...new Set(placedWatches.map((one) => `${one.placedIn}/${(one.brand ?? '').toLowerCase()}`))]
if (disagreement.length > 1) {
  console.error(`${domain} ma sprzeczne przypisania: ${disagreement.join(' oraz ')}. Uporzadkuj je przez assign-watch, zanim wygenerujesz raport.`)
  process.exit(2)
}
const watched = placedWatches[0]
const known = categoryFor(domain)
if (placedInto && known && placedInto.id !== known.id) {
  console.error(`${domain} jest juz w kategorii ${known.id}, wiec --category ${placedIn} nic nie znaczy. Usun ten argument.`)
  process.exit(2)
}
const fromWatch = watched?.placedIn ? (CATEGORIES.find((one) => one.id === watched.placedIn) ?? null) : null
if (!known && !placedInto && fromWatch) {
  console.error(`${domain} jest obserwowana i przypisana do kategorii ${fromWatch.id}, wiec czytam ja tak samo jak miesieczny mail`)
}
const category = known ?? placedInto ?? fromWatch
const guest = category !== null && !category.domains.includes(domain)

// The brand, and only if a person supplies it. Guessing "postmark" for postmark.com would hand a
// guest every mention of postmarkapp.com, and "email" for email.com every sentence about email.
const brandAt = rest.indexOf('--brand')
// The stored brand only when a person did not name one here, and only when the placement came from
// the watch: a flag on the command line is somebody deciding now, and it wins.
const brand = brandAt === -1 ? (known || placedInto ? null : (watched?.brand ?? null)) : rest[brandAt + 1]
if (brandAt !== -1 && !brand) {
  console.error('--brand potrzebuje nazwy, np. --brand Mailtrap')
  process.exit(2)
}
if (!category) {
  // The promise on /pricing is that we say this BEFORE anybody pays, so the tool that produces the
  // report has to be able to say it too, in the same words.
  console.error(`${domain} nie nalezy do zadnej z ${CATEGORIES.length} mierzonych kategorii, wiec nie ma celi do uruchomienia.`)
  console.error('To jest odpowiedz, ktora dajemy PRZED platnoscia, nie po.')
  console.error(`Jesli jednak nalezy do ktorejs, wskaz ja: --category <id>. Sa: ${CATEGORIES.map((one) => one.id).join(', ')}`)
  process.exit(1)
}

// Every tool we hold for the category, cleanest first. /pricing promises ten runs on two tools,
// and one tool is five: a report that quietly delivered half of that would be the first thing a
// buyer could catch us on.
const held = cells
  .filter((candidate) => candidate.category === category.id)
  .sort((a, b) => a.operatorContext.length - b.operatorContext.length)
const cell = held[0]
const question = reportQuestion(held)
const reviewAt = rest.indexOf('--brief-review')
const reviewFile = reviewAt === -1 ? null : rest[reviewAt + 1]
if (reviewAt !== -1 && (!reviewFile || reviewFile.startsWith('--'))) {
  throw new Error('--brief-review needs a JSON file path.')
}
const briefReview = reviewFile
  ? readBriefReview(JSON.parse(readFileSync(reviewFile, 'utf8')), { domain, category: category.id, question })
  : null
if (rest.includes('--publish')) requirePublishableBrief(briefReview)
const runsAll = held.reduce((sum, one) => sum + one.runs, 0)
const labelOfGuest = domain.split('.')[0]

/**
 * A guest is read out of the same answers, with the same matcher, plus their own domain in the
 * list it resolves against. That last part matters and is not a detail: the matcher decides an
 * ambiguous name by its neighbours, so a newcomer has to be in the list to be read at all, and
 * everybody else has to be re-read alongside them or "named first" would still be the old winner.
 * The published rows stay the source for the ones we do publish, so a report about them cannot
 * disagree with the site.
 */
const withGuest = guest ? [...category.domains, domain] : category.domains
/**
 * Answers that carry the guest's name as a word while not counting as a mention of their domain.
 *
 * railway.app came out of this generator as "named in 0 of 11 runs" while ten answers said Railway,
 * because the name belongs to railway.com in our data and the two are the same company after a
 * move. Warning the operator on stderr is not enough: the buyer reads the zero, not our console. A
 * number a known ambiguity could overturn has to carry the ambiguity with it.
 */
let missedByWord = 0

if (guest) {
  // Nothing but the address, unless a person named the brand and the name is free. A collision is
  // refused rather than resolved: "Postmark" for postmark.com would silently move postmarkapp.com's
  // ten mentions onto a stranger's report, and no wording in the document could undo that.
  if (brand) {
    const taken = brandTaken(brand, [...CURATED_DOMAINS])
    if (taken) {
      console.error(`nazwa "${brand}" nalezy juz do ${taken}, wiec nie moze byc marka goscia. Podaj inna albo pomin --brand.`)
      process.exit(2)
    }
  }
  nameGuest(domain, brand ? [brand] : [])
  missedByWord = held
    .flatMap((one) => one.answers)
    .filter((answer) => !certain(mentionsIn(answer.text, withGuest)).some((mention) => mention.domain === domain))
    .filter((answer) => new RegExp(`\\b${labelOfGuest}\\b`, 'i').test(answer.text)).length
  if (missedByWord > 0 && !brand) {
    console.error(
      `UWAGA: ${missedByWord} odpowiedzi zawiera slowo "${labelOfGuest}", a nie liczy sie jako wymienienie, bo bez --brand szukamy tylko adresu ${domain}.`,
    )
    console.error('Sprawdz te odpowiedzi. Jesli to naprawde oni, uruchom ponownie z --brand, byle nazwa nie nalezala do nikogo innego.')
  }
}
const readAgain = () => {
  const named = new Map<string, number>()
  const first = new Map<string, number>()
  for (const one of held) {
    for (const answer of one.answers) {
      const sure = certain(mentionsIn(answer.text, withGuest))
      for (const who of new Set(sure.map((mention) => mention.domain))) named.set(who, (named.get(who) ?? 0) + 1)
      if (sure[0]) first.set(sure[0].domain, (first.get(sure[0].domain) ?? 0) + 1)
    }
  }
  return { named, first }
}
const live = guest ? readAgain() : null
// Reading everybody again should reproduce what we publish about them, and where it does not, the
// difference has to be visible to whoever sends the report rather than silently printed as fact.
// It can move honestly: adding a name to the list can promote an ambiguous mention beside it, and
// "named first" changes by definition when a newcomer opened an answer. Anything else is a bug.
if (live) {
  for (const one of held) {
    for (const row of one.rows) {
      const now = live.named.get(row.domain) ?? 0
      const published = held.reduce((sum, cell) => sum + (cell.rows.find((r) => r.domain === row.domain)?.named ?? 0), 0)
      if (now !== published) {
        console.error(`UWAGA ${row.domain}: publikujemy ${published}/${runsAll}, a z ${domain} w liscie wychodzi ${now}. Sprawdz zanim wyslesz.`)
      }
    }
  }
}
// Newest, not the corpus row. The corpus row is what makes vendors comparable to each other, and
// this report compares nobody: a buyer who fixed their llms.txt yesterday and rescanned would have
// been sold last week's scorecard under a heading written in the present tense.
const scanAt = rest.indexOf('--scan-file')
const scanFile = scanAt === -1 ? null : rest[scanAt + 1]
if (scanAt !== -1 && (!scanFile || scanFile.startsWith('--'))) throw new Error('--scan-file needs a JSON file path.')
const report: Report | null = scanFile
  ? JSON.parse(readFileSync(scanFile, 'utf8'))
  : await getStore().latestForDomain(domain)
if (!report) {
  console.error(`brak skanu dla ${domain}. Uruchom: npm run scan ${domain}`)
  process.exit(1)
}
if (report.domain !== domain) throw new Error('Scan file belongs to a different domain.')

/**
 * A guest whose address redirects into the corpus is not a guest, it is a vendor we already publish
 * under the address they moved from.
 *
 * railway.app came out of here as "named in 0 of 11 runs" with ten answers saying Railway, because
 * the mentions belong to railway.com and the two are one company after a move. The scanner already
 * knew: it followed the 301 and recorded the domain it landed on. Refusing here rather than
 * printing the zero is the same call as refusing an unmeasured category, and for the same reason:
 * the answer costs nothing before payment and is a refund after it.
 */
const landedOn = report.findings.resolvedElsewhere?.finalDomain
if (guest && landedOn && landedOn !== domain && CURATED_DOMAINS.has(landedOn)) {
  console.error(`${domain} przekierowuje na ${landedOn}, ktory juz publikujemy, wiec to ta sama firma pod dwoma adresami.`)
  console.error(`Wymienienia agentow ida na ${landedOn}, a raport dla ${domain} pokazalby zero, ktore nie jest prawda o nich.`)
  console.error(`Uruchom: npx tsx scripts/client-report.mts ${landedOn}`)
  process.exit(2)
}

const card = report.scorecard
const measurable = card.measurable ?? card.max
const failed = card.checks.filter((check) => !check.inconclusive && !check.notApplicable && check.points < check.max)
const unmeasured = card.checks.filter((check) => check.inconclusive)
const recommendationAt = rest.indexOf('--recommendation-review')
const recommendationFile = recommendationAt === -1 ? null : rest[recommendationAt + 1]
if (recommendationAt !== -1 && (!recommendationFile || recommendationFile.startsWith('--'))) {
  throw new Error('--recommendation-review needs a JSON file path.')
}
const recommendationReview = recommendationFile
  ? readRecommendationReview(JSON.parse(readFileSync(recommendationFile, 'utf8')), recommendationReviewInput(report, question))
  : null
if (rest.includes('--publish')) requireRecommendationReview(recommendationReview)


/**
 * Counts across every tool, because the headline is across every tool. Read off one cell, the
 * comparison inverted: godaddy.com was told "you were named in 5 of 10 runs" and then handed
 * gandi.net and porkbun.com as "named more often than you, in the same runs", when across those
 * same ten runs it led both. Eight pairs in the corpus read that way, and four more vendors were
 * shown nobody at all because they happened to top the one cell we looked at.
 */
const namedAcross = (of: string) =>
  live ? (live.named.get(of) ?? 0) : held.reduce((sum, one) => sum + (one.rows.find((row) => row.domain === of)?.named ?? 0), 0)
const firstAcross = (of: string) =>
  live ? (live.first.get(of) ?? 0) : held.reduce((sum, one) => sum + (one.rows.find((row) => row.domain === of)?.first ?? 0), 0)
const namedAll = namedAcross(domain)
const firstAll = firstAcross(domain)
const rivals = (live ? withGuest : (cell?.rows.map((row) => row.domain) ?? []))
  .filter((other) => other !== domain && namedAcross(other) > namedAll)
  .sort((a, b) => namedAcross(b) - namedAcross(a))
// A run apart is inside the noise this many runs can resolve, and the closing sentence says so.
// Printing one list would have that sentence contradict the list above it in the same document.
const ahead = rivals.filter((other) => namedAcross(other) - namedAll > 1)
const level = rivals.filter((other) => namedAcross(other) - namedAll === 1)

const saidAbout = (text: string) => quotedAbout(text, domain, withGuest)

// Filled as the markdown is written, from the same variables, so the page and the document cannot
// disagree about a number. Anything the page needs and the markdown does not say is still read off
// the same computation rather than repeated.
const forModel: Pick<ReportModel, 'runs' | 'quotes'> = { runs: [], quotes: [] }

const plan = buildFixPlan(report.findings, card)
// Restore the complete recorded pricing text when an older scorecard shortened its quotation.
const observed = (check: (typeof card.checks)[number]) => {
  const snippet = report.findings.funnel.pricingSnippet
  if (check.id !== 'price_in_snippet' || !snippet) return check.detail
  const read = snippet.description ?? snippet.opening
  return check.detail.replace(`“${read.slice(0, 160)}...”`, () => `“${read}”`)
}
const tableText = (text: string) => text.replace(/\|/g, '&#124;').replace(/\r?\n/g, ' ')
const toolCount = new Set(held.map((one) => one.tool.split(' ')[0])).size

const lines: string[] = []
lines.push(`# ${domain}: agent mentions and scan results`)
lines.push('')
lines.push(`Prepared ${preparedAt.slice(0, 10)} by Let Agents In. Category: ${category.label}.`)
lines.push('')
lines.push('## 1. Result and scope')
lines.push('')
if (!cell) {
  lines.push('No agent runs are available for this category yet. Contact Let Agents In to arrange the runs or a refund.')
} else {
  lines.push('Question tested:')
  lines.push('')
  lines.push(`> ${question}`)
  lines.push('')
  if (briefReview) {
    lines.push(`**Question fit: ${BRIEF_LABELS[briefReview.status]}.** Reviewed ${briefReview.reviewedAt}.`)
    lines.push('')
    lines.push(briefReview.rationale)
    lines.push('')
    for (const source of briefReview.sources) lines.push(`- ${source.note} ${source.url}`)
    lines.push('')
    lines.push(`Next step: ${briefReview.nextStep}`)
    lines.push('')
    lines.push(BRIEF_LIMIT)
  } else {
    lines.push(UNREVIEWED_BRIEF)
  }
  lines.push('')
  lines.push('| Date | Tool and version | Recorded model | Runs | Mentions |')
  lines.push('|---|---|---|---|---|')
  for (const one of held) {
    const there = live
      ? one.answers.filter((answer) => certain(mentionsIn(answer.text, withGuest)).some((mention) => mention.domain === domain)).length
      : (one.rows.find((row) => row.domain === domain)?.named ?? 0)
    lines.push(`| ${one.ranAt} | ${one.tool} | ${one.model} | ${one.runs} | ${there} |`)
    const [toolName, ...toolVersion] = one.tool.split(' ')
    forModel.runs.push({ tool: toolName, version: toolVersion.join(' '), model: one.model, ran: one.ranAt, count: one.runs, named: there, blind: one.operatorContext.length === 0 })
  }
  lines.push('')
  lines.push(`**${domain} was named in ${namedAll} of ${runsAll} runs on ${toolCount} ${plural(toolCount, 'tool', 'tools')} for this question.**${namedAll > 0 ? ` Named first in ${firstAll}.` : ''}`)
  lines.push('')
  lines.push('Each run used a separate session with no shared context; these counts apply to the question and setup recorded here.')
}
lines.push('')
lines.push(...scoreSection({ card, scannedAt: report.scannedAt, findings: report.findings }))

lines.push('## 2. Next steps and scan evidence')
lines.push('')
lines.push('The scan measures HTTP responses and public-page text; it does not test a completed integration.')
lines.push('')
lines.push(SCAN_ACTION_LIMIT)
lines.push('')
if (recommendationReview) {
  lines.push(`**Reviewed next steps (${recommendationReview.reviewedAt})**`, '', recommendationReview.summary, '', RECOMMENDATION_LIMIT, '')
  for (const item of recommendationReview.items) {
    lines.push(`### ${item.title}`, '', `**${RECOMMENDATION_LABELS[item.disposition]}**`, '', item.finding, '', `Next step: ${item.nextStep}`, '', `Validation: ${item.validation}`, '')
    for (const source of item.sources) lines.push(`- ${source.note} ${source.url}`)
    lines.push('')
  }
  lines.push('### Recorded scan observations', '', 'These are the original automated observations. The review above qualifies their interpretation.', '')
  for (const check of failed) lines.push(`- **${check.label} (${check.points}/${check.max})**: ${observed(check)}`)
  lines.push('')
} else {
  lines.push(`**${UNREVIEWED_RECOMMENDATIONS}**`, '')
}
if (plan && !recommendationReview) {
  lines.push(plan.claim)
  lines.push('')
  lines.push('| Check | Points | Observed | Action | Point gain | Effort (estimate) |')
  lines.push('|---|---|---|---|---|---|')
  for (const step of plan.steps) {
    const check = failed.find((check) => check.id === step.checkId)!
    lines.push(`| ${step.label} | ${check.points}/${check.max} | ${tableText(observed(check))} | ${tableText(step.how)} | +${step.gain} | ${step.effort} |`)
  }
  if (plan.unmeasured > 0) {
    lines.push('')
    lines.push(`*Table note: ${plan.unmeasured} unmeasured points excluded from the gain calculation.*`)
  }
  lines.push('')
  lines.push('### How to validate the changes')
  lines.push('')
  for (const step of plan.steps) lines.push(`- **${step.label}**: ${verifyScanAction(step.checkId)}`)
  lines.push('')
}
if (unmeasured.length > 0) {
  lines.push('### Unmeasured checks')
  lines.push('')
  for (const check of unmeasured) lines.push(`- **${check.label}**: ${check.detail}`)
  lines.push('')
}

if (cell) {
  lines.push('## 3. Run evidence')
  lines.push('')
  lines.push(`Raw runs: ${SITE_URL}/c/${category.id}/runs`)
  lines.push('')
  if (guest) {
    lines.push(`You were outside the original list of ${category.domains.length} providers; the question, sessions and answers were not rerun, and every provider's count was recomputed with your domain and any supplied brand included in matching.`)
    lines.push('')
  }
  if (missedByWord > 0) {
    lines.push(`${missedByWord} of these answers use the word "${labelOfGuest}" without naming ${domain}, and we did not count them.`)
    lines.push('')
  }
  const context = [...new Set(held.flatMap((one) => one.operatorContext))]
  if (context.length > 0) {
    const readableBy = [...new Set(held.filter((one) => one.operatorContext.length > 0).map((one) => one.tool.split(' ')[0]))]
    lines.push(`The tools ran on one laptop; ${readableBy.join(', ')} could read operator instructions in ${context.join(', ')}.`)
    lines.push('')
  }
  lines.push(`A one-run gap in this sample of ${runsAll} does not establish a rank.`)
  lines.push('')
  const standing = (other: string) => `- ${other}: ${namedAcross(other)}/${runsAll}, named first in ${firstAcross(other)}`
  if (ahead.length > 0) {
    lines.push('Named more often in these runs:')
    lines.push('')
    for (const other of ahead) lines.push(standing(other))
    lines.push('')
  }
  if (level.length > 0) {
    lines.push('Named in one more run:')
    lines.push('')
    for (const other of level) lines.push(standing(other))
    lines.push('')
  }
  const quotes = held
    .flatMap((one) => one.answers.map((answer) => ({ tool: one.tool.split(' ')[0], ...answer })))
    .map((answer) => ({ run: answer.run, tool: answer.tool, said: saidAbout(answer.text) }))
    .filter((entry) => entry.said !== null)
  for (const quote of quotes) forModel.quotes.push({ tool: quote.tool, run: quote.run, said: quote.said as string, about: 'you', who: domain })
  if (quotes.length > 0) {
    lines.push('What the runs said about you:')
    lines.push('')
    for (const quote of quotes) {
      lines.push(`- **${quote.tool} run ${quote.run}**${readsAsPolish(quote.said as string) ? ' (in Polish)' : ''}: “${quote.said}”`)
    }
    lines.push('')
  }
  const wordless = namedAll - quotes.length
  if (wordless > 0) {
    lines.push(`${wordless} of the runs that named you did so only in a table or a list of links, with no sentence about you to quote.`)
    lines.push('')
  }
  const wentFirstIn = (answer: { text: string; first: string | null }) =>
    live ? (certain(mentionsIn(answer.text, withGuest))[0]?.domain ?? null) : answer.first
  const winners = [...new Set(held.flatMap((one) => one.answers).map(wentFirstIn).filter((who) => who && who !== domain))]
  const chosen = (winners as string[])
    .map((who) => ({ who, first: firstAcross(who) }))
    .sort((a, b) => b.first - a.first)[0]
  if (chosen) {
    const won = held
      .flatMap((one) => one.answers.map((answer) => ({ tool: one.tool.split(' ')[0], ...answer })))
      .filter((answer) => wentFirstIn(answer) === chosen.who)
      .map((answer) => ({ run: answer.run, tool: answer.tool, said: quotedAbout(answer.text, chosen.who, withGuest) }))
      .filter((entry) => entry.said !== null)
      .slice(0, 3)
    if (won.length > 0) {
      lines.push(`Quotes about ${chosen.who} from runs that named it first:`)
      lines.push('')
      for (const quote of won) {
        lines.push(`- **${quote.tool} run ${quote.run}**${readsAsPolish(quote.said as string) ? ' (in Polish)' : ''}: “${quote.said}”`)
        forModel.quotes.push({ tool: quote.tool, run: quote.run, said: quote.said as string, about: 'winner', who: chosen.who })
      }
      lines.push('')
    }
  }
  const polish = forModel.quotes.filter((quote) => readsAsPolish(quote.said)).length
  if (polish > 0) {
    lines.push(`${polish} of the quotes above are in Polish, as requested by the operator instructions available to those runs.`)
    lines.push('')
    lines.push("Quotes retain their original language; a translated quote is our sentence, not the agent's.")
    lines.push('')
  }
}
lines.push(`## ${cell ? 4 : 3}. Limits`)
lines.push('')
lines.push(`This report does not rank vendors or show that a fix changes agent choices. Only two checks correlate with being named; see ${SITE_URL}/findings. You can reproduce the scan using the published formula and check the counts against the printed question and quoted answers.`)
lines.push('')
lines.push(`Let Agents In · ${SITE_URL}/methodology`)

const markdown = `${lines.join('\n')}\n`
writeFileSync(out, markdown)
console.log(`${out} zapisany, ${lines.length} linii`)

const model: ReportModel = {
  domain,
  category: category.label,
  preparedAt,
  formulaVersion: card.formulaVersion,
  formulaNow: card.formulaVersion === FORMULA_VERSION ? null : FORMULA_VERSION,
  scannedAt: report.scannedAt,
  guest,
  missedByWord,
  score: { total: card.total, measurable, max: card.max },
  stages: card.stages.map((stage) => ({
    title: stage.title,
    question: stage.question,
    points: stage.points,
    measurable: stage.measurable ?? stage.max,
  })),
  question,
  briefReview,
  recommendationReview,
  runsUrl: cell ? `${SITE_URL}/c/${category.id}/runs` : null,
  runs: forModel.runs,
  named: { named: namedAll, first: firstAll, of: runsAll },
  // Both lists in one, with the gap that decides whether we call it clear: a run apart is inside
  // what this many runs can separate, and the document says so in words as well.
  rivals: [
    ...ahead.map((other) => ({ domain: other, named: namedAcross(other), first: firstAcross(other), clear: true })),
    ...level.map((other) => ({ domain: other, named: namedAcross(other), first: firstAcross(other), clear: false })),
  ],
  quotes: forModel.quotes,
  failing: failed.map((check) => ({ label: check.label, points: check.points, max: check.max, detail: observed(check), unblock: check.unblock ?? null })),
  unmeasured: unmeasured.map((check) => ({ label: check.label, detail: check.detail })),
  notApplicable: card.checks.filter((check) => check.notApplicable).map((check) => ({ label: check.label, detail: check.detail })),
  fixes: recommendationReview ? [] : (plan?.steps ?? []).map((step) => ({ label: step.label, gain: step.gain, effort: step.effort, how: step.how, verify: verifyScanAction(step.checkId) })),
  fixClaim: recommendationReview ? null : plan?.claim ?? null,
  behindUnmeasured: plan?.unmeasured ?? 0,
}

// Keep a local rendering input beside the markdown for review before publishing a delivery.
writeFileSync(`${out}.json`, `${JSON.stringify(model, null, 2)}\n`)

// The id is the only delivery key; reports are never indexed or listed.
if (rest.includes('--publish')) {
  const at = rest.indexOf('--id')
  const chosen = at === -1 ? null : rest[at + 1]
  if (at !== -1 && (!chosen || chosen.startsWith('--') || !/^[\w-]{3,40}$/.test(chosen))) {
    console.error('--id potrzebuje nazwy z liter, cyfr, myslnika lub podkreslenia (3-40 znakow)')
    process.exit(2)
  }
  const id = chosen ?? randomBytes(9).toString('base64url')
  await getStore().saveDelivery({
    id,
    domain,
    markdown,
    model,
    preparedAt: model.preparedAt,
    formulaVersion: card.formulaVersion,
    ...(rest.includes('--sample') ? { sample: true } : {}),
  })
  console.log(`${SITE_URL}/d/${id}`)
}
// Te same liczby, ktore trafily do dokumentu. Linia konsoli brala je z pierwszej celi i z
// opublikowanych wierszy, wiec dla goscia pisala „0/5" nad raportem mowiacym „0 of 10": operator
// decyduje o wyslaniu wlasnie po tej linii.
console.log(`${domain}: ${card.total}/${measurable} w skanie, wymieniony ${namedAll}/${runsAll} w biegach`)
process.exit(0)
