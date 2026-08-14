import { CHECKS } from '../src/lib/score'
import { SITE_URL } from '../src/lib/site'
/**
 * A scorecard has to hold together when read line by line, and it did not: rows claimed every
 * request had been refused while their neighbours quoted the pages we had just fetched. This
 * reads the published corpus and looks for a row disagreeing with itself. It is a QA instrument,
 * not a check: anything it prints is a bug in the scanner or in a verdict sentence.
 */
type Check = { id: string; verdict: string; points: number; max: number; detail: string }
type Row = { domain: string; total: number; measurable: number; max: number; unattendedGrant: boolean | null; refusesAgentsAtSignup: boolean; checks: Check[] }

const url = process.argv[2] ?? `${SITE_URL}/corpus.json`

/**
 * Retried, because this now runs the moment a reseed ends and the dyno is at its busiest: the
 * first automatic run came back empty and the script died on JSON.parse with a stack trace,
 * which is how a guard teaches people to ignore it. An unreadable corpus is a failure to measure,
 * and it says so in one line instead of pretending the numbers are wrong.
 */
async function readCorpus(attempt = 1): Promise<{ formulaVersion: string; rows: Row[] }> {
  try {
    // Named so the visit counter can leave our own monitoring out of our own numbers.
    const res = await fetch(url, { headers: { 'user-agent': 'letagentsin-audit/1.0' } })
    const body = await res.text()
    if (!res.ok || body.trim().length === 0) throw new Error(`${res.status}, ${body.length} bytes`)
    return JSON.parse(body) as { formulaVersion: string; rows: Row[] }
  } catch (error) {
    if (attempt >= 3) {
      console.error(`could not read ${url} after ${attempt} tries: ${(error as Error).message}`)
      console.error('nothing was checked. This is a failure to measure, not a drift in the numbers.')
      process.exit(2)
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 5000))
    return readCorpus(attempt + 1)
  }
}

const corpus = await readCorpus()

const REFUSAL = /every request was refused|edge refused our requests|nothing we requested got through/i
// "only 0 documentation pages could be read" is a denial, not evidence, so the counts have to
// be non-zero for a sentence to prove we read anything.
const READ_SOMETHING = /[1-9][\d,]* characters|[1-9][\d,]* documentation pages|pages we read|Found: |present\b|at https?:\/\//i
const NO_SIGNUP = /nothing on the site links to an account signup|nothing on the site links to pricing/i
/** Checks whose evidence is one page, so a pass has to say which one. */
const URL_BACKED = new Set(['machine_readable_api', 'mcp_present', 'agent_entry_point', 'signup_reachable'])

let bad = 0
for (const row of corpus.rows) {
  const say = (why: string) => {
    bad++
    console.log(`${row.domain}: ${why}`)
  }

  const counted = row.checks.filter((c) => c.verdict !== 'unmeasured' && c.verdict !== 'notApplicable')
  const sum = counted.reduce((total, c) => total + c.points, 0)
  if (sum !== row.total) say(`total says ${row.total}, counted checks add to ${sum}`)
  const excluded = row.checks
    .filter((c) => c.verdict === 'unmeasured' || c.verdict === 'notApplicable')
    .reduce((total, c) => total + c.max, 0)
  if (row.max - row.measurable !== excluded) {
    say(`max minus measurable is ${row.max - row.measurable}, excluded checks are worth ${excluded}`)
  }

  const refusing = row.checks.filter((c) => REFUSAL.test(c.detail))
  const reading = row.checks.filter((c) => READ_SOMETHING.test(c.detail))
  if (refusing.length > 0 && reading.length > 0) {
    say(`${refusing[0].id} says nothing got through while ${reading[0].id} quotes what it read: "${reading[0].detail.slice(0, 70)}"`)
  }

  const denies = row.checks.filter((c) => NO_SIGNUP.test(c.detail))
  // Citing a signup means naming a page, so the guard wants a URL and not just the word. Without
  // that it fired on quilljs.com because the MCP sentence says "a path nobody registered", which
  // is a guard reporting its own vocabulary rather than a row disagreeing with itself.
  const cites = row.checks.find(
    (c) => /https?:\/\/\S*(?:signup|sign[- ]?up|register)/i.test(c.detail) && !NO_SIGNUP.test(c.detail),
  )
  if (denies.length > 0 && cites) say(`${denies[0].id} says nothing links to signup while ${cites.id} cites one`)

  // A pass on one of these is a claim about one specific page, and the page it is true of is
  // usually not the one a vendor would try: ckeditor.com/docs/ answers HTML while the page two
  // levels under it answers markdown. A verdict that cannot be reproduced from its own sentence
  // is indistinguishable from one we invented.
  for (const check of row.checks.filter((c) => URL_BACKED.has(c.id) && c.verdict === 'pass')) {
    if (!/https?:\/\/\S+/.test(check.detail)) say(`${check.id} passes without naming the page it passed on: "${check.detail}"`)
  }
}

