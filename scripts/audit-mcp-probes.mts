import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'

/**
 * Which of the addresses we probe for an MCP server has ever found one.
 *
 * Every candidate costs a request inside a 27-second budget shared with fifteen other checks, and
 * this list grew one address at a time, each added for a single vendor that the previous list
 * missed. Nobody has since asked whether the address earned its place on any row but that one.
 * A pattern that has never produced an endpoint is not a safety net, it is a check somewhere else
 * losing its request.
 *
 *   MONGODB_URI=$(heroku config:get MONGODB_URI -a stackpick) npx tsx scripts/audit-mcp-probes.mts
 */
const store = getStore()

const shapes: [name: string, matches: (url: URL, domain: string) => boolean][] = [
  ['mcp.<domain>', (u, d) => u.hostname === `mcp.${d}` && u.pathname === '/'],
  ['mcp.<domain>/mcp', (u, d) => u.hostname === `mcp.${d}` && u.pathname === '/mcp'],
  ['mcp.<domain>/v1/mcp', (u, d) => u.hostname === `mcp.${d}` && u.pathname === '/v1/mcp'],
  ['api.<domain>/mcp', (u, d) => u.hostname === `api.${d}` && u.pathname === '/mcp'],
  ['<site>/mcp', (u, d) => u.hostname.endsWith(d) && !u.hostname.startsWith('mcp.') && !u.hostname.startsWith('api.') && u.pathname === '/mcp'],
  ['<site>/api/mcp', (u) => u.pathname === '/api/mcp'],
]

const found = new Map<string, string[]>()
/** Shapes that worked per domain, so a candidate can be judged on what only it reaches. */
const perDomain = new Map<string, Set<string>>()
const elsewhere: string[] = []
let rows = 0

for (const domain of CURATED_DOMAINS) {
  const report = await store.latestForDomain(domain)
  if (!report) continue
  rows += 1
  for (const endpoint of report.findings.funnel.mcpEndpoints ?? []) {
    let url: URL
    try { url = new URL(endpoint.url) } catch { continue }
    const shape = shapes.find(([, matches]) => matches(url, domain))
    // Anything unmatched came out of the vendor's own card, which is the one candidate we do not
    // guess, so it is the shape most worth keeping and the one this list cannot name.
    if (!shape) { elsewhere.push(`${domain} ${endpoint.url}`); continue }
    found.set(shape[0], [...(found.get(shape[0]) ?? []), domain])
    perDomain.set(domain, (perDomain.get(domain) ?? new Set()).add(shape[0]))
  }
}

console.log(`${rows} wierszy\n`)
console.log('trafienia / wiersze, na ktorych ten adres byl JEDYNY, ktory cokolwiek znalazl\n')
for (const [name] of shapes) {
  const hits = found.get(name) ?? []
  const alone = hits.filter((domain) => (perDomain.get(domain)?.size ?? 0) === 1)
  console.log(`${String(hits.length).padStart(3)} / ${String(alone.length).padStart(3)}  ${name.padEnd(22)} ${alone.slice(0, 6).join(', ')}`)
}
console.log(`${String(elsewhere.length).padStart(3)} /   -  z karty vendora        ${elsewhere.slice(0, 4).join(', ')}`)
process.exit(0)
