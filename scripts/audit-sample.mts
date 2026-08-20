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
import { ourWordsIn, scaleGuessIn } from '../src/lib/claims'
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

// Wersja formuly nie widzi zmiany SLOW. 2026-08-20 probka stala na biezacej formule i nadal niosla
// zdanie „at almost every authorization server today", ktore tego samego wieczoru wycofalismy z
// kodu: poprawka w `fixfirst.ts` nie dotyka dokumentu zapisanego wczoraj. Ten sam wzorzec, ktorego
// `rules.mts` pilnuje w zrodlach, czyta wiec teraz takze TRESC witryny sklepu.
const guess = scaleGuessIn(ourWordsIn(sample.markdown))
if (guess !== '') {
  console.log(`\nPROBKA NIESIE SZACUNEK BEZ POMIARU: „${guess}"`)
  console.log('To zdanie wycofalismy z kodu, a dokument zostal. Wygeneruj probke ponownie:')
  console.log('  MONGODB_URI=... npx tsx scripts/client-report.mts <domena> --publish --id sample --sample')
  await new Promise<void>((done) => process.stdout.write('', () => done()))
  process.exit(1)
}
// Kontrolka w obie strony: sonda ma widziec zdanie, ktore ja stworzylo, i ma przepuscic to samo
// zdanie w cudzyslowie, bo cytat z przebiegu jest czyimis slowami, nie naszym oszacowaniem.
const NASZE = 'registers itself without a human at almost every authorization server today'
if (scaleGuessIn(ourWordsIn(NASZE)) === '') {
  console.log('KONTROLKA OBLANA: sonda nie widzi zdania, ktore ja stworzylo, wiec jej cisza nic nie znaczy')
  process.exit(1)
}
const CYTATY = [
  `- **claude run 3**: \u201c${NASZE}\u201d`,
  // Cytat z cudzyslowem w srodku: pierwsza wersja urywala sie na nim i czytala ogon jako nasz.
  `- **codex run 1** (in Polish): \u201cAcme calls this \u201cautomatic\u201d, and most vendors do the same\u201d`,
]
for (const cytat of CYTATY) {
  if (scaleGuessIn(ourWordsIn(cytat)) !== '') {
    console.log(`KONTROLKA OBLANA: sonda czyta cytat z przebiegu jak nasze zdanie: ${cytat.slice(0, 60)}`)
    process.exit(1)
  }
}

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
