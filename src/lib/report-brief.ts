/** A review describes product fit, never customer demand or an executed integration. */
export type BriefReview = {
  domain: string
  category: string
  question: string
  status: 'documented' | 'partial' | 'mismatch'
  reviewedAt: string
  rationale: string
  nextStep: string
  sources: { url: string; note: string }[]
}

export const BRIEF_LABELS = {
  documented: 'Use case supported by product documentation',
  partial: 'Question covers only part of the product',
  mismatch: 'Question does not fit the product',
} as const

export const UNREVIEWED_BRIEF = 'Question fit has not been reviewed. Confirm that this task represents a use case you sell before interpreting the mention count.'
export const BRIEF_LIMIT = 'Product fit is based on public documentation; buyer demand and the cause of omissions were not measured.'
export const SCAN_ACTION_LIMIT = 'These actions address scan findings. Point gains do not predict more mentions or a completed integration. Validate the relevant task after making a change.'

const sameQuestion = (a: string, b: string) => a.trim().replace(/\s+/g, ' ') === b.trim().replace(/\s+/g, ' ')

/** Never pool answers to different questions under one mention count. */
export function reportQuestion(cells: { question: string }[]): string | null {
  if (cells.length === 0) return null
  const question = cells[0].question
  if (!question.trim() || cells.some((cell) => !sameQuestion(cell.question, question))) {
    throw new Error('Report batches contain different or empty questions. Select one question before producing the report.')
  }
  return question
}

/** JSON files are operator input; TypeScript types alone cannot validate them. */
export function readBriefReview(value: unknown, expected: { domain: string; category: string; question: string | null }): BriefReview {
  if (!value || typeof value !== 'object') throw new Error('Brief review must be a JSON object.')
  const input = value as Record<string, unknown>
  for (const key of ['domain', 'category', 'question', 'reviewedAt', 'rationale', 'nextStep']) {
    if (typeof input[key] !== 'string' || !input[key].trim()) throw new Error(`Brief review needs ${key}.`)
  }
  if (input.status !== 'documented' && input.status !== 'partial' && input.status !== 'mismatch') {
    throw new Error('Brief review status must be documented, partial or mismatch.')
  }
  if (input.domain !== expected.domain || input.category !== expected.category || !expected.question || !sameQuestion(input.question as string, expected.question)) {
    throw new Error('Brief review belongs to a different domain, category or question. Review the actual report brief.')
  }
  const date = input.reviewedAt as string
  const timestamp = Date.parse(date)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date || date > new Date().toISOString().slice(0, 10)) {
    throw new Error('Brief review needs a valid review date, not a future date.')
  }
  if (!Array.isArray(input.sources) || input.sources.length === 0) throw new Error('Brief review needs at least one product source.')
  const sources = input.sources.map((source: unknown) => {
    if (!source || typeof source !== 'object') throw new Error('Invalid brief source.')
    const entry = source as Record<string, unknown>
    if (typeof entry.url !== 'string' || typeof entry.note !== 'string' || !entry.note.trim()) throw new Error('Each brief source needs a URL and evidence note.')
    const url = new URL(entry.url)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Brief sources must use public HTTP URLs without credentials.')
    return { url: entry.url, note: entry.note }
  })
  return {
    domain: input.domain as string, category: input.category as string, question: input.question as string,
    reviewedAt: date, status: input.status, rationale: input.rationale as string, nextStep: input.nextStep as string, sources,
  }
}

export function requirePublishableBrief(review: BriefReview | null): void {
  if (review?.status !== 'documented') {
    throw new Error('Delivery needs a documented product fit review (--brief-review FILE). Partial, mismatched and unreviewed briefs can be saved as local drafts only.')
  }
}

/** Follow-up experiments, not claims that these checks have caused a lost sale. */
export function verifyScanAction(checkId: string): string {
  switch (checkId) {
    case 'agent_entry_point':
    case 'programmatic_provisioning':
      return 'In an authorized test account, ask an agent to follow the documented path to a limited test key and one successful API call. Record any required human step.'
    case 'oauth_dcr':
      return 'Verify the supported client authentication flow with a test client, then test authorization and the first API call separately. Client registration alone does not create a customer account.'
    case 'mcp_present':
      return 'Connect an agent to the declared MCP endpoint and exercise one agreed read-only tool. Record authentication and permission requirements.'
    case 'signup_reachable':
    case 'signup_no_captcha':
      return 'With permission, attempt test-account creation using the supported agent environment. Record whether the agent completes it or hands a step to a person.'
    case 'machine_readable_api':
    case 'typed_package':
      return 'Give an agent the published docs and a limited test credential. Check that it builds and executes one API call using the documented interface.'
    case 'price_in_snippet':
    case 'self_serve':
      return 'Ask an agent to identify the applicable price, limits and entry requirements from the updated page. Compare its answer with the actual offer.'
    default:
      return 'Repeat the affected HTTP check, then ask an agent to find and read the relevant documentation. Record the retrieved source and any access failure.'
  }
}
