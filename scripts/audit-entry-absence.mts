/**
 * Czy „nie publikujesz zadnego z tych plikow" znaczy, ze ich nie ma - czy ze my ich nie dostalismy.
 *
 *   MONGODB_URI=... npx tsx scripts/audit-entry-absence.mts [ile]
 *
 * `agent_entry_point` pyta o kilkanascie sciezek na dwoch hostach RÓWNOLEGLE, a `isEdgeRefusal`
 * liczy jako odmowe tylko status >= 400. Zadanie, ktore nigdy nie dostalo odpowiedzi, ma status 0 i
 * przechodzi jako „pliku nie ma". Zmierzone na `calendly.com` 2026-08-20: cztery skany tego samego
 * dnia daly 1, 0, 1, 0 punktu, a `https://developer.calendly.com/skill.md` odpowiada 200 i wazy
 * 284 kB przy kazdym pojedynczym zapytaniu.
 *
 * Ten audyt pyta te same adresy POJEDYNCZO, z pauza. Jesli plik odpowiada, oskarzenie jest nasze.
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'
import { fetchUrl } from '../src/lib/scan/http'
import { howManyRows, reportCap } from './how-many'

const PAUSE_MS = 400
const most = howManyRows(20)
const store = getStore()

const accused: { domain: string; paths: string[] }[] = []
let visited = 0
for (const domain of CURATED_DOMAINS) {
  visited += 1
  const report = await store.latestForDomain(domain, true)
  const check = report?.scorecard.checks.find((one) => one.id === 'agent_entry_point')
  if (!report || !check || check.inconclusive || check.notApplicable || check.points > 0) continue
  // Dokladnie te adresy, o ktorych brak oskarzamy, prosto z zapisu skanu.
  const asked = Object.keys(report.findings.funnel.entryPaths ?? {})
  if (asked.length > 0) accused.push({ domain, paths: asked })
}

reportCap(visited, CURATED_DOMAINS.size, accused.length)
if (accused.length > most) console.log(`sufit: czytam ${most} z ${accused.length} oskarzonych; reszta POMINIETA`)

let checked = 0, answered = 0
const found: string[] = []
const softNotFound: string[] = []
for (const row of accused.slice(0, most)) {
  checked += 1
  for (const url of row.paths) {
    const got = await fetchUrl(url, { fresh: true })
    await new Promise((resolve) => setTimeout(resolve, PAUSE_MS))
    if (!got.ok || (got.body ?? '').trim().length < 50) continue
    // KONTROLKA, bez ktorej to trafienie nic nie znaczy: host, ktory odpowiada 200 na KAZDY adres,
    // odpowie tez na `agent-signup.md`. Pierwszy przebieg zglosil `logto.io` z plikiem wazacym
    // 407 kB - to nie plik, to ich strona. Pytamy o adres, ktorego nie moze byc.
    const control = await fetchUrl(`${new URL(url).origin}/letagentsin-control-${'8f3a1c'}.md`, { fresh: true })
    await new Promise((resolve) => setTimeout(resolve, PAUSE_MS))
    if (control.ok && (control.body ?? '').trim().length >= 50) {
      softNotFound.push(`  ${row.domain.padEnd(22)} odpowiada trescia takze na adres, ktorego nie ma - to soft-404, nie plik`)
      break
    }
    answered += 1
    found.push(`  ${row.domain.padEnd(22)} ${String(got.status)} ${String((got.body ?? '').length).padStart(7)} zn  ${url}`)
    break
  }
}

console.log(`\noskarzonych o brak pliku wejsciowego: ${accused.length}, sprawdzonych pojedynczo: ${checked}`)
console.log(
  answered === 0
    ? 'zaden z tych adresow nie odpowiedzial dzis trescia, wiec oskarzenie sie broni'
    : `UWAGA: ${answered} z ${checked} oskarzonych domen ma plik, ktory ODPOWIADA na pojedyncze zapytanie:`,
)
for (const line of found) console.log(line)
if (softNotFound.length > 0) {
  console.log(`\n${softNotFound.length} domen odpadlo na kontrolce, czyli ich „plik" to strona zwracana na kazdy adres:`)
  for (const line of softNotFound) console.log(line)
}
if (answered > 0) {
  console.log('\nKazda z nich publikuje dzis zdanie „None of the N agent entry paths ... returns a file".')
  console.log('To jest nasza rownoleglosc, nie ich brak - przeskanuj je pojedynczo i zasiej ponownie.')
}
process.exit(0)
