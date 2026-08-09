import { AsyncLocalStorage } from 'node:async_hooks'
import { brotliDecompressSync, constants as zlibConstants, gunzipSync, inflateSync } from 'node:zlib'
import { installGuardedDispatcher } from './dispatcher'
import { assertPublicHost, BlockedTargetError } from './guard'

installGuardedDispatcher()

export const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36'

/**
 * What an agent actually looks like on the wire. The scan reads content as a browser so it
 * can measure the content at all, but the door test has to be run as the thing being tested:
 * claiming "answers a request without a browser" while sending Chrome headers was a lie in
 * the one sentence the whole product is named after.
 */
// The URL a vendor sees in their logs has to resolve, or the traffic reads as an anonymous
// scanner. stackpick.ai is not registered yet, so this points at where the product lives.
export const AGENT_UA = `StackPick/1.0 (+${process.env.STACKPICK_BASE_URL ?? 'https://stackpick-f12d13a227ea.herokuapp.com'}/methodology)`

/**
 * Under undici's own 10 s connect timeout, so a host that resolves and then accepts nothing -
 * api.payloadcms.com does exactly that - is given up on by us rather than by the socket.
 * Every request is additionally clamped to whatever is left of the scan budget.
 */
const TIMEOUT_MS = 8_000
const MAX_BYTES = 400_000

/**
 * Heroku's router answers 503 to a request that has sent no byte for 30 seconds, so a scan
 * that runs past it produces nothing at all: not a low score, a dead connection. This is the
 * scan's whole wall-clock allowance, and it leaves room to score, store and serialise inside
 * the 30. `maxDuration` in a route file is a Vercel directive and does nothing on this host.
 *
 * 25 rather than 21: telnyx.com finishes in 17 seconds here and repeatedly ran out on the dyno,
 * losing four checks to a wall rather than to anything about the vendor, and the same wall was
 * turning npm registry lookups into "we could not identify a package as yours" on domains whose
 * package we had found an hour earlier. Scoring and serialising a report takes tens of
 * milliseconds, so the remaining five seconds are ample.
 */
export const SCAN_BUDGET_MS = Number(process.env.SCAN_BUDGET_MS ?? 25_000)

/**
 * The error prefix that means "we never found out", as opposed to a site answering us. A
 * check standing on one of these is unmeasured, and reporting it as a measured zero is the
 * one failure worse than the timeout it replaces.
 */
const OUT_OF_TIME = 'Out of time'
const outOfTimeBefore = `${OUT_OF_TIME}: the scan deadline passed before this could be requested`
const outOfTimeDuring = `${OUT_OF_TIME}: the scan deadline passed while this was in flight`

export const ranOutOfTime = (fetched: Fetched): boolean => fetched.error?.startsWith(OUT_OF_TIME) ?? false

/**
 * Running the phases at once only stays polite if what is in flight against one site is
 * capped. Six is what a single phase already used, so a scan puts no more load on a stranger
 * than it did when the phases ran one after another; what it stops paying for is the stall at
 * the end of every wave, where five finished requests waited on the slowest.
 */
const MAX_PER_SITE = 6

/**
 * docs.x, api.x and the apex are one site behind one edge, and the cap has to mean something
 * to whoever is paying for that edge. Same rule the scan rate limit uses on registrable names,
 * kept here rather than imported so that the fetch layer does not depend on the store.
 *
 * Exported because the same question decides something else entirely: whether the page we
 * ended up reading still belongs to the company we were asked about.
 */
export function registrableDomain(hostname: string): string {
  const labels = hostname.split('.')
  if (labels.length <= 2) return hostname
  const suffix = labels.slice(-2).join('.')
  const compound = /^(co|com|net|org|gov|edu|ac|or|ne)\.[a-z]{2}$/.test(suffix)
  return labels.slice(compound ? -3 : -2).join('.')
}

type HostSlots = { active: number; waiting: (() => void)[] }

type ScanState = {
  deadlineAt: number
  /**
   * Hosts that answered at all, and hosts that would not connect. A guessed subdomain that
   * times out costs eight seconds, and api.payloadcms.com was guessed at by four separate
   * probes in one scan.
   */
  hostHealth: Map<string, 'ok' | 'dead'>
  slots: Map<string, HostSlots>
  /** One scan asks for the same URL up to four times, from phases that cannot see each other. */
  responses: Map<string, Promise<Fetched>>
  /** How much evidence the phase now running lost to the deadline. */
  lost: { count: number }
}

