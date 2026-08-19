/**
 * Czy strony, ktore nazywamy pusta skorupa, naprawde czytaja sie dzis pusto?
 *
 *   MONGODB_URI=... npx tsx scripts/audit-docs-js.mts [ile]
 *
 * `docs_without_js` niesie dwa oskarzenia i zadnego z nich nikt dotad nie powtorzyl osobno:
 * „Only N characters render without JS" oraz najostrzejsze zdanie na calej karcie, „serves X
 * percent less text to <nasz agent> than to a Chrome user-agent, at the same URL and the same
 * moment". Oba da sie odtworzyc dwoma zapytaniami - wiec jesli sie nie odtwarzaja, publikujemy
 * zarzut, ktorego vendor nie potwierdzi u siebie.
 *
 * Trzej czytelnicy na tych samych bajtach:
 *  - NASZ (`visibleTextLength`), ktory zdejmuje `script`, `style` i **`noscript`**;
 *  - LUZNY, ktory zostawia `noscript`. To nie jest kosmetyka: tresc w `noscript` to dokladnie to,
 *    co dostaje klient bez JavaScriptu, czyli ten, o ktorym ten check mowi. Strona z pelnym
 *    fallbackiem dostawalaby od nas zarzut za zrobienie tego, czego od niej chcemy;
 *  - KONTROLKA: te same pomiary na wierszach ZALICZONYCH. Sonda, ktora umie zwrocic wylacznie
 *    „malo znakow", nie dowodzi niczego - a nasz czytelnik jest wspolny dla obu grup, wiec gdyby
 *    to on byl zepsuty, kontrolka spadnie ponizej progu razem z oskarzonymi.
 *
 * Wszystko do czytania recznie. Nigdy w trakcie przemiatu.
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'
import { AGENT_UA, DOCS_SHELL_FLOOR, fetchUrl, looksLikeHtml, visibleTextLength, withoutTags } from '../src/lib/scan/http'
import { howManyRows, reportCap } from './how-many'
import { refuseIfNothingMeasured } from './nothing-measured'

const PAUSE_MS = 300
/** Ten sam prog, ktory `thinnerForAgents` stawia przed pomiarem: ponizej niego nie liczymy udzialu. */
const CLOAK_BROWSER_FLOOR = 2_000
const CLOAK_SHARE = 0.5

const store = getStore()
const most = howManyRows(25)

/** Nasz czytelnik bez jednej roznicy: `noscript` zostaje, bo to jest tresc dla klienta bez JS. */
const withNoscript = (html: string) => {
  // Nie tylko domkniete: cialo uciete na sufcie bajtow zostawia `<script>` bez zamkniecia, a wtedy
  // to wyrazenie nie usuwa NICZEGO i audyt melduje, ze noscript niesie 400 tysiecy znakow strony.
  // Tak wlasnie oskarzyl filestack.com i pandadoc.com w swoim pierwszym przebiegu. Nasz wlasny
  // czytelnik zdejmuje niedomkniety tag razem z reszta dokumentu i tak samo musi robic ten.
  const closed = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')
  const dangling = closed.search(/<(script|style)\b/i)
  return withoutTags(dangling === -1 ? closed : closed.slice(0, dangling))
    .replace(/\s+/g, ' ')
    .trim().length
}

type Row = { domain: string; url: string }

const shell: Row[] = []
const cloaked: Row[] = []
const credited: Row[] = []
let visited = 0

for (const domain of CURATED_DOMAINS) {
  visited += 1
  const report = await store.latestForDomain(domain, true)
  const check = report?.scorecard.checks.find((one) => one.id === 'docs_without_js')
  if (!report || !check || check.inconclusive || check.notApplicable) continue
  const f = report.findings
  const entry = f.discovered.docs
  if (!entry) continue
  const thinner = f.docsThinnerForAgents
  if (typeof thinner === 'number' && Number.isFinite(thinner)) {
    cloaked.push({ domain, url: entry })
    continue
  }
  // Nazwa strony idzie tak samo jak w zdaniu na karcie: najbogatsza przeczytana, a gdy jej nie ma,
  // punkt wejscia. Audyt pytajacy o inna strone pytalby o co innego niz publikujemy.
  const named = f.docsTextCharsFrom ?? entry
  if (check.points > 0) credited.push({ domain, url: named })
  else if (f.docsTextChars > 0 && f.docsTextChars < DOCS_SHELL_FLOOR) shell.push({ domain, url: named })
}

