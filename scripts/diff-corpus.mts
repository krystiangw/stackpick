/**
 * What one formula version did to the corpus, verdict by verdict.
 *
 * Every reseed so far was judged by a single percentage, and a percentage cannot tell a rule
 * doing what it was measured to do from a rule doing that plus something nobody looked at. Round
 * 108 found a bad widening only because eight verdicts had all moved upward and somebody read
 * them; the number itself looked like progress.
 *
 * So this takes the prediction as an argument. Rows named in it are expected to move and are
 * reported quietly; anything else that moved is printed as a surprise, which is the only part
 * worth a person's attention.
 *
 *   pnpm diff-corpus <before.json> [after.json|url] [--expect neon.com:agent_entry_point,...]
 *
 * With no second argument it reads the published corpus. Save a copy before every reseed:
 *   curl -s https://<host>/corpus.json > before.json
 */
import { readFileSync } from 'node:fs'
import { SITE_URL } from '../src/lib/site'

type Check = { id: string; verdict: string; points: number; detail: string }
type Row = { domain: string; total: number; checks: Check[] }
type Corpus = { formulaVersion: string; rows: Row[] }

const args = process.argv.slice(2)
const expectAt = args.indexOf('--expect')
const expected = new Set(
  (expectAt === -1 ? '' : (args[expectAt + 1] ?? ''))
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean),
)
const [beforePath, afterPath] = args.filter((arg, index) => index !== expectAt && index !== expectAt + 1)

async function read(source: string | undefined): Promise<Corpus> {
  if (!source || source.startsWith('http')) {
    const res = await fetch(source ?? `${SITE_URL}/corpus.json`, { headers: { 'user-agent': 'letagentsin-audit/1.0' } })
    return JSON.parse(await res.text()) as Corpus
  }
  return JSON.parse(readFileSync(source, 'utf8')) as Corpus
}

if (!beforePath) {
  console.error('usage: pnpm diff-corpus <before.json> [after.json|url] [--expect domain:check,...]')
  process.exit(2)
}

const before = await read(beforePath)
const after = await read(afterPath)
const afterRows = new Map(after.rows.map((row) => [row.domain, row]))

type Move = { domain: string; check: string; from: string; to: string; points: number; detail: string }
const moves: Move[] = []
let compared = 0
const missing: string[] = []

for (const row of before.rows) {
  const now = afterRows.get(row.domain)
  if (!now) {
    missing.push(row.domain)
    continue
  }
  const nowChecks = new Map(now.checks.map((check) => [check.id, check]))
  for (const check of row.checks) {
    const next = nowChecks.get(check.id)
    if (!next) continue
    compared += 1
    if (next.verdict === check.verdict && next.points === check.points) continue
    moves.push({
      domain: row.domain,
      check: check.id,
      from: `${check.verdict}/${check.points}`,
      to: `${next.verdict}/${next.points}`,
      points: next.points - check.points,
      detail: next.detail,
    })
  }
}

const key = (move: Move) => `${move.domain}:${move.check}`
const asPredicted = moves.filter((move) => expected.has(key(move)))
const surprises = moves.filter((move) => !expected.has(key(move)))
const unmoved = [...expected].filter((want) => !moves.some((move) => key(move) === want))

console.log(`${before.formulaVersion} -> ${after.formulaVersion}: ${compared} werdyktow porownanych, ${moves.length} ruszylo (${((moves.length / compared) * 100).toFixed(2)} procent)`)
if (missing.length > 0) console.log(`brak po zmianie: ${missing.join(', ')}`)

if (expected.size > 0) {
  console.log(`\nprzewidziane i potwierdzone (${asPredicted.length} z ${expected.size}):`)
  for (const move of asPredicted) console.log(`  ${move.domain.padEnd(20)} ${move.check.padEnd(24)} ${move.from} -> ${move.to}`)
  if (unmoved.length > 0) {
    console.log(`\nPRZEWIDZIANE, A NIE RUSZYLO (${unmoved.length}) - regula nie robi tego, co zmierzylem:`)
    for (const want of unmoved) console.log(`  ${want}`)
  }
}

console.log(`\n${expected.size > 0 ? 'NIEPRZEWIDZIANE' : 'ruszylo'} (${surprises.length}):`)
for (const move of surprises) {
  console.log(`  ${move.domain.padEnd(20)} ${move.check.padEnd(24)} ${move.from} -> ${move.to}`)
  console.log(`      ${move.detail.slice(0, 150)}`)
}

// A run where everything moved as predicted and nothing else did is the only clean outcome, and
// the exit code says so, so this can sit at the end of a reseed without anyone reading it.
process.exit(surprises.length === 0 && unmoved.length === 0 ? 0 : 1)
