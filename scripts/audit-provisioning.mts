/**
 * Do the documentation pages we read really not document creating a key?
 *
 *   MONGODB_URI=... npx tsx scripts/audit-provisioning.mts [ile]
 *
 * The heaviest check on the card, two points, and 66 accusations. Its sentence names the pages it
 * read, so it can be re-asked - but rerunning `provisioningMatches` alone would only agree with
 * itself. So this reads the same pages and asks a **looser** question on top: does a plain search
 * for creation language see something the seven phrases refuse to credit? Since 9.32 a bare phrase
 * is not enough, it has to carry its evidence in the quoted window, and that is exactly the rule a
 * false accusation would hide behind.
 *
 * Everything it prints is to be read by hand. Never during a sweep.
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'
import { provisioningMatches } from '../src/lib/scan/funnel'

const PAUSE_MS = 300
const store = getStore()
const most = Number(process.argv[2] ?? 30)

/** Careless on purpose: its job is to find what a careful rule will not credit. */
const LOOSE = /(creat|generat|issu|mint)\w*\s+(a\s+|an\s+|your\s+|new\s+)?(api[\s-]?key|token|credential|secret|service account)/i

let checked = 0
let pagesRead = 0
const toRead: { domain: string; url: string; window: string }[] = []

const visible = (html: string) =>
  html.replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

for (const domain of CURATED_DOMAINS) {
  if (checked >= most) break
  const report = await store.latestForDomain(domain, true)
  const check = report?.scorecard.checks.find((one) => one.id === 'programmatic_provisioning')
  if (!check || check.inconclusive || check.notApplicable || check.points > 0) continue
  const pages = (report?.findings as unknown as { docsPagesReadUrls?: string[] })?.docsPagesReadUrls ?? []
  if (pages.length === 0) continue
  checked += 1
  for (const url of pages.slice(0, 5)) {
    await new Promise((done) => setTimeout(done, PAUSE_MS))
    try {
      const answer = await fetch(url, { headers: { accept: 'text/html,text/markdown,*/*' }, signal: AbortSignal.timeout(10_000) })
      if (!answer.ok) continue
      const body = (await answer.text()).slice(0, 600_000)
      pagesRead += 1
      // Both readers on the same bytes: ours, and the careless one.
      if (provisioningMatches(body).length > 0) {
        toRead.push({ domain, url, window: 'REGULA TEZ TO WIDZI - wiersz jest nieaktualny' })
        continue
      }
      const text = visible(body)
      const hit = text.match(LOOSE)
      if (hit?.index !== undefined) {
        toRead.push({ domain, url, window: text.slice(Math.max(0, hit.index - 70), hit.index + 110).trim() })
      }
    } catch {
      continue
    }
  }
  console.log(`${checked} wierszy, ${pagesRead} stron, ${toRead.length} do przeczytania`)
}

console.log(`\n${checked} oblanych wierszy, ${pagesRead} stron przeczytanych`)
console.log(
  toRead.length === 0
    ? 'nic do czytania: na zadnej z tych stron nie widac jezyka tworzenia klucza, ktorego regula by nie skredytowala'
    : `${toRead.length} MIEJSC do przeczytania recznie:`,
)
for (const one of toRead) console.log(`  ${one.domain} ${one.url.slice(0, 70)}\n     ...${one.window.slice(0, 150)}...`)
process.exit(0)