const accused = [...shell.slice(0, most), ...cloaked.slice(0, most)]
// Kontrolka rozlozona po calej liscie, a nie pierwsze N alfabetycznie: pierwsze wiersze korpusu to
// nie jest probka zaliczonych, tylko poczatek alfabetu.
// Nigdy pusta, nawet gdy oskarzen nie ma wcale: „check dzis nikogo nie oskarza" jest zdaniem o
// korpusie tylko wtedy, gdy wiemy, ze nasz czytelnik w ogole umie zwrocic duza liczbe.
const controlSize = Math.min(credited.length, Math.max(accused.length, 5))
const step = controlSize > 0 ? Math.max(1, Math.floor(credited.length / controlSize)) : 1
const control = credited.filter((_, index) => index % step === 0).slice(0, controlSize)

reportCap(visited, CURATED_DOMAINS.size, shell.length + cloaked.length)
// `reportCap` mowi, ilu wierszy audyt dotyczy, a nie ilu przeczytam: sufit tnie kazda grupe
// osobno i milczaca roznica czytalaby sie jako „sprawdzone wszystkie".
for (const [name, group] of [['o skorupe', shell], ['o ciensza strone', cloaked]] as const) {
  if (group.length > most) console.log(`sufit: czytam ${most} z ${group.length} oskarzonych ${name}; reszta POMINIETA`)
}
console.log(
  `${shell.length} oskarzonych o skorupe, ${cloaked.length} o cieszenie strony agentom, ` +
    `${credited.length} zaliczonych (kontrolka: ${control.length})\n`,
)

let pagesRead = 0

const readTwice = async (url: string) => {
  await new Promise((done) => setTimeout(done, PAUSE_MS))
  const [asBrowser, asAgent] = await Promise.all([fetchUrl(url), fetchUrl(url, { ua: AGENT_UA })])
  return { asBrowser, asAgent }
}

type Measured = { ours: number; loose: number; agent: number | null; status: number; html: boolean }

const measure = async (url: string, alsoAsAgent: boolean): Promise<Measured | null> => {
  const { asBrowser, asAgent } = alsoAsAgent
    ? await readTwice(url)
    : { asBrowser: await fetchUrl(url), asAgent: null }
  if (!asBrowser.ok) return { ours: 0, loose: 0, agent: null, status: asBrowser.status, html: false }
  pagesRead += 1
  return {
    ours: visibleTextLength(asBrowser.body),
    loose: withNoscript(asBrowser.body),
    agent: asAgent?.ok ? visibleTextLength(asAgent.body) : null,
    status: asBrowser.status,
    html: looksLikeHtml(asBrowser),
  }
}

console.log('KONTROLKA: strony, ktorym punkt PRZYZNALISMY\n')
let controlBelow = 0
/** Ile kontrolek naprawde odpowiedzialo. `control.length` mowi, ile ich WYBRALEM, a to inna liczba:
 * gdyby zadna nie odpowiedziala, a oskarzone tak, audyt szedlby dalej bez obiecanej kontrolki i
 * jeszcze rozcienczal ostrzezenie nieudanymi zapytaniami. Codeksa. */
let controlMeasured = 0
for (const row of control) {
  const got = await measure(row.url, false)
  if (!got) continue
  if (got.status < 200 || got.status >= 400 || !got.html) {
    console.log(`  ${String(got.status).padEnd(3)} ${(got.html ? 'bez odpowiedzi' : 'nie HTML').padStart(10)}  ${row.domain}  ${row.url.slice(0, 76)}`)
    continue
  }
  controlMeasured += 1
  if (got.ours < DOCS_SHELL_FLOOR) controlBelow += 1
  console.log(`  ${String(got.status).padEnd(3)} ${String(got.ours).padStart(7)} zn  ${row.domain}  ${row.url.slice(0, 76)}`)
}

