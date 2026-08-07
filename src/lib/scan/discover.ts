import { fetchUrl, looksLikeHtml, visibleTextLength, type Fetched } from './http'

export type Discovered = {
  site: string
  home: Fetched
  docs: string | null
  pricing: string | null
  signup: string | null
  npmPackage: string | null
  githubRepo: string | null
}

const DOCS_HINTS = [/\/docs?(\/|$)/i, /\/documentation/i, /^https?:\/\/docs\./i, /\/developers?(\/|$)/i, /\/api-reference/i]
const PRICING_HINTS = [/\/pricing/i, /\/plans(\/|$)/i]
const SIGNUP_HINTS = [/\/sign[_-]?up/i, /\/register(\/|$)/i, /\/signup/i, /\/get[_-]started/i, /\/create[_-]account/i]

const DOCS_FALLBACKS = ['/docs', '/documentation', '/developers']
const PRICING_FALLBACKS = ['/pricing', '/plans']
const SIGNUP_FALLBACKS = ['/signup', '/sign-up', '/register']

export function normalizeDomain(input: string): string {
  const trimmed = input.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/^www\./i, '')
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(trimmed)) {
    throw new Error('Not a valid domain')
  }
  return trimmed.toLowerCase()
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
    const absolute = absolutize(match[1], base)
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

  // Search results arrive ranked, so a stable sort keeps registry order as the tie-break.
  return [...candidates].sort((a, b) => nameAffinity(b, brand) - nameAffinity(a, brand))[0]
}

export async function discover(domain: string): Promise<Discovered> {
  const site = `https://${domain}`
  const home = await fetchUrl(site)
  const html = home.ok ? home.body : ''
  const base = home.url || site
  const links = html ? extractLinks(html, base) : []

  const docs = pickLink(links, DOCS_HINTS, base) ?? (await firstLivePath(site, DOCS_FALLBACKS))
  const pricing = pickLink(links, PRICING_HINTS, base) ?? (await firstLivePath(site, PRICING_FALLBACKS))
  const signup = pickLink(links, SIGNUP_HINTS, base) ?? (await firstLivePath(site, SIGNUP_FALLBACKS))

  let npmPackage = findNpmPackage(html)
  let githubRepo = findGithubRepo(html)

  // Home pages sell; docs pages install. Look there too when the home page is silent.
  if ((!npmPackage || !githubRepo) && docs) {
    const docsPage = await fetchUrl(docs)
    if (docsPage.ok) {
      npmPackage ??= findNpmPackage(docsPage.body)
      githubRepo ??= findGithubRepo(docsPage.body)
    }
  }

  if (!npmPackage) {
    const llms = await fetchUrl(`${site}/llms.txt`, { accept: 'text/plain' })
    if (llms.ok && !looksLikeHtml(llms)) npmPackage = findNpmPackage(llms.body)
  }

  npmPackage ??= await searchNpmForDomain(domain, githubRepo)

  return { site, home, docs, pricing, signup, npmPackage, githubRepo }
}
