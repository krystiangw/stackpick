/**
 * Pages the whole MCP registry and hands it to us, from a machine that can reach it.
 *
 *   STACKPICK_CRON_TOKEN=... npx tsx scripts/mirror-mcp-registry.mts          # fetch and POST
 *   npx tsx scripts/mirror-mcp-registry.mts --dry                             # fetch and print
 *
 * The dyno cannot: measured 2026-08-17, four requests from Heroku EU to
 * registry.modelcontextprotocol.io timed out at 10 and 20 seconds while api.github.com answered
 * the same shell in 50 ms. A GitHub runner reaches it, so the listing comes in through the door
 * rather than out of a scan, and every scan then reads one host we control. That also makes the
 * lookup reproducible, which the live call was not: it is what moved three verdicts between two
 * sweeps of the corpus six hours apart.
 *
 * Only remote addresses are kept. A registry entry describing a package to run locally is not an
 * endpoint an agent can call, and the check is about a surface that answers.
 */
const BASE = 'https://registry.modelcontextprotocol.io/v0/servers'
const TARGET = process.env.STACKPICK_BASE ?? 'https://letagentsin.com'
const dry = process.argv.includes('--dry')

type Listing = {
  servers?: { server?: { remotes?: { url?: string }[] } }[]
  metadata?: { nextCursor?: string }
}

const urlsByHost = new Map<string, Set<string>>()
let cursor: string | undefined
let pages = 0
let remotes = 0

/** Three tries per page. The registry answered 500 to a first request during this script's own
 * development, and a page lost to that would silently shorten the mirror. */
async function page(url: string): Promise<Listing> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(url, { headers: { accept: 'application/json' } })
    if (response.ok) return (await response.json()) as Listing
    console.error(`rejestr odpowiedzial ${response.status}, proba ${attempt}`)
    await new Promise((resolve) => setTimeout(resolve, attempt * 4000))
  }
  console.error('rejestr nie odpowiedzial po trzech probach')
  process.exit(1)
}

const MOST_PAGES = 600

while (pages < MOST_PAGES) {
  const url = `${BASE}?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`
  const listing = await page(url)
  pages += 1
  for (const entry of listing.servers ?? []) {
    for (const remote of entry.server?.remotes ?? []) {
      if (!remote.url) continue
      let host: string
      try {
        host = new URL(remote.url).hostname.replace(/^www\./, '')
      } catch {
        continue
      }
      remotes += 1
      const held = urlsByHost.get(host) ?? new Set<string>()
      held.add(remote.url)
      urlsByHost.set(host, held)
    }
  }
  cursor = listing.metadata?.nextCursor
  if (!cursor) break
}

const hosts = [...urlsByHost.entries()].map(([host, urls]) => ({ host, urls: [...urls].slice(0, 8) }))
console.log(`${pages} stron, ${remotes} zdalnych adresow, ${hosts.length} hostow`)

// A half-read listing must never be written. The mirror replaces what is stored, so a run that
// stopped in the middle would drop every vendor past the cursor, and each of them would then be
// unmeasurable on this check for a day rather than credited with the server they publish.
if (cursor) {
  console.error(`kursor nie dobiegl konca po ${pages} stronach, wiec to jest polowa listy i nie zapisujemy jej`)
  process.exit(1)
}

if (dry) {
  console.log(hosts.slice(0, 5))
  process.exit(0)
}

const token = process.env.STACKPICK_CRON_TOKEN
if (!token) {
  console.error('brak STACKPICK_CRON_TOKEN')
  process.exit(2)
}

const posted = await fetch(`${TARGET}/api/cron/mcp-registry`, {
  method: 'POST',
  headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
  body: JSON.stringify({ fetchedAt: new Date().toISOString(), hosts }),
})
const answer = await posted.text()
console.log(`${posted.status} ${answer}`)
process.exit(posted.ok ? 0 : 1)
