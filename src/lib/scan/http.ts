import { AsyncLocalStorage } from 'node:async_hooks'
import { brotliDecompressSync, constants as zlibConstants, gunzipSync, inflateSync } from 'node:zlib'
import { installGuardedDispatcher } from './dispatcher'
import { assertPublicHost, BlockedTargetError } from './guard'
import { SITE_URL } from '../site'

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
// scanner. letagentsin.ai is not registered yet, so this points at where the product lives.
/**
 * The user agents an edge actually has rules for. Ours is a string nobody has ever written a rule
 * against, which made a clean measurement of a question nobody asked: algolia.com answers 403 to
 * any agent whose name contains "Bot" at a documentation URL it serves us in full.
 *
 * On-demand fetchers, not training crawlers, and the two are not interchangeable. This probe used
 * to ask as ClaudeBot and GPTBot, which are the crawlers that build training sets, and then fail
 * the vendor under a check whose whole subject is the agent fetching for a customer who asked.
 * Our own robots.txt rule says the same thing and says it correctly: a training crawler in the
 * disallow group costs nothing. Measured on algolia.com the day this was fixed, the classes
 * genuinely differ at the edge: ClaudeBot 403, ChatGPT-User 403, Claude-User 200.
 */
export const NAMED_CRAWLERS = [
  { name: 'ChatGPT-User', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot' },
  { name: 'Claude-User', ua: 'Mozilla/5.0 (compatible; Claude-User/1.0; +Claude-User@anthropic.com)' },
] as const

/**
 * Characters of visible text below which a page is a shell rather than a short page. Measured
 * across the corpus on 2026-08-12: the genuine shells render 31 to 126 characters, and the
 * smallest real page we were wrongly failing renders 647. Lives here because both the scoring of
 * a documentation page and the choosing of one need the same line, and the scanner cannot import
 * the scorer.
 */
export const DOCS_SHELL_FLOOR = 500

/**
 * A status that means an edge turned a named agent away, as opposed to one that means the page
 * is not there. Not 429: that is our own load, and the rest of this scanner already says so.
 * Not 404 either. workos.com answers Claude-User a repeatable 404 at /docs while serving it
 * every other documentation page, including markdown written for agents, and we published that
 * as "on-demand agents blocked". A missing route is a routing miss; a closed door says 401, 403
 * or 451 and means it.
 */
export const isEdgeRefusal = (status: number) => status >= 400 && status !== 404 && status !== 429

/**
 * Which refusals survive being asked a second time, at another page of the same documentation.
 * Only ever removes one: a crawler that got through the second time was not blocked, and a
 * crawler refused twice is a finding we are willing to print under a company's name.
 */
export function confirmedRefusals(seen: { name: string; status: number; second: number }[]) {
  return seen.filter(({ second }) => isEdgeRefusal(second)).map(({ name, status }) => ({ name, status }))
}

export const AGENT_UA = `LetAgentsIn/1.0 (+${SITE_URL}/bot)`

/**
 * The address an administrator can write to, on the requests that already say who we are.
 *
 * RFC 9110 keeps `From` for exactly this: a machine asking politely leaves a way to be told to
 * stop. It goes only on requests carrying our own user-agent. The requests that ask as
 * `Claude-User` or `GPTBot` measure how an edge treats those identities, and anything of ours
 * bolted onto them would let a vendor wave us through while everybody else is still turned away,
 * which turns the measurement into a description of our own allowlist.
 */
/** Sent with every request under our own user agent, so an audit reproducing one has to send it too. */
export const CONTACT = 'hello@letagentsin.com'

/**
 * Under undici's own 10 s connect timeout, so a host that resolves and then accepts nothing -
 * api.payloadcms.com does exactly that - is given up on by us rather than by the socket.
 * Every request is additionally clamped to whatever is left of the scan budget.
 */
const TIMEOUT_MS = 8_000

/** Three eight second waits is most of the budget already; a fourth buys nothing. */
const MOST_TIMEOUTS_PER_SITE = 3
/** Published on /bot, so the promise about our own load and the cap that keeps it are one thing. */
export const MAX_BYTES_PER_RESPONSE = 400_000
const MAX_BYTES = MAX_BYTES_PER_RESPONSE

/**
 * Heroku's router answers 503 to a request that has sent no byte for 30 seconds, so a scan
 * that runs past it produces nothing at all: not a low score, a dead connection. This is the
 * scan's whole wall-clock allowance, and it leaves room to score, store and serialise inside
 * the 30. `maxDuration` in a route file is a Vercel directive and does nothing on this host.
 *
 * 27 rather than 21: telnyx.com finishes in 17 seconds here and repeatedly ran out on the dyno,
 * losing four checks to a wall rather than to anything about the vendor, and the same wall was
 * turning npm registry lookups into "we could not identify a package as yours" on domains whose
 * package we had found an hour earlier. Scoring and serialising a report takes tens of
 * milliseconds, so the remaining five seconds are ample.
 */
/** The shipped budget, named because it is the number we publish to agents in agent-access.json. */
export const DEFAULT_SCAN_BUDGET_MS = 27_000
export const SCAN_BUDGET_MS = Number(process.env.SCAN_BUDGET_MS ?? DEFAULT_SCAN_BUDGET_MS)

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
export const MAX_PER_SITE = 6

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
  /**
   * Timeouts per site, not per hostname, and that distinction is the whole point. hover.com
   * answers its own pages in under four seconds and still spent the entire 27 second budget:
   * it has wildcard DNS, so mcp.hover.com, api.hover.com, docs.hover.com and a control named
   * mcp-letagentsin-control-8f3a1c.hover.com all accept a connection and then say nothing,
   * eight seconds each. Counted per hostname this never reaches three, because every one of
   * them is a different name asked once.
   *
   * The block only applies to hostnames that have not answered in this scan, so a site whose
   * apex is healthy keeps being read while its imaginary subdomains stop being waited for.
   */
  timeouts: Map<string, number>
  slots: Map<string, HostSlots>
  /**
   * How many times we have already waited out a 429 on a site, so a host that answers 429 to
   * everything cannot spend the scan's budget on politeness. pandadoc.com is that host.
   */
  backedOff: Map<string, number>
  /**
   * Every limit we met and whether it carried a challenge marker, because those are two different
   * facts wearing one status code and the scanner currently keeps neither. A 429 is our own load
   * and never a finding about a vendor; a 429 that says `cf-mitigated: challenge` is the vendor's
   * wall, which is what the whole card measures. Recorded rather than scored: turning it into a
   * verdict moves rows towards accusations, and an accusation may not stand on evidence we have
   * not yet counted on the corpus.
   */
  limits: { url: string; challenge: boolean; recovered: boolean }[]
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
      timeouts: new Map(),
      slots: new Map(),
      backedOff: new Map(),
      limits: [],
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
  /**
   * The request never left the process, because the host had already refused a connection or
   * swallowed its allowance of timeouts earlier in this scan. Status 0 alone cannot say that: it
   * is also what a genuine network failure looks like, and a check that reads "not a 404" as
   * "alive" turns a request we never sent into a link that answers.
   */
  unasked?: boolean
}

