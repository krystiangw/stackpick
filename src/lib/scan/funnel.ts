import { AGENT_UA, BROWSER_UA, fetchUrl, fetchWithRetries, inParallel, isRealTextFile, looksLikeHtml, stripCodeBlocks, visibleTextLength, type Fetched } from './http'

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
  /\bno card\b/i,
  /(?<!no )free tier/i,
  /(?<!no )free plan/i,
  // A trial an agent can start is an answer to this check whether or not the page states its
  // length. Demanding the day count read as "no free tier" on four vendors that offer one:
  // elastic.co says "Start free trial" and sendlayer.com "free trial (send up to 200 emails)",
  // and both let an agent finish in the session it started.
  /\bfree trial\b/i,
  /\bfree account\b/i,
  // Separator-tolerant, because the wording varies and the meaning does not: signoz.io writes
  // "Get Started - Free", here.com and elastic.co "get started for free".
  /\bget started\b[\s-]*(?:for\s+)?free\b/i,
  /\bstarted? for free\b/i,
  /free forever/i,
  /forever free/i,
  /\$0(?:\.00)?(?![.\d])/,
  /\btry (?:it )?free\b/i,
  // A recurring allowance is a free tier by another name: agora.io grants the first 10,000
  // minutes free every month and was published as having no free tier.
  /\bfree every month\b/i,
  // Substance rather than chrome: openrouter.ai's tier is a row of free models, and no button
  // anywhere says "free credits".
  /\bfree\s+(?:models|credits|usage|allowance|minutes|requests)\b/i,
  /free and open[- ]source/i,
  // The row of a pricing table, where the tier is named and the price is the word Free.
  // polar.sh writes "Starter Free", saleor.io "Sandboxes Forever Free", pusher.com
  // "Sandbox Free", and none of them says the words "free tier" anywhere on the page.
  /\b(?:starter|sandbox|hobby|developer|basic|community|open[- ]source)\b[^.\n]{0,24}\bfree\b/i,
  /\bfree\s+\w+\s+plan\b/i,
]

/**
 * The subset of the wording above that is a button rather than a statement. "Get started for
 * free" is what a navigation bar says; "10,000 free minutes a month" and "Free Tier Free forever"
 * are what a page says about its tiers. The distinction decides one thing only: whether a hit on
 * a page that prints no price is evidence about the vendor or about their navigation. here.com
 * serves the first kind and nothing else, daily.co and qdrant.tech serve the second.
 */
export const CTA_WORDING = new Set(
  [/\bget started\b[\s-]*(?:for\s+)?free\b/i, /\bstarted? for free\b/i, /\btry (?:it )?free\b/i].map(
    (pattern) => pattern.source,
  ),
)

// Weighted rather than a bare list of types, which reads to a strict server as a demand:
// plausible.io answers 406 to "text/markdown, application/json, text/plain" and savvycal.com
// answers 500, and we counted both as refusals of nine paths that return nine clean 404s. With
// a catch-all at lower weight both answer honestly and a real file still arrives as markdown.
// Per suffix, because asking for markdown is how we stopped seeing a JSON file. sentry.io
// content-negotiates: ask it for text/markdown and every path answers with the same 976 byte
// markdown page, including /.well-known/mcp.json, which is really 106 bytes of JSON naming
// their MCP server. We were handed a catch-all because we asked for one.
const entryAccept = (path: string) =>
  path.endsWith('.json')
    ? 'application/json;q=1, text/plain;q=0.8, */*;q=0.5'
    : 'text/markdown, text/plain;q=0.9, */*;q=0.5'

/**
 * What separates a file an agent can act on from one that only states a policy: something to
 * authenticate with, somewhere to send a request, or a way to get an account. Deliberately
 * generous, because the check is about whether the file was written for a machine at all.
 */
const PROCEDURE_SIGNALS =
  /api[- ]?key|api[- ]?token|access[- ]token|service[- ]token|service[- ]account|credential|bearer|authorization|endpoint|curl |POST https?:|sign[- ]?up|register|base[- ]?url/i

