import type { Comparison } from './compare'
import type { ScanFindings } from './scan'
import type { Scorecard, ScoredCheck } from './score'

/**
 * A scorecard tells a vendor what is wrong. This tells them what to do on Monday, in the
 * order that buys the most points for the least work, and what the number becomes if they do.
 */

export type Effort = 'minutes' | 'an afternoon' | 'a project'

const EFFORT_RANK: Record<Effort, number> = { minutes: 0, 'an afternoon': 1, 'a project': 2 }

export type FixStep = {
  checkId: string
  label: string
  /** Points this single fix adds, never more than the check is worth. */
  gain: number
  effort: Effort
  /** One instruction, concrete enough to hand to whoever owns the repo. */
  how: string
}

export type FixPlan = {
  /** The whole plan in one sentence, with the arithmetic done. */
  claim: string
  steps: FixStep[]
  /** Steps cheap enough to be worth quoting in the claim. */
  quickWins: FixStep[]
  gain: number
  from: number
  to: number
  max: number
  /** Peers currently above the subject that the quick wins would put it past. */
  overtakes: string[]
}

type Remedy = { effort: Effort; how: (findings: ScanFindings, check: ScoredCheck) => string }

const REMEDIES: Record<string, Remedy> = {
  answers_plain_request: {
    effort: 'an afternoon',
    how: (f) =>
      `Exempt your public pages from the rule that answers ${f.homeStatus} to requests without browser headers. Rate limit them instead of refusing them.`,
  },
  llms_txt: {
    effort: 'minutes',
    how: () =>
      'Publish /llms.txt: a markdown list linking your quickstart, API reference, pricing and package name. It is the cheapest file on this list.',
  },
  docs_without_js: {
    effort: 'a project',
    how: (f) =>
      `Server-render the docs or mirror them as markdown. Right now a plain fetch gets ${f.docsTextChars.toLocaleString('en-US')} characters, which reads as an empty product.`,
  },
  user_agents_allowed: {
    effort: 'minutes',
    how: (f) => {
      const blocked = f.robots.blockedByClass.user
      return blocked.length > 0
        ? `Remove ${blocked.join(' and ')} from the disallow group in robots.txt. They fetch for a person who asked about you, not for a training set.`
        : 'Give on-demand agents an explicit allow group in robots.txt, so no blanket rule catches them by accident.'
    },
  },
  no_crawl_delay: {
    effort: 'minutes',
    how: (f) =>
      `Drop Crawl-delay: ${f.robots.crawlDelaySeconds}, or scope it to the crawlers you actually want to slow down. It currently applies to every agent, including your customer's.`,
  },
  agent_entry_point: {
    effort: 'an afternoon',
    how: () =>
      'Publish /agent-signup.md: the path from nothing to a working key, written as steps for a machine rather than a tour for a person.',
  },
  oauth_dcr: {
    effort: 'a project',
    how: () =>
      'Expose an RFC 7591 registration_endpoint in your OAuth metadata. It is the only standard way an agent registers itself without a human.',
  },
  mcp_present: {
    effort: 'a project',
    how: (f) =>
      f.machine.mcp.mentions > 0
        ? 'You already talk about MCP. Ship the server and declare it at /.well-known/mcp.json so an agent finds it without reading marketing copy.'
        : 'Wrap your top three API calls in an MCP server and declare it at /.well-known/mcp.json.',
  },
  signup_no_captcha: {
    effort: 'an afternoon',
    how: (f) =>
      `Trigger ${f.funnel.signup.captcha[0] ?? 'the challenge'} on a risk signal instead of on every signup, or open an API path to an account. A CAPTCHA is a hard stop, not a speed bump.`,
  },
  signup_reachable: {
    effort: 'an afternoon',
    how: (f) =>
      `Let ${f.funnel.signup.url ?? 'your signup page'} render its form in server HTML and stop refusing non-browser requests to it.`,
  },
  programmatic_provisioning: {
    effort: 'an afternoon',
    how: () =>
      'Document how a key is created without opening a dashboard: management API, service account or CLI. If no such path exists, that gap is the finding, not the docs.',
  },
  self_serve: {
    effort: 'a project',
    how: () =>
      'State a free tier or a no-card trial in text on the pricing page. An agent cannot finish in one session if the next step is a sales call.',
  },
  typed_package: {
    effort: 'an afternoon',
    how: (f) => {
      if (!f.npm.package) return 'Link your package from the site, in the docs and in the repo, so nothing has to guess the name from a registry search.'
      if (!f.npm.found) return `Publish ${f.npm.package} to the registry under the name your docs use, or fix the name in the docs.`
      if (f.npm.staleMonths !== undefined && f.npm.staleMonths >= 24) {
        return `Cut a release of ${f.npm.package}. Last publish was ${f.npm.staleMonths} months ago, and agents read that as abandoned.`
      }
      return `Ship types with ${f.npm.package}, declared through the exports map. Types are how an agent checks its own work.`
    },
  },
  machine_readable_api: {
    effort: 'an afternoon',
    how: () =>
      'Publish an OpenAPI file at /openapi.json, or serve markdown when a client sends Accept: text/markdown. Either one stops agents guessing your API.',
  },
}

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many)

