import { CURATED_DOMAINS } from '../src/lib/categories'
import { buildFixPlan } from '../src/lib/fixfirst'
import { getStore } from '../src/lib/store'

/**
 * Which repair advice we actually hand out, and to whom.
 *
 * Every remedy that branches was written from one vendor and never checked against the others, so
 * the failure mode is not a crash: it is a sentence that reads fine and contradicts the verdict
 * three lines above it. Both bugs found this way were that shape, and both were reported by
 * readers rather than by us: we told a vendor whose llms.txt we had just quoted to publish an
 * llms.txt, and told vendors whose robots.txt was already correct to fix their robots.txt.
 *
 * Grouping by the sentence rather than by the check is what makes an unexercised branch visible.
 * A branch nobody takes has never been read by anyone, which is a different risk from a branch
 * that is wrong.
 *
 *   MONGODB_URI=$(heroku config:get MONGODB_URI -a stackpick) npx tsx scripts/audit-remedies.mts
 */
const store = getStore()

/** Interpolated counts, domains and URLs differ per vendor; the branch is the shape underneath. */
const shapeOf = (sentence: string) =>
  sentence
    .replace(/https?:\/\/\S+/g, '<url>')
    .replace(/\b\d[\d,.]*\b/g, '<n>')
    .replace(/\s+/g, ' ')
    .trim()

type Seen = { effort: string; domains: string[]; points: Set<number>; namesAUrl: Set<boolean> }
const branches = new Map<string, Map<string, Seen>>()

let read = 0
for (const domain of CURATED_DOMAINS) {
  const report = await store.latestForDomain(domain)
  if (!report) continue
  read += 1
  const plan = buildFixPlan(report.findings, report.scorecard)
  for (const step of plan?.steps ?? []) {
    const perCheck = branches.get(step.checkId) ?? new Map<string, Seen>()
    const shape = shapeOf(step.how)
    const seen = perCheck.get(shape) ?? { effort: step.effort, domains: [], points: new Set<number>(), namesAUrl: new Set<boolean>() }
    seen.domains.push(domain)
    // What the verdict beside this sentence actually said. Four contradictions in one day were
    // all the same shape: one sentence serving a row that scored and a row that scored nothing,
    // so the advice told somebody to add the thing we had just found on their page.
    const verdict = report.scorecard.checks.find((c) => c.id === step.checkId)
    if (verdict) {
      seen.points.add(verdict.points)
      seen.namesAUrl.add(/https?:\/\//.test(verdict.detail))
    }
    perCheck.set(shape, seen)
    branches.set(step.checkId, perCheck)
  }
}

console.log(`${read} raportow przeczytanych\n`)
const order = [...branches.entries()].sort((a, b) => b[1].size - a[1].size)
let suspect = 0
let strong = 0
let weak = 0
for (const [checkId, shapes] of order) {
  console.log(`\n=== ${checkId} (${shapes.size} ${shapes.size === 1 ? 'galaz' : 'galezie'})`)
  for (const [shape, seen] of [...shapes.entries()].sort((a, b) => b[1].domains.length - a[1].domains.length)) {
    const { effort, domains } = seen
    console.log(`\n  [${effort}] ${domains.length} vendorow: ${domains.slice(0, 6).join(', ')}${domains.length > 6 ? ' ...' : ''}`)
    console.log(`  ${shape}`)
    if (seen.points.size > 1) {
      suspect += 1
      strong += 1
      // The strong signal. It is what four of today's contradictions had in common: a row that
      // scored and a row that scored nothing hearing the same instruction.
      console.log(`  ^^ MOCNY SYGNAL: jedno zdanie dla wierszy o roznej liczbie punktow (${[...seen.points].sort().join(', ')})`)
    }
    if (seen.namesAUrl.size > 1) {
      suspect += 1
      weak += 1
      // The weak one. Its first hit was benign: filestack.com names two URLs because we measured
      // a different page than usual, and the advice is true for all three rows either way. Kept as
      // a prompt to read, not as a finding.
      console.log('  ^^ slaby sygnal: czesc wierszy nazywa przeczytana strone, a czesc nie')
    }
  }
}
console.log(`\n${suspect} zdan obsluguje wiersze o roznych werdyktach; kazde przeczytaj obok jego wierszy.`)
// Co znalazl TEN przebieg, a osobno co znalazly poprzednie. Ta linijka mowila „mocny sygnal znalazl
// DZIS 2 prawdziwe sprzecznosci" niezaleznie od wyniku, wiec czytajacy (2026-08-19: ja) bral historie
// za dzisiejsze znalezisko i szukal dwoch sprzecznosci, ktorych ten przebieg nie zglosil.
console.log(`Ten przebieg: ${strong} mocnych sygnalow, ${weak} slabych.`)
console.log('Historycznie: mocny sygnal dal 2 prawdziwe sprzecznosci, slaby jak dotad tylko nieszkodliwe roznice.')
process.exit(0)
