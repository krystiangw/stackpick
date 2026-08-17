import { MongoClient } from 'mongodb'
import { CURATED_DOMAINS } from '../src/lib/categories'

/**
 * What moves between the two passes of one reseed, and in which direction.
 *
 * Written to be a free noise-floor measurement and measured out of that job on the first run. A
 * reseed's two passes differ in more than time: the first asks npm cold and the second finds the
 * answers cached, so both pairs available on 2026-08-15 moved **one way only** (9.16: 21 up, 1
 * down, sixteen of them typed_package; 9.14: 2 up, 0 down). One-directional movement is a
 * systematic effect, not noise, and quoting either percentage as a noise floor would overstate how
 * unstable the scanner is.
 *
 * So this is a detector of systematic effects between passes, and the published NOISE_FLOOR_PERCENT
 * stays where a dedicated measurement put it. A real noise floor needs two passes with the same
 * cache state on both sides, which a two-pass reseed cannot give.
 *
 * The published figure on /methodology is dated 12 August and was measured on formula 9.8. The
 * scanner has since moved through nine rule changes, so quoting it as current would be quoting a
 * measurement of a different scanner.
 *
 * Not a duplicate of `diff-corpus`, which answers a different question and needs a snapshot saved
 * before the change: that one asks whether a rule change did what it was predicted to do. This one
 * asks how much moves when nothing changed at all, and it needs nothing saved in advance, because
 * the pair it reads is a by-product every reseed already leaves in the database.
 *
 *   MONGODB_URI=$(heroku config:get MONGODB_URI -a stackpick) npx tsx scripts/noise-floor.mts 9.16
 */
const wanted = process.argv[2]
if (!wanted) {
  console.log('podaj wersje formuly, np. npx tsx scripts/noise-floor.mts 9.16')
  process.exit(0)
}

const client = new MongoClient(process.env.MONGODB_URI!)
await client.connect()
const reports = client
  .db(process.env.MONGODB_DB ?? 'stackpick')
  .collection('reports')

/**
 * Two scans of one reseed sit twenty to forty minutes apart; two reseeds sit hours apart, because
 * the cooldown is six. So a gap this size separates one sweep from the next, and the last scan of
 * each sweep is its WARM one.
 *
 * This is the fix that makes the whole exercise mean anything. Taking the two newest scans, which
 * is what this script did until 2026-08-17, pairs the cold and warm passes of the same reseed even
 * when a second reseed exists, and that pair is the confound the script itself warns about at the
 * bottom. The window we froze the formula for would have measured the npm cache again.
 */
const SWEEP_GAP_MS = 90 * 60 * 1000

type Card = { scorecard: { checks: { id: string; points: number }[] }; scannedAt: string }

/** The warm scan of each sweep, newest sweep first. */
function warmPerSweep(rows: Card[]): Card[] {
  const warm: Card[] = []
  let previous: number | null = null
  for (const row of rows) {
    const at = Date.parse(row.scannedAt)
    if (previous === null || previous - at > SWEEP_GAP_MS) warm.push(row)
    previous = at
  }
  return warm
}

const warmPair = process.argv[3] !== 'adjacent'

let pairs = 0
let verdicts = 0
let moved = 0
let up = 0
const byCheck = new Map<string, number>()

for (const domain of CURATED_DOMAINS) {
  const rows = (await reports
    .find({ domain, seeded: true, 'scorecard.formulaVersion': wanted }, { sort: { scannedAt: -1 }, limit: 8 })
    .toArray()) as unknown as Card[]
  const chosen = warmPair ? warmPerSweep(rows) : rows.slice(0, 2)
  if (chosen.length < 2) continue
  pairs += 1
  const [after, before] = chosen
  for (const check of after.scorecard.checks) {
    const was = before.scorecard.checks.find((c) => c.id === check.id)
    if (!was) continue
    verdicts += 1
    if (was.points !== check.points) {
      moved += 1
      if (check.points > was.points) up += 1
      byCheck.set(check.id, (byCheck.get(check.id) ?? 0) + 1)
      console.log(`${domain.padEnd(20)} ${check.id.padEnd(26)} ${was.points} -> ${check.points}`)
    }
  }
}

if (pairs === 0) {
  console.log(
    warmPair
      ? `brak domen z dwoma PRZEMIATANIAMI na formule ${wanted}. Para cieply-cieply wymaga dwoch reseedow tej samej wersji;\nzeby zobaczyc pare z jednego przebiegu, dodaj argument: npx tsx scripts/noise-floor.mts ${wanted} adjacent`
      : `brak domen z dwoma skanami na formule ${wanted}: nie ma czego porownac`,
  )
  await client.close()
  process.exit(0)
}
console.log(
  `\n${pairs} domen z para ${warmPair ? 'CIEPLY-CIEPLY (ostatni skan kazdego z dwoch przemiatan)' : 'sasiednich skanow'} na formule ${wanted}, ${verdicts} porownanych werdyktow`,
)
console.log(`${moved} ruszylo bez zmiany regul = ${((moved / verdicts) * 100).toFixed(2)} procent`)
for (const [id, n] of [...byCheck].sort((a, b) => b[1] - a[1])) console.log(`  ${id}: ${n}`)

// Direction is what separates noise from a warming cache, and reading the percentage without it
// is how 0.86 gets quoted as a noise floor. Random noise is roughly symmetric; the 9.16 pair moved
// 21 verdicts up and 1 down, because a reseed's first pass asks npm cold, npm refuses, and about
// two dozen domains lose their package until the second pass finds it in the warm cache.
if (moved > 0) {
  const down = moved - up
  console.log(`\nkierunek: ${up} w gore, ${down} w dol`)
  const lopsided = up === 0 || down === 0 || Math.max(up, down) / Math.min(up, down) >= 4
  console.log(
    lopsided
      ? 'JEDNOKIERUNKOWE: to nie jest szum, tylko efekt systematyczny (najczesciej zimny cache npm\n' +
          'w pierwszym przebiegu). Podlogi szumu szukaj w parze CIEPLY-CIEPLY, czyli po reseedzie,\n' +
          'ktory sam nastapil po innym reseedzie tego samego dnia.'
      : 'symetryczne, wiec to wyglada na prawdziwy szum pomiaru',
  )
}
await client.close()
process.exit(0)
