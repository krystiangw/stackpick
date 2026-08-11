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
  'use', 'user', 'app', 'add', 'need', 'want', 'let', 'make', 'get', 'put', 'run',
  'own', 'real', 'inside', 'people', 'customer', 'product', 'service', 'data', 'api', 'platform',
  'something', 'anything', 'best', 'good', 'provider', 'team', 'company', 'site', 'website',
])

/**
 * A caller writes "uploaded files" and we filed the term as "upload" and "file". Two of the
 * eleven misroutes in the tenth pass were nothing but that: "where do I store uploaded files"
 * tied commerce against file storage because neither inflected word reached its own vocabulary.
 * Both sides of every comparison go through here, so the rule is symmetric.
 */
function stem(word: string): string {
  if (/(?:s|x|z|ch|sh)es$/.test(word) && word.length > 4) return word.slice(0, -2)
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) return word.slice(0, -1)
  if (word.endsWith('ing') && word.length > 6) return word.slice(0, -3)
  if (word.endsWith('ed') && word.length > 5) return word.slice(0, -2)
  return word
}

/** "geocoding" stems to "geocod" and we filed "geocode". Both stems, either side missing its e. */
function sameTerm(word: string, term: string): boolean {
  return word === term || `${word}e` === term || word === `${term}e`
}

/** What a caller says, mapped to what we filed it under. Only terms our own prose does not carry. */
const VOCABULARY: Record<string, string[]> = {
  'file-storage': ['upload', 'file', 'image', 'photo', 'avatar', 'attachment', 'cdn', 'bucket', 's3', 'media'],
  auth: ['login', 'signin', 'sign', 'authentication', 'authenticate', 'sso', 'oauth', 'identity', 'password', 'google', 'saml'],
  'transactional-email': ['email', 'mail', 'smtp', 'inbox', 'deliverability'],
  'product-analytics': ['analytics', 'track', 'funnel', 'retention', 'behaviour', 'behavior', 'event', 'click', 'replay', 'conversion', 'cohort'],
  'vector-search': ['vector', 'embedding', 'semantic', 'rag', 'retrieval', 'similarity', 'similar', 'meaning'],
  payments: ['payment', 'charge', 'billing', 'subscription', 'checkout', 'invoice', 'card', 'money', 'pay'],
  'error-monitoring': ['error', 'exception', 'crash', 'stacktrace', 'bug'],
  'feature-flags': ['flag', 'toggle', 'rollout', 'experiment', 'experimentation'],
  search: ['search', 'index', 'autocomplete', 'typeahead', 'facet'],
  // Not "call" or "calls": a video call is not telephony and an API call is neither.
  // Not "otp": the vendor who sends one and the vendor who verifies one are two categories, so a
  // caller who writes nothing but that word has asked something we cannot route.
  communications: ['sms', 'voice', 'whatsapp', 'phone', 'telephony', 'messaging', 'passcode'],
  // Not "editor": somebody asking for an editor wants the component, and a CMS is asked for by name.
  // Not "page" either: a status page, a pricing page and a contact page are three other categories,
  // and the word tied all of them against the one the caller meant.
  'headless-cms': ['cms', 'content', 'blog', 'article', 'homepage', 'writer', 'copywriter'],
  'background-jobs': ['job', 'queue', 'worker', 'cron', 'workflow', 'async', 'background', 'nightly', 'batch', 'durable'],
  'llm-infrastructure': ['llm', 'model', 'inference', 'gpu', 'prompt', 'completion', 'openai', 'transcription', 'transcribe'],
  video: ['video', 'stream', 'livestream', 'webinar', 'broadcast', 'encode', 'transcode', 'player', 'playback'],
  'browser-infrastructure': ['scrape', 'crawl', 'crawler', 'headless', 'browser', 'puppeteer', 'playwright', 'proxy', 'screenshot'],
  // Not "alerting": an alert about an exception is error monitoring and an alert about latency is
  // observability, so the word decided nothing and tied all three.
  notifications: ['notification', 'notify', 'push', 'slack', 'webhook', 'bell', 'unread'],
  scheduling: ['calendar', 'schedule', 'booking', 'book', 'meeting', 'appointment', 'availability'],
  'maps-geo': ['map', 'geocode', 'address', 'coordinate', 'location', 'geo', 'route', 'routing'],
  databases: ['database', 'postgres', 'postgresql', 'mysql', 'sql', 'sqlite', 'db'],
  observability: ['observability', 'log', 'metric', 'trace', 'tracing', 'monitor', 'uptime', 'apm', 'latency', 'dashboard', 'p99', 'slow'],
  'documents-signature': ['document', 'signature', 'sign', 'signing', 'pdf', 'contract', 'esign', 'nda'],
  // Not "store": in nine questions out of ten it is the verb, and it sent both "store user
  // avatars" and "where do I store uploaded files" to commerce. Not "shop" either: "our shops" is
  // a chain of buildings, and it tied against the map the caller wanted pins on.
  commerce: ['commerce', 'ecommerce', 'cart', 'catalog', 'storefront'],
  localization: ['translate', 'translation', 'localization', 'localisation', 'i18n', 'language', 'locale'],
  'rich-text-editors': ['wysiwyg', 'richtext', 'editor', 'formatting', 'markdown'],
  // Not "domain": it is the word for a scope, a model boundary and an email suffix long before
  // it is the thing you buy. A caller shopping for one says registrar, or names the record type.
  'domains-dns': ['registrar', 'nameserver', 'whois', 'tld', 'cname', 'subdomain', 'icann', 'zone'],
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
  [/\bvector (?:database|db|store)\b/, 'vector-search'],
  [/\bfull[- ]text search\b/, 'search'],
  [/\bvideo call/, 'video'],
  [/\brich text\b/, 'rich-text-editors'],
  [/\btext editor\b/, 'rich-text-editors'],
  // The gerund of a rule we already had. prosemirror.net describes itself as an "in-browser
  // structured text editing component" and routed to browser infrastructure on the word browser.
  [/\btext editing\b/, 'rich-text-editors'],
  // "A/B" tokenises to two single letters and is dropped by the length filter, so the question
  // was decided by "checkout" and went to payments.
  [/\ba\/b\b/, 'feature-flags'],
  [/\broll(?:ing)? out\b/, 'feature-flags'],
  [/\bonline store\b/, 'commerce'],
  // The channel decides: a passcode is auth, a passcode by text is the thing that carries it.
  [/\bby (?:text|sms)\b/, 'communications'],
  [/\bregister a domain\b|\bbuy a domain\b|\bdomain name\b|\bdns record/, 'domains-dns'],
  // The plural and the bulk case, which the singular patterns missed: a caller buying one domain
  // does it in a browser, and the one who writes to us is buying forty.
  [/\b(?:buy|buying|register|registering|purchase|purchasing)\b[^.]{0,24}\bdomains\b/, 'domains-dns'],
  // Only when nothing else in the question is louder: "send emails when they sign up" is a
  // question about email that happens to mention signing up.
  [/\bsign in with\b|\bsingle sign[- ]?on\b|\blog in\b/, 'auth'],
  [/\be[- ]?sign|\bsign a (?:document|contract)\b/, 'documents-signature'],
]

