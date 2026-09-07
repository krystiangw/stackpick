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

export const REMEDIES: Record<string, Remedy> = {
  answers_plain_request: {
    effort: (f) => (f.browserStatus >= 200 && f.browserStatus < 400 ? 'an afternoon' : 'a project'),
    // "Exempt them from that rule" describes a rule aimed at agents, and on every row failing this
    // check today the browser is refused with the identical status. Worse, the sentence told two
    // vendors already answering 429 to "rate limit instead of refusing".
    how: (f) =>
      f.browserStatus === f.agentStatus
        ? `Review the edge rule returning ${f.agentStatus} to both browser and agent user-agents from the scan address; allow ordinary HTTP access to public pages.`
        : `Exempt them from the edge rule returning ${f.agentStatus} to agent user-agents while serving Chrome with ${f.browserStatus}.`,
  },
  price_in_snippet: {
    effort: 'minutes',
    how: (f) => {
      const page = f.discovered.pricing ?? 'your pricing page'
      const snippet = f.funnel.pricingSnippet
      // Two different jobs behind one verdict: writing the tag, and fixing the tag you already
      // have. A vendor with no description tag is told where to put one; a vendor with a
      // priceless one is shown the string to edit, because that is the whole change.
      if (snippet && !snippet.description) {
        return `Add a meta description to ${page} with the price or the applicable entry condition ("free tier", "no credit card").`
      }
      return `Rewrite the meta description on ${page} to state the price or the applicable entry condition.`
    },
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
        return `Repair the ${links.dead} dead links among the ${links.sampled} sampled in your existing llms.txt, starting with ${links.firstDead}.`
      }
      if (f.machine.hasLlmsTxt) {
        return 'Correct the contents of your existing llms.txt using the observed failure.'
      }
      return 'Publish /llms.txt with links to your quickstart, API reference, pricing and package name.'
    },
  },
  docs_without_js: {
    effort: 'a project',
    // Two failure modes, and writing the remedy for one of them made the other read as nonsense:
    // stripe.com was told "a plain fetch gets 229,024 characters, which reads as an empty product"
    // beside a measurement about serving agents less than Chrome. An agent that checks the number
    // is right to throw the whole task out, cloaking charge included.
    how: (f) =>
      typeof f.docsThinnerForAgents === 'number' && Number.isFinite(f.docsThinnerForAgents)
        ? `Serve the same documentation text to browser and agent user-agents.`
        : `Server-render the docs or mirror them as markdown.`,
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
        return `Your robots.txt permits these crawlers, but the edge returned ${refused
          .map((crawler) => `${crawler.name} ${crawler.status}`)
          .join(' and ')} at a page it serves to a browser; exempt on-demand agents in the WAF or bot manager.`
      }
      const blocked = f.robots.blockedByClass.user
      return blocked.length > 0
        ? `Remove ${blocked.join(' and ')} from the disallow group in robots.txt.`
        : 'Give on-demand agents an explicit allow group in robots.txt, so no blanket rule catches them by accident.'
    },
  },
  no_crawl_delay: {
    effort: 'minutes',
    how: (f) =>
      `Drop Crawl-delay: ${f.robots.crawlDelaySeconds}, or scope it to the crawlers you intend to slow down.`,
  },
  agent_entry_point: {
    effort: 'an afternoon',
    // The one step where a worked example is worth more than the instruction, and the only
    // honest example we can point at is our own, which this scanner scores like anyone else's.
    how: (_f, check) =>
      check.points > 0
        ? 'Add account and credential creation steps to the existing entry file, including the endpoint or command to use.'
        : 'Publish /agent-signup.md with the steps from no account to a working key, if your product supports that path.',
  },
  oauth_dcr: {
    effort: 'a project',
    // Two failure modes again: no OAuth metadata anywhere, or metadata that exists and omits the
    // one field. Telling the first group to add a field to a document they do not publish reads
    // as advice from someone who did not look.
    how: (f) =>
      f.funnel.oauth.metadataPublished
        ? 'Add registration_endpoint to your existing OAuth metadata if your server supports dynamic registration. MCP 2026-07-28 deprecates RFC 7591 in favour of Client ID Metadata Documents, so retain this as a compatibility path.'
        : 'Publish OAuth authorization server metadata with an RFC 7591 registration_endpoint in it, which is how an agent registers itself without a human. MCP 2026-07-28 deprecates that mechanism in favour of Client ID Metadata Documents, so build for both if you are starting now.',
  },
  mcp_present: {
    effort: 'a project',
    // We know it did not answer at the addresses we tried, which is not the same as knowing it
    // does not exist. A reader's server was at /api/mcp, answered 200, and this line told them
    // to ship the thing they had shipped.
    how: (f) =>
      f.machine.mcp.mentions > 0
        ? 'If your MCP server is at another path, declare it at /.well-known/mcp.json.'
        : 'Wrap your top three API calls in an MCP server and declare it at /.well-known/mcp.json.',
  },
  signup_no_captcha: {
    effort: 'an afternoon',
    how: (f) =>
      `Trigger ${f.funnel.signup.captcha[0] ?? 'the challenge'} on a risk signal instead of on every signup, or open an API path to an account.`,
  },
  signup_reachable: {
    // Neither the cheap effort nor the refusal clause had an addressee, and both survived because
    // nobody read the advice next to the row it lands on. A form rendering without JavaScript
    // passes the check, so 'minutes' cannot be reached from here; and every failing row answers
    // 200 or 202 with reachable=true, so "stop refusing non-browser requests" told 85 vendors to
    // stop doing something they were not doing. Rows that genuinely refuse us come out
    // inconclusive, and the fix plan drops inconclusive checks before it gets here.
    effort: 'a project',
    how: (f) =>
      `The response from ${f.funnel.signup.url ?? 'your signup page'} contains no form for clients without JavaScript; render the fields in server HTML or provide an account creation API.`,
  },
  programmatic_provisioning: {
    effort: 'an afternoon',
    // Two situations, and one sentence used to serve both. 52 of the 91 rows in the plan are
    // partial: we found provisioning language on their pages and they are one phrase short, and
    // telling them to document a management API when we just matched "management api" reads as
    // advice from somebody who did not look. The other rows found nothing at all.
    how: (_f, check) =>
      check.points > 0
        ? 'Document the credential creation step beside the existing provisioning text, including its endpoint, CLI command or service account; if that path does not exist, implement it before documenting it.'
        : 'Document how a key is created without opening a dashboard, using a management API, service account or CLI; if that path does not exist, implement it before documenting it.',
  },
  self_serve: {
    // A page whose only free wording is a button is a copy change, not a pricing decision, and
    // calling both of them "a project" sent the cheap fix to the bottom of the plan.
    effort: (f) => (f.funnel.provisioning.selfServeIsButtonOnly ? 'minutes' : 'a project'),
    how: (f) =>
      f.funnel.provisioning.selfServeIsButtonOnly
        ? 'State the free tier in a sentence or price cell outside the button, including its limits and whether a card is required.'
        : 'If you offer a free tier or a no-card trial, state its terms in text on the pricing page.',
  },
  typed_package: {
    effort: 'an afternoon',
    how: (f) => {
      if (!f.npm.package) return 'Link your package from the site, docs and repository.'
      if (!f.npm.found) return `Publish ${f.npm.package} to the registry under the name your docs use, or fix the name in the docs.`
      if (f.npm.staleMonths !== undefined && f.npm.staleMonths >= 24) {
        return `Review ${f.npm.package}, last published ${f.npm.staleMonths} months ago, and release an update if it is still the supported package.`
      }
      // The verdict already says when the name came from a registry search rather than from a
      // link they gave us, and the advice used to drop that caveat and give an order instead:
      // namecheap.com was told to ship types with node-vault-client, which is a Vault client that
      // happens to share their publisher. On those rows the first fix is the link, and it is the
      // fix that also stops us guessing.
      if (f.discovered.npmSource === 'registry-search') {
        return `The scan matched ${f.npm.package} by publisher, not by a link on your site; confirm the package before adding types through its exports map, or link the correct package from your docs.`
      }
      return `Ship types with ${f.npm.package}, declared through the exports map.`
    },
  },
  machine_readable_api: {
    effort: 'an afternoon',
    how: () =>
      'Publish an OpenAPI file at /openapi.json, or serve markdown when a client sends Accept: text/markdown.',
  },
}

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many)

