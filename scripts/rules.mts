import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { coverageLine } from './how-many'
import { readsAsPolish } from '../src/lib/vendors'
import { createHmac } from 'node:crypto'
import { paddle } from '../src/lib/billing/provider'
import { CATEGORIES, CURATED_DOMAINS } from '../src/lib/categories'
import { overDomainBudget } from '../src/lib/scan-gate'
import { spreadAcrossHints } from '../src/lib/scan'
import { aboutTheirOwnCode, categoryForJob } from '../src/lib/lookup'
import { pickHeadline } from '../src/lib/headline'
import { FRESH_QUESTIONS, HELD_OUT_2, HELD_OUT_3, HELD_OUT_4, HELD_OUT_5, HELD_OUT_6, HELD_OUT_7 } from './routing-questions'
import { asksUsToStayOut, crawlDelayForAgents, parseRobots, stanceFrom } from '../src/lib/scan/robots'
import { CONTROLLER_IS_NAMED } from '../src/lib/seller'
import { WATCH_FIELDS_DISCLOSED } from '../src/lib/watch'
import { stayOutAfter } from '../src/lib/stayout'
import { crawlerName } from '../src/lib/visits'
import { thinnerForAgents } from '../src/lib/scan'
import { declaredSpecs } from '../src/lib/scan/machine'
import { looksLikeEntryPackage, readBulkDownloads, readsAsOwnedBy, readsAsTheirLibrary, shapeRankOf } from '../src/lib/scan/discover'
import { changesBetween, comparableScorecards, rulesChangedBetween, turnedAwayAtTheEdge, worthTelling } from '../src/lib/watch'
import { withoutTags } from '../src/lib/scan/http'
import { isOlderThan } from '../src/lib/formula'
import { buildFixPlan } from '../src/lib/fixfirst'
import { changeEmail, confirmEmail } from '../src/lib/watch-email'
import { CHECKS, FORMULA_VERSION } from '../src/lib/score'
import { CORPUS_LICENCE, CORPUS_LICENCE_IS_PUBLISHED } from '../src/lib/seller'
import { arithmeticExplained, scoreSection } from '../src/lib/report-numbers'
import { categoryOfWatch } from '../src/lib/watch'
import { readWithGuest } from '../src/lib/guest-cell'
import { PER_CALLER_PER_HOUR, PER_DOMAIN_PER_HOUR, REUSE_WINDOW_MS } from '../src/lib/scan-gate'
import { addressProtectsNothing } from '../src/lib/store'
import { DEFAULT_SCAN_BUDGET_MS, MAX_PER_SITE, backoffFor } from '../src/lib/scan/http'
import { forStorage } from '../src/lib/store'
import { REMEDIES } from '../src/lib/fixfirst'
import { ERRATA, erratumFor } from '../src/lib/errata'
import { FLEX_QUOTA_MB, quotaEmail, verdictFor } from '../src/lib/quota'
import { limitsAtTheirEdge, sawRateLimit, otherDomainsNamed } from '../src/lib/corpus'
import { isEdgeRefusal, hintRank, CREDENTIAL_PAGE_HINTS, confirmedRefusals } from '../src/lib/scan'
import { wasNeverAsked } from '../src/lib/scan/http'
import { brandTaken, certain, mentionsIn, nameGuest, quotedAbout, whoWentFirst, wordsCarried } from '../src/lib/vendors'
import { answersEverythingTheSameWay, askable, howAPathAnswered } from '../src/lib/scan/http'
import { licenceGateQuotes, readSnippet, rendersUsableForm, entersThroughIdentityProvider, mcpCandidates, looksLikeADocsPageTwin, answersWithTheSameTemplate, readsAsAnEndpoint, readsAsTheirOwnAddress } from '../src/lib/scan/funnel'
import { SIGNUP_HINTS, NOT_WHERE_ACCOUNTS_ARE_MADE, bestReadable, routeUrl } from '../src/lib/scan/discover'
import { AGENT_ENTRY_PATHS, AGENT_ENTRY_PATH_COUNT, mcpAcrossWaves } from '../src/lib/scan/funnel'
import type { McpProbe } from '../src/lib/scan/funnel'
import { isDocumentationPage } from '../src/lib/scan/index'
import { FIND_TOOL, TOOL } from '../src/app/mcp/route'
import { GET as GET_KATALOG } from '../src/app/.well-known/ai-catalog.json/route'
import { readsAsCompanyNews } from '../src/lib/scan/discover'
import {
  methodRefusalIsRouted,
  readsAsAMethodRefusal,
  informative,
  entryAccept,
  provisioningMatches,
  PROVISIONING_PATTERN_LABELS,
  provisioningQuotes,
  handsItToSomebodyElse,
  namesSomebodyElsesCredential,
  provisioningDemotedQuotes,
  withoutAChoppedEnding,
  windowCutMidToken,
  BOT_DEFENCE_RULES,
  PROVISIONING_RULES,
  SELF_SERVE_PATTERNS,
  describesAProcedure,
  everyFreeSignalIsAButton,
  everyFreeSignalIsAQuestion,
} from '../src/lib/scan/funnel'
import { asPublishedToday } from '../src/lib/publishable'
import { visitKey, pathOf, kindOf } from '../src/lib/visits'
import { isPublishableRow } from '../src/lib/published'
import { UNMEASURED_SCALE, scaleGuessIn } from '../src/lib/claims'

// Ceny dostawcy przychodza ze srodowiska, a bez nich katalog nie rozpoznaje zadnej ceny i cala
// sciezka przyznawania uprawnien jest nietestowana. Ustawiane TUTAJ, a nie w skrypcie npm: build
// wola `tsx scripts/rules.mts` wprost, wiec straznik zalezny od sposobu wywolania przechodzil
// lokalnie i wywracal deploy.
process.env.BILLING_PRICE_WATCH_MONTHLY ??= 'pri_watch'
process.env.BILLING_PRICE_REPORT_ONE ??= 'pri_report'
const { CATALOG, monitoringIsFree, priceOf, skuById, skusForPrices, unmatchedPrices } = await import('../src/lib/billing/catalog')

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
for (const page of ['terms', 'refunds']) {
  const source = readFileSync(`src/app/${page}/page.tsx`, 'utf8')
  check(`/${page} odmawia bez danych sprzedawcy`, source.includes('if (!SELLER_IS_COMPLETE) notFound()'), true)
}
// Prywatnosc stoi na wlasnej fladze, bo odpowiada na obowiazek, ktory zaczyna sie przy ZBIERANIU
// adresow, a nie przy sprzedazy, i formularz na stronie glownej zbiera je dzisiaj. Administrator to
// nie forma prawna: rejestracja firmy go nie tworzy, a jej brak nie zdejmuje obowiazku.
const privacySource = readFileSync('src/app/privacy/page.tsx', 'utf8')
check('/privacy stoi na fladze administratora', privacySource.includes('if (!CONTROLLER_IS_NAMED) notFound()'), true)
check('kontrola: nie stoi juz na fladze sprzedawcy', privacySource.includes('if (!SELLER_IS_COMPLETE) notFound()'), false)
// Bez danych sprzedawcy strona nie moze udawac, ze stoi za nia zarejestrowany podmiot.
check('mowi wprost, ze nie ma jeszcze spolki', privacySource.includes('There is no registered company behind this yet'), true)
const layout = readFileSync('src/app/layout.tsx', 'utf8')
check('stopka linkuje regulamin dopiero z danymi sprzedawcy', layout.includes('{SELLER_IS_COMPLETE && (\n                <Link href="/terms"'), true)
check('a prywatnosc na fladze administratora', layout.includes('{CONTROLLER_IS_NAMED && (\n                <Link href="/privacy"'), true)
// Sitemapa wymienia strone prawna tylko wtedy, gdy ta strona jest serwowana: adres, ktory oddaje
// 404, mowi indeksowi, ze jestesmy zepsuci.
const sitemapSource = readFileSync('src/app/sitemap.ts', 'utf8')
check('sitemapa bramkuje strony prawne', sitemapSource.includes("CONTROLLER_IS_NAMED ? ['/privacy'] : []"), true)
check('i regulamin osobno', sitemapSource.includes("SELLER_IS_COMPLETE ? ['/terms', '/refunds'] : []"), true)
// Formularz linkuje /privacy przy samym polu, wiec ta strona musi byc domyslnie serwowana.
check('administrator jest nazwany domyslnie', CONTROLLER_IS_NAMED, true)
// Polowicznie skonfigurowana spolka nie moze opublikowac zadnej z dwoch tozsamosci, bo obie byly by
// falszywe: odmowa strony jest jedyna odpowiedzia, ktora nie klamie.
const sellerSource = readFileSync('src/lib/seller.ts', 'utf8')
check('flaga zamyka sie przy polowicznej spolce', sellerSource.includes('(!CONTROLLER.isSeller || SELLER_IS_COMPLETE)'), true)
const formSource = readFileSync('src/components/watch-form.tsx', 'utf8')
check('formularz linkuje polityke przy polu', formSource.includes('href="/privacy"'), true)
// Flaga wchodzi propsem, bo to komponent kliencki: zmienna srodowiskowa tylko serwerowa czyta sie
// w bundlu jako undefined i formularz linkowalby strone, ktora serwer wlasnie wylaczyl.
check('flaga idzie propsem, nie z importu', formSource.includes('privacyLinked'), true)
check('kontrola: nie czyta flagi u siebie', formSource.includes('CONTROLLER_IS_NAMED'), false)
// Prop bez wartosci domyslnej, bo domyslne `true` jest zla odpowiedzia wszedzie, gdzie sie do niego
// dochodzi przez pominiecie, a raz juz sie tak stalo: przez bramke na stronie raportu.
check('prop jest wymagany', formSource.includes('privacyLinked: boolean'), true)
check('kontrola: nie ma wartosci domyslnej', formSource.includes('privacyLinked = true'), false)
// Tozsamosc administratora nie wynika z kompletnosci danych sprzedawcy. Spolka moze sprzedawac,
// a administratorem zostac osoba, ktora prowadzi witryne; wyprowadzenie jednego z drugiego
// opublikowaloby zla nazwe na jedynej stronie, ktorej caly sens to nazwac wlasciwa.
check('administrator nie jest wywnioskowany ze sprzedawcy', privacySource.includes('CONTROLLER.isSeller && SELLER_IS_COMPLETE'), true)
check('kontrola: nie renderuje sprzedawcy sama flaga sprzedawcy', privacySource.includes('{SELLER_IS_COMPLETE ? ('), false)
// Adres do praw z RODO idzie do administratora, nie do sprzedawcy: to on odpowiada za dane, wiec
// zadanie usuniecia ma trafiac tam, gdzie jest obowiazek na nie odpowiedziec.
check('prawa RODO pisze sie do administratora', privacySource.includes('mailto:${CONTROLLER.email}'), true)
check('kontrola: nie do sprzedawcy', privacySource.includes('mailto:${SELLER.email}'), false)
// Zdanie „i nic wiecej" o rekordzie watcha bylo nieprawda: trzymamy tez daty, identyfikator
// raportu, ostatni wynik, plan i identyfikator subskrypcji. Strona, ktorej caly sens to opisac, co
// przechowujemy, nie moze tego opisywac z pamieci.
check('opis watcha nie mowi juz „nic wiecej"', privacySource.includes('belongs to and nothing else'), false)
// Lista pol idzie z typu (`Record<keyof Watch, string>`), wiec nowe pole lamie kompilacje, a nie
// cicho zostawia niepelna liste na stronie. Tu pilnujemy tylko, ze strona nadal jej uzywa.
check('lista pol jest generowana z rekordu', privacySource.includes('Object.values(WATCH_FIELDS_DISCLOSED)'), true)

// Zero wymienien, ktore moze obalic znana dwuznacznosc, musi te dwuznacznosc niesc. railway.app
// wyszlo z generatora jako „wymieniony 0 z 11", podczas gdy dziesiec odpowiedzi mowilo Railway: ta
// nazwa nalezy w naszych danych do railway.com, a to ta sama firma po zmianie domeny. Ostrzezenie
// na stderr widzi operator, a zero czyta kupujacy.
console.log('\nzero wymienien niesie swoja dwuznacznosc')
const generatorSource = readFileSync('scripts/client-report.mts', 'utf8')
check('markdown pisze o niepoliczonych wystapieniach', generatorSource.includes('without naming ${domain}, and we did not count them'), true)
check('model niesie te liczbe', generatorSource.includes('missedByWord,'), true)
check('strona raportu tez ja pokazuje', readFileSync('src/app/d/[id]/report-view.tsx', 'utf8').includes('model.missedByWord > 0'), true)
// Kontrolka: to nie jest tylko komunikat dla operatora.
check('kontrola: nie zostalo samo stderr', generatorSource.includes('UWAGA: ${missedByWord}'), true)
// Runbook dostawy opisuje kazda odmowe, ktora operator moze zobaczyc. Odmowa, ktorej nie ma w
// runbooku, wyglada dla niego jak awaria narzedzia i konczy sie obejsciem.
const runbookDostawy = readFileSync('docs/delivering-a-report.md', 'utf8')
check('runbook zna odmowe dla przekierowania do korpusu', runbookDostawy.includes('redirect into the corpus'), true)
check('i mowi, ze kupujacy widzi niepoliczone wystapienia', runbookDostawy.includes('the buyer sees it'), true)
// Gosc, ktorego adres przekierowuje do korpusu, nie jest gosciem, tylko vendorem, ktorego juz
// publikujemy pod adresem, z ktorego sie wyprowadzil. Skaner juz to wie: poszedl za 301 i zapisal,
// gdzie wyladowal. Odmowa kosztuje nic przed platnoscia i jest zwrotem po niej.
check('generator odmawia gosciowi, ktory laduje w korpusie', generatorSource.includes('CURATED_DOMAINS.has(landedOn)'), true)
check('i mowi, ktora komende uruchomic', generatorSource.includes('Uruchom: npx tsx scripts/client-report.mts ${landedOn}'), true)
check('kontrola: nie odmawia przy braku przekierowania', generatorSource.includes('landedOn && landedOn !== domain'), true)
check('kazde pole watcha ma opis', Object.keys(WATCH_FIELDS_DISCLOSED).length, 16)
check('kontrola: opis nie jest pusty', Object.values(WATCH_FIELDS_DISCLOSED).every((one) => one.length > 5), true)
check('formularz tez nie mowi „nic wiecej"', formSource.includes('the domain, nothing else'), false)
// Zdanie o braku spolki wisi na istnieniu spolki, a nie na tym, czy jest administratorem:
// zarejestrowany sprzedawca, ktory nie jest administratorem, to wspierany uklad.
check('zaprzeczenie spolki wisi na danych sprzedawcy', privacySource.includes('{!SELLER_IS_COMPLETE && ('), true)
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
const cennik = readFileSync('src/app/pricing/page.tsx', 'utf8')
const pricingSaysFree = cennik.includes('Free while we are building it')
check('darmowy monitoring w kodzie i na cenniku mowia to samo', monitoringIsFree(), pricingSaysFree)
// Ta sama regula dla obietnicy kredytu, ktora do 2026-08-20 stala na cenniku bez pokrycia. Byla to
// obietnica bez WARTOSCI, nie tylko bez mechanizmu: 49 USD zaliczone przeciw monitoringowi, ktory
// kosztuje 0. Zdanie moze wrocic, ale nie samo - razem z procedura, ktora ktos umie wykonac.
// Napisane jako implikacja, a nie zakaz: nie blokujemy oferty, blokujemy proze.
// Tylko linie `note:`, nie caly plik: komentarz wyjasniajacy, DLACZEGO tego zdania tam nie ma,
// cytuje je doslownie, wiec sonda czytajaca caly plik znajdowala najpierw wlasne uzasadnienie i
// oblewala zaraz po naprawie. Repo zna ten blad: „sonda szukajaca samej siebie znajduje najpierw
// wlasny tekst".
const cennikObiecujeKredyt = cennik
  .split('\n')
  .filter((line) => line.trimStart().startsWith('note:'))
  .some((line) => /credited against/i.test(line))
// Dedykowany marker, nie slowo „credit": runbook opisuje TERAZ, dlaczego tej obietnicy nie ma, i
// robi to slowem „credit" kilkanascie razy - wiec sonda szukajaca slowa byla spelniona przez samo
// wyjasnienie i przepuscilaby powrot obietnicy bez procedury (codex). Marker trzeba dopisac
// swiadomie, czyli dokladnie wtedy, gdy ktos naprawde spisal, co zrobic przy pierwszej sprzedazy.
// Marker w OSOBNEJ linii, bo instrukcja jak go uzyc sama go cytuje w zdaniu - i `includes` bylo
// spelnione przez to zdanie (codex, czwarty raz ta sama klasa dzisiaj: sonda znajduje wlasny tekst).
const runbookOpisujeKredyt = readFileSync('docs/turning-billing-on.md', 'utf8')
  .split('\n')
  .some((line) => line.trim().startsWith('CREDIT PROCEDURE:'))
check(
  'obietnica kredytu wraca tylko razem z procedura, ktora ktos umie wykonac',
  cennikObiecujeKredyt && !runbookOpisujeKredyt,
  false,
)
// I nie wtedy, gdy monitoring jest darmowy, bo wtedy nie ma czego od czego odjac.
check('kredyt nie stoi obok darmowego monitoringu', cennikObiecujeKredyt && monitoringIsFree(), false)
// „Darmowy dzisiaj" bez niczego, co go konczy, nie jest decyzja, tylko stanem, do ktorego nikt nie
// musi wrocic. Data nalezy do wlasciciela i tu jej nie ma; mechanizm jest, wiec ustawienie jej to
// jedna linijka zamiast sporu o to, co znaczylo „darmowy".
check('koniec darmowego jest warunkiem, nie pamiecia', typeof monitoringIsFree, 'function')
// Celowo NIE ma tu reguly „data musi byc null". Taka regula oblewalaby build dokladnie w kroku,
// ktory opisuje runbook billingu, czyli zabraniala uruchomienia tego, co sama ma chronic.
// Kontrolka: mechanizm naprawde dziala, gdy data zostanie wpisana.
check('przed data monitoring jest darmowy', monitoringIsFree(new Date('2026-09-01'), '2026-10-01'), true)
// Kontrolka, ktora naprawde sprawdza mechanizm: po dacie przestaje byc.
check('po dacie przestaje byc', monitoringIsFree(new Date('2026-11-01'), '2026-10-01'), false)
// Data bez wiadomosci do zapisanych lamie obietnice ze strony glownej, wiec runbook billingu musi
// niesc oba kroki w jednym miejscu.
const runbookBillingu = readFileSync('docs/turning-billing-on.md', 'utf8')
check('runbook billingu zna kohorte sprzed ceny', runbookBillingu.includes('FREE_MONITORING_ENDS_ON'), true)
check('i mowi, ze trzeba do nich napisac', runbookBillingu.includes('Write to everyone already subscribed'), true)
// Miesieczna polowa monitoringu nie ma za soba zadnego harmonogramu: trzy crony na tej aplikacji to
// mirror rejestru MCP, kontrola limitow i przemiat watchow. Runbook ma to mowic wprost, bo obietnica
// trzymana pamiecia jest ta, ktora wygasa w trzecim miesiacu.
check('runbook dostawy mowi, ze miesieczny mail jest reczny', runbookDostawy.includes('no schedule behind it'), true)
const crony = readdirSync('src/app/api/cron')
check('cronow jest tyle, ile runbook zaklada', crony.length, 3)

// Jedenascie skryptow audytowych czytalo `Number(process.argv[2] ?? N)`. `Number('accused')` to NaN,
// `slice(0, NaN)` jest puste, a skrypt drukuje potem, ze nasze zdanie sie trzyma, nie zapytawszy o
// nic. To sa skrypty, ktorych cala praca polega na FALSYFIKOWANIU wlasnych zdan, wiec bieg o zerowym
// pokryciu, ktory konczy sie uspokojeniem, jest najgorsza odpowiedzia, jaka moga dac.
console.log('\naudyty odmawiaja argumentu, ktory nie jest liczba')
const audyty = readdirSync('scripts').filter((name) => name.startsWith('audit-') && name.endsWith('.mts'))
const czytaSurowo = audyty.filter((name) =>
  readFileSync(`scripts/${name}`, 'utf8').includes('Number(process.argv[2]'),
)
check('zaden audyt nie czyta argumentu bez sprawdzenia', czytaSurowo.join(','), '')
// Kontrolka: sonda musi umiec zobaczyc ten wzorzec, gdy naprawde jest.
check('kontrola: sonda widzi wzorzec, gdy jest', 'const most = Number(process.argv[2] ?? 30)'.includes('Number(process.argv[2]'), true)

// Runbook jest kodem, ktory wykonuje czlowiek albo agent, i starzeje sie jak kod, tylko nikt go nie
// kompiluje. Sprawdzamy WYLACZNIE `docs/`, bo to sa instrukcje do wykonania; STATE.md jest dziennikiem
// i ma prawo wspominac narzedzia, ktorych juz nie ma.
console.log('\nrunbooki nie odsylaja do komend, ktorych nie ma')
const wKatalogu = new Set(readdirSync('scripts'))
const npmSkrypty = new Set(Object.keys(JSON.parse(readFileSync('package.json', 'utf8')).scripts as Record<string, string>))
const martwe: string[] = []
for (const plik of readdirSync('docs').filter((name) => name.endsWith('.md'))) {
  const tresc = readFileSync(`docs/${plik}`, 'utf8')
  // Kazde rozszerzenie, nie tylko `.mts`: w tym repo sa `.ts` i `.sh`, wiec regula zawezona do
  // jednego rozszerzenia przepuszczalaby dokladnie te wywolania, ktore najlatwiej zgnic.
  for (const trafienie of tresc.matchAll(/scripts\/([\w.\-]+\.(?:mts|ts|sh|mjs|js))/g)) {
    if (!wKatalogu.has(trafienie[1])) martwe.push(`${plik}: scripts/${trafienie[1]}`)
  }
  for (const trafienie of tresc.matchAll(/\bnpm run ([\w:\-]+)/g)) {
    if (!npmSkrypty.has(trafienie[1])) martwe.push(`${plik}: npm run ${trafienie[1]}`)
  }
}
check('kazda komenda z runbooka istnieje', martwe.join(' | '), '')
// Kontrolka: sonda musi umiec zobaczyc komende, ktorej nie ma.
check('kontrola: sonda widzi martwa komende', npmSkrypty.has('audit-signup'), false)
// Kontrolka na samo rozszerzenie: gdyby regula lapala tylko `.mts`, ten plik bylby dla niej niewidzialny.
check('kontrola: regula widzi tez skrypty powloki', wKatalogu.has('reseed.sh'), true)

// Lista regresji ma porownywac przemiat z pomiarem sprzed niego, nie dwa przejscia tego samego
// przemiatu. Pilnujemy obu koncow kontraktu, a kontrolka dowodzi, ze sonda umie powiedziec „nie".
const regressionSource = readFileSync('scripts/regressions.mts', 'utf8')
const reseedSource = readFileSync('scripts/reseed.sh', 'utf8')
const readsSweepStart = (source: string) => source.includes('process.env.SWEEP_STARTED_AT')
const exportsSweepStart = (source: string) => source.includes('export SWEEP_STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"')
check('regresje czytaja poczatek przemiatu', readsSweepStart(regressionSource), true)
check('reseed eksportuje poczatek przemiatu', exportsSweepStart(reseedSource), true)
check('kontrola: regresje bez zmiennej odpadaja', readsSweepStart('const cutoff = new Date()'), false)
check('kontrola: reseed bez eksportu odpada', exportsSweepStart('SWEEP_STARTED_AT=$(date)'), false)

// Audyt, ktory sprawdza nasze oskarzenia, sam potrzebuje kontrolki. `audit-mcp` zglosil szesc
// adresow „ktore jednak odpowiadaja" u uploadthing.com i imagekit.io, a te hosty odpowiadaja tym
// samym bledem uwierzytelnienia pod sciezka, ktorej nie ma. Bez kontrolki narzedzie sprawdzajace
// nasze zdania argumentowalo za przyznaniem punktu za serwer, ktorego nikt nie widzial.
check('audyt MCP ma sciezke kontrolna', readFileSync('scripts/audit-mcp.mts', 'utf8').includes('CONTROL_PATH'), true)
check('i audyt wejscia tez ja mial', readFileSync('scripts/audit-entry.mts', 'utf8').includes("const CONTROL = '/letagentsin-audit-probe"), true)
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

// Naglowek i wiersz checku licza CO INNEGO: dziesiec NAZW plikow kontra dwadziescia trzy ZAPYTANIA
// (kazda nazwa pytana na witrynie i na hoscie dokumentacji). Oba zdania stalyc w jednym dokumencie
// tym samym rzeczownikiem „agent entry paths", wiec czytaly sie jak sprzecznosc. Naglowek mowi teraz
// o nazwach i o tym, gdzie pytal.
const bezWejscia = (entryDocsProbed: boolean | undefined) =>
  pickHeadline(
    headlineFindings({
      funnel: {
        signup: { url: null, reachable: false, status: 0, statusesSeen: [], consistent: true, captcha: [] },
        entryPointsFound: [],
        servesCatchAll: false,
        provisioning: { programmatic: ['management api'] },
        ...(entryDocsProbed === undefined ? {} : { entryDocsProbed }),
      },
    }),
    headlineCard([one('agent_entry_point', { max: 2 })], 12),
  )
const brakWejscia = bezWejscia(true)
check('naglowek liczy NAZWY plikow, nie zapytania', brakWejscia.evidence.includes(`${AGENT_ENTRY_PATH_COUNT} entry files by name`), true)
check('i mowi, gdzie o nie pytal', brakWejscia.evidence.includes('on your site and your documentation host'), true)
// Kontrolka: bez hosta dokumentacji naglowek NIE moze mowic, ze o niego pytal. To samo dotyczy
// wierszy sprzed tej flagi - wolimy zanizyc niz opisac zapytanie, ktorego nie bylo.
check('bez hosta dokumentacji mowi tylko o witrynie', bezWejscia(false).evidence.includes('agent-access.json, on your site, and not one'), true)
check('a stary wiersz bez flagi tez', bezWejscia(undefined).evidence.includes('agent-access.json, on your site, and not one'), true)
check('i nie mowi juz "paths answered", ktore kolodowalo z wierszem checku', brakWejscia.evidence.includes('agent entry paths answered'), false)
// I to samo slowo na `/report`, bo tam ta liczba stoi obok innych i czytelnik moze miec obie strony
// otwarte. Straznik na PLIK, bo strona nie ma tu funkcji do wywolania.
check(
  'raport rynkowy tez liczy nazwy plikow',
  readFileSync('src/app/report/page.tsx', 'utf8').includes('entry files we look for by name'),
  true,
)

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
// Liczba mnoga byla tylko w JEDNEJ z dwoch galezi, wiec vendor, ktorego nikt nie postawil pierwszym,
// czytal „the provider a run named before any other: postmarkapp.com, resend.com" - w mailu i w
// platnym raporcie. Zmierzone na zywym mailu do buttondown.com.
check(
  'dwoch wyprzedzajacych to tez liczba mnoga',
  whoWentFirst(['postmarkapp.com', 'resend.com'], 0, 10),
  'Picked ahead of you, the providers some run named before any other: postmarkapp.com, resend.com.',
)

