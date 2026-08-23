import { NextResponse } from 'next/server'
import { checkRateLimit, clientKey, recordUse } from '@/lib/rate-limit'
import { createVisibilityJob, getVisibilityJob, visibilityQueueStateFor, type VisibilityDepth } from '@/lib/visibility-job'

const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : ''

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id') ?? ''
  if (!/^[a-f0-9]{32}$/.test(id)) return NextResponse.json({ beta: true, mode: 'queued-subscription-worker' })
  const job = await getVisibilityJob(id)
  if (!job) return NextResponse.json({ error: 'Audit not found.' }, { status: 404 })
  // Only while the visitor is still waiting: a finished audit says nothing about who is on shift.
  const waiting = job.status === 'queued' || job.status === 'running'
  return NextResponse.json({ ...job, queue: waiting ? await visibilityQueueStateFor(job) : null })
}

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch { return NextResponse.json({ error: 'Send JSON with brand, domain and category.' }, { status: 400 }) }
  const brand = clean(body.brand, 80)
  const domain = clean(body.domain, 253).toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '')
  const category = clean(body.category, 100)
  const depth: VisibilityDepth = body.depth === 'full' ? 'full' : 'quick'
  if (!brand || !domain || !category || !/^[a-z0-9.-]+$/.test(domain) || !/^[\p{L}\p{N} &+.,/'()-]+$/u.test(category)) return NextResponse.json({ error: 'Use a brand, a bare domain, and a short product category.' }, { status: 400 })
  const key = `visibility:${clientKey(request)}`
  const limit = checkRateLimit(key, 3)
  if (!limit.allowed) return NextResponse.json({ error: 'Three queued audits per hour while this is in beta.', retryAfterSeconds: limit.retryAfterSeconds }, { status: 429, headers: { 'retry-after': String(limit.retryAfterSeconds) } })
  recordUse(key)
  const job = await createVisibilityJob({ brand, domain, category, depth })
  return NextResponse.json({ ...job, queue: await visibilityQueueStateFor(job) }, { status: 202 })
}
