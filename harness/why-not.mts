/**
 * What the runs said about the vendors they did NOT pick.
 *
 *   npm run why-not
 *   npm run why-not -- file-storage
 *
 * `npm run asked` reads who was named and who was named first, which is presence and ranking. The
 * answers also carry something we never read: the column where the run says why it would not choose
 * the others. That sentence is the only part of the measurement a vendor can act on.
 *
 * The rule from `asked.mts` holds unchanged: a published list and a published regular expression
 * decide, never a second model reading the first one's answer. So a reason is one of the markers
 * below or it is unclassified, and the unclassified share is printed with the results. A taxonomy
 * that explains everything explains nothing.
 *
 * Read from the comparison table rather than from prose. The first attempt took the richest
 * sentence naming the vendor and classified 1 of 278 mentions, because that sentence is usually why
 * the run CONSIDERED them; the rejection lives in the last cell of a table whose header varies in
 * wording but never in position.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { CATEGORIES } from '../src/lib/categories'
import { chosenIn, rejectionsIn, winnersOf } from './answers.mjs'

/**
 * Why a run walks away, written against the 140 rejections the August cells actually contain.
 * Ordered by how often they appear, and deliberately coarse: a vendor can act on "we read as
 * expensive", not on nine shades of it.
 */
const REASONS: { id: string; marker: RegExp }[] = [
  { id: 'price', marker: /\bpricing\b|\bcosts?\b|\bcostlier\b|\bexpensive\b|\bpricier\b|\bfees?\b|\bbilling\b|per[- ]host|\$\d/i },
  { id: 'operational-burden', marker: /operational|configuration|\bsetup\b|complexity|maintain|self-host|your responsibility|you own|upgrades|learning curve/i },
  { id: 'licensing', marker: /licen[cs]e|licensing|\bGPL\b|commercial terms/i },
  { id: 'overkill', marker: /justify|richer|heavier|more than (you |we )?need|overkill|unnecessary/i },
  // "compliance" alone reads as enterprise shape until the sentence is about a licence: every run
  // that rejected ckeditor.com said "GPL compliance", which is the licensing objection wearing the
  // other marker's word.
  { id: 'enterprise-shaped', marker: /enterprise|procurement|governance|(?<!GPL )compliance/i },
  { id: 'dependency', marker: /aggregator|dependency|lock-?in|coupling|another vendor|ties you/i },
  { id: 'limits', marker: /\blimits?\b|\bquotas?\b|\bcaps?\b|constraint/i },
]

/**
 * A citation is not an objection. Three of the fourteen recurring reasons were the word "Pricing"
 * inside a link label under a sentence about log retention, which would have been published to that
 * vendor as "you read as expensive".
 */
const withoutCitations = (text: string) => text.replace(/\[[^\]]*\]\([^)]*\)/g, ' ').replace(/https?:\/\/\S+/g, ' ')

/**
 * A rejection that is really a condition. "Pick it when procurement dominates" is not a no, it is a
 * shape of buyer this vendor wins. Counted apart because it is the more useful half to sell back.
 */
const CONDITIONAL = /\b(pick|choose|use|select|prefer) it (if|when)|my choice (if|when)|would (be|become) my choice|wins? (only )?(if|when)|i would (choose|select|pick|reach for) it/i

/** With five runs per cell the equivalent of "6 of 8" is four. Stated because the bar decides the verdict. */
const RECURS = 0.8

const runsRoot = join(process.env.LETAGENTSIN_RUNS ?? join(homedir(), '.letagentsin-runs-codex'), 'ask')
const only = process.argv[2]

let cells = 0
let answers = 0
let answersWithTable = 0
let rejections = 0
let unclassified = 0
let conditional = 0
let stableWinner = 0
let outsideCorpus = 0
const recurring: { category: string; domain: string; reason: string; inRuns: number; ofRuns: number; quote: string }[] = []