const scanState = new AsyncLocalStorage<ScanState>()

/** Runs a whole scan under one wall-clock deadline. Nothing outside it is time-limited. */
export function withScanBudget<T>(budgetMs: number, run: () => Promise<T>): Promise<T> {
  return scanState.run(
    {
      deadlineAt: Date.now() + budgetMs,
      hostHealth: new Map(),
      slots: new Map(),
      responses: new Map(),
      lost: { count: 0 },
    },
    run,
  )
}

export const timeLeftMs = (): number => {
  const state = scanState.getStore()
  return state ? state.deadlineAt - Date.now() : Number.POSITIVE_INFINITY
}

export const outOfTime = (): boolean => timeLeftMs() <= 0

/**
 * Runs one phase and reports how many of its requests the deadline ate, so a scan that ran out
 * of time can name the checks whose evidence never arrived instead of scoring them zero.
 */
export async function inPhase<T>(run: () => Promise<T>): Promise<{ value: T; lostEvidence: number }> {
  const parent = scanState.getStore()
  if (!parent) return { value: await run(), lostEvidence: 0 }
  const state: ScanState = { ...parent, lost: { count: 0 } }
  const value = await scanState.run(state, run)
  return { value, lostEvidence: state.lost.count }
}

export type Fetched = {
  url: string
  status: number
  ok: boolean
  body: string
  headers: Record<string, string>
  truncated: boolean
  error?: string
}

export type FetchOptions = {
  accept?: string
  ua?: string
  method?: 'GET' | 'HEAD' | 'POST'
  body?: string
  /** Bypasses the per-scan response cache, for the reads that are repeated on purpose. */
  fresh?: boolean
}

const empty = (url: string, error: string): Fetched => ({
  url,
  status: 0,
  ok: false,
  body: '',
  headers: {},
  truncated: false,
  error,
})

const MAX_REDIRECTS = 5

const cacheKey = (url: string, options: FetchOptions): string =>
  // The accept header is part of the key because content negotiation is one of the things
  // this scan measures: the same path answers differently to text/markdown and to */*.
  [options.method ?? 'GET', options.ua ?? BROWSER_UA, options.accept ?? '*/*', options.body ?? '', url].join('\n')

function countIfLost(state: ScanState, fetched: Fetched): Fetched {
  if (ranOutOfTime(fetched)) state.lost.count++
  return fetched
}

async function takeSiteSlot(state: ScanState, hostname: string): Promise<() => void> {
  const key = registrableDomain(hostname)
  const slots = state.slots.get(key) ?? { active: 0, waiting: [] }
  state.slots.set(key, slots)
  // A freed slot is handed to the next waiter without passing through the count. Releasing it
  // first and letting the waiter retake it leaves a gap a newly arriving request can take,
  // which puts the site one over the cap for as long as the queue is busy.
  if (slots.active >= MAX_PER_SITE) await new Promise<void>((resolve) => slots.waiting.push(resolve))
  else slots.active++

  let released = false
  return () => {
    if (released) return
    released = true
    const next = slots.waiting.shift()
    if (next) next()
    else slots.active--
  }
}

export async function fetchUrl(url: string, options: FetchOptions = {}): Promise<Fetched> {
  const state = scanState.getStore()
  if (!state) return runFetch(url, options, null)
  if (Date.now() >= state.deadlineAt) return countIfLost(state, empty(url, outOfTimeBefore))
  if (options.fresh) return countIfLost(state, await runFetch(url, options, state))

  const key = cacheKey(url, options)
  const held = state.responses.get(key)
  if (held) return countIfLost(state, await held)
  const started = runFetch(url, options, state)
  state.responses.set(key, started)
  return countIfLost(state, await started)
}

