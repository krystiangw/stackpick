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
 *
 * RESULT, 2026-08-16, and the accuracy bound that goes with it. The pass refuted nothing: five
 * candidate disagreements, all five mine on inspection. api.video serves one email input with no
 * name and no action, which is a shell JavaScript wires up later; browserless.io's only form holds
 * three consent checkboxes; lemonsqueezy.com answers 800 bytes and no form at all; rollbar.com
 * serves an unnamed text input, a search box; payloadcms.com an email field on a "get started"
 * page. The check's sentence stands on every row it was possible to examine.
 *
 * The bound matters as much as the result. This detector is not accurate enough to settle the
 * question on its own, and tuning it further would turn it into a copy of the code under test,
 * which is the one thing it must not be. Loose, it reads search boxes as signups (control 41/42).
 * Strict, it misses real ones (control 39/42: docuseal.com and deepl.com, both genuinely
 * credited). Treat a disagreement as a lead to inspect by hand, never as a verdict.
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'

const UA = 'LetAgentsIn/1.0 (+https://letagentsin.com/methodology)'

type Verdict = 'form' | 'oauth-only' | 'nothing' | 'unreachable'

/**
 * A form an agent could use to create an account, found without borrowing the scanner's parser.
 *
 * The first version of this counted any non-hidden input inside any form, and it reported five
 * false accusations that were all mine: rollbar.com serves one unnamed text input with no action,
 * which is a search box, and payloadcms.com serves an email field on a "get started" page. Both
 * are forms; neither is a way in. A credential form says so - it carries a password field, or it
 * carries an identifier field and posts somewhere that names the act.
 */
function readableForm(html: string): { fields: number; forms: number } {
  const forms = [...html.matchAll(/<form\b[\s\S]*?<\/form>/gi)]
  let fields = 0
  for (const form of forms) {
    const action = (form[0].match(/action\s*=\s*["']([^"']*)/i)?.[1] ?? '').toLowerCase()
    const postsToAnAccount = /regist|signup|sign-up|sign_up|join|create|account|login|signin|sign-in|auth/.test(action)
    let identifiers = 0
    let passwords = 0
    for (const input of form[0].matchAll(/<input\b([^>]*)>/gi)) {
      const attrs = input[1].toLowerCase()
      if (/type\s*=\s*["']?(hidden|submit|button|image|search)/.test(attrs)) continue
      if (/type\s*=\s*["']?password/.test(attrs)) passwords += 1
      else if (/type\s*=\s*["']?email|name\s*=\s*["']?(email|username|user|login)\b/.test(attrs)) identifiers += 1
    }
    if (passwords > 0 || (identifiers > 0 && postsToAnAccount)) fields += passwords + identifiers
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

const targets: { domain: string; url: string; saysJs: boolean }[] = []
for (const domain of CURATED_DOMAINS) {
  const report = await store.latestForDomain(domain)
  const check = report?.scorecard.checks.find((candidate) => candidate.id === 'signup_reachable')
  if (!check || check.inconclusive || check.notApplicable) continue
  // Both no-form sentences on the accused side, since 9.31 splits them. The rows saying something
  // else are about rate limits and edges, which is a different claim and not what this pass tests.
  const accuses = check.detail.includes('form needs JavaScript') || check.detail.includes('no signup form of its own')
  const wanted = mode === 'credited' ? check.points > 0 : accuses
  if (!wanted) continue
  const url = (report!.findings as unknown as { funnel: { signup: { url: string | null } } }).funnel.signup.url
  if (url) targets.push({ domain, url, saysJs: check.detail.includes('form needs JavaScript') })
}

console.log(`${mode}: ${targets.length} domen\n`)

const tally = new Map<Verdict, number>()
for (const { domain, url, saysJs } of targets) {
  const { verdict, detail } = await inspect(url)
  tally.set(verdict, (tally.get(verdict) ?? 0) + 1)
  const expected = mode === 'credited' ? verdict === 'form' : verdict !== 'form'
  if (!expected) console.log(`NIEZGODA ${domain.padEnd(20)} ${detail}  ${url}`)
  // Misleading only while the published sentence still claims a form. Since 9.31 an
  // oauth-only page is told so, and agreement is not a finding.
  else if (mode === 'accused' && verdict === 'oauth-only' && saysJs) console.log(`ZDANIE MYLI  ${domain.padEnd(18)} ${detail}  ${url}`)
}

console.log(`\n${targets.length} sprawdzonych`)
for (const [verdict, count] of [...tally.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${verdict.padEnd(12)} ${count}`)
console.log(
  mode === 'credited'
    ? 'kontrolka: niezgoda znaczy, ze sonda nie widzi formularza, za ktory dajemy punkt'
    : 'oskarzenia: niezgoda znaczy, ze formularz jednak jest w HTML, ktory serwer wyslal',
)
process.exit(0)
