/**
 * Czy edge naprawde odmawia ChatGPT-User i Claude-User, czy tylko nie wierzy, ze to oni?
 *
 *   MONGODB_URI=... npx tsx scripts/audit-named-crawlers.mts [ile]
 *
 * `user_agents_allowed` publikuje zdanie nazywajace dwie cudze firmy: „robots.txt permits them,
 * but your edge answered ChatGPT-User 403 at <adres>, which a browser is served". To jest zarzut o
 * konfiguracje, ktora vendor moze u siebie sprawdzic - i dlatego musi sie odtwarzac.
 *
 * Jest jednak druga mozliwosc, ktorej to zdanie dzis nie dopuszcza, a ktora audyt ma **zmierzyc, a
 * nie zalozyc**: listy „verified bots" (Cloudflare i podobne) wpuszczaja ChatGPT-User wylacznie z
 * adresow OpenAI, a KAZDEGO innego klienta z tym user-agentem traktuja jak podszywajacego sie.
 * My wysylamy ten user-agent z wlasnej sieci, wiec odmowa moze byc werdyktem o nas, nie o nich.
 *
 * Rozstrzyga to KONTROLKA, nie rozumowanie: te same dwa user-agenty ida na wiersze, ktorym check
 * ZALICZYLISMY. Jesli podszycie przechodzi tam swobodnie, odmowy sa regula edge'a o tych nazwach.
 * Jesli podszycie leci wszedzie, mierzymy wykrywanie podszywania sie i zdanie na karcie potrzebuje
 * zastrzezenia. Dopiero ten stosunek mowi, ktore z dwoch zdan wolno nam pisac.
 *
 * Do czytania recznie. Nigdy w trakcie przemiatu.
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'
import { fetchUrl, isEdgeRefusal, NAMED_CRAWLERS } from '../src/lib/scan/http'
import { howManyRows, reportCap } from './how-many'
import { refuseIfNothingMeasured } from './nothing-measured'

const PAUSE_MS = 400
const store = getStore()
const most = howManyRows(20)

type Row = { domain: string; docs: string; was: { name: string; status: number }[] }

const accused: Row[] = []
const clean: Row[] = []
let visited = 0

for (const domain of CURATED_DOMAINS) {
  visited += 1
  const report = await store.latestForDomain(domain, true)
  const check = report?.scorecard.checks.find((one) => one.id === 'user_agents_allowed')
  if (!report || !check || check.inconclusive || check.notApplicable) continue
  const docs = report.findings.discovered.docs
  if (!docs) continue
  const refused = report.findings.crawlersRefused ?? []
  if (refused.length > 0) accused.push({ domain, docs, was: [...refused] })
  else if (check.points > 0) clean.push({ domain, docs, was: [] })
}

// Z listy JUZ obcietej sufitem, a nie z calej: inaczej `[ile] 1` czyta jeden wiersz oskarzony i
// kilkadziesiat kontrolnych, czyli sufit ogranicza polowe ruchu, ktora akurat widac. Codeksa.
const audited = accused.slice(0, most)
const controlSize = Math.min(clean.length, Math.max(audited.length, 8))
const step = controlSize > 0 ? Math.max(1, Math.floor(clean.length / controlSize)) : 1
const control = clean.filter((_, index) => index % step === 0).slice(0, controlSize)

reportCap(visited, CURATED_DOMAINS.size, accused.length)
if (accused.length > audited.length) console.log(`sufit: czytam ${audited.length} z ${accused.length} oskarzonych; reszta POMINIETA`)
console.log(`${accused.length} wierszy z odmowa dla nazwanego crawlera, ${clean.length} bez niej (kontrolka: ${control.length})\n`)

const askAs = async (url: string, ua: string) => {
  await new Promise((done) => setTimeout(done, PAUSE_MS))
  return fetchUrl(url, { ua, fresh: true })
}

/**
 * Ile razy podszycie sie NIE udalo tam, gdzie nic nie zarzucamy - **osobno dla kazdej nazwy**.
 * Wspolny licznik byl bledem: te dwie nazwy stoja na roznych listach i jedna moze byc weryfikowana
 * po adresie IP, a druga nie. Zsumowane daly przy takim ukladzie dokladnie 50%, czyli wynik, ktory
 * uniewaznialby prawdziwe znalezisko o tej drugiej. Codeksa.
 */
const spoof = new Map<string, { tried: number; refused: number }>(NAMED_CRAWLERS.map((crawler) => [crawler.name, { tried: 0, refused: 0 }]))

console.log('KONTROLKA: wiersze BEZ zarzutu, te same dwa user-agenty\n')
for (const row of control) {
  // Kontrolka musi byc porownywalna, zanim cokolwiek policzy. Strona, ktorej dzis nie ma, odpowiada
  // 404 i NIE jest odmowa w rozumieniu `isEdgeRefusal`, wiec liczyla sie jako „podszycie przeszlo" i
  // spychala nazwe ponizej progu - czyli martwy adres potwierdzalby oskarzenia. Codeksa, P1.
  const asBrowser = await fetchUrl(row.docs, { fresh: true })
  if (!asBrowser.ok) {
    console.log(`  przegladarka ${String(asBrowser.status).padEnd(3)} - poza kontrolka, bo nie ma z czym porownac  ${row.domain}`)
    continue
  }
  const answers = []
  for (const crawler of NAMED_CRAWLERS) {
    const got = await askAs(row.docs, crawler.ua)
    const refused = isEdgeRefusal(got.status)
    // Ani wpuszczenie, ani odmowa: 0, 429 albo 404 nie mowia nic o polityce wobec tej nazwy.
    if (!refused && !got.ok) {
      answers.push(`${crawler.name} ${got.status} (nie liczone)`)
      continue
    }
    const tally = spoof.get(crawler.name)!
    tally.tried += 1
    if (refused) tally.refused += 1
    answers.push(`${crawler.name} ${got.status}`)
  }
  if (answers.length > 0) console.log(`  ${answers.join(', ').padEnd(40)} ${row.domain}`)
}

