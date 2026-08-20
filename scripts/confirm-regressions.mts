import { MongoClient } from 'mongodb'
import type { Scorecard } from '../src/lib/score'
import { AGENT_UA, CONTACT } from '../src/lib/scan/http'
import type { Report } from '../src/lib/store'
import { refuseIfNothingMeasured } from './nothing-measured'
import { compareLatestSeeded, type WorseVerdict } from './regressions.mjs'

const BASE = process.env.BASE ?? 'https://letagentsin.com'
const TOKEN = process.env.STACKPICK_CONSOLE_TOKEN ?? ''

type ScanResult = { scorecard?: Scorecard; saved?: boolean; truncation?: unknown; error?: string }
let confirmed = 0
let vanished = 0
let unchecked = 0

function printVerdict(row: WorseVerdict, scorecard: Scorecard): void {
  const fresh = scorecard.checks.find((check) => check.id === row.check)
  if (!fresh) {
    console.log(`${row.domain}  ${row.check}  NIE SPRAWDZONE: brak checku w swiezym scorecard`)
    unchecked += 1
    return
  }
  const reproduced = fresh.points < row.from
  if (reproduced) confirmed += 1
  else vanished += 1
  console.log(
    `${row.domain}  ${row.check}  ${row.from} -> ${row.to} -> ${fresh.points}   ${reproduced ? 'POTWIERDZONE' : 'ZNIKNELO'}`,
  )
}

async function main(): Promise<void> {
  if (!process.env.MONGODB_URI) {
    console.log('MONGODB_URI nie jest ustawione, wiec nie ma z czym porownac. Uruchom:')
    console.log(
      '  MONGODB_URI=$(heroku config:get MONGODB_URI -a stackpick) STACKPICK_CONSOLE_TOKEN=$(heroku config:get STACKPICK_CONSOLE_TOKEN -a stackpick) npm run confirm-regressions',
    )
    return
  }
  if (!TOKEN) {
    console.error('brak tokenu konsoli: ustaw STACKPICK_CONSOLE_TOKEN')
    console.error('  STACKPICK_CONSOLE_TOKEN=$(heroku config:get STACKPICK_CONSOLE_TOKEN -a stackpick) npm run confirm-regressions')
    process.exitCode = 2
    return
  }

  const client = new MongoClient(process.env.MONGODB_URI)
  await client.connect()
  const reports = client.db(process.env.MONGODB_DB ?? 'stackpick').collection<Report & { seeded?: boolean }>('reports')
  const { worse, compared, withoutBaseline } = await compareLatestSeeded(reports, process.env.SWEEP_STARTED_AT)
  await client.close()

  refuseIfNothingMeasured(compared, 'domen z dwoma pomiarami')
  console.log(`${compared} domen z dwoma pomiarami do porownania`)
  console.log(`${withoutBaseline} domen bez pomiaru sprzed przemiatu`)
  if (worse.length === 0) {
    console.log('Brak gorszych werdyktow do potwierdzenia.')
    return
  }

  const byDomain = Map.groupBy(worse, (row) => row.domain)
  console.log('\ndomena  check  przed -> po przemiecie -> po reskanie  wynik')
  let domainIndex = 0
  for (const [domain, rows] of byDomain) {
    if (domainIndex > 0) await new Promise((resolve) => setTimeout(resolve, 5_000))
    domainIndex += 1

    let result: ScanResult | undefined
    let failure = ''
    try {
      const response = await fetch(`${BASE}/api/scan`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `stackpick_console=${TOKEN}`,
          'user-agent': AGENT_UA,
          from: CONTACT,
        },
        body: JSON.stringify({ domain }),
        signal: AbortSignal.timeout(120_000),
      })
      result = (await response.json()) as ScanResult
      if (!response.ok) failure = result.error ?? `HTTP ${response.status}`
      else if (result.saved === false) failure = 'scan wykonany, ale NIE ZAPISANY'
      else if (result.truncation) failure = 'scan niepelny (limit czasu)'
      else if (!result.scorecard) failure = 'odpowiedz bez scorecard'
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error)
    }

    if (failure || !result?.scorecard) {
      for (const row of rows) {
        console.log(`${domain}  ${row.check}  ${row.from} -> ${row.to} -> ?   NIE SPRAWDZONE: ${failure || 'scan nie doszedl do skutku'}`)
      }
      unchecked += rows.length
      continue
    }
    for (const row of rows) printVerdict(row, result.scorecard)
  }

  const checked = confirmed + vanished
  const share = checked === 0 ? 'n/a' : `${Math.round((vanished / checked) * 100)}%`
  console.log(
    `\nPotwierdzone: ${confirmed}. Zniknelo: ${vanished}. Nie sprawdzone: ${unchecked}. Udzial znikajacych: ${share}.`,
  )
  console.log('Werdykt, ktory zniknal po pojedynczym reskanie, byl skutkiem naszego obciazenia, nie zmiany vendora.')
  // Kod wyjscia mowi o POKRYCIU, nie o tym, czy znalezlismy regres: wygasly token, padniete API
  // albo odpowiedz nie do przeczytania zostawiaja wiersz nieznany, a zdanie powyzej brzmi wtedy jak
  // wynik (codex, dwa razy: najpierw o calkowitej awarii, potem o czesciowej).
  if (unchecked > 0) {
    console.error(
      checked === 0
        ? `\nZADEN z ${unchecked} wierszy nie zostal sprawdzony - ten przebieg NIE MOWI NIC o regresach.`
        : `\n${unchecked} wierszy zostalo BEZ sprawdzenia - o nich ten przebieg nie mowi nic, przeczytaj liste powyzej.`,
    )
    process.exitCode = 1
  }
}

await main()
