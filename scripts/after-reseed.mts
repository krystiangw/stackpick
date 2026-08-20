/**
 * The checks that always follow a reseed, in one command.
 *
 *   MONGODB_URI=... npx tsx scripts/after-reseed.mts
 *
 * Every reseed so far has been followed by the same four questions typed by hand, which is how
 * one of them gets skipped. They are not a substitute for `npm run audit`, which checks the corpus
 * against itself: these ask whether the changes we shipped since the last sweep actually landed on
 * 170 rows rather than on the four domains we tried them on.
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { readFileSync } from 'node:fs'
import { getStore } from '../src/lib/store'
import { FORMULA_VERSION } from '../src/lib/score'
import { ERRATA, erratumFor } from '../src/lib/errata'
import { mcpRegistryMirrorState, MIRROR_TTL_MS } from '../src/lib/store-mongo'
import { limitsAtTheirEdge, sawRateLimit } from '../src/lib/corpus'

const store = getStore()

let rows = 0
const version = new Map<string, number>()
let mcpUnmeasurable = 0
/** 9.43: adres, ktory odmowil, przy kontrolce, ktora nie odpowiedziala. Nowa galaz, wiec pusto znaczy
 * albo ze kontrolki wszedzie dochodza, albo ze galaz jest martwa - i te dwie rzeczy trzeba rozroznic. */
let mcpWithoutAControl = 0
const mcpWithoutAControlSample: string[] = []
/** 9.43 po stronie plikow wejsciowych: plik odpowiedzial, a kontrolka dla tej przestrzeni nazw nie. */
let entryWithoutAControl = 0
const entryWithoutAControlSample: string[] = []
let signupNeedsJs = 0
let signupIdentityProvider = 0
let provisioningCredited = 0
let provisioningQuoted = 0
let oauthNamesHosts = 0
let oauthFails = 0
// The two youngest things in the scan, and the reason this script exists: a number nobody prints
// after a sweep is a number nobody looks at until a customer asks.
let snippetPasses = 0
let snippetFails = 0
let snippetUnmeasurable = 0
let snippetNotApplicable = 0
let licenceGateRows = 0
let typedGuessed = 0
let typedSearched = 0
let throttled = 0
let limitedAtEdge = 0
let rowsWithLimitField = 0
let challengedAtEdge = 0
const challengeSample: string[] = []
const throttledSample: string[] = []
let typedBlind = 0
let typedFails = 0
let typedGuessedFails = 0
const licenceGateSample: string[] = []
const stillWrong: string[] = []
/** Wiersze korpusu, ktore nie doszly do biezacej formuly. Zwykle znaczy: ich skan PADA. */
const behind: string[] = []

