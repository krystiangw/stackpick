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

/**
 * The second held-out set, written 2026-08-13 by a run that was told not to open lookup.ts or any
 * of the routing scripts, from the category list alone, and labelled before anything scored it.
 *
 * FRESH_QUESTIONS above stops being held out the moment its failures are read and fixed, which is
 * what happened on 2026-08-13, so the honest number moves here. Two of the nulls sit deliberately
 * between two categories rather than outside all of them (an alert on a rising error rate, and
 * semantic retrieval over a help centre): those are the questions where guessing hands a caller
 * the wrong vendors with our name on it, which is the case worth keeping.
 */
export const HELD_OUT_2: Question[] = [
  { asked: 'our s3 costs are climbing because every upload proxies through the api server first and we want direct presigned uploads from the browser instead', expect: 'file-storage' },
  { asked: 'users keep getting an error when they try to attach anything bigger than a few mb to their profile', expect: 'file-storage' },
  { asked: 'we want to drop a wysiwyg component into our notes feature that supports markdown shortcuts and live collaborative cursors', expect: 'rich-text-editors' },
  { asked: 'support keeps getting complaints that pasting formatted text from google docs into our comment box breaks the whole layout', expect: 'rich-text-editors' },
  { asked: 'we need to add sso with saml for our enterprise customers without building the whole login flow ourselves', expect: 'auth' },
  { asked: 'customers keep getting locked out and support ends up manually verifying identity over email just to unlock an account', expect: 'auth' },
  { asked: 'our password reset emails are landing in spam and we suspect it is because we are sending straight from the app server via smtp', expect: 'transactional-email' },
  { asked: 'customers say they never got the order confirmation even though the order clearly went through', expect: 'transactional-email' },
  { asked: 'we want to track which onboarding steps people drop off at and build funnels without shipping a custom event pipeline', expect: 'product-analytics' },
  { asked: 'the pm keeps asking which features people actually use after signup and honestly we have no way to answer that', expect: 'product-analytics' },
  { asked: 'we are embedding our support docs and need somewhere to store and query millions of embeddings with sub-100ms latency', expect: 'vector-search' },
  { asked: 'our chatbot gives generic answers because it cannot find the relevant paragraph from our docs before it responds', expect: 'vector-search' },
  { asked: 'we need to handle subscription upgrades with proration and dunning without writing our own billing engine', expect: 'payments' },
  { asked: 'finance is manually reconciling invoices in a spreadsheet every month and it eats a full day', expect: 'payments' },
  { asked: 'we want stack traces with source maps and breadcrumbs surfaced automatically the moment the frontend throws', expect: 'error-monitoring' },
  { asked: 'we only find out about production bugs when a customer emails support, which is way too late', expect: 'error-monitoring' },
  { asked: 'we want to roll the new checkout out to 5 percent of traffic and be able to kill it instantly if error rates spike', expect: 'feature-flags' },
  { asked: 'every release we are stuck redeploying just to turn a broken feature back off for everyone', expect: 'feature-flags' },
  { asked: 'our postgres full text search is timing out on the product catalog once we hit a few hundred thousand rows', expect: 'search' },
  { asked: 'customers say they cannot find a product even when they type the exact name, just slightly misspelled', expect: 'search' },
  { asked: 'we need to send appointment reminder texts and handle opt-outs and delivery receipts properly', expect: 'communications' },
  { asked: 'no-shows dropped when someone manually texted people to remind them, but that obviously does not scale', expect: 'communications' },
  { asked: 'marketing wants to edit landing page copy and images without a deploy, and we do not want to build an admin panel ourselves', expect: 'headless-cms' },
  { asked: 'every time marketing wants to change a headline on the homepage they have to file a ticket and wait for a developer', expect: 'headless-cms' },
  { asked: 'we need retries with exponential backoff for webhook processing plus visibility into which jobs are stuck', expect: 'background-jobs' },
  { asked: 'our nightly report generation sometimes just silently fails and nobody notices until a customer complains', expect: 'background-jobs' },
  { asked: 'we want to fall back to a different provider automatically when our primary model call gets rate limited', expect: 'llm-infrastructure' },
  { asked: 'our openai bill tripled last month and nobody can tell me which feature is actually driving it', expect: 'llm-infrastructure' },
  { asked: 'we need adaptive bitrate streaming for course videos without maintaining our own transcoding pipeline', expect: 'video' },
  { asked: 'instructors keep uploading lecture videos and students complain playback stutters constantly on mobile', expect: 'video' },
  { asked: 'we need headless chrome instances at scale to render pdfs from html without babysitting our own puppeteer fleet', expect: 'browser-infrastructure' },
  { asked: 'our competitor price tracker keeps breaking every time they add a captcha or tweak their page layout', expect: 'browser-infrastructure' },
  { asked: 'we want one api to send push, in-app, and email for the same event instead of three separate integrations', expect: 'notifications' },
  { asked: 'users say they are getting the same alert five times because every team built their own notification logic', expect: 'notifications' },
  { asked: 'we need to check availability across google and outlook calendars and generate booking links with buffer times', expect: 'scheduling' },
  { asked: 'our sales reps are still going back and forth over email trying to find a time that works for a demo', expect: 'scheduling' },
  { asked: 'we need to turn a freeform address into lat and long and snap it to the nearest delivery zone', expect: 'maps-geo' },
  { asked: 'our delivery estimates are wrong because we are guessing straight line distance instead of using real routes', expect: 'maps-geo' },
  { asked: 'we are outgrowing our single postgres instance and need read replicas and automated failover without running it ourselves', expect: 'databases' },
  { asked: 'someone is on call every weekend just in case the database server we host ourselves falls over', expect: 'databases' },
  { asked: 'we want distributed tracing across our microservices so we can see where a slow request actually spends its time', expect: 'observability' },
  { asked: 'when something breaks in prod we are grepping through log files on three different servers trying to piece together what happened', expect: 'observability' },
  { asked: 'we need to generate a contract pdf from a template and collect a legally binding signature through an api', expect: 'documents-signature' },
  { asked: 'closing a deal still means printing a contract, signing it, scanning it, and emailing it back', expect: 'documents-signature' },
  { asked: 'we need a storefront with cart, inventory, and checkout that we can customize without building the whole thing from scratch', expect: 'commerce' },
  { asked: 'we are selling merch through a google form and manually invoicing people, it is not scaling at all', expect: 'commerce' },
  { asked: 'we need to manage ui strings across 12 locales without hardcoding them and let non-engineers update copy per language', expect: 'localization' },
  { asked: 'our german users keep complaining half the app is still in english after we supposedly launched there', expect: 'localization' },
  { asked: 'we need to programmatically provision subdomains for each new customer workspace and manage their dns records via api', expect: 'domains-dns' },
  { asked: 'setting up a new customer custom domain still means someone manually logging into the registrar to add records', expect: 'domains-dns' },
  { asked: 'our engineering team still tracks sprint work in a shared spreadsheet and we want boards with dependencies and assignees', expect: null },
  { asked: 'sales has no shared view of the deal pipeline, everyone just keeps their own list of who they talked to', expect: null },
  { asked: 'support requests come in through a shared inbox and there is no way to see who is handling what or how old a ticket is', expect: null },
  { asked: 'closing the books each month is still someone manually copying numbers between spreadsheets', expect: null },
  { asked: 'our checkout page takes forever to load for customers in singapore because everything is served from a single region in virginia', expect: null },
  { asked: 'we have api keys sitting in a .env file that has been committed to the repo more than once', expect: null },
  { asked: 'we want an alert the moment our checkout error rate creeps above its normal baseline', expect: null },
  { asked: 'we want people to type a question in plain english into the help center and get the right article back, not just keyword matches', expect: null },
]

