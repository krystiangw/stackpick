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
console.log(`programmatic_provisioning: ${provisioningQuoted} z ${provisioningCredited} zaliczonych wierszy cytuje slowa, na ktorych stoi punkt`)
console.log(`oauth_dcr: ${oauthNamesHosts} z ${oauthFails} oblanych wierszy wymienia sprawdzone adresy`)
console.log('')
if (stillWrong.length === 0) {
  console.log('errata: wszystkie wpisy wygasly, czyli reseed poprawil kazdy wiersz, o ktorym wiedzielismy, ze mysli')
} else {
  console.log(`errata: ${stillWrong.length} wierszy NADAL wymaga sprostowania: ${stillWrong.join(', ')}`)
}
process.exit(0)
