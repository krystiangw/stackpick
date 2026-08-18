import { readFileSync, readdirSync } from 'node:fs'
import { createHmac } from 'node:crypto'
import { paddle } from '../src/lib/billing/provider'
import { CATEGORIES, CURATED_DOMAINS } from '../src/lib/categories'
import { overDomainBudget } from '../src/lib/scan-gate'
import { spreadAcrossHints } from '../src/lib/scan'
import { aboutTheirOwnCode, categoryForJob } from '../src/lib/lookup'
import { pickHeadline } from '../src/lib/headline'
import { FRESH_QUESTIONS, HELD_OUT_2, HELD_OUT_3, HELD_OUT_4, HELD_OUT_5, HELD_OUT_6, HELD_OUT_7 } from './routing-questions'
import { crawlDelayForAgents, parseRobots } from '../src/lib/scan/robots'
import { thinnerForAgents } from '../src/lib/scan'
import { declaredSpecs } from '../src/lib/scan/machine'
import { changesBetween, comparableScorecards, rulesChangedBetween, turnedAwayAtTheEdge, worthTelling } from '../src/lib/watch'
import { isOlderThan } from '../src/lib/formula'
import { buildFixPlan } from '../src/lib/fixfirst'
import { changeEmail } from '../src/lib/watch-email'
import { CHECKS, FORMULA_VERSION } from '../src/lib/score'
import { CORPUS_LICENCE, CORPUS_LICENCE_IS_PUBLISHED } from '../src/lib/seller'
import { arithmeticExplained, scoreSection } from '../src/lib/report-numbers'
import { categoryOfWatch } from '../src/lib/watch'
import { readWithGuest } from '../src/lib/guest-cell'
import { PER_CALLER_PER_HOUR, PER_DOMAIN_PER_HOUR } from '../src/lib/scan-gate'
import { DEFAULT_SCAN_BUDGET_MS } from '../src/lib/scan/http'
import { forStorage } from '../src/lib/store'
import { REMEDIES } from '../src/lib/fixfirst'
import { ERRATA, erratumFor } from '../src/lib/errata'
import { FLEX_QUOTA_MB, quotaEmail, verdictFor } from '../src/lib/quota'
import { sawRateLimit, otherDomainsNamed } from '../src/lib/corpus'
import { isEdgeRefusal, hintRank, CREDENTIAL_PAGE_HINTS, confirmedRefusals } from '../src/lib/scan'
import { wasNeverAsked } from '../src/lib/scan/http'
import { brandTaken, certain, mentionsIn, nameGuest, quotedAbout, whoWentFirst, wordsCarried } from '../src/lib/vendors'
import { licenceGateQuotes, readSnippet, rendersUsableForm, entersThroughIdentityProvider, mcpCandidates, looksLikeADocsPageTwin, answersWithTheSameTemplate, readsAsAnEndpoint, readsAsTheirOwnAddress } from '../src/lib/scan/funnel'
import { SIGNUP_HINTS, NOT_WHERE_ACCOUNTS_ARE_MADE, bestReadable, routeUrl } from '../src/lib/scan/discover'
import {
  methodRefusalIsRouted,
  provisioningMatches,
  BOT_DEFENCE_RULES,
  PROVISIONING_RULES,
  SELF_SERVE_PATTERNS,
  describesAProcedure,
  everyFreeSignalIsAButton,
  everyFreeSignalIsAQuestion,
} from '../src/lib/scan/funnel'

// Ceny dostawcy przychodza ze srodowiska, a bez nich katalog nie rozpoznaje zadnej ceny i cala
// sciezka przyznawania uprawnien jest nietestowana. Ustawiane TUTAJ, a nie w skrypcie npm: build
// wola `tsx scripts/rules.mts` wprost, wiec straznik zalezny od sposobu wywolania przechodzil
// lokalnie i wywracal deploy.
process.env.BILLING_PRICE_WATCH_MONTHLY ??= 'pri_watch'
process.env.BILLING_PRICE_REPORT_ONE ??= 'pri_report'
const { CATALOG, MONITORING_IS_FREE, priceOf, skuById, skusForPrices, unmatchedPrices } = await import('../src/lib/billing/catalog')

/**
 * The scanner's rules against sentences we wrote on purpose, half of which must match and half of
 * which must not.
 *
 * Every rule in here was verified by hand in a shell on the night it shipped, and none of that
 * was repeatable by anybody else, including me a week later. The cloaking rule is the reason this
 * file exists: it backs a published null result, "0 of 170 vendors serve an agent less text than
 * a browser", and until today nothing had ever shown it capable of saying yes. A rule that can
 * only say no produces that headline whether or not the world agrees.
 */

type Case = [text: string, expected: boolean]

const asPage = (chars: number) => ({ ok: true, status: 200, url: 'https://example.test', body: `<p>${'x '.repeat(chars / 2)}</p>`, headers: {}, statusesSeen: [200] })

let failures = 0
const check = (name: string, got: unknown, want: unknown) => {
  if (got === want) return
  failures += 1
  console.log(`  ZLE  ${name}: dostalem ${String(got)}, oczekiwane ${String(want)}`)
}

console.log('cloaking, czyli czy ta reguła w ogóle umie powiedzieć tak')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const thinner = (browser: number, agent: number) => thinnerForAgents(asPage(browser) as any, asPage(agent) as any)
check('połowa treści dla agenta', typeof thinner(8000, 2000) === 'number', true)
check('ta sama treść', thinner(8000, 8000), null)
check('agent dostaje więcej', thinner(8000, 12000), null)
// The floor exists so a thin page cannot swing the ratio; without it a 300-character stub that
// renders 100 for an agent would be published as cloaking.
check('strona poniżej progu 2000 znaków', thinner(1000, 100), null)
// The threshold is a drop of more than half, so 45 percent thinner is still published as fine.
// That is a real limit of the null result on /findings and not an accident of this fixture.
check('spadek o 45 procent nie wystarcza', thinner(8000, 4400), null)

console.log('provisioning, czyli panel kontra ścieżka programowa')
const provisioning: Case[] = [
  ['To create an API key, send a POST request to /v1/api_keys', true],
  ['Use the Management API to create a personal access token', true],
  ['The access tokens API allows you to create access tokens programmatically', true],
  ['can create and manage API keys on your behalf when you install their integration', true],
  ['Create an API key with the CLI', true],
  ['curl -X POST https://api.example.com/keys creates an api key', true],
  ['Go to Settings and click Generate key. This creates an API key.', false],
  ['Create an API key from the Amplitude UI under Organization settings', false],
  ['only the Site admin or the site owner can create the API keys', false],
  ['Creating a new API token. Click on the Create new API Token button.', false],
  ['Programmatically Creating Cron Triggers', false],
  ['creating projects and retrieving usage data programmatically', false],
  ['create a customer with an api key', false],
]
for (const [text, expected] of provisioning) {
  check(`"${text.slice(0, 52)}"`, PROVISIONING_RULES.some((rule) => rule.test(text)), expected)
}

// The spellings an audit of our own failures found us blind to, each with the vendor it came
// from, and the dashboard sentences from the same audit that must stay out.
const widerProvisioning: Case[] = [
  ['Create a signing key with POST /system/v1/signing-keys', true],
  ['tigris access-keys create returns the key ID and secret. Use the CLI to create an access key.', true],
  // Withdrawn rather than fixed. The pattern that caught this also caught a documentation
  // sidebar where "Creating and managing access tokens" and "Mapbox Tokens API" are two
  // adjacent menu items, because SAME_SENTENCE stops at ". " and stripped navigation has none.
  // A verdict whose evidence is a nav menu is one the vendor cannot reproduce.
  ['Use the Tokens API to create, list, update, and delete tokens programmatically', false],
  ["Use NerdGraph's ApiAccess field to programmatically create and manage license keys", true],
  ['Set the access_token returned by POST /auth/login', false],
  // The name of an API is not a path to a key. Each of these would have earned two points on
  // the strength of a sidebar link before the pattern required a creation verb beside it.
  ['Rate limits for the Tokens API are documented below.', false],
  ['Send your client ID and secret to the Token API to obtain an access token.', false],
  ['Create your API key in the dashboard. The Credentials API is read-only.', false],
  ['Creating and managing access tokens Mapbox Account Dashboard Mapbox Tokens API Rotating access tokens', false],
  ['To create a new sites API key, log in to your account and click the New API Key button.', false],
  ['use the Qdrant Cloud Console to create a Database API key for a cluster', false],
  ['This can be generated in the Data Studio within the user page', false],
  // "Self-service accounts" is a person signing themselves up, which is the opposite of a
  // credential a machine can be issued. It gave auth0.com two points from a comparison table.
  ['Recommended use Self-service accounts, testing scenarios Enterprise, production environments', false],
  ['self service account holders can reset their own password', false],
  // The real one still counts, in both spellings.
  ['Create a service account and grant it the roles it needs', true],
  // Hyphenated spelling has never matched. Left alone again in 9.32, which was the pass that could
  // finally measure a change here: the stored quotes only cover phrases that already fired, so a
  // WIDENING is the one kind of change they cannot price. This sentence is also the reason not to
  // widen it naively - a key you use to authenticate is one you were given, not one you can make.
  ['Use a service-account key to authenticate the job', false],
]
for (const [text, expected] of widerProvisioning) {
  check(`"${text.slice(0, 52)}"`, PROVISIONING_RULES.some((rule) => rule.test(text)), expected)
}

console.log('free tier, czyli przycisk kontra zdanie o cenniku')
const buttonOnly: Case[] = [
  ['Get started for free', true],
  ['Start free trial', true],
  ['14 day free trial, no card required', false],
  ['The Starter plan is Free forever', false],
]
const FREE = [/\bfree trial\b/i, /\bget started\b[\s-]*(?:for\s+)?free\b/i, /\bstarter\b[^.\n]{0,24}\bfree\b/i, /free forever/i, /\bno card\b/i]
for (const [text, expected] of buttonOnly) {
  check(`"${text}"`, everyFreeSignalIsAButton(FREE, text), expected)
}

console.log('free tier, czyli pytanie kontra odpowiedź')
const asked: Case[] = [
  // Both real cases: a collapsed FAQ accordion whose HTML carries the question and no answer.
  ['Frequently Asked Questions Do you offer a free trial? How does company billing work?', true],
  ['How does Xata reduce my cloud costs? Is there a free tier? Can I start on SaaS?', true],
  // The answer says the words again outside the question, so the page keeps its point without
  // anything here having to parse the answer.
  ['Is there a free tier? Yes, our free tier covers 10,000 requests a month.', false],
  // A pricing table has no punctuation at all, so the next question mark can be a screen away.
  // Both of these were read as questions before the rule required an opener in front of the words.
  ['Flexible pricing Enterprise options Sandbox Free Sign up Messages per day 200k Need a plan?', false],
  ['Directory Sync User provisioning and role mapping Get started $0 / month Need a plan that fits?', false],
  ['The Starter plan is Free forever', false],
]
// The real pattern list here, not the short fixture above, because two of these cases are the
// literal table text from pusher.com and workos.com and they only matter against the patterns
// that actually matched them.
for (const [text, expected] of asked) {
  check(`"${text.slice(0, 52)}"`, everyFreeSignalIsAQuestion(SELF_SERVE_PATTERNS, text) !== null, expected)
}

console.log('punkt wejścia, czyli procedura kontra jedno słowo, które znaczy co innego')
const pad = (text: string) => `${text}\n${'Weaviate is an open-source vector database. '.repeat(12)}`
const procedure: Case[] = [
  ['Get your API key from the dashboard, then set the base URL to https://api.example.com', true],
  // Both real files, in the words that decided them. `endpoint` on neon.com/skill.md is a Postgres
  // host and `curl ` on pinecone.io/agents.md is an install script inside an index of links.
  ['Each branch has its own compute endpoint, and branches are copy-on-write clones.', false],
  ['**CLI** `curl -fsSL https://pinecone.io/install.sh | sh` **MCP** `npx -y @pinecone-io/mcp`', false],
  ['Use API-key or OIDC authentication. ## Credentials Typical clients require WEAVIATE_URL.', true],
  ['This page intentionally contains no operational guidance for agents or merchants.', false],
]
for (const [text, expected] of procedure) {
  check(`"${text.slice(0, 52)}"`, describesAProcedure(pad(text)), expected)
}
// The floor is on length and nothing else, so a one-line file naming two things is still not a
// procedure a machine can follow.
check('za krótki plik mimo dwóch sygnałów', describesAProcedure('Get an API key and POST https://a.test'), false)

console.log('deklarowany spec, czyli co strona mowi o sobie sama')
const declaredAt = (body: string, link = '') =>
  declaredSpecs({ url: 'https://vendor.test/api/docs', body, headers: link ? { link } : {} })
    .map((found) => `${found.rel} ${found.url}`)
    .join(' | ')
// RFC 8631: the relation that means "the machine description of this". Porkbun sends it as a
// header and repeats it in the head; either one alone has to be enough.
check(
  'naglowek Link z describedby',
  declaredAt('', '<https://vendor.test/spec>; rel="describedby"'),
  'describedby https://vendor.test/spec',
)
check(
  'service-desc w head, sciezka wzgledna',
  declaredAt('<link rel="service-desc" href="/v3/spec">'),
  'service-desc https://vendor.test/v3/spec',
)
// The reason "alternate" cannot count on its own: every localised page on the web declares one,
// and admitting them would have handed the point to docs.github.com for publishing Spanish.
check('alternate z hreflang to nie spec', declaredAt('<link rel="alternate" hrefLang="es" href="/es/rest">'), '')
check(
  'alternate liczy sie tylko z typem json i slowem spec',
  declaredAt('<link rel="alternate" type="application/json" title="OpenAPI spec" href="/api/spec">'),
  'alternate https://vendor.test/api/spec',
)
check('alternate json bez slowa spec', declaredAt('<link rel="alternate" type="application/json" href="/feed.json">'), '')
// Only schemes we can actually request. Writing this case is what found the hole: a javascript:
// href resolves without complaint and would have been handed to fetchUrl.
check('href z innym schematem', declaredAt('<link rel="service-desc" href="javascript:alert(1)">'), '')
// A broken href must not take the scan down with it; it resolves to a URL that then fails to
// confirm, which is the same outcome by a cheaper route.
check('href ktorego nie da sie rozwiazac', declaredAt('<link rel="service-desc" href="http://[bad">'), '')

console.log('crawl-delay, czyli czyja grupa obowiązuje')
const delay = (body: string) => crawlDelayForAgents(parseRobots(body))
check('wildcard bez nazwanych botów', delay('User-agent: *\nCrawl-delay: 10'), 10)
check(
  'opoznienie stoi przy nazwanym bocie, nie przy wildcardzie',
  delay('User-agent: *\nAllow: /\n\nUser-agent: GPTBot\nCrawl-delay: 5'),
  5,
)
// Its own group does not exempt an agent while the other twelve still inherit the wildcard, which
// is why resolving this per agent per RFC 9309 changed no row: the maximum is the same number.
check(
  'wlasna grupa jednego bota nie znosi wildcarda',
  delay('User-agent: *\nCrawl-delay: 10\n\nUser-agent: ChatGPT-User\nAllow: /'),
  10,
)
// A delay under somebody else's group is not ours to publish. stripe.com writes one for rogerbot.
check('opoznienie dla obcego bota', delay('User-agent: rogerbot\nCrawl-delay: 10'), null)