console.log(`\n${corpus.rows.length} rows on formula ${corpus.formulaVersion}, ${bad} contradiction${bad === 1 ? '' : 's'}`)

/**
 * The other half of the same job: a page that states a number the data has moved past. Every
 * corpus figure on the site is supposed to be computed, and this proves it rather than trusting
 * it, because the recurring bug of this project is prose written under an older dataset.
 */
const origin = new URL(url).origin
const pageText = async (path: string) =>
  (await (await fetch(`${origin}${path}`, { headers: { 'user-agent': 'letagentsin-audit/1.0' } })).text())
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')

/** Recomputed from the published rows, so a sentence can only pass by matching the data. */
const verdictOf = (row: Row, id: string) => row.checks.find((check) => check.id === id)
const needsJavaScript = corpus.rows.filter((row) => {
  const signup = verdictOf(row, 'signup_reachable')
  return signup?.verdict === 'fail' && /JavaScript/i.test(signup.detail)
}).length
const mcpWithoutKeys = corpus.rows.filter((row) => {
  const mcp = verdictOf(row, 'mcp_present')
  const provisioning = verdictOf(row, 'programmatic_provisioning')
  return mcp?.verdict === 'pass' && provisioning?.verdict === 'fail'
}).length

const liveMcp = corpus.rows.filter((row) => verdictOf(row, 'mcp_present')?.verdict === 'pass')
const registration = (rows: Row[]) => rows.filter((row) => verdictOf(row, 'oauth_dcr')?.verdict === 'pass').length
const withoutMcp = corpus.rows.filter((row) => verdictOf(row, 'mcp_present')?.verdict !== 'pass')

/**
 * The conjunction the findings page reports, recomputed here from the rows so the two can only
 * agree. Three legs rather than a threshold on the score, because an unmeasurable check leaves
 * the denominator and a threshold would therefore reward being unreadable.
 */
const legsMet = (row: Row) => {
  const at = (id: string) => row.checks.find((check) => check.id === id)
  const full = (id: string) => {
    const check = at(id)
    return check !== undefined && check.points === check.max
  }
  // Tri-state on purpose: an unmeasured leg is unknown, never failed. Counting it as a failure
  // publishes a named vendor as missing a requirement we never reached.
  const measured = (id: string) => {
    const verdict = at(id)?.verdict
    return verdict !== undefined && verdict !== 'unmeasured' && verdict !== 'notApplicable'
  }
  return [
    { met: full('agent_entry_point') || full('oauth_dcr') || full('mcp_present'),
      known: measured('agent_entry_point') || measured('oauth_dcr') || measured('mcp_present') },
    { met: full('signup_reachable') && full('signup_no_captcha'),
      // A form we could not reach is a failed leg; the CAPTCHA is unmeasured because of that
      // failure, not independently of it.
      known: measured('signup_reachable') && (!full('signup_reachable') || measured('signup_no_captcha')) },
    { met: (at('programmatic_provisioning')?.points ?? 0) >= 1, known: measured('programmatic_provisioning') },
  ]
}
const usable = corpus.rows.filter((row) => legsMet(row).every((leg) => leg.known && leg.met)).length
const oneAway = corpus.rows.filter((row) => {
  const legs = legsMet(row)
  return legs.every((leg) => leg.known) && legs.filter((leg) => !leg.met).length === 1
}).length

