/**
 * What we are about to let onto this machine, before an agent is pointed at somebody's product.
 *
 *   npx tsx scripts/audit-gate.mts <domain>
 *
 * A build run installs the vendor's package, connects to their MCP server and follows their
 * documentation, which is third-party code executing with whatever the operator's shell can reach.
 * The scan half is safe by construction: it fetches text and never runs anything. This half is not,
 * and until now nothing said so out loud before a run started.
 *
 * It refuses nothing on its own. A gate that blocks silently teaches people to skip it; this one
 * prints what will execute, what the registry says about the domain, and where a person has to look
 * before saying yes. The isolation is the mitigation (harness/sandbox), this is the disclosure.
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { assertPublicHost, BlockedTargetError } from '../src/lib/scan/guard'
import { normalizeDomain } from '../src/lib/scan/discover'
import { getStore } from '../src/lib/store'
import { AGENT_UA, CONTACT } from '../src/lib/scan/http'

const given = process.argv[2]
if (!given) {
  console.error('usage: npx tsx scripts/audit-gate.mts <domain>')
  process.exit(2)
}
const domain = normalizeDomain(given)

/** Days since the registry says the name was created, or null when the registry does not say. */
async function ageInDays(of: string): Promise<{ days: number | null; status: string[] }> {
  try {
    const answer = await fetch(`https://rdap.org/domain/${of}`, {
      headers: { 'user-agent': AGENT_UA, from: CONTACT, accept: 'application/rdap+json' },
      redirect: 'follow',
      signal: AbortSignal.timeout(12_000),
    })
    if (!answer.ok) return { days: null, status: [] }
    const body = (await answer.json()) as { events?: { eventAction: string; eventDate: string }[]; status?: string[] }
    const created = body.events?.find((event) => event.eventAction === 'registration')?.eventDate
    if (!created) return { days: null, status: body.status ?? [] }
    return { days: Math.floor((Date.now() - Date.parse(created)) / 86_400_000), status: body.status ?? [] }
  } catch {
    return { days: null, status: [] }
  }
}

const say = (label: string, detail: string) => console.log(`  ${label.padEnd(22)} ${detail}`)
const flags: string[] = []

console.log(`\nbrama przed audytem: ${domain}\n`)

try {
  await assertPublicHost(domain)
  say('rozwiazuje sie', 'publicznie, poza zakresami prywatnymi')
} catch (error) {
  const why = error instanceof BlockedTargetError ? error.message : String(error)
  say('rozwiazuje sie', `NIE: ${why}`)
  console.log('\nSTOP. Skaner tez by tego nie tknal, a audyt tym bardziej nie ma czego mierzyc.\n')
  process.exit(1)
}

const { days, status } = await ageInDays(domain)
// Ninety days is not a rule about danger, it is the line above which a name is old enough that
// somebody would have noticed. Below it, a person looks; nothing is refused for being young.
if (days === null) say('wiek w rejestrze', 'rejestr nie podaje daty rejestracji')
else {
  say('wiek w rejestrze', `${days} dni`)
  if (days < 90) flags.push(`domena ma ${days} dni, czyli mniej niz kwartal`)
}
const alarming = status.filter((one) => /hold|pendingDelete|clientTransferProhibited$|inactive/i.test(one) && !/clientTransferProhibited/i.test(one))
if (status.length > 0) say('status w rejestrze', status.join(', '))
if (alarming.length > 0) flags.push(`rejestr oznacza domene: ${alarming.join(', ')}`)

say('w naszym korpusie', CURATED_DOMAINS.has(domain) ? 'tak, skanowana cyklicznie od dawna' : 'nie, pierwszy kontakt')

// The executable surface, read from the scan we already hold rather than by asking again. This is
// the part that matters: these are the three ways a build run gets somebody else's code running.
const report = await getStore().latestForDomain(domain)
if (!report) {
  say('co sie wykona', 'brak skanu, uruchom `npm run scan` zanim odpalisz agenta')
  flags.push('nie mamy skanu tej domeny, wiec nie wiemy, co audyt zainstaluje')
} else {
  // Field names read from `FunnelFindings`, not guessed: the first version asked for
  // `funnel.mcp.endpoint`, which does not exist, so the gate quietly reported "no MCP server" for
  // every domain that has one. A disclosure that always says "nothing here" is worse than none.
  const findings = report.findings as unknown as {
    funnel?: { mcpEndpoints?: { url: string }[] }
    discovered?: { npmPackage?: string | null }
  }
  const pkg = findings.discovered?.npmPackage ?? null
  const mcp = (findings.funnel?.mcpEndpoints ?? []).map((endpoint) => endpoint.url)
  say('paczka npm', pkg ? `${pkg} - zainstaluje sie i wykona swoje skrypty` : 'zadnej nie znalezlismy')
  say('serwery MCP', mcp.length > 0 ? mcp.join(', ') : 'zadnego nie znalezlismy')
  if (pkg) flags.push(`audyt zainstaluje ${pkg}: przejrzyj jego skrypty postinstall przed uruchomieniem`)
  for (const url of mcp) flags.push(`audyt polaczy sie z ${url}: opisy narzedzi to tekst, ktoremu agent ufa, czyli wektor wstrzykniecia`)
}

console.log('')
if (flags.length === 0) {
  console.log('Nic nie wymaga decyzji czlowieka. Uruchom bieg w piaskownicy: harness/sandbox/run.sh\n')
  process.exit(0)
}
console.log('DO SPRAWDZENIA PRZEZ CZLOWIEKA:')
for (const flag of flags) console.log(`  - ${flag}`)
console.log('\nBieg i tak idzie w piaskownicy (harness/sandbox/run.sh), nigdy na maszynie z naszymi kluczami.\n')
process.exit(0)
