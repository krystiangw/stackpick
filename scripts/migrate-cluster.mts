/**
 * Copies our database onto another cluster, and refuses to do anything else.
 *
 *   MONGODB_URI=<zrodlo> MONGODB_URI_TARGET=<cel> npx tsx scripts/migrate-cluster.mts        # proba
 *   MONGODB_URI=<zrodlo> MONGODB_URI_TARGET=<cel> npx tsx scripts/migrate-cluster.mts --go   # zapis
 *
 * Written for one situation: `stackpick` lives on a Flex cluster created for somebody else's
 * project (`equity-analyst-flex`), and moving off it must not be able to touch that neighbour. The
 * move was carried out on 20 August 2026; this stays because the source is still there as rollback
 * and because the next move should not have to reinvent the refusals below. So
 * this reads from the source and writes to the target and does nothing else - no drop, no delete,
 * no compact, and it never opens a database whose name is not ours. Leaving the old copy in place
 * is the rollback: switching back is one Heroku config var.
 *
 * `mongodump` is not installed here and this does not need it. 126 MB over the driver is a minute.
 */
import { MongoClient, type Document } from 'mongodb'
import { execSync } from 'node:child_process'

const OURS = 'stackpick'
const BATCH = 500
const write = process.argv.includes('--go')

const from = process.env.MONGODB_URI
const to = process.env.MONGODB_URI_TARGET
if (!from || !to) {
  console.error('potrzebne MONGODB_URI (zrodlo) i MONGODB_URI_TARGET (cel)')
  process.exit(1)
}
const hostOf = (uri: string) => new URL(uri.replace(/^mongodb(\+srv)?:\/\//, 'https://')).hostname
if (hostOf(from) === hostOf(to)) {
  console.error(`zrodlo i cel to ten sam klaster (${hostOf(from)}) - to nie jest migracja`)
  process.exit(1)
}

// Przemiat pisze do zrodla przez godzine. Kopia zrobiona w jego trakcie jest spojna per dokument i
// niespojna jako calosc: czesc wierszy na starej formule, czesc na nowej, i nikt tego pozniej nie
// odrozni. `lastIndexOf` zamiast `pgrep -f`, bo wlasna linia polecen zawiera te nazwe.
const running = execSync('ps -Ao args=', { encoding: 'utf8' })
  .split('\n')
  .some((line) => line.includes('scripts/reseed.sh') && !line.includes('migrate-cluster'))
if (running) {
  console.error('przemiat korpusu trwa - kopia bylaby migawka w polowie zapisu. Poczekaj na koniec.')
  process.exit(1)
}

// Przemiat to nie jedyny pisarz. Aplikacja na Heroku pisze przy kazdym skanie goscia, kazdym
// leadzie, kazdej wizycie i przy cronie obserwacji - a zapis, ktory wpadnie PO przeczytaniu licznika
// tej kolekcji, nie trafi do celu i weryfikacja liczb i tak sie zgodzi. Czyli „kopia kompletna"
// bylaby zdaniem, ktorego nie da sie obronic. Codeksa. Lekarstwo jest tanie przy naszym ruchu:
// okno serwisowe na czas kopiowania (126 MB to okolo minuty).
if (write) {
  const maintenance = execSync('heroku maintenance -a stackpick', { encoding: 'utf8' }).trim()
  if (!/\bon\b/i.test(maintenance)) {
    console.error(`aplikacja przyjmuje ruch (${maintenance}) - kopia zgubilaby zapisy zrobione w jej trakcie.`)
    console.error('Wlacz okno serwisowe, skopiuj, przelacz i dopiero wtedy wylacz:')
    console.error('  heroku maintenance:on -a stackpick')
    process.exit(1)
  }
}

const source = new MongoClient(from)
const target = new MongoClient(to)
await source.connect()
await target.connect()
const src = source.db(OURS)
const dst = target.db(OURS)

const already = await dst.listCollections().toArray()
const populated: string[] = []
for (const one of already) if ((await dst.collection(one.name).estimatedDocumentCount()) > 0) populated.push(one.name)
if (populated.length > 0) {
  console.error(`cel juz ma dane w: ${populated.join(', ')} - nie nadpisuje niczego, wyczysc go recznie albo wskaz pusty`)
  await source.close()
  await target.close()
  process.exit(1)
}

console.log(`${write ? 'KOPIUJE' : 'PROBA (bez --go nic nie zapisuje)'}: ${hostOf(from)} -> ${hostOf(to)}, baza ${OURS}\n`)

const collections = (await src.listCollections().toArray()).map((one) => one.name).sort()
const tally: { name: string; read: number; written: number; indexes: number }[] = []

for (const name of collections) {
  const reader = src.collection(name)
  const expected = await reader.countDocuments()
  const indexes = (await reader.indexes()).filter((index) => index.name !== '_id_')
  let written = 0
  if (write) {
    let batch: Document[] = []
    for await (const doc of reader.find({})) {
      batch.push(doc)
      if (batch.length >= BATCH) {
        await dst.collection(name).insertMany(batch, { ordered: false })
        written += batch.length
        batch = []
      }
    }
    if (batch.length > 0) {
      await dst.collection(name).insertMany(batch, { ordered: false })
      written += batch.length
    }
    // Indeksy po dokumentach, bo budowanie ich w trakcie wstawiania jest wolniejsze i nic nie daje.
    // Aplikacja i tak tworzy swoje przy starcie, ale kopia bez nich to inna baza niz oryginal.
    for (const index of indexes) {
      const { key, name: indexName, v, ...options } = index as Document
      await dst.collection(name).createIndex(key, { ...options, name: indexName })
    }
  }
  tally.push({ name, read: expected, written, indexes: indexes.length })
  console.log(`  ${name.padEnd(18)} ${String(expected).padStart(6)} dok, ${indexes.length} indeksow${write ? ` -> zapisane ${written}` : ''}`)
}

if (!write) {
  console.log('\nNic nie zapisano. Z `--go` skopiuje powyzsze i odtworzy indeksy.')
  await source.close()
  await target.close()
  process.exit(0)
}

// Kontrolka, ktora ma prawo oblac: liczba dokumentow po obu stronach, czytana Z CELU, nie z licznika
// petli. Licznik moglby sie zgadzac z samym soba przy zgubionej wstawce.
console.log('\nWERYFIKACJA (czytana z celu):')
let wrong = 0
for (const one of tally) {
  const there = await dst.collection(one.name).countDocuments()
  const indexesThere = (await dst.collection(one.name).indexes()).filter((index) => index.name !== '_id_').length
  const ok = there === one.read && indexesThere === one.indexes
  if (!ok) wrong += 1
  console.log(`  ${ok ? 'zgadza sie' : 'NIE ZGADZA '} ${one.name.padEnd(18)} ${there}/${one.read} dok, ${indexesThere}/${one.indexes} indeksow`)
}

const stats = await dst.stats()
console.log(`\ncel: dane ${Math.round(stats.dataSize / 1_048_576)} MB, plik ${Math.round(stats.storageSize / 1_048_576)} MB, ${stats.objects} dokumentow`)
await source.close()
await target.close()

if (wrong > 0) {
  console.error(`\n${wrong} kolekcji sie nie zgadza - NIE przelaczaj Heroku`)
  process.exit(1)
}
console.log('\nKopia kompletna. Zrodlo NIETKNIETE i zostaje jako rollback.')
console.log('Nastepny krok wykonuje czlowiek albo agent swiadomie, bo to przelacza produkcje:')
console.log('  heroku config:set MONGODB_URI="<cel>" -a stackpick')
console.log('Potem: `npm run audit` i otwarcie kilku historycznych /r/<id>, bo to one dowodza, ze przeszly wszystkie raporty.')
process.exit(0)
