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
import { refuseIfNothingMeasured } from './nothing-measured'

const PAUSE_MS = 400
const store = getStore()
const most = howManyRows(30)

const HANDSHAKE = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'letagentsin-audit', version: '1.0' } },
})

/**
 * What, if anything, says "a server is here". Not "anything that is not silence": a static site
 * answers 403 or 405 with an HTML error page to any POST, and reporting those buries the one row
 * that matters under thirty that do not. A challenge header, a JSON-RPC body, or a JSON or
 * event-stream content type - the same three things the check reasons from.
 *
 * One function, used for the address and for the control, because comparing a challenge header
 * against a response body is comparing two different things and always finds them different.
 */
function howItAnswered(answer: Response, body: string): string | null {
  const challenge = answer.headers.get('www-authenticate')
  const type = answer.headers.get('content-type') ?? ''
  if (challenge) return `challenge: ${challenge.slice(0, 70)}`
  if (/"jsonrpc"/i.test(body)) return `JSON-RPC: ${body.replace(/\s+/g, ' ').slice(0, 70)}`
  if (/json|event-stream/i.test(type) && !/<html/i.test(body)) return `${type}: ${body.replace(/\s+/g, ' ').slice(0, 70)}`
  return null
}

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
      const how = howItAnswered(answer, (await answer.text()).slice(0, 400))
      if (how === null) continue
      answered.push({ domain, url, status: answer.status, how })
    } catch {
      continue
    }
  }
  console.log(`${checked} wierszy sprawdzonych, ${answered.length} adresow odpowiedzialo`)
}

/**
 * The control this script did not have, and the reason it needed one.
 *
 * On 2026-08-19 it reported six addresses that "answer after all" at uploadthing.com and
 * imagekit.io, and the rows that say nothing spoke MCP there looked like false accusations. They
 * were not: `api.uploadthing.com/nonsense-8f3a1c` returns the same `{"error":"Missing API Key"}`
 * 400, and `api.imagekit.io/v1/nonsense-8f3a1c` the same 401. Those hosts demand a key before they
 * route anything, so the answer at the MCP path says nothing about MCP.
 *
 * Without this, the tool that checks our accusations was arguing for crediting two vendors with a
 * server nobody has seen. A probe needs a control that can find the negative case, and this one is
 * the same shape as the entry-file check's nonsense path.
 */
const CONTROL_PATH = '/letagentsin-audit-probe-8f3a1c'
/** Kept apart rather than joined into one line: comparing a status and a body needs both, separately. */
const controls = new Map<string, { status: number; how: string | null } | null>()

async function answersEverythingTheSameWay(one: Answer): Promise<string | null> {
  const at = new URL(one.url)
  const key = `${at.host}${at.pathname.replace(/[^/]+$/, '')}`
  if (!controls.has(key)) {
    await new Promise((done) => setTimeout(done, PAUSE_MS))
    const control = `${at.origin}${at.pathname.replace(/[^/]+$/, '')}${CONTROL_PATH.slice(1)}`
    try {
      const answer = await fetch(control, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
        body: HANDSHAKE,
        signal: AbortSignal.timeout(8000),
      })
      controls.set(key, { status: answer.status, how: howItAnswered(answer, (await answer.text()).slice(0, 400)) })
    } catch {
      controls.set(key, null)
    }
  }
  const control = controls.get(key) ?? null
  if (control === null) return null
  // A control that said nothing proves nothing: it cannot be compared, so the address stays a
  // finding. Silencing a real finding is the one failure this control must not have.
  if (control.how === null) return null
  return control.status === one.status && control.how === one.how ? `${control.status} ${control.how}` : null
}

const real: Answer[] = []
const noise: { one: Answer; control: string }[] = []
for (const one of answered) {
  const control = await answersEverythingTheSameWay(one)
  if (control === null) real.push(one)
  else noise.push({ one, control })
}

refuseIfNothingMeasured(checked, 'oblanych wierszy')
console.log(`\n${checked} oblanych wierszy, ${asked} adresow zapytanych`)
console.log(
  real.length === 0
    ? 'zdanie trzyma sie wszedzie: pod zadnym z wymienionych adresow nic dzis nie odpowiada inaczej niz pod adresem, ktorego nie ma'
    : `${real.length} adresow JEDNAK odpowiada, do przeczytania po kolei (status 401 z naglowkiem challenge to zwykle zywy serwer):`,
)
for (const one of real) console.log(`  ${one.domain.padEnd(20)} ${one.status} ${one.url}\n     ${one.how}`)
if (noise.length > 0) {
  console.log(`\n${noise.length} adresow odpowiada, ale host odpowiada TAK SAMO pod sciezka, ktorej nie ma - to nie jest dowod na serwer:`)
  for (const { one, control } of noise) {
    console.log(`  ${one.domain.padEnd(20)} ${one.status} ${one.url}\n     tam: ${one.how}\n     kontrolka: ${control}`)
  }
}
process.exit(0)
