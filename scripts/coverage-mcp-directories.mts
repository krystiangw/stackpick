/**
 * Coverage first, findings second. The twenty-fifth pass produced nothing and the reason was not
 * that the vendors were clean: apis.guru held 2 of our 47 targets, so the source could not have
 * disagreed with us even if we were wrong. That is a wasted pass and a false reassurance, and it
 * is the mistake this script exists to stop repeating.
 *
 * The question before any pass on `mcp_present` can use a directory: **for how many of our vendors
 * does that directory advertise a URL on the vendor's own hostname?** Anything else is a server
 * somebody else built on top of them, and crediting it to the vendor would invent a surface they
 * do not publish.
 *
 *   npx tsx scripts/coverage-mcp-directories.mts credited   # vendors we know publish MCP
 *   npx tsx scripts/coverage-mcp-directories.mts accused    # vendors we say publish none
 *
 * The credited side is the control and it runs first, for the usual reason: a directory that
 * cannot show the vendor's own URL for a vendor who demonstrably has one has no coverage of this
 * question, and nothing it says about the accused would mean anything.
 *
 * Two directories are not measured here and both were checked by hand on 2026-08-16:
 *   - glama.ai ignores its own query parameter (`?query=stripe` returns Firefox tab servers) and
 *     every entry is a GitHub repository with a glama.ai page. There is no vendor URL field at
 *     all, so its coverage of this question is structurally zero rather than low.
 *   - api.pulsemcp.com/v0beta answers `API_SUNSET`: it fails a rising share of requests on
 *     purpose, 50 percent since June 2026, so any number taken from it would be a number about
 *     their sunset schedule.
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'

const UA = 'LetAgentsIn/1.0 (+https://letagentsin.com/methodology)'
const SMITHERY = 'https://registry.smithery.ai/servers'
/** Enough to catch a vendor's own entry, few enough not to hammer a free registry. */
const MOST_RESULTS_READ = 6

type Listing = { qualifiedName: string; displayName: string; urls: string[] }

async function json(url: string): Promise<unknown | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { 'user-agent': UA, accept: 'application/json' } })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Everything in a listing that could be an address, without deciding yet whose address it is. */
function urlsIn(detail: unknown): string[] {
  const found: string[] = []
  const walk = (node: unknown) => {
    if (typeof node === 'string') {
      if (/^https?:\/\//.test(node)) found.push(node)
      return
    }
    if (Array.isArray(node)) return node.forEach(walk)
    if (node && typeof node === 'object') return Object.values(node).forEach(walk)
  }
  walk(detail)
  return [...new Set(found)]
}

async function smitheryListings(domain: string): Promise<Listing[]> {
  const term = domain.replace(/^www\./, '').split('.')[0]
  const found = (await json(`${SMITHERY}?q=${encodeURIComponent(term)}&pageSize=20`)) as
    | { servers?: { qualifiedName?: string; displayName?: string; namespace?: string }[] }
    | null
  const candidates = (found?.servers ?? []).filter((server) =>
    [server.qualifiedName, server.namespace, server.displayName].some((field) => field?.toLowerCase().includes(term)),
  )
  const listings: Listing[] = []
  for (const candidate of candidates.slice(0, MOST_RESULTS_READ)) {
    if (!candidate.qualifiedName) continue
    // The search result carries no address at all, so vendorship can only be decided from the
    // detail, one request per candidate.
    const detail = await json(`${SMITHERY}/${encodeURIComponent(candidate.qualifiedName)}`)
    listings.push({
      qualifiedName: candidate.qualifiedName,
      displayName: candidate.displayName ?? candidate.qualifiedName,
      urls: detail ? urlsIn(detail) : [],
    })
  }
  return listings
}

const theirOwn = (url: string, domain: string) => {
  try {
    const host = new URL(url).hostname
    return host === domain || host.endsWith(`.${domain}`)
  } catch {
    return false
  }
}

const mode = process.argv[2] === 'credited' ? 'credited' : 'accused'
const store = getStore()

const targets: string[] = []
for (const domain of CURATED_DOMAINS) {
  const report = await store.latestForDomain(domain)
  const check = report?.scorecard.checks.find((candidate) => candidate.id === 'mcp_present')
  if (!check || check.inconclusive || check.notApplicable) continue
  if (mode === 'credited' ? check.points > 0 : check.points === 0) targets.push(domain)
}

console.log(`${mode}: ${targets.length} domen, pytam smithery\n`)

let listedAtAll = 0
let ownHost = 0
for (const domain of targets) {
  const listings = await smitheryListings(domain)
  if (listings.length === 0) continue
  listedAtAll += 1
  const mine = listings.filter((listing) => listing.urls.some((url) => theirOwn(url, domain)))
  if (mine.length === 0) {
    // The usual shape, and the reason this is a coverage question rather than a finding: the
    // directory hosts the server itself, so its address says nothing about the vendor.
    console.log(`${domain.padEnd(20)} ${listings.length} wpisow, zaden pod ich hostem  (${listings[0].qualifiedName})`)
    continue
  }
  ownHost += 1
  const shown = mine.flatMap((listing) => listing.urls.filter((url) => theirOwn(url, domain))).slice(0, 2)
  console.log(`ICH HOST ${domain.padEnd(20)} ${shown.join(' ')}`)
}

console.log(`\n${targets.length} sprawdzonych, ${listedAtAll} ma jakikolwiek wpis, ${ownHost} ma wpis pod wlasnym hostem`)
console.log(
  mode === 'credited'
    ? 'kontrolka: to jest gorna granica pokrycia. Vendor, ktory MA serwer, a ktorego katalog nie umie do niego wskazac, mierzy bezuzytecznosc katalogu, nie vendora'
    : 'oskarzenia: dopiero wpis pod ICH hostem byłby tropem. Wpis pod hostem katalogu to cudzy serwer na ich API',
)
process.exit(0)
