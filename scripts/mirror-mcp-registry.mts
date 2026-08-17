/**
 * Pages the MCP registry and hands it to us, from a machine that can reach it.
 *
 *   STACKPICK_CRON_TOKEN=... npx tsx scripts/mirror-mcp-registry.mts          # what changed since
 *   STACKPICK_CRON_TOKEN=... npx tsx scripts/mirror-mcp-registry.mts --full   # the whole listing
 *   npx tsx scripts/mirror-mcp-registry.mts --full --dry                      # fetch and print
 *
 * The dyno cannot reach the registry: measured 2026-08-17, four requests from Heroku EU to
 * registry.modelcontextprotocol.io timed out at 10 and 20 seconds while api.github.com answered
 * the same shell in 50 ms. A runner reaches it, so the listing comes in through the door rather
 * than out of a scan, and every scan then reads one host we control. That also makes the lookup
 * reproducible, which the live call was not: it is what moved three verdicts between two sweeps
 * of the corpus six hours apart.
 *
 * Two modes because the listing is large: a full pass was still going after 600 pages and 23,309
 * remote addresses, so it runs weekly, and the daily run asks `updated_since` and adds what came
 * back. Only remote addresses are kept. A registry entry describing a package to run locally is
 * not an endpoint an agent can call, and the check is about a surface that answers.
 */
const BASE = 'https://registry.modelcontextprotocol.io/v0/servers'
const TARGET = process.env.STACKPICK_BASE ?? 'https://letagentsin.com'
const dry = process.argv.includes('--dry')
const full = process.argv.includes('--full')
const token = process.env.STACKPICK_CRON_TOKEN

type Listing = {
  servers?: { server?: { remotes?: { url?: string }[] } }[]
  metadata?: { nextCursor?: string }
}

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

async function ours(path: string, init?: RequestInit): Promise<Response> {
  if (!token) {
    console.error('brak STACKPICK_CRON_TOKEN')
    process.exit(2)
  }
  return fetch(`${TARGET}${path}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), authorization: `Bearer ${token}` },
  })
}

/** An hour of overlap, because a listing written while the last run was paging would be missed. */
const OVERLAP_MS = 60 * 60 * 1000

let since: string | null = null
// A daily run that finds nothing to catch up from does the whole listing instead of refusing.
// Exiting here made the mirror unable to heal itself: the full pass is scheduled weekly, so a
// mirror that is empty or past its window on a Monday stays that way until Sunday, and every
// daily run in between stops on this line. The scanner then reads a silent registry for six days
// and every vendor who publishes no endpoint of their own goes unmeasurable on that check.
let fullPass = full
if (!full && !dry) {
  const state = (await (await ours('/api/cron/mcp-registry')).json()) as { syncedAt: string | null; hosts: number }
  if (state.syncedAt) {
    since = new Date(Date.parse(state.syncedAt) - OVERLAP_MS).toISOString()
    console.log(`lustro ma ${state.hosts} hostow, dobieram zmiany od ${since}`)
  } else {
    fullPass = true
    console.log('lustro jest puste, wiec zamiast zmian biore cala liste')
  }
}

const MOST_PAGES = 6000
const urlsByHost = new Map<string, Set<string>>()
let cursor: string | undefined
let pages = 0
let remotes = 0

while (pages < MOST_PAGES) {
  const url =
    `${BASE}?limit=100` +
    (cursor ? `&cursor=${encodeURIComponent(cursor)}` : '') +
    (since ? `&updated_since=${encodeURIComponent(since)}` : '')
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

// A half-read listing must never replace what is stored: every vendor past the cursor would lose
// the endpoint they publish and go unmeasurable on this check until the next full run.
if (cursor && fullPass) {
  console.error(`kursor nie dobiegl konca po ${pages} stronach, wiec to jest polowa listy i nie zapisujemy jej`)
  process.exit(1)
}

if (dry) {
  console.log(hosts.slice(0, 5))
  process.exit(0)
}

const posted = await ours('/api/cron/mcp-registry', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ fetchedAt: new Date().toISOString(), mode: fullPass ? 'full' : 'since', hosts }),
})
console.log(`${posted.status} ${await posted.text()}`)
process.exit(posted.ok ? 0 : 1)
