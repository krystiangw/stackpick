/**
 * Fourteenth adversarial pass, aimed at the rule that changed in 9.11.
 *
 * That rule made `mcp_present` stricter: a 405 that a framework returns for every static route no
 * longer counts as a server. Three published rows were wrong before it and carried errata. A rule
 * that tightens can only fail in one direction, so this probes the 99 rows now saying "no server"
 * and asks whether any of them runs one we stopped seeing.
 *
 * The control is the point. A probe that finds nothing proves nothing until it has found the
 * servers we already credit, with the same code and in the same run.
 *
 *   npx tsx scripts/audit-mcp-denials.mts
 */
const INITIALIZE = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'letagentsin-audit', version: '1' } },
})

const candidates = (domain: string) => [
  `https://mcp.${domain}/mcp`,
  `https://mcp.${domain}`,
  `https://api.${domain}/mcp`,
  `https://${domain}/mcp`,
  `https://www.${domain}/mcp`,
  `https://api.${domain}/v1/mcp`,
]

type Hit = { url: string; why: string }

async function probe(url: string): Promise<Hit | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 9000)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
      body: INITIALIZE,
      signal: controller.signal,
      redirect: 'follow',
    })
    const type = response.headers.get('content-type') ?? ''
    const body = (await response.text()).slice(0, 2000)
    // HTML is a page, whatever status it carries. This is the whole 9.11 correction.
    if (/^\s*<(!doctype|html)/i.test(body)) return null
    if (/"jsonrpc"/.test(body) && /"result"|"error"/.test(body)) return { url, why: `${response.status} JSON-RPC` }
    if (type.includes('text/event-stream')) return { url, why: `${response.status} SSE` }
    if ((response.status === 401 || response.status === 403) && response.headers.get('www-authenticate')) {
      return { url, why: `${response.status} ${response.headers.get('www-authenticate')?.slice(0, 40)}` }
    }
    return null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function firstHit(domain: string): Promise<Hit | null> {
  for (const url of candidates(domain)) {
    const hit = await probe(url)
    if (hit) return hit
  }
  return null
}

const denied = process.argv[2] === '--denied' ? process.argv.slice(3) : []
const control = process.argv[2] === '--control' ? process.argv.slice(3) : []

for (const domain of control) {
  const hit = await firstHit(domain)
  console.log(`KONTROLKA ${domain}: ${hit ? `ZNALAZLA ${hit.url} (${hit.why})` : 'NIC - sonda nie umie powiedziec tak'}`)
}
for (const domain of denied) {
  const hit = await firstHit(domain)
  if (hit) console.log(`NIEZGODA ${domain}: ${hit.url} (${hit.why})`)
}
if (denied.length) console.log(`\nprzesondowano ${denied.length} odmowionych`)
process.exit(0)
