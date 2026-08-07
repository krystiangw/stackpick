import { fetchUrl, looksLikeHtml, visibleTextLength, type Fetched } from './http'

export type NpmSource = 'site' | 'docs' | 'llms' | 'registry-search'
export type LinkSource = 'site' | 'llms-txt' | 'fallback-path'

export type Discovered = {
  site: string
  home: Fetched
  docs: string | null
  pricing: string | null
  signup: string | null
  npmPackage: string | null
  npmSource: NpmSource | null
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
const PRICING_HINTS = [/\/pricing/i, /\/plans(\/|$)/i]
const SIGNUP_HINTS = [/\/sign[_-]?up/i, /\/register(\/|$)/i, /\/signup/i, /\/get[_-]started/i, /\/create[_-]account/i]

const DOCS_FALLBACKS = ['/docs', '/documentation', '/developers']
const PRICING_FALLBACKS = ['/pricing', '/plans']
const SIGNUP_FALLBACKS = ['/signup', '/sign-up', '/register']

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

function findNpmPackage(html: string): string | null {
  const fromRegistryLink = html.match(/npmjs\.com\/package\/(@?[a-z0-9._-]+(?:\/[a-z0-9._-]+)?)/i)
  if (fromRegistryLink) return fromRegistryLink[1]
  const fromInstallSnippet = html.match(/npm (?:install|i) (?:--save )?(@?[a-z0-9._-]+(?:\/[a-z0-9._-]+)?)/i)
  if (fromInstallSnippet && fromInstallSnippet[1].length > 2) return fromInstallSnippet[1]
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

/**
 * Last resort when no install snippet is on the site: ask the registry, then accept only a
 * package whose own metadata points back at this domain or at the same GitHub org. Never
 * guess by name alone.
 */
async function searchNpmForDomain(domain: string, githubRepo: string | null): Promise<string | null> {
  const brand = domain.split('.')[0]
  const org = githubRepo?.split('/')[0].toLowerCase() ?? null
  const got = await fetchUrl(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(brand)}&size=20`, {
    accept: 'application/json',
  })
  if (!got.ok) return null

  let candidates: string[]
  try {
    const hits = (JSON.parse(got.body) as { objects?: NpmSearchHit[] }).objects ?? []
    candidates = hits
      .filter((hit) => {
        const links = Object.values(hit.package.links ?? {}).filter(Boolean) as string[]
        if (links.some((link) => link.includes(domain))) return true
        return org !== null && links.some((link) => new RegExp(`github\\.com/${org}/`, 'i').test(link))
      })
      .map((hit) => hit.package.name)
      .slice(0, 5)
  } catch {
    return null
  }
  if (candidates.length === 0) return null

  // Name shape alone picked angular-froala (1.7k weekly, last published 2023) over
  // froala-editor (327k weekly, current). Real usage decides; the name only breaks ties.
  const ranked = await Promise.all(
    candidates.map(async (name) => {
      const stats = await fetchUrl(`https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(name)}`, {
        accept: 'application/json',
      })
      let downloads = 0
      try {
        downloads = stats.ok ? ((JSON.parse(stats.body) as { downloads?: number }).downloads ?? 0) : 0
      } catch {
        downloads = 0
      }
      return { name, downloads }
    }),
  )
  ranked.sort((a, b) => b.downloads - a.downloads || nameAffinity(b.name, brand) - nameAffinity(a.name, brand))
  return ranked[0].name
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
  const fromLlmsDocs = pickFromLlms(llmsEntries, DOCS_HINTS, [/doc/, /guide/, /api reference/, /developer/])
  const docs = fromSiteDocs ?? fromLlmsDocs ?? (await firstLivePath(site, DOCS_FALLBACKS))

  const fromSitePricing = pickLink(links, PRICING_HINTS, base)
  const fromLlmsPricing = pickFromLlms(llmsEntries, PRICING_HINTS, [/pricing/, /plans/, /buy/, /cart/])
  const pricing = fromSitePricing ?? fromLlmsPricing ?? (await firstLivePath(site, PRICING_FALLBACKS))

  const fromSiteSignup = pickLink(links, SIGNUP_HINTS, base)
  const fromLlmsSignup = pickFromLlms(llmsEntries, SIGNUP_HINTS, [/sign ?up/, /register/, /get started/, /free trial/])
  const signup = fromSiteSignup ?? fromLlmsSignup ?? (await firstLivePath(site, SIGNUP_FALLBACKS))

  const linkSources = {
    docs: fromSiteDocs ? ('site' as const) : fromLlmsDocs ? ('llms-txt' as const) : docs ? ('fallback-path' as const) : null,
    pricing: fromSitePricing ? ('site' as const) : fromLlmsPricing ? ('llms-txt' as const) : pricing ? ('fallback-path' as const) : null,
    signup: fromSiteSignup ? ('site' as const) : fromLlmsSignup ? ('llms-txt' as const) : signup ? ('fallback-path' as const) : null,
  }

  let npmPackage = findNpmPackage(html)
  let npmSource: NpmSource | null = npmPackage ? 'site' : null
  let githubRepo = findGithubRepo(html)

  // Home pages sell; docs pages install. Look there too when the home page is silent.
  if ((!npmPackage || !githubRepo) && docs) {
    const docsPage = await fetchUrl(docs)
    if (docsPage.ok) {
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

  if (!npmPackage) {
    npmPackage = await searchNpmForDomain(domain, githubRepo)
    if (npmPackage) npmSource = 'registry-search'
  }

  return { site, home, docs, pricing, signup, npmPackage, npmSource, githubRepo, linkSources }
}
