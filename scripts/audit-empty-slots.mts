/**
 * Czy ktorekolwiek zdanie, ktore opublikowalismy o cudzej firmie, nosi slad brakujacego pola.
 *
 *   MONGODB_URI=... npx tsx scripts/audit-empty-slots.mts
 *
 * Cztery razy w ciagu jednej doby (2026-08-20) pole dodane pozniej zmienilo znaczenie starych
 * rekordow: `docsThinnerForAgents` wypuscil „NaN percent", `docsTextCharsTruncated` i `metadataAt`
 * kazaly nam oskarzac bez dowodu, a `measurable` dawalby „7/NaN" na stronach, ktore wlasnie
 * naprawialismy. Za kazdym razem znajdowal to czlowiek albo codex, po fakcie i przypadkiem.
 *
 * Ten audyt nie szuka PRZYCZYNY (pola, ktorego nie ma), tylko SKUTKU: zdania, w ktorym po
 * interpolacji zostal slad. Skutek jest jeden i policzalny, a przyczyn jest tyle, ile pol.
 */
import { MongoClient } from 'mongodb'

/**
 * Nasze wlasne slowa, bez tego, co cytujemy. Pierwszy przebieg zglosil 44 zdania z „ ," i wszystkie
 * byly niewinne: spacja przed przecinkiem stala w CYTACIE z dokumentacji vendora (stripe.com pisze
 * „such as Vercel , can create"). Audyt oskarzal nas o cudza interpunkcje, a bramka, ktora wyje na
 * niewinne, przestaje byc czytana po tygodniu.
 *
 * Twarde slady (`NaN`, `undefined`) sprawdzamy w CALYM zdaniu, bo tam cytat niczego nie tlumaczy.
 */