export type FetchOptions = {
  accept?: string
  ua?: string
  method?: 'GET' | 'HEAD' | 'POST'
  body?: string
  /** Bypasses the per-scan response cache, for the reads that are repeated on purpose. */
  fresh?: boolean
  /**
   * A larger read cap for one request. The default exists so a 7 MB llms-full.txt cannot exhaust
   * the dyno, and it costs a control its answer when the page is a marketing front page: sentry.io
   * serves 628 kB and the recaptcha token we were controlling for sits past 400 kB, so the control
   * reported "not there" about bytes it never read.
   */
  readBytes?: number
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

const unasked = (url: string, error: string): Fetched => ({ ...empty(url, error), unasked: true })

/**
 * Whether this answer is the absence of a request rather than the absence of a page.
 *
 * Deliberately not wired into `countIfLost`, which would demote whole phases: most skipped
 * requests are guessed subdomains that do not exist, and "we asked nine hosts and none answered"
 * is a true sentence about a vendor with no authorization server. It matters where a check reads
 * a non-404 as proof of life, which is why the llms.txt sampler consults it by name.
 */
export const wasNeverAsked = (fetched: Fetched): boolean => fetched.unasked === true

const MAX_REDIRECTS = 5

const cacheKey = (url: string, options: FetchOptions): string =>
  // The accept header is part of the key because content negotiation is one of the things
  // this scan measures: the same path answers differently to text/markdown and to */*.
  // readBytes belongs here: the front page is fetched during discovery under the default cap, and
  // without it a control asking for more bytes would be handed the truncated body from cache and
  // conclude about text nobody read.
  [options.method ?? 'GET', options.ua ?? BROWSER_UA, options.accept ?? '*/*', options.body ?? '', String(options.readBytes ?? ''), url].join('\n')

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

/**
 * The npm registry is the one host we ask about the same thing across scans: attribution reads
 * roughly nineteen documents per domain, and a corpus reseed asks for the same popular packages
 * over and over. That load is what made npm start refusing us, and since 6.9 a refusal is
 * honestly "we do not know" rather than a wrong answer, so it cost 28 domains their package in
 * one reseed. Answers are cached across scans and refusals never are, because caching a refusal
 * would turn a moment of load into a fact about a vendor. The window is on the constant below,
 * with the reasoning that picked it.
 *
 * Six hours was the first guess and too short: measured on 2026-08-15, a reseed's cold first pass
 * loses sixteen domains their package and the warm second pass finds it again, which is 21 of the
 * 22 verdicts that moved between the two. The corpus is published from the warm pass, so a vendor
 * scanning themselves after a quiet night got a worse score than the row we publish about them.
 *
 * Seven days was then too long, in the other direction and for a worse reason. Every failing row
 * carries advice, and the advice on this one is "name your package once in your docs". A vendor
 * who takes it, publishes and rescans would have read the same verdict back for a week, from a
 * cache shared by every dyno, and the weekly watch rescan reads it too, so their fix would not
 * even have produced the email. Forty-eight hours spans the quiet night that started this and
 * bounds what a vendor who fixed something has to wait. Refusals are still never cached.
 */
const REGISTRY_HOSTS = new Set(['registry.npmjs.org', 'api.npmjs.org'])
export const REGISTRY_TTL_MS = 48 * 60 * 60 * 1000
const registryCache = new Map<string, { at: number; answer: Fetched }>()

/**
 * A place to keep those answers that a deploy does not empty. Process memory alone meant the
 * first reseed after every deploy was cold, and a cold pass over the corpus costs about 26
 * domains their package: measured at 139 typed packages warm against 116 cold. Injected rather
 * than imported, because this module knows about HTTP and must not know about the database.
 */
export type SharedCache = {
  get(key: string): Promise<Fetched | null>
  set(key: string, answer: Fetched): Promise<void>
}
let shared: SharedCache | null = null
/** Named for what it does, not `use...`, which the React lint rule reads as a hook. */
export function installSharedCache(cache: SharedCache | null): void {
  shared = cache
}

function registryKey(url: string, options: FetchOptions): string | null {
  try {
    if (!REGISTRY_HOSTS.has(new URL(url).hostname)) return null
  } catch {
    return null
  }
  return cacheKey(url, options)
}

export async function fetchUrl(url: string, options: FetchOptions = {}): Promise<Fetched> {
  const state = scanState.getStore()
  if (!state) return runFetch(url, options, null)
  if (Date.now() >= state.deadlineAt) return countIfLost(state, empty(url, outOfTimeBefore))
  if (options.fresh) return countIfLost(state, await askedUntilAnswered(url, options, state))

  const acrossScans = registryKey(url, options)
  if (acrossScans) {
    const held = registryCache.get(acrossScans)
    if (held && Date.now() - held.at < REGISTRY_TTL_MS) return held.answer
    if (shared) {
      // Never let the cache itself become the reason a scan runs out of time.
      const stored = await Promise.race([
        shared.get(acrossScans).catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1_000)),
      ])
      if (stored) {
        registryCache.set(acrossScans, { at: Date.now(), answer: stored })
        return stored
      }
    }
  }

  const key = cacheKey(url, options)
  const held = state.responses.get(key)
  if (held) return countIfLost(state, await held)
  // The waiting is inside what gets memoised, so the three later phases asking for the same page
  // wait for the same second attempt rather than being handed the refusal it was about to replace.
  const started = askedUntilAnswered(url, options, state)
  state.responses.set(key, started)
  const answer = await countIfLost(state, await started)
  // 404 is an answer about a package that does not exist and is worth keeping; a 429 is a fact
  // about us and must be asked again next time.
  if (acrossScans && (answer.ok || answer.status === 404)) {
    registryCache.set(acrossScans, { at: Date.now(), answer })
    void shared?.set(acrossScans, answer).catch(() => undefined)
    // Bounded, because a dyno serves every scan anyone runs and this map would otherwise only grow.
    if (registryCache.size > 5_000) {
      for (const oldest of [...registryCache.keys()].slice(0, 1_000)) registryCache.delete(oldest)
    }
  }
  return answer
}

