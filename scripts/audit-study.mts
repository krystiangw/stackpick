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
import { publishedCorpus } from '../src/lib/published'
import { buildStudy, studyClaims, type Measure } from '../src/lib/study'

// The measurement lives in src/lib/study.ts because /findings prints its numbers in sentences and
// this script asserts their direction. Two implementations of one study is how a page ends up
// publishing a gap of minus three that the data has since turned into plus ten.
// The same rows the page reads, not each domain's newest row: publishedCorpus keeps one formula
// version, and during a reseed the two differ. A guard measuring a corpus nobody publishes is a
// guard that passes while the page is wrong, which is the failure this file exists to catch.
const study = buildStudy((await publishedCorpus()).reports)
const tools = study.tools

console.log(`${study.vendors} dostawcow z wierszem w korpusie i cela w kategorii, narzedzia: ${tools.join(', ')}`)
console.log(`podzial na popularnosc: mediana ${study.medianDownloads.toLocaleString('pl')} pobran, ${study.popular} kontra ${study.quieter}\n`)
const show = (value: number) => (Number.isNaN(value) ? ' za malo' : `${value > 0 ? '+' : ''}${value}pp`.padStart(8))
for (const measure of ['share', 'ever'] as Measure[]) {
  for (const tool of tools) {
    console.log(`\n${tool}, miara ${measure === 'share' ? 'jak czesto wymieniany' : 'czy wymieniony choc raz'}`)
    console.log('check                        ogolem   popularni   mniej znani')
    for (const check of ['oauth_dcr', 'mcp_present', 'programmatic_provisioning', 'llms_txt']) {
      const gap = study.gap(check, tool, measure)
      console.log(`${check.padEnd(28)} ${show(gap.overall)} ${show(gap.popular)} ${show(gap.quieter)}`)
    }
  }
}

const claims = studyClaims(study)

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
