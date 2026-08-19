/**
 * Is the sentence we publish about OAuth true today?
 *
 *   MONGODB_URI=... npx tsx scripts/audit-oauth.mts [ile]
 *
 * `oauth_dcr` is the largest accusation surface in the corpus: 91 rows fail it, and the sentence
 * names the hosts we asked. That makes it the one failing check a vendor can rerun, and it makes it
 * falsifiable from here: if a host we named is serving authorization-server metadata, the row is
 * wrong and we published it under their name.
 *
 * Two failing branches wear the same zero and they mean opposite things. "No OAuth metadata on any
 * of the N hosts probed" is the accusation, and finding metadata on one of those hosts falsifies it.
 * "OAuth metadata published at X, but no registration_endpoint in it" already says metadata is
 * there, so finding it confirms the row rather than breaking it - and NOT finding it is the failure
 * worth reporting for that branch. Filtering on points alone mixes them, and mixing them once
 * turned eight correct rows into eight false alarms here.
 *
 * Asks only what the row already claims to have asked, on the two canonical paths, and writes
 * nothing. Slowly, and never during a sweep: these are the same hosts the scanner is talking to.
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'
import { howManyRows } from './how-many'
import { refuseIfNothingMeasured } from './nothing-measured'
import { AGENT_UA, CONTACT } from '../src/lib/scan/http'

/**
 * The same three documents the scanner asks for, not the two obvious ones. A protected-resource
 * document names the authorization server rather than being one, and the scanner follows it, so an
 * audit that skips it can call an accusation sound while the scanner would now find metadata one
 * hop away. chargebee.com and logto.io are both discovered that way.
 */
const PATHS = [
  '/.well-known/oauth-authorization-server',
  '/.well-known/openid-configuration',
  '/.well-known/oauth-protected-resource',
]
const PAUSE_MS = 400

const store = getStore()
const most = howManyRows(30, CURATED_DOMAINS.size)

type Hit = { domain: string; url: string; issuer?: string; registration?: string }
const hits: Hit[] = []
const confirmed: string[] = []
const vanished: string[] = []
/** Rows from before the sentence carried its address, which cannot be checked this way at all. */
const unnamed: string[] = []
let checked = 0
let origins = 0

/** The servers a protected-resource document points at, which is a pointer and not an answer. */
function authorizationServersIn(body: string): string[] {
  try {
    const parsed = JSON.parse(body) as { authorization_servers?: unknown }
    return Array.isArray(parsed.authorization_servers)
      ? parsed.authorization_servers.filter((one): one is string => typeof one === 'string').slice(0, 2)
      : []
  } catch {
    return []
  }
}

async function metadataAt(url: string) {
  try {
    const answer = await fetch(url, { headers: { 'user-agent': AGENT_UA, from: CONTACT, accept: 'application/json' }, signal: AbortSignal.timeout(8000) })
    return answer.ok ? readsAsMetadata(await answer.text()) : null
  } catch {
    return null
  }
}

/** One address, asked exactly as written. Returns false when it is not there or not metadata. */
async function readsMetadataAt(url: string): Promise<boolean> {
  return (await metadataAt(url)) !== null
}

const readsAsMetadata = (body: string) => {
  try {
    const parsed = JSON.parse(body) as { issuer?: string; authorization_endpoint?: string; registration_endpoint?: string }
    return parsed.issuer || parsed.authorization_endpoint ? parsed : null
  } catch {
    return null
  }
}

