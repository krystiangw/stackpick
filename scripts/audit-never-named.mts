/**
 * Audits the strongest sentence on the new category pages: "N of M vendors were never named once".
 *
 *   npx tsx scripts/audit-never-named.mts
 *
 * That sentence is a public claim about named companies, and it rests on a matcher that
 * deliberately refuses to count a brand which is also an ordinary English word unless something
 * else in the sentence settles it. Every refusal is the right call for a count and a possible
 * wrong call for a company: bunny.net, bird.com, agora.io and a dozen others are words.
 *
 * So this reads the frozen cells and looks for the brand words the matcher declined to count. A
 * hit is not an error, it is a sentence to read: if the agent meant the vendor, our page is
 * publishing "never named" about a vendor that was named.
 *
 * Deliberately cruder than the matcher, and that is the point: the audit must not share the
 * judgement it is auditing.
 */
import cells from '../src/data/cells.json'
import { CATEGORIES } from '../src/lib/categories'

/** The words around the hit, so the reader decides rather than the script. */
function context(text: string, at: number): string {
  const from = Math.max(text.lastIndexOf('. ', at) + 1, at - 90)
  return text.slice(from, at + 120).replace(/\s+/g, ' ').trim()
}

let claimed = 0
let leads = 0

for (const cell of cells) {
  const category = CATEGORIES.find((candidate) => candidate.id === cell.category)
  if (!category) continue
  const silent = cell.rows.filter((row) => row.named === 0)
  claimed += silent.length
  for (const row of silent) {
    const brand = row.domain.split('.')[0]
    if (brand.length < 4) continue
    for (const answer of cell.answers) {
      const at = answer.text.toLowerCase().indexOf(brand.toLowerCase())
      if (at === -1) continue
      leads += 1
      console.log(`${cell.category.padEnd(22)} ${row.domain.padEnd(20)} run-${answer.run}`)
      console.log(`   „${context(answer.text, at)}"`)
      break
    }
  }
}

console.log(`\n${claimed} wierszy, o ktorych strona kategorii mowi „nie padl ani razu"`)
console.log(`${leads} z nich ma swoje slowo marki gdzies w odpowiedzi, kazde do przeczytania recznie`)
console.log('Trafienie nie jest bledem: matcher odmawia liczenia marki bedacej zwyklym slowem i to jest')
console.log('sluszne dla licznika. Bledem jest dopiero zdanie, w ktorym agent naprawde mial na mysli vendora.')
process.exit(0)
