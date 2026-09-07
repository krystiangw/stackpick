/** Freeze discovery answers. --append preserves historical cells; --out permits a review file. */
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { CATEGORIES } from '../src/lib/categories'
import { appendDiscoveryCells, discoveryCell, type DiscoveryCell, type DiscoveryRun } from '../src/lib/discovery-cell'
export type Cell = DiscoveryCell

const args = process.argv.slice(2)
const outIndex = args.indexOf('--out')
if (outIndex >= 0 && !args[outIndex + 1]) throw new Error('--out requires a path')
const destination = outIndex >= 0 ? args[outIndex + 1] : 'src/data/cells.json'
const roots = [...new Set((process.env.LETAGENTSIN_RUNS_ALL ?? '').split(':').filter(Boolean)
  .concat(process.env.LETAGENTSIN_RUNS ?? join(homedir(), '.letagentsin-runs')))]
const cells: Cell[] = []
for (const category of CATEGORIES) for (const root of roots) {
  const directory = join(root, 'ask', category.id)
  if (!existsSync(directory)) continue
  const runs: DiscoveryRun[] = readdirSync(directory).filter(name => name.startsWith('run-')).sort().flatMap(name => {
    const path = join(directory, name)
    if (!existsSync(join(path, 'RUN.json')) || !existsSync(join(path, 'ANSWER.txt'))) throw new Error(`${category.id}/${name}: unfinished run`)
    if (!existsSync(join(path, 'ASK.md'))) throw new Error(`${category.id}/${name}: missing original question`)
    return [{ question: readFileSync(join(path, 'ASK.md'), 'utf8'), answer: readFileSync(join(path, 'ANSWER.txt'), 'utf8'), meta: JSON.parse(readFileSync(join(path, 'RUN.json'), 'utf8')) }]
  })
  const cell = discoveryCell(category, runs)
  console.log(`${category.id}: ${cell?.runs ?? 0}/${runs.length} completed answers, ${runs.length - (cell?.runs ?? 0)} excluded`)
  if (cell) cells.push(cell)
}
const held = args.includes('--append') ? JSON.parse(readFileSync('src/data/cells.json', 'utf8')) as Cell[] : []
const result = appendDiscoveryCells(held, cells)
mkdirSync(dirname(destination), { recursive: true })
writeFileSync(destination, `${JSON.stringify(result, null, 2)}\n`)
console.log(`${result.length} batches written; ${held.length} historical batches preserved.`)
