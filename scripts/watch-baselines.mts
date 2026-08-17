/**
 * The formula each watch will be compared against, and whether that comparison is safe.
 *
 *   MONGODB_URI=... npx tsx scripts/watch-baselines.mts
 *
 * A baseline older than the current formula is rescored under today's rules, and the checks whose
 * rule moved in between are dropped from the email. That drop is the only thing standing between a
 * watcher and a message saying they lost ground because we changed our mind.
 */
import { getStore } from '../src/lib/store'
import { FORMULA_VERSION } from '../src/lib/score'
import { rulesChangedBetween } from '../src/lib/watch'

const store = getStore()
const due = await store.listWatchesDue(500)
console.log(`${due.length} watchy w kolejce`)
for (const watch of due) {
  const previous = watch.lastReportId ? await store.getReport(watch.lastReportId) : null
  const baseline = previous?.scorecard.formulaVersion ?? null
  const moved = baseline ? [...rulesChangedBetween(baseline, FORMULA_VERSION)] : []
  console.log(
    `${watch.domain} <- ${watch.email}: baza ${baseline ?? 'brak (pierwszy pomiar, nic nie wysylamy)'}` +
      (baseline && baseline !== FORMULA_VERSION ? `, pomijane checki: ${moved.length > 0 ? moved.join(',') : 'ZADNE'}` : ''),
  )
}
process.exit(0)