console.log('\nOSKARZONE O SKORUPE: mowimy, ze bez JS renderuje sie mniej niz prog\n')
const toRead: string[] = []
let shellHolds = 0
let shellStale = 0
/** Milczy albo serwuje dzis co innego niz HTML: w obu wypadkach nie da sie powtorzyc pomiaru. */
let shellSilent = 0
for (const row of shell.slice(0, most)) {
  const got = await measure(row.url, false)
  if (!got) continue
  if (got.status < 200 || got.status >= 400) {
    shellSilent += 1
    console.log(`  ${String(got.status).padEnd(3)} MILCZY            ${row.domain}  ${row.url.slice(0, 70)}`)
    continue
  }
  // Skaner mierzy skorupe wylacznie na HTML-u: plik markdown renderuje sie caly bez JavaScriptu z
  // definicji, wiec gdyby ten adres serwowal dzis markdown, czytalibysmy co innego niz oskarzenie.
  if (!got.html) {
    shellSilent += 1
    console.log(`  ${String(got.status).padEnd(3)} NIE HTML DZIS     ${row.domain}  ${row.url.slice(0, 70)}`)
    continue
  }
  const noscriptCarries = got.loose >= DOCS_SHELL_FLOOR && got.ours < DOCS_SHELL_FLOOR
  if (noscriptCarries) toRead.push(`${row.domain}: noscript niesie ${got.loose} zn, nasz czytelnik widzi ${got.ours} - ${row.url}`)
  if (got.ours >= DOCS_SHELL_FLOOR) {
    shellStale += 1
    toRead.push(`${row.domain}: dzis ${got.ours} zn, czyli POWYZEJ progu ${DOCS_SHELL_FLOOR} - ${row.url}`)
  } else shellHolds += 1
  const verdict = got.ours >= DOCS_SHELL_FLOOR ? 'NIEAKTUALNE' : noscriptCarries ? 'NOSCRIPT NIESIE' : 'potwierdzone'
  console.log(
    `  ${String(got.status).padEnd(3)} ${verdict.padEnd(17)} ${String(got.ours).padStart(7)} zn` +
      `  (z noscript ${String(got.loose).padStart(7)} zn)  ${row.domain}  ${row.url.slice(0, 60)}`,
  )
}

console.log('\nOSKARZONE O CIENSZA STRONE DLA AGENTA: to samo URL, ta sama chwila, inny user-agent\n')
let cloakHolds = 0
let cloakStale = 0
let cloakSilent = 0
for (const row of cloaked.slice(0, most)) {
  const got = await measure(row.url, true)
  if (!got) continue
  if (got.status < 200 || got.status >= 400 || got.agent === null) {
    cloakSilent += 1
    console.log(`  ${String(got.status).padEnd(3)} NIE ODTWORZONE (agent ${got.agent === null ? 'bez odpowiedzi' : 'ok'})  ${row.domain}  ${row.url.slice(0, 60)}`)
    continue
  }
  const share = got.ours >= CLOAK_BROWSER_FLOOR ? 1 - got.agent / got.ours : null
  const stands = share !== null && share > CLOAK_SHARE
  if (stands) cloakHolds += 1
  else {
    cloakStale += 1
    toRead.push(
      `${row.domain}: dzis przegladarka ${got.ours} zn, agent ${got.agent} zn` +
        `${share === null ? ` (ponizej progu ${CLOAK_BROWSER_FLOOR} zn, wiec nie liczymy udzialu)` : `, roznica ${Math.round(share * 100)}%`} - ${row.url}`,
    )
  }
  console.log(
    `  ${String(got.status).padEnd(3)} ${(stands ? 'potwierdzone' : 'NIE ODTWORZONE').padEnd(17)}` +
      ` przegladarka ${String(got.ours).padStart(7)} zn, agent ${String(got.agent).padStart(7)} zn  ${row.domain}`,
  )
}

// Bramki przed podsumowaniem, nie po nim: przebieg, ktory nic nie przeczytal, ma sie nie uspokajac.
refuseIfNothingMeasured(pagesRead, 'stron przeczytanych')
refuseIfNothingMeasured(controlMeasured, 'stron kontrolnych, ktore odpowiedzialy')

console.log(
  `\nskorupa: ${shellHolds} potwierdzonych, ${shellStale} nieaktualnych, ${shellSilent} niepowtarzalnych dzis` +
    `\ncieniej agentom: ${cloakHolds} potwierdzonych, ${cloakStale} nieodtworzonych, ${cloakSilent} bez odpowiedzi` +
    `\nkontrolka: ${controlBelow} z ${controlMeasured} zmierzonych zaliczonych stron czyta sie dzis PONIZEJ progu`,
)
if (controlBelow > controlMeasured / 2) {
  console.log('\nUWAGA: wiekszosc kontrolki spadla ponizej progu. To jest zdanie o NASZYM czytelniku albo o naszym zapytaniu, a nie o vendorach - nie czytaj oskarzen powyzej jako potwierdzonych.')
}
console.log(toRead.length === 0 ? '\nnic do przeczytania recznie' : `\n${toRead.length} MIEJSC do przeczytania recznie:`)
for (const line of toRead) console.log(`  ${line}`)

// Bez wyjscia skrypt konczy prace i wisi: polaczenie do bazy trzyma petle zdarzen otwarta, a audyt,
// ktory nie wychodzi, jest audytem, ktorego nikt nie uruchamia drugi raz. Ale najpierw spuszczamy
// wyjscie: przy przekierowaniu na plik `console.log` bywa jeszcze w buforze, a `process.exit`
// ucina go w pol zdania - czyli zabiera dokladnie te linijki, dla ktorych ten audyt istnieje. Codeksa.
await new Promise<void>((done) => process.stdout.write('', () => done()))
process.exit(0)
