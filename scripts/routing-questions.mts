/**
 * The held-out questions, in one place because two things read them: the run that prints the
 * error rate, and the build check that the rate published in the MCP tool description is still
 * the rate the rules produce. A number quoted in prose and measured in a script drifts apart the
 * moment somebody edits the vocabulary, which is exactly how "16 right out of 20" survived long
 * after it stopped being true.
 */
export type Question = { asked: string; expect: string | null }

export const FRESH_QUESTIONS: Question[] = [
  { asked: 'we outgrew the local disk and need somewhere to put user attachments', expect: 'file-storage' },
  { asked: 'somewhere to keep scanned invoices for seven years', expect: 'file-storage' },
  { asked: 'our support agents need bold and bullet lists when they reply', expect: 'rich-text-editors' },
  { asked: 'comment box that accepts formatting and pasted images', expect: 'rich-text-editors' },
  { asked: 'stop building password resets ourselves', expect: 'auth' },
  { asked: 'our enterprise customer wants SCIM provisioning of their staff', expect: 'auth' },
  { asked: 'password reset mails land in junk, we need proper deliverability', expect: 'transactional-email' },
  { asked: 'receipts have to go out the second the payment clears', expect: 'transactional-email' },
  { asked: 'which button do people actually press on the pricing page', expect: 'product-analytics' },
  { asked: 'cohort retention by signup month', expect: 'product-analytics' },
  { asked: 'find the three most similar support tickets to a new one', expect: 'vector-search' },
  { asked: 'store 20 million embeddings and query by cosine distance', expect: 'vector-search' },
  { asked: 'take card payments in the EU with strong customer authentication', expect: 'payments' },
  { asked: 'recurring billing with proration when they upgrade mid month', expect: 'payments' },
  { asked: 'stack traces from the mobile app when it crashes', expect: 'error-monitoring' },
  { asked: 'group the same exception together instead of 4000 emails', expect: 'error-monitoring' },
  { asked: 'kill switch for the new checkout without shipping code', expect: 'feature-flags' },
  { asked: 'show the redesign to internal staff only', expect: 'feature-flags' },
  { asked: 'typo tolerant product search with facets', expect: 'search' },
  { asked: 'our users cannot find anything in the knowledge base', expect: 'search' },
  { asked: 'two way SMS conversations with our drivers', expect: 'communications' },
  { asked: 'phone number that forwards to whoever is on call', expect: 'communications' },
  { asked: 'editors want to schedule blog posts and preview them', expect: 'headless-cms' },
  { asked: 'content model for landing pages we can query by API', expect: 'headless-cms' },
  { asked: 'retry a failed webhook with backoff for a day', expect: 'background-jobs' },
  { asked: 'fan out 50k emails without blocking the web request', expect: 'background-jobs' },
  { asked: 'swap between claude and gpt without rewriting our client', expect: 'llm-infrastructure' },
  { asked: 'we need cheaper tokens for a summarisation job', expect: 'llm-infrastructure' },
  { asked: 'adaptive bitrate playback on bad mobile connections', expect: 'video' },
  { asked: 'record the meeting and give people a shareable link', expect: 'video' },
  { asked: 'click through a competitor checkout every morning and screenshot it', expect: 'browser-infrastructure' },
  { asked: 'run puppeteer somewhere that is not our laptop', expect: 'browser-infrastructure' },
  { asked: 'let each user choose whether they get slack, email or nothing', expect: 'notifications' },
  { asked: 'digest of everything that happened while they were away', expect: 'notifications' },
  { asked: 'round robin meetings across five account managers', expect: 'scheduling' },
  { asked: 'clients pick a 30 minute slot that respects timezones', expect: 'scheduling' },
  { asked: 'distance and drive time between two postcodes', expect: 'maps-geo' },
  { asked: 'autocomplete street addresses in the signup form', expect: 'maps-geo' },
  { asked: 'we need branching for our database like git', expect: 'databases' },
  { asked: 'sqlite that syncs to the edge', expect: 'databases' },
  { asked: 'trace a request across six services', expect: 'observability' },
  { asked: 'we want to know p95 before the customer tells us', expect: 'observability' },
  { asked: 'countersigned agreements stored with a certificate', expect: 'documents-signature' },
  { asked: 'fill a template with data and produce a document', expect: 'documents-signature' },
  { asked: 'cart, inventory and discount codes for a shop', expect: 'commerce' },
  { asked: 'sell physical goods with shipping rates', expect: 'commerce' },
  { asked: 'translators need a place to work that is not a spreadsheet', expect: 'localization' },
  { asked: 'ship the app in six languages and keep strings in sync', expect: 'localization' },
  { asked: 'customers should point their own domain at our app', expect: 'domains-dns' },
  { asked: 'bulk register domains and set records by API', expect: 'domains-dns' },
  { asked: 'twilio alternative', expect: 'communications' },
  { asked: 'we are moving off contentful', expect: 'headless-cms' },

  // No confident answer is the right answer. Each of these is either outside the 25 categories or
  // sits between two of them, and a lookup that guesses hands the caller the wrong vendors.
  { asked: 'we need a CRM', expect: null },
  { asked: 'help us pick a frontend framework', expect: null },
  { asked: 'something to store data', expect: null },
  { asked: 'our app is slow', expect: null },
  { asked: 'hire someone to do this for us', expect: null },
  { asked: 'manage our AWS bill', expect: null },
  { asked: 'chat widget for the website', expect: null },
]
