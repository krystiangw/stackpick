/**
 * Is "no OpenAPI spec, and no markdown for machines" still true?
 *
 *   MONGODB_URI=... npx tsx scripts/audit-openapi.mts [ile]
 *
 * The fifth of these. `machine_readable_api` fails on fifty rows with a sentence that names the
 * number of paths, the page whose declarations we read and the negotiation we tried. It is the
 * check a vendor with a published spec would be angriest about, so it has to be re-askable.
 *
 * Paths and predicates come from the scanner (`OPENAPI_PATHS`, `declaredSpecs`, `isRealTextFile`),
 * because a second opinion about what counts as a spec finds different things than the check does.
 * Never during a sweep.
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'
import { OPENAPI_PATHS, declaredSpecs } from '../src/lib/scan/machine'
import { isRealTextFile } from '../src/lib/scan/http'

const PAUSE_MS = 300
const store = getStore()
const most = Number(process.argv[2] ?? 30)


const get = async (url: string, accept: string) => {
  await new Promise((done) => setTimeout(done, PAUSE_MS))
  try {
    const answer = await fetch(url, { headers: { accept }, signal: AbortSignal.timeout(8000) })
    const body = (await answer.text()).slice(0, 200_000)
    const headers: Record<string, string> = {}
    answer.headers.forEach((value, name) => (headers[name] = value))
    return { url: answer.url || url, ok: answer.ok, status: answer.status, body, headers, truncated: false }
  } catch {
    return null
  }
}

/** The scanner's bar for a spec: a document that says which version of the format it is. */
const readsAsSpec = (body: string) => /"(openapi|swagger)"\s*:|^\s*(openapi|swagger)\s*:/im.test(body)

type Hit = { domain: string; what: string; where: string }
const hits: Hit[] = []
let checked = 0
let asked = 0

for (const domain of CURATED_DOMAINS) {
  // The limit counts rows actually audited, not domains looked at: slicing the corpus first made
  // `50` mean "the first fifty domains, of which some fail" rather than "fifty failing rows".
  if (checked >= most) break
  const report = await store.latestForDomain(domain, true)
  const check = report?.scorecard.checks.find((one) => one.id === 'machine_readable_api')
  if (!check || check.inconclusive || check.notApplicable || check.points > 0) continue
  checked += 1
  const docs = (report?.findings as unknown as { discovered?: { docs?: string | null } })?.discovered?.docs ?? null
  const origins = [`https://${domain}`]
  if (docs) {
    try {
      const origin = new URL(docs).origin
      if (!origins.includes(origin)) origins.push(origin)
    } catch {
      // Not a URL, not a host to ask.
    }
  }
  for (const origin of origins) {
    for (const path of OPENAPI_PATHS) {
      asked += 1
      const answer = await get(`${origin}${path}`, 'application/json, application/yaml;q=0.9, */*;q=0.5')
      if (answer?.ok && readsAsSpec(answer.body)) hits.push({ domain, what: 'spec', where: `${origin}${path}` })
    }
  }
  // The other two halves of the sentence: what the docs page declares, and whether it negotiates.
  if (docs) {
    asked += 1
    const viaAccept = await get(docs, 'text/markdown')
    if (viaAccept?.ok) {
      // A declaration is a pointer, and the scanner credits it only after fetching what it points
      // at. Reporting the pointer alone would contradict a stored failure with a dead link.
      for (const declared of declaredSpecs(viaAccept)) {
        asked += 1
        const pointed = await get(declared.url, 'application/json, application/yaml;q=0.9, */*;q=0.5')
        if (pointed?.ok && readsAsSpec(pointed.body)) {
          hits.push({ domain, what: `deklaracja rel="${declared.rel}"`, where: declared.url })
        }
      }
      // The content type, not the shape of the body: the scanner counts this only when the server
      // answers markdown to the header. A docs page that serves text to everybody is not
      // negotiating, and asking for text/plain as a fallback invites exactly that false positive.
      if ((viaAccept.headers['content-type'] ?? '').includes('markdown')) {
        hits.push({ domain, what: 'markdown w negocjacji naglowkiem', where: docs })
      }
    }
    // Both mechanisms, because the check combines them: a vendor who starts serving <docs>.md
    // qualifies for the point without ever negotiating on the header.
    asked += 1
    const suffix = `${docs.replace(/\/$/, '')}.md`
    const viaSuffix = await get(suffix, 'text/markdown')
    if (viaSuffix?.ok && isRealTextFile(viaSuffix as never, 200)) {
      hits.push({ domain, what: 'markdown pod sufiksem .md', where: suffix })
    }
  }
  console.log(`${checked} wierszy sprawdzonych, ${hits.length} trafien`)
}

console.log(`\n${checked} oblanych wierszy, ${asked} zapytan`)
console.log(
  hits.length === 0
    ? 'zdanie trzyma sie wszedzie: ani specu pod zwyklymi sciezkami, ani deklaracji, ani markdownu w negocjacji'
    : `${hits.length} TRAFIEN do przeczytania po kolei:`,
)
for (const one of hits) console.log(`  ${one.domain.padEnd(22)} ${one.what}: ${one.where}`)
process.exit(0)