console.log('bot defence, czyli warstwa raportowana obok werdyktu, nie punktowana')
const defence: Case[] = [
  ['<script>window.KPSDK.configure(x)</script>', true],
  ['<script src="https://js.datadome.co/tags.js"></script>', true],
  ['<div class="captcha-placeholder"></div>', false],
  ['kaskada is a river in Poland', false],
]
for (const [text, expected] of defence) {
  check(`"${text.slice(0, 46)}"`, Object.values(BOT_DEFENCE_RULES).some((rule) => rule.test(text)), expected)
}

console.log('trasowanie, czyli czy opis narzędzia MCP nadal mówi prawdę')
// The description quotes four numbers from the held-out set. They were true when written, and so
// was "16 right out of 20" before it: a number in prose next to a number in a script drifts the
// moment somebody edits the vocabulary, and nothing notices until a reader does.
let right = 0
let silent = 0
let wrongCategory = 0
let shouldHaveRefused = 0
let answered = 0
for (const question of HELD_OUT_7) {
  const got = categoryForJob(question.asked)?.id ?? null
  if (got !== null) answered += 1
  if (got === question.expect) right += 1
  else if (got === null) silent += 1
  else if (question.expect === null) shouldHaveRefused += 1
  else wrongCategory += 1
}
// The own-code rule is only allowed to take answers away from questions that should not have had
// one. Silencing a real buying question is worse than the wrong answers it prevents, so this asks
// every question anybody has ever written down, across all six sets.
const everyQuestion = [...FRESH_QUESTIONS, ...HELD_OUT_2, ...HELD_OUT_3, ...HELD_OUT_4, ...HELD_OUT_5, ...HELD_OUT_6, ...HELD_OUT_7]
const silencedARealOne = everyQuestion.filter((question) => question.expect !== null && aboutTheirOwnCode(question.asked))
check('regula o wlasnym kodzie nie ucisza pytan zakupowych', silencedARealOne.map((q) => q.asked.slice(0, 40)).join(' | '), '')

const described = readFileSync('src/app/mcp/route.ts', 'utf8')
const quoted = (pattern: RegExp) => Number(described.match(pattern)?.[1] ?? -1)
check('pytań w zestawie odłożonym', HELD_OUT_7.length, quoted(/Measured on (\d+) questions written by an agent/))
check('odpowiedzi poprawnych', right, quoted(/It got (\d+) of the 40 right/))
check('milczeń tam, gdzie należało odpowiedzieć', silent, quoted(/said nothing on (\d+) it should have answered/))
check('złych kategorii', wrongCategory, quoted(/sent (\d+) to the wrong category/))
check('odpowiedzi tam, gdzie należało odmówić', shouldHaveRefused, quoted(/answered (\d+) that it should have refused/))
check('udzielonych odpowiedzi', answered, quoted(/it gave an answer to (\d+) of the/))
check('złych odpowiedzi razem', wrongCategory + shouldHaveRefused, quoted(/and (\d+) of those answers were wrong/))

// A number typed into a client component, because importing CHECKS there drags the scan chain and
// node:dns into the browser bundle. It said fourteen while there were fifteen, so the guard is the
// build rather than the import.
const limitReached = readFileSync('src/components/limit-reached.tsx', 'utf8')
check('liczba checkow w ekranie limitu', Number(limitReached.match(/Same (\d+) checks/)?.[1] ?? -1), CHECKS.length)

// Liczby szostego badania byly wpisane w akapity i reseed 2026-08-17 ruszyl cztery z nich, dwie
// odwracajac znak: strona twierdzila "minus trzy wsrod reszty" o luce, ktora dane mialy juz na
// plus dziesiec, a straznik obok przechodzil, bo pilnuje kierunku i nie umie czytac zdania.
const findingsSource = readFileSync('src/app/findings/page.tsx', 'utf8')
check('szoste badanie jest liczone, nie wpisane', findingsSource.includes('namedResult(buildStudy('), true)

// Strony prawne nie moga sie opublikowac z pustym imprintem: dostawca platnosci porownuje nazwe
// w regulaminie z nazwa na koncie znak w znak, a niedokonczony regulamin na produkcji jest gorszy
// niz jego brak. Kazda z trzech ma odmawiac, dopoki dane sprzedawcy nie sa uzupelnione.
for (const page of ['terms', 'privacy', 'refunds']) {
  const source = readFileSync(`src/app/${page}/page.tsx`, 'utf8')
  check(`/${page} odmawia bez danych sprzedawcy`, source.includes('if (!SELLER_IS_COMPLETE) notFound()'), true)
}
const layout = readFileSync('src/app/layout.tsx', 'utf8')
check('stopka linkuje je dopiero wtedy', layout.includes('SELLER_IS_COMPLETE && ('), true)
// Licencja korpusu jest bramkowana osobno i z mocniejszego powodu: udzielenia licencji na dane juz
// opublikowane nie da sie cofnac, wiec nie moze sie wlaczyc razem z danymi sprzedawcy.
check(
  '/corpus-licence odmawia, dopoki grant nie jest potwierdzony',
  readFileSync('src/app/corpus-licence/page.tsx', 'utf8').includes('if (!CORPUS_LICENCE_IS_PUBLISHED) notFound()'),
  true,
)
// I nikt na nia nie wskazuje, dopoki odmawia. Link do wlasnej strony, ktora zwraca 404, to
// dokladnie ten blad, za ktory sami odejmujemy vendorom punkty.
for (const page of ['src/app/docs/page.tsx', 'src/app/report/page.tsx']) {
  const source = readFileSync(page, 'utf8')
  const mentions = source.includes('/corpus-licence')
  check(`${page}: link do licencji tylko za flaga`, !mentions || source.includes('CORPUS_LICENCE_IS_PUBLISHED ?'), true)
}
// Pliki statyczne nie znaja flagi, wiec w dniu wlaczenia licencji trzeba je poprawic recznie. Ten
// straznik chodzi w buildzie, a build na produkcji widzi produkcyjne zmienne: jesli grant jest
// wlaczony, a llms.txt albo agent-access.json nadal mowi tylko „with attribution", deploy staje.
if (CORPUS_LICENCE_IS_PUBLISHED) {
  for (const file of ['public/llms.txt', 'public/.well-known/agent-access.json']) {
    const told = readFileSync(file, 'utf8')
    check(`${file}: nazywa licencje`, told.includes(CORPUS_LICENCE.short), true)
    check(`${file}: i prowadzi do warunkow`, told.includes('/corpus-licence'), true)
  }
}

console.log('probka dokumentacji, czyli czy trzy strony to trzy pytania')
// Zmierzone na korpusie 2026-08-18: supabase.com przeczytal trzy strony o api-keys, a cloudinary.com
// dwa poradniki o kluczach w konsoli, podczas gdy strona documentation/provisioning_api, ktora
// dokumentuje tworzenie poswiadczen maszynowo, nie zmiescila sie w probce.
const supabaseLike = [
  'https://supabase.com/docs/guides/getting-started/api-keys',
  'https://supabase.com/docs/reference/cli/supabase-projects-api-keys',
  'https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys',
  'https://supabase.com/docs/guides/api/securing-your-api',
]
const spread = spreadAcrossHints(supabaseLike, 3)
// Regula brzmi: kazda obecna rodzina dostaje miejsce, zanim ktorakolwiek dostanie drugie. Przy
// dwoch rodzinach i trzech miejscach trzecie musi sie powtorzyc, wiec sprawdzamy obecnosc, nie limit.
check('strona spoza rodziny api-keys wchodzi do probki', spread.includes('https://supabase.com/docs/guides/api/securing-your-api'), true)
check('i wchodzi przed trzecia strona o api-keys', spread.indexOf('https://supabase.com/docs/guides/api/securing-your-api') < 2, true)
check('najlepiej oceniona strona zostaje pierwsza', spread[0], supabaseLike[0])
// Gdy rodzin jest mniej niz miejsc, budzet i tak ma byc wykorzystany.
check('brakujace miejsca dobiera sie z reszty', spreadAcrossHints(supabaseLike.slice(0, 3), 3).length, 3)
check('a pusta lista zostaje pusta', spreadAcrossHints([], 3).length, 0)

console.log('platnosci, czyli czy podpis i katalog trzymaja')
// Webhook przyznaje uprawnienia, wiec podpis musi umiec powiedziec NIE. Sekret wymyslony, konta nie
// trzeba: to jest ta czesc integracji, ktora da sie napisac i sprawdzic przed zalozeniem czegokolwiek.
const SECRET = 'whsec_test'
const at = 1_760_000_000
const body = JSON.stringify({
  event_type: 'transaction.completed',
  data: { id: 'txn_1', subscription_id: 'sub_1', custom_data: { domain: 'v.test', email: 'a@v.test' }, items: [{ price: { id: 'pri_report' } }] },
})
const signed = createHmac('sha256', SECRET).update(`${at}:${body}`).digest('hex')
const signatures = paddle(SECRET, () => at * 1000)
check('wlasciwy podpis przechodzi', signatures.verify(body, `ts=${at};h1=${signed}`), true)
check('podmieniona tresc nie', signatures.verify(`${body} `, `ts=${at};h1=${signed}`), false)
check('zly podpis nie', signatures.verify(body, `ts=${at};h1=${'0'.repeat(64)}`), false)
check('brak naglowka nie', signatures.verify(body, null), false)
// Powtorka sprzed godziny to darmowa subskrypcja, wiec okno jest czescia weryfikacji, nie dodatkiem.
check('podpis sprzed godziny nie', paddle(SECRET, () => (at + 3600) * 1000).verify(body, `ts=${at};h1=${signed}`), false)
// Przy rotacji sekretu Paddle wysyla po jednym h1 na sekret. Branie ostatniego odrzucaloby zadanie
// podpisane tym, ktory mamy. Znalezione przez codex review.
check('jeden z wielu h1 wystarczy', signatures.verify(body, `ts=${at};h1=${'0'.repeat(64)};h1=${signed}`), true)
check('ale zaden pasujacy to nadal nie', signatures.verify(body, `ts=${at};h1=${'0'.repeat(64)};h1=${'1'.repeat(64)}`), false)
check('timestamp, ktory nie jest liczba, nie', signatures.verify(body, `ts=jutro;h1=${signed}`), false)
// Zawezone do platnosci, bo `read` moze teraz zwrocic tez zdarzenie, ktorego nie da sie przypisac.
const paidFrom = (raw: string) => {
  const one = signatures.read(raw)
  return one && one.kind !== 'unreadable' ? one : null
}
check('zdarzenie czytamy na nasze slowa', paidFrom(body)?.kind, 'paid')
check('i niesie komu przyznac', paidFrom(body)?.email, 'a@v.test')
// Transakcja niesie WLASNE id i osobno id subskrypcji. Zapisanie tego pierwszego jako referencji
// znaczy, ze pozniejsze anulowanie nie trafia w nic, a monitoring zostaje platny na zawsze.
check('platnosc ma wlasna referencje, transakcje', paidFrom(body)?.paymentRef, 'txn_1')
// Odnowienie subskrypcji to nowa platnosc: gdyby referencja platnosci byla id subskrypcji, drugi
// miesiac wygladalby jak powtorka pierwszego i wpadlby w unikalny indeks. Codex review.
check('a subskrypcje nosi osobno', paidFrom(body)?.subscriptionRef, 'sub_1')
const canceled = paidFrom(JSON.stringify({ event_type: 'subscription.canceled', data: { id: 'sub_1', custom_data: { email: 'a@v.test' }, items: [{ price: { id: 'pri_watch' } }] } }))
check('anulowanie to osobne zdarzenie', canceled?.kind, 'subscription-ended')
check('i nazywa subskrypcje, ktora konczy', canceled?.subscriptionRef, 'sub_1')
check('zdarzenia, ktorego nie rozumiemy, nie ruszamy', signatures.read(JSON.stringify({ event_type: 'transaction.updated', data: { id: 't', custom_data: { email: 'a@v.test' }, items: [] } })), null)
// Uprawnienie idzie za cena, ktora naprawde obciazono, a nie za tym, co niesie checkout kupujacego.
check('nieznana cena nie daje niczego', skusForPrices(['pri_obcy']).length, 0)
check('pusta lista cen tez nie', skusForPrices([]).length, 0)
// Ceny dostawcy przychodza ze srodowiska, wiec bez nich katalog nie rozpoznaje NICZEGO i cala
// sciezka przyznawania uprawnien byla dotad nieprzetestowana. `npm run rules` ustawia dwie
// (pri_watch, pri_report), zeby dalo sie sprawdzic obie strony: co pasuje i co nie.
check('skonfigurowana cena rozwiazuje sie do swojego produktu', skusForPrices(['pri_watch']).map((sku) => sku.id).join(), 'watch-monthly')
check('dwie linie w jednej transakcji to dwa uprawnienia', skusForPrices(['pri_watch', 'pri_report']).length, 2)
// Transakcja z jedna cena znana i jedna nieznana: pytanie „czy cokolwiek pasuje" gubi ta druga,
// wiec obciazenie za nia zostaje potwierdzone bez sladu. Wytkniete przez codeksa.
check('nieznana linia jest widoczna obok znanej', unmatchedPrices(['pri_watch', 'pri_obcy']).join(), 'pri_obcy')
check('same znane linie to zero nieznanych', unmatchedPrices(['pri_watch']).length, 0)
// Platnosc bez adresu to jedyny przypadek, w ktorym 200 jest zla odpowiedzia: nie ma o kim zapisac
// sladu, wiec potwierdzenie zostawiloby prawdziwa oplate wylacznie w logu dyna. Znalezione przez
// codex przy pisaniu runbooka.
const noEmail = signatures.read(JSON.stringify({ event_type: 'transaction.completed', data: { id: 'txn_2', items: [{ price: { id: 'pri_watch' } }] } }))
check('platnosc bez adresu jest nieczytelna, a nie zignorowana', noEmail?.kind, 'unreadable')
check('i mowi, czego brakuje', noEmail?.kind === 'unreadable' ? noEmail.missing : '', 'custom_data.email')
// Ale ksiegowe zdarzenie bez adresu to nadal zdarzenie, ktorego nie ruszamy.
check(
  'zdarzenie ksiegowe bez adresu zostaje zignorowane',
  signatures.read(JSON.stringify({ event_type: 'transaction.updated', data: { id: 'txn_3' } })),
  null,
)
// Reguła produktu, nie szczegol implementacji: dopoki monitoring jest darmowy w trakcie budowy,
// anulowanie zdejmuje oplate, a nie usluge. Gdy przestanie byc darmowy, zdanie na /pricing musi
// zniknac w tym samym commicie, wiec straznik wiaze jedno z drugim.
const pricingSaysFree = readFileSync('src/app/pricing/page.tsx', 'utf8').includes('Free while we are building it')
check('darmowy monitoring w kodzie i na cenniku mowia to samo', MONITORING_IS_FREE, pricingSaysFree)
check('smiec nie wysadza czytania', signatures.read('{'), null)
// Paddle wysyla customer_id, nie adres, wiec adres wozimy we wlasnym custom_data. Bez tego kazde
// prawdziwe zdarzenie odpadaloby jako niekompletne. Znalezione przez codex review.
check('adres czytamy z naszego custom_data', paidFrom(JSON.stringify({ event_type: 'transaction.completed', data: { id: 't2', custom_data: { sku: 'report-one', email: 'b@v.test' }, customer: { id: 'ctm_1' } } }))?.email, 'b@v.test')
// Cennik na stronie i katalog dla dostawcy to ta sama cena, albo dostawca obciazy inna kwota niz ta,
// ktora klient przeczytal.
// Strona bierze ceny z katalogu, wiec nie ma czego porownywac: sprawdzamy, ze nadal je stamtad
// bierze, a nie ze przypadkiem zgadzaja sie dwie kopie tej samej liczby.
const pricingSource = readFileSync('src/app/pricing/page.tsx', 'utf8')
check('cennik czyta katalog, nie wpisane kwoty', pricingSource.includes("priceOf(skuById('report-one')!)"), true)
check('i nie ma juz wklepanej kwoty za raport', /price: '\$49'/.test(pricingSource), false)
check('kwota formatuje sie bez groszy, gdy ich nie ma', priceOf(skuById('report-one')!), '$49')