// Mail miesieczny sprzedajemy jako miesieczny bieg agenta, a biegi odpalamy recznie. Miesiac bez
// biegu i miesiac, w ktorym nic sie nie ruszylo, daja te same liczby - rozroznia je tylko wiek.
const mailMiesieczny = readFileSync('scripts/cell-email.mts', 'utf8')
check('mail miesieczny mowi, ile dni maja biegi', mailMiesieczny.includes('The runs are dated ${when}, ${howOld}'), true)
check('wiek liczy od najnowszego biegu, nie od pierwszego', mailMiesieczny.includes('daysSince(ran[ran.length - 1])'), true)
check('a gdy w tym miesiacu nikt nie mierzyl, mowi to w temacie', mailMiesieczny.includes('no new agent run this month'), true)
check('i w tresci, zamiast podac stare liczby jako tegomiesieczne', mailMiesieczny.includes("these are not this month's numbers"), true)
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

// Kiedy zmierzylismy „przedtem", a nie kiedy ostatnio zajrzelismy. Kadencja jest tygodniowa, ale
// kolejka ma sufit, a domena, ktora prosi w robots.txt, zeby jej nie skanowac, przesuwa `checkedAt`
// na kazdym przebiegu **bez** dotykania wyniku - wiec data z watcha datowalaby dwumiesieczna
// podstawe na wczoraj. Zrodlem jest `scannedAt` poprzedniego raportu.
const withBaseline = changeEmail(
  { domain: 'v.test', id: 'w1', email: 'a@v.test', lastTotal: 5, lastMeasurable: 10, checkedAt: '2026-08-18T09:00:00.000Z' } as never,
  { id: 'r1', scorecard: { total: 6, max: 12, checks: [] } } as never,
  moved([verdict(0, 1)], [verdict(1, 1)]),
  false,
  '2026-06-30T07:12:00.000Z',
).text
check('mail datuje podstawe porownania', withBaseline.includes('from 5 of 10 measured on 2026-06-30.'), true)
check('i bierze date z pomiaru, nie z ostatniego zajrzenia', withBaseline.includes('2026-08-18'), false)
// Kontrolka: bez poprzedniego raportu mail nie ma prawa zmyslic daty.
check('bez poprzedniego raportu zadnej daty nie ma', mailFor(false).text.includes('measured on'), false)
// Straznik na WYWOLANIE, nie tylko na funkcje: podmiana zrodla daty na `watch.checkedAt` przechodzi
// typecheck (oba to `string | null`) i nie rusza zadnej reguly powyzej, bo tamte wolaja mail wprost.
const cronObserwacji = readFileSync('src/app/api/cron/watch/route.ts', 'utf8')
check('cron podaje mailowi date z poprzedniego raportu', cronObserwacji.includes('previousCard !== previous.scorecard, previous.scannedAt)'), true)
// Zaden dokument, ktory czyta OBCY czlowiek, nie moze spasc na localhost. Ten przebieg zwykle idzie
// BEZ `STACKPICK_BASE_URL`, wiec sprawdza dokladnie te galaz zapasowa, ktora psula maile wysylane z
// laptopa: „Full scorecard: http://localhost:3000/r/...". Regula byla juz napisana w `site.ts`,
// tylko dwa moduly mailowe czytaly srodowisko po swojemu.
const bezLokalnego = (tekst: string) => !tekst.includes('localhost')
// Ale tylko wtedy, gdy adres pochodzi z GALEZI ZAPASOWEJ. Kto swiadomie ustawi
// `STACKPICK_BASE_URL=http://localhost:3000` (tak stoi w `.env.example`), dostaje poprawny adres ze
// swojej konfiguracji i nie ma tu czego lapac - bez tego warunku build padalby lokalnie temu, kto
// robi wszystko dobrze. Codeksa.
const adresZKonfiguracji = process.env.STACKPICK_BASE_URL ?? ''
if (adresZKonfiguracji.includes('localhost')) {
  console.log('  (pominiete: STACKPICK_BASE_URL wskazuje localhost swiadomie, wiec galezi zapasowej nie widac)')
} else {
  check('mail o zmianie werdyktu nie linkuje w localhost', bezLokalnego(mailFor(false).text), true)
  check('a link wypisujacy tym bardziej', bezLokalnego(confirmEmail({ id: 'w1', domain: 'v.test', email: 'a@v.test' } as never).text), true)
}
check('oba moduly mailowe biora adres z jednego zrodla', readFileSync('src/lib/email.ts', 'utf8').includes('const BASE_URL = SITE_URL'), true)
check('takze mail obserwacji', readFileSync('src/lib/watch-email.ts', 'utf8').includes('const BASE_URL = SITE_URL'), true)

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

// Mail, ktory mowi vendorowi, ze stracil punkt, i zostawia go z szukaniem strony tlumaczacej co
// dalej, jest alertem. Jedna instrukcja przy najgorszej zmianie robi z niego usluge. Bierzemy ja z
// tej samej tabeli, co raport, wiec mail i raport nie moga zaczac mowic czegos innego o tym samym.
console.log('\nmail monitoringu mowi, co zrobic z utracona pozycja')
const withRemedy = changeEmail(
  { domain: 'v.test', id: 'w1', email: 'a@v.test', lastTotal: 6, lastMeasurable: 10 } as never,
  {
    id: 'r1',
    findings: { machine: { llms: {}, wellKnown: {} } },
    scorecard: { total: 5, max: 12, checks: [{ id: 'llms_txt', label: 'llms.txt published', points: 0, max: 1, detail: 'brak' }] },
  } as never,
  moved([verdict(1, 1, { id: 'llms_txt', label: 'llms.txt published' })], [verdict(0, 1, { id: 'llms_txt', label: 'llms.txt published' })]),
  false,
).text
check('mail niesie instrukcje przy stracie', withRemedy.includes('What to do about llms.txt published:'), true)
// Kontrolka: przy checku, dla ktorego nie publikujemy kroku, mail nie ma prawa zmyslic instrukcji.
const noRemedy = changeEmail(
  { domain: 'v.test', id: 'w1', email: 'a@v.test', lastTotal: 6, lastMeasurable: 10 } as never,
  {
    id: 'r1',
    findings: {},
    scorecard: { total: 5, max: 12, checks: [{ id: 'robots_paths_resolve', label: 'Paths robots.txt points at answer', points: 0, max: 1, detail: 'brak' }] },
  } as never,
  moved(
    [verdict(1, 1, { id: 'robots_paths_resolve', label: 'Paths robots.txt points at answer' })],
    [verdict(0, 1, { id: 'robots_paths_resolve', label: 'Paths robots.txt points at answer' })],
  ),
  false,
).text
check('a przy checku bez kroku nic nie zmysla', noRemedy.includes('What to do about'), false)

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
// Zdanie o rejestracji, ktore PRZECHODZI, a opisuje sciane. Kazdy oblany i kazdy niemierzalny wiersz
// na `/v` niesie instrukcje, a ten jeden - najwazniejszy dla naszej tezy - nie mial zadnej. Punkt sie
// NIE rusza (to nadal ten sam pomiar), rusza sie tylko to, czy vendor moze z tym cos zrobic.
const rejestracjaKlienta = CHECKS.find((c) => c.id === 'oauth_dcr')!
const zGrantami = (grantTypes: string[], unattendedGrant: boolean) =>
  rejestracjaKlienta.evaluate({
    funnel: { oauth: { dynamicClientRegistration: true, grantTypes, unattendedGrant, probedHosts: 1, probedOrigins: ['https://v.test'] } },
  } as never)
const bezMaszynowego = zGrantami(['authorization_code', 'refresh_token'], false)
check('sciana mimo rejestracji nadal daje punkt', bezMaszynowego.points, 1)
check('i mowi, czego brakuje', bezMaszynowego.detail.includes('finishes without a person at a browser'), true)
check('i od dzis mowi, co z tym zrobic', Boolean(bezMaszynowego.unblock?.includes('client_credentials')), true)
// Kontrolka: gdy droga maszynowa JEST, nie ma czego odblokowywac i instrukcja bylaby halasem.
const zMaszynowym = zGrantami(['authorization_code', 'client_credentials'], true)
check('droga maszynowa nie dostaje instrukcji', zMaszynowym.unblock, undefined)
check('i mowi to wprost', zMaszynowym.detail.includes('documented path to a token'), true)

// 9.52. Ta galaz oskarza vendora o to, czego NIE MA w jego dokumencie, wiec musi powiedziec, gdzie
// ten dokument czytalismy. 293 zapisanych raportow publikowalo ja z pustym miejscem po adresie, bo
// pole `metadataAt` powstalo pozniej, a fallback renderowal nic zamiast odmowic. Kontrolki stoja na
// wszystkich trzech wyjsciach, bo pomylka w kazda strone kosztuje: albo oskarzamy bez dowodu, albo
// tracimy prawdziwy sygnal.
const metadaneBez = (oauth: Record<string, unknown>) =>
  rejestracjaKlienta.evaluate({
    funnel: { oauth: { metadataPublished: true, dynamicClientRegistration: false, probedHosts: 3, ...oauth } },
    discovered: { pricing: 'https://v.test/pricing', signup: 'https://v.test/signup' },
  } as never)

const zAdresem = metadaneBez({ metadataAt: 'https://auth.v.test/.well-known/oauth-authorization-server', probedOrigins: ['https://auth.v.test'] })
check('znany adres dokumentu trafia do zdania', zAdresem.detail.includes('at https://auth.v.test/.well-known/oauth-authorization-server'), true)
check('i to nadal jest oskarzenie, nie niemierzalne', Boolean(zAdresem.inconclusive), false)

const bezAdresu = metadaneBez({ probedOrigins: ['https://a.v.test', 'https://b.v.test', 'https://c.v.test', 'https://d.v.test'] })
check('bez adresu zdanie nazywa sondowane originy', bezAdresu.detail.includes('on one of the 4 origins we probed'), true)
check('i przyznaje sie, ze nie zapisalismy ktory', bezAdresu.detail.includes('did not record which'), true)
check('nigdy nie zostawia pustego miejsca po adresie', bezAdresu.detail.includes('published, but no registration_endpoint'), false)

const bezNiczego = metadaneBez({ probedOrigins: [] })
check('bez adresu I bez originow to nie jest znalezisko', bezNiczego.inconclusive === true, true)
check('i mowi wprost, czego nie zapisalismy', bezNiczego.detail.includes('did not record the address'), true)
// Stare raporty nie maja tego pola w ogole, nie pustej tablicy - to ten sam przypadek.
check('brak pola zachowuje sie jak brak originow', metadaneBez({}).inconclusive === true, true)

// BRAMA PUBLIKACYJNA (9.52). `/r/<id>` renderuje ZAPISANY scorecard, wiec naprawa reguly nie ruszy
// 294 stron, ktore juz oskarzaja bez dowodu. Brama poprawia RENDER, nigdy wiersz w bazie, i
// dopasowuje KSZTALT znaleziska, nie tresc zdania - bo tresc zdania to wlasnie to, co sie zmienia
// (te same 294 wiersze niosa dwa rozne brzmienia tego samego zarzutu).
const zapisanyRaport = (oauth: Record<string, unknown>, detail: string, extra: Record<string, unknown> = {}) => ({
  domain: 'v.test',
  scannedAt: new Date().toISOString(),
  findings: { funnel: { oauth: { metadataPublished: true, dynamicClientRegistration: false, ...oauth } } },
  scorecard: {
    formulaVersion: '9.41', total: 7, max: 16, measurable: 15,
    stages: [
      { stage: 'entry', letter: 'B', title: 'Entry', question: '', points: 3, max: 4, measurable: 4 },
      { stage: 'discovery', letter: 'A', title: 'Discovery', question: '', points: 5, max: 6, measurable: 6 },
    ],
    checks: [
      { id: 'oauth_dcr', stage: 'entry', points: 0, max: 1, detail, ...extra },
      { id: 'docs_without_js', stage: 'discovery', points: 1, max: 1, detail: 'fine' },
    ],
  },
})

const bezDowodu = asPublishedToday(zapisanyRaport({ probedOrigins: ['https://a.v.test', 'https://b.v.test'] }, 'OAuth metadata published, but no registration_endpoint in it') as never)
check('brama wycofuje zarzut bez dowodu', bezDowodu.degraded.length, 1)
check('i robi z niego niemierzalne, a nie zaliczone', bezDowodu.scorecard.checks[0].inconclusive === true, true)
check('punktow nie przyznaje', bezDowodu.scorecard.checks[0].points, 0)
// Mianownik musi isc za wycofaniem, inaczej strona pokazuje sume, ktorej jej wlasne wiersze przecza.
check('mianownik schodzi o wycofany punkt', bezDowodu.scorecard.measurable, 14)
check('a suma punktow zostaje bez zmian', bezDowodu.scorecard.total, 7)
// Etap ma WLASNY mianownik i strona drukuje oba. Poprawiony tylko total dawal strone, ktora
// przeczy sobie o jeden naglowek dalej (codex).
check('mianownik ETAPU tez schodzi', bezDowodu.scorecard.stages?.find((s) => s.stage === 'entry')?.measurable, 3)
check('a cudzy etap zostaje nietkniety', bezDowodu.scorecard.stages?.find((s) => s.stage === 'discovery')?.measurable, 6)
check('odzyskane originy ida jako dowod', bezDowodu.degraded[0].evidence?.length, 2)

// Stary raport bez pola `measurable` - 26 takich w bazie, 8 z nich brama poprawia. Odejmowanie od
// `undefined` dawalo `7/NaN` dokladnie na stronach, ktore mialy zostac naprawione (codex).
const starySchemat = zapisanyRaport({ probedOrigins: ['https://a.v.test'] }, 'OAuth metadata without registration_endpoint')
delete (starySchemat.scorecard as Record<string, unknown>).measurable
delete (starySchemat.scorecard.stages[0] as Record<string, unknown>).measurable
const bezPola = asPublishedToday(starySchemat as never)
check('brak measurable spada na max, nie na NaN', bezPola.scorecard.measurable, 15)
check('to samo na poziomie etapu', bezPola.scorecard.stages?.find((s) => s.stage === 'entry')?.measurable, 3)
check('i zaden mianownik nie jest NaN', [bezPola.scorecard.measurable, ...(bezPola.scorecard.stages ?? []).map((s) => s.measurable)].some(Number.isNaN), false)

// Starsze brzmienie tego samego bledu. Recznie naliczylem 293 przez dopasowanie tekstu, brama
// znalazla 294: `allegro.pl` z 7 sierpnia (formula 2.1) mowil to innymi slowami i tak samo nie
// podawal adresu. Dlatego warunek jest strukturalny.
const stareBrzmienie = asPublishedToday(zapisanyRaport({ probedOrigins: [] }, 'OAuth metadata without registration_endpoint') as never)
check('inne brzmienie tego samego zarzutu tez lapie', stareBrzmienie.degraded.length, 1)
check('bez originow nie zmyslamy dowodu', stareBrzmienie.degraded[0].evidence, undefined)

// Kontrolki, bo brama, ktora wycofuje ZA DUZO, kasuje prawdziwe znaleziska o cudzych firmach.
const zAdresemZapisany = asPublishedToday(zapisanyRaport({ metadataAt: 'https://auth.v.test/.well-known/x', probedOrigins: ['https://auth.v.test'] }, 'OAuth metadata published at https://auth.v.test/.well-known/x, but no registration_endpoint in it') as never)
check('raport, ktory PODAL adres, zostaje nietkniety', zAdresemZapisany.degraded.length, 0)
check('i jego mianownik sie nie rusza', zAdresemZapisany.scorecard.measurable, 15)
const juzNiemierzalny = asPublishedToday(zapisanyRaport({ probedOrigins: ['https://a.v.test'] }, 'Unmeasurable: cos', { inconclusive: true }) as never)
check('wiersz juz niemierzalny nie jest wycofywany drugi raz', juzNiemierzalny.degraded.length, 0)
const zPunktem = asPublishedToday({
  ...zapisanyRaport({ probedOrigins: ['https://a.v.test'] }, 'registration_endpoint published'),
  scorecard: { formulaVersion: '9.41', total: 8, max: 16, measurable: 15, checks: [{ id: 'oauth_dcr', points: 1, max: 1, detail: 'registration_endpoint published' }] },
} as never)
check('zaliczony wiersz nie jest wycofywany', zPunktem.degraded.length, 0)

// Klucz licznika odwiedzin: zapis i odczyt musza sie zgadzac, bo inaczej audyt zasiegu melduje zero
// z powodu, ktory nie ma nic wspolnego z odwiedzinami (codex zlapal dokladnie taki rozjazd).
check('klucz odwiedzin wraca w calosci', pathOf(visitKey('/r/vendor.test', 'browser')), '/r/vendor.test')
check('i rodzaj klienta tez', kindOf(visitKey('/r/vendor.test', 'browser')), 'browser')
check('nazwa crawlera z myslnikiem nie lamie klucza', pathOf(visitKey('/v/a.test', 'oai-searchbot')), '/v/a.test')
// Stare wiersze sprzed tej konwencji nie maja rodzaju - odczyt ma je oddac, a nie uciac.
check('klucz bez rodzaju zostaje sciezka', pathOf('/findings'), '/findings')

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
// Uciete cialo nie jest skorupa: to nasz wlasny sufit bajtow, nie ich strona. Kontrolki na obie
// strony, bo ta galaz zamienia OSKARZENIE w „nie zmierzylismy", i pomylka w kazda strone kosztuje.
const truncatedAt = (chars: number, truncated: boolean) =>
  docs.evaluate({
    discovered: { docs: 'https://vendor.test/docs' },
    docsTextChars: chars,
    docsTextCharsFrom: 'https://vendor.test/docs',
    docsTextCharsTruncated: truncated,
    docsThinnerForAgents: null,
  } as never)
check('uciete cialo nie jest skorupa', truncatedAt(53, true).inconclusive === true, true)
check('i zdanie mowi o naszym sufcie', truncatedAt(53, true).detail.includes('bytes we read'), true)
// Codeksa: zdanie nie ma twierdzic, ze ciecie wypadlo w skrypcie, bo tego nie mierzymy, a rada nie
// ma wskazywac lustra markdown, ktorego ten check z definicji nie czyta.
check('zdanie nie zmysla, gdzie wypadlo ciecie', truncatedAt(53, true).detail.includes('mid-script'), false)
check('rada nie obiecuje lustra markdown', (truncatedAt(53, true).unblock ?? '').includes('markdown'), false)
// I zdanie ma nazwac te strone, ktora sie urwala, a nie te, z ktorej wzielismy liczbe - inaczej
// mowimy o stronie przeczytanej w calosci, ze jest wieksza niz nasz sufit. Codeksa, dwa razy.
const truncatedElsewhere = docs.evaluate({
  discovered: { docs: 'https://vendor.test/docs' },
  docsTextChars: 100,
  docsTextCharsFrom: 'https://vendor.test/docs/small',
  docsTextCharsTruncated: true,
  docsTextCharsTruncatedAt: 'https://vendor.test/docs/huge',
  docsThinnerForAgents: null,
} as never)
check('zdanie nazywa strone, ktora sie urwala', truncatedElsewhere.detail.includes('docs/huge'), true)
check('i nie mowi tego o stronie przeczytanej w calosci', truncatedElsewhere.detail.includes('docs/small is larger'), false)
check('krotka strona przeczytana w calosci nadal jest skorupa', truncatedAt(53, false).points, 0)
check('i to nadal jest oskarzenie, nie niewiedza', truncatedAt(53, false).inconclusive === true, false)
check('dluga strona jest zaliczona mimo uciecia', truncatedAt(9000, true).points, 1)

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

// 9.44: zdanie, ktore odsyla po klucz do CUDZEJ konsoli, jest dowodem o tamtym produkcie.
// growthbook.io trzymal punkt na "Create a new service account under [IAM & Admin -> Service
// Accounts](https://console.cloud.google.com/...)", czyli na instrukcji tworzenia konta uslugowego
// GOOGLE przy podlaczaniu BigQuery.
console.log('\nklucz w cudzej konsoli to nie ich sciezka')
// Prawdziwe zdanie z dokumentacji growthbooka, z etykieta linku wlacznie: to ona mowi, ze klucz
// powstaje po tamtej stronie.
const cudzaKonsola =
  '<p>Create a new service account via the API under [IAM &amp; Admin -> Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts) to connect BigQuery.</p>'
const wlasnaKonsola =
  '<p>Create a new service account via the API under [Settings -> Service Accounts](https://growthbook.io/app/settings) to connect BigQuery.</p>'
check('cudza konsola nie daje punktu', provisioningMatches(cudzaKonsola, 'growthbook.io').length, 0)
// Kontrolka: to samo zdanie z linkiem do SIEBIE nadal liczy, wiec regula wycina adres, a nie fraze.
check('ta sama fraza u siebie nadal liczy', provisioningMatches(wlasnaKonsola, 'growthbook.io').length > 0, true)
check('i bez podanej domeny nic sie nie zmienia', provisioningMatches(cudzaKonsola).length > 0, true)
// Tak wyglada to samo w zwyklym HTML-u, czyli w tym, co skaner naprawde czyta: adres siedzi w
// atrybucie, ktory `visibleProse` wyrzuca razem z tagiem. Bez tego regula lapala tylko markdown.
const cudzaKonsolaWHtml =
  '<p>Create a new service account via the API under <a href="https://console.cloud.google.com/iam-admin/serviceaccounts">IAM &amp; Admin -> Service Accounts</a> to connect BigQuery.</p>'
const wlasnaKonsolaWHtml =
  '<p>Create a new service account via the API under <a href="https://growthbook.io/app/settings">Settings -> Service Accounts</a> to connect BigQuery.</p>'
check('cudzy link w HTML tez nie daje punktu', provisioningMatches(cudzaKonsolaWHtml, 'growthbook.io').length, 0)
check('wlasny link w HTML nadal liczy', provisioningMatches(wlasnaKonsolaWHtml, 'growthbook.io').length > 0, true)
// Kontrolka, ktora zabija poprzednia wersje tej reguly: obcy adres w tym samym zdaniu, ale NIE
// ten, przy ktorym powstaje klucz. Zdanie dokumentuje wlasny klucz i ma za nie dostac punkt.
const wlasnyKluczObcyLink =
  '<p>You can create an API key programmatically, then test it with our <a href="https://postman.com/collections/x">Postman collection</a>.</p>'
check('obcy link obok nie zabiera punktu', provisioningMatches(wlasnyKluczObcyLink, 'growthbook.io').length > 0, true)
check('sonda widzi link po cudzy klucz', handsItToSomebodyElse('[Service Accounts](https://console.cloud.google.com/x)', 'growthbook.io'), true)
check('i nie widzi wlasnego', handsItToSomebodyElse('[Service Accounts](https://docs.growthbook.io/x)', 'growthbook.io'), false)
check('obcy link o czyms innym nie liczy sie', handsItToSomebodyElse('[Postman collection](https://postman.com/x)', 'growthbook.io'), false)

// 9.46: marka stojaca TUZ PRZED rzeczownikiem poswiadczenia mowi, czyj to klucz. Wersja luzniejsza
// (marka gdziekolwiek w oknie) zostala zmierzona na 55 zaliczonych cytatach i zabierala punkt
// browserbase.com za wlasne zdanie, wiec kontrolki pilnuja obu stron tej granicy.
// 9.47: fraza o koncie uslugowym niesie ten sam ciezar, co jej rodzenstwo - zdanie musi mowic, ze
// moze to zrobic PROGRAM. Cytaty ponizej sa prawdziwe, z korpusu 2026-08-19.
check(
  'przewodnik po cudzej konsoli nie jest sciezka dla agenta',
  provisioningMatches('In your Google Cloud project, go to IAM & Admin > Service Accounts. Create a new service account or select an existing one.', 'crowdin.com').length,
  0,
)
// Dwie, nie jedna: to zdanie pasuje takze do frazy o tworzeniu poswiadczenia obok czegos
// programowego, i to jest w porzadku - liczy sie, ze przezylo.
check(
  'ale konto uslugowe z dostepem programowym owszem',
  provisioningMatches('Create a Service Account to allow programmatic access to your vault', 'browserbase.com').length,
  2,
)
check(
  'i zdanie, ktore stracilo punkt, jest cytowane zamiast zera',
  provisioningDemotedQuotes('Create a new service account or select an existing one.', 'crowdin.com').length,
  1,
)
// Zdanie ma mowic to, co regula zmierzyla: BRAK slowa o programie, a nie obecnosc czlowieka.
// Przeczytane w platnym raporcie na mixpanelu, gdzie calym dowodem jest naglowek „Create Service
// Accounts" - ten nie mowi ani ze recznie, ani ze programowo.
const zdanieZdegradowane = CHECKS.find((one) => one.id === 'programmatic_provisioning')!.evaluate({
  discovered: { docs: 'https://vendor.test/docs' },
  docsPagesRead: 3,
  docsPagesReadUrls: ['https://vendor.test/docs/api-keys'],
  machineFilesRead: 0,
  funnel: { provisioning: { programmatic: [], programmaticQuotes: [], programmaticDemoted: ['Create Service Accounts'] } },
} as never)
check('zdanie nie twierdzi, ze klucz robi sie recznie', zdanieZdegradowane.detail.includes('by hand'), false)
check('zdanie mowi o BRAKU slowa o programie', zdanieZdegradowane.detail.includes('nothing in it says a program can do it'), true)
check('i niesie cytat, na ktorym stoi', zdanieZdegradowane.detail.includes('Create Service Accounts'), true)
check(
  'zdanie programowe nie jest zdegradowane',
  provisioningDemotedQuotes('Create a Service Account to allow programmatic access to your vault', 'browserbase.com').length,
  0,
)
check(
  'cudze poswiadczenie to nie jest nasze zdanie do zacytowania',
  provisioningDemotedQuotes('Create a Firebase Service Account private key', 'onesignal.com').length,
  0,
)

// Sekcja rodzenstwo na tym samym hoscie dokumentacji liczy sie jako dokumentacja, bo tam wlasnie
// stoi API. Kontrolki po obu stronach, bo ta regula istnieje po to, zeby NIE wpuszczac marketingu.
const docsAt = 'https://docs.mixpanel.com/docs/what-is-mixpanel'
check('ta sama sekcja liczy sie', isDocumentationPage('https://docs.mixpanel.com/docs/quickstart', docsAt), true)
check('referencja API obok tez', isDocumentationPage('https://docs.mixpanel.com/reference/create-service-account', docsAt), true)
check('marketing nadal nie', isDocumentationPage('https://docs.mixpanel.com/solutions/content-management', docsAt), false)
check('blog nadal nie', isDocumentationPage('https://docs.mixpanel.com/blog/rotating-api-keys', docsAt), false)