for (const domain of [...CURATED_DOMAINS].slice(0, most)) {
  const report = await store.latestForDomain(domain, true)
  const check = report?.scorecard.checks.find((one) => one.id === 'oauth_dcr')
  if (!check || check.inconclusive || check.notApplicable || check.points > 0) continue
  // The accusation branch is the one worth falsifying. The other zero says metadata is published
  // and is checked in the opposite direction: at the address the row itself names, because a grid
  // of guessed origins is not that address. Nine rows read as unconfirmed against the grid and all
  // nine were right, at auth2., clerk., sso., account., signin., a /oidc/ prefix and a different
  // apex entirely - every one of them a place the grid had no reason to ask.
  const saysNothingIsThere = check.detail.startsWith('No OAuth metadata')
  if (!saysNothingIsThere) {
    const named = check.detail.match(/published at (\S+?),/)?.[1]
    if (!named) {
      unnamed.push(domain)
      continue
    }
    origins += 1
    await new Promise((done) => setTimeout(done, PAUSE_MS))
    const found = await readsMetadataAt(named)
    if (found) confirmed.push(domain)
    else vanished.push(`${domain} (${named})`)
    continue
  }
  const probed = (report?.findings as unknown as { funnel?: { oauth?: { probedOrigins?: string[] } } })?.funnel?.oauth
    ?.probedOrigins
  if (!probed || probed.length === 0) continue
  checked += 1
  // Every origin the row says we asked. Sampling the likeliest of them was cheaper and answered a
  // narrower question than the sentence makes: "no metadata on any of the N hosts probed" is only
  // falsified or upheld by asking all N.
  for (const origin of probed) {
    for (const path of PATHS) {
      origins += 1
      await new Promise((done) => setTimeout(done, PAUSE_MS))
      try {
        const answer = await fetch(`${origin}${path}`, { headers: { 'user-agent': AGENT_UA, from: CONTACT, accept: 'application/json' }, signal: AbortSignal.timeout(8000) })
        if (!answer.ok) continue
        const body = await answer.text()
        // A protected-resource document is a pointer, so it is followed rather than read as an
        // answer: what it names is where the metadata would be, and that is what the scanner does.
        for (const named of authorizationServersIn(body)) {
          await new Promise((done) => setTimeout(done, PAUSE_MS))
          origins += 1
          const pointed = await metadataAt(`${named.replace(/\/$/, '')}/.well-known/oauth-authorization-server`)
          if (pointed) {
            hits.push({
              domain,
              url: `${named} (wskazany przez ${origin}${path})`,
              issuer: pointed.issuer,
              registration: pointed.registration_endpoint,
            })
          }
        }
        const metadata = readsAsMetadata(body)
        if (!metadata) continue
        if (saysNothingIsThere) {
          hits.push({ domain, url: `${origin}${path}`, issuer: metadata.issuer, registration: metadata.registration_endpoint })
        }
      } catch {
        continue
      }
    }
  }
  console.log(`${checked} wierszy sprawdzonych, ${hits.length} trafien`)
}

refuseIfNothingMeasured(checked, 'oblanych wierszy')
console.log(`\n${checked} oblanych wierszy, ${origins} zapytan do hostow, ktore sami wymienilismy`)
console.log(
  hits.length === 0
    ? 'ZDANIE "nie ma metadanych" trzyma sie wszedzie: na zadnym z wymienionych hostow nic dzis nie ma'
    : `${hits.length} MIEJSC, gdzie metadane JEDNAK sa, mimo ze wiersz mowi, ze ich nie ma - to sa falszywe zdania:`,
)
for (const hit of hits) {
  console.log(`  ${hit.domain}: ${hit.url}`)
  console.log(`     issuer=${hit.issuer ?? 'brak'} registration_endpoint=${hit.registration ?? 'BRAK'}`)
}
console.log(`\nwiersze mowiace "metadane sa, brakuje registration_endpoint": ${confirmed.length + vanished.length + unnamed.length}`)
console.log(
  vanished.length === 0
    ? `  wszystkie ${confirmed.length} potwierdzone pod adresem, ktory sami podajemy`
    : `  ${vanished.length} NIE POTWIERDZONYCH, czyli mowimy o dokumencie, ktorego pod tym adresem dzis nie ma: ${vanished.join(', ')}`,
)
if (unnamed.length > 0) {
  console.log(`  ${unnamed.length} wierszy sprzed 9.28 nie podaje adresu, wiec nie da sie ich tak sprawdzic: ${unnamed.join(', ')}`)
}
process.exit(0)
