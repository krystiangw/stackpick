/**
 * Twenty-second adversarial pass: `oauth_dcr`, 94 published accusations against 68 credits, and no
 * documented pass over it until now.
 *
 * The sentence we publish is "No OAuth metadata on any of the N hosts probed, including the usual
 * auth and api subdomains". The scanner reaches those hosts by guessing subdomains from a list of
 * six, plus the site, plus the origin of the signup URL, plus the origin of any MCP endpoint it
 * found. That is a good list and it is still a guess, so this asks the two questions a guess
 * invites:
 *
 *   1. Is the authorization server on a host nobody would guess? A vendor on Auth0, WorkOS, Clerk
 *      or Kinde issues tokens from the identity provider's domain, and no amount of guessing
 *      <prefix>.<vendor>.com reaches tenant.auth0.com. The way to find it is not to guess at all:
 *      follow the login link and see where the browser is actually sent.
 *   2. Is it on a subdomain outside the six? identity, sso, signin, account, token and idp are all
 *      in use, and each one we do not ask becomes a sentence saying they publish nothing.
 *
 * The control runs the same probe over the rows we credit. If it cannot re-find the metadata we
 * awarded a point for, the probe is broken and nothing it says about the accused counts. That
 * order is deliberate: on the entry-point pass the control caught two defects in the probe itself
 * before a single accusation was read.
 *
 *   npx tsx scripts/audit-oauth.mts credited   # must find what we credit
 *   npx tsx scripts/audit-oauth.mts accused    # a hit is a false accusation of ours
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'

const UA = 'LetAgentsIn/1.0 (+https://letagentsin.com/methodology)'
const PATHS = [
  '/.well-known/oauth-authorization-server',
  '/.well-known/oauth-protected-resource',
  '/.well-known/openid-configuration',
]
/**
 * The scanner's own six and one, then twelve more.
 *
 * The first version listed only the twelve, on the reasoning that the scanner already covers the
 * rest. The control refused it immediately: 43 of the 68 rows we credit could not be reproduced,
 * because their metadata lives on exactly the hosts I had left out. A probe that audits a
 * measurement has to be able to make that measurement first, and only then reach further.
 */
const SCANNER_GUESSES = ['auth', 'login', 'accounts', 'id', 'oauth', 'api', 'mcp']
const WIDER = ['identity', 'sso', 'signin', 'account', 'token', 'idp', 'authn', 'secure', 'my', 'console', 'app', 'dashboard']
/** Hosts that are somebody else's authorization server, so a redirect landing here is the answer. */
const IDENTITY_PROVIDERS =
  /\.(auth0\.com|okta\.com|oktapreview\.com|workos\.com|clerk\.accounts\.dev|kinde\.com|descope\.com|stytch\.com|logto\.app|fusionauth\.io|onelogin\.com|pingidentity\.com|frontegg\.com|authkit\.app|supertokens\.io)$/i

type Hit = { url: string; registration: boolean }

async function metadataAt(url: string): Promise<Hit | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 9000)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'user-agent': UA, accept: 'application/json' },
    })
    if (!response.ok) return null
    const body = (await response.text()).slice(0, 20000)
    const parsed = JSON.parse(body) as Record<string, unknown>
    // The document has to be the document. A site that answers every .json path with its shell
    // parses as nothing, and one that answers with an unrelated object has no issuer in it.
    if (typeof parsed.issuer !== 'string' && typeof parsed.authorization_servers === 'undefined') return null
    return { url, registration: typeof parsed.registration_endpoint === 'string' }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function metadataOn(origin: string): Promise<Hit[]> {
  const found: Hit[] = []
  for (const path of PATHS) {
    const hit = await metadataAt(`${origin}${path}`)
    if (hit) found.push(hit)
  }
  return found
}

/**
 * Where a browser ends up when it starts to log in. This is the half the scanner cannot guess:
 * the redirect chain names the authorization server itself, whoever operates it.
 */
async function loginLandsOn(candidates: string[]): Promise<string[]> {
  const origins = new Set<string>()
  for (const candidate of candidates) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 9000)
    try {
      const response = await fetch(candidate, {
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'user-agent': UA, accept: 'text/html' },
      })
      const landed = new URL(response.url).origin
      if (landed) origins.add(landed)
      // An SPA does the redirect in JavaScript, so the identity provider is often only named in
      // the HTML: a script src, a form action, or an authorize URL in the bootstrap config.
      const body = (await response.text()).slice(0, 200000)
      for (const match of body.matchAll(/https:\/\/[a-z0-9.-]+\.[a-z]{2,}(?=[/"'\s])/gi)) {
        const host = new URL(match[0]).hostname
        if (IDENTITY_PROVIDERS.test(host)) origins.add(`https://${host}`)
      }
    } catch {
      /* a login page we cannot reach is not evidence either way */
    } finally {
      clearTimeout(timer)
    }
  }
  return [...origins]
}

const mode = process.argv[2] === 'credited' ? 'credited' : 'accused'
const store = getStore()

type Target = { domain: string; site: string; signup: string | null; probedHosts: number }
const targets: Target[] = []
for (const domain of CURATED_DOMAINS) {
  const report = await store.latestForDomain(domain)
  const check = report?.scorecard.checks.find((candidate) => candidate.id === 'oauth_dcr')
  if (!check || check.inconclusive || check.notApplicable) continue
  const wanted = mode === 'credited' ? check.points > 0 : check.points === 0
  if (!wanted) continue
  const findings = report!.findings as unknown as {
    site: string
    discovered?: { signup?: string | null }
    funnel: { oauth: { probedHosts: number } }
  }
  targets.push({
    domain,
    site: findings.site,
    signup: findings.discovered?.signup ?? null,
    probedHosts: findings.funnel.oauth.probedHosts,
  })
}

console.log(`${mode}: ${targets.length} domen\n`)

let disagree = 0
let withRegistration = 0
for (const { domain, site, signup, probedHosts } of targets) {
  const bare = domain.replace(/^www\./, '')
  const guessed = [...SCANNER_GUESSES, ...WIDER].map((prefix) => `https://${prefix}.${bare}`)
  const followed = await loginLandsOn(
    [signup, `${site}/login`, `${site}/signin`, `${site}/sign-in`].filter((url): url is string => Boolean(url)),
  )
  const origins = [...new Set([site, ...followed, ...guessed])]
  const hits = (await Promise.all(origins.map(metadataOn))).flat()
  const hit = hits.length > 0
  const expected = mode === 'credited' ? hit : !hit
  if (expected) continue
  disagree += 1
  if (hits.some((found) => found.registration)) withRegistration += 1
  const shown = hits
    .map((found) => `${found.url}${found.registration ? ' [registration_endpoint]' : ''}`)
    .slice(0, 3)
    .join(' | ')
  console.log(`NIEZGODA ${domain.padEnd(20)} sondowalismy ${probedHosts} hostow  ${shown || 'nie znalazlem metadanych, ktore zaliczamy'}`)
}

console.log(`\n${targets.length} sprawdzonych, ${disagree} niezgodnych`)
if (mode === 'accused') {
  console.log(`z tego z registration_endpoint (czyli punkt, ktorego nie przyznalismy): ${withRegistration}`)
  console.log('oskarzenia: niezgoda znaczy, ze metadane jednak sa, a my opublikowalismy ich brak')
} else {
  console.log('kontrolka: niezgoda znaczy, ze sonda nie widzi metadanych, za ktore dajemy punkt')
}
process.exit(0)