/**
 * The third held-out set, written 2026-08-13 by a run told not to open lookup.ts, the routing
 * scripts or STATE.md, from the category list alone.
 *
 * Asked for on purpose after the measurement moved to HELD_OUT_2: at least twelve questions carry
 * a word that belongs to two categories at once, because ties are what routing actually fails on
 * and neither earlier set was built to press on them.
 */
export const HELD_OUT_3: Question[] = [
  { asked: 'users can upload a profile photo but anything over 5mb just times out, and we have no clean way to generate resized thumbnails afterward', expect: 'file-storage' },
  { asked: 'support keeps getting complaints that resumes attached to job applications vanish after a few days, we clearly need somewhere durable to keep them', expect: 'file-storage' },
  { asked: 'product wants a comment box inside the app where people can bold text, drop in links and add images, not just a bare textarea', expect: 'rich-text-editors' },
  { asked: 'the internal wiki pages our writers create look like plain text dumps and they keep asking for real formatting and inline images like a proper editor', expect: 'rich-text-editors' },
  { asked: 'we are rolling our own password hashing and cannot even tell from the logs who actually logged in versus who got silently blocked by our rate limiter', expect: 'auth' },
  { asked: 'enterprise prospects keep asking if we support single sign on before they will even start a trial', expect: 'auth' },
  { asked: 'our password reset messages land in spam half the time and we have zero visibility into open or bounce rates', expect: 'transactional-email' },
  { asked: 'customers say they never got their order receipt in their inbox and support has no way to check whether it even sent', expect: 'transactional-email' },
  { asked: 'we cannot answer which onboarding step people drop off at, there is no event tracking wired into the funnel at all', expect: 'product-analytics' },
  { asked: 'leadership wants to know which features actually get used before we invest more engineering time building on top of them', expect: 'product-analytics' },
  { asked: 'keyword matching on our support docs misses obvious paraphrases entirely, we want to rank passages by meaning using embeddings instead of exact words', expect: 'vector-search' },
  { asked: 'our chatbot keeps giving generic answers because it cannot pull the single most relevant paragraph out of thousands of help articles', expect: 'vector-search' },
  { asked: 'we need to handle recurring subscriptions with proration and failed card retries without building the dunning logic ourselves', expect: 'payments' },
  { asked: 'our checkout keeps declining valid cards for no clear reason and we are losing customers at the very last step', expect: 'payments' },
  { asked: 'we only find out about crashes when a user complains, nothing pages anyone when the app throws in production', expect: 'error-monitoring' },
  { asked: 'the app has been silently failing for a chunk of users and nobody on the team knew until a one star review mentioned it', expect: 'error-monitoring' },
  { asked: 'we want to turn on the new pricing page for 5 percent of visitors and instantly switch it back off if conversion tanks, without shipping a new build', expect: 'feature-flags' },
  { asked: 'marketing wants to show two variants of the homepage headline and see which one converts better without engineering shipping two separate versions', expect: 'feature-flags' },
  { asked: 'customers type sneaker into the product finder and get zero results for sneakers, typos and synonyms just are not handled at all', expect: 'search' },
  { asked: 'people say they cannot find what they are looking for on the site and give up, right now it only matches exact product titles', expect: 'search' },
  { asked: 'we need to send one time codes to phones and handle carrier delivery failures without building telecom integrations ourselves', expect: 'communications' },
  { asked: 'our delivery drivers need a way to call customers without exposing anyone real phone number', expect: 'communications' },
  { asked: 'marketing wants to edit the landing page copy and swap images themselves through some kind of editor, without waiting on an engineering deploy every time', expect: 'headless-cms' },
  { asked: 'we have blog content duplicated across the website, the mobile app and a partner site, and keeping all three in sync by hand is a mess', expect: 'headless-cms' },
  { asked: 'the csv export takes two minutes and locks up the request thread, it needs to run after the request returns and retry on its own if it fails', expect: 'background-jobs' },
  { asked: 'when a big customer signs up a dozen things need to happen behind the scenes like provisioning and welcome emails, and right now half of them silently get skipped', expect: 'background-jobs' },
  { asked: 'every api call to the provider for embeddings and completions gets billed separately and costs are spiraling with no caching layer in between', expect: 'llm-infrastructure' },
  { asked: 'we want to swap between different ai providers depending on cost and quality without rewriting our product every time one of them changes pricing', expect: 'llm-infrastructure' },
  { asked: 'we need adaptive bitrate playback for lesson videos so people on slow connections are not stuck buffering constantly', expect: 'video' },
  { asked: 'our course recordings are just sitting as giant files with no player and no way to see how much of it someone actually watched', expect: 'video' },
  { asked: 'we need to run a headless browser at scale to pull pricing data off competitor sites without getting blocked constantly', expect: 'browser-infrastructure' },
  { asked: 'the nightly competitor price check keeps breaking because the script cannot handle pages that load their content dynamically', expect: 'browser-infrastructure' },
  { asked: 'we want one system that fans a single update out to mobile alerts, an in app banner and the inbox depending on what the user has enabled', expect: 'notifications' },
  { asked: 'users miss important account updates because everything just goes to their inbox and half of them never open it', expect: 'notifications' },
  { asked: 'we need to show a rep real availability across three different calendars and let a customer book a slot without double booking anyone', expect: 'scheduling' },
  { asked: 'candidates book interview slots but there is no reminder before the call, and half of them just do not show up because they forgot', expect: 'scheduling' },
  { asked: 'we have raw addresses from a signup form and need to turn them into coordinates so we can plot them as pins on a map', expect: 'maps-geo' },
  { asked: 'customers keep entering addresses that do not actually exist and our delivery time estimates are garbage because of it', expect: 'maps-geo' },
  { asked: 'we are running postgres on a single box we manage ourselves and a failover during peak hours would mean real downtime', expect: 'databases' },
  { asked: 'the app gets slower every week as our user table grows and nobody wants to be the one on call for backups anymore', expect: 'databases' },
  { asked: 'when latency spikes we have no way to see which service in the chain is actually slow, we are just guessing and restarting things', expect: 'observability' },
  { asked: 'we only find out about slowdowns when a customer complains, there is no alert or dashboard showing system health in real time', expect: 'observability' },
  { asked: 'we need contracts to be legally signed online with a full audit trail of who signed what and when, not just a checkbox someone ticked', expect: 'documents-signature' },
  { asked: 'closing a deal takes an extra week because we are shipping paper contracts back and forth by courier just to get a signature', expect: 'documents-signature' },
  { asked: 'we want a full storefront with cart, catalog and checkout that we do not have to build and maintain from scratch', expect: 'commerce' },
  { asked: 'we are duct taping together five different tools to sell products online and none of them talk to each other properly', expect: 'commerce' },
  { asked: 'we hardcoded every string in english and now need to support french and japanese without a giant find and replace nightmare', expect: 'localization' },
  { asked: 'customers in germany keep saying the app clearly was not built with them in mind, prices, dates, everything reads wrong', expect: 'localization' },
  { asked: 'we need to buy a new domain and point its records at our hosting without waiting two days for propagation to sort itself out', expect: 'domains-dns' },
  { asked: 'a customer custom subdomain stopped resolving and support has no idea whether it is a records issue or something on our side', expect: 'domains-dns' },
  { asked: 'support requests pile up with no shared queue, no assignment and no way to tell who is handling what', expect: null },
  { asked: 'the team has no shared board to see who is working on what this sprint, everything lives in someone head or a random doc', expect: null },
  { asked: 'running payroll and tracking who is on leave is still a spreadsheet three people quietly maintain by hand', expect: null },
  { asked: 'leadership wants one dashboard that blends usage data, revenue and support tickets from six different tools, right now someone stitches it together by hand every monday', expect: null },
  { asked: 'we send a weekly roundup to everyone who signed up and want to see open rates and let people manage what they are subscribed to', expect: null },
  { asked: 'we want a little chat bubble on the website so a real person can talk to a visitor in real time before they bounce', expect: null },
  { asked: 'we have user data scattered across six different tools and want one unified profile per customer that everything else can read from', expect: null },
  { asked: 'images and static assets load painfully slowly for customers on the other side of the world no matter how much we compress them', expect: null },
]

