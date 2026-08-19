/**
 * The sample report is the shop window, and it goes stale in silence.
 *
 *   MONGODB_URI=... npx tsx scripts/audit-sample.mts
 *
 * `/d/sample` is a stored document: it keeps the wording of the formula it was produced under while
 * the scanner moves on. On 2026-08-19 it stood on 9.44 against a live 9.49 and published exactly the
 * accusation 9.48 had removed - "Only 53 characters render without JS" about a page that renders
 * 12,282 to a complete read. Nothing failed, because nothing was looking.
 *
 * The formula version alone is the whole check. Which sentences can be wrong is the useful half, and
 * that is what `rulesChangedBetween` already knows: every rule we changed since the sample was
 * produced is a paragraph in it that we would not write today.
 */
import { getStore } from '../src/lib/store'
import { FORMULA_VERSION } from '../src/lib/score'
import { rulesChangedBetween } from '../src/lib/watch'
import { CHECKS } from '../src/lib/score'

const store = getStore()
const sample = await store.getDelivery('sample')
if (!sample) {
  // Nie „nie ma czego sprawdzac", tylko najciezsza awaria: `/pricing` linkuje probke jako jedyny
  // sposob zobaczenia platnego raportu przed zaplaceniem. Cisza tutaj czytalaby sie jak zdrowie.
  console.log('BRAK PROBKI pod /d/sample, a /pricing do niej linkuje - albo dokument zniknal, albo patrzymy w zly magazyn')
  process.exit(1)
}

console.log(`probka: ${sample.domain}, formula ${sample.formulaVersion}, przygotowana ${sample.preparedAt.slice(0, 10)}`)
if (sample.formulaVersion === FORMULA_VERSION) {
  console.log(`skaner tez stoi na ${FORMULA_VERSION} - kupujacy czyta to, co dzis mierzymy`)
  process.exit(0)
}

const moved = [...rulesChangedBetween(sample.formulaVersion, FORMULA_VERSION)]
const labels = new Map(CHECKS.map((check) => [check.id, check.label]))
console.log(`\nSKANER JEST NA ${FORMULA_VERSION}, PROBKA NA ${sample.formulaVersion}`)
if (moved.length === 0) {
  console.log('zadna regula nie zmienila sie w tym oknie, wiec zdania w probce nadal sa nasze - ale numer formuly w naglowku juz nie')
} else {
  console.log(`${moved.length} regul zmienilo sie od tamtej chwili, czyli tyle akapitow moze mowic co innego, niz powiedzielibysmy dzis:`)
  for (const id of moved.sort()) console.log(`  ${id}${labels.has(id) ? ` (${labels.get(id)})` : ''}`)
}
console.log('\nOdswiez: przeskanuj domene probki i wygeneruj raport ponownie (scripts/client-report.mts), potem sprawdz naglowek na /d/sample.')
await new Promise<void>((done) => process.stdout.write('', () => done()))
process.exit(1)