/** Comparison is optional so the email can build a plan without touching the store. */
export function buildFixPlan(
  findings: ScanFindings,
  scorecard: Scorecard,
  comparison?: Comparison | null,
): FixPlan | null {
  // Unmeasurable is not the same as absent, so we never promise points for it.
  const fixable = scorecard.checks.filter((check) => check.points < check.max && !check.inconclusive)
  if (fixable.length === 0) return null

  const steps: FixStep[] = fixable
    .map((check) => {
      const remedy = REMEDIES[check.id]
      if (!remedy) return null
      return {
        checkId: check.id,
        label: check.label,
        gain: check.max - check.points,
        effort: remedy.effort,
        how: remedy.how(findings, check),
      }
    })
    .filter((step): step is FixStep => step !== null)
    .sort((a, b) => EFFORT_RANK[a.effort] - EFFORT_RANK[b.effort] || b.gain - a.gain)

  if (steps.length === 0) return null

  const quickWins = steps.filter((step) => step.effort !== 'a project').slice(0, 3)
  const counted = quickWins.length > 0 ? quickWins : steps.slice(0, 1)
  const gain = counted.reduce((sum, step) => sum + step.gain, 0)
  const to = scorecard.total + gain

  const overtakes = (comparison?.peers ?? [])
    .filter((peer) => !peer.isSubject && peer.total > scorecard.total && peer.total < to)
    .map((peer) => peer.domain)
    .slice(0, 3)

  return {
    claim: claimFor(counted, scorecard, to, overtakes, comparison),
    steps,
    quickWins: counted,
    gain,
    from: scorecard.total,
    to,
    max: scorecard.max,
    overtakes,
  }
}

function claimFor(
  counted: FixStep[],
  scorecard: Scorecard,
  to: number,
  overtakes: string[],
  comparison?: Comparison | null,
): string {
  const opener =
    counted.length === 1
      ? `Fix one thing, ${lower(counted[0].label)}, and ${scorecard.total}/${scorecard.max} becomes ${to}/${scorecard.max}`
      : `Fix the ${counted.length} cheapest ${plural(counted.length, 'item', 'items')} below and ${scorecard.total}/${scorecard.max} becomes ${to}/${scorecard.max}`

  if (overtakes.length > 0) {
    return `${opener}, past ${listOf(overtakes)}.`
  }
  if (comparison?.rankInCategory?.position === 1) {
    return `${opener}, and nobody in the category is close.`
  }
  const cheapest = counted.every((step) => step.effort === 'minutes')
  return `${opener}. ${cheapest ? 'None of it needs a release.' : 'None of it needs a rewrite.'}`
}

const lower = (label: string) => label.charAt(0).toLowerCase() + label.slice(1)

function listOf(items: string[]): string {
  if (items.length === 1) return items[0]
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}