// Two sentences describe a file with dead entries now that one dead link no longer costs the
// point: the failing one ends "are gone, starting with", the passing one "One is gone:". The
// guard read only the first and reported the page as adrift while the page was right, which is
// the failure mode that teaches you to stop believing the guard.
const staleLlms = corpus.rows.filter((row) =>
  /links we sampled[^.]*are gone|One is gone:/.test(row.checks.find((check) => check.id === 'llms_txt')?.detail ?? ''),
).length
const cloaked = corpus.rows.filter((row) =>
  /percent less text/.test(row.checks.find((check) => check.id === 'docs_without_js')?.detail ?? ''),
).length

// Published on 2026-08-10 and unguarded until the audit was asked how many numbers the site
// states against how many it watches. A number nobody checks is a number that drifts.
// Everyone whose oauth_dcr passes, which is what "publishing a registration endpoint" means.
// Counting `unattendedGrant !== null` instead was two short: bitmovin.com and calendly.com
// publish the endpoint and no grant_types_supported at all, and the sentence still covers them.
const withRegistration = corpus.rows.filter((row) => {
  const check = row.checks.find((c) => c.id === 'oauth_dcr')
  return check !== undefined && check.points === check.max
}).length
// The sentence says "of the vendors publishing a registration endpoint, only N advertise a grant",
// so N is the intersection and not everyone with a grant recorded. Counting them separately made
// the guard cry drift at a page that was right: launchdarkly.com kept `unattendedGrant` from a
// scan whose oauth_dcr then timed out, so it was in one count and out of the other.
const unattendedGrant = corpus.rows.filter((row) => {
  const check = row.checks.find((c) => c.id === 'oauth_dcr')
  return row.unattendedGrant === true && check !== undefined && check.points === check.max
}).length

// Currently zero, which is exactly why it needs a guard: a number nobody watches can stop being
// zero on one side without the other noticing. The sentence and the data have to move together.
// Read off the published field rather than a sentence. Matching prose was a proxy for a
// computation that reads browserStatus, which corpus.json did not carry, so on 2026-08-11 the
// guard reported a drift that was only the two sides measuring different things.
const signupRefusals = corpus.rows.filter((row) => row.refusesAgentsAtSignup).length

// The landing page quotes the agent runs as two hardcoded figures while the audit pages compute
// theirs from the same files. Verified by hand on 2026-08-14 and correct, which is exactly when a
// number is worth guarding: a fifth audit would silently make both of them false.
const auditFiles = await Promise.all([
  import('../src/data/audits/froala-editors.json', { with: { type: 'json' } }),
  import('../src/data/audits/paddle-payments.json', { with: { type: 'json' } }),
  import('../src/data/audits/uploadcare-storage.json', { with: { type: 'json' } }),
  import('../src/data/audits/workos-auth.json', { with: { type: 'json' } }),
])
/** Only the field this guard reads. The four files have four inferred shapes and no common one. */
type AuditRun = { blockedBy?: string | null }
const auditRunsNeedingAnAccount = auditFiles
  .flatMap((file) => file.default.runs as AuditRun[])
  .filter((run) => Boolean(run.blockedBy)).length
const auditRuns = (await import('../src/data/audits/froala-editors.json', { with: { type: 'json' } })).default.runs.length +
  (await import('../src/data/audits/paddle-payments.json', { with: { type: 'json' } })).default.runs.length +
  (await import('../src/data/audits/uploadcare-storage.json', { with: { type: 'json' } })).default.runs.length +
  (await import('../src/data/audits/workos-auth.json', { with: { type: 'json' } })).default.runs.length

