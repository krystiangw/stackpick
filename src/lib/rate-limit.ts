const WINDOW_MS = 60 * 60 * 1000
const MAX_PER_WINDOW = 10

const hits = new Map<string, number[]>()

/**
 * In-memory on purpose: serverless instances reset this, which caps a determined
 * abuser at "a bit more than 10 per hour" rather than stopping them. That is the right
 * trade for v0, where a scan costs bandwidth and nothing else.
 */
export function checkRateLimit(key: string): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((at) => now - at < WINDOW_MS)

  if (recent.length >= MAX_PER_WINDOW) {
    const oldest = Math.min(...recent)
    hits.set(key, recent)
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil((WINDOW_MS - (now - oldest)) / 1000) }
  }

  recent.push(now)
  hits.set(key, recent)
  return { allowed: true, remaining: MAX_PER_WINDOW - recent.length, retryAfterSeconds: 0 }
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown'
}
