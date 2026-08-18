import { fetchUrl, inParallel, isRealTextFile, looksLikeHtml, registrableDomain, visibleTextLength, withoutTags, DOCS_SHELL_FLOOR, type Fetched , stripCodeBlocks } from './http'
import { fetchPackageFacts } from './npm'
import { rendersUsableForm } from './funnel'

export type NpmSource = 'site' | 'docs' | 'llms' | 'registry-search'
export type LinkSource = 'site' | 'llms-txt' | 'fallback-path' | 'subdomain'

/**
 * Where the name we were asked about actually landed, when that is somebody else's registrable
 * name. sendgrid.com serves www.twilio.com/en-us/sendgrid, and every page the scan then reads is
 * Twilio's: the two rows in our own corpus shared ten of fourteen sentences, down to the
 * character count of the documentation. Measuring the parent is still the most useful thing we
 * can do - that is where the docs are - but it is a finding about the name we were given, and
 * the scorecard has to say whose site the numbers came off.
 */
export type ResolvedElsewhere = { requestedDomain: string; finalUrl: string; finalDomain: string }

export type Discovered = {
  site: string
  home: Fetched
  /** Null when the home page stayed on the domain we were asked about, which is nearly always. */
  resolvedElsewhere: ResolvedElsewhere | null
  docs: string | null
  pricing: string | null
  signup: string | null
  /** The pages whose served HTML was searched for a way in, so the sentence can name them. */
  signupSearched: string[]
  docsPage: Fetched | null
  pricingPage: Fetched | null
  /** Null when no pricing page was found at all, false when one exists but shows no prices. */
  pricesVisibleWithoutJs: boolean | null
  /** Set when a pricing path we asked for redirected somewhere that is not one, so we can say so. */
  pricingRedirectedAway: { asked: string; landedAt: string } | null
  npmPackage: string | null
  npmSource: NpmSource | null
  /**
   * Set only for a registry search, and only ever 'strong': a search now returns a package
   * whose maintainers or GitHub org show it is the vendor's, or it returns nothing. There is
   * no hypothesis left to report, and reporting one meant telling a vendor their own package
   * was not clearly theirs.
   */
  npmConfidence: 'strong' | null
  /**
   * What a searched name rests on, kept so a verdict can ask before it accuses. Null when we did
   * not search: a package the vendor named on their own page needs none of this.
   */
  npmOwnership: 'proved' | 'suggested' | null
  npmSaysWhose: boolean | null
  npmRivals: number | null
  /** Whether the matched package looks like the one a developer installs. */
  npmEntryShape: boolean | null
  githubRepo: string | null
  /** Where each URL came from, so a report can admit when it guessed. */
  linkSources: { docs: LinkSource | null; pricing: LinkSource | null; signup: LinkSource | null }
}

/**
 * llms.txt exists precisely so a machine does not have to guess. Reading it for discovery
 * before falling back to link-scraping is the whole point of the file; scoring a site for
 * publishing one and then ignoring its contents was the sharpest defect in the first audit.
 */
function linksFromLlmsTxt(body: string, base: string): { url: string; label: string }[] {
  const found: { url: string; label: string }[] = []
  for (const match of body.matchAll(/\[([^\]]{1,120})\]\((https?:\/\/[^\s)]+)\)/g)) {
    found.push({ label: match[1].toLowerCase(), url: match[2] })
  }
  for (const match of body.matchAll(/^\s*-?\s*(https?:\/\/\S+)\s*$/gm)) {
    found.push({ label: '', url: match[1] })
  }
  void base
  return found
}

function pickFromLlms(entries: { url: string; label: string }[], hints: RegExp[], labelHints: RegExp[]): string | null {
  for (const hint of labelHints) {
    const hit = entries.find((entry) => hint.test(entry.label))
    if (hit) return hit.url.split('#')[0]
  }
  for (const hint of hints) {
    const hit = entries.find((entry) => hint.test(entry.url))
    if (hit) return hit.url.split('#')[0]
  }
  return null
}

const DOCS_HINTS = [/\/docs?(\/|$)/i, /\/documentation/i, /^https?:\/\/docs\./i, /\/developers?(\/|$)/i, /\/api-reference/i]
// Tried before the generic ones: a help centre and an API reference both live under /docs.
const DEVELOPER_HINTS = [
  /^https?:\/\/(developer|developers|api|apidocs)\./i,
  /\/developers?(\/|$)/i,
  /\/api-reference/i,
  /\/reference(\/|$)/i,
  /\/api(\/|$)/i,
]
const PRICING_HINTS = [/\/pricing/i, /\/plans(\/|$)/i]
export const SIGNUP_HINTS = [
  /\/sign[_-]?up/i,
  // Not anchored on a trailing slash: elastic.co puts its account behind /serverless-registration,
  // and `register_free` is a whole word Rails writes that `\/register(\/|$)` cannot see.
  /\/register(_|-|\/|$)/i,
  /registration(\/|\?|$)/i,
  /\/create[_-]account/i,
  // The other word order, which is what Rails scaffolds and what porkbun.com uses.
  /\/accounts?\/(create|new)(\/|\?|$)/i,
  /\/users?\/(new|register)/i,
  // A trial page is a signup with a marketing name on it. datadoghq.com serves a real form in
  // the HTML at /free-datadog-trial/ while its /signup is an application shell, so the vendor
  // has the thing we say they lack and we were looking at the wrong address. Only followed from
  // links we already hold: guessing these as paths costs every scan two requests and, measured
  // across all 88 failing rows, found nothing.
  /\/(free[_-])?trial(\/|$)/i,
  /\/free[_-][a-z0-9-]+[_-]trial/i,
  /\/join(\/|$)/i,
  /\/get[_-]started/i,
]

const DOCS_FALLBACKS = ['/docs', '/documentation', '/developers']
const PRICING_FALLBACKS = ['/pricing', '/plans']
const SIGNUP_FALLBACKS = ['/signup', '/sign-up', '/register']

// Large vendors put the two pages an agent needs on their own hosts, and their marketing
// nav is often rendered by JavaScript, so neither the links nor the fallback paths find
// them. Scoring stripe.com as having no documentation was measuring our crawler.
//
// api.<domain> is asked last and only when nothing else answered: it is the guess least likely
// to be documentation and the one most likely to resolve and then accept no connection, which
// costs the full request timeout.
const DOCS_SUBDOMAINS = ['docs', 'developers', 'developer']
const LAST_RESORT_DOCS_SUBDOMAINS = ['api']
const SIGNUP_SUBDOMAINS = ['app', 'dashboard', 'dash', 'console', 'accounts', 'cloud', 'auth', 'login']

export function normalizeDomain(input: string): string {
  const trimmed = input.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/^www\./i, '')
  // 253 is the longest a fully qualified name can be, so anything past it is noise or an attack.
  if (trimmed.length > 253) throw new Error('Not a valid domain')
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(trimmed)) {
    throw new Error('Not a valid domain')
  }
  return trimmed.toLowerCase()
}

/** Attribute values arrive escaped, so a raw href turns &amp; into a literal in the query. */
function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&#x2F;/gi, '/')
}

function absolutize(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString()
  } catch {
    return null
  }
}

function extractLinks(html: string, base: string): string[] {
  const links: string[] = []
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)) {
    const absolute = absolutize(decodeEntities(match[1]), base)
    if (absolute?.startsWith('http')) links.push(absolute)
  }
  return links
}

/**
 * How much a page reads like developer documentation rather than a help centre. Picking the
 * first href matching /docs sent us to cloudinary.com/documentation/figma_integration and
 * to linear.app/docs, a user help centre, then scored the vendor on what was not there.
 */
function developerSignals(body: string): number {
  const text = body.toLowerCase()
  const signals = [
    /<code|<pre/gi,
    /\bcurl\b/gi,
    /\bapi key\b/gi,
    /\bauthorization:/gi,
    /\bendpoint\b/gi,
    /\bnpm install\b/gi,
    /\bbearer\b/gi,
  ]
  return signals.reduce((sum, pattern) => sum + (text.match(pattern)?.length ?? 0), 0)
}

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase()
  } catch {
    return ''
  }
}

const originOf = (url: string): string => {
  try {
    return new URL(url).origin
  } catch {
    return ''
  }
}

/** The first label of a host: the part a vendor chooses to say what sits there. */
const hostLabel = (url: string): string => hostOf(url).split('.')[0]

/** A path segment without the extension, so /pricing.md and /pricing are the same word. */
const bareSegment = (segment: string) => segment.replace(/\.(md|html?|txt|json|xml)$/i, '').toLowerCase()

function pathSegments(url: string): string[] {
  try {
    return new URL(url).pathname.split('/').filter(Boolean).map(bareSegment)
  } catch {
    return []
  }
}

/**
 * Path segments plus the route in a hash fragment, which is the whole address on an app that
 * routes client side: app.storyblok.com/#/signup and app.harness.io/auth/#/signup are both
 * links a vendor writes as their signup, and stripping the fragment leaves the app's front door.
 */
function routeSegments(url: string): string[] {
  try {
    const parsed = new URL(url)
    const route = parsed.hash.startsWith('#/') ? parsed.hash.slice(1) : ''
    return [...parsed.pathname.split('/'), ...route.split('/')].filter(Boolean).map(bareSegment)
  } catch {
    return []
  }
}

/** Keeps a route fragment, because it is the page; drops an anchor, because it is a scroll position. */
/**
 * Parameters a marketing team puts on its own links, which are not part of the address.
 *
 * Twelve of the eighty-five signup failures we published named a URL carrying the vendor's own
 * analytics: `?ref=nav`, `?utm_source=split_io&utm_medium=nav_bar`, `?_gl=1*k2v2l9*_gcl_au*...`,
 * `?cta=Get+Started&cta_page=%2F`. The verdict was true and unreproducible at the same time,
 * because a vendor checking it is handed back a tracking link from their own navigation and
 * reasonably concludes we do not know what we measured. Stripped before the fetch, not after, so
 * that the address we test is the address we print.
 */
const CAMPAIGN_PARAM = /^(utm_\w+|mtm_\w+|ref|referrer|source|cta|cta_page|pg|plcmt|aid|sitelocation|gclid|fbclid|msclkid|_gl|_ga|hsa_\w+|campaign)$/i

