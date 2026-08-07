import { PROVISIONING_PATTERN_COUNT } from './scan/funnel'
import { AGENT_UA } from './scan/http'
import { AI_CRAWLERS } from './scan/robots'
import type { ScanFindings } from './scan'

export const FORMULA_VERSION = '3.0'

export type Stage = 'discovery' | 'entry' | 'signup' | 'provisioning' | 'integration'

export const STAGES: { id: Stage; letter: string; title: string; question: string }[] = [
  { id: 'discovery', letter: 'A', title: 'Discovery', question: 'Can an agent find and read you?' },
  { id: 'entry', letter: 'B', title: 'Agent entry', question: 'Is there a door built for a machine?' },
  { id: 'signup', letter: 'C', title: 'Registration', question: 'Can an agent get an account?' },
  { id: 'provisioning', letter: 'D', title: 'Provisioning', question: 'Can it get credentials without a human?' },
  { id: 'integration', letter: 'E', title: 'Integration', question: 'Can it ship working code?' },
]

export type CheckResult = {
  points: number
  detail: string
  /** Zero because we could not find the thing, not because it is absent. Shown differently. */
  inconclusive?: boolean
}

export type Check = {
  id: string
  stage: Stage
  label: string
  /** Shown on the methodology page: why this costs the vendor money. */
  why: string
  max: number
  evaluate: (findings: ScanFindings) => CheckResult
}

const yes = (points: number, detail: string): CheckResult => ({ points, detail })

