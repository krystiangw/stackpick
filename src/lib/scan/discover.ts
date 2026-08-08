import { fetchUrl, inParallel, looksLikeHtml, visibleTextLength, type Fetched } from './http'
import { fetchPackageFacts } from './npm'

export type NpmSource = 'site' | 'docs' | 'llms' | 'registry-search'
export type LinkSource = 'site' | 'llms-txt' | 'fallback-path' | 'subdomain'

export type Discovered = {
  site: string
  home: Fetched
  docs: string | null
  pricing: string | null
  signup: string | null
  docsPage: Fetched | null
  pricingPage: Fetched | null
  /** Null when no pricing page was found at all, false when one exists but shows no prices. */
  pricesVisibleWithoutJs: boolean | null
  npmPackage: string | null
  npmSource: NpmSource | null
  /**
   * Set only for a registry search, and only ever 'strong': a search now returns a package
   * whose maintainers or GitHub org show it is the vendor's, or it returns nothing. There is
   * no hypothesis left to report, and reporting one meant telling a vendor their own package
   * was not clearly theirs.
   */
  npmConfidence: 'strong' | null
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
const SIGNUP_HINTS = [/\/sign[_-]?up/i, /\/register(\/|$)/i, /\/signup/i, /\/get[_-]started/i, /\/create[_-]account/i]

const DOCS_FALLBACKS = ['/docs', '/documentation', '/developers']
const PRICING_FALLBACKS = ['/pricing', '/plans']
const SIGNUP_FALLBACKS = ['/signup', '/sign-up', '/register']

// Large vendors put the two pages an agent needs on their own hosts, and their marketing
// nav is often rendered by JavaScript, so neither the links nor the fallback paths find
// them. Scoring stripe.com as having no documentation was measuring our crawler.
const DOCS_SUBDOMAINS = ['docs', 'developer', 'developers', 'api']
const SIGNUP_SUBDOMAINS = ['app', 'dashboard', 'console', 'accounts']

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
function developerWeight(fetched: Fetched): number {
  if (!fetched.ok) return -1
  const body = fetched.body
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
  const hits = signals.reduce((sum, pattern) => sum + (text.match(pattern)?.length ?? 0), 0)
  const words = Math.min(visibleTextLength(body), 40_000) / 1000
  return hits * 10 + words
}

/** How much a page reads like a price list rather than a page with the word pricing in it. */
function pricingWeight(fetched: Fetched): number {
  if (!fetched.ok) return -1
  const text = fetched.body.toLowerCase()
  const signals = [/\$\d/g, /€\d/g, /per month/g, /\/mo\b/g, /\bper user\b/g, /\bbilled (annually|monthly)\b/g]
  return signals.reduce((sum, pattern) => sum + (text.match(pattern)?.length ?? 0), 0)
}

/**
 * A pricing page whose prices are assembled by JavaScript used to come back as no pricing page
 * at all, and we told bunny.net, filestack.com and plausible.io that we could not find one. They
 * all have one. What they do not have is a price an agent can read from the served HTML, and that
 * is a finding about them rather than a gap in us, so the page comes back either way.
 */
async function bestPricing(
  candidates: (string | null)[],
): Promise<{ url: string; page: Fetched; pricesVisible: boolean } | null> {
  const unique = [...new Set(candidates.filter((url): url is string => Boolean(url)))].slice(0, 4)
  if (unique.length === 0) return null
  const pages = await inParallel(unique, (url) => fetchUrl(url))
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
  if (best) return { url: best.url, page: best.page, pricesVisible: true }
  return fallback ? { ...fallback, pricesVisible: false } : null
}

/** Picks the most developer-looking candidate, and says nothing when none answer. */
async function bestDocs(candidates: (string | null)[]): Promise<{ url: string; page: Fetched } | null> {
  const unique = [...new Set(candidates.filter((url): url is string => Boolean(url)))].slice(0, 4)
  if (unique.length === 0) return null
  const pages = await inParallel(unique, (url) => fetchUrl(url))
  let best: { url: string; page: Fetched; weight: number } | null = null
  for (const [index, page] of pages.entries()) {
    const weight = developerWeight(page)
    if (weight < 0) continue
    if (!best || weight > best.weight) best = { url: unique[index], page, weight }
  }
  return best ? { url: best.url, page: best.page } : null
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

/** A fallback path only counts if it answers with real HTML, not an SPA shell 404. */
async function firstLivePath(site: string, paths: string[]): Promise<string | null> {
  for (const path of paths) {
    const got = await fetchUrl(`${site}${path}`)
    if (got.ok && looksLikeHtml(got) && visibleTextLength(got.body) > 200) return got.url
  }
  return null
}

const readsLikeAPage = (got: Fetched) => got.ok && looksLikeHtml(got) && visibleTextLength(got.body) > 200

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
 * Probes prefix.domain in order, and only walks paths on a host that answered at all.
 * A host that does not resolve costs one failed DNS lookup, not a timeout per path.
 */
async function firstLiveSubdomain(domain: string, prefixes: string[], paths: string[]): Promise<string | null> {
  const roots = await inParallel(prefixes, (prefix) => fetchUrl(`https://${prefix}.${domain}`))
  // A subdomain that redirects off-site is not this vendor's page. docs.statuspage.io served
  // a dead Zendesk placeholder and we reported its 303 characters as their documentation.
  const onSite = (got: Fetched) => readsLikeAPage(got) && sameSite(got.url, domain)

  for (const [index, root] of roots.entries()) {
    if (!root.ok) continue
    if (paths.length === 0) {
      if (onSite(root)) return root.url
      continue
    }
    const host = `https://${prefixes[index]}.${domain}`
    const pages = await inParallel(paths, (path) => fetchUrl(`${host}${path}`))
    const hit = pages.find(onSite)
    if (hit) return hit.url
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
  const ranked = await inParallel(names.slice(0, 6), async (name) => ({
    name,
    rank: Math.max(shapeRank(name, vendor) - 2, 0),
    downloads: await weeklyDownloads(name),
  }))
  ranked.sort((a, b) => a.rank - b.rank || b.downloads - a.downloads)
  return ranked[0].name
}

async function weeklyDownloads(name: string): Promise<number> {
  const stats = await fetchUrl(`https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(name)}`, {
    accept: 'application/json',
  })
  if (!stats.ok) return 0
  try {
    return (JSON.parse(stats.body) as { downloads?: number }).downloads ?? 0
  } catch {
    return 0
  }
}

/** Vendors often name their package only in a CDN URL: cdn.jsdelivr.net/npm/froala-editor@latest */
function findCdnPackage(text: string): string | null {
  const match = text.match(/(?:jsdelivr\.net\/npm|unpkg\.com)\/(@?[a-z0-9._-]+(?:\/[a-z0-9._-]+)?)/i)
  return match ? match[1].replace(/@[\d.^~].*$/, '') : null
}

function findGithubRepo(html: string): string | null {
  const match = html.match(/github\.com\/([a-z0-9._-]+\/[a-z0-9._-]+)/i)
  if (!match) return null
  const repo = match[1].replace(/\.git$/, '')
  if (/^(features|about|pricing|login|orgs|sponsors)\b/i.test(repo)) return null
  return repo
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

function vendorOf(domain: string): Vendor {
  const brand = domain.split('.')[0].toLowerCase()
  const bare = brand.replace(/^(get|try|use|join|go|my)(?=[a-z]{4,})/, '')
  return {
    domain,
    brand,
    aliases: bare === brand ? [brand] : [brand, bare],
    flatDomain: flatten(domain),
  }
}

/**
 * Whether a name is built out of the vendor's own name. Short brands match only as a whole
 * word: api.video's brand is "api", and every package on the registry contains it.
 */
function carriesVendorName(text: string, vendor: Vendor): boolean {
  const flat = flatten(text)
  if (!flat) return false
  if (flat.startsWith(vendor.flatDomain)) return true
  return vendor.aliases.some((alias) =>
    alias.length >= 4
      ? flat.startsWith(alias) || (alias.startsWith(flat) && flat.length >= 4)
      : text.toLowerCase().split(/[^a-z0-9]+/).includes(alias),
  )
}

/**
 * Whether a handle is built round the vendor's name wherever it sits in it. People append the
 * company they publish for as often as they prepend it: zane-highlight, philipkiely-baseten,
 * raygunowner. Package names get the stricter test above, because nuxt-betterstack is somebody
 * else's integration and not Better Stack's package.
 */
function handleMentionsVendor(text: string, vendor: Vendor): boolean {
  const flat = flatten(text)
  if (!flat) return false
  return flat.includes(vendor.flatDomain) || vendor.aliases.some((alias) => alias.length >= 4 && flat.includes(alias))
}

/** Whether prose names the vendor, which a name-shaped test cannot see: "Better Stack Node.js logger". */
function mentionsVendorName(text: string, vendor: Vendor): boolean {
  const words = text.toLowerCase().split(/[^a-z0-9.]+/)
  if (words.some((word) => flatten(word) === vendor.flatDomain || vendor.aliases.includes(flatten(word)))) return true
  return flatten(text).includes(vendor.flatDomain)
}

const githubOrg = (url: string): string | null => url.match(/github\.com[/:]([a-z0-9._-]+)/i)?.[1]?.toLowerCase() ?? null

/**
 * An org that is the vendor's name, allowing for the suffix a company adds when the plain one
 * is taken: honeybadger.io ships from github.com/honeybadger-io, split.io from splitio. "js"
 * is deliberately not in the list, because github.com/highlightjs is a different project than
 * highlight.io.
 */
function orgIsVendor(org: string | null, vendor: Vendor): boolean {
  if (!org) return false
  const flat = flatten(org)
  if (flat === vendor.flatDomain || vendor.aliases.includes(flat)) return true
  return vendor.aliases.some((alias) => /^(labs|hq|inc|team|official|tech)$/.test(flat.slice(alias.length)) && flat.startsWith(alias))
}

/** Whether a searched name can carry a point. Anything we cannot attribute is not returned at all. */
export type NpmMatch = { name: string; confidence: 'strong' }

async function searchRegistry(text: string, size = 20): Promise<NpmSearchHit[]> {
  const got = await fetchUrl(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(text)}&size=${size}`, {
    accept: 'application/json',
  })
  if (!got.ok) return []
  try {
    return (JSON.parse(got.body) as { objects?: NpmSearchHit[] }).objects ?? []
  } catch {
    return []
  }
}

const SDK_WORD = /^(sdk|client|node|js|api|core|browser|server)$/
const SDK_SHAPE = /(^|[-.])(sdk|client|node|js|api|core)([-.]|$)/

/**
 * Names that announce the package is something other than the thing you install to use the
 * product: a command line tool, a build step, a framework binding, or the vendor's own
 * plumbing. @algolia/cli, @sinch/node-red-sinch-utility and @basetenlabs/n8n-nodes-baseten are
 * all genuinely the vendor's, and none of them is the SDK we were reporting them as.
 */
const NOT_AN_SDK =
  /(^|[-/])(cli|n8n|node-red|mcp|plugins?|preset|loader|codemod|webpack|vite|rollup|esbuild|babel|eslint|prettier|docs?|examples?|demo|starter|template|tests?|testing|mocks?|fixtures|internal|tools|utils|utility|utilities|types|config|react|vue|angular|svelte|next|nuxt|remix|nest|hono|express|koa|fastify|gatsby|astro|ember|jquery|wordpress|drupal|laravel|rails|django|flutter|ionic|electron)([-/]|$)/

/** The package part of a name, without the scope: @daily-co/daily-js is a daily-js. */
const bareName = (name: string) => (name.startsWith('@') ? (name.split('/')[1] ?? '') : name).toLowerCase()

/** A name that is nothing but the words an SDK is called: sdk-core, js-client-sdk, node. */
function onlySdkWords(text: string): boolean {
  const words = text.split(/[^a-z0-9]+/).filter(Boolean)
  return words.length > 0 && words.every((word) => SDK_WORD.test(word))
}

/** What is left of a name once the vendor's own name is taken off the front of it. */
function afterVendorName(part: string, vendor: Vendor): string | null {
  const flat = flatten(part)
  for (const alias of [vendor.flatDomain, ...vendor.aliases]) {
    if (flat === alias || alias.startsWith(flat)) return ''
    if (flat.startsWith(alias)) return part.toLowerCase().slice(part.toLowerCase().indexOf(alias[0]) + alias.length)
  }
  return null
}

/**
 * How much a name reads like the package a developer installs. Low is better, and the tiers
 * are coarse on purpose: ranking by how much of the brand a name carries once picked
 * froala-pages over froala-editor, so within a tier real usage still decides.
 */
export function shapeRank(name: string, vendor: Vendor, description = ''): number {
  const part = bareName(name)
  if (NOT_AN_SDK.test(part) || NOT_AN_SDK.test(name.toLowerCase())) return 5
  // The package named exactly after the vendor is not always the SDK: `storyblok` is
  // Storyblok's command line tool, and only its own description says so.
  if (/\b(cli|command[- ]line)\b/i.test(description)) return 5
  const rest = afterVendorName(part, vendor)
  if (rest === '') return 0
  // launchdarkly-js-client-sdk is what LaunchDarkly ships; launchdarkly-eventsource is what it
  // depends on, at 3.1M weekly against 2.8M, and both carry the brand and publish from the
  // same account. Nothing but the shape of the name separates them.
  if (rest !== null) return onlySdkWords(rest) ? 1 : 2
  if (onlySdkWords(part)) return 2
  if (SDK_SHAPE.test(part)) return 3
  return 4
}

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

/**
 * Who publishes this. The maintainer list arrives with every search result and is the only
 * field on it a stranger cannot set to whatever they like: @utdk/launchdarkly is maintained by
 * an unrelated person, the third party behind the `statuspage.io` package links to Atlassian's
 * domain because it wraps it, and @betterstack/upload-client sits in a scope registered by a
 * different company altogether. A repo in the vendor's own GitHub org counts too, because
 * founders often publish from personal accounts: searchkit.co and typesense.org both do.
 */
export function maintainedByVendor(candidate: Pick<Candidate, 'maintainers'>, vendor: Vendor): boolean {
  return candidate.maintainers.some((maintainer) => {
    if (handleMentionsVendor(maintainer.name, vendor)) return true
    const [local, host] = maintainer.email.split('@')
    if (!host) return false
    if (flatten(host) === vendor.flatDomain || host.toLowerCase().endsWith(`.${vendor.domain}`)) return true
    // hello@raygun.io maintains raygun.com's packages: a company mails from more than one tld.
    return carriesVendorName(host.split('.')[0], vendor) || handleMentionsVendor(local, vendor)
  })
}

export function publishedByVendor(
  candidate: Pick<Candidate, 'name' | 'maintainers' | 'links'>,
  vendor: Vendor,
  siteOrg: string | null,
): boolean {
  if (maintainedByVendor(candidate, vendor)) return true
  const orgs = candidate.links.map(githubOrg)
  if (orgs.some((org) => orgIsVendor(org, vendor))) return true
  // The org a page links to first is whatever the page links to first: honeybadger.io's docs
  // link github.com/org/repo and betterstack.com links Algolia's DocSearch. It is the weakest
  // proof we have, so it only counts for a package that already reads like the vendor's own.
  return siteOrg !== null && orgs.includes(siteOrg) && shapeRank(candidate.name, vendor) <= 3
}

const monthsSince = (at: number) => (at === 0 ? 0 : (Date.now() - at) / (1000 * 60 * 60 * 24 * 30.44))

/** Years without a publish, or a version that is still a draft, is the vendor telling us it is not the one. */
const isDormant = (candidate: Candidate) => monthsSince(candidate.publishedAt) >= 24
const isProvisional = (candidate: Candidate) => candidate.version.includes('-') || candidate.version.startsWith('0.')

/**
 * A package whose name says nothing about the vendor can still be the SDK - chromadb is
 * trychroma.com's and @amplitude/analytics-browser is Amplitude's - but so is every internal
 * library a company open-sources. allegro.pl publishes worker-nodes, a thread pool, and
 * convert-description, a helper used by 351 installs a week. What separates them is whether
 * the package presents itself as being about the product, and whether anyone installs it.
 */
const MIN_WEEKLY_DOWNLOADS = 1000

function saysItIsAboutTheVendor(what: { description: string; keywords: string[] }, vendor: Vendor): boolean {
  return (
    mentionsVendorName(what.description, vendor) ||
    what.keywords.some((keyword) => mentionsVendorName(keyword, vendor))
  )
}

function looksLikeTheirProduct(candidate: Candidate, vendor: Vendor, downloads: number): boolean {
  if (shapeRank(candidate.name, vendor, candidate.description) < 4) return true
  return saysItIsAboutTheVendor(candidate, vendor) && downloads >= MIN_WEEKLY_DOWNLOADS
}

/**
 * A maintainer whose own name carries the vendor's is a handle for the rest of the vendor's
 * shelf, and the registry will list it. It is the only way to reach a package named after
 * neither the brand nor the domain: highlight.io's SDK is `highlight.run`, which no search for
 * "highlight" returns within twenty results.
 */
function vendorMaintainers(candidates: Candidate[], vendor: Vendor): string[] {
  const handles = new Set<string>()
  for (const candidate of candidates) {
    for (const maintainer of candidate.maintainers) {
      if (maintainer.name && handleMentionsVendor(maintainer.name, vendor)) handles.add(maintainer.name)
    }
  }
  // More than one, because a company's packages are split across its people: the account that
  // publishes highlight.io's framework bindings does not publish highlight.run.
  return [...handles].slice(0, 3)
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
export async function searchNpmForDomain(domain: string, githubRepo: string | null): Promise<NpmMatch | null> {
  const vendor = vendorOf(domain)
  const siteOrg = githubRepo?.split('/')[0].toLowerCase() ?? null

  const queries = [domain, ...vendor.aliases]
  const searches = await inParallel([...new Set(queries)], (query) => searchRegistry(query))

  const byName = new Map<string, Candidate>()
  for (const hit of searches.flat()) {
    if (isPlaceholder(hit.package.name) || byName.has(hit.package.name)) continue
    byName.set(hit.package.name, candidateOf(hit.package))
  }

  // A GitHub org that reads like the vendor's is the weaker of the two proofs, and on a package
  // nobody has published for years it is not enough: github.com/betterstack belongs to an
  // unrelated company whose upload-client last shipped in 2019, and betterstack.com would have
  // been handed it as their SDK.
  const isTheirs = (candidate: Candidate) =>
    publishedByVendor(candidate, vendor, siteOrg) && (!isDormant(candidate) || maintainedByVendor(candidate, vendor))

  let owned = [...byName.values()].filter(isTheirs)

  const handles = vendorMaintainers(owned, vendor)
  const shelves = await inParallel(handles, (handle) => searchRegistry(`maintainer:${handle}`, 50))
  for (const hit of shelves.flat()) {
    if (isPlaceholder(hit.package.name) || byName.has(hit.package.name)) continue
    const candidate = candidateOf(hit.package)
    byName.set(candidate.name, candidate)
    if (isTheirs(candidate)) owned.push(candidate)
  }

  // A CLI or a framework binding is the vendor's own and still not what a developer installs
  // to use them, so it does not stand in for an SDK we could not find.
  owned = owned.filter((candidate) => shapeRank(candidate.name, vendor, candidate.description) < 5)
  if (owned.length === 0) return null

  // Everything the cheap signals cannot separate goes to the download check together. Taking a
  // fixed number instead dropped launchdarkly-js-client-sdk, which sorts late alphabetically
  // and by length among the twenty packages LaunchDarkly publishes.
  const cheapRank = (candidate: Candidate) =>
    Number(isDormant(candidate)) * 100 +
    shapeRank(candidate.name, vendor, candidate.description) * 10 +
    Number(isProvisional(candidate))
  const best = Math.min(...owned.map(cheapRank))
  const shortlist = owned
    .filter((candidate) => cheapRank(candidate) === best)
    .sort((a, b) => a.name.length - b.name.length)
    .slice(0, 20)

  const ranked = await inParallel(shortlist, async (candidate) => ({
    candidate,
    downloads: await weeklyDownloads(candidate.name),
  }))

  const plausible = ranked.filter((entry) => looksLikeTheirProduct(entry.candidate, vendor, entry.downloads))
  if (plausible.length === 0) return null

  plausible.sort((a, b) => b.downloads - a.downloads)
  // A package that ships inside another is downloaded at least as often as it, so the trap
  // shows up as a near tie. A leader ahead by orders of magnitude is not in that trap, and
  // letting the manifest overturn it swapped launchdarkly-js-client-sdk, at 2.8M installs a
  // week, for a deprecated sibling with a longer dependency list.
  const contenders = plausible
    .filter((entry) => entry.downloads * 2 >= plausible[0].downloads)
    .slice(0, 3)
    .map((entry) => entry.candidate.name)
  return { name: await preferUmbrella(contenders, vendor), confidence: 'strong' }
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
  githubRepo: string | null,
): Promise<{ theirs: boolean; aboutThem: boolean; draft: boolean }> {
  const facts = await fetchPackageFacts(name)
  if (!facts) return { theirs: false, aboutThem: false, draft: false }
  return {
    draft: facts.version.startsWith('0.0.') || facts.version.includes('-'),
    theirs: publishedByVendor(
      { name, maintainers: facts.maintainers, links: [facts.repository, facts.homepage].filter(Boolean) },
      vendor,
      githubRepo?.split('/')[0].toLowerCase() ?? null,
    ),
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

export async function discover(domain: string): Promise<Discovered> {
  const site = `https://${domain}`
  const home = await fetchUrl(site)
  const html = home.ok ? home.body : ''
  const base = home.url || site
  const links = html ? extractLinks(html, base) : []

  const llms = await fetchUrl(`${site}/llms.txt`, { accept: 'text/plain' })
  const llmsBody = llms.ok && !looksLikeHtml(llms) ? llms.body : ''
  const llmsEntries = llmsBody ? linksFromLlmsTxt(llmsBody, base) : []

  const fromSiteDocs = pickLink(links, DOCS_HINTS, base)
  const fromSiteDeveloper = pickLink(links, DEVELOPER_HINTS, base)
  const onSiteLlms = llmsEntries.filter((entry) => sameSite(entry.url, domain))
  const fromLlmsDocs = pickFromLlms(onSiteLlms, DOCS_HINTS, [/doc/, /guide/, /api reference/, /developer/])
  const fromSubdomainDocs = await firstLiveSubdomain(domain, DOCS_SUBDOMAINS, [])
  const fromPathDocs =
    (fromSiteDocs ?? fromSiteDeveloper ?? fromLlmsDocs) ? null : await firstLivePath(site, DOCS_FALLBACKS)

  // Whichever of these reads most like developer documentation wins; order in the HTML does not.
  const chosen = await bestDocs([fromSiteDeveloper, fromSubdomainDocs, fromSiteDocs, fromLlmsDocs, fromPathDocs])
  const docs = chosen?.url ?? null
  const docsPage = chosen?.page ?? null

  // An llms.txt label saying "Outcome-Based Pricing" sent us to a solutions page and the
  // vendor failed the self-serve check on it, while its real /pricing says $0 three times.
  const fromSitePricing = pickLink(links, PRICING_HINTS, base)
  const fromLlmsPricing = pickFromLlms(onSiteLlms, PRICING_HINTS, [/pricing/, /plans/, /buy/, /cart/])
  // plausible.io sells from an anchor on its home page, so there is no pricing page to find and
  // "we could not fetch one" was the wrong sentence: the prices are right there, one fetch away.
  const pricingOnHome = /href=["'][^"']*#(pricing|plans)\b/i.test(html) ? site : null
  const chosenPricing = await bestPricing([
    fromSitePricing,
    `${site}/pricing`,
    `${site}/plans`,
    fromLlmsPricing,
    pricingOnHome,
  ])
  const pricing = chosenPricing?.url ?? (await firstLivePath(site, PRICING_FALLBACKS))
  const pricingPage = chosenPricing?.page ?? null
  const pricesVisibleWithoutJs = chosenPricing?.pricesVisible ?? null

  const fromSiteSignup = pickLink(links, SIGNUP_HINTS, base)
  const fromLlmsSignup = pickFromLlms(onSiteLlms, SIGNUP_HINTS, [/sign ?up/, /register/, /get started/, /free trial/])
  const fromPathSignup = (fromSiteSignup ?? fromLlmsSignup) ? null : await firstLivePath(site, SIGNUP_FALLBACKS)
  const fromSubdomainSignup =
    (fromSiteSignup ?? fromLlmsSignup ?? fromPathSignup)
      ? null
      : await firstLiveSubdomain(domain, SIGNUP_SUBDOMAINS, ['/signup', '/register'])
  const signup = fromSiteSignup ?? fromLlmsSignup ?? fromPathSignup ?? fromSubdomainSignup

  const sourceOf = (
    onSite: string | null,
    inLlms: string | null,
    atPath: string | null,
    onSubdomain: string | null,
  ): LinkSource | null =>
    onSite ? 'site' : inLlms ? 'llms-txt' : atPath ? 'fallback-path' : onSubdomain ? 'subdomain' : null

  const linkSources = {
    docs:
      docs === fromSiteDocs || docs === fromSiteDeveloper
        ? ('site' as const)
        : docs === fromLlmsDocs
          ? ('llms-txt' as const)
          : docs === fromSubdomainDocs
            ? ('subdomain' as const)
            : docs
              ? ('fallback-path' as const)
              : null,
    pricing:
      pricing === fromSitePricing
        ? ('site' as const)
        : pricing === fromLlmsPricing
          ? ('llms-txt' as const)
          : pricing
            ? ('fallback-path' as const)
            : null,
    signup: sourceOf(fromSiteSignup, fromLlmsSignup, fromPathSignup, fromSubdomainSignup),
  }

  const vendor = vendorOf(domain)
  let npmPackage = await pickNamedPackage(namedPackages(html), vendor)
  let npmSource: NpmSource | null = npmPackage ? 'site' : null
  let githubRepo = findGithubRepo(html)

  // Home pages sell; docs pages install. Look there too when the home page is silent.
  if ((!npmPackage || !githubRepo) && docsPage?.ok) {
    {
      const fromDocs = await pickNamedPackage(namedPackages(docsPage.body), vendor)
      if (!npmPackage && fromDocs) {
        npmPackage = fromDocs
        npmSource = 'docs'
      }
      githubRepo ??= findGithubRepo(docsPage.body)
    }
  }

  if (!npmPackage && llmsBody) {
    npmPackage = (await pickNamedPackage(namedPackages(llmsBody), vendor)) ?? findCdnPackage(llmsBody)
    if (npmPackage) npmSource = 'llms'
  }

  let npmConfidence: 'strong' | null = null

  // A scraped name goes wrong two ways. It can belong to somebody else - a dependency the docs
  // told you to install alongside theirs - which the registry answers by naming who publishes
  // it. Or it can be the vendor's own and still not the package you install to use them:
  // htmx.org's docs install idiomorph, which its authors publish too, so ownership clears it
  // and its shape does not. Either way the search only wins if what it finds reads more like
  // an entry package, which is what keeps froala.com on the froala-editor its llms.txt names.
  if (npmPackage) {
    const scrapedRank = shapeRank(npmPackage, vendor)
    const { theirs, aboutThem, draft } =
      scrapedRank === 0
        ? { theirs: true, aboutThem: true, draft: false }
        : await readScrapedPackage(npmPackage, vendor, githubRepo)
    // @amplitude/analytics-browser is named after nothing but what it does, and calls itself
    // the official Amplitude SDK for Web. idiomorph, on the same shape, is "an id-based DOM
    // morphing library" and never mentions htmx. Only the second is worth looking past.
    // @workos/radar-signals is WorkOS's and says so, and it is at 0.0.1: a version number is
    // the vendor telling us this is not the package they want a developer to reach for.
    if (!theirs || (scrapedRank >= 4 && (!aboutThem || draft))) {
      // A name that is not theirs loses to an equal shape; one that is theirs has to be beaten.
      const ceiling = theirs ? scrapedRank : scrapedRank + 1
      const searched = await searchNpmForDomain(domain, githubRepo)
      if (searched && shapeRank(searched.name, vendor) < ceiling) {
        npmPackage = searched.name
        npmSource = 'registry-search'
        npmConfidence = 'strong'
      }
    }
  }

  if (!npmPackage) {
    const searched = await searchNpmForDomain(domain, githubRepo)
    if (searched) {
      npmPackage = searched.name
      npmSource = 'registry-search'
      npmConfidence = searched.confidence
    }
  }

  return {
    site,
    home,
    docs,
    docsPage,
    pricing,
    pricingPage,
    pricesVisibleWithoutJs,
    signup,
    npmPackage,
    npmSource,
    npmConfidence,
    npmEntryShape: npmPackage ? looksLikeEntryPackage(npmPackage, domain) : null,
    githubRepo,
    linkSources,
  }
}
