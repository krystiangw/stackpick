import { NextResponse } from 'next/server'
import { buildCorpus } from '@/lib/corpus'
import { publicBaseUrl } from '@/lib/export'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const corpus = await buildCorpus(publicBaseUrl(request), new Date().toISOString())
  if (!corpus) return NextResponse.json({ error: 'No corpus yet.' }, { status: 404 })

  return NextResponse.json(corpus, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=3600',
      'access-control-allow-origin': '*',
    },
  })
}