export function categoryForJob(job: string): Category | null {
  const asked = job.toLowerCase().replace(/\bsign(?:s|ed|ing)? ?up\b/g, ' ')
  const phrase = PHRASES.find(([pattern]) => pattern.test(asked))
  if (phrase) return CATEGORIES.find((category) => category.id === phrase[1]) ?? null

  // Short words are noise unless somebody filed them: the length rule dropped "s3" and left
  // "object storage s3 compatible" with nothing but our own prose to go on, which is a null.
  const filed = new Set(Object.values(VOCABULARY).flat().map(stem))
  const words = asked
    .split(/[^a-z0-9]+/)
    .map(stem)
    .filter((word) => (word.length > 2 || filed.has(word)) && !NO_INFORMATION.has(word))
  if (words.length === 0) return null
  const scored = CATEGORIES.map((category) => {
    const vocabulary = (VOCABULARY[category.id] ?? []).map(stem)
    // A term from the caller's vocabulary is worth more than an incidental word in our own prose,
    // which is what let a single shared word decide a category.
    const strong = words.filter((word) => vocabulary.some((term) => sameTerm(word, term))).length * 10
    const prose = proseWords(category)
    const weak = words.filter(
      (word) => !vocabulary.some((term) => sameTerm(word, term)) && prose.has(word),
    ).length
    return { category, strong, score: strong + weak }
  }).sort((a, b) => b.score - a.score)
  // Our own prose is not the caller's vocabulary, and on its own it is noise: "experimentation
  // platform" went to commerce because our commerce line ends in "platforms", and "something for
  // my app" went there because the same line says "sell something". A prose hit now only breaks a
  // tie between categories the caller's own words already reached.
  if (scored[0].strong === 0) return null
  // A tie between two categories is a question we cannot route, and guessing would send a caller
  // a list of the wrong vendors with our name on it.
  if (scored[0].score === scored[1]?.score) return null
  return scored[0].category
}

/** Words of ours that name exactly one category. A word we reuse across categories decides nothing. */
let proseIndex: Map<string, Set<string>> | null = null
function proseWords(category: Category): Set<string> {
  if (!proseIndex) {
    const seen = new Map<string, string[]>()
    for (const entry of CATEGORIES) {
      const words = `${entry.id} ${entry.label} ${entry.jobToBeDone}`.toLowerCase().split(/[^a-z0-9]+/)
      for (const word of new Set(words.map(stem))) {
        seen.set(word, [...(seen.get(word) ?? []), entry.id])
      }
    }
    proseIndex = new Map(CATEGORIES.map((entry) => [entry.id, new Set<string>()]))
    for (const [word, owners] of seen) {
      if (owners.length === 1) proseIndex.get(owners[0])!.add(word)
    }
  }
  return proseIndex.get(category.id) ?? new Set()
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
