/**
 * Guards the two documents a paying customer actually receives.
 *
 *   npx tsx scripts/audit-delivery.mts
 *
 * The scan is checked by `npm run audit` and the study by `audit-study.mts`. Nothing checked the
 * paid report or the monthly mail, and both had their own, weaker definition of being named than
 * the one we publish: they searched for the brand as a substring, so name.com was told it was
 * named in zero of ten runs and then handed ten paragraphs of "what the runs said about you", every
 * one of them about Route 53, Openprovider or Cloudflare. tiny.cloud was quoted "scrutiny",
 * deepl.com was quoted "deeply".
 *
 * No network and no database: everything a customer is told about the runs comes out of cells.json,
 * so everything can be replayed against it. Exits non-zero when a document could state something
 * the data does not support.
 */
import { CATEGORIES } from '../src/lib/categories'
import { quotedAbout, wordsCarried } from '../src/lib/vendors'
import cells from '../src/data/cells.json'

type Complaint = { where: string; says: string }
const complaints: Complaint[] = []

let quoted = 0
let silent = 0

for (const category of CATEGORIES) {
  const held = cells
    .filter((cell) => cell.category === category.id)
    .sort((a, b) => a.operatorContext.length - b.operatorContext.length)
  if (held.length === 0) continue
  const runs = held.reduce((sum, one) => sum + one.runs, 0)
  const namedAcross = (of: string) => held.reduce((sum, one) => sum + (one.rows.find((row) => row.domain === of)?.named ?? 0), 0)

  for (const domain of category.domains) {
    const quotes = held
      .flatMap((one) => one.answers)
      .map((answer) => ({ answer, said: quotedAbout(answer.text, domain, category.domains) }))
      .filter((entry) => entry.said !== null)

    // The count and the quote have to come from one reading. A vendor no run named cannot have a
    // sentence about it, and every sentence has to come from a run whose own list holds it.
    if (namedAcross(domain) === 0 && quotes.length > 0) {
      complaints.push({ where: `${category.id}/${domain}`, says: `wymieniony 0 razy, a dostalby ${quotes.length} cytatow` })
    }
    for (const { answer, said } of quotes) {
      if (!answer.named.includes(domain)) {
        complaints.push({ where: `${category.id}/${domain}`, says: `cytat z biegu ${answer.run}, ktory go nie wymienil: "${said?.slice(0, 60)}"` })
      }
      // A quote made entirely of link syntax says nothing, and it is the first half of the report
      // a buyer reads. Three of six codex runs in the vercel.com report were "[Vercel limits](url) |"
      // until 2026-08-17. Short is fine - "Neon byłby moim wyborem." is four words and a real
      // answer - so the bar is one word a reader can take away, not a word count.
      if (said !== null && wordsCarried(said) === 0) {
        complaints.push({ where: `${category.id}/${domain}`, says: `cytat bez ani jednego slowa poza linkiem, bieg ${answer.run}: "${said.slice(0, 60)}"` })
      }
    }
    if (quotes.length > 0) quoted += 1
    else silent += 1

    // Ahead of you means ahead on the scale the headline printed, not on whichever cell we read.
    const ahead = held[0].rows
      .map((row) => row.domain)
      .filter((other) => other !== domain && namedAcross(other) - namedAcross(domain) > 1)
    for (const other of ahead) {
      if (namedAcross(other) <= namedAcross(domain)) {
        complaints.push({
          where: `${category.id}/${domain}`,
          says: `${other} na liscie wyprzedzajacych z ${namedAcross(other)}/${runs} przy jego ${namedAcross(domain)}/${runs}`,
        })
      }
    }
  }
}

console.log(`${quoted} dostawcow dostaloby cytat, ${silent} zdanie o absencji`)
if (complaints.length === 0) {
  console.log('\nzadne zdanie w platnym raporcie ani w miesiecznym mailu nie kloci sie z danymi, z ktorych powstalo')
  process.exit(0)
}
for (const complaint of complaints) console.log(`NIE TRZYMA  ${complaint.where}: ${complaint.says}`)
console.log(`\n${complaints.length} zdan, ktorych nie obronimy przed placacym klientem.`)
process.exit(1)