const withoutCampaignParams = (url: string): string => {
  try {
    const parsed = new URL(url)
    let dropped = false
    for (const key of [...parsed.searchParams.keys()]) {
      if (!CAMPAIGN_PARAM.test(key)) continue
      parsed.searchParams.delete(key)
      dropped = true
    }
    // A single-page route carries its own query behind the hash, where searchParams cannot see
    // it: split.io's signup is app.harness.io/auth/#/signup?module=fme&utm_source=split_io.
    const [route, hashQuery] = parsed.hash.split('?')
    if (hashQuery) {
      const kept = hashQuery
        .split('&')
        .filter((pair) => !CAMPAIGN_PARAM.test(pair.split('=')[0]))
        .join('&')
      if (kept !== hashQuery) {
        parsed.hash = kept ? `${route}?${kept}` : route
        dropped = true
      }
    }
    // Rebuilt from the parsed URL only when something was dropped, because the round trip
    // re-encodes parameters a vendor wrote by hand and a rewritten address is a different one.
    return dropped ? parsed.toString().replace(/\?(?=#|$)/, '') : url
  } catch {
    return url
  }
}

export const routeUrl = (url: string) =>
  withoutCampaignParams(/#\/\S/.test(url) ? url : url.split('#')[0])

const DOCS_SEGMENT = /^(docs?|documentation|api-?docs?|api-?reference|reference|manual|handbook)$/i
const DEVELOPER_SEGMENT = /^(developers?|dev|api|sdks?)$/i
const DEVELOPER_HOST_LABEL = /^(developers?|api|apidocs|devcenter|devportal|sdk)$/i

/**
 * Sections a company files things under that are never its documentation, whatever the page has
 * to say for itself. flagsmith.com/ebooks is a list of marketing e-books and we counted its pages
 * as documentation; growthbook.io's llms.txt named a blog post about multi-arm bandits;
 * storyblok.com's home page links a landing page at /lp/developers; agora.io's links a blog
 * category called developer.
 */
const NOT_DOCUMENTATION_SEGMENT =
  /^(blog|news|newsroom|press|events?|webinars?|e-?books?|whitepapers?|case-stud(y|ies)|customers?|testimonials|stories|lp|landing|campaigns?|category|categories|topics?|tags?|author|pricing|plans|about|company|team|careers|jobs|partners?|contact|legal|terms|privacy|solutions|use-?cases|industries|compare|community|forum|login|signin|signup|register)$/i

/**
 * Whether the URL is filed where documentation lives. Only the segments in front of the first
 * documentation segment are judged: docs.honeybadger.io/resources/mcp is documentation and
 * flagsmith.com/ebooks is not, and nothing but their position says which.
 */
export function isFiledAsDocumentation(url: string): boolean {
  const segments = pathSegments(url)
  const docsAt = segments.findIndex((segment) => DOCS_SEGMENT.test(segment))
  const before = docsAt === -1 ? segments : segments.slice(0, docsAt)
  return !before.some((segment) => NOT_DOCUMENTATION_SEGMENT.test(segment))
}

/** The host a vendor named docs.<their domain>, as opposed to any host whose name starts with docs. */
const isCanonicalDocsHost = (url: string, vendor: VendorSite): boolean =>
  vendor.hosts.some((host) => ['docs', 'documentation'].some((prefix) => hostOf(url) === `${prefix}.${host}`))

const NO_CONFIRMED_ORIGINS: ReadonlySet<string> = new Set()

/**
 * How loudly a URL says it is the vendor's documentation, before a word of the page is read.
 * Content cannot be left to settle this on its own: twilio.com/en-us/developers is a marketing
 * hub carrying more prose than twilio.com/docs, where /docs/iam/api-keys lives, and
 * developer.auth0.com carries more code samples than auth0.com/docs.
 */
function documentationTier(url: string, vendor: VendorSite, confirmedDocsOrigins: ReadonlySet<string>): number {
  if (isCanonicalDocsHost(url, vendor) || confirmedDocsOrigins.has(originOf(url))) return 3
  const segments = pathSegments(url)
  if (segments.some((segment) => DOCS_SEGMENT.test(segment))) return 2
  if (DEVELOPER_HOST_LABEL.test(hostLabel(url)) || segments.some((segment) => DEVELOPER_SEGMENT.test(segment))) return 1
  return 0
}

/**
 * What a candidate is worth as documentation, or null when it is not documentation at all. Four
 * questions, each worth more than everything under it, and content last: every wrong pick in the
 * audit read richer than the page it beat.
 */

type DocsCandidate<T> = { rank: number | null; chars: number; page: T; requested: string }

/**
 * The tie-break, as a decision that can be checked without a network. Returns the leader
 * unchanged unless the leader renders nothing and something else, ranked lower, renders enough
 * to read: then the highest-ranked page with content wins.
 */
export function bestReadable<T extends { url: string }>(
  leader: { page: T; rank: number; requested: string } | null,
  candidates: DocsCandidate<T>[],
): { page: T; rank: number; requested: string } | null {
  if (!leader || candidates.find((c) => c.page.url === leader.page.url && c.chars >= DOCS_SHELL_FLOOR)) return leader
  let readable: { page: T; rank: number; requested: string } | null = null
  for (const candidate of candidates) {
    if (candidate.page.url === leader.page.url || candidate.rank === null) continue
    if (candidate.chars < DOCS_SHELL_FLOOR) continue
    if (!readable || candidate.rank > readable.rank) {
      readable = { page: candidate.page, rank: candidate.rank, requested: candidate.requested }
    }
  }
  return readable ?? leader
}

function documentationRank(page: Fetched, vendor: VendorSite, confirmedDocsOrigins: ReadonlySet<string>): number | null {
  if (!page.ok) return null
  // A file a vendor publishes for machines is not one of "the N documentation pages we read":
  // honeybadger.io's llms-small.txt was counted as one, and so were typesense.org's docs/llms.txt
  // and supabase.com's llms-full.txt.
  if (!looksLikeHtml(page)) return null
  // The URL we landed on, not the one we followed: daily.co's home page links docs.pipecat.daily.co,
  // which lands on docs.pipecat.ai, the documentation of a separate voice framework.
  if (!onVendorSite(page.url, vendor)) return null
  if (!isFiledAsDocumentation(page.url)) return null
  const words = Math.min(visibleTextLength(page.body), 40_000) / 1000
  // The documentation is the front of the section, not the richest page in it. honeybadger.io's
  // home page links a Rails exception-tracking guide carrying more code than docs.honeybadger.io.
  const depth = Math.min(pathSegments(page.url).length, 9)
  // And the nearer host, when two of them are documentation: docs-latam.messaging.sinch.com is a
  // regional site and developers.sinch.com is the one a developer is sent to.
  const hostDepth = Math.min(hostOf(page.url).split('.').length, 6)
  return (
    documentationTier(page.url, vendor, confirmedDocsOrigins) * 1_000_000 +
    (10 - depth) * 10_000 +
    (6 - hostDepth) * 1_000 +
    Math.min(developerSignals(page.body), 50) * 10 +
    Math.min(words, 20)
  )
}

/** How much a page reads like a price list rather than a page with the word pricing in it. */
function pricingWeight(fetched: Fetched): number {
  if (!fetched.ok) return -1
  // Visible text, not the raw document. amplitude.com/pricing renders 17 characters without
  // JavaScript and carries its whole price table inside a script payload, so counting the raw
  // body called it "prices visible without JS" and hid the finding that matters about it.
  const text = withoutTags(stripCodeBlocks(fetched.body)).toLowerCase()
  const signals = [/\$\d/g, /€\d/g, /per month/g, /\/mo\b/g, /\bper user\b/g, /\bbilled (annually|monthly)\b/g]
  return signals.reduce((sum, pattern) => sum + (text.match(pattern)?.length ?? 0), 0)
}

/**
 * A pricing page whose prices are assembled by JavaScript used to come back as no pricing page
 * at all, and we told bunny.net, filestack.com and plausible.io that we could not find one. They
 * all have one. What they do not have is a price an agent can read from the served HTML, and that
 * is a finding about them rather than a gap in us, so the page comes back either way.
 */
/** The path a buyer would type, as opposed to one that happens to carry the word. */
function isCanonicalPricingPath(url: string): boolean {
  try {
    return /^\/(pricing|plans)\/?$/i.test(new URL(url).pathname)
  } catch {
    return false
  }
}

/** Anywhere a vendor would put prices, not only the canonical path: /en-us/pricing counts. */
function isPricingPath(url: string): boolean {
  try {
    return /(^|\/)(pricing|plans)(\/|$)/i.test(new URL(url).pathname)
  } catch {
    return false
  }
}

async function bestPricing(
  candidates: (string | null)[],
  /** The domains whose pages are the vendor's own: what we scanned, and where their site resolved. */
  theirs: string[],
): Promise<{ pick: { url: string; page: Fetched; pricesVisible: boolean } | null; redirectedAway: { asked: string; landedAt: string } | null }> {
  const unique = [...new Set(candidates.filter((url): url is string => Boolean(url)))].slice(0, 4)
  if (unique.length === 0) return { pick: null, redirectedAway: null }
  const fetched = await inParallel(unique, (url) => fetchUrl(url))
  // A request for /pricing that ends on a product page has not found a pricing page, and judging
  // what it landed on judges a page the vendor never called their pricing. sendgrid.com/pricing
  // redirects to twilio.com/en-us/sendgrid and deepl.com/pricing to deepl.com/en/pro, and both
  // rows said "your pricing page answers a plain request with no price" about somebody else's
  // marketing. The home page is exempt because we ask for it on purpose, when a vendor sells from
  // an anchor there and has no pricing page to find.
  //
  // The path alone is not enough, and codex caught it on the row that prompted the change:
  // sendgrid.com/pricing lands on twilio.com/en-us/pricing, which is still a pricing path and
  // still somebody else's price list unless sendgrid.com resolves to twilio.com, which it does.
  // So the landing has to be a pricing path AND on a domain that is theirs.
  const ours = new Set(theirs.filter(Boolean).map((one) => registrableDomain(one)))
  const stillTheirs = (url: string) => {
    const host = hostOf(url)
    return Boolean(host) && ours.has(registrableDomain(host as string))
  }
  let redirectedAway: { asked: string; landedAt: string } | null = null
  const pages = fetched.map((page, index) => {
    const asked = unique[index]
    if (!page.ok || !isPricingPath(asked)) return page
    if (isPricingPath(page.url) && stillTheirs(page.url)) return page
    if (!redirectedAway) redirectedAway = { asked, landedAt: page.url }
    return { ...page, ok: false }
  })
  // The page at /pricing is the pricing page whether or not it prints a number. plaid.com's
  // renders 7,671 characters and no price at all, and ranking on how many prices a page carries
  // sent us to a docs billing reference instead, which is a worse answer to give Plaid than
  // "your pricing page answers a plain request with no prices in it". zenrows.com went to
  // /solutions/pricing-intelligence the same way, a product page about competitors' prices.
  const canonical = pages
    .map((page, index) => ({ url: unique[index], page }))
    .filter((entry) => entry.page.ok && isCanonicalPricingPath(entry.url))
    .sort((a, b) => pricingWeight(b.page) - pricingWeight(a.page))[0]
  if (canonical) {
    return { pick: { url: canonical.url, page: canonical.page, pricesVisible: pricingWeight(canonical.page) > 0 }, redirectedAway }
  }

  let best: { url: string; page: Fetched; weight: number } | null = null
  let fallback: { url: string; page: Fetched } | null = null
  for (const [index, page] of pages.entries()) {
    if (!page.ok) continue
    const weight = pricingWeight(page)
    if (weight > 0) {
      if (!best || weight > best.weight) best = { url: unique[index], page, weight }
    } else if (!fallback) {
      fallback = { url: unique[index], page }
    }
  }
  if (best) return { pick: { url: best.url, page: best.page, pricesVisible: true }, redirectedAway }
  return { pick: fallback ? { ...fallback, pricesVisible: false } : null, redirectedAway }
}

/** Picks the best-ranked documentation candidate, and says nothing when none of them is one. */
async function bestDocs(
  candidates: (string | null)[],
  vendor: VendorSite,
  confirmedDocsOrigins: ReadonlySet<string>,
): Promise<{ url: string; page: Fetched; requested: string } | null> {
  // Wide enough to hold every source at once: capping it at four dropped developers.sinch.com,
  // the one candidate that was the documentation, because three links and an index entry came
  // first. Most of them are already in the per-scan response cache by the time we get here.
  const unique = [...new Set(candidates.filter((url): url is string => Boolean(url)))].slice(0, 8)
  if (unique.length === 0) return null
  const pages = await inParallel(unique, (url) => fetchUrl(url))
  let best: { page: Fetched; rank: number; requested: string } | null = null
  for (const [index, page] of pages.entries()) {
    const rank = documentationRank(page, vendor, confirmedDocsOrigins)
    if (rank === null) continue
    if (!best || rank > best.rank) best = { page, rank, requested: unique[index] }
  }
  // A documentation host that renders nothing is not the documentation, whatever its address
  // says. The tier is absolute by design, because content cannot settle the ordinary case:
  // twilio.com/en-us/developers carries more prose than twilio.com/docs, where the API key page
  // lives. But absolute means an empty shell on the canonical host beats a section that renders
  // in full, and it did: crowdin.com links support.crowdin.com/developer, which serves 8,431
  // characters, and never links docs.crowdin.com, which serves 38 and is an in-app help
  // application. scrapingbee.com is the same shape at 126 against 88,765. Four checks read
  // whichever page this returns, so one wrong pick is four wrong verdicts.
  //
  // Content is still not allowed to order the candidates, only to break the tie where the winner
  // has no content at all.
  best = bestReadable(
    best,
    pages.map((page, index) => ({
      rank: documentationRank(page, vendor, confirmedDocsOrigins),
      chars: page.ok ? visibleTextLength(page.body) : 0,
      page,
      requested: unique[index],
    })),
  )
  // The URL we landed on rather than the one we asked for, so the report names the page that was
  // actually read and machine.ts probes llms.txt on the origin that served it. The one we asked
  // for comes back too, because that is the one that says where the URL came from.
  return best ? { url: best.page.url, page: best.page, requested: best.requested } : null
}

function pickLink(links: string[], hints: RegExp[], sameHostAs: string): string | null {
  const host = new URL(sameHostAs).hostname.replace(/^www\./, '')
  const candidates = links.filter((link) => {
    const linkHost = new URL(link).hostname.replace(/^www\./, '')
    return linkHost === host || linkHost.endsWith(`.${host}`)
  })
  for (const hint of hints) {
    const hit = candidates.find((link) => hint.test(link))
    if (hit) return hit.split('#')[0]
  }
  return null
}

/**
 * A fallback path only counts if it answers with real HTML, not an SPA shell 404. All of them
 * are asked at once and then read back in order, so the answer is the same one the old loop
 * gave - the first path in the list that lives - without paying for the ones before it.
 */
async function firstLivePath(site: string, paths: string[]): Promise<string | null> {
  const pending = paths.map((path) => fetchUrl(`${site}${path}`))
  for (const request of pending) {
    const got = await request
    if (got.ok && looksLikeHtml(got) && visibleTextLength(got.body) > 200) return got.url
  }
  return null
}

/** True when a URL is on the scanned registration, so a redirect off-site cannot be scored. */
function sameSite(url: string, domain: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase()
    return host === domain || host.endsWith(`.${domain}`)
  } catch {
    return false
  }
}

/**
 * The names that are this vendor's own. The scanned domain is one; wherever its home page landed
 * is the other, because a company that moved keeps redirecting: livekit.io serves livekit.com,
 * and a docs host under the new name is still theirs.
 */
type VendorSite = { domain: string; hosts: string[]; homeOrigin: string }

const vendorSiteOf = (domain: string, homeUrl: string): VendorSite => ({
  domain,
  hosts: [...new Set([domain, hostOf(homeUrl)].filter(Boolean))],
  homeOrigin: originOf(homeUrl),
})

const onVendorSite = (url: string, vendor: VendorSite): boolean =>
  vendor.hosts.some((host) => sameSite(url, host))

/**
 * The vendor's own name on a different top level domain. cockroachlabs.com sends you to
 * cockroachlabs.cloud/signup and swell.is to swell.store/signup, and both were published as having
 * nothing on the site that links to an account signup, which dropped them out of the funnel report
 * for a reason that is not true.
 *
 * Only ever consulted for a link the vendor wrote on their own page. The same name on another
 * registration proves nothing by itself, which is why an npm package is not attributed this way,
 * but a company pointing its own "Sign up" button somewhere is telling us where its signup is.
 */
function isSiblingBrand(url: string, vendor: VendorSite): boolean {
  // vendor.domain is a bare hostname, not a URL, so hostLabel cannot parse it.
  const brand = vendor.domain.replace(/^www\./i, '').split('.')[0].toLowerCase()
  return brand.length >= 4 && hostLabel(url) === brand
}

/** Where the home page landed, when that is a different company's registrable name. */
/**
 * Where the site actually lives, which is not always where we knocked. 66 of the 167 domains in
 * the corpus redirect their apex to www, and every probe after the home page then pays the extra
 * hop: measured 1248ms against 346ms for the same nine entry paths on hover.com, whose scan then
 * ran out of budget at 27 seconds and published seven checks that measured our limit.
 *
 * This cannot change a verdict. Redirects are followed either way and a result carries the URL it
 * finally answered on, so the only difference is where the request starts.
 *
 * Same registrable domain only. A home page that lands on somebody else's host is
 * `resolvedElsewhere`, which is a finding about the vendor rather than a base to keep probing.
 */
function canonicalSite(domain: string, home: Fetched): string {
  const apex = `https://${domain}`
  const landed = hostOf(home.url)
  if (home.status === 0 || !landed) return apex
  if (registrableDomain(landed) !== registrableDomain(domain)) return apex
  return new URL(home.url).origin
}

function resolvedElsewhereFrom(domain: string, home: Fetched): ResolvedElsewhere | null {
  const landed = hostOf(home.url)
  if (home.status === 0 || !landed) return null
  const finalDomain = registrableDomain(landed)
  if (finalDomain === registrableDomain(domain)) return null
  return { requestedDomain: domain, finalUrl: home.url, finalDomain }
}

/**
 * The hosts a vendor could have put documentation on that answer at all. Returning only the first
 * one meant docs.sinch.com, which redirects to a regional LATAM messaging site, was reported as
 * their documentation and developers.sinch.com was never asked.
 *
 * The thin-page guard the other probes use is deliberately absent: docs.agora.io renders 77
 * characters without JavaScript, and that is a finding about them rather than a reason to go
 * looking for their documentation somewhere it is not.
 */
async function liveDocsHosts(domain: string, vendor: VendorSite): Promise<string[]> {
  const found = await answeringHosts(domain, DOCS_SUBDOMAINS, vendor)
  return found.length > 0 ? found : answeringHosts(domain, LAST_RESORT_DOCS_SUBDOMAINS, vendor)
}

async function answeringHosts(domain: string, prefixes: string[], vendor: VendorSite): Promise<string[]> {
  // All of them go on the wire at once and are read back in priority order, so a guessed host
  // that accepts no connection - api.payloadcms.com does exactly that - is only ever waited on
  // when nothing better has answered.
  const pending = prefixes.map((prefix) => fetchUrl(`https://${prefix}.${domain}`))
  const found: string[] = []
  for (const request of pending) {
    const got = await request
    // A subdomain that redirects off-site is not this vendor's page. docs.statuspage.io served
    // a dead Zendesk placeholder and we reported its 303 characters as their documentation.
    if (!got.ok || !looksLikeHtml(got) || !onVendorSite(got.url, vendor)) continue
    // docs.twilio.com and docs.auth0.com both land on the marketing home page. A guessed host
    // that bounces back to where we started is only documentation if it lands somewhere
    // documentation lives: docs.algolia.com lands on www.algolia.com/doc, which does.
    if (originOf(got.url) === vendor.homeOrigin && documentationTier(got.url, vendor, NO_CONFIRMED_ORIGINS) < 2) {
      continue
    }
    if (!found.includes(got.url)) found.push(got.url)
    // The host the vendor themselves called docs.<domain> is their answer to the question, so
    // the guesses behind it are not worth waiting for. Unless it answers with nothing:
    // docs.crowdin.com serves 38 characters of an in-app help application, and stopping here
    // meant developer.crowdin.com, which serves 8,431, was never even a candidate. The requests
    // are already on the wire, so reading two more of them costs nothing.
    if (isCanonicalDocsHost(got.url, vendor) && visibleTextLength(got.body) >= DOCS_SHELL_FLOOR) break
  }
  return found
}

/**
 * Whether a host publishes an index of itself: an llms.txt that is mostly its own pages. That is
 * the vendor stating, in a file written for us, that this host is where their documentation is,
 * and it outranks anything we guessed at from a hostname or a link. daily.co and honeybadger.io
 * both publish one, and both were handed a documentation URL from somewhere else - a separate
 * voice framework's site, and a raw llms-small.txt.
 *
 * Only the host is taken from it. The entry point is the front page of a host that publishes an
 * index of itself, not a line out of the index: these files list every page a site has, mostly as
 * raw markdown, and lifting one is the same guess in a different costume.
 */
async function publishesDocsIndex(origin: string): Promise<boolean> {
  // text/plain because machine.ts asks the winning origin for the same file with the same header
  // later in the scan, and the per-scan response cache then serves it for nothing.
  const got = await fetchUrl(`${origin}/llms.txt`, { accept: 'text/plain' })
  if (!isRealTextFile(got, 200)) return false
  // A file listing nothing on its own host is not that host's index of itself.
  return linksFromLlmsTxt(got.body, origin).filter((entry) => originOf(entry.url) === origin).length >= 3
}

/** The hosts a company puts its front door on, as opposed to the one it puts its marketing on. */
const AUTH_HOST_LABEL =
  /^(app|apps|dash|dashboard|console|accounts?|auth|login|signin|signup|register|sso|id|identity|cloud|portal|secure|my|admin)$/i

const SIGNUP_SEGMENT = /^(sign[-_]?up|register|registration|create[-_]?account|new[-_]?account|join|onboarding)$/i

/**
 * What a page is filed as when it is not a signup. The word signup in a slug is not enough:
 * twilio.com's signup resolved to a blog post announcing one, livekit.io's to a documentation page
 * about encryption, openrouter.ai's to a cookbook page and temporal.io's to a learning portal.
 */
const NOT_A_SIGNUP_SEGMENT =
  /^(blog|news|press|docs?|documentation|reference|guides?|tutorials?|cookbook|learn|changelog|api|resources?|library|category|categories|tags?|events?|webinars?|case-stud(y|ies)|customers?|pricing|plans|about|company|careers|partners?|contact|legal|terms|privacy|support|help|community|forum|status)$/i

const isAuthenticationHost = (url: string) => AUTH_HOST_LABEL.test(hostLabel(url))

/**
 * A form you could put an account into. A bare <form> is not it - a newsletter box is a form, and
 * so are the six on flagsmith.com/ebooks - so the field the account is made of has to be there.
 */
function hasCredentialForm(html: string): boolean {
  if (/<input[^>]+type=["']?password/i.test(html)) return true
  return /<form/i.test(html) && /<input[^>]+(?:type|name|autocomplete)=["']?email/i.test(html)
}

/** Statuses that say the page is there and we were turned away, as opposed to it not being there. */
const REFUSED_US = new Set([401, 403, 406, 429, 500, 502, 503, 504])

/**
 * Whether a page is the thing you fill in to get an account, rather than a page that mentions one.
 * Three ways to show it, and a candidate needs one: it renders the form, it sits on the host the
 * company authenticates on, or its own path says it is the registration.
 */
function looksLikeSignup(got: Fetched, homeUrl: string): boolean {
  // The home page is where the search for a signup starts, so it cannot be the answer to it.
  // replicate.com's llms.txt offered it and we published it as their signup.
  if (got.url.replace(/\/$/, '') === homeUrl.replace(/\/$/, '')) return false
  const segments = routeSegments(got.url)
  if (segments.some((segment) => NOT_A_SIGNUP_SEGMENT.test(segment))) return false
  const shapeSaysSignup = isAuthenticationHost(got.url) || segments.some((segment) => SIGNUP_SEGMENT.test(segment))
  // A door held shut is the finding these checks exist to make, not a reason to keep looking
  // for a different door: dash.cloudflare.com/sign-up answers 403 to a plain request. A 404 is
  // the other thing entirely - app.flagsmith.com/signup has not existed for some time, and we
  // published it as their signup and then scored them on its status.
  if (!got.ok) return REFUSED_US.has(got.status) && shapeSaysSignup
  if (!looksLikeHtml(got)) return false
  return hasCredentialForm(got.body) || shapeSaysSignup
}

/**
 * Signup links on a page we already have. Off-site links count here and nowhere else: split.io was
 * acquired and its own home page sends you to app.harness.io to register, which is a different
 * registrable name and still the answer to "where does an agent get an account".
 */
/**
 * Pages that carry signup words and are not a signup. Two different mistakes live here.
 *
 * Widening the hints to catch `register_free` and trial pages also caught /events/registration,
 * /webinars/registration and /blog/register-for-the-webinar, and only three candidates per
 * source are ever fetched, so a webinar can push the real account out of the sample.
 *
 * The second is worse and it was mine. Preferring a candidate that renders a form was meant to
 * beat document order; on mux.com it picked /newsletter/signup, whose form is real and server
 * rendered and signs you up for an email, and we published "form renders in server HTML" about
 * a company whose account signup is a JavaScript application. A newsletter box is the easiest
 * form on any marketing site to render without JavaScript, so the preference finds it every
 * time. Demo and contact forms are excluded on the same principle from the other direction:
 * "request a demo" is the opposite of the thing this stage measures.
 */
export const NOT_WHERE_ACCOUNTS_ARE_MADE =
  /\/(blog|events?|webinars?|news|press|community|careers?|jobs|newsletters?|subscribe|contact|demos?|request[-_]demo|waitlist)(\/|$|-)/i

function signupLinksOn(html: string, base: string, vendor: VendorSite): string[] {
  const links = extractLinks(html, base).filter(
    (link) => onVendorSite(link, vendor) || isAuthenticationHost(link) || isSiblingBrand(link, vendor),
  )
  // Keyed on the page rather than on the whole URL, keeping the shortest way of writing it: the
  // same registration is linked six times from elastic.co's home page, five of them carrying a
  // different campaign parameter, and a report should name the page and not the campaign.
  const found = new Map<string, string>()
  for (const hint of SIGNUP_HINTS) {
    for (const link of links) {
      if (!hint.test(link)) continue
      if (NOT_WHERE_ACCOUNTS_ARE_MADE.test(new URL(link).pathname)) continue
      const url = routeUrl(link)
      const page = originOf(url) + new URL(url).pathname + new URL(url).hash
      const held = found.get(page)
      if (!held || url.length < held.length) found.set(page, url)
    }
  }
  return [...found.values()]
}

/**
 * The one door a company links when it links no signup: its login page. Kept to the bare path,
 * because /account/settings is somewhere you already are and not a way in.
 */
const ACCOUNT_DOOR = /^\/(accounts?|log[_-]?in|sign[_-]?in|my)\/?$/i

/**
 * One hop through that door. porkbun.com's home page links /account and nothing else, and the
 * page behind it links /account/create, so we published "nothing on the site links to an account
 * signup" about a registrar whose registration is one click away. Costs a single request, and
 * only on the domains where every earlier source has already come up empty.
 */
async function signupBehindTheLoginPage(
  html: string,
  base: string,
  vendor: VendorSite,
  /** Told where it looked, because this page is searched and the published sentence names them. */
  searched?: string[],
): Promise<string[]> {
  const doors = extractLinks(html, base).filter((link) => {
    if (!onVendorSite(link, vendor)) return false
    try {
      return ACCOUNT_DOOR.test(new URL(link).pathname)
    } catch {
      return false
    }
  })
  if (doors.length === 0) return []
  const got = await fetchUrl(doors[0])
  if (!got.ok) return []
  searched?.push(got.url)
  return signupLinksOn(got.body, got.url, vendor)
}

const SIGNUP_LABELS = [/sign ?up/, /create (an )?account/, /register/, /free trial/]

/**
 * llms.txt lists a vendor's pages, not their front doors, so a candidate out of it is proposed
 * on exactly the same terms as one scraped off the home page and has to clear the same test.
 * Four of the worst signup picks in the audit were labelled "from your llms.txt".
 */
function signupFromLlmsTxt(entries: { url: string; label: string }[], vendor: VendorSite): string[] {
  const usable = entries.filter((entry) => onVendorSite(entry.url, vendor) || isAuthenticationHost(entry.url))
  const found: string[] = []
  const add = (url: string) => {
    const clean = routeUrl(url)
    if (!found.includes(clean)) found.push(clean)
  }
  for (const label of SIGNUP_LABELS) {
    for (const entry of usable) if (label.test(entry.label)) add(entry.url)
  }
  for (const hint of SIGNUP_HINTS) {
    for (const entry of usable) if (hint.test(entry.url)) add(entry.url)
  }
  return found
}

type SignupPick = { url: string; source: LinkSource }

/** A source that has offered three pages and none of them a signup is not about to offer a fourth. */
const MOST_CANDIDATES_PER_SOURCE = 3

/** Takes the first candidate in a tier that turns out to be a signup, and pays for nothing else. */
async function firstRealSignup(
  candidates: string[],
  source: LinkSource,
  homeUrl: string,
): Promise<SignupPick | null> {
  const unique = [...new Set(candidates)].slice(0, MOST_CANDIDATES_PER_SOURCE)
  if (unique.length === 0) return null
  const pages = await inParallel(unique, (url) => fetchUrl(url))
  const found = [...pages.entries()].filter(([, page]) => looksLikeSignup(page, homeUrl))
  if (found.length === 0) return null
  // Document order decided this, and document order is not evidence. cronofy.com links two
  // addresses matching the same hint from its home page: /sign_up, which redirects to a page
  // offering only OAuth, and /sign_up/developer, which serves a real Rails form with an email
  // and a password field. We published "its form needs JavaScript" about a company whose form
  // is in the HTML, one link away. The pages are already fetched, so preferring the one with a
  // form an agent can fill costs nothing.
  const withAForm = found.find(([, page]) => rendersUsableForm(page.body))
  const [index] = withAForm ?? found[0]
  // The link as the vendor wrote it, because the route fragment survives a fetch that drops it.
  return { url: unique[index], source }
}

/**
 * Signup hosts, probed at their root as well as at the conventional paths. The thin-page guard is
 * off here for the same reason it is off for documentation: cloud.temporal.io answers 14 characters
 * without JavaScript, and app.growthbook.io 21, and both are where their accounts are made.
 */
async function signupOnSubdomains(domain: string, vendor: VendorSite, homeUrl: string): Promise<SignupPick | null> {
  const roots = SIGNUP_SUBDOMAINS.map((prefix) => fetchUrl(`https://${prefix}.${domain}`))
  for (const [index, request] of roots.entries()) {
    const root = await request
    if (!root.ok || !onVendorSite(root.url, vendor)) continue
    const host = `https://${SIGNUP_SUBDOMAINS[index]}.${domain}`
    const onHost = await firstRealSignup(
      ['/signup', '/register'].map((path) => `${host}${path}`),
      'subdomain',
      homeUrl,
    )
    if (onHost) return onHost
    if (looksLikeSignup(root, homeUrl)) return { url: root.url, source: 'subdomain' }
  }
  return null
}

/**
 * Docs write install lines for a reader to fill in. Treating htmx-ext-extension-name as
 * a real package scored a hard zero on integration for a site that has no such problem.
 */
const PLACEHOLDER_NAMES =
  /(^|[-/@])(your|my|our|the|some|any|example|sample|placeholder)[-/]|(package|module|plugin|extension|project|library|app|repo)[-_]?name$|^<|>$|\.\.\./i

const isPlaceholder = (name: string) => PLACEHOLDER_NAMES.test(name)

function namedPackages(html: string): string[] {
  const names: string[] = []
  for (const match of html.matchAll(/npmjs\.com\/package\/(@?[a-z0-9._-]+(?:\/[a-z0-9._-]+)?)/gi)) {
    names.push(match[1])
  }
  for (const match of html.matchAll(/npm (?:install|i) (?:--save )?(@?[a-z0-9._-]+(?:\/[a-z0-9._-]+)?)/gi)) {
    if (match[1].length > 2) names.push(match[1])
  }
  return [...new Set(names.filter((name) => !isPlaceholder(name)))]
}

/**
 * The first install snippet on a page is not the main SDK. tiny.cloud names its premium
 * bundle first and htmx.org names a dependency, and each time we scored the vendor against
 * a package they do not consider their entry point. Shape decides, then real usage.
 *
 * A name the vendor wrote on their own page needs no ownership proof, so nothing is dropped
 * here: an integration or a stray dependency only ranks last. Dropping the single name a page
 * offers would trade a wrong package for no package.
 */
async function pickNamedPackage(names: string[], vendor: Vendor): Promise<string | null> {
  if (names.length === 0) return null
  if (names.length === 1) return names[0]

  // Coarser than the registry path on purpose. Both `supabase` and `@supabase/supabase-js` are
  // named in Supabase's docs and both read like an entry package; only usage says the first is
  // their command line tool. A description would say so too, at a registry request per name.
  const shortlist = names.slice(0, 6)
  const counts = await weeklyDownloadsFor(shortlist)
  const ranked = shortlist.map((name) => ({
    name,
    rank: Math.max(shapeRank(name, vendor) - 2, 0),
    downloads: counts.get(name) ?? null,
  }))
  // Usage only decides when every name was priced. With one lookup refused, the counts in hand
  // are not comparable with the ones missing, so shape alone settles it and the page's own order
  // holds the rest, which is the same answer whether or not the registry refuses again.
  const priced = ranked.every((entry) => entry.downloads !== null)
  ranked.sort((a, b) => a.rank - b.rank || (priced ? (b.downloads ?? 0) - (a.downloads ?? 0) : 0))
  return ranked[0].name
}

/**
 * Weekly downloads for several packages, in as few requests as the registry allows.
 *
 * Measured 2026-08-18: one scan makes 20 to 25 requests to npm and **16 of them are this endpoint**,
 * which is also the one that refuses us: on cloudinary.com ten of sixteen came back 429. Across the
 * corpus 89 of 177 scans meet a limit at the registry, and `typed_package` and the whole of package
 * attribution stand on what these answers say. The counts are read in two batches of candidates, so
 * they can be asked for in two requests rather than in sixteen.
 *
 * Not scoped names: the registry answers a bulk lookup containing one with "scoped packages are not
 * currently supported in bulk lookups" and refuses the whole batch, so one `@vendor/sdk` in the list
 * would cost every other name its count.
 */
const NAMES_PER_BULK = 48

export function readBulkDownloads(body: string, names: readonly string[]): Map<string, number | null> {
  const answer = new Map<string, number | null>()
  let parsed: Record<string, { downloads?: number } | null>
  try {
    parsed = JSON.parse(body) as Record<string, { downloads?: number } | null>
  } catch {
    for (const name of names) answer.set(name, null)
    return answer
  }
  for (const name of names) {
    // A name the registry answered `null` about is a package with no downloads recorded, which is
    // the same answer a 404 gives on the single lookup. A name it did not mention at all is not an
    // answer, and calling it zero would price a package we were never told about.
    // Own property only: `constructor`, `toString` and `valueOf` are all published npm packages,
    // and `in` would find them on Object.prototype in a response that never mentioned them, which
    // turns "the registry did not answer about this one" into "nobody installs it".
    answer.set(name, Object.hasOwn(parsed, name) ? (parsed[name]?.downloads ?? 0) : null)
  }
  return answer
}

async function weeklyDownloadsFor(names: readonly string[]): Promise<Map<string, number | null>> {
  const answer = new Map<string, number | null>()
  const wanted = [...new Set(names)]
  const scoped = wanted.filter((name) => name.startsWith('@'))
  // Sorted, because the URL is the key this answer is cached under for 48 hours and across dynos:
  // the same domain asking for the same names in a different order would miss the warm answer and
  // pay the registry for it again, which is the load this whole function exists to cut.
  const plain = wanted.filter((name) => !name.startsWith('@')).sort()
  const batches: string[][] = []
  for (let at = 0; at < plain.length; at += NAMES_PER_BULK) batches.push(plain.slice(at, at + NAMES_PER_BULK))

  await Promise.all([
    ...scoped.map(async (name) => {
      answer.set(name, await weeklyDownloads(name))
    }),
    ...batches.map(async (batch) => {
      // One name is the single lookup: the bulk endpoint answers it with the bare object rather
      // than with a map, and reading one shape as the other is how a real count becomes null.
      if (batch.length === 1) {
        answer.set(batch[0], await weeklyDownloads(batch[0]))
        return
      }
      const got = await askRegistry(
        `https://api.npmjs.org/downloads/point/last-week/${batch.map((name) => encodeURIComponent(name)).join(',')}`,
      )
      if (got === null || !got.ok) {
        for (const name of batch) answer.set(name, null)
        return
      }
      for (const [name, count] of readBulkDownloads(got.body, batch)) answer.set(name, count)
    }),
  ])
  return answer
}

/** Null when the registry refused the lookup. A 404 here is a package with no downloads recorded. */
async function weeklyDownloads(name: string): Promise<number | null> {
  const stats = await askRegistry(`https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(name)}`)
  if (stats === null) return null
  if (!stats.ok) return 0
  try {
    return (JSON.parse(stats.body) as { downloads?: number }).downloads ?? 0
  } catch {
    return null
  }
}

/** Vendors often name their package only in a CDN URL: cdn.jsdelivr.net/npm/froala-editor@latest */
function findCdnPackage(text: string): string | null {
  const match = text.match(/(?:jsdelivr\.net\/npm|unpkg\.com)\/(@?[a-z0-9._-]+(?:\/[a-z0-9._-]+)?)/i)
  return match ? match[1].replace(/@[\d.^~].*$/, '') : null
}

/**
 * The GitHub repositories a page points at that carry the vendor's own name. The first GitHub
 * link on a page is whatever the site was built with, not who built it: every Mintlify
 * documentation site links facebook/react, and we published that as buttondown.com's
 * repository. An owner or a repository name has to carry the vendor's name, and none at all is
 * a better answer than somebody else's.
 */
function findGithubRepos(html: string, vendor: Vendor): string[] {
  const found: string[] = []
  for (const match of html.matchAll(/github\.com\/([a-z0-9._-]+\/[a-z0-9._-]+)/gi)) {
    const repo = match[1].replace(/\.git$/, '')
    if (/^(features|about|pricing|login|orgs|sponsors)\b/i.test(repo)) continue
    if (found.some((held) => held.toLowerCase() === repo.toLowerCase())) continue
    const [owner, name] = repo.split('/')
    if (carriesVendorName(owner, vendor) || carriesVendorName(name, vendor)) found.push(repo)
  }
  return found
}

type NpmSearchHit = {
  package: {
    name: string
    version?: string
    date?: string
    description?: string
    keywords?: string[]
    links?: { homepage?: string; repository?: string }
    maintainers?: { username?: string; name?: string; email?: string }[]
  }
}

/**
 * The names a vendor can plausibly answer to. Domains buy a prefix when the bare word is
 * taken, and the packages keep the bare word: getunleash.io publishes unleash-client and
 * trychroma.com publishes chromadb, so a search for the brand alone finds neither.
 */
type Vendor = { domain: string; brand: string; aliases: string[]; flatDomain: string }

const flatten = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

/** The prefix a company buys when the bare name is taken, on either side of the comparison. */
const BOUGHT_PREFIX = /^(get|try|use|join|go|my)(?=[a-z0-9]{4,})/

/**
 * What a company adds to its name to register a domain, and does not say out loud anywhere
 * else. datadoghq.com publishes from the `datadog` account, calls itself Datadog in every
 * description it writes, and answers to neither of them under the name in its domain.
 */
const REGISTERED_SUFFIX = /(hq|inc|labs|corp|group)$/

function vendorOf(domain: string): Vendor {
  const brand = domain.split('.')[0].toLowerCase()
  const bare = brand.replace(BOUGHT_PREFIX, '')
  const trimmed = bare.replace(REGISTERED_SUFFIX, '')
  return {
    domain,
    brand,
    aliases: [...new Set([brand, bare, trimmed.length >= 4 ? trimmed : bare])],
    flatDomain: flatten(domain),
  }
}

/**
 * Whether a name is built out of the vendor's own name. Short brands match only as a whole
 * word: api.video's brand is "api", and every package on the registry contains it. The bought
 * prefix comes off this side too: courier.com publishes under the @trycourier scope.
 */
function carriesVendorName(text: string, vendor: Vendor): boolean {
  const flat = flatten(text)
  if (!flat) return false
  return [flat, flat.replace(BOUGHT_PREFIX, '')].some(
    (form) =>
      form.startsWith(vendor.flatDomain) ||
      vendor.aliases.some((alias) =>
        alias.length >= 4
          ? form.startsWith(alias) || (alias.startsWith(form) && form.length >= 4)
          : text.toLowerCase().split(/[^a-z0-9]+/).includes(alias),
      ),
  )
}

/** The vendor's name and nothing else: `raygun` in raygun.io, as opposed to `bunny-launcher`. */
function isVendorName(text: string, vendor: Vendor): boolean {
  const flat = flatten(text)
  return flat !== '' && (flat === vendor.flatDomain || vendor.aliases.includes(flat))
}

/**
 * A scope registered by the vendor. It can carry more of the name than the domain does and it
 * can carry less - @basetenlabs is baseten.co's, @dropbox is dropboxsign.com's - but a short
 * name has to be the whole scope either way: @junejs is a JavaScript framework and june.so
 * publishes under @june-so.
 */
function isVendorScope(scope: string, vendor: Vendor): boolean {
  if (isVendorName(scope, vendor)) return true
  const flat = flatten(scope)
  return [flat, flat.replace(BOUGHT_PREFIX, '')].some(
    (form) =>
      form.startsWith(vendor.flatDomain) ||
      vendor.aliases.some(
        (alias) =>
          (alias.length >= 5 && form.startsWith(alias)) || (form.length >= 5 && alias.startsWith(form)),
      ),
  )
}

/**
 * Whether a handle is built round the vendor's name wherever it sits in it. People append the
 * company they publish for as often as they prepend it: zane-highlight, philipkiely-baseten,
 * raygunowner. Package names get the stricter test above, because nuxt-betterstack is somebody
 * else's integration and not Better Stack's package.
 *
 * This is the weakest thing the registry says about ownership and on its own it says nothing:
 * michal-pichlinski-here publishes OpenFin's core and bunny-launcher is a different product
 * than bunny.net. It has to be corroborated before it can name an owner.
 */
function handleMentionsVendor(text: string, vendor: Vendor): boolean {
  const flat = flatten(text)
  if (!flat) return false
  return flat.includes(vendor.flatDomain) || vendor.aliases.some((alias) => alias.length >= 4 && flat.includes(alias))
}

/**
 * What a company puts after its own name on a publishing account: `datadog`, `honeycombci`,
 * `uploadcare-user`. Anything else after it belongs to a person rather than to the company.
 */
const PUBLISHER_SUFFIX =
  /^(io|com|net|org|hq|inc|labs|team|eng|npm|bot|robot|ci|cd|oss|official|admin|user|users|support|packages|publish(er)?|releases?)$/

/** Whether a handle is the company's own account, as opposed to one with its name inside it. */
function handleIsVendor(handle: string, vendor: Vendor): boolean {
  const flat = flatten(handle)
  if (!flat) return false
  return [vendor.flatDomain, ...vendor.aliases].some(
    (name) => flat === name || (flat.startsWith(name) && PUBLISHER_SUFFIX.test(flat.slice(name.length))),
  )
}

/** Whether prose names the vendor, which a name-shaped test cannot see: "Better Stack Node.js logger". */
function mentionsVendorName(text: string, vendor: Vendor): boolean {
  const words = text.toLowerCase().split(/[^a-z0-9.]+/)
  if (words.some((word) => flatten(word) === vendor.flatDomain || vendor.aliases.includes(flatten(word)))) return true
  // Written out as two words in prose - "Better Stack Node.js logger" - it is one in the domain.
  const flat = flatten(text)
  return flat.includes(vendor.flatDomain) || vendor.aliases.some((alias) => alias.length >= 5 && flat.includes(alias))
}

/**
 * An org that is the vendor's name, allowing for the suffix a company adds when the plain one
 * is taken: honeybadger.io ships from github.com/honeybadger-io, split.io from splitio. "js"
 * is deliberately not in the list, because github.com/highlightjs is a different project than
 * highlight.io.
 */
function orgIsVendor(org: string, vendor: Vendor): boolean {
  const flat = flatten(org)
  if (flat === vendor.flatDomain || vendor.aliases.includes(flat)) return true
  return vendor.aliases.some((alias) => /^(labs|hq|inc|team|official|tech)$/.test(flat.slice(alias.length)) && flat.startsWith(alias))
}

/**
 * Whether a searched name can carry a point, and how much weight the name itself can take.
 *
 * `confidence` has always had one possible value, which made it a field that looked like a gate and
 * was not one. What a verdict actually needs is beside it: a point can rest on a package we found
 * by who publishes it, and an accusation cannot, because "the package your users install has no
 * types" carries a premise the search does not establish. These three say whether that premise
 * holds, and they are read only on the failing branch.
 */
export type NpmMatch = {
  name: string
  confidence: 'strong'
  /** Provably the vendor's account or repository, rather than circumstance pointing that way. */
  ownership: Ownership
  /** The package says whose it is, in its own description, keywords or links. */
  saysWhose: boolean
  /** How many other packages of the same shape sat on the same shelf. More than none is contested. */
  rivals: number
}

/**
 * A registry answer we never got, told apart from an answer of nothing. Attribution fires up to
 * two dozen requests at npmjs.org inside one phase and the registry rate limits the burst, so
 * `!ok` on this host is routinely us rather than the vendor: a refused search used to arrive as
 * a shelf with no packages on it and a refused download lookup as a package nobody installs.
 *
 * Asked once. Retrying a refusal was the obvious answer and it is the wrong one: the refusals
 * come from sustained load rather than from one burst, so a second and third ask feed the thing
 * that is refusing. Two retries with backoff took ten scans of mapbox.com from 8 refused
 * requests to 182, measured, and answered fewer of them.
 */
async function askRegistry(url: string): Promise<Fetched | null> {
  const got = await fetchUrl(url, { accept: 'application/json' })
  // 404 is the registry answering: no such package, or no downloads recorded for it.
  return got.ok || got.status === 404 ? got : null
}

/** Null when the registry refused to answer, which is not the same as a query with no hits. */
async function searchRegistry(text: string, size = 20): Promise<NpmSearchHit[] | null> {
  const got = await askRegistry(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(text)}&size=${size}`)
  if (!got?.ok) return null
  try {
    return (JSON.parse(got.body) as { objects?: NpmSearchHit[] }).objects ?? []
  } catch {
    return null
  }
}

/**
 * The tiebreak for the two places below whose input arrives in whatever order the registry
 * answered in. Everything downstream of them is sorted from an order that is already total, and
 * a stable sort keeps it: adding a name key there overrides real signal rather than a coin toss,
 * and it moved mapbox.com onto @mapbox/mapbox-gl-supported, which loses to mapbox-gl on installs
 * and only wins on the '@' sorting before an 'm'.
 *
 * Codepoint order rather than localeCompare: package names are ASCII and the answer must not
 * depend on the machine's locale.
 */
const compareNames = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

const SDK_WORD = /^(sdk|client|node|js|api|core|browser|server)$/
const SDK_SHAPE = /(^|[-.])(sdk|client|node|js|api|core)([-.]|$)/

/**
 * Names that announce the package is something other than the thing you install to use the
 * product: a command line tool, a build step, a framework binding, a drop-in piece of user
 * interface, or the vendor's own plumbing. @algolia/cli, @sinch/node-red-sinch-utility and
 * @basetenlabs/n8n-nodes-baseten are all genuinely the vendor's, and none of them is the SDK
 * we were reporting them as; uploadcare-widget is the file picker Uploadcare shipped for
 * jQuery pages, next to the @uploadcare/upload-client a developer writes against today.
 */
const NOT_AN_SDK =
  /(^|[-/])(cli|n8n|node-red|mcp|plugins?|preset|loader|codemod|widget|webpack|vite|rollup|esbuild|babel|eslint|prettier|docs?|examples?|demo|starter|template|tests?|testing|mocks?|fixtures|internal|tools|utils|utility|utilities|types|config|react|vue|angular|svelte|next|nuxt|remix|nest|hono|express|koa|fastify|gatsby|astro|ember|jquery|wordpress|drupal|laravel|rails|django|flutter|ionic|electron)([-/]|$)/

/**
 * A typeface is not a client library. cal.com scored a point for @calcom/cal-sans-ui, which is
 * their brand font under OFL-1.1, while @calcom/atoms shipped three days before the scan.
 */
const IS_A_TYPEFACE = /(^|[-/])(font|fonts|sans|serif|mono|typeface|icons?)([-/]|$)/

/** The package part of a name, without the scope: @daily-co/daily-js is a daily-js. */
const bareName = (name: string) => (name.startsWith('@') ? (name.split('/')[1] ?? '') : name).toLowerCase()

/** A name that is nothing but the words an SDK is called: sdk-core, js-client-sdk, node. */
function onlySdkWords(text: string): boolean {
  const words = text.split(/[^a-z0-9]+/).filter(Boolean)
  return words.length > 0 && words.every((word) => SDK_WORD.test(word))
}

/**
 * What is left of a name once the vendor's own name is taken off the front of it, or null when
 * the name does not start with it. Counted over letters and digits only, because the separators
 * are the package author's taste: daily-co and dailyco are the same seven characters of brand.
 */
function afterVendorName(part: string, vendor: Vendor): string | null {
  const flat = flatten(part)
  for (const alias of [vendor.flatDomain, ...vendor.aliases]) {
    if (flat === alias || (alias.startsWith(flat) && flat.length >= 4)) return ''
    if (!flat.startsWith(alias)) continue
    let taken = 0
    let cursor = 0
    while (cursor < part.length && taken < alias.length) {
      if (/[a-z0-9]/i.test(part[cursor])) taken++
      cursor++
    }
    return part.slice(cursor).toLowerCase()
  }
  return null
}

/**
 * How much a name reads like the package a developer installs. Low is better, and the tiers
 * are coarse on purpose: ranking by how much of the brand a name carries once picked
 * froala-pages over froala-editor, so within a tier real usage still decides.
 */
function shapeRank(name: string, vendor: Vendor, description = ''): number {
  const part = bareName(name)
  if (NOT_AN_SDK.test(part) || NOT_AN_SDK.test(name.toLowerCase())) return 5
  if (IS_A_TYPEFACE.test(part) || /\bOFL\b|open font license|typeface/i.test(description)) return 5
  // The package named exactly after the vendor is not always the SDK: `storyblok` is
  // Storyblok's command line tool, and only its own description says so.
  if (/\b(cli|command[- ]line)\b/i.test(description)) return 5
  const rest = afterVendorName(part, vendor)
  if (rest === '') return 0
  // A package in the vendor's own scope whose name is nothing but the words an SDK is called ranks
  // with the bare vendor name rather than below it, so the download counts decide between them.
  // Measured 2026-08-18: `directus` (the server, 19k weekly, no types) outranked `@directus/sdk`
  // ("Directus JavaScript SDK", 135k weekly, typed) purely on the shape of the name, and the row
  // published about them was about the wrong artefact. The scope has to be theirs: `@acme/sdk`
  // under somebody else's account says nothing about this vendor.
  // The scope has to BE their name, not merely start with it. `isVendorScope` accepts a prefix,
  // which is right for deciding ownership and wrong here: it promoted `@bunny-agent/sdk`, published
  // by another company entirely, over bunny.net's own `@bunny.net/storage-sdk`. Caught by measuring
  // the change against the corpus before it shipped, on the sixth domain.
  // A package in the vendor's own scope literally called `sdk` or `client` was promoted here to
  // rank with the bare vendor name, so that `@directus/sdk` (135k weekly, typed, "Directus
  // JavaScript SDK") could beat `directus` (19k, the server, untyped) on downloads. Measured on the
  // whole corpus and REMOVED: it fixed directus, sanity and configcat, and broke netlify.com, whose
  // `@netlify/api` is "Netlify Node.js API client" at 349k weekly while `@netlify/sdk` is "the
  // toolset for developing Netlify Extensions" at 89k. Promoting by name inverts a case the
  // download counts already had right, so the real fix is to let downloads outweigh a one-step
  // difference in rank rather than to move names between ranks. Left as #47 with the measurement.
  // launchdarkly-js-client-sdk is what LaunchDarkly ships; launchdarkly-eventsource is what it
  // depends on, at 3.1M weekly against 2.8M, and both carry the brand and publish from the
  // same account. Nothing but the shape of the name separates them.
  if (rest !== null) return onlySdkWords(rest) ? 1 : 2
  if (onlySdkWords(part)) return 2
  if (SDK_SHAPE.test(part)) return 3
  return 4
}

/**
 * The ranking itself, exposed so it can be argued with directly. Until 2026-08-18 the only way to
 * test it was through a live registry search, which is why a promotion that handed one vendor
 * another company's package was found by measuring the corpus rather than by a rule.
 */
export const shapeRankOf = (name: string, domain: string): number => shapeRank(name, vendorOf(domain))

/** Is this the package a developer installs, or just something the vendor happens to publish? */
export function looksLikeEntryPackage(name: string, domain: string): boolean {
  return shapeRank(name, vendorOf(domain)) <= 3
}

type Candidate = {
  name: string
  version: string
  publishedAt: number
  description: string
  keywords: string[]
  maintainers: { name: string; email: string }[]
  links: string[]
}

/** The registry's own npm links point a package at itself, so they prove nothing about anyone. */
const candidateOf = (hit: NpmSearchHit['package']): Candidate => ({
  name: hit.name,
  version: hit.version ?? '',
  publishedAt: Date.parse(hit.date ?? '') || 0,
  description: hit.description ?? '',
  keywords: hit.keywords ?? [],
  maintainers: (hit.maintainers ?? []).map((one) => ({ name: one.username ?? one.name ?? '', email: one.email ?? '' })),
  links: Object.values(hit.links ?? {}).filter(
    (link): link is string => Boolean(link) && !/^https?:\/\/(www\.)?npmjs\.com\//i.test(link),
  ),
})

/** How well the registry answers "whose package is this", which is not how likely it looks. */
type Ownership = 'proved' | 'suggested' | 'none'

/**
 * Who publishes this. The maintainer list arrives with every search result and is the only
 * field on it a stranger cannot help themselves to: @utdk/launchdarkly is maintained by an
 * unrelated person, the third party behind the `statuspage.io` package links to Atlassian's
 * domain because it wraps it, and @betterstack/upload-client sits in a scope registered by a
 * different company altogether.
 *
 * The account being the company proves it. The account merely carrying the company's name is
 * a person, and which company they work for is not a thing a handle can settle.
 */
function maintainerOwnership(candidate: Pick<Candidate, 'maintainers'>, vendor: Vendor): Ownership {
  let best: Ownership = 'none'
  for (const maintainer of candidate.maintainers) {
    if (handleIsVendor(maintainer.name, vendor)) return 'proved'
    const [local, host] = maintainer.email.split('@')
    if (host) {
      // hello@raygun.io maintains raygun.com's packages: a company mails from more than one
      // tld. packages@bunny-launcher.com does not maintain bunny.net's, so what sits in front
      // of the tld has to be the vendor's whole name rather than the start of somebody else's.
      if (flatten(host) === vendor.flatDomain || host.toLowerCase().endsWith(`.${vendor.domain}`)) {
        return 'proved'
      }
      // The same name on a different registration is a name, not a proof. usefathom.com is
      // Fathom the analytics product and fathom.video is Fathom the meeting notetaker, and a
      // rule that reads the label in front of the tld hands one company the other's SDK. It
      // still counts as a suggestion, which is what the corroboration below is there to weigh.
      if (isVendorName(host.split('.')[0], vendor)) best = 'suggested'
      if (handleMentionsVendor(local, vendor)) best = 'suggested'
    }
    if (handleMentionsVendor(maintainer.name, vendor)) best = 'suggested'
  }
  return best
}

const githubRepoOf = (url: string): string | null =>
  url.match(/github\.com[/:]([a-z0-9._-]+\/[a-z0-9._-]+)/i)?.[1]?.replace(/\.git$/, '').toLowerCase() ?? null

/** Whether the package points back at the vendor's own site, which is a claim it makes about itself. */
const linksToVendorSite = (candidate: Pick<Candidate, 'links'>, vendor: Vendor): boolean =>
  candidate.links.some((link) => sameSite(link, vendor.domain))

/** Code hosts say who wrote it, never which company sells it, so they cannot contradict anything. */
const CODE_HOSTS = /^(?:www\.)?(?:github\.com|gitlab\.com|bitbucket\.org|npmjs\.com|codeberg\.org)$/i

/**
 * A suggestion that points somewhere else is not a suggestion. `fathom-typescript` is published
 * by the handle `fathomai` and describes itself as "Fathom's official TypeScript SDK", two
 * mentions of a brand token that two companies share. Its code sits in github.com/fathom-video,
 * the meeting notetaker, while the domain we were asked about is usefathom.com, an analytics
 * product that never names it. Weak signals about a shared name do not add up to proof, and the
 * one place the code actually lives outvotes both of them.
 *
 * Only ever consulted to demote a suggestion. A package whose account or repository already
 * proved the vendor owns it is not second-guessed by this.
 */
function pointsAtAnotherCompany(candidate: Pick<Candidate, 'links'>, vendor: Vendor, siteRepos: string[]): boolean {
  const productSites = candidate.links.filter((link) => {
    try {
      return !CODE_HOSTS.test(new URL(link).hostname)
    } catch {
      return false
    }
  })
  if (productSites.length > 0 && !productSites.some((link) => sameSite(link, vendor.domain) || isVendorHost(link, vendor))) {
    return true
  }
  const orgs = candidate.links
    .map(githubRepoOf)
    .filter((repo): repo is string => repo !== null)
    .map((repo) => repo.split('/')[0])
  if (orgs.length === 0) return false
  const siteOrgs = siteRepos.map((repo) => repo.split('/')[0])
  return !orgs.some((org) => orgCouldBeVendor(org, vendor) || siteOrgs.includes(org))
}

/**
 * An org that could be the company's own, read as loosely as the names companies actually use and
 * no looser. Only the shortening direction: dropboxsign.com publishes out of github.com/dropbox,
 * which is its own name with the product dropped. The lengthening direction is the one that costs
 * us, because a name plus another word is how a sibling company is named rather than how a company
 * abbreviates itself, and github.com/fathom-video is a different company from usefathom.com.
 */
function orgCouldBeVendor(org: string, vendor: Vendor): boolean {
  if (orgIsVendor(org, vendor)) return true
  const flat = flatten(org)
  return flat.length >= 5 && [vendor.flatDomain, ...vendor.aliases].some((name) => name.startsWith(flat))
}

/** A company keeps more than one name: livekit.io serves livekit.com, and both are theirs. */
function isVendorHost(url: string, vendor: Vendor): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase()
    return isVendorName(registrableDomain(host).split('.')[0], vendor)
  } catch {
    return false
  }
}

/**
 * Whose package this is, and how much of it we can show. What settles it is a signal that names
 * the publisher: the account, a repo in the vendor's GitHub org, or the repo the vendor links
 * from their own site - founders publish from personal accounts, and nothing in searchkit.co's
 * or slatejs.org's maintainer lists says the company.
 *
 * A scope that reads like the vendor's is not one of those. github.com/betterstack and
 * @betterstack/* belong to a different company than betterstack.com, so a scope, or a handle
 * with the name somewhere inside it, only names an owner when the package agrees: it says what
 * it is for, or it points back at the vendor's site.
 *
 * Somebody else's scope overrules the lot unless the package itself says whose it is.
 * @openfin/core is published by people who mail from here.io, a different company than
 * here.com, and @automata-network/cctp-sdk is Circle's CCTP under an account with `xata` in
 * the handle. A fork keeps the upstream repository too: @boundstate/editorjs-attaches points
 * at github.com/editor-js/attaches and is nobody's but boundstate's.
 */
function ownershipOf(
  candidate: Pick<Candidate, 'name' | 'maintainers' | 'links' | 'description' | 'keywords'>,
  vendor: Vendor,
  siteRepos: string[],
): Ownership {
  const scope = candidate.name.startsWith('@') ? candidate.name.slice(1).split('/')[0] : null
  const ownScope = scope !== null && isVendorScope(scope, vendor)
  const foreignScope = scope !== null && !ownScope

  const saysWhose = saysItIsAboutTheVendor(candidate, vendor) || linksToVendorSite(candidate, vendor)
  if (foreignScope && !saysWhose) return 'none'

  const repos = candidate.links.map(githubRepoOf).filter((repo): repo is string => repo !== null)
  const inVendorRepo =
    !foreignScope &&
    repos.some((repo) => orgIsVendor(repo.split('/')[0], vendor) || siteRepos.includes(repo))
  const proof = maintainerOwnership(candidate, vendor)
  if (proof === 'proved' || inVendorRepo) return 'proved'

  // The org a page links to first is whatever the page links to first: honeybadger.io's docs
  // link github.com/org/repo and betterstack.com links Algolia's DocSearch. It is the weakest
  // thing we have, so it only counts for a package that already reads like the vendor's own.
  const siteOrgs = siteRepos.map((repo) => repo.split('/')[0])
  const nearVendor =
    proof === 'suggested' ||
    ownScope ||
    (!foreignScope &&
      repos.some((repo) => siteOrgs.includes(repo.split('/')[0])) &&
      shapeRank(candidate.name, vendor) <= 3)
  if (!nearVendor || !saysWhose) return 'none'
  // Never against a package sitting in the vendor's own scope. A scope is registered once and
  // held by one account, so where its code is mirrored says nothing we did not already know.
  if (ownScope) return 'suggested'
  return pointsAtAnotherCompany(candidate, vendor, siteRepos) ? 'none' : 'suggested'
}

const monthsSince = (at: number) => (at === 0 ? 0 : (Date.now() - at) / (1000 * 60 * 60 * 24 * 30.44))

/** Years without a publish, or a version that is still a draft, is the vendor telling us it is not the one. */
const isDormant = (candidate: Candidate) => monthsSince(candidate.publishedAt) >= 24

/**
 * `agora` has no repository, no description and no keywords, and is published by agora.build,
 * a different company from agora.io. A package that says nothing about itself is not an SDK
 * anyone could install on purpose.
 */
const saysNothing = (candidate: Candidate) =>
  candidate.description.trim() === '' && candidate.keywords.length === 0
const isProvisional = (candidate: Candidate) => candidate.version.includes('-') || candidate.version.startsWith('0.')
/** Never released at all, as opposed to released early: 0.0.2 is a name taken and left. */
const isStub = (candidate: Candidate) => candidate.version.startsWith('0.0.')

const MIN_WEEKLY_DOWNLOADS = 1000

/** How many times the installs it takes to overturn a name ranking that says nothing. */
const FAR_MORE_INSTALLED = 3

/**
 * What it takes to unseat a front-runner that is alive, recent and installed. Higher than the
 * margin against an unsettled one because the front-runner's name is doing real work here: it is
 * the shape a developer types, and only a difference nobody can call noise should overrule it.
 */
const FAR_MORE_INSTALLED_THAN_A_SETTLED_ONE = 5

/** Past this, a package is not one the vendor is still shipping and its name proves little. */
const STILL_SHIPPING_MONTHS = 12

/**
 * How far down the shape ranking usage is allowed to speak, at one request each. It is the cost of
 * the whole ranking: measured 2026-08-18, these counts are sixteen of a scan's twenty-odd requests
 * to npm and 89 of 177 scans meet a limit there, so halving the list looks like the obvious saving.
 *
 * It was tried at eight and measured on the whole corpus before shipping, and the corpus said no:
 * three rows changed package and two of them for the worse. agora.io moved from agora-rtc-sdk-ng,
 * the SDK a developer installs, to agora-token, a token builder, and commercetools.com from
 * @commercetools/platform-sdk to @commercetools/sdk-client, which last shipped fifteen months
 * earlier. The counts down the list are not decoration: they are what stops a well-named sibling
 * from winning. Sixteen stays until something cheaper than a lookup can tell those two apart.
 */
const MOST_DOWNLOAD_LOOKUPS = 16

function saysItIsAboutTheVendor(what: { description: string; keywords: string[] }, vendor: Vendor): boolean {
  return (
    mentionsVendorName(what.description, vendor) ||
    what.keywords.some((keyword) => mentionsVendorName(keyword, vendor))
  )
}

/**
 * A package whose name says nothing about the vendor can still be the SDK - chromadb is
 * trychroma.com's and @amplitude/analytics-browser is Amplitude's - but so is every internal
 * library a company open-sources. allegro.pl publishes worker-nodes, a thread pool, and
 * convert-description, a helper for its own API at 351 installs a week. What separates them is
 * whether the package says it is about the product, and whether anyone installs it.
 */
function looksLikeTheirProduct(candidate: Candidate, vendor: Vendor, downloads: number): boolean {
  if (shapeRank(candidate.name, vendor, candidate.description) < 4) return true
  return saysItIsAboutTheVendor(candidate, vendor) && downloads >= MIN_WEEKLY_DOWNLOADS
}

/**
 * A maintainer whose own name carries the vendor's is a handle for the rest of the vendor's
 * shelf, and the registry will list it. It is the only way to reach a package named after
 * neither the brand nor the domain: highlight.io's SDK is `highlight.run`, which no search for
 * "highlight" returns within twenty results.
 *
 * Read only off packages already shown to be the vendor's. Reading them off search hits walked
 * from @openfin/node-adapter, which here.com does not publish, to the shelf of a person whose
 * handle ends in -here, and handed here.com OpenFin's core.
 */
function vendorMaintainers(candidates: Candidate[], vendor: Vendor): string[] {
  const handles = new Set<string>()
  for (const candidate of candidates) {
    for (const maintainer of candidate.maintainers) {
      if (maintainer.name && handleMentionsVendor(maintainer.name, vendor)) handles.add(maintainer.name)
    }
  }
  // More than one, because a company's packages are split across its people: the account that
  // publishes highlight.io's framework bindings does not publish highlight.run. Sorted, because
  // which three shelves get read decides the candidate pool, and unsorted they arrive in the
  // order the registry answered the searches in.
  return [...handles].sort(compareNames).slice(0, 3)
}

/**
 * Last resort when no install snippet is on the site. Searches the domain as well as the
 * brand, because the package is often named after the site (htmx.org) and a bare brand
 * query returns a squatted namesake instead.
 *
 * Everything it returns has been shown to be the vendor's. When nothing can be shown, it
 * returns nothing: a package we cannot attribute is not a weaker finding about the vendor,
 * it is an absence of one about us.
 */
export async function searchNpmForDomain(
  domain: string,
  /** Repositories carrying the vendor's name that their own pages link to. */
  linkedRepos: string[],
  /** A name we already rejected, so the search cannot hand back the same draft it was called to beat. */
  reject: string | null = null,
): Promise<NpmMatch | null> {
  const vendor = vendorOf(domain)
  // GitHub does not distinguish DataDog from datadog and neither does a comparison of the two.
  const siteRepos = linkedRepos.map((repo) => repo.toLowerCase())

  const queries = [domain, ...vendor.aliases, ...shorterNamesInRepos(siteRepos, vendor)]
  const searches = await inParallel([...new Set(queries)], (query) => searchRegistry(query))
  // Ranking what did come back would answer off part of the shelf, and which part is whichever
  // request the registry chose to refuse. That is not a weaker finding about the vendor.
  if (searches.some((hits) => hits === null)) return null

  const byName = new Map<string, Candidate>()
  for (const hit of searches.flatMap((hits) => hits ?? [])) {
    if (hit.package.name === reject) continue
    if (isPlaceholder(hit.package.name) || byName.has(hit.package.name)) continue
    byName.set(hit.package.name, candidateOf(hit.package))
  }

  // On a package nobody has published for years, only the account will do: github.com/betterstack
  // belongs to an unrelated company whose upload-client last shipped in 2019 from a personal
  // address, and a repo in an org of that name would otherwise hand it to betterstack.com.
  const isTheirs = (candidate: Candidate) =>
    ownershipOf(candidate, vendor, siteRepos) !== 'none' &&
    !saysNothing(candidate) &&
    (!isDormant(candidate) || maintainerOwnership(candidate, vendor) === 'proved')

  let owned = [...byName.values()].filter(isTheirs)

  const handles = vendorMaintainers(owned, vendor)
  const shelves = await inParallel(handles, (handle) => searchRegistry(`maintainer:${handle}`, 50))
  if (shelves.some((hits) => hits === null)) return null
  for (const hit of shelves.flatMap((hits) => hits ?? [])) {
    if (isPlaceholder(hit.package.name) || byName.has(hit.package.name)) continue
    const candidate = candidateOf(hit.package)
    byName.set(candidate.name, candidate)
    if (isTheirs(candidate)) owned.push(candidate)
  }

  // A CLI or a framework binding is the vendor's own and still not what a developer installs
  // to use them, so it does not stand in for an SDK we could not find.
  owned = owned.filter((candidate) => shapeRank(candidate.name, vendor, candidate.description) < 5)
  if (owned.length === 0) return null

  // What the cheap signals say, before anything is asked about real usage. A stub the vendor
  // published once and left is its own tier: statsig.com's `statsig` is the name a search wants
  // to hand back for ever, and it is 0.0.2 against the 3.33.4 of @statsig/js-client.
  const cheapRank = (candidate: Candidate) =>
    Number(isDormant(candidate)) * 100 +
    Number(isStub(candidate)) * 25 +
    shapeRank(candidate.name, vendor, candidate.description) * 10 +
    Number(isProvisional(candidate))
  // Best first and shortest first, and deliberately not the best tier alone: the package a
  // developer installs is sometimes a step down the name ranking from a sibling nobody
  // installs, and the download counts are the only thing that says so.
  const shortlist = [...owned]
    .sort((a, b) => cheapRank(a) - cheapRank(b) || a.name.length - b.name.length || compareNames(a.name, b.name))
    .slice(0, MOST_DOWNLOAD_LOOKUPS)

  // Every one of them is priced, and skipping the ones that look unlikely is not the saving it
  // seems: the guard below refuses to answer at all when a candidate we could not price ranks at
  // or above the winner, and a candidate nobody asked about is indistinguishable there from one
  // the registry refused. Cutting this list is an attribution change and belongs with the
  // measurement that #47 needed, not with a change about load.
  const counts = await weeklyDownloadsFor(shortlist.map((candidate) => candidate.name))
  const ranked = shortlist.map((candidate) => ({ candidate, downloads: counts.get(candidate.name) ?? null }))

  const priced = ranked.filter(
    (entry): entry is { candidate: Candidate; downloads: number } => entry.downloads !== null,
  )
  const plausible = priced.filter((entry) => looksLikeTheirProduct(entry.candidate, vendor, entry.downloads))
  if (plausible.length === 0) return null

  // The cheap signals decide and real usage breaks their ties. Ranking on installs first hands
  // mapbox.com @mapbox/node-pre-gyp, a build tool at 15M installs a week, and datadoghq.com
  // @datadog/pprof: what a vendor's most downloaded package is has little to do with what a
  // developer installs to use them.
  const ordered = [...plausible].sort(
    (a, b) => cheapRank(a.candidate) - cheapRank(b.candidate) || b.downloads - a.downloads,
  )
  const winner = (await settledOnUsage(ordered, vendor)) ?? ordered[0]
  // A candidate the registry would not price could have won: the only thing between it and the
  // winner is a request that was refused. mapbox.com was published as @mapbox/mapbox-gl-supported
  // on the scan where mapbox-gl's own lookup came back 429 and as mapbox-gl on the scan before
  // it, off the same page, because a refused lookup counted as a package nobody installs.
  if (ranked.some((entry) => entry.downloads === null && cheapRank(entry.candidate) <= cheapRank(winner.candidate))) {
    return null
  }
  const contenders = ordered
    .filter(
      (entry) =>
        cheapRank(entry.candidate) === cheapRank(winner.candidate) && entry.downloads * 2 >= winner.downloads,
    )
    .slice(0, 3)
    .map((entry) => entry.candidate.name)
  const name = await preferUmbrella(contenders, vendor)
  // Facts about the package we are actually returning, which is not always the one that ranked
  // first: preferUmbrella can pick a different contender. Rivals are counted by shape and download
  // weight alone, never by whether they have types, because looking for a better package only when
  // the answer would be an accusation is shopping for the verdict.
  const chosen = byName.get(name) ?? winner.candidate
  return {
    name,
    confidence: 'strong',
    ownership: ownershipOf(chosen, vendor, siteRepos),
    saysWhose: saysItIsAboutTheVendor(chosen, vendor) || linksToVendorSite(chosen, vendor),
    rivals: Math.max(contenders.length - 1, 0),
  }
}

/**
 * What the download counts say when the name that won says nothing about the package it names.
 * A shape ranking is worth something on a package the vendor still publishes and people
 * install; on a 0.x, on one that has not shipped in a year, or on one nobody installs, it is a
 * name and no more, and a sibling a tier down with three times the installs is what a developer
 * is actually installing. @mapbox/mapbox-sdk is 0.16.2 against mapbox-gl at ten times its
 * installs, @commercetools/sdk-client last shipped fifteen months before
 * @commercetools/platform-sdk, and @bunnyapp/api-client - a CRM at 79 installs a week - is the
 * best-named thing a search for bunny.net returns.
 *
 * The exception to the exception is a package that ships inside the front runner, which is
 * downloaded more for that reason alone: apify pulls in apify-client and quill pulls in
 * quill-delta. One manifest read settles it, and only when there is something to settle.
 */
/**
 * Whether the package's own description says it is the thing you install to talk to the vendor.
 *
 * The one signal in this whole ranking that comes from the artefact rather than from the shape of
 * its name, and the three cases that forced it read the same way to a person and differently to a
 * name ranking:
 *   directus                  "a real-time API and App dashboard for managing SQL database content"
 *   @directus/sdk             "Directus JavaScript SDK"
 *   @mux/mux-node             "The official TypeScript library for the Mux API"
 *   onesignal-ngx             "a JavaScript module ... for a website or app that uses Angular"
 *
 * The vendor has to be named in it. "OpenAPI client" alone says nothing about whose.
 */
const CALLS_ITSELF_A_LIBRARY = /\b(sdk|client|client library|library|bindings?)\b/i

/**
 * The same question a rule can ask directly, so the words that now decide attribution can be
 * argued with without a live registry. Until #47 the only testable half of this ranking was the
 * shape of the name, which is exactly the half that was wrong.
 */
export const readsAsTheirLibrary = (name: string, description: string, domain: string): boolean =>
  describesItselfAsTheLibrary({ name, description, keywords: [] } as unknown as Candidate, vendorOf(domain))

function describesItselfAsTheLibrary(candidate: Candidate, vendor: Vendor): boolean {
  const said = candidate.description ?? ''
  if (!CALLS_ITSELF_A_LIBRARY.test(said)) return false
  return saysItIsAboutTheVendor(candidate, vendor)
}

async function settledOnUsage(
  ordered: { candidate: Candidate; downloads: number }[],
  vendor: Vendor,
): Promise<{ candidate: Candidate; downloads: number } | null> {
  const front = ordered[0]
  const shape = (candidate: Candidate) => shapeRank(candidate.name, vendor, candidate.description)
  const unsettled =
    isProvisional(front.candidate) ||
    monthsSince(front.candidate.publishedAt) >= STILL_SHIPPING_MONTHS ||
    front.downloads < MIN_WEEKLY_DOWNLOADS
  // A front-runner that is alive and installed is not beyond challenge, it is just expensive to
  // beat. Until now a settled front-runner ended the question, and that is how directus.com was
  // published as `directus` (the server, 19k weekly, untyped) while `@directus/sdk` ("Directus
  // JavaScript SDK", 135k, typed) sat one rank below it on the shape of its name alone.
  //
  // The earlier attempt at this moved `<scope>/sdk` up a rank instead, and inverted netlify.com,
  // whose `@netlify/api` at 349k already beat `@netlify/sdk` at 89k on downloads. So the names stay
  // where they are and the download counts are allowed to outweigh one step of them, which is the
  // asymmetry that was missing: a better-shaped name is evidence, not a verdict.
  const margin = unsettled ? FAR_MORE_INSTALLED : FAR_MORE_INSTALLED_THAN_A_SETTLED_ONE
  // A front-runner that says in its own description that it is the vendor's library is not up for
  // challenge on installs. @mux/mux-node is "The official TypeScript library for the Mux API" at
  // 309k weekly, and mux-embed and @mux/mux-player are five and seven times that: they are what
  // most people load, and neither is what an agent installs to call the API.
  if (!unsettled && describesItselfAsTheLibrary(front.candidate, vendor)) return null
  const challenger = ordered
    .filter(
      (entry) =>
        entry !== front &&
        !isDormant(entry.candidate) &&
        !isStub(entry.candidate) &&
        // One step of name shape normally, two when the challenger's own description says it is the
        // library. `directus` is the server and ranks 0 because the name IS the vendor name, while
        // `@directus/sdk` ranks 2 and says "Directus JavaScript SDK": a gap the name ranking cannot
        // close and the words close immediately.
        shape(entry.candidate) <=
          shape(front.candidate) + (describesItselfAsTheLibrary(entry.candidate, vendor) ? 2 : 1) &&
        entry.downloads >= front.downloads * margin,
    )
    .sort((a, b) => b.downloads - a.downloads)[0]
  if (!challenger) return null
  const facts = await fetchPackageFacts(front.candidate.name)
  return facts?.dependencies.includes(challenger.candidate.name) ? null : challenger
}

/**
 * The vendor's own name with the part their domain added taken off, when one of the
 * repositories on their site is named that: slatejs.org links ianstormtaylor/slate and their
 * package is `slate`, which no search for "slatejs" returns. Only ever a shorter form of the
 * name we already have, so it cannot turn into a search for whatever else a page links.
 */
function shorterNamesInRepos(siteRepos: string[], vendor: Vendor): string[] {
  const names = siteRepos.map((repo) => repo.split('/')[1]).filter(Boolean)
  return [...new Set(names)]
    .filter((name) => {
      const flat = flatten(name)
      return flat.length >= 4 && vendor.aliases.some((alias) => alias.length > flat.length && alias.startsWith(flat))
    })
    .slice(0, 1)
}

/**
 * An umbrella package installs the vendor's other packages, and every one of them is therefore
 * downloaded at least as often as it is: @sinch/sdk-client ships inside the eight service
 * packages that @sinch/sdk-core pulls in, and finishes ahead of it on weekly installs. Which
 * of two packages contains the other is in the manifest and nowhere else.
 *
 * Only ever asked of candidates the cheap signals could not separate, so it cannot promote a
 * plugin over an SDK.
 */
/** What one manifest read says about a name we found on the vendor's own page. */
async function readScrapedPackage(
  name: string,
  vendor: Vendor,
  linkedRepos: string[],
): Promise<{ theirs: boolean; aboutThem: boolean; draft: boolean }> {
  const facts = await fetchPackageFacts(name)
  if (!facts) return { theirs: false, aboutThem: false, draft: false }
  return {
    draft: facts.version.startsWith('0.0.') || facts.version.includes('-'),
    theirs:
      ownershipOf(
        {
          name,
          maintainers: facts.maintainers,
          links: [facts.repository, facts.homepage].filter(Boolean),
          description: facts.description,
          keywords: facts.keywords,
        },
        vendor,
        linkedRepos.map((repo) => repo.toLowerCase()),
      ) !== 'none',
    aboutThem: saysItIsAboutTheVendor(facts, vendor),
  }
}

async function preferUmbrella(names: string[], vendor: Vendor): Promise<string> {
  if (names.length < 2) return names[0]
  const facts = await inParallel(names, (name) => fetchPackageFacts(name))
  const scored = names.map((name, index) => ({
    name,
    pullsIn: (facts[index]?.dependencies ?? []).filter((dependency) => carriesVendorName(dependency, vendor)).length,
  }))
  scored.sort((a, b) => b.pullsIn - a.pullsIn)
  return scored[0].name
}

type Attribution = {
  npmPackage: string | null
  npmSource: NpmSource | null
  npmConfidence: 'strong' | null
  npmOwnership: 'proved' | 'suggested' | null
  npmSaysWhose: boolean | null
  npmRivals: number | null
  githubRepo: string | null
}

/** Which package on the registry is this vendor's, and how sure we are of it. */
export async function attributePackage(
  domain: string,
  html: string,
  llmsBody: string,
  docsPage: Fetched | null,
): Promise<Attribution> {
  const vendor = vendorOf(domain)
  let npmPackage = await pickNamedPackage(namedPackages(html), vendor)
  let npmSource: NpmSource | null = npmPackage ? 'site' : null
  let siteRepos = findGithubRepos(html, vendor)

  // Home pages sell; docs pages install. Look there too when the home page is silent.
  if ((!npmPackage || siteRepos.length === 0) && docsPage?.ok) {
    const fromDocs = await pickNamedPackage(namedPackages(docsPage.body), vendor)
    if (!npmPackage && fromDocs) {
      npmPackage = fromDocs
      npmSource = 'docs'
    }
    siteRepos = [...new Set([...siteRepos, ...findGithubRepos(docsPage.body, vendor)])]
  }

  if (!npmPackage && llmsBody) {
    npmPackage = (await pickNamedPackage(namedPackages(llmsBody), vendor)) ?? findCdnPackage(llmsBody)
    if (npmPackage) npmSource = 'llms'
  }

  let npmConfidence: 'strong' | null = null
  let npmOwnership: 'proved' | 'suggested' | null = null
  let npmSaysWhose: boolean | null = null
  let npmRivals: number | null = null
  // Only ever set from a search, and set together: three facts about one package are one fact.
  const keep = (searched: NpmMatch) => {
    npmOwnership = searched.ownership === 'none' ? null : searched.ownership
    npmSaysWhose = searched.saysWhose
    npmRivals = searched.rivals
  }

  // A scraped name goes wrong two ways. It can belong to somebody else - a dependency the docs
  // told you to install alongside theirs - which the registry answers by naming who publishes
  // it. Or it can be the vendor's own and still not the package you install to use them:
  // htmx.org's docs install idiomorph, which its authors publish too, so ownership clears it
  // and its shape does not. Either way the search only wins if what it finds reads more like
  // an entry package, which is what keeps froala.com on the froala-editor its llms.txt names.
  if (npmPackage) {
    const scrapedRank = shapeRank(npmPackage, vendor)
    // The exact vendor name used to be waved through unread, so statsig.com matched `statsig`,
    // a generated stub at 0.0.2, while @statsig/js-client shipped the day before the scan. The
    // name being right is not the same as the package being the one you install.
    const { theirs, aboutThem, draft } = await readScrapedPackage(npmPackage, vendor, siteRepos)
    // Three packages share the same unhelpful name shape and only two are worth looking past.
    // @amplitude/analytics-browser calls itself the official Amplitude SDK for Web. idiomorph
    // is "an id-based DOM morphing library" and never mentions htmx. @workos/radar-signals
    // does say WorkOS, and is at 0.0.1, which is the vendor saying it is not the one yet.
    if (!theirs || draft || (scrapedRank >= 4 && !aboutThem)) {
      // A name that is not theirs loses to an equal shape; one that is theirs has to be beaten.
      // A draft has to be beaten by anything at all, including a name of the same shape.
      const ceiling = draft ? shapeRank(npmPackage, vendor) + 1 : theirs ? scrapedRank : scrapedRank + 1
      // statsig.com publishes `statsig`, a generated stub at 0.0.2, and the search kept handing
      // it straight back because its name is the vendor's own. A draft has to lose to something.
      const searched = await searchNpmForDomain(domain, siteRepos, draft ? npmPackage : null)
      if (searched && shapeRank(searched.name, vendor) < ceiling) {
        npmPackage = searched.name
        npmSource = 'registry-search'
        npmConfidence = 'strong'
        keep(searched)
      }
    }
  }

  if (!npmPackage) {
    const searched = await searchNpmForDomain(domain, siteRepos)
    if (searched) {
      npmPackage = searched.name
      npmSource = 'registry-search'
      npmConfidence = searched.confidence
      keep(searched)
    }
  }

  return { npmPackage, npmSource, npmConfidence, npmOwnership, npmSaysWhose, npmRivals, githubRepo: siteRepos[0] ?? null }
}

export async function discover(domain: string): Promise<Discovered> {
  const site = `https://${domain}`
  const [home, llms] = await Promise.all([fetchUrl(site), fetchUrl(`${site}/llms.txt`, { accept: 'text/plain' })])
  const html = home.ok ? home.body : ''
  const base = home.url || site
  const canonical = canonicalSite(domain, home)
  const links = html ? extractLinks(html, base) : []

  const llmsBody = llms.ok && !looksLikeHtml(llms) ? llms.body : ''
  const llmsEntries = llmsBody ? linksFromLlmsTxt(llmsBody, base) : []

  const vendor = vendorSiteOf(domain, base)
  const fromSiteDocs = pickLink(links, DOCS_HINTS, base)
  const fromSiteDeveloper = pickLink(links, DEVELOPER_HINTS, base)
  const onSiteLlms = llmsEntries.filter((entry) => sameSite(entry.url, domain))
  const fromLlmsDocs = pickFromLlms(onSiteLlms, DOCS_HINTS, [/doc/, /guide/, /api reference/, /developer/])
  const fromSitePricing = pickLink(links, PRICING_HINTS, base)
  const fromLlmsPricing = pickFromLlms(onSiteLlms, PRICING_HINTS, [/pricing/, /plans/, /buy/, /cart/])

  // Documentation, pricing and signup are three searches over the same home page that share
  // nothing but the page itself, and they used to run one after another. Only the package
  // hunt has a real dependency, on whichever page turns out to be the documentation.
  const docsPending = (async () => {
    const named = [fromSiteDeveloper, fromSiteDocs, fromLlmsDocs].filter((url): url is string => Boolean(url))
    const [hosts, fromPathDocs] = await Promise.all([
      liveDocsHosts(domain, vendor),
      named.length > 0 ? null : firstLivePath(canonical, DOCS_FALLBACKS),
    ])
    // Only the hosts that could be the documentation are asked for an index, and only the two
    // best-placed of them, because each one that is not there is a request spent finding out.
    // The marketing origin is never one of them: half the sites in the corpus publish an llms.txt
    // at their apex, and it says nothing about where their documentation is.
    const origins = [...new Set(hosts.map(originOf))].filter((origin) => origin !== vendor.homeOrigin).slice(0, 2)
    const published = await inParallel(origins, (origin) => publishesDocsIndex(origin))
    const confirmedDocsOrigins = new Set(origins.filter((_, index) => published[index]))

    // Whichever of these is most plainly the vendor's documentation wins; order in the HTML does not.
    let chosen = await bestDocs([...named, ...hosts, fromPathDocs], vendor, confirmedDocsOrigins)
    // Everything we were pointed at turned out to be something else. A guessed path is worth one
    // more round trip before telling a vendor we could not find their documentation at all:
    // storyblok.com links a landing page at /lp/developers and serves its documentation at /docs.
    if (!chosen && named.length > 0) {
      chosen = await bestDocs([await firstLivePath(canonical, DOCS_FALLBACKS)], vendor, confirmedDocsOrigins)
    }
    return { chosen, hosts }
  })()

  const pricingPending = (async () => {
    // An llms.txt label saying "Outcome-Based Pricing" sent us to a solutions page and the
    // vendor failed the self-serve check on it, while its real /pricing says $0 three times.
    // plausible.io sells from an anchor on its home page, so there is no pricing page to find and
    // "we could not fetch one" was the wrong sentence: the prices are right there, one fetch away.
    const pricingOnHome = /href=["'][^"']*#(pricing|plans)\b/i.test(html) ? site : null
    const { pick: chosenPricing, redirectedAway } = await bestPricing(
      [fromSitePricing, `${site}/pricing`, `${site}/plans`, fromLlmsPricing, pricingOnHome],
      [domain, hostOf(home.url) ?? '', hostOf(canonical) ?? ''],
    )
    // The fallback asks the same two paths again and takes whatever answers, redirect and all, so
    // running it after a rejection hands back the page we just refused and hides the diagnostic
    // behind "we guessed a path". A rejection is an answer: there is no pricing page of theirs here.
    const fallbackPricing = redirectedAway ? null : await firstLivePath(canonical, PRICING_FALLBACKS)
    return { chosenPricing, redirectedAway, pricing: chosenPricing?.url ?? fallbackPricing }
  })()

  // Each source is asked in turn and its candidates have to survive the same test, so a link the
  // vendor wrote is preferred to a guess without being trusted more than one. Nothing here runs
  // until the source in front of it has come up empty.
  // The pages whose served HTML was actually searched for a way in. The sentence we publish when
  // nothing is found names them, and naming a page we never read would be the same error as
  // naming a host we never asked: it reads as thoroughness and is a claim about nothing.
  const signupSearched: string[] = []
  const signupPending = (async () => {
    signupSearched.push(base)
    const fromSite = await firstRealSignup(signupLinksOn(html, base, vendor), 'site', base)
    if (fromSite) return fromSite

    const fromLlms = await firstRealSignup(signupFromLlmsTxt(llmsEntries, vendor), 'llms-txt', base)
    if (fromLlms) return fromLlms

    // The link can sit on a page we have already paid for rather than on the home page:
    // typesense.org links /signup from its pricing page and nowhere on its front page.
    const [{ chosenPricing }, { chosen }] = await Promise.all([pricingPending, docsPending])
    const alreadyRead = [chosenPricing?.page, chosen?.page].filter((page): page is Fetched => Boolean(page?.ok))
    signupSearched.push(...alreadyRead.map((page) => page.url))
    const fromRead = await firstRealSignup(
      alreadyRead.flatMap((page) => signupLinksOn(page.body, page.url, vendor)),
      'site',
      base,
    )
    if (fromRead) return fromRead

    const fromDoor = await firstRealSignup(await signupBehindTheLoginPage(html, base, vendor, signupSearched), 'site', base)
    if (fromDoor) return fromDoor

    const atPath = await firstRealSignup(
      SIGNUP_FALLBACKS.map((path) => `${site}${path}`),
      'fallback-path',
      base,
    )
    return atPath ?? (await signupOnSubdomains(domain, vendor, base))
  })()

  const npmPending = docsPending.then(({ chosen }) => attributePackage(domain, html, llmsBody, chosen?.page ?? null))

  const [{ chosen, hosts }, { chosenPricing, pricing, redirectedAway }, signupPick, npm] = await Promise.all([
    docsPending,
    pricingPending,
    signupPending,
    npmPending,
  ])

  const docs = chosen?.url ?? null
  const docsPage = chosen?.page ?? null
  const pricingPage = chosenPricing?.page ?? null
  const pricesVisibleWithoutJs = chosenPricing?.pricesVisible ?? null
  const signup = signupPick?.url ?? null

  const linkSources = {
    // Compared against the URL we asked for as well as the one we landed on, because a redirect
    // is what turns docs.cloudflare.com into developers.cloudflare.com.
    docs: !chosen
      ? null
      : // Against the URL we asked for, not the one we landed on: resend.com links /docs and
        // serves /docs/introduction, and calling that a guessed path was us guessing.
        [fromSiteDocs, fromSiteDeveloper].includes(chosen.requested)
        ? ('site' as const)
        : chosen.requested === fromLlmsDocs
          ? ('llms-txt' as const)
          : hosts.includes(chosen.requested)
            ? ('subdomain' as const)
            : ('fallback-path' as const),
    pricing:
      pricing === fromSitePricing
        ? ('site' as const)
        : pricing === fromLlmsPricing
          ? ('llms-txt' as const)
          : pricing
            ? ('fallback-path' as const)
            : null,
    signup: signupPick?.source ?? null,
  }

  return {
    site: canonical,
    home,
    resolvedElsewhere: resolvedElsewhereFrom(domain, home),
    docs,
    docsPage,
    pricing,
    pricingPage,
    pricesVisibleWithoutJs,
    pricingRedirectedAway: redirectedAway,
    signup,
    signupSearched,
    npmPackage: npm.npmPackage,
    npmSource: npm.npmSource,
    npmConfidence: npm.npmConfidence,
    npmOwnership: npm.npmOwnership,
    npmSaysWhose: npm.npmSaysWhose,
    npmRivals: npm.npmRivals,
    npmEntryShape: npm.npmPackage ? looksLikeEntryPackage(npm.npmPackage, domain) : null,
    githubRepo: npm.githubRepo,
    linkSources,
  }
}