// Komunikat prasowy nie jest strona dokumentacji, nawet gdy vendor wymienil go w llms.txt, a slug
// niesie slowo "credential". Kontrolki po obu stronach: to, dla czego ta furtka istnieje, ma przejsc.
check(
  'komunikat prasowy odpada',
  readsAsCompanyNews('https://www.datadoghq.com/about/latest-news/press-releases/datadogs-2025-report-credential-theft/'),
  true,
)
check('wpis na blogu tez', readsAsCompanyNews('https://vendor.test/blog/rotating-api-keys'), true)
check('goly endpoint provisioningu przechodzi', readsAsCompanyNews('https://api.cloudinary.com/v1_1/provisioning/accounts'), false)
check('strona rejestracji przechodzi', readsAsCompanyNews('https://cloud.meilisearch.com/register'), false)
check('zwykla dokumentacja przechodzi', readsAsCompanyNews('https://docs.vendor.test/docs/api-keys'), false)
// Piec prawdziwych stron z korpusu, ktore careless wersja tej reguly odrzucala. Wszystkie zostaja.
check('about wewnatrz docsow przechodzi', readsAsCompanyNews('https://fly.io/docs/about/cost-management/'), false)
check('about wewnatrz referencji API przechodzi', readsAsCompanyNews('https://developer.paddle.com/api-reference/about/authentication/'), false)
check('team na hoscie docs przechodzi', readsAsCompanyNews('https://docs.browserbase.com/account/team/sso.md'), false)
check('customers w endpointcie przechodzi', readsAsCompanyNews('https://docs.bigcommerce.com/developer/api-reference/rest/admin/management/customers/v3/validate-credentials'), false)
check('getting-started/about przechodzi', readsAsCompanyNews('https://developers.deepl.com/docs/getting-started/about'), false)

// Dokumentacja SARIF-a ma opisywac to, co eksport naprawde wypisuje. Obiecywala „te same cztery
// rodzaje wynikow, co u nas", a `results` niesie WYLACZNIE oblane checki - reszta idzie licznikami w
// `properties`. Zmierzone na produkcji: 16 regul, 4 wyniki, wszystkie `fail`.
const dokiSarif = readFileSync('src/app/docs/page.tsx', 'utf8')
const eksportSarif = readFileSync('src/lib/export.ts', 'utf8')
check('dokumentacja nie obiecuje czterech rodzajow wynikow', dokiSarif.includes('result kinds are the same four'), false)
check('mowi, ze wynikami sa tylko oblane checki', dokiSarif.includes('Only the failing checks become results'), true)
check('i nazywa liczniki, w ktorych jest reszta', dokiSarif.includes('counted in the run properties'), true)
check('a eksport naprawde filtruje do oblanych', /const failing = scorecard\.checks\.filter/.test(eksportSarif), true)
check('i naprawde publikuje liczniki obok', /passed:/.test(eksportSarif) && /notApplicable:/.test(eksportSarif), true)

// Karta MCP ma niesc te same pola, co serwer, a nie ich podzbior. Adnotacje sa polowa bezpieczenstwa:
// `scan_domain` ma readOnlyHint=false, bo strzela zapytaniami w cudze serwery - klient, ktory czyta
// karte bez adnotacji, widzi narzedzie nieoznaczone i moze je auto-zatwierdzic.
check('scan_domain nie udaje tylko-do-odczytu', TOOL.annotations.readOnlyHint, false)
check('i mowi, ze wychodzi na zewnatrz', TOOL.annotations.openWorldHint, true)
check('find_providers czyta tylko nasz korpus', FIND_TOOL.annotations.readOnlyHint, true)
const kartaMcp = readFileSync('src/app/.well-known/mcp.json/route.ts', 'utf8')
check('karta przepisuje adnotacje', kartaMcp.includes('annotations: tool.annotations'), true)
check('karta przepisuje tytul', kartaMcp.includes('title: tool.title'), true)

// `llms.txt` mowilo, ze REST i narzedzie MCP biora te same wartosci `format`. Nie biora: REST zna
// `json`, MCP zna `summary`, i to jest ta sama rzecz pod dwiema nazwami. Serwer tlumaczy to w
// bledzie, plik nie tlumaczyl nic - a to jest ten plik, ktory kazemy publikowac vendorom.
const naszLlms = readFileSync('public/llms.txt', 'utf8')
const trasaSkanu = readFileSync('src/app/api/scan/route.ts', 'utf8')
check('REST nadal zna json, a nie summary', /const FORMATS = \['json', 'sarif', 'agent'\]/.test(trasaSkanu), true)
// Poszerzone do `string[]` naumyslnie: bez tego `.includes('json')` jest bledem TYPU, co samo w
// sobie dowodzi tezy, ale nie zostawia kontrolki, ktora obleje, gdy ktos doda `json` do enuma.
const formatyMcp: readonly string[] = TOOL.inputSchema.properties.format.enum
check('narzedzie MCP nadal zna summary', formatyMcp.includes('summary'), true)
check('i nie zna json', formatyMcp.includes('json'), false)
check('llms.txt nie twierdzi, ze obie powierzchnie biora json', /both take `format`: `json`/.test(naszLlms), false)
check('llms.txt nazywa obie nazwy', naszLlms.includes('`json` on the REST endpoint and `summary` on the MCP tool'), true)

// Dwa pliki dla agentow wpisuja limity RECZNIE, bo sa serwowane tak, jak sa napisane. `llms.txt`
// mowilo „10 scans per hour per address" - to jest domyslna wartosc generycznego licznika, ktorej
// bramka dla dzwoniacego nigdy nie uzywa. Agent planowal wiec jedna trzecia tego, co wolno, i nie
// wiedzial nic o limicie na domene, czyli o tym, ktory naprawde spotka przy przeskanowaniu.
const dostepDlaAgentow = readFileSync('public/.well-known/agent-access.json', 'utf8')
check('llms.txt zna limit na adres', naszLlms.includes(`${PER_CALLER_PER_HOUR} scans per source address`), true)
check('llms.txt zna limit na domene', naszLlms.includes(`${PER_DOMAIN_PER_HOUR} per domain scanned`), true)
check('llms.txt nie powtarza starej dziesiatki', /10 scans per hour per address/.test(naszLlms), false)
check('agent-access zna limit na adres', dostepDlaAgentow.includes(`"requests": ${PER_CALLER_PER_HOUR}`), true)
check('agent-access zna limit na domene', dostepDlaAgentow.includes(`"requests": ${PER_DOMAIN_PER_HOUR}`), true)
// Reszta liczb w tym samym pliku. Trzymal sie jako jedyny z czterech pisanych recznie, wiec zwiazanie
// go teraz jest tansze niz znalezienie go rozjechanego pozniej.
check('agent-access zna budzet pobierania', dostepDlaAgentow.includes(`${DEFAULT_SCAN_BUDGET_MS / 1000} second budget`), true)
check('agent-access wie, ile razy pytamy o signup', dostepDlaAgentow.includes('run three times'), true)
check('a sonda signup naprawde pyta trzy razy', /tries = 3,/.test(readFileSync('src/lib/scan/http.ts', 'utf8')), true)

// Katalog ARD byl statykiem i rozjechal sie tam, gdzie statyki sie rozjezdzaja: `version: 9.40`
// przy zywej formule 9.49. Teraz jest generowany, wiec straznik pilnuje, ze nikt nie wroci do pliku
// w `public/` (ktory i tak przeslonilby trase) i ze wersja nie jest wpisana recznie.
check('katalog nie stoi juz statykiem w public', existsSync('public/.well-known/ai-catalog.json'), false)
const katalogArd = readFileSync('src/app/.well-known/ai-catalog.json/route.ts', 'utf8')
check('katalog bierze wersje formuly z kodu', katalogArd.includes('version: FORMULA_VERSION'), true)
check('i nie wpisuje zadnej wersji recznie', /version: '9\./.test(katalogArd), false)
check('katalog liczy domeny z korpusu', katalogArd.includes('CURATED_DOMAINS.size'), true)
check('katalog liczy checki z listy', katalogArd.includes('CHECKS.length'), true)
// `updatedAt` znika naumyslnie: nigdy go nie utrzymywalismy, a data stemplowana przy kazdym deployu
// odpowiada na inne pytanie, niz to pole zadaje.
check('katalog nie publikuje daty, ktorej nie utrzymujemy', /updatedAt:/.test(katalogArd), false)

// `/bot` mowi vendorom, po czym nas poznaja. Naglowek `From` jedzie WYLACZNIE pod naszym UA, a
// wiekszosc skanu leci jako przegladarka - strona mowila „every request" i to bylo nieprawda dla
// wiekszosci ruchu, ktory u nich widac.
const stronaBot = readFileSync('src/app/bot/page.tsx', 'utf8')
const klientHttp = readFileSync('src/lib/scan/http.ts', 'utf8')
check('From jedzie tylko pod naszym UA', klientHttp.includes('...(ua === AGENT_UA ? { from: CONTACT } : {})'), true)
check('/bot nie obiecuje From na kazdym zapytaniu', /Every request carries\{/.test(stronaBot), false)
check('/bot mowi, ze reszta idzie jako przegladarka', stronaBot.includes('Most of the scan is not sent under that name'), true)
check('/bot podaje prawdziwy limit rownoleglosci', stronaBot.includes(`${MAX_PER_SITE} requests`) || stronaBot.includes(`{MAX_PER_SITE}`), true)

// Liczby na `/standard` opisuja CUDZY dokument, wiec nie da sie ich wziac z naszego kodu ani
// pobrac przy budowaniu. Zamiast tego data czytania **wygasa**: gdy zrobi sie starsza niz 60 dni,
// build oblewa i ktos musi ten dokument przeczytac jeszcze raz. Zmierzone 2026-08-19: strona mowila
// „28 requirements", a agentready.org mial ich juz 30 (7 MUST bez zmiany, wersja nadal 1.0.0), czyli
// twierdzenie o kims innym zestarzalo sie w jeden dzien i nic tego nie zglosilo.
const stronaStandard = readFileSync('src/app/standard/page.tsx', 'utf8')
const przeczytaneDnia = stronaStandard.match(/const SPEC_READ_ON = '([^']+)'/)?.[1] ?? ''
// Dni kalendarzowe LOKALNIE, nie odstep miedzy chwilami: `Date.parse('19 August 2026')` to polnoc
// UTC, wiec build o 00:30 w strefie UTC+2 widzialby dzisiejsza date jako jutrzejsza i oblewal
// wlasnie w nocy, czyli wtedy, kiedy to repo buduje najczesciej. Codeksa.
const oPolnocy = (at: Date) => new Date(at.getFullYear(), at.getMonth(), at.getDate()).getTime()
const wiekWDniach = (napisana: string) =>
  Math.round((oPolnocy(new Date()) - oPolnocy(new Date(`${napisana} 00:00`))) / 86_400_000)
const dniOdLektury = wiekWDniach(przeczytaneDnia)
check('data lektury cudzego standardu jest datą', Number.isFinite(dniOdLektury), true)
// Obustronnie: data z przyszlosci daje ujemny wiek, ktory spelnia „nie starsza niz 60 dni" na
// zawsze, wiec literowka w roku wylaczalaby ten straznik na rok. Codeksa.
//
// Z tolerancja jednego dnia, i to jest odrzucenie drugiej rady codeksa z uzasadnieniem: proponowal
// liczyc obie daty w jednej, ustalonej strefie. Data jest PISANA recznie w Warszawie, a build moze
// isc gdziekolwiek, wiec ustalona strefa nie usuwa przesuniecia, tylko je przenosi - zawsze zostaje
// +/- jeden dzien. Dolna granica istnieje po to, zeby zlapac literowke w roku, a nie zeby pilnowac
// polnocy, wiec dostaje dzien luzu i przestaje byc wrazliwa na strefe w ogole.
check('i nie z przyszlosci', dniOdLektury >= -1, true)
check('i nie starsza niz 60 dni - przeczytaj go ponownie', dniOdLektury <= 60, true)
// Kontrolka: dwie daty na tej stronie to dwa rozne fakty i nie moga byc jedna stala.
check('lektura specu i nasza sonda to osobne daty', stronaStandard.includes('const PROBED_ON'), true)

// Ta sama zasada dla liczb o KONKURENCIE na `/methodology`. Ich data siedziala tylko w komentarzu w
// kodzie, wiec czytelnik widzial „70 checks" w czasie terazniejszym bez zadnej daty. Zweryfikowane
// 2026-08-19 na ich stronach: 70 checkow, 23 checki dostepnosci, zero wystapien slow signup,
// provisioning i CAPTCHA - wszystko sie zgadza, ale samo z siebie nie zostanie prawda.
const stronaMetodologii = readFileSync('src/app/methodology/page.tsx', 'utf8')
const rywaleCzytaneDnia = stronaMetodologii.match(/const RIVALS_READ_ON = '([^']+)'/)?.[1] ?? ''
const dniOdRywali = wiekWDniach(rywaleCzytaneDnia)
check('data liczb o konkurencie jest datą', Number.isFinite(dniOdRywali), true)
check('nie z przyszlosci', dniOdRywali >= -1, true)
check('i nie starsza niz 60 dni - policz je ponownie', dniOdRywali <= 60, true)
check('i widzi ja czytelnik, nie tylko komentarz', stronaMetodologii.includes('counted on their own pages on {RIVALS_READ_ON}'), true)

// Trzecie miejsce z twierdzeniem o cudzym produkcie: `/findings` mowilo w czasie terazniejszym, ze
// Lighthouse i Cloudflare „stop at documentation and protocol files", bez zadnej daty ani zrodla -
// a kategoria Lighthouse'a czyta tez drzewo dostepnosci i przesuniecia ukladu, wiec zdanie bylo i
// niedatowane, i nieprecyzyjne. Sprawdzone 2026-08-19 u zrodla: `lighthouse --only-categories=
// agentic-browsing` na naszej domenie (13.4.1) daje szesc audytow, a lista Cloudflare'a pochodzi z
// ich wlasnego ogloszenia. Negatywne twierdzenie („nikt nie pyta o konto") niesie teraz swoja liste.
const stronaFindings = readFileSync('src/app/findings/page.tsx', 'utf8')
const rywaleSprawdzeniDnia = stronaFindings.match(/const RIVALS_CHECKED_ON = '([^']+)'/)?.[1] ?? ''
const dniOdSprawdzenia = wiekWDniach(rywaleSprawdzeniDnia)
check('data sprawdzenia cudzych narzedzi jest datą', Number.isFinite(dniOdSprawdzenia), true)
check('nie z przyszlosci', dniOdSprawdzenia >= -1, true)
check('i nie starsza niz 60 dni - odpal je ponownie', dniOdSprawdzenia <= 60, true)
check('i widzi ja czytelnik', stronaFindings.includes('Read on {RIVALS_CHECKED_ON}'), true)

// `/v/<domena>` publikuje TYLKO to, co zeskanowalismy sami. Cudzy skan goscia nie moze stac sie
// nasza publiczna strona o cudzej firmie - `/pricing` obiecuje „a permanent link you can forward, and
// we do not post it anywhere", a `/bot`, ze anonimowe zadanie nie przepisze tego, co ta witryna mowi
// o firmie. Zmierzone 2026-08-20: `tally.so` i `svix.com` mialy wylacznie wiersz goscia i renderowaly
// sie tutaj w calosci.
// I to samo rozroznienie musi stac na `/privacy`, bo to tam czytelnik idzie po zdanie o swoich
// danych. Do 2026-08-20 mowilo tylko „they are published", co przy skanie GOSCIA nie bylo prawda po
// poprawce i bylo za szerokie przed nia.
const stronaPrywatnosc = readFileSync('src/app/privacy/page.tsx', 'utf8')
check('privacy rozroznia nasz skan od skanu goscia', stronaPrywatnosc.includes('stays at its own'), true)
// I nie obiecuje wiecej, niz adres daje: 64 bity to nie „nie da sie zgadnac na zawsze", tylko tyle,
// ile naprawde jest, plus zdanie o wierszu, ktorego baza nie przyjela. Codeksa - oba zdania byly
// moje i oba obiecywaly za duzo.
check('i mowi, ile ten adres naprawde wart', stronaPrywatnosc.includes('64 random bits'), true)
// Trzy epoki identyfikatora, nie dwie. Zmierzone 2026-08-20 na 7327 raportach: 24 bez sufiksu (7
// sierpnia, zanim powstal), 7303 po 16 bitow. Zdanie „przed 20 sierpnia 16 bitow" bylo falszywe dla
// tych 24 i zanizalo, jak przewidywalne sa. Codeksa, czwarte przejscie po tym samym akapicie.
check('i nazywa najstarsze adresy bez sufiksu', stronaPrywatnosc.includes('carry none at all'), true)
check('z data, kiedy je policzylem', stronaPrywatnosc.includes('counted on 20 August 2026'), true)
check('i mowi, ze przestaly byc serwowane', stronaPrywatnosc.includes('stopped being served on 20 August'), true)
// I `/r` naprawde ich nie wydaje. Adres bez losowego sufiksu nie chroni niczego, wiec strona go nie
// otwiera; dane zostaja, wraca jedna linijka.
check('adres bez sufiksu nie chroni niczego', addressProtectsNothing('htmx-org-202608072323'), true)
check('a adres z sufiksem 16-bitowym juz tak', addressProtectsNothing('svix-com-20260819233014-4829'), false)
check('i 64-bitowy tym bardziej', addressProtectsNothing('posthog-com-20260820001706-8ab44bcd3a7d18d1'), false)
check('strona /r odmawia takiego adresu', readFileSync('src/app/r/[id]/page.tsx', 'utf8').includes('addressProtectsNothing(id)) notFound()'), true)
// Okno ponownego uzycia: kto pyta o domene przeskanowana w ostatnich 15 minutach, dostaje TAMTEN skan,
// wiec zdanie „twojego skanu nie ma na /v" bylo nieprawda dokladnie dla tego przypadku. Codeksa,
// trzecie przejscie po moim wlasnym akapicie.
check('i przyznaje sie do okna ponownego uzycia', stronaPrywatnosc.includes('already scanned in the last fifteen'), true)
check('i przyznaje sie do raportu, ktorego baza nie przyjela', stronaPrywatnosc.includes('lives only in memory'), true)
check('a identyfikator ma te 64 bity naprawde', readFileSync('src/lib/store.ts', 'utf8').includes('randomBytes(8).toString'), true)
check('i mowi, ze nie ma go ani na /v, ani w korpusie', stronaPrywatnosc.includes('do not include it in') && stronaPrywatnosc.includes('do not show it at'), true)

const stronaV = readFileSync('src/app/v/[domain]/page.tsx', 'utf8')
check('/v czyta wylacznie wiersze zasiane', stronaV.includes('await store.latestForDomain(domain, true)'), true)
// I poza korpusem tylko wiersz na BIEZACEJ formule. Zmierzone na czternastu takich wierszach: piec
// publikowalo werdykt, ktorego ta sama tresc juz by dzis nie dostala, i kazda roznica szla w te sama
// strone - zmierzone zero na „nie zmierzylismy". Korpus zostaje z banerem, bo jego wiersze utrzymuje
// przemiat; poza korpusem nic ich nie odswiezy.
// Regula mieszkala w komponencie strony i byla tu sprawdzana PO TEKSCIE. Gdy przeniosla sie do
// `published.ts` (bo audyt musial pytac o dokladnie to samo i sie rozjechal), ten straznik oblal - i
// dobrze, bo o to mu chodzilo. Teraz sprawdza ZACHOWANIE funkcji, ktore przezyje kazde przeniesienie,
// plus to jedno, czego zachowanie nie powie: ze strona naprawde jej uzywa.
const wKorpusie = [...CURATED_DOMAINS][0]
check('strona uzywa wspolnej reguly publikacji', stronaV.includes('isPublishableRow(domain, seeded.scorecard.formulaVersion)'), true)
check('poza korpusem publikujemy tylko biezaca formule', isPublishableRow('nie-w-korpusie.test', FORMULA_VERSION), true)
check('a starszej juz nie', isPublishableRow('nie-w-korpusie.test', '7.4'), false)
// Korpus zostaje mimo starszej formuly, bo przemiat go wyrownuje, a strona niesie o tym baner.
check('wiersz korpusu na starszej formule zostaje', isPublishableRow(wKorpusie, '7.4'), true)
check('i nie ma juz galezi bioracej najnowszy wiersz jakikolwiek', stronaV.includes('return store.latestForDomain(domain)\n'), false)

// Blad z serwera MCP ma nazwac argument, ktorego brakuje. Zmierzone na zywym serwerze: wolanie z
// `{"problem": "..."}` dostawalo `isError: true` i zdanie „Describe the problem, for example ...",
// ktore NIE mowi, ze klucz nazywa sie `job` - agent moze powtorzyc ten sam bledny call w kolko.
check('blad MCP nazywa brakujacy argument', readFileSync('src/app/mcp/route.ts', 'utf8').includes('Pass the problem as \"job\"'), true)
check('i pokazuje, co przyszlo zamiast niego', readFileSync('src/app/mcp/route.ts', 'utf8').includes('This call carried'), true)
// I nie myli zlego ARGUMENTU ze zla WARTOSCIA: `{"job": ""}` ma dostac zdanie o pustce, nie o tym,
// ze przyslano „job" zamiast „job". Kontrolka na obie pozostale galezie.
check('pusta wartosc ma swoje zdanie', readFileSync('src/app/mcp/route.ts', 'utf8').includes('"job" was empty'), true)
check('zly typ ma swoje zdanie', readFileSync('src/app/mcp/route.ts', 'utf8').includes('"job" has to be a string'), true)
check('a lista innych kluczy nie zawiera samego job', readFileSync('src/app/mcp/route.ts', 'utf8').includes("filter((key) => key !== 'job')"), true)

// Trzy pliki, ktore agent czyta ZAMIAST pytac czlowieka, podaja nasze limity - i wszystkie trzy sa
// statyczne, wiec nie moga wziac liczby ze stalej. Zgadzaly sie dzis co do jednego (5 i 30, plus
// okno 15 minut w llms.txt), ale zgodnosc bez straznika jest przypadkiem: to ta sama rodzina, co
// katalog ARD publikujacy formule sprzed dziewieciu wydan. Straznik pilnuje LICZB, nie zdan.
const limityWPlikach: [string, string[]][] = [
  ['public/agent-signup.md', [`${PER_DOMAIN_PER_HOUR} scans per hour`, `${PER_CALLER_PER_HOUR} per hour per source address`]],
  ['public/agents.md', [`${PER_DOMAIN_PER_HOUR} scans per hour`, `${PER_CALLER_PER_HOUR} per hour per address`]],
  ['public/llms.txt', [`${PER_CALLER_PER_HOUR} scans per source address`, `${PER_DOMAIN_PER_HOUR} per domain`]],
]
for (const [plik, fragmenty] of limityWPlikach) {
  const tresc = readFileSync(plik, 'utf8')
  for (const fragment of fragmenty) {
    check(`${plik} podaje limit tak, jak go egzekwujemy: „${fragment}"`, tresc.includes(fragment), true)
  }
}
// Okno ponownego uzycia tez jest liczba, ktora obiecujemy agentowi.
check(
  'llms.txt nazywa okno ponownego uzycia w minutach ze stalej',
  readFileSync('public/llms.txt', 'utf8').includes(`inside ${REUSE_WINDOW_MS / 60_000} minutes`),
  true,
)

// Sufit bajtow jest CYTOWANY w dwoch werdyktach („larger than the 400,000 bytes we read"), a metodyka
// go nie znala - vendor szedl po wyjasnienie tam, gdzie go nie bylo. Liczba idzie ze stalej, wiec nie
// da sie jej rozjechac; straznik pilnuje tylko tego, ze strona w ogole o niej mowi i ze mowi takze o
// drugim skutku sufitu, czyli o WYBORZE strony (9.50).
const metodykaCap = readFileSync('src/app/methodology/page.tsx', 'utf8')
check('metodyka nazywa sufit bajtow ze stalej', metodykaCap.includes('${MAX_BYTES_PER_RESPONSE.toLocaleString(\'en-US\')} bytes'), true)
check('i mowi, ze sufit decydowal takze o wyborze strony', metodykaCap.includes('stopped deciding which of your pages we read'), true)
check('i ze milczaca kontrolka nie zgaduje', metodykaCap.includes('if the control does not answer, we skip the path'), true)

check('sonda widzi cudze poswiadczenie po nazwie', namesSomebodyElsesCredential('Create a Firebase ', 'Service Account', 'onesignal.com'), true)
check('i nie widzi marki, ktorej przy poswiadczeniu nie ma', namesSomebodyElsesCredential('Create a ', 'Service Account', 'browserbase.com'), false)
check('wlasna marka nie dyskwalifikuje', namesSomebodyElsesCredential('Create a GitHub ', 'personal access token', 'github.com'), false)
check('obca chmura z czlonem cloud tez', namesSomebodyElsesCredential('Create a Google Cloud ', 'service account', 'nylas.com'), true)
check('marka w srodku cudzej nazwy to nie ta marka', namesSomebodyElsesCredential('Create an Apple ', 'api key', 'pineapple.com'), true)
check('ale prawdziwy wlasciciel nadal swoj', namesSomebodyElsesCredential('Create an Apple ', 'api key', 'apple.com'), false)
check('marka serwowana z innej domeny tez jest swoja', namesSomebodyElsesCredential('Create an AWS ', 'access key', 'amazon.com'), false)
check('i to samo dla azure', namesSomebodyElsesCredential('Create an Azure ', 'service account', 'microsoft.com'), false)
// Codeksa, dwie rundy: marka ukryta W SRODKU dopasowania liczy sie, a cudze poswiadczenie, ktore
// tylko dzieli zdanie z naszym, nie liczy sie. Jedno i drugie na tej samej granicy.
check(
  'marka w srodku dopasowania tez',
  namesSomebodyElsesCredential('', 'Create a Firebase API key programmatically', 'onesignal.com'),
  true,
)
check(
  'cudzy klucz obok wlasnego nie zabiera punktu',
  namesSomebodyElsesCredential('Enter your GitHub access token, then create an ', 'api key', 'vercel.com'),
  false,
)

