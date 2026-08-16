/**
 * What the discovery runs named, read from the answers by rule.
 *
 *   npm run asked -- file-storage
 *
 * The build harness has a rule that artefacts decide what shipped, never the run's own report.
 * The equivalent here is that a published list of names and a published regular expression decide
 * who was named, never a second model reading the first one's answer. A model grading a model is
 * the measurement this whole product exists to be an alternative to.
 *
 * Three numbers come out and they are not the same question:
 *   named   how many runs mentioned the vendor at all, which is whether you are in the room
 *   first   how many named it before any other vendor in the corpus
 *   weak    hits that are also ordinary English, quoted rather than counted
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { CATEGORIES } from '../src/lib/categories'
import { certain, mentionsIn } from '../src/lib/vendors'

const [categoryId] = process.argv.slice(2)
const category = CATEGORIES.find((candidate) => candidate.id === categoryId)
if (!category) {
  console.error('usage: npm run asked -- <category>')
  console.error(`categories: ${CATEGORIES.map((candidate) => candidate.id).join(', ')}`)
  process.exit(2)
}

const target = join(process.env.LETAGENTSIN_RUNS ?? join(homedir(), '.letagentsin-runs'), 'ask', category.id)
if (!existsSync(target)) {
  console.error(`no runs at ${target}. Run them first: npm run ask -- ${category.id} claude 5`)
  process.exit(1)
}

type Run = {
  dir: string
  answer: string
  meta: {
    run: number
    exitCode: number | null
    timedOut: boolean
    model: string
    cli: string
    cleanRoom?: boolean
    operatorContext?: string[]
  }
}

const all: Run[] = readdirSync(target)
  .filter((name) => name.startsWith('run-'))
  .sort()
  .map((name) => {
    const dir = join(target, name)
    return {
      dir,
      answer: readFileSync(join(dir, 'ANSWER.txt'), 'utf8'),
      meta: JSON.parse(readFileSync(join(dir, 'RUN.json'), 'utf8')),
    }
  })

const broken = all.filter((run) => run.meta.timedOut || run.meta.exitCode !== 0 || run.answer.trim().length === 0)
const answered = all.filter((run) => !broken.includes(run))

console.log(`${category.label}`)
console.log(`${answered.length} odpowiedzi z ${all.length} biegow, ${all[0]?.meta.cli} (${all[0]?.meta.model})`)
if (broken.length > 0) {
  // Out of the denominator on purpose: a run that never answered is not a run that named nobody.
  console.log(`poza mianownikiem: ${broken.map((run) => `run-${run.meta.run}`).join(', ')}`)
}

// Printed above the table rather than below it, because a reader who has already seen the numbers
// has already believed them. The first cell run this way came back in Polish, from a machine whose
// user-level CLAUDE.md says to answer in Polish, and nothing in the numbers showed it.
const dirty = [...new Set(answered.flatMap((run) => (run.meta.cleanRoom ? [] : run.meta.operatorContext ?? [])))]
if (dirty.length > 0) {
  console.log('\nUWAGA: to nie jest czysty pomiar. Biegi czytaly instrukcje tej maszyny:')
  for (const file of dirty) console.log(`  ${file}`)
  console.log('Liczby nizej opisuja agenta na TEJ maszynie, nie agenta u klienta.')
}
console.log('')

const named = new Map<string, number>()
const first = new Map<string, number>()
const weak: { domain: string; run: number; sentence: string }[] = []

for (const run of answered) {
  const mentions = mentionsIn(run.answer, category.domains)
  const sure = certain(mentions)
  for (const mention of sure) named.set(mention.domain, (named.get(mention.domain) ?? 0) + 1)
  if (sure[0]) first.set(sure[0].domain, (first.get(sure[0].domain) ?? 0) + 1)
  for (const mention of mentions) {
    if (mention.form === 'weak') weak.push({ domain: mention.domain, run: run.meta.run, sentence: mention.sentence })
  }
}

const rows = category.domains
  .map((domain) => ({ domain, named: named.get(domain) ?? 0, first: first.get(domain) ?? 0 }))
  .sort((a, b) => b.named - a.named || b.first - a.first || a.domain.localeCompare(b.domain))

console.log('domena                     wymieniony  pierwszy')
for (const row of rows) {
  console.log(`${row.domain.padEnd(26)} ${String(row.named).padStart(6)}/${answered.length}   ${String(row.first).padStart(5)}`)
}

if (weak.length > 0) {
  console.log('\nniepewne, czyli marka bedaca zwyklym slowem. Przeczytaj zdanie i zdecyduj sam:')
  for (const hit of weak) console.log(`  ${hit.domain.padEnd(20)} run-${hit.run}  ${hit.sentence.slice(0, 120)}`)
}

const invisible = rows.filter((row) => row.named === 0).length
console.log(`\n${invisible} z ${rows.length} dostawcow w tej kategorii nie padlo ani razu`)