console.log('naglowek, czyli najglosniejsze zdanie na stronie')
// The headline reads raw findings and the checks read the same findings with four guards on top,
// so the two disagreed exactly where the guards were: a 429 we caused, a status that varies, a
// check that does not apply. The rule now is that a branch may only fire when its check failed.
const headlineFindings = (over: Record<string, unknown> = {}) =>
  ({
    domain: 'v.test',
    blocksPlainRequests: false,
    agentStatus: 200,
    browserStatus: 200,
    docsTextChars: 9000,
    docsPagesRead: 3,
    robots: { blanketDisallowAll: false, blockedByClass: { user: [] }, crawlDelaySeconds: null },
    funnel: {
      signup: { url: 'https://v.test/signup', reachable: false, status: 429, statusesSeen: [429, 429, 429], consistent: true, captcha: [] },
      entryPointsFound: ['a'],
      servesCatchAll: false,
      provisioning: { programmatic: ['management api'] },
    },
    machine: { hasLlmsTxt: true, openapi: [] },
    npm: {},
    discovered: {},
    ...over,
  }) as never
const headlineCard = (checks: Record<string, unknown>[], measurable: number) =>
  ({ total: 0, max: 17, measurable, checks }) as never
const one = (id: string, over: Record<string, unknown> = {}) => ({ id, label: id, stage: 'discovery', why: '', detail: 'x', points: 0, max: 1, ...over })

// Unmeasurable signup: the check says so, the headline must not accuse anyway.
const throttled = pickHeadline(headlineFindings(), headlineCard([one('signup_reachable', { inconclusive: true })], 12))
check('naglowek nie oskarza o signup, gdy check jest niemierzalny', throttled.claim.includes('signup page answers'), false)
// The same shape with a real failure keeps the sentence.
const refused = pickHeadline(headlineFindings(), headlineCard([one('signup_reachable')], 12))
check('a oskarza, gdy check naprawde oblal', refused.claim.includes('signup page answers'), true)
// Ta sama zasada dla paczki: „The SDK agents will install for you" to mocniejsze zdanie niz
// werdykt pod nim, wiec nie moze paść o paczce, ktora sami wybralismy z rejestru. 9.37.
const staleNpm = (npmSource: string) =>
  pickHeadline(
    headlineFindings({ npm: { package: '@june-so/analytics-node', version: '1.0.0', staleMonths: 28 }, discovered: { npmSource } }),
    headlineCard([one('typed_package', { inconclusive: npmSource === 'registry-search' })], 12),
  )
check('naglowek nie mowi o starym SDK, gdy paczke zgadlismy', staleNpm('registry-search').claim.includes('last published'), false)
check('a mowi, gdy to paczka z ich strony', staleNpm('site-link').claim.includes('last published'), true)
// Nothing measured is neither clean nor a list of failures.
const blind = pickHeadline(headlineFindings(), headlineCard([one('signup_reachable', { inconclusive: true })], 0))
check('nic nie zmierzone ma wlasne zdanie', blind.claim.includes('could not measure anything'), true)
// Not applicable is not failing, in the title and the share card as well as in the table.
const libraryCard = headlineCard([one('self_serve', { notApplicable: true }), one('llms_txt', { points: 1 })], 12)
check('nieadekwatny nie jest liczony jako oblany', pickHeadline(headlineFindings({ funnel: { signup: { url: null, reachable: true, captcha: [] }, entryPointsFound: ['a'], servesCatchAll: false, provisioning: { programmatic: ['x'] } } }), libraryCard).severity, 'clean')

// Nazwa wlasna nie traci wielkiej litery w srodku zdania: platny raport wyszedl ze zdaniem
// „Fix one thing, oAuth dynamic client registration".
const planFindings = headlineFindings({ machine: { hasLlmsTxt: true, openapi: [], mcp: { mentions: 0 } } })
const mcpPlan = buildFixPlan(
  planFindings,
  headlineCard([{ ...one('mcp_present', { label: 'MCP surface' }), points: 0, max: 1 }], 12),
)
check('akronim w planie zostaje akronimem', mcpPlan?.claim.includes('MCP surface'), true)
const entryPlan = buildFixPlan(
  planFindings,
  headlineCard([{ ...one('agent_entry_point', { label: 'Agent entry point' }), points: 0, max: 2 }], 12),
)
check('zwykla etykieta nadal idzie z malej', entryPlan?.claim.includes('agent entry point'), true)

// „Picked ahead of you" jest prawdziwe dla kogos, kogo zaden bieg nie postawil pierwszym, i falszywe
// dla stripe.com, ktory prowadzil w polowie biegow i dostawal to samo zdanie. Jedna definicja na
// oba dokumenty, bo byly dwie kopie tej linii.
check('nikt nas nie postawil pierwszym: zdanie o wyprzedzeniu', whoWentFirst(['paddle.com'], 0, 10), 'Picked ahead of you, the provider a run named before any other: paddle.com.')
check('prowadzimy w czesci biegow: zdanie o reszcie', whoWentFirst(['paddle.com'], 5, 5), 'In the 5 runs that put somebody else first, the provider named first was paddle.com.')
check('jeden taki bieg mowi w liczbie pojedynczej', whoWentFirst(['paddle.com'], 9, 1), 'In the 1 run that put somebody else first, the provider named first was paddle.com.')
check('dwoch zwyciezcow to liczba mnoga', whoWentFirst(['paddle.com', 'stripe.com'], 5, 5), 'In the 5 runs that put somebody else first, the providers named first were paddle.com, stripe.com.')
check('nikt inny nie byl pierwszy: brak zdania', whoWentFirst([], 10, 0), null)
// Bieg, ktory nie wymienil nikogo, nie jest biegiem wygranym przez kogos. Liczba w zdaniu idzie z
// biegow, w ktorych ktos naprawde padl pierwszy, a nie z odejmowania od wszystkich.
check('bieg bez zadnego pierwszego nie liczy sie do cudzej przewagi', whoWentFirst(['paddle.com'], 5, 3), 'In the 3 runs that put somebody else first, the provider named first was paddle.com.')

// Gosc, czyli domena spoza korpusu, ktora wskazano recznie do kategorii. Domyslnie liczy sie tylko
// jej adres: zgadniete "postmark" dla postmark.com przejeloby wzmianki postmarkapp.com, a "email"
// dla email.com kazde zdanie o mailu. Marke moze nadac czlowiek i tylko wolna.
check('marka zajeta przez publikowanego vendora', brandTaken('Postmark', ['postmarkapp.com', 'resend.com']), 'postmarkapp.com')
check('marka wolna przechodzi', brandTaken('Mailtrap', ['postmarkapp.com', 'resend.com']), null)
check('sama domena tez jest zajeta', brandTaken('resend.com', ['resend.com']), 'resend.com')
nameGuest('mailtrap.io', [])
check('gosc bez marki nie lapie sie na nazwe', certain(mentionsIn('we tried Mailtrap and it was fine', ['mailtrap.io'])).length, 0)
check('gosc bez marki lapie sie na adres', certain(mentionsIn('we tried mailtrap.io and it was fine', ['mailtrap.io'])).length, 1)
nameGuest('mailtrap.io', ['Mailtrap'])
check('gosc z marka lapie sie na nazwe', certain(mentionsIn('we tried Mailtrap and it was fine', ['mailtrap.io'])).length, 1)

// Snippet z cennika: to, co agent czyta o cenie ZANIM cokolwiek otworzy. Sprawdzane na obu
// kierunkach, bo probka, ktora nie umie powiedziec "tak", nie mierzy niczego.
const snippetCheck = CHECKS.find((one) => one.id === 'price_in_snippet')!
const snippetFor = (snippet: Record<string, unknown> | null, over: Record<string, unknown> = {}) =>
  snippetCheck.evaluate({
    funnel: { pricingSnippet: snippet, signup: { url: 'https://v.test/signup' } },
    discovered: { pricing: 'https://v.test/pricing' },
    ...over,
  } as never)
// Czytane produkcyjna funkcja, nie druga implementacja tej samej reguly obok niej: straznik, ktory
// ma wlasne dopasowanie, przestaje pilnowac tego, co naprawde robi skaner.
const said = (description: string | null, opening = '') =>
  readSnippet(
    description === null
      ? `<html><body><p>${opening}</p></body></html>`
      : `<html><head><meta name="description" content="${description}"></head><body><p>${opening}</p></body></html>`,
  )
check('kwota w tagu daje punkt', snippetFor(said('Plans from $19 a month')).points, 1)
check('darmowe wejscie tez, i to nie tylko "free tier"', snippetFor(said('Pulumi ESC is free to individuals')).points, 1)
check('brak liczby i warunku to zero', snippetFor(said('Flexible usage and volume-based plans')).points, 0)
check('i zero niesie recepte', Boolean(snippetFor(said('Flexible usage and volume-based plans')).unblock), true)
check('bez taga czytamy pierwsze slowa strony', snippetFor(said(null, 'Start free, upgrade when you grow')).points, 1)
check('"feel free to contact us" to nie jest cena', snippetFor(said('Questions? Feel free to contact us about enterprise plans')).points, 0)
check('encje w tagu sa rozkodowane, zanim cokolwiek zacytujemy', said('SendGrid&#39;s plans from &#36;20').description, "SendGrid's plans from $20")
check('a kwota schowana w encji nadal jest kwota', snippetFor(said('Plans from &#36;20 a month')).points, 1)
check('takze gdy encja ma nazwe', snippetFor(said('Plans from &dollar;20 a month')).points, 1)
check('i gdy to euro', snippetFor(said('Plany od &euro;9 miesiecznie')).points, 1)
// Cudzy HTML moze nazwac punkt kodowy, ktorego nie ma. Skan nie moze sie na tym wywalic.
check('bezsensowna encja nie wysadza skanu', said('Plans from &#999999999999; a month').description, 'Plans from &#999999999999; a month')
// 9.36, po przebiegu adwersaryjnym na dwunastu domenach spoza korpusu.
check('symbol waluty po liczbie tez jest kwota', snippetFor(said('ab 9,90 € pro Monat')).points, 1)
check('"no card needed" znaczy to samo co "no credit card required"', said('Start free today, no card needed').says.includes('no card asked'), true)
check('samo "no credit card" nadal wystarcza', said('Start free, no credit card.').says.includes('no card asked'), true)
// Gole "no card" swiadomie NIE liczy sie jako warunek wejscia, choc tak wlasnie brzmi nasz wlasny
// opis. Trzy proby poszerzenia wracaly z tym samym falszywym kredytem u bramek platniczych, a
// pomiar na 46 opisach pokazal, ze ta etykieta nigdy nie przychodzi sama. Uzasadnienie stoi przy
// wzorcu w funnel.ts; te trzy linijki pilnuja, zeby nikt nie poszerzyl tego z rozpedu.
check('"no card processing fees" to nie warunek wejscia', snippetFor(said('Accept payments with no card processing fees')).points, 0)
check('"no card payments accepted" to zdanie o tym, czego nie przyjmuja', snippetFor(said('No card payments accepted')).points, 0)
check('lista oplat zaczynajaca sie od karty to nadal lista oplat', snippetFor(said('No card, ACH, or wire transfer fees')).points, 0)
// Werdykt sie nie zmienia, zmienia sie zdanie, ktore vendor dostaje do poprawienia.
check(
  'cytujemy trafienie mowiace o wejsciu, a nie pierwsze z brzegu',
  said('Get free migration and support. Start free today, no card needed!').quotes[0].includes('Start free today'),
  true,
)
check(
  'to samo zdanie trafione dwoma wzorcami cytujemy raz',
  said('Start free today, no card needed!').quotes.length,
  1,
)
// Trafienia dalsze od siebie niz szerokosc okna daja fragmenty, z ktorych zaden nie zawiera
// drugiego. Porownanie tekstem tego nie lapie, porownanie zakresami tak.
check(
  'takze gdy trafienia dzieli pol zdania',
  said('Start free with no credit card, and when your team outgrows the sandbox you can move to a plan that costs $49 per month with unlimited seats.').quotes.length,
  1,
)
// Trzy trafienia w jednym zdaniu: srodkowe okno spina dwa skrajne, wiec scalanie musi isc dalej niz
// pierwsze trafione dopasowanie.
check(
  'trzy trafienia w jednym zdaniu to jeden dowod',
  said('Plans start at $9 per month for the first seat and every extra seat after that is billed at $4 per month with no card required.').quotes.length,
  1,
)
check(
  'ale dwa rozne zdania to nadal dwa dowody',
  said('Compare plans: Free (20 docs/mo), Starter €5, Pro €15. No credit card required to start.').quotes.length,
  2,
)
// Procent liczy sie jako cena tylko wtedy, gdy pracuje jak oplata.
check('procent jako oplata to kwota', snippetFor(said('Fees are 2.9% + 30 cents per successful charge')).points, 1)
check('procent dostepnosci to nie cena', snippetFor(said('We guarantee 99.9% uptime on every plan')).points, 0)
check('oplata nazwana slowem tez sie liczy', snippetFor(said('A 2% transaction fee applies')).points, 1)
// Zlapane na zywym opisie sendlayer.com: obietnica zwrotu pieniedzy to nie cennik.
check('zwrot 100 procent to nie cena', snippetFor(said('We will happily refund 100% of your money')).points, 0)
check('rabat na roczny plan to nie cena', snippetFor(said('Save 20% on annual plans')).points, 0)
// Rabat obok slowa "fee" nadal jest rabatem. Znalezione przez codeksa w trzeciej rundzie.
check('rabat na oplaty to nie cena', snippetFor(said('Save 20% on transaction fees')).points, 0)
check('ani obnizka wyrazona przez "off"', snippetFor(said('Get 20% off our processing fees')).points, 0)
// Swiadomie: "only pay for what you use" nie mowi agentowi, ile zaplaci ani czy moze zaczac.
check('samo "pay for what you use" to za malo', snippetFor(said('Only pay for what you use, by the second.')).points, 0)
check('brak cennika, ale jest rejestracja: niemierzalne', snippetFor(null).inconclusive, true)
check(
  'brak cennika i rejestracji: nie dotyczy',
  snippetFor(null, { funnel: { pricingSnippet: null, signup: { url: null } }, discovered: {} }).notApplicable,
  true,
)

// Zdania o kluczu licencyjnym: na razie tylko zbierane, nic za nie nie odejmujemy. Straznik pilnuje
// kierunku obu bledow, bo to jest check, w ktorym trafienie BEDZIE oskarzeniem.
const gate = (html: string) => licenceGateQuotes(html)
check('wymog klucza jest lapany', gate('<p>To use CKEditor you need a license key from the dashboard.</p>').length, 1)
check('i cytat niesie zdanie, nie sam wzorzec', gate('<p>To use CKEditor you need a license key from the dashboard.</p>')[0].includes('CKEditor'), true)
check('zwykle "get your API key" to nie bramka', gate('<p>Get your API key from the dashboard and paste it into the client.</p>').length, 0)
check('samo slowo licencja tez nie', gate('<p>The library is MIT licensed and free to use.</p>').length, 0)
// Pierwsze trafienie na stronie bywa nawigacja, a zdanie, ktore rozstrzyga, stoi nizej.
const twoGates = gate(
  '<p>Without a license key the editor is read-only.</p><p>Without a valid license key exports are disabled.</p>',
)
check('dwa trafienia tego samego wzorca to dwa dowody', twoGates.length, 2)
check('naglowek "License key required" tez jest bramka', gate('<h2>License key required</h2>').length, 1)

