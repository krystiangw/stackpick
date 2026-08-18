import { fetchUrl, inParallel, looksLikeHtml, type Fetched } from './http'

export type CrawlerClass = 'training' | 'search' | 'user'
export type CrawlerVerdict = 'blocked' | 'allowed_explicit' | 'unspecified'

export const AI_CRAWLERS: { name: string; class: CrawlerClass }[] = [
  { name: 'GPTBot', class: 'training' },
  { name: 'ClaudeBot', class: 'training' },
  { name: 'anthropic-ai', class: 'training' },
  { name: 'Google-Extended', class: 'training' },
  { name: 'Bytespider', class: 'training' },
  { name: 'meta-externalagent', class: 'training' },
  { name: 'Applebot-Extended', class: 'training' },
  { name: 'OAI-SearchBot', class: 'search' },
  { name: 'Claude-SearchBot', class: 'search' },
  { name: 'PerplexityBot', class: 'search' },
  { name: 'ChatGPT-User', class: 'user' },
  { name: 'Claude-User', class: 'user' },
  { name: 'Perplexity-User', class: 'user' },
]

type Rules = { allow: string[]; disallow: string[]; crawlDelay?: number }

export type RobotsFindings = {
  present: boolean
  /**
   * True when the file was refused rather than absent. A 403 is not permission: bitmovin.com,
   * vonage.com and pandadoc.com all publish a robots.txt and all answer 403 to us, and we
   * awarded each of them a point for "no robots.txt, so nothing is disallowed for anyone",
   * having failed ckeditor.com for the Crawl-delay that bitmovin also publishes.
   */
  unreadable: boolean
  crawlers: Record<string, CrawlerVerdict>
  /** True when a group naming us disallows everything, which is the opt-out /bot promises. */
  asksUsToStayOut: boolean
  blockedByClass: Record<CrawlerClass, string[]>
  blanketDisallowAll: boolean
  /** A polite agent reading 20 doc pages waits this many seconds times 20. */
  crawlDelaySeconds: number | null
  contentSignal: string | null
  contentUsage: string | null
  declaresLlmsTxt: boolean
  sitemap: boolean
  /**
   * An Allow line naming a concrete path is a claim that the path is worth fetching, and it is
   * the only part of robots.txt that names a resource rather than a pattern. Wildcards and
   * directory prefixes are excluded on purpose: `Allow: /*.js$` is a rule, not a page, and
   * probing it would invent a failure. Null when the vendor makes no such claim.
   *
   * Measured 2026-08-10 across the corpus: 9 of 34 concrete Allow paths answer 404, and six of
   * the nine are sendgrid.com pointing an agent at SDK reference pages that do not exist.
   */
  allowPaths: { checked: number; dead: string[]; unanswered: { path: string; status: number }[] } | null
}

export function parseRobots(body: string): Map<string, Rules> {
  const groups = new Map<string, Rules>()
  let currentAgents: string[] = []
  let expectingAgents = true

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.split('#')[0].trim()
    if (!line) continue

    const separator = line.indexOf(':')
    if (separator === -1) continue
    const key = line.slice(0, separator).trim().toLowerCase()
    const value = line.slice(separator + 1).trim()

    if (key === 'user-agent') {
      // A new user-agent line after directives starts a fresh group.
      if (!expectingAgents) currentAgents = []
      currentAgents.push(value)
      expectingAgents = true
      continue
    }

    expectingAgents = false
    for (const agent of currentAgents) {
      const rules = groups.get(agent) ?? { allow: [], disallow: [] }
      if (key === 'allow') rules.allow.push(value)
      else if (key === 'disallow') rules.disallow.push(value)
      else if (key === 'crawl-delay') {
        const seconds = Number.parseFloat(value)
        if (Number.isFinite(seconds)) rules.crawlDelay = seconds
      }
      groups.set(agent, rules)
    }
  }
  return groups
}

/**
 * RFC 9309 matches on the product token, so "User-agent: ChatGPT-User/1.0" is a group for
 * ChatGPT-User. Exact string comparison read that as unspecified and handed out a pass.
 */
