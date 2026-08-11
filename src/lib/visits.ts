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

/** Never throws and never blocks the page: a counter that can 500 a page is worse than no counter. */
export function recordVisit(path: string, userAgent?: string | null): void {
  const day = new Date().toISOString().slice(0, 10)
  // An agent and a browser are different visitors and the difference is the product's subject.
  const kind = looksLikeAgent(userAgent) ? 'agent' : 'browser'
  void getStore()
    .recordVisit({ day, path: `${path} ${kind}` })
    .catch((error) => console.error('visit counter failed, page unaffected', error))
}

const AGENT_MARKERS =
  /bot\b|crawler|spider|claude|gpt|openai|anthropic|perplexity|curl|wget|python-requests|httpx|node-fetch|axios|go-http|java\/|okhttp/i

function looksLikeAgent(userAgent?: string | null): boolean {
  if (!userAgent) return true
  if (AGENT_MARKERS.test(userAgent)) return true
  // Every real browser says Mozilla. Anything that does not is a client someone wrote.
  return !/^Mozilla\//.test(userAgent)
}
