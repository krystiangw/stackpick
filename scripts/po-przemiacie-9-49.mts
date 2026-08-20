/**
 * Czy przemiat na 9.49 powtarza to, co pojedyncze przeskany pokazaly PRZED nim?
 *
 *   MONGODB_URI=... npx tsx scripts/po-przemiacie-9-49.mts
 *
 * Szesnascie wierszy przeskanowanych recznie 2026-08-19 wieczorem, kazdy po to, zeby sprawdzic jedna
 * ze zmian 9.46-9.49 i zmiane selekcji stron. Werdykty zapisane PONIZEJ pochodza z tamtych
 * przeskanow i zostaly zapisane **przed** przemiatem.
 *
 * Rozjazd nie jest tu automatycznie bledem przemiatu: te wiersze zostaly zmierzone raz, a
 * `NOISE_FLOOR_PERCENT` mowi, ze czesc werdyktow rusza sie miedzy dwoma czystymi pomiarami tego
 * samego internetu. Dlatego skrypt **nazywa** rozjazd i kaze go przeczytac, zamiast go orzekac:
 * jeden rozjazd to podloga szumu, kilka na tym samym checku to nasza regula albo nasz przeskan.
 *
 * ZAMKNIETE 2026-08-19: przemiat na 9.49 przeszedl, szesnascie wierszy, jeden rozjazd (onesignal.com,
 * i to on obronil regule). Ten skrypt nie ma juz czego mierzyc - po nastepnym przemiecie znajdzie
 * zero wierszy na 9.49 i skonczy kodem 2. Zostaje jako zapis predykcji, nie jako narzedzie.
 */
import { getStore } from '../src/lib/store'
import { refuseIfNothingMeasured } from './nothing-measured'

/**
 * Wpisane na sztywno, a nie wziete z `FORMULA_VERSION`. Predykcje ponizej sa o zmianach 9.46-9.49 i
 * o niczym innym; przy 9.50 skrypt czytalby wiersze z nowej reguly i porownywal je z obserwacjami
 * sprzed niej, czyli **cicho zmienilby znaczenie**. Codeksa, i tak samo robi wersja dla 9.45.
 */
const PRZEMIAT = '9.49'

/** Werdykt zapisany przed przemiatem: `Np`, `niemierzalny` albo `nd`. */
const PRZED: Record<string, { prov: string; docs: string; powod: string }> = {
  'onesignal.com': { prov: 'niemierzalny', docs: '1p', powod: '9.47: przewodnik po konsoli Firebase' },
  'crowdin.com': { prov: 'niemierzalny', docs: '1p', powod: '9.47: przewodnik po konsoli Google Cloud' },
  'mixpanel.com': { prov: 'niemierzalny', docs: '1p', powod: '9.47 + selekcja: indeks linkow bez slowa o programie' },
  'growthbook.io': { prov: 'niemierzalny', docs: '1p', powod: '9.47: rola Storage w IAM' },
  'zilliz.com': { prov: 'niemierzalny', docs: '1p', powod: '9.47: nawigacja o GKE' },
  'elastic.co': { prov: '1p', docs: '1p', powod: '9.47: stracil fraze, zachowal punkt z innej' },
  'pinecone.io': { prov: '2p', docs: '1p', powod: 'selekcja: czyta dzis admin/fetch_api_key' },
  'getunleash.io': { prov: '2p', docs: '1p', powod: '9.47: bez zmiany, mimo predykcji z cache' },
  'temporal.io': { prov: '2p', docs: '1p', powod: '9.47: bez zmiany' },
  'browserbase.com': { prov: '2p', docs: '1p', powod: '9.47: zdanie niesie slowo programmatic' },
  'cockroachlabs.com': { prov: '2p', docs: '1p', powod: '9.47: bez zmiany' },
  'filestack.com': { prov: 'niemierzalny', docs: 'niemierzalny', powod: '9.48: 616 kB strony przy sufcie 400 kB' },
  'pandadoc.com': { prov: 'niemierzalny', docs: 'niemierzalny', powod: '9.48: to samo, plus sciana na brzegu' },
  'datadoghq.com': { prov: 'niemierzalny', docs: '1p', powod: '9.49: bramke looked trzymal komunikat prasowy' },
  'sendlayer.com': { prov: '1p', docs: '1p', powod: 'selekcja: sekcja api-reference' },
  'trychroma.com': { prov: '0p', docs: '1p', powod: 'selekcja: sekcja reference' },
}

const store = getStore()
const verdict = (check: { points: number; inconclusive?: boolean; notApplicable?: boolean } | undefined) =>
  !check ? 'brak' : check.notApplicable ? 'nd' : check.inconclusive ? 'niemierzalny' : `${check.points}p`

let read = 0
let naStarej = 0
const rozjazdy: string[] = []

for (const [domain, before] of Object.entries(PRZED)) {
  const report = await store.latestForDomain(domain, true)
  if (!report) continue
  // Wiersz jeszcze nieprzemieciony nie jest ani zgodny, ani rozjechany - jest nieprzeczytany.
  if (report.scorecard.formulaVersion !== PRZEMIAT) {
    naStarej += 1
    continue
  }
  read += 1
  const prov = verdict(report.scorecard.checks.find((one) => one.id === 'programmatic_provisioning'))
  const docs = verdict(report.scorecard.checks.find((one) => one.id === 'docs_without_js'))
  const same = prov === before.prov && docs === before.docs
  console.log(`${domain.padEnd(20)} prov ${prov.padEnd(13)} docs ${docs.padEnd(13)} ${same ? 'zgodne' : 'ROZJAZD'}`)
  if (!same) rozjazdy.push(`${domain}: prov ${before.prov} -> ${prov}, docs ${before.docs} -> ${docs}   (${before.powod})`)
}

if (naStarej > 0) console.log(`\n${naStarej} wierszy nie jest na ${PRZEMIAT} - nieprzeczytane, nie zgodne`)
// Bez tego przebieg nad zerem wierszy konczy sie zdaniem „wszystko sie zgadza".
refuseIfNothingMeasured(read, `wierszy na ${PRZEMIAT}`)
// Polowa, nie jeden: pojedynczy wiersz na nowej formule powie o przemiacie tyle, co nic.
if (read < Object.keys(PRZED).length / 2) {
  console.log(`\nprzeczytane ${read} z ${Object.keys(PRZED).length} - ZA MALO, zeby cokolwiek orzec. Uruchom ponownie po przemiecie.`)
} else {
  console.log(`\n${read} wierszy na ${PRZEMIAT}, ${rozjazdy.length} rozjazdow`)
}
for (const line of rozjazdy) console.log(`  ${line}`)
if (rozjazdy.length > 0) {
  console.log('\nJeden rozjazd to podloga szumu i tak go czytaj. Kilka na TYM SAMYM checku znaczy, ze')
  console.log('albo regula robi cos, czego pojedynczy przeskan nie pokazal, albo przeskan mierzyl inaczej.')
}

await new Promise<void>((done) => process.stdout.write('', () => done()))
process.exit(0)
