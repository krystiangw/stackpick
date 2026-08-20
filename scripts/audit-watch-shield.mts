/**
 * Czy przemiat na nowa formule wysle obserwatorom maile o NASZEJ zmianie.
 *
 *   MONGODB_URI=... npx tsx scripts/audit-watch-shield.mts
 *
 * Obserwator placi za zdanie „u tego vendora cos sie zmienilo". Gdy podbijemy formule i przemiat
 * przepisze 177 wierszy naraz, kazdy z nich „sie zmienia" - i bez oslony kazdy obserwator dostaje
 * maila o czyms, co zrobilismy MY. `CHECK_RULE_CHANGED` ma to blokowac, ale dotad sprawdzalismy
 * tylko, czy funkcja zwraca wlasciwa liste; ten audyt przepuszcza PRAWDZIWE pary raportow przez te
 * sama sciezke decyzyjna, ktorej uzywa cron, i pyta, czy mail by wyszedl.
 */
import { changesBetween, comparableScorecards, rulesChangedBetween, turnedAwayAtTheEdge, worthTelling } from '../src/lib/watch'
import { MongoClient } from 'mongodb'
import type { Report } from '../src/lib/store'
import { FORMULA_VERSION, scoreFindings } from '../src/lib/score'
import { scanDomain } from '../src/lib/scan'

if (!process.env.MONGODB_URI) {
  console.log('MONGODB_URI nie jest ustawione. Uruchom:')
  console.log('  MONGODB_URI=$(heroku config:get MONGODB_URI -a stackpick) npx tsx scripts/audit-watch-shield.mts')
  process.exit(1)
}

const client = await MongoClient.connect(process.env.MONGODB_URI)
const db = client.db(process.env.MONGODB_DB || 'stackpick')
const reports = db.collection('reports')

// Pary: ten sam vendor, dwie rozne wersje formuly, kolejne pomiary. Dokladnie to, co zrobi przemiat.
// Najnowszy wiersz i najnowszy STARSZY o INNEJ formule. Pierwsza wersja brala po prostu dwa ostatnie
// raporty i trafiala na dwa przebiegi tego samego przemiatu, czyli te sama wersje - „zero maili"
// znaczylo wtedy „zero zmian", a nie „oslona dziala".
const byDomain = new Map<string, { after: Report; before?: Report }>()
for await (const row of reports.find({ seeded: true }, { projection: { domain: 1, scannedAt: 1, scorecard: 1, findings: 1 } }).sort({ scannedAt: -1 })) {
  const doc = row as never as Report
  const seen = byDomain.get(doc.domain)
  if (!seen) {
    byDomain.set(doc.domain, { after: doc })
    continue
  }
  if (!seen.before && doc.scorecard.formulaVersion !== seen.after.scorecard.formulaVersion) seen.before = doc
}

let pairs = 0, wouldMail = 0, shielded = 0, wouldMailUnshielded = 0, unscorable = 0
const offenders: string[] = []
for (const [domain, { after, before }] of byDomain) {
  if (!before || before.scorecard.formulaVersion === after.scorecard.formulaVersion) continue
  pairs += 1
  // Dokladnie to, co robi cron: gdy formuly sie roznia, stare FINDINGS ida przez dzisiejsze reguly,
  // a nie stary scorecard przez nowy. Pierwsza wersja tego audytu porownywala `true` z kartami i
  // dostawala puste listy, wiec „zero maili" bylo artefaktem, nie wynikiem.
  const rescored = () => {
    try {
      return scoreFindings(before.findings)
    } catch {
      return null
    }
  }
  const previousCard = comparableScorecards(before.scorecard, after.scorecard) ? before.scorecard : rescored()
  if (!previousCard) {
    unscorable += 1
    continue
  }
  const all = changesBetween(previousCard.checks, after.scorecard.checks)
  const ourDoing = rulesChangedBetween(before.scorecard.formulaVersion, after.scorecard.formulaVersion)
  const changes = all.filter((change) => !ourDoing.has(change.checkId))
  if (all.length !== changes.length) shielded += 1
  // KONTROLKA: czy bez oslony mail BY wyszedl. Bez tego „zero maili" moze znaczyc po prostu, ze nic
  // sie nie zmienilo, i audyt przechodzi zielony nie sprawdzajac niczego.
  if (worthTelling(all, turnedAwayAtTheEdge(after.findings, domain))) wouldMailUnshielded += 1
  if (worthTelling(changes, turnedAwayAtTheEdge(after.findings, domain))) {
    wouldMail += 1
    if (offenders.length < 8)
      offenders.push(
        `  ${domain.padEnd(22)} ${before.scorecard.formulaVersion} -> ${after.scorecard.formulaVersion}  ${changes.map((c) => c.checkId).join(', ')}`,
      )
  }
}