function verdictFor(groups: Map<string, Rules>, crawler: string): CrawlerVerdict {
  const wanted = crawler.toLowerCase()
  for (const [agent, rules] of groups) {
    const token = agent.toLowerCase().split('/')[0].trim()
    if (token !== wanted) continue
    return rules.disallow.includes('/') ? 'blocked' : 'allowed_explicit'
  }
  return 'unspecified'
}

/**
 * Whether the site's robots.txt tells US, by name, to stay out.
 *
 * `/bot` promises that two lines in robots.txt stop the scanner, and a promise about our own
 * behaviour is the one kind we cannot leave to good intentions. Only a group naming us counts: the
 * wildcard is deliberately ignored, because a site that disallows `*` is describing a policy for
 * crawlers that take content, and we take none. RFC 9309 reads a name as everything before the
 * slash, so `LetAgentsIn/1.0` and `letagentsin` are one group.
 *
 * A vendor can use this to leave the corpus, and that is the point rather than a flaw: the row
 * says they asked us not to look, which is a published fact about them and not a score they hid.
 */
export function asksUsToStayOut(groups: Map<string, Rules>): boolean {
  // Every group that names us, not the first one. `LetAgentsIn` and `LetAgentsIn/1.0` are separate
  // keys in the parsed map, so a file that spells it both ways would have been read as a refusal
  // to stop on the strength of whichever came first.
  for (const [agent, rules] of groups) {
    const token = agent.toLowerCase().split('/')[0].trim()
    if (token !== 'letagentsin') continue
    // An empty `Disallow:` means the opposite in RFC 9309, so only the explicit slash counts.
    if (rules.disallow.includes('/')) return true
  }
  return false
}

/**
 * The worst delay any AI crawler is actually subject to, not only the wildcard group.
 *
 * RFC 9309 says a crawler obeys the group naming it and ignores the wildcard once it has one of
 * its own, which sounds like it should change this into a per-agent resolution. Written that way
 * and measured over 141 robots.txt files, including all eight that carry a Crawl-delay at all,
 * it moved nothing: the two readings can only part when every one of the thirteen crawlers has
 * its own delay-free group, because otherwise the remaining ones still inherit the wildcard and
 * the maximum is the same number. The simpler version stands.
 */
export function crawlDelayForAgents(groups: Map<string, Rules>): number | null {
  const relevant = [...groups.entries()].filter(([agent]) => {
    const token = agent.toLowerCase().split('/')[0].trim()
    return token === '*' || AI_CRAWLERS.some((crawler) => crawler.name.toLowerCase() === token)
  })
  const delays = relevant.map(([, rules]) => rules.crawlDelay).filter((delay): delay is number => delay !== undefined)
  return delays.length > 0 ? Math.max(...delays) : null
}

function directiveValue(body: string, name: string): string | null {
  const match = body.match(new RegExp(`^\\s*${name}\\s*:\\s*(.+)$`, 'im'))
  return match ? match[1].trim() : null
}

/**
 * Asked once, before an automated scan, so a domain that told us to stay out is never fetched.
 *
 * Deliberately its own request rather than a flag read out of the scan that already happened: by
 * the time a scan has parsed robots.txt it has also asked for the home page, the documentation and
 * a dozen well-known paths, which is the traffic the opt-out is about.
 *
 * A scan a person asked for on our own site still runs. That is the line Google draws between a
 * crawler and a user-triggered fetcher, and it is the honest one: robots.txt speaks to automation
 * deciding for itself, not to somebody asking a question about their own domain.
 */
/**
 * Three answers, not two, because the third one decides whether a frozen row thaws.
 *
 * `unknown` is a robots.txt we could not read: a 500, a challenge, an HTML error page. Folded into
 * "they are not asking", it would have unfrozen a row on one bad minute at their edge and resumed
 * automated fetching of a domain that never withdrew anything. Absence of evidence is not evidence
 * of absence, and this is the place where that costs somebody else something.
 *
 * A 404 is the one status that is an answer: there is no robots.txt, so there is no request in it.
 */
