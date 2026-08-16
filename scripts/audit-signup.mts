/**
 * Twenty-third adversarial pass: `signup_reachable`, 88 accusations and no documented pass.
 *
 * 85 of the 88 carry one sentence: "<url> is reachable, but its form needs JavaScript". That is a
 * claim about bytes a server sent, so one request refutes it, and it is also one of the two numbers
 * on the landing page, which makes a wrong one wrong in public.
 *
 * The detector here is deliberately NOT the scanner's `rendersUsableForm`. An audit that imports
 * the code under test agrees with it by construction and proves nothing; this one looks for the
 * same thing by different means, and the two have to agree about the vendors we credit before
 * anything it says about the accused counts.
 *
 * It also splits the accusation, because "needs JavaScript" is not the only way to have no form.
 * A page whose only way in is "Continue with Google" has no form by design, and telling that
 * vendor their form needs JavaScript describes a form they never wrote.
 *
 *   npx tsx scripts/audit-signup.mts credited   # must find a form where we credit one
 *   npx tsx scripts/audit-signup.mts accused    # a form here is a false accusation of ours
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'

const UA = 'LetAgentsIn/1.0 (+https://letagentsin.com/methodology)'

type Verdict = 'form' | 'oauth-only' | 'nothing' | 'unreachable'

/** A field a person could actually type into, found without borrowing the scanner's parser. */
function readableForm(html: string): { fields: number; forms: number } {
  const forms = [...html.matchAll(/<form\b[\s\S]*?<\/form>/gi)]
  let fields = 0
  for (const form of forms) {
    for (const input of form[0].matchAll(/<input\b([^>]*)>/gi)) {
      const attrs = input[1].toLowerCase()
      // Hidden CSRF tokens are not a way in, and every server-rendered form has them.
      if (/type\s*=\s*["']?(hidden|submit|button|image)/.test(attrs)) continue
      fields += 1
    }
    // A password manager fills these too, and some signups use them instead of <input>.
    fields += [...form[0].matchAll(/<(textarea|select)\b/gi)].length
  }
  return { fields, forms: forms.length }
}

/** The other way to have no form: the only door is somebody else's identity provider. */
function oauthOnly(html: string): boolean {
  const text = html.toLowerCase()
  const buttons = /(continue|sign\s*up|sign\s*in|log\s*in)\s*with\s*(google|github|microsoft|apple|gitlab|sso)/.test(text)
  const endpoints = /href\s*=\s*["'][^"']*(oauth|auth\/(google|github|microsoft|sso)|saml)/.test(text)
  return buttons || endpoints
}

async function inspect(url: string): Promise<{ verdict: Verdict; detail: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      // The same agent the scanner sends, because a page served differently to a browser is a
      // different measurement and this pass is about reproducing ours.
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' },
    })
    if (!response.ok) return { verdict: 'unreachable', detail: `${response.status}` }
    const html = await response.text()
    const { fields, forms } = readableForm(html)
    if (fields > 0) return { verdict: 'form', detail: `${forms} form(y), ${fields} pol` }
    if (oauthOnly(html)) return { verdict: 'oauth-only', detail: `${forms} form(y), 0 pol, wejscie przez dostawce tozsamosci` }
    return { verdict: 'nothing', detail: `${forms} form(y), 0 pol, ${html.length} B` }
  } catch (error) {
    return { verdict: 'unreachable', detail: (error as Error).name === 'AbortError' ? 'timeout' : 'blad sieci' }
  } finally {
    clearTimeout(timer)
  }
}

const mode = process.argv[2] === 'credited' ? 'credited' : 'accused'
const store = getStore()

const targets: { domain: string; url: string }[] = []
for (const domain of CURATED_DOMAINS) {
  const report = await store.latestForDomain(domain)
  const check = report?.scorecard.checks.find((candidate) => candidate.id === 'signup_reachable')
  if (!check || check.inconclusive || check.notApplicable) continue
  // Only the one sentence, on the accused side. The three rows saying something else are about
  // rate limits and edges, which is a different claim and not what this pass is testing.
  const wanted = mode === 'credited' ? check.points > 0 : check.detail.includes('form needs JavaScript')
  if (!wanted) continue
  const url = (report!.findings as unknown as { funnel: { signup: { url: string | null } } }).funnel.signup.url
  if (url) targets.push({ domain, url })
}

console.log(`${mode}: ${targets.length} domen\n`)

const tally = new Map<Verdict, number>()
for (const { domain, url } of targets) {
  const { verdict, detail } = await inspect(url)
  tally.set(verdict, (tally.get(verdict) ?? 0) + 1)
  const expected = mode === 'credited' ? verdict === 'form' : verdict !== 'form'
  if (!expected) console.log(`NIEZGODA ${domain.padEnd(20)} ${detail}  ${url}`)
  else if (mode === 'accused' && verdict === 'oauth-only') console.log(`ZDANIE MYLI  ${domain.padEnd(18)} ${detail}  ${url}`)
}

console.log(`\n${targets.length} sprawdzonych`)
for (const [verdict, count] of [...tally.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${verdict.padEnd(12)} ${count}`)
console.log(
  mode === 'credited'
    ? 'kontrolka: niezgoda znaczy, ze sonda nie widzi formularza, za ktory dajemy punkt'
    : 'oskarzenia: niezgoda znaczy, ze formularz jednak jest w HTML, ktory serwer wyslal',
)
process.exit(0)