const stated: { page: string; pattern: RegExp; expected: number; what: string }[] = [
  {
    // Hand-written and static, which is why it drifted: it said 14 checks against 15 and
    // thirty-four runs against thirty-eight, in the file an agent reads before anything else.
    page: '/llms.txt',
    pattern: /(\d+) deterministic checks/,
    expected: CHECKS.length,
    what: 'checks stated in llms.txt',
  },
  {
    // Anchored on the claim itself. A bare "N / 18" would match any score on the page.
    page: '/',
    pattern: /(\d+)\s*\/\s*\d+\s+\d+\s*\/\s*\d+\s+Every run shipped an integration/,
    expected: auditRuns,
    what: 'agent runs behind the landing page figure',
  },
  {
    page: '/',
    pattern: /\d+\s*\/\s*\d+\s+\d+\s*\/\s*(\d+)\s+Every run shipped an integration/,
    expected: auditRunsNeedingAnAccount,
    what: 'runs that needed a credential nobody could get',
  },

  {
    page: '/findings',
    pattern: /signup\s+form is rare:\s*(\d+)\s+vendors do it/,
    expected: signupRefusals,
    what: 'signups that refuse an agent while serving a browser',
  },
  {
    page: '/findings',
    pattern: /Of the\s+(\d+)\s+vendors publishing a registration/,
    expected: withRegistration,
    what: 'vendors publishing a registration endpoint',
  },
  {
    page: '/findings',
    pattern: /endpoint, only\s+(\d+)\s+advertise a grant/,
    expected: unattendedGrant,
    what: 'grants an unattended agent can finish',
  },
  {
    page: '/findings',
    pattern: /(\d+) of \d+ llms.txt files point at pages that are gone/,
    expected: staleLlms,
    what: 'llms.txt files with dead links',
  },
  {
    page: '/findings',
    pattern: /(\d+) of \d+ vendors serve an agent user-agent measurably less text/,
    expected: cloaked,
    what: 'vendors cloaking against agents',
  },
  {
    page: '/findings',
    pattern: /(\d+) of \d+ vendors clear all three barriers we can measure/,
    expected: usable,
    what: 'vendors meeting all three legs',
  },
  {
    page: '/findings',
    pattern: /and (\d+) are one requirement away/,
    expected: oneAway,
    what: 'vendors one requirement away',
  },
  {
    page: '/findings',
    pattern: /(\d+) of the \d+ vendors running a live MCP server/,
    expected: registration(liveMcp),
    what: 'MCP servers that also publish client registration',
  },
  {
    page: '/findings',
    pattern: /of the (\d+) vendors running a live MCP server/,
    expected: liveMcp.length,
    what: 'live MCP servers',
  },
  {
    page: '/findings',
    pattern: /Outside that group it is (\d+) of/,
    expected: registration(withoutMcp),
    what: 'client registration without an MCP server',
  },
  {
    page: '/findings',
    pattern: /Outside that group it is \d+ of\s*(\d+)/,
    expected: withoutMcp.length,
    what: 'vendors without an MCP server',
  },
  { page: '/report', pattern: /(\d+) domains · formula/, expected: corpus.rows.length, what: 'corpus size' },
  { page: '/findings', pattern: /it now covers (\d+) vendors/, expected: corpus.rows.length, what: 'corpus size' },
  {
    page: '/',
    // "we have scanned" became "we can compare today" when the hero learned to say that the
    // published set is not the whole corpus during a reseed. Anchored on the count and the noun,
    // which are the parts that carry the claim.
    pattern: /Of (\d+) vendors we can compare/,
    expected: corpus.rows.length,
    what: 'corpus size in the hero',
  },
  {
    page: '/',
    pattern: /(\d+) serve a signup form\s+that renders nothing without JavaScript/,
    expected: needsJavaScript,
    what: 'signup forms needing JavaScript',
  },
  {
    page: '/findings',
    // Matched "N more serve a form..." until the sentence was rewritten on 2026-08-11, and then
    // silently checked nothing. Anchored on the words least likely to move.
    pattern: /(\d+) serve a form that renders\s+nothing without JavaScript/,
    expected: needsJavaScript,
    what: 'signup forms needing JavaScript',
  },
  {
    page: '/findings',
    pattern: /(\d+) of them run an MCP server and document/,
    expected: mcpWithoutKeys,
    what: 'MCP servers with no documented key',
  },
]

