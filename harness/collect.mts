/**
 * What each run actually shipped, read from the files it left behind.
 *
 *   npm run collect -- editors
 *
 * It never reads the run's own account of what it did. In the storage study a run reported a
 * working payment interface that the bundler had silently dropped, and the artefacts are the only
 * reason we know. The transcript says what an agent believed; `package.json` says what it did.
 *
 * The output is the first column of the audit table and nothing more. Which vendor was rejected
 * and in what words is not in these files, and inferring it from a dependency list would be
 * inventing the most quotable part of the report.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const [category] = process.argv.slice(2)
if (!category) {
  console.error('usage: npm run collect -- <category>')
  process.exit(2)
}

const runsDir = join(process.env.STACKPICK_RUNS ?? join(homedir(), '.stackpick-runs'), category)
if (!existsSync(runsDir)) {
  console.error(`no runs at ${runsDir}. Seed them first.`)
  process.exit(1)
}

type Shipped = {
  run: string
  dependencies: string[]
  /** Packages imported by source files, which is what the run actually wired up. */
  imported: string[]
  /** Declared but never imported: installed, then abandoned or replaced. */
  installedNotUsed: string[]
  filesTouched: number
}

const SOURCE = /\.(?:tsx?|jsx?|mjs|cjs|svelte|vue)$/
const BARE_IMPORT = /(?:from|import|require\()\s*['"]([^'".][^'"]*)['"]/g

const sourceFiles = (dir: string, found: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git' || entry === 'dist' || entry === '.next') continue
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) sourceFiles(path, found)
    else if (SOURCE.test(entry)) found.push(path)
  }
  return found
}

/** `@scope/name/deep/path` and `name/sub` both resolve to one installed package. */
const packageOf = (specifier: string) =>
  specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0]

const collected: Shipped[] = []

for (const run of readdirSync(runsDir).filter((name) => name.startsWith('run-')).sort()) {
  const dir = join(runsDir, run)
  const manifestPath = join(dir, 'package.json')
  if (!existsSync(manifestPath)) continue
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    dependencies?: Record<string, string>
  }
  const dependencies = Object.keys(manifest.dependencies ?? {}).sort()

  const files = sourceFiles(dir)
  const imported = new Set<string>()
  for (const file of files) {
    for (const match of readFileSync(file, 'utf8').matchAll(BARE_IMPORT)) {
      const name = packageOf(match[1])
      if (dependencies.includes(name)) imported.add(name)
    }
  }

  collected.push({
    run,
    dependencies,
    imported: [...imported].sort(),
    installedNotUsed: dependencies.filter((name) => !imported.has(name)),
    filesTouched: files.length,
  })
}

for (const shipped of collected) {
  console.log(`${shipped.run}: ${shipped.imported.join(', ') || '(imported nothing new)'}`)
  if (shipped.installedNotUsed.length > 0) {
    // The interesting column. A package installed and never imported is a decision the run
    // reversed, and reversals are where the disagreement between runs usually lives.
    console.log(`  installed and never imported: ${shipped.installedNotUsed.join(', ')}`)
  }
}

const chosen = new Map<string, number>()
for (const shipped of collected) {
  for (const name of shipped.imported) chosen.set(name, (chosen.get(name) ?? 0) + 1)
}
console.log(`\n${collected.length} runs. Imported across runs:`)
for (const [name, count] of [...chosen.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(2)} / ${collected.length}  ${name}`)
}
console.log('\nWhat this cannot tell you: why anything was rejected, and in whose words.')
console.log('That is in the transcripts, and reading them is the part of the audit that is sold.')
