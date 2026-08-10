import { fetchUrl, inParallel, looksLikeHtml } from './http'

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

/** The worst delay any AI crawler is actually subject to, not only the wildcard group. */
function crawlDelayForAgents(groups: Map<string, Rules>): number | null {
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
