/**
 * Kogo naprawde dosieglo oskarzenie, ktore wycofalismy brama publikacyjna.
 *
 *   MONGODB_URI=... npx tsx scripts/audit-withdrawal-reach.mts
 *
 * Audyt decyzji (subagent, 2026-08-20) postawil sprawe tak: bez tej liczby decyzja o powiadamianiu
 * vendorow jest zgadywaniem. „294 strony" to gorna granica ekspozycji, nie jej miara - strona,
 * ktorej nikt nie otworzyl i ktorej adresu nikomu nie wyslalismy, jest czym innym niz raport
 * wyslany mailem wlascicielowi domeny.
 *
 * Liczymy dwie rzeczy, bo to dwa rozne pytania:
 *  - ZASIEG: czy ktos to widzial (odwiedziny) albo czy sami to komus podalismy (lead, watch, delivery);
 *  - WAGA: czy wycofanie zmienia to, co strona MOWI o vendorze - czy `oauth_dcr` byl jedynym
 *    oskarzeniem, i o ile przesuwa sie wynik.
 */
import { MongoClient } from 'mongodb'
import { asPublishedToday } from '../src/lib/publishable'
import { pathOf } from '../src/lib/visits'

const client = await MongoClient.connect(process.env.MONGODB_URI!)
const db = client.db(process.env.MONGODB_DB || 'stackpick')

// KONTROLKA. Zero odwiedzin znaczy „nikt nie wszedl" tylko wtedy, gdy w ogole liczymy wejscia na te
// strony. Pierwszy przebieg tego audytu zameldowal „ekspozycja jest teoretyczna", a naprawde mierzyl
// BRAK INSTRUMENTACJI: `/r/` i `/v/` jako jedyne nie wolaly `recordVisit`. Milczaca kontrolka niczego
// nie przyznaje - to ta sama zasada, ktora stosujemy do vendorow, wiec stosujemy ja i do siebie.
// Klucze zgodne z tym, co licznik NAPRAWDE zapisuje: `/r/<domena> <rodzaj klienta>`, a nie
// `/r/<id>`. Pierwsza wersja tego audytu pytala o identyfikator raportu i dostawalaby zero na
// zawsze, jednoczesnie zapalajac flage „mierzymy" po pierwszej wizycie - czyli dokladnie ten sam
// klamiacy czujnik, ktory tu tropimy (codex).
//
// Licznik jest per DOMENA, wiec dwa raporty tej samej firmy dziela wynik. Dla pytania „czy
// ktokolwiek czytal, co o nich napisalismy" to wystarcza; dla „ktory konkretnie raport" nie, i tego
// swiadomie nie udajemy.
const visitsByDomain = new Map<string, number>()
let measuresReports = false
for await (const v of db.collection('visits').find({}, { projection: { path: 1, count: 1 } })) {
  const path = pathOf(String((v as { path?: string }).path ?? ''))
  if (!path.startsWith('/r/')) continue
  measuresReports = true
  const domain = path.slice('/r/'.length)
  visitsByDomain.set(domain, (visitsByDomain.get(domain) ?? 0) + Number((v as { count?: number }).count ?? 0))
}
// `deliveries` swiadomie NIE bierze udzialu: jego `id` to publiczny identyfikator dostawy
// (`XKCn43afq7HL`, `sample`, `qa-jezyk`), a nie `_id` raportu, wiec dopasowanie nie moglo nigdy
// trafic i cicho zanizalo wynik (codex). Sprawdzone: wszystkie piac rekordow to nasze wlasne
// probki, nie dostawy do klienta.
//
// `leads` i `watches` wskazuja prawdziwe raporty, i to jest jedyne PEWNE zrodlo w tym audycie:
// tu my sami podalismy komus adres.
const handedOut = new Set<string>()
for (const [name, field] of [['leads', 'reportId'], ['watches', 'lastReportId']] as const) {
  for await (const row of db.collection(name).find({}, { projection: { [field]: 1 } })) {
    const id = (row as Record<string, unknown>)[field]
    if (typeof id === 'string' && id) handedOut.add(id)
  }
}