/**
 * The half of a page a number guard cannot see: sentences that name a company. They drift the
 * same way numbers do and more quietly, because nothing recomputes them. contentful.com was
 * published as clearing all three barriers for a week after a rate-limited scan took it off the
 * computed list two paragraphs above, and every number on that page was correct throughout.
 */
const held = new Map(corpus.rows.map((row) => [row.domain, row]))
const named: { page: string; pattern: RegExp; holds: (found: RegExpMatchArray) => string | null; what: string }[] = [
  {
    page: '/findings',
    pattern: /(\S+) and (\S+) publish the same shaped door, and only (\S+) offers client_credentials/,
    what: 'the two registrars',
    holds: (found) => {
      const [, first, second, opens] = found
      const shut = first === opens ? second : first
      if (held.get(opens)?.unattendedGrant !== true) return `${opens} no longer advertises an unattended grant`
      if (held.get(shut)?.unattendedGrant !== false) return `${shut} is no longer the one that stays shut`
      return null
    },
  },
  {
    page: '/findings',
    // Domain tokens rather than "up to the full stop": every name in the list contains one.
    pattern: /The vendors that meet all three today:\s*((?:[a-z0-9-]+\.[a-z]{2,}(?:,\s*)?)+)/,
    what: 'the all-three list',
    holds: (found) => {
      const listed = found[1].split(/,\s*/).map((domain) => domain.trim())
      const computed = corpus.rows.filter((row) => legsMet(row).every((leg) => leg.known && leg.met)).map((row) => row.domain)
      const missing = computed.filter((domain) => !listed.includes(domain))
      const extra = listed.filter((domain) => !computed.includes(domain))
      if (missing.length > 0 || extra.length > 0) {
        return `names ${extra.join(', ') || 'nobody'} that the data does not, and omits ${missing.join(', ') || 'nobody'}`
      }
      return null
    },
  },
  {
    page: '/findings',
    pattern: /(\S+) (?:is|are) on this list and gates? signup with an hCaptcha/,
    what: 'the late-CAPTCHA example',
    holds: (found) => {
      const computed = corpus.rows.filter((row) => legsMet(row).every((leg) => leg.known && leg.met)).map((row) => row.domain)
      const listed = found[1].split(/\s+and\s+/).map((domain) => domain.trim())
      const off = listed.filter((domain) => !computed.includes(domain))
      return off.length > 0 ? `names ${off.join(', ')}, which no longer clears all three` : null
    },
  },
]

let drift = 0
for (const claim of named) {
  const page = await pageText(claim.page)
  const found = page.match(claim.pattern)
  // A sentence that renders only while it is true is allowed to be absent. The others are not.
  if (!found) {
    if (claim.what !== 'the late-CAPTCHA example') {
      drift++
      console.log(`${claim.page}: could not find ${claim.what} at all`)
    }
    continue
  }
  const wrong = claim.holds(found)
  if (wrong) {
    drift++
    console.log(`${claim.page}: ${claim.what} ${wrong}`)
  }
}

for (const claim of stated) {
  const found = (await pageText(claim.page)).match(claim.pattern)
  if (!found) {
    drift++
    console.log(`${claim.page}: could not find the ${claim.what} sentence at all`)
  } else if (Number(found[1]) !== claim.expected) {
    drift++
    console.log(`${claim.page}: says ${found[1]} for ${claim.what}, data says ${claim.expected}`)
  }
}
console.log(`${stated.length} stated numbers and ${named.length} named-vendor claims checked against the data, ${drift} adrift`)
process.exit(bad === 0 && drift === 0 ? 0 : 1)