// 9.45: „service account" to czwarta fraza tego samego rodzaju, co trzy rozbrojone w 9.32, i
// przeoczona, bo nazywa poswiadczenie, a nie API. Wszystkie cytaty ponizej sa PRAWDZIWE, wziete z
// korpusu 2026-08-19: 13 wierszy trzymalo punkt na tej frazie samej, a dziesiec z nich cytuje
// okruszek nawigacji, statystyke z bloga albo cudza konsole.
console.log('\nsame slowa "service account" to jeszcze nie sciezka do klucza')
const saMowi = (zdanie: string) => provisioningMatches(`<p>${zdanie}</p>`).some((one) => one.startsWith('service account'))
check('okruszek nawigacji nie liczy sie', saMowi('Service Accounts | Enterprise Connect | Cronofy Docs Cronofy Docs Menu'), false)
check('statystyka z bloga nie liczy sie', saMowi('This year, 59% of AWS IAM users, 55% of Google Cloud service accounts and 40% of Microsoft Entra ID applications had an access key older than a year'), false)
check('istniejace konto nie liczy sie', saMowi('Check your CAPTCHA solver service account for sufficient balance'), false)
check('samo dwuslowie nie liczy sie', saMowi('Service account'), false)
// Kontrolka: zdanie, ktore NAPRAWDE tworzy konto uslugowe **programowo**, nadal liczy - inaczej
// regula kasuje check. Fixture'y zmienily sie przy 9.47 i warto powiedziec, ktore: stalo tu zdanie
// mixpanela z ich llms.txt i zdanie growthbooka o roli Storage, i oba przestaly liczyc naumyslnie.
// Pierwsze dlatego, ze indeks linkow nie mowi, czy klucz robi program (ich wlasne API to potwierdza,
// ale na stronie, ktorej ten skan nie otworzyl), drugie dlatego, ze to konsola Google.
check('tworzenie konta nadal liczy', saMowi('Create a service account via the Management API'), true)
check('i w drugiej kolejnosci slow tez', saMowi('A service account is created by the provisioning API'), true)
// I te dwa zdania, ktore tu wczesniej stały, dzis nie licza sie - to jest cala tresc 9.47.
check('indeks linkow bez slowa o programie nie liczy', saMowi('- [Create Service Account](https://docs.mixpanel.com/reference/create-service-account.md)'), false)
check('rola w konsoli nie liczy', saMowi('Give Storage role access to the newly created service account'), false)
// Odleglosc jest krotka celowo: czasownik 41 znakow dalej dotyczy konta, ktore juz istnieje.
check('czasownik daleko nie ratuje frazy', saMowi('service account email to impersonate via `iamcredentials:generateIdToken`'), false)
// Etykieta mowi vendorowi, czego szukamy, wiec musi opisywac nowa regule, a nie stara.
// Rzeczownik odczasownikowy PO frazie to naglowek sekcji, a nie tworzenie - to znalazl codex.
check('naglowek "service account provisioning" nie liczy sie', saMowi('Service account provisioning and rotation'), false)
check('ani "service account generation settings"', saMowi('Service account generation settings'), false)
// Kontrolka: ten sam czasownik PRZED fraza jest czasownikiem i nadal liczy.
check('"provisioning a service account" liczy sie', saMowi('This endpoint is about provisioning a service account'), true)
check('strona bierna po frazie liczy sie', saMowi('A service account is created for every project via the API'), true)
// Kontrolka na sama nowa regule: to samo zdanie bez slowa o programie juz nie liczy.
check('ta sama strona bierna bez programu nie liczy', saMowi('A service account is created for every project'), false)
check('etykieta opisuje nowa regule', PROVISIONING_PATTERN_LABELS.includes('service account, in a sentence that creates one by program'), true)

// Zdanie "nor at any address in <strona>" wymienialo strony, o ktore ZAPYTALISMY, a nie te, ktore
// przeczytalismy. uploadcare.com niosl je z adresem https://uploadcare.com/_mcp/server, ktory jest
// 404: nie przeczytalismy tam nic, wiec "szukalismy i nie znalezlismy" bylo zdaniem o stronie,
// ktorej nie ma.
console.log('\nwymieniamy strony przeczytane, nie zapytane')
check(
  'sonda filtruje po tym, co odpowiedzialo',
  readFileSync('src/lib/scan/funnel.ts', 'utf8').includes('followed: pages.filter((_, index) => bodies[index]?.ok)'),
  true,
)

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
const zBramka = gates.evaluate({
  funnel: { signup: { url: 'https://v.test/signup', reachable: true, captcha: ['recaptcha'], rendersFormWithoutJs: true } },
} as never)
check('bramki strony, ktora dostalismy, sa mierzalne', zBramka.points, 0)
// 9.53. To najostrzejsze zdanie na calej karcie - CAPTCHA to dla agenta twarde zero - i 32 wiersze
// niosly je bez podania, KTORA strone przeczytalismy. Galaz niemierzalna obok nazywala ten sam
// adres od poczatku, wiec regula byla napisana dla sasiada i nieprzeniesiona. Vendor ma miec jedno
// zadanie do powtorzenia.
check('oskarzenie o captche podaje adres formularza', zBramka.detail.includes('server HTML of https://v.test/signup'), true)
check('i nie mowi juz bezokolicznie „the signup page"', zBramka.detail.includes("the signup page's server HTML"), false)

// 9.54. Nasza cisza nie jest ich brakiem. Sonda o kilkunastu sciezkach na dwoch hostach chodzi
// rownolegle, wiec status 0 to zwykle NASZ timeout - a liczyl sie jak „pliku nie ma". calendly.com
// dal 1, 0, 1, 0 punktu na czterech skanach jednego dnia, podczas gdy jego `skill.md` odpowiada 200
// przy kazdym pojedynczym zapytaniu i wazy 284 kB.
check('403 na sciezce wejsciowej to odmowa', isEdgeRefusal(403), true)
check('404 to prawdziwy brak pliku', isEdgeRefusal(404), false)
check('429 to nasze tempo, nie odmowa vendora', isEdgeRefusal(429), false)
// `isEdgeRefusal` zostaje bez zmian, bo sluzy calemu skanerowi; status 0 dokladamy TAM, gdzie sonda
// jest rownolegla. Ten straznik czyta wiec wywolanie, a nie sama funkcje.
const funnelSource = readFileSync('src/lib/scan/funnel.ts', 'utf8')
check('sciezka bez odpowiedzi jest liczona osobno od odmowy', funnelSource.includes('const unanswered = got.status === 0'), true)
check('i nie jest wlewana do odmowy', funnelSource.includes('isEdgeRefusal(got.status) || got.status === 0'), false)
// Codex: naprawa, ktora zamienia „nie publikujesz tych plikow" na „twoj serwer nas odrzucil", nie
// jest naprawa. Zdanie o naszym timeoucie ma nie obwiniac vendora i nie dawac mu instrukcji.
const wejscieBezOdpowiedzi = CHECKS.find((c) => c.id === 'agent_entry_point')!
const cisza = wejscieBezOdpowiedzi.evaluate({
  site: 'https://v.test',
  discovered: { docs: null },
  funnel: { entryPaths: { 'https://v.test/skill.md': false }, entryPointsFound: [], entryPointsUncertain: [], entryPointsWithProcedure: [], entryPathsRefused: 0, entrySiteRefused: 0, entrySiteUnanswered: 3, entryProbesAsked: 9, entryDocsProbed: false },
} as never)
check('cisza jest niemierzalna, nie oskarzeniem', cisza.inconclusive === true, true)
check('i mowi, ze to my nie dostalismy odpowiedzi', cisza.detail.includes('never answered us at all'), true)
// Mianownik z POMIARU, nie ze stalej: gdy dziewiec malymi literami nic nie dalo, pytamy jeszcze trzy
// wielkimi, wiec „12 z 9" bylo mozliwe do wydrukowania (codex).
const dwanascieSond = wejscieBezOdpowiedzi.evaluate({
  site: 'https://v.test',
  discovered: { docs: null },
  funnel: { entryPaths: {}, entryPointsFound: [], entryPointsUncertain: [], entryPointsWithProcedure: [], entryPathsRefused: 0, entrySiteRefused: 0, entrySiteUnanswered: 12, entrySiteProbes: 12, entryProbesAsked: 12, entryDocsProbed: false },
} as never)
check('licznik nie przekracza mianownika', dwanascieSond.detail.includes('12 of the 12 agent entry paths'), true)
check('i nie drukujemy „12 of the 9"', dwanascieSond.detail.includes('of the 9'), false)
// Odmowa I cisza naraz: sama odmowa obiecywalaby, ze wpuszczenie HTTP wystarczy, a czesci sciezek
// nie zmierzylismy z NASZEGO powodu (codex).
const jednoIDrugie = wejscieBezOdpowiedzi.evaluate({
  site: 'https://v.test',
  discovered: { docs: null },
  funnel: { entryPaths: {}, entryPointsFound: [], entryPointsUncertain: [], entryPointsWithProcedure: [], entryPathsRefused: 2, entrySiteRefused: 2, entrySiteUnanswered: 3, entrySiteProbes: 9, entryProbesAsked: 9, entryDocsProbed: false },
} as never)
check('zdanie mowi o odmowie', jednoIDrugie.detail.includes('2 of the 9 agent entry paths'), true)
check('i o naszej ciszy w tym samym zdaniu', jednoIDrugie.detail.includes('3 more never answered us at all'), true)
check('i nazywa ja naszym timeoutem', jednoIDrugie.detail.includes('our own timeout'), true)
check('nie obwinia edge vendora', cisza.detail.includes('refusal'), false)
check('i nie kaze mu niczego naprawiac', Boolean(cisza.unblock?.includes('Nothing for you to do')), true)
// I to samo, gdy milczy HOST DOKUMENTACJI, a strona odpowiada - to byl dokladnie przypadek
// calendly.com, wiec bez tego naprawa nie naprawiala tego, od czego sie zaczela (codex).
const ciszaNaDocs = wejscieBezOdpowiedzi.evaluate({
  site: 'https://v.test',
  discovered: { docs: 'https://developer.v.test/' },
  funnel: { entryPaths: { 'https://v.test/skill.md': false }, entryPointsFound: [], entryPointsUncertain: [], entryPointsWithProcedure: [], entryPathsRefused: 0, entrySiteRefused: 0, entrySiteUnanswered: 0, entryPathsUnanswered: 4, entryProbesAsked: 18, entryDocsProbed: true },
} as never)
check('cisza na hoscie dokumentacji tez nie jest oskarzeniem', ciszaNaDocs.inconclusive === true, true)
check('i zdanie nie mowi juz „zaden z tych plikow"', ciszaNaDocs.detail.includes('None of the'), false)
check('a przyznaje, ze czesci nie zmierzylismy', ciszaNaDocs.detail.includes('never answered us at all'), true)

// Kontrolka soft-404 hosta dokumentacji ma trafiac do zapisu. Bez niej nie dalo sie rozstrzygnac,
// czemu jeden przebieg uznal cudze „# Page Not Found" za plik: zapis mial tylko kontrolke strony
// glownej (calendly.com 197 990 B), a plik pochodzil z developer.calendly.com (284 328 B). Straznik
// jest tekstowy, bo to zachowanie widac dopiero na zywym hoscie - pilnuje wiec dwoch rzeczy, ktore
// da sie sprawdzic bez sieci: ze pole istnieje i ze NIE jest ta sama kontrolka co dla strony.
check('kontrolka hosta dokumentacji jest zapisywana', funnelSource.includes('catchAllDocs: docsCatchAll'), true)
check('i pobierana osobno dla tego hosta', funnelSource.includes('docsCatchAll = await servesCatchAllText(docsOrigin)'), true)
check('a sondy docs nie dostaja kontrolki strony glownej', funnelSource.includes('probeOne(docsOrigin, catchAll)'), false)

// 9.55. Trzy ostatnie oskarzenia bez adresu z listy `audit-evidence`. Kazde bylo prawdziwe i
// zarazem nie do powtorzenia: vendor nie wiedzial, KTORY robots.txt przeczytalismy ani KTORA paczke
// sprawdzilismy - a przy dopasowaniu po wydawcy to jest dokladnie jego pierwsze pytanie.
const agenci = CHECKS.find((c) => c.id === 'user_agents_allowed')!
const zablokowany = agenci.evaluate({
  site: 'https://v.test',
  robots: { present: true, unreadable: false, blockedByClass: { user: ['ChatGPT-User'] }, crawlers: {}, blanketDisallowAll: false },
} as never)
check('blokada nazywa plik, z ktorego ja czytamy', zablokowany.detail.includes('Blocked in https://v.test/robots.txt'), true)
// Galaz „disallow wszystkiego" wychodzi wczesniej, wiec omijala adres - ta sama luka, ktora ta
// wersja zamyka gdzie indziej (codex).
const wszystkoZabronione = agenci.evaluate({
  site: 'https://v.test',
  robots: { present: true, unreadable: false, blockedByClass: { user: [] }, crawlers: {}, blanketDisallowAll: true },
} as never)
check('disallow wszystkiego tez nazywa plik', wszystkoZabronione.detail.includes('https://v.test/robots.txt disallows everything'), true)

const tempo = CHECKS.find((c) => c.id === 'no_crawl_delay')!
const wolno = tempo.evaluate({
  site: 'https://v.test',
  robots: { present: true, unreadable: false, crawlDelaySeconds: 10, crawlers: {}, blockedByClass: { user: [] } },
} as never)
check('Crawl-delay tez nazywa plik', wolno.detail.includes('in https://v.test/robots.txt'), true)
check('i nadal podaje sekundy', wolno.detail.includes('Crawl-delay: 10s'), true)

const paczka = CHECKS.find((c) => c.id === 'typed_package')!
const bezTypow = paczka.evaluate({
  site: 'https://v.test',
  discovered: { npmPackage: 'vendor-sdk' },
  npm: { package: 'vendor-sdk', found: true, bundledTypes: false, staleMonths: 1, linkedFromSite: true, publisherMatched: false },
} as never)
check('paczka bez typow dostaje adres w rejestrze', bezTypow.detail.includes('https://www.npmjs.com/package/vendor-sdk'), true)

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
// „Nic nie odpowiedzialo" i „nic nie mowilo MCP" to dwa rozne twierdzenia i tylko drugie jest nasze.
// Zmierzone 2026-08-18 (audit-mcp.mts): z 560 adresow, ktore te zdania wymieniaja, 32 odpowiadaja,
// kazdy zwykla bramka API - „Missing API Key", „Invalid CSRF Token", „Method not allowed".
check('nie mowimy, ze nic nie odpowiedzialo', registrySilent(true).detail.includes('nothing answered'), false)
check('mowimy, ze nic nie mowilo MCP', registrySilent(true).detail.includes('nothing spoke MCP at'), true)

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
// Ta sama dziura co w 9.43: `frontPageStatus !== got.status` jest PRAWDA, gdy strona glowna w
// ogole nie odpowiedziala, wiec milczenie kontrolki czytalo sie jako "rozni sie od kontrolki".
check('milczaca strona glowna nie przyznaje serwera', methodRefusalIsRouted(refusal(), undefined), false)
// Kontrolka, ktora "odpowiedziala" statusem 0 albo 429, to ta sama cisza w innym przebraniu:
// oba roznia sie od 405, wiec surowy status czytalby sie jako odpowiedz strony glownej.
check('status 0 to nie odpowiedz', informative({ status: 0 } as never), false)
check('429 to nie odpowiedz', informative({ status: 429 } as never), false)
check('404 juz tak', informative({ status: 404 } as never), true)
check(
  'sonda oddaje status kontrolki dopiero, gdy ta cos powiedziala',
  readFileSync('src/lib/scan/funnel.ts', 'utf8').includes('routedControlSpoke ? routedControl.status : undefined'),
  true,
)
check('ale ksztalt sam w sobie nadal jest odmowa metody', readsAsAMethodRefusal(refusal()), true)
check('a Allow: GET wyklucza go tez tutaj', readsAsAMethodRefusal(refusal({ allow: 'GET, HEAD' })), false)

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
// Te testy pytaja o zdanie, ktore ZALEZY od `MONGODB_DB`, wiec nie wolno im zakladac, ze zmienna
// jest pusta: przy buildzie z ustawiona nazwa fixture „stackpick" bylby cudza baza i bramka
// wywracalaby build w konfiguracji, ktora sama przed chwila dopuscilismy (codex, trzecie przejscie).
// Ustawiamy ja wiec jawnie na czas bloku i oddajemy dokladnie to, co bylo - takze brak zmiennej.
const savedDatabaseName = process.env.MONGODB_DB
process.env.MONGODB_DB = 'stackpick'

const quotaMail = (databases: { name: string; mb: number }[]) =>
  quotaEmail({
    usedMb: 4200, quotaMb: FLEX_QUOTA_MB, percent: 82, verdict: 'warning', measuredAt: '', databases,
  }).text
const withNeighbour = quotaMail([{ name: 'equity-analyst', mb: 4000 }, { name: 'stackpick', mb: 200 }])
const aloneNow = quotaMail([{ name: 'stackpick', mb: 4100 }, { name: 'admin', mb: 100 }])

check(
  'mail nazywa najwieksza baze, bo to ona decyduje, gdzie szukac miejsca',
  withNeighbour.includes('Largest is equity-analyst'),
  true,
)
// Migracja z 20.08 zdjela sasiada, a zdanie o wspoldzielonym klastrze zostalo w mailu i doradzalo
// szukania miejsca u kogos, kogo juz nie ma. Alarm ma mowic to, co ZMIERZYL, wiec obie galezie
// stoja tu obok siebie: dopoki cudza baza jest w odczycie, mail ja nazywa; gdy jej nie ma, nie
// wolno mu jej wymyslic. Bez tego straznika kazda kolejna przeprowadzka cofa to po cichu.
check(
  'gdy w odczycie stoi cudza baza, mail ja nazywa',
  withNeighbour.includes('also holds equity-analyst'),
  true,
)
check(
  'gdy jestesmy sami, mail NIE wysyla nas po miejsce do cudzego projektu',
  aloneNow.includes('also holds') || aloneNow.includes('another project'),
  false,
)
check('i mowi wprost, ze zaden inny projekt tu nie mieszka', aloneNow.includes('No other project lives here'), true)
// Codex na pierwszej wersji: „wszystko powyzej jest nasze do sprzatniecia" jest nieprawda, gdy w
// odczycie stoi `admin`. Alarm ma nazwac LICZBE, ktora da sie sprzatnac, a nie cala liste.
check('nazywa nasze megabajty, nie cala liste', aloneNow.includes('4100 MB is stackpick and ours to prune'), true)
// Codex, drugie przejscie: `MONGODB_DB` jest wspierane w `store-mongo.ts` i w skrypcie prune, wiec
// wpisana na sztywno nazwa „stackpick" kazalaby alarmowi uznac NASZA baze za cudzy projekt i
// odradzic sprzatanie jedynej rzeczy, ktora da sie sprzatnac. Nazwa ma isc z konfiguracji.
process.env.MONGODB_DB = 'letagentsin-prod'
const renamed = quotaMail([{ name: 'letagentsin-prod', mb: 4100 }, { name: 'admin', mb: 100 }])
check('pod inna nazwa bazy nadal wie, ktora jest nasza', renamed.includes('4100 MB is letagentsin-prod and ours to prune'), true)
check('i nie uznaje jej za cudzy projekt', renamed.includes('also holds letagentsin-prod'), false)
check('a komenda prune celuje w te sama baze', renamed.includes(`MONGODB_DB='letagentsin-prod'`), true)
// Nazwa ze spacja rozsypalaby komende na dwa slowa dokladnie wtedy, gdy ktos wkleja ja w awarii.
process.env.MONGODB_DB = 'two words'
check('nazwa ze spacja zostaje jednym argumentem', quotaMail([{ name: 'two words', mb: 10 }]).includes(`MONGODB_DB='two words'`), true)
if (savedDatabaseName === undefined) delete process.env.MONGODB_DB
else process.env.MONGODB_DB = savedDatabaseName
// `admin` to ksiegowosc Atlasa, nie sasiad: policzona jako cudza baza kazalaby nam szukac miejsca
// tam, gdzie nie mamy czego kasowac.
check('ksiegowosc Atlasa nie jest sasiadem', aloneNow.includes('also holds admin'), false)
// Komenda prune musi zostac w obu galeziach - to jedyna rzecz w tym mailu, ktora cos naprawia.
check('komenda prune jest w obu wersjach maila', withNeighbour.includes('prune-reports.mts --delete') && aloneNow.includes('prune-reports.mts --delete'), true)
// Komenda w mailu musi trafic w TE baze, o ktorej mail mowi. Bez `MONGODB_DB` skrypt prune spada
// na wlasna nazwe domyslna i kasuje gdzie indziej niz raportowane megabajty (codex, czwarte).
check('komenda niesie nazwe bazy, nie tylko URI', aloneNow.includes(`MONGODB_DB='stackpick' MONGODB_URI=$(heroku`), true)

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
// I zeby to samo nie schowalo sie po raz drugi: wiersz korpusu, ktory po przemiecie nie doszedl do
// biezacej formuly, ma byc UWAGA, a nie linijka statystyki. „176 z 177" czytalo sie jak zdrowie.
const poPrzemiecie = readFileSync('scripts/after-reseed.mts', 'utf8')
check('after-reseed alarmuje o wierszu, ktory nie doszedl do formuly', poPrzemiecie.includes('NIE doszlo do'), true)
check('i mowi, ze to zwykle padajacy skan', poPrzemiecie.includes('czy ich skan nie PADA'), true)
check('i lapie takze domene bez zadnego wiersza', poPrzemiecie.includes('BRAK ZASIANEGO WIERSZA'), true)

// Cudzy placeholder nie moze zabic naszego skanu. `signoz.io` dokumentuje
// `https://mcp.<region>.signoz.cloud/mcp`; `new URL` na tym RZUCA, jeden nieoslonięty parse zrobil z
// tego unhandled rejection i **caly skan padal** - dwa razy na przemiat, przez wiele dni, a wiersz
// stal zamrozony na 9.45, podczas gdy „176 z 177" czytalo sie jak zdrowie.
check('adres z placeholderem nie jest do zapytania', askable('https://mcp.<region>.signoz.cloud/mcp'), false)
check('ani z klamrami', askable('https://mcp.{region}.example.com/mcp'), false)
check('ani z dwukropkowym parametrem', askable('https://api.example.com/:tenant/mcp'), false)
check('ani ze spacja', askable('https://example.com/a b'), false)
check('zwykly adres jest', askable('https://mcp.neon.tech/mcp'), true)
check('adres z portem i zapytaniem tez', askable('https://example.com:8443/mcp?x=1'), true)
// Kontrolka na protokol: `mailto:` parsuje sie, a zapytac o nie nie mozemy.
check('a schemat, ktorego nie umiemy zapytac, nie jest', askable('mailto:hello@example.com'), false)
// I straznik na WYWOLANIE: filtr ma stac na liscie kandydatow, bo dalej ida nieoslonięte `new URL`.
check(
  'lista kandydatow MCP jest przefiltrowana',
  readFileSync('src/lib/scan/funnel.ts', 'utf8').includes(').filter(askable)'),
  true,
)
// Ten sam ksztalt na adresie rejestracji: tez pochodzi z ich strony i tez szedl do nieoslonietego
// `new URL`. Przejrzalem pozostale takie miejsca w `funnel.ts` - reszta ma juz try/catch.
check(
  'origin rejestracji liczony tylko z adresu, ktory da sie zapytac',
  readFileSync('src/lib/scan/funnel.ts', 'utf8').includes('signupUrl && askable(signupUrl)'),
  true,
)

// Zgadnieta sciezka kontra nasz wlasny sufit. Dlugosc widocznego tekstu czytala nasze ciecie jako
// cudza pustke: cialo, ktore wypelnilo 400 kB, jest ucinane w srodku bloku, `stripCodeBlocks`
// porzuca reszte dokumentu, i strona dajaca 12 282 znaki w pelnym odczycie czyta sie na 53
// (filestack.com, zmierzone 2026-08-19). Skorupa SPA jest z definicji mala, wiec odpowiedz, ktora
// dobila do sufitu, skorupa nie jest - niezaleznie od tego, co mowi widoczny tekst.
const zgadnietaSciezka = (body: string, extra: Record<string, unknown> = {}) =>
  ({ ok: true, body, url: 'https://v.test/docs', status: 200, headers: { 'content-type': 'text/html' }, truncated: false, ...extra }) as never
check('skorupa SPA to nie zywa strona', howAPathAnswered(zgadnietaSciezka('<html><body><div id="root"></div></body></html>')), 'shell')
check('zwykla strona z tekstem juz tak', howAPathAnswered(zgadnietaSciezka(`<html><body><p>${'slowo '.repeat(80)}</p></body></html>`)), 'page')
// Ani „strona", ani „skorupa": tego rozstrzyga dopiero kontrolka. Wersja, ktora mowila tu wprost
// „strona", przyjmowalaby `/docs` na hostzie z wielka skorupa pod kazdym adresem. Codeksa.
check('cialo uciete sufitem to osobna odpowiedz', howAPathAnswered(zgadnietaSciezka('<html><body><script>x', { truncated: true })), 'cut-short')
check('ale odpowiedz, ktora nie odpowiedziala, nadal nie jest strona', howAPathAnswered(zgadnietaSciezka('', { ok: false, truncated: true })), 'shell')
// Kontrolka: adres, ktorego byc nie moze. Catch-all demaskuje TYLKO odpowiedz tego samego rodzaju,
// czyli tez ucieta naszym sufitem. Krotki soft-404 nie jest tym samym cialem, a przyjmowanie go
// wyrzucaloby dokladnie te prawdziwa dokumentacje, ktora ta kontrolka ma ratowac. Codeksa, drugie
// przejscie - pierwsza wersja mowila tu `true` i byla poprawka psujaca wlasny cel.
check('kontrolka ucieta tak samo demaskuje catch-all', answersEverythingTheSameWay(zgadnietaSciezka('<html><body><script>x', { truncated: true })), true)
check('krotki soft-404 to nie to samo cialo', answersEverythingTheSameWay(zgadnietaSciezka('<html><body><div id="root"></div></body></html>')), false)
check('czytelna strona 404 tym bardziej nie', answersEverythingTheSameWay(zgadnietaSciezka(`<html><body><p>${'slowo '.repeat(80)}</p></body></html>`)), false)
check('a kontrolka, ktora nie odpowiedziala, tez nie', answersEverythingTheSameWay(zgadnietaSciezka('', { ok: false, truncated: true })), false)
// I straznik na WYWOLANIE: milczaca kontrolka nie ma prawa przyznac sciezki. To ta sama zasada, co
// 9.43 dla pliku wejsciowego, i bez tej linijki timeout na kontrolce czytalby sie jak dowod.
const wyborSciezki = readFileSync('src/lib/scan/discover.ts', 'utf8')
check(
  'milczaca kontrolka nie przyznaje zgadnietej sciezki',
  wyborSciezki.includes('if (informative(control) && !answersEverythingTheSameWay(control)) return got.url'),
  true,
)
// Cialo DLUZSZE niz prog, zeby o odrzuceniu decydowal typ tresci, a nie dlugosc. W pierwszej wersji
// stalo tu `{"a":1}`, ktore przechodzilo testem dlugosci i przy wyrzuconym `looksLikeHtml` reguła
// nadal swiecila zielono - czyli sprawdzala nie to, co mialo byc sprawdzone.
check(
  'ani plik, ktory nie jest HTML-em, choc dlugi',
  howAPathAnswered(zgadnietaSciezka(`{"opis":"${'tekst '.repeat(60)}"}`, { headers: { 'content-type': 'application/json' } })),
  'shell',
)

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

// Obserwacja, ktorej jeszcze nie skanowalismy, czeka od zalozenia, a nie w nieskonczonosc. Czytana
// jako nieskonczonosc dawala longestWaitDays = 9999 w chwili, gdy ktokolwiek potwierdzil adres, a
// alarm kadencji w quota.yml pada powyzej osmiu dni: kazdy NOWY klient odpalalby alarm o naszej
// wlasnej dostawie, dopoki nocny przebieg go nie obsluzyl.
console.log('\nnowa obserwacja nie jest spoznionA')
const waitOf = (watch: { checkedAt: string | null; confirmedAt?: string | null; createdAt: string }, now: number) =>
  (now - Date.parse(watch.checkedAt ?? watch.confirmedAt ?? watch.createdAt)) / 86_400_000
