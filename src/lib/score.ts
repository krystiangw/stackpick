import { CTA_WORDING, PROVISIONING_PATTERN_COUNT } from './scan/funnel'
import { AGENT_UA } from './scan/http'
import { AI_CRAWLERS } from './scan/robots'
import type { ScanFindings } from './scan'

export const FORMULA_VERSION = '7.4'

/**
 * Every address the probe actually tries. The sentence used to name two of the five, and on
 * kinde.com the one it left out is the one that answers: api.kinde.com/mcp challenges with a
 * WWW-Authenticate naming its own protected-resource document. Naming fewer addresses than we
 * ask makes a vendor unable to reproduce our own denial.
 */
const MCP_ADDRESSES = (domain: string) =>
  `mcp.${domain}, mcp.${domain}/mcp, mcp.${domain}/v1/mcp, api.${domain}/mcp or /mcp`

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
  /** The check does not apply to this kind of product: a library has no signup to gate. */
  notApplicable?: boolean
  /** What would make an unmeasured check measurable. Never a claim, always a next step. */
  unblock?: string
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
      // A challenge is not a limit. The edge is asking the caller to run JavaScript, which every
      // browser does invisibly and no HTTP client does at all, so it is the sharpest possible
      // answer to this check rather than an excuse for skipping it.
      if (f.botChallenge) {
        return yes(
          0,
          `Answered ${f.agentStatus} to ${AGENT_UA}${tries} with a JavaScript challenge from your edge, so no agent reaches the site at all`,
        )
      }
      if (f.rateLimitedUs) {
        return {
          points: 0,
          detail: `Unmeasurable: answered ${f.agentStatus} to ${AGENT_UA}${tries}, which is either a limit we triggered or a gate on the network we scan from. Neither is a measurement of how you treat agents`,
          inconclusive: true,
          unblock: 'Nothing for you to do. We will rescan later and this becomes measurable.',
        }
      }
      if (f.blocksPlainRequests) {
        const browserGotThrough = f.browserStatus >= 200 && f.browserStatus < 400
        // The check asks whether an agent user-agent is treated worse than a browser. An edge
        // that refuses both is refusing the network we scan from, which our own scorecard prose
        // already said out loud while the score charged the vendor a point for it anyway.
        if (!browserGotThrough) {
          return {
            points: 0,
            detail: `Unmeasurable: answered ${f.agentStatus} to ${AGENT_UA}${tries} and ${f.browserStatus} to a Chrome user-agent, so the refusal is about where we ask from, not about agents`,
            inconclusive: true,
            unblock: 'Nothing for you to do here. Whether agents are treated differently becomes measurable from a network your edge admits.',
          }
        }
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
    why: 'A curated map of your docs is the cheapest way to control what an agent reads first. Worth one point and not more: in eighteen isolated agent runs across four categories, not one cited llms.txt among its sources, and an independent ninety-day measurement published by Otterly in February 2026 found it served 84 requests against 62,100 AI-bot visits.',
    max: 1,
    evaluate: (f) => {
      if (f.machine.hasLlmsTxt) {
        // A site that answers any unknown .txt with real text hands us a file that proves
        // nothing. Same trap as the entry paths, one probe arm later.
        if (f.funnel.catchAll?.text ?? f.funnel.servesCatchAll) {
          return {
            points: 0,
            detail: 'Unmeasurable: the site answers unknown .txt paths with real text, so a hit on llms.txt proves nothing',
            inconclusive: true,
          }
        }
        // deepl.com and mixpanel.com publish theirs only on a documentation subdomain, so
        // "llms.txt present" sent a vendor to an apex that 404s and read as invented.
        const at = f.machine.llmsUrls?.[0] ? ` at ${f.machine.llmsUrls[0]}` : ''
        return yes(1, f.machine.hasLlmsFullTxt ? `llms.txt and llms-full.txt present${at}` : `llms.txt present${at}`)
      }
      if (blindedBy(f)) {
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
        return { points: 0, detail: 'Unmeasurable: no documentation page could be found to read',
          unblock: 'Link your documentation from your home page or list it in llms.txt.', inconclusive: true }
      }
      if (f.docsTextChars === 0) {
        return {
          points: 0,
          detail: `Unmeasurable: ${f.discovered.docs} returned nothing we could read`,
          inconclusive: true,
        }
      }
      const chars = f.docsTextChars.toLocaleString('en-US')
      const entry = f.discovered.docs
      const from = f.docsTextCharsFrom
      // The richest page we read is not always the one an agent lands on, and a pass earned on a
      // deeper page while the entry point renders nothing is a different fact from a pass earned
      // where the reader arrives. Name the page either way.
      const where = from && from !== entry ? `, on ${from} rather than on ${entry}` : ''
      return f.docsTextChars >= 2000
        ? yes(1, `${chars} characters of text without JS${where}`)
        : yes(0, `Only ${chars} characters render without JS${where}`)
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
      // No robots.txt is not a blind spot, it is the most permissive answer possible. A refused
      // one is the opposite: a file we know exists and were not allowed to read.
      if (!f.robots.present) {
        if (f.robots.unreadable) {
          return {
            points: 0,
            detail: 'Unmeasurable: your edge answered our request for robots.txt with a refusal rather than the file, so what it permits is not something we measured',
            inconclusive: true,
            unblock: 'Serve robots.txt to ordinary HTTP clients. Every crawler you want has to read it too.',
          }
        }
        return blindedBy(f)
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
      if (f.rateLimitedUs) {
        return {
          points: 0,
          detail: 'Unmeasurable: a 429 stopped us before robots.txt mattered, so what your rules say could not be tested',
          inconclusive: true,
          unblock: 'Nothing for you to do. We will rescan later and this becomes measurable.',
        }
      }
      if (blindedBy(f)) {
        return yes(0, 'robots.txt permits them, but nothing we requested got through, so the rules never applied')
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
        if (f.robots.unreadable) {
          return {
            points: 0,
            detail: 'Unmeasurable: robots.txt was refused rather than absent, so any Crawl-delay in it is unread',
            inconclusive: true,
            unblock: 'Serve robots.txt to ordinary HTTP clients and this becomes measurable.',
          }
        }
        return yes(1, 'No robots.txt, so no Crawl-delay applies')
      }
      const delay = f.robots.crawlDelaySeconds
      // The old sentence said "No Crawl-delay directive" while stripe.com has one for rogerbot
      // and twilio.com for Swiftbot. The verdict was right and the sentence was flatly false.
      if (delay === null) return yes(1, 'No Crawl-delay applies to the agents we check')
      if (delay <= 1) return yes(1, `Crawl-delay: ${delay}s, negligible`)
      // It is a wildcard directive on nearly every site that has one, and calling a User-agent: *
      // rule "AI-specific" was us reading intent into a line written years before any of this.
      return yes(0, `Crawl-delay: ${delay}s applies to the agents we check`)
    },
  },
  {
    id: 'agent_entry_point',
    stage: 'entry',
    label: 'Agent entry point',
    why: 'A markdown file written for a machine turns a guessing game into a procedure it can follow.',
    max: 2,
    evaluate: (f) => {
      // Per namespace, not globally. sentry.io answers any .md path with an app shell, and the
      // whole check bailed on that: its /.well-known/mcp.json is 106 bytes of real JSON against
      // a 20,402 byte control, and the same scan read that file to find their MCP server.
      const catchAll = f.funnel.catchAll
      const everyNamespaceFakes = catchAll
        ? catchAll.markdown && catchAll.json && (catchAll.entryText ?? catchAll.text)
        : f.funnel.servesCatchAll
      if (everyNamespaceFakes) {
        return {
          points: 0,
          detail: 'Unmeasurable: the site answers unknown paths in every format with real text, so any hit here proves nothing',
          inconclusive: true,
        }
      }
      // A .well-known descriptor already scores under MCP; counting it twice sold one file
      // as three points across two stages.
      const written = f.funnel.entryPointsFound.filter((path) => !path.startsWith('/.well-known/'))
      // Older reports predate the content test, and rescoring them as policy files would be a
      // claim about a body we no longer hold.
      const withProcedure = (f.funnel.entryPointsWithProcedure ?? written).filter(
        (path) => !path.startsWith('/.well-known/'),
      )
      const at = (paths: string[]) => paths.map((path) => `${f.site}${path}`).join(', ')
      if (withProcedure.length > 0) return yes(2, `Found: ${at(withProcedure)}`)
      if (written.length > 0) {
        return yes(
          1,
          `Found ${at(written)}, but it states a policy rather than a procedure: nothing in it names a credential, an endpoint or a way to get an account.`,
        )
      }
      if (f.funnel.entryPointsFound.length > 0) {
        return yes(1, `Only service descriptors: ${at(f.funnel.entryPointsFound)}. No procedure written for a machine.`)
      }
      // A refusal is not an absence, the same rule robots.txt already follows. bitmovin.com
      // publishes a real 9.6 kB skill.md and answers 403 to our data centre on most requests,
      // so on the runs where it refuses this path we were publishing "you have none of these".
      const refused = f.funnel.entryPathsRefused ?? 0
      if (refused > 0) {
        return {
          points: 0,
          detail: `Unmeasurable: ${refused} of the 9 known agent entry paths answered with a refusal rather than a file or a 404, so what you publish there is not something we measured`,
          inconclusive: true,
          unblock: 'Let ordinary HTTP reach these paths and this becomes measurable.',
        }
      }
      // "None of them answer" was false on every site that serves its app shell for unknown
      // paths, which is most of them: all nine answer 200, and none of them answers with a file.
      return yes(0, 'None of the 9 known agent entry paths returns a file rather than your page shell')
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
      // Our own corpus said this check was unmeasurable on 37 of 51 domains, because with no MCP
      // endpoint to follow we probed one origin. We now search the hosts an authorization server
      // actually lives on, so finding nothing across all of them is a measurement.
      if (blindedBy(f)) {
        return {
          points: 0,
          detail: 'Unmeasurable: your edge refused our requests, so nothing we probed proves anything',
          unblock: 'Let ordinary HTTP through to your public pages and this becomes measurable.',
          inconclusive: true,
        }
      }
      if (oauth.probedHosts <= 1) {
        return {
          points: 0,
          detail: 'Unmeasurable: no OAuth metadata on the apex, and no other host we could follow',
          unblock: 'Publish /.well-known/oauth-authorization-server on the host that issues your tokens, or send us that host and we will rescan.',
          inconclusive: true,
        }
      }
      return yes(0, `No OAuth metadata on any of the ${oauth.probedHosts} hosts probed, including the usual auth and api subdomains`)
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
              ? `answered ${first.status} to a JSON-RPC initialize, and answers an unrouted path differently`
              : 'answers JSON'
        return yes(1, `Live MCP endpoint at ${first.url}, ${how}`)
      }
      if (f.machine.wellKnown.mcp_server_card) {
        return yes(
          0,
          `/.well-known/mcp.json is published, but nothing answered at mcp.${f.domain} or /mcp. A card is a claim about a server, not a server.`,
        )
      }
      // Only when the probe itself found nothing out. Eleven of the twelve rows that published
      // this sentence had a decisive probe behind them: mcp.<domain> does not resolve, or it
      // answers a path nobody registered exactly the same way. A file we had to cut short cannot
      // un-know that, and saying so named a cause that had nothing to do with the measurement.
      if (f.machine.mcp.mentions === 0 && f.machine.mcp.mentionsTruncated && !f.funnel.mcpProbed) {
        return {
          points: 0,
          detail: 'Unmeasurable: one of your machine-readable files was larger than we read, so silence about MCP in it proves nothing',
          inconclusive: true,
          unblock: 'Publish an MCP endpoint and we will find it whatever the file size, or split the file.',
        }
      }
      if (f.machine.mcp.mentions > 0) {
        return yes(0, `MCP mentioned ${f.machine.mcp.mentions}x in your own files, but nothing answered at ${MCP_ADDRESSES(f.domain)}`)
      }
      return yes(0, `No MCP surface: nothing answered at ${MCP_ADDRESSES(f.domain)}, and no file mentions MCP`)
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
        // Behind a wall we did not find the signup, which is not the same as there not being one.
        return blindedBy(f)
          ? {
              points: 0,
              detail: 'Unmeasurable: your edge refused our requests, so no signup page could be found',
              inconclusive: true,
              unblock: 'Let ordinary HTTP through to your public pages and this becomes measurable.',
            }
          : {
              points: 0,
              detail: 'Not applicable: nothing on the site links to an account signup, so there is no gate to measure',
              notApplicable: true,
              unblock: 'If accounts are created somewhere else, tell us where and we will rescan.',
            }
      }
      if (f.funnel.signup.captcha.length > 0) {
        return yes(
          0,
          `${f.funnel.signup.captcha.join(', ')} appears in the signup page's server HTML${
            f.funnel.signup.rendersFormWithoutJs ? '' : ', even though the form itself is assembled by JavaScript'
          }`,
        )
      }
      if (!f.funnel.signup.rendersFormWithoutJs) {
        return {
          points: 0,
          detail: 'Unmeasurable: the signup form is not in the server HTML, so its gates are not either',
          unblock: 'Server-render the form, or tell us the endpoint it posts to, and the gates become visible to us and to an agent.',
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
        return blindedBy(f)
          ? {
              points: 0,
              detail: 'Unmeasurable: your edge refused our requests, so no signup page could be found',
              inconclusive: true,
              unblock: 'Let ordinary HTTP through to your public pages and this becomes measurable.',
            }
          : {
              points: 0,
              detail: 'Not applicable: nothing on the site links to an account signup',
              notApplicable: true,
              unblock: 'A product with no accounts cannot fail this. If yours has them elsewhere, point us at the page.',
            }
      }
      if (!signup.reachable) {
        const seen = signup.consistent ? `${signup.status}` : `${signup.statusesSeen.join(', ')}`
        const tried = signup.statusesSeen.length > 0 ? signup.statusesSeen : [signup.status]
        // Our own rule everywhere else: a 429 is us asking too often, never a finding about them.
        if (tried.every((status) => status === 429)) {
          return {
            points: 0,
            detail: `Unmeasurable: ${signup.url} answered ${seen}, which is a limit we triggered rather than a rule about agents`,
            inconclusive: true,
            unblock: 'Nothing for you to do. We will rescan later and this becomes measurable.',
          }
        }
        // A page that is missing for everybody is our discovery being wrong about where your
        // signup lives. anvil.co/signup is a 404 to Chrome too; theirs is on another host and
        // answers 200 to an agent, and we published the opposite as a finding about them.
        const browser = signup.browserStatus
        const browserGotThrough = browser !== null && browser >= 200 && browser < 400
        if (browser !== null && !browserGotThrough) {
          return {
            points: 0,
            detail:
              browser === 404
                ? `Unmeasurable: ${signup.url} answers 404 to a browser as well, so this is where we looked being wrong rather than a door closed on agents`
                : `Unmeasurable: ${signup.url} answers ${seen} to an agent and ${browser} to a Chrome user-agent, so nothing gets in from here and the difference we test for cannot be seen`,
            inconclusive: true,
            unblock:
              browser === 404
                ? 'Link your real signup page from your home page, or tell us the URL and we will rescan.'
                : 'Nothing for you to do here. It becomes measurable from a network your edge admits.',
          }
        }
        const contrast = browser === null ? '' : `, where a Chrome user-agent gets ${browser}`
        return yes(0, `Signup answers ${seen} to a request identifying itself as an agent${contrast}`)
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
      const unread = f.docsPagesUnread ?? 0
      // One page was enough to award two points and too little to conclude anything when the
      // count was zero. That asymmetry inflated every vendor whose first docs page mentioned keys.
      if (found > 0 && pages >= 2) {
        // One phrase is a floor rather than a score while pages we picked went unread, because
        // the phrase that would have earned the second point can be on the page we never got.
        // postmark.com alternated between one point and two across scans of documentation that
        // had not changed, and the difference was which of its pages its edge happened to refuse.
        if (found === 1 && unread > 0) {
          return {
            points: 0,
            detail: `Unmeasurable: provisioning language found on the pages we read, and ${unread} more we selected refused our request, so how much of it you document is not something this scan measured`,
            inconclusive: true,
            unblock: 'Let ordinary HTTP reach your documentation pages and this becomes measurable.',
          }
        }
        // Naming the phrases is the difference between a rule and a grep nobody can rerun: this
        // is the heaviest check on the card and a vendor could not tell which seven we looked for.
        const named = f.funnel.provisioning.programmatic.map((phrase) => `"${phrase}"`).join(', ')
        return yes(
          found >= 2 ? 2 : 1,
          `${found} of ${PROVISIONING_PATTERN_COUNT} provisioning phrases across the ${pages} documents we read: ${named}`,
        )
      }
      if (found > 0) {
        return {
          points: 0,
          detail: `Provisioning language found, but on only ${pages} documentation ${pages === 1 ? 'page' : 'pages'}, which is too little to score either way`,
          inconclusive: true,
          unblock: 'Link your API reference from your docs index or from llms.txt so there is more than one page to read.',
        }
      }
      // Absence in one page is absence of evidence. Saying otherwise failed vendors who
      // document exactly this, one link away from where we happened to look.
      if (pages < 2) {
        return {
          points: 0,
          detail:
            pages === 0
              ? 'Unmeasurable: we could not read a single documentation page, so there was nothing to look in'
              : `Unmeasurable: only ${pages} documentation page could be read, which is too little to conclude anything`,
          inconclusive: true,
          unblock: 'Link your API reference from your docs index or from llms.txt and this becomes measurable.',
        }
      }
      // A page that refused us is not a page that stays silent about keys. postmark.com documents
      // creating them and its edge turned our fetch away, and we published the absence as theirs.
      if (unread > 0) {
        return {
          points: 0,
          detail: `Unmeasurable: ${unread} documentation ${unread === 1 ? 'page we selected refused our request' : 'pages we selected refused our request'}, so nothing here is a finding about what you document`,
          inconclusive: true,
          unblock: 'Let ordinary HTTP reach your documentation pages and this becomes measurable.',
        }
      }
      return yes(0, `None of the ${PROVISIONING_PATTERN_COUNT} provisioning phrases appears in the ${pages} documents we read`)
    },
  },
  {
    id: 'self_serve',
    stage: 'provisioning',
    label: 'Free tier or no-card trial stated in text',
    why: 'A free tier is what lets an agent finish the job in the same session it started. Usage-priced products with self-serve signup can fail this honestly, which is why it is one point and not a verdict.',
    max: 1,
    evaluate: (f) => {
      // Every sentence here says which page it read. "The pricing page" was a claim about a page
      // we often had not opened: cal.com/plans is somebody's booking link, vercel.com/plans
      // redirects to a login screen, and groq.com/pricing answers 308 to the home page.
      const page = f.discovered.pricing ?? f.funnel.signup ?? null
      const at = page ? ` at ${page}` : ''
      // Chrome is a button, not a short page. Suppressing wherever no price matched denied a
      // stated free tier on qdrant.tech, split.io and crowdin.com; suppressing by page length
      // then denied daily.co, which states "10,000 free minutes a month" in 1,230 characters.
      // What actually separates them is whether anything beyond the call to action matched.
      const onlyChrome =
        f.funnel.pricingFetched &&
        f.funnel.pricesVisibleWithoutJs === false &&
        f.funnel.provisioning.selfServeSignals.every((signal) => CTA_WORDING.has(signal))
      if (f.funnel.provisioning.selfServeSignals.length > 0 && !onlyChrome) {
        // Saying it once out of two tries still means you say it, and hiding the disagreement
        // would leave a vendor unable to explain why the number moved between two scans.
        return yes(
          1,
          f.funnel.pricingTriesDisagreed
            ? `Free tier or no-card signals${at}, present in one of the two fetches of that page`
            : `Free tier or no-card signals${at}`,
        )
      }
      // Absence read off a body we cut short is not absence. The same rule already governs the
      // MCP mention count, and it is what separates a finding from an artefact of our own cap.
      if (f.funnel.pricingTruncated) {
        return {
          points: 0,
          detail: `Unmeasurable: ${page ?? 'your pricing page'} is larger than we read, so anything we did not find in it is a fact about our cap and not about your tiers`,
          inconclusive: true,
          unblock: 'Nothing for you to do. A smaller pricing page, or one that states its tiers early, makes this measurable.',
        }
      }
      // A pricing page that needs JavaScript to show a price is one an agent cannot read either,
      // so this is a measured finding about the page rather than a gap in the scan.
      // Says which words were found and why they were not enough, because the sentence below
      // told here.com, sinch.com and replicate.com that no free wording was on a page that
      // carries it. A vendor reads their own page before they read us.
      if (onlyChrome) {
        return yes(
          0,
          `${page ?? 'Your pricing page'} prints no price without JavaScript, and its only free wording is a call to action rather than a stated tier`,
        )
      }
      if (f.funnel.pricingFetched && f.funnel.pricesVisibleWithoutJs === false) {
        // Says what was measured. The old sentence claimed nothing about the tiers survived, and
        // that was false on nine of the twelve rows carrying it: plaid.com serves three named
        // tiers with their feature lists and simply has no free one, which is an honest fail.
        return yes(
          0,
          `${page ?? 'Your pricing page'} answers a plain request with no price and no free-tier wording in the ${f.funnel.pricingTextLength.toLocaleString('en-US')} characters it serves`,
        )
      }
      // A path we guessed and that carries no pricing signal is far more likely to be the wrong
      // page than a vendor with no free tier, and the wrong page is our mistake to own.
      if (f.discovered.linkSources?.pricing === 'fallback-path') {
        return {
          points: 0,
          detail: `Unmeasurable: we guessed ${page} and found no pricing there, which is more likely to be the wrong page than an answer about your tiers`,
          inconclusive: true,
          unblock: 'Link your pricing page from your home page, and this becomes a measurement rather than a guess.',
        }
      }
      if (!f.funnel.pricingFetched) {
        // A library with nothing to buy has no free tier to state, and marking that unmeasurable
        // implied we had failed to find something that does not exist. The signup checks already
        // draw this line; this one was still charging open-source projects for our confusion.
        if (!f.discovered.pricing && !f.discovered.signup && !f.blocksPlainRequests) {
          return {
            points: 0,
            detail: 'Not applicable: nothing on the site links to pricing or to an account, so there is no tier to state',
            notApplicable: true,
            unblock: 'If there is a paid tier, link its pricing from your home page and we will rescan.',
          }
        }
        return { points: 0, detail: 'Unmeasurable: no pricing page could be fetched',
          unblock: 'Link a pricing page from your home page, or list one in llms.txt.', inconclusive: true }
      }
      return yes(0, `No free tier or no-card wording${at || ' on the pricing page'}`)
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
        return {
          points: 0,
          // Not "we found nothing", which was false. pdfmonkey.io publishes @pdfmonkey/cli from
          // an @pdfmonkey.io address, and we identified it and then dropped it because a command
          // line tool is not what this check asks about. The sentence claimed a search had come
          // back empty when it had come back with the wrong shape of answer.
          detail:
            'Unmeasurable: we could not identify the package a developer installs to use you, from your site, your docs or a registry search',
          inconclusive: true,
          unblock: 'Name your package once in your docs, or link it from your repository, and we stop guessing.',
        }
      }
      if (!f.npm.found) return yes(0, `Package ${f.npm.package} not found on the registry`)
      if (!f.npm.bundledTypes) return yes(0, `${f.npm.package} ships without bundled types`)
      const stale = f.npm.staleMonths
      if (stale !== undefined && stale >= 24) {
        // What we measure is the registry record's Last-Modified, which any metadata write moves,
        // so it is a floor on the age and not the publish date. june.so read as 28 months where
        // the newest version is 35.6 months old, and the sentence claimed the smaller number.
        return yes(0, `${f.npm.package} is typed, and its registry record has not changed in ${stale} months`)
      }
      // Withholding the point when the name did not look like an SDK cost chromadb and
      // @amplitude/analytics-browser, both of which are exactly the package a developer
      // installs. A name is too crude a classifier for that, so the point stands and the
      // sentence says what the match rests on instead of overstating it.
      const basis =
        f.discovered.npmSource !== 'registry-search'
          ? ''
          : ', matched from the registry by who publishes it rather than by a link on your site'
      return yes(1, `${f.npm.package}@${f.npm.version} ships types${basis}`)
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
      // The path alone is ambiguous on a vendor whose docs and site are different hosts, and
      // it is the sentence a sceptic reruns first.
      if (f.machine.openapi.length > 0) return yes(1, `OpenAPI at ${f.site}${f.machine.openapi[0]}`)
      const fakesMarkdown = f.funnel.catchAll?.markdown ?? f.funnel.servesCatchAll
      if ((negotiation.acceptHeader || negotiation.dotMdSuffix) && !fakesMarkdown) {
        // Naming the page matters more here than anywhere else: on nearly every domain that
        // passes, the docs front page is the one page that does not negotiate, so a vendor
        // testing the obvious URL sees HTML and concludes we made the finding up.
        const where = negotiation.answeredAt ? `, at ${negotiation.answeredAt}` : ''
        return yes(1, `Docs serve markdown to machines${where}`)
      }
      if (negotiation.acceptHeader || negotiation.dotMdSuffix) {
        return {
          points: 0,
          detail: 'Unmeasurable: the site answers unknown markdown paths with text, so the markdown it served is not evidence of negotiation',
          inconclusive: true,
        }
      }
      if (blindedBy(f)) {
        return { points: 0, detail: 'Unmeasurable behind the WAF',
          unblock: 'Let ordinary HTTP through to your public pages and this becomes measurable.', inconclusive: true }
      }
      // "Not found on your domain" is what we measured. "Does not exist" is not.
      return yes(0, 'No OpenAPI spec and no markdown negotiation found on this domain')
    },
  },
]

