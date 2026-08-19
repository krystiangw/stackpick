/**
 * Czy drzwi frontowe naprawde sa dzis zamkniete przed agentem?
 *
 *   MONGODB_URI=... npx tsx scripts/audit-front-door.mts [ile]
 *
 * `answers_plain_request` stoi pierwszy na karcie i konczy lejek, zanim cokolwiek innego sie
 * zacznie, a jego dwa zdania to najostrzejsze rzeczy, jakie ten produkt mowi o czyjejs stronie:
 * „Answered 403 to <nasz agent>, and 200 to a Chrome user-agent" oraz „an agent does not get past
 * <witryna>". Oba sa jednym zapytaniem, wiec oba da sie powtorzyc.
 *
 * Powtarzam je **tym samym sposobem, co skaner** (`fetchWithRetries`, trzy proby), bo audyt
 * pytajacy inaczej niz sprawdzana rzecz odpowiada na inne pytanie. Pierwsza proba jest w wydruku
 * osobno: skaner sam pisze, ze trzy zapytania pod rzad to nasz wlasny burst.
 *
 * KONTROLKA jest tu nosna, nie ozdobna: gdyby to nasza siec byla zablokowana, KAZDE oskarzenie
 * potwierdziloby sie samo. Wiersze, ktorym punkt przyznalismy, musza nas dzis wpuscic - jesli nie
 * wpuszczaja, ten przebieg mowi o nas, nie o vendorach, i mowi to na glos.
 *
 * Do czytania recznie. Nigdy w trakcie przemiatu.
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'
import { AGENT_UA, BROWSER_UA, fetchWithRetries, isBotChallenge } from '../src/lib/scan/http'
import { howManyRows, reportCap } from './how-many'
import { refuseIfNothingMeasured } from './nothing-measured'

const PAUSE_MS = 500
const store = getStore()
const most = howManyRows(20)

type Row = { domain: string; site: string; was: number[] }

/** Odmowa pod naszym UA przy przepuszczonej przegladarce. */
const refused: Row[] = []
/** Sciana JavaScriptowa: „an agent does not get past". */
const challenged: Row[] = []
/** Wpuszczeni - kontrolka. */
const admitted: Row[] = []
let visited = 0

for (const domain of CURATED_DOMAINS) {
  visited += 1
  const report = await store.latestForDomain(domain, true)
  const check = report?.scorecard.checks.find((one) => one.id === 'answers_plain_request')
  if (!report || !check || check.notApplicable) continue
  const f = report.findings
  const row: Row = { domain, site: f.site, was: f.agentStatusesSeen ?? [] }
  if (check.inconclusive) continue
  if (check.points > 0) {
    // Tylko czysto wpuszczeni: wiersz zaliczony mimo challenge'u opisuje edge, ktory nas zatrzymal,
    // wiec jako kontrolka twierdzilby, ze nasza siec jest wpuszczana, choc nie byla.
    if (!f.botChallenge) admitted.push(row)
    continue
  }
  if (f.botChallenge) challenged.push(row)
  else if (f.blocksPlainRequests) refused.push(row)
}

const accused = [...refused.slice(0, most), ...challenged.slice(0, most)]
const controlSize = Math.min(admitted.length, Math.max(accused.length, 5))
const step = controlSize > 0 ? Math.max(1, Math.floor(admitted.length / controlSize)) : 1
const control = admitted.filter((_, index) => index % step === 0).slice(0, controlSize)

reportCap(visited, CURATED_DOMAINS.size, refused.length + challenged.length)
for (const [name, group] of [['o odmowe', refused], ['o sciane', challenged]] as const) {
  if (group.length > most) console.log(`sufit: czytam ${most} z ${group.length} oskarzonych ${name}; reszta POMINIETA`)
}
console.log(
  `${refused.length} oskarzonych o odmowe, ${challenged.length} o sciane JavaScriptowa, ` +
    `${admitted.length} wpuszczajacych nas czysto (kontrolka: ${control.length})\n`,
)

const knock = async (site: string) => {
  await new Promise((done) => setTimeout(done, PAUSE_MS))
  const asAgent = await fetchWithRetries(site, { ua: AGENT_UA })
  return { asAgent, wall: isBotChallenge(asAgent) }
}

const opened = (statuses: number[]) => statuses.some((status) => status >= 200 && status < 400)

