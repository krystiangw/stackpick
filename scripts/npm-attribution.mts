/**
 * Which package the scan calls a vendor's, for the whole corpus, without asking the corpus
 * twice. Every previous change to attribution was checked on one domain and paid for on
 * another, because the only way to see the second one was a full rescan of 156 sites.
 *
 * Two passes. `snapshot` reads the sites once and keeps exactly what attribution is given: the
 * home page, llms.txt and whichever page turned out to be the documentation. `replay` runs
 * attribution against those files with the registry live, which is where the answer is decided,
 * and prints one line per domain plus the wall clock it took. Diff two replays and what moved
 * is the code, not the weather.
 *
 *   pnpm attribution snapshot <dir>
 *   pnpm attribution replay <dir> [out.json]
 *
 * ONLY=a.com,b.com restricts either pass to those domains.
 *
 * REPLAY_SHUFFLE=<seed> permutes the hit list inside every registry search answer without
 * touching its content, which is the one thing REGISTRY_CACHE otherwise hides: the registry
 * returns the same packages in a different order per call, and two replays that agree only
 * because they were handed the same order prove nothing about the answer being stable.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CATEGORIES } from '../src/lib/categories'
import { attributePackage, discover } from '../src/lib/scan/discover'
import { fetchUrl, looksLikeHtml, withScanBudget, type Fetched } from '../src/lib/scan/http'
import { checkNpm } from '../src/lib/scan/npm'

type Snapshot = {
  domain: string
  html: string
  llmsBody: string
  docsPage: Fetched | null
}

const only = new Set((process.env.ONLY ?? '').split(',').filter(Boolean))
const domains = [...new Set(CATEGORIES.flatMap((category) => category.domains))].filter(
  (domain) => only.size === 0 || only.has(domain),
)
const gapMs = Number(process.env.REPLAY_GAP_MS ?? 0)
const shuffleSeed = process.env.REPLAY_SHUFFLE ?? ''
const [mode, dir, out] = process.argv.slice(2)
if (!mode || !dir) {
  console.error('usage: pnpm attribution snapshot|replay <dir> [out.json]')
  process.exit(1)
}

// Generous next to the 25 s a real scan gets: a snapshot that lost a docs page to the deadline
// would make every later replay disagree with production for a reason that is not attribution.
const SNAPSHOT_BUDGET_MS = 45_000

/**
 * The wall clock a replay runs under. Nothing like the 25 s a scan gets, and deliberately so:
 * waiting out the registry's rate limiter is not part of what is being measured, and a replay
 * cut off at a deadline would report a vendor as having no package for a reason that is ours.
 */
const REPLAY_BUDGET_MS = 600_000

const REGISTRY_HOSTS = /^https:\/\/(registry\.npmjs\.org|api\.npmjs\.org|data\.jsdelivr\.com)\//

/** What the corpus asked the registry for, which is the cost of attribution however fast it is. */
let registryRequests = 0

/** Same packages, different arrival order, and the same order every time for a given seed. */
function shuffledSearch(url: string, body: string): string {
  if (!shuffleSeed || !url.includes('/-/v1/search')) return body
  let parsed: { objects?: unknown[] }
  try {
    parsed = JSON.parse(body) as { objects?: unknown[] }
  } catch {
    return body
  }
  if (!Array.isArray(parsed.objects)) return body
  // Keyed on the seed and the query, so one seed permutes every query differently and a rerun
  // of that seed reproduces the run exactly.
  const keyed = parsed.objects.map((object, index) => ({
    object,
    key: createHash('sha1').update(`${shuffleSeed}|${url}|${index}`).digest('hex'),
  }))
  keyed.sort((a, b) => a.key.localeCompare(b.key))
  return JSON.stringify({ ...parsed, objects: keyed.map((entry) => entry.object) })
}

/**
 * Every registry request is counted, and answers are kept on disk when REGISTRY_CACHE names a
 * directory. The registry answers 429 to a replay of the whole corpus however slowly it is
 * run, and a rate-limited search is indistinguishable from a vendor with no package: the first
 * baseline taken without the cache reported 120 domains as having none. With it, the second
 * replay asks only what the first one did not, and two replays differ by our code alone.
 * Timings under the cache are not the scan's timings; the request count still is.
 */