/**
 * A signup that turns an agent away and lets a browser through. The two numbers on the landing
 * page are this, not "the signup was not reachable": a 429 is our own traffic, and a 404 to
 * everybody is our discovery being wrong about where the page lives.
 */
export function signupNeedsJavaScript(report: { findings: ScanFindings; scorecard: Scorecard }): boolean {
  // Read off the scored verdict, not off the raw finding. telnyx.com's scan ran out of time, so
  // its check came back unmeasured while the finding still said "reachable, no form in the HTML",
  // and the landing page counted a domain the corpus itself refuses to score.
  const check = report.scorecard.checks.find((candidate) => candidate.id === 'signup_reachable')
  if (!check || check.inconclusive || check.notApplicable || check.points > 0) return false
  return report.findings.funnel.signup.reachable && !report.findings.funnel.signup.rendersFormWithoutJs
}

export function refusesAgentsAtSignup(findings: ScanFindings): boolean {
  const signup = findings.funnel.signup
  if (!signup.url || signup.reachable) return false
  const tried = signup.statusesSeen.length > 0 ? signup.statusesSeen : [signup.status]
  if (tried.every((status) => status === 429)) return false
  // The browser has to actually get through. A 404 to an agent and a 403 to Chrome is two
  // different refusals, not a door held open for one of them, and it was two of the two rows
  // left standing after the first pass at this rule.
  const browser = signup.browserStatus
  return browser !== null && browser >= 200 && browser < 400
}

