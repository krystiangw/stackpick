/**
 * Twenty-seventh adversarial pass: `signup_no_captcha`, 28 rows saying a CAPTCHA vendor appears
 * in the signup page's server HTML.
 *
 * The sixteenth pass already asked whether the string is there, and it is: a named token either
 * sits in the bytes the server sent or it does not, and that half held. What it never asked is
 * the question the point turns on, because the check exists to find a **gate on the form** and
 * the sentence only proves a **string on the page**. A vendor loading recaptcha from one bundle
 * on every route loses the point for a widget that may guard nothing here.
 *
 * So this pass adds the control that separates the two: the same probe against a page on the same
 * site nobody would call a signup. If the token is on their home page as well, the HTML alone
 * cannot say the signup is gated, and the sentence has to say so rather than imply a wall.
 *
 *   npm run audit-captcha credited   # the control: rows we credit must come back clean
 *   npm run audit-captcha accused    # the 28 rows, each with its own site-wide control
 *
 * The signatures are copied from the scanner on purpose rather than imported: a probe that shares
 * the code under test can only ever agree with it. They are the same four tokens, and if the two
 * lists drift, that is a finding this script is supposed to surface rather than hide.
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'
import { AGENT_UA, CONTACT } from '../src/lib/scan/http'

const UA = AGENT_UA
const VENDORS: [string, RegExp][] = [
  ['recaptcha', /recaptcha/i],
  ['hcaptcha', /hcaptcha/i],
  ['turnstile', /turnstile|cf-chl/i],
  ['arkose', /arkoselabs|funcaptcha/i],
]

type Read = { found: string[]; status: number | string; bytes: number }

async function captchasOn(url: string): Promise<Read> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      // The same agent the scanner uses. A page served differently to a browser is a different
      // measurement, and this pass is about reproducing ours rather than somebody else's.
      headers: { 'user-agent': UA, from: CONTACT, accept: 'text/html,application/xhtml+xml' },
    })
    const body = await response.text()
    return {
      found: VENDORS.filter(([, pattern]) => pattern.test(body)).map(([name]) => name),
      status: response.status,
      bytes: body.length,
    }
  } catch (error) {
    return { found: [], status: (error as Error).name === 'AbortError' ? 'timeout' : 'blad sieci', bytes: 0 }
  } finally {
    clearTimeout(timer)
  }
}

const mode = process.argv[2] === 'credited' ? 'credited' : 'accused'
const store = getStore()

type Target = { domain: string; site: string; signup: string; ours: string[] }
const targets: Target[] = []
for (const domain of CURATED_DOMAINS) {
  const report = await store.latestForDomain(domain)
  const check = report?.scorecard.checks.find((candidate) => candidate.id === 'signup_no_captcha')
  if (!check || check.inconclusive || check.notApplicable) continue
  if (mode === 'credited' ? check.points === 0 : check.points > 0) continue
  const findings = report!.findings as unknown as { site: string; funnel: { signup: { url: string | null; captcha: string[] } } }
  const signup = findings.funnel.signup.url
  if (!signup) continue
  targets.push({ domain, site: findings.site.replace(/\/$/, ''), signup, ours: findings.funnel.signup.captcha })
}

console.log(`${mode}: ${targets.length} domen\n`)

let disagree = 0
let siteWide = 0
for (const { domain, site, signup, ours } of targets) {
  const onSignup = await captchasOn(signup)
  const hit = onSignup.found.length > 0
  if (mode === 'credited') {
    if (!hit) continue
    disagree += 1
    console.log(`NIEZGODA ${domain.padEnd(20)} ${onSignup.status} znalazlem ${onSignup.found.join(', ')} na stronie, ktorej dajemy punkt  ${signup}`)
    continue
  }
  if (!hit) {
    // Not a refutation on its own: a page that changed since the scan, or one served differently
    // to this machine, looks exactly like a row that was always wrong.
    disagree += 1
    console.log(`NIEZGODA ${domain.padEnd(20)} ${onSignup.status} ${String(onSignup.bytes).padStart(7)}B nie widze ${ours.join(', ') || 'niczego'}  ${signup}`)
    continue
  }
  const onHome = await captchasOn(`${site}/`)
  const everywhere = onSignup.found.filter((vendor) => onHome.found.includes(vendor))
  if (everywhere.length === 0) continue
  siteWide += 1
  console.log(`CALA WITRYNA ${domain.padEnd(18)} ${everywhere.join(', ')} jest tez na stronie glownej, wiec HTML nie dowodzi bramki na formularzu`)
}

console.log(`\n${targets.length} sprawdzonych, ${disagree} niezgodnych${mode === 'accused' ? `, ${siteWide} z tokenem na calej witrynie` : ''}`)
console.log(
  mode === 'credited'
    ? 'kontrolka: niezgoda znaczy, ze widzimy CAPTCHE tam, gdzie publikujemy, ze jej nie ma'
    : 'oskarzenia: niezgoda znaczy, ze tokenu tam nie ma. CALA WITRYNA znaczy, ze token jest, ale nie mowi nic o tym formularzu',
)
process.exit(0)
