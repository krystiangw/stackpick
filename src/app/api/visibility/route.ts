import { NextResponse } from 'next/server'
import { checkRateLimit, clientKey, recordUse } from '@/lib/rate-limit'
import { configuredVisibilityProviders, runVisibilityAudit } from '@/lib/visibility-audit'

export const maxDuration = 60

const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : ''

export async function GET() {
  return NextResponse.json({ beta: true, providers: configuredVisibilityProviders() })
}

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch { return NextResponse.json({ error: 'Send JSON with brand, domain and category.' }, { status: 400 }) }
  const brand = clean(body.brand, 80)
  const domain = clean(body.domain, 253).toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '')
  const category = clean(body.category, 100)
  if (!brand || !domain || !category || !/^[a-z0-9.-]+$/.test(domain) || !/^[\p{L}\p{N} &+.,/'()-]+$/u.test(category)) return NextResponse.json({ error: 'Use a brand, a bare domain, and a short product category.' }, { status: 400 })
  if (configuredVisibilityProviders().length === 0) return NextResponse.json({ error: 'The beta is installed, but no model API is configured yet.' }, { status: 503 })
  const key = `visibility:${clientKey(request)}`
  const limit = checkRateLimit(key, 1)
  if (!limit.allowed) return NextResponse.json({ error: 'One visibility audit per hour while this is in beta.', retryAfterSeconds: limit.retryAfterSeconds }, { status: 429, headers: { 'retry-after': String(limit.retryAfterSeconds) } })
  recordUse(key)
  const audit = await runVisibilityAudit({ brand, domain, category })
  return NextResponse.json(audit)
}
