/**
 * The CLI agents both kinds of run invoke, in one place because a build run and a discovery run
 * have to be able to say they used the same tool. Split out of run.mts on 2026-08-16, unchanged.
 *
 * Every agent here runs on a subscription rather than an API key. That is cheaper and it is also
 * a stated limit of anything published from it: a stranger holding no accounts cannot reproduce
 * the run.
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export type Agent = {
  bin: string
  /** Non-interactive invocation. Each CLI spells "do not ask me anything" differently. */
  argv: (prompt: string, model?: string) => string[]
  version: () => string
  /**
   * The same invocation with the operator's own configuration shut out: no CLAUDE.md, no hooks,
   * no skills. Measured 2026-08-16, and it is not optional politeness. The first discovery cell
   * came back in Polish because the machine's user-level CLAUDE.md says to answer in Polish, so
   * every run had read instructions that had nothing to do with the question. A run that inherits
   * whoever ran it is not a measurement of what an agent does.
   *
   * It costs a key: this mode reads ANTHROPIC_API_KEY and never the keychain, so a subscription
   * cannot use it. Isolating CLAUDE_CONFIG_DIR instead was tried first and logs the run out.
   */
  clean?: { needs: string; argv: (prompt: string, model?: string) => string[] }
  /**
   * The instruction files THIS tool reads before it reads the question. Per agent, because they
   * do not share them: codex reads AGENTS.md and never sees a CLAUDE.md, so reporting one against
   * a codex run would be a lie in the opposite direction from the one this field exists to catch.
   */
  contextFiles: (runDir: string) => string[]
}

/** Every ancestor of the run directory, so a file two levels up is not missed. */
function upwards(from: string, name: string): string[] {
  const found: string[] = []
  for (let at = from; at !== dirname(at); at = dirname(at)) {
    const candidate = join(at, name)
    if (existsSync(candidate)) found.push(candidate)
  }
  return found
}

const ifThere = (...paths: string[]) => paths.filter((path) => existsSync(path))

function firstLine(bin: string, args: string[]): string {
  try {
    return execFileSync(bin, args, { encoding: 'utf8' }).trim().split('\n')[0]
  } catch {
    return 'unknown'
  }
}

export const AGENTS: Record<string, Agent> = {
  claude: {
    bin: 'claude',
    argv: (prompt, model) => ['-p', prompt, ...(model ? ['--model', model] : [])],
    version: () => firstLine('claude', ['--version']),
    clean: {
      needs: 'ANTHROPIC_API_KEY',
      argv: (prompt, model) => ['--bare', '-p', prompt, ...(model ? ['--model', model] : [])],
    },
    contextFiles: (dir) => [...ifThere(join(homedir(), '.claude', 'CLAUDE.md')), ...upwards(dir, 'CLAUDE.md')],
  },
  codex: {
    bin: 'codex',
    // exec is codex's non-interactive mode; the sandbox flag is what stops it stopping.
    argv: (prompt, model) => ['exec', '--sandbox', 'workspace-write', ...(model ? ['-m', model] : []), prompt],
    version: () => firstLine('codex', ['--version']),
    // No CLAUDE.md here, which is the point of running a cell twice: a finding that survives two
    // tools reading two different sets of the operator's files is a finding about the vendors.
    // The memory database is listed because it is context we did not write for this question.
    contextFiles: (dir) => [
      ...ifThere(join(homedir(), '.codex', 'AGENTS.md'), join(homedir(), '.codex', 'memories_1.sqlite')),
      ...upwards(dir, 'AGENTS.md'),
    ],
  },
  gemini: {
    bin: 'gemini',
    argv: (prompt, model) => ['-p', prompt, '--approval-mode', 'yolo', ...(model ? ['-m', model] : [])],
    version: () => firstLine('gemini', ['--version']),
    contextFiles: (dir) => [...ifThere(join(homedir(), '.gemini', 'GEMINI.md')), ...upwards(dir, 'GEMINI.md')],
  },
  cursor: {
    bin: 'cursor-agent',
    argv: (prompt, model) => ['-p', prompt, '--force', ...(model ? ['--model', model] : [])],
    version: () => firstLine('cursor-agent', ['--version']),
    contextFiles: (dir) => [...upwards(dir, 'AGENTS.md'), ...upwards(dir, '.cursorrules')],
  },
}