console.log('KONTROLKA: witryny, ktore wedlug korpusu wpuszczaja naszego agenta\n')
let controlMeasured = 0
let controlShut = 0
for (const row of control) {
  const { asAgent, wall } = await knock(row.site)
  if (asAgent.statusesSeen.length === 0) {
    console.log(`  bez odpowiedzi   ${row.domain}`)
    continue
  }
  controlMeasured += 1
  const shut = wall || !opened(asAgent.statusesSeen)
  if (shut) controlShut += 1
  console.log(`  ${(shut ? 'DZIS ZAMKNIETE' : 'wpuszcza').padEnd(15)} bylo (${row.was.join(', ')}), dzis (${asAgent.statusesSeen.join(', ')})${wall ? ' + sciana' : ''}  ${row.domain}`)
}

const toRead: string[] = []

console.log('\nOSKARZONE O ODMOWE: mowimy, ze agent dostaje odmowe, a przegladarka wchodzi\n')
let refusedHolds = 0
let refusedStale = 0
for (const row of refused.slice(0, most)) {
  const { asAgent } = await knock(row.site)
  if (asAgent.statusesSeen.length === 0) {
    toRead.push(`${row.domain}: dzis brak odpowiedzi pod naszym UA, wiec nie da sie powtorzyc`)
    console.log(`  bez odpowiedzi   ${row.domain}`)
    continue
  }
  // Druga polowa zdania, bez ktorej „odmawia agentom" jest zdaniem o naszej sieci, a nie o nich.
  await new Promise((done) => setTimeout(done, PAUSE_MS))
  const asBrowser = await fetchWithRetries(row.site, { ua: BROWSER_UA })
  const agentIn = opened(asAgent.statusesSeen)
  const browserIn = opened(asBrowser.statusesSeen)
  const stands = !agentIn && browserIn
  if (stands) refusedHolds += 1
  else {
    refusedStale += 1
    toRead.push(
      `${row.domain}: dzis agent (${asAgent.statusesSeen.join(', ')}), przegladarka (${asBrowser.statusesSeen.join(', ')})` +
        `${agentIn ? ' - agent WCHODZI' : ' - przegladarka tez nie wchodzi, wiec to nie jest zdanie o agentach'}`,
    )
  }
  console.log(
    `  ${(stands ? 'potwierdzone' : 'NIE ODTWORZONE').padEnd(15)} agent (${asAgent.statusesSeen.join(', ')}), przegladarka (${asBrowser.statusesSeen.join(', ')})  ${row.domain}`,
  )
}

console.log('\nOSKARZONE O SCIANE: mowimy, ze agent nie przechodzi przez edge\n')
let wallHolds = 0
let wallStale = 0
for (const row of challenged.slice(0, most)) {
  const { asAgent, wall } = await knock(row.site)
  if (asAgent.statusesSeen.length === 0) {
    toRead.push(`${row.domain}: dzis brak odpowiedzi pod naszym UA, wiec nie da sie powtorzyc`)
    console.log(`  bez odpowiedzi   ${row.domain}`)
    continue
  }
  // Ta sama regula, ktora czek stosuje na wierszu: 2xx gdziekolwiek w sekwencji obala to zdanie.
  const stands = wall && !opened(asAgent.statusesSeen)
  if (stands) wallHolds += 1
  else {
    wallStale += 1
    toRead.push(
      `${row.domain}: dzis (${asAgent.statusesSeen.join(', ')})${wall ? ' ze sciana' : ' BEZ sciany'}` +
        `${opened(asAgent.statusesSeen) ? ' - agent przechodzi' : ''}`,
    )
  }
  console.log(`  ${(stands ? 'potwierdzone' : 'NIE ODTWORZONE').padEnd(15)} dzis (${asAgent.statusesSeen.join(', ')})${wall ? ' + sciana' : ''}  ${row.domain}`)
}

// Bramki przed podsumowaniem: przebieg bez kontrolki nie ma prawa nikogo uspokoic ani oskarzyc.
refuseIfNothingMeasured(controlMeasured, 'kontrolnych witryn, ktore odpowiedzialy')

console.log(
  `\nodmowa: ${refusedHolds} potwierdzonych, ${refusedStale} nieodtworzonych` +
    `\nsciana: ${wallHolds} potwierdzonych, ${wallStale} nieodtworzonych` +
    `\nkontrolka: ${controlShut} z ${controlMeasured} witryn, ktore maja nas wpuszczac, dzis nas nie wpuscilo`,
)
if (controlShut > controlMeasured / 2) {
  console.log('\nUWAGA: wiekszosc kontrolki dzis nas nie wpuscila. To jest zdanie o SIECI, z ktorej pytamy, a nie o vendorach - oskarzenia powyzej nie sa potwierdzone.')
}
console.log(toRead.length === 0 ? '\nnic do przeczytania recznie' : `\n${toRead.length} MIEJSC do przeczytania recznie:`)
for (const line of toRead) console.log(`  ${line}`)
