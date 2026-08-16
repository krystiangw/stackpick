/**
 * The CLI agents both kinds of run invoke, in one place because a build run and a discovery run
 * have to be able to say they used the same tool. Split out of run.mts on 2026-08-16, unchanged.
 *
 * Every agent here runs on a subscription rather than an API key. That is cheaper and it is also
 * a stated limit of anything published from it: a stranger holding no accounts cannot reproduce
 * the run.
 */
import { execFileSync } from 'node:child_process'

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
}

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
  },
  codex: {
    bin: 'codex',
    // exec is codex's non-interactive mode; the sandbox flag is what stops it stopping.
    argv: (prompt, model) => ['exec', '--sandbox', 'workspace-write', ...(model ? ['-m', model] : []), prompt],
    version: () => firstLine('codex', ['--version']),
  },
  gemini: {
    bin: 'gemini',
    argv: (prompt, model) => ['-p', prompt, '--approval-mode', 'yolo', ...(model ? ['-m', model] : [])],
    version: () => firstLine('gemini', ['--version']),
  },
  cursor: {
    bin: 'cursor-agent',
    argv: (prompt, model) => ['-p', prompt, '--force', ...(model ? ['--model', model] : [])],
    version: () => firstLine('cursor-agent', ['--version']),
  },
}