for (const domain of CURATED_DOMAINS) {
  const report = await store.latestForDomain(domain, true)
  if (!report) {
    // Gorszy przypadek tej samej slepoty: domena korpusu, ktora nie ma ZADNEGO zasianego wiersza,
    // wypadala przed sprawdzeniem wersji, wiec alarm milczal akurat wtedy, gdy skan nie udal sie
    // ani razu. Codeksa.
    behind.push(`${domain} (BRAK ZASIANEGO WIERSZA)`)
    continue
  }
  rows += 1
  const formula = report.scorecard.formulaVersion
  version.set(formula, (version.get(formula) ?? 0) + 1)
  if (formula !== FORMULA_VERSION) behind.push(`${domain} (${formula}, ${report.scannedAt.slice(0, 10)})`)

  const check = (id: string) => report.scorecard.checks.find((candidate) => candidate.id === id)

  const mcp = check('mcp_present')
  if (mcp?.inconclusive && mcp.detail.includes('MCP registry did not answer')) mcpUnmeasurable += 1
  if (mcp?.inconclusive && mcp.detail.includes('the request we read that refusal against')) {
    mcpWithoutAControl += 1
    if (mcpWithoutAControlSample.length < 5) mcpWithoutAControlSample.push(`${domain}: ${mcp.detail.slice(0, 160)}`)
  }

  const entry = check('agent_entry_point')
  if (entry?.inconclusive && entry.detail.includes('our control for that namespace did not')) {
    entryWithoutAControl += 1
    if (entryWithoutAControlSample.length < 5) entryWithoutAControlSample.push(`${domain}: ${entry.detail.slice(0, 160)}`)
  }

  const signup = check('signup_reachable')
  if (signup?.detail.includes('form needs JavaScript')) signupNeedsJs += 1
  if (signup?.detail.includes('no signup form of its own')) signupIdentityProvider += 1

  const provisioning = check('programmatic_provisioning')
  if (provisioning && provisioning.points > 0) {
    provisioningCredited += 1
    if (provisioning.detail.includes('matched in:')) provisioningQuoted += 1
  }

  const snippet = check('price_in_snippet')
  if (snippet) {
    if (snippet.notApplicable) snippetNotApplicable += 1
    else if (snippet.inconclusive) snippetUnmeasurable += 1
    else if (snippet.points > 0) snippetPasses += 1
    else snippetFails += 1
  }

  // Collected, not scored: the sentences that say a licence key is needed before anything runs.
  // Printed here so the decision about scoring it is taken from the corpus rather than from three
  // vendors somebody remembered.
  const quotes = (report.findings as unknown as { funnel?: { provisioning?: { licenceGateQuotes?: string[] } } })?.funnel
    ?.provisioning?.licenceGateQuotes
  if (quotes && quotes.length > 0) {
    licenceGateRows += 1
    if (licenceGateSample.length < 8) licenceGateSample.push(`${domain}: ${quotes[0].slice(0, 110)}`)
  }

  // Zmierzone 2026-08-18: 137 ze 161 mierzalnych werdyktow o paczce stalo na dopasowaniu po
  // wydawcy, a wszystkie 10 oskarzen. Szesc z tych dziesieciu bylo o zlym artefakcie. Dopoki
  // bramka z zadania #46 nie powstanie, ta liczba ma byc widoczna po kazdym przemiecie.
  // Fakty, na ktorych stoi bramka z 9.40. Zapisywane przez skaner, wiec ich brak znaczy, ze bramka
  // jest slepa i po cichu blokuje KAZDE oskarzenie - dokladnie to zdarzylo sie w pierwszej wersji
  // tej zmiany, gdy `scan/index.ts` przepisywal `discovered` recznie i pominal nowe pola.
  const attribution = (report.findings as unknown as {
    discovered?: { npmSource?: string | null; npmOwnership?: unknown; npmSaysWhose?: unknown; npmRivals?: unknown }
  }).discovered
  // Tylko wiersze na biezacej formule: starszy raport nie moze niesc pola, ktorego wtedy nie bylo,
  // a w polowie przemiatu wiekszosc korpusu jest jeszcze stara. Liczone inaczej, straznik krzyczal
  // o 109 wierszach, ktore niczego nie lamia.
  if (formula === FORMULA_VERSION && attribution?.npmSource === 'registry-search') {
    typedSearched += 1
    // Wszystkie trzy, bo bramka czyta wszystkie trzy: wiersz z sama wlasnoscia i bez reszty jest tak
    // samo slepy, a straznik liczacy jedno pole zameldowalby, ze jest zdrowo.
    if (attribution.npmOwnership === undefined || attribution.npmSaysWhose === undefined || attribution.npmRivals === undefined) {
      typedBlind += 1
    }
  }

  // Wiersz, w ktorym gdziekolwiek padlo 429, jest chudszy niz strona, ktora opisuje, i to jest NASZ
  // slad, nie ich regula. Po przemiecie nikt tego nie widzial, a to pierwsza liczba mowiaca, czy
  // przemiat byl za ostry.
  if (sawRateLimit(report.findings)) {
    throttled += 1
    if (throttledSample.length < 6) throttledSample.push(domain)
  }

  // Czyje to byly drzwi. Rejestr npm odmawia nam stale i to fakt o nas; brzeg vendora, ktory
  // odpowiada wyzwaniem, jest ustaleniem o nim - i dopoki tego nie policzymy na pelnym przemiecie,
  // nie zmieniamy z tego zadnego werdyktu (#48).
  // Wiersze sprzed 2026-08-18 nie maja tego pola w ogole, wiec bez tego licznika zdanie „zaden vendor nie
  // odmowil" bylaby uspokojeniem o korpusie, ktory o tym nie wie - ten sam falszywy komfort, co przy
  // bramce atrybucji liczonej na wierszach sprzed jej wprowadzenia.
  if (report.findings?.limitsMet !== undefined) rowsWithLimitField += 1
  const edge = limitsAtTheirEdge(report.findings, domain)
  if (edge.onSite > 0) {
    limitedAtEdge += 1
    if (edge.challenges > 0) {
      challengedAtEdge += 1
      if (challengeSample.length < 8) challengeSample.push(`${domain} (${edge.challenges}/${edge.onSite}, ${edge.hosts.join(', ')})`)
    }
  }

  const typed = check('typed_package')
  if (typed && !typed.notApplicable && !typed.inconclusive) {
    const guessed = typed.detail.includes('by who publishes it')
    if (guessed) typedGuessed += 1
    if (typed.points === 0) {
      typedFails += 1
      if (guessed) typedGuessedFails += 1
    }
  }

  const oauth = check('oauth_dcr')
  if (oauth && !oauth.inconclusive && !oauth.notApplicable && oauth.points === 0) {
    oauthFails += 1
    // Liczymy FAKT, nie ksztalt zdania. Poprzednia wersja szukala frazy `probed: http`, wiec 17
    // wierszy z kompletnym dowodem („metadata published at <adres>") czytalo sie jak oskarzenia bez
    // dowodu, a linijka meldowala 72 z 89. Diagnostyka, ktora zaniza sama siebie, kosztuje jedno
    // sledztwo za kazdym razem, gdy ktos ja przeczyta - u mnie kosztowala 2026-08-20.
    if (/https?:\/\//.test(oauth.detail)) oauthNamesHosts += 1
  }

  // An erratum that still fires is a row the reseed did not correct, which is the one outcome
  // nobody would notice: the note reads as intentional.
  for (const entry of ERRATA) {
    if (entry.domain !== domain) continue
    const corrected = check(entry.checkId)
    if (corrected && erratumFor(domain, entry.checkId, formula, corrected.detail)) {
      // One line per row, not per entry: a domain can carry two entries for one check.
      const line = `${domain} ${entry.checkId}`
      if (!stillWrong.includes(line)) stillWrong.push(line)
    }
  }
}

const versions = [...version.entries()].sort((a, b) => b[1] - a[1])
console.log(`${rows} wierszy zasianych, wersje formuly: ${versions.map(([v, n]) => `${v}: ${n}`).join(', ')}`)
// „176 z 177" czytalo sie jak zdrowie przez wiele dni, a brakujacym wierszem byl `signoz.io`, ktorego
// skan PADAL na cudzym placeholderze w adresie MCP - i przez caly ten czas publikowalismy o nim
// werdykt sprzed szesciu wersji. Wiersz korpusu, ktory po przemiecie nie doszedl do biezacej formuly,
// prawie nigdy nie jest „starzejacym sie wierszem": to skan, ktory nie konczy sie sukcesem.
if (behind.length > 0) {
  console.log(
    `\nUWAGA: ${behind.length} wierszy korpusu NIE doszlo do ${FORMULA_VERSION} - sprawdz, czy ich skan nie PADA, zanim uznasz to za starzenie sie:`,
  )
  for (const one of behind) console.log(`  ${one}`)
  console.log(`  reprodukcja: curl -X POST ${'${SITE}'}/api/scan -H "cookie: stackpick_console=$TOKEN" -d '{"domain":"..."}' i przeczytaj heroku logs`)
}
console.log(`skaner chodzi na ${FORMULA_VERSION}${versions[0]?.[0] === FORMULA_VERSION ? '' : ', czyli korpus NIE jest jeszcze na tej wersji'}`)
console.log('')
console.log(`signup_reachable: ${signupNeedsJs} razy „formularz potrzebuje JavaScriptu", ${signupIdentityProvider} razy „brak formularza, wejscie przez dostawce tozsamosci"`)
console.log(`mcp_present: ${mcpUnmeasurable} wierszy niemierzalnych przez milczacy rejestr MCP`)
console.log(`mcp_present: ${mcpWithoutAControl} wierszy niemierzalnych przez milczaca kontrolke (9.43)`)
for (const one of mcpWithoutAControlSample) console.log(`  ${one}`)
console.log(`agent_entry_point: ${entryWithoutAControl} wierszy niemierzalnych przez milczaca kontrolke (9.43)`)
for (const one of entryWithoutAControlSample) console.log(`  ${one}`)

// The row count above is the symptom; this is the cause, and it is worth one line because the
// mirror going stale looks exactly like a registry that has nothing about anybody. Read through
// the app's own connection: an ad-hoc Mongo client without a database name reads a different
// database and reported this collection empty on 2026-08-17 while it held 9322 hosts.
/**
 * Dwa progi, nie jeden. Prog TTL mowi dopiero wtedy, gdy pomiar juz zamilkl - a job wypelniajacy
 * lustro chodzi codziennie, wiec dwie doby to dwa pominiete przebiegi i jedyny moment, w ktorym
 * awarie widac przed skutkiem. Job lustrzacy nie zadzialal ani razu i nikt tego nie zauwazyl przez
 * dwa dni wlasnie dlatego, ze przez caly TTL zepsuty producent wyglada jak dzialajacy.
 */
const TWO_MISSED_RUNS_MS = 2 * 24 * 60 * 60 * 1000
const staleness = (ageMs: number) => {
  if (ageMs > MIRROR_TTL_MS) return ', czyli POZA oknem i skaner czyta je jak milczenie'
  if (ageMs > TWO_MISSED_RUNS_MS) return ', czyli DWA pominiete przebiegi dziennego jobu - sprawdz gh run list --workflow=mcp-registry.yml'
  return ''
}

const mirror = await mcpRegistryMirrorState()
const ageMs = mirror.syncedAt === null ? null : Date.now() - Date.parse(mirror.syncedAt)
console.log(
  `lustro rejestru MCP: ${mirror.hosts} hostow, ${
    ageMs === null
      ? 'NIGDY nie zapelnione, wiec skaner czyta rejestr jak milczacy'
      : `zsynchronizowane ${(ageMs / 3600_000).toFixed(1)} h temu${staleness(ageMs)}`
  }`,
)
console.log(`programmatic_provisioning: ${provisioningQuoted} z ${provisioningCredited} zaliczonych wierszy cytuje slowa, na ktorych stoi punkt`)
console.log(
  oauthFails === 0
    ? 'oauth_dcr: zaden wiersz nie oblewa, wiec nie ma czego sprawdzac'
    : oauthNamesHosts === oauthFails
      ? `oauth_dcr: wszystkie ${oauthFails} oblanych wierszy wymienia adres, ktorym vendor odtworzy wynik`
      : `UWAGA: ${oauthFails - oauthNamesHosts} z ${oauthFails} oblanych wierszy oauth_dcr NIE podaje zadnego adresu, czyli oskarza bez dowodu`,
)
console.log(
  `price_in_snippet: ${snippetPasses} przechodzi, ${snippetFails} oblewa, ${snippetUnmeasurable} niemierzalnych, ${snippetNotApplicable} nie dotyczy`,
)
console.log(
  `typed_package: ${typedGuessed} werdyktow stoi na paczce dopasowanej po wydawcy, w tym ${typedGuessedFails} z ${typedFails} oskarzen (bramka: zadanie #46)`,
)
console.log(
  typedSearched === 0
    ? 'bramka atrybucji: zaden wiersz na biezacej formule nie byl wybrany przez wyszukiwarke, wiec nie ma czego sprawdzac'
    : typedBlind === 0
      ? `bramka atrybucji widzi swoje fakty we wszystkich ${typedSearched} wierszach z wyszukiwarki na ${FORMULA_VERSION}`
      : `UWAGA: ${typedBlind} z ${typedSearched} wierszy na ${FORMULA_VERSION} NIE MA zapisanych faktow bramki, wiec bramka blokuje tam kazde oskarzenie po cichu`,
)
console.log(
  throttled === 0
    ? 'zaden wiersz nie niesie naszego 429'
    : `429 gdziekolwiek: ${throttled} wierszy jest chudszych, niz strona na to zasluguje (${throttledSample.join(', ')}${throttled > throttledSample.length ? ', ...' : ''}). Ile z tego jest NASZE, mowi linijka nizej: reszta to brzeg vendora`,
)
console.log(
  rowsWithLimitField === 0
    ? 'zaden wiersz nie niesie jeszcze zapisu, czym nas odmowiono (pole doszlo 2026-08-18, wypelni sie przy nastepnym przemiacie)'
    : limitedAtEdge === 0
      ? `zaden z ${rowsWithLimitField} wierszy z zapisem nie spotkal limitu na brzegu vendora`
      : `limit na brzegu vendora: ${limitedAtEdge} z ${rowsWithLimitField} wierszy z zapisem, w tym ${challengedAtEdge} z markerem wyzwania (to sciana, nie nasze tempo - #48)`,
)
for (const one of challengeSample) console.log(`  ${one}`)

// Zdanie na `/pricing` o brzegu vendora jest WPISANE RECZNIE, a stoi na liczbach z przemiatu - czyli
// starzeje sie dokladnie tutaj i nigdzie indziej nic tego nie zauwazy. Reszta liczb na tej stronie
// jest generowana (`CHECKS.length`, `CATEGORIES.length`, katalog cen), wiec to jedyne trzy, ktore
// moga sie rozjechac po cichu.
const cennikZrodlo = readFileSync('src/app/pricing/page.tsx', 'utf8').replace(/\s+/g, ' ')
const zdanieOBrzegu = cennikZrodlo.match(
  /Sweeping all (\d+) domains in our corpus on ([^,]+), (\d+) of them refused our requests at their own edge and (\d+) of those answered with a browser challenge/,
)
// Od 2026-08-20 te liczby sa LICZONE z korpusu przy renderze, a nie wpisywane recznie, wiec regex
// nizej nie ma czego dopasowac - i to jest stan docelowy, nie awaria. Straznik pilnuje wiec czego
// innego: ze strona naprawde je liczy. Poprawianie recznej liczby po kazdym przemiacie bylo
// przypomnieniem, nie rozwiazaniem; ostatni rozjazd (15/11 wobec 14/10) wyszedl kilka godzin po tym,
// jak ktos ja poprawil.
const cennikLiczySam = cennikZrodlo.includes('edgeRefusalsInCorpus(')
if (!zdanieOBrzegu && cennikLiczySam) {
  console.log(`cennik liczy brzeg vendora z korpusu, wiec nie ma czego porownywac (dzis: ${rows}/${limitedAtEdge}/${challengedAtEdge})`)
} else if (!zdanieOBrzegu) {
  console.log('UWAGA: nie znalazlem na /pricing zdania o brzegu vendora ANI wywolania edgeRefusalsInCorpus - albo je przepisano, albo ten straznik czyta nie to')
} else {
  const [, napisaneDomeny, napisanaData, napisaneOdmowy, napisaneWyzwania] = zdanieOBrzegu
  const rozjazd = [
    Number(napisaneDomeny) === rows ? null : `domeny: cennik mowi ${napisaneDomeny}, korpus ma ${rows}`,
    Number(napisaneOdmowy) === limitedAtEdge ? null : `odmowy na brzegu: cennik mowi ${napisaneOdmowy}, przemiat dal ${limitedAtEdge}`,
    Number(napisaneWyzwania) === challengedAtEdge ? null : `wyzwania: cennik mowi ${napisaneWyzwania}, przemiat dal ${challengedAtEdge}`,
  ].filter((one): one is string => one !== null)
  console.log(
    rozjazd.length === 0
      ? `cennik zgadza sie z korpusem co do brzegu vendora (${napisaneDomeny}/${napisaneOdmowy}/${napisaneWyzwania}, policzone ${napisanaData})`
      : `UWAGA: zdanie na /pricing rozjechalo sie z korpusem, popraw je RAZEM Z DATA (${napisanaData}): ${rozjazd.join('; ')}`,
  )
}
console.log(`klucz licencyjny (tylko dowody, bez punktow): ${licenceGateRows} wierszy ma zdanie o wymogu klucza`)
for (const one of licenceGateSample) console.log(`  ${one}`)
console.log('')
if (stillWrong.length === 0) {
  console.log('errata: wszystkie wpisy wygasly, czyli reseed poprawil kazdy wiersz, o ktorym wiedzielismy, ze mysli')
} else {
  console.log(`errata: ${stillWrong.length} wierszy NADAL wymaga sprostowania: ${stillWrong.join(', ')}`)
}
process.exit(0)
