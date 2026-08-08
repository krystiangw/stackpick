import { AGENT_UA, fetchUrl, fetchWithRetries, inParallel, isRealTextFile, looksLikeHtml, stripCodeBlocks, visibleTextLength, type Fetched } from './http'

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

/**
 * The seven ways a vendor says an agent can make its own credentials. Each one covers the words
 * for a credential rather than one spelling of it: LaunchDarkly documents creating an access
 * token at /docs/api/access-tokens and never writes "api key" on the page, and a rule that only
 * knew that spelling read their API reference as silence.
 */
const CREDENTIAL = String.raw`(?:api[- ]?key|api[- ]?token|access[- ]token|personal[- ]access[- ]token|service[- ]account|auth[- ]token|secret[- ]key)`

const PROVISIONING_PATTERNS = [
  /management api/i,
  /provisioning api/i,
  /account api/i,
  new RegExp(String.raw`creat(?:e|ing) (?:an?|your|a new|new|the)?\s*${CREDENTIAL}`, 'i'),
  /programmatically create/i,
  /service account/i,
  new RegExp(String.raw`/v\d+/(?:api[-_]keys|access[-_]tokens)`, 'i'),
]

/** Only signals that actually mean "an agent can finish without a human or a card". */
const SELF_SERVE_PATTERNS = [
  /no credit card/i,
  /(?<!no )free tier/i,
  /(?<!no )free plan/i,
  /start for free/i,
  /free forever/i,
  /\$0(?:\.00)?(?![.\d])/,
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
}

export type McpEndpoint = { url: string; status: number; evidence: 'challenges' | 'rejects-get' | 'answers-json' }

export type FunnelFindings = {
  entryPaths: Record<string, boolean>
  entryPointsFound: string[]
  oauth: {
    metadataPublished: boolean
    dynamicClientRegistration: boolean
    probedHosts: number
    /** Named so the vendor can rerun exactly what we ran instead of taking "we looked" on trust. */
    probedOrigins?: string[]
  }
  /** Live MCP endpoints, as opposed to documentation that mentions MCP. */
  mcpEndpoints: McpEndpoint[]
  signup: SignupFindings
  provisioning: { programmatic: string[]; selfServeSignals: string[] }
  /** True when the site answers unknown paths with real text, making entry probes meaningless. */
  servesCatchAll: boolean
  pricingFetched: boolean
  /** True when repeated fetches of the pricing page did not carry the same self-serve wording. */
  pricingTriesDisagreed: boolean
  /** Null when no pricing page was found, false when one exists and shows no prices to a plain fetch. */
  pricesVisibleWithoutJs: boolean | null
}

const OAUTH_METADATA_PATHS = [
  '/.well-known/oauth-authorization-server',
  '/.well-known/oauth-protected-resource',
  '/.well-known/openid-configuration',
]

/**
 * Authorization servers live on their own host, and until the corpus was published as data we
 * could not see how much that cost us: this check was unmeasurable on 37 of 51 domains, every
 * one of them a domain with no MCP endpoint to follow. Probing one origin is not a search.
 */
const AUTH_SUBDOMAINS = ['auth', 'login', 'accounts', 'id', 'oauth']
const RESOURCE_SUBDOMAINS = ['api']

type OauthTarget = { origin: string; paths: string[] }
type OauthProbe = { metadataPublished: boolean; dynamicClientRegistration: boolean; origins: string[] }

async function probeOauthOrigins(targets: OauthTarget[]): Promise<OauthProbe> {
  const origins = targets.map((target) => target.origin)
  const probes = targets.flatMap((target) => target.paths.map((path) => `${target.origin}${path}`))
  const results = await inParallel(probes, (url) => fetchUrl(url, { accept: 'application/json' }))

  let metadataPublished = false
  for (const got of results) {
    if (!got.ok || looksLikeHtml(got)) continue
    try {
      const metadata = JSON.parse(got.body) as {
        registration_endpoint?: string
        issuer?: string
        authorization_endpoint?: string
      }
      if (!metadata.issuer && !metadata.authorization_endpoint) continue
      metadataPublished = true
      if (metadata.registration_endpoint) {
        return { metadataPublished: true, dynamicClientRegistration: true, origins }
      }
    } catch {
      /* a JSON body that is not JSON tells us nothing */
    }
  }
  return { metadataPublished, dynamicClientRegistration: false, origins }
}

