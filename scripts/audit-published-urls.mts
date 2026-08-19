/**
 * Every address we publish as evidence, asked whether it answers.
 *
 * Formula 9.12 started reading links out of llms.txt and naming them in verdicts. That loosened a
 * rule, so unlike 9.11 it can only fail by crediting something: a page we say proves a vendor is
 * reachable, which is not there. A dead link in our own evidence is a claim about somebody else's
 * product that we cannot support, and this file finds them before a vendor does.
 *
 * Reads the addresses on stdin as `domain<TAB>check<TAB>url`, so the extraction stays visible in
 * the shell rather than buried here, and trims trailing punctuation itself. Leaving that to the
 * caller failed twice: a trailing colon off "the pricing page at <url>:" produced a page of false
 * 404s in an earlier pass, and reproducing it here after writing this comment is why the trim now
 * lives next to the request instead of in a pipeline.
 *
 * Dead means 404, 410 or no answer at all. A 401 or a 405 is a server refusing this particular
 * request, which is evidence the address is real: every MCP endpoint we credit answers 401 to an
 * unauthenticated GET, and counting those as dead marked 20 live servers as broken links.
 *
 * Two families are asked differently, and getting either wrong invents findings rather than
 * missing them, which is the worse direction for an audit:
 *
 * `mcp_present` is asked with POST. Those addresses speak JSON-RPC and three of them answer 404 or
 * 406 to a GET while returning serverInfo to the handshake our verdict describes. Asking with the
 * wrong verb accused betterstack.com, telnyx.com and qdrant.tech of publishing a dead endpoint.
 *
 * `llms_txt` is skipped. Reporting the vendor's dead links is that check's entire job, and its
 * sentence names them: "11 of the 12 links we sampled answer. One is gone: <url>". Auditing them
 * for liveness flags our own correct reporting as an error.
 *
 *   npx tsx scripts/audit-published-urls.mts < urls.tsv
 */
import { refuseIfNothingMeasured } from './nothing-measured'
const lines = (await new Response(process.stdin as never).text())
  .trim()
  .split('\n')
  .filter(Boolean)
  .filter((line) => !line.includes('\tllms_txt\t'))

const HANDSHAKE = '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"letagentsin-audit","version":"1"}}}'

async function status(url: string, check: string): Promise<number | string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    // GET, not HEAD: plenty of these hosts answer 405 to HEAD and 200 to the request a reader makes.
    const asMcp = check === 'mcp_present'
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      method: asMcp ? 'POST' : 'GET',
      ...(asMcp ? { body: HANDSHAKE } : {}),
      headers: {
        'user-agent': 'letagentsin-audit (+https://letagentsin.com/about-our-user-agent)',
        ...(asMcp ? { 'content-type': 'application/json', accept: 'application/json, text/event-stream' } : {}),
      },
    })
    // A 404 to the handshake is not "the address is gone" when the address is a documentation page.
    // The sentence for `mcp_present` names both: the endpoints we probed AND the page we read them
    // out of ("nor at any address in <url>"). Posting an MCP handshake at a docs page gets a 404
    // from a host that answers the same page 200 to a GET, and the audit then reported three live
    // pages as dead evidence: docs.rollbar.com, uploadcare.com and docs.weaviate.io, all 200 today.
    // Only for an address that is a PAGE, never for one that is an endpoint. A credited endpoint
    // that has been taken down often sits on a host that still answers a GET with a marketing page,
    // and falling back there would report the dead endpoint as live - the exact miss this audit
    // exists to prevent. An endpoint is `mcp.<host>` or a path ending in `/mcp` or `/v1/mcp`.
    const at = new URL(url)
    const looksLikeAnEndpoint = at.hostname.startsWith('mcp.') || /\/(v\d+\/)?mcp\/?$/.test(at.pathname)
    if (asMcp && !looksLikeAnEndpoint && (response.status === 404 || response.status === 410)) {
      const asReader = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'user-agent': 'letagentsin-audit (+https://letagentsin.com/about-our-user-agent)' },
      })
      return asReader.status
    }
    return response.status
  } catch (error) {
    return (error as Error).name === 'AbortError' ? 'timeout' : 'blad sieci'
  } finally {
    clearTimeout(timer)
  }
}

const BATCH = 12
let dead = 0
/** Addresses on rows that SCORED: evidence we hand out and cannot support if it is gone. */
const credited: string[] = []
/** Addresses on rows that failed: the sentence says we looked there and found nothing. */
const accused: string[] = []
for (let at = 0; at < lines.length; at += BATCH) {
  const slice = lines.slice(at, at + BATCH)
  const results = await Promise.all(
    slice.map(async (line) => {
      const [domain, check, raw, points] = line.split('\t')
      // Also the characters a sentence wraps a URL in: `<schema.org/Article>` and a smart quote
      // that ended `console.cloud.google.c”` both came back as dead addresses that never existed.
      const url = raw.replace(/[.,:;`*)\]>"'\u201d\u00bb]+$/, '')
      return { domain, check, url, credited: Number(points ?? 0) > 0, code: await status(url, check) }
    }),
  )
  for (const r of results) {
    if (typeof r.code === 'number' && r.code !== 404 && r.code !== 410) continue
    // `oauth_dcr` names the hosts it PROBED, and most of them are candidates we generated:
    // login.<vendor>, accounts.<vendor>, auth.<vendor>. A candidate that does not resolve is
    // exactly what the sentence claims - no metadata there - so counting it as a dead address
    // turned 152 confirmations into "165 nie odpowiada" and buried the five that matter.
    // The same argument, one step further: `oauth_dcr` names bare origins it generated
    // (login.<vendor>, auth.<vendor>, accounts.<vendor>), and an origin that does not resolve OR
    // answers 404 is the sentence being right. What WOULD be a defect is the other branch's
    // address, the metadata document itself, and that one always carries a path.
    const bareOrigin = (() => {
      try {
        return new URL(r.url).pathname === '/'
      } catch {
        return false
      }
    })()
    if (r.check === 'oauth_dcr' && bareOrigin) continue
    dead += 1
    if (r.credited) credited.push(`${r.code}\t${r.domain}\t${r.check}\t${r.url}`)
    else accused.push(`${r.code}\t${r.domain}\t${r.check}\t${r.url}`)
  }
}
refuseIfNothingMeasured(lines.length, 'adresow')
console.log(`\n${lines.length} adresow sprawdzonych, ${dead} nie odpowiada`)
if (credited.length > 0) {
  console.log(`\n${credited.length} NA WIERSZACH, KTORE ZALICZYLISMY - to jest dowod, ktorego nie umiemy poprzec:`)
  for (const one of credited) console.log(`  ${one}`)
} else {
  console.log('zaden zaliczony wiersz nie stoi na adresie, ktorego dzis nie ma')
}
if (accused.length > 0) {
  console.log(`\n${accused.length} na wierszach oblanych - zdanie mowi, ze tam szukalismy, a tego adresu nie ma (slabsze, ale do przeczytania):`)
  for (const one of accused) console.log(`  ${one}`)
}
process.exit(0)