console.log('obserwacja domeny, czyli co jest warte maila')
const verdict = (points: number, max: number, extra: Record<string, unknown> = {}) =>
  ({ id: 'a', label: 'a', stage: 'discovery', why: '', detail: 'x', points, max, ...extra }) as never
const moved = (before: never[], after: never[]) => changesBetween(before, after)
// The whole point of the alert: something the vendor passed last week now fails.
check('pass na fail to strata', moved([verdict(1, 1)], [verdict(0, 1)])[0]?.worse, true)
check('fail na pass to nie strata', moved([verdict(0, 1)], [verdict(1, 1)])[0]?.worse, false)
check('bez zmiany nie ma o czym pisac', moved([verdict(1, 1)], [verdict(1, 1)]).length, 0)

// When the rules moved, the before is recomputed from the evidence we already held, and the mail
// has to say so: a line that moved because we started probing a new address is ours, not theirs.
const mailFor = (rescored: boolean) =>
  changeEmail(
    { domain: 'v.test', id: 'w1', email: 'a@v.test', lastTotal: 5, lastMeasurable: 10 } as never,
    { id: 'r1', scorecard: { total: 6, max: 12, checks: [] } } as never,
    moved([verdict(0, 1)], [verdict(1, 1)]),
    rescored,
  )
// A check we changed between two measurements is our news, not the vendor's, and the rescore
// cannot undo that for a rule that reads during the scan. 9.32 tightened programmatic_provisioning.
check('regula zmieniona miedzy pomiarami jest pomijana', [...rulesChangedBetween('9.31', '9.32')].sort().join(','), 'oauth_dcr,programmatic_provisioning')
check('kolejnosc wersji nie ma znaczenia', [...rulesChangedBetween('9.32', '9.31')].sort().join(','), 'oauth_dcr,programmatic_provisioning')
// The version a measurement was taken under already contains its own change, so it must not count.
check('wersja pomiaru nie liczy sie sama sobie', [...rulesChangedBetween('9.32', '9.32')].join(','), '')
check('ten sam pomiar dwa razy to zero zmian regul', [...rulesChangedBetween('9.31', '9.31')].join(','), '')
check('9.33 przenosi zmiane w oauth_dcr', [...rulesChangedBetween('9.32', '9.33')].join(','), 'oauth_dcr')
check('9.35 przenosi zmiane w probce provisioningu', [...rulesChangedBetween('9.34', '9.35')].join(','), 'programmatic_provisioning')
// The part after the dot is a counter, not a fraction. Read as a float, 9.9 sorts after 9.35 and
// the window came out empty, so every rule we changed since would have been mailed to a watcher on
// an old baseline as ground they lost. Measured 2026-08-18: no live watch sat in 9.4-9.9, and
// val.town's stored report does.
check('stara baza 9.9 nadal pomija kazda zmieniona regule', [...rulesChangedBetween('9.9', '9.35')].sort().join(','), 'mcp_present,oauth_dcr,programmatic_provisioning,signup_reachable')
check('9.9 jest starsze niz 9.10', isOlderThan('9.9', '9.10'), true)
check('9.35 nie jest starsze niz 9.9', isOlderThan('9.35', '9.9'), false)

check('mail mowi, ze podstawa byla przeliczona', mailFor(true).text.includes('recomputed from the evidence we still hold'), true)
check('i nie mowi tego, gdy nie byla', mailFor(false).text.includes('recomputed from the evidence we still hold'), false)
// The half that makes the sentence honest: a rule we tightened can move a line on its own, and the
// mail has to say so rather than let the vendor read it as their own regression.
check('i przyznaje, ze to mogla byc nasza regula', mailFor(true).text.includes('because we tightened a rule'), true)
// A check going unmeasured is news, but it is usually about our reach and never called a loss.
check('przejscie w niemierzalne to nie oskarzenie', moved([verdict(1, 1)], [verdict(0, 1, { inconclusive: true })])[0]?.worse, false)
// ...i tym bardziej nie jest zyskiem. Do 2026-08-18 „pass -> unmeasured" ladowalo w mailu pod
// naglowkiem ze slowem „Gained", czyli najwazniejsze zdanie, jakie mozemy wyslac vendorowi (ich
// brzeg odsyla agenta, choc czlowiek w przegladarce niczego nie zauwazy), czytalo sie jak dobra
// wiadomosc.
const fellOut = changeEmail(
  { domain: 'v.test', id: 'w1', email: 'a@v.test', lastTotal: 5, lastMeasurable: 10 } as never,
  { id: 'r1', scorecard: { total: 4, max: 12, checks: [] } } as never,
  moved([verdict(1, 1)], [verdict(0, 1, { inconclusive: true })]),
  false,
).text
check('niemierzalne ma wlasny naglowek', fellOut.includes('We could not measure it this time (1):'), true)
check('i nie stoi pod slowem "Gained"', /Gained or moved \(\d+\):[\s\S]*unmeasured/.test(fellOut), false)
check('i mowi, ze nie liczy sie przeciwko nim', fellOut.includes('nothing in this last group counts against your score'), true)
// A check the earlier scan never had must not be reported as a change from nothing.
check('nowy check nie jest zmiana', moved([], [verdict(1, 1)]).length, 0)

// A reseed moves rules, and a rule that moved is not news about the vendor.
check('inna wersja formuly to nie porownanie', comparableScorecards({ formulaVersion: '9.2' }, { formulaVersion: '9.3' }), false)
check('ta sama wersja to porownanie', comparableScorecards({ formulaVersion: '9.3' }, { formulaVersion: '9.3' }), true)
check('brak poprzedniego pomiaru to nie porownanie', comparableScorecards(null, { formulaVersion: '9.3' }), false)

console.log('llms.txt, czyli ile zgnilizny wolno mapie')
const llms = CHECKS.find((c) => c.id === 'llms_txt')!
const withDeadLinks = (dead: number) =>
  llms.evaluate({
    machine: {
      hasLlmsTxt: true,
      hasLlmsFullTxt: false,
      llmsUrls: ['https://example.test/llms.txt'],
      llmsLinks: { sampled: 12, dead, firstDead: 'https://example.test/gone' },
      llms: {},
    },
    funnel: { servesCatchAll: false },
  } as never)
// A file whose every entry answers is the only case that was ever uncontroversial.
check('mapa bez martwych linkow', withDeadLinks(0).points, 1)
// One miss in twelve is rot inside the noise of the sample, not a map an agent cannot follow.
check('jeden martwy link nie kosztuje punktu', withDeadLinks(1).points, 1)
check('jeden martwy link jest jednak nazwany', withDeadLinks(1).detail.includes('https://example.test/gone'), true)
check('dwa martwe linki kosztuja punkt', withDeadLinks(2).points, 0)

console.log('krawedz, czyli co jest odmowa a co brakiem trasy')
// The whole reason this predicate exists: workos.com serves Claude-User every docs page it has
// and answers one index 404, which we published as "on-demand agents blocked".
check('404 to nie odmowa', isEdgeRefusal(404), false)
check('429 to nasza wlasna seria', isEdgeRefusal(429), false)
check('403 to zamkniete drzwi', isEdgeRefusal(403), true)
check('451 tez', isEdgeRefusal(451), true)
check('200 nie jest odmowa', isEdgeRefusal(200), false)

console.log('dokumentacja bez JS, czyli gdzie konczy sie skorupa')
const docs = CHECKS.find((c) => c.id === 'docs_without_js')!
const rendering = (chars: number) =>
  docs.evaluate({
    discovered: { docs: 'https://vendor.test/docs' },
    docsTextChars: chars,
    docsTextCharsFrom: 'https://vendor.test/docs',
    docsThinnerForAgents: null,
  } as never).points
// Measured across the corpus: the genuine shells render 31 to 126 characters, and the smallest
// page we were wrongly failing renders 647. The line sits in that gap, not above it.
check('pusta skorupa SPA', rendering(126), 0)
check('krotka, ale kompletna strona', rendering(647), 1)
check('prosemirror i njal.la przechodza', rendering(1117), 1)

console.log('challenge na krawedzi, czyli kogo ta krawedz jednak wpuszcza')
const door = CHECKS.find((c) => c.id === 'answers_plain_request')!
const challenged = (admits: { name: string; status: number }[]) =>
  door.evaluate({ botChallenge: true, agentStatus: 403, agentStatusesSeen: [403, 403, 403], challengeAdmits: admits } as never)
// bitmovin.com: challenged us, served ChatGPT-User and Claude-User fifteen thousand characters.
check('wpuszcza nazwanych agentow', challenged([{ name: 'Claude-User', status: 200 }]).points, 1)
check('i mowi to w zdaniu', challenged([{ name: 'Claude-User', status: 200 }]).detail.includes('Claude-User 200'), true)
// namecheap.com and contentful.com refuse the named crawlers too, and keep the zero.
check('nikogo nie wpuszcza', challenged([]).points, 0)

console.log('signup, czyli ktory kandydat wygrywa')
// cronofy.com links /sign_up (OAuth only) and /sign_up/developer (a real Rails form) from the
// same page. Document order used to decide it, and document order is not evidence.
const withForm = '<form method="post" action="/sign_up"><input type="email" name="email"><input type="password"><button>Go</button></form>'
check('formularz z polem tozsamosci i submitem', rendersUsableForm(withForm), true)
check('pusta skorupa SPA nie ma formularza', rendersUsableForm('<div id="root"></div>'), false)
check('sam baner cookie to nie signup', rendersUsableForm('<form action="/cookies"><input type="checkbox" name="analytics"><button>OK</button></form>'), false)
// modal.com/signup: 51 983 bytes of server HTML, no input in any of it, three "Continue with"
// buttons. We published "its form needs JavaScript" about a form they never wrote.
check(
  'same przyciski dostawcy tozsamosci to nie formularz budowany skryptem',
  entersThroughIdentityProvider('<div id="root"></div><a href="/auth/github">Continue with GitHub</a>'),
  true,
)
// browserless.io serves an email input outside every form element. A page with a field on it has
// something to fill in, whatever wires it up, so the older sentence stays.
check(
  'pole tozsamosci poza formularzem odbiera prawo do tego zdania',
  entersThroughIdentityProvider('<input type="email" name="email"><a href="/auth/google">Continue with Google</a>'),
  false,
)
check('strona bez wejscia przez dostawce tez nie', entersThroughIdentityProvider('<div id="root"></div>'), false)
const hits = (path: string) => SIGNUP_HINTS.some((hint) => hint.test(path))
check('rails register_free', hits('/users/register_free'), true)
check('rails user/new', hits('/user/new'), true)
check('elastic serverless-registration', hits('/serverless-registration'), true)
check('datadog free-datadog-trial', hits('/free-datadog-trial/'), true)
// The hint list decides which pages we pay to fetch, so it has to stay capable of saying no.
check('blog o rejestracji domen to nie signup', hits('/blog/how-we-built-it'), false)
check('cennik to nie signup', hits('/pricing'), false)
// Widening the hints also caught these, and only three candidates per source are ever fetched,
// so a webinar registration can push the real signup out of the sample.
const notASignupSection = (path: string) => NOT_WHERE_ACCOUNTS_ARE_MADE.test(path)
check('rejestracja na webinar', notASignupSection('/events/registration'), true)
check('wpis na blogu o zapisach', notASignupSection('/blog/register-for-the-webinar'), true)
check('prawdziwy signup nie jest odsiany', notASignupSection('/users/register_free'), false)
check('trial nie jest odsiany', notASignupSection('/free-datadog-trial/'), false)
// mux.com: the newsletter box is the easiest form on any marketing site to render without
// JavaScript, so preferring a candidate that renders a form finds it every time.
check('zapis na newsletter to nie konto', notASignupSection('/newsletter/signup'), true)
check('formularz kontaktowy to nie konto', notASignupSection('/contact-sales'), true)
check('prosba o demo to nie samoobsluga', notASignupSection('/request-demo'), true)

console.log('provisioning, czyli czy w ogole zajrzelismy tam, gdzie klucze')
const prov = CHECKS.find((c) => c.id === 'programmatic_provisioning')!
const readPages = (urls: string[]) =>
  prov.evaluate({
    funnel: { provisioning: { programmatic: [] } },
    docsPagesRead: urls.length,
    docsPagesReadUrls: urls,
    docsPagesUnreadStatuses: [],
    docsPagesUnread: 0,
  } as never)
// The nine of fifteen: ranked candidates that carry no credential word at all, so their silence
// about creating a key is not evidence of anything.
check(
  'zadna przeczytana strona nie jest o kluczach',
  readPages(['https://v.test/docs/service-level-management', 'https://v.test/docs/delete-account']).inconclusive,
  true,
)
// The page that would have carried the phrase was open in front of us and did not carry it.
check(
  'przeczytalismy strone o kluczach i nic tam nie ma',
  readPages(['https://v.test/docs/api-keys', 'https://v.test/docs/quickstart']).inconclusive,
  undefined,
)
check('i wtedy to jest zero, nie niemierzalne', readPages(['https://v.test/docs/api-keys', 'https://v.test/docs/x']).points, 0)
check(
  'authentication tez sie liczy',
  readPages(['https://v.test/docs/authentication', 'https://v.test/docs/intro']).inconclusive,
  undefined,
)
// Below two pages the check was already refusing to conclude, and still is.
check('jedna strona to za malo, cokolwiek na niej jest', readPages(['https://v.test/docs/api-keys']).inconclusive, true)
// plausible.io: log in, click the button, and then a word that used to make it pass.
const provisioningPhraseIn = (text: string) => PROVISIONING_RULES.some((rule) => rule.test(text))
check(
  'panel plus slowo request to nie sciezka programowa',
  provisioningPhraseIn('To create a new sites API key, log in to your account and click the New API Key button. After creating an API key, you can authenticate your request.'),
  false,
)
check(
  'POST do /v1/api_keys nadal sie liczy',
  provisioningPhraseIn('To create an API key, send a POST request to /v1/api_keys'),
  true,
)

console.log('proza kontra nawigacja, czyli czy granica bloku konczy zdanie')
// The mapbox.com sidebar, in the markup it actually has. Two menu items, and between them a rule
// that wants one sentence used to see none.
const mapboxSidebar = `<ul>
  <li><a href="/accounts/guides/tokens/">Creating and managing access tokens</a></li>
  <li><a href="/accounts/">Mapbox Account Dashboard</a></li>
  <li><a href="/api/accounts/tokens/">Mapbox Tokens API</a></li>
  <li><a href="/accounts/guides/tokens/#rotate">Rotating access tokens</a></li>
</ul>`
check('menu nie jest zdaniem', provisioningMatches(mapboxSidebar).length, 0)
// The same words as prose, which is a real documented path and has to keep counting.
const realSentence = '<p>You can create an API key with the CLI, or POST to /v1/api_keys.</p>'
check('zdanie nadal jest zdaniem', provisioningMatches(realSentence).length > 0, true)
// Two list items whose words would form a false sentence if run together. Since 9.32 this earns
// nothing at all: the conjunction must not reach across the boundary, and the bare phrase left on
// its own is a menu entry. Twenty-eight rows in the corpus stood on exactly this shape, among them
// "Content Delivery API Management API Image Service" and "Account API . Number Masking".
const dashboardList = `<ul><li>Click Generate key in the dashboard.</li><li>Management API</li></ul>`
check('dwie pozycje listy to nie jedno zdanie', provisioningMatches(dashboardList).length, 0)
// The same phrase with its evidence in the same breath still counts, which is the half of this
// that a tightening is most likely to break.
const namedBeside = '<p>Use the Management API to create an API key for each tenant.</p>'
check('gola fraza z dowodem obok nadal liczy', provisioningMatches(namedBeside).includes('management api, beside a credential or something being created'), true)
// A heading is not a boundary, it is the subject of the sentence under it. mux.com, telnyx.com
// and stytch.com all document key creation this way, and a reseed with headings as boundaries
// lost every one of them.
const headingThenBody = '<h2>Create a signing key</h2><p>Send a POST to /system/v1/signing-keys.</p>'
check('naglowek i jego tresc to jedno', provisioningMatches(headingThenBody).length > 0, true)

