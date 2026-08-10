export type Category = {
  id: string
  label: string
  /** The question a developer is answering when they reach for one of these. */
  jobToBeDone: string
  domains: string[]
}

/**
 * Curated rather than inferred. Guessing a category from page copy produces confident
 * nonsense, and a wrong peer group makes every comparison in the report worthless.
 */
export const CATEGORIES: Category[] = [
  {
    id: 'file-storage',
    label: 'File upload and storage',
    jobToBeDone: 'let users upload images and serve them back fast',
    domains: [
      'uploadthing.com',
      'uploadcare.com',
      'cloudinary.com',
      'imagekit.io',
      'bunny.net',
      'supabase.com',
      'filestack.com',
      'transloadit.com',
      'vercel.com',
      'cloudflare.com',
    ],
  },
  {
    id: 'rich-text-editors',
    label: 'Embeddable rich text editors',
    jobToBeDone: 'put a real editor inside a product',
    domains: [
      'ckeditor.com',
      'tiny.cloud',
      'tiptap.dev',
      'lexical.dev',
      'quilljs.com',
      'prosemirror.net',
      'editorjs.io',
      'froala.com',
      'slatejs.org',
      'liveblocks.io',
    ],
  },
  {
    id: 'auth',
    label: 'Authentication as a service',
    jobToBeDone: 'add login without owning password resets forever',
    domains: ['auth0.com', 'clerk.com', 'workos.com', 'stytch.com', 'kinde.com', 'logto.io', 'supertokens.com'],
  },
  {
    id: 'transactional-email',
    label: 'Transactional email APIs',
    jobToBeDone: 'send password resets and receipts that arrive',
    domains: ['resend.com', 'postmark.com', 'sendgrid.com', 'mailgun.com', 'loops.so', 'sendlayer.com'],
  },
  {
    id: 'product-analytics',
    label: 'Product analytics',
    jobToBeDone: 'find out what users actually do in the product',
    domains: ['posthog.com', 'mixpanel.com', 'amplitude.com', 'plausible.io', 'usefathom.com', 'june.so'],
  },
  {
    id: 'vector-search',
    label: 'Vector databases',
    jobToBeDone: 'give an app semantic search or retrieval',
    domains: ['pinecone.io', 'weaviate.io', 'qdrant.tech', 'trychroma.com', 'turbopuffer.com', 'zilliz.com'],
  },
  {
    id: 'payments',
    label: 'Payments and billing',
    jobToBeDone: 'take money without becoming a payments company',
    domains: ['stripe.com', 'paddle.com', 'lemonsqueezy.com', 'polar.sh', 'chargebee.com', 'plaid.com'],
  },
  {
    id: 'error-monitoring',
    label: 'Error monitoring',
    jobToBeDone: 'find out an exception happened before a customer tells you',
    domains: ['sentry.io', 'rollbar.com', 'bugsnag.com', 'honeybadger.io', 'betterstack.com', 'highlight.io', 'raygun.com'],
  },
  {
    id: 'feature-flags',
    label: 'Feature flags and experiments',
    jobToBeDone: 'ship a change to some users and not others',
    domains: ['launchdarkly.com', 'statsig.com', 'flagsmith.com', 'getunleash.io', 'configcat.com', 'split.io', 'growthbook.io'],
  },
  {
    id: 'search',
    label: 'Search as a service',
    jobToBeDone: 'put a search box over your own data',
    domains: ['algolia.com', 'meilisearch.com', 'typesense.org', 'elastic.co', 'oramasearch.com', 'searchkit.co'],
  },
  {
    id: 'communications',
    label: 'SMS, voice and messaging',
    jobToBeDone: 'send a message a person actually reads',
    domains: ['twilio.com', 'vonage.com', 'plivo.com', 'telnyx.com', 'messagebird.com', 'sinch.com'],
  },
  {
    id: 'headless-cms',
    label: 'Headless CMS',
    jobToBeDone: 'let non-engineers edit content the product renders',
    domains: ['contentful.com', 'sanity.io', 'strapi.io', 'storyblok.com', 'payloadcms.com', 'directus.io', 'hygraph.com'],
  },
  {
    id: 'background-jobs',
    label: 'Background jobs and workflows',
    jobToBeDone: 'run work that must not happen inside a request',
    domains: ['inngest.com', 'trigger.dev', 'temporal.io', 'upstash.com', 'hatchet.run', 'defer.run'],
  },
  {
    id: 'llm-infrastructure',
    label: 'Model hosting and gateways',
    jobToBeDone: 'call a model you did not train without running the GPUs',
    domains: ['openrouter.ai', 'together.ai', 'fireworks.ai', 'groq.com', 'replicate.com', 'modal.com', 'baseten.co'],
  },
  {
    id: 'video',
    label: 'Video hosting and streaming',
    jobToBeDone: 'put video in a product without building an encoder',
    domains: ['mux.com', 'api.video', 'daily.co', 'livekit.io', 'agora.io', 'bitmovin.com'],
  },
  {
    id: 'browser-infrastructure',
    label: 'Browser and scraping infrastructure',
    jobToBeDone: 'drive a real browser or read a page you do not own',
    domains: ['browserbase.com', 'apify.com', 'firecrawl.dev', 'scrapingbee.com', 'browserless.io', 'zenrows.com'],
  },
  {
    id: 'notifications',
    label: 'Notification infrastructure',
    jobToBeDone: 'send one event to email, push and Slack without writing three integrations',
    domains: ['knock.app', 'courier.com', 'novu.co', 'onesignal.com', 'pusher.com', 'magicbell.com'],
  },
  {
    id: 'scheduling',
    label: 'Scheduling and calendar APIs',
    jobToBeDone: 'book a meeting into a calendar you do not control',
    domains: ['cal.com', 'calendly.com', 'nylas.com', 'savvycal.com', 'cronofy.com'],
  },
  {
    id: 'maps-geo',
    label: 'Maps and geocoding',
    jobToBeDone: 'turn an address into coordinates and draw it on a map',
    domains: ['mapbox.com', 'maptiler.com', 'radar.com', 'tomtom.com', 'here.com', 'locationiq.com'],
  },
  {
    id: 'databases',
    label: 'Managed databases',
    jobToBeDone: 'get a production database without running one',
    domains: ['neon.tech', 'planetscale.com', 'turso.tech', 'cockroachlabs.com', 'xata.io', 'tigrisdata.com'],
  },
  {
    id: 'observability',
    label: 'Observability and logging',
    jobToBeDone: 'find out why production is slow at three in the morning',
    domains: ['datadoghq.com', 'grafana.com', 'honeycomb.io', 'newrelic.com', 'axiom.co', 'signoz.io'],
  },
  {
    id: 'documents-signature',
    label: 'Documents and e-signature',
    jobToBeDone: 'generate a document and get it signed',
    domains: ['docuseal.com', 'documenso.com', 'dropboxsign.com', 'pandadoc.com', 'useanvil.com', 'pdfmonkey.io'],
  },
  {
    id: 'commerce',
    label: 'Commerce platforms',
    jobToBeDone: 'sell something without building a checkout',
    domains: ['shopify.com', 'bigcommerce.com', 'medusajs.com', 'saleor.io', 'swell.is', 'commercetools.com'],
  },
  {
    id: 'localization',
    label: 'Translation and localization',
    jobToBeDone: 'ship the same product in a language nobody on the team speaks',
    domains: ['deepl.com', 'lokalise.com', 'crowdin.com', 'phrase.com', 'weglot.com', 'tolgee.io'],
  },
]

export function categoryFor(domain: string): Category | null {
  return CATEGORIES.find((category) => category.domains.includes(domain)) ?? null
}

/**
 * The published corpus. A stranger's scan lands in the store and under its own permanent
 * link, but it must never move a number we publish as research: an anonymous POST silently
 * turned "51 domains" into "52" and shifted every median on the report page.
 */
export const CURATED_DOMAINS = new Set(CATEGORIES.flatMap((category) => category.domains))
