import { AGENT_UA, BROWSER_UA, fetchUrl, registrableDomain, isBotChallenge, isEdgeRefusal, fetchWithRetries, inParallel, isRealTextFile, looksLikeHtml, stripCodeBlocks, timeLeftMs, visibleTextLength, type Fetched } from './http'

export const AGENT_ENTRY_PATH_COUNT = 9

/** Asked only when the lower-case set came back empty, so it costs nothing where a file exists. */
export const UPPERCASE_ENTRY_PATHS = ['/AGENTS.md', '/SKILL.md', '/AGENT.md'] as const

export const AGENT_ENTRY_PATHS = [
  '/agent-signup.md',
  '/skill.md',
  '/agents.md',
  '/agent.md',
  '/ai.txt',
  '/.well-known/agent-access.json',
  '/.well-known/mcp.json',
  '/.well-known/agent.json',
  '/.well-known/ai-plugin.json',
]

/**
 * Bare vendor tokens, not CDN hostnames. Stripe's signup carries "show_hcaptcha":true in the
 * server HTML and never mentions hcaptcha.com until JS runs, so hostname matching awarded a
 * point for the exact gate this check exists to find.
 */
const CAPTCHA_SIGNATURES: Record<string, RegExp> = {
  recaptcha: /recaptcha/i,
  hcaptcha: /hcaptcha/i,
  turnstile: /turnstile|cf-chl/i,
  arkose: /arkoselabs|funcaptcha/i,
}

/**
 * Not CAPTCHAs, and deliberately not scored as any. These are bot-defence SDKs that decide in the
 * background whether a request is a person, with no widget to solve and nothing visible to fail.
 * resend.com and turbopuffer.com both ship Kasada's client on every page including signup, and
 * both pass the CAPTCHA check honestly: there is no CAPTCHA there.
 *
 * What we did not do is submit the form, so we do not know whether an unattended request gets
 * through, and a check that failed them on this would be claiming a measurement we never made.
 * It is reported next to the pass instead, because a reader deciding where to send an agent
 * deserves to know the layer is there.
 */
const BOT_DEFENCE_SIGNATURES: Record<string, RegExp> = {
  kasada: /\bKPSDK\b|kasada/i,
  datadome: /datadome/i,
  perimeterx: /perimeterx|px-captcha/i,
}

/**
 * The ways a vendor says an agent can make its own credentials. Each one covers the words
 * for a credential rather than one spelling of it: LaunchDarkly documents creating an access
 * token at /docs/api/access-tokens and never writes "api key" on the page, and a rule that only
 * knew that spelling read their API reference as silence.
 */
// Separator-tolerant on purpose: `access_token` in a code sample is the same noun as "access
// token" in the sentence above it, and `[- ]` saw neither. The spellings after the first four
// come from an audit of what the vendors we failed actually write: mux.com issues a signing key,
// tigrisdata.com an access key, planetscale.com a service token, medusajs.com a publishable key.
// Every one of them documents creating it through an API, and every one read as silence.
const CREDENTIAL = String.raw`(?:api[-_ ]?key|api[-_ ]?token|access[-_ ]?token|personal[-_ ]?access[-_ ]?token|service[-_ ]?account|auth[-_ ]?token|secret[-_ ]?key|access[-_ ]?key|service[-_ ]?token|signing[-_ ]?key|publishable[-_ ]?key|client[-_ ]?key|licen[cs]e[-_ ]?key|project[-_ ]?token)`

/**
 * Anything that makes a sentence about a machine rather than about a person at a screen. The
 * creation phrase alone counts a dashboard: loops.so writes "click Generate key. This creates an
 * API key", which is documented key creation and is not what a check called programmatic
 * provisioning is asking about.
 */
// `request` was in this list and it is the word every documentation page uses about the call you
// make *after* you have a key. plausible.io says "log in, click the New API Key button" and then
// "authenticate your request", which matched, so the one vendor in the sample whose keys really
// are dashboard-only would have been published as passing. A POST or a curl in the same sentence
// still carries the real cases, including "send a POST request to /v1/api_keys".
const PROGRAMMATIC_MARKER = String.raw`(?:(?:via|through|using|with) the api|(?:management|admin|account|provisioning|rest|public)[ -]api|\bcurl\b|\bPOST\b|\bGET\b|/v\d|\bCLI\b|\bSDK\b|endpoint|programmatic\w*|on (?:your|its|their) behalf)`

/**
 * Any character except the full stop that ends a sentence, so the window stays inside one
 * sentence without breaking on a URL. `[^.]` cannot do both: it cuts
 * `curl -X POST https://api.example.com/keys creates an api key` at "example", which is exactly
 * the sentence the marker exists to recognise.
 */
const SAME_SENTENCE = String.raw`(?:(?!\.\s)[\s\S])`

const CREATES_A_CREDENTIAL = String.raw`creat(?:e|es|ing)(?:\s+(?:and|or)\s+\w+)?\s+(?:an?|your|a new|new|the)?\s*${CREDENTIAL}`

/**
 * Three of the rules below are bare noun phrases, and a noun phrase is a name rather than a path.
 * The reseed of 9.31 stored the words each match stood on, and reading all 28 rows credited on
 * nothing else showed what a bare phrase actually catches: "Media management API integration"
 * (imagekit.io), "Content Delivery API Management API Image Service" (storyblok.com), "Permissions
 * Manager - permissions management API" (plaid.com), "Important Change to the Twilio Phone Number
 * Provisioning API" (sendgrid.com), "[Account API]: Retrieve account details" (usefathom.com) and
 * a customer testimonial on auth0.com. Navigation lists and a different sense of "management".
 *
 * So a bare phrase now has to be corroborated inside the same window we quote: either a credential
 * is named beside it, or something is created rather than merely managed. The window is the rule
 * rather than the whole page on purpose - it makes the sentence we publish carry its own evidence,
 * so a vendor reading the quote can see what earned the point instead of taking our word for it.
 */
const BARE_PROVISIONING_INDEXES = new Set([0, 1, 2])

const NAMES_A_CREDENTIAL =
  /\b(?:api[-_ ]?keys?|api[-_ ]?tokens?|access[-_ ]?(?:tokens?|keys?)|personal access tokens?|secret[-_ ]?keys?|credentials?|service accounts?|auth tokens?|bearer tokens?)\b/i

/** Something is brought into existence, in either word order, rather than administered. */
const MAKES_SOMETHING =
  /\b(?:creat\w+|generat\w+|provision(?:s|ed|ing)?|issu\w+|add(?:s|ed|ing)?|register\w*)\b[^.]{0,40}\b(?:accounts?|users?|keys?|tokens?|tenants?|organi[sz]ations?|workspaces?|projects?)\b|\b(?:accounts?|users?|keys?|tokens?|tenants?|organi[sz]ations?|workspaces?|projects?)\b[^.]{0,40}\b(?:creation|creat\w+|generat\w+|provision(?:s|ed|ing)?|issu\w+)\b/i

const PROVISIONING_PATTERNS = [
  /management api/i,
  /provisioning api/i,
  /account api/i,
  // "create and manage API keys" is the commonest way this is written and the conjunction was
  // enough to hide it: docs.stripe.com/keys/managed-api-keys says a platform "can create and
  // manage API keys on your behalf" and we published Stripe as documenting no path at all. Only
  // a conjunction is allowed through, not arbitrary text, because "create a customer with an api
  // key" is about spending a credential rather than making one.
  new RegExp(
    String.raw`${PROGRAMMATIC_MARKER}${SAME_SENTENCE}{0,80}${CREATES_A_CREDENTIAL}` +
      String.raw`|${CREATES_A_CREDENTIAL}${SAME_SENTENCE}{0,80}${PROGRAMMATIC_MARKER}`,
    'i',
  ),
  // Either order, and the credential has to be the thing being created, in both directions. Three
  // sentences in the corpus say the words and mean something else: agora.io's "creating projects
  // and retrieving usage data programmatically", nylas.com's "create accounts programmatically",
  // and hatchet.run's heading "Programmatically Creating Cron Triggers". The last one got through
  // a first fix that only guarded the reversed order, and it took a reseed and a reading of what
  // had matched to find it, because the number alone looked like the widening working.
  new RegExp(
    String.raw`creat\w+[^.]{0,30}${CREDENTIAL}[^.]{0,30}programmatically|programmatically[^.]{0,30}creat\w+[^.]{0,30}${CREDENTIAL}`,
    'i',
  ),
  // Not "self-service account", which is the opposite thing: a person signing themselves up. It
  // credited auth0.com two points from a comparison table row reading "Self-service accounts,
  // testing scenarios", which is what quoting the match made visible on the first domain tried.
  /(?<!self[-\s])service account/i,
  new RegExp(String.raw`/v\d+/(?:api[-_]keys|access[-_]tokens)`, 'i'),
]

/** Only signals that actually mean "an agent can finish without a human or a card". */
export const SELF_SERVE_PATTERNS = [
  /no credit card/i,
  /\bno card\b/i,
  /(?<!no )free tier/i,
  /(?<!no )free plan/i,
  // A trial an agent can start is an answer to this check whether or not the page states its
  // length. Demanding the day count read as "no free tier" on four vendors that offer one:
  // elastic.co says "Start free trial" and sendlayer.com "free trial (send up to 200 emails)",
  // and both let an agent finish in the session it started.
  /\bfree trial\b/i,
  /\bfree account\b/i,
  // Separator-tolerant, because the wording varies and the meaning does not: signoz.io writes
  // "Get Started - Free", here.com and elastic.co "get started for free".
  /\bget started\b[\s-]*(?:for\s+)?free\b/i,
  /\bstarted? for free\b/i,
  /free forever/i,
  /forever free/i,
  // A decimal comma is a decimal point. strapi.io lists "+$0,60 per GB" and was published as
  // having a free tier because of it, while its cheapest plan is $35 a project a month.
  /\$0(?:\.00)?(?![.,\d])/,
  // "Try for free" is the commonest phrasing of all and matched nothing: replicate.com says it
  // four times and sinch.com three, and both were published as having no free-tier wording.
  /\btry (?:it |out )?(?:for )?free\b/i,
  // A recurring allowance is a free tier by another name: agora.io grants the first 10,000
  // minutes free every month and was published as having no free tier.
  /\bfree every month\b/i,
  // Substance rather than chrome: openrouter.ai's tier is a row of free models, and no button
  // anywhere says "free credits".
  /\bfree\s+(?:models|credits|usage|allowance|minutes|requests)\b/i,
  /free and open[- ]source/i,
  // A tier you start on and pay for later, which is a statement about pricing and not a button.
  // pinecone.io was published as having no free tier while its page says "Create your first index
  // for free, then pay as you go" and its Starter row's price is the word Free.
  //
  // The tenth pass blamed the imperative rule for that failure, and reproducing it says otherwise:
  // the only two matches on the whole page were "Free Trial" after "Start ", and both substantive
  // signals matched no pattern at all. The plan-row pattern below wants the tier name within 24
  // characters of "free" and pinecone puts a full sentence between them. Widening it to 80 and
  // across sentence boundaries also fixes this row and nothing else in the corpus, which is a
  // reason to distrust it rather than to ship it: it would let a tier name in one sentence pair
  // with a "free" in an unrelated one.
  /\bfree\b[^.]{0,40}\bpay as you go\b/i,
  // The row of a pricing table, where the tier is named and the price is the word Free.
  // polar.sh writes "Starter Free", saleor.io "Sandboxes Forever Free", pusher.com
  // "Sandbox Free", and none of them says the words "free tier" anywhere on the page.
  /\b(?:starter|sandbox|hobby|developer|basic|community|open[- ]source)\b[^.\n]{0,24}\bfree\b/i,
  /\bfree\s+\w+\s+plan\b/i,
  // How a pricing table names a tier that costs nothing, in the two spellings our list missed.
  // calendly.com writes "Free For personal use Always free" and algolia.com "Free to start, then
  // pay as you go", and neither of them says "free tier" or "free plan" anywhere.
  /\balways free\b/i,
  /\bfree to start\b/i,
]

