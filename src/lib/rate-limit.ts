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
 * Charged when a scan is admitted, before the work runs. Charging afterwards meant a domain
 * that never resolved cost the caller nothing and cost us a full discovery pass every time.
 * Input rejected before that point is still free, so a typo does not lock anyone out.
 */
export function recordUse(key: string): void {
  const now = Date.now()
  hits.set(key, [...recent(key, now), now])
}

/**
 * The LAST entry in X-Forwarded-For, not the first. Heroku's router appends the real client
 * address to whatever the client sent, so reading the first entry read a value the caller
 * controls: measured on production, ten requests as 203.0.113.9 hit the limit and changing
 * one digit reset it.
 */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const hops = forwarded.split(',').map((hop) => hop.trim()).filter(Boolean)
    if (hops.length > 0) return hops[hops.length - 1]
  }
  return request.headers.get('x-real-ip') || 'unknown'
}
