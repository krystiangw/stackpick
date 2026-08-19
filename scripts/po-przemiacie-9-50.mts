/**
 * Predykcja dla przemiatu na 9.50, zapisana ZANIM ruszyl.
 *
 *   MONGODB_URI=... npm run po-przemiacie-9-50
 *
 * 9.50 zmienia SELEKCJE, nie regule: zgadnieta sciezka ucieta naszym sufitem 400 kB przestaje byc
 * skreslana jako skorupa SPA. Zmierzony warunek wyzwalajacy to **16 sciezek na 9 domenach**
 * (`npm run audit-cap-selection`, 2026-08-20). Wiec predykcja, ktora da sie obalic, brzmi:
 *
 *   RUSZAJA SIE WYLACZNIE TE DZIEWIEC DOMEN. Kazda inna zmiana na czterech checkach czytajacych
 *   wybrana strone dokumentacji albo cennika jest dowodem, ze zasieg jest szerszy, niz zmierzylem.
 *
 * Porownanie idzie do `src/data/przed-9-50.json` - migawki PELNYCH werdyktow z 9.49 (punkty plus
 * „niemierzalne" i „nie dotyczy"), zrobionej przed przemiatem. Migawka pomija 20 wierszy, ktore juz
 * stoja na 9.50 - w tym `filestack.com`, `cal.com` i `posthog.com`, przeskanowane recznie przy
 * weryfikacji wdrozenia i sprawdzone co do wiersza tam. Skrypt odmawia wniosku, dopoki nie przeczyta polowy wierszy, bo zdanie „zasieg sie
 * potwierdzil" z jednej trzeciej korpusu bylo juz raz w tym repo bledem.
 */
import { getStore } from '../src/lib/store'
import snapshot from '../src/data/przed-9-50.json'
import { refuseIfNothingMeasured } from './nothing-measured'

// Przemiat pojdzie na 9.51, nie 9.50: doszla instrukcja przy przechodzacym `oauth_dcr`, ktora zmienia
// publikowany scorecard, wiec zgodnie z niezmiennikiem w `score.ts` wersja musi sie ruszyc. Porownanie
// jest nadal to samo - migawka 9.49 kontra to, co jest po przemiecie - bo czytamy punkty i flagi, a
// instrukcja ich nie rusza.
const PRZEMIAT = '9.51'
const MOVED = ['docs_without_js', 'programmatic_provisioning', 'machine_readable_api', 'price_in_snippet'] as const
/** Domeny, na ktorych sufit skreslal zgadnieta sciezke. Zmierzone, nie zgadniete. */
const SPODZIEWANE = new Set([
  'amplitude.com',
  'bigcommerce.com',
  'bunny.net',
  'cal.com',
  'filestack.com',
  'godaddy.com',
  'posthog.com',
  'tolgee.io',
  'vercel.com',
])

// Pelny werdykt, nie same punkty. Przejscie ze zmierzonego zera w „niemierzalne" nie rusza punktow,
// a jest dokladnie tym, co ta zmiana potrafi zrobic: czytamy inna strone, wiec check, ktory mial
// odpowiedz, moze jej nie miec i odwrotnie. Porownanie po punktach oglosiloby wtedy „zasieg
// potwierdzony", nie zobaczywszy ruchu. Codeksa.
const verdictOf = (c: { points: number; max: number; inconclusive?: boolean; notApplicable?: boolean } | undefined) =>
  c === undefined ? null : `${c.points}/${c.max}${c.inconclusive ? ' niemierzalne' : ''}${c.notApplicable ? ' nie-dotyczy' : ''}`

const store = getStore()
const rows = await store.latestPerDomain(500, true)
const teraz = new Map(rows.map((r) => [r.domain, r]))

let przeczytane = 0
let nieprzemieciete = 0
const ruszyly: string[] = []
const niespodzianki: string[] = []

for (const before of snapshot as { domain: string; checks: Record<string, string | null> }[]) {
  const now = teraz.get(before.domain)
  if (!now || now.scorecard.formulaVersion !== PRZEMIAT) {
    nieprzemieciete += 1
    continue
  }
  przeczytane += 1
  const zmiany = MOVED.filter((id) => verdictOf(now.scorecard.checks.find((c) => c.id === id) as never) !== before.checks[id])
  if (zmiany.length === 0) continue
  const opis = `${before.domain.padEnd(22)} ${zmiany
    .map((id) => `${id} ${before.checks[id]} -> ${verdictOf(now.scorecard.checks.find((c) => c.id === id) as never)}`)
    .join(', ')}`
  ruszyly.push(opis)
  if (!SPODZIEWANE.has(before.domain)) niespodzianki.push(opis)
}

console.log(`migawka ma ${snapshot.length} wierszy na 9.49, przeczytane na ${PRZEMIAT}: ${przeczytane}, jeszcze nieprzemieciete: ${nieprzemieciete}\n`)
if (ruszyly.length === 0) {
  console.log('zaden wiersz nie ruszyl sie na czterech checkach czytajacych wybrana strone')
} else {
  console.log(`RUSZYLY (${ruszyly.length}):`)
  for (const one of ruszyly) console.log(`  ${one}`)
}
if (niespodzianki.length > 0) {
  console.log(`\nPOZA ZMIERZONYM ZASIEGIEM (${niespodzianki.length}) - predykcja obalona, zasieg szerszy niz 9 domen:`)
  for (const one of niespodzianki) console.log(`  ${one}`)
}

refuseIfNothingMeasured(przeczytane, `wierszy na ${PRZEMIAT}`)
if (przeczytane * 2 < snapshot.length) {
  // Wyjscie NIEZEROWE, bo ten skrypt stoi na poczatku baterii spietej przez `&&`: przebieg bez
  // pokrycia ma zatrzymac reszte, a nie przepuscic ja z uspokajajaca linijka. Codeksa.
  console.error(`\nprzeczytane ${przeczytane} z ${snapshot.length} - ZA MALO, zeby cokolwiek orzec. Uruchom ponownie po przemiecie.`)
  process.exit(1)
}
console.log(
  niespodzianki.length === 0
    ? `\nZasieg potwierdzony: kazda zmiana siedzi w dziewieciu domenach, na ktorych zmierzylem skreslona sciezke.`
    : `\nZasieg SZERSZY niz zmierzony - przeczytaj powyzsze wiersze po kolei, zanim uznasz 9.50 za zamkniete.`,
)
await new Promise<void>((done) => process.stdout.write('', () => done()))
process.exit(0)
