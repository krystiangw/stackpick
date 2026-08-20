/**
 * Predykcja dla przemiatu na 9.55, zapisana ZANIM ruszyl.
 *
 *   MONGODB_URI=... npm run po-przemiacie-9-55
 *
 * 9.53 i 9.55 dodaja adres do zdania, wiec zmieniaja TEKST, nie regule. Predykcja, ktora da sie
 * obalic, brzmi:
 *
 *   WERDYKTY RUSZAJA SIE WYLACZNIE NA `agent_entry_point`, i tylko tam, gdzie nasza proba zostala
 *   bez odpowiedzi. Kazdy ruch na pozostalych pieciu checkach obala predykcje albo jest zmiana po
 *   stronie dostawcy, ktora trzeba przeskanowac pojedynczo, zanim ktokolwiek nazwie ja jednym lub
 *   drugim.
 *
 * Porownanie idzie do `src/data/przed-9-55.json` - migawki PELNYCH werdyktow sprzed przemiatu
 * (punkty plus „niemierzalne" i „nie dotyczy"). Skrypt odmawia wniosku, dopoki nie przeczyta polowy
 * wierszy, bo zdanie „predykcja sie potwierdzila" z czesci korpusu nie jest wynikiem.
 */
import { getStore } from '../src/lib/store'
import snapshot from '../src/data/przed-9-55.json'
import { refuseIfNothingMeasured } from './nothing-measured'

const PRZEMIAT = '9.55'
const AGENT = 'agent_entry_point'
const POZOSTALE = ['signup_no_captcha', 'user_agents_allowed', 'no_crawl_delay', 'typed_package', 'oauth_dcr'] as const
const CHECKI = [AGENT, ...POZOSTALE] as const

// Pelny werdykt, nie same punkty. To musi zostac identyczne z funkcja, ktora zapisala migawke:
// ruch flagi bez ruchu punktow nadal jest ruchem i nie wolno go zgubic w uspokajajacym podsumowaniu.
const verdictOf = (c: { points: number; max: number; inconclusive?: boolean; notApplicable?: boolean } | undefined) =>
  c === undefined ? null : `${c.points}/${c.max}${c.inconclusive ? ' niemierzalne' : ''}${c.notApplicable ? ' nie-dotyczy' : ''}`

/**
 * Jedyny ruch, na ktory predykcja pozwala: wiersz, ktoremu 9.52 policzyla ZERO za cisze naszej
 * sondy, dostaje od 9.54 „niemierzalne" przy tych samych punktach. Nic wiecej.
 *
 * Migawka nie zapisuje, czy sonda dostala odpowiedz - ale zapisuje SKUTEK tamtej reguly, bo bez
 * odpowiedzi 9.52 nie umiala zrobic nic innego niz zero bez flagi. Ruch z 1/2 albo 2/2 nie jest
 * wiec „spodziewany" i idzie do niespodzianek, gdzie ktos go przeskanuje pojedynczo (codex).
 */
const spodziewanyRuchAgenta = (bylo: string, jest: string | null) =>
  bylo.startsWith('0/') && !bylo.includes('niemierzalne') && jest === `${bylo} niemierzalne`

type SnapshotRow = {
  domain: string
  formulaVersion: string
  scannedAt: string
  checks: Record<(typeof CHECKI)[number], string | null>
}

const store = getStore()
const rows = await store.latestPerDomain(500, true)
const teraz = new Map(rows.map((r) => [r.domain, r]))

let przeczytane = 0
let nieprzemieciete = 0
let pusteWerdykty = 0
const wierszeZPustym = new Set<string>()
const oczekiwane: string[] = []
const niespodzianki: string[] = []