/** Comparison is optional so the email can build a plan without touching the store. */
/**
 * The published step for one check, or null where we publish none.
 *
 * Exported because the monthly mail needs exactly one of these and building the whole plan to read
 * a single line would compute a ranking nobody sees. Both callers read the same table, which is the
 * only way the mail and the report can keep saying the same thing about the same check.
 */
export function remedyFor(findings: ScanFindings, check: ScoredCheck): string | null {
  const remedy = REMEDIES[check.id]
  return remedy ? remedy.how(findings, check) : null
}

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
      return {
        checkId: check.id,
        label: check.label,
        gain: check.max - check.points,
        // A check with no published step is still a check they do not pass, and the component says
        // in so many words "this is the whole list". Dropping it silently made that sentence false
        // for anybody failing robots_paths_resolve, the one check with no entry in REMEDIES: they
        // could fix every line we printed and still not reach the number we printed beside it.
        effort: remedy ? (typeof remedy.effort === 'function' ? remedy.effort(findings) : remedy.effort) : 'a project',
        how: remedy
          ? remedy.how(findings, check)
          : `Review the observation and choose a change for your setup; no specific remedy is published for this check.`,
      }
    })
    .sort((a, b) => EFFORT_RANK[a.effort] - EFFORT_RANK[b.effort] || b.gain - a.gain)

  if (steps.length === 0) return null

  const quickWins = steps.filter((step) => step.effort !== 'a project').slice(0, 3)
  const counted = quickWins.length > 0 ? quickWins : steps.slice(0, 1)
  const gain = counted.reduce((sum, step) => sum + step.gain, 0)
  const to = scorecard.total + gain
  const measurable = scorecard.measurable ?? scorecard.max

  // Shares, because every row has its own denominator and the table on the same page is ordered by
  // share. Comparing raw totals promised a reader on 9/17 that two fixes would take them "past
  // acme.com" on 10/12, and the comparison three sections down left acme.com above them.
  const shareOf = (peer: { total: number; max: number }) => (peer.max === 0 ? 0 : peer.total / peer.max)
  const now = measurable === 0 ? 0 : scorecard.total / measurable
  const after = measurable === 0 ? 0 : to / measurable
  const overtakes = (comparison?.peers ?? [])
    .filter((peer) => !peer.isSubject && !peer.undermeasured && shareOf(peer) > now && shareOf(peer) < after)
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
    /**
     * Points locked behind checks we could not evaluate, so the list has a visible ceiling. Only
     * the inconclusive ones: `max - measurable` also swept in every check that does not apply, and
     * the component says those points "sit behind checks we could not evaluate" while the row
     * itself, two sections up, says a product with no accounts cannot fail that check.
     */
    unmeasured: scorecard.checks.filter((check) => check.inconclusive).reduce((sum, check) => sum + check.max, 0),
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
      ? `If ${lower(counted[0].label)} meets its full scoring criteria, the score changes from ${scorecard.total}/${measurableOf(scorecard)} to ${to}/${measurableOf(scorecard)}`
      : `If the first ${counted.length} ${plural(counted.length, 'item', 'items')} below meet their full scoring criteria, the score changes from ${scorecard.total}/${measurableOf(scorecard)} to ${to}/${measurableOf(scorecard)}`

  if (overtakes.length > 0) {
    return `${opener}, past ${listOf(overtakes)}.`
  }
  if (comparison?.rankInCategory?.position === 1) {
    return `${opener}.`
  }
  if (counted.every((step) => step.effort === 'minutes')) return `${opener}. Effort estimates assume the underlying functionality exists.`
  if (counted.every((step) => step.effort !== 'a project')) return `${opener}. Effort estimates assume the underlying functionality exists.`
  return `${opener}.`
}

const measurableOf = (scorecard: Scorecard) => scorecard.measurable ?? scorecard.max

/**
 * Mid-sentence, a label starts in lower case - unless the capital belongs to the name itself.
 * "Fix one thing, oAuth dynamic client registration" went out in a report somebody pays for.
 */
const lower = (label: string) =>
  /^[A-Z][A-Z]/.test(label) ? label : label.charAt(0).toLowerCase() + label.slice(1)

function listOf(items: string[]): string {
  if (items.length === 1) return items[0]
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}
