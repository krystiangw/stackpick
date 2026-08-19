/**
 * Are the links we call dead still dead?
 *
 *   MONGODB_URI=... npx tsx scripts/audit-llms-links.mts [ile]
 *
 * `llms_txt` names a URL when it says a vendor's own index points at a page that is gone. Those
 * rows pass the check, so nobody has been looking at them, and they are still a claim about
 * somebody else's site with an address attached: the cheapest possible thing to be wrong about and
 * the easiest to check. One request per row.
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'
import { howManyRows } from './how-many'

const PAUSE_MS = 400
const store = getStore()
const most = howManyRows(40)

const alive: { domain: string; url: string; status: number }[] = []
const dead: string[] = []
let checked = 0

for (const domain of CURATED_DOMAINS) {
  if (checked >= most) break
  const report = await store.latestForDomain(domain, true)
  const check = report?.scorecard.checks.find((one) => one.id === 'llms_txt')
  const named = check?.detail.match(/(?:starting with|One is gone:) (https?:\/\/\S+)/)?.[1]
  if (!named) continue
  checked += 1
  await new Promise((done) => setTimeout(done, PAUSE_MS))
  try {
    const answer = await fetch(named, { headers: { accept: 'text/html,*/*' }, redirect: 'follow', signal: AbortSignal.timeout(10_000) })
    // The scanner calls a link gone on a 404 and on nothing else, so anything that answers is a
    // sentence to look at rather than proof we were wrong: a 403 to us is not a page that is gone.
    if (answer.status === 404) dead.push(`${domain} (${named})`)
    else alive.push({ domain, url: named, status: answer.status })
  } catch {
    dead.push(`${domain} (${named}, brak odpowiedzi)`)
  }
  console.log(`${checked} wierszy sprawdzonych, ${alive.length} adresow odpowiada`)
}

console.log(`\n${checked} wierszy ze zdaniem o martwym linku`)
console.log(
  alive.length === 0
    ? 'wszystkie nadal martwe: kazdy adres, o ktorym mowimy, ze go nie ma, odpowiada 404'
    : `${alive.length} ADRESOW ODPOWIADA, do przeczytania po kolei (404 to jedyny status, na ktorym stawiamy to zdanie):`,
)
for (const one of alive) console.log(`  ${one.domain.padEnd(22)} ${one.status} ${one.url}`)
if (dead.length > 0) console.log(`\n${dead.length} potwierdzonych jako martwe`)
process.exit(0)
