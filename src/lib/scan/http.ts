import { assertPublicHost, BlockedTargetError } from './guard'

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

const TIMEOUT_MS = 15_000
const MAX_BYTES = 400_000

export type Fetched = {
  url: string
  status: number
  ok: boolean
  body: string
  headers: Record<string, string>
  truncated: boolean
  error?: string
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

export async function fetchUrl(
  url: string,
  { accept = '*/*', ua = BROWSER_UA, method = 'GET' }: { accept?: string; ua?: string; method?: 'GET' | 'HEAD' } = {},
): Promise<Fetched> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
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
      await assertPublicHost(target.hostname)

      const response = await fetch(current, {
        method,
        headers: { 'user-agent': ua, accept },
        redirect: 'manual',
        signal: controller.signal,
      })

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
    return empty(url, error instanceof Error ? `${error.name}: ${error.message}` : String(error))
  } finally {
    clearTimeout(timer)
  }
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
  return { text: new TextDecoder('utf-8').decode(joined), truncated }
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
    attempts.push(await fetchUrl(url, options))
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
