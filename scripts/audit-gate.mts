/**
 * Ile stron brama publikacyjna faktycznie poprawia, i czy dokladnie te, ktore mialy byc poprawione.
 *
 *   MONGODB_URI=... npx tsx scripts/audit-gate.mts
 *
 * Brama z `publishable.ts` dopasowuje KSZTALT znaleziska, a nie tresc zdania, wiec bez tego audytu
 * nie wiadomo, czy trafia w te same wiersze, ktore policzylismy recznie. Rozjazd w KAZDA strone jest
 * bledem: zlapany wiersz ze zdaniem, ktore mialo adres, znaczy, ze wycofujemy cudze poprawne
 * znalezisko; niezlapany wiersz ze zdaniem bez adresu znaczy, ze dalej publikujemy zarzut bez dowodu.
 */
import { MongoClient } from 'mongodb'
import { refuseIfNothingMeasured } from './nothing-measured'
import { asPublishedToday } from '../src/lib/publishable'

// Kazde brzmienie, w ktorym publikowalismy ten zarzut BEZ adresu. Recznie liczylem tylko pierwsze
// i wyszlo 293; brama, ktora dopasowuje ksztalt, znalazla 294. Ten jeden to `allegro.pl` z 7
// sierpnia na formule 2.1, gdzie zdanie brzmialo inaczej i tak samo nie mowilo, gdzie czytalismy.
// Dopasowanie po tekscie zawsze bedzie o krok za wersjami zdania - dlatego brama go nie uzywa, a
// ten audyt trzyma liste wylacznie po to, zeby pokazac rozjazd czlowiekowi.
const BARE = new Set([
  'OAuth metadata published, but no registration_endpoint in it',
  'OAuth metadata without registration_endpoint',
])

if (!process.env.MONGODB_URI) {
  console.log('MONGODB_URI nie jest ustawione. Uruchom:')
  console.log('  MONGODB_URI=$(heroku config:get MONGODB_URI -a stackpick) npx tsx scripts/audit-gate.mts')
  process.exit(1)
}

const client = await MongoClient.connect(process.env.MONGODB_URI)
const reports = client.db(process.env.MONGODB_DB || 'stackpick').collection('reports')

let seen = 0, gated = 0, withEvidence = 0, bare = 0, gatedWithAddress = 0, bareNotGated = 0
const examples: string[] = []
for await (const row of reports.find({}, { projection: { scorecard: 1, 'findings.funnel.oauth': 1, domain: 1 } })) {
  seen += 1
  const detail = (row as never as { scorecard: { checks: { id: string; detail: string }[] } }).scorecard?.checks?.find((one) => one.id === 'oauth_dcr')?.detail ?? ''
  const isBare = BARE.has(detail)
  if (isBare) bare += 1
  const { degraded } = asPublishedToday(row as never)
  if (degraded.length === 0) {
    if (isBare) { bareNotGated += 1; if (examples.length < 5) examples.push(`NIEZLAPANY ${String((row as never as { domain: string }).domain)}`) }
    continue
  }
  gated += 1
  if (degraded[0].evidence?.length) withEvidence += 1
  if (!isBare) { gatedWithAddress += 1; if (examples.length < 5) examples.push(`ZLAPANY MIMO ADRESU ${String((row as never as { domain: string }).domain)}`) }
}

console.log(`przejrzanych raportow: ${seen}`)
refuseIfNothingMeasured(seen, 'raportow')
console.log(`zdanie bez adresu w bazie: ${bare}`)
console.log(`brama poprawia: ${gated}, w tym ${withEvidence} z odzyskanymi originami`)
console.log(
  bareNotGated > 0
    ? `UWAGA: ${bareNotGated} wierszy ze znanym zdaniem bez adresu jest POZA brama, czyli dalej publikuja zarzut bez dowodu`
    : gatedWithAddress > 0
      ? `${gatedWithAddress} wierszy brama poprawia mimo innego brzmienia zdania - PRZECZYTAJ je nizej, to albo starsza wersja tego samego bledu, albo cudze poprawne znalezisko`
      : 'brama trafia dokladnie w te wiersze, ktore mialy byc poprawione',
)
for (const line of examples) console.log(`  ${line}`)
await client.close()
// Oblewa w OBIE strony, bo tak brzmi inwariant na gorze pliku. Nieznane brzmienie zdania ma
// zatrzymac automat i kazac je przeczytac czlowiekowi: albo dopisujemy je do listy, jak
// `allegro.pl`, albo brama wycofuje czyjes poprawne znalezisko (codex).
process.exit(bareNotGated === 0 && gatedWithAddress === 0 ? 0 : 1)
