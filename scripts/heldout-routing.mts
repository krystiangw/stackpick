/**
 * Runs a held-out set of buying questions through the router behind `find_providers`.
 *
 *   MONGODB_URI=... npx tsx scripts/heldout-routing.mts harness/heldout/<set>.json /tmp/questions.json
 *
 * The tool description publishes an error rate near half, and the three sets it was measured on
 * have all since been read and fixed against, so none of them measures anything any more. This
 * runs a set whose questions were written by an agent with no access to this repository and no
 * sight of the category list, and whose labels were written down before the first run.
 *
 * Silence counts. Refusing a question we have no category for is the right answer, and a router
 * judged only on the questions it answered would be scored on the half it finds easy.
 */
import { readFileSync } from 'node:fs'
import { lookup } from '../src/lib/lookup'

type Labels = {
  expected: Record<string, string>
  refuse: number[]
  ambiguous: Record<string, (string | null)[]>
}

const [labelsPath, questionsPath] = process.argv.slice(2)
if (!labelsPath || !questionsPath) {
  console.error('usage: npx tsx scripts/heldout-routing.mts <labels.json> <questions.json>')
  process.exit(2)
}
const labels = JSON.parse(readFileSync(labelsPath, 'utf8')) as Labels
const questions = JSON.parse(readFileSync(questionsPath, 'utf8')) as { id: number; q: string }[]

const tally = { right: 0, wrongCategory: 0, silentWhenItShould: 0, answeredWhenItShouldNot: 0, refusedRight: 0, ambiguousOk: 0 }
const wrong: string[] = []

for (const { id, q } of questions) {
  const found = await lookup(q)
  const got = found?.category.id ?? null
  const want = labels.expected[String(id)] ?? null
  const shouldRefuse = labels.refuse.includes(id)
  const allowed = labels.ambiguous[String(id)]

  if (allowed) {
    if (allowed.includes(got)) tally.ambiguousOk += 1
    else wrong.push(`${id} NIEJEDNOZNACZNE: ${got ?? 'cisza'}, dopuszczalne ${allowed.map((a) => a ?? 'cisza').join(' / ')}`)
    continue
  }
  if (shouldRefuse) {
    if (got === null) tally.refusedRight += 1
    else {
      tally.answeredWhenItShouldNot += 1
      wrong.push(`${id} ODPOWIEDZIAL, a mial odmowic: ${got}`)
    }
    continue
  }
  if (got === want) tally.right += 1
  else if (got === null) {
    tally.silentWhenItShould += 1
    wrong.push(`${id} CISZA, a mial ${want}`)
  } else {
    tally.wrongCategory += 1
    wrong.push(`${id} ZLA KATEGORIA: ${got}, mial ${want}`)
  }
}

const shouldAnswer = Object.keys(labels.expected).length
const shouldRefuse = labels.refuse.length
console.log(`${questions.length} pytan: ${shouldAnswer} z kategoria, ${shouldRefuse} do odmowy, ${Object.keys(labels.ambiguous).length} niejednoznacznych\n`)
console.log(`trafione            ${tally.right} z ${shouldAnswer}`)
console.log(`zla kategoria       ${tally.wrongCategory}`)
console.log(`cisza, a mial       ${tally.silentWhenItShould}`)
console.log(`odmowil poprawnie   ${tally.refusedRight} z ${shouldRefuse}`)
console.log(`odpowiedzial mimo   ${tally.answeredWhenItShouldNot}`)
console.log(`niejednoznaczne ok  ${tally.ambiguousOk} z ${Object.keys(labels.ambiguous).length}`)
const answered = tally.right + tally.wrongCategory + tally.answeredWhenItShouldNot
const badAnswers = tally.wrongCategory + tally.answeredWhenItShouldNot
console.log(`\nodpowiedzi udzielil na ${answered} z ${questions.length}, z czego ${badAnswers} bylo blednych`)
if (wrong.length > 0) {
  console.log('')
  for (const line of wrong) console.log(`  ${line}`)
}
process.exit(0)
