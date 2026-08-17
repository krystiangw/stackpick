import { AGENT_ENTRY_PATH_COUNT, AGENT_ENTRY_PATHS, PROVISIONING_PATTERN_COUNT } from './scan/funnel'
import { AGENT_UA, DOCS_SHELL_FLOOR } from './scan/http'
import { OPENAPI_PATHS } from './scan/machine'
import { CREDENTIAL_PATH } from './scan'
import { AI_CRAWLERS } from './scan/robots'
import type { ScanFindings } from './scan'

/**
 * Bumped whenever the rules move, including when they move back. 9.4 published "1 of 8
 * provisioning phrases" and there are seven again, so every one of those sentences would be
 * unreproducible against the deployed scanner. Two scanners under one version string is exactly
 * what this constant exists to prevent, and the cost of being wrong about that is a vendor who
 * cannot reproduce a number we published about them.
 */
export { DOCS_SHELL_FLOOR }

export const FORMULA_VERSION = '9.31'

/** Dead entries an llms.txt may carry before its map stops being worth following. */
const TOLERATED_DEAD_LINKS = 1

/**
 * Every address the probe actually tries. The sentence used to name two of the five, and on
 * kinde.com the one it left out is the one that answers: api.kinde.com/mcp challenges with a
 * WWW-Authenticate naming its own protected-resource document. Naming fewer addresses than we
 * ask makes a vendor unable to reproduce our own denial.
 */
const MCP_ADDRESSES = (domain: string) =>
  `mcp.${domain}, mcp.${domain}/mcp, mcp.${domain}/v1/mcp, api.${domain}/mcp, api.${domain}/v1/mcp, /mcp or /api/mcp, and any address you publish in the MCP registry`

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

/**
 * The status a vendor's edge gave us when we asked for a page, when that status is a refusal
 * rather than an answer. Two checks published "no documentation could be found" about sites that
 * had answered 403 and 429, which is a claim about their product built from a measurement of ours.
 */