export const CHECKS: Check[] = [
  {
    id: 'answers_plain_request',
    stage: 'discovery',
    label: 'Answers an agent user-agent',
    why: 'An agent sends HTTP with its own user-agent, not a browser fingerprint. A 403 here ends the funnel before any of it starts.',
    max: 1,
    evaluate: (f) => {
      const seen = f.agentStatusesSeen?.length && new Set(f.agentStatusesSeen).size > 1
      const tries = seen ? ` across three tries (${f.agentStatusesSeen.join(', ')})` : ''
      if (f.blocksPlainRequests) {
        return yes(
          0,
          `Answered ${f.agentStatus} to ${AGENT_UA}${tries}, and ${f.browserStatus} to a Chrome user-agent`,
        )
      }
      return yes(1, `Answered ${f.agentStatus} to ${AGENT_UA}${tries}`)
    },
  },
  {
    id: 'llms_txt',
    stage: 'discovery',
    label: 'llms.txt published',
    why: 'A curated map of your docs is the cheapest way to control what an agent reads first.',
    max: 1,
    evaluate: (f) => {
      if (f.machine.hasLlmsTxt) {
        // A site that answers any unknown .txt with real text hands us a file that proves
        // nothing. Same trap as the entry paths, one probe arm later.
        if (f.funnel.servesCatchAll) {
          return {
            points: 0,
            detail: 'Unmeasurable: the site answers unknown paths with real text, so a hit on llms.txt proves nothing',
            inconclusive: true,
          }
        }
        return yes(1, f.machine.hasLlmsFullTxt ? 'llms.txt and llms-full.txt present' : 'llms.txt present')
      }
      if (f.blocksPlainRequests) {
        return { points: 0, detail: 'Unmeasurable: every request was refused', inconclusive: true }
      }
      const probed = Object.keys(f.machine.llms).length
      return yes(0, `No llms.txt at any of the ${probed} locations probed`)
    },
  },
  {
    id: 'docs_without_js',
    stage: 'discovery',
    label: 'Docs readable without JavaScript',
    why: 'Most agents fetch HTML, they do not run your bundle. An empty shell reads as an empty product.',
    max: 1,
    evaluate: (f) => {
      // Zero characters we never fetched is not thin documentation, it is no measurement.
      if (!f.discovered.docs) {
        return { points: 0, detail: 'Unmeasurable: no documentation page could be found to read', inconclusive: true }
      }
      if (f.docsTextChars === 0) {
        return {
          points: 0,
          detail: `Unmeasurable: ${f.discovered.docs} returned nothing we could read`,
          inconclusive: true,
        }
      }
      return f.docsTextChars >= 2000
        ? yes(1, `${f.docsTextChars.toLocaleString('en-US')} characters of text without JS`)
        : yes(0, `Only ${f.docsTextChars.toLocaleString('en-US')} characters render without JS`)
    },
  },
  {
    id: 'user_agents_allowed',
    stage: 'discovery',
    label: 'On-demand agents not blocked',
    why: 'ChatGPT-User and Claude-User are not crawlers. They are your prospect, reading your docs mid-integration.',
    max: 1,
    evaluate: (f) => {
      const blocked = f.robots.blockedByClass.user
      // No robots.txt is not a blind spot, it is the most permissive answer possible.
      if (!f.robots.present) {
        return f.blocksPlainRequests
          ? { points: 0, detail: 'Unmeasurable: the site refuses agent requests before robots.txt matters', inconclusive: true }
          : yes(1, 'No robots.txt, so nothing is disallowed for anyone')
      }
      const explicitlyAllowed = AI_CRAWLERS.filter(
        (crawler) => crawler.class === 'user' && f.robots.crawlers[crawler.name] === 'allowed_explicit',
      )
      // A site that writes a dedicated allow group for on-demand agents is doing the right
      // thing; a blanket disallow elsewhere should not erase that.
      if (explicitlyAllowed.length > 0 && blocked.length === 0) {
        return yes(1, `Explicitly allowed: ${explicitlyAllowed.map((crawler) => crawler.name).join(', ')}`)
      }
      if (f.robots.blanketDisallowAll) return yes(0, 'robots.txt disallows everything for every agent')
      if (blocked.length > 0) return yes(0, `Blocked: ${blocked.join(', ')}`)
      // A green tick for reachability on a site that 403s everyone is false comfort.
      if (f.blocksPlainRequests) {
        return yes(0, 'robots.txt permits them, but the WAF refuses the request before robots.txt matters')
      }
      return yes(1, 'No on-demand agent is blocked')
    },
  },
  {
    id: 'no_crawl_delay',
    stage: 'discovery',
    label: 'No punishing crawl delay',
    why: 'A polite agent honouring Crawl-delay: 10 spends 200 seconds to read 20 doc pages, then gives up.',
    max: 1,
    evaluate: (f) => {
      if (!f.robots.present) {
        return yes(1, 'No robots.txt, so no Crawl-delay applies')
      }
      const delay = f.robots.crawlDelaySeconds
      if (delay === null) return yes(1, 'No Crawl-delay directive')
      if (delay <= 1) return yes(1, `Crawl-delay: ${delay}s, negligible`)
      return yes(0, `Crawl-delay: ${delay}s applies to AI agents`)
    },
  },
  {
    id: 'agent_entry_point',
    stage: 'entry',
    label: 'Agent entry point',
    why: 'A markdown file written for a machine turns a guessing game into a procedure it can follow.',
    max: 2,
    evaluate: (f) => {
      if (f.funnel.servesCatchAll) {
        return {
          points: 0,
          detail: 'Unmeasurable: the site answers unknown paths with real text, so any hit here proves nothing',
          inconclusive: true,
        }
      }
      // A .well-known descriptor already scores under MCP; counting it twice sold one file
      // as three points across two stages.
      const written = f.funnel.entryPointsFound.filter((path) => !path.startsWith('/.well-known/'))
      if (written.length > 0) return yes(2, `Found: ${written.join(', ')}`)
      if (f.funnel.entryPointsFound.length > 0) {
        return yes(1, `Only service descriptors: ${f.funnel.entryPointsFound.join(', ')}. No procedure written for a machine.`)
      }
      return yes(0, 'None of the 9 known agent entry paths answer')
    },
  },
  {
    id: 'oauth_dcr',
    stage: 'entry',
    label: 'OAuth dynamic client registration',
    why: 'RFC 7591 is the only standard path by which an agent can register itself without a human.',
    max: 1,
    evaluate: (f) => {
      const oauth = f.funnel.oauth
      if (oauth.dynamicClientRegistration) return yes(1, 'registration_endpoint published')
      if (oauth.metadataPublished) return yes(0, 'OAuth metadata published, but no registration_endpoint in it')
      // Authorization servers live off the marketing host. With no MCP endpoint to follow we
      // probed one origin, and one origin is not a search.
      if (oauth.probedHosts <= 1) {
        return {
          points: 0,
          detail: 'Unmeasurable: no OAuth metadata on the apex, and no authorization host we could follow',
          inconclusive: true,
        }
      }
      return yes(0, `No OAuth metadata on any of the ${oauth.probedHosts} hosts probed`)
    },
  },
  {
    id: 'mcp_present',
    stage: 'entry',
    label: 'MCP surface',
    why: 'An MCP server turns your API from something an agent reads about into something it can call.',
    max: 1,
    evaluate: (f) => {
      // A live endpoint beats any amount of prose about MCP, and a docs page named mcp.md
      // is not a server, which is what the old URL pattern kept scoring.
      const live = f.funnel.mcpEndpoints
      if (live.length > 0) {
        const first = live[0]
        const how =
          first.evidence === 'challenges'
            ? `answered ${first.status} with an auth challenge`
            : first.evidence === 'rejects-get'
              ? `answered ${first.status} to GET, as an MCP endpoint does`
              : 'answers JSON'
        return yes(1, `Live MCP endpoint at ${first.url}, ${how}`)
      }
      if (f.machine.wellKnown.mcp_server_card) return yes(1, '/.well-known/mcp.json published')
      if (f.machine.mcp.mentions > 0) {
        return yes(0, `MCP mentioned ${f.machine.mcp.mentions}x in your own files, but nothing answers at mcp.${f.domain} or /mcp`)
      }
      return yes(0, `No MCP surface: nothing answers at mcp.${f.domain} or /mcp, and no file mentions MCP`)
    },
  },
  {
    id: 'signup_no_captcha',
    stage: 'signup',
    label: 'No CAPTCHA in the signup HTML',
    why: 'A CAPTCHA is a hard stop. Permissions after signup beat a gate before it.',
    max: 1,
    evaluate: (f) => {
      if (!f.funnel.signup.url) {
        return { points: 0, detail: 'No signup page linked from the site we could follow', inconclusive: true }
      }
      if (f.funnel.signup.captcha.length > 0) {
        return yes(0, `CAPTCHA detected: ${f.funnel.signup.captcha.join(', ')}`)
      }
      if (!f.funnel.signup.rendersFormWithoutJs) {
        return {
          points: 0,
          detail: 'Unmeasurable: the signup form is not in the server HTML, so its gates are not either',
          inconclusive: true,
        }
      }
      return yes(1, 'No CAPTCHA vendor in the server HTML. A widget mounted later by JavaScript would not show here.')
    },
  },
  {
    id: 'signup_reachable',
    stage: 'signup',
    label: 'Signup reachable without a browser',
    why: 'If a bare HTTP request gets a 403, the agent never sees the form at all.',
    max: 1,
    evaluate: (f) => {
      const signup = f.funnel.signup
      if (!signup.url) {
        return { points: 0, detail: 'No signup page linked from the site we could follow', inconclusive: true }
      }
      if (!signup.reachable) {
        const seen = signup.consistent ? `${signup.status}` : `${signup.statusesSeen.join(', ')}`
        return yes(0, `Signup answers ${seen} to a non-browser request`)
      }
      return signup.rendersFormWithoutJs
        ? yes(1, 'Form renders in server HTML')
        : yes(0, 'Reachable, but the form needs JavaScript')
    },
  },
  {
    id: 'programmatic_provisioning',
    stage: 'provisioning',
    label: 'Programmatic key provisioning',
    why: 'Documented key creation is the difference between a two-minute integration and a support ticket.',
    max: 2,
    evaluate: (f) => {
      const found = f.funnel.provisioning.programmatic.length
      const pages = f.docsPagesRead ?? 0
      if (found > 0) {
        return yes(
          found >= 2 ? 2 : 1,
          `${found} of ${PROVISIONING_PATTERN_COUNT} provisioning phrases found across ${pages} documentation ${pages === 1 ? 'page' : 'pages'}`,
        )
      }
      // Absence in one page is absence of evidence. Saying otherwise failed vendors who
      // document exactly this, one link away from where we happened to look.
      if (pages < 2) {
        return {
          points: 0,
          detail: `Unmeasurable: only ${pages} documentation ${pages === 1 ? 'page' : 'pages'} could be read, which is too little to conclude anything`,
          inconclusive: true,
        }
      }
      return yes(0, `No programmatic credential creation described in the ${pages} documentation pages we read`)
    },
  },
  {
    id: 'self_serve',
    stage: 'provisioning',
    label: 'Self-serve entry without sales',
    why: 'A free tier is what lets an agent finish the job in the same session it started.',
    max: 1,
    evaluate: (f) => {
      if (f.funnel.provisioning.selfServeSignals.length > 0) return yes(1, 'Free tier or no-card signals on pricing')
      if (!f.funnel.pricingFetched) {
        return { points: 0, detail: 'Unmeasurable: no pricing page could be fetched', inconclusive: true }
      }
      return yes(0, 'No self-serve signal found on the pricing page')
    },
  },
  {
    id: 'typed_package',
    stage: 'integration',
    label: 'Typed SDK on the registry',
    why: 'Types are how an agent checks its own work before you ever see the code.',
    max: 1,
    evaluate: (f) => {
      if (!f.npm.package) {
        return { points: 0, detail: 'No npm package found on the site or in the registry', inconclusive: true }
      }
      // A registry name that only shares a GitHub org with the site is a hypothesis. Scoring
      // it gave allegro.pl a point for an internal utility it does not publish as an SDK.
      if (f.discovered.npmSource === 'registry-search' && f.discovered.npmConfidence === 'weak') {
        return {
          points: 0,
          detail: `Unmeasurable: nothing on the site names a package, and the closest registry match (${f.npm.package}) is not clearly yours`,
          inconclusive: true,
        }
      }
      if (!f.npm.found) return yes(0, `Package ${f.npm.package} not found on the registry`)
      if (!f.npm.bundledTypes) return yes(0, `${f.npm.package} ships without bundled types`)
      const stale = f.npm.staleMonths
      if (stale !== undefined && stale >= 24) {
        return yes(0, `${f.npm.package} is typed but last published ${stale} months ago`)
      }
      const guessed = f.discovered.npmSource === 'registry-search' ? ', matched from the registry rather than a link on the site' : ''
      return yes(1, `${f.npm.package}@${f.npm.version} ships types${guessed}`)
    },
  },
  {
    id: 'machine_readable_api',
    stage: 'integration',
    label: 'Machine-readable API description',
    why: 'An OpenAPI file or markdown negotiation lets an agent read your API instead of guessing it.',
    max: 1,
    evaluate: (f) => {
      const negotiation = f.machine.markdownNegotiation
      if (f.machine.openapi.length > 0) return yes(1, `OpenAPI at ${f.machine.openapi[0]}`)
      if ((negotiation.acceptHeader || negotiation.dotMdSuffix) && !f.funnel.servesCatchAll) {
        return yes(1, 'Docs serve markdown to machines')
      }
      if (negotiation.acceptHeader || negotiation.dotMdSuffix) {
        return {
          points: 0,
          detail: 'Unmeasurable: the site answers unknown paths with text, so the markdown it served is not evidence of negotiation',
          inconclusive: true,
        }
      }
      if (f.blocksPlainRequests) {
        return { points: 0, detail: 'Unmeasurable behind the WAF', inconclusive: true }
      }
      // "Not found on your domain" is what we measured. "Does not exist" is not.
      return yes(0, 'No OpenAPI spec and no markdown negotiation found on this domain')
    },
  },
]

export const MAX_SCORE = CHECKS.reduce((total, check) => total + check.max, 0)

export type ScoredCheck = Check & CheckResult
export type Scorecard = {
  formulaVersion: string
  total: number
  max: number
  stages: { stage: Stage; letter: string; title: string; question: string; points: number; max: number }[]
  checks: ScoredCheck[]
}

export function scoreFindings(findings: ScanFindings): Scorecard {
  const checks: ScoredCheck[] = CHECKS.map((check) => ({ ...check, ...check.evaluate(findings) }))

  const stages = STAGES.map((stage) => {
    const inStage = checks.filter((check) => check.stage === stage.id)
    return {
      stage: stage.id,
      letter: stage.letter,
      title: stage.title,
      question: stage.question,
      points: inStage.reduce((sum, check) => sum + check.points, 0),
      max: inStage.reduce((sum, check) => sum + check.max, 0),
    }
  })

  return {
    formulaVersion: FORMULA_VERSION,
    total: checks.reduce((sum, check) => sum + check.points, 0),
    max: MAX_SCORE,
    stages,
    checks,
  }
}