function watchRegistryTraffic(dir: string | null): void {
  if (dir) mkdirSync(dir, { recursive: true })
  const live = globalThis.fetch
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const method = (init?.method ?? 'GET').toUpperCase()
    if (!REGISTRY_HOSTS.test(url)) return live(input, init)
    registryRequests++
    const file = dir === null ? null : join(dir, `${createHash('sha1').update(`${method} ${url}`).digest('hex')}.json`)
    if (file !== null && existsSync(file)) {
      const held = JSON.parse(readFileSync(file, 'utf8')) as { status: number; headers: Record<string, string>; body: string }
      return new Response(shuffledSearch(url, held.body), { status: held.status, headers: held.headers })
    }
    // Without the caller's abort signal: waiting out a 429 takes longer than the 8 s a scan
    // allows one request, and an aborted retry reads as a vendor with no package again.
    const unbounded = { ...init, signal: undefined }
    for (let attempt = 0; ; attempt++) {
      const answer = await live(input, unbounded)
      if (answer.status === 429 && attempt < 20) {
        // Capped rather than doubling all the way: the rate limiter clears in seconds and an
        // unbounded backoff spends minutes asleep after it has.
        await new Promise((resolve) => setTimeout(resolve, Math.min(15_000, 2_000 * 2 ** attempt)))
        continue
      }
      const body = method === 'HEAD' ? '' : await answer.text()
      // Content-encoding describes bytes we have already decoded, and content-length counts them.
      const headers = Object.fromEntries(
        [...answer.headers].filter(([name]) => name !== 'content-encoding' && name !== 'content-length'),
      )
      if (file !== null) writeFileSync(file, JSON.stringify({ status: answer.status, headers, body }))
      return new Response(shuffledSearch(url, body), { status: answer.status, headers })
    }
  }
}

watchRegistryTraffic(process.env.REGISTRY_CACHE ?? null)

async function snapshotOne(domain: string): Promise<void> {
  const file = join(dir, `${domain}.json`)
  if (existsSync(file)) return
  const taken = await withScanBudget(SNAPSHOT_BUDGET_MS, async () => {
    const found = await discover(domain)
    // Already in the per-scan response cache, so this costs nothing on the wire.
    const llms = await fetchUrl(`https://${domain}/llms.txt`, { accept: 'text/plain' })
    return {
      domain,
      html: found.home.ok ? found.home.body : '',
      llmsBody: llms.ok && !looksLikeHtml(llms) ? llms.body : '',
      docsPage: found.docsPage,
    } satisfies Snapshot
  })
  writeFileSync(file, JSON.stringify(taken))
}

async function replayOne(snapshot: Snapshot) {
  const startedAt = Date.now()
  const attributed = await withScanBudget(REPLAY_BUDGET_MS, () =>
    attributePackage(snapshot.domain, snapshot.html, snapshot.llmsBody, snapshot.docsPage),
  )
  const attributionMs = Date.now() - startedAt
  const npm = await withScanBudget(REPLAY_BUDGET_MS, () => checkNpm(attributed.npmPackage))
  return {
    domain: snapshot.domain,
    package: attributed.npmPackage,
    source: attributed.npmSource,
    found: npm.found,
    typed: npm.bundledTypes ?? false,
    staleMonths: npm.staleMonths ?? null,
    version: npm.version ?? null,
    attributionMs,
  }
}

async function run<T>(items: T[], worker: (item: T) => Promise<void>, concurrency: number) {
  let cursor = 0
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (cursor < items.length) await worker(items[cursor++])
    }),
  )
}

if (mode === 'snapshot') {
  mkdirSync(dir, { recursive: true })
  let done = 0
  await run(
    domains,
    async (domain) => {
      try {
        await snapshotOne(domain)
      } catch (error) {
        console.log(`${domain} ERROR ${error instanceof Error ? error.message : String(error)}`)
      }
      console.log(`${++done}/${domains.length} ${domain}`)
    },
    5,
  )
} else {
  const files = readdirSync(dir).filter((name) => name.endsWith('.json'))
  const rows: Awaited<ReturnType<typeof replayOne>>[] = []
  await run(
    files,
    async (file) => {
      const snapshot = JSON.parse(readFileSync(join(dir, file), 'utf8')) as Snapshot
      // Paced, one domain at a time, when a timing is what is wanted: the registry starts
      // answering 429 to a replay run flat out, and waiting one out lands in the timing.
      if (gapMs > 0) await new Promise((resolve) => setTimeout(resolve, gapMs))
      const row = await replayOne(snapshot)
      rows.push(row)
      // On stderr so the table on stdout stays a table, and per domain because a replay that
      // is waiting out a rate limiter looks exactly like one that has hung.
      console.error(`${rows.length}/${files.length} ${row.domain} ${row.package ?? '-'} ${row.attributionMs}ms`)
    },
    // Two, not six: the registry answers 429 to a corpus-wide replay run any wider, and a
    // rate-limited search reads exactly like a vendor with no package.
    gapMs > 0 ? 1 : 2,
  )
  rows.sort((a, b) => a.domain.localeCompare(b.domain))
  for (const row of rows) {
    const verdict = !row.package ? 'NO PACKAGE' : !row.found ? 'NOT FOUND' : row.typed ? 'typed' : 'no types'
    console.log(
      `${row.domain.padEnd(24)} ${String(row.package).padEnd(38)} ${(row.source ?? '-').padEnd(16)} ${verdict.padEnd(10)} ${row.staleMonths ?? '-'}mo ${row.attributionMs}ms`,
    )
  }
  const total = rows.reduce((sum, row) => sum + row.attributionMs, 0)
  console.log(
    `\n${rows.length} domains, attribution median ${median(rows.map((r) => r.attributionMs))} ms, mean ${Math.round(total / rows.length)} ms, ` +
      `${registryRequests} registry requests (${(registryRequests / rows.length).toFixed(1)} per domain)`,
  )
  if (out) writeFileSync(out, JSON.stringify(rows, null, 2))
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}