function refusedUs(f: ScanFindings): number | null {
  // Optional all the way down because the rule fixtures build a findings object with only the
  // fields their check reads, and a guard that crashes on a partial one is a guard nobody runs.
  const status = f.machine?.markdownNegotiation?.docsStatus
  if (status === undefined) return null
  // Only a status the edge actually sent. Zero is our own word for "no HTTP answer", and
  // http.ts returns it when the scan budget ran out, when we refused a redirect and when a host
  // had already left too many requests unanswered. The first version of this guard called all of
  // that "your site answered nothing when we asked", which blames a vendor for our clock: the
  // exact sentence this guard was added to stop us publishing.
  return status >= 400 ? status : null
}

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
      // A 2xx anywhere in the sequence disproves the sentence below, whatever the last try said.
      // name.com answered (200, 429, 429) and we published "no agent reaches the site at all"
      // about a site that had just served us, because the challenge is read off the final fetch
      // alone. Three requests in a row is our load and not what an agent does, so the challenge
      // we then met is ours to own. Same reasoning the rate-limit branch below already carries.
      const letUsIn = f.agentStatusesSeen?.find((status) => status >= 200 && status < 400)
      if (f.botChallenge && letUsIn !== undefined) {
        return yes(
          1,
          `Answered ${letUsIn} to ${AGENT_UA}${tries}, so an agent reaches the site: the JavaScript challenge came only after we had asked three times in a row, which is our load rather than your wall`,
        )
      }
      // An edge on a verified-bot allowlist challenges every user-agent it has no rule for,
      // which is ours, and admits the two the product is actually about. bitmovin.com serves
      // ChatGPT-User and Claude-User fifteen thousand characters while challenging us, and we
      // published "no agent reaches the site at all" about it: the harshest sentence here, and
      // false. The unknown-client wall is still worth naming, so the sentence keeps it.
      const admits = f.challengeAdmits ?? []
      if (f.botChallenge && admits.length > 0) {
        return yes(
          1,
          `Answered ${f.agentStatus} to ${AGENT_UA}${tries} with a JavaScript challenge, but your edge admits the agents it has heard of: ${admits.map((agent) => `${agent.name} ${agent.status}`).join(' and ')}. A client with a user-agent nobody has written a rule for is still turned away`,
        )
      }
      // A challenge is not a limit. The edge is asking the caller to run JavaScript, which every
      // browser does invisibly and no HTTP client does at all, so it is the sharpest possible
      // answer to this check rather than an excuse for skipping it.
      //
      // That was true of an all-429 challenge too until 9.18, and it was the wrong way to settle a
      // real contradiction: this check read "no agent reaches the site at all" while the signup
      // check read "a limit we triggered", about the same edge on the same scan, so the excuse
      // won. Measured on 2026-08-15, the excuse was the false half. contentful.com and
      // pandadoc.com answer 429 with `x-vercel-mitigated: challenge` to a Chrome user-agent, from
      // a laptop, with no traffic of ours anywhere near them. Vercel's attack mode simply uses 429
      // as the status of its wall, so reading the number and ignoring the header let two vendors
      // out of the one finding this check exists to make. The control is the other half:
      // postmarkapp.com answered (200, 429, 200) with no challenge header and 200 from the same
      // laptop, and that 429 really is ours - it is still excused, one branch below.
      if (f.botChallenge) {
        // "The site" was a claim about every host we read, and namecheap.com carried it next to a
        // robots.txt we had just read from the same origin. The measurement is one request.
        return yes(
          0,
          `Answered ${f.agentStatus} to ${AGENT_UA}${tries} with a JavaScript challenge from your edge, so an agent does not get past ${f.site}`,
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
        // Every file the sample was taken from, not the first of them. Naming one address for two
        // files makes the verdict unreproducible, which is not theoretical: rebuilding this check
        // from the corpus on 2026-08-12 failed on six of twenty rows, because the sample runs over
        // files the scan discovered at addresses the sentence never printed.
        const at = f.machine.llmsUrls?.length ? ` at ${f.machine.llmsUrls.join(' and ')}` : ''
        const links = f.machine.llmsLinks
        // The sample runs over every llms file we read, concatenated, so a row that names only
        // llms.txt describes a measurement that did not happen. pdfmonkey.io proved it: the dead
        // link the sentence cited appears nowhere in its llms.txt, only on line 4700 of its
        // llms-full.txt. Five rows read that way, all of them in this branch, because the passing
        // branch named both files and this one never did.
        // Named from what answered. A vendor who publishes only llms-full.txt was told "llms.txt
        // and llms-full.txt present", which is half an invention about a file they never wrote.
        const plain = Object.entries(f.machine.llms).some(([label, file]) => file.present && !label.includes('full'))
        const files = f.machine.hasLlmsFullTxt
          ? plain
            ? 'llms.txt and llms-full.txt present'
            : 'llms-full.txt present'
          : 'llms.txt present'
        // Counted from the files the sample actually drew from, not from hasLlmsFullTxt and not
        // from the addresses printed: typesense.org serves llms.txt on the apex and on /docs, so
        // the row named two files and then said the sample ran "across the file", while agora.io
        // serves three of which one holds no link at all. Either way the reader who checks us
        // opens a file the sentence sent them to and finds nothing of what we described.
        const fileCount = links?.files ?? f.machine.llmsUrls?.length ?? 0
        const named = f.machine.llmsUrls?.length ?? 0
        const across =
          // Naming three addresses and then saying "across both files" leaves the reader guessing
          // which two, so when the sample did not draw from every file we say so instead. Phrased
          // as a fraction rather than "the ones that carry links", because that was a second claim
          // and a false one: a file can carry a thousand links and still be missed by twelve
          // evenly spaced picks, and llms-full.txt carries links we deliberately do not resolve.
          fileCount < named
            ? `across ${fileCount} of the ${named} files`
            : fileCount > 2
              ? `across the ${fileCount} files`
              : fileCount === 2
                ? 'across both files'
                : 'across the file'
        // A curated map whose entries are gone is worse than no map: an agent follows them, gets
        // nothing, and has spent its budget. The point is the file being useful, not present.
        //
        // But one dead link in a sample of twelve is rot, not a broken map, and until 2026-08-12
        // it scored the same zero as publishing nothing at all. That was twelve of the nineteen
        // vendors who had a file: every one of them maintaining a map an agent could follow,
        // graded level with the vendors who published none. A single miss at this sample size is
        // also inside the noise, so it is now named and not charged for.
        // Proportional as well as absolute, because the sample has no floor: a file with one
        // entry, dead, would otherwise take the point on the "one in twelve is noise" argument
        // and print "0 of the 1 links we sampled answer" while doing it.
        if (links && (links.dead > TOLERATED_DEAD_LINKS || links.dead * 4 > links.sampled)) {
          return yes(
            0,
            `${files}${at}, but ${links.dead} of the ${links.sampled} links we sampled ${across} are gone, starting with ${links.firstDead}`,
          )
        }
        if (links && links.dead > 0) {
          return yes(
            1,
            `${files}${at}, and ${links.sampled - links.dead} of the ${links.sampled} links we sampled ${across} answer. One is gone: ${links.firstDead}`,
          )
        }
        const checked = links ? `, and the ${links.sampled} links we sampled ${across} all answer` : ''
        return yes(1, `${files}${at}${checked}`)
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
        // And a site that turned us away is not a site without documentation. froala.com answers
        // 403 and contentful.com 429, and both read "no documentation page could be found" while
        // the check next door on the same scan named the status it got. The rule was already
        // written for the neighbour and never carried across.
        // Explicitly against null: status 0 means the edge gave us nothing at all, and it is
        // falsy, so the obvious truthiness test silently dropped the worst refusal of the three.
        const refused = refusedUs(f)
        if (refused !== null) {
          return {
            points: 0,
            detail: `Unmeasurable: ${f.site} answered ${refused} when we asked for a page, so we never got as far as looking for documentation`,
            unblock: refused === 429 ? 'Nothing for you to do if this was a burst. We rescan later and this becomes measurable.' : 'Let ordinary HTTP through to your public pages and this becomes measurable.',
            inconclusive: true,
          }
        }
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
      // Cloaking: the same URL at the same moment, answered thinner to an agent user-agent than
      // to Chrome. Every other read on the scan is a browser, so without asking twice this was
      // invisible anywhere except the front door, and it is the sharpest form of the thing this
      // check exists to measure. A vendor can reproduce it with two curls.
      const thinner = f.docsThinnerForAgents
      if (thinner !== null) {
        return yes(
          0,
          `${entry} serves ${Math.round(thinner * 100)} percent less text to ${AGENT_UA} than to a Chrome user-agent, at the same URL and the same moment`,
        )
      }
      // The line is where an empty shell stops and a short page begins, and it sat at 2,000
      // characters, which is inside the honest population rather than below it. Measured across
      // the corpus on 2026-08-12: the genuine shells render 31, 38, 63 and 126 characters, while
      // the smallest page we were wrongly failing renders 647. njal.la ships no bundle at all and
      // its whole documentation set tops out at 1,697 characters per page, so no sampling change
      // rescues it and only the threshold does. 500 sits in the gap, five times either way.
      return f.docsTextChars >= DOCS_SHELL_FLOOR
        ? yes(1, `${chars} characters of text without JS${where}`)
        : yes(0, `Only ${chars} characters render without JS${where}, which is a page shell rather than a page`)
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
      // What robots.txt permits and what the edge does are two different measurements, and only
      // one of them is what an agent experiences. algolia.com's file blocks nobody while its edge
      // answers 403 to ChatGPT-User at a documentation page it serves a browser in full.
      const refused = f.crawlersRefused ?? []
      if (refused.length > 0) {
        return yes(
          0,
          `robots.txt permits them, but your edge answered ${refused.map((crawler) => `${crawler.name} ${crawler.status}`).join(' and ')} at ${f.discovered.docs}, which a browser is served`,
        )
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
    /**
     * Krystian's idea, and it survived a measurement that nearly killed it. The literal version,
     * "is every Allow a real page", is a category error for wildcards: `Allow: /*.js$` is a rule
     * and probing it would invent a failure. Restricted to concrete paths it holds up: 9 of the
     * 34 in the corpus answer 404, which is 26 percent, and six belong to one vendor pointing
     * agents at SDK reference pages that are gone.
     *
     * Not applicable to the 141 domains that make no concrete claim, which is what N/A is for:
     * a vendor is not penalised for declining to promise anything.
     */
    id: 'robots_paths_resolve',
    stage: 'discovery',
    label: 'Paths robots.txt points at answer',
    why: 'An Allow line is a claim that a path is worth fetching. An agent that follows it into a 404 has spent budget on your map being wrong.',
    max: 1,
    evaluate: (f) => {
      if (!f.robots.present) {
        if (f.robots.unreadable) {
          return {
            points: 0,
            detail: 'Unmeasurable: robots.txt was refused rather than absent, so nothing in it could be followed',
            inconclusive: true,
            unblock: 'Serve robots.txt to ordinary HTTP clients and this becomes measurable.',
          }
        }
        return { points: 0, detail: 'No robots.txt, so it points nowhere', notApplicable: true }
      }
      const allow = f.robots.allowPaths
      if (!allow || allow.checked === 0) {
        return {
          points: 0,
          detail: 'robots.txt names no concrete path, only patterns or nothing, so there is no claim to check',
          notApplicable: true,
        }
      }
      if (allow.dead.length === 0) {
        // "All answer" was untrue on four rows whose allowed path refused us with 403 or 400.
        // Nothing is gone, so the point stands, and the sentence now says what happened.
        const refused = allow.unanswered ?? []
        if (refused.length > 0) {
          return yes(
            1,
            `none of the ${allow.checked} concrete path${allow.checked === 1 ? '' : 's'} your robots.txt allows is gone, though ${refused[0].path} answered us ${refused[0].status}`,
          )
        }
        return yes(1, `the ${allow.checked} concrete path${allow.checked === 1 ? '' : 's'} your robots.txt allows all answer`)
      }
      return yes(
        0,
        allow.checked === 1
          ? `the one concrete path your robots.txt allows is gone: ${allow.dead[0]}`
          : `${allow.dead.length} of the ${allow.checked} concrete paths your robots.txt allows are gone, starting with ${allow.dead[0]}`,
      )
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
      // This describes the site's OWN namespaces, and since 9.19 the probe also asks the
      // documentation origin, which has its own control. A site that answers everything while its
      // docs host serves a real file is measurable through the docs host, so a hit there outranks
      // it - but only a hit there. Letting any hit through reopened the hole this branch exists to
      // close: a site whose shell carries a nonce or a timestamp differs from its own control and
      // from itself on every request, so the body comparisons cannot see it, and four copies of
      // one shell would have been published as four entry files worth two points.
      const found = f.funnel.entryPointsFound
      const elsewhere = found.filter((entry) => entry.startsWith('http') && !entry.startsWith(f.site))
      const usable = everyNamespaceFakes ? elsewhere : found
      if (everyNamespaceFakes && elsewhere.length === 0) {
        return {
          points: 0,
          detail: 'Unmeasurable: the site answers unknown paths in every format with real text, so any hit here proves nothing',
          inconclusive: true,
        }
      }
      // Absolute since 9.19, because the file is no longer always on the site: the probe asks the
      // documentation origin too. Rows written before that hold bare paths, and printing those
      // against the wrong host would send a vendor to check an address we never fetched.
      const pathOf = (entry: string) => {
        if (!entry.startsWith('http')) return entry
        try {
          return new URL(entry).pathname
        } catch {
          return entry
        }
      }
      // A .well-known descriptor already scores under MCP; counting it twice sold one file
      // as three points across two stages.
      const written = usable.filter((entry) => !pathOf(entry).startsWith('/.well-known/'))
      // Older reports predate the content test, and rescoring them as policy files would be a
      // claim about a body we no longer hold.
      const withProcedure = (f.funnel.entryPointsWithProcedure ?? written).filter(
        (entry) => !pathOf(entry).startsWith('/.well-known/') && usable.includes(entry),
      )
      const at = (entries: string[]) => entries.map((entry) => (entry.startsWith('http') ? entry : `${f.site}${entry}`)).join(', ')
      if (withProcedure.length > 0) return yes(2, `Found: ${at(withProcedure)}`)
      if (written.length > 0) {
        return yes(
          1,
          `Found ${at(written)}, but it states a policy rather than a procedure: nothing in it names a credential, an endpoint or a way to get an account.`,
        )
      }
      if (usable.length > 0) {
        return yes(1, `Only service descriptors: ${at(usable)}. No procedure written for a machine.`)
      }
      // A refusal is not an absence, the same rule robots.txt already follows. bitmovin.com
      // publishes a real 9.6 kB skill.md and answers 403 to our data centre on most requests,
      // so on the runs where it refuses this path we were publishing "you have none of these".
      const refused = f.funnel.entryPathsRefused ?? 0
      // The count is over everything asked, and since 9.19 that is the nine paths on the site and
      // the same nine on the documentation origin when there is one. Saying "of the 9" while
      // having asked eighteen is a number a vendor cannot reproduce.
      const asked = f.funnel.entryProbesAsked ?? AGENT_ENTRY_PATH_COUNT
      // From where we actually asked, not from how many. Older rows have no flag and fall back to
      // the count, which was the only signal they were scored on.
      const docsProbed = f.funnel.entryDocsProbed ?? asked > AGENT_ENTRY_PATHS.length
      const where = docsProbed ? 'on your site and your documentation host' : 'on your site'
      // Only the site can make this unmeasurable. Older rows have no split and fall back to the
      // total, which is what they were scored on.
      const refusedOnSite = f.funnel.entrySiteRefused ?? refused
      if (refusedOnSite > 0) {
        return {
          points: 0,
          detail: `Unmeasurable: ${refusedOnSite} of the ${AGENT_ENTRY_PATHS.length} agent entry paths we asked on your site answered with a refusal rather than a file or a 404, so what you publish there is not something we measured`,
          inconclusive: true,
          unblock: 'Let ordinary HTTP reach these paths and this becomes measurable.',
        }
      }
      // "None of them answer" was false on every site that serves its app shell for unknown
      // paths, which is most of them: all nine answer 200, and none of them answers with a file.
      //
      // A documentation host that refused us is named rather than allowed to erase the site's
      // answer. We looked there because the site held nothing, and being turned away there is a
      // fact about the second place we looked, not about the first.
      const docsRefused = refused - refusedOnSite
      const caveat = docsRefused > 0 ? `, and your documentation host refused ${docsRefused} of them` : ''
      return yes(0, `None of the ${asked} agent entry paths we asked ${where} returns a file rather than your page shell${caveat}`)
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
      if (oauth.dynamicClientRegistration) {
        // The point is for the registration endpoint and stays there, because that is what this
        // check has always measured and moving it would silently rescore the corpus. The sentence
        // is what was wrong: an agent that may introduce itself still cannot get a token if every
        // advertised grant puts a person at a browser. namecheap.com and dynadot.com publish the
        // same shaped door and only one of them opens without a human.
        const grants = oauth.grantTypes
        if (!grants || grants.length === 0) return yes(1, 'registration_endpoint published')
        return yes(
          1,
          oauth.unattendedGrant
            ? `registration_endpoint published, and client_credentials is among the ${grants.length} advertised grants, so an unattended agent has a documented path to a token`
            : // The parenthetical is capped at three, so with more than that it has to say it is
              // a sample. "None of the 6 grants (a, b, c)" reads as the whole list and is not.
              `registration_endpoint published, but none of the ${grants.length} advertised grants (${grants.length > 3 ? 'including ' : ''}${grants.slice(0, 3).join(', ')}) finishes without a person at a browser`,
        )
      }
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
      // An npm library has no server to issue tokens and nothing to register a client against, so
      // "no registration endpoint" reads as a deficiency where there is no facility. The same
      // eight rows we already tell "there is no gate to measure" were being charged for this, and
      // the line is copied from self_serve rather than invented: the signup checks drew it first.
      if (!f.discovered.pricing && !f.discovered.signup && !f.blocksPlainRequests) {
        return {
          points: 0,
          detail: 'Not applicable: nothing on the site links to pricing or to an account, so there is no client for an agent to register',
          notApplicable: true,
          unblock: 'If you do issue tokens, publish /.well-known/oauth-authorization-server on the host that issues them and we will rescan.',
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
      const all = f.funnel.mcpEndpoints
      // A server that answers only a browser is a wall with a protocol behind it, and the point
      // is for a surface an agent can reach. Reported precisely rather than as "nothing answered",
      // which would be false: something answered, and it said why it would not talk to us.
      const browserOnly = all.filter((endpoint) => endpoint.evidence === 'browser-only')
      const live = all.filter((endpoint) => endpoint.evidence !== 'browser-only')
      if (live.length === 0 && browserOnly.length > 0) {
        return yes(
          0,
          `${browserOnly[0].url} speaks JSON-RPC and then refuses any request without a browser Referer or Origin header, which no unattended agent sends`,
        )
      }
      if (live.length > 0) {
        const first = live[0]
        const how =
          first.evidence === 'challenges'
            ? `answered ${first.status} with an auth challenge`
            : first.evidence === 'rejects-get'
              ? `answered ${first.status} to a JSON-RPC initialize, and answers an unrouted path differently`
              : first.evidence === 'accepts-handshake'
                ? 'accepted a JSON-RPC initialize with 202 and answers on a stream, where an unrouted path on the same host does not'
                : 'answers JSON'
        return yes(1, `Live MCP endpoint at ${first.url}, ${how}`)
      }
      // Nothing was measured, so nothing is claimed. kinde.com's edge answers every POST from our
      // data centre with 202 and an empty body, including one to a path nobody registered, while
      // the same address answers 401 from a laptop. "Nothing answered at six addresses" reads as
      // a finding about their product when it is a finding about their edge and our network.
      if (f.funnel.mcpPostsSwallowed) {
        return {
          points: 0,
          detail:
            'Unmeasurable: every JSON-RPC POST we sent came back with an empty 2xx, including one to a path nobody registered, so what answered was your edge rather than your server',
          inconclusive: true,
          unblock: 'Nothing for you to do if your server is reachable from other networks. Whether an MCP server is there becomes measurable from a network your edge does not intercept.',
        }
      }
      if (f.machine.wellKnown.mcp_server_card) {
        // Only when we actually read the address out of the card. telnyx.com published this
        // sentence during the 8.5 reseed while its card named api.telnyx.com/v2/mcp, which
        // answers a full handshake: one failed fetch of the card dropped the only candidate that
        // mattered, and the sentence then named the two hostnames we had guessed as though they
        // were the addresses in question. Naming them is what makes it checkable, so a scan that
        // never got the card has to say that instead of concluding from what it guessed.
        const named = f.funnel.mcpCardNamed ?? []
        if (named.length === 0) {
          return {
            points: 0,
            detail: `Unmeasurable: /.well-known/mcp.json is published and we could not read an endpoint out of it this time, so the addresses we probed were guesses rather than yours`,
            inconclusive: true,
            unblock: 'Nothing for you to do if the file is served reliably. We rescan, and a readable card decides this in one request.',
          }
        }
        return yes(
          0,
          `/.well-known/mcp.json names ${named.join(', ')}, and nothing answered there or at mcp.${f.domain} or /mcp. A card is a claim about a server, not a server.`,
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
      // The pages named here are theirs, opened because nothing else answered. Saying so is what
      // separates "we guessed six addresses" from "we also read where you said your server is",
      // and neon.com is the row that made the difference matter: their endpoint lives on
      // neon.tech and no guess about neon.com could ever have reached it.
      const followed = f.funnel.mcpPagesFollowed ?? []
      const alsoRead = followed.length > 0 ? `, nor at any address in ${followed.join(' or ')}` : ''
      if (f.machine.mcp.mentions > 0) {
        return yes(
          0,
          `MCP mentioned ${f.machine.mcp.mentions}x in your own files, but nothing answered at ${MCP_ADDRESSES(f.domain)}${alsoRead}`,
        )
      }
      return yes(0, `No MCP surface: nothing answered at ${MCP_ADDRESSES(f.domain)}${alsoRead}, and no file mentions MCP`)
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
          : f.discovered.pricing
            ? {
                points: 0,
                // "Not applicable" says the product has no accounts. A product that publishes
                // prices has accounts, so on those rows the sentence was a claim about the vendor
                // made out of our own failure to find a link. Sixteen of the twenty five rows
                // carrying it publish a pricing page, and three of them link signup straight from
                // the home page: filestack.com, magicbell.com and timekit.io.
                detail: `Unmeasurable: we found no link to an account signup on the pages we read, while you publish prices at ${f.discovered.pricing}, so this is a gap in our reading rather than a finding about you`,
                inconclusive: true,
                unblock: 'Link signup from your home page or your pricing page and this becomes measurable.',
              }
            : {
                points: 0,
                detail: 'Not applicable: nothing on the site links to pricing or to an account signup, so there is no gate to measure',
                notApplicable: true,
                unblock: 'If accounts are created somewhere else, tell us where and we will rescan.',
              }
      }
      // A page nobody was served has no server HTML to read gates out of. Eleven rows said "the
      // signup form is not in the server HTML, so its gates are not either" beside a sibling
      // saying the same URL answered 403 to everyone, which describes reading a page we never
      // got. Harmless while both are unmeasured and not harmless one branch away: a CAPTCHA
      // signature inside a WAF error body would have scored a fail on a page we never saw.
      if (!f.funnel.signup.reachable) {
        return {
          points: 0,
          detail: `Unmeasurable: ${f.funnel.signup.url} did not serve us the signup page, so its gates are not something we read`,
          inconclusive: true,
          unblock: 'Let ordinary HTTP reach your signup page and this becomes measurable.',
        }
      }
      if (f.funnel.signup.captcha.length > 0) {
        // Six of the twenty eight rows carrying this sentence serve the same token on their front
        // page, where there is no account to create. That does not clear them, because a script
        // the whole site loads still runs on this form, and it does not convict them either: the
        // HTML cannot say which. The reader gets told which of the two we actually saw.
        const everywhere = f.funnel.signup.captchaSiteWide ?? []
        const alsoAtHome =
          everywhere.length > 0
            ? `. ${everywhere.join(', ')} is on your front page too, where there is no account to create, so this may be a script the whole site loads rather than a gate on this form. We did not submit it, so which one it is stayed unmeasured`
            : ''
        return yes(
          0,
          `${f.funnel.signup.captcha.join(', ')} appears in the signup page's server HTML${
            f.funnel.signup.rendersFormWithoutJs
              ? ''
              : f.funnel.signup.identityProviderOnly
                ? ', even though the page carries no form of its own and offers only an identity provider'
                : ', even though the form itself is assembled by JavaScript'
          }${alsoAtHome}`,
        )
      }
      if (!f.funnel.signup.rendersFormWithoutJs) {
        return {
          points: 0,
          detail: `Unmeasurable: the signup form at ${f.funnel.signup.url} is not in the server HTML, so its gates are not either`,
          unblock: 'Server-render the form, or tell us the endpoint it posts to, and the gates become visible to us and to an agent.',
          inconclusive: true,
        }
      }
      // Named next to the pass, not folded into it. See BOT_DEFENCE_SIGNATURES: the point stands
      // because there is no CAPTCHA, and the reader still gets to know what else is on the page.
      const defence = f.funnel.signup.botDefence ?? []
      return yes(
        1,
        `No CAPTCHA vendor in the server HTML. A widget mounted later by JavaScript would not show here.${
          defence.length > 0
            ? ` The page does carry ${defence.join(' and ')}, a bot defence that decides in the background rather than a challenge anyone solves. We did not submit the form, so whether it lets an unattended request through is not something we measured.`
            : ''
        }`,
      )
    },
  },
  {
    id: 'signup_reachable',
    stage: 'signup',
    label: 'Signup reachable without a browser',
    // The old sentence promised a comparison this check does not run. All 88 failures in the
    // 9.2 corpus were the same finding, and none of them was a 403: the page answers 200 and
    // carries no form until a bundle builds one. That is worth a point either way, but a vendor
    // reading "if a bare HTTP request gets a 403" goes looking for a block that is not there.
    why: 'An agent fetches HTML and submits what it finds. A signup page that answers 200 and builds its form in the browser has nothing in it to fill, which is the same dead end as a refusal and much harder to notice.',
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
          : f.discovered.pricing
            ? {
                points: 0,
                // "Not applicable" says the product has no accounts. A product that publishes
                // prices has accounts, so on those rows the sentence was a claim about the vendor
                // made out of our own failure to find a link. Sixteen of the twenty five rows
                // carrying it publish a pricing page, and three of them link signup straight from
                // the home page: filestack.com, magicbell.com and timekit.io.
                detail: `Unmeasurable: we found no link to an account signup on the pages we read, while you publish prices at ${f.discovered.pricing}, so this is a gap in our reading rather than a finding about you`,
                inconclusive: true,
                unblock: 'Link signup from your home page or your pricing page and this becomes measurable.',
              }
            : {
                points: 0,
                detail: 'Not applicable: nothing on the site links to pricing or to an account signup',
                notApplicable: true,
                unblock: 'A product with no accounts cannot fail this. If yours has them elsewhere, point us at the page.',
              }
      }
      if (!signup.reachable) {
        const seen = signup.consistent ? `${signup.status}` : `${signup.statusesSeen.join(', ')}`
        const tried = signup.statusesSeen.length > 0 ? signup.statusesSeen : [signup.status]
        // The door test settled this in August: a 2xx anywhere in the sequence disproves the
        // sentence that follows it, whatever the last try said. This branch had not learned it,
        // so weglot.com read "answers 403, 403, 200 to an agent ... so nothing gets in from here",
        // a sentence that lists the 200 it is denying.
        const letUsIn = tried.find((status) => status >= 200 && status < 400)
        if (letUsIn !== undefined) {
          return {
            points: 0,
            detail: `Unmeasurable: ${signup.url} answered ${seen} to an agent, so one of our three tries got in and the two refusals are as likely to be our own burst as a rule about agents`,
            inconclusive: true,
            unblock: 'Nothing for you to do. We will rescan later and this becomes measurable.',
          }
        }
        // Our own rule everywhere else: a 429 is us asking too often, never a finding about them.
        // Unless the edge said otherwise in the headers. A challenge served as 429 is a wall an
        // agent cannot climb and a browser climbs without noticing, which is this check's subject
        // rather than an excuse for skipping it.
        if (signup.challenge && tried.every((status) => status === 429)) {
          return yes(
            0,
            `${signup.url} answers ${seen} to an agent, from an edge in challenge mode, so an agent never reaches the form`,
          )
        }
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
      // Names the page, like every other check whose evidence is one document. Without it a vendor
      // reading "your form needs JavaScript" cannot tell which page we read, and this is a page we
      // found by following links and guessing paths, so being wrong about it is a thing that
      // happens: anvil.co's signup was on another host entirely.
      if (signup.rendersFormWithoutJs) return yes(1, `Form renders in server HTML at ${signup.url}`)
      // "Its form needs JavaScript" is a claim about a form, and eight rows of the 9.30 corpus
      // have none: no field anywhere in the HTML and only "Continue with" buttons. The verdict is
      // the same either way, so this changes nothing but what we tell the vendor we saw.
      return signup.identityProviderOnly
        ? yes(
            0,
            `${signup.url} is reachable and carries no signup form of its own: the only way in we can see is an identity provider, which an unattended agent has no way through`,
          )
        : yes(0, `${signup.url} is reachable, but its form needs JavaScript`)
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
      // Named separately in every sentence below, because a count of "documents we read" that
      // silently mixed pages with llms files is how shopify.com came to be told that none of
      // three documentation pages was about keys on a scan that found no documentation page.
      const files = f.machineFilesRead ?? 0
      const alsoFiles = files > 0 ? ` and ${files} machine-readable ${files === 1 ? 'file' : 'files'}` : ''
      // A 404 is our own bad pick, not a refusal. We choose these three pages out of a sitemap or
      // a docs index, so a link that is gone says our selection is stale and says nothing at all
      // about the vendor, and calling it "refused our request" was flatly untrue: mapbox.com's one
      // unread page answers 404. Anything else stays a reason not to conclude, and the sentence
      // now names the status so the vendor can tell an edge rule from our stale link.
      const statuses = f.docsPagesUnreadStatuses ?? []
      const refusals = statuses.filter((status) => status !== 404)
      // Rows scanned before the statuses were recorded have the count and nothing else, and
      // dropping them into "no refusals" would rewrite their verdict on evidence we never held.
      const unread = statuses.length > 0 ? refusals.length : (f.docsPagesUnread ?? 0)
      const why =
        refusals.length > 0
          ? ` (${[...new Set(refusals)].join(', ')}${refusals.includes(429) ? ', and a 429 is our own burst rather than an answer about agents' : ''})`
          : ''
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
            detail: `Unmeasurable: provisioning language found on the pages we read, and ${unread} more we selected did not answer${why}, so how much of it you document is not something this scan measured`,
            inconclusive: true,
            unblock: 'Let ordinary HTTP reach your documentation pages and this becomes measurable.',
          }
        }
        // Naming the phrases is the difference between a rule and a grep nobody can rerun: this
        // is the heaviest check on the card and a vendor could not tell which ones we looked for.
        const named = f.funnel.provisioning.programmatic.map((phrase) => `"${phrase}"`).join(', ')
        return yes(
          found >= 2 ? 2 : 1,
          `${found} of ${PROVISIONING_PATTERN_COUNT} provisioning phrases across the ${pages} documentation ${pages === 1 ? 'page' : 'pages'}${alsoFiles} we read: ${named}`,
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
              ? refusedUs(f) !== null
                ? `Unmeasurable: ${f.site} answered ${refusedUs(f)} when we asked for a page, so there was nothing to look in and that is our reading of your edge rather than a finding about your docs`
                : 'Unmeasurable: we could not read a single documentation page, so there was nothing to look in'
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
          detail: `Unmeasurable: ${unread} documentation ${unread === 1 ? 'page we selected did not answer' : 'pages we selected did not answer'}${why}, so nothing here is a finding about what you document`,
          inconclusive: true,
          unblock: 'Let ordinary HTTP reach your documentation pages and this becomes measurable.',
        }
      }
      // The sentence below is an argument from absence, and an argument from absence is only
      // worth making where the thing would have been. An independent audit of fifteen of these
      // failures on 2026-08-12 found that in nine of them the scan had never opened a single
      // page whose address contains a word about credentials at all: the ranked candidates were
      // service-level-management, delete-account, data-management, two changelog posts. Every one
      // of those rows published "none of the phrases appears" over evidence that could not have
      // carried the phrases, and mongodb.com, grafana.com, sentry.io and upstash.com all document
      // exactly what we said they did not.
      //
      // This is the honest half of the fix and it makes the check measure less. The other half is
      // to go and read the right page, which is a change to selection rather than to scoring.
      const looked = (f.docsPagesReadUrls ?? []).filter((url) => {
        try {
          return CREDENTIAL_PATH.test(new URL(url).pathname)
        } catch {
          return false
        }
      })
      if (looked.length === 0) {
        return {
          points: 0,
          detail: `Unmeasurable: none of the ${pages} documentation pages we reached is about keys or authentication, so their silence about creating one says nothing`,
          inconclusive: true,
          unblock: 'Link your API key or authentication page from your docs index or from llms.txt and this becomes measurable.',
        }
      }
      return yes(
        0,
        `None of the ${PROVISIONING_PATTERN_COUNT} provisioning phrases appears in the ${pages} documentation ${pages === 1 ? 'page' : 'pages'}${alsoFiles} we read, including ${looked.slice(0, 2).join(' and ')}`,
      )
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
      // A page whose free wording is a button and nothing else, wherever it prints its prices.
      // replicate.com prints its rates and says "Try for free" only in the header and the mobile
      // menu, and passing it while sinch.com fails on the same evidence made the rule disagree
      // with itself over whether a nav link is a tier.
      const chrome = f.funnel.provisioning.selfServeSignals
      // Decided on the words in context rather than on which pattern matched: june.so's page is
      // one unpriced plan and a "Start free trial" button, and `free trial` is a statement
      // pattern, so no list of button phrases could catch it without catching every real trial.
      const onlyChrome = chrome.length > 0 && f.funnel.provisioning.selfServeIsButtonOnly === true
      // A question the page asks is not an answer it gives. savvycal.com's only free-tier wording
      // is "Do you offer a free trial?" and xata.io's is "Is there a free tier?", and on both the
      // accordion ships collapsed, so the HTML carries the question with no answer anywhere in it.
      const onlyAsked = chrome.length > 0 ? (f.funnel.provisioning.selfServeOnlyAsked ?? null) : null
      if (f.funnel.provisioning.selfServeSignals.length > 0 && !onlyChrome && !onlyAsked) {
        // Saying it once out of two tries still means you say it, and hiding the disagreement
        // would leave a vendor unable to explain why the number moved between two scans.
        // Quoted, because "free tier or no-card signals" is a claim a vendor cannot check against
        // their own page, and the words we found are.
        const quotes = f.funnel.provisioning.selfServeQuotes ?? []
        const said = quotes.length > 0 ? `: ${quotes.map((quote) => `"${quote}"`).join(', ')}` : ''
        return yes(
          1,
          f.funnel.pricingTriesDisagreed
            ? `Free tier or no-card signals${at}${said}, present in one of the two fetches of that page`
            : `Free tier or no-card signals${at}${said}`,
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
      // Only claims the wording exists when it does. `[].every()` is true, so a page with no free
      // wording at all took this branch and was told its only free wording was a button:
      // anvil.co and radar.com contain the word "free" zero times.
      if (onlyChrome) {
        return yes(
          0,
          `${page ?? 'Your pricing page'} carries a "start for free" style link and nothing else about a free tier, so what we found is a button rather than a stated price`,
        )
      }
      // Quotes the question, because "we found only a question" is a claim the vendor can check
      // against their own page in one search, and a paraphrase is not.
      if (onlyAsked) {
        return {
          points: 0,
          detail: `The only free-tier wording at ${page} is a question the page asks, "${onlyAsked.trim()}", and the answer to it is not in the HTML we were served`,
          unblock: 'Serve the answer to that question in the HTML, or state the tier in the pricing table, and this becomes a pass.',
        }
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
          unblock:
            'Name your package once in your docs, or link it from your repository, and we stop guessing. If your product is not something a developer installs, this check does not apply to you: unmeasured is out of the score and out of the denominator, so it costs you nothing.',
        }
      }
      // Whether the name is the vendor's claim or our guess. Measured 2026-08-11: all ten rows
      // that fail this check rest on a registry search and not one on a package named anywhere
      // on the vendor's own pages, and the guess is demonstrably the wrong artefact on several
      // of them. directus.com is scored on `directus`, the server, while the SDK a developer
      // installs is the typed `@directus/sdk`; xata.io on `@xata.io/api` while its SDK is the
      // typed `@xata.io/client`; namecheap.com on `node-vault-client`, which is a HashiCorp
      // Vault client. The verdict stands, because a publisher match is real evidence and we
      // cannot tell a wrong guess from a genuinely untyped package by its name. What cannot
      // stand is saying it in a sentence that reads as though the vendor had pointed us there.
      // Withholding the point when the name did not look like an SDK cost chromadb and
      // @amplitude/analytics-browser, both of which are exactly the package a developer
      // installs. A name is too crude a classifier for that, so the point stands and the
      // sentence says what the match rests on instead of overstating it.
      //
      // On every sentence and not only the pass, because the negative ones need it more.
      // Measured 2026-08-11: all ten rows that fail this check rest on a registry search and not
      // one on a package named anywhere on the pages we read, and on several the guess is the
      // wrong artefact. directus.com is scored on `directus`, the server, while the SDK a
      // developer installs is the typed `@directus/sdk`; xata.io on `@xata.io/api` while its SDK
      // is the typed `@xata.io/client`; namecheap.com on `node-vault-client`, a HashiCorp Vault
      // client. The verdict stands, because a publisher match is real evidence and nothing in
      // the name separates a wrong guess from a genuinely untyped package. What cannot stand is
      // a sentence that reads as though the vendor had pointed us at it.
      const basis =
        f.discovered.npmSource !== 'registry-search'
          ? ''
          : ', matched from the registry by who publishes it rather than by a link on your site'
      if (!f.npm.found) return yes(0, `Package ${f.npm.package} not found on the registry${basis}`)
      if (!f.npm.bundledTypes) return yes(0, `${f.npm.package} ships without bundled types${basis}`)
      const stale = f.npm.staleMonths
      if (stale !== undefined && stale >= 24) {
        // What we measure is the registry record's Last-Modified, which any metadata write moves,
        // so it is a floor on the age and not the publish date. june.so read as 28 months where
        // the newest version is 35.6 months old, and the sentence claimed the smaller number.
        return yes(0, `${f.npm.package} is typed, and its registry record has not changed in ${stale} months${basis}`)
      }
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
      // Named in full, because the host is the finding: we asked the site for years and never the
      // place the docs live, which is where three of the corpus's specs actually answer.
      if (f.machine.openapiOnDocsHost) return yes(1, `OpenAPI at ${f.machine.openapiOnDocsHost}, on your documentation host`)
      const declared = f.machine.openapiDeclared
      // Naming the relation matters: it is the difference between us guessing a path and the
      // vendor telling us, and it is what another vendor copies to get the same point.
      if (declared) return yes(1, `OpenAPI at ${declared.url}, which your docs page declares with rel="${declared.rel}"`)
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
      // A page that would not answer cannot be a page that declares nothing. The check next
      // door has said so about a 429 since August and this one had no such guard, so on the
      // same scan postmarkapp.com read "a 429 is our own burst rather than an answer about
      // agents" beside "none declared by postmarkapp.com/developer". By hand, at that moment, it
      // was serving `link: </swagger/server.yml>; rel="service-desc"` and the spec answered 200.
      const docsStatus = f.machine.markdownNegotiation.docsStatus
      if (docsStatus !== undefined && (docsStatus === 0 || docsStatus >= 400)) {
        return {
          points: 0,
          detail: `Unmeasurable: ${f.discovered.docs ?? f.site} answered ${docsStatus === 0 ? 'nothing' : docsStatus} when we asked it for markdown${docsStatus === 429 ? ', and a 429 is our own burst rather than an answer about you' : ''}, so what it declares about your API is not something this scan read`,
          inconclusive: true,
          unblock: 'Nothing for you to do if this was a 429. We will rescan later and this becomes measurable.',
        }
      }
      // "Not found on your domain" is what we measured. "Does not exist" is not, and the
      // difference is the whole reason we now read what the page says about itself: porkbun.com
      // published a spec at a path nobody would guess and we called it absent.
      return {
        points: 0,
        detail: `No OpenAPI spec at the ${OPENAPI_PATHS.length} usual paths${onAnotherHost(f.discovered.docs, f.site) ? ' on your site or on your documentation host' : ''}, none declared by ${f.discovered.docs ?? f.site}, and no markdown negotiation`,
        unblock: 'Point at your spec from your docs page with rel="service-desc" and an agent finds it without guessing.',
      }
    },
  },
]

/** Whether the docs live somewhere the site's own paths were not already asked. */
function onAnotherHost(docs: string | null | undefined, site: string): boolean {
  if (!docs) return false
  try {
    return new URL(docs).origin !== site
  } catch {
    return false
  }
}

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
  const signup = report.findings.funnel.signup
  // A page with no form at all is not a form that needs JavaScript, and the landing page counts
  // this number in exactly those words.
  return signup.reachable && !signup.rendersFormWithoutJs && signup.identityProviderOnly !== true
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
