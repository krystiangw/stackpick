/**
 * Does passing our checks have anything to do with being named by an agent?
 *
 * This is the question the whole product implies and has never tested. It became urgent on
 * 2026-08-16: three independent log studies found AI crawlers request `llms.txt` on the order of
 * 0.1 percent of their fetches, and sites publishing it are cited at the same rate as sites that
 * do not. We score `llms_txt` as one of fifteen checks. Defending that with an argument would be
 * the opposite of what this repository is for, so it gets measured against our own data.
 *
 *   npm run named-vs-score            # every category with discovery runs on disk
 *
 * What it joins: the discovery cells (`npm run ask`), which say how many runs named each vendor,
 * and the corpus scorecards, which say which checks that vendor passes.
 *
 * Three things it will NOT tell you, printed with the results so nobody quotes half of it:
 *   - Causation. A vendor everybody has heard of both publishes llms.txt and gets named.
 *   - Anything about a single vendor. Five runs separate a wall from silence, nothing finer.
 *   - Anything clean. The runs read this machine's configuration, which is recorded per run.
 *
 * The permutation test is the guard against reading noise as a finding: the labels are shuffled
 * ten thousand times to see how often chance alone produces a gap this large.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { CATEGORIES } from '../src/lib/categories'
import { getStore } from '../src/lib/store'
import { certain, mentionsIn } from '../src/lib/vendors'

const root = process.argv[2] ?? join(process.env.LETAGENTSIN_RUNS ?? join(homedir(), '.letagentsin-runs'), 'ask')
if (!existsSync(root)) {
  console.error(`brak biegow w ${root}. Puść je najpierw: npm run ask -- <kategoria> claude sonnet 5`)
  process.exit(1)
}

type Row = {
  domain: string
  category: string
  named: number
  runs: number
  /** Only checks we could measure: id -> whether it passed. Absent means unmeasured. */
  passes: Map<string, boolean>
  score: number
  max: number
  /**
   * Weekly npm downloads of their package, the one popularity number we already hold. It is the
   * obvious confounder and the reason this file cannot stop at a correlation: a vendor everybody
   * has heard of both ships an MCP server and gets named, and without splitting on this the table
   * above would be reporting fame with our own check names on it.
   */
  downloads: number | null
}

const store = getStore()
const rows: Row[] = []
let cells = 0
const dirty = new Set<string>()

for (const category of CATEGORIES) {
  const dir = join(root, category.id)
  if (!existsSync(dir)) continue
  const runs = readdirSync(dir)
    .filter((name) => name.startsWith('run-'))
    .map((name) => join(dir, name))
    .filter((path) => existsSync(join(path, 'RUN.json')))
    .map((path) => ({
      answer: readFileSync(join(path, 'ANSWER.txt'), 'utf8'),
      meta: JSON.parse(readFileSync(join(path, 'RUN.json'), 'utf8')) as { exitCode: number; timedOut: boolean; operatorContext?: string[] },
    }))
    .filter((run) => run.meta.exitCode === 0 && !run.meta.timedOut && run.answer.trim().length > 0)
  if (runs.length === 0) continue
  cells += 1
  for (const run of runs) for (const file of run.meta.operatorContext ?? []) dirty.add(file)

  const named = new Map<string, number>()
  for (const run of runs) {
    for (const mention of certain(mentionsIn(run.answer, category.domains))) {
      named.set(mention.domain, (named.get(mention.domain) ?? 0) + 1)
    }
  }
  for (const domain of category.domains) {
    // The published row, not the newest scan we happen to hold. Ad-hoc scans run from a console
    // land in the same collection: on 2026-08-17 a handful of unseeded 9.31 scans of MCP vendors
    // were silently deciding this measurement, which is the same trap /v/<domain> fell into.
    const report = await store.latestForDomain(domain, true)
    if (!report) continue
    // Unmeasured checks are left out rather than counted as failures: "we could not read it" is
    // not "they did not do it", and folding the two together is the mistake the scorecard itself
    // refuses to make.
    //
    // The comment above described the intent and the code did the opposite for three weeks: a Set
    // of passing ids cannot tell "measured and failed" from "not measured", so every unmeasured row
    // landed in the failing group. An independent guard written on 2026-08-17
    // (scripts/audit-study.mts) disagreed with this script about mcp_present among lesser known
    // vendors, +9pp against -5pp, and this was why. The verdict is now stored as measured -> passed.
    const passes = new Map(
      report.scorecard.checks
        .filter((check) => !check.inconclusive && !check.notApplicable)
        .map((check) => [check.id, check.points > 0] as const),
    )
    const npm = (report.findings as unknown as { npm?: { weeklyDownloads?: number } }).npm
    rows.push({
      domain,
      category: category.id,
      named: named.get(domain) ?? 0,
      runs: runs.length,
      passes,
      score: report.scorecard.total,
      max: report.scorecard.max,
      downloads: npm?.weeklyDownloads ?? null,
    })
  }
}

if (rows.length === 0) {
  console.error('zadna kategoria z biegami nie ma wierszy w korpusie')
  process.exit(1)
}

const rate = (subset: Row[]) => (subset.length === 0 ? 0 : subset.reduce((sum, row) => sum + row.named / row.runs, 0) / subset.length)

/**
 * How often chance alone produces a gap this big, with the same group sizes. Deterministic seed,
 * because a number that moves between runs of the same data is not a number anybody can check.
 */