const now = Date.parse('2026-08-18T04:00:00Z')
check(
  'zalozona godzine temu i nieskanowana: czeka godzine',
  Math.round(waitOf({ checkedAt: null, createdAt: '2026-08-18T03:00:00Z' }, now)),
  0,
)
check(
  'zalozona dziesiec dni temu i nieskanowana: czeka dziesiec dni',
  Math.round(waitOf({ checkedAt: null, createdAt: '2026-08-08T04:00:00Z' }, now)),
  10,
)
// Potwierdzenie po dwoch tygodniach to nie jest ktos, kogo kazalismy czekac: przed potwierdzeniem
// obserwacji nie ma w kolejce i nie mielismy jak jej obsluzyc.
check(
  'zegar rusza od potwierdzenia, a nie od zapisu',
  Math.round(waitOf({ checkedAt: null, confirmedAt: '2026-08-18T03:00:00Z', createdAt: '2026-07-01T00:00:00Z' }, now)),
  0,
)
check(
  'skanowana pieć dni temu liczy od skanu, nie od zalozenia',
  Math.round(waitOf({ checkedAt: '2026-08-13T04:00:00Z', createdAt: '2026-07-01T00:00:00Z' }, now)),
  5,
)

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

// Zdanie przy niezmierzonym checku, gdy brzeg odpowiedzial wyzwaniem. Punkty sie nie zmieniaja,
// zmienia sie to, czy mowimy vendorowi prawde: „nic po twojej stronie, przeczekamy" jest falszem w
// obie strony, bo skaner przed sciana z markerem swiadomie NIE ponawia.
console.log('\nniezmierzone przy wyzwaniu mowi, czyje to drzwi')
const docsCheck = CHECKS.find((one) => one.id === 'docs_without_js')!
const turnedAway = (limits: { url: string; challenge: boolean }[]) =>
  docsCheck.evaluate({
    site: 'https://split.io',
    discovered: { docs: null },
    machine: { markdownNegotiation: { docsStatus: 429 } },
    limitsMet: limits.map((one) => ({ ...one, recovered: false })),
  } as never)
// Ten check pytal o SAM adres serwisu, wiec tylko wyzwanie na tym hoscie tlumaczy jego odmowe.
const wall = turnedAway([
  { url: 'https://split.io/', challenge: true },
  { url: 'https://split.io/sitemap.xml', challenge: true },
])
const burst = turnedAway([{ url: 'https://split.io/', challenge: false }])
// Wyzwanie na innym hoscie tego samego vendora to inne drzwi. Zdanie o nim tlumaczyloby odmowe,
// ktorej nie dotyczy - i to jest ten rodzaj falszu, ktory publikujemy pod cudza nazwa.
const elsewhere = turnedAway([{ url: 'https://dashboard.split.io/', challenge: true }])
check('przy wyzwaniu wiersz nazywa hosta', wall.detail.includes('split.io answered 2 of the 2 requests it refused'), true)
check('i mowi, ze to nie minie', wall.detail.includes('not a burst that passes'), true)
check('a rade kieruje do vendora', wall.unblock?.startsWith('Let plain HTTP clients'), true)
check('bez markera zostaje stare zdanie', burst.unblock, 'Nothing for you to do if this was a burst. We rescan later and this becomes measurable.')
check('wyzwanie za innymi drzwiami nie tlumaczy tych', elsewhere.unblock, burst.unblock)
check('wyzwanie nadal nie zabiera punktu', wall.points, burst.points)
check('i nadal jest niezmierzone', wall.inconclusive, true)
// Mianownik: limitsMet trzyma same odmowy, wiec 'z naszych 2 zadan' bylby falszem na skanie,
// ktory przeczytal dziesiec stron i dostal dwie odmowy na koniec.
check('mianownik mowi o odmowach, nie o wszystkich zadaniach', wall.detail.includes('of our 2 requests'), false)
// Trzecie miejsce w tym samym wierszu, ktore umie mowic o 429. Na jednym skanie pandadoc.com
// czytalo 'odpowiedzial wyzwaniem' obok 'to nasz wlasny nawal'. Jedno pojecie, jedna odpowiedz.
const machine = CHECKS.find((one) => one.id === 'machine_readable_api')!
const markdownRefused = (challenge: boolean) =>
  machine.evaluate({
    site: 'https://pandadoc.com',
    discovered: { docs: 'https://www.pandadoc.com/docs' },
    machine: {
      markdownNegotiation: { docsStatus: 429, acceptHeader: false, dotMdSuffix: false, answeredAt: null },
      openapi: [],
      openapiOnDocsHost: null,
      openapiDeclared: null,
    },
    funnel: { servesCatchAll: false, catchAll: null },
    limitsMet: [{ url: 'https://www.pandadoc.com/docs', challenge, recovered: false }],
  } as never)
check('markdown przy wyzwaniu mowi to samo, co reszta wiersza', markdownRefused(true).detail.includes('browser challenge'), true)
check('i nie nazywa tego naszym nawalem', markdownRefused(true).detail.includes('our own burst'), false)
check('bez markera zostaje przy naszym nawale', markdownRefused(false).detail.includes('our own burst'), true)

// Czyje to byly drzwi. Limit z rejestru npm jest faktem o naszym ruchu, limit z markerem wyzwania
// na brzegu vendora jest ustaleniem o nim - i te dwa nosza ten sam kod statusu.
console.log('\nlimity na brzegu vendora')
const met = (urls: [string, boolean][]) =>
  ({ limitsMet: urls.map(([url, challenge]) => ({ url, challenge, recovered: false })) }) as never
const npmOnly = met([['https://api.npmjs.org/downloads/point/last-week/bunny', false]])
const theirEdge = met([
  ['https://docs.split.io/reference', true],
  ['https://docs.split.io/sitemap.xml', true],
  ['https://api.npmjs.org/downloads/point/last-week/splitio', false],
])
check('rejestr npm nie liczy sie jako ich brzeg', limitsAtTheirEdge(npmOnly, 'bunny.net').onSite, 0)
check('poddomena vendora tak', limitsAtTheirEdge(theirEdge, 'split.io').onSite, 2)
// Checki podaja tu adres, a nie nazwe hosta, i to wlasnie ta forma musi trafiac.
check('adres tez, bo tak wola checki', limitsAtTheirEdge(theirEdge, 'https://split.io').onSite, 2)
check('takze z www', limitsAtTheirEdge(theirEdge, 'https://www.split.io').onSite, 2)
check('i marker wyzwania jest policzony osobno', limitsAtTheirEdge(theirEdge, 'split.io').challenges, 2)
check('z nazwa hosta, ktory wyzwal', limitsAtTheirEdge(theirEdge, 'split.io').hosts.join(), 'docs.split.io')
// Mianownik zdania musi dotyczyc hostow, ktore w nim nazywamy: limit z innej poddomeny nie moze
// obciazac tej, o ktorej mowimy.
const dwaHosty = met([
  ['https://docs.split.io/reference', true],
  ['https://app.split.io/login', false],
])
check('limit z innej poddomeny nie liczy sie do zdania', limitsAtTheirEdge(dwaHosty, 'split.io').refusedWhereChallenged, 1)
check('choc nadal jest limitem na ich brzegu', limitsAtTheirEdge(dwaHosty, 'split.io').onSite, 2)
check('wiersz bez limitow nie wymysla ich', limitsAtTheirEdge(undefined, 'split.io').onSite, 0)

// Wyzwanie na brzegu vendora liczy sie jako odwrocenie nas od drzwi. Bez tego klient, ktory wlacza
// ochrone przed botami, przesuwa trzy checki w cisze i NIE dostaje od nas maila - a to jest ta
// awaria, ktora strona glowna obiecuje lapac.
console.log('\nwyzwanie na brzegu a mail do klienta')
const zWyzwaniem = { limitsMet: [{ url: 'https://docs.v.test/x', challenge: true, recovered: false }] }
const zLimitem = { limitsMet: [{ url: 'https://docs.v.test/x', challenge: false, recovered: false }] }
// Rejestr npm wyzywa nas regularnie i nie jest niczyim brzegiem. Bez filtra po domenie mail
// szedlby do klienta za cudze drzwi.
const cudzeDrzwi = { limitsMet: [{ url: 'https://api.npmjs.org/downloads/point/last-week/x', challenge: true, recovered: false }] }
check('wyzwanie to odwrocenie od drzwi', turnedAwayAtTheEdge(zWyzwaniem, 'v.test'), true)
check('samo 429 to nasze obciazenie, nie ich sciana', turnedAwayAtTheEdge(zLimitem, 'v.test'), false)
check('wyzwanie u strony trzeciej to nie ich brzeg', turnedAwayAtTheEdge(cudzeDrzwi, 'v.test'), false)
check('bez podanej domeny nie zgadujemy', turnedAwayAtTheEdge(zWyzwaniem), false)
// Sciana, przez ktora przeszlismy, nie jest sciana. Dzis nieosiagalne, bo przed markerem nie
// ponawiamy, ale tryb audytowy z #48 wlasnie takie ponawia.
const przeszlismy = { limitsMet: [{ url: 'https://docs.v.test/x', challenge: true, recovered: true }] }
check('odzyskane wyzwanie nie jest odwroceniem', turnedAwayAtTheEdge(przeszlismy, 'v.test'), false)
const spadek = [{ checkId: 'docs_without_js', label: 'x', from: 'pass', to: 'unmeasured', detail: '', worse: false }] as never
check('spadek w cisze przy wyzwaniu jest wart maila', worthTelling(spadek, turnedAwayAtTheEdge(zWyzwaniem, 'v.test')), true)
check('a przy naszym limicie nie jest', worthTelling(spadek, turnedAwayAtTheEdge(zLimitem, 'v.test')), false)

// Nasz wlasny katalog ARD. Mowimy vendorom, zeby publikowali to, co wystawiaja agentom, wiec
// najtansza rzecza, o ktora mozna sie potknac, jest niepublikowanie tego samemu.
console.log('\nnasz katalog ARD')
// Czytane z trasy, ktora to serwuje, a nie z pliku obok niej: od kiedy katalog jest generowany,
// plik w `public/` bylby kopia, ktora znowu by sie rozjechala - a to jest dokladnie ten blad, ktory
// ta zmiana usuwa.
const katalog = (await (GET_KATALOG() as Response).json()) as {
  host: { identifier: string }
  entries: { identifier: string; url: string; version?: string; representativeQueries?: string[] }[]
}
check('katalog podaje zywa wersje formuly', katalog.entries.some((e) => e.version === FORMULA_VERSION), true)
check('katalog jest o nas', katalog.host.identifier, 'letagentsin.com')
// Bez tego dwie reguly ponizej sa `[].every(...)`, czyli przechodza na pustym katalogu. Straznik,
// ktory przechodzi, bo nie mial czego sprawdzic, jest straznikiem, ktorego nie ma - to ten sam
// ksztalt bledu, co audyt liczacy zero wierszy i konczacy uspokojeniem.
check('katalog nie jest pusty', katalog.entries.length > 0, true)
check('kazdy wpis ma adres na naszej domenie', katalog.entries.every((e) => e.url.startsWith('https://letagentsin.com/')), true)
// Identyfikator zakotwiczony w domenie to caly sens urn:air - bez tego wpis moze twierdzic, ze jest
// czyims zasobem.
check('kazdy identyfikator zakotwiczony w domenie', katalog.entries.every((e) => e.identifier.startsWith('urn:air:letagentsin.com:')), true)
check('robots.txt wskazuje katalog', readFileSync('public/robots.txt', 'utf8').includes('AI-Catalog: https://letagentsin.com/.well-known/ai-catalog.json'), true)

// Dowod wlasnosci domeny dla rejestru MCP. Zly format nie objawia sie niczym poza odmowa
// logowania w momencie publikacji, wiec claim, ktory sami wystawiamy pod adresem, sprawdzamy tutaj.
console.log('\ndowod domeny dla rejestru MCP')
const DOWOD_MCP = /^v=MCPv1; k=ed25519; p=[A-Za-z0-9+/]{43}=$/
check('plik ma format v=MCPv1', DOWOD_MCP.test(readFileSync('public/.well-known/mcp-registry-auth', 'utf8').trim()), true)
check('kontrola: sam klucz bez naglowka odpada', DOWOD_MCP.test('p=dxvT0jHk9iEnguAEfhDL+/7vu0EEHeJ6A0Y1MBktzag='), false)
const serwerMcp = JSON.parse(readFileSync('server.json', 'utf8')) as { name: string; description: string; remotes: { url: string }[] }
check('przestrzen nazw zgodna z domena', serwerMcp.name.startsWith('com.letagentsin/'), true)
// Tak samo tutaj: pusta lista `remotes` przepuscilaby regule ponizej bez jednego sprawdzenia.
check('wpis ma choc jeden adres', serwerMcp.remotes.length > 0, true)
check('wpis wskazuje nasz wlasny endpoint', serwerMcp.remotes.every((r) => r.url.startsWith('https://letagentsin.com/')), true)
// Rejestr odrzuca opis dluzszy niz 100 znakow calym 422 i mowi to dopiero przy publikacji, a opis
// jest dla agenta tym, czym tytul strony dla czlowieka. Pierwsza proba publikacji poszla w kosz
// wlasnie na tym.
check('opis miesci sie w limicie rejestru', serwerMcp.description.length <= 100, true)

// Karta A2A jest deskryptorem, wiec liczy sie jak mcp.json: punkt za istnienie, nie dwa za
// procedure. Standard AgentReady stawia ja jako MUST, a my mowilismy tigrisdata.com, ze nie ma
// zadnego wejscia dla agenta, gdy serwuje dokladnie ten plik.
console.log('\nkarta A2A w sciezkach wejscia')
check('pytamy o nia', AGENT_ENTRY_PATHS.includes('/.well-known/agent-card.json'), true)
check('liczba sciezek zgadza sie z lista', AGENT_ENTRY_PATH_COUNT, AGENT_ENTRY_PATHS.length)

// Brak llms.txt nazywa adresy, ktore pytalismy. „4 locations probed" nie da sie powtorzyc, a dwa
// z tych adresow sa na hoscie dokumentacji i jeden pod jej sciezka - nikt ich nie zgadnie.
console.log('\nbrak llms.txt: co nazywamy')
const brakLlms = (probed: string[] | undefined) =>
  CHECKS.find((one) => one.id === 'llms_txt')!.evaluate({
    machine: { llms: { root_llms_txt: { present: false }, docs_origin_llms_txt: { present: false } }, llmsProbed: probed, llmsLinks: null },
    blocksPlainRequests: false,
    readAnything: true,
  } as never).detail
check(
  'nazywamy adresy',
  brakLlms(['https://v.test/llms.txt', 'https://docs.v.test/llms.txt']),
  'No llms.txt at any of the 2 locations probed: https://v.test/llms.txt, https://docs.v.test/llms.txt',
)
check('stary wiersz bez zapisu mowi po staremu', brakLlms(undefined), 'No llms.txt at any of the 2 locations probed')
// Trzy etykiety moga wskazywac ten sam adres, gdy dokumentacja siedzi na docs.<domena>. Policzone
// osobno robilyby ze zdania obietnice dokladnosci, ktorej nie ma.
check(
  'ten sam adres liczy sie raz',
  brakLlms(['https://docs.v.test/llms.txt', 'https://docs.v.test/llms.txt', 'https://v.test/llms.txt']).includes('3 locations'),
  false,
)

// Zdanie o braku linku do rejestracji nazywa strony, ktore NAPRAWDE przeszukalismy. Cennik
// znaleziony przez zgadniecie sciezki jest w discovered.pricing, a nigdy nie byl czytany pod katem
// linkow - nazwanie go byloby twierdzeniem o dokumencie, ktorego nikt nie otworzyl.
console.log('\nbrak linku do rejestracji: co nazywamy')
const bezLinku = (searched: string[] | undefined) =>
  CHECKS.find((one) => one.id === 'signup_reachable')!.evaluate({
    site: 'https://v.test',
    funnel: { signup: { url: null } },
    discovered: { pricing: 'https://v.test/pricing', signupSearched: searched },
    blocksPlainRequests: false,
  } as never).detail
check(
  'nazywamy przeszukane strony',
  bezLinku(['https://v.test', 'https://docs.v.test']).includes('served HTML of https://v.test, https://docs.v.test'),
  true,
)
// Sama lista przeszukanych stron, a nie cale zdanie: cennik pojawia sie w nim slusznie, w klauzuli
// „publikujesz ceny". Sprawdzenie calego zdania przechodzilo wiec na wszystkim.
const przeszukane = (searched: string[] | undefined) =>
  bezLinku(searched).match(/served HTML of (.+?), while/)?.[1] ?? ''
check('lista nie zawiera cennika, ktorego nie czytalismy', przeszukane(['https://v.test']), 'https://v.test')
check('a zawiera to, co czytalismy', przeszukane(['https://v.test', 'https://v.test/pricing']), 'https://v.test, https://v.test/pricing')
check('ale nadal mowimy, ze publikuja ceny', bezLinku(['https://v.test']).includes('while you publish prices at https://v.test/pricing'), true)
check('stary wiersz bez zapisu mowi po staremu', bezLinku(undefined).includes('the pages we read'), true)

// Odczekanie po 429. Regula projektu mowi, ze 429 to nasze obciazenie, a nie odpowiedz o
// vendorze - wiec odpowiedzia jest odczekac i zapytac jeszcze raz, w granicach budzetu skanu.
console.log('\nodczekanie po 429')
const limited = (status: number, headers: Record<string, string> = {}) =>
  ({ url: 'https://split.io/docs/keys', status, ok: false, body: '', headers, truncated: false }) as const
check('429 bez naglowka czeka domyslne 1,2 s', backoffFor(limited(429), 0, 27_000), 1_200)
check('a gdy prosi o 10 s, czekamy najwyzej 3', backoffFor(limited(429, { 'retry-after': '10' }), 0, 27_000), 3_000)
check('sciana vendora nie jest naszym obciazeniem', backoffFor(limited(429, { 'x-vercel-mitigated': 'challenge' }), 0, 27_000), null)
check('403 to odpowiedz, nie limit', backoffFor(limited(403), 0, 27_000), null)
check('trzeci raz na tej samej stronie juz nie', backoffFor(limited(429), 2, 27_000), null)
// Odpowiedz zbiorcza rejestru: null to paczka bez pobran, brak klucza to brak odpowiedzi.
console.log('\nzbiorcze pobrania z rejestru')
const bulk = readBulkDownloads('{"react":{"downloads":115},"nikt-tego-nie-ma":null}', [
  'react',
  'nikt-tego-nie-ma',
  'o-ktora-nie-pytano',
  'constructor',
])
check('policzona paczka ma swoja liczbe', bulk.get('react'), 115)
check('null to paczka bez pobran', bulk.get('nikt-tego-nie-ma'), 0)
check('brak klucza to brak odpowiedzi, nie zero', bulk.get('o-ktora-nie-pytano'), null)
// constructor to prawdziwa paczka na npm, a `in` znalazlby ja na prototypie.
check('nazwa z prototypu tez jest brakiem odpowiedzi', bulk.get('constructor'), null)
check('zepsuta odpowiedz to brak odpowiedzi dla wszystkich', readBulkDownloads('nie-json', ['a', 'b']).get('a'), null)

// Rejestr dostaje wiecej prob niz cudzy brzeg: jego odmowa konczy sie zdaniem o CUDZYM wierszu
// ('nie umiemy wskazac paczki'), a nasza uprzejmosc wobec npm nie kosztuje nikogo poza nami.
const registry = (status: number) =>
  ({ url: 'https://api.npmjs.org/downloads/point/last-week/react', status, ok: false, headers: {}, body: '', truncated: false }) as const
check('rejestr ponawiamy takze za trzecim razem', backoffFor(registry(429), 2, 27_000), 1_200)
check('ale nie w nieskonczonosc', backoffFor(registry(429), 6, 27_000), null)
check('nie czekamy w deadline', backoffFor(limited(429), 0, 5_000), null)
check('ale czekamy, gdy czas jeszcze jest', backoffFor(limited(429), 0, 7_500), 1_200)
// Retry-After w formie daty: odczytane przez Number() daje NaN, czyli po cichu domyslne 1,2 s.
const zaDziesiecSekund = new Date(Date.now() + 10_000).toUTCString()
check('data w Retry-After tez jest prosba, wiec obcinamy do 3 s', backoffFor(limited(429, { 'retry-after': zaDziesiecSekund }), 0, 27_000), 3_000)
check('data, ktora juz minela, wraca do domyslnego czekania', backoffFor(limited(429, { 'retry-after': 'Wed, 01 Jan 2020 00:00:00 GMT' }), 0, 27_000), 1_200)
check('bzdura w naglowku tez', backoffFor(limited(429, { 'retry-after': 'zaraz' }), 0, 27_000), 1_200)

// Ranking ksztaltu nazwy. Awans paczki `@vendor/sdk` do rangi golej nazwy zostal ZMIERZONY I
// WYCOFANY (#47): naprawial directus, sanity i configcat, a psul netlify.com. Straznik pilnuje
// stanu, ktory zostaje, zeby nikt nie wprowadzil tego z powrotem bez ponownego pomiaru.
console.log('\nranking nazw paczek')
check('gola nazwa vendora ma najlepsza range', shapeRankOf('directus', 'directus.com'), 0)
check('a SDK w ich scope nie awansuje sam z nazwy', shapeRankOf('@directus/sdk', 'directus.com') === 0, false)
check('choc nadal jest paczka wejsciowa', looksLikeEntryPackage('@directus/sdk', 'directus.com'), true)

// Kontrolka, ktora NIE ODPOWIEDZIALA, nie moze przyznawac punktu. Zmierzone 2026-08-19: trzy
// vendorzy trzymali punkt za plik, ktory jest strona 404 ich hosta, bo kontrolka na catch-all nie
// zdazyla w budzecie 27 sekund, a jej brak czytal sie jako „nie ma catch-alla".
console.log('\nniepewny plik wejsciowy nie placi')
const wejscie = CHECKS.find((one) => one.id === 'agent_entry_point')!
const zNiepewnym = (found: string[], uncertain: string[], procedure: string[] = found) =>
  wejscie.evaluate({
    site: 'https://x.test',
    funnel: {
      entryPointsFound: found,
      entryPointsUncertain: uncertain,
      entryPointsWithProcedure: procedure,
      entryPaths: {},
      entryPathsRefused: 0,
      entryProbesAsked: 9,
      entrySiteRefused: 0,
      catchAll: {},
    },
  } as never)
check('jedyny plik niepewny daje niemierzalne', zNiepewnym(['/skill.md'], ['/skill.md']).inconclusive, true)
check('i nie daje punktow', zNiepewnym(['/skill.md'], ['/skill.md']).points, 0)
// Kontrolka: ten sam plik z odpowiedziala kontrolka nadal placi.
check('plik pewny placi dalej', zNiepewnym(['/skill.md'], []).points, 2)
// I najwazniejsze: niepewny obok pewnego wypada pojedynczo, a nie caly warunek.
check('niepewny obok pewnego nie placi', zNiepewnym(['/skill.md', '/agents.md'], ['/skill.md'], ['/skill.md', '/agents.md']).detail.includes('/skill.md'), false)
// Ostatnia sciezka: pewny jest tylko deskryptor, a niepewny plik markdown stoi obok. Punkt nalezy
// sie za deskryptor, ale zdanie nie moze wymieniac pliku, za ktory wlasnie odmowilismy zaplaty.
// Kontrolka wiarygodna to taka, ktora odpowiedziala O SCIEZCE, a nie o nas. 429 trzeba nazwac
// osobno, bo `isEdgeRefusal` celowo go wyklucza: naszą wlasna regula mowi, ze 429 to nasze
// obciazenie, a nie sciana vendora. To jest sluszne w werdykcie o vendorze i bledne tutaj.
console.log('\nkontrolka odmowna nie jest kontrolka')
check('404 jest odpowiedzia', isEdgeRefusal(404), false)
check('403 nie jest', isEdgeRefusal(403), true)
check('a 429 wypada z isEdgeRefusal, wiec musi byc nazwany osobno', isEdgeRefusal(429), false)
// Definicja przeniesiona do `http.ts`, bo o to samo pyta teraz takze selekcja zgadywanych sciezek.
const httpSource = readFileSync('src/lib/scan/http.ts', 'utf8')
check('i jest nazwany', httpSource.includes("got.status !== 429 && !isEdgeRefusal(got.status)"), true)

// Ta sama regula o warstwe dalej: przy MCP `got.status !== control?.status` jest PRAWDA, gdy
// kontrolka w ogole nie odpowiedziala (status 0), wiec host odmawiajacy 401 pod kazdym adresem
// dostawal punkt za serwer na podstawie zapytania, ktore sie nie odbylo.
console.log('\nmilczaca kontrolka nie przyznaje serwera MCP')
const mcp = CHECKS.find((one) => one.id === 'mcp_present')!
const zBrakiemKontrolki = (adresy: string[]) =>
  mcp.evaluate({
    site: 'https://x.test',
    funnel: {
      mcpEndpoints: [],
      mcpProbed: true,
      mcpCardNamed: [],
      mcpPagesFollowed: [],
      mcpPostsSwallowed: false,
      mcpUnmeasuredForWantOfAControl: adresy,
      mcpMentions: 0,
    },
    machine: { wellKnown: {}, mcp: { mentions: 0, mentionsTruncated: false } },
  } as never)
check('adres bez kontrolki daje niemierzalne', zBrakiemKontrolki(['https://mcp.x.test/mcp']).inconclusive, true)
check('i zdanie nazywa ten adres', zBrakiemKontrolki(['https://mcp.x.test/mcp']).detail.includes('https://mcp.x.test/mcp'), true)
// Kontrolka: bez takich adresow check idzie swoja zwykla droga i NIE jest niemierzalny z tego powodu.
check('bez takich adresow to nie ta galaz', zBrakiemKontrolki([]).detail.includes('never came back'), false)
// Na tej liscie leza teraz trzy ksztalty czytane przez DWIE rozne kontrolki: sciezke, ktorej nikt
// nie zarejestrowal (401/403/202) i strone glowna (405). Zdanie musi nazwac obie, bo vendor ma je
// powtorzyc, a nie zgadnac, o co zapytalismy.
check(
  'zdanie nazywa obie kontrolki',
  zBrakiemKontrolki(['https://mcp.x.test/mcp']).detail.includes('a path nobody registered on that origin, or your front page'),
  true,
)
check('straznik widzi warunek w kodzie', readFileSync('src/lib/scan/funnel.ts', 'utf8').includes('unmeasuredForWantOfAControl.push'), true)

// Druga fala pyta o adresy, ktore wskazala ICH strona dokumentacji. Gdy zadna fala nie znalazla
// serwera, jej "nie dalo sie zmierzyc" bylo wyrzucane razem z reszta jej wyniku, wiec check
// publikowal pewne "nie maja serwera" na podstawie pytania, na ktore nie dostalismy odpowiedzi.
console.log('\ndruga fala oddaje to, czego nie zmierzyla')
const fala = (endpoints: { url: string }[], niezmierzone: string[]): McpProbe =>
  ({ endpoints, answered: true, registryAnswered: true, cardNamed: [], swallowsPosts: false, unmeasuredForWantOfAControl: niezmierzone }) as unknown as McpProbe
