const WINDOW_MS = 60 * 60 * 1000
const MAX_PER_WINDOW = 10

const hits = new Map<string, number[]>()

function recent(key: string, now: number): number[] {
  return (hits.get(key) ?? []).filter((at) => now - at < WINDOW_MS)
}

/**
 * In-memory on purpose: dynos reset this, which caps a determined abuser at "a bit more than
 * ten per hour" rather than stopping them. That is the right trade while a scan costs
 * bandwidth and nothing else.
 */
export function checkRateLimit(
  key: string,
  max: number = MAX_PER_WINDOW,
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now()
  const window = recent(key, now)
  hits.set(key, window)

  if (window.length >= max) {
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil((WINDOW_MS - (now - Math.min(...window))) / 1000) }
  }
  return { allowed: true, remaining: max - window.length, retryAfterSeconds: 0 }
}

/**
 * Charged only for work actually done. Counting rejected input too would mean ten typos
 * lock someone out for an hour, which punishes the wrong person.
 */
export function recordUse(key: string): void {
  const now = Date.now()
  hits.set(key, [...recent(key, now), now])
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown'
}