function byChance(rows: Row[], hasIt: (row: Row) => boolean, gap: number): number {
  const values = rows.map((row) => row.named / row.runs)
  const withCount = rows.filter(hasIt).length
  if (withCount === 0 || withCount === rows.length) return 1
  let seed = 20260816
  const random = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
  let atLeastAsBig = 0
  const ROUNDS = 10_000
  for (let round = 0; round < ROUNDS; round++) {
    const shuffled = [...values]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    const mean = (from: number, to: number) => shuffled.slice(from, to).reduce((sum, value) => sum + value, 0) / (to - from)
    if (Math.abs(mean(0, withCount) - mean(withCount, shuffled.length)) >= Math.abs(gap)) atLeastAsBig += 1
  }
  return atLeastAsBig / ROUNDS
}

console.log(`${cells} cel, ${rows.length} dostawcow z wierszem w korpusie, ${rows.filter((row) => row.named > 0).length} wymienionych choc raz\n`)
if (dirty.size > 0) {
  console.log('UWAGA: biegi czytaly instrukcje tej maszyny, wiec to nie jest czysty pomiar:')
  for (const file of dirty) console.log(`  ${file}`)
  console.log('')
}

const CHECKS = [...new Set(rows.flatMap((row) => [...row.passes.keys()]))].sort()
console.log('check                         zdaja  wymieniani   oblewaja  wymieniani   roznica   przypadek')
for (const check of CHECKS) {
  const passing = rows.filter((row) => row.passes.get(check) === true)
  const failing = rows.filter((row) => row.passes.get(check) === false)
  if (passing.length < 5 || failing.length < 5) continue
  const gap = rate(passing) - rate(failing)
  const chance = byChance(rows.filter((row) => row.passes.has(check)), (row) => row.passes.get(check) === true, gap)
  // A side with under ten rows can produce a large gap and a small chance at the same time and
  // still be about five vendors. `answers_plain_request` reads -54pp on five failing rows, all of
  // them big enough to run bot defence, which is fame arriving through the back door.
  const thin = Math.min(passing.length, failing.length) < 10 ? '  <- garstka wierszy' : ''
  console.log(
    `${check.padEnd(28)} ${String(passing.length).padStart(5)} ${(rate(passing) * 100).toFixed(0).padStart(10)}% ${String(failing.length).padStart(10)} ${(rate(failing) * 100).toFixed(0).padStart(10)}% ${(gap * 100).toFixed(0).padStart(9)}pp ${chance.toFixed(3).padStart(11)}${thin}`,
  )
}

// The score as a whole, split at its own median so the two groups are the halves of this corpus
// rather than a threshold invented for the occasion.
const scores = rows.map((row) => row.score / row.max).sort((a, b) => a - b)
const median = scores[Math.floor(scores.length / 2)]
const above = rows.filter((row) => row.score / row.max > median)
const below = rows.filter((row) => row.score / row.max <= median)
const gap = rate(above) - rate(below)
console.log(
  `\nwynik powyzej mediany (${(median * 100).toFixed(0)}%): ${(rate(above) * 100).toFixed(0)}% wymienialnosci na ${above.length} dostawcach`,
)
console.log(`wynik ponizej lub rowny:          ${(rate(below) * 100).toFixed(0)}% na ${below.length} dostawcach`)
console.log(`roznica ${(gap * 100).toFixed(0)}pp, przypadek daje taka lub wieksza w ${byChance(rows, (row) => row.score / row.max > median, gap).toFixed(3)} przebiegow`)

// The confounder, handled rather than disclaimed. Split the corpus at the median of weekly npm
// downloads and ask each check again inside each half: among vendors of comparable standing, does
// passing it still go with being named? A gap that survives both halves is not fame wearing our
// check's name.
const known = rows.filter((row) => row.downloads !== null)
const cut = [...known].sort((a, b) => (a.downloads ?? 0) - (b.downloads ?? 0))[Math.floor(known.length / 2)]?.downloads ?? 0
const popular = known.filter((row) => (row.downloads ?? 0) > cut)
const quieter = known.filter((row) => (row.downloads ?? 0) <= cut)
console.log(`\npopularnosc jako konfundujaca: ${known.length} dostawcow ma pakiet npm, mediana ${cut.toLocaleString('pl')} pobran tygodniowo`)
console.log(`  sami popularni:   ${(rate(popular) * 100).toFixed(0)}% wymienialnosci na ${popular.length}`)
console.log(`  sami mniej znani: ${(rate(quieter) * 100).toFixed(0)}% na ${quieter.length}`)
console.log('\ncheck                        roznica u popularnych   roznica u mniej znanych')
for (const check of CHECKS) {
  const gapIn = (subset: Row[]) => {
    const passing = subset.filter((row) => row.passes.get(check) === true)
    const failing = subset.filter((row) => row.passes.get(check) === false)
    return passing.length < 4 || failing.length < 4 ? null : rate(passing) - rate(failing)
  }
  const inPopular = gapIn(popular)
  const inQuieter = gapIn(quieter)
  if (inPopular === null && inQuieter === null) continue
  const show = (value: number | null) => (value === null ? 'za malo wierszy' : `${(value * 100).toFixed(0)}pp`)
  console.log(`${check.padEnd(28)} ${show(inPopular).padStart(14)} ${show(inQuieter).padStart(25)}`)
}

console.log('\nCzego to NIE mowi: nic o przyczynie (znany dostawca i publikuje, i jest wymieniany),')
console.log('nic o pojedynczym dostawcy (piec biegow oddziela sciane od ciszy, nie wiecej),')
console.log('i nic czystego, bo biegi czytaly konfiguracje maszyny wypisana wyzej.')
process.exit(0)
