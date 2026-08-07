import { fetchUrl, fetchWithRetries, inParallel, isRealTextFile, looksLikeHtml, stripCodeBlocks, visibleTextLength, type Fetched } from './http'

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

/** Only signals that actually mean "an agent can finish without a human or a card". */
const SELF_SERVE_PATTERNS = [
  /no credit card/i,
  /free tier/i,
  /free plan/i,
  /start for free/i,
  /free forever/i,
  /\$0(?:\.00)?\b/,
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

export type McpEndpoint = { url: string; status: number; evidence: 'challenges' | 'rejects-get' | 'answers-json' }

export type FunnelFindings = {
  entryPaths: Record<string, boolean>
  entryPointsFound: string[]
  oauth: { metadataPublished: boolean; dynamicClientRegistration: boolean; probedHosts: number }
  /** Live MCP endpoints, as opposed to documentation that mentions MCP. */
  mcpEndpoints: McpEndpoint[]
  signup: SignupFindings
  provisioning: { programmatic: string[]; selfServeSignals: string[] }
  mentionsCli: boolean
  /** True when the site answers unknown paths with real text, making entry probes meaningless. */
  servesCatchAll: boolean
  pricingFetched: boolean
}

const OAUTH_METADATA_PATHS = [
  '/.well-known/oauth-authorization-server',
  '/.well-known/oauth-protected-resource',
  '/.well-known/openid-configuration',
]

/**
 * Probing only the apex told Linear to build an RFC 7591 endpoint it already runs, at
 * mcp.linear.app. The authorization server for an agent almost never lives on the marketing
 * host, so we follow the MCP host too, and admit it when we simply did not find one.
 */
async function probeOauthDcr(site: string, mcpHosts: string[]) {
  const origins = [site, ...mcpHosts]
  const probes = origins.flatMap((origin) => OAUTH_METADATA_PATHS.map((path) => `${origin}${path}`))
  const results = await inParallel(probes, (url) => fetchUrl(url, { accept: 'application/json' }))

  let metadataPublished = false
  for (const got of results) {
    if (!got.ok || looksLikeHtml(got)) continue
    try {
      const metadata = JSON.parse(got.body) as { registration_endpoint?: string }
      metadataPublished = true
      if (metadata.registration_endpoint) {
        return { metadataPublished: true, dynamicClientRegistration: true, probedHosts: origins.length }
      }
    } catch {
      /* a JSON body that is not JSON tells us nothing */
    }
  }
  return { metadataPublished, dynamicClientRegistration: false, probedHosts: origins.length }
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
  const text = stripCodeBlocks(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
  return patterns.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source)
}

/**
 * Some sites answer any unknown path with a real markdown or JSON document. Without a control
 * probe every entry path "exists" and the site scores full marks on fabricated evidence.
 */
async function servesCatchAllText(site: string): Promise<boolean> {
  const [markdown, json, plain] = await Promise.all([
    fetchUrl(`${site}/stackpick-control-probe-8f3a1c.md`, { accept: 'text/markdown, text/plain' }),
    fetchUrl(`${site}/.well-known/stackpick-control-probe-8f3a1c.json`, { accept: 'application/json' }),
    // The .txt arm covers llms.txt, which is scored elsewhere and was unguarded.
    fetchUrl(`${site}/stackpick-control-probe-8f3a1c.txt`, { accept: 'text/plain' }),
  ])
  return isRealTextFile(markdown, 30) || isRealTextFile(json, 30) || isRealTextFile(plain, 30)
}

/**
 * A live MCP server is the only proof that beats prose about MCP. A 401 with a
 * WWW-Authenticate header is the strongest signal there is: something is there and it wants
 * credentials. 405 counts too, since these endpoints answer POST and refuse GET.
 */
async function probeMcpEndpoints(domain: string, site: string): Promise<McpEndpoint[]> {
  const candidates = [`https://mcp.${domain}`, `https://mcp.${domain}/mcp`, `${site}/mcp`]
  const results = await inParallel(candidates, (url) => fetchUrl(url, { accept: 'application/json, text/event-stream' }))

  return results
    .map((got, index) => {
      const authenticating = got.status === 401 && Boolean(got.headers['www-authenticate'])
      const wrongMethod = got.status === 405
      const speaksJson = got.ok && (got.headers['content-type'] ?? '').includes('json')
      if (!authenticating && !wrongMethod && !speaksJson) return null
      return {
        url: candidates[index],
        status: got.status,
        evidence: authenticating ? ('challenges' as const) : wrongMethod ? ('rejects-get' as const) : ('answers-json' as const),
      }
    })
    .filter((endpoint): endpoint is McpEndpoint => endpoint !== null)
}

export async function scanFunnel(
  domain: string,
  site: string,
  corpus: string,
  pricingUrl: string | null,
  signupUrl: string | null,
  alreadyFetchedPricing: Fetched | null = null,
): Promise<FunnelFindings> {
  const catchAll = await servesCatchAllText(site)
  const entries = await inParallel(AGENT_ENTRY_PATHS, async (path) => {
    if (catchAll) return [path, false] as const
    const got = await fetchUrl(`${site}${path}`, { accept: 'text/markdown, application/json, text/plain' })
    return [path, isRealTextFile(got, 30)] as const
  })

  const mcpEndpoints = await probeMcpEndpoints(domain, site)
  const [oauth, signup, pricingPage] = await Promise.all([
    probeOauthDcr(site, mcpEndpoints.map((endpoint) => new URL(endpoint.url).origin)),
    inspectSignup(signupUrl),
    alreadyFetchedPricing ?? (pricingUrl ? fetchUrl(pricingUrl) : Promise.resolve(null)),
  ])

  const entryPaths = Object.fromEntries(entries)
  const pricingText = pricingPage?.ok && visibleTextLength(pricingPage.body) > 0 ? pricingPage.body : ''

  return {
    entryPaths,
    entryPointsFound: entries.filter(([, hit]) => hit).map(([path]) => path),
    oauth,
    mcpEndpoints,
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