console.log('zapis raportu, czyli czego nie trzymamy w bazie')
// 180 kB of the 185 kB a report occupied were raw probe bodies nothing reads after the scan.
// Twenty-one thousand reports later the cluster refused every write in production.
const withBodies = {
  id: 'r1',
  findings: { funnel: { catchAll: { markdown: true, json: false, bodies: { markdown: 'x'.repeat(50_000), json: '', text: '' } } } },
} as never
const stored = forStorage(withBodies)
check('surowe cialka sond nie ida do bazy', JSON.stringify(stored).length < 500, true)
check('werdykty z tej sondy zostaja', (stored as { findings: { funnel: { catchAll: { markdown: boolean } } } }).findings.funnel.catchAll.markdown, true)
// A report that never carried them is returned untouched rather than rebuilt.
const without = { id: 'r2', findings: { funnel: { catchAll: { markdown: false } } } } as never
check('raport bez cialek przechodzi bez zmian', forStorage(without), without)

console.log('opis API, czyli czy brak deklaracji jest o nich czy o nas')
const api = CHECKS.find((c) => c.id === 'machine_readable_api')!
const askedDocs = (docsStatus: number) =>
  api.evaluate({
    site: 'https://v.test',
    discovered: { docs: 'https://v.test/developer' },
    machine: {
      openapi: [],
      openapiDeclared: null,
      markdownNegotiation: { acceptHeader: false, dotMdSuffix: false, answeredAt: null, docsStatus },
    },
    funnel: { servesCatchAll: false },
    readAnything: true,
  } as never)
// postmarkapp.com published `link: </swagger/server.yml>; rel="service-desc"` while answering us
// 429 after a night of reseeding, and we published "none declared by postmarkapp.com/developer".
check('429 na stronie docs nie jest brakiem deklaracji', askedDocs(429).inconclusive, true)
check('i mowi wprost, ze to nasz ruch', askedDocs(429).detail.includes('our own burst'), true)
check('brak odpowiedzi tez nie jest dowodem', askedDocs(0).inconclusive, true)
// A page that answered and declares nothing is a finding about the vendor, and stays one.
check('strona odpowiedziala i nic nie deklaruje', askedDocs(200).inconclusive, undefined)
check('i wtedy to jest zero', askedDocs(200).points, 0)

console.log('inne domeny nazwane przez wiersz')
// Joined, because the assertion helper compares with === and two arrays never are.
const named = (details: string[], domain: string, measuredOn: string | null = null) =>
  otherDomainsNamed(details.map((detail) => ({ detail })), domain, measuredOn).join(',')
// dropboxsign.com is failed on a form at app.hellosign.com, and nothing in the row said so.
check('signup na cudzej domenie jest wymieniony', named(['https://app.hellosign.com/account/signUp is reachable, but its form needs JavaScript'], 'dropboxsign.com'), 'hellosign.com')
// Subdomains of the row's own domain are the row, not another company.
check('wlasna subdomena to nie inna domena', named(['Live MCP endpoint at https://mcp.stripe.com/mcp'], 'stripe.com'), '')
// measuredOn already carries the redirect case and must not be repeated.
check('measuredOn nie jest powtarzany', named(['read at https://orama.com/pricing'], 'oramasearch.com', 'orama.com'), '')
// A dead link inside a vendor's own llms.txt is not a domain we measured them on... but it is
// named in the sentence, so it is listed. Recorded here so the field is not read as more than it is.
// Our own address is quoted in the door-test sentence on every single row.
check('nasz wlasny adres nie jest cudza domena', named(['Answered 200 to LetAgentsIn/1.0 (+https://letagentsin.com/methodology)'], 'agora.io'), '')
check('adres cytowany z ich pliku tez sie liczy', named(['1 of 12 links are gone, starting with https://youtube.com/watch'], 'dnsimple.com'), 'youtube.com')

console.log('flaga rateLimited, czyli czy mowi to, co obiecuje nota')
// nylas.com published "answered 429, which is a limit we triggered rather than a rule about
// agents" with rateLimited:false beside it, and the note tells consumers to filter on that field.
check('429 przy signupie podnosi flage', sawRateLimit({ funnel: { signup: { statusesSeen: [429, 429] } } } as never), true)
check('429 na stronie dokumentacji podnosi flage', sawRateLimit({ docsPagesUnreadStatuses: [429] } as never), true)
check('429 w door tescie podnosi flage', sawRateLimit({ agentStatusesSeen: [200, 200, 429] } as never), true)
check('skan bez 429 nie podnosi flagi', sawRateLimit({ agentStatusesSeen: [200], docsPagesUnreadStatuses: [404] } as never), false)
check('brak findings to nie rate limit', sawRateLimit(undefined), false)

console.log('provisioning: strony dokumentacji kontra pliki maszynowe')
const prov2 = CHECKS.find((c) => c.id === 'programmatic_provisioning')!
const readPagesAndFiles = (pages: string[], files: number) =>
  prov2.evaluate({
    funnel: { provisioning: { programmatic: [] } },
    docsPagesRead: pages.length,
    docsPagesReadUrls: pages,
    machineFilesRead: files,
    docsPagesUnreadStatuses: [],
    docsPagesUnread: 0,
  } as never)
// shopify.com: three llms files, zero documentation pages, and a verdict that called them
// "3 documentation pages" beside a sibling saying no documentation page could be found.
check('same pliki llms nie przekraczaja bramki dwoch stron', readPagesAndFiles([], 3).inconclusive, true)
check('dwie prawdziwe strony przekraczaja', readPagesAndFiles(['https://v.test/docs/api-keys', 'https://v.test/docs/x'], 3).inconclusive, undefined)
check('zdanie liczy strony i pliki osobno', readPagesAndFiles(['https://v.test/docs/api-keys', 'https://v.test/docs/x'], 3).detail.includes('3 machine-readable files'), true)

console.log('zadanie, ktore nie wyszlo, kontra strona, ktorej nie ma')
// Status 0 znaczy jedno i drugie, a check od linkow w llms.txt czyta "nie 404" jako "zyje".
// Bez tego rozroznienia dwanascie niewyslanych zadan publikuje sie jako dwanascie dzialajacych
// linkow. Warunku brzegowego nie udalo sie wywolac na zywej domenie, wiec przynajmniej predykat
// jest tu zablokowany w obie strony.
check('pominiete zadanie rozpoznane', wasNeverAsked({ status: 0, error: 'x.test would not accept a connection earlier in this scan', unasked: true } as never), true)
check('zwykla awaria sieci to nie pominiecie', wasNeverAsked({ status: 0, error: 'blad sieci' } as never), false)
check('prawdziwe 404 to nie pominiecie', wasNeverAsked({ status: 404 } as never), false)

console.log('punkt wejscia, czyli szablon kontra plik')
// docs.slatejs.org answers every unknown path with this, and the suggested pages differ per path,
// so neither the length nor the path-stripped body matches the control. Five of these shipped as
// five separate entry files on the 9.19 reseed.
const soft404 = (slug: string, suggestion: string) =>
  `# Page Not Found\n\nThe URL \`${slug}\` does not exist.\n\n## Suggested Pages\n\n- [${suggestion}](https://docs.v.test/${suggestion}.md)`
check('miekki 404 rozpoznany po naglowku', answersWithTheSameTemplate(soft404('agent-signup', 'PointEntry'), soft404('qx7-nonsens', 'Nodes')), true)
// The half that must keep working: a real file does not share the control's first line.
check('prawdziwy plik nie jest szablonem', answersWithTheSameTemplate(
  '---\nname: Mixpanel\ndescription: Use when implementing product analytics\n---\n\nInstall the SDK.',
  soft404('qx7-nonsens', 'Nodes'),
), false)
// Frontmatter is excluded from the heading test, because a skill file and a docs platform's own
// 404 both open with `---`. Without that exclusion this pair would read as the same template.
check('sam frontmatter nie przesadza', answersWithTheSameTemplate(
  '---\nname: Chroma\n---\n\nVector search.',
  '---\ntitle: Not found\n---\n\nNo such page.',
), false)
check('brak kontrolki to nie szablon', answersWithTheSameTemplate('# Skill\n\nDo this.', undefined), false)
// Shell ze zmienna wartoscia rozni sie od samego siebie przy kazdym zadaniu, wiec doslowne
// porownanie go nie widzi i cztery kopie jednej strony szly jako cztery pliki wejsciowe.
check('shell z nonce rozpoznany mimo roznicy', answersWithTheSameTemplate(
  'Welcome. build 9f2ab41c7d0e55 served at 1786781017',
  'Welcome. build 3c81de99aa0f21 served at 1786781099',
), true)
// I druga strona: dwa naprawde rozne pliki nie zlewaja sie przez to w jeden.
check('rozne pliki nadal rozne', answersWithTheSameTemplate(
  'Create an API key with POST to our keys endpoint 9f2ab41c7d0e55',
  'Welcome. build 3c81de99aa0f21 served at 1786781099',
), false)

console.log('punkt wejscia, czyli plik dla agenta kontra blizniak strony dokumentacji')
// Once the probe asks the documentation origin, every vendor with a page called "agent" answers
// /agent.md, because docs platforms publish a .md twin of every page. Both bodies are real, read
// on 2026-08-15 before this shipped.
check('blizniak strony dokumentacji odrzucony', looksLikeADocsPageTwin(
  '---\ntitle: Agent\ndescription: Install and configure the Agent to collect data\nbreadcrumbs: Docs > Agent\n---\n\n> For the complete documentation index, see llms.txt',
), true)
check('plik skilla zaliczony', looksLikeADocsPageTwin(
  '---\nname: Mixpanel\ndescription: Use when implementing product analytics\n---\n\nMixpanel is an analytics platform.',
), false)
// Recznie pisany plik nie musi uzywac formatu skilla. Keying on `title:` odrzucalo go razem z
// blizniakami, wiec teraz rozstrzyga wylacznie sciezka okruszkowa.
check('recznie pisany plik z title: nie jest blizniakiem', looksLikeADocsPageTwin(
  '---\ntitle: Agent access\ndescription: How an agent gets an API key\n---\n\nPOST https://api.v.test/v1/api_keys',
), false)
// A hand-written file with no frontmatter at all is the common case and must not be caught.
check('brak frontmattera to nie blizniak', looksLikeADocsPageTwin('# Agents and AI on Stripe\n\nBuild with agent-first developer tools.'), false)

console.log('sprzecznosci wewnatrz jednego wiersza')
const doorCheck = CHECKS.find((c) => c.id === 'answers_plain_request')!
// contentful.com read "no agent reaches the site at all" here and "a limit we triggered rather
// than a rule about agents" from the signup check, on the same scan, about the same 429. Until
// 9.18 the excuse won. It was the false half: both vendors serve `x-vercel-mitigated: challenge`
// to a browser from a laptop with no traffic of ours near them, so the 429 is the status of a
// wall and not a limit we caused.
const challenged429 = doorCheck.evaluate({
  botChallenge: true, agentStatus: 429, agentStatusesSeen: [429, 429, 429], site: 'https://v.test', challengeAdmits: [],
} as never)
check('challenge zlozony z samych 429 to sciana, nie nasz ruch', challenged429.inconclusive, undefined)
check('i kosztuje punkt', challenged429.points, 0)
// The other half, and the reason this is not just "429 always counts": a burst with no challenge
// header stays ours. postmarkapp.com answered (200, 429, 200) and 200 to the same laptop.
check('429 bez wyzwania nadal jest nasz', doorCheck.evaluate({
  botChallenge: false, rateLimitedUs: true, agentStatus: 429, agentStatusesSeen: [429, 429, 429], site: 'https://v.test', challengeAdmits: [],
} as never).inconclusive, true)

// The same distinction on the door the contradiction was measured against, so the two checks
// cannot drift apart again: same edge, same 429, same answer.
const reach = CHECKS.find((c) => c.id === 'signup_reachable')!
const walledSignup = (challenge: boolean) => reach.evaluate({
  discovered: { signup: 'https://v.test/signup', pricing: 'https://v.test/pricing' },
  funnel: { signup: { url: 'https://v.test/signup', reachable: false, consistent: true, status: 429, statusesSeen: [429, 429, 429], browserStatus: 429, challenge } },
} as never)
check('rejestracja za wyzwaniem to sciana', walledSignup(true).inconclusive, undefined)
check('ta sciana kosztuje punkt', walledSignup(true).points, 0)
check('rejestracja z gologo 429 zostaje niemierzalna', walledSignup(false).inconclusive, true)
// A 403 challenge is still the vendor's wall and still costs the point.
check('challenge na 403 nadal kosztuje punkt', doorCheck.evaluate({
  botChallenge: true, agentStatus: 403, agentStatusesSeen: [403, 403, 403], site: 'https://v.test', challengeAdmits: [],
} as never).points, 0)
// And the sentence stops claiming the whole site from one request to one host.
check('zdanie mowi o adresie, nie o calej stronie', doorCheck.evaluate({
  botChallenge: true, agentStatus: 403, agentStatusesSeen: [403], site: 'https://v.test', challengeAdmits: [],
} as never).detail.includes('https://v.test'), true)

const gates = CHECKS.find((c) => c.id === 'signup_no_captcha')!
// Eleven rows described server HTML from a page that had answered 403 to everyone.
check('bramki strony, ktorej nie dostalismy, sa niemierzalne', gates.evaluate({
  funnel: { signup: { url: 'https://v.test/signup', reachable: false, captcha: ['recaptcha'], rendersFormWithoutJs: false } },
} as never).inconclusive, true)
check('bramki strony, ktora dostalismy, sa mierzalne', gates.evaluate({
  funnel: { signup: { url: 'https://v.test/signup', reachable: true, captcha: ['recaptcha'], rendersFormWithoutJs: true } },
} as never).points, 0)

const surface = CHECKS.find((c) => c.id === 'mcp_present')!
// phrase.com, tolgee.io and medusajs.com all register a live endpoint in the MCP registry and all
// three were told "No MCP surface" on the sweep where the registry did not answer us in time.
const registrySilent = (registryAnswered: boolean) =>
  surface.evaluate({
    domain: 'v.test',
    funnel: { mcpEndpoints: [], mcpProbed: true, mcpPostsSwallowed: false, mcpRegistryAnswered: registryAnswered, mcpPagesFollowed: [] },
    machine: { wellKnown: {}, mcp: { mentions: 0, mentionsTruncated: false } },
  } as never)
check('milczacy rejestr MCP nie jest brakiem serwera', registrySilent(false).inconclusive, true)
check('rejestr, ktory odpowiedzial, zostawia werdykt', registrySilent(true).inconclusive, undefined)