/**
 * Probing only the apex told Linear to build an RFC 7591 endpoint it already runs, at
 * mcp.linear.app. The authorization server for an agent almost never lives on the marketing
 * host, so we follow the MCP host too, and admit it when we simply did not find one.
 *
 * Split in two because only the second half depends on the MCP probe: the apex, the signup
 * host and the subdomains an authorization server conventionally sits on are all known before
 * a single MCP address has been tried, and waiting for one to start the other cost a full
 * round of probes in series.
 */
function oauthTargetsKnownUpFront(domain: string, site: string, signupUrl: string | null): OauthTarget[] {
  const signupOrigin = signupUrl ? new URL(signupUrl).origin : null
  const named = [...new Set([site, ...(signupOrigin ? [signupOrigin] : [])])]
  // Cheaper on the subdomains we are guessing at: an auth host publishes authorization-server
  // metadata, a resource host publishes protected-resource metadata, and neither publishes both.
  const guessed: OauthTarget[] = [
    ...AUTH_SUBDOMAINS.map((prefix) => ({
      origin: `https://${prefix}.${domain}`,
      paths: ['/.well-known/oauth-authorization-server', '/.well-known/openid-configuration'],
    })),
    ...RESOURCE_SUBDOMAINS.map((prefix) => ({
      origin: `https://${prefix}.${domain}`,
      paths: ['/.well-known/oauth-protected-resource', '/.well-known/oauth-authorization-server'],
    })),
  ].filter((candidate) => !named.includes(candidate.origin))

  return [...named.map((origin) => ({ origin, paths: OAUTH_METADATA_PATHS })), ...guessed]
}

function mergeOauthProbes(first: OauthProbe, second: OauthProbe): FunnelFindings['oauth'] {
  const origins = [...new Set([...first.origins, ...second.origins])]
  return {
    metadataPublished: first.metadataPublished || second.metadataPublished,
    dynamicClientRegistration: first.dynamicClientRegistration || second.dynamicClientRegistration,
    probedHosts: origins.length,
    probedOrigins: origins,
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
    }
  }
  // As the agent, because that is what the finding says. Sending Chrome and then publishing
  // "the signup answers N to a non-browser request" was a claim about a request we never made,
  // and it cost liveblocks.io a point on a page that answers 200 with a real form to StackPick/1.0.
  const got = await fetchWithRetries(url, { ua: AGENT_UA })
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
/**
 * The card names the server; we used to guess at it instead. sentry.io and telnyx.com both publish
 * /.well-known/mcp.json with an `endpoint` field, we never dereferenced it, and both were told
 * "a card is a claim about a server, not a server" while their servers answered a handshake.
 * Contentful's sits at mcp.contentful.com/mcp, where we probed the host and the path but never
 * the two together, and Inngest's at api.inngest.com/mcp.
 */
