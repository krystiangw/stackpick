/**
 * Is "reachable, but its form needs JavaScript" still true?
 *
 *   MONGODB_URI=... npx tsx scripts/audit-signup.mts [ile]
 *
 * The fourth of these, and the biggest surface nobody had tried to break: `signup_reachable` fails
 * on 96 rows. Its sentence names the page, so a vendor rereads exactly one address, and it is the
 * check whose failure they are least likely to believe: their signup works, they use it daily. The
 * claim is narrower than that - the form is not in the served HTML - and it has to hold.
 *
 * The predicate is the scanner's own `rendersUsableForm`, and the request carries the scanner's
 * user agent, because the whole point of the check is what a caller identifying itself as an agent
 * receives. Never during a sweep.
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'
import { rendersUsableForm, entersThroughIdentityProvider } from '../src/lib/scan/funnel'
import { AGENT_UA } from '../src/lib/scan/http'

const PAUSE_MS = 400
const store = getStore()
const most = Number(process.argv[2] ?? 40)

type Wrong = { domain: string; url: string; why: string }
const wrong: Wrong[] = []
const gone: string[] = []
let checked = 0

for (const domain of [...CURATED_DOMAINS].slice(0, most)) {
  const report = await store.latestForDomain(domain, true)
  const check = report?.scorecard.checks.find((one) => one.id === 'signup_reachable')
  if (!check || check.inconclusive || check.notApplicable || check.points > 0) continue
  // Both failing shapes name the address first, which is what makes them checkable at all.
  const url = check.detail.match(/^(https?:\/\/\S+?) (?:is reachable|answers)/)?.[1]
  if (!url) continue
  checked += 1
  await new Promise((done) => setTimeout(done, PAUSE_MS))
  try {
    const answer = await fetch(url, { headers: { accept: 'text/html,*/*', 'user-agent': AGENT_UA }, redirect: 'follow', signal: AbortSignal.timeout(10_000) })
    const body = await answer.text()
    if (!answer.ok) {
      // Not a contradiction: the row already says what the status was, and a status that moved is
      // a rescan away from being right. Reported apart so it cannot be read as a false sentence.
      gone.push(`${domain} (${answer.status} dzis, wiersz mowi: ${check.detail.slice(0, 60)})`)
      continue
    }
    // The sentence says the form is not in the served HTML. If it is, the sentence is false today.
    if (rendersUsableForm(body)) {
      wrong.push({ domain, url, why: 'formularz JEST w serwowanym HTML' })
      continue
    }
    // The other shape: "carries no signup form of its own, the only way in is an identity
    // provider". If the page carries neither, the row said the wrong one of the two.
    if (check.detail.includes('identity provider') && !entersThroughIdentityProvider(body)) {
      wrong.push({ domain, url, why: 'nie widac ani formularza, ani wejscia przez dostawce tozsamosci' })
    }
  } catch (error) {
    gone.push(`${domain} (nie odpowiedzial: ${(error as Error).message.slice(0, 40)})`)
  }
  console.log(`${checked} wierszy sprawdzonych, ${wrong.length} zdan do poprawy`)
}

console.log(`\n${checked} oblanych wierszy z adresem w zdaniu`)
console.log(
  wrong.length === 0
    ? 'zdanie trzyma sie wszedzie: na zadnej z tych stron formularz nie jest w serwowanym HTML'
    : `${wrong.length} ZDAN DO POPRAWY, kazde do przeczytania:`,
)
for (const one of wrong) console.log(`  ${one.domain.padEnd(22)} ${one.url}\n     ${one.why}`)
if (gone.length > 0) {
  console.log(`\n${gone.length} stron, ktore dzis nie odpowiedzialy tak, jak wtedy (rescan, nie falsz):`)
  for (const one of gone) console.log(`  ${one}`)
}
process.exit(0)