/**
 * Waits out a 429 and asks once more, or returns null when it was not ours to wait out.
 *
 * This project's own published rule is that a 429 is our load rather than an answer about the
 * vendor, and every check already refuses to score one. Refusing to score it is only half of the
 * rule: the row still goes out thinner, and thinner reads as worse. Measured on 2026-08-18, one
 * scan of split.io read four documentation pages and the next, ninety seconds later, read one and
 * met three 429s, which took `programmatic_provisioning` from two points to unmeasured. Nothing
 * about split.io changed in those ninety seconds. Three rows of the 9.40 sweep moved for exactly
 * this reason and were reported as verdicts that got worse.
 *
 * Bounded on all three sides, because backing off is not free: twice per site, only while the
 * deadline can still afford the wait and the request after it, and never longer than three
 * seconds even when the site asks for more.
 */
async function askedUntilAnswered(url: string, options: FetchOptions, state: ScanState): Promise<Fetched> {
  const first = await runFetch(url, options, state)
  const site = registrableDomain(new URL(first.url || url).hostname)
  const already = state.backedOff.get(site) ?? 0
  const waitMs = backoffFor(first, already, timeLeftMs())
  if (waitMs === null) return noteLimit(state, first, false)
  state.backedOff.set(site, already + 1)
  await new Promise((done) => setTimeout(done, waitMs))
  const second = await runFetch(url, options, state)
  // One entry for one address: the same page refused twice is one limit, not two, and counting it
  // twice would make a site that never answers look like the site that refuses most. The marker
  // comes from either try, because an edge can throttle first and challenge second.
  noteLimit(state, first, second.ok || second.status === 404, isBotChallenge(second))
  // Only an answer replaces the refusal. A 404 is one: this module already treats it as evidence
  // worth caching across scans, and keeping the 429 over it would leave measured absence unmeasured.
  // A second 429, or a request the deadline ate on the way back, is not evidence the first lacked.
  return second.ok || second.status === 404 ? second : first
}

