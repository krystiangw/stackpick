/**
 * How vendors' edges answer the requests a scan makes, and whether their limits carry a challenge.
 *
 *   npx tsx scripts/audit-limits.mts [ile] [--from <n>]
 *
 * Written for #48. `isEdgeRefusal` drops every 429 without reading the headers, on the published
 * rule that a 429 is our own load. That rule is right about a limit and wrong about a challenge:
 * split.io answers documentation requests with `cf-mitigated: challenge`, which is a wall a browser
 * passes and no HTTP client does, so its row reads as our blind spot instead of as a finding about
 * them. Making the exception consistent moves rows towards accusations, so it needs a count first.
 *
 * Scans locally and writes nothing: a scan through production would refresh the corpus median and
 * move the reseed cooldown. Slowly and three at a time, because the question is about how sites
 * answer normal load and a burst from here would manufacture the answer.
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { scanDomain } from '../src/lib/scan'
import { registrableDomain } from '../src/lib/scan/http'

const all = [...CURATED_DOMAINS]
const args = process.argv.slice(2)
const at = args.indexOf('--from')
const from = at === -1 ? 0 : Number(args[at + 1])
// The count is the first argument that is not the option or its value, so `--from 40` on its own
// scans the default rather than Number('--from') domains, which is NaN and an empty run.
const positional = args.filter((one, index) => index !== at && index !== at + 1 && !one.startsWith('--'))
const most = Number(positional[0] ?? 40)
const chosen = all.slice(from, from + most)

const AT_ONCE = 3
/**
 * Split by whose door it was. The registry limits us constantly and that is a fact about our own
 * traffic to npm, not about the vendor being scanned: counting them together made bunny.net look
 * like the most rate-limiting site in the corpus on ten limits, every one of them api.npmjs.org.
 */
type Row = { domain: string; onSite: Limit[]; elsewhere: Limit[] }
type Limit = { url: string; challenge: boolean; recovered: boolean }
const rows: Row[] = []

const scanOne = async (domain: string): Promise<Row | null> => {
  try {
    const findings = await scanDomain(domain)
    const met = findings.limitsMet ?? []
    const theirs = (one: Limit) => registrableDomain(new URL(one.url).hostname) === registrableDomain(domain)
    return { domain, onSite: met.filter(theirs), elsewhere: met.filter((one) => !theirs(one)) }
  } catch (error) {
    console.error(`  ${domain}: skan sie nie udal, ${(error as Error).message}`)
    return null
  }
}

for (let at = 0; at < chosen.length; at += AT_ONCE) {
  const batch = chosen.slice(at, at + AT_ONCE)
  const done = await Promise.all(batch.map(scanOne))
  for (const row of done) if (row) rows.push(row)
  const seen = rows.filter((row) => row.onSite.length > 0).length
  console.log(`${rows.length}/${chosen.length} przeskanowanych, ${seen} z limitem`)
}

const limited = rows.filter((row) => row.onSite.length > 0)
const challenged = rows.filter((row) => row.onSite.some((one) => one.challenge))
const everyOne = challenged.filter((row) => row.onSite.every((one) => one.challenge))
const atRegistry = rows.filter((row) => row.elsewhere.length > 0)

console.log(`\n${rows.length} domen przeskanowanych lokalnie`)
console.log(`${limited.length} odmowilo nam limitem NA SWOIM brzegu, ${challenged.length} z markerem wyzwania`)
console.log(`${everyOne.length} takich, gdzie kazdy limit na ich brzegu niosl marker`)
console.log(`${atRegistry.length} spotkalo limit gdzie indziej (najczesciej rejestr npm), co jest faktem o nas\n`)
for (const row of challenged.sort((a, b) => b.onSite.length - a.onSite.length)) {
  const withMarker = row.onSite.filter((one) => one.challenge)
  const hosts = [...new Set(withMarker.map((one) => new URL(one.url).hostname))]
  const back = withMarker.filter((one) => one.recovered).length
  console.log(`  ${row.domain.padEnd(24)} ${withMarker.length}/${row.onSite.length} z wyzwaniem na ${hosts.join(', ')}${back > 0 ? `, ${back} wrocilo po odczekaniu` : ''}`)
}
const plainlyOurs = limited.filter((row) => !row.onSite.some((one) => one.challenge))
if (plainlyOurs.length > 0) {
  console.log(`\n${plainlyOurs.length} domen z limitem na swoim brzegu BEZ markera, czyli nasze wlasne tempo:`)
  for (const row of plainlyOurs) {
    const back = row.onSite.filter((one) => one.recovered).length
    console.log(`  ${row.domain} (${row.onSite.length}${back > 0 ? `, ${back} wrocilo po odczekaniu` : ''})`)
  }
}
process.exit(0)
