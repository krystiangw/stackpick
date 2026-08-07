import { fetchUrl, looksLikeHtml } from './http'

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
  crawlers: Record<string, CrawlerVerdict>
  blockedByClass: Record<CrawlerClass, string[]>
  blanketDisallowAll: boolean
  /** A polite agent reading 20 doc pages waits this many seconds times 20. */
  crawlDelaySeconds: number | null
  contentSignal: string | null
  contentUsage: string | null
  declaresLlmsTxt: boolean
  sitemap: boolean
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
    crawlers,
    blockedByClass,
    blanketDisallowAll: wildcard?.disallow.includes('/') ?? false,
    crawlDelaySeconds: crawlDelayForAgents(groups),
    contentSignal: present ? directiveValue(robots.body, 'content-signal') : null,
    contentUsage: present ? directiveValue(robots.body, 'content-usage') : null,
    declaresLlmsTxt: present && robots.body.toLowerCase().includes('llms.txt'),
    sitemap: present && /^\s*sitemap\s*:/im.test(robots.body),
  }
}
