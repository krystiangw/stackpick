import type { ScanFindings } from './scan'

export const FORMULA_VERSION = '2.1'

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
    label: 'Answers a request without a browser',
    why: 'An agent sends HTTP, not a browser fingerprint. A 403 here ends the funnel before any of it starts.',
    max: 1,
    evaluate: (f) =>
      f.blocksPlainRequests
        ? yes(0, `Home page answered ${f.homeStatus} to a plain request`)
        : yes(1, `Home page answered ${f.homeStatus}`),
  },
  {
    id: 'llms_txt',
    stage: 'discovery',
    label: 'llms.txt published',
    why: 'A curated map of your docs is the cheapest way to control what an agent reads first.',
    max: 1,
    evaluate: (f) =>
      f.machine.hasLlmsTxt
        ? yes(1, f.machine.hasLlmsFullTxt ? 'llms.txt and llms-full.txt present' : 'llms.txt present')
        : yes(0, 'No llms.txt at any of the four standard locations'),
  },
  {
    id: 'docs_without_js',
    stage: 'discovery',
    label: 'Docs readable without JavaScript',
    why: 'Most agents fetch HTML, they do not run your bundle. An empty shell reads as an empty product.',
    max: 1,
    evaluate: (f) =>
      f.docsTextChars >= 2000
        ? yes(1, `${f.docsTextChars.toLocaleString('en-US')} characters of text without JS`)
        : yes(0, `Only ${f.docsTextChars.toLocaleString('en-US')} characters render without JS`),
  },
  {
    id: 'user_agents_allowed',
    stage: 'discovery',
    label: 'On-demand agents not blocked',
    why: 'ChatGPT-User and Claude-User are not crawlers. They are your prospect, reading your docs mid-integration.',
    max: 1,
    evaluate: (f) => {
      const blocked = f.robots.blockedByClass.user
      if (f.robots.blanketDisallowAll) return yes(0, 'robots.txt disallows everything for every agent')
      return blocked.length === 0
        ? yes(1, 'No on-demand agent is blocked')
        : yes(0, `Blocked: ${blocked.join(', ')}`)
    },
  },
  {
    id: 'no_crawl_delay',
    stage: 'discovery',
    label: 'No punishing crawl delay',
    why: 'A polite agent honouring Crawl-delay: 10 spends 200 seconds to read 20 doc pages, then gives up.',
    max: 1,
    evaluate: (f) => {
      const delay = f.robots.crawlDelaySeconds
      if (delay === null) return yes(1, 'No Crawl-delay directive')
      if (delay <= 1) return yes(1, `Crawl-delay: ${delay}s, negligible`)
      return yes(0, `Crawl-delay: ${delay}s applies to every agent`)
    },
  },
  {
    id: 'agent_entry_point',
    stage: 'entry',
    label: 'Agent entry point',
    why: 'A markdown file written for a machine turns a guessing game into a procedure it can follow.',
    max: 2,
    evaluate: (f) =>
      f.funnel.entryPointsFound.length > 0
        ? yes(2, `Found: ${f.funnel.entryPointsFound.join(', ')}`)
        : yes(0, 'None of the 9 known agent entry paths answer'),
  },
  {
    id: 'oauth_dcr',
    stage: 'entry',
    label: 'OAuth dynamic client registration',
    why: 'RFC 7591 is the only standard path by which an agent can register itself without a human.',
    max: 1,
    evaluate: (f) =>
      f.funnel.oauth.dynamicClientRegistration
        ? yes(1, 'registration_endpoint published')
        : yes(0, f.funnel.oauth.metadataPublished ? 'OAuth metadata without registration_endpoint' : 'No OAuth metadata'),
  },
  {
    id: 'mcp_present',
    stage: 'entry',
    label: 'MCP surface',
    why: 'An MCP server turns your API from something an agent reads about into something it can call.',
    max: 1,
    evaluate: (f) => {
      if (f.machine.mcp.exposesOwnServer) return yes(1, 'Own MCP server documented')
      if (f.machine.wellKnown.mcp_server_card) return yes(1, '/.well-known/mcp.json published')
      return f.machine.mcp.mentions > 0
        ? yes(0, `MCP mentioned ${f.machine.mcp.mentions}x but no server exposed`)
        : yes(0, 'No MCP surface')
    },
  },
  {
    id: 'signup_no_captcha',
    stage: 'signup',
    label: 'Signup without CAPTCHA',
    why: 'A CAPTCHA is a hard stop. Permissions after signup beat a gate before it.',
    max: 1,
    evaluate: (f) => {
      if (!f.funnel.signup.url) {
        return { points: 0, detail: 'No signup page linked from the site we could follow', inconclusive: true }
      }
      return f.funnel.signup.captcha.length === 0
        ? yes(1, 'No CAPTCHA vendor detected')
        : yes(0, `CAPTCHA detected: ${f.funnel.signup.captcha.join(', ')}`)
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
    evaluate: (f) =>
      f.funnel.provisioning.programmatic.length > 0
        ? yes(2, `Documented: ${f.funnel.provisioning.programmatic.length} provisioning patterns`)
        : yes(0, 'Docs never describe creating credentials programmatically'),
  },
  {
    id: 'self_serve',
    stage: 'provisioning',
    label: 'Self-serve entry without sales',
    why: 'A free tier is what lets an agent finish the job in the same session it started.',
    max: 1,
    evaluate: (f) =>
      f.funnel.provisioning.selfServeSignals.length > 0
        ? yes(1, 'Free tier or no-card signals on pricing')
        : yes(0, 'No self-serve signal found on the pricing page'),
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
      if (negotiation.acceptHeader || negotiation.dotMdSuffix) return yes(1, 'Docs serve markdown to machines')
      return yes(0, 'No OpenAPI spec and no markdown negotiation')
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
