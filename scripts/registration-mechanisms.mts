/**
 * Which client registration mechanism the corpus actually publishes, DCR against the newer pair.
 *
 *   MONGODB_URI=... npx tsx scripts/registration-mechanisms.mts
 *
 * MCP 2026-07-28 moved Dynamic Client Registration to MAY and calls it deprecated, asks for Client
 * ID Metadata Documents (SHOULD) and makes Protected Resource Metadata (RFC 9728) a MUST for MCP
 * servers. `oauth_dcr` therefore scores a mechanism on its way out, and the only honest way to know
 * when that matters is to watch both curves rather than to argue about the specification.
 *
 * Reads the stored corpus and changes nothing: no scan, no cooldown moved. The asymmetry is the
 * point to remember when quoting it - `oauth_dcr` searches an authorization server across many
 * hosts, while the well-known probe asks the site host, so a low RFC 9728 count is a floor.
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'

type Stored = {
  machine?: { wellKnown?: Record<string, boolean> }
  funnel?: { oauth?: { metadataPublished?: boolean; dynamicClientRegistration?: boolean; metadataAt?: string } }
}

const store = getStore()
let read = 0
const withMetadata: string[] = []
const withRegistration: string[] = []
const withProtectedResource: string[] = []
const both: string[] = []

for (const domain of CURATED_DOMAINS) {
  const report = await store.latestForDomain(domain, true)
  if (!report) continue
  read += 1
  const findings = report.findings as unknown as Stored
  const oauth = findings.funnel?.oauth
  const prm = findings.machine?.wellKnown?.oauth_protected_resource_rfc9728 === true
  if (oauth?.metadataPublished) withMetadata.push(domain)
  if (oauth?.dynamicClientRegistration) withRegistration.push(domain)
  if (prm) withProtectedResource.push(domain)
  if (prm && oauth?.dynamicClientRegistration) both.push(domain)
}

const line = (label: string, rows: string[]) =>
  console.log(`${String(rows.length).padStart(3)} z ${read}  ${label}`)

console.log(`korpus: ${read} wierszy odczytanych\n`)
line('publikuje metadane serwera autoryzacji', withMetadata)
line('publikuje registration_endpoint (RFC 7591, MAY i deprecated)', withRegistration)
line('serwuje /.well-known/oauth-protected-resource (RFC 9728, MUST dla MCP)', withProtectedResource)
line('oba naraz', both)

console.log('\nRFC 9728 pytany tylko na hoscie witryny, wiec ta liczba to dolna granica.')
console.log('CIMD nie jest tu mierzone: to zdolnosc serwera autoryzacji, ktorej nie widac z pliku.')
if (withProtectedResource.length > 0) console.log(`\nz RFC 9728: ${withProtectedResource.join(', ')}`)