console.log('odmowa, czyli czy powtorzyla sie na drugiej stronie')
// "Your edge answered ChatGPT-User 403" is an accusation about a named company built from one
// fetch of one page. savvycal.com was published as blocking ChatGPT-User on the strength of a
// single 429 and answers every named agent 200 when asked once.
check('403 dwa razy zostaje oskarzeniem', confirmedRefusals([{ name: 'ChatGPT-User', status: 403, second: 403 }]).length, 1)
check('403 raz, potem 200, znika', confirmedRefusals([{ name: 'ChatGPT-User', status: 403, second: 200 }]).length, 0)
check('404 na drugiej stronie to nie potwierdzenie', confirmedRefusals([{ name: 'Claude-User', status: 403, second: 404 }]).length, 0)
// The published status stays the one we met first, because that is the page the sentence names.
check('cytujemy pierwszy status', confirmedRefusals([{ name: 'Claude-User', status: 401, second: 403 }])[0]?.status, 401)

console.log('adres rejestracji, czyli czy cytujemy im wlasny tracking')
// Every one of these is a URL we published about a real company on formula 9.8.
check('utm z paska nawigacji', routeUrl('https://app.harness.io/auth/#/signup?module=fme&utm_source=split_io&utm_medium=nav_bar'), 'https://app.harness.io/auth/#/signup?module=fme')
check('ref z nawigacji', routeUrl('https://app.inngest.com/sign-up?ref=nav'), 'https://app.inngest.com/sign-up')
check('google analytics', routeUrl('https://dashboard.plaid.com/signup?_gl=1*k2v2l9*_gcl_au*MTI1'), 'https://dashboard.plaid.com/signup')
check('cta i cta_page', routeUrl('https://cloud.saleor.io/signup?cta=Get+Started&cta_page=%2F'), 'https://cloud.saleor.io/signup')
// Parameters that are part of the address stay, because the page we test has to be the page we
// print: browserless.io serves a different plan behind ?plan=free and maptiler needs its ?next=.
check('parametr funkcjonalny zostaje', routeUrl('https://www.browserless.io/signup/email?plan=free'), 'https://www.browserless.io/signup/email?plan=free')
check('next zostaje nietkniety, bez przekodowania', routeUrl('https://cloud.maptiler.com/auth/widget?next=https://cloud.maptiler.com/maps/'), 'https://cloud.maptiler.com/auth/widget?next=https://cloud.maptiler.com/maps/')
check('adres bez parametrow bez zmian', routeUrl('https://stripe.com/signup'), 'https://stripe.com/signup')

console.log('host dokumentacji, czyli czy pusta skorupa jest dokumentacja')
const page = (url: string) => ({ url })
const shell = { rank: 3_000_000, chars: 38, page: page('https://docs.v.test'), requested: 'https://docs.v.test' }
const real = { rank: 1_000_000, chars: 8431, page: page('https://support.v.test/developer/'), requested: 'https://developer.v.test' }
const leaderOf = (c: typeof shell) => ({ page: c.page, rank: c.rank, requested: c.requested })
// crowdin.com: docs.crowdin.com serves 38 characters of an in-app help application and outranks
// by a million points, and four checks read whichever page this returns.
check('pusta skorupa przegrywa z trescia', bestReadable(leaderOf(shell), [shell, real])?.page.url, 'https://support.v.test/developer/')
// twilio.com/en-us/developers carries more prose than twilio.com/docs, where the key page lives.
// Content is not allowed to reorder anything except a leader with nothing in it.
const richer = { rank: 1_000_000, chars: 40_000, page: page('https://v.test/marketing'), requested: 'https://v.test/marketing' }
const properDocs = { rank: 3_000_000, chars: 4_000, page: page('https://docs.v.test'), requested: 'https://docs.v.test' }
check('bogatsza strona nie przebija wlasciwej', bestReadable(leaderOf(properDocs), [properDocs, richer])?.page.url, 'https://docs.v.test')
// When every candidate is a shell the shell stays: that is a finding about the vendor.
check('same skorupy zostaja skorupa', bestReadable(leaderOf(shell), [shell])?.page.url, 'https://docs.v.test')

console.log('wybor stron dokumentacji, czyli czego w ogole nie mozemy przeczytac')
const eligible = (path: string) => CREDENTIAL_PAGE_HINTS.test(path)
// newrelic.com documents key creation here and the page was filtered out before ranking, because
// "license-keys" is not "api-keys". Nine of fifteen audited failures had no eligible page at all.
check('newrelic license keys', eligible('/docs/apis/nerdgraph/examples/use-nerdgraph-manage-license-keys-user-keys/'), true)
check('mux signing keys', eligible('/docs/api-reference/system/signing-keys'), true)
check('tigris access keys', eligible('/docs/cli/access-keys/create/'), true)
check('grafana service accounts', eligible('/docs/grafana/latest/administration/service-accounts/'), true)
// The filter still has to be capable of saying no, or every page on the site becomes a candidate.
check('post na blogu o czyms innym', eligible('/blog/how-we-scaled-postgres'), false)
const outranks = (better: string, worse: string) => hintRank(better) < hintRank(worse)
// mux.com's three best-ranked candidates were two changelog posts and a quickstart.
check('strona o kluczach bije changelog', outranks('/docs/api-keys', '/changelog/new-api-keys-ui'), true)
check('changelog i tak jest kandydatem', hintRank('/changelog/new-api-keys-ui') < Number.MAX_SAFE_INTEGER, true)
check('cudze klucze na koncu', outranks('/changelog/api-keys', '/docs/integrations/aws-api-key'), true)

console.log('rada naprawcza nie moze przeczyc werdyktowi obok')
// Both bugs this section exists for were reported by readers, not by us: the advice read fine on
// its own and contradicted the row it sat next to.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const remedy = (id: string, findings: unknown) => REMEDIES[id].how(findings as any, { points: 0 } as any)

const jsOnlySignup = { funnel: { signup: { url: 'https://example.test/signup', status: 200, reachable: true, rendersFormWithoutJs: false } } }
check(
  'strona rejestracji odpowiada 200, wiec nikt nie odmawia',
  remedy('signup_reachable', jsOnlySignup).includes('refus'),
  false,
)
check('mowi za to, czego tam nie ma', remedy('signup_reachable', jsOnlySignup).includes('no form'), true)

// Telling a vendor already answering 429 to "rate limit instead of refusing" was the whole bug.
check(
  'ten sam status dla przegladarki i agenta to nie regula wymierzona w agenty',
  remedy('answers_plain_request', { browserStatus: 429, agentStatus: 429 }).includes('rate limit instead'),
  false,
)
check(
  'rozne statusy nadal dostaja zdanie o wyjatku',
  remedy('answers_plain_request', { browserStatus: 200, agentStatus: 403 }).includes('Exempt them'),
  true,
)

// The verdict says when a package name came from a registry search; the advice used to give an
// order anyway. namecheap.com was told to ship types with node-vault-client, a Vault client that
// happens to share their publisher.
const npmRow = (npmSource: string) => ({
  npm: { package: 'node-vault-client', found: true, bundledTypes: false },
  discovered: { npmSource },
})
check(
  'nazwa z wyszukiwarki rejestru: rada mowi, ze zgadlismy',
  remedy('typed_package', npmRow('registry-search')).includes('not by a link on your site'),
  true,
)
check(
  'nazwa z ich wlasnej strony: rada nie hedguje',
  remedy('typed_package', npmRow('site-link')).includes('not by a link on your site'),
  false,
)
// 9.37: galaz o wieku paczki nie jest zdaniem o typach, wiec na paczce, ktora sami wybralismy z
// rejestru, nie moze byc oskarzeniem. Zmierzone: june.so oblane na `@june-so/analytics-node`,
// podczas gdy ten sam scope niesie `@june-so/analytics-next`, opisana w rejestrze jako ich SDK.
const typedCheck = CHECKS.find((one) => one.id === 'typed_package')!
const staleRow = (npmSource: string) =>
  typedCheck.evaluate({
    npm: { package: '@june-so/analytics-node', found: true, bundledTypes: true, staleMonths: 28, version: '1.0.0' },
    discovered: { npmSource },
  } as never)
// 9.40: oskarzenie o brak typow przechodzi tylko wtedy, gdy identyfikacja stoi. Zmierzone recznie
// na dziesieciu oblanych wierszach: cztery byly prawdziwe, szesc dotyczylo zlego artefaktu, wiec
// plaskie wylaczenie zniszczyloby prawdziwe znaleziska.
const untyped = (discovered: Record<string, unknown>) =>
  typedCheck.evaluate({
    npm: { package: 'node-vault-client', found: true, bundledTypes: false, version: '1.0.0' },
    discovered,
  } as never)
const solid = { npmSource: 'registry-search', npmOwnership: 'proved', npmSaysWhose: true, npmRivals: 0 }
check('wlasnosc udowodniona, paczka mowi o nich, brak rywali: oskarzenie stoi', untyped(solid).points, 0)
check('i nie jest niemierzalne', untyped(solid).inconclusive ?? false, false)
check('rywal o tym samym ksztalcie: niemierzalne', untyped({ ...solid, npmRivals: 1 }).inconclusive, true)
check('i zdanie mowi, ilu ich bylo', untyped({ ...solid, npmRivals: 1 }).detail.includes('1 other package of the same shape'), true)
check('paczka milczy o vendorze: niemierzalne', untyped({ ...solid, npmSaysWhose: false }).inconclusive, true)
check('wlasnosc tylko sugerowana: niemierzalne', untyped({ ...solid, npmOwnership: 'suggested' }).inconclusive, true)
// Wiersz zapisany przed 2026-08-18 nie ma tych pol. Rescore nie moze wtedy udawac, ze cos ustalil.
check('stary raport bez tych faktow: niemierzalne', untyped({ npmSource: 'registry-search' }).inconclusive, true)
// Paczka wskazana przez nich nie potrzebuje zadnej z tych bramek.
check('paczka z ich strony: oskarzenie stoi bez pytania', untyped({ npmSource: 'site' }).points, 0)
check('i tam tez nie jest niemierzalne', untyped({ npmSource: 'site' }).inconclusive ?? false, false)
check('stara paczka, ktora sami znalezlismy: niemierzalne', staleRow('registry-search').inconclusive, true)
check('i nie jest to oskarzenie o brak typow', staleRow('registry-search').detail.includes('is typed but'), true)
check('ta sama paczka wskazana przez nich: nadal oblewa', staleRow('site-link').inconclusive ?? false, false)
check('bo tam wiemy, ze to ta paczka', staleRow('site-link').points, 0)

// 52 of 91 rows in the plan are partial: provisioning language found, one phrase short. Telling
// them to document a management API when we just matched "management api" reads as not having looked.
const provRemedy = (points: number) => REMEDIES['programmatic_provisioning'].how({} as never, { points } as never)
check('wiersz czesciowy slyszy, ze jest o krok', provRemedy(1).includes('one phrase away'), true)
check('wiersz bez niczego slyszy, zeby udokumentowac', provRemedy(0).includes('Document how a key is created'), true)
check('i te dwa zdania nie sa tym samym', provRemedy(1) === provRemedy(0), false)

console.log('zliczenia w korpusie musza sie zgadzac same ze soba')
// The tally exists so nobody counts failures with points < max. It is worth nothing if it can
// disagree with the rows it summarises.
const tallyRow = (verdicts: string[]) => ({ checks: verdicts.map((v) => ({ id: 'x', verdict: v })) })
const tallyOf = (verdicts: string[]) => {
  const count = (want: string) => verdicts.filter((v) => v === want).length
  const [pass, partial, fail] = [count('pass'), count('partial'), count('fail')]
  return { pass, partial, fail, unmeasured: count('unmeasured'), notApplicable: count('notApplicable'), measured: pass + partial + fail }
}
const sample = ['pass', 'pass', 'fail', 'partial', 'unmeasured', 'notApplicable']
const t = tallyOf(sample)
check('measured to suma pass+partial+fail', t.measured, 4)
check('nieoznaczalne nie licza sie jako porazka', t.fail, 1)
check('wszystkie werdykty sa policzone', t.pass + t.partial + t.fail + t.unmeasured + t.notApplicable, sample.length)
void tallyRow

console.log('405 na POST: serwer czy tak dziala ich framework')
// openrouter.ai, medusajs.com i posthog.com odpowiadaly 405 bez naglowka Allow na /docs, /models,
// /pricing i na wlasnej stronie glownej. Wszystkie trzy byly opublikowane jako zywy serwer MCP.
const refusal = (headers: Record<string, string> = {}, body = '{"error":"Method not allowed"}') => ({ status: 405, headers, body })
check('strona glowna odpowiada tak samo, wiec to framework', methodRefusalIsRouted(refusal(), 405), false)
check('strona glowna odpowiada inaczej, wiec to ta sciezka', methodRefusalIsRouted(refusal(), 404), true)
check('zwykla strona mowi Allow: GET', methodRefusalIsRouted(refusal({ allow: 'GET, HEAD' }), 404), false)
check('HTML to strona z bledem, nie serwer', methodRefusalIsRouted(refusal({}, '<!DOCTYPE html><html><body>Nope</body></html>'), 404), false)
check('inny status niz 405 nie przechodzi ta droga', methodRefusalIsRouted({ ...refusal(), status: 404 }, 200), false)

console.log('errata wygasa sama, gdy wiersz zostanie zmierzony ponownie')
// The whole design rests on this: nobody has to remember to delete an entry. If the comparison
// were string-based, "9.8" would sort after "9.12" and every correction would vanish too early.
// The fixture comes from the entry, because errata are no longer all about MCP addresses: the
// generated one assumed they were, and nine entries about signup forms and unreachable registries
// failed a test that was really testing its own fixture.
const wrongSentence = (entry: (typeof ERRATA)[number]) => entry.example
for (const entry of ERRATA) {
  check(`${entry.domain} nadal wymaga sprostowania na starej formule`, erratumFor(entry.domain, entry.checkId, '9.8', wrongSentence(entry)) !== null, true)
  check(`${entry.domain} nie wymaga go po naprawie`, erratumFor(entry.domain, entry.checkId, entry.fixedIn, wrongSentence(entry)) !== null, false)
  check(`${entry.domain} nie wymaga go na nowszej formule`, erratumFor(entry.domain, entry.checkId, '10.0', wrongSentence(entry)) !== null, false)
}
check('sprostowanie nie wycieka na inny check', erratumFor(ERRATA[0].domain, 'llms_txt', '9.8', wrongSentence(ERRATA[0])) !== null, false)
check('ani na inna domene', erratumFor('example.com', ERRATA[0].checkId, '9.8', wrongSentence(ERRATA[0])) !== null, false)
// The bug this pins: openrouter.ai sat on formula 9.9, before the fix, with a row that already
// named mcp.openrouter.ai/mcp, and the page told a reader that row points at documentation.
check(
  'wiersz na starej formule, ktory juz jest poprawny, NIE dostaje sprostowania',
  erratumFor('openrouter.ai', 'mcp_present', '9.9', 'Live MCP endpoint at https://mcp.openrouter.ai/mcp, answered 401 with an auth challenge') !== null,
  false,
)
check(
  'a ten sam wiersz wskazujacy dokumentacje juz tak',
  erratumFor('openrouter.ai', 'mcp_present', '9.9', 'Live MCP endpoint at https://openrouter.ai/docs/guides/overview/mcp-server') !== null,
  true,
)

// The alarm is worth having only if it fires before the wall, not on it. 4740 MB is where the
// 13 August outage started; a threshold that only trips there would have warned nobody.
check('dzisiejsze 2849 MB to jeszcze spokoj', verdictFor(2849), 'ok')
check('4200 MB ostrzega, zanim zapisy padna', verdictFor(4200), 'warning')
check('4740 MB, czyli poziom awarii z 13.08, jest krytyczne', verdictFor(4740), 'critical')
check(
  'mail nazywa najwieksza baze, bo to ona decyduje, gdzie szukac miejsca',
  quotaEmail({
    usedMb: 4200, quotaMb: FLEX_QUOTA_MB, percent: 82, verdict: 'warning', measuredAt: '',
    databases: [{ name: 'equity-analyst', mb: 4000 }, { name: 'stackpick', mb: 200 }],
  }).text.includes('Largest is equity-analyst'),
  true,
)