/**
 * Written 2026-08-14 by an agent that was given the category list and nothing else: not the
 * vocabulary, not the phrase rules, not this repository. That distance is the point. HELD_OUT_3
 * stopped measuring the moment its failures were read and one of them fixed, and whoever has
 * read the rules cannot write an uncontaminated question about them.
 *
 * Eight of the thirty-four are labelled null on purpose: payroll, hiring, legal advice, a BI
 * dashboard and a shared inbox are outside every category we hold, and answering them at all
 * would hand a caller vendors with our name on it.
 */
export const HELD_OUT_4: Question[] = [
  { asked: 'users need to attach photos to an inspection report and we need somewhere to put them so they can be pulled back later, right now someone base64s them into a postgres column and the table is 40gb', expect: 'file-storage' },
  { asked: 'our support team writes help articles in a plain textarea in the admin panel and they keep asking for bold, headings and pasting screenshots straight in', expect: 'rich-text-editors' },
  { asked: 'i am tired of babysitting our own password hashing and session code, and now a big customer wants their people to get in through okta', expect: 'auth' },
  { asked: 'the password reset link never arrives for gmail users. we send from postfix on the same vps as the app and i suspect the ip is on a blocklist somewhere', expect: 'transactional-email' },
  { asked: 'nobody in the company can tell me how many signups actually finish onboarding versus quit at the company details step', expect: 'product-analytics' },
  { asked: 'we have 40k historical support tickets and i want to pull up the ones that mean roughly the same thing as a new one even when the wording has nothing in common', expect: 'vector-search' },
  { asked: 'finance chases wire transfers every month and we want the app to just charge the card, handle plan upgrades mid-cycle and dunning when it fails', expect: 'payments' },
  { asked: 'we found out checkout had been throwing 500s for three days because a user emailed us a screenshot. that is not a great way to run a shop', expect: 'error-monitoring' },
  { asked: 'we want the redesigned dashboard live for 5% of accounts first, and be able to kill it instantly without waiting for a deploy', expect: 'feature-flags' },
  { asked: 'our docs site is 3000 pages and the only way to find anything is ctrl+f on whatever page you happen to be on. we want a box at the top that tolerates typos and filters by product', expect: 'search' },
  { asked: 'we need to text the customer a code when the driver pulls up, and older clients keep asking for an actual phone call instead', expect: 'communications' },
  { asked: 'marketing pings us to change a headline on the homepage and it turns into a pull request and a deploy every single time', expect: 'headless-cms' },
  { asked: 'the monthly export takes about four minutes to build so the request times out, and separately it should just run itself at 3am and land in the inbox', expect: 'background-jobs' },
  { asked: 'we call three different model providers, each with its own sdk and rate limits, and no one can tell me what we spent last week or fail over when one is down', expect: 'llm-infrastructure' },
  { asked: 'coaches upload 2gb training recordings and playback stutters badly on phones. we need it to degrade gracefully on a bad connection instead of buffering forever', expect: 'video' },
  { asked: 'we pull prices off 200 retailer sites every night. half of them render everything client side and the rest ban our ip after twenty minutes', expect: 'browser-infrastructure' },
  { asked: 'every feature team rolled their own alerts so a user gets a push, an email and an in-app badge for the same comment. we want one place that respects preferences and can batch the noise into a daily summary', expect: 'notifications' },
  { asked: 'clients pick a slot with our consultants over email ping-pong, timezones get mixed up constantly and we double booked someone twice last week', expect: 'scheduling' },
  { asked: 'we store delivery addresses as free text and now we need pins on a screen plus a rough drive time between stops', expect: 'maps-geo' },
  { asked: 'our postgres lives on a droplet someone spun up in 2019, backups have never been restore-tested and nobody on the team wants to own the version upgrades', expect: 'databases' },
  { asked: 'checkout was slow last tuesday and we still cannot say which service ate the time. logs sit on three different machines and we grep them over ssh', expect: 'observability' },
  { asked: 'contracts get printed, signed with a pen, scanned crooked and emailed back, and then someone retypes the dates into the crm', expect: 'documents-signature' },
  { asked: 'we sell about 40 physical products off a wordpress page with a paypal button. we need a real cart, stock counts and shipping options per country', expect: 'commerce' },
  { asked: 'we are opening in france and japan next quarter. every string is hardcoded in the components and the copy team works out of a google sheet', expect: 'localization' },
  { asked: 'the product is being renamed so we need the new address registered and the mail records pointing at the right place before the announcement', expect: 'domains-dns' },
  { asked: 'each order should produce a filled-in pdf with the customer details and line items, right now someone edits a word template by hand and exports it', expect: 'documents-signature' },
  { asked: 'half the team logs hours in a spreadsheet and the 25th of every month is chaos for whoever runs the transfers', expect: null },
  { asked: 'we need somewhere to keep track of who is doing what this sprint. jira feels absurd for six people but the whiteboard is not working either', expect: null },
  { asked: 'the board wants a weekly revenue by region chart and right now i export csvs from three systems and pivot them by hand on sunday night', expect: null },
  { asked: 'everything lands in a shared gmail and two people end up replying to the same customer with different answers', expect: null },
  { asked: 'we are getting 60 applications per opening and screening them in a spreadsheet with colour coding. it does not scale', expect: null },
  { asked: 'our contractor agreements need someone who actually knows german employment law to look at them before we take anyone on there', expect: null },
  { asked: 'honestly the whole stack feels dated and slow, we have some budget this quarter, what should we be looking at', expect: null },
  { asked: 'the accountant keeps asking for receipts nobody can find and vat is due next friday', expect: null },
]

