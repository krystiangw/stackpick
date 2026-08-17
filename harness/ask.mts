/**
 * Runs one discovery cell: the same question, to one agent on one model, N times in isolation.
 *
 *   npm run ask -- file-storage claude 5
 *   npm run ask -- file-storage cursor auto 5
 *
 * A build run (`npm run cell`) hands an agent a scaffold and asks it to ship an integration, which
 * takes minutes to hours and is the audit deliverable. This asks one question and keeps the
 * answer: who gets named, who gets chosen, in what words. That is seconds, it touches nobody's
 * signup form, and it is the half that can be repeated every month for a domain whose owner never
 * asked us to look at them.
 *
 * The rules from the build harness apply unchanged, and for the same reasons: one question
 * verbatim to every run, one isolated directory per run, the model version recorded, and the
 * reading done separately by `npm run asked` rather than by the run itself.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { AGENTS } from './agents.mjs'

/** A question that has not answered in five minutes is a broken run, not a vendor's problem. */
const TIMEOUT_MS = Number(process.env.ASK_TIMEOUT_MS ?? 300_000)

const [category, agentName, ...rest] = process.argv.slice(2)
const model = rest.length > 1 ? rest[0] : undefined
const runs = Number(rest[rest.length - 1] ?? '5')
const agent = AGENTS[agentName]

if (!category || !agent || !Number.isInteger(runs) || runs < 1) {
  console.error('usage: npm run ask -- <category> <agent> [model] <runs>')
  console.error(`agents: ${Object.keys(AGENTS).join(', ')}`)
  process.exit(2)
}

const root = new URL('.', import.meta.url).pathname
const askFile = join(root, 'asks', `${category}.md`)
// Refusing rather than inventing one. A question written at call time is a question nobody can
// reproduce, and it is the variable that decides the whole answer.
if (!existsSync(askFile)) {
  console.error(`no question at harness/asks/${category}.md, and a run without one is not a cell`)
  process.exit(1)
}
const question = readFileSync(askFile, 'utf8').trim()

const clean = agent.clean && process.env[agent.clean.needs] ? agent.clean : null
if (!clean && agent.clean) {
  console.log(`uwaga: bez ${agent.clean.needs} bieg czyta konfiguracje tej maszyny, wiec nie jest czystym pomiarem`)
}

const target = join(process.env.LETAGENTSIN_RUNS ?? join(homedir(), '.letagentsin-runs'), 'ask', category)
if (existsSync(target)) rmSync(target, { recursive: true })
mkdirSync(target, { recursive: true })

const version = agent.version()
console.log(`ask: ${category} x ${agentName}${model ? ` (${model})` : ''} x ${runs}, ${agent.bin} ${version}`)

for (let run = 1; run <= runs; run++) {
  const dir = join(target, `run-${run}`)
  mkdirSync(dir)
  // An empty directory with a git root of its own, so an agent looking for context finds nothing
  // and answers the question instead of the repository it is standing in. A discovery run seeded
  // inside this project would read the corpus it is meant to be independent of.
  execFileSync('git', ['init', '--quiet'], { cwd: dir })
  writeFileSync(join(dir, 'ASK.md'), `${question}\n`)

  const startedAt = new Date().toISOString()
  const result = spawnSync(agent.bin, (clean ?? agent).argv(question, model), {
    cwd: dir,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
    maxBuffer: 64 * 1024 * 1024,
    // Closed stdin, not an inherited one. `codex exec` prints "Reading additional input from
    // stdin" and waits when it is left open, so the run burns its whole timeout without ever
    // answering the question.
    input: '',
  })
  const answer = result.stdout ?? ''
  writeFileSync(join(dir, 'ANSWER.txt'), answer)
  writeFileSync(join(dir, 'STDERR.txt'), result.stderr ?? '')
  writeFileSync(
    join(dir, 'RUN.json'),
    `${JSON.stringify(
      {
        category,
        run,
        agent: agentName,
        cli: `${agent.bin} ${version}`,
        model: model ?? 'default',
        auth: clean ? 'api-key' : 'subscription',
        cleanRoom: Boolean(clean),
        operatorContext: clean ? [] : agent.contextFiles(dir),
        toolSettings: agent.settings?.() ?? [],
        startedAt,
        finishedAt: new Date().toISOString(),
        exitCode: result.status,
        // A run killed by the clock says nothing about who an agent names, so it is excluded from
        // the denominator rather than counted as an answer that named nobody.
        timedOut: result.signal === 'SIGTERM' || result.error?.name === 'AbortError',
      },
      null,
      2,
    )}\n`,
  )
  console.log(`  run-${run}: exit ${result.status}, ${(answer.length / 1024).toFixed(1)} kB`)
}

console.log(`\nNow read who was named, by rule rather than by asking a model: npm run asked -- ${category}`)
