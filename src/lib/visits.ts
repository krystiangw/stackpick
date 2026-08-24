import { getStore } from './store'

/**
 * How many times each page was rendered, by day. No cookies, no identifiers, no third party:
 * we sell vendors the argument that an agent should be able to read a page without running a
 * bundle, so a tracker that needs JavaScript would miss exactly the visitor we care about and
 * would sit badly next to what we tell them.
 *
 * Counted in the server components rather than in middleware, which runs on the edge runtime
 * where the store is not reachable, and rather than in a client beacon, which an agent fetching
 * HTML never fires.
 *
 * Deliberately not published on the site. Our own scores and error rates are published because a
 * reader can check them against the corpus; a visit count is a fact about us that nobody can
 * verify and that helps nobody decide anything.
 */
export type VisitDay = { day: string; path: string; count: number }

/**
 * Our own tooling, which must not appear in our own numbers. The audit fetches /findings and
 * /report after every reseed, and within a day of shipping this counter that alone was 29 of the
 * 39 recorded agent renders. The first conclusion anybody would draw from the data would have
 * been that agents love the findings page, and it would have been us.
 */
const OURS = /LetAgentsIn|letagentsin-audit/i

/**
 * The stored key packs the path and the kind of visitor into one string, and both halves are read
 * back by the audits. Written out by hand in two places it drifted immediately: the counter filed
 * `/r/<domain> browser` while an audit asked for `/r/<id>`, so the reach number was zero for a
 * reason that had nothing to do with visits (codex). One function writes it, one reads it.
 */
export const visitKey = (path: string, kind: string): string => `${path} ${kind}`
export const pathOf = (key: string): string => (key.includes(' ') ? key.slice(0, key.lastIndexOf(' ')) : key)
export const kindOf = (key: string): string => (key.includes(' ') ? key.slice(key.lastIndexOf(' ') + 1) : '')

/**
 * The client families we file a visit under. A closed list on purpose: the point is to split the
 * "not a browser" half of our traffic into things that mean different things - a person's browser,
 * a script somebody wrote, a headless browser driving the page - without keeping a string that
 * describes one visitor closely enough to recognise them again.
 *
 * Ordered, first match wins. Headless before Chrome because it says both; Edge and every other
 * Chromium shell before Chrome for the same reason; Safari last of the browsers because Chrome's
 * user agent claims Safari too.
 */
const FAMILIES: [name: string, marker: RegExp][] = [
  ['headless-chrome', /HeadlessChrome|Puppeteer|Playwright/i],
  ['curl', /^curl\//i],
  ['wget', /^Wget/i],
  ['python', /python-requests|httpx|aiohttp|urllib|scrapy|Python\//i],
  ['node', /node-fetch|undici|axios|got \(|Node\.js/i],
  ['go', /Go-http-client|go-resty/i],
  ['java', /Java\/|okhttp|Apache-HttpClient/i],
  ['php', /GuzzleHttp|PHP\//i],
  ['ruby', /Ruby|Faraday/i],
  ['rust', /reqwest|rust-/i],
  // Na iOS kazda przegladarka jest Safari pod spodem i tak sie przedstawia, wiec jej wlasny token
  // musi zostac przeczytany, zanim `Safari/` zgarnie wszystko do jednego kubla.
  ['edge', /Edg[A-Z]?\/|EdgiOS\//],
  ['opera', /OPR\/|OPiOS\//],
  ['firefox', /Firefox\/|FxiOS\//],
  ['chrome', /Chrome\/|Chromium\/|CriOS\//],
  ['safari', /Safari\//],
]

export const FAMILY_NAMES = [...FAMILIES.map(([name]) => name), 'other', 'none'] as const

/**
 * A coarse family and nothing else. Never the user agent itself: a full string carries version,
 * build and platform, which together single somebody out, and we have no use for any of that. The
 * question this answers is "how much of the half that is not a browser is a script", which needs
 * one token out of a fixed list.
 */
export function clientFamily(userAgent?: string | null): string {
  if (!userAgent) return 'none'
  return FAMILIES.find(([, marker]) => marker.test(userAgent))?.[0] ?? 'other'
}

/** Never throws and never blocks the page: a counter that can 500 a page is worse than no counter. */
export function recordVisit(path: string, userAgent?: string | null): void {
  if (userAgent && OURS.test(userAgent)) return
  const day = new Date().toISOString().slice(0, 10)
  // An agent and a browser are different visitors and the difference is the product's subject.
  // A crawler we can name is a third thing: it says which index has a chance of holding us.
  const kind = crawlerName(userAgent) ?? (looksLikeAgent(userAgent) ? 'agent' : 'browser')
  void getStore()
    .recordVisit({ day, path: visitKey(path, kind), family: clientFamily(userAgent) })
    .catch((error) => console.error('visit counter failed, page unaffected', error))
}

/**
 * The crawlers whose visit answers a question we otherwise cannot answer about ourselves.
 *
 * Four different indexes ground the four assistants, three of them will not tell us whether we are
 * in them without an account, and one of them has no submission mechanism at all. A named fetch is
 * weaker evidence than an index entry, because being crawled is not being indexed, but it is strong
 * in the other direction: a crawler that has never come cannot have indexed anything.
 *
 * Brave is the exception worth stating, because Claude grounds on it: Brave builds its index partly
 * from what people browse rather than only from a crawler of its own, so an absent Brave row here is
 * evidence of nothing. Every other name on this list is a real crawler that either arrives or does not.
 *
 * Ordered, first match wins: `ChatGPT-User` and `OAI-SearchBot` are different questions (a fetch a
 * person triggered against the crawler that builds OpenAI's index) and both contain neither the
 * other's name nor a shared prefix, but Claude's three do overlap.
 */
const NAMED_CRAWLERS: [name: string, marker: RegExp][] = [
  ['oai-searchbot', /OAI-SearchBot/i],
  ['chatgpt-user', /ChatGPT-User/i],
  ['gptbot', /GPTBot/i],
  ['claude-searchbot', /Claude-SearchBot/i],
  ['claude-user', /Claude-User/i],
  ['claudebot', /ClaudeBot/i],
  ['perplexity-user', /Perplexity-User/i],
  ['perplexitybot', /PerplexityBot/i],
  ['googlebot', /Googlebot/i],
  ['google-extended', /Google-Extended/i],
  ['bingbot', /bingbot/i],
  ['applebot', /Applebot/i],
  ['meta-externalagent', /meta-externalagent/i],
]

/** The name we file the visit under, or null when it is not one of the crawlers we are watching. */
export function crawlerName(userAgent?: string | null): string | null {
  if (!userAgent) return null
  return NAMED_CRAWLERS.find(([, marker]) => marker.test(userAgent))?.[0] ?? null
}

const AGENT_MARKERS =
  /bot\b|crawler|spider|claude|gpt|openai|anthropic|perplexity|curl|wget|python-requests|httpx|node-fetch|axios|go-http|java\/|okhttp|HeadlessChrome|Puppeteer|Playwright/i

function looksLikeAgent(userAgent?: string | null): boolean {
  if (!userAgent) return true
  if (AGENT_MARKERS.test(userAgent)) return true
  // Every real browser says Mozilla. Anything that does not is a client someone wrote.
  return !/^Mozilla\//.test(userAgent)
}
