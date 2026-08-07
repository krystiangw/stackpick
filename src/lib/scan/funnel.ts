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

const CAPTCHA_SIGNATURES: Record<string, string[]> = {
  recaptcha: ['recaptcha', 'gstatic.com/recaptcha'],
  hcaptcha: ['hcaptcha.com'],
  turnstile: ['challenges.cloudflare.com/turnstile', 'cf-turnstile'],
  arkose: ['arkoselabs', 'funcaptcha'],
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

const SELF_SERVE_PATTERNS = [/no credit card/i, /free tier/i, /free plan/i, /start for free/i, /free forever/i]

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
      .filter(([, needles]) => needles.some((needle) => body.includes(needle)))
      .map(([name]) => name),
    behindCloudflare: 'cf-ray' in got.headers || (got.headers.server ?? '').toLowerCase().includes('cloudflare'),
    socialOauth: ['github', 'google', 'gitlab', 'microsoft'].filter((p) => body.includes(p) && body.includes('oauth')),
  }
}

function matching(patterns: RegExp[], text: string): string[] {
  return patterns.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source)
}

export async function scanFunnel(
  site: string,
  corpus: string,
  pricingUrl: string | null,
  signupUrl: string | null,
): Promise<FunnelFindings> {
  const entries = await inParallel(AGENT_ENTRY_PATHS, async (path) => {
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
  }
}