/**
 * The subset of the wording above that is a button rather than a statement. "Get started for
 * free" is what a navigation bar says; "10,000 free minutes a month" and "Free Tier Free forever"
 * are what a page says about its tiers. The distinction decides one thing only: whether a hit on
 * a page that prints no price is evidence about the vendor or about their navigation. here.com
 * serves the first kind and nothing else, daily.co and qdrant.tech serve the second.
 */
/**
 * Whether every free-tier signal on the page is a button rather than a statement, decided by what
 * precedes the words rather than by which pattern matched. A phrase list could not do it: june.so
 * says "Start free trial" once and nothing else, and `free trial` is a statement pattern, so no
 * list of button phrases could mark that page as chrome without also marking every real trial.
 *
 * An imperative in front of the words is what makes them a control. "Start free trial" is a
 * button; "14 day free trial, no card required" is a fact about the product.
 */
const IMPERATIVE_BEFORE = /(?:start|try|get|sign\s*up|signup|create|begin|launch|claim)\s+(?:your\s+|a\s+|it\s+|out\s+|for\s+)*$/i

/** Some patterns carry the verb themselves, so the match is the button and nothing precedes it. */
const IMPERATIVE_LEADS = /^(?:start|try|get|sign\s*up|signup|create|begin|launch|claim)\b/i

export function everyFreeSignalIsAButton(patterns: RegExp[], text: string): boolean {
  let sawAny = false
  for (const pattern of patterns) {
    const global = new RegExp(pattern.source, `${pattern.flags.replace('g', '')}g`)
    for (const match of text.matchAll(global)) {
      sawAny = true
      if (IMPERATIVE_LEADS.test(match[0])) continue
      const before = text.slice(Math.max(0, (match.index ?? 0) - 24), match.index)
      if (!IMPERATIVE_BEFORE.test(before)) return false
    }
  }
  return sawAny
}

/**
 * An interrogative word has to stand close in front of the match, not merely somewhere before the
 * next question mark. Without it a pricing table carries the rule away: pusher.com's "Sandbox
 * Free" and four "$0" cells on workos.com sit in runs of table text with no punctuation at all
 * until a question further down the page, and a distant mark would make questions of them.
 *
 * Bounded and not anchored to a sentence start, because an accordion has no sentence starts: the
 * headings on savvycal.com run together as "Frequently Asked Questions Do you offer a free
 * trial? How does company billing work?" with nothing between them to break on.
 */
const QUESTION_BEFORE = /\b(?:do|does|did|is|are|was|were|can|could|will|would|should|shall|may|might|have|has|what|how|why|when|where|which|who)\b[^.!?]*$/i

/**
 * Whether every free-tier signal on the page stands inside a question. An FAQ heading is a
 * question the vendor asks, not an answer they give: savvycal.com's only free-tier wording is
 * "Do you offer a free trial?" and xata.io's is "Is there a free tier?", and on both pages the
 * accordion is collapsed, so the served HTML carries the question and no answer at all. We were
 * scoring the fact that the page raises the subject.
 *
 * A page that does answer keeps its point without any answer parsing here, because an answer that
 * confirms a free tier says the words again outside the question, and that second match is not
 * interrogative. An answer of a bare "Yes." loses the point, and that is the known cost.
 */
export function everyFreeSignalIsAQuestion(patterns: RegExp[], text: string): string | null {
  let asked: string | null = null
  for (const pattern of patterns) {
    const global = new RegExp(pattern.source, `${pattern.flags.replace('g', '')}g`)
    for (const match of text.matchAll(global)) {
      const at = match.index ?? 0
      const rest = text.slice(at + match[0].length)
      const closesAt = rest.search(/[.!?\n]/)
      const closer = closesAt === -1 ? '' : rest[closesAt]
      const before = text.slice(Math.max(0, at - 60), at)
      const opener = before.match(QUESTION_BEFORE)
      if (closer !== '?' || !opener) return null
      asked ??= `${before.slice(opener.index)}${match[0]}${rest.slice(0, closesAt + 1)}`
    }
  }
  return asked
}
// Weighted rather than a bare list of types, which reads to a strict server as a demand:
// plausible.io answers 406 to "text/markdown, application/json, text/plain" and savvycal.com
// answers 500, and we counted both as refusals of nine paths that return nine clean 404s. With
// a catch-all at lower weight both answer honestly and a real file still arrives as markdown.
// Per suffix, because asking for markdown is how we stopped seeing a JSON file. sentry.io
// content-negotiates: ask it for text/markdown and every path answers with the same 976 byte
// markdown page, including /.well-known/mcp.json, which is really 106 bytes of JSON naming
// their MCP server. We were handed a catch-all because we asked for one.
const entryAccept = (path: string) =>
  path.endsWith('.json')
    ? 'application/json;q=1, text/plain;q=0.8, */*;q=0.5'
    : 'text/markdown, text/plain;q=0.9, */*;q=0.5'

/**
 * What separates a file an agent can act on from one that only states a policy: something to
 * authenticate with, somewhere to send a request, or a way to get an account. Deliberately
 * generous, because the check is about whether the file was written for a machine at all.
 */
const PROCEDURE_SIGNALS =
  /api[- ]?key|api[- ]?token|access[- ]token|service[- ]token|service[- ]account|credential|bearer|authorization|endpoint|curl |POST https?:|sign[- ]?up|register|base[- ]?url/i

/**
 * Two different signals, because one word is too easily a false friend. Read across the twelve
 * files scoring the full two points: ten name five to ten different things an agent needs, and
 * the two that rest on a single word both mean something else by it. neon.com/skill.md matches
 * `endpoint` three times, every one of them "each branch has its own compute endpoint", which is
 * a Postgres host and not somewhere to send a request. pinecone.io/agents.md matches `curl ` once
 * and it is `curl -fsSL https://pinecone.io/install.sh | sh`, an install script inside what is
 * otherwise an index of links. Both keep the point for having a file; neither describes a
 * procedure. The three files scoring one point match nothing at all, so this does not touch them.
 */
/**
 * An ordinary documentation page served as markdown, rather than a file written for an agent.
 *
 * Documentation platforms publish a `.md` twin of every page, so once the probe asks the docs
 * origin, any vendor with a page called "agent" answers /agent.md. docs.datadoghq.com does: the
 * body is their install guide for the Datadog Agent, a product that has nothing to do with this
 * check, and it was about to earn a point. The frontmatter separates them cleanly and both sides
 * were read before this shipped: a page twin declares `title:` and `breadcrumbs:`, while the
 * skill files at docs.mixpanel.com and docs.trychroma.com declare `name:` and a description
 * beginning "Use when", which is the skill format and not a page.
 */
/**
 * Whether a response is the same template the control probe got, rather than a file.
 *
 * Two tests, because each one has been defeated on its own. Stripping path segments catches a stub
 * that echoes the path it is refusing (restate.dev). Comparing the first line catches a soft 404
 * that echoes the path AND varies the rest: docs.slatejs.org answers every unknown path with
 * "# Page Not Found" and a list of suggested pages drawn from its search index, so no two bodies
 * are the same length or the same string after stripping. Five of those shipped as five entry
 * files on 9.19.
 *
 * `---` is excluded from the heading test on purpose: a skill file opens with frontmatter, and so
 * does a documentation platform's own 404, so that one line proves nothing either way.
 */