/**
 * The fifth set, 2026-08-17. Written by an agent with no access to this repository and no sight of
 * the category list, six of the forty deliberately not about buying anything, translated to English
 * by a second agent told not to introduce any category noun. Labelled before the first run and the
 * labels committed first, in harness/heldout/2026-08-17.json.
 *
 * The three questions that could honestly go either way (in-app chat, GDPR document storage, agent
 * tracing) carry their primary reading here, because the build check compares one number and an
 * "either" would let it pass on the reading that happens to be convenient.
 */
export const HELD_OUT_5: Question[] = [
  { asked: 'We have Node and Postgres, and we want users to be able to upload profile photos and have them served fast in Europe and the US. What do you recommend instead of keeping the files on the machine\'s disk?', expect: 'file-storage' },
  { asked: 'We\'re building a B2B SaaS in Rails and enterprise customers are starting to ask about logging in with their company account and about enforcing MFA. I don\'t want to maintain SAML myself.', expect: 'auth' },
  { asked: 'I need to send transactional emails (password reset, order confirmation) from a Django app, around 50k a month, and have them not land in spam. How do I hook that up?', expect: 'transactional-email' },
  { asked: 'I have an endpoint that generates a PDF report and takes 40 seconds, and the browser disconnects. I\'m wondering whether to turn it into a queue in my own code with a jobs table in Postgres, or use a separate worker.', expect: null },
  { asked: 'A mobile app is supposed to sell monthly and yearly subscriptions, with a 14-day trial and VAT invoices for EU companies. We don\'t want to touch card data.', expect: 'payments' },
  { asked: 'Our Go backend crashes once every few days and we find out about it from customers. I\'d like to get a stack trace with the request context right after the exception, instead of digging through journalctl.', expect: 'error-monitoring' },
  { asked: 'We have 200k support documents and we want a chat to answer based on them with source citations. What should we use to store and search embeddings if we already have Postgres?', expect: 'vector-search' },
  { asked: 'We need to verify a user\'s identity at signup: an ID scan plus a selfie, KYC requirements for a fintech in Poland. How is that usually wired into the signup flow?', expect: null },
  { asked: 'We want users to get push notifications on iOS and Android as well as in-app, from one place and respecting per-channel preferences. Which parts of that are worth writing ourselves?', expect: 'notifications' },
  { asked: 'I have a function that computes the similarity of two lists of tags and at 10k records it takes 3 seconds. How do I rewrite it so it\'s linear instead of O(n^2)?', expect: null },
  { asked: 'Startup, a Next.js app, marketing wants to edit the copy and the blog themselves without a deploy. The backend is in a separate repo and we don\'t want to let them into the code.', expect: 'headless-cms' },
  { asked: 'We need to accept payments from customers in Brazil and India, local methods like PIX and UPI, and our current processor doesn\'t support that. What should I be looking for?', expect: 'payments' },
  { asked: 'We collect product events from the frontend and the backend and we want to see the signup funnel and cohort retention, without building our own warehouse stack up front.', expect: 'product-analytics' },
  { asked: 'In our repo we have a billing module and a subscriptions module, both touch the same table and they keep getting in each other\'s way. Split it into two services or make one domain layer?', expect: null },
  { asked: 'A video editing app, the user uploads a 2 GB file from the browser and we need transcoding to several resolutions plus thumbnails. What do we do about that pipeline?', expect: 'video' },
  { asked: 'We want to add chat between users in the app, with message history, read receipts and a typing indicator. Writing that on raw WebSockets feels like a trap to me.', expect: 'communications' },
  { asked: 'We need to ship feature flags so we can enable a feature for 5% of users and do killswitches without a deploy, split by environment and with an audit of changes.', expect: 'feature-flags' },
  { asked: 'We have a PHP monolith and we want decent logs with the ability to search by trace_id for 30 days. Right now it\'s files on three machines and grep over ssh.', expect: 'observability' },
  { asked: 'We\'re building a tool that should answer questions about customer data and call our API. I\'m thinking about the model: is fine-tuning even needed, or is tool calling enough?', expect: 'llm-infrastructure' },
  { asked: 'We need to send SMS with a one-time code to users in a dozen or so countries and have decent deliverability plus a voice call fallback.', expect: 'communications' },
  { asked: 'Our e2e tests in CI take 45 minutes because everything runs sequentially on one machine. Is it worth splitting it into shards at an external provider, or is a bigger runner enough?', expect: null },
  { asked: 'I have a form component in React with seven useEffects that trigger each other and the state gets lost. How do I redesign it into a reducer or a state machine?', expect: null },
  { asked: 'Online store, we want to show prices and charge tax correctly for customers in the EU, US and UK, including VAT number validation. We don\'t want to maintain our own rate tables.', expect: null },
  { asked: 'Our app already has an English interface, we\'re entering four markets and the translators work in Excel. I\'m looking for a sensible workflow so the strings don\'t drift out of sync with the code.', expect: 'localization' },
  { asked: 'Enterprise customers require SOC 2 from us, and we\'re 8 people with zero processes. Where do we start so we don\'t do all that paperwork by hand?', expect: null },
  { asked: 'We need to sync our users\' data with their CRMs and support tools, every customer wants a different one. We don\'t have a team to write 20 integrations.', expect: null },
  { asked: 'Our frontend makes 300 requests per second to the API and we want to rate limit per API key and fend off bots. Should that be done in the application code or a layer above?', expect: null },
  { asked: 'We have to store customer documents in a GDPR-compliant way, with retention and the ability to permanently delete on request, with the backend on AWS in an EU region.', expect: 'file-storage' },
  { asked: 'We\'re building a logistics app, we need to show a courier\'s route on a map, compute ETAs and geocode addresses with typos. What\'s a sensible option for a few hundred thousand requests a month?', expect: 'maps-geo' },
  { asked: 'I\'m wondering whether our API should return a cursor or an offset for paginating an orders list that users sort by date and status. The data changes often.', expect: null },
  { asked: 'We have a warehouse on BigQuery and we want to give customers dashboards embedded in our app, with per-tenant data isolation. Build our own charts or embed something ready-made?', expect: null },
  { asked: 'Our onboarding requires signing a contract, right now we email a PDF and wait for a scan. I\'d like to have it in the product, with a legally valid signature and a webhook after signing.', expect: 'documents-signature' },
  { asked: 'The app is supposed to generate images for posts based on the user\'s description, a few hundred a day, with content moderation. How do I hook that up to a Python backend?', expect: 'llm-infrastructure' },
  { asked: 'We deploy containers on a single machine with docker compose and that\'s no longer enough, but we don\'t have anyone who knows Kubernetes. I\'m looking for something where a push to main just puts the app up.', expect: 'app-hosting' },
  { asked: 'Users report that the app is sluggish for them, and we don\'t know on which screen. I\'d like to have session recordings, or at least real user metrics from the browser.', expect: null },
  { asked: 'We have an events table with 400M rows in Postgres and date range queries are slow. Partition by month or is adding a BRIN index enough?', expect: null },
  { asked: 'We want to add product search with suggestions, typos, and filters by category and price. Right now we have LIKE in Postgres and it doesn\'t work.', expect: 'search' },
  { asked: 'Our AI agent is supposed to run in a loop and call tools, and we can\'t see what it\'s doing when it returns nonsense. I need tracing of prompts, costs and which step failed.', expect: 'llm-infrastructure' },
  { asked: 'We\'re adding CSV data export to the product and users report that Polish characters break for them in Excel. Fix the encoding on our side or change the output format?', expect: null },
  { asked: 'We collect customers\' secrets and API keys for integrations and right now they sit encrypted in our database. I\'d rather not be responsible for storing them.', expect: null },
]

