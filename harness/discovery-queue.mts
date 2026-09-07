/** One isolated Cursor answer per day. No export, publication, email or paid upgrade. */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, openSync, closeSync, unlinkSync, renameSync, realpathSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { budgetDecision, isAccountLimit, type DiscoveryBudget } from '../src/lib/discovery-budget'
import { CATEGORIES } from '../src/lib/categories'

type State = DiscoveryBudget & { outputRoot: string; items: { category: string; questionSha256: string; needed: number }[]; pauseReason?: string }
const statePath = process.argv[2]
if (!statePath) throw new Error('usage: tsx harness/discovery-queue.mts STATE.json [--execute]')
const execute = process.argv.includes('--execute')
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const lock = `${statePath}.lock`
let fd: number
try { fd = openSync(lock, 'wx', 0o600) } catch { console.log('Queue is locked; no request made.'); process.exit(0) }
try {
  const state = JSON.parse(readFileSync(statePath, 'utf8')) as State
  mkdirSync(state.outputRoot, {recursive:true})
  const actualRoot = realpathSync(state.outputRoot)
  const actualRepo = realpathSync(repo)
  if (actualRoot === actualRepo || actualRoot.startsWith(actualRepo + '/')) throw new Error('Discovery sessions must live outside the product repository')
  const now = new Date()
  const decision = budgetDecision(state, now)
  const results = new Map<string, number>()
  if (existsSync(state.outputRoot)) for (const day of readdirSync(state.outputRoot)) {
    const ask = join(state.outputRoot, day, 'ask')
    if (!existsSync(ask)) continue
    for (const category of readdirSync(ask)) for (const name of readdirSync(join(ask, category))) {
      if (!name.startsWith('run-')) continue
      const path = join(ask, category, name)
      if (!existsSync(join(path, 'RUN.json')) || !existsSync(join(path, 'ANSWER.txt'))) continue
      const meta = JSON.parse(readFileSync(join(path, 'RUN.json'), 'utf8'))
      const item = state.items.find(item => item.category === category)
      if (!item) throw new Error('Unexpected category in queue output')
      const question = readFileSync(join(path, 'ASK.md'), 'utf8').trim()
      if (createHash('sha256').update(question).digest('hex') !== item.questionSha256 || meta.model !== 'auto' || meta.agent !== 'cursor') throw new Error('Queue evidence differs from the registered question or configuration')
      if (meta.exitCode === 0 && !meta.timedOut && readFileSync(join(path, 'ANSWER.txt'), 'utf8').trim()) results.set(category, (results.get(category) ?? 0) + 1)
    }
  }
  const remaining = state.items.map(item => ({ ...item, remaining: item.needed - (results.get(item.category) ?? 0) })).filter(item => item.remaining > 0)
  if (!remaining.length) { console.log('Queue complete; no request made.'); process.exitCode = 0 }
  else {
    console.log(`${remaining.reduce((sum, item) => sum + item.remaining, 0)} answers remain. Budget: ${decision}.`)
    if (decision === 'ready') {
      const item = remaining[0]
      if (!CATEGORIES.some(category => category.id === item.category)) throw new Error('Unknown category')
      const question = readFileSync(join(repo, 'harness', 'asks', `${item.category}.md`), 'utf8').trim()
      if (createHash('sha256').update(question).digest('hex') !== item.questionSha256) throw new Error('Question changed; refusing a new measurement')
      if (!execute) console.log(`Dry run: next is ${item.category}, Cursor Auto, one answer.`)
      else {
        const save = () => { writeFileSync(`${statePath}.tmp`, `${JSON.stringify(state, null, 2)}\n`, {mode:0o600}); renameSync(`${statePath}.tmp`, statePath) }
        // Consume the daily allowance before spawning: a crash cannot trigger repeated requests.
        state.lastAttemptAt = now.toISOString(); save()
        const root = join(state.outputRoot, now.toISOString().slice(0, 10))
        const response = spawnSync(process.execPath, ['--import', 'tsx', 'harness/ask.mts', item.category, 'cursor', 'auto', '1', '--add'], {cwd:repo, env:{...process.env,LETAGENTSIN_RUNS:root},encoding:'utf8',timeout:330_000,input:''})
        mkdirSync(root,{recursive:true});writeFileSync(join(root,`${item.category}.log`),response.stdout ?? '')
        const directory=join(root,'ask',item.category)
        const names=existsSync(directory)?readdirSync(directory).filter(name=>name.startsWith('run-')).sort((a,b)=>Number(a.slice(4))-Number(b.slice(4))):[]
        const path=names.length?join(directory,names[names.length-1]):null
        const stderr=path&&existsSync(join(path,'STDERR.txt'))?readFileSync(join(path,'STDERR.txt'),'utf8'):response.stderr ?? ''
        const meta=path&&existsSync(join(path,'RUN.json'))?JSON.parse(readFileSync(join(path,'RUN.json'),'utf8')):null
        if(isAccountLimit(stderr)){state.paused=true;state.pauseReason='Cursor account limit; confirm the next reset before resuming.';save();console.log('Account limit: queue paused. No further calls will run.')}
        else if(response.status!==0||!path||!meta||meta.exitCode!==0||meta.timedOut||!existsSync(join(path,'ANSWER.txt'))||!readFileSync(join(path,'ANSWER.txt'),'utf8').trim()){state.paused=true;state.pauseReason='Runner failed; inspect local evidence before resuming.';save();console.log('Runner failed: queue paused.')}
        else console.log(`${item.category}: attempt saved. Next request can run on the next UTC calendar day.`)
      }
    }
  }
} finally { closeSync(fd); unlinkSync(lock) }