async function runFetch(url: string, options: FetchOptions, state: ScanState | null): Promise<Fetched> {
  const { accept = '*/*', ua = BROWSER_UA, method = 'GET', body } = options
  const timeoutMs = Math.min(TIMEOUT_MS, state ? state.deadlineAt - Date.now() : TIMEOUT_MS)
  if (timeoutMs <= 0) return empty(url, outOfTimeBefore)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let attempted = ''
  let releaseSlot: (() => void) | null = null
  try {
    let current = url
    // Redirects are followed by hand because every hop has to be re-checked: a public
    // hostname is free to redirect into a private address.
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const target = new URL(current)
      if (target.protocol !== 'https:' && target.protocol !== 'http:') {
        return empty(url, 'Refused a non-HTTP redirect')
      }
      // A public host is free to redirect to its own port 6379. Web ports only.
      if (target.port !== '' && target.port !== '80' && target.port !== '443') {
        return empty(url, `Refused a redirect to port ${target.port}`)
      }
      // Before anything else on every hop, including hops we go on to skip: a redirect is
      // free to point at a private address, and nothing here may reach one.
      await assertPublicHost(target.hostname)

      attempted = target.hostname.toLowerCase()
      if (state?.hostHealth.get(attempted) === 'dead') {
        return empty(url, `${attempted} would not accept a connection earlier in this scan`)
      }

      // Held for the whole request, including the body read, and keyed on the host of the
      // first hop: a redirect that leaves the site is too rare to queue separately for.
      if (state && !releaseSlot) releaseSlot = await takeSiteSlot(state, attempted)
      if (state && Date.now() >= state.deadlineAt) return empty(url, outOfTimeBefore)

      const response = await fetch(current, {
        method,
        headers: {
          'user-agent': ua,
          accept,
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body }),
        redirect: 'manual',
        signal: controller.signal,
      })
      state?.hostHealth.set(attempted, 'ok')

      const location = response.headers.get('location')
      if (response.status >= 300 && response.status < 400 && location) {
        current = new URL(location, current).toString()
        continue
      }

      const buffer = method === 'HEAD' ? { text: '', truncated: false } : await readCapped(response)
      return {
        url: current,
        status: response.status,
        ok: response.status >= 200 && response.status < 300,
        body: buffer.text,
        headers: Object.fromEntries([...response.headers].map(([k, v]) => [k.toLowerCase(), v])),
        truncated: buffer.truncated,
      }
    }
    return empty(url, 'Too many redirects')
  } catch (error) {
    if (error instanceof BlockedTargetError) return empty(url, `Blocked: ${error.message}`)
    if (state && Date.now() >= state.deadlineAt) return empty(url, outOfTimeDuring)
    // Only ever a first impression: a host that has already answered something is never
    // written off on a later failure, so one reset cannot end the scan of a live site.
    if (state && attempted && !state.hostHealth.has(attempted)) state.hostHealth.set(attempted, 'dead')
    return empty(url, error instanceof Error ? `${error.name}: ${error.message}` : String(error))
  } finally {
    clearTimeout(timer)
    releaseSlot?.()
  }
}

/**
 * A body the server compressed and we did not ask it to. undici only decompresses what it
 * negotiated itself, and a stored sitemap.xml.gz is served with content-encoding: gzip to
 * anybody: docs.datadoghq.com/sitemap.xml came back as bytes, matched no <loc>, and the
 * provisioning check then scored Datadog on its documentation front page alone.
 */
function decoded(bytes: Uint8Array, encoding: string | undefined): Uint8Array {
  const how = (encoding ?? '').toLowerCase()
  // Sync flush rather than a finished stream: we cap what we read, so a large sitemap arrives
  // cut in the middle, and a strict inflate throws away everything we did receive.
  //
  // maxOutputLength is the part that matters for safety. Capping the bytes we read off the
  // socket says nothing about what they expand to: 389 kB of gzipped zeros expands to 400 MB,
  // measured, in one synchronous call on the thread that serves every other request. Every
  // domain we scan chooses its own Content-Encoding, and anyone can point the public scan
  // endpoint at a host they control, so this was a remote out-of-memory anybody could fire.
  const limits = { finishFlush: zlibConstants.Z_SYNC_FLUSH, maxOutputLength: MAX_BYTES }
  try {
    if (how.includes('gzip')) return gunzipSync(bytes, limits)
    if (how.includes('deflate')) return inflateSync(bytes, limits)
    if (how.includes('br')) {
      return brotliDecompressSync(bytes, {
        finishFlush: zlibConstants.BROTLI_OPERATION_FLUSH,
        maxOutputLength: MAX_BYTES,
      })
    }
  } catch {
    // Either not decompressible at all, which is what a mislabelled body looks like, or over
    // the cap, which is a body we would have truncated anyway. Both end as bytes we cannot read.
  }
  return bytes
}