function describesAProcedure(body: string): boolean {
  return body.trim().length >= 400 && PROCEDURE_SIGNALS.test(body)
}

export const PROVISIONING_PATTERN_COUNT = PROVISIONING_PATTERNS.length

/**
 * The same seven rules in the words a vendor can search their own documentation for. Published
 * on the methodology page: a verdict that says "1 of 7 phrases" and never says which seven is
 * not a published rule, and it is the heaviest check on the card.
 */
export const PROVISIONING_PATTERN_LABELS = [
  'management api',
  'provisioning api',
  'account api',
  'create an api key, api token, access token, personal access token, service account, auth token or secret key',
  'programmatically create',
  'service account',
  'a documented path like /v1/api_keys or /v2/access-tokens',
]

export type SignupFindings = {
  url: string | null
  status: number
  statusesSeen: number[]
  consistent: boolean
  reachable: boolean
  rendersFormWithoutJs: boolean
  captcha: string[]
  behindCloudflare: boolean
  /**
   * What a browser user-agent got at the same URL, asked only when the agent was refused. The
   * finding is that agents are treated worse than browsers, and without this number it was not
   * a comparison: anvil.co/signup is a 404 to everybody, their signup lives on another host, and
   * we published "answers 404 to a request identifying itself as an agent" about a page that
   * answers 200 to one.
   */
  browserStatus: number | null
}

/**
 * A form an agent could actually fill in, rather than the tag. app.hygraph.com/signup serves
 * `<form method="post" action="/login"></form>`: an empty element with no field in it, and the
 * whole check is whether an agent finds something to submit. Testing for the opening tag scored
 * that as a signup rendering without JavaScript, on the one page where being wrong is worst.
 */
function rendersUsableForm(body: string): boolean {
  for (const form of body.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)) {
    const fields = [...form[2].matchAll(/<(?:input|select|textarea)\b[^>]*>/gi)].map((field) => field[0])
    const asksWhoYouAre = fields.filter(isFillable).some(identifiesTheCaller)
    const canBeSubmitted =
      /\saction\s*=/i.test(form[1]) || [...form[2].matchAll(/<button\b[^>]*>/gi)].some((button) => isFillable(button[0]))
    if (asksWhoYouAre && canBeSubmitted) return true
  }
  return false
}

/**
 * A field that asks who is signing up, as opposed to one that asks anything at all. Counting
 * fillable fields was not an approximation of a signup: browserless.io's only form is a cookie
 * banner whose two consent checkboxes cleared the count while its email input sits outside every
 * form element, and payloadcms.com's is a footer newsletter box.
 */
