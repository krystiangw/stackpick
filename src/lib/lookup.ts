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
  /**
   * How many vendors this category holds against how many we could answer with. They differ while
   * a reseed is part way through, and the tool said "which is what we hold" about the smaller
   * number, which is a false sentence told to an agent that cannot check it.
   */
  inCategory: number
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

/**
 * Which walls a card names, and whether anything in the way of naming them went unread. Pure and
 * exported so a rule can hold it to a case: the sentences here are published about named companies.
 */
export function barriersFrom(checks: { id: string; points: number; max: number; inconclusive?: boolean; notApplicable?: boolean }[]): { barriers: string[]; unknown: boolean } {
  const at = (id: string) => checks.find((check) => check.id === id)
  const met = (id: string) => {
    const check = at(id)
    return check !== undefined && check.points === check.max
  }
  const known = (id: string) => {
    const check = at(id)
    return check !== undefined && !check.inconclusive && !check.notApplicable
  }
  // Unmeasurable is not the same as absent. `oauth_dcr` marked not applicable is a judgement we made
  // on purpose (a library has no server to register a client against), so that door really is not
  // there. Inconclusive means the page did not answer us, and a door we could not look at is not a
  // door we can say is missing.
  const unreadable = (id: string) => {
    const check = at(id)
    return check === undefined || check.inconclusive === true
  }
  const measuredShut = (id: string) => known(id) && !met(id)

  const barriers: string[] = []
  let unknown = false
  for (const barrier of BARRIERS) {
    const ids = [barrier.id, ...('alternatives' in barrier ? barrier.alternatives : [])] as string[]
    const passed = ids.some(met) || ('partialCounts' in barrier && (at(barrier.id)?.points ?? 0) >= 1)
    if (passed) continue
    // Every door in the group has to have been looked at. "No door built for a machine anywhere on
    // your domain" was published about thirteen named vendors whose entry-point namespace never
    // answered us: the sentence rested on the two alternatives instead of on the check it names.
    if (ids.some(unreadable) || !ids.some(measuredShut)) {
      unknown = true
      continue
    }
    barriers.push(barrier.when)
  }
  return { barriers, unknown }
}