export type StanceTowardsUs = 'out' | 'in' | 'unknown'

export function stanceFrom(robots: Fetched): StanceTowardsUs {
  if (robots.status === 404) return 'in'
  if (!robots.ok || looksLikeHtml(robots)) return 'unknown'
  return asksUsToStayOut(parseRobots(robots.body)) ? 'out' : 'in'
}

export async function stanceTowardsUs(site: string): Promise<StanceTowardsUs> {
  return stanceFrom(await fetchUrl(`${site}/robots.txt`, { accept: 'text/plain' }))
}

export async function scanRobots(site: string): Promise<RobotsFindings> {
  const robots = await fetchUrl(`${site}/robots.txt`, { accept: 'text/plain' })
  const present = robots.ok && !looksLikeHtml(robots)
  // 404 is the one status that means absent. Everything else means we did not get to read it.
  const unreadable = !present && robots.status !== 404
  const groups = present ? parseRobots(robots.body) : new Map<string, Rules>()

  const crawlers: Record<string, CrawlerVerdict> = {}
  const blockedByClass: Record<CrawlerClass, string[]> = { training: [], search: [], user: [] }
  for (const crawler of AI_CRAWLERS) {
    const verdict = verdictFor(groups, crawler.name)
    crawlers[crawler.name] = verdict
    if (verdict === 'blocked') blockedByClass[crawler.class].push(crawler.name)
  }

  const wildcard = groups.get('*')
  return {
    present,
    unreadable,
    asksUsToStayOut: asksUsToStayOut(groups),
    crawlers,
    blockedByClass,
    blanketDisallowAll: wildcard?.disallow.includes('/') ?? false,
    crawlDelaySeconds: crawlDelayForAgents(groups),
    contentSignal: present ? directiveValue(robots.body, 'content-signal') : null,
    contentUsage: present ? directiveValue(robots.body, 'content-usage') : null,
    declaresLlmsTxt: present && robots.body.toLowerCase().includes('llms.txt'),
    sitemap: present && /^\s*sitemap\s*:/im.test(robots.body),
    allowPaths: present ? await checkAllowPaths(site, robots.body) : null,
  }
}

/** At most six, spread over the file, because this is a courtesy check and not a crawl. */
const MOST_ALLOW_PATHS = 6

/**
 * WordPress writes `Allow: /wp-admin/admin-ajax.php` into robots.txt on every install, and it is
 * a POST endpoint that answers a GET with 400 by design. It is boilerplate rather than a claim
 * about a page, so counting it made three vendors carry a sentence saying their one allowed path
 * answers when it had just refused us. Same category error as a wildcard, one layer down.
 */
const BOILERPLATE_ALLOW = /\/wp-admin\/admin-ajax\.php$/i

async function checkAllowPaths(site: string, body: string): Promise<RobotsFindings['allowPaths']> {
  const paths = [...new Set([...body.matchAll(/^\s*allow:\s*(\S+)/gim)].map((match) => match[1]))].filter(
    (path) =>
      path.startsWith('/') &&
      path.length > 1 &&
      !path.includes('*') &&
      !path.includes('$') &&
      !path.endsWith('/') &&
      !BOILERPLATE_ALLOW.test(path),
  )
  if (paths.length === 0) return null
  const sample = paths.slice(0, MOST_ALLOW_PATHS)
  const answers = await inParallel(sample, (path) => fetchUrl(`${site}${path}`))
  // Only 404 and 410 count as gone, for the same reason as the llms.txt sampler: a 403 is their
  // edge refusing us and a 429 is our own load, and neither is a fact about the path existing.
  const dead = sample.filter((_, index) => answers[index].status === 404 || answers[index].status === 410)
  // Everything else that is not a success. Not counted against them, and not called an answer
  // either: name.com allows /account/create and refuses us 403 there, which "all answer" hid.
  const unanswered = sample
    .map((path, index) => ({ path, status: answers[index].status }))
    .filter((entry) => !dead.includes(entry.path) && (entry.status < 200 || entry.status >= 400))
  return { checked: sample.length, dead, unanswered }
}