// DRUGA CZESC, i ta wazniejsza: co zrobi NAJBLIZSZY przemiat. Powyzsze pary sa historyczne, a
// pytanie brzmi „czy podbicie do dzisiejszej formuly wysle maile". Przepuszczamy wiec kazdy biezacy
// wiersz przez dzisiejsze reguly - dokladnie to, co cron zrobi ze stara strona porownania - i
// pytamy, czy roznica przetrwa oslone.
let simulated = 0, simWouldMail = 0, simShielded = 0, simUnscorable = 0, noBaseline = 0
const simOffenders: string[] = []
// Od OBSERWACJI, nie od najnowszych zasianych wierszy. Cron porownuje `watch.lastReportId`, wiec to
// jest jedyna populacja, ktora dostanie maila - a najnowszy zasiany wiersz to co innego: reczny skan
// z konsoli moze juz stac na biezacej formule, podczas gdy baseline subskrybenta zostal na starej, i
// symulacja „po najnowszym wierszu" pomijala go w calosci (codex).
const watches = await db.collection('watches').find({ stoppedAt: null }, { projection: { domain: 1, lastReportId: 1 } }).toArray()
for (const watch of watches as never as { domain: string; lastReportId?: string }[]) {
  if (!watch.lastReportId) {
    // Bez baseline'u cron nie wysyla nic przy pierwszym sprawdzeniu, wiec to nie jest luka.
    noBaseline += 1
    continue
  }
  const baseline = (await reports.findOne({ _id: watch.lastReportId as never })) as never as Report | null
  if (!baseline) {
    noBaseline += 1
    continue
  }
  const stored = baseline.scorecard
  if (stored.formulaVersion === FORMULA_VERSION) continue
  let today: typeof stored | null = null
  try {
    today = scoreFindings(baseline.findings)
  } catch {
    // Fail closed: nieznany stan oslony przed przemiatem zmieniajacym formule jest powodem, zeby
    // nie przemiatac (codex).
    simUnscorable += 1
    continue
  }
  // Swieza strona porownania, bo cron zestawia przeliczony baseline z NOWYM SKANEM. Przeliczenie
  // starych findings zachowuje stary odczyt, wiec wersja, ktora zmienia to, CO skaner czyta (nowe
  // pole w 9.54), byla tu niewidoczna - bramka mowilaby „bezpiecznie", a przemiat wyslalby maile
  // (codex). Szesc obserwacji to szesc skanow, czyli mniej niz jeden procent tego, co robi przemiat.
  //
  // Skanujemy lokalnie i NIC nie zapisujemy: bramka nie ma prawa zmieniac korpusu, ktory bada.
  let fresh: typeof today = today
  let freshFindings = baseline.findings
  try {
    freshFindings = await scanDomain(watch.domain)
    fresh = scoreFindings(freshFindings)
  } catch {
    simUnscorable += 1
    continue
  }
  simulated += 1
  const all = changesBetween(today.checks, fresh.checks)
  const ourDoing = rulesChangedBetween(stored.formulaVersion, FORMULA_VERSION)
  const changes = all.filter((change) => !ourDoing.has(change.checkId))
  if (all.length !== changes.length) simShielded += 1
  // Ze SWIEZYCH findings, bo cron pyta o dzisiejszy skan: vendor, ktory wlasnie wlaczyl ochrone
  // przed botami, jest powodem maila, a baseline o tym jeszcze nie wie (codex).
  if (worthTelling(changes, turnedAwayAtTheEdge(freshFindings, watch.domain))) {
    simWouldMail += 1
    if (simOffenders.length < 10)
      simOffenders.push(`  ${watch.domain.padEnd(22)} ${stored.formulaVersion} -> ${FORMULA_VERSION}  ${changes.map((c) => `${c.checkId} ${c.from}->${c.to}`).join(', ')}`)
  }
}