// statsig.com answers only at the versioned address on the api host, and we published that they
// run no server. The bare and versioned forms are different addresses on both hosts we probe.
const statsig = mcpCandidates('statsig.com', 'https://statsig.com')
check('sondujemy wersjonowany adres na hoscie api', statsig.includes('https://api.statsig.com/v1/mcp'), true)
check('i nadal ten bez wersji', statsig.includes('https://api.statsig.com/mcp'), true)
check('adresy z karty vendora ida pierwsze', mcpCandidates('x.com', 'https://x.com', ['https://z.example/mcp'])[0], 'https://z.example/mcp')
check('lista nie powtarza adresow', new Set(statsig).size, statsig.length)

// "error tracking" is what this category calls itself, and the verb belongs to product analytics,
// so the two scored dead level and the tool said nothing. The last two pin the half that must not
// move: a caller who really means analytics still gets analytics.
check('track errors trafia w monitoring bledow', categoryForJob('track errors in production')?.id, 'error-monitoring')
check('error tracking tak samo', categoryForJob('we need error tracking for the mobile app')?.id, 'error-monitoring')
check('tracking exceptions tak samo', categoryForJob('tracking exceptions across our services')?.id, 'error-monitoring')
check('ale track klikniec zostaje w analityce', categoryForJob('track how many users click the upgrade button')?.id, 'product-analytics')
check('i track lejkow tez', categoryForJob('track conversion funnels')?.id, 'product-analytics')

// "meaning" was filed for vector search and stems to "mean", so an ordinary sentence about what
// something would mean scored vector databases level with the question it was really asking.
check('would mean nie ciagnie juz do wektorow', categoryForJob('a failover would mean real downtime for us')?.id, undefined)
check('a postgres w tym samym zdaniu trafia w bazy', categoryForJob('we are running postgres on a box and a failover would mean real downtime')?.id, 'databases')
check('google sheet nie jest pytaniem o logowanie', categoryForJob('the copy team works out of a google sheet')?.id, undefined)
check('ale sens zdania o znaczeniu zostaje', categoryForJob('recommend similar articles based on meaning not keywords')?.id, 'vector-search')

// froala.com answers 403 and contentful.com 429, and both were published as "no documentation page
// could be found", which reads as a fact about their product and is a fact about their edge. The
// check next door named the status on the same scan; these two never did.
const docsJs = CHECKS.find((c) => c.id === 'docs_without_js')!
const noDocs = (docsStatus?: number) =>
  docsJs.evaluate({ site: 'https://v.test', discovered: {}, machine: { markdownNegotiation: { docsStatus } } } as never).detail
check('403 przy szukaniu dokumentacji jest nazwane', noDocs(403).includes('answered 403'), true)
check('429 tak samo', noDocs(429).includes('answered 429'), true)
// Zero is not a refusal: http.ts returns it for our own expired scan budget as well, so this
// falls back to the sentence that blames nobody.
check('zero NIE jest odmowa, bo to takze nasz timeout', noDocs(0).includes('no documentation page could be found'), true)
check('ale 200 zostaje przy starym zdaniu', noDocs(200).includes('no documentation page could be found'), true)
check('i brak pomiaru tez', noDocs(undefined).includes('no documentation page could be found'), true)
const prov3 = CHECKS.find((c) => c.id === 'programmatic_provisioning')!
const provRefused = (docsStatus?: number) =>
  prov3.evaluate({
    site: 'https://v.test', funnel: { provisioning: { programmatic: [] } }, docsPagesRead: 0,
    docsPagesReadUrls: [], machineFilesRead: 0, docsPagesUnreadStatuses: [], docsPagesUnread: 0,
    machine: { markdownNegotiation: { docsStatus } },
  } as never).detail
check('provisioning tez nazywa odmowe', provRefused(403).includes('answered 403'), true)
check('a bez odmowy mowi to co dawniej', provRefused(200).includes('could not read a single documentation page'), true)

// An npm library has no server to issue tokens, so "no registration_endpoint" reads as a
// deficiency where there is no facility. The signup checks and self_serve already draw this line
// for the same eight rows; oauth_dcr was still charging them for it.
const dcr = CHECKS.find((c) => c.id === 'oauth_dcr')!
const dcrFor = (discovered: Record<string, unknown>) =>
  dcr.evaluate({
    funnel: { oauth: { probedHosts: 8, metadataPublished: false, dynamicClientRegistration: false } },
    discovered,
    blocksPlainRequests: false,
  } as never)
check('biblioteka bez cennika i konta: nie dotyczy', dcrFor({}).notApplicable, true)
check('vendor z cennikiem dostaje werdykt', dcrFor({ pricing: 'https://v.test/pricing' }).notApplicable, undefined)
check('vendor z rejestracja tez', dcrFor({ signup: 'https://v.test/signup' }).notApplicable, undefined)
check('i nadal jest to odmowa, nie milczenie', dcrFor({ pricing: 'https://v.test/pricing' }).inconclusive, undefined)

// Zero hosts asked is not zero metadata found. Every probe dropped before it left means we have
// nothing to publish about them, and the sentence must not name a document we never requested.
const dcrNothingSent = dcr.evaluate({
  funnel: { oauth: { probedHosts: 0, metadataPublished: false, dynamicClientRegistration: false } },
  discovered: { pricing: 'https://v.test/pricing' },
  blocksPlainRequests: false,
} as never)
check('zero zapytanych hostow: niemierzalne', dcrNothingSent.inconclusive, true)
check('i zdanie nie mowi o apeksie', dcrNothingSent.detail.includes('on the apex'), false)

// The scan budget is per registrable name and the message named the host the caller typed, so a
// first-ever scan of docs.acme.com was told that docs.acme.com had been scanned five times.
check('apex mowi o sobie', overDomainBudget('acme.com', 'acme.com', 3).startsWith('acme.com has been scanned'), true)
check('subdomena mowi o domenie i jej subdomenach', overDomainBudget('docs.acme.com', 'acme.com', 3).startsWith('acme.com and its subdomains have been scanned'), true)
check('subdomena NIE twierdzi, ze skanowano wlasnie ja', overDomainBudget('docs.acme.com', 'acme.com', 3).includes('docs.acme.com has'), false)
check('jedna minuta w liczbie pojedynczej', overDomainBudget('acme.com', 'acme.com', 1).endsWith('in 1 minute.'), true)

// Only openrouter.ai was pinned, and its regex happened not to match the corrected sentence. Its
// two siblings did: /posthog\.com\/mcp/ matches "mcp.posthog.com/mcp", so a row that had already
// been fixed would have carried a correction saying it names a documentation page.
for (const domain of ['posthog.com', 'medusajs.com']) {
  const good = `Live MCP endpoint at https://mcp.${domain}/mcp, answers JSON`
  const bad = `Live MCP endpoint at https://${domain}/mcp, answers JSON`
  check(`${domain}: poprawne zdanie NIE dostaje sprostowania`, erratumFor(domain, 'mcp_present', '9.9', good) !== null, false)
  check(`${domain}: zle zdanie dostaje`, erratumFor(domain, 'mcp_present', '9.9', bad) !== null, true)
}

// A reseed's cold first pass moves two dozen checks from unmeasured to pass, and a watcher active
// that hour would have been mailed about our npm cache. The second pair pins the half that must
// keep working: a real regression still writes.
const move = (from: string, to: string) => ({ checkId: 'typed_package', label: 'x', from, to, detail: '', worse: false }) as never
check('samo unmeasured -> pass nie jest powodem maila', worthTelling([move('unmeasured', 'pass')]), false)
check('ani pass -> unmeasured, gdy to nasz pomiar', worthTelling([move('pass', 'unmeasured')]), false)
// The exception that is the whole product: a customer switching on bot protection moves checks to
// unmeasured and nothing else, and that is the email they signed up for.
check('ale pass -> unmeasured PRZY blokadzie ich brzegu juz tak', worthTelling([move('pass', 'unmeasured')], true), true)
check('blokada brzegu bez zadnej zmiany to nadal brak maila', worthTelling([], true), false)
check('sygnal brzegu: blocksPlainRequests', turnedAwayAtTheEdge({ blocksPlainRequests: true }), true)
check('sygnal brzegu: nieczytelny robots.txt', turnedAwayAtTheEdge({ robots: { unreadable: true } }), true)
check('zwykly skan nie jest blokada', turnedAwayAtTheEdge({ blocksPlainRequests: false, robots: { unreadable: false } }), false)
check('ale pass -> fail juz tak', worthTelling([move('pass', 'fail')]), true)
check('i fail -> pass tez', worthTelling([move('fail', 'pass')]), true)
check('mieszanka liczy sie przez zmierzona czesc', worthTelling([move('unmeasured', 'pass'), move('pass', 'fail')]), true)
check('brak zmian to brak maila', worthTelling([]), false)

// Reading a discovery run means deciding who an English paragraph names, and half this corpus is
// branded with ordinary words. The negatives below are sentences a competent answer about the
// category actually contains, and every one of them would be a vendor mention under a matcher
// that only looked for the brand token.
// Druga fala MCP: adresy czytane ze stron, ktore vendor sam wskazuje w swoich plikach. Regula
// musi rozrozniac ICH adres od cudzego i endpoint od strony o endpoincie, bo inaczej zaliczylaby
// vendorowi serwer, ktorego nie zbudowal.
console.log('\nadresy MCP z ich wlasnej dokumentacji')
check('inna domena tej samej marki to ich adres', readsAsTheirOwnAddress('https://mcp.neon.tech/mcp', 'neon.com'), true)
check('ich wlasny host oczywiscie tez', readsAsTheirOwnAddress('https://mcp.launchdarkly.com/mcp/launchdarkly', 'launchdarkly.com'), true)
check('modelcontextprotocol na githubie to nie ich serwer', readsAsTheirOwnAddress('https://github.com/modelcontextprotocol/servers', 'neon.com'), false)
check('katalog trzeciej strony tez nie', readsAsTheirOwnAddress('https://smithery.ai/server/neon', 'neon.com'), false)
// Krotka marka jest slowem, ktore trafia wszedzie, wiec regula marki jej nie obejmuje.
check('krotka marka nie awansuje cudzej domeny', readsAsTheirOwnAddress('https://mcp.cal.tech/mcp', 'cal.com'), false)
check('endpoint na dedykowanym hoscie', readsAsAnEndpoint('https://mcp.neon.tech/mcp'), true)
check('sciezka /mcp na ich hoscie', readsAsAnEndpoint('https://api.statsig.com/v1/mcp'), true)
check('plik markdown to nie endpoint', readsAsAnEndpoint('https://neon.com/docs/ai/neon-mcp-server.md'), false)
check('strona z mcp w nazwie to nie endpoint', readsAsAnEndpoint('https://neon.com/docs/ai/neon-mcp-server'), false)
check('strona dokumentacji konczaca sie na /mcp tez nie', readsAsAnEndpoint('https://launchdarkly.com/docs/home/getting-started/mcp'), false)

console.log('\nkto jest wymieniony w odpowiedzi, czyli czy matcher umie nie znalezc')
const namedIn = (text: string, domains: string[]) => certain(mentionsIn(text, domains)).map((mention) => mention.domain).join()
const formOf = (text: string, domain: string) => mentionsIn(text, [domain])[0]?.form ?? 'none'

check('pelna domena to pewne trafienie', formOf('see https://uploadcare.com/docs/upload', 'uploadcare.com'), 'domain')
check('sama marka tez, gdy nie jest slowem', formOf('I would reach for Uploadcare here', 'uploadcare.com'), 'name')
check('marka dwuwyrazowa', formOf('New Relic covers the traces', 'newrelic.com'), 'name')
check('marka inna niz domena', formOf('Postmark wins on deliverability', 'postmarkapp.com'), 'name')
check('nikt nie wymieniony to pusta lista', namedIn('roll your own with S3 and be done', ['uploadcare.com']), [].join())

check('modal okna dialogowego to nie Modal', formOf('open a modal dialog when the upload finishes', 'modal.com'), 'none')
check('resend maila to nie Resend', formOf('let the user resend the confirmation email', 'resend.com'), 'none')
check('split ruchu to nie Split', formOf('split the traffic between two variants', 'split.io'), 'none')
check('here w zdaniu to nie HERE', formOf('here is the plan I would follow', 'here.com'), 'none')
check('temporal ordering to nie Temporal', formOf('the temporal ordering of the events matters', 'temporal.io'), 'none')
check('sanity check to nie Sanity', formOf('give the payload a sanity check first', 'sanity.io'), 'none')
check('nazwa bucketu to nie name.com', formOf('give the bucket a name and a region', 'name.com'), 'none')
check('cal w kodzie to nie Cal.com', formOf('const cal = new Calendar()', 'cal.com'), 'none')

// Capitalised, the same words are genuinely ambiguous, so they are neither counted nor thrown
// away: `weak` means a human reads the sentence that travels with the hit.
check('Modal z duzej litery to niepewne', formOf('Modal is a good fit for GPU jobs', 'modal.com'), 'weak')
check('i niepewne nie liczy sie do wyniku', namedIn('Modal is a good fit for GPU jobs', ['modal.com']), [].join())
check('ale domena obok juz tak', namedIn('Modal (modal.com) is a good fit', ['modal.com']), 'modal.com')
check('cytat leci razem z niepewnym trafieniem', mentionsIn('Modal is a good fit.', ['modal.com'])[0].sentence, 'Modal is a good fit.')

// Kropka w adresie nie konczy zdania. Raport za 49 USD dla vercel.com opublikowal piec z szesciu
// cytatow codeksa jako „[Vercel limits](https://vercel." - trafienie siedzi w domenie, a zdanie
// bylo ciete na jej wlasnej kropce, wiec platny cytat nie niosl ani jednego slowa o vendorze.
const INLINE_LINK = 'Vercel jest tu oczywisty. [Vercel limits](https://vercel.com/docs/limits) dotycza funkcji. Render to druga opcja.'
const linkQuote = mentionsIn(INLINE_LINK, ['vercel.com'])[0].sentence
check('cytat nie urywa sie na kropce w domenie', linkQuote, '[Vercel limits](https://vercel.com/docs/limits) dotycza funkcji.')
check('i nie wciaga poprzedniego zdania', linkQuote.includes('oczywisty'), false)
check('kropka konczaca zdanie nadal konczy', mentionsIn('Wybieram Fly.io. Render odpada.', ['fly.io'])[0].sentence, 'Wybieram Fly.io.')
// Zdanie konczy sie takze pod zamknieciem wyroznienia albo cudzyslowu, inaczej cytat dla vendora
// wciaga zdanie o konkurencie. Znalezione przez codex review, 2026-08-17.
check('kropka pod pogrubieniem konczy zdanie', mentionsIn('**Vercel jest wyborem.** Render odpada.', ['vercel.com'])[0].sentence, '**Vercel jest wyborem.**')
check('kropka pod cudzyslowem tez', mentionsIn('"Vercel jest wyborem." Render odpada.', ['vercel.com'])[0].sentence, '"Vercel jest wyborem."')
check('i nawias domykajacy', mentionsIn('(Vercel jest wyborem.) Render odpada.', ['vercel.com'])[0].sentence, '(Vercel jest wyborem.)')

