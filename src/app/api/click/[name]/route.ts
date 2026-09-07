import type { NextRequest } from 'next/server'
import { clickPath, isClick } from '@/lib/clicks'
import { recordVisit } from '@/lib/visits'

export const dynamic = 'force-dynamic'

/** A beacon from a button, counted the way a page render is: a day, a name, a client family. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  if (!isClick(name)) return new Response(null, { status: 404 })
  recordVisit(clickPath(name), request.headers.get('user-agent'))
  return new Response(null, { status: 204 })
}
