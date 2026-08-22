/**
 * Runs the same discovery prompts in isolated directories and records whether the answer finds us.
 * This is deliberately a local/subscription job: GitHub Actions has none of the agent accounts,
 * and silently swapping them for API models would make the weekly series a different experiment.
 *
 *   pnpm visibility
 *   pnpm visibility -- --agents claude,codex,gemini --limit 2
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
const names = (valueAfter('--agents') ?? 'claude,codex,gemini').split(',').filter(Boolean)
const limit = Number(valueAfter('--limit') ?? prompts.length)
if (!Number.isInteger(limit) || limit < 1 || names.some((name) => !AGENTS[name])) {
  console.error(`usage: pnpm visibility -- [--agents ${Object.keys(AGENTS).join(',')}] [--limit N]`)
  process.exit(2)
}

const date = new Date().toISOString().slice(0, 10)
const root = join(process.env.LETAGENTSIN_RUNS ?? join(homedir(), '.letagentsin-runs'), 'visibility', date)
const found = /\blet agents in\b|\bletagentsin\.com\b|\bstack[ -]?pick\b/i
const sourcePattern = /https?:\/\/[^\s)\]}>"']+/g
const results: object[] = []

for (const name of names) {
  const agent = AGENTS[name]
  const version = agent.version()
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
      model: 'default',
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

const valid = results.filter((entry) => (entry as { valid: boolean }).valid).length
const mentioned = results.filter((entry) => (entry as { mentioned: boolean }).mentioned).length
writeFileSync(
  join(root, 'SUMMARY.json'),
  `${JSON.stringify({ date, mentioned, valid, attempted: results.length, results }, null, 2)}\n`,
)
console.log(`\n${mentioned}/${valid} valid answers mentioned Let Agents In; ${results.length - valid} failed. Records: ${root}`)
