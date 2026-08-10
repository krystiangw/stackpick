import { readFileSync } from 'node:fs'
/** Two production snapshots, one reseed apart. Anything that moved without a rule change is noise. */
const a = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const b = JSON.parse(readFileSync(process.argv[3], 'utf8'))
const map = (c: { rows: { domain: string; checks: { id: string; verdict: string }[] }[] }) =>
  new Map(c.rows.map((r) => [r.domain, new Map(r.checks.map((k) => [k.id, k.verdict]))]))
const ma = map(a), mb = map(b)
const shared = [...ma.keys()].filter((d) => mb.has(d))
const flips = new Map<string, string[]>()
for (const d of shared) {
  for (const [id, v] of ma.get(d)!) {
    const w = mb.get(d)!.get(id)
    if (w && w !== v) flips.set(id, [...(flips.get(id) ?? []), `${d}: ${v} -> ${w}`])
  }
}
const total = [...flips.values()].reduce((n, x) => n + x.length, 0)
console.log(`${shared.length} domen wspolnych, ${shared.length * 14} werdyktow`)
for (const [id, list] of [...flips].sort((x, y) => y[1].length - x[1].length)) {
  console.log(`\n${id}: ${list.length}`)
  for (const line of list.slice(0, 8)) console.log(`   ${line}`)
}
console.log(`\nrazem zmian: ${total} (${((total / (shared.length * 14)) * 100).toFixed(2)} procent)`)
