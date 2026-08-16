/**
 * Twenty-fourth adversarial pass: `mcp_present`, 98 accusations reading "No MCP surface: nothing
 * answered at mcp.<domain>, ... and no file mentions MCP".
 *
 * Every address in that sentence is one we guessed. This asks the one source that is not a guess
 * and that we do not consult at all: the official MCP registry, which is where an agent looking
 * for a tool actually looks. A vendor listed there with a live endpoint, whom we tell publishes
 * no MCP surface, is a false sentence about the exact thing this product measures.
 *
 * Two rules keep it honest:
 *   - A registry entry is a lead, never a verdict. Every advertised URL is opened with a real
 *     JSON-RPC `initialize` before it counts, so a stale listing cannot produce a finding.
 *   - The hostname has to belong to the vendor. Searching "stripe" returns third-party servers
 *     built on top of them, and crediting those to Stripe would be inventing a surface.
 *
 * The control does not use the registry at all, because absence from a registry proves nothing
 * about a running server. It probes the endpoints we credit and has to reach them, which is what
 * shows the JSON-RPC prober works before anything it says about the accused counts.
 *
 *   npx tsx scripts/audit-mcp-registry.mts credited
 *   npx tsx scripts/audit-mcp-registry.mts accused
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'

const UA = 'LetAgentsIn/1.0 (+https://letagentsin.com/methodology)'
const REGISTRY = 'https://registry.modelcontextprotocol.io/v0/servers'

async function speaksMcp(url: string): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)
  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'user-agent': UA, 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'letagentsin-audit', version: '1.0' } },
      }),
    })
    const body = (await response.text()).slice(0, 4000)
    // The protocol answers, or it does not. A 200 with an HTML page is a wall, and an
    // authentication challenge is a server that exists, which is what the check credits.
    if (/"protocolVersion"|"serverInfo"/.test(body)) return `${response.status} JSON-RPC`
    if (response.status === 401 || response.headers.get('www-authenticate')) return `${response.status} wymaga autoryzacji`
    return null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Registry entries whose advertised remote lives on the vendor's own domain. */
async function registryRemotesFor(domain: string): Promise<string[]> {
  const bare = domain.replace(/^www\./, '')
  const term = bare.split('.')[0]
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(`${REGISTRY}?search=${encodeURIComponent(term)}&limit=50`, {
      signal: controller.signal,
      headers: { 'user-agent': UA, accept: 'application/json' },
    })
    if (!response.ok) return []
    const body = (await response.json()) as { servers?: { server?: { remotes?: { url?: string }[] } }[] }
    const urls = (body.servers ?? []).flatMap((entry) => entry.server?.remotes ?? []).flatMap((remote) => (remote.url ? [remote.url] : []))
    return [
      ...new Set(
        urls.filter((url) => {
          try {
            const host = new URL(url).hostname
            return host === bare || host.endsWith(`.${bare}`)
          } catch {
            return false
          }
        }),
      ),
    ]
  } catch {
    return []
  } finally {
    clearTimeout(timer)
  }
}

const mode = process.argv[2] === 'credited' ? 'credited' : 'accused'
const store = getStore()

type Target = { domain: string; credited: string[] }
const targets: Target[] = []
for (const domain of CURATED_DOMAINS) {
  const report = await store.latestForDomain(domain)
  const check = report?.scorecard.checks.find((candidate) => candidate.id === 'mcp_present')
  if (!check || check.inconclusive || check.notApplicable) continue
  const wanted = mode === 'credited' ? check.points > 0 : check.points === 0
  if (!wanted) continue
  const findings = report!.findings as unknown as { funnel: { mcpEndpoints: { url: string }[] } }
  targets.push({ domain, credited: findings.funnel.mcpEndpoints.map((endpoint) => endpoint.url) })
}

console.log(`${mode}: ${targets.length} domen\n`)

let disagree = 0
for (const { domain, credited } of targets) {
  if (mode === 'credited') {
    const reached = (await Promise.all(credited.slice(0, 3).map(speaksMcp))).filter(Boolean)
    if (reached.length > 0) continue
    disagree += 1
    console.log(`NIEZGODA ${domain.padEnd(20)} nie doszedlem do zadnego z ${credited.length} endpointow, ktore zaliczamy`)
    continue
  }
  const advertised = await registryRemotesFor(domain)
  if (advertised.length === 0) continue
  const live: string[] = []
  for (const url of advertised.slice(0, 3)) {
    const answer = await speaksMcp(url)
    if (answer) live.push(`${url} (${answer})`)
  }
  if (live.length === 0) {
    console.log(`w rejestrze, ale nie odpowiada  ${domain.padEnd(18)} ${advertised.slice(0, 2).join(' ')}`)
    continue
  }
  disagree += 1
  console.log(`NIEZGODA ${domain.padEnd(20)} ${live.join(' | ')}`)
}

console.log(`\n${targets.length} sprawdzonych, ${disagree} niezgodnych`)
console.log(
  mode === 'credited'
    ? 'kontrolka: niezgoda znaczy, ze sonda nie dochodzi do serwera, ktory zaliczamy'
    : 'oskarzenia: niezgoda znaczy, ze vendor ma zywy serwer MCP w rejestrze, a my mowimy, ze nie ma zadnego',
)
process.exit(0)
