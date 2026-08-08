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

const stated: { page: string; pattern: RegExp; expected: number; what: string }[] = [
  { page: '/report', pattern: /(\d+) domains · formula/, expected: corpus.rows.length, what: 'corpus size' },
  { page: '/findings', pattern: /it now covers (\d+) vendors/, expected: corpus.rows.length, what: 'corpus size' },
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
