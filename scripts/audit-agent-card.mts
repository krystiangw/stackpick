/**
 * How many vendors actually serve the file AR-CAPA-04 names.
 *
 *   npx tsx scripts/audit-agent-card.mts [co-ktora]
 *
 * `/standard` published "11 of 177" once, counted out of stored findings, and a probe of 59 domains
 * spread across the corpus found none at all. A rate of 11 in 177 would have put about four in that
 * sample, so the stored count was measuring something else and the sentence went out wrong. What is
 * published now is this: a direct request to the address the standard names, repeatable by anybody.
 *
 * Every third domain by default, so the sample crosses categories instead of sitting in one. A host
 * that refuses to answer is not a host without a card and is not counted either way.
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { AGENT_UA } from '../src/lib/scan/http'
import { answersWithTheSameTemplate } from '../src/lib/scan/funnel'
import { howManyRows } from './how-many'

/** A path nobody registers, used as each site's own control for what "not found" looks like there. */
const NONSENSE = 'letagentsin-control-9f2c'

const everyNth = howManyRows(3)
const all = [...CURATED_DOMAINS]
const sample = all.filter((_, index) => index % everyNth === 0)

/** An A2A card names itself and says what it can do. `{}` with a 200 on it is not a card. */
function looksLikeACard(body: string): boolean {
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return false
    const named = typeof parsed.name === 'string' && parsed.name.length > 0
    const describes = 'url' in parsed || 'skills' in parsed || 'capabilities' in parsed || 'protocolVersion' in parsed
    return named && describes
  } catch {
    return false
  }
}

const served: string[] = []
/** A definite absence: the host answered and said there is nothing there. */
const absent: string[] = []
/** Refused, timed out or answered something we cannot read as either. Counted in no direction. */
const unclear: string[] = []

for (const domain of sample) {
  try {
    const answer = await fetch(`https://${domain}/.well-known/agent-card.json`, {
      headers: { 'user-agent': AGENT_UA, from: 'hello@letagentsin.com' },
      signal: AbortSignal.timeout(8000),
    })
    if (answer.status === 404 || answer.status === 410) {
      absent.push(domain)
      continue
    }
    if (!answer.ok) {
      unclear.push(`${domain} (${answer.status})`)
      continue
    }
    const body = await answer.text()
    if (looksLikeACard(body)) {
      served.push(domain)
      continue
    }
    // A 200 carrying a challenge marker is a wall, not an answer. The scanner reads the same three
    // headers, and without this a bot gate that returns 200 would be recorded as "they have no
    // card", which is the accusation this whole probe exists to avoid making.
    const mitigated = `${answer.headers.get('cf-mitigated') ?? ''} ${answer.headers.get('x-vercel-mitigated') ?? ''}`
    if (/challenge/i.test(mitigated) || answer.headers.has('x-vercel-challenge-token')) {
      unclear.push(`${domain} (200 z wyzwaniem)`)
      continue
    }
    // An absence is only established against the site's own control. HTML at a `.json` address is
    // usually the soft 404 every framework serves, and is sometimes a login wall or a bot gate that
    // carries no header we recognise. So we ask for a path nobody could have registered: an answer
    // identical in shape to that one is the catch-all, and the file is genuinely not there. The
    // scanner does the same thing for the same reason, and this probe is quoted on a public page.
    const control = await fetch(`https://${domain}/.well-known/${NONSENSE}.json`, {
      headers: { 'user-agent': AGENT_UA, from: 'hello@letagentsin.com' },
      signal: AbortSignal.timeout(8000),
    }).catch(() => null)
    if (!control) {
      unclear.push(`${domain} (kontrolka bez odpowiedzi)`)
      continue
    }
    if (control.status === 404 || control.status === 410) {
      // The control is absent and the card address answered 200 with something we cannot read.
      // That is a page standing where a file should be, not a file we failed to parse.
      unclear.push(`${domain} (200, nie do odczytania)`)
      continue
    }
    const controlBody = await control.text()
    // The scanner's own comparison, imported rather than reimplemented. Same status and the same
    // document once paths, nonces and build ids are taken out: a login page and a soft 404 are both
    // HTML of similar length, and only the template test tells them apart.
    const sameStatus = control.status === answer.status
    // A site whose whole well-known namespace sits behind a login answers both paths with the same
    // page, and the template test cannot tell that from a soft 404. It is a wall either way, so it
    // says nothing about the card and belongs in neither column.
    const wall = /sign in|log in|logg?ing in|access denied|forbidden|unauthorized/i.test(body.slice(0, 2000))
    if (wall) unclear.push(`${domain} (200 za sciana logowania)`)
    else if (sameStatus && answersWithTheSameTemplate(body, controlBody)) absent.push(domain)
    else unclear.push(`${domain} (200, nie do odczytania)`)
  } catch {
    unclear.push(`${domain} (bez odpowiedzi)`)
  }
}

const answered = served.length + absent.length
console.log(`\n${served.length} z ${answered} hostow, ktore odpowiedzialy, serwuje karte pod /.well-known/agent-card.json`)
if (served.length > 0) console.log(`  ${served.join(', ')}`)
console.log(`${unclear.length} z ${sample.length} zapytanych nie dalo jednoznacznej odpowiedzi i nie liczy sie w zadna strone`)
if (unclear.length > 0) console.log(`  ${unclear.join(', ')}`)
