/**
 * Isolated copies of a scaffold, one per run.
 *
 *   npm run seed -- editors 6
 *
 * Round one of the editors study shared one working directory between six agents and had to be
 * thrown away: they read each other's edits and the runs stopped being independent. Nothing here
 * is clever, and that is the point. What it guarantees is that no run can see another one.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [category, count = '4'] = process.argv.slice(2)
const runs = Number(count)

if (!category || !Number.isInteger(runs) || runs < 1) {
  console.error('usage: npm run seed -- <category> <runs>')
  console.error(`categories: ${listCategories().join(', ') || '(none in harness/scaffolds yet)'}`)
  process.exit(2)
}

const root = new URL('.', import.meta.url).pathname
const scaffold = join(root, 'scaffolds', category)
const brief = join(root, 'briefs', `${category}.md`)
const target = join(root, 'runs', category)

function listCategories(): string[] {
  try {
    return readdirSync(join(new URL('.', import.meta.url).pathname, 'scaffolds'))
  } catch {
    return []
  }
}

if (!existsSync(scaffold)) {
  console.error(`no scaffold at harness/scaffolds/${category}`)
  process.exit(1)
}
// Refusing rather than defaulting: a run that received no brief, or a brief written on the fly,
// is not comparable with the others and nothing downstream can detect that afterwards.
if (!existsSync(brief)) {
  console.error(`no brief at harness/briefs/${category}.md, and a run without one is not a cell`)
  process.exit(1)
}

// Wiping is the only destructive thing here and it is confined to generated directories.
if (existsSync(target)) rmSync(target, { recursive: true })
mkdirSync(target, { recursive: true })

for (let run = 1; run <= runs; run++) {
  const dir = join(target, `run-${run}`)
  // node_modules and .git are per-run state: copying them would share resolution and history
  // between runs, which is the contamination this script exists to prevent.
  cpSync(scaffold, dir, {
    recursive: true,
    filter: (path) => !/[/\\](?:node_modules|\.git|dist|\.next)(?:[/\\]|$)/.test(path),
  })
  cpSync(brief, join(dir, 'BRIEF.md'))
  writeFileSync(
    join(dir, 'RUN.json'),
    `${JSON.stringify({ category, run, seededAt: new Date().toISOString() }, null, 2)}\n`,
  )
}

console.log(`seeded ${runs} isolated copies of ${category} in harness/runs/${category}`)
console.log('the brief is at BRIEF.md inside each copy, identical in all of them')
