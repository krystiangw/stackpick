/**
 * Is "nothing answered at these addresses" still true?
 *
 *   MONGODB_URI=... npx tsx scripts/audit-mcp.mts [ile]
 *
 * The sibling of `audit-oauth.mts`, for the other check whose failing sentence names what it asked.
 * `mcp_present` fails on roughly eighty rows with "MCP mentioned Nx in your own files, but nothing
 * answered at ...", and a vendor rereads that list first. Anything that answers there today is a
 * sentence we have to correct, so this asks the same addresses and prints what came back.
 *
 * Deliberately coarser than the check: it reports anything other than silence and a 404, and a
 * person reads the list. Reimplementing the evidence rules here would build a second opinion about
 * what counts as a server, and two implementations of one rule is the failure this project keeps
 * finding in its own work.
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'
import { howManyRows } from './how-many'

const PAUSE_MS = 400
const store = getStore()
const most = howManyRows(30)

const HANDSHAKE = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'letagentsin-audit', version: '1.0' } },
})

type Answer = { domain: string; url: string; status: number; how: string }
const answered: Answer[] = []
let checked = 0
let asked = 0

for (const domain of [...CURATED_DOMAINS].slice(0, most)) {
  const report = await store.latestForDomain(domain, true)
  const check = report?.scorecard.checks.find((one) => one.id === 'mcp_present')
  if (!check || check.inconclusive || check.notApplicable || check.points > 0) continue
  // The addresses out of the sentence itself, because that is the list the vendor rereads. It ends
  // where the sentence stops naming addresses and starts describing sources, and the tail entries
  // are site-relative: "..., /mcp or /api/mcp, and any address you publish in the MCP registry".
  // Both wordings: rows scanned before 2026-08-18 say "nothing answered at", newer ones say
  // "nothing spoke MCP at", and an audit that only knows the current phrasing silently checks
  // nothing on a corpus that has not been swept since the change.
  const list = check.detail.match(/nothing (?:answered|spoke MCP) at (.+?), and any address/)?.[1]
  if (!list) continue
  checked += 1
  const urls = [...new Set(list.split(/,| or /).map((one) => one.trim()).filter((one) => one.length > 0))].map((one) =>
    one.startsWith('http') ? one : one.startsWith('/') ? `https://${domain}${one}` : `https://${one}`,
  )
  for (const url of urls) {
    asked += 1
    await new Promise((done) => setTimeout(done, PAUSE_MS))
    try {
      const answer = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
        body: HANDSHAKE,
        signal: AbortSignal.timeout(8000),
      })
      if (answer.status === 404) continue
      const body = (await answer.text()).slice(0, 400)
      const challenge = answer.headers.get('www-authenticate')
      const type = answer.headers.get('content-type') ?? ''
      // Not "anything that is not silence": a static site answers 403 or 405 with an HTML error
      // page to any POST, and reporting those buries the one row that matters under thirty that do
      // not. What says "a server is here" is a challenge header, a JSON-RPC body, or a JSON or
      // event-stream content type - the same three things the check reasons from.
      const how = challenge
        ? `challenge: ${challenge.slice(0, 70)}`
        : /"jsonrpc"/i.test(body)
          ? `JSON-RPC: ${body.replace(/\s+/g, ' ').slice(0, 70)}`
          : /json|event-stream/i.test(type) && !/<html/i.test(body)
            ? `${type}: ${body.replace(/\s+/g, ' ').slice(0, 70)}`
            : null
      if (how === null) continue
      answered.push({ domain, url, status: answer.status, how })
    } catch {
      continue
    }
  }
  console.log(`${checked} wierszy sprawdzonych, ${answered.length} adresow odpowiedzialo`)
}

console.log(`\n${checked} oblanych wierszy, ${asked} adresow zapytanych`)
console.log(
  answered.length === 0
    ? 'zdanie trzyma sie wszedzie: pod zadnym z wymienionych adresow nic dzis nie odpowiada'
    : `${answered.length} adresow JEDNAK odpowiada, do przeczytania po kolei (status 401 z naglowkiem challenge to zwykle zywy serwer):`,
)
for (const one of answered) console.log(`  ${one.domain.padEnd(20)} ${one.status} ${one.url}\n     ${one.how}`)
process.exit(0)