console.log(`par z rozna formula: ${pairs}`)
console.log(`  w tym takich, gdzie oslona cos zdjela: ${shielded}`)
console.log(`  w tym takich, gdzie BEZ oslony mail by wyszedl: ${wouldMailUnshielded}`)
if (unscorable > 0) console.log(`  ${unscorable} par nie dalo sie przeliczyc dzisiejszymi regulami (za stary zapis)`)
if (wouldMailUnshielded === 0) {
  console.log(
    '\nKONTROLKA PUSTA: w zadnej parze zmiana nie byla na tyle duza, zeby mail w ogole wyszedl,\n' +
      'wiec ten przebieg NIE DOWODZI, ze oslona dziala - dowodzi tylko, ze nie bylo czego oslaniac.',
  )
}
console.log(
  wouldMail === 0
    ? wouldMailUnshielded > 0
      ? 'ZADEN obserwator nie dostalby maila o zmianie, ktora jest nasza - i oslona naprawde go zatrzymala'
      : 'zero maili, ale patrz wyzej: to nie jest dowod'
    : `UWAGA: ${wouldMail} par wyslaloby maila mimo zmiany formuly - sprawdz, czy ta zmiana NAPRAWDE jest o vendorze:`,
)
for (const line of offenders) console.log(line)
console.log(`\n=== SYMULACJA NAJBLIZSZEGO PRZEMIATU (wiersz -> ${FORMULA_VERSION})`)
console.log(`aktywnych obserwacji: ${watches.length}, przeliczonych baseline'ow: ${simulated}, oslona zdjela zmiany w ${simShielded}`)
if (noBaseline > 0) console.log(`  ${noBaseline} obserwacji bez baseline'u - cron i tak nic o nich nie wysle`)
// Czego ten wynik NIE mowi, sprawdzone przez wylaczenie oslony i powtorzenie przebiegu: wersja,
// ktora zmienia samo ZDANIE (adres w tekscie, jak 9.53 i 9.55), nie rusza werdyktu, a
// `changesBetween` porownuje werdykty - wiec dla takiej wersji zielony wynik jest oczekiwany i
// oslona nie ma tu nic do roboty. Oslona liczy sie tam, gdzie werdykt sie przesuwa, jak w 9.54
// („oskarzenie" na „niemierzalne"). Nie czytaj wiec zera jako dowodu, ze oslona dziala - dowodem
// jest linijka wyzej, gdy pokazuje liczbe wieksza od zera.
console.log('  (zmiana samego zdania nie jest zmiana werdyktu, wiec takiej wersji oslona nie dotyczy)')
console.log(
  simulated === 0
    ? 'symulacja nie objela zadnego obserwatora, wiec ten przebieg NIE DOWODZI NIC o oslonie'
    : simWouldMail === 0
    ? 'zaden obserwator nie dostalby maila po podbiciu formuly'
    : `UWAGA: ${simWouldMail} wierszy wyslaloby maila po podbiciu formuly - kazdy PRZECZYTAJ:`,
)
for (const line of simOffenders) console.log(line)

await client.close()

// Bramka, nie notatka. Pierwsza wersja drukowala UWAGA i wychodzila zerem, wiec `reseed.sh` szedl
// dalej i wysylal dokladnie te maile, ktorym mial zapobiec (codex, dwa razy P1).
//
// Oblewa SYMULACJA, bo to ona mowi o najblizszym przemiacie. Pary historyczne sa informacyjne:
// tamte maile albo juz poszly, albo nie, i zatrzymywanie dzisiejszego przemiatu za wczorajszy skok
// wersji tylko nauczyloby wszystkich obchodzic te bramke.
if (simUnscorable > 0) {
  console.log(`\nPRZEMIAT WSTRZYMANY: ${simUnscorable} baseline'ow obserwacji nie da sie przeliczyc dzisiejszymi`)
  console.log('regulami, wiec nie wiemy, czy podbicie formuly obudzi ich obserwatorow. Nieznany stan')
  console.log('oslony to powod, zeby nie przemiatac, a nie zeby isc dalej.')
  process.exit(1)
}
if (simWouldMail > 0) {
  console.log(`\nPRZEMIAT WSTRZYMANY: ${simWouldMail} obserwatorow dostaloby maila o NASZEJ zmianie.`)
  console.log('Dopisz zmienione checki do CHECK_RULE_CHANGED dla biezacej wersji albo sprawdz, czy')
  console.log('ta roznica naprawde jest o vendorze - i dopiero wtedy przemiataj.')
  process.exit(1)
}
if (simulated > 0 && simShielded === 0) {
  console.log('\nUWAGA: symulacja objela obserwacje, ale oslona nie zdjela ANI JEDNEJ zmiany.')
  console.log('Zielony wynik moze wiec znaczyc „nic sie nie zmienilo", a nie „oslona dziala".')
}
process.exit(0)