function reachabilityOf(report: Report): Reachability {
  const { barriers, unknown } = barriersFrom(report.scorecard.checks)
  return {
    domain: report.domain,
    stopsAt: barriers[0] ?? null,
    barriers,
    measuredAt: report.scannedAt.slice(0, 10),
    evidence: `/r/${report.id}`,
    // An unknown barrier is neither cleared nor failed, and a lookup that hid the difference
    // would be telling an agent to try a vendor we never got through to.
    ...(unknown ? { unknown: true } : {}),
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
/**
 * Each rule used to return, so a plural was never also de-conjugated: "embeddings" became
 * "embedding" while the filed "embedding" became "embedd", and the two never met. Ten filed terms
 * were unreachable in the plural that way, including meetings, bookings and embeddings, and the
 * run reported them as questions nothing scored on rather than as a stemmer that cannot match
 * itself. Strip the plural first, then the tense.
 */
function stem(word: string): string {
  let out = word
  if (/(?:s|x|z|ch|sh)es$/.test(out) && out.length > 4) out = out.slice(0, -2)
  else if (out.endsWith('s') && !out.endsWith('ss') && out.length > 3) out = out.slice(0, -1)
  if (out.endsWith('ing') && out.length > 6) out = out.slice(0, -3)
  else if (out.endsWith('ed') && out.length > 5) out = out.slice(0, -2)
  return out
}

/**
 * "geocoding" stems to "geocod" and we filed "geocode", so a stem may be one e short of the term.
 * That flexibility is only earned by a word the stemmer actually shortened. A bare word gets an
 * exact match and nothing more: "local", in "the local disk", is one e away from the filed
 * "locale" and was scoring translation software ten points, tying it against file storage and
 * making the question unroutable.
 */
function sameTerm(stemmed: Stemmed, term: string): boolean {
  if (stemmed.word === term) return true
  if (!stemmed.inflected) return false
  return `${stemmed.word}e` === term || stemmed.word === `${term}e`
}

type Stemmed = { word: string; inflected: boolean }
const stemmed = (word: string): Stemmed => {
  const out = stem(word)
  return { word: out, inflected: out !== word }
}

/** What a caller says, mapped to what we filed it under. Only terms our own prose does not carry. */
const VOCABULARY: Record<string, string[]> = {
  'file-storage': ['upload', 'file', 'image', 'photo', 'avatar', 'attachment', 'cdn', 'bucket', 's3', 'media'],
  // Not "google": it names a company selling fifty products, and "the copy team works out of a
  // google sheet" scored authentication on it. A caller who means the login button says login,
  // sign in or oauth, all of which are still here. Removing it turned a wrong answer into a
  // silence and cost nothing on either set.
  auth: ['login', 'signin', 'sign', 'authentication', 'authenticate', 'sso', 'oauth', 'identity', 'password', 'saml'],
  'transactional-email': ['email', 'mail', 'smtp', 'inbox', 'deliverability'],
  'product-analytics': ['analytics', 'track', 'funnel', 'retention', 'behaviour', 'behavior', 'event', 'click', 'replay', 'conversion', 'cohort'],
  // Not "meaning": it stems to "mean", which is one of the commonest verbs in English, so
  // "a failover would mean real downtime" scored vector databases level with the postgres question
  // it was actually asking. "semantic" and the phrase rules carry the sense we wanted from it.
  'vector-search': ['vector', 'embedding', 'semantic', 'rag', 'retrieval', 'similarity', 'similar'],
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
  video: ['video', 'stream', 'livestream', 'webinar', 'broadcast', 'encode', 'transcode', 'player', 'play', 'playback'],
  // Not "headless": it modifies a CMS, a commerce platform and a browser, and "headless commerce"
  // tied against the category it names.
  // "chrome" is browser vocabulary in a question, whatever it means in our own prose about a
  // button's chrome. Held back since round 105 as a rule about the world rather than about the
  // questions we had, and worth one question on the held-out set when finally tested.
  'browser-infrastructure': ['scrape', 'crawl', 'crawler', 'browser', 'puppeteer', 'playwright', 'proxy', 'screenshot', 'chrome'],
  // Not "alerting": an alert about an exception is error monitoring and an alert about latency is
  // observability, so the word decided nothing and tied all three.
  // Not "webhook": every category delivers them and none of them is asked for by that word, so it
  // sent a bare "webhooks" to notifications and tied "queue for webhooks retries" against jobs.
  notifications: ['notification', 'notify', 'push', 'slack', 'bell', 'unread'],
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
  // Not "markdown": it names a format that an editor writes and a CMS stores, so "the docs team
  // wants to write in markdown and have it show up on the site" went to the editor.
  'rich-text-editors': ['wysiwyg', 'richtext', 'editor', 'formatting'],
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
  // "meaning" as a noun in this construction is unambiguous, while the bare verb it stems to is
  // not. Dropping the token cost "recommend similar articles based on meaning not keywords",
  // where "similar" tied against the "article" in headless CMS and "meaning" broke the tie.
  [/\b(?:based on|by|not) meaning\b|\bmeaning,? not keywords\b/, 'vector-search'],
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
  // A qualifier plus a subject, where the subject decides and the qualifier tied it: "a spike of
  // javascript errors and we have no idea which browser" scored error monitoring against browser
  // infrastructure and returned nothing.
  [/\bjavascript errors?\b|\bjs errors?\b/, 'error-monitoring'],
  // The same shape, and the industry's own name for the category: Sentry, Rollbar and Bugsnag all
  // sell "error tracking". "track" is product analytics vocabulary (tracking events), so "track
  // errors in production" scored the two dead level and returned nothing, while "errors in
  // production" routed correctly. The verb belongs to one category and the object to another, and
  // here the object decides.
  [/\berror[- ]track|\btrack(?:s|ing)? (?:\w+ )?(?:errors?|exceptions?|crashes)\b/, 'error-monitoring'],
]

/**
 * Every term anybody filed, at any length. The length rule below drops short words as noise, and
 * it dropped "s3", which left "object storage s3 compatible" with nothing but our own prose.
 */
const FILED = new Set(Object.values(VOCABULARY).flat().map(stem))

/**
 * A caller shopping for a competitor names the incumbent, and nothing in the vocabulary knew any
 * vendor's name: "stripe alternative", "algolia alternative" and "auth0 alternative" all returned
 * nothing while the corpus holds every one of those companies under exactly one category.
 *
 * The name has to sit against the word asking for another one. A quarter of the corpus is named
 * with an ordinary English word (here.com, name.com, daily.co, split.io, loops.so, polar.sh), and
 * a rule that only wanted both somewhere in the question read "screenshot every competitor page
 * daily" as a search for an alternative to Daily and answered with video vendors.
 */
const BRANDS = new Map(
  CATEGORIES.flatMap((category) =>
    category.domains.map((domain) => [domain.split('.')[0].toLowerCase(), category.id] as const),
  ),
)

const BRAND_ALTERNATION = [...BRANDS.keys()].map((brand) => brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
const ASKING_FOR_ANOTHER = new RegExp(
  String.raw`\b(${BRAND_ALTERNATION})\b\s+(?:alternatives?|competitors?|replacements?)\b` +
    String.raw`|\b(?:alternatives?|competitors?|replacements?|instead of|similar to|replace|migrating? (?:from|off)|vs\.?)\s+(?:to\s+|the\s+|a\s+)?\b(${BRAND_ALTERNATION})\b`,
)

/**
 * Why a question routed the way it did: the top scorers with their two components. Written for
 * the routing scripts, because "it returned null" covers three different failures that need three
 * different fixes, and telling them apart by reading the rules is how the last round guessed wrong.
 */
export function explainJob(job: string): { words: number; top: { id: string; strong: number; score: number }[] } {
  const asked = job.toLowerCase().replace(/\bsign(?:s|ed|ing)? ?up\b/g, ' ')
  const words = asked
    .split(/[^a-z0-9]+/)
    .map(stemmed)
    .filter(({ word }) => (word.length > 2 || FILED.has(word)) && !NO_INFORMATION.has(word))
  const top = CATEGORIES.map((category) => {
    const vocabulary = (VOCABULARY[category.id] ?? []).map(stem)
    const strong = words.filter((word) => vocabulary.some((term) => sameTerm(word, term))).length * 10
    const prose = proseWords(category)
    const weak = words.filter(({ word }, index) => !vocabulary.some((term) => sameTerm(words[index], term)) && prose.has(word)).length
    return { id: category.id, strong, score: strong + weak }
  })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
  // The count matters as much as the winner: one hit inside a nine word sentence is a different
  // kind of evidence from two hits inside three words, and the decision rule needs to see both.
  return { words: words.length, top }
}

/**
 * A question about the caller's own code, asked in words that also name things we sell.
 *
 * This is the failure the evidence threshold cannot reach, because a developer writing about their
 * own system uses two of our words as readily as one: "a billing module and a subscriptions module
 * in our repo" scores payments twice and is a refactoring question. So does "two workers process
 * the same job", which is about a lock.
 *
 * Every pattern here is a shape that never appears in a question about buying something, rather
 * than a word from any of our categories: complexity notation, the vocabulary of tuning a database
 * you already run, and the openers people use when they want code rather than a vendor. The test
 * that keeps it honest is in the build: it must fire on NONE of the questions across every set that
 * expects a category. A rule that silences a real buying question is worse than the wrong answers
 * it prevents.
 */
const ABOUT_THEIR_OWN_CODE = [
  /\bo\(n[\^ ]?[²2]\)|\bo\(n\s*log\s*n\)|\bo\(1\)|\bbig[- ]o\b/,
  /\bexplain analyze\b|\bseq scan\b|\bquery planner\b|\bthe planner\b|\bselect \.\.\.|\bfor update\b|\badvisory lock\b|\bbrin\b/,
  /\bwhat data structure\b|\bwhich data structure\b/,
  /\bhow do i (?:rewrite|redesign|refactor|restructure|split|migrate)\b|\bwhat.s the clean way\b|\bthe clean way to\b/,
  /\bin (?:our|my) (?:repo|repository|codebase|monorepo)\b/,
  /\b(?:two|both) (?:internal|our own) (?:packages|modules|services)\b/,
  /\bcall sites\b|\bwithout allocating\b|\bin one pass\b/,
]

/** Exported so the build can assert it never fires on a question that should get an answer. */
export const aboutTheirOwnCode = (job: string): boolean =>
  ABOUT_THEIR_OWN_CODE.some((pattern) => pattern.test(job.toLowerCase()))

export function categoryForJob(job: string): Category | null {
  const asked = job.toLowerCase().replace(/\bsign(?:s|ed|ing)? ?up\b/g, ' ')
  if (aboutTheirOwnCode(asked)) return null
  const phrase = PHRASES.find(([pattern]) => pattern.test(asked))
  if (phrase) return CATEGORIES.find((category) => category.id === phrase[1]) ?? null

  const asksForAnother = asked.match(ASKING_FOR_ANOTHER)
  if (asksForAnother) {
    const named = BRANDS.get(asksForAnother[1] ?? asksForAnother[2])
    if (named) return CATEGORIES.find((category) => category.id === named) ?? null
  }

  const words = asked
    .split(/[^a-z0-9]+/)
    .map(stemmed)
    .filter(({ word }) => (word.length > 2 || FILED.has(word)) && !NO_INFORMATION.has(word))
  if (words.length === 0) return null
  const scored = CATEGORIES.map((category) => {
    const vocabulary = (VOCABULARY[category.id] ?? []).map(stem)
    // A term from the caller's vocabulary is worth more than an incidental word in our own prose,
    // which is what let a single shared word decide a category.
    const strong = words.filter((word) => vocabulary.some((term) => sameTerm(word, term))).length * 10
    const prose = proseWords(category)
    const weak = words.filter(
      (word) => !vocabulary.some((term) => sameTerm(word, term)) && prose.has(word.word),
    ).length
    return { category, strong, score: strong + weak }
  }).sort((a, b) => b.score - a.score)
  // Our own prose is not the caller's vocabulary, and on its own it is noise: "experimentation
  // platform" went to commerce because our commerce line ends in "platforms", and "something for
  // my app" went there because the same line says "sell something". A prose hit now only breaks a
  // tie between categories the caller's own words already reached.
  if (scored[0].strong === 0) return null
  /**
   * One word out of many is not enough to answer with. `explainJob` has said since it was written
   * that "one hit inside a nine word sentence is a different kind of evidence from two hits inside
   * three words, and the decision rule needs to see both", and then the decision rule never looked
   * at the length at all: a single vocabulary token won outright however long the question was.
   * That is where the confident wrong answers came from. Deploying containers went to
   * notifications on the word push, a billing module inside the caller's own repository went to
   * payments, an events table in Postgres went to product analytics.
   *
   * Measured across all five question sets before choosing the number. On the one set nobody has
   * fixed against, this costs nothing at all and removes eight of the ten wrong answers: 24 right
   * either way, wrong answers 10 to 2. On the second set, 31 right either way and 11 wrong to 6.
   * The two sets it costs correct answers on are both sets the rules were fixed against, so their
   * higher score is partly a memory of that fitting rather than a measurement.
   */
  if (words.length > 12 && scored[0].strong < 20) return null
  // A tie between two categories is a question we cannot route, and guessing would send a caller
  // a list of the wrong vendors with our name on it.
  // Tested and refuted 2026-08-13: letting a named delivery channel take the tie. It fired on
  // three questions across both held-out sets and was wrong on all three, because "email" in a
  // real question is usually incidental (people emailing support) rather than the product being
  // asked for. It scored the same only because those three were already wrong, and a confident
  // wrong answer is worse than the silence it replaced.
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

async function lookupCategory(category: Category): Promise<Lookup> {
  const reports = new Map((await publishedCorpus()).reports.map((report) => [report.domain, report]))
  const held = category.domains
    .map((domain) => reports.get(domain))
    .filter((report): report is Report => report !== undefined)
    .map(reachabilityOf) as (Reachability & { unknown?: boolean })[]

  return {
    category: { id: category.id, label: category.label, jobToBeDone: category.jobToBeDone },
    measured: held.length,
    inCategory: category.domains.length,
    clear: held.filter((entry) => entry.barriers.length === 0 && !entry.unknown),
    blocked: held.filter((entry) => entry.barriers.length > 0),
    unknown: held.filter((entry) => entry.barriers.length === 0 && entry.unknown),
  }
}

/** The exact-category form used by stable URLs, where routing a sentence would only add error. */
export async function lookupCategoryById(id: string): Promise<Lookup | null> {
  const category = CATEGORIES.find((candidate) => candidate.id === id)
  return category ? lookupCategory(category) : null
}

export async function lookup(job: string): Promise<Lookup | null> {
  const category = categoryForJob(job)
  return category ? lookupCategory(category) : null
}
