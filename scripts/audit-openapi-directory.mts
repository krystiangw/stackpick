/**
 * Twenty-fifth adversarial pass: `machine_readable_api`, and the same move that worked on
 * `mcp_present` an hour earlier.
 *
 * The accusation reads "No OpenAPI spec at the 5 usual paths, none declared by <site>, and no
 * markdown negotiation". Five paths we guessed, one declaration we parsed. This asks a source that
 * is neither: apis.guru, a curated directory of ~2500 public OpenAPI descriptions, which is where
 * somebody integrating an API goes looking when the vendor's own site does not say.
 *
 * A directory entry is a lead, never a verdict, for two reasons that both produce false findings
 * if ignored. The directory mirrors specs, so its own copy proves nothing about what the vendor
 * serves today: only the origin URL counts, it has to be on the vendor's domain, and it has to
 * still parse as OpenAPI when fetched now. And a spec that has moved is a fact about the directory
 * being stale, not about us being wrong.
 *
 * The control runs the same "is this a live spec" test against the rows we credit with one, so a
 * broken parser shows up before it can accuse anybody.
 *
 *   npx tsx scripts/audit-openapi-directory.mts credited
 *   npx tsx scripts/audit-openapi-directory.mts accused
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'
import { AGENT_UA, CONTACT } from '../src/lib/scan/http'
import { refuseIfNothingMeasured } from './nothing-measured'

const UA = AGENT_UA

async function isLiveSpec(url: string): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'follow', headers: { 'user-agent': UA, from: CONTACT, accept: 'application/json, application/yaml, text/plain' } })
    if (!response.ok) return null
    const body = (await response.text()).slice(0, 6000)
    // JSON or YAML, both are published. The version key is what makes it a description rather
    // than any other document with paths in it.
    const version = body.match(/"openapi"\s*:\s*"([^"]+)"|"swagger"\s*:\s*"([^"]+)"|^openapi:\s*["']?([\d.]+)|^swagger:\s*["']?([\d.]+)/m)
    if (!version) return null
    return version.slice(1).find(Boolean) ?? 'nieznana wersja'
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

type Directory = Record<string, { versions?: Record<string, { swaggerUrl?: string; info?: Record<string, unknown> }> }>

async function loadDirectory(): Promise<Directory> {
  const response = await fetch('https://api.apis.guru/v2/list.json', { headers: { 'user-agent': UA, from: CONTACT, accept: 'application/json' } })
  if (!response.ok) throw new Error(`apis.guru odpowiedzialo ${response.status}`)
  return (await response.json()) as Directory
}

/** The address the vendor serves, not the directory's mirror of it. */
function originUrlsFor(directory: Directory, domain: string): string[] {
  const bare = domain.replace(/^www\./, '')
  const urls: string[] = []
  for (const [key, entry] of Object.entries(directory)) {
    const provider = key.split(':')[0]
    if (provider !== bare && !provider.endsWith(`.${bare}`)) continue
    for (const version of Object.values(entry.versions ?? {})) {
      const origin = (version.info?.['x-origin'] as { url?: string }[] | undefined)?.map((source) => source.url)
      for (const url of [...(origin ?? []), version.swaggerUrl]) {
        if (!url) continue
        try {
          const host = new URL(url).hostname
          // The mirror is apis.guru's own host, and crediting that to the vendor would be
          // publishing somebody else's copy as something they serve.
          if (host === bare || host.endsWith(`.${bare}`)) urls.push(url)
        } catch {
          /* not a URL we can check */
        }
      }
    }
  }
  return [...new Set(urls)].slice(0, 3)
}

const mode = process.argv[2] === 'credited' ? 'credited' : 'accused'
const store = getStore()
const directory = await loadDirectory()
console.log(`katalog apis.guru: ${Object.keys(directory).length} pozycji`)

let checked = 0
let disagree = 0
let inDirectory = 0
for (const domain of CURATED_DOMAINS) {
  const report = await store.latestForDomain(domain)
  const check = report?.scorecard.checks.find((candidate) => candidate.id === 'machine_readable_api')
  if (!check || check.inconclusive || check.notApplicable) continue

  if (mode === 'credited') {
    // Only the rows whose evidence is a spec. The others pass on markdown negotiation, which this
    // probe does not test and must not pretend to.
    const cited = check.detail.match(/https?:\/\/\S+?(?=[,\s]|$)/)?.[0]
    if (!cited || !/openapi|swagger|spec/i.test(check.detail) || check.points === 0) continue
    checked += 1
    if (await isLiveSpec(cited)) continue
    disagree += 1
    console.log(`NIEZGODA ${domain.padEnd(20)} nie potwierdzam specu, ktory cytujemy: ${cited}`)
    continue
  }

  if (check.points > 0) continue
  checked += 1
  const candidates = originUrlsFor(directory, domain)
  if (candidates.length === 0) continue
  inDirectory += 1
  const live: string[] = []
  for (const url of candidates) {
    const version = await isLiveSpec(url)
    if (version) live.push(`${url} (OpenAPI ${version})`)
  }
  if (live.length === 0) {
    console.log(`w katalogu, ale adres zrodlowy nie odpowiada  ${domain.padEnd(16)} ${candidates[0]}`)
    continue
  }
  disagree += 1
  console.log(`NIEZGODA ${domain.padEnd(20)} ${live.join(' | ')}`)
}

console.log(`\n${checked} sprawdzonych, ${disagree} niezgodnych`)
if (mode === 'accused') console.log(`z tego w katalogu apis.guru: ${inDirectory}`)
// Zero przeczytanych wierszy to nie jest „zdanie sie trzyma", tylko przebieg, ktory o niczym nie
// mowi. Bez tej bramki audyt uspokaja tym glosniej, im mniej zmierzyl.
refuseIfNothingMeasured(checked, 'wierszy')

console.log(
  mode === 'credited'
    ? 'kontrolka: niezgoda znaczy, ze nie potwierdzam specu, ktory sami cytujemy'
    : 'oskarzenia: niezgoda znaczy, ze vendor serwuje zywy spec, a my mowimy, ze zadnego nie ma',
)
process.exit(0)
