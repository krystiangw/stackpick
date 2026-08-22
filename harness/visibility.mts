/**
 * Runs the same discovery prompts in isolated directories and records whether the answer finds us.
 * This is deliberately a local/subscription job: GitHub Actions has none of the agent accounts,
 * and silently swapping them for API models would make the weekly series a different experiment.
 *
 *   pnpm visibility
 *   pnpm visibility -- --agents claude,codex,antigravity --limit 2
 *   pnpm visibility -- --with-pplx --limit 2
 *
 * Perplexity's official `pplx` CLI is a Search API client, not a subscription answer model. Its
 * source-discovery result is therefore stored as a separate search surface and never mixed into
 * the answer-agent denominator.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { AGENTS } from './agents.mjs'

type Prompt = { id: string; prompt: string }
const prompts = JSON.parse(readFileSync(new URL('./visibility-prompts.json', import.meta.url), 'utf8')) as Prompt[]
const args = process.argv.slice(2)
const valueAfter = (name: string) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}
const names = (valueAfter('--agents') ?? 'claude,codex,antigravity').split(',').filter(Boolean)
const limit = Number(valueAfter('--limit') ?? prompts.length)
if (!Number.isInteger(limit) || limit < 1 || names.some((name) => !AGENTS[name])) {
  console.error(`usage: pnpm visibility -- [--agents ${Object.keys(AGENTS).join(',')}] [--limit N]`)
  process.exit(2)
}

const date = new Date().toISOString().slice(0, 10)
const root = join(process.env.LETAGENTSIN_RUNS ?? join(homedir(), '.letagentsin-runs'), 'visibility', date)
const found = /\blet agents in\b|\bletagentsin\.com\b|\bstack[ -]?pick\b/i
const sourcePattern = /https?:\/\/[^\s)\]}>"']+/g
type VisibilityResult = { valid: boolean; mentioned: boolean; agent?: string; surface?: string; [key: string]: unknown }
const results: VisibilityResult[] = []

for (const name of names) {
  const agent = AGENTS[name]
  const version = agent.version()
  const resolvedModel = agent.defaultModel ?? 'default'
  for (const entry of prompts.slice(0, limit)) {
    const directory = join(root, name, entry.id)
    mkdirSync(directory, { recursive: true })
    // Codex refuses an untrusted directory. A private git root also stops every agent walking up
    // into this repository and learning the answer from the corpus it is meant to discover cold.
    execFileSync('git', ['init', '--quiet'], { cwd: directory })
    const startedAt = new Date().toISOString()
    const response = spawnSync(agent.bin, agent.argv(entry.prompt), {
      cwd: directory,
      encoding: 'utf8',
      input: '',
      timeout: 300_000,
      maxBuffer: 16 * 1024 * 1024,
    })
    const answer = response.stdout ?? ''
    const valid = response.status === 0 && answer.trim().length > 0
    const record = {
      date,
      promptId: entry.id,
      prompt: entry.prompt,
      agent: name,
      cli: `${agent.bin} ${version}`,
      model: resolvedModel,
      auth: 'subscription',
      operatorContext: agent.contextFiles(directory),
      toolSettings: agent.settings?.() ?? [],
      startedAt,
      finishedAt: new Date().toISOString(),
      exitCode: response.status,
      timedOut: response.signal === 'SIGTERM' || response.error?.name === 'AbortError',
      valid,
      mentioned: valid && found.test(answer),
      sources: [...new Set(answer.match(sourcePattern) ?? [])],
    }
    writeFileSync(join(directory, 'ANSWER.txt'), answer)
    writeFileSync(join(directory, 'STDERR.txt'), response.stderr ?? '')
    writeFileSync(join(directory, 'RUN.json'), `${JSON.stringify(record, null, 2)}\n`)
    results.push(record)
    console.log(
      `${name} ${entry.id}: ${valid ? (record.mentioned ? 'FOUND' : 'not found') : 'FAILED'} (${response.status ?? response.signal})`,
    )
  }
}

if (args.includes('--with-pplx')) {
  const version = spawnSync('pplx', ['--version'], { encoding: 'utf8' }).stdout?.trim() || 'unknown'
  for (const entry of prompts.slice(0, limit)) {
    const directory = join(root, 'pplx-search', entry.id)
    mkdirSync(directory, { recursive: true })
    const startedAt = new Date().toISOString()
    const response = spawnSync(
      'pplx',
      ['search', 'web', entry.prompt, '--limit', '10', '--intent', 'Find current sources that directly answer this product-discovery question'],
      { cwd: directory, encoding: 'utf8', input: '', timeout: 300_000, maxBuffer: 16 * 1024 * 1024 },
    )
    const answer = response.stdout ?? ''
    const valid = response.status === 0 && answer.trim().length > 0
    const record = {
      date,
      promptId: entry.id,
      prompt: entry.prompt,
      surface: 'perplexity-search-api',
      cli: `pplx ${version}`,
      auth: 'api-key',
      startedAt,
      finishedAt: new Date().toISOString(),
      exitCode: response.status,
      timedOut: response.signal === 'SIGTERM' || response.error?.name === 'AbortError',
      valid,
      mentioned: valid && found.test(answer),
      sources: [...new Set(answer.match(sourcePattern) ?? [])],
    }
    writeFileSync(join(directory, 'ANSWER.json'), answer)
    writeFileSync(join(directory, 'STDERR.txt'), response.stderr ?? '')
    writeFileSync(join(directory, 'RUN.json'), `${JSON.stringify(record, null, 2)}\n`)
    results.push(record)
    console.log(`pplx-search ${entry.id}: ${valid ? (record.mentioned ? 'FOUND' : 'not found') : 'FAILED'} (${response.status ?? response.signal})`)
  }
}

const answerResults = results.filter((entry) => 'agent' in entry)
const searchResults = results.filter((entry) => 'surface' in entry)
const valid = answerResults.filter((entry) => entry.valid).length
const mentioned = answerResults.filter((entry) => entry.mentioned).length
const searchValid = searchResults.filter((entry) => entry.valid).length
const searchMentioned = searchResults.filter((entry) => entry.mentioned).length
writeFileSync(
  join(root, 'SUMMARY.json'),
  `${JSON.stringify(
    {
      date,
      answerAgents: { mentioned, valid, attempted: answerResults.length },
      searchSurfaces: { mentioned: searchMentioned, valid: searchValid, attempted: searchResults.length },
      results,
    },
    null,
    2,
  )}\n`,
)
console.log(
  `\nAnswers: ${mentioned}/${valid} mentioned Let Agents In. Search: ${searchMentioned}/${searchValid}. Failed: ${results.length - valid - searchValid}. Records: ${root}`,
)
