/**
 * Zamienia unikalny indeks licznika odwiedzin z `{day, path}` na `{day, path, family}`.
 *
 * Bez tego kroku pierwsza rodzina danego dnia i danej sciezki zajmuje klucz, a kazda nastepna wpada
 * na unikalnosc: upsert leci bledem, ktory licznik lapie i loguje, wiec ruch znika po cichu. To jest
 * dokladnie ten ksztalt, ktorego reszta tego repozytorium pilnuje gdzie indziej - bledu, ktory nie
 * zatrzymuje niczego i po prostu zaniza liczbe.
 *
 *   MONGODB_URI=... npx tsx scripts/migrate-visit-index.mts [--apply]
 */
import { MongoClient } from 'mongodb'

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI=$(heroku config:get MONGODB_URI -a stackpick) npx tsx scripts/migrate-visit-index.mts')
  process.exit(1)
}
const apply = process.argv.includes('--apply')
const client = await MongoClient.connect(process.env.MONGODB_URI)
const visits = client.db(process.env.MONGODB_DB || 'stackpick').collection('visits')
const przed = await visits.indexes()
console.log('indeksy przed:', przed.map((i) => `${i.name}${i.unique ? ' (unique)' : ''}`).join(', '))

const stary = przed.find((i) => i.name === 'day_-1_path_1')
const nowy = przed.find((i) => JSON.stringify(i.key) === JSON.stringify({ day: -1, path: 1, family: 1 }))
if (!stary && nowy) {
  console.log('nic do zrobienia: stary indeks juz nie istnieje, nowy jest.')
  await client.close()
  process.exit(0)
}
if (!apply) {
  console.log('\nDO ZROBIENIA (uruchom z --apply):')
  if (stary) console.log('  usunac indeks day_-1_path_1')
  if (!nowy) console.log('  zalozyc unikalny indeks {day: -1, path: 1, family: 1}')
  await client.close()
  process.exit(0)
}
// Nowy indeks POWSTAJE PIERWSZY. Miedzy usunieciem starego a zalozeniem nowego kolekcja nie ma
// zadnej unikalnosci, a produkcja w tym czasie pisze: dwa rownolegle upserty zrobilyby duplikat,
// na ktorym zalozenie nowego indeksu juz by sie wywalilo i licznik zostalby bez klucza.
await visits.createIndex({ day: -1, path: 1, family: 1 }, { unique: true })
console.log('zalozony {day, path, family}')
if (stary) {
  await visits.dropIndex('day_-1_path_1')
  console.log('usuniety day_-1_path_1')
}
console.log('indeksy po:', (await visits.indexes()).map((i) => `${i.name}${i.unique ? ' (unique)' : ''}`).join(', '))
await client.close()
process.exit(0)
