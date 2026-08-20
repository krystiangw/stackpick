import { pathToFileURL } from 'node:url'
import { CURATED_DOMAINS } from '../src/lib/categories'
import { MongoClient, type Collection } from 'mongodb'
import type { Report } from '../src/lib/store'
import { rulesChangedBetween } from '../src/lib/watch'

/**
 * Which verdicts got worse in the last reseed, and are therefore probably our fault.
 *
 * A reseed rescans 170 hosts twice in an hour, and vendors answer that with rate limits and
 * closed connections. sendlayer.com lost its MCP server that way on 2026-08-14: the row said
 * "no server" while mcp.sendlayer.com was answering a JSON-RPC 401 to anyone who asked once.
 * A single rescan restored it.
 *
 * So a check that lost points between two consecutive measurements of the same domain is a
 * rescan candidate first and a vendor regression second. This does not decide which it is; it
 * hands over the list, small enough to check by hand, that nobody would otherwise look at.
 *
 *   MONGODB_URI=$(heroku config:get MONGODB_URI -a stackpick) npx tsx scripts/regressions.mts
 */
export type WorseVerdict = { domain: string; check: string; from: number; to: number; detail: string }

function sweepCutoff(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.valueOf())) throw new Error(`SWEEP_STARTED_AT nie jest data ISO 8601: ${value}`)
  return parsed.toISOString()
}

export async function compareLatestSeeded(
  reports: Collection<Report & { seeded?: boolean }>,
  cutoff: string | undefined,
): Promise<{ worse: WorseVerdict[]; ours: WorseVerdict[]; versions: Set<string>; compared: number; withoutBaseline: number; notSwept: number }> {
  const explicitCutoff = sweepCutoff(cutoff)
  const worse: WorseVerdict[] = []
  const ours: WorseVerdict[] = []
  const versions = new Set<string>()
  let compared = 0
  let withoutBaseline = 0
  let notSwept = 0

  for (const domain of CURATED_DOMAINS) {
    const latest = await reports.findOne({ domain, seeded: true }, { sort: { scannedAt: -1 } })
    if (!latest) continue
    // Domena, ktorej TEN przemiat nie zdolal przeskanowac, ma jako „po" wiersz z poprzedniego
    // przemiatu, a jako „przed" jeszcze starszy - i kazdy historyczny spadek miedzy nimi zglosilby
    // sie jako dzisiejszy regres, po czym poszedlby do reskanu (codex). Bez znacznika przemiatu nie
    // ma czego odsiewac, wiec warunek dotyczy tylko przebiegu z `SWEEP_STARTED_AT`.
    if (explicitCutoff !== undefined && latest.scannedAt < explicitCutoff) {
      notSwept += 1
      continue
    }
    // With no explicit sweep marker, two hours keeps both observed passes out of the baseline:
    // stripe.com was scanned at 17:14 and 16:43 (baseline 10:27), and algolia.com at 17:16 and
    // 16:46 (baseline 10:29). It also keeps a manual rescan minutes later on the "after" side.
    const beforeCutoff = explicitCutoff ?? new Date(new Date(latest.scannedAt).valueOf() - 2 * 60 * 60 * 1000).toISOString()
    const previous = await reports.findOne(
      { domain, seeded: true, scannedAt: { $lt: beforeCutoff } },
      { sort: { scannedAt: -1 } },
    )
    if (!previous) {
      withoutBaseline += 1
      continue
    }
    compared += 1
    const movedRule = rulesChangedBetween(previous.scorecard.formulaVersion, latest.scorecard.formulaVersion)
    if (previous.scorecard.formulaVersion !== latest.scorecard.formulaVersion) {
      versions.add(`${previous.scorecard.formulaVersion} -> ${latest.scorecard.formulaVersion}`)
    }
    for (const check of latest.scorecard.checks) {
      const before = previous.scorecard.checks.find((candidate) => candidate.id === check.id)
      if (!before || check.points >= before.points) continue
      const row = {
        domain,
        check: check.id,
        from: before.points,
        to: check.points,
        detail: check.detail.slice(0, 100),
      }
      if (movedRule.has(check.id)) ours.push(row)
      else worse.push(row)
    }
  }

  return { worse, ours, versions, compared, withoutBaseline, notSwept }
}

async function main(): Promise<void> {
  // Needs the database, not the site: the site publishes the current row and this compares it with
  // the one before it. Saying so beats a stack trace from the driver, which is what reseed.sh got.
  if (!process.env.MONGODB_URI) {
    console.log('MONGODB_URI nie jest ustawione, wiec nie ma z czym porownac. Uruchom:')
    console.log('  MONGODB_URI=$(heroku config:get MONGODB_URI -a stackpick) npm run regressions')
    process.exit(0)
  }

  const client = new MongoClient(process.env.MONGODB_URI)
  await client.connect()
  const reports = client.db(process.env.MONGODB_DB ?? 'stackpick').collection<Report & { seeded?: boolean }>('reports')
  const { worse, ours, versions, compared, withoutBaseline, notSwept } = await compareLatestSeeded(
    reports,
    process.env.SWEEP_STARTED_AT,
  )

console.log(`${compared} domen z dwoma pomiarami do porownania${versions.size > 0 ? `, formula ${[...versions].join(', ')}` : ''}\n`)
console.log(`${withoutBaseline} domen bez pomiaru sprzed przemiatu`)
if (notSwept > 0) {
  console.log(`${notSwept} domen, ktorych ten przemiat nie przeskanowal - o nich ta lista nie mowi nic`)
}
const byCheck = new Map<string, number>()
for (const row of worse) byCheck.set(row.check, (byCheck.get(row.check) ?? 0) + 1)
for (const row of worse.sort((a, b) => a.check.localeCompare(b.check))) {
  console.log(`${row.domain.padEnd(20)} ${row.check.padEnd(26)} ${row.from} -> ${row.to}  ${row.detail}`)
}
console.log(`\n${worse.length} werdyktow gorszych niz poprzedni pomiar`)
for (const [check, count] of [...byCheck].sort((a, b) => b[1] - a[1])) console.log(`  ${check}: ${count}`)
if (worse.length > 0) console.log('\nKazdy z nich przeskanuj ponownie ZANIM uznasz go za regres vendora.')

if (ours.length > 0) {
  console.log(`\n${ours.length} dalszych spadkow na checkach, ktorych regule zmienilismy miedzy tymi pomiarami.`)
  const byOurs = new Map<string, number>()
  for (const row of ours) byOurs.set(row.check, (byOurs.get(row.check) ?? 0) + 1)
  for (const [check, count] of [...byOurs].sort((a, b) => b[1] - a[1])) console.log(`  ${check}: ${count}`)
  console.log('To jest nasza zmiana, nie regres vendora: nie skanuj ich ponownie, tylko sprawdz, czy nowe zdanie mowi prawde.')
}
  await client.close()
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main()
