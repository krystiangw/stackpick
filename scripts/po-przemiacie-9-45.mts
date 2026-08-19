/**
 * Cztery grupy z predykcji dla 9.45, kazda sprawdzana osobno.
 *
 *   MONGODB_URI=... npx tsx scripts/po-przemiacie-9-45.mts
 *
 * Predykcja jest w STATE.md i zostala zapisana PRZED przemiatem. Rozjazd w grupie „bez zmiany"
 * znaczy, ze regula robi cos, czego nie przewidzialem; rozjazd w grupie „traci punkt" znaczy, ze
 * stan stron zmienil sie miedzy pomiarem sprzed przemiatu a dzisiejszym.
 */
import { getStore } from '../src/lib/store'
import { refuseIfNothingMeasured } from './nothing-measured'

const store = getStore()
const GRUPY = {
  'traci punkt (1 -> 0)': ['cronofy.com', 'crowdin.com', 'datadoghq.com', 'nylas.com', 'onesignal.com', 'phrase.com', 'restate.dev', 'turbopuffer.com', 'windmill.dev', 'zenrows.com'],
  'zachowuje punkt (1)': ['growthbook.io', 'mixpanel.com', 'zilliz.com'],
  'bez zmiany (2)': ['cockroachlabs.com', 'elastic.co', 'fireworks.ai', 'getunleash.io', 'pinecone.io', 'split.io', 'temporal.io'],
  'nieznane': ['browserbase.com', 'browserless.io'],
} as const
const OCZEKIWANE: Record<string, number | null> = {
  'traci punkt (1 -> 0)': 0,
  'zachowuje punkt (1)': 1,
  'bez zmiany (2)': 2,
  nieznane: null,
}

let checked = 0
let sprawdzonePredykcje = 0
let naStarej = 0
const rozjazdy: string[] = []
for (const [grupa, domeny] of Object.entries(GRUPY)) {
  console.log(`\n=== ${grupa}`)
  for (const domain of domeny) {
    const report = await store.latestForDomain(domain, true)
    const check = report?.scorecard.checks.find((one) => one.id === 'programmatic_provisioning')
    if (!report || !check) {
      rozjazdy.push(`${domain}\tbrak wiersza albo checku`)
      continue
    }
    // Wiersz na starszej formule nie mowi nic o nowej regule, wiec nie jest ani zgodny, ani
    // rozjechany - jest niesprawdzony. Bez tego skrypt uruchomiony przed przemiatem wypisuje
    // dziesiec „rozjazdow", ktore sa tylko stanem sprzed zmiany.
    if (report.scorecard.formulaVersion !== '9.45') {
      naStarej += 1
      console.log(`  ${domain.padEnd(20)} ${report.scorecard.formulaVersion.padEnd(6)} jeszcze nie przemieciony`)
      continue
    }
    checked += 1
    const points = check.inconclusive ? 'niemierzalny' : String(check.points ?? 0)
    const want = OCZEKIWANE[grupa]
    // Wiersz bez przewidzianego wyniku nie potwierdza niczego, wiec nie liczy sie do progu, przy
    // ktorym wolno wydrukowac zdanie uspokajajace. Inaczej dwie „nieznane" domeny pomagalyby
    // uzasadnic twierdzenie, ze wszystko zgodzilo sie z predykcja. Codeksa.
    if (want !== null) sprawdzonePredykcje += 1
    const zgadza = want === null ? '?' : points === String(want) ? 'OK' : 'ROZJAZD'
    if (zgadza === 'ROZJAZD') rozjazdy.push(`${domain}\tprzewidziane ${want}, jest ${points}`)
    console.log(`  ${domain.padEnd(20)} ${report.scorecard.formulaVersion.padEnd(6)} ${points.padEnd(12)} ${zgadza}`)
  }
}

if (naStarej > 0) console.log(`\n${naStarej} wierszy jest jeszcze na starszej formule i nie mowi nic o regule 9.45`)
refuseIfNothingMeasured(checked, 'wierszy z predykcji na 9.45')

console.log(`\n${checked} wierszy sprawdzonych, ${rozjazdy.length} rozjazdow`)
for (const one of rozjazdy) console.log(`  ${one}`)
// Zdanie uspokajajace tylko wtedy, gdy przeczytana zostala wiekszosc predykcji. „Kazda grupa
// zachowala sie jak zapisano" wydrukowane po jednym wierszu z dwudziestu dwoch jest prawdziwe i
// bezuzyteczne - i to ten sam ksztalt, ktory tej nocy kazal audytom odmawiac werdyktu przy zerze.
const zPredykcja = Object.entries(GRUPY)
  .filter(([grupa]) => OCZEKIWANE[grupa] !== null)
  .reduce((sum, [, one]) => sum + one.length, 0)
if (rozjazdy.length > 0) {
  // nic: rozjazdy sa wypisane wyzej
} else if (sprawdzonePredykcje * 2 >= zPredykcja) {
  console.log(`${sprawdzonePredykcje} z ${zPredykcja} przewidzianych wierszy zachowalo sie tak, jak zapisano przed przemiatem`)
} else {
  console.log(`bez rozjazdow, ale sprawdzone jest dopiero ${sprawdzonePredykcje} z ${zPredykcja} przewidzianych wierszy - to jeszcze nie jest wynik`)
}
process.exit(0)