async function readCapped(response: Response): Promise<{ text: string; truncated: boolean }> {
  if (!response.body) return { text: '', truncated: false }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  let truncated = false
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    size += value.byteLength
    if (size >= MAX_BYTES) truncated = true
  }
  void reader.cancel()
  const joined = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    joined.set(chunk, offset)
    offset += chunk.byteLength
  }
  const body = decoded(joined, response.headers.get('content-encoding') ?? undefined)
  return { text: new TextDecoder('utf-8').decode(body), truncated }
}

export function looksLikeHtml(fetched: Fetched): boolean {
  if ((fetched.headers['content-type'] ?? '').includes('html')) return true
  const head = fetched.body.slice(0, 600).toLowerCase()
  return head.includes('<!doctype html') || head.includes('<html')
}

/** Guards against soft-404s: sites that serve their SPA shell for every unknown path. */
export function isRealTextFile(fetched: Fetched, minLength = 40): boolean {
  return fetched.ok && !looksLikeHtml(fetched) && fetched.body.trim().length >= minLength
}

/**
 * Strips script, style and noscript bodies by scanning, not by matching. Every regex form of
 * this backtracks quadratically on unclosed tags: 600 kB of "<script " measured at 10.1 s
 * with the original and 17 s with the unrolled rewrite, on the single thread that serves
 * every other request. An unterminated block drops the rest of the document, which is the
 * right answer for a page that is already malformed.
 */
const CODE_TAGS = ['script', 'style', 'noscript'] as const

export function stripCodeBlocks(html: string): string {
  const lower = html.toLowerCase()
  let out = ''
  let cursor = 0

  // Cached per tag: a tag that never appears must not be searched for again on every block,
  // which turned a document with 20k script tags into a quadratic scan of its own.
  const nextOpen = new Map(CODE_TAGS.map((tag) => [tag, lower.indexOf(`<${tag}`)]))

  while (cursor < html.length) {
    let opensAt = -1
    let tag = ''
    for (const candidate of CODE_TAGS) {
      let at = nextOpen.get(candidate) ?? -1
      if (at !== -1 && at < cursor) {
        at = lower.indexOf(`<${candidate}`, cursor)
        nextOpen.set(candidate, at)
      }
      if (at !== -1 && (opensAt === -1 || at < opensAt)) {
        opensAt = at
        tag = candidate
      }
    }
    if (opensAt === -1) return out + html.slice(cursor)

    out += `${html.slice(cursor, opensAt)} `
    const closesAt = lower.indexOf(`</${tag}`, opensAt)
    if (closesAt === -1) return out
    const afterClose = html.indexOf('>', closesAt)
    cursor = afterClose === -1 ? html.length : afterClose + 1
  }
  return out
}

export function visibleTextLength(html: string): number {
  const withoutScripts = stripCodeBlocks(html)
  return withoutScripts
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim().length
}

/**
 * Bot gates answer inconsistently: the same Cloudflare signup returned 200 once and 403
 * four times during research. Report the majority status, and say so when tries disagree.
 */
export async function fetchWithRetries(
  url: string,
  options: { accept?: string; ua?: string } = {},
  tries = 3,
): Promise<Fetched & { statusesSeen: number[]; consistent: boolean }> {
  const attempts: Fetched[] = []
  for (let i = 0; i < tries; i++) {
    // Three requests to the same URL with no gap is itself a burst, and a site that rate limits
    // it hands us a 429 we then have to explain away rather than a finding about agents.
    if (i > 0) {
      // One inconsistent status is a weaker finding than none, but a scan cut off at the
      // deadline reports nothing at all. Stop repeating once there is no room to.
      if (timeLeftMs() < 1_500) break
      await new Promise((resolve) => setTimeout(resolve, 400))
    }
    // Deliberately the same URL again: the cache would hand back the first answer and the
    // disagreement between tries is the entire measurement.
    attempts.push(await fetchUrl(url, { ...options, fresh: true }))
  }
  const statuses = attempts.map((a) => a.status)
  const counts = new Map<number, number>()
  for (const status of statuses) counts.set(status, (counts.get(status) ?? 0) + 1)
  const [majority] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  const representative = attempts.find((a) => a.status === majority) ?? attempts[0]
  return {
    ...representative,
    statusesSeen: statuses,
    consistent: new Set(statuses).size === 1,
  }
}

export async function inParallel<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  concurrency = 6,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await worker(items[index])
    }
  })
  await Promise.all(runners)
  return results
}