const pusta = fala([], ['https://a.test/mcp'])
check('niezmierzony adres drugiej fali przezywa', mcpAcrossWaves(pusta, fala([], ['https://b.test/mcp'])).unmeasuredForWantOfAControl.includes('https://b.test/mcp'), true)
check('i pierwsza fala go nie traci', mcpAcrossWaves(pusta, fala([], ['https://b.test/mcp'])).unmeasuredForWantOfAControl.includes('https://a.test/mcp'), true)
check('ten sam adres liczy sie raz', mcpAcrossWaves(pusta, fala([], ['https://a.test/mcp'])).unmeasuredForWantOfAControl.length, 1)
// Kontrolka: gdy druga fala ZNALAZLA serwer, pytanie jest rozstrzygniete i nie ma czego zglaszac.
check('znaleziony serwer konczy temat', mcpAcrossWaves(pusta, fala([{ url: 'https://b.test/mcp' }], ['https://b.test/mcp'])).unmeasuredForWantOfAControl, pusta.unmeasuredForWantOfAControl)
check('i to jego endpoint idzie dalej', mcpAcrossWaves(pusta, fala([{ url: 'https://b.test/mcp' }], [])).endpoints.length, 1)
// Kontrolka: bez drugiej fali wynik pierwszej przechodzi nietkniety.
check('brak drugiej fali nic nie zmienia', mcpAcrossWaves(pusta, null), pusta)

// Znak firmowy lezy w dwoch miejscach, bo katalog konektorow chce pliku pod publicznym adresem,
// a przegladarka chce go z app/. Dwie kopie jednego rysunku rozjezdzaja sie dokladnie wtedy, gdy
// ktos poprawi jedna.
// Klasa Tailwinda nazywajaca token, ktorego nie ma, nie robi NIC i nie mowi o tym ani slowa.
// `text-ink-inverse` siedzialo na przycisku formularza monitoringu i przez to napis dziedziczyl
// zwykly kolor tekstu: kontrast 1.98 w ciemnym motywie i 2.89 w jasnym, czyli oblane WCAG AA po
// obu stronach. Znalezione 2026-08-19 przez lokalny Lighthouse, gdy PageSpeed nie chcial ruszyc.
console.log('\nkazda klasa koloru nazywa token, ktory istnieje')
const style = readFileSync('src/app/globals.css', 'utf8')
const tokens = new Set([...style.matchAll(/--color-([\w-]+)\s*:/g)].map((one) => one[1]))
const uzyte = new Set<string>()
const przejrzyj = (dir: string) => {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const path = `${dir}/${name.name}`
    if (name.isDirectory()) przejrzyj(path)
    else if (path.endsWith('.tsx')) {
      for (const found of readFileSync(path, 'utf8').matchAll(/\b(?:text|bg|border|fill|stroke|ring|from|to|via)-([a-z]+(?:-[a-z]+)*)\b/g)) {
        uzyte.add(found[1])
      }
    }
  }
}
przejrzyj('src')
// Tailwind ma wlasne nazwy, ktorych nie definiujemy: te przepuszczamy z imienia, zeby straznik
// mowil o naszych tokenach, a nie o calej palecie frameworka.
const WBUDOWANE = new Set(['transparent', 'current', 'inherit', 'white', 'black', 'none', 'auto', 'left', 'right', 'center', 'top', 'bottom', 'balance', 'pretty', 'wrap', 'nowrap', 'clip', 'ellipsis', 'sm', 'base', 'lg', 'xl', 'xs', 'start', 'end', 'justify'])
const nasze = [...uzyte].filter((one) => one.startsWith('ink') || one.startsWith('brass') || one.startsWith('ground') || one.startsWith('surface') || one.startsWith('sunken') || one.startsWith('rule') || one.startsWith('pass') || one.startsWith('warn') || one.startsWith('fail'))
const sieroty = nasze.filter((one) => !tokens.has(one) && !WBUDOWANE.has(one))
check('zadna klasa nie nazywa nieistniejacego tokenu', sieroty.join(', '), '')
// Kontrolka: sonda naprawde czyta tokeny i naprawde widzi klasy.
check('sonda zna nasze tokeny', tokens.has('brass') && tokens.has('ground'), true)
check('i widzi uzyte klasy', nasze.length > 5, true)

// Runbook sporu mowi, ze KAZDA strona niesie `mailto:` z tematem, wiec korekta „w koncu dojdzie".
// Strona, za ktora klient zaplacil, byla jedyna bez tematu - czyli jego mail najtrudniej
// posortowac ze wszystkich.
// `handling-a-dispute.md` mowi: „Import the scanner's predicates, never rewrite them". Szesc
// audytow pytalo jako `LetAgentsIn/1.0 (+.../methodology)`, a skaner pyta jako `(+.../bot)` - czyli
// jako INNY agent niz ten, ktorego zachowanie sprawdzaly, i bez naglowka `From`. To ta sama rodzina
// bledu, ktora tej nocy dala falszywy alarm o sentry.io.
// Audyt, ktory konczy licznikiem przeczytanych wierszy, musi odmowic werdyktu przy zerze. Inaczej
// uspokaja tym glosniej, im mniej zmierzyl - a `audit-llms` czyta liste z WEJSCIA, wiec pusty
// potok jest zupelnie cichy: sam na to wpadlem, uruchamiajac go bez potoku.
console.log('\naudyt z licznikiem odmawia werdyktu przy zerze')
const zLicznikiem = readdirSync('scripts')
  .filter((name) => name.startsWith('audit-') && name.endsWith('.mts'))
  .filter((name) => {
    const source = readFileSync(`scripts/${name}`, 'utf8')
    return /^let checked = 0$/m.test(source) || /process\.stdin/.test(source)
  })
const bezBramki = zLicznikiem.filter((name) => !readFileSync(`scripts/${name}`, 'utf8').includes('refuseIfNothingMeasured'))
check('zaden audyt z licznikiem nie milczy o zerze', bezBramki.join(', '), '')
// Kontrolka: sonda naprawde znajduje te audyty, a nie pusta liste.
check('sonda widzi audyty z licznikiem', zLicznikiem.length > 5, true)

// Runbook dostawy kaze puscic bramki przed wyslaniem platnego dokumentu i wymienia je z nazwy.
// Wymieniona bramka, ktorej nie ma w package.json, to instrukcja, ktora cicho nie dziala.
// `/bot` obiecuje, ze anonimowe zapytanie nie przepisze tego, co strona mowi o firmie. Strona
// vendora jest jedyna INDEKSOWALNA, ktora moglaby to zlamac: wiersz korpusu bez zasianego pomiaru
// spadal na „jakikolwiek", czyli na to, co ostatnio przeskanowal odwiedzajacy.
// Metodologia jest naszym jedynym produktem, ktory kupujacy moze odtworzyc sam, wiec zdanie
// opisujace regule, ktorej kod juz nie wykonuje, jest gorsze niz brak zdania. Akapit o kontrolce
// opisywal wygaszanie CALEJ przestrzeni nazw, ktore zniklo, i nie mowil o galezi „nie da sie
// zmierzyc" z 9.43. Straznik wiaze tekst z zachowaniem, ktore ma opisywac.
// Sonda drzwiowa pyta trzy razy, ale przerywa, gdy konczy sie budzet skanu - a zdanie w wierszu
// mialo slowo „three" na sztywno. „across three tries (200, 403)" nazywa zapytanie, ktorego nie
// wyslalismy, w wierszu publikowanym pod cudza nazwa.
// Wiersz mowi „across the 3 documentation pages and 3 machine-readable files we read" i zapisywal
// tylko ADRESY STRON, a plikow juz nie. Pierwsze pytanie vendora w sporze brzmi „ktore dokumenty
// przeczytaliscie?", i nie dalo sie na nie odpowiedziec z wiersza. Sam sie o to potknalem,
// probujac odtworzyc wlasny odczyt przed przemiatem na 9.45.
// Lekarstwem na ten check jest „napraw te linki", a zdanie nazywalo JEDEN z dwoch i kazalo vendorowi
// odtworzyc nasza probke, zeby poznac reszte. Adresy mamy wszystkie, wiec je wypisujemy.
console.log('\nzdanie o martwych linkach nazywa je wszystkie')
const checkLlms = CHECKS.find((one) => one.id === 'llms_txt')!
const zLinkami = (dead: number, deadUrls: string[] | undefined) =>
  checkLlms.evaluate({
    machine: {
      wellKnown: {},
      hasLlmsTxt: true,
      llms: { 'llms.txt': { present: true, url: 'https://x.test/llms.txt' } },
      llmsUrls: ['https://x.test/llms.txt'],
      llmsLinks: { sampled: 12, dead, firstDead: deadUrls?.[0] ?? null, deadUrls, files: 1 },
      mcp: { mentions: 0, mentionsTruncated: false },
    },
    funnel: { catchAll: {}, servesCatchAll: false },
  } as never).detail
