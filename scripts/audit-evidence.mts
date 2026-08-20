/**
 * Czy KAZDE oskarzenie, ktore publikujemy, da sie u vendora odtworzyc.
 *
 *   MONGODB_URI=... npx tsx scripts/audit-evidence.mts
 *
 * To jest nasza pierwsza zasada domu, zapisana na `/methodology`: kazda publikowana liczba pochodzi
 * z powtarzalnego zadania, ktore vendor moze powtorzyc u siebie. Do 2026-08-20 nikt jej nie
 * egzekwowal maszynowo, i wyszlo to przypadkiem: `oauth_dcr` oskarzal o brak elementu w dokumencie,
 * ktorego nie umial wskazac, na 294 stronach, przez zdanie calkowicie GRAMATYCZNE.
 *
 * Czujnik pustych slotow (`audit-empty-slots`) tego nie zlapie z definicji - szuka sladu po pustej
 * interpolacji, a tu nie bylo zadnego sladu. To pyta o rzecz odwrotna: czy w zdaniu JEST dowod.
 *
 * Dowodem jest jedno z trzech, bo tyle ksztaltow maja nasze werdykty:
 *  - ADRES, ktory vendor moze pobrac (`https://...`);
 *  - CYTAT z jego wlasnej strony albo pliku (tekst w cudzyslowie);
 *  - LICZBA SPRAWDZONYCH MIEJSC, gdy wynikiem jest brak („4 locations probed", „13 hosts").
 */
import { MongoClient } from 'mongodb'
import { isPublishableRow } from '../src/lib/published'

