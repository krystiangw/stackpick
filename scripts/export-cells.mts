/**
 * Freezes the discovery cells into a file the site can read.
 *
 *   npx tsx scripts/export-cells.mts        # writes src/data/cells.json
 *
 * The runs live on a laptop under $LETAGENTSIN_RUNS and the site runs on a dyno, so the only way
 * a page can show what agents actually named is a committed export. That is also the honest shape:
 * a cell is frozen evidence with a date on it, not a live number, and a reader has to be able to
 * tell the two apart.
 *
 * Read by the same rule the terminal reader uses - a published list of names and a published
 * regular expression - never by a second model grading the first one's answer.
 */
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { CATEGORIES } from '../src/lib/categories'
import { certain, mentionsIn } from '../src/lib/vendors'

/**
 * Every runs directory we hold, newest tool last. The paid report promises ten runs on two tools,
 * and one root holds one tool: claude runs on this machine read its operator instructions, codex
 * reads none of them and answers in English. Publishing both is the honest version of that promise
 * and the only way a reader can see which half is contaminated.
 */
const runsRoots = (process.env.LETAGENTSIN_RUNS_ALL ?? '')
  .split(':')
  .filter(Boolean)
  .concat(process.env.LETAGENTSIN_RUNS ?? join(homedir(), '.letagentsin-runs'))
const runsRoot = runsRoots[runsRoots.length - 1]
const asksDir = join(new URL('.', import.meta.url).pathname, '..', 'harness', 'asks')

type Row = { domain: string; named: number; first: number }
export type Cell = {
  category: string
  question: string
  runs: number
  tool: string
  model: string
  /** Instruction files the runs could read. Empty means a clean room, which we do not have yet. */
  operatorContext: string[]
  ranAt: string
  rows: Row[]
  /**
   * The answers themselves. A table of counts is our reading of them; the words are the evidence,
   * and a vendor who disagrees with a count can only check it against the text. About 1.4 kB per
   * run, so the whole corpus of cells is smaller than one screenshot.
   */
  answers: { run: number; text: string; named: string[]; first: string | null }[]
}

const cells: Cell[] = []

for (const category of CATEGORIES) {
 for (const root of runsRoots) {
  const dir = join(root, 'ask', category.id)
  if (!existsSync(dir)) continue
  const runs = readdirSync(dir)
    .filter((name) => name.startsWith('run-'))
    .sort()
    .map((name) => join(dir, name))
    .filter((path) => existsSync(join(path, 'RUN.json')) && existsSync(join(path, 'ANSWER.txt')))
    .map((path) => ({
      answer: readFileSync(join(path, 'ANSWER.txt'), 'utf8'),
      meta: JSON.parse(readFileSync(join(path, 'RUN.json'), 'utf8')) as {
        run: number
        exitCode: number | null
        timedOut: boolean
        model: string
        cli: string
        cleanRoom?: boolean
        operatorContext?: string[]
        finishedAt?: string
      },
    }))

  // A run that never answered is not a run that named nobody, so it stays out of the denominator.
  const answered = runs.filter((run) => !run.meta.timedOut && run.meta.exitCode === 0 && run.answer.trim().length > 0)
  if (answered.length === 0) continue

  const named = new Map<string, number>()
  const first = new Map<string, number>()
  for (const run of answered) {
    const sure = certain(mentionsIn(run.answer, category.domains))
    for (const mention of sure) named.set(mention.domain, (named.get(mention.domain) ?? 0) + 1)
    if (sure[0]) first.set(sure[0].domain, (first.get(sure[0].domain) ?? 0) + 1)
  }

  const questionFile = join(asksDir, `${category.id}.md`)
  cells.push({
    category: category.id,
    question: existsSync(questionFile) ? readFileSync(questionFile, 'utf8').trim() : '',
    runs: answered.length,
    tool: answered[0].meta.cli,
    model: answered[0].meta.model,
    // File names, not paths. What a reader needs is which instruction files the runs could read;
    // the absolute path adds the operator's home directory, and this file is published, quoted on
    // the category pages and pasted into a report a customer forwards.
    operatorContext: [
      ...new Set(answered.flatMap((run) => (run.meta.cleanRoom ? [] : (run.meta.operatorContext ?? []))).map((path) => path.split('/').pop() ?? path)),
    ],
    ranAt: (answered[answered.length - 1].meta.finishedAt ?? '').slice(0, 10),
    answers: answered.map((run) => {
      const sure = certain(mentionsIn(run.answer, category.domains))
      return {
        run: run.meta.run,
        text: run.answer.trim(),
        named: [...new Set(sure.map((mention) => mention.domain))],
        first: sure[0]?.domain ?? null,
      }
    }),
    rows: category.domains
      .map((domain) => ({ domain, named: named.get(domain) ?? 0, first: first.get(domain) ?? 0 }))
      .sort((a, b) => b.named - a.named || b.first - a.first || a.domain.localeCompare(b.domain)),
  })
 }
}

const out = join(new URL('.', import.meta.url).pathname, '..', 'src', 'data')
mkdirSync(out, { recursive: true })
writeFileSync(join(out, 'cells.json'), `${JSON.stringify(cells, null, 2)}\n`)
console.log(`${cells.length} cel zapisanych do src/data/cells.json`)
for (const cell of cells) {
  const invisible = cell.rows.filter((row) => row.named === 0).length
  console.log(`  ${cell.category.padEnd(24)} ${cell.runs} biegow, ${invisible} z ${cell.rows.length} nie padlo ani razu`)
}
process.exit(0)