// Bramka przed czymkolwiek, co brzmi jak werdykt: bez kontrolki nie wiemy, co mierzymy.
refuseIfNothingMeasured([...spoof.values()].reduce((sum, one) => sum + one.tried, 0), 'zapytan kontrolnych, ktore doszly')

/** Udzial odmow dla podszycia sie pod te nazwe tam, gdzie nic nie zarzucamy. */
const spoofShareOf = (name: string) => {
  const tally = spoof.get(name)
  return tally && tally.tried > 0 ? tally.refused / tally.tried : null
}
/** Nazwa, ktorej podszycie leci odmowa rowniez na czystych wierszach, nie mierzy polityki vendora. */
const tellsUsNothing = (name: string) => {
  const share = spoofShareOf(name)
  return share === null || share >= 0.5
}

const toRead: string[] = []
let holds = 0
let stale = 0
let blurred = 0
let silent = 0

console.log('\nOSKARZONE: mowimy, ze edge odmawia nazwanemu crawlerowi strony, ktora podaje przegladarce\n')
for (const row of audited) {
  // Druga polowa zdania. Bez niej „ktora podaje przegladarce" jest twierdzeniem, nie pomiarem.
  const asBrowser = await fetchUrl(row.docs, { fresh: true })
  const answers: string[] = []
  for (const crawler of row.was) {
    const named = NAMED_CRAWLERS.find((one) => one.name === crawler.name)
    if (!named) continue
    const got = await askAs(row.docs, named.ua)
    if (got.status === 0) {
      silent += 1
      answers.push(`${crawler.name} bez odpowiedzi`)
      continue
    }
    // Werdykt na PARE wiersz-crawler, nie na wiersz: jedna nazwa moze sie odtworzyc, a druga nie.
    // Najpierw dzisiejsza odpowiedz, dopiero potem zastrzezenie o kontrolce: gdy crawler dostaje dzis
    // 200, oskarzenie sie NIE odtworzylo i zadna watpliwosc co do podszywania sie tego nie zmienia.
    // Odwrotna kolejnosc chowala nieaktualne wiersze pod „nierozstrzygalne". Codeksa.
    if (isEdgeRefusal(got.status)) {
      if (tellsUsNothing(crawler.name)) {
        blurred += 1
        answers.push(`${crawler.name} ${got.status} (nierozstrzygalne: to podszycie leci odmowa takze na czystych wierszach)`)
        toRead.push(`${row.domain} / ${crawler.name}: bylo ${crawler.status}, dzis ${got.status}, ale kontrolka mowi, ze mierzymy wykrywanie podszywania sie`)
        continue
      }
      if (asBrowser.ok) {
        holds += 1
        answers.push(`${crawler.name} bylo ${crawler.status}, dzis ${got.status}`)
        continue
      }
    }
    stale += 1
    answers.push(`${crawler.name} bylo ${crawler.status}, dzis ${got.status}`)
    toRead.push(
      `${row.domain} / ${crawler.name}: bylo ${crawler.status}, dzis ${got.status}` +
        (asBrowser.ok ? ' - crawler dzis wchodzi' : `, a przegladarka dostaje ${asBrowser.status}, wiec to nie jest zdanie o crawlerach`),
    )
  }
  if (answers.length === 0) {
    console.log(`  bez odpowiedzi   ${row.domain}`)
    continue
  }
  console.log(`  przegladarka ${String(asBrowser.status).padEnd(3)}  ${answers.join('; ')}  ${row.domain}`)
}

console.log(`\npary wiersz-crawler: ${holds} potwierdzonych, ${stale} nieodtworzonych, ${blurred} nierozstrzygalnych, ${silent} bez odpowiedzi`)
for (const crawler of NAMED_CRAWLERS) {
  const tally = spoof.get(crawler.name)!
  const share = spoofShareOf(crawler.name)
  console.log(
    `  ${crawler.name.padEnd(13)} podszycie na wierszach BEZ zarzutu: ${tally.refused}/${tally.tried}` +
      `${share === null ? ' (nic nie doszlo)' : ` (${Math.round(share * 100)}%)`}` +
      `${tellsUsNothing(crawler.name) ? '  <- ta nazwa NIE MIERZY dzis polityki vendora' : ''}`,
  )
}
if (NAMED_CRAWLERS.some((crawler) => tellsUsNothing(crawler.name))) {
  console.log(
    '\nUWAGA: dla nazwy oznaczonej wyzej podszycie leci odmowa rowniez tam, gdzie niczego nie zarzucamy.\n' +
      'Dla niej mierzymy wykrywanie podszywania sie, a nie polityke vendora wobec tej nazwy, i zdanie na\n' +
      'karcie potrzebuje zastrzezenia, zanim ktokolwiek przeczyta je jako zarzut.',
  )
}
console.log(toRead.length === 0 ? '\nnic do przeczytania recznie' : `\n${toRead.length} MIEJSC do przeczytania recznie:`)
for (const line of toRead) console.log(`  ${line}`)