const HAS_URL = /https?:\/\/\S+/
// Adres bez schematu tez jest adresem: „nothing answered at mcp.postmark.com, api.postmark.com/mcp"
// wymienia dokladnie to, co vendor ma powtorzyc. Wymagamy kropki i koncowki, zeby nie brac za host
// zwyklego zdania zakonczonego kropka.
// Jedna kropka wystarczy: `vendor.io` jest adresem tak samo jak `mcp.vendor.io`, a wymaganie dwoch
// kazalo audytowi zglaszac odtwarzalne oskarzenia jako nieodtwarzalne (codex). `robots.txt` tez tu
// wpada i slusznie: nazwa pliku, ktory vendor ma u siebie, mowi mu gdzie patrzec.
const HAS_HOST = /\b[a-z0-9-]+\.[a-z]{2,}(\/\S*)?/i
// Konkretna sciezka, ktora vendor moze pobrac: „/single-sign-on", „/api/social/og/image".
const HAS_PATH = /(^|\s)\/[a-z0-9][\w./-]*/i
const HAS_QUOTE = /[“"][^“”"]{3,}[”"]/
// Liczba sprawdzonych miejsc, z dowolnym okresleniem miedzy liczba a rzeczownikiem:
// „13 agent entry paths", „6 of the 6 concrete paths", „4 locations probed".
const HAS_COUNT = /\b\d+\s+(\w+\s+){0,3}(locations?|hosts?|origins?|pages?|documents?|files?|paths?|candidates?|phrases?)\b/i
const hasEvidence = (text: string) =>
  HAS_URL.test(text) || HAS_HOST.test(text) || HAS_PATH.test(text) || HAS_QUOTE.test(text) || HAS_COUNT.test(text)

// Kontrolka: sonda, ktora umie odpowiedziec tylko „brak dowodu", nie dowodzi niczego.
const CONTROL: [text: string, expected: boolean][] = [
  ['OAuth metadata published, but no registration_endpoint in it', false],
  ['OAuth metadata published at https://auth.v.test/.well-known/x, but no registration_endpoint in it', true],
  ['No llms.txt at any of the 4 locations probed', true],
  ['1 of 7 provisioning phrases across the 3 documents we read: "create an api key"', true],
  ['Only 53 characters render without JS, which is a page shell rather than a page', false],
  // Zdania, ktore pierwsza wersja tego audytu zglosila FALSZYWIE - kazde niesie dowod, tylko w
  // ksztalcie, ktorego kryterium nie znalo. Sa tu po to, zeby nie wrocic do tamtej wersji.
  ['None of the 13 agent entry paths we asked on your site returns a file rather than your page shell', true],
  ['No MCP surface: nothing answered at mcp.postmark.com, api.postmark.com/mcp', true],
  ['2 of the 3 concrete paths your robots.txt allows are gone: /single-sign-on, /invite', true],
  // I te, ktore naprawde nie daja vendorowi czego powtorzyc.
  ['recaptcha appears in the signup page\'s server HTML', false],
  ['No OpenAPI spec and no markdown negotiation found on this domain', false],
  // Apex bez schematu jest adresem (codex), a zdanie bez zadnego adresu nim nie jest, nawet gdy
  // brzmi technicznie - kontrola w obie strony, bo kryterium zbyt luzne przepusci wszystko.
  ['nothing spoke MCP at vendor.io', true],
  ['recaptcha appears in the server HTML of https://vendor.io/signup', true],
  ['the one concrete path your robots.txt allows is gone: /api/social/og/image', true],
  ['ships without bundled types', false],
  ['Crawl-delay applies to the agents we check', false],
]
const wrong = CONTROL.filter(([text, expected]) => hasEvidence(text) !== expected)
if (wrong.length > 0) {
  console.log('KONTROLKA NIE PRZESZLA, wiec wynik ponizej nic nie znaczy:')
  for (const [text] of wrong) console.log(`  ${text}`)
  process.exit(1)
}
console.log(`kontrolka: ${CONTROL.length} z ${CONTROL.length} przykladow ocenionych zgodnie z oczekiwaniem\n`)

const client = await MongoClient.connect(process.env.MONGODB_URI!)
const reports = client.db(process.env.MONGODB_DB || 'stackpick').collection('reports')

// Tylko to, co NAPRAWDE publikujemy. Pierwsza wersja brala najnowszy zasiany wiersz kazdej domeny i
// zgloszila `postmark.com`, `anvil.co`, `directus.io` oraz `opensrs.com` - wszystkie na formule 7.4
// z 10 sierpnia, ktorych produkcja w ogole nie pokazuje („not measured", sprawdzone na zywo).
// Audyt liczacy strony niewidoczne dla klienta zawyza i uczy ignorowac wlasne wyniki.
const latest = new Map<string, { id: string; scannedAt: string; checks: { id: string; points: number; max: number; detail?: string; inconclusive?: boolean; notApplicable?: boolean }[] }>()
// Najnowszy wiersz WYBIERAMY najpierw, filtr publikowalnosci stosujemy na koncu. Odwrotna kolejnosc
// zalezy od kolejnosci iteracji kursora, ktorej Mongo nie obiecuje: ukryty nowszy wiersz mogl
// zostac odrzucony, a starszy publikowalny wejsc po nim - czyli dokladnie ten rozjazd ze strona,
// ktory ta zmiana ma likwidowac (codex). Sortowanie tez, zeby nie polegac na niczym domyslnym.
const newest = new Map<string, { id: string; scannedAt: string; formulaVersion: string; checks: never[] }>()
for await (const row of reports
  .find({ seeded: true }, { projection: { 'scorecard.checks': 1, 'scorecard.formulaVersion': 1, domain: 1, scannedAt: 1 } })
  .sort({ scannedAt: -1 })) {
  const doc = row as never as { _id: unknown; domain: string; scannedAt: string; scorecard?: { checks?: never[]; formulaVersion?: string } }
  if (newest.has(doc.domain)) continue
  newest.set(doc.domain, {
    id: String(doc._id),
    scannedAt: doc.scannedAt,
    formulaVersion: doc.scorecard?.formulaVersion ?? '',
    checks: (doc.scorecard?.checks ?? []) as never,
  })
}
let hiddenRows = 0
for (const [domain, row] of newest) {
  if (!isPublishableRow(domain, row.formulaVersion)) {
    hiddenRows += 1
    continue
  }
  latest.set(domain, { id: row.id, scannedAt: row.scannedAt, checks: row.checks })
}

let accusations = 0
const naked = new Map<string, { count: number; examples: string[] }>()
for (const [domain, row] of latest) {
  for (const check of row.checks) {
    if (check.points >= check.max || check.inconclusive || check.notApplicable) continue
    accusations += 1
    const detail = check.detail ?? ''
    if (hasEvidence(detail)) continue
    const entry = naked.get(check.id) ?? { count: 0, examples: [] }
    entry.count += 1
    if (entry.examples.length < 3) entry.examples.push(`${domain}: ${detail.slice(0, 120)}`)
    naked.set(check.id, entry)
  }
}

const total = [...naked.values()].reduce((sum, entry) => sum + entry.count, 0)
console.log(`wierszy publikowanych: ${latest.size}, oskarzen w nich: ${accusations}`)
console.log(`(pominietych wierszy, ktorych i tak nie pokazujemy: ${hiddenRows})`)
console.log(
  total === 0
    ? 'kazde oskarzenie niesie adres, cytat albo liczbe sprawdzonych miejsc'
    : `${total} oskarzen (${((total / accusations) * 100).toFixed(1)}%) nie niesie ZADNEGO z trzech, czyli vendor nie ma czego powtorzyc:`,
)
for (const [id, entry] of [...naked].sort((a, b) => b[1].count - a[1].count)) {
  console.log(`\n${entry.count}x  ${id}`)
  for (const example of entry.examples) console.log(`     ${example}`)
}
await client.close()
process.exit(0)