check('wypisuje oba martwe adresy', zLinkami(2, ['https://x.test/a', 'https://x.test/b']).includes('https://x.test/b'), true)
check('i nie mowi juz "starting with"', zLinkami(2, ['https://x.test/a', 'https://x.test/b']).includes('starting with'), false)
// Kontrolka: przy wielu martwych zdanie nie rosnie bez konca, tylko liczy reszte.
check('przy szesciu wypisuje cztery i liczy reszte', zLinkami(6, ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'].map((x) => `https://x.test/${x}`)).includes('and 2 more'), true)
// Kontrolka: stary wiersz bez listy nadal nazywa ten jeden adres, ktory ma.
check('stary wiersz nadal nazywa firstDead', zLinkami(2, undefined).includes('https://x.test/a') === false, true)

// Ten sam argument o checku obok: „te linie Allow nie prowadza nigdzie" to cale lekarstwo, a
// zdanie nazywalo jeden adres z kilku, ktore mamy w tablicy.
const robotsAllow = CHECKS.find((one) => one.id === 'robots_paths_resolve')!
const zMartwymi = (dead: string[]) =>
  robotsAllow.evaluate({
    robots: { present: true, unreadable: false, allowPaths: { checked: 3, dead, unanswered: [] } },
  } as never).detail
check('wypisuje wszystkie martwe sciezki', zMartwymi(['/a', '/b']).includes('/b'), true)
check('i nie mowi juz "starting with"', zMartwymi(['/a', '/b']).includes('starting with'), false)
check('jedna martwa nadal brzmi po staremu', zMartwymi(['/a']).includes('/a'), true)

console.log('\nwiersz pamieta, ktore dokumenty przeczytal, a nie tylko ile')
const skan = readFileSync('src/lib/scan/index.ts', 'utf8')
check('zapisujemy adresy stron', skan.includes('docsPagesReadUrls: documentsRead'), true)
check('i adresy plikow maszynowych', skan.includes('machineFilesReadUrls: machine.llmsUrls'), true)
// Kontrolka: licznik nadal pochodzi z tej samej listy, wiec nie moga sie rozjechac.
check('licznik liczy te sama liste', skan.includes('machineFilesRead: machine.llmsUrls.length'), true)

console.log('\nliczba prob w zdaniu pochodzi z listy, nie ze slowa')
const punktacja = readFileSync('src/lib/score.ts', 'utf8')
check('zdanie liczy proby z tablicy', punktacja.includes('across ${f.agentStatusesSeen.length} tries'), true)
check('i nie ma juz sztywnego "three tries"', punktacja.includes('across three tries'), false)
check('metodologia mowi "up to three"', readFileSync('src/app/methodology/page.tsx', 'utf8').includes('up to three times'), true)
// Kontrolka: kod naprawde potrafi przerwac wczesniej, wiec zastrzezenie nie jest ozdoba.
check('sonda umie przerwac przed trzecia proba', readFileSync('src/lib/scan/http.ts', 'utf8').includes('if (timeLeftMs() < 1_500) break'), true)

console.log('\nmetodologia opisuje kontrolke, ktora naprawde mamy')
const metodologia = readFileSync('src/app/methodology/page.tsx', 'utf8')
const sondaWejscia = readFileSync('src/lib/scan/funnel.ts', 'utf8')
check('nie obiecuje wygaszania calej przestrzeni nazw', metodologia.includes('every hit in that namespace is suppressed'), false)
check('mowi, ze porownanie jest per plik', metodologia.includes('Per file, not per namespace'), true)
check('i nazywa galaz niemierzalna', metodologia.includes('the check says it could not tell'), true)
// Kontrolka: kod naprawde tak dziala, wiec zdanie opisuje zachowanie, a nie zyczenie.
check('kod liczy niepewne pojedynczo', sondaWejscia.includes('const uncertain = present && controlAnswered === false'), true)
check('kod nie wygasza calej przestrzeni', sondaWejscia.includes('The namespace verdict no longer short-circuits the probe'), true)
// Zdanie o MCP nie moze byc szersze niz kod: uscisk dloni, JSON i wyzwanie OAuth licza sie BEZ
// kontrolki, wiec „brak kontrolki czyni check niemierzalnym" bylo za mocne. Codeksa.
check('mowi, ze uscisk dloni nie potrzebuje kontrolki', metodologia.includes('needs no control and still counts'), true)
check('i ogranicza niemierzalnosc do ksztaltow zaleznych od kontrolki', metodologia.includes('an answer is one only a control can read') || metodologia.includes('the answer is one only a control can read'), true)
check('a kod naprawde tak dziala', sondaWejscia.includes('const unreadableCredentialShape ='), true)

console.log('\nstrona korpusowa nie spada na skan odwiedzajacego')
const stronaVendora = readFileSync('src/app/v/[domain]/page.tsx', 'utf8')
const stronaBota = readFileSync('src/app/bot/page.tsx', 'utf8')
check('obietnica nadal stoi na /bot', stronaBota.includes('nothing a visitor scans joins the corpus we publish'), true)
check('wiersz korpusu czytamy tylko zasiany', stronaVendora.includes('await store.latestForDomain(domain, true)'), true)
check('i nie ma juz zapasowego odczytu', stronaVendora.includes('?? store.latestForDomain(domain)'), false)
// Obietnica ma tez powiedziec, co widzi firma SPOZA korpusu, bo tam faktycznie pokazujemy skan
// odwiedzajacego - tyle ze poza indeksem.
// `/bot` opisuje TO, co robimy, wiec zmiana zachowania musi go ruszyc razem z kodem. Do 2026-08-20
// mowil „its page shows the most recent scan of any kind" - a od wczoraj `/v` nie pokazuje skanu
// goscia w ogole, a od dzis poza korpusem takze nie pokazuje starej formuly.
check('i mowi, co ze stronami spoza korpusu', stronaBota.includes('out of search'), true)
check('i nie obiecuje juz, ze pokazuje skan kogokolwiek', stronaBota.includes('the most recent scan of any kind'), false)
check('tylko nasz wlasny i tylko na biezacej formule', stronaBota.includes('only a scan we ran ourselves, and only while it still'), true)
check('a te strony naprawde sa poza indeksem', stronaVendora.includes("if (!categoryFor(name)) return { title: `${name} · Let Agents In`, robots: { index: false }"), true)

console.log('\nbramki wymienione w runbooku dostawy istnieja')
const runbookBramek = readFileSync('docs/delivering-a-report.md', 'utf8')
const skryptyNpm = JSON.parse(readFileSync('package.json', 'utf8')).scripts as Record<string, string>
const wymienione = [...runbookBramek.matchAll(/npm run (audit-[\w-]+)/g)].map((one) => one[1])
check('runbook wymienia co najmniej dwie bramki', wymienione.length >= 2, true)
check('kazda wymieniona bramka istnieje', wymienione.filter((name) => !(name in skryptyNpm)).join(', '), '')
// Kontrolka: bramka arytmetyki naprawy jest wymieniona, bo to jedyna suma, ktora czyta kupujacy.
check('arytmetyka naprawy jest wsrod nich', wymienione.includes('audit-fix-arithmetic'), true)

console.log('\naudyt pyta jako ten agent, ktorego sprawdza')
const wlasnorecznyUa = readdirSync('scripts')
  .filter((name) => name.endsWith('.mts') && name !== 'rules.mts')
  .filter((name) => /'LetAgentsIn\/[^']*'/.test(readFileSync(`scripts/${name}`, 'utf8')))
check('zaden skrypt nie pisze wlasnego UA skanera', wlasnorecznyUa.join(', '), '')
// Sam UA to za malo: skaner dokłada `From` przy kazdym zapytaniu pod tym user-agentem, wiec audyt
// bez tego naglowka nadal wysyla INNE zapytanie niz to, ktore sprawdza. Codeksa.
// I nie tylko ci, ktorzy JUZ ustawiaja user-agenta: audyt bez zadnego naglowka wysyla domyslna
// tozsamosc Undici, czyli jeszcze innego agenta niz skaner. Regula brzmi wiec: kto pyta obcy
// serwer, pyta jako skaner. Codeksa, na drugiej wersji tego straznika.
// Wyjatki wypisane z imienia i z powodem, bo nie pytaja cudzego serwera o werdykt: cztery czytaja
// NASZ wlasny korpus albo nasze API, jeden zglasza adresy do IndexNow, jeden lustrzy rejestr MCP.
// Nowy audyt pytajacy vendora nie jest tu wymieniony, wiec straznik go zlapie.
const NIE_PYTA_VENDORA = new Set([
  'audit-corpus.mts',
  'audit-our-api.mts',
  'diff-corpus.mts',
  'published-urls.mts',
  'targets.mts',
  'indexnow.mts',
  'mirror-mcp-registry.mts',
])
const nieJakSkaner = readdirSync('scripts')
  .filter((name) => name.endsWith('.mts') && name !== 'rules.mts' && !NIE_PYTA_VENDORA.has(name))
  .filter((name) => {
    const source = readFileSync(`scripts/${name}`, 'utf8')
    if (!/\bfetch\(/.test(source)) return false
    return !/'user-agent': (AGENT_UA|UA)\b/.test(source) || !source.includes('from: CONTACT')
  })
check('kto pyta obcy serwer, pyta jako skaner', nieJakSkaner.join(', '), '')
// I w KAZDEJ galezi, nie tylko w jednej: `headers: warunek ? {...} : {...}` przepuszczalo sonde
// bez tozsamosci przez druga polowe wyrazenia. Straznik na plik tego nie widzi, wiec patrzy tu na
// ksztalt: zaden obiekt naglowkow nie moze zaczynac sie od `accept` bez user-agenta.
// Tylko obiekty, w ktorych USTAWIAMY `accept`, czyli naglowki zapytania. Adnotacja typu
// (`const headers: Record<string, string> = {}`) i atrapa odpowiedzi w tescie (`headers:
// { 'content-type': ... }`) to nie sa zapytania i nie maja czego wysylac.
const gubiTozsamosc = (source: string) =>
  [...source.matchAll(/headers:[^\n]*/g)].some((line) =>
    [...line[0].matchAll(/\{[^{}]*\}/g)].some((object) => object[0].includes('accept') && !object[0].includes('user-agent')),
  )
const galazBezTozsamosci = readdirSync('scripts')
  .filter((name) => name.endsWith('.mts') && name !== 'rules.mts' && !NIE_PYTA_VENDORA.has(name))
  .filter((name) => gubiTozsamosc(readFileSync(`scripts/${name}`, 'utf8')))
check('zadna galaz naglowkow nie gubi tozsamosci', galazBezTozsamosci.join(', '), '')
// Kontrolka: sonda widzi galaz bez tozsamosci i nie myli jej z obiektem, w ktorym accept jest pierwszy.
check('sonda widzi galaz bez user-agenta', gubiTozsamosc("headers: useAccept ? { 'user-agent': A } : { accept: '*/*' },"), true)
check('kolejnosc pol nie ma znaczenia', gubiTozsamosc("headers: { accept: 'x', 'user-agent': A, from: C },"), false)
check('adnotacja typu to nie zapytanie', gubiTozsamosc('const headers: Record<string, string> = {}'), false)
check('atrapa odpowiedzi to nie zapytanie', gubiTozsamosc("headers: { 'content-type': 'text/html' }"), false)
// Kontrolka: sonda widzi literal, gdy jest, i nie myli go z importem.
check('sonda widzi literal', /'LetAgentsIn\/[^']*'/.test("const UA = 'LetAgentsIn/1.0 (+x)'"), true)
check('i nie lapie importu', /'LetAgentsIn\/[^']*'/.test('const UA = AGENT_UA'), false)

console.log('\nspor da sie zglosic z kazdej strony, ktora niesie werdykt')
for (const [gdzie, plik] of [
  ['strona vendora', 'src/app/v/[domain]/page.tsx'],
  ['platny raport', 'src/app/d/[id]/page.tsx'],
] as const) {
  const zrodlo = readFileSync(plik, 'utf8')
  check(`${gdzie}: adres z tematem`, zrodlo.includes('subject=${encodeURIComponent(`Wrong verdict on'), true)
}
// Kontrolka: runbook nadal obiecuje to, czego pilnujemy.
check('runbook nadal to obiecuje', readFileSync('docs/handling-a-dispute.md', 'utf8').includes('Wrong verdict on'), true)

console.log('\njeden znak, nie dwa rysunki')
check(
  'logo w public i ikona w app to ten sam plik',
  readFileSync('public/logo.svg', 'utf8') === readFileSync('src/app/icon.svg', 'utf8'),
  true,
)

check(
  'przy samym deskryptorze zdanie nie wymienia niepewnego pliku',
  zNiepewnym(['/.well-known/mcp.json', '/skill.md'], ['/skill.md'], []).detail.includes('/skill.md'),
  false,
)

// #47 ROZWIAZANY INACZEJ (2026-08-19): nie przez przesuwanie nazw miedzy rangami, tylko przez
// dopuszczenie SLOW paczki do glosu. Zmierzone na calym korpusie przez dwa replaye na jednej
// migawce i jednym cache rejestru: TRZY zmiany, zero regresji.
//   directus.com   directus ("real-time API and App dashboard") -> @directus/sdk ("Directus JavaScript SDK")
//   onesignal.com  onesignal-ngx (wrapper Angulara) -> @onesignal/node-onesignal
//   axiom.co       axiom (SDK do instrumentacji AI) -> @axiomhq/js ("official javascript bindings")
// mux.com sie NIE zmienil, bo @mux/mux-node samo mowi, ze jest biblioteka: to ten sam ksztalt bledu
// co netlify przy poprzedniej probie i jest teraz zablokowany wprost.
check('SDK w opisie i nazwa vendora to biblioteka', readsAsTheirLibrary('@directus/sdk', 'Directus JavaScript SDK', 'directus.com'), true)
check('oficjalna biblioteka tez', readsAsTheirLibrary('@mux/mux-node', 'The official TypeScript library for the Mux API', 'mux.com'), true)
// Serwer, ktory opisuje sam siebie, nie jest biblioteka, nawet gdy nosi gola nazwe vendora.
check('serwer nie jest biblioteka', readsAsTheirLibrary('directus', 'Directus is a real-time API and App dashboard for managing SQL database content', 'directus.com'), false)
// Wrapper frameworka nie mowi o sobie „SDK" ani „client", wiec nie chroni sie tym przed wyzwaniem.
check('wrapper Angulara nie jest biblioteka', readsAsTheirLibrary('onesignal-ngx', 'This is a JavaScript module that can be used to easily include OneSignal code in a website or app that uses Angular for its front-end codebase.', 'onesignal.com'), false)
// Kontrolka, ktora ma najwieksze znaczenie: samo slowo „client" bez nazwy vendora nie znaczy nic o
// TYM vendorze, bo inaczej kazda cudza paczka z tym slowem awansowalaby na jego biblioteke.
check('kontrola: slowo bez nazwy vendora nie wystarcza', readsAsTheirLibrary('some-client', 'A tiny HTTP client library', 'directus.com'), false)

// gandi.net byl publikowany na `@gandi-ide/gandi-ui`: opis „gandi 组件库", wydawca z prywatnego
// adresu, ZERO linkow poza rejestrem. To Gandi IDE, inna firma; z francuskim rejestratorem domen
// laczy je tylko to, ze `gandiide` zaczyna sie od `gandi`. Dwa slabe sygnaly razem sa nadal slabe.
console.log('\nwlasnosc paczki: scope, ktory tylko zaczyna sie od nazwy')
check(
  'scope-prefiks bez zadnego linku to nie ich paczka',
  readsAsOwnedBy('@gandi-ide/gandi-ui', 'gandi 组件库', [], 'gandi.net'),
  'none',
)
// Kontrolka, ktora chroni prawdziwy przypadek: @axiomhq tez jest prefiksem, ale pokazuje repozytorium.
check(
  'ten sam prefiks z repozytorium juz tak',
  readsAsOwnedBy('@axiomhq/js', 'The official javascript bindings for the Axiom API', ['https://github.com/axiomhq/axiom-js'], 'axiom.co') !== 'none',
  true,
)
// I kontrolka od drugiej strony: scope, ktory JEST nazwa vendora, nie potrzebuje linku.
check(
  'scope rowny nazwie vendora nie potrzebuje linku',
  readsAsOwnedBy('@directus/sdk', 'Directus JavaScript SDK', [], 'directus.com') !== 'none',
  true,
)

// Runbook dostawy mowi platnikowi, co dostaje za 79 USD miesiecznie. Liczba checkow byla tam
// wpisana z reki i zostala na 15, gdy checkow bylo juz 16.
check(
  'runbook dostawy zna prawdziwa liczbe checkow',
  readFileSync('docs/delivering-a-report.md', 'utf8').includes(`The ${CHECKS.length} checks rerun weekly`),
  true,
)

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

// Polityka serii na /methodology opisuje, co robi cron: przelicza stary pomiar dzisiejsza formula
// i wyrzuca checki, ktorych regula sie ruszyla. Zdanie na stronie jest prawda tylko dopoki obie te
// rzeczy sa w kodzie, a strona nie ma jak zauwazyc, ze ktos je stamtad wyjal.
console.log('\npolityka serii opisuje to, co cron naprawde robi')
const cronWatch = readFileSync('src/app/api/cron/watch/route.ts', 'utf8')
check('cron porownuje karty tej samej formuly', cronWatch.includes('comparableScorecards(previous.scorecard, report.scorecard)'), true)
check('a przy innej przelicza stary pomiar', cronWatch.includes('scoreFindings(previous!.findings)'), true)
check('i wyrzuca checki, ktorych regule ruszylismy', cronWatch.includes('all.filter((change) => !ourDoing.has(change.checkId))'), true)
check('jedno wywolanie crona mierzy domene tylko raz', (cronWatch.match(/scanDomain\(watch\.domain\)/g) ?? []).length, 1)
check('pierwszy ruch zapisuje do odroczonego potwierdzenia', cronWatch.includes('watch.pending = {'), true)
check('i wyznacza mu wczesniejszy termin', cronWatch.includes('watch.recheckAt = new Date(Date.now() + 30 * 60 * 1000)'), true)
check(
  'mail dostaje tylko przeciecie tego samego checku i nowego werdyktu',
  cronWatch.includes('firstChange.checkId === change.checkId && firstChange.to === change.to'),
  true,
)
const doubleMeasured = 'Every verdict listed here was measured twice, about half an hour apart; a verdict that moved only once is not in this email.'
const watchEmailSource = readFileSync('src/lib/watch-email.ts', 'utf8')
check('mail wyjasnia podwojny pomiar', watchEmailSource.includes(doubleMeasured), true)
check(
  'podloga szumu na cenniku idzie ze stalej',
  readFileSync('src/app/pricing/page.tsx', 'utf8').includes('NOISE_FLOOR_PERCENT.toFixed(2)'),
  true,
)
// Kontrolka: sonda musi umiec powiedziec „nie" o pliku, ktorego tam nie ma.
check('a sonda widzi brak takiego zdania', cronWatch.includes('rulesChangedBetween(FORMULA_VERSION)'), false)
check('kontrola: sonda widzi brak innego zdania w mailu', watchEmailSource.includes(`${doubleMeasured} Not really.`), false)

// MCP 2026-07-28 przenosi rejestracje dynamiczna do MAY i pisze o niej "deprecated", stawiajac
// Client ID Metadata Documents jako SHOULD. Zdanie "jedyna standardowa droga" bylo prawda, gdy je
// pisalismy, i przestalo nia byc bez zadnej zmiany u nas. Idzie do platnego raportu jako
// uzasadnienie oskarzenia, wiec nie ma prawa wrocic przy najblizszym przepisywaniu kopii.
// Dwa razy jednej doby strona liczyla o cudzych firmach cos innego, niz mowila: `/standard` pisal
// „almost nobody in our corpus publishes the metadata", gdy publikuje 95 na 177, a `/findings`
// przypisywal RFC 7591 „almost every authorization server running today", czego nie mierzylismy
// nigdzie. Liczby na tych stronach sa policzone przy renderze; kwantyfikator obok nich byl pisany z
// reki i nic go nie odswiezalo. Zdania o SKALI zjawiska u innych firm albo maja policzona liczbe,
// albo ich nie ma.
console.log('\nnie szacujemy skali slowem tam, gdzie umiemy ja policzyc')
// Ta sama lista, co przy RFC 7591: strony PLUS `score.ts` i `fixfirst.ts`, bo zdania stamtad ida do
// PLATNEGO raportu. Tam wlasnie stalo czwarte takie zdanie („at almost every authorization server
// today"), czyli klient placil za oszacowanie, ktorego nie zmierzylismy.
for (const page of [...pagesUnder('src/app'), 'src/lib/score.ts', 'src/lib/fixfirst.ts']) {
  const told = readFileSync(page, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')
  check(`${page}: bez kwantyfikatora zamiast pomiaru`, scaleGuessIn(told), '')
}
// Kontrolka: sonda musi znalezc oba zdania, ktore ja wywolaly. Literaly stoja TUTAJ, a nie na
// stronie, bo sonda czytajaca wlasne uzasadnienie znajduje sama siebie - ten blad zdarzyl sie w tym
// repo trzy razy.
for (const zdanie of [
  'almost nobody in our corpus publishes the metadata that would let us check it',
  'without a human at almost every authorization server running today',
  // Codex znalazl to zdanie w tym samym przebiegu, w ktorym straznik powstal: pierwsza wersja
  // regexpa czytala tylko „nearly every", wiec „a check nearly everybody passes" przechodzilo.
  'we took neither of their per-page SEO checks, because a check nearly everybody passes',
]) {
  check(`kontrolka: sonda widzi "${zdanie.slice(0, 24)}..."`, UNMEASURED_SCALE.test(zdanie), true)
}
check('kontrolka: i przepuszcza zdanie o naszej wlasnej metodzie', UNMEASURED_SCALE.test('nobody watching, every source they read'), false)

console.log('\nnie nazywamy RFC 7591 jedyna standardowa droga')
for (const page of [...pagesUnder('src/app'), 'src/lib/score.ts', 'src/lib/fixfirst.ts']) {
  const told = readFileSync(page, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')
  const claim = /\b(only|one)\s+standard\b[^.]{0,80}(register|registration)/i.exec(told)?.[0] ?? ''
  check(`${page}: bez "jedynej standardowej" rejestracji`, claim, '')
}
// Kontrolka: sonda musi znalezc to zdanie, gdy naprawde tam jest.
check(
  'a sonda rozpoznaje takie zdanie',
  /\b(only|one)\s+standard\b[^.]{0,80}(register|registration)/i.test('RFC 7591 is the only standard way an agent registers itself'),
  true,
)

// Sciezka cennika, ktora nas gdzies odsyla, nie jest cennikiem vendora. Reguly sa tu, bo obie
// pomylki juz sie zdarzyly: sonda, ktora tego nie sprawdzala, wypisala 0 falszywych zdan na 25,
// a po zaostrzeniu 2, i to byly zdania o cudzych stronach produktowych.
console.log('\ncennik, ktory odsyla gdzie indziej, nie jest cennikiem')
const discoverSource = readFileSync('src/lib/scan/discover.ts', 'utf8')
check('odrzucamy strone, ktora wyladowala poza sciezka cennika', discoverSource.includes('if (!page.ok || !isPricingPath(asked)) return page'), true)
check('strona domowa zostaje, bo pytamy o nia celowo', /isPricingPath\(asked\)/.test(discoverSource), true)
// Sama sciezka nie wystarcza: cudzy /pricing jest nadal cudzy. sendgrid.com/pricing laduje na
// twilio.com/en-us/pricing i wolno je czytac wylacznie dlatego, ze ich witryna tam sie rozwiazuje.
check('laduje na sciezce cennika I na ich wlasnej domenie', discoverSource.includes('isPricingPath(page.url) && stillTheirs(page.url)'), true)
check('a „ich wlasna" to domena skanowana i ta, na ktora sie rozwiazuje', discoverSource.includes('[domain, hostOf(home.url) ?? \'\', hostOf(canonical) ?? \'\']'), true)
const scoreSource = readFileSync('src/lib/score.ts', 'utf8')
check('zdanie nazywa oba adresy', scoreSource.includes('redirects to ${away.landedAt}, which is not a pricing page'), true)
check('i jest niemierzalne, a nie oskarzeniem', /pricingRedirectedAway[\s\S]{0,400}inconclusive: true/.test(scoreSource), true)
// Sciezka zapasowa pyta te same dwa adresy jeszcze raz i bierze, co odpowie, wiec po odrzuceniu
// oddawala dokladnie te strone, ktora odrzucilismy, tylko pod etykieta „zgadlismy sciezke".
check('po odrzuceniu nie ma sciezki zapasowej', discoverSource.includes('redirectedAway ? null : await firstLivePath(canonical, PRICING_FALLBACKS)'), true)
// Straznik „sprostowanie directusa nie moze wygasnac przed naprawa" ZDJETY w 9.43, bo jego zadanie
// sie skonczylo: naprawa weszla w 9.42, przemiat przeliczyl korpus i `after-reseed` potwierdzil, ze
// wszystkie sprostowania wygasly. Wpis w `errata.ts` zostaje jako historia, tak jak te z 9.12,
// 9.31 i 9.40. Regula pilnujaca terminu jednego konkretnego wpisu jest z natury tymczasowa i
// trzymanie jej po naprawie oblewa build za to, ze naprawa doszla.

// Renderer platnego raportu w portalu nie jest parserem markdowna: zna dokladnie te konstrukcje,
// ktore wypisuje generator. Ta reguła jest cala podstawa, zeby taki renderer byl uczciwy - gdy
// generator nauczy sie nowej konstrukcji, a renderer nie, buduje sie tu blad, a nie na produkcji.
console.log('\nportal renderuje kazda konstrukcje, ktora generator wypisuje')
const generator = readFileSync('scripts/client-report.mts', 'utf8')
// Akapit moze zaczynac sie od pogrubienia albo kursywy, wiec sa tu razem z blokami.
const RENDERED = /^(#{1,3} |> |\||- |\d+\. |\*\*|\*[^*]|$)/
const emitted = [...generator.matchAll(/lines\.push\(\s*(`|')([^`']*)/g)]
  .map((match) => match[2])
  .filter((line) => line.length > 0 && !line.startsWith('${'))
const unknown = emitted.filter((line) => !RENDERED.test(line) && /^[^A-Za-z0-9"„(]/.test(line))
check('generator nie wypisuje konstrukcji, ktorej portal nie zna', unknown.join(' | '), '')
const renderer = readFileSync('src/components/report-markdown.tsx', 'utf8')
for (const construct of ["startsWith('# ')", "startsWith('## ')", "startsWith('### ')", "startsWith('> ')", 'isTableRow', "startsWith('- ')", '<em ']) {
  check(`renderer zna ${construct}`, renderer.includes(construct), true)
}
// Dostarczony raport nie moze trafic do indeksu ani na liste: nalezy do tego, kto za niego zaplacil.
const deliveryPage = readFileSync('src/app/d/[id]/page.tsx', 'utf8')
check('strona raportu jest poza indeksem', deliveryPage.includes('robots: { index: false, follow: false }'), true)
// Kontrolka: sonda musi umiec zobaczyc konstrukcje, ktorej renderer nie zna.
check('a sonda rozpoznaje nieznana konstrukcje', RENDERED.test('~~~ blok kodu'), false)
// Rozdzielacz tabeli idzie bez spacji po kresce, wiec regula pytajaca o „| " konczyla tabele na
// naglowku i kazdy wiersz punktacji renderowala jako osobna tabele bez danych.
check('renderer widzi rozdzielacz tabeli', renderer.includes("line.startsWith('|') && line.trimEnd().endsWith('|')"), true)

// Piaskownica biegow. Kazda z tych regul opisuje rzecz, ktora juz raz poszla zle albo poszlaby
// przy pierwszej nieuwadze: bieg startujacy w tym repozytorium, HOME oddane w calosci, dowiazanie
// zamiast kopii (dowiazanie do ~/.claude oddaje caly katalog, czyli dokladnie to, co zabieramy).
console.log('\npiaskownica biegow nie oddaje wiecej, niz mowi')
const sandbox = readFileSync('harness/sandbox/run.sh', 'utf8')
check('srodowisko jest czyszczone', /^env -i/m.test(sandbox), true)
check('HOME wskazuje na katalog tymczasowy', sandbox.includes('HOME="$SCRATCH"'), true)
check('poswiadczenie jest kopiowane, nie dowiazywane', sandbox.includes('cp "$HOME/$WANTS"') && !sandbox.includes('ln -s'), true)
// Bieg claude nie potrzebuje tokenu codeksa. Kopiowanie obu oddawalo wrogiej paczce poswiadczenie,
// ktorego ten bieg nigdy nie uzyje, czyli dokladnie odwrotnosc tego, co ten skrypt obiecuje.
check('kopiowane jest poswiadczenie tego CLI, ktore uruchamiamy', sandbox.includes('case "$(basename "$1")" in'), true)
check('bieg nie startuje w tym repozytorium', sandbox.includes('"$REPO_ROOT"|"$REPO_ROOT"/*'), true)
// Obie sciezki fizyczne, inaczej repozytorium osiagane przez dowiazanie porownuje sie z samym soba
// w dwoch zapisach i granica nie trzyma.
check('obie strony porownania sa fizyczne', (sandbox.match(/pwd -P/g) ?? []).length >= 2, true)
// `exec` podmienia powloke i trap EXIT nigdy nie chodzi, wiec kopia poswiadczenia zostawalaby w
// katalogu tymczasowym po kazdym biegu. Piaskownica rozsypujaca sekrety jest gorsza niz jej brak.
check('poswiadczenie jest sprzatane po biegu', !sandbox.includes('exec env -i') && sandbox.includes("trap 'rm -rf \"$SCRATCH\"' EXIT"), true)
// Kontrolka: wzorzec sekretu musi rozpoznac nazwe, ktorej tam nie wpisano z gory.
const SECRET_ENV = /(_KEY|_TOKEN|_SECRET|PASSWORD|_URI|_DSN|CREDENTIAL|_PAT$|^AWS_|^HEROKU_|^GH_|^GITHUB_TOKEN)/i
check('wzorzec sekretu widzi nowa nazwe', SECRET_ENV.test('PADDLE_WEBHOOK_SECRET'), true)
check('i nie krzyczy na zwykla zmienna', SECRET_ENV.test('TERM'), false)

// Zdejmowanie tagow bylo kwadratowe: 400 000 znakow "<" liczylo sie 53 sekundy przy budzecie skanu
// 27 sekund, wiec strona z samych nawiasow zabierala caly budzet, a checki, ktore nie zdazyly,
// publikowaly sie jako niemierzalne. Nowa wersja musi dawac DOKLADNIE ten sam wynik, bo inaczej
// przesuwa werdykty; rownowaznosc sprawdzana tu, a czas w scripts/audit-redos.mts.
console.log('\nzdejmowanie tagow jest liniowe i daje ten sam wynik')
const byPattern = (html: string) => html.replace(/<[^>]+>/g, ' ')
const shapes = ['<a href="x">tekst</a>', 'a < b', '<>', '<<<', '</', 'a<b>c', '', '<div\n class="x">tresc</div>', '<!-- komentarz -->x', '<a<b>c']
for (const shape of shapes) check(`ten sam wynik dla ${JSON.stringify(shape)}`, withoutTags(shape), byPattern(shape))
// Kontrolka: sonda musi umiec zobaczyc rozjazd, gdy naprawde jest.
check('a sonda widzi rozjazd', withoutTags('<a>') === byPattern('<a>x'), false)
// Nie mierzymy tu czasu: `rules.mts` chodzi w buildzie, a prog na zegarze oblewalby poprawny build
// na obcazonej maszynie. Deterministyczny odpowiednik to nieobecnosc kwadratowego wzorca na
// sciezce skanu; czas mierzy scripts/audit-redos.mts.
for (const file of ['src/lib/scan/http.ts', 'src/lib/scan/funnel.ts', 'src/lib/scan/discover.ts']) {
  const source = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')
  check(`${file}: bez kwadratowego zdejmowania tagow`, source.includes('/<[^>]+>/g'), false)
}

// Strona raportu jest ladniejsza od markdownu i dlatego jest niebezpieczna: zastrzezenia, ktore
// dokument niesie, moga z niej po cichu wypasc. Kazde z tych trzech juz raz wypadlo.
console.log('\nladniejsza wersja raportu niesie te same zastrzezenia')
const view = readFileSync('src/app/d/[id]/report-view.tsx', 'utf8')
check('mowi, gdy vendor nie byl na liscie przy biegach', view.includes('model.guest'), true)
check('mowi, gdy bieg mogl czytac instrukcje operatora', view.includes('!run.blind'), true)
check('tlumaczy, czemu mianownik jest mniejszy', view.includes('model.notApplicable'), true)
check('odroznia przewage od jednego wymienienia roznicy', view.includes('row.clear'), true)
// Kontrolka: sonda ma widziec brak pola, ktorego tam nie ma.
check('a sonda widzi pole, ktorego nie uzywamy', view.includes('model.nieistniejace'), false)

// Obietnica o wlasnym zachowaniu jest jedyna, ktorej nie wolno zostawic dobrym checiom: strona
// /bot mowi administratorowi, ze dwie linijki w robots.txt nas zatrzymuja.
console.log('\nczytamy robots.txt takze jako prosbe do nas')
const nazwanaGrupa = parseRobots('User-agent: LetAgentsIn\nDisallow: /')
check('grupa nazywajaca nas i zamykajaca wszystko', asksUsToStayOut(nazwanaGrupa), true)
check('wersja z wersja w nazwie tez', asksUsToStayOut(parseRobots('User-agent: LetAgentsIn/1.0\nDisallow: /')), true)
check('inna wielkosc liter tez', asksUsToStayOut(parseRobots('user-agent: letagentsin\ndisallow: /')), true)
// Wildcard NIE liczy sie swiadomie: to polityka wobec crawlerow zabierajacych tresc, a my nie
// zabieramy zadnej. Gdyby liczyl, zniknelaby polowa korpusu bez niczyjej decyzji o nas.
check('wildcard nie jest prosba do nas', asksUsToStayOut(parseRobots('User-agent: *\nDisallow: /')), false)
check('nasza grupa bez zamkniecia calosci to nie prosba', asksUsToStayOut(parseRobots('User-agent: LetAgentsIn\nDisallow: /admin')), false)
check('brak naszej grupy to brak prosby', asksUsToStayOut(parseRobots('User-agent: GPTBot\nDisallow: /')), false)
// Puste `Disallow:` znaczy w RFC 9309 dokladnie odwrotnie: wpuszcza wszystko.
check('puste Disallow to nie prosba', asksUsToStayOut(parseRobots('User-agent: LetAgentsIn\nDisallow:')), false)
// Dwie pisownie tej samej nazwy to dwa wpisy w mapie, wiec czytanie tylko pierwszej grupy
// przeoczyloby prosbe zapisana w drugiej.
check('prosba w drugiej grupie tez sie liczy', asksUsToStayOut(parseRobots('User-agent: LetAgentsIn\nDisallow: /admin\nUser-agent: LetAgentsIn/1.0\nDisallow: /')), true)
// Wpis o pominietym watchu musi przesuwac kolejke, inaczej jedna domena blokuje wszystkie inne.
const cronSource = readFileSync('src/app/api/cron/watch/route.ts', 'utf8')
check('pominiety watch idzie na koniec kolejki', cronSource.includes('watch.checkedAt = new Date().toISOString()\n      await store.saveWatch(watch)'), true)
check('i nie jest po cichu zatrzymywany', cronSource.includes('watch.stoppedAt = ') , false)

// Zamrozony wiersz musi MOWIC, ze jest zamrozony, i musi podawac droge powrotna, ktora dziala.
// Audyt, ktory ustalil polityke zamrazania zamiast usuwania, sam nazwal to warunkiem koniecznym,
// a zadna z tych dwoch polowek nie istniala: pominiecie dzialo sie wewnatrz przebiegu i nie
// zostawialo sladu nigdzie, gdzie czytelnik moglby go zobaczyc.
console.log('\nzamrozony wiersz mowi, ze jest zamrozony')
check('pierwsza data nie rusza sie przy kolejnym przebiegu', stayOutAfter({ domain: 'x.test', since: '2026-01-01T00:00:00.000Z', lastSeenAt: '2026-01-01T00:00:00.000Z' }, 'x.test', '2026-08-19T00:00:00.000Z').since, '2026-01-01T00:00:00.000Z')
check('a data ostatniego potwierdzenia rusza sie', stayOutAfter({ domain: 'x.test', since: '2026-01-01T00:00:00.000Z', lastSeenAt: '2026-01-01T00:00:00.000Z' }, 'x.test', '2026-08-19T00:00:00.000Z').lastSeenAt, '2026-08-19T00:00:00.000Z')
// Kontrolka: pierwsza obserwacja ustawia obie daty na te sama.
check('pierwsza obserwacja ustawia obie daty', stayOutAfter(null, 'x.test', '2026-08-19T00:00:00.000Z').since, '2026-08-19T00:00:00.000Z')
// Oba przebiegi automatyczne zapisuja prosbe i oba czyszcza ja po udanym pomiarze, bo odmrozenie
// idzie wylacznie ta droga.
check('reseed zapisuje prosbe', readFileSync('src/lib/scan-run.ts', 'utf8').includes('.recordStayOut(gate.domain)'), true)
// Czyszczenie MUSI stac po zapisie raportu: skasowane wczesniej, nieudany rescan zdejmowal
// adnotacje i zostawial na stronie stary pomiar bez ostrzezenia, czyli dokladnie ten stan, przed
// ktorym ta adnotacja ma chronic.
const scanRunSource = readFileSync('src/lib/scan-run.ts', 'utf8')
check('i czysci ja dopiero po zapisanym raporcie', scanRunSource.includes('kept &&'), true)
check('kontrola: nie czysci jej przed skanem', scanRunSource.indexOf('.clearStayOut(gate.domain)') > scanRunSource.indexOf('await scanDomain(gate.domain)'), true)
// Reseed i cron moga zobaczyc te sama domene naraz, wiec zapis musi byc jedna operacja: odczyt i
// podmiana pozwalaly pozniejszemu odczytowi wygrac starsza data, a przy pierwszej obserwacji dwa
// upserty wchodzily na unikalny indeks bledem duplikatu.
const mongoSource = readFileSync('src/lib/store-mongo.ts', 'utf8')
check('zapis prosby jest jedna operacja', mongoSource.includes('$setOnInsert: { domain, since'), true)
check('kontrola: nie wraca do odczytu i podmiany', mongoSource.includes('stayOuts.replaceOne'), false)
check('jedno odczytanie zegara na zapis', mongoSource.includes('$set: { lastSeenAt: now }, $setOnInsert: { domain, since: now }'), true)
// Mediana pustego zbioru nie istnieje, wiec przy wszystkich wierszach zamrozonych raport nie moze
// drukowac liczby „bez nich".
const raportSource = readFileSync('src/app/report/page.tsx', 'utf8')
check('raport ma osobna galaz dla wszystkich zamrozonych', raportSource.includes('report.frozen.median === null'), true)

// Nieczytelny robots.txt to trzecia odpowiedz, nie „nie prosza". Wciagniety w falsz odmrazalby
// wiersz na jednej zlej minucie na ich brzegu i wznawial automatyczne pobieranie domeny, ktora
// niczego nie wycofala. Brak dowodu nie jest dowodem braku, a tu kosztuje kogos innego.
console.log('\ntrzy odpowiedzi robots.txt, nie dwie')
const odpowiedz = (status: number, body: string, contentType = 'text/plain') =>
  ({ ok: status >= 200 && status < 300, status, body, headers: { 'content-type': contentType }, url: 'https://x.test/robots.txt' }) as never
check('grupa nazywajaca nas to prosba', stanceFrom(odpowiedz(200, 'User-agent: LetAgentsIn\nDisallow: /')), 'out')
check('przeczytany plik bez naszej grupy to brak prosby', stanceFrom(odpowiedz(200, 'User-agent: *\nDisallow: /admin')), 'in')
// 404 to jedyny status, ktory JEST odpowiedzia: nie ma pliku, wiec nie ma w nim prosby.
check('404 to brak prosby', stanceFrom(odpowiedz(404, 'not found')), 'in')
check('500 to nie wiadomo', stanceFrom(odpowiedz(500, 'oops')), 'unknown')
check('wyzwanie HTML zamiast pliku to nie wiadomo', stanceFrom(odpowiedz(200, '<!doctype html><html>...', 'text/html')), 'unknown')
// Kontrolka: gdyby „nie wiadomo" bylo tym samym co „nie prosza", ten check przechodzilby na 'in'.
check('kontrola: nieczytelne nie jest tym samym co brak prosby', stanceFrom(odpowiedz(503, '')) === stanceFrom(odpowiedz(404, '')), false)
// Odmrozenie ma wisiec na przeczytanym pliku, nie na samym udanym skanie.
check('reseed odmraza tylko przy stance in', scanRunSource.includes("if (seeded && kept && stance === 'in' && freeze !== 'clear') {"), true)
check('cron odmraza tylko przy stance in', cronSource.includes("if (stance === 'in' && freeze !== 'clear') {"), true)
// Nieudany odczyt bazy tez jest trzecim stanem: wciagniety w „nie ma prosby" wznawialby pobieranie
// zamrozonej domeny przy zaciecu bazy, czyli to samo o warstwe nizej.
check('nieudany odczyt nie znaczy brak prosby', scanRunSource.includes(".catch(() => 'unknown')"), true)
check('cron tak samo', cronSource.includes(".catch(() => 'unknown')"), true)
check('kontrola: nie wraca do null przy bledzie odczytu', scanRunSource.includes('.stayOutFor(gate.domain).catch(() => null)'), false)
// Ten sam wzorzec na warstwie widoku: nieudany odczyt nie moze renderowac sie jak „nic nie jest
// zamrozone", bo wtedy zamrozony wiersz stoi w rankingu jako zwykly, biezacy wynik.
const listaSource = readFileSync('src/app/v/page.tsx', 'utf8')
check('lista mowi, gdy nie umie sprawdzic', listaSource.includes('stayOuts === null'), true)
check('kontrola: nie zamienia bledu na pusty zbior', listaSource.includes('.stayOuts().catch(() => [])'), false)
const vendorSource = readFileSync('src/app/v/[domain]/page.tsx', 'utf8')
check('strona vendora tez to mowi', vendorSource.includes("frozen === 'unknown'"), true)
// Decyzja, ktora dwa razy podniosl codex i ktora odrzucamy swiadomie: przy `stance === 'in'`
// skanujemy nawet wtedy, gdy odczyt zamrozenia sie nie udal. Przeczytalismy wlasnie ich robots.txt
// i on o nic nie prosi; ich wlasny biezacy plik jest autorytetem, a nasz zapis o tym, o co prosili
// kiedys, nie moze go przebijac. Nieznany stan bazy liczy sie tylko wtedy, gdy robots.txt tez jest
// nieczytelny, czyli gdy zgadujemy obie polowy naraz.
check('przy przeczytanym robots.txt bez prosby skanujemy', scanRunSource.includes("stance === 'unknown' && freeze !== 'clear'"), true)
check('kontrola: nie blokujemy skanu samym nieznanym stanem bazy', scanRunSource.includes("freeze === 'unknown' ||"), false)
check('cron monitoringu zapisuje prosbe', cronSource.includes('.recordStayOut(watch.domain)'), true)
check('i czysci ja przy udanym pomiarze', cronSource.includes('.clearStayOut(watch.domain)'), true)

// Zdanie na /bot, ze skan wlasnej domeny NIE aktualizuje opublikowanego wiersza, jest prawdziwe
// tylko dopoki korpus bierze wylacznie skany z konsoli. Przez dobe strona twierdzila odwrotnie.
check('korpus bierze tylko skany zasiane', readFileSync('src/lib/published.ts', 'utf8').includes('latestPerDomain(1000, true)'), true)
// Bialy znak znormalizowany, bo inaczej regula oblewa przy samym przelamaniu wiersza w JSX, czyli
// alarmuje o czyms, co nie jest zmiana obietnicy.
const botProse = readFileSync('src/app/bot/page.tsx', 'utf8').replace(/\s+/g, ' ')
check('/bot mowi, ze skan goscia nie rusza wiersza', botProse.includes('will not update the published entry'), true)
check('kontrola: zdania, ktorego tam nie ma, nie znajduje', botProse.includes('will update the published entry immediately'), false)

// Licznik odwiedzin zapisuje teraz nazwe crawlera, wiec strona prywatnosci nie moze dalej mowic,
// ze zapisujemy wylacznie „browser albo agent". Zdanie o tym, co zbieramy, jest obietnica prawna.
console.log('\nlicznik nazywa crawlery, a prywatnosc o tym mowi')
check('OAI-SearchBot rozpoznany', crawlerName('Mozilla/5.0 (compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)'), 'oai-searchbot')
check('Claude-SearchBot przed ClaudeBot', crawlerName('Mozilla/5.0 (compatible; Claude-SearchBot/1.0)'), 'claude-searchbot')
check('ClaudeBot to nadal ClaudeBot', crawlerName('Mozilla/5.0 (compatible; ClaudeBot/1.0)'), 'claudebot')
// Kontrolka: zwykla przegladarka i nasz wlasny skaner nie sa crawlerem z listy.
check('przegladarka nie jest nazwanym crawlerem', crawlerName('Mozilla/5.0 (Macintosh) Safari/605'), null)
check('nasz wlasny UA tez nie', crawlerName('LetAgentsIn/1.0 (+https://letagentsin.com/bot)'), null)
const prywatnosc = readFileSync('src/app/privacy/page.tsx', 'utf8').replace(/\s+/g, ' ')
check('prywatnosc mowi o nazwie crawlera', prywatnosc.includes('The crawler name is the only thing kept from the user-agent'), true)
check('i nie twierdzi juz, ze to tylko browser albo agent', prywatnosc.includes('whether the request looked like a browser or an agent'), false)

// Strona o cudzym standardzie publikuje werdykt o czyms, czego nie kontrolujemy, wiec liczby na
// niej musza byc liczone, a nie wpisane. Liczba MUST-ow i lista checkow bez odpowiednika to jedyne
// rzeczy wpisane recznie i obie sa sprawdzone wobec zrodel.
console.log('\nstrona o standardzie nie wpisuje liczb recznie')
const standard = readFileSync('src/app/standard/page.tsx', 'utf8')
check('liczba checkow idzie ze stalej', standard.includes('CHECKS.length'), true)
check('liczba wierszy idzie z korpusu', standard.includes('corpus.reports.length'), true)
// Liczona z tego, co skan zastal pod adresem, nie ze zdania, ktore o tym napisal: zdanie nazywa
// jeden plik, wiec domena serwujaca kilka bylaby policzona raz albo wcale.
// Liczba kart agenta nie idzie juz z naszej pamieci w ogole: przechowywana liczba mowila 11 ze 177,
// a bezposrednia proba 59 domen nie znalazla ani jednej. Publikujemy pomiar, ktory da sie powtorzyc.
check('strona nie liczy kart z wlasnej pamieci', standard.includes('usableEntryPoints'), false)
// Mianownik to hosty, ktore odpowiedzialy, nie wszystkie zapytane: 403 od szesciu vendorow nie jest
// informacja, ze karty nie maja, a wliczenie ich zamienia odmowe w brak.
check('mianownik to hosty, ktore odpowiedzialy', standard.includes('Fifty-two answered'), true)
check('a odmowy sa wylaczone wprost', standard.includes('counted in neither'), true)
check('i brak jest sprawdzony wobec kontrolki', standard.includes("path nobody registered"), true)
// 404 nie potrzebuje kontrolki, wiec zdanie nie moze mowic, ze KAZDY brak przez nia przeszedl.
check('zdanie nie obiecuje kontrolki przy kazdym braku', standard.includes('most said 404 outright'), true)
const cardProbe = readFileSync('scripts/audit-agent-card.mts', 'utf8')
check('sonda odroznia odmowe od braku', cardProbe.includes('const unclear') && cardProbe.includes('const absent'), true)
check('i nie bierze kazdego JSON-a za karte', cardProbe.includes('looksLikeACard'), true)
// 200 z markerem wyzwania to sciana, nie odpowiedz: bez tego bramka botowa zwracajaca 200 zapisalaby
// sie jako „nie maja karty", czyli dokladnie to oskarzenie, ktoremu ta sonda ma zapobiegac.
check('sciana z kodem 200 nie jest brakiem', cardProbe.includes("cf-mitigated"), true)
// Brakiem jest tylko HTML pod adresem .json, czyli miekkie 404. Kazda inna odpowiedz 200, ktorej
// nie umiemy odczytac, zostaje niejasna, bo mianownik cytowany publicznie nie moze jej wchlonac.
// Brak jest ustalany wobec wlasnej kontrolki witryny, a nie z ksztaltu odpowiedzi: strona logowania
// i miekkie 404 wygladaja tak samo, dopoki nie zapytasz o sciezke, ktorej nikt nie rejestruje.
check('brak jest ustalany wobec kontrolki', cardProbe.includes('NONSENSE') && cardProbe.includes('sameStatus'), true)
// „Oba sa HTML" to nie porownanie: strona logowania i miekkie 404 sa oba HTML.
check('kontrolka uzywa porownania szablonu ze skanera', cardProbe.includes('answersWithTheSameTemplate'), true)
// Witryna z calym /.well-known za logowaniem odpowiada tak samo pod kazda sciezka, wiec kontrolka
// pasuje, a to nadal jest sciana, nie brak pliku.
check('sciana logowania nie jest brakiem karty', cardProbe.includes('const wall'), true)
check('i nie czyta opublikowanego zdania', standard.includes('check.detail.includes'), false)
// Witryna odpowiadajaca kazdej sciezce swoja powloka ma pozorne trafienie pod kazdym adresem;
// check to odrzuca, wiec liczenie samych sciezek publikowaloby te powloki jako karty agenta.
// Siedem MUST-ow przeczytanych z agentready.org 2026-08-19. Gdy tabela urosnie albo sie skurczy
// bez zmiany zdania we wstepie, strona zacznie klamac o standardzie, ktorego nie kontrolujemy.
const musts = (standard.match(/id: 'AR-[A-Z]+-\d+'/g) ?? []).length
check('tabela ma dokladnie siedem MUST-ow', musts, 7)
check('i wstep mowi te sama liczbe', standard.includes('seven of them are MUST'), true)
// Wstep mowil „piec z siedmiu", a tabela mierzyla szesc. Liczba w zdaniu i liczba w tabeli to jedno
// pojecie liczone w dwoch miejscach, czyli dokladnie ten blad, ktory ten projekt sobie juz zrobil.
const measured = (standard.match(/ours: '/g) ?? []).length
check('wstep zgadza sie z tabela', standard.includes(`We measure six of the seven`) && measured === 6, true)
// Opis w snippecie to zdanie, ktore agent czyta ZAMIAST otwierac strone: mamy o tym wlasny check.
check('opis dla wyszukiwarki mowi to samo', standard.includes('We measure six of those seven'), true)
check('bez wyniku zgodnosci', /compliance score/i.test(standard) && standard.includes('there will not be'), true)

// Cennik pokazuje przyklad dostarczanego dokumentu tylko wtedy, gdy ten dokument istnieje: swieze
// wdrozenie nie ma zadnych dostaw, a link do 404 jest gorszy niz brak linku.
console.log('\ncennik nie linkuje probki, ktorej nie ma')
const pricingPage = readFileSync('src/app/pricing/page.tsx', 'utf8')
check('probka jest sprawdzana w magazynie', pricingPage.includes("getDelivery('sample')"), true)
// Istnienie to nie zgoda: raport klienta opublikowany pod tym id, ale bez znacznika probki, nie ma
// prawa trafic na cennik.
check('i musi byc oznaczona jako probka', pricingPage.includes('delivery?.sample === true'), true)
// Baza, ktora odmawia odczytu, nie moze wywrocic cennika przez opcjonalny link.
check('a awaria bazy tylko chowa link', pricingPage.includes('.catch(() => false)'), true)
check('i link renderuje sie warunkowo', pricingPage.includes('tier.sample && sampleReady'), true)
// `--id --sample` przechodzilo przez wzorzec i publikowalo raport pod nazwa flagi.
const reportScript = readFileSync('scripts/client-report.mts', 'utf8')
check('--id nie bierze innej flagi za wartosc', reportScript.includes("chosen.startsWith('--')"), true)

// Cennik obiecuje piec biegow agentowych miesiecznie, a zaden cron ich nie odswieza: robi to
// czlowiek. Dopoki dokumentacja dostawy nadal to przyznaje, cennik tez musi - inaczej kupujacy
// czyta harmonogram tam, gdzie jest kalendarz. Gdy harmonogram powstanie, ten straznik oblewa
// build i przypomina, ze zdanie na cenniku juz nie jest prawda.
console.log('\ncennik przyznaje, ze miesieczna polowa nie ma harmonogramu')
const dostawaMowiOBrakuHarmonogramu = readFileSync('docs/delivering-a-report.md', 'utf8').includes(
  'The monthly half of monitoring has no schedule behind it',
)
const cennikSource = readFileSync('src/app/pricing/page.tsx', 'utf8')
check('dokumentacja dostawy nadal to przyznaje', dostawaMowiOBrakuHarmonogramu, true)
check(
  'i cennik mowi to samo kupujacemu',
  !dostawaMowiOBrakuHarmonogramu || cennikSource.includes('The five agent runs are started by a person'),
  true,
)

// Straznik na sam ten plik. `process.exit` na koncu robi z kazdego `check` ponizej martwy kod,
// ktory drukuje sie na zielono i nigdy nie oblewa - dopisalem tak jedna regule 2026-08-19 i przez
// chwile nie robila nic. Podsumowanie musi byc ostatnie.
// Kazdy audyt, ktory czyta ograniczona liczbe wierszy, ma powiedziec ile ich pominal. Dziesiec z
// nich zatrzymywalo sie po 25-40 domenach ze 177 i drukowalo wniosek, ktory czytalo sie jak caly
// korpus. `audit-agent-card` jest wyjatkiem nazwanym z imienia, bo jego liczba to krok probkowania,
// a nie sufit.
console.log('\naudyt mowi, ilu wierszy nie przeczytal')
// Sufit da sie ogloszic na dwa sposoby, bo tnie dwie rozne rzeczy. Gdy kroi liste wprost, liczbe
// zna `howManyRows`. Gdy liczy wiersze PASUJACE, a petla i tak idzie przez cala liste, wie to
// dopiero koniec petli - i wtedy `howManyRows(30, size)` oglaszalby pominiecie, ktorego nie bylo.
// Ta polowa jest codeksa, na pierwszej wersji tego straznika.
const bezOgloszenia = readdirSync('scripts')
  // `rules.mts` odpada, bo trafia sam w siebie: kontrolki ponizej zawieraja ten napis jako tekst.
  // To trzeci raz tej nocy, kiedy sonda znajduje wlasny literal, i dlatego jest tu wypisane.
  .filter((name) => name.endsWith('.mts') && name !== 'audit-agent-card.mts' && name !== 'rules.mts')
  .filter((name) => {
    const source = readFileSync(`scripts/${name}`, 'utf8')
    return /howManyRows\((\d+|\w+\.length)\)/.test(source) && !source.includes('reportCap(')
  })
check('zaden audyt nie ma niemego sufitu', bezOgloszenia.join(', '), '')
// Kontrolka: sonda umie znalezc wywolanie, ktore niczego nie oglasza.
const niemy = (source: string) => /howManyRows\((\d+|\w+\.length)\)/.test(source) && !source.includes('reportCap(')
check('sonda widzi sufit bez ogloszenia', niemy('const most = howManyRows(30)'), true)
check('populacja w wywolaniu wystarcza', niemy('const most = howManyRows(30, CURATED_DOMAINS.size)'), false)
check('raport na koncu petli tez wystarcza', niemy('const most = howManyRows(30)\nreportCap(visited, 177, checked)'), false)
// Sufit trafiony na OSTATNIEJ domenie to nie obciecie, a `matched >= cap` nie umie ich rozroznic.
check('pelne przejscie nie zglasza pominiecia', coverageLine(177, 177, 30).includes('NIE przeczytana'), false)
check('a przerwane w polowie zglasza', coverageLine(88, 177, 30).includes('NIE przeczytana'), true)
check('pelne przejscie mowi, ile wierszy pasowalo', coverageLine(177, 177, 49).includes('49 z nich pasowalo'), true)

// Ten repozytorium ma pnpm-lock.yaml i nie ma package-lock.json, wiec `npm ci` w workflow konczy sie
// bledem w osiem sekund. Job lustrzacy rejestr MCP tak wlasnie umarl na obu swoich przebiegach i
// nikt tego nie zauwazyl, bo stare lustro jest czytane jeszcze przez siedem dni.
console.log('\nworkflow instaluje tym, czym repo ma lockfile')
const workflowy = readdirSync('.github/workflows').filter((name) => name.endsWith('.yml'))
const przezNpmCi = workflowy.filter((name) => /^\s*-?\s*(run:\s*)?npm ci\s*$/m.test(readFileSync(`.github/workflows/${name}`, 'utf8')))
check('zaden workflow nie wola npm ci', przezNpmCi.join(', '), '')
// Kontrolka: sonda umie znalezc to wywolanie, i nie myli go z komentarzem o nim.
check('sonda widzi npm ci w kroku', /^\s*-?\s*(run:\s*)?npm ci\s*$/m.test('      - run: npm ci'), true)
check('i nie lapie wzmianki w komentarzu', /^\s*-?\s*(run:\s*)?npm ci\s*$/m.test('      # npm ci refuses without a lockfile'), false)
// Prog ostrzegawczy przed progiem TTL: inaczej pierwsza wiadomosc o awarii producenta danych brzmi
// „caly check nagle niemierzalny", siedem dni po fakcie.
const poPrzemiacie = readFileSync('scripts/after-reseed.mts', 'utf8')
check('lustro ma prog ostrzegawczy przed TTL', poPrzemiacie.includes('DWA pominiete przebiegi dziennego jobu'), true)

// Okno ciete na 70 znakach potrafi skonczyc sie w srodku adresu, a kupujacy czyta wtedy
// "https://console.cloud.google.c" w dokumencie, za ktory zaplacil. Dwa z 79 cytatow w korpusie
// tak wygladaly. Poszerzenie okna byloby gorsze: cytowaloby slowa, ktorych regula nie czytala.
console.log('\ncytat nie konczy sie polowa adresu')
check('ucieta polowa adresu znika', withoutAChoppedEnding('service account under [IAM](https://console.cloud.google.c', true), 'service account under [IAM]')
// Kontrolka: caly adres zostaje, bo ma po sobie spacje albo nawias.
// Adres zostaje w calosci; odpada polslowo na koncu, bo `cutMidToken` mowi, ze okno urwalo sie w
// srodku tokenu. Fixture mial wczesniej cale slowo na koncu, co przeczylo jego wlasnej przeslance.
check('caly adres zostaje', withoutAChoppedEnding('see https://example.com/x for mo', true), 'see https://example.com/x for')
check('a cale slowo zostaje, gdy nic nie bylo ucinane', withoutAChoppedEnding('see https://example.com/x for more', false), 'see https://example.com/x for more')
check('adres domykany nawiasem zostaje', withoutAChoppedEnding('[IAM](https://example.com/x)', true), '[IAM](https://example.com/x)')
check('zdanie bez adresu traci polslowo', withoutAChoppedEnding('create an api key programmatica', true), 'create an api key')
// Kontrolka codeksa: zdanie skonczone kropka nie jest ucietym adresem, choc po adresie nie ma spacji.
check('adres na koncu zdania zostaje', withoutAChoppedEnding('Visit https://example.com/x.', false), 'Visit https://example.com/x.')
// Trzy sposoby na skonczenie okna, wszystkie w porzadku: kropka, koniec strony i dokladnie spacja.
// Trzeci jest codeksa: granica 70 znakow potrafi wypasc tuz ZA calym adresem.
// Trafienie od 0 o dlugosci 5, wiec granica wypada na znaku 75: to on jedyny rozstrzyga.
check('granica dokladnie na spacji to nie ciecie', windowCutMidToken(`${'x'.repeat(75)} dalej`, 0, 5), false)
check('granica w srodku slowa to ciecie', windowCutMidToken(`${'x'.repeat(76)} dalej`, 0, 5), true)
check('koniec tekstu to nie ciecie', windowCutMidToken('x'.repeat(75), 0, 5), false)
check('kropka przed granica to nie ciecie', windowCutMidToken(`${'x'.repeat(10)}. ${'x'.repeat(80)}`, 0, 5), false)
// Nawias zamykajacy na granicy zostaje POZA oknem, wiec cytat niesie niedomkniete [IAM](https://x.
// Tylko bialy znak jest bezpiecznie poza tokenem.
check('nawias na granicy to ciecie', windowCutMidToken(`${'x'.repeat(75)}) dalej`, 0, 5), true)

// Piec z dziewieciu cytatow w raporcie growthbooka bylo po polsku, bo bieg claude'a chodzi na
// maszynie, ktorej instrukcje operatora o to prosza. Kupujacy dostawal zdania, ktorych nie czyta,
// bez slowa wyjasnienia. Tlumaczenie odpada: przetlumaczony cytat to nasze zdanie, nie agenta.
console.log('\ncytat nie po angielsku mowi, ze nie jest po angielsku')
check('polskie zdanie jest rozpoznane', readsAsPolish('wybrałbym Statsig albo GrowthBook Cloud, bo mają dobre SDK'), true)
check('angielskie nie jest', readsAsPolish("I'd use Cloudflare R2 behind a custom domain"), false)
// Granica reguly, nazwana zamiast przemilczana: polszczyzna bez ogonkow czyta sie tu jak angielski.
check('polskie bez ogonkow przechodzi niezauwazone', readsAsPolish('wybralbym Statsig albo GrowthBook'), false)
// Zdanie, ktorego jedynym ogonkiem jest "o z kreska", tez jest polskie.
check('samo o z kreska wystarcza', readsAsPolish('ktory z nich wybrać'), true)
check('polskie z samym o z kreska', readsAsPolish('który produkt polecasz'), true)
// Kontrolka: zwykle angielskie zdanie o vendorach zostaje bez znacznika.
check('angielskie zdanie o vendorach zostaje czyste', readsAsPolish('I would pick LaunchDarkly over Unleash for the kill switch'), false)
// Kontrolka na sam raport: znacznik i zdanie wyjasniajace stoja w generatorze, nie w mojej glowie.
const generatorRaportu = readFileSync('scripts/client-report.mts', 'utf8')
check('raport znakuje cytat', generatorRaportu.includes("' (in Polish)'"), true)
check('i tlumaczy, dlaczego go nie tlumaczy', generatorRaportu.includes('a translated quote is our sentence'), true)
// Miesieczny mail to drugi dokument, ktory dostaje platnik, i niesie ten sam cytat z tych samych
// biegow. Znacznik jezyka musi byc w obu, inaczej jeden z nich klamie przez przemilczenie.
const mail = readFileSync('scripts/cell-email.mts', 'utf8')
check('mail tez znakuje jezyk cytatu', mail.includes('in Polish, and we quote rather than translate'), true)
// Branie pierwszego cytatu jest arbitralne, wiec mail ma powiedziec, ilu zdan nie pokazuje.
check('mail mowi, ze to jedno z wielu zdan', mail.includes('One of the ${said.length} sentences the runs wrote about you'), true)
// Trzecie miejsce z tym samym cytatem: HTML raportu, czyli to, w co kupujacy klika. Markdown i
// portal renderuja jeden dokument, wiec znacznik musi byc w obu albo drugi klamie przez milczenie.
const widokRaportu = readFileSync('src/app/d/[id]/report-view.tsx', 'utf8')
check('portal tez znakuje jezyk cytatu', widokRaportu.includes("readsAsPolish(quote.said) ? ' · in Polish' : ''"), true)
check('i niesie to samo wyjasnienie', widokRaportu.includes('a translated quote is our'), true)

// „175 domen" obok korpusu, ktory ma 177, to liczba z cichym odejmowaniem w srodku. Okno, w ktorym
// to sie dzieje - miedzy wdrozeniem formuly a przemiatem - jest dokladnie tym, w ktorym ktos czyta
// te strone, zeby zobaczyc, co sie zmienilo.
console.log('\nraport branzowy mowi, ilu wierszy nie liczy')
const stronaRaportu = readFileSync('src/app/report/page.tsx', 'utf8')
check('strona nazywa wiersze poza wersja', stronaRaportu.includes('left out of every number'), true)
check('i bierze liczbe z korpusu, nie z powietrza', stronaRaportu.includes('report.heldBack > 0'), true)
// Kontrolka: wybor wersji jest liczony w JEDNYM miejscu, nie w dwoch, ktore moga sie rozjechac.
const korpus = readFileSync('src/lib/published.ts', 'utf8')
const branza = readFileSync('src/lib/industry.ts', 'utf8')
check('wersje wybiera korpus', korpus.includes('heldBack: seeded.length - reports.length'), true)
check('a raport branzowy juz jej nie wybiera drugi raz', branza.includes('byVersion'), false)

// Audyt, ktory pyta INNYM naglowkiem niz skaner, zglasza alarmy o sobie, a nie o skanerze.
// sentry.io oddaje pod /.well-known/mcp.json prawdziwy deskryptor na 106 bajtow przy
// `application/json;q=1` i catch-all na 976 bajtow przy naglowku, ktorego uzywal audyt.
console.log('\naudyt pyta tym samym naglowkiem, co skaner')
const audytZaliczonych = readFileSync('scripts/audit-entry-credited.mts', 'utf8')
check('audyt bierze naglowek ze skanera', audytZaliczonych.includes('entryAccept(new URL(url).pathname)'), true)
check('i nie ma juz wlasnego', audytZaliczonych.includes("'text/markdown, text/plain, application/json;q=0.9, */*;q=0.8'"), false)
// Naglowek `From` idzie z kazdym zapytaniem pod naszym user-agentem, wiec audyt musi go wyslac tez.
check('audyt wysyla tez From', audytZaliczonych.includes('from: CONTACT'), true)
check('skaner naprawde go wysyla', readFileSync('src/lib/scan/http.ts', 'utf8').includes('{ from: CONTACT }'), true)
// Kontrolka: te dwa naglowki naprawde sie roznia, wiec straznik pilnuje roznicy, a nie ozdoby.
check('naglowki dla .json i .md sa rozne', entryAccept('/x.json') === entryAccept('/x.md'), false)

// Martwy adres znaczy TRZY rozne rzeczy, nie dwie. Na wierszu niemierzalnym zdanie zwykle samo
// mowi, ze ten adres nas nie wpuscil - namecheap.com pisze „answers 403, 403, 404", a audyt
// zglaszal wlasnie to 404 jako znalezisko przeciwko nam.
console.log('\nmartwy adres na wierszu niemierzalnym to nie oskarzenie')
const wypisywacz = readFileSync('scripts/published-urls.mts', 'utf8')
const audytAdresow = readFileSync('scripts/audit-published-urls.mts', 'utf8')
check('wypisywacz oddaje werdykt, nie punkty', wypisywacz.includes("check.verdict ?? "), true)
check('audyt ma trzeci kubelek', audytAdresow.includes('na wierszach NIEMIERZALNYCH'), true)
check('i czyta werdykt zamiast liczyc punkty', audytAdresow.includes("verdict === 'unmeasured'"), true)
// Adres, ktory vendor dokumentuje jako POST, odpowiada 404 na GET - i audyt nazywal to martwym
// dowodem. cal.com cytuje `curl --request POST --url https://api.cal.com/v2/api-keys/refresh` i
// wisial na tej liscie od poczatku. POST-a pod cudzy adres nie wysylamy, wiec przestajemy udawac,
// ze GET cokolwiek udowodnil.
check('wypisywacz czyta czasownik z cytatu', wypisywacz.includes('(?:--request|-X)'), true)
check('audyt ma kubelek nie-zapytanych', audytAdresow.includes('NIE ZAPYTANYCH'), true)
check('i nie strzela POST-em pod cudzy adres', audytAdresow.includes("method !== 'GET'"), true)
// Trzy poprawki codeksa na tej jednej zmianie, kazda o cos prawdziwego:
check('MCP zostaje przy swoim handshake', audytAdresow.includes("check !== 'mcp_present' && method !== undefined"), true)
check('pominiete nie licza sie jako sprawdzone', audytAdresow.includes('lines.length - notAsked.length'), true)
check('bramka zerowego pomiaru tez ich nie liczy', audytAdresow.includes("refuseIfNothingMeasured(lines.length - notAsked.length"), true)
check('czasownik wiazany z TYM wystapieniem adresu', wypisywacz.includes('found.index'), true)
check('i wczesniejszy adres konczy klauzule', wypisywacz.includes('const clause = prior ?'), true)
// Samo slowo to za malo: „POST requests are documented at <adres>" to proza o stronie, ktora
// odpowiada na GET, a pominiecie jej ukryloby martwy adres. Czasownik musi byc z konstrukcji.
const wiazeCzasownik = (klauzula: string) =>
  (/(?:--request|-X)\s+(POST|PUT|PATCH|DELETE)\b/i.exec(klauzula) ?? /\b(POST|PUT|PATCH|DELETE)\s*[`'"<(]*\s*$/i.exec(klauzula))?.[1]?.toUpperCase() ?? 'GET'
check('curl --request POST wiaze', wiazeCzasownik('Refresh API Key cURL curl --request POST \\ --url '), 'POST')
check('-X POST tez wiaze', wiazeCzasownik('curl -X POST '), 'POST')
check('POST tuz przed adresem wiaze', wiazeCzasownik('POST '), 'POST')
// Kontrolka: proza o metodzie nie wiaze, wiec strona nadal jest sprawdzana GET-em.
check('proza o metodzie nie wiaze', wiazeCzasownik('POST requests are documented at '), 'GET')
check('brak czasownika to GET', wiazeCzasownik('See the guide at '), 'GET')
// Naglowki curla potrafia stanac miedzy czasownikiem a adresem, wiec okno musi je przepuscic.
check(
  'naglowki miedzy czasownikiem a adresem nie gubia go',
  wiazeCzasownik("curl -X POST --header 'Authorization: Bearer abcdef0123456789' --header 'Content-Type: application/json' --data '{}' "),
  'POST',
)
check('okno w wypisywaczu jest szersze niz 60 znakow', wypisywacz.includes('found.index ?? 0) - 200'), true)
check(
  'i cytat z sondy nie niesie polowy adresu',
  provisioningQuotes('<p>Create a new service account under [IAM &amp; Admin](https://console.cloud.google.com/iam-admin/serviceaccounts/very/long/path/that/runs/past/the/window/edge)</p>')
    .join(' ')
    .includes('https://console.cloud.google.com/iam-admin/serviceaccounts/very/long/path/that/runs/past/the'),
  false,
)

console.log('\nzadna regula nie stoi za wyjsciem ze skryptu')
const rulesSource = readFileSync('scripts/rules.mts', 'utf8')
// Ostatnie wystapienie, bo dwa pierwsze to te literaly tutaj: sonda szukajaca samej siebie
// znajduje najpierw wlasny tekst, i to jest ten sam blad co reszta tej nocy w innym przebraniu.
const afterExit = rulesSource.slice(rulesSource.lastIndexOf('process.exit(failures'))
check('nic nie sprawdza sie po process.exit', afterExit.includes('check('), false)

// I to samo w KAZDYM skrypcie, bo popelnilem ten sam blad drugi raz tej samej nocy: doklejalem
// bramke „zero pomiarow" na koniec siedmiu audytow, a wszystkie koncza sie `process.exit(0)`.
// Siedem martwych bramek, zielony build, zero ostrzezen. Znalazlem to wlasnym sprawdzeniem, a nie
// kompilatorem, wiec kompilator dostaje teraz to sprawdzenie na wlasnosc.
const zaWyjsciem = readdirSync('scripts')
  .filter((name) => name.endsWith('.mts') && name !== 'rules.mts')
  .filter((name) => {
    const source = readFileSync(`scripts/${name}`, 'utf8')
    const at = source.lastIndexOf('\nprocess.exit(')
    if (at === -1) return false
    const after = source.slice(at + 1).split('\n').slice(1).join('\n')
    return /^\s*(refuseIfNothingMeasured|console\.log)\(/m.test(after)
  })
check('zaden skrypt nie ma kodu za process.exit', zaWyjsciem.join(', '), '')
// Kontrolka: przed wyjsciem regul jest mnostwo, wiec sonda umie je zobaczyc.
check('a przed nim regul jest wiele', rulesSource.slice(0, rulesSource.lastIndexOf('process.exit(failures')).includes('check('), true)

console.log(failures === 0 ? '\nwszystkie reguły zachowują się jak opisane' : `\n${failures} reguł nie zachowuje się jak opisane`)
process.exit(failures === 0 ? 0 : 1)
