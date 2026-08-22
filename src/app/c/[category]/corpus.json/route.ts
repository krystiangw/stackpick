import { NextResponse } from 'next/server'
import { CATEGORIES } from '@/lib/categories'
import { buildCorpus } from '@/lib/corpus'
import { publicBaseUrl } from '@/lib/export'
import { lookupCategoryById } from '@/lib/lookup'

export const dynamic = 'force-dynamic'

/**
 * A small, citable slice for the question an agent has. The full corpus remains canonical; this
 * endpoint saves a caller from downloading every category and, unlike a prose recommendation,
 * carries the dated evidence and the exact barriers we measured.
 */
export async function GET(request: Request, { params }: { params: Promise<{ category: string }> }) {
  const { category: id } = await params
  const category = CATEGORIES.find((candidate) => candidate.id === id)
  if (!category) return NextResponse.json({ error: 'Unknown category.' }, { status: 404 })

  const baseUrl = publicBaseUrl(request)
  const [corpus, providers] = await Promise.all([
    buildCorpus(baseUrl, new Date().toISOString()),
    lookupCategoryById(id),
  ])
  if (!corpus || !providers) return NextResponse.json({ error: 'No corpus yet.' }, { status: 404 })

  const domains = new Set(category.domains)
  const rows = corpus.rows.filter((row) => domains.has(row.domain))
  const checks = corpus.checks.map((check) => {
    const tally = { pass: 0, partial: 0, fail: 0, unmeasured: 0, notApplicable: 0, measured: 0 }
    for (const row of rows) {
      const verdict = row.checks.find((candidate) => candidate.id === check.id)?.verdict
      if (!verdict) continue
      tally[verdict] += 1
      if (verdict === 'pass' || verdict === 'partial' || verdict === 'fail') tally.measured += 1
    }
    return { ...check, tally }
  })
  const withAbsoluteEvidence = (entries: typeof providers.clear) =>
    entries.map((entry) => ({ ...entry, evidence: `${baseUrl}${entry.evidence}` }))
  return NextResponse.json(
    {
      schemaVersion: '1.0',
      category: {
        id: category.id,
        label: category.label,
        jobToBeDone: category.jobToBeDone,
        page: `${baseUrl}/c/${category.id}`,
      },
      generatedAt: corpus.generatedAt,
      formulaVersion: corpus.formulaVersion,
      measured: providers.measured,
      inCategory: providers.inCategory,
      interpretation:
        'This is not a product recommendation. clear means no barrier we test stopped an unattended agent; blocked names where it stopped; unknown was not measurable from our vantage.',
      providers: {
        clear: withAbsoluteEvidence(providers.clear),
        blocked: withAbsoluteEvidence(providers.blocked),
        unknown: withAbsoluteEvidence(providers.unknown),
      },
      checks,
      rows,
      methodology: corpus.methodology,
      terms: corpus.terms,
      fullCorpus: `${baseUrl}/corpus.json`,
      notes: corpus.notes,
    },
    {
      headers: {
        'cache-control': 'public, max-age=3600',
        'access-control-allow-origin': '*',
      },
    },
  )
}