for (const before of snapshot as SnapshotRow[]) {
  const now = teraz.get(before.domain)
  if (!now || now.scorecard.formulaVersion !== PRZEMIAT) {
    nieprzemieciete += 1
    continue
  }
  przeczytane += 1
  for (const id of CHECKI) {
    const bylo = before.checks[id]
    if (bylo === null) {
      pusteWerdykty += 1
      wierszeZPustym.add(before.domain)
      continue
    }
    const jest = verdictOf(now.scorecard.checks.find((c) => c.id === id) as never)
    if (jest === bylo) continue
    const opis = `${before.domain.padEnd(22)} ${id} ${bylo} -> ${jest}`
    if (id === AGENT && spodziewanyRuchAgenta(bylo, jest)) oczekiwane.push(opis)
    else niespodzianki.push(opis)
  }
}

console.log(`migawka ma ${snapshot.length} wierszy, przeczytane na ${PRZEMIAT}: ${przeczytane}, jeszcze nieprzemieciete: ${nieprzemieciete}\n`)
// Przed jakimkolwiek zdaniem o ruchach: „bez ruchu" wydrukowane po przeczytaniu zera wierszy czyta
// sie jak wynik, a jest opisem tego, ze nic nie sprawdzilismy.
refuseIfNothingMeasured(przeczytane, `wierszy na ${PRZEMIAT}`)
if (przeczytane * 2 < snapshot.length) {
  // Wyjscie NIEZEROWE: czesciowego odczytu nie wolno przeczytac jako potwierdzenia predykcji.
  console.error(`\nprzeczytane ${przeczytane} z ${snapshot.length} - ZA MALO, zeby cokolwiek orzec. Uruchom ponownie po przemiecie.`)
  process.exit(1)
}

if (oczekiwane.length === 0) {
  console.log('agent_entry_point: zaden werdykt nie ruszyl sie')
} else {
  console.log(`agent_entry_point - SPODZIEWANE RUCHY (${oczekiwane.length}):`)
  for (const one of oczekiwane) console.log(`  ${one}`)
}
if (niespodzianki.length === 0) {
  console.log('\nZADEN INNY RUCH: pozostale piec checkow stoi, a agent_entry_point nie ruszyl sie inaczej niz w zero-na-niemierzalne')
} else {
  // Nazwa grupy mowi „inne ruchy", a nie „pozostale piec checkow": ruch na agent_entry_point z 1/2
  // albo 2/2 tez tu trafia i nazwanie go ruchem na innym checku myli tego, kto to czyta (codex).
  console.log(`\n!!! INNE RUCHY (${niespodzianki.length}) - KAZDY OBALA PREDYKCJE ALBO WYMAGA POJEDYNCZEGO RESKANU:`)
  for (const one of niespodzianki) console.log(`  !!! ${one}`)
}
console.log(
  `\nBRAK CHECKA W MIGAWCE: ${wierszeZPustym.size} wierszy, ${pusteWerdykty} pustych werdyktow; policzone, nigdy nie jako ruch.`,
)

// Zdanie o predykcji NOSI SWOJ ZASIEG. Przy 9.49 jeden wiersz zostal na starszej formule i tak
// bywa za kazdym razem, wiec bramka „wszystkie 177 albo nic" byla by na stale czerwona i nikt by jej
// nie czytal. Zamiast tego potwierdzenie mowi, ilu wierszy NIE obejmuje (codex chcial pelnego
// pokrycia; to jest ta sama ostroznosc, tylko wykonalna).
const zasieg = przeczytane === snapshot.length ? 'na calej migawce' : `na ${przeczytane} z ${snapshot.length} wierszy, pozostalych ${snapshot.length - przeczytane} to zdanie NIE obejmuje`
console.log(
  niespodzianki.length === 0
    ? `\nCzytasz POTWIERDZENIE predykcji ${zasieg}: jedyne ruchy to agent_entry_point z zera na niemierzalne.`
    : `\nCzytasz OBALENIE predykcji (${zasieg}): kazdy ruch z listy powyzej trzeba teraz przeskanowac pojedynczo, ZANIM nazwiesz go regresem vendora.`,
)
await new Promise<void>((done) => process.stdout.write('', () => done()))
process.exit(niespodzianki.length > 0 ? 1 : 0)
