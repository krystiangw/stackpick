/**
 * A scorecard has to hold together when read line by line, and it did not: rows claimed every
 * request had been refused while their neighbours quoted the pages we had just fetched. This
 * reads the published corpus and looks for a row disagreeing with itself. It is a QA instrument,
 * not a check: anything it prints is a bug in the scanner or in a verdict sentence.
 */
type Check = { id: string; verdict: string; points: number; max: number; detail: string }
type Row = { domain: string; total: number; measurable: number; max: number; checks: Check[] }

const url = process.argv[2] ?? 'https://stackpick-f12d13a227ea.herokuapp.com/corpus.json'
const corpus = (await (await fetch(url)).json()) as { formulaVersion: string; rows: Row[] }

const REFUSAL = /every request was refused|edge refused our requests|nothing we requested got through/i
// "only 0 documentation pages could be read" is a denial, not evidence, so the counts have to
// be non-zero for a sentence to prove we read anything.
const READ_SOMETHING = /[1-9][\d,]* characters|[1-9][\d,]* documentation pages|pages we read|Found: |present\b|at https?:\/\//i
const NO_SIGNUP = /nothing on the site links to an account signup|nothing on the site links to pricing/i
/** Checks whose evidence is one page, so a pass has to say which one. */
const URL_BACKED = new Set(['machine_readable_api', 'mcp_present', 'agent_entry_point'])

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
  const cites = row.checks.find((c) => /signup|register|sign[- ]?up/i.test(c.detail) && !NO_SIGNUP.test(c.detail))
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
  (await (await fetch(`${origin}${path}`)).text())
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
      known: measured('signup_reachable') && measured('signup_no_captcha') },
    { met: (at('programmatic_provisioning')?.points ?? 0) >= 1, known: measured('programmatic_provisioning') },
  ]
}
const usable = corpus.rows.filter((row) => legsMet(row).every((leg) => leg.known && leg.met)).length
const oneAway = corpus.rows.filter((row) => {
  const legs = legsMet(row)
  return legs.every((leg) => leg.known) && legs.filter((leg) => !leg.met).length === 1
}).length

const stated: { page: string; pattern: RegExp; expected: number; what: string }[] = [
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
    pattern: /Of (\d+) vendors we have scanned/,
    expected: corpus.rows.length,
    what: 'corpus size in the hero',
  },
  {
    page: '/',
    pattern: /vendors we have scanned, (\d+) serve a signup form/,
    expected: needsJavaScript,
    what: 'signup forms needing JavaScript',
  },
  {
    page: '/findings',
    pattern: /(\d+) more serve a form that renders nothing without JavaScript/,
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

let drift = 0
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
console.log(`${stated.length} stated numbers checked against the data, ${drift} adrift`)
process.exit(bad === 0 && drift === 0 ? 0 : 1)
