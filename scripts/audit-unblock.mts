import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'

/**
 * Advice that asks a vendor to publish something the same scan already found.
 *
 * The first version of this file grouped `unblock` sentences and looked for one serving both a
 * passing and a failing row, which is how the fix plan is audited. It reported zero and the zero
 * meant nothing: `unblock` is never attached to a passing check, so the detector could not fire.
 * A probe that cannot say yes proves nothing, which is the rule this project keeps relearning.
 *
 * This asks a question that can come back positive: the advice says "link your documentation" and
 * `discovered.docs` holds a URL, so we are telling somebody to do a thing we watched them do.
 *
 * Run against 170 rows on 2026-08-14 it fired three times and every one was this file's fault, so
 * both narrowings are written into the patterns below rather than remembered:
 *  - "link your API reference from your docs index" asks for a page we did not read, not for the
 *    index we did, so holding the index is not a contradiction. Fifteen of the fifteen.
 *  - `discovered.pricing` holds guessed addresses as well as linked ones, so groq.com looked like
 *    a contradiction while its verdict said "we guessed" in the same sentence. Checked by hand:
 *    groq.com/pricing redirects to the home page and the only figure on it is a fundraise.
 *
 *   MONGODB_URI=$(heroku config:get MONGODB_URI -a stackpick) npx tsx scripts/audit-unblock.mts
 */
const store = getStore()

/** What a sentence asks for, and the field that would already hold it. */
const ASKS: { pattern: RegExp; found: (d: Record<string, string | null>) => string | null; names: string }[] = [
  // Deliberately not "link your API reference from your docs index": that asks for a different
  // page than the index we found, so having the index is not a contradiction. The first version
  // of this list conflated them and reported fifteen contradictions that were all mine.
  { pattern: /link your documentation from your home page/i, found: (d) => d.docs, names: 'dokumentacje' },
  { pattern: /link (?:a |your )?pricing/i, found: (d) => d.pricing, names: 'cennik' },
  { pattern: /link signup|link your signup/i, found: (d) => d.signup, names: 'rejestracje' },
  { pattern: /name your package/i, found: (d) => d.npmPackage, names: 'pakiet npm' },
]

let rows = 0
let contradictions = 0
let checked = 0

for (const domain of CURATED_DOMAINS) {
  const report = await store.latestForDomain(domain)
  if (!report) continue
  rows += 1
  const discovered = (report.findings as unknown as { discovered: Record<string, string | null> }).discovered ?? {}
  for (const check of report.scorecard.checks) {
    const unblock = (check as { unblock?: string }).unblock
    if (!unblock) continue
    for (const ask of ASKS) {
      if (!ask.pattern.test(unblock)) continue
      checked += 1
      const already = ask.found(discovered)
      if (!already) continue
      // A verdict that says it guessed is not claiming to have found the page, and the address it
      // names is the one it tried rather than one the vendor published. The header of this file
      // promised this narrowing on 14.08 and only the documentation half of it was ever applied,
      // so groq.com went on being reported every run. Re-checked by hand 17.08: groq.com/pricing
      // still redirects to the home page, so both the verdict and the advice are right and it is
      // this script that was wrong.
      if (/\bwe guessed\b/i.test(check.detail)) continue
      contradictions += 1
      console.log(`\nSPRZECZNOSC ${domain} [${check.id}]`)
      console.log(`  rada:      ${unblock.slice(0, 120)}`)
      console.log(`  a mamy ${ask.names}: ${already}`)
      console.log(`  werdykt:   ${check.detail.slice(0, 120)}`)
    }
  }
}

console.log(`\n${rows} raportow, ${checked} rad proszacych o rzecz, ktora umiemy wykryc`)
console.log(`${contradictions} rad kaze opublikowac cos, co ten sam skan juz znalazl`)
process.exit(0)
