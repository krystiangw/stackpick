import { categoryForJob, explainJob } from '../src/lib/lookup'
import { FRESH_QUESTIONS, HELD_OUT_2, HELD_OUT_3, HELD_OUT_4 } from './routing-questions'

/**
 * Questions the routing rules have never seen.
 *
 * `scripts/routing.mts` holds 149 questions and every one of them is burned: each was either
 * written after watching a rule fail or used to decide a rule, so the number it prints measures
 * how well the vocabulary remembers its own history. The honest number comes from questions
 * written before anybody looked at the rules, which is what this file is.
 *
 * Written in one sitting without opening src/lib/lookup.ts, phrased the way the question arrives
 * in a channel rather than as a category name, and labelled before the first run. A question
 * whose right answer is genuinely arguable is labelled null on purpose: the tool answers "we do
 * not have a confident answer" rather than handing a caller vendors with our name on them.
 *
 * When these are fixed and folded into routing.mts they stop being held out, and the next pass
 * needs its own fresh set. That is the cost of measuring this honestly and it is worth paying.
 */

// FRESH_QUESTIONS stopped being held out on 2026-08-13, when its failures were read and the
// stemmer fixed against them. It stays as a regression set. HELD_OUT_2 is the one that measures.
const QUESTIONS = process.env.BURNED ? [...FRESH_QUESTIONS, ...HELD_OUT_2, ...HELD_OUT_3] : HELD_OUT_4

const results = QUESTIONS.map((question) => {
  const got = categoryForJob(question.asked)?.id ?? null
  return { ...question, got, ok: got === question.expect }
})

const wrong = results.filter((result) => !result.ok)
const missed = wrong.filter((result) => result.got === null)
const guessed = wrong.filter((result) => result.expect === null && result.got !== null)

for (const result of wrong) {
  const kind = result.got === null ? 'NO MATCH' : `-> ${result.got}`
  console.log(`  ${(result.expect ?? 'null').padEnd(22)} ${kind.padEnd(26)} ${result.asked}`)
  // Three different failures hide behind one null: nothing scored, two categories tied, or our
  // own prose decided it. They need three different fixes, so the run prints which one it was.
  if (process.env.WHY) {
    const { words, top } = explainJob(result.asked)
    console.log(
      `      ${top.length === 0 ? 'nic nie punktuje' : top.map((row) => `${row.id}=${row.score}(silne ${row.strong})`).join('  ')} [slow: ${words}]`,
    )
  }
}

const rate = ((wrong.length / results.length) * 100).toFixed(1)
console.log(
  `\n${results.length - wrong.length}/${results.length} right, ${wrong.length} wrong (${rate} percent), ` +
    `of which ${missed.length} silent misses and ${guessed.length} guesses where the answer was "we do not know"`,
)
