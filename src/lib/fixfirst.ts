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
  unmeasured: number
  /** Peers currently above the subject that the quick wins would put it past. */
  overtakes: string[]
}

type Remedy = {
  /** A function, not a constant: the same check is minutes for one site and a rewrite for another. */
  effort: Effort | ((findings: ScanFindings) => Effort)
  how: (findings: ScanFindings, check: ScoredCheck) => string
}

const REMEDIES: Record<string, Remedy> = {
  answers_plain_request: {
    effort: (f) => (f.browserStatus >= 200 && f.browserStatus < 400 ? 'an afternoon' : 'a project'),
    how: (f) =>
      `Your public pages answer ${f.browserStatus} to Chrome and ${f.agentStatus} to an agent user-agent. Exempt them from that rule and rate limit instead of refusing.`,
  },
  llms_txt: {
    // Keyed on why the check failed, not on which check failed. It used to tell a vendor whose
    // llms.txt we had just read, and quoted dead links out of, to publish an llms.txt. A reader
    // caught it: the report contradicted itself and the promised gain was inflated by a point
    // for work already done.
    effort: 'minutes',
    how: (f) => {
      const links = f.machine.llmsLinks
      if (f.machine.hasLlmsTxt && links && links.dead > 0) {
        return `Your llms.txt is already there. ${links.dead} of the ${links.sampled} links we sampled are gone, starting with ${links.firstDead}. Fix those and this passes: a map an agent follows into a 404 costs it the budget it came with.`
      }
      if (f.machine.hasLlmsTxt) {
        return 'Your llms.txt is already there. This check is failing on its contents rather than its absence, so read the line above for what we could not follow.'
      }
      return 'Publish /llms.txt: a markdown list linking your quickstart, API reference, pricing and package name. It is the cheapest file on this list.'
    },
  },
  docs_without_js: {
    effort: 'a project',
    how: (f) =>
      // The "just under the line" branch went with the 2,000-character threshold. Below 500 there
      // is no near miss to describe, and the only other way into this list is cloaking, where the
      // number is large and a sentence about falling short of it reads as nonsense.
      `Server-render the docs or mirror them as markdown. A plain fetch gets ${f.docsTextChars.toLocaleString('en-US')} characters, which reads as an empty product.`,
  },
  user_agents_allowed: {
    effort: 'minutes',
    how: (f) => {
      // The check has two failure modes and only one of them is robots.txt. When a named crawler
      // is refused at a page a browser is served, the file is already correct and editing it
      // changes nothing: the rule is at the edge. Telling those vendors to fix robots.txt is the
      // same error a reader caught in the llms.txt advice.
      const refused = f.crawlersRefused ?? []
      if (refused.length > 0) {
        return `Your robots.txt already permits them, so this is not a robots.txt fix. Your edge answered ${refused
          .map((crawler) => `${crawler.name} ${crawler.status}`)
          .join(' and ')} at a page it serves to a browser. Find the rule doing that, in the WAF or the bot manager, and exempt on-demand agents.`
      }
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
    // The one step where a worked example is worth more than the instruction, and the only
    // honest example we can point at is our own, which this scanner scores like anyone else's.
    how: (_f, check) =>
      check.points > 0
        ? 'The file is there and it states a policy rather than a procedure. It counts when it names a credential, an endpoint or a way to get an account: the path from nothing to a working key, in steps. Ours is at /agent-signup.md and it is 1.7 kB.'
        : 'Publish /agent-signup.md: the path from nothing to a working key, written as steps for a machine rather than a tour for a person. Ours is at /agent-signup.md if you want a worked example, and it says plainly that we have nothing to sign up for.',
  },
  oauth_dcr: {
    effort: 'a project',
    // Two failure modes again: no OAuth metadata anywhere, or metadata that exists and omits the
    // one field. Telling the first group to add a field to a document they do not publish reads
    // as advice from someone who did not look.
    how: (f) =>
      f.funnel.oauth.metadataPublished
        ? 'Your OAuth metadata is already published and has no registration_endpoint in it. Adding that one field is the whole change: RFC 7591 is the only standard way an agent registers itself without a human.'
        : 'Publish OAuth authorization server metadata with an RFC 7591 registration_endpoint in it. It is the only standard way an agent registers itself without a human.',
  },
  mcp_present: {
    effort: 'a project',
    // We know it did not answer at the addresses we tried, which is not the same as knowing it
    // does not exist. A reader's server was at /api/mcp, answered 200, and this line told them
    // to ship the thing they had shipped.
    how: (f) =>
      f.machine.mcp.mentions > 0
        ? 'You already talk about MCP, and nothing answered at the addresses named above. If your server is at another path, declare it at /.well-known/mcp.json: that file is what an agent reads first, and it is what makes the path stop mattering.'
        : 'Wrap your top three API calls in an MCP server and declare it at /.well-known/mcp.json.',
  },
  signup_no_captcha: {
    effort: 'an afternoon',
    how: (f) =>
      `Trigger ${f.funnel.signup.captcha[0] ?? 'the challenge'} on a risk signal instead of on every signup, or open an API path to an account. A CAPTCHA is a hard stop, not a speed bump.`,
  },
  signup_reachable: {
    // A 403 on a page that already has a form is a rule change. A form that only exists
    // after JavaScript runs is a rewrite, and calling that "an afternoon" was nonsense.
    effort: (f) => (f.funnel.signup.rendersFormWithoutJs ? 'minutes' : 'a project'),
    how: (f) =>
      `Let ${f.funnel.signup.url ?? 'your signup page'} render its form in server HTML and stop refusing non-browser requests to it.`,
  },
  programmatic_provisioning: {
    effort: 'an afternoon',
    how: () =>
      'Document how a key is created without opening a dashboard: management API, service account or CLI. If no such path exists, that gap is the finding, not the docs.',
  },
  self_serve: {
    // A page whose only free wording is a button is a copy change, not a pricing decision, and
    // calling both of them "a project" sent the cheap fix to the bottom of the plan.
    effort: (f) => (f.funnel.provisioning.selfServeIsButtonOnly ? 'minutes' : 'a project'),
    how: (f) =>
      f.funnel.provisioning.selfServeIsButtonOnly
        ? 'Every mention of free on your pricing page sits inside a button. An agent reads text, not chrome, so state the tier in a sentence or a price cell: what is free, what it is limited to, and whether a card is needed.'
        : 'If you have a free tier or a no-card trial, say so in text on the pricing page rather than in an image or a button. If you are usage-priced with no free tier, this check is one an agent will read as a cost, not a defect.',
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
  // Anything outside the denominator is outside the promise. Offering froala.com seven points
  // when only five were missing produced a plan that ended above its own maximum.
  const fixable = scorecard.checks.filter(
    (check) => check.points < check.max && !check.inconclusive && !check.notApplicable,
  )
  if (fixable.length === 0) return null

  const steps: FixStep[] = fixable
    .map((check) => {
      const remedy = REMEDIES[check.id]
      if (!remedy) return null
      return {
        checkId: check.id,
        label: check.label,
        gain: check.max - check.points,
        effort: typeof remedy.effort === 'function' ? remedy.effort(findings) : remedy.effort,
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
  const measurable = scorecard.measurable ?? scorecard.max

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
    max: measurable,
    /** Points locked behind checks we could not evaluate, so the list has a visible ceiling. */
    unmeasured: scorecard.max - measurable,
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
      ? `Fix one thing, ${lower(counted[0].label)}, and ${scorecard.total}/${measurableOf(scorecard)} becomes ${to}/${measurableOf(scorecard)}`
      : `Fix the ${counted.length} cheapest ${plural(counted.length, 'item', 'items')} below and ${scorecard.total}/${measurableOf(scorecard)} becomes ${to}/${measurableOf(scorecard)}`

  if (overtakes.length > 0) {
    return `${opener}, past ${listOf(overtakes)}.`
  }
  if (comparison?.rankInCategory?.position === 1) {
    return `${opener}, and nobody in the category is close.`
  }
  if (counted.every((step) => step.effort === 'minutes')) return `${opener}. None of it needs a release.`
  if (counted.every((step) => step.effort !== 'a project')) return `${opener}. None of it needs a rewrite.`
  return `${opener}.`
}

const measurableOf = (scorecard: Scorecard) => scorecard.measurable ?? scorecard.max

const lower = (label: string) => label.charAt(0).toLowerCase() + label.slice(1)

function listOf(items: string[]): string {
  if (items.length === 1) return items[0]
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}
