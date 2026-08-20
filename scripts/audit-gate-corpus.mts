/**
 * Czy brama publikacyjna dotyka takze WIERSZY, z ktorymi sie porownujemy.
 *
 *   MONGODB_URI=... npx tsx scripts/audit-gate-corpus.mts
 *
 * Raport pokazuje ranking i „przegrywa z" wobec reszty korpusu. Poprawienie samego podmiotu, a
 * zostawienie rowiesnikow z wycofanym oskarzeniem, daje strone, ktora wycofuje znalezisko u siebie
 * i liczy je u sasiada (codex). Dzis wynik powinien byc zerowy, bo korpus jest nowszy niz kazdy
 * dotkniety raport - ale to fakt o dacie ostatniego przemiatu, a nie gwarancja, wiec pytamy o to
 * osobno, zamiast zakladac.
 */
// SUROWE wiersze ze store, nie `publishedCorpus()`. Korpus przechodzi juz przez brame, wiec pytanie
// „ile wierszy jest dotknietych" zadane po niej zawsze zwraca zero i czujnik jest martwy. Pytamy o
// stan PRZED brama, czyli o to, ile porownan staloby na wycofanym oskarzeniu, gdyby jej nie bylo.
import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'
import { asPublishedToday } from '../src/lib/publishable'
import { refuseIfNothingMeasured } from './nothing-measured'

const seeded = (await getStore().latestPerDomain(1000, true)).filter((row) => CURATED_DOMAINS.has(row.domain))
const affected = seeded.filter((row) => asPublishedToday(row).degraded.length > 0)
console.log(`zasianych wierszy korpusu (przed brama): ${seeded.length}`)
refuseIfNothingMeasured(seeded.length, 'wierszy korpusu')
console.log(
  affected.length === 0
    ? 'zaden nie jest dotkniety brama, wiec porownania nie stoja na wycofanym oskarzeniu'
    : `${affected.length} wierszy korpusu bylo BY dotknietych, i brama je poprawia: ${affected.map((r) => r.domain).slice(0, 10).join(', ')}`,
)
// Nie oblewa: brama je poprawia. To licznik ekspozycji, nie alarm.
process.exit(0)
