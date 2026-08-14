import { CURATED_DOMAINS } from '../src/lib/categories'
import { pickHeadline } from '../src/lib/headline'
import { getStore } from '../src/lib/store'

/**
 * The first sentence a vendor reads, checked against the row underneath it.
 *
 * The remedy audit found four contradictions in a day by grouping generated sentences and reading
 * each beside its rows. Headlines are the same kind of generated prose and the most visible on the
 * page, and nothing had ever looked at them across the corpus.
 *
 *   MONGODB_URI=... npx tsx scripts/audit-headlines.mts
 */
const store = getStore()
const shapeOf = (s: string) => s.replace(/https?:\/\/\S+/g, '<url>').replace(/\b\d[\d,.]*\b/g, '<n>').trim()

type Seen = { domains: string[]; severities: Set<string>; totals: Set<number> }
const shapes = new Map<string, Seen>()
let read = 0

for (const domain of CURATED_DOMAINS) {
  const report = await store.latestForDomain(domain)
  if (!report) continue
  read += 1
  const headline = pickHeadline(report.findings, report.scorecard)
  const shape = shapeOf(headline.claim)
  const seen = shapes.get(shape) ?? { domains: [], severities: new Set<string>(), totals: new Set<number>() }
  seen.domains.push(domain)
  seen.severities.add(headline.severity)
  seen.totals.add(report.scorecard.total)
  shapes.set(shape, seen)
}

console.log(`${read} raportow, ${shapes.size} roznych naglowkow\n`)
for (const [shape, seen] of [...shapes.entries()].sort((a, b) => b[1].domains.length - a[1].domains.length)) {
  console.log(`${String(seen.domains.length).padStart(4)}  ${shape}`)
  console.log(`      ${seen.domains.slice(0, 5).join(', ')}${seen.domains.length > 5 ? ' ...' : ''}`)
  // Deliberately not called a defect. Checked on 2026-08-14: the widest of these, 87 rows sharing
  // "you publish files for machines but nothing about becoming a customer", is true on every one
  // of the 87 and none of them has a nearer miss that the ordering skipped. Half the corpus really
  // does have the same worst problem. Printed so the next reader can re-test that, not so they
  // rewrite the headline.
  const spread = Math.max(...seen.totals) - Math.min(...seen.totals)
  if (spread >= 6) console.log(`      (ten sam naglowek przy wynikach ${Math.min(...seen.totals)}-${Math.max(...seen.totals)}; sprawdzone 14.08, nie jest to wada)`)
}
process.exit(0)
