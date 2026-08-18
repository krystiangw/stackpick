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
import { getStore } from '../src/lib/store'
import { FORMULA_VERSION } from '../src/lib/score'
import { ERRATA, erratumFor } from '../src/lib/errata'
import { mcpRegistryMirrorState, MIRROR_TTL_MS } from '../src/lib/store-mongo'
import { limitsAtTheirEdge, sawRateLimit } from '../src/lib/corpus'

const store = getStore()

let rows = 0
const version = new Map<string, number>()
let mcpUnmeasurable = 0
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

for (const domain of CURATED_DOMAINS) {
  const report = await store.latestForDomain(domain, true)
  if (!report) continue
  rows += 1
  const formula = report.scorecard.formulaVersion
  version.set(formula, (version.get(formula) ?? 0) + 1)

  const check = (id: string) => report.scorecard.checks.find((candidate) => candidate.id === id)

  const mcp = check('mcp_present')
  if (mcp?.inconclusive && mcp.detail.includes('MCP registry did not answer')) mcpUnmeasurable += 1

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
    if (oauth.detail.includes('probed: http')) oauthNamesHosts += 1
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
console.log(`skaner chodzi na ${FORMULA_VERSION}${versions[0]?.[0] === FORMULA_VERSION ? '' : ', czyli korpus NIE jest jeszcze na tej wersji'}`)
console.log('')
console.log(`signup_reachable: ${signupNeedsJs} razy „formularz potrzebuje JavaScriptu", ${signupIdentityProvider} razy „brak formularza, wejscie przez dostawce tozsamosci"`)
console.log(`mcp_present: ${mcpUnmeasurable} wierszy niemierzalnych przez milczacy rejestr MCP`)

// The row count above is the symptom; this is the cause, and it is worth one line because the
// mirror going stale looks exactly like a registry that has nothing about anybody. Read through
// the app's own connection: an ad-hoc Mongo client without a database name reads a different
// database and reported this collection empty on 2026-08-17 while it held 9322 hosts.
const mirror = await mcpRegistryMirrorState()
const ageMs = mirror.syncedAt === null ? null : Date.now() - Date.parse(mirror.syncedAt)
console.log(
  `lustro rejestru MCP: ${mirror.hosts} hostow, ${
    ageMs === null
      ? 'NIGDY nie zapelnione, wiec skaner czyta rejestr jak milczacy'
      : `zsynchronizowane ${(ageMs / 3600_000).toFixed(1)} h temu${ageMs > MIRROR_TTL_MS ? ', czyli POZA oknem i skaner czyta je jak milczenie' : ''}`
  }`,
)
console.log(`programmatic_provisioning: ${provisioningQuoted} z ${provisioningCredited} zaliczonych wierszy cytuje slowa, na ktorych stoi punkt`)
console.log(`oauth_dcr: ${oauthNamesHosts} z ${oauthFails} oblanych wierszy wymienia sprawdzone adresy`)
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
console.log(`klucz licencyjny (tylko dowody, bez punktow): ${licenceGateRows} wierszy ma zdanie o wymogu klucza`)
for (const one of licenceGateSample) console.log(`  ${one}`)
console.log('')
if (stillWrong.length === 0) {
  console.log('errata: wszystkie wpisy wygasly, czyli reseed poprawil kazdy wiersz, o ktorym wiedzielismy, ze mysli')
} else {
  console.log(`errata: ${stillWrong.length} wierszy NADAL wymaga sprostowania: ${stillWrong.join(', ')}`)
}
process.exit(0)
