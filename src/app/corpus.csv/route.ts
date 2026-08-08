import { NextResponse } from 'next/server'
import { buildCorpus, corpusToCsv } from '@/lib/corpus'
import { publicBaseUrl } from '@/lib/export'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const corpus = await buildCorpus(publicBaseUrl(request), new Date().toISOString())
  if (!corpus) return new NextResponse('No corpus yet.\n', { status: 404 })

  return new NextResponse(corpusToCsv(corpus), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="stackpick-corpus-v${corpus.formulaVersion}.csv"`,
      'cache-control': 'public, max-age=3600',
      'access-control-allow-origin': '*',
    },
  })
}
