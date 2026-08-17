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
      // Filed under managed databases until 2026-08-10, on the identity it had before it pivoted.
      // Its own home page: "Bottomless object storage with zero egress fees", and the word
      // database appears zero times.
      'tigrisdata.com',
      'cloudinary.com',
      'imagekit.io',
      'bunny.net',
      'filestack.com',
      'transloadit.com',
      // vercel.com was here until 2026-08-11. Its own title is "Agentic Infrastructure" and its
      // description "The autonomous stack for every app and agent": the word storage appears
      // nowhere. Removed rather than refiled, because we hold no hosting category and inventing
      // one for a single vendor is a worse answer than admitting we do not measure hosting.
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
    domains: ['resend.com', 'postmarkapp.com', 'sendgrid.com', 'mailgun.com', 'loops.so', 'sendlayer.com'],
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
    domains: ['twilio.com', 'vonage.com', 'plivo.com', 'telnyx.com', 'bird.com', 'sinch.com'],
  },
  {
    id: 'headless-cms',
    label: 'Headless CMS',
    jobToBeDone: 'let non-engineers edit content the product renders',
    domains: ['contentful.com', 'sanity.io', 'strapi.io', 'storyblok.com', 'payloadcms.com', 'directus.com', 'hygraph.com'],
  },
  {
    id: 'background-jobs',
    label: 'Background jobs and workflows',
    jobToBeDone: 'run work that must not happen inside a request',
    // Both filed on their own words: restate.dev "lightweight runtime ... innately resilient
    // distributed apps", which is durable execution and temporal.io's shelf, and windmill.dev
    // "code-first orchestration platform".
    domains: ['inngest.com', 'trigger.dev', 'temporal.io', 'upstash.com', 'hatchet.run', 'restate.dev', 'windmill.dev'],
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
    domains: ['mux.com', 'api.video', 'daily.co', 'livekit.com', 'agora.io', 'bitmovin.com'],
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
    // "Scheduling, at scale" on its own home page, which is the job this category names.
    domains: ['cal.com', 'calendly.com', 'nylas.com', 'savvycal.com', 'cronofy.com', 'timekit.io'],
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
    // mongodb.com and redis.io were missing from a category about getting a production database
    // without running one, which was the largest gap in the corpus rather than a judgement call.
    // supabase.com moved here from file storage on 2026-08-11. Its own title is "The Postgres
    // Development Platform" and storage is one of the seven products its description lists, so
    // the database shelf is the one its own words name first.
    domains: ['neon.com', 'planetscale.com', 'turso.tech', 'cockroachlabs.com', 'xata.io', 'mongodb.com', 'redis.io', 'supabase.com'],
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
  {
    // The first category where the wall is money rather than a form. Every other one measures
    // whether an agent can reach a free tier, and a domain has none: the cheapest path to owning
    // one is a card. So self_serve will be notApplicable across most of these rows, which is the
    // first real test of whether the measurable denominator is honest or just convenient.
    //
    // Worth measuring because the barrier is documented and unequal. Cloudflare publishes a POST
    // that registers a domain and charges the account's card. Namecheap gates its API behind a
    // balance and an IP allowlist, and GoDaddy behind a minimum number of domains already held.
    // An agent building a site has to buy a domain before anything else, so whichever registrar
    // it can actually drive becomes the default for every site an agent builds.
    // opensrs.com was here until 2026-08-11 and is not a registrar an agent can use. Its own title
    // tag reads "Reseller Platform for Domains, Email, and SSL" and its home page "the world's
    // largest wholesale domain platform", so the product is sold to registrars rather than to
    // whoever wants a domain. Right company, wrong shelf, like liveblocks.io under editors.
    id: 'domains-dns',
    label: 'Domain registration and DNS',
    jobToBeDone: 'register a domain and point it somewhere with nobody at the keyboard',
    domains: [
      'namecheap.com',
      'porkbun.com',
      'dynadot.com',
      'name.com',
      'gandi.net',
      'dnsimple.com',
      'godaddy.com',
      'hover.com',
      'inwx.com',
      'netim.com',
      'njal.la',
    ],
  },
  {
    id: 'app-hosting',
    label: 'Application hosting and deployment',
    jobToBeDone: 'get an application running in production without operating servers',
    // Added 2026-08-17, and the reason is a customer rather than symmetry: somebody is watching
    // vercel.com, we removed it from the corpus on 2026-08-11 for having no category, and
    // /pricing promises a monthly agent run to every watched domain. It waited for the noise
    // floor to be measured, because changing the corpus mid-window would have broken the pair.
    //
    // It fits the thesis rather than widening it: deploying an application is the one job where
    // an agent must make an account, take a token and call an API to finish, which is the funnel
    // this whole corpus measures. Our own build runs already do it.
    domains: ['vercel.com', 'netlify.com', 'render.com', 'fly.io', 'railway.com', 'heroku.com', 'koyeb.com'],
  },
]

/**
 * Four rows were renamed on 2026-08-10 to the host they were already measuring. Each old apex
 * answers 301 or 308 on every path, so nothing about the measurement changes: redirects were
 * always followed. What changes is that the label stops naming a domain it does not read.
 *
 * `oramasearch.com` looks like the same case and is not, which is why it stays. Its HTML
 * redirects to orama.com while `oramasearch.com/llms.txt` answers 200 and `orama.com/llms.txt`
 * answers 404, so renaming it would silently drop a file the vendor really does publish.
 */
export function categoryFor(domain: string): Category | null {
  return CATEGORIES.find((category) => category.domains.includes(domain)) ?? null
}

/**
 * The published corpus. A stranger's scan lands in the store and under its own permanent
 * link, but it must never move a number we publish as research: an anonymous POST silently
 * turned "51 domains" into "52" and shifted every median on the report page.
 */
export const CURATED_DOMAINS = new Set(CATEGORIES.flatMap((category) => category.domains))