export const MAX_SCORE = CHECKS.reduce((total, check) => total + check.max, 0)

export type ScoredCheck = Check & CheckResult
/** Every machine-readable surface points a reader at the rule behind a verdict, not just the verdict. */
export function checkHelpUri(checkId: string, baseUrl: string): string {
  return `${baseUrl}/methodology#${checkId}`
}

export type Scorecard = {
  formulaVersion: string
  total: number
  max: number
  /**
   * Points we could actually evaluate. Scoring out of `max` charged a vendor for our own
   * blind spots, which is the rule the industry report already refuses to apply to the
   * market: froala.com read as 3/16 when eight of those points were never measured.
   */
  measurable: number
  stages: {
    stage: Stage
    letter: string
    title: string
    question: string
    points: number
    max: number
    measurable: number
  }[]
  checks: ScoredCheck[]
}

/**
 * A shut door only blinds us to what we could not read anyway. Treating it as site-wide made a
 * row claim every request was refused while its neighbours quoted the pages we had just fetched.
 */
const blindedBy = (f: ScanFindings) => f.blocksPlainRequests && !f.readAnything

const counts = (check: ScoredCheck) => !check.inconclusive && !check.notApplicable

export function scoreFindings(findings: ScanFindings): Scorecard {
  // A phase the deadline cut off leaves nothing behind, and evaluate() cannot tell that from a
  // site that publishes nothing: a robots.txt we never fetched reads as "no robots.txt, so
  // nothing is disallowed for anyone" and is handed a point. Points are not a safe signal for
  // whether evidence arrived, because several checks award points for a documented absence, so
  // every check the scan did not reach is demoted whatever it scored.
  const missed = new Set(findings.truncation?.unmeasuredChecks ?? [])
  const checks: ScoredCheck[] = CHECKS.map((check) => {
    if (!missed.has(check.id)) return { ...check, ...check.evaluate(findings) }
    return {
      ...check,
      points: 0,
      detail: findings.truncation?.detail ?? 'Unmeasurable: the scan ran out of time before this check',
      inconclusive: true,
      unblock: 'Nothing for you to do. Scan again and this becomes measurable.',
    }
  })

  const stages = STAGES.map((stage) => {
    const inStage = checks.filter((check) => check.stage === stage.id)
    return {
      stage: stage.id,
      letter: stage.letter,
      title: stage.title,
      question: stage.question,
      points: inStage.reduce((sum, check) => sum + check.points, 0),
      max: inStage.reduce((sum, check) => sum + check.max, 0),
      measurable: inStage.filter(counts).reduce((sum, check) => sum + check.max, 0),
    }
  })

  return {
    formulaVersion: FORMULA_VERSION,
    total: checks.reduce((sum, check) => sum + check.points, 0),
    max: MAX_SCORE,
    measurable: checks.filter(counts).reduce((sum, check) => sum + check.max, 0),
    stages,
    checks,
  }
}
