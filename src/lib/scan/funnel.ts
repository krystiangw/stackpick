import { fetchUrl, fetchWithRetries, inParallel, isRealTextFile, looksLikeHtml, visibleTextLength } from './http'

export const AGENT_ENTRY_PATHS = [
  '/agent-signup.md',
  '/skill.md',
  '/agents.md',
  '/agent.md',
  '/ai.txt',
  '/.well-known/agent-access.json',
  '/.well-known/mcp.json',
  '/.well-known/agent.json',
  '/.well-known/ai-plugin.json',
]

/**
 * Bare vendor tokens, not CDN hostnames. Stripe's signup carries "show_hcaptcha":true in the
 * server HTML and never mentions hcaptcha.com until JS runs, so hostname matching awarded a
 * point for the exact gate this check exists to find.
 */
const CAPTCHA_SIGNATURES: Record<string, RegExp> = {
  recaptcha: /recaptcha/i,
  hcaptcha: /hcaptcha/i,
  turnstile: /turnstile|cf-chl/i,
  arkose: /arkoselabs|funcaptcha/i,
}

const PROVISIONING_PATTERNS = [
  /management api/i,
  /provisioning api/i,
  /account api/i,
  /create an? api[- ]key/i,
  /programmatically create/i,
  /service account/i,
  /\/v\d+\/api[-_]keys/i,
]

const SELF_SERVE_PATTERNS = [
  /no credit card/i,
  /free tier/i,
  /free plan/i,
  /start for free/i,
  /free forever/i,
  /\$0(?:\.00)?\b/,
  /\bhobby\b/i,
  /\bstarter\b/i,
  /\bget started free\b/i,
  /\btry (?:it )?free\b/i,
]

export const PROVISIONING_PATTERN_COUNT = PROVISIONING_PATTERNS.length

export type SignupFindings = {
  url: string | null
  status: number
  statusesSeen: number[]
  consistent: boolean
  reachable: boolean
  rendersFormWithoutJs: boolean
  captcha: string[]
  behindCloudflare: boolean
  socialOauth: string[]
}

export type FunnelFindings = {
  entryPaths: Record<string, boolean>
  entryPointsFound: string[]
  oauth: { metadataPublished: boolean; dynamicClientRegistration: boolean }
  signup: SignupFindings
  provisioning: { programmatic: string[]; selfServeSignals: string[] }
  mentionsCli: boolean
  /** True when the site answers unknown paths with real text, making entry probes meaningless. */
  servesCatchAll: boolean
  pricingFetched: boolean
}

async function probeOauthDcr(site: string) {
  const got = await fetchUrl(`${site}/.well-known/oauth-authorization-server`, { accept: 'application/json' })
  if (!got.ok || looksLikeHtml(got)) return { metadataPublished: false, dynamicClientRegistration: false }
  try {
    const metadata = JSON.parse(got.body) as { registration_endpoint?: string }
    return { metadataPublished: true, dynamicClientRegistration: Boolean(metadata.registration_endpoint) }
  } catch {
    return { metadataPublished: false, dynamicClientRegistration: false }
  }
}

async function inspectSignup(url: string | null): Promise<SignupFindings> {
  if (!url) {
    return {
      url: null,
      status: 0,
      statusesSeen: [],
      consistent: true,
      reachable: false,
      rendersFormWithoutJs: false,
      captcha: [],
      behindCloudflare: false,
      socialOauth: [],
    }
  }
  const got = await fetchWithRetries(url)
  const body = got.body.toLowerCase()
  return {
    url,
    status: got.status,
    statusesSeen: got.statusesSeen,
    consistent: got.consistent,
    reachable: got.ok,
    rendersFormWithoutJs: body.includes('<form'),
    captcha: Object.entries(CAPTCHA_SIGNATURES)
      .filter(([, pattern]) => pattern.test(body))
      .map(([name]) => name),
    behindCloudflare: 'cf-ray' in got.headers || (got.headers.server ?? '').toLowerCase().includes('cloudflare'),
    socialOauth: ['github', 'google', 'gitlab', 'microsoft'].filter((p) => body.includes(p) && body.includes('oauth')),
  }
}

/** Greps visible text only: a JSON changelog blob inside a <script> once scored 2 of 16 points. */
function matching(patterns: RegExp[], html: string): string[] {
  const text = html
    .replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
  return patterns.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source)
}

/**
 * Some sites answer any unknown path with a real markdown or JSON document. Without a control
 * probe every entry path "exists" and the site scores full marks on fabricated evidence.
 */
async function servesCatchAllText(site: string): Promise<boolean> {
  const [markdown, json] = await Promise.all([
    fetchUrl(`${site}/stackpick-control-probe-8f3a1c.md`, { accept: 'text/markdown, text/plain' }),
    fetchUrl(`${site}/.well-known/stackpick-control-probe-8f3a1c.json`, { accept: 'application/json' }),
  ])
  return isRealTextFile(markdown, 30) || isRealTextFile(json, 30)
}

export async function scanFunnel(
  site: string,
  corpus: string,
  pricingUrl: string | null,
  signupUrl: string | null,
): Promise<FunnelFindings> {
  const catchAll = await servesCatchAllText(site)
  const entries = await inParallel(AGENT_ENTRY_PATHS, async (path) => {
    if (catchAll) return [path, false] as const
    const got = await fetchUrl(`${site}${path}`, { accept: 'text/markdown, application/json, text/plain' })
    return [path, isRealTextFile(got, 30)] as const
  })

  const [oauth, signup, pricingPage] = await Promise.all([
    probeOauthDcr(site),
    inspectSignup(signupUrl),
    pricingUrl ? fetchUrl(pricingUrl) : Promise.resolve(null),
  ])

  const entryPaths = Object.fromEntries(entries)
  const pricingText = pricingPage?.ok && visibleTextLength(pricingPage.body) > 0 ? pricingPage.body : ''

  return {
    entryPaths,
    entryPointsFound: entries.filter(([, hit]) => hit).map(([path]) => path),
    oauth,
    signup,
    provisioning: {
      programmatic: matching(PROVISIONING_PATTERNS, corpus),
      selfServeSignals: matching(SELF_SERVE_PATTERNS, pricingText),
    },
    mentionsCli: /\b(npx|cli install|command line interface)\b/i.test(corpus),
    servesCatchAll: catchAll,
    pricingFetched: Boolean(pricingPage?.ok),
  }
}
