/**
 * Guards the claims the sixth study makes on /findings, against the data it makes them from.
 *
 *   MONGODB_URI=... npx tsx scripts/audit-study.mts
 *
 * The study says two checks separate vendors that agents name from vendors they do not, that a
 * third is fame rather than a rule, and that llms.txt separates nobody. Those sentences are typed
 * into a page; the numbers behind them move every time a cell gains a run or the corpus is
 * reseeded. A published claim nobody recomputes is a claim that becomes false quietly.
 *
 * It asserts DIRECTION rather than the exact figures, because the figures are allowed to move and
 * the sentence is not: oauth_dcr and mcp_present positive in both halves of the popularity split,
 * programmatic_provisioning carried by the popular half, llms_txt not separating the quiet half.
 * The current numbers are printed either way, so the page can be corrected rather than guessed at.
 */
import { CURATED_DOMAINS, CATEGORIES } from '../src/lib/categories'
import { getStore } from '../src/lib/store'
import cells from '../src/data/cells.json'

/**
 * Named is per tool, not pooled, because that is how the study measured and how it replicated.
 * Pooling raises the base rate - a vendor gets more chances to be mentioned - and compresses every
 * difference toward zero: pooled, mcp_present reads +12pp with nothing among lesser known vendors,
 * while each tool on its own reads +17 and +22 with both halves positive. The pooled figure is not
 * wrong, it answers a different question, and the sentence on the page is about the per-tool one.
 */
type Row = { domain: string; named: Map<string, number>; runs: Map<string, number>; downloads: number | null; passes: Map<string, boolean> }

/**
 * Two honest measures of the same thing, and the study used one while its own method sentence
 * described the other.
 *
 *   share   the average share of runs that named a vendor, which is how often an agent says it
 *   ever    the share of vendors a run named at least once, which is whether it says it at all
 *
 * They disagree where it matters: mcp_present holds in both halves of the popularity split under
 * `share` on both tools, and under `ever` only on the clean one. Both are printed here, because
 * the page has to name which one it is quoting.
 */
type Measure = 'share' | 'ever'

const store = getStore()
const rows: Row[] = []

for (const domain of CURATED_DOMAINS) {
  const category = CATEGORIES.find((candidate) => candidate.domains.includes(domain))
  if (!category) continue
  const held = cells.filter((cell) => cell.category === category.id)
  if (held.length === 0) continue
  const report = await store.latestForDomain(domain, true)
  if (!report) continue
  const passes = new Map<string, boolean>()
  for (const check of report.scorecard.checks) {
    if (check.inconclusive || check.notApplicable) continue
    // Any credit counts as passing, which is how the study and the scorecard read a partial: one
    // provisioning phrase of two is a vendor who documents something, not a vendor who does not.
    passes.set(check.id, check.points > 0)
  }
  const findings = report.findings as unknown as { npm?: { weeklyDownloads?: number | null } }
  rows.push({
    domain,
    named: new Map(held.map((cell) => [cell.tool.split(' ')[0], cell.rows.find((row) => row.domain === domain)?.named ?? 0])),
    runs: new Map(held.map((cell) => [cell.tool.split(' ')[0], cell.runs])),
    downloads: findings.npm?.weeklyDownloads ?? null,
    passes,
  })
}

const tools = [...new Set(cells.map((cell) => cell.tool.split(' ')[0]))]
const rate = (of: Row[], tool: string, measure: Measure) =>
  of.length === 0
    ? 0
    : of.reduce(
        (sum, row) =>
          sum + (measure === 'ever' ? ((row.named.get(tool) ?? 0) > 0 ? 1 : 0) : (row.named.get(tool) ?? 0) / (row.runs.get(tool) || 1)),
        0,
      ) / of.length

/** Points of difference in nameability between vendors that pass a check and vendors that fail it. */
function gap(check: string, within: Row[], tool: string, measure: Measure): { pp: number } {
  const measured = within.filter((row) => row.passes.has(check) && row.named.has(tool))
  const passing = measured.filter((row) => row.passes.get(check) === true)
  const failing = measured.filter((row) => row.passes.get(check) === false)
  if (passing.length < 5 || failing.length < 5) return { pp: Number.NaN }
  return { pp: Math.round((rate(passing, tool, measure) - rate(failing, tool, measure)) * 100) }
}

const known = rows.filter((row) => row.downloads !== null)
const cut = [...known].sort((a, b) => (a.downloads ?? 0) - (b.downloads ?? 0))[Math.floor(known.length / 2)]?.downloads ?? 0
const popular = known.filter((row) => (row.downloads ?? 0) > cut)
const quieter = known.filter((row) => (row.downloads ?? 0) <= cut)

console.log(`${rows.length} dostawcow z wierszem w korpusie i cela w kategorii, narzedzia: ${tools.join(', ')}`)
console.log(`podzial na popularnosc: mediana ${cut.toLocaleString('pl')} pobran, ${popular.length} kontra ${quieter.length}\n`)
const show = (value: number) => (Number.isNaN(value) ? ' za malo' : `${value > 0 ? '+' : ''}${value}pp`.padStart(8))
for (const measure of ['share', 'ever'] as Measure[]) {
  for (const tool of tools) {
    console.log(`\n${tool}, miara ${measure === 'share' ? 'jak czesto wymieniany' : 'czy wymieniony choc raz'}`)
    console.log('check                        ogolem   popularni   mniej znani')
    for (const check of ['oauth_dcr', 'mcp_present', 'programmatic_provisioning', 'llms_txt']) {
      console.log(
        `${check.padEnd(28)} ${show(gap(check, rows, tool, measure).pp)} ${show(gap(check, popular, tool, measure).pp)} ${show(gap(check, quieter, tool, measure).pp)}`,
      )
    }
  }
}

/** Each sentence the page prints, with the condition that makes it true. */
const survives = (check: string, tool: string, measure: Measure) =>
  gap(check, rows, tool, measure).pp > 0 && gap(check, popular, tool, measure).pp > 0 && gap(check, quieter, tool, measure).pp > 0
const claims: { says: string; holds: boolean }[] = [
  ...tools.flatMap((tool) => [
    { says: `oauth_dcr separates in both halves on ${tool}, both measures`, holds: survives('oauth_dcr', tool, 'share') && survives('oauth_dcr', tool, 'ever') },
    { says: `mcp_present separates in both halves on ${tool}, how often measure`, holds: survives('mcp_present', tool, 'share') },
  ]),
  {
    says: 'mcp_present separates in both halves on the clean tool under the stricter measure',
    holds: survives('mcp_present', 'codex', 'ever'),
  },
  {
    says: 'programmatic_provisioning is carried by the popular half, every tool, how often measure',
    holds: tools.every(
      (tool) =>
        gap('programmatic_provisioning', popular, tool, 'share').pp >
        3 * Math.max(gap('programmatic_provisioning', quieter, tool, 'share').pp, 1),
    ),
  },
  {
    says: 'llms_txt separates nobody among lesser known vendors, every tool, how often measure',
    holds: tools.every((tool) => gap('llms_txt', quieter, tool, 'share').pp < 5),
  },
]

console.log('')
let broken = 0
for (const claim of claims) {
  if (!claim.holds) broken += 1
  console.log(`${claim.holds ? 'TRZYMA SIE' : 'NIE TRZYMA'}  ${claim.says}`)
}
console.log(
  broken === 0
    ? '\nkazde zdanie szostego badania na /findings jest nadal prawdziwe wobec danych'
    : `\n${broken} zdan na /findings przestalo byc prawdziwych. Popraw strone albo wycofaj twierdzenie.`,
)
process.exit(broken === 0 ? 0 : 1)
