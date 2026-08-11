import { crawlDelayForAgents, parseRobots } from '../src/lib/scan/robots'
import { thinnerForAgents } from '../src/lib/scan'
import {
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

console.log(failures === 0 ? '\nwszystkie reguły zachowują się jak opisane' : `\n${failures} reguł nie zachowuje się jak opisane`)
process.exit(failures === 0 ? 0 : 1)
