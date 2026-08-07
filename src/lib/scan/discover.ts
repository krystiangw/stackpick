import { fetchUrl, inParallel, looksLikeHtml, visibleTextLength, type Fetched } from './http'

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
  npmPackage: string | null
  npmSource: NpmSource | null
  /** Set only for a registry search: whether the match is evidence or a hypothesis. */
  npmConfidence: 'strong' | 'weak' | null
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

async function bestPricing(candidates: (string | null)[]): Promise<{ url: string; page: Fetched } | null> {
  const unique = [...new Set(candidates.filter((url): url is string => Boolean(url)))].slice(0, 3)
  if (unique.length === 0) return null
  const pages = await inParallel(unique, (url) => fetchUrl(url))
  let best: { url: string; page: Fetched; weight: number } | null = null
  for (const [index, page] of pages.entries()) {
    const weight = pricingWeight(page)
    if (weight <= 0) continue
    if (!best || weight > best.weight) best = { url: unique[index], page, weight }
  }
  return best ? { url: best.url, page: best.page } : null
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

/**
 * Probes prefix.domain in order, and only walks paths on a host that answered at all.
 * A host that does not resolve costs one failed DNS lookup, not a timeout per path.
 */
async function firstLiveSubdomain(domain: string, prefixes: string[], paths: string[]): Promise<string | null> {
  const roots = await inParallel(prefixes, (prefix) => fetchUrl(`https://${prefix}.${domain}`))

  for (const [index, root] of roots.entries()) {
    if (!root.ok) continue
    if (paths.length === 0) {
      if (readsLikeAPage(root)) return root.url
      continue
    }
    const host = `https://${prefixes[index]}.${domain}`
    const pages = await inParallel(paths, (path) => fetchUrl(`${host}${path}`))
    const hit = pages.find(readsLikeAPage)
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

function findNpmPackage(html: string): string | null {
  const fromRegistryLink = html.match(/npmjs\.com\/package\/(@?[a-z0-9._-]+(?:\/[a-z0-9._-]+)?)/i)
  if (fromRegistryLink && !isPlaceholder(fromRegistryLink[1])) return fromRegistryLink[1]
  const fromInstallSnippet = html.match(/npm (?:install|i) (?:--save )?(@?[a-z0-9._-]+(?:\/[a-z0-9._-]+)?)/i)
  if (fromInstallSnippet && fromInstallSnippet[1].length > 2 && !isPlaceholder(fromInstallSnippet[1])) {
    return fromInstallSnippet[1]
  }
  return null
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
  package: { name: string; links?: { homepage?: string; repository?: string }; description?: string }
}

/**
 * Ranks survivors by how much the name looks like the product's main entry package.
 * Downloads would be the obvious tie-break and it is wrong: internal dependencies
 * (@supabase/storage-js) outrank the umbrella package that pulls them in.
 */
function nameAffinity(packageName: string, brand: string): number {
  const name = packageName.toLowerCase()
  if (name === `@${brand}/${brand}-js` || name === `@${brand}/${brand}`) return 5
  if (name === brand) return 4
  if ([`${brand}-js`, `${brand}-sdk`, `${brand}-node`, `${brand}-client`].includes(name)) return 3
  if (name.startsWith(`@${brand}/`)) return 2
  return 1
}

/** Whether a searched name can carry a point, or only a hypothesis. */
export type NpmMatch = { name: string; confidence: 'strong' | 'weak' }

async function searchRegistry(text: string): Promise<NpmSearchHit[]> {
  const got = await fetchUrl(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(text)}&size=20`, {
    accept: 'application/json',
  })
  if (!got.ok) return []
  try {
    return (JSON.parse(got.body) as { objects?: NpmSearchHit[] }).objects ?? []
  } catch {
    return []
  }
}

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

/**
 * A name that only shares a GitHub org with the site is a hypothesis, not a finding.
 * allegro.pl has no JS SDK, and the org filter alone happily returned worker-nodes, an
 * internal utility, which then scored a point for shipping types.
 */
function matchStrength(name: string, links: string[], domain: string, brand: string): 'strong' | 'weak' {
  const lower = name.toLowerCase()
  // A bare @brand/ scope is not enough: @allegro/convert-description is an internal library,
  // and calling it the SDK turned "we do not know" into a failed check.
  const entryNames = [
    domain,
    brand,
    `${brand}-js`,
    `${brand}-sdk`,
    `${brand}-node`,
    `${brand}-client`,
    `@${brand}/${brand}`,
    `@${brand}/${brand}-js`,
    `@${brand}/sdk`,
    `@${brand}/client`,
    `@${brand}/api`,
    `@${brand}/node`,
  ]
  const homed = links.some((link) => hostOf(link) === domain)
  return entryNames.includes(lower) || homed ? 'strong' : 'weak'
}

/**
 * Last resort when no install snippet is on the site. Searches the domain as well as the
 * brand, because the package is often named after the site (htmx.org) and a bare brand
 * query returns a squatted namesake instead.
 */
export async function searchNpmForDomain(domain: string, githubRepo: string | null): Promise<NpmMatch | null> {
  const brand = domain.split('.')[0]
  const org = githubRepo?.split('/')[0].toLowerCase() ?? null

  const [byDomain, byBrand] = await Promise.all([searchRegistry(domain), searchRegistry(brand)])
  const seen = new Set<string>()
  const candidates: { name: string; confidence: 'strong' | 'weak' }[] = []

  for (const hit of [...byDomain, ...byBrand]) {
    const name = hit.package.name
    if (seen.has(name) || isPlaceholder(name)) continue
    const links = Object.values(hit.package.links ?? {}).filter(Boolean) as string[]
    const ours =
      links.some((link) => link.includes(domain)) ||
      (org !== null && links.some((link) => new RegExp(`github\\.com/${org}/`, 'i').test(link)))
    if (!ours) continue
    seen.add(name)
    candidates.push({ name, confidence: matchStrength(name, links, domain, brand) })
  }
  if (candidates.length === 0) return null

  // Name shape alone picked angular-froala (1.7k weekly, last published 2023) over
  // froala-editor (327k weekly, current). Real usage decides; the name only breaks ties.
  const ranked = await inParallel(candidates.slice(0, 10), async (candidate) => {
    const stats = await fetchUrl(`https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(candidate.name)}`, {
      accept: 'application/json',
    })
    let downloads = 0
    try {
      downloads = stats.ok ? ((JSON.parse(stats.body) as { downloads?: number }).downloads ?? 0) : 0
    } catch {
      downloads = 0
    }
    return { ...candidate, downloads }
  })

  ranked.sort(
    (a, b) =>
      Number(b.confidence === 'strong') - Number(a.confidence === 'strong') ||
      b.downloads - a.downloads ||
      nameAffinity(b.name, brand) - nameAffinity(a.name, brand),
  )
  return { name: ranked[0].name, confidence: ranked[0].confidence }
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
  const fromLlmsDocs = pickFromLlms(llmsEntries, DOCS_HINTS, [/doc/, /guide/, /api reference/, /developer/])
  const fromSubdomainDocs = await firstLiveSubdomain(domain, DOCS_SUBDOMAINS, [])
  const fromPathDocs =
    (fromSiteDocs ?? fromSiteDeveloper ?? fromLlmsDocs ?? fromSubdomainDocs) ? null : await firstLivePath(site, DOCS_FALLBACKS)

  // Whichever of these reads most like developer documentation wins; order in the HTML does not.
  const chosen = await bestDocs([fromSiteDeveloper, fromSubdomainDocs, fromSiteDocs, fromLlmsDocs, fromPathDocs])
  const docs = chosen?.url ?? null
  const docsPage = chosen?.page ?? null

  // An llms.txt label saying "Outcome-Based Pricing" sent us to a solutions page and the
  // vendor failed the self-serve check on it, while its real /pricing says $0 three times.
  const fromSitePricing = pickLink(links, PRICING_HINTS, base)
  const fromLlmsPricing = pickFromLlms(llmsEntries, PRICING_HINTS, [/pricing/, /plans/, /buy/, /cart/])
  const chosenPricing = await bestPricing([fromSitePricing, `${site}/pricing`, `${site}/plans`, fromLlmsPricing])
  const pricing = chosenPricing?.url ?? (await firstLivePath(site, PRICING_FALLBACKS))
  const pricingPage = chosenPricing?.page ?? null

  const fromSiteSignup = pickLink(links, SIGNUP_HINTS, base)
  const fromLlmsSignup = pickFromLlms(llmsEntries, SIGNUP_HINTS, [/sign ?up/, /register/, /get started/, /free trial/])
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

  let npmPackage = findNpmPackage(html)
  let npmSource: NpmSource | null = npmPackage ? 'site' : null
  let githubRepo = findGithubRepo(html)

  // Home pages sell; docs pages install. Look there too when the home page is silent.
  if ((!npmPackage || !githubRepo) && docsPage?.ok) {
    {
      const fromDocs = findNpmPackage(docsPage.body)
      if (!npmPackage && fromDocs) {
        npmPackage = fromDocs
        npmSource = 'docs'
      }
      githubRepo ??= findGithubRepo(docsPage.body)
    }
  }

  if (!npmPackage && llmsBody) {
    npmPackage = findNpmPackage(llmsBody) ?? findCdnPackage(llmsBody)
    if (npmPackage) npmSource = 'llms'
  }

  let npmConfidence: 'strong' | 'weak' | null = null
  if (!npmPackage) {
    const searched = await searchNpmForDomain(domain, githubRepo)
    if (searched) {
      npmPackage = searched.name
      npmSource = 'registry-search'
      npmConfidence = searched.confidence
    }
  }

  return { site, home, docs, docsPage, pricing, pricingPage, signup, npmPackage, npmSource, npmConfidence, githubRepo, linkSources }
}
