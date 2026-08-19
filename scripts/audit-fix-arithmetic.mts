/**
 * The one sum a buyer will do themselves.
 *
 *   MONGODB_URI=... npx tsx scripts/audit-fix-arithmetic.mts [ile]
 *
 * Every paid report opens its repair section with "Fix the N cheapest items below and X/M becomes
 * Y/M", and then lists those items with a point value each. A reader adds them up, and if the
 * arithmetic does not close, the whole document reads as guesswork - it is the one sentence in it
 * that anybody checks without leaving the page.
 *
 * Replays the promise against the plan for every published row: Y - X must equal the points of the
 * steps the sentence counted, the promise must not exceed what is measurable, and the steps it
 * counts must be the ones printed underneath.
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'
import { buildFixPlan } from '../src/lib/fixfirst'
import { howManyRows, reportCap } from './how-many'
import { refuseIfNothingMeasured } from './nothing-measured'

const store = getStore()
const most = howManyRows(CURATED_DOMAINS.size)
let checked = 0
let visited = 0
const wrong: string[] = []

for (const domain of CURATED_DOMAINS) {
  if (checked >= most) break
  visited += 1
  const report = await store.latestForDomain(domain, true)
  if (!report) continue
  const plan = buildFixPlan(report.findings, report.scorecard)
  if (!plan || plan.steps.length === 0) continue
  checked += 1

  const numbers = [...plan.claim.matchAll(/(\d+)\/(\d+)/g)].map((one) => [Number(one[1]), Number(one[2])] as const)
  if (numbers.length < 2) {
    wrong.push(`${domain}\tzdanie nie niesie dwoch liczb: ${plan.claim.slice(0, 90)}`)
    continue
  }
  const [[from, outOf], [to, outOfAgain]] = numbers
  // The same subset the sentence counts: the cheapest three that are not a project, or the single
  // best step when every remedy is one. Reading it off the plan rather than recomputing it would
  // make this audit agree with the code by construction; reading it off the SENTENCE is what makes
  // it a second opinion. So the count comes from the words and the points from the steps.
  const quickWins = plan.steps.filter((step) => step.effort !== 'a project').slice(0, 3)
  const counted = quickWins.length > 0 ? quickWins : plan.steps.slice(0, 1)
  const promised = to - from
  const summed = counted.reduce((sum, step) => sum + step.gain, 0)

  if (from !== report.scorecard.total) wrong.push(`${domain}\tzaczyna od ${from}, a wiersz ma ${report.scorecard.total}`)
  if (outOf !== outOfAgain) wrong.push(`${domain}\tdwa rozne mianowniki: ${outOf} i ${outOfAgain}`)
  if (to > outOf) wrong.push(`${domain}\tobiecuje ${to} z mierzalnych ${outOf}`)
  // The sentence says "the N cheapest items below", so the sum it promises has to be the sum of
  // the items it counted - not of every step in the plan, and not of a subset chosen elsewhere.
  const named = plan.claim.match(/Fix the (\d+) cheapest/)
  if (named && Number(named[1]) !== counted.length) {
    wrong.push(`${domain}\tzapowiada ${named[1]} pozycji, a liczy ${counted.length}`)
  }
  if (promised !== summed) wrong.push(`${domain}\tobiecuje +${promised}, a pozycje daja +${summed}`)
}

reportCap(visited, CURATED_DOMAINS.size, checked)
refuseIfNothingMeasured(checked, 'wierszy z planem naprawy')

console.log(`\n${checked} wierszy z planem naprawy, ${wrong.length} ze zdaniem, ktore sie nie zamyka`)
for (const one of wrong) console.log(`  ${one}`)
if (wrong.length === 0) console.log('kazde "X staje sie Y" zgadza sie z suma pozycji pod nim')
process.exit(wrong.length === 0 ? 0 : 1)