/**
 * Retry-After in either form the standard allows. The date form is not exotic: it is what a
 * cache-fronted origin sends, and read as a number it comes back NaN, which silently became the
 * default wait and a second refusal.
 */
function askedToWaitMs(header: string | undefined, now = Date.now()): number | null {
  if (!header) return null
  const seconds = Number(header.trim())
  if (Number.isFinite(seconds)) return seconds > 0 ? seconds * 1_000 : null
  const at = Date.parse(header)
  if (Number.isNaN(at)) return null
  return at > now ? at - now : null
}

/** Bounded: one scan of a site that limits everything would otherwise carry a list of its sitemap. */
const MOST_LIMITS_KEPT = 20

function noteLimit(state: ScanState, answer: Fetched, recovered: boolean, alsoChallenged = false): Fetched {
  if (answer.status !== 429) return answer
  if (state.limits.length < MOST_LIMITS_KEPT) {
    state.limits.push({ url: answer.url, challenge: isBotChallenge(answer) || alsoChallenged, recovered })
  }
  return answer
}

/** What this scan was refused with, for the report to carry rather than for a check to score. */
export const limitsSeen = (): { url: string; challenge: boolean; recovered: boolean }[] =>
  scanState.getStore()?.limits ?? []

const MAX_BACKOFFS_PER_SITE = 2
/**
 * The registry gets more tries than a stranger's edge, because a refusal there costs a vendor
 * something and a refusal here costs us nothing. A 429 from npm is not a fact about anybody: it
 * ends with "we could not identify the package a developer installs to use you" on somebody
 * else's row, and a cold pass over the corpus once lost 28 domains their package that way.
 * Measured 2026-08-18: 89 of 177 scans meet a limit at the registry, and sixteen of a scan's
 * twenty-odd registry requests are the download counts.
 */
const MAX_BACKOFFS_AT_REGISTRY = 6

function backoffsAllowedFor(url: string): number {
  try {
    return REGISTRY_HOSTS.has(new URL(url).hostname) ? MAX_BACKOFFS_AT_REGISTRY : MAX_BACKOFFS_PER_SITE
  } catch {
    return MAX_BACKOFFS_PER_SITE
  }
}
const DEFAULT_BACKOFF_MS = 1_200
const MAX_BACKOFF_MS = 3_000
/** The wait is only worth taking when what follows it has room to answer. */
const MIN_TIME_FOR_RETRY_MS = 6_000

