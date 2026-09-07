/** Editorial findings are bound to one scan and one buyer question. */
export type RecommendationReview = {
  domain: string
  question: string
  scanFingerprint: string
  reviewedAt: string
  summary: string
  items: {
    title: string
    checkIds: string[]
    disposition: 'verify' | 'change' | 'no-change'
    finding: string
    nextStep: string
    validation: string
    sources: { url: string; note: string }[]
  }[]
}

export const RECOMMENDATION_LABELS = {
  verify: 'Verify before changing',
  change: 'Recommended change',
  'no-change': 'No change justified by this finding',
} as const

export const UNREVIEWED_RECOMMENDATIONS = 'Recommendations have not been reviewed against the product documentation. This report is a draft; scan points alone do not justify a product change.'
export const RECOMMENDATION_LIMIT = 'These findings combine the recorded scan with a documentation review. The proposed integration tests have not been executed. The scan score is retained as recorded; this review does not rescore it.'

export function readRecommendationReview(value: unknown, expected: {
  domain: string; question: string | null; scanFingerprint: string; checkIds: string[]; requiredCheckIds: string[]
}): RecommendationReview {
  if (!value || typeof value !== 'object') throw new Error('Recommendation review must be an object.')
  const input = value as Record<string, unknown>
  const nonempty = (entry: unknown): entry is string => typeof entry === 'string' && entry.trim().length > 0
  if (input.domain !== expected.domain || input.question !== expected.question || input.scanFingerprint !== expected.scanFingerprint) {
    throw new Error('Recommendation review does not match this domain, question and scan. Review the current evidence.')
  }
  if (!nonempty(input.reviewedAt) || !/^\d{4}-\d{2}-\d{2}$/.test(input.reviewedAt)
    || !Number.isFinite(Date.parse(input.reviewedAt))
    || new Date(input.reviewedAt).toISOString().slice(0, 10) !== input.reviewedAt
    || input.reviewedAt > new Date().toISOString().slice(0, 10)) throw new Error('Invalid recommendation review date.')
  if (!nonempty(input.summary) || !Array.isArray(input.items) || input.items.length === 0) throw new Error('Recommendation review needs a summary and items.')
  const covered = new Set<string>()
  const items = input.items.map((value: unknown) => {
    if (!value || typeof value !== 'object') throw new Error('Invalid recommendation item.')
    const item = value as Record<string, unknown>
    for (const field of ['title', 'finding', 'nextStep', 'validation']) if (!nonempty(item[field])) throw new Error(`Recommendation needs ${field}.`)
    if (!['verify', 'change', 'no-change'].includes(item.disposition as string)) throw new Error('Invalid recommendation disposition.')
    if (!Array.isArray(item.checkIds) || item.checkIds.length === 0) throw new Error('Recommendation needs check IDs.')
    const checkIds = item.checkIds.map((id: unknown) => {
      if (!nonempty(id) || !expected.checkIds.includes(id) || covered.has(id)) throw new Error('Unknown or repeated recommendation check ID.')
      covered.add(id)
      return id
    })
    if (!Array.isArray(item.sources) || item.sources.length === 0) throw new Error('Recommendation needs sources.')
    const sources = item.sources.map((value: unknown) => {
      if (!value || typeof value !== 'object') throw new Error('Invalid recommendation source.')
      const source = value as Record<string, unknown>
      if (!nonempty(source.url) || !nonempty(source.note)) throw new Error('Recommendation source needs URL and note.')
      const url = new URL(source.url)
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Recommendation source must be a public HTTP URL.')
      return { url: source.url, note: source.note }
    })
    return {
      title: item.title as string, checkIds, disposition: item.disposition as RecommendationReview['items'][number]['disposition'],
      finding: item.finding as string, nextStep: item.nextStep as string, validation: item.validation as string, sources,
    }
  })
  if (expected.requiredCheckIds.some((id) => !covered.has(id))) throw new Error('Recommendation review leaves a failed or unmeasured check unreviewed.')
  return { domain: input.domain as string, question: input.question as string, scanFingerprint: input.scanFingerprint as string, reviewedAt: input.reviewedAt, summary: input.summary, items }
}

export function requireRecommendationReview(review: RecommendationReview | null): void {
  if (!review) throw new Error('Delivery needs a recommendation review (--recommendation-review FILE).')
}