// Cytat znika jako JEDEN token, nie jako spacja: podmiana na spacje sama produkowala „ ," miedzy
// dwoma sasiednimi cytatami („management api", „account api") i audyt zglaszal 7588 wlasnych
// artefaktow zamiast czterdziestu czterech cudzych.
const outsideQuotes = (text: string) => text.replace(/[“"][^“”"]*[”"]/g, 'CYTAT')

/**
 * `ours: true` znaczy „szukaj tylko w naszych slowach". Dla `null` i `undefined` to nie wystarcza w
 * zadna strone: vendor moze napisac w dokumentacji „returns null" i nie jest to nasz blad, ale
 * `"${cytat}"` z pusta wartoscia daje `undefined` WEWNATRZ cudzyslowu i jest (codex). Wiec zamiast
 * wyciszac marker, rozdzielamy wynik: co stoi w naszym zdaniu, a co w cytacie.
 */
const SUSPECT: [name: string, marker: RegExp, ours: boolean][] = [
  ['NaN', /\bNaN\b/, false],
  ['undefined', /\bundefined\b/, true],
  ['null', /\bnull\b/, true],
  ['[object Object]', /\[object Object\]/, false],
  // Slad po pustym `${...}`: „published , but", „at , so", podwojna spacja miedzy slowami.
  ['pusty slot przed przecinkiem', / ,/, true],
  ['podwojna spacja w zdaniu', /\w {2}\w/, true],
  // Liczba, ktorej nie bylo: „0 characters", „of 0 locations" same w sobie bywaja prawdziwe, wiec
  // tu tylko formy, ktorych zdanie nie powinno miec nigdy.
  ['pusty nawias', /\(\s*\)/, true],
  ['wiszacy przyimek na koncu', /\b(at|on|in|of|from)\.$/, true],
]

/**
 * KONTROLKA. Sonda, ktora umie zwrocic wylacznie „nic nie znalazlem", nie dowodzi niczego - to nasza
 * wlasna regula, wiec obowiazuje takze tutaj. Zdania ponizej NAPRAWDE stalismy kiedys na produkcji.
 */
const CONTROL: [text: string, why: string][] = [
  ['docs.vendor.test serves NaN percent less text to our agent than to a Chrome user-agent', 'docsThinnerForAgents, 2026-08'],
  ['Agent readiness 7/NaN', 'measurable brakujace w starych raportach'],
  ['We asked undefined entry files by name', 'stala nieprzekazana do zdania'],
  ['No llms.txt at any of the  locations probed', 'pusty slot po liczbie'],
  ['[object Object] answered our request', 'obiekt wstawiony zamiast pola'],
]
const missed = CONTROL.filter(([text]) => !SUSPECT.some(([, marker, ours]) => marker.test(ours ? outsideQuotes(text) : text)))
if (missed.length > 0) {
  console.log('KONTROLKA NIE PRZESZLA: ten audyt nie widzi zdan, ktore juz kiedys opublikowalismy:')
  for (const [text, why] of missed) console.log(`  ${why}: ${text}`)
  console.log('Dopoki to nie przejdzie, „czysto" ponizej nie znaczy nic.')
  process.exit(1)
}
console.log(`kontrolka: ${CONTROL.length} z ${CONTROL.length} znanych zlych zdan zostaje zlapanych\n`)

const client = await MongoClient.connect(process.env.MONGODB_URI!)
const reports = client.db(process.env.MONGODB_DB || 'stackpick').collection('reports')

let seen = 0, sentences = 0
const hits = new Map<string, { count: number; examples: string[] }>()
for await (const row of reports.find({}, { projection: { 'scorecard.checks': 1, domain: 1, scannedAt: 1 } })) {
  seen += 1
  const doc = row as never as { scorecard?: { checks?: { id: string; detail?: string; unblock?: string }[] }; domain: string; scannedAt: string }
  for (const check of doc.scorecard?.checks ?? []) {
    for (const text of [check.detail, check.unblock]) {
      if (!text) continue
      sentences += 1
      for (const [name, marker, ours] of SUSPECT) {
        const inOurWords = marker.test(outsideQuotes(text))
        const anywhere = marker.test(text)
        if (!(ours ? inOurWords : anywhere)) {
          // Cudze slowo, nie nasze. Notowane osobno i nigdy nie mylone z artefaktem: `"${cytat}"` z
          // pusta wartoscia wyglada tak samo jak vendor piszacy „returns null", i tylko czlowiek to
          // rozstrzygnie.
          if (anywhere && !inOurWords) {
            const quoted = hits.get(`${name} (w CYTACIE, do przeczytania)`) ?? { count: 0, examples: [] }
            quoted.count += 1
            if (quoted.examples.length < 2) quoted.examples.push(`${doc.domain} (${check.id}): ${text.slice(0, 110)}`)
            hits.set(`${name} (w CYTACIE, do przeczytania)`, quoted)
          }
          continue
        }
        const entry = hits.get(name) ?? { count: 0, examples: [] }
        entry.count += 1
        if (entry.examples.length < 3)
          entry.examples.push(`${doc.domain} (${String(doc.scannedAt).slice(0, 10)}, ${check.id}): ${text.slice(0, 110)}`)
        hits.set(name, entry)
      }
    }
  }
}

console.log(`przejrzanych raportow: ${seen}, zdan: ${sentences}`)
if (hits.size === 0) {
  console.log('zadne opublikowane zdanie nie nosi sladu brakujacego pola')
  // Granica tej sondy, napisana wprost, zeby nikt nie przeczytal „czysto" jako „klasa domknieta".
  console.log(
    '\nCZEGO TEN AUDYT NIE ZLAPIE: brakujacego pola, ktore nie zostawia sladu w tekscie. Zdanie\n' +
      '„OAuth metadata published, but no registration_endpoint in it" jest gramatyczne i wyglada\n' +
      'poprawnie, a bylo oskarzeniem bez dowodu na 294 stronach. Takie rzeczy lapie tylko regula,\n' +
      'ktora wie, ze pole JEST wymagane - czyli straznik przy checku, nie skan po tekscie.',
  )
} else {
  // NASZE artefakty pierwsze i osobno. Cudza interpunkcja w cytacie jest liczna i niewinna, wiec
  // posortowana po liczbie przykrywalaby to jedyne, co wymaga reakcji.
  const isQuoted = (name: string) => name.includes('w CYTACIE')
  const ours = [...hits].filter(([name]) => !isQuoted(name)).sort((a, b) => b[1].count - a[1].count)
  const quoted = [...hits].filter(([name]) => isQuoted(name)).sort((a, b) => b[1].count - a[1].count)
  if (ours.length === 0) console.log('w NASZYCH slowach: czysto')
  for (const [name, entry] of ours) {
    console.log(`\n${entry.count}x  ${name}`)
    for (const example of entry.examples) console.log(`     ${example}`)
  }
  if (quoted.length > 0) {
    console.log('\nPonizej to, co stoi w CYTOWANYM tekscie vendora, a nie w naszym zdaniu. Zwykle jest to')
    console.log('jego wlasna interpunkcja i cytujemy ja wiernie; warte oka tylko wtedy, gdy wyglada na')
    console.log('nasza pusta interpolacje, ktora wpadla miedzy cudzyslowy.')
    for (const [name, entry] of quoted) {
      console.log(`\n${entry.count}x  ${name}`)
      for (const example of entry.examples) console.log(`     ${example}`)
    }
  }
}
await client.close()
// Nie oblewa sam z siebie: czesc wzorcow (podwojna spacja) bywa niewinna i ma byc PRZECZYTANA, a
// bramka, ktora wyje na niewinne, przestaje byc czytana po tygodniu.
process.exit(0)
