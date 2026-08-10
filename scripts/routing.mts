import { categoryForJob } from '../src/lib/lookup'

/**
 * Every routing rule we have written so far was measured once, by hand, on the questions that
 * happened to occur to whoever wrote it. The tenth adversarial pass put 48 questions through
 * find_providers and 11 came back wrong, which is 23 percent against 0.39 percent for the
 * scanner. This file exists so the next rule is measured against the same set as the last one.
 *
 * A question whose right answer is genuinely arguable is filed as null, because a lookup that
 * guesses hands a caller the wrong vendors with our name on them.
 */
type Question = { asked: string; expect: string | null; note?: string }

const QUESTIONS: Question[] = [
  { asked: 'store user avatars', expect: 'file-storage', note: 'tenth pass: went to commerce on the verb "store"' },
  { asked: 'where do I store uploaded files', expect: 'file-storage', note: 'tenth pass: tied commerce against file-storage' },
  { asked: 'A/B test a checkout button', expect: 'feature-flags', note: 'tenth pass: went to payments on "checkout"' },
  { asked: 'experimentation platform', expect: 'feature-flags', note: 'tenth pass: went to commerce on "platform"' },
  { asked: 'send a one-time passcode by text', expect: 'communications', note: 'tenth pass: went to notifications' },
  { asked: 'let customers sign PDFs online', expect: 'documents-signature', note: 'tenth pass: tied auth against documents' },
  { asked: 'let my marketing team edit homepage copy without a deploy', expect: 'headless-cms', note: 'tenth pass: no match' },
  { asked: 'in-app bell with unread counts', expect: 'notifications', note: 'tenth pass: no match' },
  { asked: 'dashboards of p99 latency across services', expect: 'observability', note: 'tenth pass: no match' },
  { asked: 'how many people clicked signup last week', expect: 'product-analytics', note: 'tenth pass: no match' },
  { asked: 'livestream a webinar', expect: 'video', note: 'tenth pass: no match' },

  { asked: 'store embeddings for my RAG pipeline', expect: 'vector-search' },
  { asked: 'a platform for running experiments', expect: 'feature-flags' },
  { asked: 'add e-signature to our contracts', expect: 'documents-signature' },
  { asked: 'handle file uploads', expect: 'file-storage' },
  { asked: 'let users sign in with Google', expect: 'auth' },
  { asked: 'send emails when they sign up', expect: 'transactional-email' },
  { asked: 'semantic search over our docs', expect: 'vector-search' },
  { asked: 'full-text search over our own data', expect: 'search' },
  { asked: 'add a rich text editor to the app', expect: 'rich-text-editors' },
  { asked: 'video calls between two users', expect: 'video' },

  { asked: 'transactional email API', expect: 'transactional-email' },
  { asked: 'product analytics', expect: 'product-analytics' },
  { asked: 'vector database', expect: 'vector-search' },
  { asked: 'payment processing', expect: 'payments' },
  { asked: 'error monitoring', expect: 'error-monitoring' },
  { asked: 'feature flags', expect: 'feature-flags' },
  { asked: 'headless CMS', expect: 'headless-cms' },
  { asked: 'background job queue', expect: 'background-jobs' },
  { asked: 'LLM inference API', expect: 'llm-infrastructure' },
  { asked: 'headless browser for scraping', expect: 'browser-infrastructure' },
  { asked: 'push notifications', expect: 'notifications' },
  { asked: 'calendar booking API', expect: 'scheduling' },
  { asked: 'geocoding API', expect: 'maps-geo' },
  { asked: 'managed Postgres', expect: 'databases' },
  { asked: 'log aggregation and tracing', expect: 'observability' },
  { asked: 'PDF generation', expect: 'documents-signature' },
  { asked: 'ecommerce storefront', expect: 'commerce' },
  { asked: 'i18n and translation management', expect: 'localization' },
  { asked: 'SMS API', expect: 'communications' },
  { asked: 'video encoding and playback', expect: 'video' },
  { asked: 'authentication as a service', expect: 'auth' },
  { asked: 'CDN for images', expect: 'file-storage' },
  { asked: 'cron jobs and workflows', expect: 'background-jobs' },

  { asked: 'sell subscriptions from our website', expect: 'payments', note: 'billing, not a storefront' },
  { asked: 'build an online store', expect: 'commerce' },
  { asked: 'roll out a change to ten percent of users', expect: 'feature-flags' },
  { asked: 'alert me when the API throws exceptions', expect: 'error-monitoring' },
  { asked: 'notify a user on Slack and email at once', expect: 'notifications' },
  { asked: 'resize and serve product photos', expect: 'file-storage' },
  { asked: 'let people book a call with our sales team', expect: 'scheduling' },
  { asked: 'run a nightly export without blocking the request', expect: 'background-jobs' },
  { asked: 'translate the app into German', expect: 'localization' },
  { asked: 'draw delivery routes on a map', expect: 'maps-geo' },
  { asked: 'call GPT without running GPUs', expect: 'llm-infrastructure' },
  { asked: 'scrape a site that needs JavaScript', expect: 'browser-infrastructure' },
  { asked: 'why is production slow at 3am', expect: 'observability' },
  { asked: 'a database I do not have to run myself', expect: 'databases' },

  { asked: 'something for my app', expect: null, note: 'no information at all' },
  { asked: 'the best provider', expect: null },
  { asked: 'search', expect: 'search', note: 'a bare category noun still routes' },
]

const results = QUESTIONS.map((question) => {
  const got = categoryForJob(question.asked)?.id ?? null
  return { ...question, got, ok: got === question.expect }
})

const wrong = results.filter((result) => !result.ok)
const missed = wrong.filter((result) => result.got === null)

for (const result of wrong) {
  const kind = result.got === null ? 'NO MATCH' : `-> ${result.got}`
  console.log(`  ${result.expect ?? 'null'.padEnd(20)}  ${kind.padEnd(24)}  ${result.asked}`)
}

const rate = ((wrong.length / results.length) * 100).toFixed(1)
console.log(
  `\n${results.length - wrong.length}/${results.length} right, ${wrong.length} wrong (${rate} percent), ` +
    `of which ${missed.length} are silent misses`,
)
process.exit(wrong.length > 0 ? 1 : 0)
