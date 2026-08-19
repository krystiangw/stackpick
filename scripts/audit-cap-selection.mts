/**
 * Czy nasz wlasny sufit 400 kB odrzuca cudze strony jako skorupy SPA.
 *
 *   MONGODB_URI=... npx tsx scripts/audit-cap-selection.mts
 *
 * `firstLivePath` uznaje zgadnieta sciezke za zywa dopiero przy 200 znakach widocznego tekstu, zeby
 * odsiac SPA serwujace swoja skorupe pod kazdym adresem. Strona wieksza od sufitu jest jednak
 * przycinana w srodku bloku `<script>`, `stripCodeBlocks` slusznie porzuca reszte dokumentu jako
 * zepsuta - i tekst, ktory lezy ZA cieciem, przestaje istniec. `filestack.com` czyta sie tak na 53
 * znaki przy 12 282 w pelnym odczycie. Wtedy nie oskarzamy nikogo falszywie, tylko **wybieramy inna
 * strone**, i zaden istniejacy audyt tego nie widzi, bo wynik jest prawdziwym zdaniem o innej stronie.
 *
 * Ten skrypt pyta te same sciezki, co skaner, i szuka dokladnie warunku wyzwalajacego: odpowiedz
 * przycieta sufitem, ktora czyta sie ponizej progu. Kontrolka: ile sciezek odpowiada normalnie, bo
 * sonda, ktora nie potrafi znalezc przypadku negatywnego, nie jest pomiarem.
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { fetchUrl, visibleTextLength, looksLikeHtml, MAX_BYTES_PER_RESPONSE } from '../src/lib/scan/http'

const DOCS_FALLBACKS = ['/docs', '/documentation', '/developers']
const PRICING_FALLBACKS = ['/pricing', '/plans']
const FLOOR = 200

const domains = [...CURATED_DOMAINS].sort()
console.log(`pytam ${domains.length} domen o ${DOCS_FALLBACKS.length + PRICING_FALLBACKS.length} zgadywanych sciezek, prog ${FLOOR} znakow, sufit ${MAX_BYTES_PER_RESPONSE} bajtow\n`)

let asked = 0
let answered = 0
let truncated = 0
const hits: string[] = []
const nearMisses: string[] = []

for (const domain of domains) {
  for (const path of [...DOCS_FALLBACKS, ...PRICING_FALLBACKS]) {
    const url = `https://${domain}${path}`
    asked += 1
    const got = await fetchUrl(url)
    if (!got.ok || !looksLikeHtml(got)) continue
    answered += 1
    const chars = visibleTextLength(got.body)
    if (got.truncated) {
      truncated += 1
      // Warunek wyzwalajacy: przycieta i ponizej progu, czyli skaner uzna ja za martwa.
      if (chars <= FLOOR) hits.push(`${domain.padEnd(22)} ${String(chars).padStart(5)} zn, ${got.body.length} bajtow (przycieta)  ${url}`)
      else nearMisses.push(`${domain.padEnd(22)} ${String(chars).padStart(6)} zn, przycieta ale czytelna  ${url}`)
    }
  }
  if (domains.indexOf(domain) % 20 === 0) console.log(`  ...${domains.indexOf(domain)}/${domains.length}`)
}

console.log(`\n${asked} zapytan, ${answered} odpowiedzi HTML, ${truncated} przycietych sufitem`)
console.log(`kontrolka: ${answered - truncated} sciezek zmiescilo sie pod sufitem, wiec sonda widzi tez przypadek normalny`)

if (nearMisses.length > 0) {
  console.log(`\nPRZYCIETE, ALE NADAL CZYTELNE (${nearMisses.length}) - sufit ich nie skreslil:`)
  for (const one of nearMisses.slice(0, 10)) console.log(`  ${one}`)
}

if (hits.length === 0) {
  console.log('\nZERO sciezek, ktore nasz sufit skreslilby jako martwe. Blad jest realny w kodzie i pusty w korpusie.')
} else {
  console.log(`\n${hits.length} SCIEZEK, KTORE NASZ SUFIT SKRESLA JAKO MARTWE:`)
  for (const one of hits) console.log(`  ${one}`)
}
await new Promise<void>((done) => process.stdout.write('', () => done()))
process.exit(0)
