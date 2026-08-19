/**
 * The other half of `audit-entry.mts`, and the half nobody had: the rows we CREDITED.
 *
 * `audit-entry` asks whether the failing sentence is still true, so it never looks at a vendor we
 * gave the point to. On 2026-08-19 bigcommerce.com held that point for three files that do not
 * exist: `docs.bigcommerce.com` answers every unknown `.md` path with 200 and a markdown page
 * reading "# Page Not Found", and `/ai.txt` with a 340 kB HTML 404. A rescan scored it 0/2, so the
 * scanner's catch-all control normally sees this - it failed once, under the scan budget, and a
 * control that did not answer credited the vendor instead of stopping the credit.
 *
 * So this asks the one question that exposes it: does the file we credit look any different from a
 * path that cannot exist, asked on the SAME host with the SAME extension? Both halves matter. The
 * site's control says nothing about the documentation host, and a control without the suffix gets
 * an HTML 404 from a host that renders every `.md` as a page.
 *
 *   MONGODB_URI=... npx tsx scripts/audit-entry-credited.mts [ile]
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'
import { howManyRows } from './how-many'
import { refuseIfNothingMeasured } from './nothing-measured'

const PAUSE_MS = 300
const CONTROL = 'letagentsin-audit-probe-8f3a1c'
const store = getStore()
const most = howManyRows(60)

const get = async (url: string) => {
  await new Promise((done) => setTimeout(done, PAUSE_MS))
  try {
    const answer = await fetch(url, {
      headers: { accept: 'text/markdown, text/plain, application/json;q=0.9, */*;q=0.8' },
      signal: AbortSignal.timeout(12000),
    })
    const body = await answer.text()
    // Pelna dlugosc, nie dlugosc probki: to jedyny sygnal odporny na nonce w minifikowanym HTML.
    return { status: answer.status, body: body.slice(0, 4000), length: body.length }
  } catch {
    return null
  }
}

/** The heading is the tell a length comparison misses: a "similar pages" list varies per path. */
const firstLine = (text: string) => text.split('\n').map((one) => one.trim()).find(Boolean)?.toLowerCase() ?? ''

type Suspect = { domain: string; url: string; why: string }
const suspects: Suspect[] = []
let checked = 0
let asked = 0
/** Porownania, ktore naprawde doszly do skutku. `asked` liczy proby, a proba nie jest pomiarem. */
let compared = 0
const skipped: string[] = []

for (const domain of [...CURATED_DOMAINS].slice(0, most)) {
  const report = await store.latestForDomain(domain, true)
  const check = report?.scorecard.checks.find((one) => one.id === 'agent_entry_point')
  if (!check || (check.points ?? 0) <= 0) continue
  const urls = [...new Set([...check.detail.matchAll(/https?:\/\/[^\s,)\]]+/g)].map((one) => one[0].replace(/[.,;:]+$/, '')))]
  if (urls.length === 0) continue
  checked += 1
  for (const url of urls) {
    asked += 1
    const parsed = new URL(url)
    const suffix = /\.(md|txt|json)$/.exec(parsed.pathname)?.[0] ?? ''
    // The candidate's own directory, not the origin root. sentry.io publishes a real
    // `/.well-known/mcp.json` and a control at the root compares it against a different namespace,
    // which is the njal.la mistake the scanner already documents: `/api/` is one view and the root
    // is another. Put the nonsense path where the file is.
    const controlUrl = `${parsed.origin}${parsed.pathname.replace(/[^/]+$/, '')}${CONTROL}${suffix}`
    const [file, control] = [await get(url), await get(controlUrl)]
    if (!file || !control) {
      // Nie cisza: nieudane zapytanie to brak pomiaru, a nie „plik rozni sie od kontrolki".
      skipped.push(`${domain}\t${url}\t${file ? 'kontrolka nie odpowiedziala' : 'plik nie odpowiedzial'}`)
      continue
    }
    compared += 1
    // Trzy sygnaly, bo kazdy z osobna przegrywa z inna strona. Porownanie calej pierwszej linii
    // przegrywa z HTML-em w jednej linii, w ktorym siedzi nonce: `developer.calendly.com` raz
    // wychodzil jako identyczny, raz nie, przy tej samej dlugosci 298 102 bajtow za kazdym razem.
    const opening = (text: string) => text.replace(/\s+/g, ' ').trim().slice(0, 200).toLowerCase()
    const same =
      file.status === control.status &&
      (firstLine(file.body) === firstLine(control.body) ||
        file.body.trim() === control.body.trim() ||
        opening(file.body) === opening(control.body) ||
        (file.length > 0 && file.length === control.length))
    if (!same) continue
    suspects.push({
      domain,
      url,
      why: `${file.status} jak kontrolka ${controlUrl}: "${firstLine(file.body).slice(0, 60)}"`,
    })
  }
  console.log(`${checked} zaliczonych wierszy sprawdzonych, ${suspects.length} plikow nieodroznialnych od kontrolki`)
}

refuseIfNothingMeasured(checked, 'zaliczonych wierszy')
refuseIfNothingMeasured(compared, 'porownan plik-kontrolka')
console.log(`\n${checked} zaliczonych wierszy, ${asked} plikow zapytanych, ${compared} porownanych z kontrolka`)
if (skipped.length > 0) {
  console.log(`\n${skipped.length} plikow bez porownania (zapytanie nie doszlo) - o nich ten przebieg nie mowi nic:`)
  for (const one of skipped) console.log(`  ${one}`)
}
console.log(
  suspects.length === 0
    ? 'kazdy zaliczony plik rozni sie od sciezki, ktorej nie ma - punkt stoi na czyms, co istnieje'
    : `${suspects.length} PLIKOW nieodroznialnych od sciezki, ktorej nie ma - kazdy punkt do sprawdzenia:`,
)
for (const one of suspects) console.log(`  ${one.domain.padEnd(20)} ${one.url}\n     ${one.why}`)
process.exit(0)
