import { readFileSync } from 'node:fs'
import { categoryForJob } from '../src/lib/lookup'
import { FRESH_QUESTIONS } from './routing-questions'
import { crawlDelayForAgents, parseRobots } from '../src/lib/scan/robots'
import { thinnerForAgents } from '../src/lib/scan'
import { declaredSpecs } from '../src/lib/scan/machine'
import { changesBetween, comparableScorecards } from '../src/lib/watch'
import { CHECKS } from '../src/lib/score'
import { isEdgeRefusal, hintRank, CREDENTIAL_PAGE_HINTS } from '../src/lib/scan'
import { rendersUsableForm } from '../src/lib/scan/funnel'
import { SIGNUP_HINTS, NOT_WHERE_ACCOUNTS_ARE_MADE, bestReadable } from '../src/lib/scan/discover'
import {
  provisioningMatches,
  BOT_DEFENCE_RULES,
  PROVISIONING_RULES,
  SELF_SERVE_PATTERNS,
  describesAProcedure,
  everyFreeSignalIsAButton,
  everyFreeSignalIsAQuestion,
} from '../src/lib/scan/funnel'

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
for (const question of FRESH_QUESTIONS) {
  const got = categoryForJob(question.asked)?.id ?? null
  if (got !== null) answered += 1
  if (got === question.expect) right += 1
  else if (got === null) silent += 1
  else if (question.expect === null) shouldHaveRefused += 1
  else wrongCategory += 1
}
const described = readFileSync('src/app/mcp/route.ts', 'utf8')
const quoted = (pattern: RegExp) => Number(described.match(pattern)?.[1] ?? -1)
check('pytań w zestawie odłożonym', FRESH_QUESTIONS.length, quoted(/Measured on (\d+) questions written before/))
check('odpowiedzi poprawnych', right, quoted(/it answered (\d+) correctly/))
check('milczeń tam, gdzie należało odpowiedzieć', silent, quoted(/said nothing on (\d+) it should have answered/))
check('złych kategorii', wrongCategory, quoted(/sent (\d+) to the wrong category/))
check('odpowiedzi tam, gdzie należało odmówić', shouldHaveRefused, quoted(/answered (\d+) that it should have refused/))
check('udzielonych odpowiedzi', answered, quoted(/it gave an answer to (\d+) of the/))
check('złych odpowiedzi razem', wrongCategory + shouldHaveRefused, quoted(/and (\d+) of those answers were wrong/))

console.log('obserwacja domeny, czyli co jest warte maila')
const verdict = (points: number, max: number, extra: Record<string, unknown> = {}) =>
  ({ id: 'a', label: 'a', stage: 'discovery', why: '', detail: 'x', points, max, ...extra }) as never
const moved = (before: never[], after: never[]) => changesBetween(before, after)
// The whole point of the alert: something the vendor passed last week now fails.
check('pass na fail to strata', moved([verdict(1, 1)], [verdict(0, 1)])[0]?.worse, true)
check('fail na pass to nie strata', moved([verdict(0, 1)], [verdict(1, 1)])[0]?.worse, false)
check('bez zmiany nie ma o czym pisac', moved([verdict(1, 1)], [verdict(1, 1)]).length, 0)
// A check going unmeasured is news, but it is usually about our reach and never called a loss.
check('przejscie w niemierzalne to nie oskarzenie', moved([verdict(1, 1)], [verdict(0, 1, { inconclusive: true })])[0]?.worse, false)
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
// Two list items whose words would form a false sentence if run together.
const dashboardList = `<ul><li>Click Generate key in the dashboard.</li><li>Management API</li></ul>`
check('dwie pozycje listy to nie jedno zdanie', provisioningMatches(dashboardList).includes('management api'), true)
// A heading is not a boundary, it is the subject of the sentence under it. mux.com, telnyx.com
// and stytch.com all document key creation this way, and a reseed with headings as boundaries
// lost every one of them.
const headingThenBody = '<h2>Create a signing key</h2><p>Send a POST to /system/v1/signing-keys.</p>'
check('naglowek i jego tresc to jedno', provisioningMatches(headingThenBody).length > 0, true)

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

console.log(failures === 0 ? '\nwszystkie reguły zachowują się jak opisane' : `\n${failures} reguł nie zachowuje się jak opisane`)
process.exit(failures === 0 ? 0 : 1)