/**
 * The sixth set, 2026-08-17, written the same blind way and in English from the start, six of the
 * forty deliberately not about buying anything and several deliberately niche. Labelled before the
 * first run, in harness/heldout/2026-08-17-b.json.
 *
 * This one is the measurement for the evidence threshold added to categoryForJob. The fifth set
 * was the development set for it: the threshold was chosen by sweeping five values across all
 * five sets that existed then, and this set had not been written yet when it was chosen.
 */
export const HELD_OUT_6: Question[] = [
  { asked: 'We\'re on Node with Postgres and we want users to be able to upload a profile picture and a couple of documents per account. Right now everything sits on the app server\'s disk which obviously breaks the second we run two instances.', expect: 'file-storage' },
  { asked: 'Our Rails app sends password resets and receipts from a plain SMTP box on our own VPS and half of them land in spam. What should we be doing instead?', expect: 'transactional-email' },
  { asked: 'I need to let people log in with Google and with their work email, plus we have an enterprise customer asking for SAML. I really don\'t want to write the SAML part myself.', expect: 'auth' },
  { asked: 'I have a function that merges overlapping time ranges for a booking calendar and it\'s O(n^2) because I compare every pair. What\'s the clean way to do this in one pass after sorting?', expect: null },
  { asked: 'Our marketplace takes payments from buyers in the EU and US and we need to pay out sellers weekly, holding funds in between. What do we need for this and what are we walking into legally?', expect: 'payments' },
  { asked: 'Search on our product catalogue is a bunch of ILIKE queries against Postgres and it\'s useless for typos and synonyms. 400k products, updated a few thousand times a day.', expect: 'search' },
  { asked: 'When our API 500s in production we find out from a customer email. I want stack traces with the request context grouped by release, ideally with alerting.', expect: 'error-monitoring' },
  { asked: 'We\'re rolling out a rewritten checkout and I want to turn it on for 5% of users, then internal staff only, then everyone, without redeploying every time.', expect: 'feature-flags' },
  { asked: 'A query joining orders to order_items and users takes 8 seconds. EXPLAIN ANALYZE shows a seq scan on order_items even though there\'s an index on order_id. Why is the planner ignoring it?', expect: null },
  { asked: 'We\'re building an in-app chat between customers and support agents and I\'d rather not run my own websocket fleet. Needs presence, typing indicators, history.', expect: 'communications' },
  { asked: 'Our app needs to send an SMS code when someone signs up, worldwide, and we keep getting hit by bots burning through our balance from Vietnam and Indonesia.', expect: 'communications' },
  { asked: 'I want to know which features people actually use in our dashboard. Currently we have nothing, just server logs. Small team, no analyst.', expect: 'product-analytics' },
  { asked: 'We need to generate invoices as PDFs with our layout, a few thousand a month, and archive them. Doing it with headless Chrome in a Lambda is flaky and slow to cold start.', expect: 'browser-infrastructure' },
  { asked: 'We have a Python service that runs long imports and I need to schedule and retry them with visibility into what failed. Right now it\'s cron plus a table with a status column and it\'s a mess.', expect: 'background-jobs' },
  { asked: 'We ship a SaaS to a few German customers and now they need e-invoicing that satisfies their local requirements, plus archiving for ten years. No idea where to start.', expect: null },
  { asked: 'We have two internal packages that both do date formatting, one built on the native Intl API and one wrapping a library. I want to kill one of them. How do I decide which and how do I migrate 300 call sites safely?', expect: null },
  { asked: 'Users are uploading photos to public listings and we\'ve already had two dick pics. We need something to flag nudity and obvious garbage before it goes live.', expect: null },
  { asked: 'Our onboarding needs the user to take a photo of their ID and a selfie so we can be reasonably sure they\'re a real person. Regulated fintech, so it has to hold up under audit.', expect: null },
  { asked: 'I want to add semantic search over about 200k support articles and feed the top hits into an LLM answer. Do I need a dedicated store for the embeddings or can I keep them next to the rest of my data?', expect: 'vector-search' },
  { asked: 'We\'re building a feature that summarises meeting notes. I need something to actually run the model calls at reasonable cost and latency, and I\'d rather not host weights myself.', expect: 'llm-infrastructure' },
  { asked: 'Our users want to see their properties on a map with clustering, and we need to turn free-text addresses into coordinates on import. Roughly 50k lookups a month.', expect: 'maps-geo' },
  { asked: 'We do B2B SaaS with annual contracts, seats, mid-cycle upgrades and the occasional custom deal. Our billing is hand-rolled and proration has been wrong twice this quarter.', expect: 'payments' },
  { asked: 'Two workers occasionally process the same job because our SELECT ... then UPDATE isn\'t atomic. Should I use SELECT FOR UPDATE SKIP LOCKED or an advisory lock here, and what are the tradeoffs?', expect: null },
  { asked: 'Support keeps asking me what the user actually did before the error. I want to be able to watch the session back, with input fields masked.', expect: 'product-analytics' },
  { asked: 'Our customers want to connect their bank accounts so we can categorise transactions. Poland and Germany initially, more of the EU later.', expect: 'payments' },
  { asked: 'We push webhooks to about 900 customer endpoints and half of them are unreliable. I\'m sick of maintaining our own retry, signing and dead-letter logic.', expect: 'notifications' },
  { asked: 'Need to send contracts for signature from inside our app, with a legally solid audit trail, and get a callback when they\'re signed.', expect: 'documents-signature' },
  { asked: 'Our marketing site and app assets are served straight from the origin in Frankfurt and Australian users complain it\'s slow. Static files mostly, some images that need resizing on the fly.', expect: 'file-storage' },
  { asked: 'We have a Kubernetes cluster and secrets are currently base64 in a git-crypt repo. I want proper rotation and short-lived database credentials.', expect: null },
  { asked: 'Customers upload MP4s and we need to transcode them, serve adaptive streaming and stop people from just downloading the file. Fitness app, videos are the product.', expect: 'video' },
  { asked: 'Our React app re-renders the whole table when one cell changes. I\'ve thrown memo at it and it didn\'t help. How do I find what\'s actually causing it?', expect: null },
  { asked: 'We need to translate our UI into six languages and keep the strings in sync as we ship. Devs shouldn\'t have to chase translators over email.', expect: 'localization' },
  { asked: 'Something to tell me when the site is down from outside our own infra, with a status page customers can look at. Nothing fancy.', expect: 'observability' },
  { asked: 'We ingest scanned delivery notes as PDFs and someone types the line items into our system by hand. I want a machine to read them, including handwritten quantities.', expect: null },
  { asked: 'Our logs go to files on three EC2 boxes and grepping across them during an incident is painful. Maybe 40GB a day, we need 30 days searchable.', expect: 'observability' },
  { asked: 'We\'re building a fleet dashboard for inland barges and need live vessel positions and ETAs on European rivers. Is there any usable feed for that or are we stuck with our own trackers?', expect: null },
  { asked: 'Our sales team wants product usage numbers in the same place as the CRM data, and my current answer is a nightly script that dumps CSVs. There has to be something better.', expect: null },
  { asked: 'I need to compute a running median over a sliding window of the last 1000 latency samples, in Go, without allocating on every push. What data structure should I reach for?', expect: null },
  { asked: 'We\'re selling a desktop app and need to sign the Windows binaries with a certificate that lives in hardware, because the rules changed and a file on disk isn\'t accepted anymore.', expect: null },
  { asked: 'Users book slots with our consultants and we want the booking to land in the consultant\'s own calendar and respect their existing busy times, across Google and Outlook.', expect: 'scheduling' },
]
