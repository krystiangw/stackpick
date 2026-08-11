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

  { asked: 'register a domain for the site I just built', expect: 'domains-dns' },
  { asked: 'point a CNAME at my app', expect: 'domains-dns' },
  { asked: 'buy a domain name', expect: 'domains-dns' },

  { asked: 'something for my app', expect: null, note: 'no information at all' },
  { asked: 'the best provider', expect: null },
  { asked: 'search', expect: 'search', note: 'a bare category noun still routes' },

  // The eleventh pass, written and labelled before a single one was run, because the set above
  // had been tuned against until it read 64 out of 64 and stopped being a measurement. Register
  // deliberately different: somebody describing a problem, with the typos and the second-language
  // word order that come with it, rather than naming a category.
  //
  // Baseline on all 45: 40.0 percent wrong. The odd-numbered half was then held back, the fixes
  // were derived from the even half only, and the held-out half was run once: 31.8 percent, seven
  // of twenty-two. That is the honest generalisation number, and it is two orders of magnitude
  // worse than the scanner's 0.39. Both halves are burned now; the twelfth pass needs new
  // questions, and it should keep this discipline rather than tune against these.
  { asked: 'our nightly export keeps timing out, need something to run it out of band', expect: 'background-jobs' },
  { asked: 'customers complain they never got the receipt mail', expect: 'transactional-email' },
  { asked: 'I need to charge different prices per country with VAT', expect: 'payments' },
  { asked: 'we want to translate the app into german and japanese', expect: 'localization' },
  { asked: 'somebody to host llama 3 for us so we dont run gpus', expect: 'llm-infrastructure' },
  { asked: 'put a map with pins of our shops on the contact page', expect: 'maps-geo', note: 'tied maps against commerce on "shops"' },
  { asked: 'how do i know which release caused the spike in crashes', expect: 'error-monitoring' },
  { asked: 'need audit trail of every request with searchable logs', expect: 'observability' },
  { asked: 'we need a booking page so clients pick a slot', expect: 'scheduling', note: 'silent: "page" tied the CMS in' },
  { asked: 'want to buy a bunch of domains programatically for our campaigns', expect: 'domains-dns', note: 'the singular phrase missed the bulk case' },
  { asked: 'the login page should support SSO with okta', expect: 'auth' },
  { asked: 'we get scraped, but we also need to scrape competitors prices', expect: 'browser-infrastructure' },
  { asked: 'our writers keep asking devs to publish copy changes', expect: 'headless-cms' },
  { asked: 'recommend similar articles based on meaning not keywords', expect: 'vector-search' },
  { asked: 'search bar on the marketplace that tolerates typos', expect: 'search' },
  { asked: 'one place to configure email, push and slack alerts for users', expect: 'notifications' },
  { asked: 'we need postgres but managed', expect: 'databases' },
  { asked: 'sell subscriptions with a checkout page and dunning', expect: 'payments' },
  { asked: 'storefront with cart and inventory', expect: 'commerce' },
  { asked: 'sign the NDA digitally', expect: 'documents-signature', note: 'silent: "sign" is auth and signature at once' },
  { asked: 'track funnel drop off between step 2 and 3', expect: 'product-analytics' },
  { asked: 'we need a CDN', expect: 'file-storage', note: 'label revised after the run: bunny.net and cloudflare.com are filed here' },
  { asked: 'hire a devops contractor', expect: null },
  { asked: 'gdpr consent banner', expect: null },
  { asked: 'kubernetes hosting', expect: null },
  { asked: 'monitor if our site is down', expect: 'observability' },
  { asked: 'keep the user session after they close the tab', expect: null },
  { asked: 'video calls with screen share for support', expect: 'video' },
  { asked: 'wysiwyg', expect: 'rich-text-editors' },
  { asked: 'otp', expect: null, note: 'the vendor who sends one and the vendor who checks one are two categories' },
  { asked: 'a service that turns addresses into lat long', expect: 'maps-geo' },
  { asked: 'documentation search', expect: 'search' },
  { asked: 'flag to disable a feature quickly if it breaks', expect: 'feature-flags' },
  { asked: 'we need object storage s3 compatible', expect: 'file-storage', note: 'silent: the length filter dropped "s3"' },
  { asked: 'identity provider for our B2B customers', expect: 'auth' },
  { asked: 'cheapest way to run whisper transcription at scale', expect: 'llm-infrastructure' },
  { asked: 'our own status page', expect: null },
  { asked: 'screenshot every competitor page daily', expect: 'browser-infrastructure', note: 'screenshotting is what the browser vendors sell' },

  // The held-out half, still failing, kept in the file as the standing debt rather than deleted
  // or tuned away. Each one is a category a caller would name in a sentence we cannot read.
  { asked: 'need a place to keep 4k video the users upload and play it back smoothly', expect: 'video', note: 'HELD OUT, still wrong: goes to file-storage on "upload"' },
  { asked: 'editor for blog posts inside our admin panel', expect: 'rich-text-editors', note: 'HELD OUT, still silent' },
  { asked: 'SMS reminders 24h before the appointment', expect: 'communications', note: 'HELD OUT, still silent: SMS against appointment' },
  { asked: 'turn on the new pricing page for 10 percent of users', expect: 'feature-flags', note: 'HELD OUT, still silent' },
  { asked: 'invoicing', expect: null, note: 'HELD OUT, answers payments; arguable, and an arguable answer is one we said we would not give' },
  { asked: 'we need to send 200k marketing emails a month', expect: null, note: 'HELD OUT, answers transactional-email; a bulk sender is not a transactional API' },
  { asked: 'queue for webhooks retries', expect: 'background-jobs', note: 'HELD OUT, still silent: queue against webhook' },
  // The twelfth pass, 2026-08-11. Two registers again absent from everything above: search-box
  // short, and a person rambling. Labelled before the run, baseline 35 percent wrong. Fixes were
  // taken from the even half only and the odd half was then run once: 20 percent, four of twenty,
  // down from six. That is the honest generalisation number and it replaces 31.8 from the
  // eleventh pass. All of these are burned now.
  { asked: 'webhooks', expect: null, note: 'answered notifications; every category delivers them and none is asked for by that word' },
  { asked: 'email api', expect: 'transactional-email' },
  { asked: 'signup captcha', expect: null },
  { asked: 'cdn images', expect: 'file-storage' },
  { asked: 'postgres hosting', expect: 'databases' },
  { asked: 'push notifications', expect: 'notifications' },
  { asked: 'sms api', expect: 'communications' },
  { asked: 'stripe alternative', expect: 'payments', note: 'silent: no vendor name was in the vocabulary' },
  { asked: 'algolia alternative', expect: 'search', note: 'silent: same' },
  { asked: 'sentry alternative', expect: 'error-monitoring' },
  { asked: 'auth0 alternative', expect: 'auth', note: 'silent: same' },
  { asked: 'vector db for rag', expect: 'vector-search' },
  { asked: 'headless commerce', expect: 'commerce', note: 'silent: "headless" pulled browser infrastructure' },
  { asked: 'calendar api', expect: 'scheduling' },
  { asked: 'geocoding api', expect: 'maps-geo' },
  { asked: 'translation api', expect: 'localization' },
  { asked: 'esignature api', expect: 'documents-signature' },
  { asked: 'log aggregation', expect: 'observability' },
  { asked: 'gpu inference', expect: 'llm-infrastructure' },
  { asked: 'web scraping api', expect: 'browser-infrastructure' },
  {
    asked: 'we are a small team and we need to let our support people send text messages to customers without building the whole telephony thing',
    expect: 'communications',
  },
  { asked: 'the marketing site is in webflow but the app needs the same blog posts, what do people use', expect: 'headless-cms' },
  { asked: 'i want to know why users drop off on step three of onboarding and whether the new copy helped', expect: 'product-analytics' },
  { asked: 'we keep getting paged at 3am and nobody knows which service is slow', expect: 'observability' },
  { asked: 'our uploads are killing the server, we need someone else to hold the files and resize them', expect: 'file-storage' },
  { asked: 'the CFO wants invoices with VAT for european customers and we take cards', expect: 'payments' },
  { asked: 'customers ask for a demo booking link that respects my google calendar', expect: 'scheduling' },
  { asked: 'we need to ship a feature to beta users only, without a deploy for each change', expect: 'feature-flags' },
  { asked: 'the docs team wants to write in markdown and have it show up on the site', expect: 'headless-cms', note: 'answered rich-text-editors on the word markdown' },
  { asked: 'i need to run a headless chrome somewhere to render pdfs of our reports', expect: 'browser-infrastructure' },
  { asked: 'there is a spike of javascript errors since friday and we have no idea which browser', expect: 'error-monitoring' },
  { asked: 'we want to add search to our help centre, it is about 400 articles', expect: 'search' },
  { asked: 'our app should ask users for their address and validate it', expect: 'maps-geo' },
  { asked: 'we send about 30 emails per signup flow and half go to spam', expect: 'transactional-email' },
  { asked: 'customers upload video of their workouts and we need to play it back on mobile', expect: 'video', note: 'answered file-storage; "play" was not a video word' },
  { asked: 'we need to store 8 million rows and query them from the edge', expect: 'databases' },
  { asked: 'the compliance team wants every contract signed electronically with an audit trail', expect: 'documents-signature' },
  { asked: 'we want to try llama instead of gpt but not buy gpus', expect: 'llm-infrastructure' },
  { asked: 'i need a way for our agent to get an api key without me clicking in a dashboard', expect: null },
  { asked: 'how do i let people log in with their work google account and enforce 2fa', expect: 'auth' },

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

/**
 * The eleven held-out failures above, unfixed on purpose. Fixing a question by looking at it is
 * how the first set got to 64 out of 64 while fresh questions ran at 40 percent, so this is a
 * ratchet rather than a pass mark: it fails when the number goes up, and says so when it goes
 * down. Lowering it is a real change to the vocabulary; editing it to match a run is not.
 *
 * Eleven of 149 is 7.4 percent, and it is not the number to quote. The honest one is measured on
 * questions nothing was tuned against, which is 20 percent: four of the twenty held back from the
 * twelfth pass. This file cannot produce that number again, because everything in it is burned.
 */
const KNOWN_DEBT = 11
if (wrong.length > KNOWN_DEBT) {
  console.error(`\nregresja: ${wrong.length} bledow przy dlugu ${KNOWN_DEBT}`)
  process.exit(1)
}
if (wrong.length < KNOWN_DEBT) console.log(`dlug spadl do ${wrong.length}, obniz KNOWN_DEBT`)
process.exit(0)
