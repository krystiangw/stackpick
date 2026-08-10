import { CATEGORIES, type Category } from './categories'
import { publishedCorpus } from './published'
import type { Report } from './store'

/**
 * The question an agent actually has, answered from the corpus: it needs to solve something, and
 * it does not want to spend four sessions discovering that three providers stop at a signup form.
 *
 * Deliberately an elimination service and not a recommendation. We do not know that a vendor is
 * the right choice for a job, and saying so would be selling a judgement we never measured while
 * we also sell those vendors the fix. What we do know, per vendor and per date, is which stage an
 * unattended agent gets to, and that is the expensive thing to find out by trying.
 */
export type Reachability = {
  domain: string
  /** Where an unattended run stops, or null when nothing we measure stops it. */
  stopsAt: string | null
  /** Every barrier we measured, so the caller can weigh them rather than trust our ordering. */
  barriers: string[]
  measuredAt: string
  evidence: string
}

export type Lookup = {
  category: { id: string; label: string; jobToBeDone: string }
  /** How much of the category we hold. Never presented as the whole market. */
  measured: number
  clear: Reachability[]
  blocked: Reachability[]
  unknown: Reachability[]
}

/**
 * The three barriers, in the order an agent hits them. Each one is a check that already exists,
 * and the sentence is the one we would defend to the vendor.
 */
const BARRIERS = [
  { id: 'agent_entry_point', when: 'no door built for a machine', alternatives: ['oauth_dcr', 'mcp_present'] },
  { id: 'signup_reachable', when: 'the signup form is not in the served HTML' },
  { id: 'signup_no_captcha', when: 'a CAPTCHA sits in the signup HTML' },
  { id: 'programmatic_provisioning', when: 'no documented way to get a credential', partialCounts: true },
] as const

function reachabilityOf(report: Report): Reachability {
  const at = (id: string) => report.scorecard.checks.find((check) => check.id === id)
  const met = (id: string) => {
    const check = at(id)
    return check !== undefined && check.points === check.max
  }
  const known = (id: string) => {
    const check = at(id)
    return check !== undefined && !check.inconclusive && !check.notApplicable
  }

  const barriers: string[] = []
  let anyUnknown = false
  for (const barrier of BARRIERS) {
    const ids = [barrier.id, ...('alternatives' in barrier ? barrier.alternatives : [])]
    const passed =
      ids.some(met) || ('partialCounts' in barrier && (at(barrier.id)?.points ?? 0) >= 1)
    if (passed) continue
    if (!ids.some(known)) {
      anyUnknown = true
      continue
    }
    barriers.push(barrier.when)
  }

  return {
    domain: report.domain,
    stopsAt: barriers[0] ?? null,
    barriers,
    measuredAt: report.scannedAt.slice(0, 10),
    evidence: `/r/${report.id}`,
    // An unknown barrier is neither cleared nor failed, and a lookup that hid the difference
    // would be telling an agent to try a vendor we never got through to.
    ...(anyUnknown ? { unknown: true } : {}),
  } as Reachability & { unknown?: boolean }
}

/**
 * The words a caller uses for the problem, which are not the words we filed it under. Matching
 * bare tokens against the label sent eleven of twenty-seven plausible questions to the wrong
 * place: "let users sign in with Google" went to File upload because our storage line says "let
 * users", and "I want a Postgres database" went to Vector databases because "app" and "database"
 * both appear there. Two rules fix that class. Words that appear in half the entries carry no
 * information, and the terms a caller actually reaches for are not in our prose at all.
 */
const NO_INFORMATION = new Set([
  'the', 'and', 'for', 'you', 'your', 'with', 'without', 'that', 'this', 'from', 'into', 'over',
  'use', 'user', 'users', 'app', 'apps', 'add', 'need', 'want', 'let', 'make', 'get', 'put', 'run',
  'own', 'real', 'inside', 'people', 'customer', 'customers', 'product', 'service', 'data', 'api',
])