/**
 * How long to wait before asking a refused request again, or null for the ones not worth waiting
 * out. Separated from the request itself so the rule can be stated without a network.
 */
export function backoffFor(answer: Fetched, alreadyBackedOff: number, timeLeft: number): number | null {
  // A 429 carrying a challenge marker is the vendor's wall rather than our load, and waiting
  // politely in front of a wall only spends the budget.
  if (answer.status !== 429 || isBotChallenge(answer)) return null
  if (alreadyBackedOff >= backoffsAllowedFor(answer.url)) return null
  const waitMs = Math.min(askedToWaitMs(answer.headers['retry-after']) ?? DEFAULT_BACKOFF_MS, MAX_BACKOFF_MS)
  // The wait plus a request that can actually finish. Waiting into the deadline turns a 429 into
  // an out-of-time, which is a worse sentence about the same nothing.
  return timeLeft < waitMs + MIN_TIME_FOR_RETRY_MS ? null : waitMs
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
        return unasked(url, `${attempted} would not accept a connection earlier in this scan`)
      }
      const site = registrableDomain(attempted)
      if (
        state?.hostHealth.get(attempted) !== 'ok' &&
        (state?.timeouts.get(site) ?? 0) >= MOST_TIMEOUTS_PER_SITE
      ) {
        return unasked(url, `${site} left ${MOST_TIMEOUTS_PER_SITE} requests unanswered earlier in this scan`)
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
          ...(ua === AGENT_UA ? { from: CONTACT } : {}),
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

      const buffer = method === 'HEAD' ? { text: '', truncated: false } : await readCapped(response, options.readBytes ?? MAX_BYTES)
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
    if (state && attempted && (error as Error)?.name === 'AbortError') {
      const site = registrableDomain(attempted)
      state.timeouts.set(site, (state.timeouts.get(site) ?? 0) + 1)
    }
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

async function readCapped(response: Response, cap: number = MAX_BYTES): Promise<{ text: string; truncated: boolean }> {
  if (!response.body) return { text: '', truncated: false }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  let truncated = false
  while (size < cap) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    size += value.byteLength
    if (size >= cap) truncated = true
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

/**
 * Tags removed by walking the string rather than by `replace(/<[^>]+>/g, ' ')`.
 *
 * Measured on the shapes a hostile page can take, at the 400 kB we cap bodies at: 400 000 `<`
 * characters took 53 seconds and 200 000 `</` took 27, because `[^>]+` scans to the end of the
 * document for every unmatched `<`. The whole scan budget is 27 seconds, so one page could spend
 * all of it and every check that needed another page would publish as unmeasured: a page of
 * punctuation turning into sentences about a vendor we never managed to read.
 *
 * Same output as the pattern it replaces, including the two cases that look like details and are
 * not: `<` with no `>` after it is not a tag and stays, and `<>` has nothing between the brackets
 * so it is not a tag either. `scripts/audit-redos.mts` measures the time, `scripts/rules.mts`
 * checks the equivalence against the old pattern on random input.
 */
export function withoutTags(html: string): string {
  let out = ''
  let at = 0
  while (at < html.length) {
    const opensAt = html.indexOf('<', at)
    if (opensAt === -1) {
      out += html.slice(at)
      break
    }
    out += html.slice(at, opensAt)
    const closesAt = html.indexOf('>', opensAt + 1)
    if (closesAt === -1) {
      out += html.slice(opensAt)
      break
    }
    if (closesAt === opensAt + 1) {
      out += '<>'
      at = closesAt + 1
      continue
    }
    out += ' '
    at = closesAt + 1
  }
  return out
}

export function visibleTextLength(html: string): number {
  return withoutTags(stripCodeBlocks(html))
    .replace(/\s+/g, ' ')
    .trim().length
}

/** Below this a guessed path is an SPA shell served under every address, not a page. */
const LIVE_PAGE_FLOOR = 200

/**
 * How a guessed path answered: with a page, with an application shell, or with a body our own cap
 * cut short before we could tell.
 *
 * The length test alone reads our own ceiling as somebody else's emptiness. A body that filled the
 * 400,000-byte cap is cut mid-block, `stripCodeBlocks` drops the rest of a document it can only
 * assume is malformed, and everything after the cut stops existing: filestack.com's quickstart
 * renders 12,282 characters to a complete read and 53 to ours.
 *
 * `cut-short` is deliberately not `page`. A shell is usually small, but a site that inlines its
 * bundle serves a catch-all shell that is enormous - codex's, and it is right: bypassing the text
 * test on truncation alone would accept `/docs` on a host that answers every unknown path the same
 * way. Only a control asking for a path that cannot exist separates the two, and the caller does
 * that, because it costs a request and is worth paying only in this case.
 *
 * This decides which page we go on to read, not what we say about a vendor - which is why no audit
 * caught it: the verdict that follows is a true sentence about the wrong page.
 */
export type HowAPathAnswered = 'page' | 'shell' | 'cut-short'

export function howAPathAnswered(fetched: Fetched): HowAPathAnswered {
  if (!fetched.ok || !looksLikeHtml(fetched)) return 'shell'
  if (visibleTextLength(fetched.body) > LIVE_PAGE_FLOOR) return 'page'
  return fetched.truncated ? 'cut-short' : 'shell'
}

/**
 * True when the host answers a path that cannot exist with a body of the SAME kind: enormous enough
 * to hit our cap and unreadable without it. That is what an inlined-bundle shell under a catch-all
 * route looks like, and it is the only answer that makes a cut-short candidate worthless.
 *
 * `cut-short` and nothing weaker. Accepting any short 200 here - a soft-404 that says "not found" in
 * forty characters - would throw away exactly the genuine documentation page this control exists to
 * rescue, which is the opposite mistake and the more common one. Codex's, on the second pass.
 */
/**
 * A control worth believing: it came back, and it came back about the path rather than about us.
 *
 * 429 named separately because `isEdgeRefusal` deliberately excludes it - by this project's own
 * published rule a 429 is our own load rather than the vendor's wall. That is right for a verdict
 * about the vendor and wrong here: a rate limit tells us nothing about what the host serves at an
 * address nobody registered, which is the only question a control asks.
 */
/**
 * Whether an address is one we can even ask for. `new URL` throws on a documented template, and a
 * throw here is not a small thing: `signoz.io` documents `https://mcp.<region>.signoz.cloud/mcp`,
 * one unguarded parse turned that into an unhandled rejection, and the **whole scan died** - twice
 * per sweep, for days, while the published row sat frozen on formula 9.45 and „176 of 177" read as
 * healthy. One vendor's placeholder must not be able to take our scanner down.
 *
 * A template is also not an endpoint even when it parses: nobody routes JSON-RPC at `<region>`.
 */
export function askable(url: string): boolean {
  if (/[<>{}\s]/.test(url) || /(^|[/.]):[a-z_]/i.test(url)) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

export const informative = (got: Fetched) => got.status > 0 && got.status !== 429 && !isEdgeRefusal(got.status)

export function answersEverythingTheSameWay(control: Fetched): boolean {
  return howAPathAnswered(control) === 'cut-short'
}

/**
 * A 429 is our own traffic everywhere else in this scan, and that rule was laundering the most
 * agent-hostile configuration in the corpus. pandadoc.com answers every request with 429,
 * `x-vercel-mitigated: challenge`, a challenge token and no Retry-After: that is Vercel Attack
 * Challenge Mode, a wall the vendor switched on, and excluding it from the denominator scored
 * the wall as if we had never asked. Only an explicit challenge marker counts, so an edge that
 * is genuinely rate limiting us still reads as our fault rather than as a finding about them.
 */
export function isBotChallenge(fetched: Fetched): boolean {
  const mitigated = `${fetched.headers['x-vercel-mitigated'] ?? ''} ${fetched.headers['cf-mitigated'] ?? ''}`
  return /challenge/i.test(mitigated) || 'x-vercel-challenge-token' in fetched.headers
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
  // A 429 is our own traffic by this project's own published rule, so it is not an answer about
  // the vendor and must not win a vote about what the vendor answers. deepl.com replied 200, 429,
  // 429 and the majority made it a measured refusal, which then drove four of its checks to
  // unmeasured and handed it a "cleared every barrier" label it had not earned. Only when every
  // try is a 429 does the limit become the finding, and that case is handled by the caller.
  const answered = attempts.filter((a) => a.status !== 429 || isBotChallenge(a))
  const voting = answered.length > 0 ? answered : attempts
  const counts = new Map<number, number>()
  for (const status of voting.map((a) => a.status)) counts.set(status, (counts.get(status) ?? 0) + 1)
  const [majority] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  const representative = voting.find((a) => a.status === majority) ?? attempts[0]
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