for (const category of CATEGORIES.filter((candidate) => !only || candidate.id === only)) {
  const dir = join(runsRoot, category.id)
  if (!existsSync(dir)) continue
  // A run that timed out or exited nonzero still leaves an ANSWER.txt, and a partial answer names
  // fewer vendors and carries no table. Counted as an answer it would quietly move both the
  // coverage share and the recurrence denominator.
  const texts = readdirSync(dir)
    .filter((name) => name.startsWith('run-'))
    .map((name) => ({ answer: join(dir, name, 'ANSWER.txt'), meta: join(dir, name, 'RUN.json') }))
    .filter((run) => existsSync(run.answer) && existsSync(run.meta))
    .filter((run) => {
      const meta = JSON.parse(readFileSync(run.meta, 'utf8')) as { exitCode: number; timedOut: boolean }
      return meta.exitCode === 0 && !meta.timedOut && readFileSync(run.answer, 'utf8').trim().length > 0
    })
    .map((run) => readFileSync(run.answer, 'utf8'))
  if (texts.length === 0) continue
  cells++

  const winners: string[] = []
  const rejectedIn = new Map<string, number>()
  const reasonIn = new Map<string, number>()
  const quoteFor = new Map<string, string>()

  for (const text of texts) {
    answers++
    const chosen = chosenIn(text, category.domains)
    if (chosen) winners.push(chosen)
    else outsideCorpus++

    const theirs = rejectionsIn(text, category.domains)
    if (theirs.length > 0) answersWithTable++
    // One rejection per vendor per run, or the denominator stops being runs. grafana.com sits in
    // two rows of the observability table in all five runs, so "4 of 5 runs" was being read off a
    // count of ten, and a vendor rejected twice in one run could fall under the bar by agreeing
    // with itself only once.
    const perRun = new Map<string, string>()
    for (const rejection of theirs) {
      // The chosen vendor usually has its own row, with the caveat that comes with any choice.
      // Counting it made datadoghq.com "rejected on price in 5 of 5" in the cell it won 4 of 5.
      if (rejection.domain === chosen) continue
      const merged = perRun.get(rejection.domain)
      perRun.set(rejection.domain, merged ? `${merged} ${rejection.text}` : rejection.text)
    }
    for (const [domain, text] of perRun) {
      rejections++
      const said = withoutCitations(text)
      if (CONDITIONAL.test(said)) conditional++
      rejectedIn.set(domain, (rejectedIn.get(domain) ?? 0) + 1)
      const rejection = { domain, text }
      const matched = REASONS.filter((reason) => reason.marker.test(said))
      if (matched.length === 0) unclassified++
      for (const reason of matched) {
        const key = `${rejection.domain}|${reason.id}`
        reasonIn.set(key, (reasonIn.get(key) ?? 0) + 1)
        if (!quoteFor.has(key)) quoteFor.set(key, rejection.text.replace(/\s+/g, ' ').slice(0, 200))
      }
    }
  }

  const top = winnersOf(texts, category.domains)[0]
  if (top && top[1] / texts.length >= RECURS) stableWinner++
  const off = texts.length - winners.length
  console.log(
    `${category.id.padEnd(24)} ${top ? `${top[0]} ${top[1]}/${texts.length}` : 'nikt z korpusu'}${off > 0 ? `  (poza korpusem ${off}/${texts.length})` : ''}`,
  )

  for (const [key, hits] of reasonIn) {
    const [domain, reason] = key.split('|')
    const of = rejectedIn.get(domain) ?? 0
    if (of >= 2 && hits / of >= RECURS) {
      recurring.push({ category: category.id, domain, reason, inRuns: hits, ofRuns: of, quote: quoteFor.get(key) ?? '' })
    }
  }
}

console.log(`\n=== FALSYFIKATOR, prog powtarzalnosci ${RECURS * 100}%`)
console.log(`kategorii ${cells}, odpowiedzi ${answers}, z tabela odrzucen ${answersWithTable} (${Math.round((answersWithTable / answers) * 100)}%)`)
console.log(`stabilny zwyciezca z korpusu: ${stableWinner}/${cells}`)
console.log(`biegow, w ktorych wybrano vendora SPOZA korpusu: ${outsideCorpus}/${answers}`)
console.log(`odrzucen: ${rejections}, bez markera ${unclassified} (${Math.round((unclassified / Math.max(rejections, 1)) * 100)}%), warunkowych ${conditional} (${Math.round((conditional / Math.max(rejections, 1)) * 100)}%)`)
console.log(`powtarzalnych powodow (ten sam vendor, ten sam marker, min 2 odrzucenia): ${recurring.length}`)
for (const hit of recurring.sort((a, b) => b.ofRuns - a.ofRuns || a.category.localeCompare(b.category))) {
  console.log(`  ${hit.category.padEnd(22)} ${hit.domain.padEnd(22)} ${hit.reason.padEnd(20)} ${hit.inRuns}/${hit.ofRuns}`)
  console.log(`      "${hit.quote}"`)
}