/** What a caller says, mapped to what we filed it under. Only terms our own prose does not carry. */
const VOCABULARY: Record<string, string[]> = {
  'file-storage': ['upload', 'file', 'files', 'image', 'images', 'photo', 'screenshot', 'attachment', 'cdn', 'bucket', 's3', 'media'],
  auth: ['login', 'log', 'signin', 'sign', 'sso', 'oauth', 'identity', 'password', 'session', 'google', 'saml'],
  'transactional-email': ['email', 'emails', 'mail', 'smtp', 'inbox', 'deliverability'],
  'product-analytics': ['analytics', 'track', 'tracking', 'funnel', 'retention', 'behaviour', 'behavior', 'events'],
  'vector-search': ['vector', 'embedding', 'embeddings', 'semantic', 'rag', 'retrieval', 'similarity'],
  payments: ['payment', 'payments', 'charge', 'billing', 'subscription', 'subscriptions', 'checkout', 'invoice', 'card', 'money', 'pay'],
  'error-monitoring': ['error', 'errors', 'exception', 'exceptions', 'crash', 'stacktrace', 'bug'],
  'feature-flags': ['flag', 'flags', 'toggle', 'rollout', 'experiment', 'experiments', 'ab'],
  search: ['search', 'searching', 'index', 'autocomplete', 'typeahead', 'facet'],
  // Not "call" or "calls": a video call is not telephony and an API call is neither.
  communications: ['sms', 'voice', 'whatsapp', 'phone', 'telephony', 'messaging'],
  // Not "editor": somebody asking for an editor wants the component, and a CMS is asked for by name.
  'headless-cms': ['cms', 'content', 'blog', 'article', 'articles', 'page', 'pages'],
  'background-jobs': ['job', 'jobs', 'queue', 'worker', 'workers', 'cron', 'workflow', 'workflows', 'async', 'background'],
  'llm-infrastructure': ['llm', 'model', 'models', 'inference', 'gpu', 'prompt', 'completion', 'openai'],
  video: ['video', 'videos', 'stream', 'streaming', 'encode', 'transcode', 'player', 'playback'],
  'browser-infrastructure': ['scrape', 'scraping', 'crawl', 'crawler', 'headless', 'browser', 'puppeteer', 'playwright', 'proxy'],
  notifications: ['notification', 'notifications', 'notify', 'push', 'slack', 'alerting', 'webhook'],
  scheduling: ['calendar', 'schedule', 'scheduling', 'booking', 'book', 'meeting', 'appointment', 'availability'],
  'maps-geo': ['map', 'maps', 'geocode', 'geocoding', 'address', 'coordinates', 'location', 'geo', 'routing'],
  databases: ['database', 'postgres', 'postgresql', 'mysql', 'sql', 'sqlite', 'db'],
  observability: ['observability', 'logs', 'logging', 'metrics', 'trace', 'tracing', 'monitor', 'monitoring', 'uptime', 'apm'],
  'documents-signature': ['document', 'documents', 'signature', 'sign', 'signing', 'pdf', 'contract', 'esign'],
  commerce: ['commerce', 'ecommerce', 'shop', 'store', 'cart', 'catalog', 'storefront'],
  localization: ['translate', 'translation', 'localization', 'localisation', 'i18n', 'language', 'languages', 'locale'],
  'rich-text-editors': ['wysiwyg', 'richtext', 'editor', 'formatting', 'markdown'],
}

/**
 * Two words together mean something neither means alone, and single tokens tied on exactly the
 * questions where that is true: "semantic search" scored the same for search and vector databases,
 * "video call" the same for video and telephony. A phrase is checked against the whole question,
 * so it outranks any token.
 */
const PHRASES: [RegExp, string][] = [
  [/\bsemantic search\b/, 'vector-search'],
  [/\bvector search\b/, 'vector-search'],
  [/\bfull[- ]text search\b/, 'search'],
  [/\bvideo call/, 'video'],
  [/\brich text\b/, 'rich-text-editors'],
  [/\btext editor\b/, 'rich-text-editors'],
  // Only when nothing else in the question is louder: "send emails when they sign up" is a
  // question about email that happens to mention signing up.
  [/\bsign in with\b|\bsingle sign[- ]?on\b|\blog in\b/, 'auth'],
  [/\be[- ]?sign|\bsign a (?:document|contract)\b/, 'documents-signature'],
]

export function categoryForJob(job: string): Category | null {
  const asked = job.toLowerCase()
  const phrase = PHRASES.find(([pattern]) => pattern.test(asked))
  if (phrase) return CATEGORIES.find((category) => category.id === phrase[1]) ?? null

  const words = job
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !NO_INFORMATION.has(word))
  if (words.length === 0) return null
  const scored = CATEGORIES.map((category) => {
    const vocabulary = VOCABULARY[category.id] ?? []
    // A term from the caller's vocabulary is worth more than an incidental word in our own prose,
    // which is what let a single shared word decide a category.
    const strong = words.filter((word) => vocabulary.includes(word)).length * 10
    const haystack = `${category.id} ${category.label} ${category.jobToBeDone}`.toLowerCase()
    const weak = words.filter((word) => !vocabulary.includes(word) && haystack.includes(word)).length
    return { category, score: strong + weak }
  }).sort((a, b) => b.score - a.score)
  // A tie between two categories is a question we cannot route, and guessing would send a caller
  // a list of the wrong vendors with our name on it.
  if (scored[0].score === 0 || scored[0].score === scored[1]?.score) return null
  return scored[0].category
}

export async function lookup(job: string): Promise<Lookup | null> {
  const category = categoryForJob(job)
  if (!category) return null

  const reports = new Map((await publishedCorpus()).reports.map((report) => [report.domain, report]))
  const held = category.domains
    .map((domain) => reports.get(domain))
    .filter((report): report is Report => report !== undefined)
    .map(reachabilityOf) as (Reachability & { unknown?: boolean })[]

  return {
    category: { id: category.id, label: category.label, jobToBeDone: category.jobToBeDone },
    measured: held.length,
    clear: held.filter((entry) => entry.barriers.length === 0 && !entry.unknown),
    blocked: held.filter((entry) => entry.barriers.length > 0),
    unknown: held.filter((entry) => entry.barriers.length === 0 && entry.unknown),
  }
}