let affected = 0, given = 0, onlyAccusation = 0
// Ruch liczymy per DOMENA, nie per raport: klucz licznika jest domenowy, wiec firma z kilkoma
// dotknietymi raportami dodawalaby te same odslony tyle razy, ile ma wierszy (codex).
const affectedDomains = new Set<string>()
const worth: string[] = []
for await (const row of db.collection('reports').find({}, { projection: { scorecard: 1, 'findings.funnel.oauth': 1, domain: 1, scannedAt: 1 } })) {
  const before = (row as never as { scorecard: { checks: { id: string; points: number; max: number; inconclusive?: boolean; notApplicable?: boolean }[] } }).scorecard
  const { degraded } = asPublishedToday(row as never)
  if (degraded.length === 0) continue
  affected += 1
  const id = String((row as { _id: unknown })._id)
  const domain = String((row as unknown as { domain: string }).domain)
  affectedDomains.add(domain)
  const views = visitsByDomain.get(domain) ?? 0
  const wasGiven = handedOut.has(id)
  if (wasGiven) given += 1
  // Jedyne oskarzenie na karcie: wtedy wycofanie zmienia wymowe strony, a nie jedna linijke z wielu.
  const accusations = before.checks.filter((c) => c.points < c.max && !c.inconclusive && !c.notApplicable)
  if (accusations.length === 1 && accusations[0].id === 'oauth_dcr') onlyAccusation += 1
  if (views > 0 || wasGiven)
    worth.push(`  ${String((row as unknown as { domain: string }).domain).padEnd(24)} ${String((row as unknown as { scannedAt: string }).scannedAt).slice(0, 10)}  odwiedzin ${String(views).padStart(3)}${wasGiven ? '  PODANY KOMUS' : ''}`)
}

console.log(`raportow dotknietych wycofaniem: ${affected}`)
console.log(`  PEWNE: podanych komus przez nas: ${given} (lead albo obserwacja, czyli adres wyslany z naszej strony)`)
console.log(`  gdzie byl to JEDYNE oskarzenie na karcie: ${onlyAccusation}`)
const touched = [...affectedDomains].filter((d) => (visitsByDomain.get(d) ?? 0) > 0)
const views = touched.reduce((total, d) => total + (visitsByDomain.get(d) ?? 0), 0)
console.log(
  measuresReports
    ? `  ruch na tych stronach OD WDROZENIA licznika: ${touched.length} z ${affectedDomains.size} domen, ${views} odslon`
    : `  ruch na tych stronach: NIEZMIERZONY - licznik /r/ nie zapisal jeszcze ani jednego wiersza` +
      `\n    (albo nie zostal wdrozony, albo nie dziala; ${affectedDomains.size} dotknietych domen czeka na pomiar)`,
)
// Najwazniejsze zdanie tego audytu, i jedyne uczciwe: HISTORYCZNEGO zasiegu nie da sie z naszych
// danych odtworzyc. Licznik `/r/` powstal 20 sierpnia, czyli PO tym, jak brama wycofala oskarzenie,
// wiec kazda odslona, ktora on zapisze, dotyczy strony JUZ POPRAWIONEJ i nie jest ekspozycja na
// zarzut (codex). Zliczanie jej razem z przeszloscia dawaloby liczbe, ktora rosnie wtedy, gdy
// problemu juz nie ma.
console.log(
  '\nCZEGO TEN AUDYT NIE WIE I WIEDZIEC NIE MOZE: ile razy ktokolwiek otworzyl te strony ZANIM' +
    '\noskarzenie zostalo wycofane. Licznik /r/ zaczal zbierac 20 sierpnia, juz po korekcie, wiec' +
    '\nmierzy ruch na stronach POPRAWIONYCH. Historyczny zasieg dalyby wylacznie logi Heroku za' +
    '\nodpowiedni okres, o ile siegaja tak daleko. „0" powyzej nie znaczy „nikt nie wszedl".',
)
console.log(
  worth.length === 0
    ? '\nCO JEST PEWNE: zadnego z tych raportow nie podalismy nikomu sami. Nikt nie dostal od nas' +
      '\nadresu do strony, ktora oskarzala bez dowodu - to nie to samo co „nikt jej nie widzial",' +
      '\nale to jedyna czesc, ktora umiemy rozstrzygnac danymi.'
    : `\n${worth.length} raportow, ktore podalismy komus albo ktore maja ruch - do decyzji o powiadomieniu:`,
)
for (const line of worth.slice(0, 40)) console.log(line)
if (worth.length > 40) console.log(`  ... i ${worth.length - 40} wiecej`)
await client.close()
process.exit(0)