// Prog cytatu w audycie dostawy: nie liczba slow, tylko czy czytelnik wynosi z niego cokolwiek.
check('cytat z samego linku nie niesie ani slowa', wordsCarried('[Vercel limits](https://vercel.com/docs/limits) |'), 0)
check('krotkie zdanie obok linku juz tak', wordsCarried('[Git deployments](https://vercel.com/docs/git) | Best if the API can become functions.') > 0, true)
check('cztery slowa to nadal cytat', wordsCarried('Neon bylby moim wyborem.') > 0, true)
check('sam adres bez linku tez nie niesie slowa', wordsCarried('vercel.com |'), 0)
check('ani adres ze sciezka', wordsCarried('| vercel.com/docs/limits |'), 0)

// Cytat dla vendora nie moze pochodzic ze zdania, w ktorym jego nazwa jest zwyklym slowem, nawet
// gdy stoi z wielkiej litery na poczatku zdania. Znalezione przez codex review, 2026-08-17.
const SPLIT_WORD = 'Split the traffic across two regions first. We picked split.io for the flags.'
check('zdanie o dzieleniu ruchu nie jest cytatem o Split', quotedAbout(SPLIT_WORD, 'split.io', ['split.io']), 'We picked split.io for the flags.')
check('ale wyrozniona marka juz tak', quotedAbout('**Split** obsluguje flagi w kilku regionach naraz. Reszta odpada.', 'split.io', ['split.io']), '**Split** obsluguje flagi w kilku regionach naraz.')
// ...a gdy marka jest juz ustalona w tej samej odpowiedzi, zwykle zdanie o niej wraca do gry:
// inaczej cytatem zostawalby wiersz tabeli, a nie zdanie. Znalezione przez codex review.
const NEON_TABLE = '| [Neon](https://neon.com) | serverless Postgres |\nNeon bylby moim wyborem przy branchowaniu.'
check('ustalona marka odblokowuje pozniejsze zdanie', quotedAbout(NEON_TABLE, 'neon.com', ['neon.com']), 'Neon bylby moim wyborem przy branchowaniu.')

// Typografia rozstrzyga to, czego sasiad nie moze. Strony kategorii publikuja zdanie „nie padl ani
// razu", a audyt tego zdania 2026-08-17 znalazl trzy firmy, o ktorych bylo nieprawdziwe.
check('wyroznienie robi z niepewnego pewne', formOf('postawilbym na **Sanity**: natywny Draft Mode', 'sanity.io'), 'name')
check('backtick tak samo', formOf('uzyj `Neon` jako bazy', 'neon.com'), 'name')
check('powtorzenie z wielkiej litery tez', formOf('Neon bylby moim wyborem. Neon to zarzadzany Postgres', 'neon.com'), 'name')
check('jedno wystapienie z wielkiej nadal niepewne', formOf('Neon is one option', 'neon.com'), 'weak')
// here.com pisze o sobie HERE, a jedyny bezpieczny alias brzmial „HERE Technologies", wiec piec
// odpowiedzi na piec liczylo sie jako nigdy ich nie wymieniono.
check('HERE wersalikami to firma', formOf('rozwazalem HERE jako tansza alternatywe', 'here.com'), 'name')
check('here malymi to nadal zwykle slowo', formOf('here is the plan, step by step', 'here.com'), 'none')
check('fragment innego slowa nie liczy sie', formOf('Namecheap i OpenSRS sa lepsze', 'name.com'), 'none')

// Zwykle slowo stojace obok dostawcy, ktorego nie da sie pomylic, jest marka. Zdanie nizej to
// cytat z celi payments, gdzie Paddle padl w pieciu biegach na piec i nie zostal policzony.
const MOR = 'Alternatywa to Merchant of Record (Paddle, Lemon Squeezy), ktory bierze VAT na siebie.'
check('Paddle obok Lemon Squeezy juz sie liczy', namedIn(MOR, ['paddle.com', 'lemonsqueezy.com']), 'paddle.com,lemonsqueezy.com')
check('ale sam w zdaniu nadal nie', formOf('Paddle is worth a look for EU VAT', 'paddle.com'), 'weak')
check('mala litera nie awansuje przez sasiada', namedIn('we split the traffic in LaunchDarkly', ['split.io', 'launchdarkly.com']), 'launchdarkly.com')
// Dwa zwykle slowa z TEJ SAMEJ kategorii w jednym zdaniu to lista dostawcow, nawet gdy nie ma
// obok nich nikogo pewnego. Cytat z celi llm-infrastructure, gdzie sasiedzi (Ollama, vLLM) nie sa
// w naszym korpusie, wiec poprzednia regula nie miala sie czego chwycic.
const GPU = 'Self-hosted modele (Ollama, vLLM, Replicate, Modal) odrzucone od razu.'
check('dwie marki-slowa w jednym zdaniu licza sie obie', namedIn(GPU, ['replicate.com', 'modal.com']), 'replicate.com,modal.com')
check('jedna marka-slowo sama nadal nie', namedIn('Replicate wygladalo sensownie.', ['replicate.com', 'modal.com']), '')

// Pytanie, ktore wymienia dostawce, samo sobie odpowiedzialo. Regula jest zapisana w
// harness/asks/README.md i do dzis nikt jej nie sprawdzal, a plikow jest 25 i beda przybywac.
console.log('\npytania rozpoznawcze nie moga wymieniac zadnego dostawcy')
const ALL_DOMAINS = [...CURATED_DOMAINS]
for (const file of readdirSync('harness/asks').filter((name) => name.endsWith('.md') && name !== 'README.md')) {
  const question = readFileSync(`harness/asks/${file}`, 'utf8')
  const named = certain(mentionsIn(question, ALL_DOMAINS)).map((mention) => mention.domain)
  check(`${file}: zaden dostawca nie pada w pytaniu`, named.join(), '')
}

// Liczba checkow i punktow rosnie, a zdanie wypisane slowem nie. `/methodology` mowilo
// jednoczesnie „Sixteen points exist on paper" i „16 checks, 18 points", bo pierwsze bylo wpisane
// recznie, gdy punktow bylo szesnascie. Komentarze pomijamy: opisuja historie, a nie to, co widzi
// czytelnik.
console.log('\nzadna strona nie wypisuje liczby checkow ani punktow slowem')
const SPELLED = /\b(ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\s+(points|checks)\b/i
const pagesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? pagesUnder(`${dir}/${entry.name}`) : entry.name === 'page.tsx' ? [`${dir}/${entry.name}`] : [],
  )
// To samo dla limitow, ktore obiecujemy agentom maszynowo. `agent-access.json` mowilo „10 na
// godzine na adres", a naprawde jest 5 na domene i 30 na adres: agent planujacy pod ta liczbe albo
// dusi sie bez powodu, albo wpada w 429. Plik jest statyczny, wiec nic go samo nie poprawi.
const agentAccess = JSON.parse(readFileSync('public/.well-known/agent-access.json', 'utf8')) as {
  rate_limit: { limits: { requests: number; scope: string }[] }
}
const promised = (scope: string) => agentAccess.rate_limit.limits.find((one) => one.scope.includes(scope))?.requests
check('agent-access.json obiecuje prawdziwy limit na domene', promised('domain'), PER_DOMAIN_PER_HOUR)
check('i prawdziwy limit na adres', promised('source address'), PER_CALLER_PER_HOUR)
// Ten sam plik obiecywal „Takes 15-30s", a zmierzone skany to 7,3 s i 12,4 s. Liczba idzie ze
// stalej, ale opisuje to, czym ta stala jest: budzet POBIERANIA, a nie gwarancja czasu odpowiedzi.
// Punktowanie i zapis ida po nim, wiec obietnica „nigdy pozniej niz 27 s" bylaby nieprawdziwa.
// Porownanie idzie do DOMYSLNEJ stalej, a nie do skonfigurowanej: SCAN_BUDGET_MS wolno nadpisac
// zmienna srodowiskowa, a straznik chodzi w buildzie i zablokowalby taka konfiguracje.
check(
  'agent-access.json podaje prawdziwy budzet skanu',
  JSON.stringify(agentAccess).includes(`${DEFAULT_SCAN_BUDGET_MS / 1000} second budget`),
  true,
)
// Te same liczby w prozie dla agentow, cyframi zamiast slowem wlasnie po to, zeby dalo sie ich
// pilnowac. Plikow jest dwa i oba obiecuja co innego czytelnikowi niz kod robi.
for (const file of ['public/agents.md', 'public/agent-signup.md']) {
  const told = readFileSync(file, 'utf8')
  check(`${file}: limit na domene`, told.includes(`${PER_DOMAIN_PER_HOUR} scans per hour`), true)
  check(`${file}: limit na adres`, told.includes(`${PER_CALLER_PER_HOUR} per hour`), true)
}

// Ten sam rozjazd, tylko w pliku statycznym: `public/llms.txt` pisze liczbe checkow z reki, a
// zadna strona go nie renderuje, wiec nikt by nie zauwazyl. To akurat plik, ktory sami kazemy
// publikowac vendorom.
check(
  'public/llms.txt zgadza sie z liczba checkow',
  readFileSync('public/llms.txt', 'utf8').includes(`${CHECKS.length} deterministic checks`),
  true,
)
for (const page of pagesUnder('src/app')) {
  const withoutComments = readFileSync(page, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')
  check(`${page}: liczba idzie ze stalej, nie ze slowa`, SPELLED.exec(withoutComments)?.[0] ?? '', '')
}

// Runbook platnosci wymienia produkty do zalozenia u dostawcy. Katalog jest zrodlem prawdy o
// cenach i o nazwach zmiennych, wiec dopisanie produktu bez wpisu w runbooku znaczy, ze ktos
// zalozy u dostawcy o jeden produkt za malo i platnosc za niego przepadnie bez dopasowania.
console.log('\nrunbook platnosci wymienia kazdy produkt z katalogu')
const runbook = readFileSync('docs/turning-billing-on.md', 'utf8')
const catalogSource = readFileSync('src/lib/billing/catalog.ts', 'utf8')
for (const sku of CATALOG) {
  const suffix = sku.id.toUpperCase().replace(/-/g, '_')
  // Wiersz tabeli, a nie caly dokument: szukanie „$49" gdziekolwiek przechodzi na „$499" z innego
  // wiersza, a zamiana zmiennych miedzy wierszami zostaje niezauwazona. Wytkniete przez codeksa.
  const row = runbook.split('\n').find((line) => line.startsWith('|') && line.includes(`\`${sku.id}\``))
  check(`${sku.id}: ma wlasny wiersz w runbooku`, Boolean(row), true)
  check(`${sku.id}: z prawdziwa cena w tym wierszu`, row?.includes(`| ${priceOf(sku)} |`), true)
  check(`${sku.id}: i wlasna nazwa zmiennej`, row?.includes(`BILLING_PRICE_${suffix}`), true)
  // Domkniecie petli: runbook kaze ustawic zmienna, ktora katalog naprawde czyta.
  check(`${sku.id}: katalog czyta te sama zmienna`, catalogSource.includes(`priceId('${suffix}')`), true)
}

// Kazdy platnik jest goscia: korpus to lista, ktora sami wybralismy, a kupuja ci, ktorych na niej
// nie ma. Miesieczny mail czytal gotowe wiersze celi, wiec goscia liczyl na zero, ktorego nikt nie
// mierzyl - i wyslalby platnikowi „wymieniony w 0 z 10" o biegach, w ktorych nie bylo go w liscie.
console.log('\nobserwacja spoza korpusu ma kategorie i prawdziwe liczby')
const asWatch = (over: Record<string, unknown>) => ({ domain: 'gosc.test', placedIn: null, ...over }) as never
const noneKnown = () => null
check(
  'domena, ktora publikujemy, bierze swoja kategorie',
  categoryOfWatch(asWatch({ domain: 'stripe.com' }), () => ({ id: 'payments' }), CATEGORIES)?.id,
  'payments',
)
check(
  'domena spoza listy bierze przypisana',
  categoryOfWatch(asWatch({ placedIn: 'transactional-email' }), noneKnown, CATEGORIES)?.id,
  'transactional-email',
)
check('bez przypisania nie ma kategorii', categoryOfWatch(asWatch({}), noneKnown, CATEGORIES), null)
check('nieistniejaca kategoria to tez brak', categoryOfWatch(asWatch({ placedIn: 'nie-ma-takiej' }), noneKnown, CATEGORIES), null)
// Kontrolka: sonda musi umiec policzyc goscia, inaczej „zero" nadal nic nie znaczy.
const answers = [{ answers: [{ text: 'I would use Buttondown for this, over postmarkapp.com.' }, { text: 'Postmark is the one I would pick.' }] }]
const counted = readWithGuest(answers, 'buttondown.com', ['postmarkapp.com'], 'Buttondown')
check('gosc jest policzony, gdy pada w odpowiedzi', counted.named.get('buttondown.com'), 1)
check('i reszta jest przeliczona obok niego', counted.named.get('postmarkapp.com'), 2)
check('a pierwszenstwo liczy sie z nim w liscie', counted.first.get('buttondown.com'), 1)

// Klucz IndexNow: plik musi zawierac wlasna nazwe, bo inaczej silnik traktuje kazde zgloszenie jako
// cudze i NIC nie mowi. Cicha porazka z definicji, wiec pilnowana tutaj, a nie odkrywana po tygodniu.
console.log('\nklucz IndexNow zgadza sie z wlasna nazwa pliku')
const keyFile = readdirSync('public').find((name) => /^[0-9a-f]{32}\.txt$/.test(name))
check('plik klucza istnieje', Boolean(keyFile), true)
if (keyFile) {
  check('i zawiera swoja nazwe', readFileSync(`public/${keyFile}`, 'utf8').trim(), keyFile.replace(/\.txt$/, ''))
}

// Arytmetyka platnego raportu: naglowek mowil „9 of 16 measurable points" nad tabela, ktora sumuje
// sie do 17, i nic tego nie tlumaczylo, bo brakujacy punkt to check, ktory klienta nie dotyczy.
// Regula jest jedna: jesli kolumna nie sumuje sie do mianownika, sekcja musi powiedziec dlaczego.
console.log('\nraport tlumaczy wlasna arytmetyke')
const cardWith = (extra: Record<string, unknown>, stageMax: number) => ({
  card: {
    formulaVersion: FORMULA_VERSION,
    total: 9,
    max: 17,
    measurable: 16,
    stages: [{ stage: 'discovery', letter: 'A', title: 'Discovery', question: '?', points: 9, max: stageMax, measurable: stageMax }],
    checks: [{ id: 'robots_paths_resolve', label: 'Paths robots.txt points at answer', detail: 'nie ma czego sprawdzac', points: 0, max: 1, ...extra }],
  },
  scannedAt: '2026-08-17T00:00:00Z',
  findings: {},
}) as never
check('check, ktory nie dotyczy, jest wytlumaczony', arithmeticExplained(cardWith({ notApplicable: true }, 17)), true)
check('check niemierzalny tez', arithmeticExplained(cardWith({ inconclusive: true }, 17)), true)
// Kontrolka: sonda musi umiec powiedziec „nie".
check('a rozjazd bez zadnego powodu jest wytykany', arithmeticExplained(cardWith({}, 17)), false)
check('gdy kolumna zgadza sie z mianownikiem, nie ma czego tlumaczyc', arithmeticExplained(cardWith({}, 16)), true)
check(
  'i sekcja cytuje check, ktory nie dotyczy',
  scoreSection(cardWith({ notApplicable: true }, 17)).join('\n').includes('Paths robots.txt points at answer'),
  true,
)

console.log(failures === 0 ? '\nwszystkie reguły zachowują się jak opisane' : `\n${failures} reguł nie zachowuje się jak opisane`)
process.exit(failures === 0 ? 0 : 1)
