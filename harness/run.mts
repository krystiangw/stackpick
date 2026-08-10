/**
 * Runs one cell: the same brief, to one agent on one model, in N isolated copies.
 *
 *   npm run cell -- editors codex 3
 *   npm run cell -- editors cursor claude-opus-5-thinking-high 3
 *
 * A cell is (agent x model x brief). Comparing across cells is the whole experiment, so the thing
 * this script exists to guarantee is that only one of those three ever varies. It writes what it
 * actually invoked into each run directory, including the CLI version, because "we ran Opus" is
 * not a record anybody can check and a model change between an audit and its re-measure is a
 * confound that has to be reported rather than discovered later.
 *
 * Every agent here runs on a subscription rather than an API key. That is cheaper and it is also
 * a stated limit of any audit produced this way: the run is not reproducible by a stranger who
 * does not hold the same accounts.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

type Agent = {
  bin: string
  /** Non-interactive invocation. Each CLI spells "do not ask me anything" differently. */
  argv: (prompt: string, model?: string) => string[]
  version: () => string
}

const AGENTS: Record<string, Agent> = {
  claude: {
    bin: 'claude',
    argv: (prompt, model) => ['-p', prompt, ...(model ? ['--model', model] : [])],
    version: () => run('claude', ['--version']),
  },
  codex: {
    bin: 'codex',
    // exec is codex's non-interactive mode; the sandbox flag is what stops it stopping.
    argv: (prompt, model) => ['exec', '--sandbox', 'workspace-write', ...(model ? ['-m', model] : []), prompt],
    version: () => run('codex', ['--version']),
  },
  gemini: {
    bin: 'gemini',
    argv: (prompt, model) => ['-p', prompt, '--approval-mode', 'yolo', ...(model ? ['-m', model] : [])],
    version: () => run('gemini', ['--version']),
  },
  cursor: {
    bin: 'cursor-agent',
    argv: (prompt, model) => ['-p', prompt, '--force', ...(model ? ['--model', model] : [])],
    version: () => run('cursor-agent', ['--version']),
  },
}

function run(bin: string, args: string[]): string {
  try {
    return execFileSync(bin, args, { encoding: 'utf8' }).trim().split('\n')[0]
  } catch {
    return 'unknown'
  }
}

const [category, agentName, ...rest] = process.argv.slice(2)
const model = rest.length > 1 ? rest[0] : undefined
const runs = Number(rest[rest.length - 1] ?? '3')
const agent = AGENTS[agentName]

if (!category || !agent || !Number.isInteger(runs) || runs < 1) {
  console.error('usage: npm run cell -- <category> <agent> [model] <runs>')
  console.error(`agents: ${Object.keys(AGENTS).join(', ')}`)
  process.exit(2)
}

const runsDir = join(process.env.STACKPICK_RUNS ?? join(homedir(), '.stackpick-runs'), category)
if (!existsSync(runsDir)) {
  console.error(`no runs at ${runsDir}. Seed them first: npm run seed -- ${category} ${runs}`)
  process.exit(1)
}

const copies = readdirSync(runsDir)
  .filter((name) => name.startsWith('run-'))
  .sort()
if (copies.length < runs) {
  console.error(`${copies.length} copies seeded, ${runs} asked for. Reseed rather than reusing a dirty copy.`)
  process.exit(1)
}

const version = agent.version()
console.log(`cell: ${category} x ${agentName}${model ? ` (${model})` : ''} x ${runs} runs, ${agent.bin} ${version}`)

for (const copy of copies.slice(0, runs)) {
  const dir = join(runsDir, copy)
  // The brief verbatim, from the file the seeder placed. Never assembled here: a prompt built at
  // call time is a prompt nobody can reproduce, and the brief is the variable that decides
  // whether documentation gets read at all.
  const brief = readFileSync(join(dir, 'BRIEF.md'), 'utf8')
  const startedAt = new Date().toISOString()
  const result = spawnSync(agent.bin, agent.argv(brief, model), {
    cwd: dir,
    encoding: 'utf8',
    // No timeout on purpose. A run cut off part way looks in the artefacts exactly like a run
    // that chose to stop, and those are opposite findings.
    maxBuffer: 64 * 1024 * 1024,
  })

  writeFileSync(
    join(dir, 'TRANSCRIPT.txt'),
    `${result.stdout ?? ''}\n--- stderr ---\n${result.stderr ?? ''}`,
  )
  const record = {
    ...(JSON.parse(readFileSync(join(dir, 'RUN.json'), 'utf8')) as object),
    agent: agentName,
    cli: `${agent.bin} ${version}`,
    model: model ?? 'default',
    auth: 'subscription',
    startedAt,
    finishedAt: new Date().toISOString(),
    exitCode: result.status,
  }
  writeFileSync(join(dir, 'RUN.json'), `${JSON.stringify(record, null, 2)}\n`)
  console.log(`  ${copy}: exit ${result.status}, transcript ${((result.stdout ?? '').length / 1024).toFixed(1)} kB`)
}

console.log(`\nNow read what shipped from the files, not from the transcripts: npm run collect -- ${category}`)