async function cardEndpoints(site: string): Promise<string[]> {
  const card = await fetchUrl(`${site}/.well-known/mcp.json`, { accept: 'application/json' })
  if (!card.ok) return []
  try {
    const parsed = JSON.parse(card.body) as {
      endpoint?: string
      url?: string
      transport?: { url?: string }
      servers?: { endpoint?: string; url?: string }[]
    }
    const named = [
      parsed.endpoint,
      parsed.url,
      parsed.transport?.url,
      ...(parsed.servers ?? []).flatMap((server) => [server.endpoint, server.url]),
    ]
    return named.filter((url): url is string => typeof url === 'string' && /^https:\/\//.test(url))
  } catch {
    return []
  }
}

async function probeMcpEndpoints(domain: string, site: string): Promise<McpEndpoint[]> {
  const fromCard = await cardEndpoints(site)
  const candidates = [
    ...fromCard,
    `https://mcp.${domain}`,
    `https://mcp.${domain}/mcp`,
    `https://api.${domain}/mcp`,
    `${site}/mcp`,
  ].filter((url, index, all) => all.indexOf(url) === index)
  const [results, control] = await Promise.all([
    inParallel(candidates, (url) =>
      // An MCP server speaks JSON-RPC over POST; a GET tells us far less and is what made us
      // read a live server as absent when its GET handler differed from its POST handler.
      fetchUrl(url, {
        accept: 'application/json, text/event-stream',
        method: 'POST',
        body: '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"StackPick","version":"1.0"}}}',
      }),
    ),
    fetchUrl(`https://mcp-stackpick-control-8f3a1c.${domain}`, { accept: 'application/json' }),
  ])
  // A wildcard host behind an auth proxy answers 401 to anything, including a name nobody
  // registered. Then every domain would "run an MCP server".
  const answersAnything = control.status === 401 || control.status === 405 || control.ok

  // A handshake that comes back with a protocol version is proof no wildcard can fake, so it
  // outranks the control probe. Without it, contentful.com's wildcard hid a server that answers.
  const completesHandshake = (body: string) =>
    /"protocolVersion"|"serverInfo"/.test(body) && /"jsonrpc"|"result"/.test(body)

  return results
    .map((got, index) => {
      if (completesHandshake(got.body)) {
        return { url: candidates[index], status: got.status, evidence: 'answers-json' as const }
      }
      // The wildcard probe only discredits addresses we guessed. An address the vendor named in
      // its own card is not a guess, and sentry.io's card points at another domain entirely.
      if (answersAnything && !fromCard.includes(candidates[index])) return null
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

export type FunnelInput = {
  domain: string
  site: string
  /**
   * The documentation prose to grep. A promise, because it is the one input none of the
   * network work below needs: waiting for the docs crawl to finish before opening a single
   * socket put the two longest phases of the scan end to end for no reason.
   */
  corpus: Promise<string>
  pricingUrl: string | null
  signupUrl: string | null
  alreadyFetchedPricing?: Fetched | null
  pricesVisibleWithoutJs?: boolean | null
}

export async function scanFunnel({
  domain,
  site,
  corpus,
  pricingUrl,
  signupUrl,
  alreadyFetchedPricing = null,
  pricesVisibleWithoutJs = null,
}: FunnelInput): Promise<FunnelFindings> {
  const mcpPending = probeMcpEndpoints(domain, site)
  const oauthKnownPending = probeOauthOrigins(oauthTargetsKnownUpFront(domain, site, signupUrl))
  const signupPending = inspectSignup(signupUrl)
  const pricingPending = alreadyFetchedPricing ?? (pricingUrl ? fetchUrl(pricingUrl) : Promise.resolve(null))
  const catchAllPending = servesCatchAllText(site)

  // The entry probes are the one thing that has to wait: on a site that answers every unknown
  // path they prove nothing, and firing them anyway would be nine requests spent to learn that.
  const catchAll = await catchAllPending
  const entriesPending = inParallel(AGENT_ENTRY_PATHS, async (path) => {
    if (catchAll) return [path, false] as const
    const got = await fetchUrl(`${site}${path}`, { accept: 'text/markdown, application/json, text/plain' })
    return [path, isRealTextFile(got, 30)] as const
  })

  const mcpEndpoints = await mcpPending
  const mcpOrigins = [...new Set(mcpEndpoints.map((endpoint) => new URL(endpoint.url).origin))]
  const alreadyProbed = new Set((await oauthKnownPending).origins)
  const [oauthKnown, oauthFromMcp, entries, signup, pricingPage] = await Promise.all([
    oauthKnownPending,
    probeOauthOrigins(
      mcpOrigins.filter((origin) => !alreadyProbed.has(origin)).map((origin) => ({ origin, paths: OAUTH_METADATA_PATHS })),
    ),
    entriesPending,
    signupPending,
    pricingPending,
  ])
  const oauth = mergeOauthProbes(oauthKnown, oauthFromMcp)

  // supertokens.com answered the same URL with and without its free-tier wording forty minutes
  // apart, which moved a scored point. Pricing pages are assembled and cached like any other
  // page, so one fetch is a sample. Reading it again and taking the union of what was stated
  // is the same rule the door test already follows, applied to content instead of status.
  const pricingRetry = pricingPage?.ok && pricingUrl ? await fetchUrl(pricingUrl, { fresh: true }) : null

  const entryPaths = Object.fromEntries(entries)
  const firstPricingText = pricingPage?.ok && visibleTextLength(pricingPage.body) > 0 ? pricingPage.body : ''
  const retryText = pricingRetry?.ok && visibleTextLength(pricingRetry.body) > 0 ? pricingRetry.body : ''
  const pricingText = retryText ? `${firstPricingText}\n${retryText}` : firstPricingText

  return {
    entryPaths,
    entryPointsFound: entries.filter(([, hit]) => hit).map(([path]) => path),
    oauth,
    mcpEndpoints,
    signup,
    provisioning: {
      programmatic: matching(PROVISIONING_PATTERNS, await corpus),
      selfServeSignals: matching(SELF_SERVE_PATTERNS, pricingText),
    },
    servesCatchAll: catchAll,
    pricingFetched: Boolean(pricingPage?.ok),
    pricesVisibleWithoutJs,
    pricingTriesDisagreed:
      retryText.length > 0 &&
      matching(SELF_SERVE_PATTERNS, firstPricingText).length !== matching(SELF_SERVE_PATTERNS, retryText).length,
  }
}