function identifiesTheCaller(tag: string): boolean {
  const type = tag.match(/\btype\s*=\s*["']?([a-z]+)/i)?.[1]?.toLowerCase()
  if (type === 'email' || type === 'password') return true
  if (type !== undefined && type !== 'text') return false
  return /\b(?:name|id)\s*=\s*["']?[^"'>]*(?:email|e-mail|user|login|password)/i.test(tag)
}

/**
 * A field a caller could put a value in. Counting every input tag on the page, rather than the
 * ones inside a form and available, passed a site search box (commercetools.com/get-started), a
 * footer newsletter box with a disabled submit (payloadcms.com) and a form whose only input is
 * itself disabled while the consent checkbox sits outside it (dashboard.api.video/register).
 * A hidden CSRF token and a submit button are not fields anyone fills in either.
 */
function isFillable(tag: string): boolean {
  // Attribute names only. Tailwind writes `disabled:opacity-50` inside a class value, and reading
  // the bare word there marked every styled input as unavailable: supabase.com, resend.com and
  // browserless.io all lost real signup forms to it, which is worse than the false positives the
  // rule exists to stop.
  const attributes = tag.replace(/=\s*"[^"]*"/g, '=""').replace(/=\s*'[^']*'/g, "=''")
  if (/(?:^|\s)disabled(?=[\s=>/])/i.test(attributes)) return false
  const type = tag.match(/\btype\s*=\s*["']?([a-z]+)/i)?.[1]?.toLowerCase()
  return type === undefined || !['hidden', 'submit', 'button', 'image', 'reset'].includes(type)
}

export type McpEndpoint = { url: string; status: number; evidence: 'challenges' | 'rejects-get' | 'answers-json' }

/** Whether unknown paths answer with a real document, asked once per file type we probe. */
export type CatchAll = {
  markdown: boolean
  json: boolean
  /** Asked as text/plain, which is how llms.txt is fetched. */
  text: boolean
  /** Asked the way the entry probes ask, which is markdown first. */
  entryText?: boolean
  /** What an unregistered path in each namespace answered with, in bytes. */
  bodyLengths?: { markdown: number; json: number; text: number }
}

export type FunnelFindings = {
  entryPaths: Record<string, boolean>
  entryPointsFound: string[]
  /**
   * Of those, the ones that read as a procedure rather than a declaration. inngest.com scored
   * the full two points for a 583 byte ai.txt whose entire content is Allow-AI-Training: yes,
   * which is a permissions policy in the shape of robots.txt and tells an agent nothing about
   * how to get in. Existence of a file was never the thing worth two points.
   */
  entryPointsWithProcedure: string[]
  /**
   * How many of the nine paths answered with a refusal rather than a 200 or a 404. A WAF that
   * turns our data centre away cannot produce "you publish none of these": bitmovin.com serves
   * a real 9.6 kB skill.md and answers 403 to most of our requests, intermittently.
   */
  entryPathsRefused?: number
  oauth: {
    metadataPublished: boolean
    dynamicClientRegistration: boolean
    probedHosts: number
    /** Named so the vendor can rerun exactly what we ran instead of taking "we looked" on trust. */
    probedOrigins?: string[]
  }
  /** Live MCP endpoints, as opposed to documentation that mentions MCP. */
  mcpEndpoints: McpEndpoint[]
  /** Whether the endpoint probe got an answer, as opposed to never reaching a host. */
  mcpProbed: boolean
  signup: SignupFindings
  provisioning: { programmatic: string[]; selfServeSignals: string[] }
  /** True when the site answers unknown paths with real text, making entry probes meaningless. */
  servesCatchAll: boolean
  /** The same question per namespace, because one does not imply another. */
  catchAll?: CatchAll
  pricingFetched: boolean
  /** True when repeated fetches of the pricing page did not carry the same self-serve wording. */
  pricingTriesDisagreed: boolean
  /** Null when no pricing page was found, false when one exists and shows no prices to a plain fetch. */
  pricesVisibleWithoutJs: boolean | null
  /**
   * Visible characters the pricing page served. What separates a page of navigation from a page
   * that states its tiers in words: here.com/pricing is 850 characters of nav and a button, while
   * qdrant.tech/pricing is 6,934 characters naming four tiers and a quantified forever-free one,
   * and neither page prints a number our price pattern recognises.
   */
  pricingTextLength: number
  /**
   * True when the pricing page was larger than we read. posthog.com/pricing and cal.com/pricing
   * both exceed the cap and carry their tiers past it, so "no free tier wording" was a claim
   * about the part of the page we happened to hold.
   */
  pricingTruncated: boolean
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
// mcp is here rather than only behind a found endpoint: datadoghq.com and contentful.com both
// publish a registration_endpoint on mcp.<domain> while our MCP probe concluded nothing answers
// there, so the host that had the answer was the one host we never asked.
const RESOURCE_SUBDOMAINS = ['api']
/**
 * The authorization-server document is where datadoghq.com and contentful.com publish the
 * registration_endpoint we were missing, and the protected-resource document is where
 * chargebee.com and logto.io name the server that actually holds it. Asking only the first
 * left two identity vendors reading that they publish no OAuth metadata anywhere.
 */
const MCP_OAUTH_PATHS = ['/.well-known/oauth-authorization-server', '/.well-known/oauth-protected-resource']

type OauthTarget = { origin: string; paths: string[] }
type OauthProbe = {
  metadataPublished: boolean
  dynamicClientRegistration: boolean
  origins: string[]
  /** The document that carried the registration endpoint, so the verdict can name it. */
  registrationAt?: string
}

/**
 * RFC 9728 makes a protected resource point at the authorization servers that guard it, and both
 * chargebee.com and logto.io publish that pointer on mcp.<domain> while the server itself is
 * somewhere else entirely. Following it is the difference between "no OAuth metadata anywhere",
 * which is what we told two identity vendors, and reading the document they wrote for us.
 */
function serversNamedIn(body: string): string[] {
  try {
    const named = (JSON.parse(body) as { authorization_servers?: unknown }).authorization_servers
    if (!Array.isArray(named)) return []
    return named.filter((url): url is string => typeof url === 'string' && /^https:\/\//.test(url)).slice(0, 3)
  } catch {
    return []
  }
}

/**
 * An issuer with a path keeps its metadata under a path-suffixed well-known, not at the root of
 * the host: chargebee's sits at /.well-known/oauth-authorization-server/mcp. Both forms are
 * asked because deployments in the wild use both.
 */
function metadataUrlsFor(issuer: string): string[] {
  try {
    const url = new URL(issuer)
    const path = url.pathname.replace(/\/$/, '')
    const roots = ['/.well-known/oauth-authorization-server', '/.well-known/openid-configuration']
    return [
      ...roots.map((root) => `${url.origin}${root}`),
      // Both conventions are in the wild: chargebee keeps the path after the well-known segment
      // and logto keeps it before, at auth.logto.io/oidc/.well-known/openid-configuration.
      ...(path ? roots.map((root) => `${url.origin}${root}${path}`) : []),
      ...(path ? roots.map((root) => `${url.origin}${path}${root}`) : []),
    ]
  } catch {
    return []
  }
}

async function probeOauthOrigins(targets: OauthTarget[]): Promise<OauthProbe> {
  const origins = targets.map((target) => target.origin)
  const probes = targets.flatMap((target) => target.paths.map((path) => `${target.origin}${path}`))
  const firstPass = await inParallel(probes, (url) => fetchUrl(url, { accept: 'application/json' }))

  const followed = [
    ...new Set(
      firstPass
        .filter((got) => got.ok && !looksLikeHtml(got))
        .flatMap((got) => serversNamedIn(got.body))
        .flatMap(metadataUrlsFor),
    ),
  ].filter((url) => !probes.includes(url))
  const results = [
    ...firstPass,
    ...(followed.length > 0 ? await inParallel(followed, (url) => fetchUrl(url, { accept: 'application/json' })) : []),
  ]

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
        return {
          metadataPublished: true,
          dynamicClientRegistration: true,
          origins,
          registrationAt: metadata.registration_endpoint,
        }
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
      // openid-configuration too: polar.sh publishes its registration_endpoint there and
      // nowhere else, and we told them they publish no OAuth metadata at all.
      paths: [
        '/.well-known/oauth-protected-resource',
        '/.well-known/oauth-authorization-server',
        '/.well-known/openid-configuration',
      ],
    })),
  ].filter((candidate) => !named.includes(candidate.origin))

  return [
    ...named.map((origin) => ({ origin, paths: OAUTH_METADATA_PATHS })),
    ...guessed,
    ...(named.includes(`https://mcp.${domain}`)
      ? []
      : [{ origin: `https://mcp.${domain}`, paths: MCP_OAUTH_PATHS }]),
  ]
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
      browserStatus: null,
    }
  }
  // As the agent, because that is what the finding says. Sending Chrome and then publishing
  // "the signup answers N to a non-browser request" was a claim about a request we never made,
  // and it cost liveblocks.io a point on a page that answers 200 with a real form to StackPick/1.0.
  const got = await fetchWithRetries(url, { ua: AGENT_UA })
  // One request, and only when there is a difference worth measuring.
  const asBrowser = got.ok ? null : await fetchUrl(url, { ua: BROWSER_UA })
  const body = got.body.toLowerCase()
  return {
    url,
    browserStatus: asBrowser === null ? null : asBrowser.status,
    status: got.status,
    statusesSeen: got.statusesSeen,
    consistent: got.consistent,
    reachable: got.ok,
    rendersFormWithoutJs: rendersUsableForm(body),
    captcha: Object.entries(CAPTCHA_SIGNATURES)
      .filter(([, pattern]) => pattern.test(body))
      .map(([name]) => name),
    behindCloudflare: 'cf-ray' in got.headers || (got.headers.server ?? '').toLowerCase().includes('cloudflare'),
  }
}

/** Greps visible text only: a JSON changelog blob inside a <script> once scored 2 of 16 points. */
/**
 * Returns the matched rule in the words it is published in, not its regex source. The verdict
 * quotes these back to the vendor, and one of the seven is an alternation forty characters long.
 */
function matching(patterns: RegExp[], html: string, labels?: string[]): string[] {
  const text = stripCodeBlocks(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
  return patterns
    .map((pattern, index) => (pattern.test(text) ? (labels?.[index] ?? pattern.source) : null))
    .filter((label): label is string => label !== null)
}

/**
 * Some sites answer any unknown path with a real markdown or JSON document. Without a control
 * probe every entry path "exists" and the site scores full marks on fabricated evidence.
 */
/**
 * Per namespace, because a catch-all in one is not a catch-all in another. sentry.io answers any
 * .md path with the same 976 byte page and answers an unknown .txt with a redirect to its HTML
 * login screen, so the .md arm was suppressing a real llms.txt that is served as text/plain.
 * Same for agora.io. Both earned a point and both were told the file proved nothing.
 */
async function servesCatchAllText(site: string): Promise<CatchAll> {
  // The same Accept the entry probes send, per suffix. They diverged, and that is how a control
  // asking for text/plain saw sentry.io's 20 kB HTML while /ai.txt asking for markdown saw their
  // 976 byte catch-all, so the control did not recognise the page it exists to recognise.
  const [markdown, json, plain, plainAsEntry] = await Promise.all([
    fetchUrl(`${site}/stackpick-control-probe-8f3a1c.md`, { accept: entryAccept('.md') }),
    fetchUrl(`${site}/.well-known/stackpick-control-probe-8f3a1c.json`, { accept: entryAccept('.json') }),
    // Twice, because two checks read this arm and they do not ask the same way. llms.txt is
    // fetched as text/plain, and agora.io answers an unknown .txt path with 240 kB of HTML to
    // that header and 26 kB of markdown to the entry probe's header. One boolean for both
    // suppressed a genuine 8,857 byte llms.txt on the strength of a page it is nothing like.
    fetchUrl(`${site}/stackpick-control-probe-8f3a1c.txt`, { accept: 'text/plain' }),
    fetchUrl(`${site}/stackpick-control-probe-8f3a1c.txt`, { accept: entryAccept('.txt') }),
  ])
  return {
    markdown: isRealTextFile(markdown, 30),
    json: isRealTextFile(json, 30),
    text: isRealTextFile(plain, 30),
    entryText: isRealTextFile(plainAsEntry, 30),
    // Kept for a direct comparison, because the boolean above is not enough on its own:
    // sentry.io answers every .md path with the same 20,402 byte HTML page, which our control
    // correctly discards as HTML and which then discredits nothing. A file that comes back the
    // same size as a path nobody registered is that page, whatever its content type says.
    bodyLengths: {
      markdown: markdown.body.length,
      json: json.body.length,
      text: plainAsEntry.body.length,
    },
  }
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

/**
 * Whether the probe reached an answer at all, kept separately from what it found. Silence about
 * MCP inside a file we had to cut short only matters when nothing else settled the question, and
 * on eleven of the twelve rows that published that excuse the probe had already settled it: the
 * host does not resolve, or it answers a path nobody registered exactly the same way.
 */
type McpProbe = { endpoints: McpEndpoint[]; answered: boolean }

/** Whether the handshake was forwarded to another origin, which no MCP server does to its own POST. */
function leftTheEndpoint(asked: string, landed: string): boolean {
  try {
    return new URL(asked).origin !== new URL(landed).origin
  } catch {
    return false
  }
}

async function probeMcpEndpoints(domain: string, site: string): Promise<McpProbe> {
  const fromCard = await cardEndpoints(site)
  const candidates = [
    ...fromCard,
    `https://mcp.${domain}`,
    `https://mcp.${domain}/mcp`,
    // Versioned, because three vendors answer only there and we published all three as having
    // no server: contentful.com, datadoghq.com and deepl.com all challenge with a
    // WWW-Authenticate header at mcp.<domain>/v1/mcp while the bare host 404s. On two of them
    // the OAuth check was reading metadata off the very host this one called dead.
    `https://mcp.${domain}/v1/mcp`,
    `https://api.${domain}/mcp`,
    `${site}/mcp`,
  ].filter((url, index, all) => all.indexOf(url) === index)
  const handshake = {
    accept: 'application/json, text/event-stream',
    method: 'POST' as const,
    body: '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"StackPick","version":"1.0"}}}',
  }
  // Nearly every site answers 405 to a POST at a path it does not route, so "405 at /mcp" was
  // evidence of nothing and we published it as a live server on 18 domains. The control is the
  // same request at a path nobody registered, on the same origin, so the only thing that counts
  // is /mcp answering differently from the rest of the site.
  const controlPath = '/mcp-stackpick-control-8f3a1c'
  const [results, control] = await Promise.all([
    inParallel(candidates, (url) =>
      // An MCP server speaks JSON-RPC over POST; a GET tells us far less and is what made us
      // read a live server as absent when its GET handler differed from its POST handler.
      fetchUrl(url, handshake),
    ),
    // The handshake, not a GET, because a control only discredits a candidate it was asked the
    // same way as. datadoghq.com's edge answers an unregistered subdomain 401 to a GET and 404
    // to this POST, so the GET arm declared a wildcard that the candidates never met and threw
    // away the 401 at mcp.datadoghq.com/v1/mcp, a live server, on the strength of it.
    fetchUrl(`https://mcp-stackpick-control-8f3a1c.${domain}`, handshake),
  ])
  // A wildcard host behind an auth proxy answers 401 to anything, including a name nobody
  // registered. Then every domain would "run an MCP server".
  const wildcardAnswers = control.status === 401 || control.status === 405 || control.ok
  // Only against candidates that answered the same way it did. As one boolean over every status
  // it discarded mcp.chargebee.com, which challenges with a WWW-Authenticate Bearer naming its
  // own oauth-protected-resource, because an unregistered host on the same domain answered a
  // POST with 405. A wildcard proves nothing about a status it did not itself return.
  const discreditedByWildcard = (got: Fetched) => wildcardAnswers && got.status === control.status

  // A handshake that comes back with a protocol version is proof no wildcard can fake, so it
  // outranks the control probe. Without it, contentful.com's wildcard hid a server that answers.
  /**
   * Kept separate so the discard rule above and the evidence rule below cannot drift apart.
   *
   * An HTML body is the tell. Without a WWW-Authenticate header, mcp.sentry.io answers 6,698
   * bytes of Cloudflare interstitial and mcp.cloudinary.com 372 bytes of the same shape, while
   * a server that wants credentials answers in the protocol it speaks: contentful.com sends 79
   * bytes of JSON and datadoghq.com 27. We were reading a bot wall as an invitation.
   */
  const dedicatedHostChallenge = (got: Fetched, url: string) =>
    (got.status === 401 || got.status === 403) &&
    new URL(url).hostname.startsWith('mcp.') &&
    (Boolean(got.headers['www-authenticate']) || !looksLikeHtml(got))

  const completesHandshake = (body: string) =>
    /"protocolVersion"|"serverInfo"/.test(body) && /"jsonrpc"|"result"/.test(body)

  // Only for addresses the control could still discredit. Probing every origin up front cost
  // three more requests against the same per-site concurrency cap, and on telnyx.com that
  // starved the handshake that proves their server is real: a live MCP endpoint read as absent.
  const needsControl = [
    ...new Set(
      candidates
        .filter((url, index) => {
          const got = results[index]
          if (got.status === 0 || completesHandshake(got.body)) return false
          return !discreditedByWildcard(got) || fromCard.includes(url)
        })
        .map((url) => new URL(url).origin),
    ),
  ]
  const controls = await inParallel(needsControl, (origin) => fetchUrl(`${origin}${controlPath}`, handshake))
  const nonsenseStatus = new Map(needsControl.map((origin, index) => [origin, controls[index].status]))

  const endpoints = results
    .map((got, index) => {
      if (completesHandshake(got.body)) {
        return { url: got.url, status: got.status, evidence: 'answers-json' as const }
      }
      // The wildcard probe only discredits addresses we guessed. An address the vendor named in
      // its own card is not a guess, and sentry.io's card points at another domain entirely.
      if (discreditedByWildcard(got) && !fromCard.includes(candidates[index])) return null
      const authenticating = got.status === 401 && Boolean(got.headers['www-authenticate'])
      // An unrouted path answering the same way means the answer was about the site, not about
      // MCP. Exempting the auth challenge is deliberate: a host that gates every path behind
      // OAuth is what an MCP server looks like, and mcp.sentry.dev is exactly that, while its
      // WWW-Authenticate header is something a marketing site's 405 never carries.
      if (!authenticating && !dedicatedHostChallenge(got, candidates[index]) && got.status === nonsenseStatus.get(new URL(candidates[index]).origin)) return null
      // A page that only serves GET says so in Allow, and it answers a POST with its own HTML
      // error. firecrawl.dev, honeybadger.io, posthog.com and scrapingbee.com were all published
      // as running a server at a marketing or docs page on that 405, while their real endpoint
      // was one path away. An unrouted path 404s and a landing page 405s, so "different from the
      // control" can never separate the two on status alone.
      //
      // The third shape is the one that survived both those rules: mcp.firecrawl.dev sends the
      // handshake on to docs.firecrawl.dev/mcp-server, which answers 405 as JSON and carries no
      // Allow header at all. A server does not forward its own JSON-RPC POST to somebody else's
      // origin, so a probe that ended up on another origin is reading a documentation page.
      const wrongMethod =
        got.status === 405 &&
        !looksLikeHtml(got) &&
        !/\bGET\b/i.test(got.headers['allow'] ?? '') &&
        !leftTheEndpoint(candidates[index], got.url)
      const speaksJson = got.ok && (got.headers['content-type'] ?? '').includes('json')
      // A 401 that an unrouted path on the same origin does not get. contentful.com and
      // datadoghq.com both answer their MCP path with {"error":"invalid_token"} and answer a
      // path nobody registered with 404, which is a routed endpoint asking for credentials,
      // but neither sends WWW-Authenticate, so all three shapes above missed them.
      const origin = new URL(candidates[index]).origin
      // A host called mcp.<domain> exists because somebody built one. When every path on it
      // demands credentials, that is what an MCP server behind OAuth looks like, which is the
      // exemption mcp.sentry.dev already had through its WWW-Authenticate header. contentful.com
      // answers {"error":"invalid_token"} on every path of mcp.contentful.com and sends no such
      // header, and we published them as having no server while our own OAuth check was reading
      // metadata off that very host.
      const dedicatedHost = dedicatedHostChallenge(got, candidates[index])
      const demandsCredentials =
        (got.status === 401 || got.status === 403) &&
        !looksLikeHtml(got) &&
        (dedicatedHost || got.status !== nonsenseStatus.get(origin))
      if (!authenticating && !wrongMethod && !speaksJson && !demandsCredentials) return null
      return {
        // The address that answered, not the one we asked. pinecone.io/mcp is a redirect stub
        // and www.pinecone.io/mcp is the server, and a vendor checking our sentence has to be
        // able to send the same request we did.
        url: got.url,
        status: got.status,
        evidence:
          authenticating || demandsCredentials
            ? ('challenges' as const)
            : wrongMethod
              ? ('rejects-get' as const)
              : ('answers-json' as const),
      }
    })
    .filter((endpoint): endpoint is McpEndpoint => endpoint !== null)
  // The bare host first was naming a gateway's generic 401 as the server: mcp.newrelic.com
  // answers 401 at the root and the routed endpoint is one path down. A path somebody had to
  // register is better evidence than a host somebody had to point at us.
  const routedFirst = [...endpoints].sort(
    (a, b) => Number(new URL(a.url).pathname === '/') - Number(new URL(b.url).pathname === '/'),
  )
  // A status of zero is a host that never answered, which is the one case where we genuinely
  // found nothing out rather than found nothing.
  return { endpoints: routedFirst, answered: results.some((got) => got.status !== 0) }
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
  const probeEntry = inParallel(AGENT_ENTRY_PATHS, async (path) => {
    // The namespace verdict no longer short-circuits the probe. sentry.io publishes a real 106
    // byte /.well-known/mcp.json and answers unknown paths in that namespace with a 20,402 byte
    // page shell, so "this namespace serves everything" threw away a file that is nothing like
    // what it serves. The body comparison below is the test that can tell them apart.
    const got = await fetchUrl(`${site}${path}`, { accept: entryAccept(path) })
    const controlLength = path.endsWith('.json')
      ? catchAll.bodyLengths?.json
      : path.endsWith('.txt')
        ? catchAll.bodyLengths?.text
        : catchAll.bodyLengths?.markdown
    const sameAsNonsense = controlLength !== undefined && controlLength > 0 && got.body.length === controlLength
    const present = !sameAsNonsense && isRealTextFile(got, 30)
    const refused = got.status >= 400 && got.status !== 404
    return [path, present, present && describesAProcedure(got.body), got.body, refused] as const
  })

  /**
   * A body served at more than one of these paths is the site's shell, whatever the control
   * probe happened to land on. sentry.io answers /ai.txt and every other path with the same 976
   * byte markdown page, and returns it or a 20 kB HTML page depending on the request, so a
   * single control sample can miss it. Two of our own probes agreeing is proof by itself.
   */
  const entriesPending = probeEntry.then((probed) => {
    const seenBodies = new Map<string, number>()
    for (const [, present, , body] of probed) {
      if (present) seenBodies.set(body, (seenBodies.get(body) ?? 0) + 1)
    }
    return probed.map(([path, present, procedure, body, refused]) => {
      const shared = present && (seenBodies.get(body) ?? 0) > 1
      return [path, present && !shared, procedure && !shared, refused] as const
    })
  })

  const mcp = await mcpPending
  const mcpEndpoints = mcp.endpoints
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

  const entryPaths = Object.fromEntries(entries.map(([path, hit]) => [path, hit]))
  const entryPathsRefused = entries.filter(([, , , refused]) => refused).length
  const firstPricingText = pricingPage?.ok && visibleTextLength(pricingPage.body) > 0 ? pricingPage.body : ''
  const retryText = pricingRetry?.ok && visibleTextLength(pricingRetry.body) > 0 ? pricingRetry.body : ''
  const pricingText = retryText ? `${firstPricingText}\n${retryText}` : firstPricingText
  const pricingTruncated = Boolean(pricingPage?.truncated) || Boolean(pricingRetry?.truncated)

  return {
    entryPaths,
    entryPointsFound: entries.filter(([, hit]) => hit).map(([path]) => path),
    entryPointsWithProcedure: entries.filter(([, , procedure]) => procedure).map(([path]) => path),
    entryPathsRefused,
    oauth,
    mcpEndpoints,
    mcpProbed: mcp.answered,
    signup,
    provisioning: {
      programmatic: matching(PROVISIONING_PATTERNS, await corpus, PROVISIONING_PATTERN_LABELS),
      selfServeSignals: matching(SELF_SERVE_PATTERNS, pricingText),
    },
    servesCatchAll: catchAll.markdown || catchAll.json || catchAll.text,
    catchAll,
    pricingFetched: Boolean(pricingPage?.ok),
    pricesVisibleWithoutJs,
    pricingTextLength: firstPricingText ? visibleTextLength(firstPricingText) : 0,
    pricingTruncated,
    pricingTriesDisagreed:
      retryText.length > 0 &&
      matching(SELF_SERVE_PATTERNS, firstPricingText).length !== matching(SELF_SERVE_PATTERNS, retryText).length,
  }
}