export function answersWithTheSameTemplate(body: string, controlBody: string | undefined): boolean {
  if (controlBody === undefined || controlBody.length === 0) return false
  // Long runs of hex or digits go with the paths: a shell that stamps a nonce, a build id or a
  // timestamp into every response differs from its own control on every request, which defeats an
  // exact comparison and would hand a vendor points for four copies of one page. Eight characters
  // is long enough that ordinary prose and version numbers survive.
  const withoutPaths = (text: string) =>
    text
      .replace(/\/[\w.@~-]+/g, ' ')
      .replace(/\b[0-9a-f]{8,}\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  if (withoutPaths(body) === withoutPaths(controlBody)) return true
  const firstLine = (text: string) => text.split('\n').map((line) => line.trim()).find(Boolean)?.toLowerCase() ?? ''
  const heading = firstLine(controlBody)
  return heading.length > 3 && heading !== '---' && firstLine(body) === heading
}

export function looksLikeADocsPageTwin(body: string): boolean {
  const frontmatter = body.match(/^\s*---\r?\n([\s\S]{0,600}?)\r?\n---/)
  if (!frontmatter) return false
  const fields = frontmatter[1]
  if (/^\s*name\s*:/m.test(fields)) return false
  // `breadcrumbs:` only. Keying on `title:` as well rejected a hand-written agents.md whose YAML
  // says `title: Agent access` and whose body is a procedure, because `name:` is the skill format
  // and nothing obliges a vendor to use it. A breadcrumb trail is the thing no standalone file
  // has: it exists to place a page inside a documentation tree.
  return /^\s*breadcrumbs\s*:/m.test(fields)
}

export function describesAProcedure(body: string): boolean {
  if (body.trim().length < 400) return false
  const kinds = new Set<string>()
  for (const match of body.matchAll(new RegExp(PROCEDURE_SIGNALS.source, 'gi'))) {
    kinds.add(match[0].toLowerCase().replace(/[^a-z]/g, ''))
  }
  return kinds.size >= 2
}

export const PROVISIONING_PATTERN_COUNT = PROVISIONING_PATTERNS.length

/** Exported so a rule test can show it saying yes and no, rather than only ever saying no. */
export const PROVISIONING_RULES = PROVISIONING_PATTERNS

export const BOT_DEFENCE_RULES = BOT_DEFENCE_SIGNATURES

/**
 * The same rules in the words a vendor can search their own documentation for. Published
 * on the methodology page: a verdict that says "1 of 7 phrases" and never says which seven is
 * not a published rule, and it is the heaviest check on the card.
 */
export const PROVISIONING_PATTERN_LABELS = [
  // The three bare ones say "beside" because since 9.32 they no longer count on their own: the
  // words we quote have to carry the evidence, or the phrase is just a name in a menu.
  'management api, beside a credential or something being created',
  'provisioning api, beside a credential or something being created',
  'account api, beside a credential or something being created',
  // Parenthesised because the sentence quotes each label as one phrase, and a comma-separated
  // list read as six: a vendor saw "1 of 7 provisioning phrases" followed by six things.
  'create an api key (or api token, access token, personal access token, service account, auth token, secret key, access key, service token, signing key, publishable key, client key, licence key, project token), next to something programmatic',
  'programmatically create, in either word order',
  'service account',
  'a documented path like /v1/api_keys or /v2/access-tokens',
]

export type SignupFindings = {
  url: string | null
  status: number
  statusesSeen: number[]
  consistent: boolean
  reachable: boolean
  rendersFormWithoutJs: boolean
  captcha: string[]
  /**
   * The same CAPTCHA vendors found on the site's front page, asked only when the signup page
   * carried one. A token loaded from a bundle every route shares says nothing about this form,
   * and six of the twenty eight rows we accuse are that shape: mailgun, chargebee, sentry,
   * betterstack, raygun and bigcommerce all serve recaptcha on their home page too.
   */
  captchaSiteWide?: string[]
  /** Background bot defence, reported next to the CAPTCHA verdict and never scored as one. */
  botDefence?: string[]
  behindCloudflare: boolean
  /**
   * What a browser user-agent got at the same URL, asked only when the agent was refused. The
   * finding is that agents are treated worse than browsers, and without this number it was not
   * a comparison: anvil.co/signup is a 404 to everybody, their signup lives on another host, and
   * we published "answers 404 to a request identifying itself as an agent" about a page that
   * answers 200 to one.
   */
  browserStatus: number | null
  /**
   * Whether the edge answered with a challenge rather than a limit. Vercel's attack mode sends
   * 429 with `x-vercel-mitigated: challenge`, so the status alone cannot tell "you are asking too
   * often" from "prove you are a browser", and we excused the second as the first.
   */
  challenge?: boolean
  /**
   * The other way to have no form. modal.com/signup is 51 983 bytes of server HTML with no input
   * in it at all and three "Continue with" buttons, and we published "its form needs JavaScript"
   * about a form they never wrote. Eight rows of the 9.30 corpus are this shape. The verdict is
   * unchanged, because an unattended agent gets through neither, but the sentence has to say
   * which of the two we saw.
   */
  identityProviderOnly?: boolean
}

/**
 * A form an agent could actually fill in, rather than the tag. app.hygraph.com/signup serves
 * `<form method="post" action="/login"></form>`: an empty element with no field in it, and the
 * whole check is whether an agent finds something to submit. Testing for the opening tag scored
 * that as a signup rendering without JavaScript, on the one page where being wrong is worst.
 */
export function rendersUsableForm(body: string): boolean {
  for (const form of body.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)) {
    const fields = [...form[2].matchAll(/<(?:input|select|textarea)\b[^>]*>/gi)].map((field) => field[0])
    const asksWhoYouAre = fields.filter(isFillable).some(identifiesTheCaller)
    // A React form posts from an onSubmit handler and carries no action, so the button is the
    // only evidence it goes anywhere. Availability is the whole test on a button: asking
    // isFillable rejected every one of them, because a submit control is by definition not a
    // field, and that dropped supabase.com, resend.com and contentful.com.
    // `input type=submit` is the third way and it cost flagsmith.com a real signup: six fields,
    // method="post", and a submit control that is an input rather than a button.
    const canBeSubmitted =
      /\saction\s*=/i.test(form[1]) ||
      [...form[2].matchAll(/<button\b[^>]*>/gi)].some(isAvailable) ||
      fields.some((field) => /\btype\s*=\s*["']?submit/i.test(field) && isAvailable(field))
    if (asksWhoYouAre && canBeSubmitted) return true
  }
  return false
}

/** Buttons and hrefs that hand the caller to somebody else's identity provider. */
const IDENTITY_PROVIDER_ENTRY =
  /(?:continue|sign\s*up|sign\s*in|log\s*in)\s*with\s*(?:google|github|microsoft|apple|gitlab|okta|sso)|href\s*=\s*["'][^"']*(?:oauth|auth\/(?:google|github|microsoft|okta|sso)|saml)/i

/**
 * A page whose only door is an identity provider, as opposed to one whose form a bundle builds.
 * Deliberately stricter than the provider signature alone: a page that offers Google *and* an
 * email field is a normal signup with a shortcut on it, and only a page with no field anywhere
 * in the HTML, not just none inside a form, has nothing of its own to fill in.
 */
export function entersThroughIdentityProvider(body: string): boolean {
  if (!IDENTITY_PROVIDER_ENTRY.test(body)) return false
  const fields = [...body.matchAll(/<(?:input|select|textarea)\b[^>]*>/gi)].map((field) => field[0])
  return !fields.filter(isFillable).some(identifiesTheCaller)
}

/**
 * A field that asks who is signing up, as opposed to one that asks anything at all. Counting
 * fillable fields was not an approximation of a signup: browserless.io's only form is a cookie
 * banner whose two consent checkboxes cleared the count while its email input sits outside every
 * form element, and payloadcms.com's is a footer newsletter box.
 */
function identifiesTheCaller(tag: string): boolean {
  const type = tag.match(/\btype\s*=\s*["']?([a-z]+)/i)?.[1]?.toLowerCase()
  if (type === 'email' || type === 'password') return true
  if (type !== undefined && type !== 'text') return false
  return /\b(?:name|id)\s*=\s*["']?[^"'>]*(?:email|e-mail|user|login|password)/i.test(tag)
}

/**
 * A field a caller could put a value in. Counting every input tag on the page, rather than the
 * ones inside a form and available, passed a site search box (commercetools.com/get-started), a
 * footer newsletter box with a disabled submit (payloadcms.com) and a form whose only input is
 * itself disabled while the consent checkbox sits outside it (dashboard.api.video/register).
 * A hidden CSRF token and a submit button are not fields anyone fills in either.
 */
/** Whether the control is offered rather than greyed out. Attribute names only: Tailwind writes
 * `disabled:opacity-50` inside a class value, and reading the bare word there marked every styled
 * control as unavailable, which cost supabase.com, resend.com and browserless.io real forms. */
function isAvailable(tag: string | RegExpMatchArray): boolean {
  const text = typeof tag === 'string' ? tag : tag[0]
  const attributes = text.replace(/=\s*"[^"]*"/g, '=""').replace(/=\s*'[^']*'/g, "=''")
  return !/(?:^|\s)disabled(?=[\s=>/])/i.test(attributes)
}

function isFillable(tag: string): boolean {
  // Attribute names only. Tailwind writes `disabled:opacity-50` inside a class value, and reading
  // the bare word there marked every styled input as unavailable: supabase.com, resend.com and
  // browserless.io all lost real signup forms to it, which is worse than the false positives the
  // rule exists to stop.
  if (!isAvailable(tag)) return false
  const type = tag.match(/\btype\s*=\s*["']?([a-z]+)/i)?.[1]?.toLowerCase()
  return type === undefined || !['hidden', 'submit', 'button', 'image', 'reset'].includes(type)
}

export type McpEndpoint = {
  url: string
  status: number
  /**
   * `browser-only` is a server that speaks the protocol and then refuses anything without a
   * browser header, which no unattended agent sends. It is a server, and it is not one an agent
   * can use, and scoring it as live would hand a point to exactly the wall this scanner exists
   * to find.
   *
   * It was introduced on njal.la and njal.la turned out not to be a case of it: their whole
   * `/api/` prefix answers that same CSRF refusal to any name at all. The rule now has no
   * instance in the corpus, and it is kept because the shape is real and the control below can
   * now tell the two apart.
   */
  evidence: 'challenges' | 'rejects-get' | 'answers-json' | 'accepts-handshake' | 'browser-only'
}

/** A refusal that names the browser mechanism doing it, rather than a credential we could get. */
const BROWSER_ONLY_REFUSAL = /csrf|referer checking|referrer checking|origin header/i

/** Whether unknown paths answer with a real document, asked once per file type we probe. */
export type CatchAll = {
  markdown: boolean
  json: boolean
  /** Asked as text/plain, which is how llms.txt is fetched. */
  text: boolean
  /** Asked the way the entry probes ask, which is markdown first. */
  entryText?: boolean
  /** What an unregistered path in each namespace answered with, in bytes. */
  bodyLengths?: { markdown: number; json: number; text: number }
  /** And the bodies, so a stub that echoes the path it refuses can still be recognised. */
  bodies?: { markdown: string; json: string; text: string }
}

export type FunnelFindings = {
  entryPaths: Record<string, boolean>
  entryPointsFound: string[]
  /**
   * Of those, the ones that read as a procedure rather than a declaration. inngest.com scored
   * the full two points for a 583 byte ai.txt whose entire content is Allow-AI-Training: yes,
   * which is a permissions policy in the shape of robots.txt and tells an agent nothing about
   * how to get in. Existence of a file was never the thing worth two points.
   */
  entryPointsWithProcedure: string[]
  /**
   * How many of the nine paths answered with a refusal rather than a 200 or a 404. A WAF that
   * turns our data centre away cannot produce "you publish none of these": bitmovin.com serves
   * a real 9.6 kB skill.md and answers 403 to most of our requests, intermittently.
   */
  entryPathsRefused?: number
  /** How many probes the refusal count and the absence sentence are out of. Nine per origin. */
  entryProbesAsked?: number
  /** Refusals on the site alone, which is the half that decides whether we measured anything. */
  entrySiteRefused?: number
  /**
   * Whether the documentation host was one of the places we asked. The count alone cannot say:
   * since the upper-case fallback there are twelve site probes, and a sentence deriving "we asked
   * your documentation host too" from twelve named a host we never opened a socket to.
   */
  entryDocsProbed?: boolean
  oauth: {
    metadataPublished: boolean
    dynamicClientRegistration: boolean
    /**
     * Whether any advertised grant finishes without a person. A registration endpoint says an
     * agent may introduce itself, not that it may get a token: namecheap.com publishes one and
     * offers only authorization_code and refresh_token, both of which put a human at a browser,
     * while dynadot.com offers client_credentials on the same shaped door. device_code is not
     * counted, because approving on another screen is still a person.
     */
    unattendedGrant: boolean
    grantTypes?: string[]
    probedHosts: number
    /** Named so the vendor can rerun exactly what we ran instead of taking "we looked" on trust. */
    probedOrigins?: string[]
  }
  /** Live MCP endpoints, as opposed to documentation that mentions MCP. */
  mcpEndpoints: McpEndpoint[]
  /** Whether the endpoint probe got an answer, as opposed to never reaching a host. */
  mcpProbed: boolean
  /** False when the MCP registry timed out or refused. Then its silence is not about the vendor. */
  mcpRegistryAnswered?: boolean
  /** The addresses the vendor's own card named, empty when we could not read it. */
  mcpCardNamed: string[]
  /** True when every POST we sent came back an empty 2xx, control included, so we measured nothing. */
  mcpPostsSwallowed: boolean
  /** Their own MCP pages, opened only when nothing answered anywhere else. Named so it is checkable. */
  mcpPagesFollowed: string[]
  signup: SignupFindings
  provisioning: {
    programmatic: string[]
    /** The words around each match, so a vendor can see what we read as their provisioning path. */
    programmaticQuotes?: string[]
    selfServeSignals: string[]
    selfServeQuotes?: string[]
    selfServeIsButtonOnly?: boolean
    /** The question the page asks, when asking it is the only free-tier wording it carries. */
    selfServeOnlyAsked?: string | null
  }
  /** True when the site answers unknown paths with real text, making entry probes meaningless. */
  servesCatchAll: boolean
  /** The same question per namespace, because one does not imply another. */
  catchAll?: CatchAll
  pricingFetched: boolean
  /** True when repeated fetches of the pricing page did not carry the same self-serve wording. */
  pricingTriesDisagreed: boolean
  /** Null when no pricing page was found, false when one exists and shows no prices to a plain fetch. */
  pricesVisibleWithoutJs: boolean | null
  /**
   * Visible characters the pricing page served. What separates a page of navigation from a page
   * that states its tiers in words: here.com/pricing is 850 characters of nav and a button, while
   * qdrant.tech/pricing is 6,934 characters naming four tiers and a quantified forever-free one,
   * and neither page prints a number our price pattern recognises.
   */
  pricingTextLength: number
  /**
   * True when the pricing page was larger than we read. posthog.com/pricing and cal.com/pricing
   * both exceed the cap and carry their tiers past it, so "no free tier wording" was a claim
   * about the part of the page we happened to hold.
   */
  pricingTruncated: boolean
}

const OAUTH_METADATA_PATHS = [
  '/.well-known/oauth-authorization-server',
  '/.well-known/oauth-protected-resource',
  '/.well-known/openid-configuration',
]

/**
 * Authorization servers live on their own host, and until the corpus was published as data we
 * could not see how much that cost us: this check was unmeasurable on 37 of 51 domains, every
 * one of them a domain with no MCP endpoint to follow. Probing one origin is not a search.
 */
const AUTH_SUBDOMAINS = ['auth', 'login', 'accounts', 'id', 'oauth']
/**
 * Asked only when everything else came back empty, because the sentence we would otherwise
 * publish is "no OAuth metadata on any of the N hosts probed" and that sentence has to be true.
 * `app` and `signin` are here on the same evidence, from vendors whose row is already right for
 * another reason: app.kinde.com, signin.kinde.com, app.loops.so, app.chargebee.com, app.cronofy.com.
 */
const LAST_RESORT_AUTH_SUBDOMAINS = ['auth2', 'sso', 'account', 'app', 'signin']
// mcp is here rather than only behind a found endpoint: datadoghq.com and contentful.com both
// publish a registration_endpoint on mcp.<domain> while our MCP probe concluded nothing answers
// there, so the host that had the answer was the one host we never asked.
const RESOURCE_SUBDOMAINS = ['api']
/**
 * The authorization-server document is where datadoghq.com and contentful.com publish the
 * registration_endpoint we were missing, and the protected-resource document is where
 * chargebee.com and logto.io name the server that actually holds it. Asking only the first
 * left two identity vendors reading that they publish no OAuth metadata anywhere.
 */
const MCP_OAUTH_PATHS = ['/.well-known/oauth-authorization-server', '/.well-known/oauth-protected-resource']

type OauthTarget = { origin: string; paths: string[] }
type OauthProbe = {
  metadataPublished: boolean
  dynamicClientRegistration: boolean
  grantTypes?: string[]
  origins: string[]
  /** The document that carried the registration endpoint, so the verdict can name it. */
  registrationAt?: string
}

/**
 * RFC 9728 makes a protected resource point at the authorization servers that guard it, and both
 * chargebee.com and logto.io publish that pointer on mcp.<domain> while the server itself is
 * somewhere else entirely. Following it is the difference between "no OAuth metadata anywhere",
 * which is what we told two identity vendors, and reading the document they wrote for us.
 */
function serversNamedIn(body: string): string[] {
  try {
    const named = (JSON.parse(body) as { authorization_servers?: unknown }).authorization_servers
    if (!Array.isArray(named)) return []
    return named.filter((url): url is string => typeof url === 'string' && /^https:\/\//.test(url)).slice(0, 3)
  } catch {
    return []
  }
}

/**
 * An issuer with a path keeps its metadata under a path-suffixed well-known, not at the root of
 * the host: chargebee's sits at /.well-known/oauth-authorization-server/mcp. Both forms are
 * asked because deployments in the wild use both.
 */
function metadataUrlsFor(issuer: string): string[] {
  try {
    const url = new URL(issuer)
    const path = url.pathname.replace(/\/$/, '')
    const roots = ['/.well-known/oauth-authorization-server', '/.well-known/openid-configuration']
    return [
      ...roots.map((root) => `${url.origin}${root}`),
      // Both conventions are in the wild: chargebee keeps the path after the well-known segment
      // and logto keeps it before, at auth.logto.io/oidc/.well-known/openid-configuration.
      ...(path ? roots.map((root) => `${url.origin}${root}${path}`) : []),
      ...(path ? roots.map((root) => `${url.origin}${path}${root}`) : []),
    ]
  } catch {
    return []
  }
}

async function probeOauthOrigins(targets: OauthTarget[]): Promise<OauthProbe> {
  const origins = targets.map((target) => target.origin)
  const probes = targets.flatMap((target) => target.paths.map((path) => `${target.origin}${path}`))
  const firstPass = await inParallel(probes, (url) => fetchUrl(url, { accept: 'application/json' }))

  const followed = [
    ...new Set(
      firstPass
        .filter((got) => got.ok && !looksLikeHtml(got))
        .flatMap((got) => serversNamedIn(got.body))
        .flatMap(metadataUrlsFor),
    ),
  ].filter((url) => !probes.includes(url))
  const results = [
    ...firstPass,
    ...(followed.length > 0 ? await inParallel(followed, (url) => fetchUrl(url, { accept: 'application/json' })) : []),
  ]

  // The MCP host first. A claim about the token that opens an MCP server has to come off the
  // server guarding it, and a conventionally guessed apex is a different authorization server
  // with different grants: vercel.com advertises client_credentials on its platform metadata
  // while mcp.vercel.com, which is what an agent actually has to get past, advertises only
  // authorization_code and refresh_token. Reading the apex first published the platform's
  // capability as if it opened the resource.
  const ordered = [...results].sort((a, b) => {
    const rank = (url: string) => {
      try { return new URL(url).hostname.startsWith('mcp.') ? 0 : 1 } catch { return 1 }
    }
    return rank(a.url) - rank(b.url)
  })

  let metadataPublished = false
  for (const got of ordered) {
    if (!got.ok || looksLikeHtml(got)) continue
    try {
      const metadata = JSON.parse(got.body) as {
        registration_endpoint?: string
        issuer?: string
        authorization_endpoint?: string
        grant_types_supported?: string[]
      }
      if (!metadata.issuer && !metadata.authorization_endpoint) continue
      metadataPublished = true
      if (metadata.registration_endpoint) {
        return {
          metadataPublished: true,
          dynamicClientRegistration: true,
          grantTypes: metadata.grant_types_supported,
          origins,
          registrationAt: metadata.registration_endpoint,
        }
      }
    } catch {
      /* a JSON body that is not JSON tells us nothing */
    }
  }
  return { metadataPublished, dynamicClientRegistration: false, origins }
}

/**
 * Probing only the apex told Linear to build an RFC 7591 endpoint it already runs, at
 * mcp.linear.app. The authorization server for an agent almost never lives on the marketing
 * host, so we follow the MCP host too, and admit it when we simply did not find one.
 *
 * Split in two because only the second half depends on the MCP probe: the apex, the signup
 * host and the subdomains an authorization server conventionally sits on are all known before
 * a single MCP address has been tried, and waiting for one to start the other cost a full
 * round of probes in series.
 */
function oauthTargetsKnownUpFront(domain: string, site: string, signupUrl: string | null): OauthTarget[] {
  const signupOrigin = signupUrl ? new URL(signupUrl).origin : null
  const named = [...new Set([site, ...(signupOrigin ? [signupOrigin] : [])])]
  // Cheaper on the subdomains we are guessing at: an auth host publishes authorization-server
  // metadata, a resource host publishes protected-resource metadata, and neither publishes both.
  const guessed: OauthTarget[] = [
    ...AUTH_SUBDOMAINS.map((prefix) => ({
      origin: `https://${prefix}.${domain}`,
      paths: ['/.well-known/oauth-authorization-server', '/.well-known/openid-configuration'],
    })),
    ...RESOURCE_SUBDOMAINS.map((prefix) => ({
      origin: `https://${prefix}.${domain}`,
      // openid-configuration too: polar.sh publishes its registration_endpoint there and
      // nowhere else, and we told them they publish no OAuth metadata at all.
      paths: [
        '/.well-known/oauth-protected-resource',
        '/.well-known/oauth-authorization-server',
        '/.well-known/openid-configuration',
      ],
    })),
  ].filter((candidate) => !named.includes(candidate.origin))

  return [
    ...named.map((origin) => ({ origin, paths: OAUTH_METADATA_PATHS })),
    ...guessed,
    ...(named.includes(`https://mcp.${domain}`)
      ? []
      : [{ origin: `https://mcp.${domain}`, paths: MCP_OAUTH_PATHS }]),
  ]
}

function mergeOauthProbes(first: OauthProbe, second: OauthProbe): FunnelFindings['oauth'] {
  const origins = [...new Set([...first.origins, ...second.origins])]
  // Grants describe one authorization server, and unioning two servers' lists invents a
  // capability neither offers. vercel.com publishes client_credentials on its platform metadata
  // while mcp.vercel.com, the server actually guarding the resource, offers only
  // authorization_code and refresh_token, and the token that opens the MCP endpoint comes from
  // the second one. weglot.com is the same shape. The MCP host wins when it published grants,
  // because that is the door the claim is about.
  const grantTypes = first.grantTypes ?? second.grantTypes ?? []
  return {
    metadataPublished: first.metadataPublished || second.metadataPublished,
    dynamicClientRegistration: first.dynamicClientRegistration || second.dynamicClientRegistration,
    unattendedGrant: grantTypes.includes('client_credentials'),
    ...(grantTypes.length > 0 ? { grantTypes } : {}),
    probedHosts: origins.length,
    probedOrigins: origins,
  }
}

async function inspectSignup(url: string | null, site: string): Promise<SignupFindings> {
  if (!url) {
    return {
      url: null,
      status: 0,
      statusesSeen: [],
      consistent: true,
      reachable: false,
      rendersFormWithoutJs: false,
      captcha: [],
      botDefence: [],
      behindCloudflare: false,
      browserStatus: null,
    }
  }
  // As the agent, because that is what the finding says. Sending Chrome and then publishing
  // "the signup answers N to a non-browser request" was a claim about a request we never made,
  // and it cost liveblocks.io a point on a page that answers 200 with a real form to LetAgentsIn/1.0.
  const got = await fetchWithRetries(url, { ua: AGENT_UA })
  // One request, and only when there is a difference worth measuring.
  const asBrowser = got.ok ? null : await fetchUrl(url, { ua: BROWSER_UA })
  const body = got.body.toLowerCase()
  const captcha = Object.entries(CAPTCHA_SIGNATURES)
    .filter(([, pattern]) => pattern.test(body))
    .map(([name]) => name)
  // The control, and only when there is something to control for. A token on the front page as
  // well is a script the whole site loads, which is a different fact from a gate on this form,
  // and the sentence has to be able to tell the vendor which one we saw.
  // A bigger read cap than the default, because this control reads a marketing front page rather
  // than a machine-readable file: sentry.io serves 628 kB and its recaptcha token sits past the
  // 400 kB default, so the first version of this control answered "not there" about bytes it had
  // never read.
  const front = captcha.length > 0 ? await fetchUrl(`${site.replace(/\/$/, '')}/`, { readBytes: 1_500_000 }) : null
  const frontBody = (front?.body ?? '').toLowerCase()
  const hasForm = rendersUsableForm(body)
  return {
    url,
    browserStatus: asBrowser === null ? null : asBrowser.status,
    challenge: isBotChallenge(got),
    status: got.status,
    statusesSeen: got.statusesSeen,
    consistent: got.consistent,
    reachable: got.ok,
    rendersFormWithoutJs: hasForm,
    identityProviderOnly: !hasForm && entersThroughIdentityProvider(body),
    captcha,
    captchaSiteWide: captcha.filter((name) => CAPTCHA_SIGNATURES[name].test(frontBody)),
    botDefence: Object.entries(BOT_DEFENCE_SIGNATURES)
      .filter(([, pattern]) => pattern.test(body))
      .map(([name]) => name),
    behindCloudflare: 'cf-ray' in got.headers || (got.headers.server ?? '').toLowerCase().includes('cloudflare'),
  }
}

/** Greps visible text only: a JSON changelog blob inside a <script> once scored 2 of 16 points. */
/**
 * Returns the matched rule in the words it is published in, not its regex source. The verdict
 * quotes these back to the vendor, and one of the seven is an alternation forty characters long.
 */
/** The same reduction `matching` uses, exposed so a caller can look at the words in context. */
function visibleText(html: string): string {
  return stripCodeBlocks(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
}

/**
 * Tags that end a thought. Deliberately only the ones that build lists, menus and tables: a list
 * item is not a clause of the list item above it, and a table cell is not a clause of the one
 * beside it.
 *
 * Paragraphs, divs and headings were in here for one reseed and the corpus said no. A heading is
 * not a boundary, it is the subject of the sentence under it: mux.com's reference puts "Create a
 * signing key" in a heading and `POST /system/v1/signing-keys` in the body below, telnyx.com and
 * stytch.com do the same on their key pages, and cutting between them lost four vendors who
 * document exactly what we were asking about. Menus are lists; documentation is not.
 */
const BLOCK_BOUNDARY = /<\/?(?:li|td|th|tr|option|dt|dd|nav|menu)\b[^>]*>/gi

/**
 * The same reduction as visibleText, except that block boundaries become full stops.
 *
 * Every provisioning rule reasons about a sentence: a creation phrase counts only with something
 * programmatic beside it, because "click Generate key" beside "creates an API key" is a dashboard.
 * That reasoning is only sound if the text has sentences in it, and stripping tags to spaces
 * leaves navigation as one unbroken run. On 2026-08-13 that let a documentation sidebar reading
 *
 *   Creating and managing access tokens | Mapbox Account Dashboard | Mapbox Tokens API
 *
 * satisfy a rule that wanted a creation verb and a credential-named API in one sentence. Mapbox
 * documents exactly that, so the verdict was right and its evidence was a table of contents,
 * which is the kind of wrong a vendor cannot argue with.
 *
 * Kept separate from visibleText rather than replacing it: the pricing heuristics next door count
 * question marks and buttons across a page whose structure is the signal, and inserting full
 * stops into that would be changing a different measurement to fix this one.
 */
function visibleProse(html: string): string {
  return stripCodeBlocks(html)
    .replace(BLOCK_BOUNDARY, '. ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/(?:\.\s+){2,}/g, '. ')
}

/**
 * Whether the words around a bare phrase earn it the point. Exported so the corpus can be replayed
 * against the stored quotes without a rescan: the quote is the window, so the answer is exact.
 */
export function corroboratesBareProvisioning(window: string, phrase: string): boolean {
  // The phrase cannot corroborate itself: "Phone Number Provisioning API" contains "provision".
  const around = window.replace(phrase, ' ')
  return NAMES_A_CREDENTIAL.test(around) || MAKES_SOMETHING.test(around)
}

/** The ±70 characters we quote, which for a bare phrase is also the evidence it has to carry. */
function windowAround(text: string, at: number, length: number): string {
  return text.slice(Math.max(text.lastIndexOf('. ', at) + 1, at - 70), at + length + 70)
}

/**
 * Every occurrence, not the first. A nav list naming "Management API" usually comes before the
 * page that documents it, so stopping at the first hit judged the menu and ignored the docs.
 */
function provisioningHit(text: string, pattern: RegExp, index: number): number {
  const all = new RegExp(pattern.source, `${pattern.flags.replace('g', '')}g`)
  for (let hit = all.exec(text); hit; hit = all.exec(text)) {
    if (!BARE_PROVISIONING_INDEXES.has(index)) return hit.index
    if (corroboratesBareProvisioning(windowAround(text, hit.index, hit[0].length), hit[0])) return hit.index
  }
  return -1
}

export function provisioningMatches(html: string): string[] {
  const text = visibleProse(html)
  return PROVISIONING_PATTERNS.map((pattern, index) =>
    provisioningHit(text, pattern, index) === -1 ? null : PROVISIONING_PATTERN_LABELS[index],
  ).filter((label): label is string => label !== null)
}

/**
 * The vendor's own sentence around each provisioning match, because three of the seven rules are
 * bare substrings and a substring can mean something else entirely. An audit of the sitemap on
 * 2026-08-17 found bird.com writing "Destination Management API" about SMS routing and bunny.net
 * writing "Account API Key" about a key you copy out of a dashboard: both would match, neither is
 * a provisioning surface, and 43 of the 79 credited rows stand on nothing but those substrings.
 * Storing the words we matched is what makes tightening the rule measurable rather than a guess.
 */
export function provisioningQuotes(html: string, most = 2): string[] {
  const text = visibleProse(html)
  const found: string[] = []
  for (const [index, pattern] of PROVISIONING_PATTERNS.entries()) {
    // The occurrence that earned the point, not the first one on the page. Quoting a different
    // occurrence than the rule accepted would publish a sentence that does not carry its evidence.
    const at = provisioningHit(text, pattern, index)
    if (at === -1) continue
    const hit = new RegExp(pattern.source, pattern.flags).exec(text.slice(at))
    if (!hit) continue
    const from = Math.max(text.lastIndexOf('. ', at) + 1, at - 70)
    // From a word boundary, because a window cut by character count starts mid-word and the
    // published sentence then opens with a stray letter.
    const window = text.slice(from, at + hit[0].length + 70).replace(/\s+/g, ' ').trim()
    const quote = window
      .replace(/^[^\s]*\s/, (start) => (from === 0 || /^[A-Z"“]/.test(start) ? start : ''))
      .replace(/^["“'']+/, '')
      .trim()
    if (quote && !found.includes(quote)) found.push(quote)
    if (found.length >= most) break
  }
  return found
}

function matching(patterns: RegExp[], html: string, labels?: string[]): string[] {
  const text = visibleText(html)
  return patterns
    .map((pattern, index) => (pattern.test(text) ? (labels?.[index] ?? pattern.source) : null))
    .filter((label): label is string => label !== null)
}

/**
 * The vendor's own words rather than the name of the rule that caught them. "Free tier or no-card
 * signals at your pricing page" is a claim a vendor has no way to check; "no credit card",
 * "Starter Free" is one they can search their own page for.
 */
function quoting(patterns: RegExp[], html: string, most = 3): string[] {
  const text = visibleText(html)
  const found: string[] = []
  for (const pattern of patterns) {
    const hit = pattern.exec(text)?.[0]?.replace(/\s+/g, ' ').trim()
    if (hit && hit.length <= 60 && !found.some((seen) => seen.toLowerCase() === hit.toLowerCase())) found.push(hit)
    if (found.length >= most) break
  }
  return found
}

/**
 * Some sites answer any unknown path with a real markdown or JSON document. Without a control
 * probe every entry path "exists" and the site scores full marks on fabricated evidence.
 */
/**
 * Per namespace, because a catch-all in one is not a catch-all in another. sentry.io answers any
 * .md path with the same 976 byte page and answers an unknown .txt with a redirect to its HTML
 * login screen, so the .md arm was suppressing a real llms.txt that is served as text/plain.
 * Same for agora.io. Both earned a point and both were told the file proved nothing.
 */
async function servesCatchAllText(site: string): Promise<CatchAll> {
  // The same Accept the entry probes send, per suffix. They diverged, and that is how a control
  // asking for text/plain saw sentry.io's 20 kB HTML while /ai.txt asking for markdown saw their
  // 976 byte catch-all, so the control did not recognise the page it exists to recognise.
  const [markdown, json, plain, plainAsEntry] = await Promise.all([
    fetchUrl(`${site}/letagentsin-control-probe-8f3a1c.md`, { accept: entryAccept('.md') }),
    fetchUrl(`${site}/.well-known/letagentsin-control-probe-8f3a1c.json`, { accept: entryAccept('.json') }),
    // Twice, because two checks read this arm and they do not ask the same way. llms.txt is
    // fetched as text/plain, and agora.io answers an unknown .txt path with 240 kB of HTML to
    // that header and 26 kB of markdown to the entry probe's header. One boolean for both
    // suppressed a genuine 8,857 byte llms.txt on the strength of a page it is nothing like.
    fetchUrl(`${site}/letagentsin-control-probe-8f3a1c.txt`, { accept: 'text/plain' }),
    fetchUrl(`${site}/letagentsin-control-probe-8f3a1c.txt`, { accept: entryAccept('.txt') }),
  ])
  return {
    markdown: isRealTextFile(markdown, 30),
    json: isRealTextFile(json, 30),
    text: isRealTextFile(plain, 30),
    entryText: isRealTextFile(plainAsEntry, 30),
    // Kept for a direct comparison, because the boolean above is not enough on its own:
    // sentry.io answers every .md path with the same 20,402 byte HTML page, which our control
    // correctly discards as HTML and which then discredits nothing. A file that comes back the
    // same size as a path nobody registered is that page, whatever its content type says.
    bodyLengths: {
      markdown: markdown.body.length,
      json: json.body.length,
      text: plainAsEntry.body.length,
    },
    // The control bodies themselves, because comparing lengths alone loses to a template that
    // echoes the path it was asked for. restate.dev answers every .md path with the same stub
    // reading "# Restate - /<path> A markdown rendering of this page is not available", so
    // /agent-signup.md came back 227 bytes, /skill.md 213 and the control something else again,
    // and three copies of one stub were published as three agent entry files.
    bodies: { markdown: markdown.body, json: json.body, text: plainAsEntry.body },
  }
}

/**
 * A live MCP server is the only proof that beats prose about MCP. A 401 with a
 * WWW-Authenticate header is the strongest signal there is: something is there and it wants
 * credentials. 405 counts too, since these endpoints answer POST and refuse GET.
 */
/**
 * The card names the server; we used to guess at it instead. sentry.io and telnyx.com both publish
 * /.well-known/mcp.json with an `endpoint` field, we never dereferenced it, and both were told
 * "a card is a claim about a server, not a server" while their servers answered a handshake.
 * Contentful's sits at mcp.contentful.com/mcp, where we probed the host and the path but never
 * the two together, and Inngest's at api.inngest.com/mcp.
 */
async function cardEndpoints(site: string): Promise<string[]> {
  // Asked twice when the first ask fails, because this one document is the difference between
  // probing the address we were handed and guessing at hostnames. telnyx.com lost its live
  // server to a single failed fetch of this file during the 8.5 reseed: the published row said
  // "nothing answered at mcp.telnyx.com or /mcp", naming the two we guessed, while the card it
  // had just found names api.telnyx.com/v2/mcp, which answers a full handshake. Three rescans
  // minutes later all found it. A failure to read is not an absence, and everywhere else in the
  // scanner that rule is already enforced.
  let card = await fetchUrl(`${site}/.well-known/mcp.json`, { accept: 'application/json' })
  if (!card.ok && timeLeftMs() > 2_000) {
    await new Promise((resolve) => setTimeout(resolve, 300))
    card = await fetchUrl(`${site}/.well-known/mcp.json`, { accept: 'application/json', fresh: true })
  }
  if (!card.ok) return []
  try {
    const parsed = JSON.parse(card.body) as {
      endpoint?: string
      url?: string
      transport?: { url?: string }
      servers?: { endpoint?: string; url?: string }[]
    }
    const named = [
      parsed.endpoint,
      parsed.url,
      parsed.transport?.url,
      ...(parsed.servers ?? []).flatMap((server) => [server.endpoint, server.url]),
    ]
    return named.filter((url): url is string => typeof url === 'string' && /^https:\/\//.test(url))
  } catch {
    return []
  }
}

/**
 * Whether the probe reached an answer at all, kept separately from what it found. Silence about
 * MCP inside a file we had to cut short only matters when nothing else settled the question, and
 * on eleven of the twelve rows that published that excuse the probe had already settled it: the
 * host does not resolve, or it answers a path nobody registered exactly the same way.
 */
type McpProbe = {
  endpoints: McpEndpoint[]
  answered: boolean
  /** Whether the MCP registry answered us at all, as opposed to having nothing about this vendor. */
  registryAnswered: boolean
  /** Whether the card named an address for us, as opposed to us guessing at hostnames. */
  cardNamed: string[]
  /** Their edge answered every POST, including to a path nobody registered, with an empty 2xx. */
  swallowsPosts: boolean
}

/** Whether the handshake was forwarded to another origin, which no MCP server does to its own POST. */
function leftTheEndpoint(asked: string, landed: string): boolean {
  try {
    return new URL(asked).origin !== new URL(landed).origin
  } catch {
    return false
  }
}

/** Split out of the probe so the addresses we ask for can be asserted without making requests. */
export function mcpCandidates(domain: string, site: string, fromCard: string[] = []): string[] {
  return [
    ...fromCard,
    `https://mcp.${domain}`,
    `https://mcp.${domain}/mcp`,
    // Versioned, because three vendors answer only there and we published all three as having
    // no server: contentful.com, datadoghq.com and deepl.com all challenge with a
    // WWW-Authenticate header at mcp.<domain>/v1/mcp while the bare host 404s. On two of them
    // the OAuth check was reading metadata off the very host this one called dead.
    `https://mcp.${domain}/v1/mcp`,
    `https://api.${domain}/mcp`,
    // The same versioning argument as three lines up, which nobody carried across to the api host.
    // statsig.com answers 401 with a WWW-Authenticate naming itself at api.statsig.com/v1/mcp and
    // publishes protected-resource metadata for it, while we published that they run no server.
    // Found by the fourteenth adversarial pass; the control that separates it from a gateway wall
    // is that unregistered paths on that host answer 403 with no challenge at all.
    `https://api.${domain}/v1/mcp`,
    `${site}/mcp`,
    // The framework convention, and the one that cost us a correct verdict: a Next.js app puts
    // its route at app/api/mcp/route.ts, so the server answers at /api/mcp and nowhere we asked.
    // Reported by a reader whose server we called absent while it answered 200 one path away.
    //
    // Measured 2026-08-13 (npm run audit-mcp-probes): this is the only candidate here that has
    // never found anything, zero across 170 corpus rows and 567 visitor scans, while every other
    // one is the sole address that reaches a server on at least two rows. It stays because a
    // reader told us their server was there and our corpus is not the population that would show
    // it, but it is the first request to cut if the 27-second budget starts costing other checks.
    `${site}/api/mcp`,
  ].filter((url, index, all) => all.indexOf(url) === index)
}

/**
 * Addresses the vendor published in the official MCP registry, which is where an agent looking for
 * a tool actually looks, and the one source of candidates that is not us guessing.
 *
 * The twenty-fourth adversarial pass measured what guessing costs: five of the 98 rows reading
 * "No MCP surface: nothing answered at ..." run a live server listed there, at addresses no list
 * of shapes would reach - asset-management.mcp.cloudinary.com, api.raygun.com/v3/mcp,
 * docs.medusajs.com/mcp, mcp.eu.phrase.com, app.tolgee.io/mcp/developer.
 *
 * The listing is a lead and never evidence: every address it returns goes through the same
 * handshake and the same control as an address we guessed, so a stale entry cannot credit a
 * vendor with a server that is not running. The hostname has to be theirs, because searching a
 * vendor's name also returns servers other people built on top of them.
 */
const REGISTRY_BUDGET_MS = 4_000

/**
 * The mirror of the MCP registry, handed over by the database rather than imported: this module
 * knows about HTTP and must not know where anything is stored. `endpointsFor` returns null when
 * the mirror is missing or older than its window, which is the same fact as the registry not
 * answering and is scored as unmeasurable rather than as a vendor with no server.
 */
export type McpRegistryMirror = { endpointsFor(domain: string): Promise<string[] | null> }
let registryMirror: McpRegistryMirror | null = null
export function installMcpRegistryMirror(mirror: McpRegistryMirror | null): void {
  registryMirror = mirror
}

/**
 * `answered` is the whole point of the shape. A registry that timed out returns the same empty
 * list as a registry that has nothing about this vendor, and we published the second sentence for
 * the first case: phrase.com, tolgee.io and medusajs.com all register a live endpoint there, all
 * three lost it on one sweep of the corpus, and each was told "No MCP surface". Three of the six
 * downward verdict moves in the 9.30 noise-floor pair are this, which is our own load on somebody
 * else's host published as a finding about a vendor.
 */
async function registryEndpoints(domain: string): Promise<{ answered: boolean; urls: string[] }> {
  const bare = domain.replace(/^www\./, '')
  // The mirror first, because the live registry is not reachable from our dyno: measured on
  // 2026-08-17, four requests from Heroku EU timed out at 10 and 20 seconds while api.github.com
  // answered the same shell in 50 ms. A daily job on a runner that can reach it writes the listing
  // to us, so the scan reads a host we control and a scan repeated an hour later gets the same
  // answer. Without the mirror installed - a scan run from a laptop - the live registry still
  // answers, which is why the two can disagree.
  if (registryMirror) {
    const held = await registryMirror.endpointsFor(bare)
    return held === null ? { answered: false, urls: [] } : { answered: true, urls: held.slice(0, 4) }
  }
  const got = await fetchUrl(
    `https://registry.modelcontextprotocol.io/v0/servers?search=${encodeURIComponent(bare.split('.')[0])}&limit=50`,
    { accept: 'application/json' },
  )
  if (!got.ok) return { answered: false, urls: [] }
  try {
    const listing = JSON.parse(got.body) as { servers?: { server?: { remotes?: { url?: string }[] } }[] }
    const urls = (listing.servers ?? []).flatMap((entry) => entry.server?.remotes ?? []).flatMap((remote) => (remote.url ? [remote.url] : []))
    const theirs = [
      ...new Set(
        urls.filter((url) => {
          try {
            const host = new URL(url).hostname
            return host === bare || host.endsWith(`.${bare}`)
          } catch {
            return false
          }
        }),
      ),
    ].slice(0, 4)
    return { answered: true, urls: theirs }
  } catch {
    // A body we could not parse is a registry that did not answer the question, not a vendor
    // with no server in it.
    return { answered: false, urls: [] }
  }
}

/** At most this many of their own MCP pages are opened, and only when nothing answered. */
const MOST_MCP_PAGES_READ = 2
const MOST_MCP_ADDRESSES_FROM_PAGES = 3

/**
 * An address is theirs when it sits on the domain we scanned or on a domain carrying the same
 * name. neon.com documents `mcp.neon.tech` and launchdarkly.com documents a path on their own
 * host that no guess reaches; both were published as running no MCP server. A brand that moved
 * domains is still the same vendor, and their own documentation saying "our server is here" is
 * better evidence of that than a hostname match.
 *
 * The rule stops at the brand on purpose: `github.com/modelcontextprotocol` appears in half the
 * MCP pages ever written, and crediting a vendor for it would invent a surface.
 */
export function readsAsTheirOwnAddress(url: string, domain: string): boolean {
  try {
    const host = new URL(url).hostname
    const bare = domain.replace(/^www\./, '')
    if (host === bare || host.endsWith(`.${bare}`)) return true
    const theirName = bare.split('.')[0]
    // The registrable name, so mcp.neon.tech reads as "neon" rather than as "mcp".
    const parts = host.split('.')
    const registrable = parts.length > 2 ? parts[parts.length - 2] : parts[0]
    return registrable === theirName && theirName.length >= 4
  } catch {
    return false
  }
}

/** The shapes an MCP endpoint takes, as opposed to a page that talks about one. */
export function readsAsAnEndpoint(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (/\.(md|html?|png|jpe?g|svg|json)$/i.test(parsed.pathname)) return false
    // launchdarkly.com/docs/home/getting-started/mcp ends in the right segment and is a page about
    // the server, not the server. Nobody routes JSON-RPC under a documentation prefix.
    if (/\/(docs|guides|blog|tutorials|help)\//i.test(parsed.pathname)) return false
    return parsed.hostname.startsWith('mcp.') || /(^|\/)mcp(\/|$)/i.test(parsed.pathname)
  } catch {
    return false
  }
}

/**
 * The addresses a vendor's own MCP documentation names.
 *
 * Their files point at pages about MCP, never at the endpoint itself: neon.com's llms.txt names
 * `/docs/ai/neon-mcp-server.md` and the endpoint is inside that page. So this opens the page they
 * named. It is the only source in this check that is neither a guess of ours nor somebody else's
 * directory, and the twenty-sixth pass exists because the directories turned out to be worthless
 * for it: smithery lists 31 of the 73 vendors we credit with a live server and points at the
 * vendor's own host for none of them.
 */
async function addressesInTheirMcpPages(domain: string, corpus: string): Promise<{ candidates: string[]; followed: string[] }> {
  const mcpUrls = (text: string) =>
    [...new Set([...text.matchAll(/https?:\/\/[^\s)"'<>]*mcp[^\s)"'<>]*/gi)].map((found) => found[0].replace(/[.,;]+$/, '')))]
  const theirs = mcpUrls(corpus).filter((url) => readsAsTheirOwnAddress(url, domain))
  // A vendor who writes the address straight into llms.txt is the easy case and it was still
  // being missed: the first wave probes guesses, the card and the registry, and their own files
  // are none of those.
  const inTheirFiles = theirs.filter(readsAsAnEndpoint)
  const pages = theirs
    .filter((url) => !readsAsAnEndpoint(url))
    // A markdown twin of a page costs less to read and carries the same addresses.
    .sort((a, b) => Number(b.endsWith('.md')) - Number(a.endsWith('.md')))
    .slice(0, MOST_MCP_PAGES_READ)
  const bodies = pages.length > 0 ? await inParallel(pages, (url) => fetchUrl(url, { accept: 'text/markdown, text/html' })) : []
  const inTheirPages = bodies
    .flatMap((got) => mcpUrls(got.body))
    .filter((url) => readsAsAnEndpoint(url) && readsAsTheirOwnAddress(url, domain))
  return {
    candidates: [...new Set([...inTheirFiles, ...inTheirPages])].slice(0, MOST_MCP_ADDRESSES_FROM_PAGES),
    followed: pages,
  }
}

/**
 * `documented` are addresses read out of the vendor's own MCP pages, and `onlyDocumented` runs the
 * second wave alone: the guesses, the card and the registry were already probed and re-asking them
 * would cost seven requests to learn what we know.
 */
async function probeMcpEndpoints(
  domain: string,
  site: string,
  { documented = [], onlyDocumented = false }: { documented?: string[]; onlyDocumented?: boolean } = {},
): Promise<McpProbe> {
  // The registry is somebody else's host, and nothing else in this phase starts until it answers.
  // Left unbounded it is one external point of failure that can push every MCP handshake past the
  // scan budget for every vendor, which is the mistake the npm phase already learned once.
  const [fromCard, fromRegistry] = onlyDocumented
    ? [[] as string[], { answered: true, urls: [] as string[] }]
    : await Promise.all([
        cardEndpoints(site),
        Promise.race([
          registryEndpoints(domain),
          // The budget expiring is the registry not answering, and it has to be reported as that.
          new Promise<{ answered: boolean; urls: string[] }>((resolve) =>
            setTimeout(() => resolve({ answered: false, urls: [] }), REGISTRY_BUDGET_MS),
          ),
        ]),
      ])
  const candidates = onlyDocumented
    ? [...new Set(documented)]
    : [...new Set([...mcpCandidates(domain, site, fromCard), ...fromRegistry.urls, ...documented])]
  /** Addresses the vendor named themselves, in their card or in their documentation. Not guesses. */
  const named = [...fromCard, ...documented]
  const handshake = {
    accept: 'application/json, text/event-stream',
    method: 'POST' as const,
    body: '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"LetAgentsIn","version":"1.0"}}}',
  }
  // Nearly every site answers 405 to a POST at a path it does not route, so "405 at /mcp" was
  // evidence of nothing and we published it as a live server on 18 domains. The control is the
  // same request at a path nobody registered, on the same origin, so the only thing that counts
  // is /mcp answering differently from the rest of the site.
  const controlSegment = 'mcp-letagentsin-control-8f3a1c'
  /**
   * The candidate's own directory, not the site root. njal.la answers /api/mcp with a JSON-RPC
   * CSRF refusal and answers /api/anything-else with byte-identical text, because the whole
   * /api/ prefix is one view; we published them as running a server that only talks to browsers.
   * A control at the site root cannot see that, because the root of that site 404s like any
   * other, so a namespace with a catch-all could hand any vendor an endpoint they never built.
   */
  const controlFor = (url: string) => {
    const parsed = new URL(url)
    const segments = parsed.pathname.split('/').filter(Boolean)
    segments[Math.max(segments.length - 1, 0)] = controlSegment
    return `${parsed.origin}/${segments.join('/')}`
  }
  const [results, control] = await Promise.all([
    inParallel(candidates, (url) =>
      // An MCP server speaks JSON-RPC over POST; a GET tells us far less and is what made us
      // read a live server as absent when its GET handler differed from its POST handler.
      fetchUrl(url, handshake),
    ),
    // The handshake, not a GET, because a control only discredits a candidate it was asked the
    // same way as. datadoghq.com's edge answers an unregistered subdomain 401 to a GET and 404
    // to this POST, so the GET arm declared a wildcard that the candidates never met and threw
    // away the 401 at mcp.datadoghq.com/v1/mcp, a live server, on the strength of it.
    fetchUrl(`https://mcp-letagentsin-control-8f3a1c.${domain}`, handshake),
  ])
  // A wildcard host behind an auth proxy answers 401 to anything, including a name nobody
  // registered. Then every domain would "run an MCP server".
  const wildcardAnswers = control.status === 401 || control.status === 405 || control.ok
  // Only against candidates that answered the same way it did. As one boolean over every status
  // it discarded mcp.chargebee.com, which challenges with a WWW-Authenticate Bearer naming its
  // own oauth-protected-resource, because an unregistered host on the same domain answered a
  // POST with 405. A wildcard proves nothing about a status it did not itself return.
  const discreditedByWildcard = (got: Fetched) => wildcardAnswers && got.status === control.status

  // A handshake that comes back with a protocol version is proof no wildcard can fake, so it
  // outranks the control probe. Without it, contentful.com's wildcard hid a server that answers.
  /**
   * Kept separate so the discard rule above and the evidence rule below cannot drift apart.
   *
   * An HTML body is the tell. Without a WWW-Authenticate header, mcp.sentry.io answers 6,698
   * bytes of Cloudflare interstitial and mcp.cloudinary.com 372 bytes of the same shape, while
   * a server that wants credentials answers in the protocol it speaks: contentful.com sends 79
   * bytes of JSON and datadoghq.com 27. We were reading a bot wall as an invitation.
   */
  const dedicatedHostChallenge = (got: Fetched, url: string) =>
    (got.status === 401 || got.status === 403) &&
    new URL(url).hostname.startsWith('mcp.') &&
    (Boolean(got.headers['www-authenticate']) || !looksLikeHtml(got))

  const completesHandshake = (body: string) =>
    /"protocolVersion"|"serverInfo"/.test(body) && /"jsonrpc"|"result"/.test(body)

  // Only for addresses the control could still discredit. Probing every origin up front cost
  // three more requests against the same per-site concurrency cap, and on telnyx.com that
  // starved the handshake that proves their server is real: a live MCP endpoint read as absent.
  const needsControl = [
    ...new Set(
      candidates
        .filter((url, index) => {
          const got = results[index]
          if (got.status === 0 || completesHandshake(got.body)) return false
          // An address the vendor named, in its own card or in the registry, is not a guess, so a
          // wildcard that answers everything does not discredit it. Without the registry half,
          // mcp.eu.phrase.com would be thrown out on a domain whose wildcard also answers 401 -
          // which is exactly the row 9.22 exists to fix.
          return !discreditedByWildcard(got) || named.includes(url) || fromRegistry.urls.includes(url)
        })
        .map(controlFor),
    ),
  ]
  // A second control, for the 405 shape only. The unrouted control cannot judge a 405: it answers
  // 404, or 200 on a single-page app, so it differs from the endpoint either way and the
  // difference means nothing. The front page is the opposite kind of control, a path that is
  // certainly routed, and it separates the two cleanly. openrouter.ai, medusajs.com and
  // posthog.com answer 405 with no Allow header at their own front page, at /docs, /models and
  // /pricing, because that is what Next.js on Vercel does with a POST to a static route, and all
  // three were published as running a live MCP server on that signal alone. The three hosts that
  // really do run one answer their front page 404 or 200, never the endpoint's status.
  const routedControlFor = (url: string) => `${new URL(url).origin}/`
  const needsRoutedControl = [
    ...new Set(
      candidates.filter((_, index) => results[index].status === 405 && !looksLikeHtml(results[index])).map(routedControlFor),
    ),
  ]
  const [controls, routedControls] = await Promise.all([
    inParallel(needsControl, (url) => fetchUrl(url, handshake)),
    inParallel(needsRoutedControl, (url) => fetchUrl(url, handshake)),
  ])
  const nonsense = new Map(needsControl.map((url, index) => [url, controls[index]]))
  const routed = new Map(needsRoutedControl.map((url, index) => [url, routedControls[index]]))

  const endpoints = results
    .map((got, index) => {
      if (completesHandshake(got.body)) {
        return { url: got.url, status: got.status, evidence: 'answers-json' as const }
      }
      // The wildcard probe only discredits addresses we guessed. An address the vendor named in
      // its own card is not a guess, and sentry.io's card points at another domain entirely.
      if (discreditedByWildcard(got) && !named.includes(candidates[index])) return null
      const control = nonsense.get(controlFor(candidates[index]))
      // Read after the control, never before it: the same refusal at a name nobody registered is
      // the namespace talking, not a server.
      if (got.ok && !looksLikeHtml(got) && BROWSER_ONLY_REFUSAL.test(got.body)) {
        if (control && BROWSER_ONLY_REFUSAL.test(control.body)) return null
        return { url: got.url, status: got.status, evidence: 'browser-only' as const }
      }
      const authenticating = got.status === 401 && Boolean(got.headers['www-authenticate'])
      // An unrouted path answering the same way means the answer was about the site, not about
      // MCP. Exempting the auth challenge is deliberate: a host that gates every path behind
      // OAuth is what an MCP server looks like, and mcp.sentry.dev is exactly that, while its
      // WWW-Authenticate header is something a marketing site's 405 never carries.
      if (!authenticating && !dedicatedHostChallenge(got, candidates[index]) && got.status === control?.status) return null
      // A page that only serves GET says so in Allow, and it answers a POST with its own HTML
      // error. firecrawl.dev, honeybadger.io, posthog.com and scrapingbee.com were all published
      // as running a server at a marketing or docs page on that 405, while their real endpoint
      // was one path away. An unrouted path 404s and a landing page 405s, so "different from the
      // control" can never separate the two on status alone.
      //
      // The third shape is the one that survived both those rules: mcp.firecrawl.dev sends the
      // handshake on to docs.firecrawl.dev/mcp-server, which answers 405 as JSON and carries no
      // Allow header at all. A server does not forward its own JSON-RPC POST to somebody else's
      // origin, so a probe that ended up on another origin is reading a documentation page.
      const wrongMethod =
        !leftTheEndpoint(candidates[index], got.url) &&
        methodRefusalIsRouted(got, routed.get(routedControlFor(candidates[index]))?.status)
      const speaksJson = got.ok && (got.headers['content-type'] ?? '').includes('json')
      // A 401 that an unrouted path on the same origin does not get. contentful.com and
      // datadoghq.com both answer their MCP path with {"error":"invalid_token"} and answer a
      // path nobody registered with 404, which is a routed endpoint asking for credentials,
      // but neither sends WWW-Authenticate, so all three shapes above missed them.
      // A host called mcp.<domain> exists because somebody built one. When every path on it
      // demands credentials, that is what an MCP server behind OAuth looks like, which is the
      // exemption mcp.sentry.dev already had through its WWW-Authenticate header. contentful.com
      // answers {"error":"invalid_token"} on every path of mcp.contentful.com and sends no such
      // header, and we published them as having no server while our own OAuth check was reading
      // metadata off that very host.
      const dedicatedHost = dedicatedHostChallenge(got, candidates[index])
      const demandsCredentials =
        (got.status === 401 || got.status === 403) &&
        !looksLikeHtml(got) &&
        (dedicatedHost || got.status !== control?.status)
      // 202 Accepted to a JSON-RPC POST, which is Streamable HTTP taking the message and answering
      // on a stream rather than in the response body. It reads as silence to every rule above,
      // because it is neither an auth challenge nor JSON nor the wrong method.
      //
      // The control carries the whole weight, as it does for the credential shapes, and kinde.com
      // is why: from our data centre every POST to mcp.kinde.com comes back 202 with an empty
      // body, including one to a path nobody registered, while the same address answers 401 from
      // a laptop. That is their edge swallowing our request, not their server accepting it, and
      // the flag below reports it as unmeasurable rather than as a verdict either way.
      const acceptsHandshake = got.status === 202 && !looksLikeHtml(got) && got.status !== control?.status
      if (!authenticating && !wrongMethod && !speaksJson && !demandsCredentials && !acceptsHandshake) return null
      return {
        // The address that answered, not the one we asked. pinecone.io/mcp is a redirect stub
        // and www.pinecone.io/mcp is the server, and a vendor checking our sentence has to be
        // able to send the same request we did.
        url: got.url,
        status: got.status,
        evidence:
          authenticating || demandsCredentials
            ? ('challenges' as const)
            : wrongMethod
              ? ('rejects-get' as const)
              : acceptsHandshake
                ? ('accepts-handshake' as const)
                : ('answers-json' as const),
      }
    })
    .filter((endpoint): endpoint is McpEndpoint => endpoint !== null)
  // The bare host first was naming a gateway's generic 401 as the server: mcp.newrelic.com
  // answers 401 at the root and the routed endpoint is one path down. A path somebody had to
  // register is better evidence than a host somebody had to point at us.
  const routedFirst = [...endpoints].sort(
    (a, b) => Number(new URL(a.url).pathname === '/') - Number(new URL(b.url).pathname === '/'),
  )
  // A status of zero is a host that never answered, which is the one case where we genuinely
  // found nothing out rather than found nothing.
  // Every POST answered the same way at a path nobody registered, with nothing in it. A site
  // whose edge does that has told us about itself and not about MCP, and calling that "nothing
  // answered at six addresses" is a claim we cannot support from here.
  // Either control will do, and the wildcard is the one that usually sees it: a host that answers
  // every POST also answers one to a subdomain nobody registered, which discredits the candidate
  // before the per-path control is ever fetched. That is why the first version of this flag never
  // fired on the domain it was written for.
  const emptyTwoHundred = (got: Fetched | undefined) =>
    got !== undefined && got.status >= 200 && got.status < 300 && got.body.trim().length === 0
  const swallowed = results.filter((got, index) => {
    if (!emptyTwoHundred(got)) return false
    const sibling = nonsense.get(controlFor(candidates[index]))
    const matching = (other: Fetched | undefined) => emptyTwoHundred(other) && other?.status === got.status
    return matching(sibling) || matching(control)
  })
  return {
    endpoints: routedFirst,
    answered: results.some((got) => got.status !== 0),
    registryAnswered: fromRegistry.answered,
    cardNamed: fromCard,
    swallowsPosts: routedFirst.length === 0 && swallowed.length > 0,
  }
}

export type FunnelInput = {
  domain: string
  site: string
  /**
   * The documentation prose to grep. A promise, because it is the one input none of the
   * network work below needs: waiting for the docs crawl to finish before opening a single
   * socket put the two longest phases of the scan end to end for no reason.
   */
  corpus: Promise<string>
  pricingUrl: string | null
  signupUrl: string | null
  /**
   * Where the documentation lives, when that is somewhere other than the site. Agent entry files
   * are published there far more often than on the apex, and probing only the apex is how we told
   * seventeen vendors they publish none while their docs origin served a skill.md.
   */
  docsUrl?: string | null
  alreadyFetchedPricing?: Fetched | null
  pricesVisibleWithoutJs?: boolean | null
}


/**
 * Whether a 405 says anything about this path, as opposed to about the framework serving it.
 *
 * `frontPageStatus` is the site's own front page answering the same JSON-RPC POST: a path that is
 * certainly routed, which is what the unrouted control cannot be. Next.js on Vercel answers every
 * POST to a static route with 405 and no Allow header, so on those sites the signal is the
 * platform talking and it published three vendors as running an MCP server at a documentation
 * page. On two of them it also hid the real one, because the docs URL sorted first among the
 * candidates and took the verdict's address with it.
 */
export function methodRefusalIsRouted(
  got: { status: number; headers: Record<string, string>; body: string },
  frontPageStatus: number | undefined,
): boolean {
  if (got.status !== 405) return false
  // A page that only serves GET usually says so, and saying so is proof this is an ordinary page.
  if (/\bGET\b/i.test(got.headers['allow'] ?? '')) return false
  if (looksLikeHtml(got as Fetched)) return false
  return frontPageStatus !== got.status
}

export async function scanFunnel({
  domain,
  site,
  corpus,
  pricingUrl,
  signupUrl,
  docsUrl = null,
  alreadyFetchedPricing = null,
  pricesVisibleWithoutJs = null,
}: FunnelInput): Promise<FunnelFindings> {
  const mcpPending = probeMcpEndpoints(domain, site)
  const oauthKnownPending = probeOauthOrigins(oauthTargetsKnownUpFront(domain, site, signupUrl))
  const signupPending = inspectSignup(signupUrl, site)
  const pricingPending = alreadyFetchedPricing ?? (pricingUrl ? fetchUrl(pricingUrl) : Promise.resolve(null))
  // The documentation origin, when it is not the site. An adversarial pass over the 139 rows that
  // said "none of the 9 known agent entry paths returns a file" found 17 of them publishing a
  // skill.md and a .well-known/mcp.json on their docs host, which we had never asked. It is the
  // same miss llms_txt already fixed for deepl.com and mixpanel.com, on a different check.
  const docsOrigin = (() => {
    if (!docsUrl) return null
    try {
      const found = new URL(docsUrl)
      if (found.origin === site) return null
      // It has to be their documentation. A brand can live on another company's site, which the
      // scanner already knows about elsewhere - twilio.com/docs/sendgrid is SendGrid's - so
      // without this we would probe twilio.com for SendGrid's entry files and publish
      // "Found: https://www.twilio.com/skill.md" on SendGrid's card. The same trap swallows every
      // vendor on a shared documentation platform, where one tenant-level file would be credited
      // to all of them.
      const theirs = registrableDomain(new URL(site).hostname)
      return registrableDomain(found.hostname) === theirs ? found.origin : null
    } catch {
      return null
    }
  })()
  // One control per origin, never one shared. A documentation platform answers every unknown .md
  // path with a rendered "page not found", so the site's control says nothing about the docs host
  // and using it would republish that 404 as a file the vendor publishes.
  const catchAllPending = servesCatchAllText(site)

  // The entry probes are the one thing that has to wait: on a site that answers every unknown
  // path they prove nothing, and firing them anyway would be nine requests spent to learn that.
  const catchAll = await catchAllPending
  const probeOne = (base: string, control: CatchAll, paths: string[] = [...AGENT_ENTRY_PATHS]) =>
    inParallel(paths, async (path) => {
    const catchAll = control
    // The namespace verdict no longer short-circuits the probe. sentry.io publishes a real 106
    // byte /.well-known/mcp.json and answers unknown paths in that namespace with a 20,402 byte
    // page shell, so "this namespace serves everything" threw away a file that is nothing like
    // what it serves. The body comparison below is the test that can tell them apart.
    const got = await fetchUrl(`${base}${path}`, { accept: entryAccept(path) })
    const controlLength = path.endsWith('.json')
      ? catchAll.bodyLengths?.json
      : path.endsWith('.txt')
        ? catchAll.bodyLengths?.text
        : catchAll.bodyLengths?.markdown
    const controlBody = path.endsWith('.json')
      ? catchAll.bodies?.json
      : path.endsWith('.txt')
        ? catchAll.bodies?.text
        : catchAll.bodies?.markdown
    const sameTemplate = answersWithTheSameTemplate(got.body, controlBody)
    const sameAsNonsense =
      sameTemplate || (controlLength !== undefined && controlLength > 0 && got.body.length === controlLength)
    const present = !sameAsNonsense && isRealTextFile(got, 30) && !looksLikeADocsPageTwin(got.body)
    // The same predicate the rest of the scanner uses. This one counted a 429 as a refusal,
    // which is our own load: name.com answered the door test (200, 200, 429) and was reported as
    // refusing all nine entry paths on the origin whose llms.txt we had just read in full.
    const refused = isEdgeRefusal(got.status)
    return [`${base}${path}`, present, present && describesAProcedure(got.body), got.body, refused, base] as const
  })

  // The site first, and the documentation host only when the site had nothing. Asking both every
  // time doubled the requests we make to an edge that is already deciding whether to refuse us,
  // and it cost bitmovin.com two points on the 9.19 reseed: they publish a real skill.md, they
  // answer our data centre 403 under load, and eighteen probes tripped that where nine had not.
  // The 17 vendors this whole change is for have nothing on the apex, so they still reach here.
  // Nor when the site refused us. A refusal means we do not know what is on the apex, and nine
  // more requests to an edge that is currently turning us away is how bitmovin.com went from
  // "found your skill.md" to "8 of 18 refused" between two runs minutes apart. If the site would
  // not answer, that is the finding, and it is reported out of the nine paths we actually asked.
  const probeEntry = (async () => {
    const onSite = await probeOne(site, catchAll)
    const nothing = (probed: typeof onSite) => !probed.some((entry) => entry[1])
    const refusedUs = (probed: typeof onSite) => probed.some((entry) => entry[4])
    if (!nothing(onSite) || refusedUs(onSite)) return onSite
    // The spelling people actually use in a repository, asked only when the lower-case nine found
    // nothing. clerk.com serves a real skill file at /SKILL.md and answers /skill.md with a 404,
    // on an origin whose nonsense paths also 404, so it is a file at a casing we never tried
    // rather than a catch-all. Three paths rather than nine: these are the spellings the AGENTS.md
    // convention produced, and every extra probe is traffic a vendor did not ask for.
    const upper = await probeOne(site, catchAll, [...UPPERCASE_ENTRY_PATHS])
    if (!nothing(upper)) return [...onSite, ...upper]
    if (!docsOrigin || refusedUs(upper)) return [...onSite, ...upper]
    return [...onSite, ...upper, ...(await probeOne(docsOrigin, await servesCatchAllText(docsOrigin)))]
  })()

  /**
   * A body served at more than one of these paths is the site's shell, whatever the control
   * probe happened to land on. sentry.io answers /ai.txt and every other path with the same 976
   * byte markdown page, and returns it or a 20 kB HTML page depending on the request, so a
   * single control sample can miss it. Two of our own probes agreeing is proof by itself.
   *
   * Counted per origin, because "the same body twice" only means a shell when one server served
   * both. A vendor whose apex and docs host serve the same real skill.md would otherwise have it
   * discarded for being served consistently.
   *
   * Compared with the path segments stripped, the same normalisation the control comparison uses,
   * because a template that writes the requested path into its own body produces a different
   * string every time and defeats an exact match. docs.slatejs.org does exactly that, and on the
   * 9.19 reseed it was credited with four separate entry files that are one page: our own audit
   * caught the row contradicting itself, which is the only reason this was found.
   */
  const entriesPending = probeEntry.then((probed) => {
    const shapeOf = (base: string, body: string) =>
      `${base}\n${body.replace(/\/[\w.@~-]+/g, ' ').replace(/\s+/g, ' ').trim()}`
    const seenBodies = new Map<string, number>()
    for (const [, present, , body, , base] of probed) {
      if (present) seenBodies.set(shapeOf(base, body), (seenBodies.get(shapeOf(base, body)) ?? 0) + 1)
    }
    return probed.map(([path, present, procedure, body, refused, base]) => {
      const shared = present && (seenBodies.get(shapeOf(base, body)) ?? 0) > 1
      return [path, present && !shared, procedure && !shared, refused] as const
    })
  })

  const firstWave = await mcpPending
  // Only when the guesses, the card and the registry all came back empty, which is what the 93
  // rows accused on this check have in common. Their own MCP pages are the last source left and
  // the only one they wrote themselves: neon.com documents mcp.neon.tech, launchdarkly.com
  // documents a path on their own host that no guess reaches, and both answer a real JSON-RPC
  // challenge while we published that they run no server at all.
  const deeper =
    firstWave.endpoints.length === 0 ? await addressesInTheirMcpPages(domain, await corpus) : { candidates: [], followed: [] }
  // Only the endpoints are taken from the second wave. Everything else the probe reports is about
  // the first one: whether any host answered, what their card named, whether the edge swallowed
  // our posts. A second wave that finds nothing must not overwrite those with its own emptiness.
  const secondWave =
    deeper.candidates.length > 0
      ? await probeMcpEndpoints(domain, site, { documented: deeper.candidates, onlyDocumented: true })
      : null
  const mcp = secondWave && secondWave.endpoints.length > 0 ? { ...firstWave, endpoints: secondWave.endpoints } : firstWave
  const mcpEndpoints = mcp.endpoints
  const mcpOrigins = [...new Set(mcpEndpoints.map((endpoint) => new URL(endpoint.url).origin))]
  const alreadyProbed = new Set((await oauthKnownPending).origins)
  const [oauthKnown, oauthFromMcp, entries, signup, pricingPage] = await Promise.all([
    oauthKnownPending,
    probeOauthOrigins(
      mcpOrigins.filter((origin) => !alreadyProbed.has(origin)).map((origin) => ({ origin, paths: OAUTH_METADATA_PATHS })),
    ),
    entriesPending,
    signupPending,
    pricingPending,
  ])
  const firstTwoWaves = mergeOauthProbes(oauthKnown, oauthFromMcp)
  // A third wave, and only when the first two found nothing, so it costs nothing on the four rows
  // in five that already have their answer. The twenty-second adversarial pass measured what it
  // buys: of 94 rows scoring zero here, 16 publish metadata on a host we never asked, 13 of them
  // already read "OAuth metadata published, but no registration_endpoint in it" because another
  // host carried it, and three published the false sentence. Those three are auth2.liveblocks.io,
  // sso.meilisearch.com and account.here.com, which is exactly three prefixes we did not guess -
  // note `account` singular against the `accounts` we already had.
  // Both earlier waves came back empty here, so their only contribution is the host count the
  // sentence quotes, and stating it explicitly keeps that count honest.
  const nothingFoundYet: OauthProbe = {
    metadataPublished: false,
    dynamicClientRegistration: false,
    origins: [...new Set([...oauthKnown.origins, ...oauthFromMcp.origins])],
  }
  const oauth = firstTwoWaves.metadataPublished
    ? firstTwoWaves
    : mergeOauthProbes(
        nothingFoundYet,
        await probeOauthOrigins(
          LAST_RESORT_AUTH_SUBDOMAINS.map((prefix) => ({
            origin: `https://${prefix}.${domain.replace(/^www\./, '')}`,
            paths: ['/.well-known/oauth-authorization-server', '/.well-known/openid-configuration'],
          })),
        ),
      )

  // supertokens.com answered the same URL with and without its free-tier wording forty minutes
  // apart, which moved a scored point. Pricing pages are assembled and cached like any other
  // page, so one fetch is a sample. Reading it again and taking the union of what was stated
  // is the same rule the door test already follows, applied to content instead of status.
  const pricingRetry = pricingPage?.ok && pricingUrl ? await fetchUrl(pricingUrl, { fresh: true }) : null

  const entryPaths = Object.fromEntries(entries.map(([path, hit]) => [path, hit]))
  const entryPathsRefused = entries.filter(([, , , refused]) => refused).length
  // Split by origin, because they answer different questions. A refusal on the site means we do
  // not know what the site publishes. A refusal on the documentation host, after the site answered
  // cleanly and held nothing, does not undo that measurement: reporting the pair as one
  // "unmeasurable" handed a free pass to every vendor whose docs platform turns us away.
  const entrySiteRefused = entries.filter(([url, , , refused]) => refused && url.startsWith(site)).length
  const firstPricingText = pricingPage?.ok && visibleTextLength(pricingPage.body) > 0 ? pricingPage.body : ''
  const retryText = pricingRetry?.ok && visibleTextLength(pricingRetry.body) > 0 ? pricingRetry.body : ''
  const pricingText = retryText ? `${firstPricingText}\n${retryText}` : firstPricingText
  const pricingTruncated = Boolean(pricingPage?.truncated) || Boolean(pricingRetry?.truncated)

  return {
    entryPaths,
    entryPointsFound: entries.filter(([, hit]) => hit).map(([path]) => path),
    entryPointsWithProcedure: entries.filter(([, , procedure]) => procedure).map(([path]) => path),
    entryPathsRefused,
    entryProbesAsked: entries.length,
    entrySiteRefused,
    entryDocsProbed: docsOrigin !== null && entries.some(([url]) => url.startsWith(docsOrigin)),
    oauth,
    mcpEndpoints,
    mcpProbed: mcp.answered,
    mcpRegistryAnswered: firstWave.registryAnswered,
    mcpCardNamed: mcp.cardNamed,
    mcpPostsSwallowed: mcp.swallowsPosts,
    mcpPagesFollowed: deeper.followed,
    signup,
    provisioning: {
      programmatic: provisioningMatches(await corpus),
      programmaticQuotes: provisioningQuotes(await corpus),
      selfServeSignals: matching(SELF_SERVE_PATTERNS, pricingText),
      selfServeQuotes: quoting(SELF_SERVE_PATTERNS, pricingText),
      selfServeIsButtonOnly: everyFreeSignalIsAButton(SELF_SERVE_PATTERNS, visibleText(pricingText)),
      selfServeOnlyAsked: everyFreeSignalIsAQuestion(SELF_SERVE_PATTERNS, visibleText(pricingText)),
    },
    servesCatchAll: catchAll.markdown || catchAll.json || catchAll.text,
    catchAll,
    pricingFetched: Boolean(pricingPage?.ok),
    pricesVisibleWithoutJs,
    pricingTextLength: firstPricingText ? visibleTextLength(firstPricingText) : 0,
    pricingTruncated,
    pricingTriesDisagreed:
      retryText.length > 0 &&
      matching(SELF_SERVE_PATTERNS, firstPricingText).length !== matching(SELF_SERVE_PATTERNS, retryText).length,
  }
}
