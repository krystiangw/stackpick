import { hostname } from 'node:os'
import { tmpdir } from 'node:os'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { AGENTS } from './agents.mjs'
import { claimJobWithinBudget, failVisibilityJob, finishVisibilityJob, recordWorkerHeartbeat } from '../src/lib/visibility-job'
import { AGENT_CALL_TIMEOUT_MS, PROMPTS_PER_DEPTH } from '../src/lib/visibility-queue'
import { visibilityAnswer, visibilityPrompts, type VisibilityAnswer, type VisibilityAudit, VISIBILITY_METHOD } from '../src/lib/visibility-audit'

const once = process.argv.includes('--once')
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const urlsIn = (text: string) => [...new Set(text.match(/https?:\/\/[^\s)\]}\>"']+/g) ?? [])]

function agentAnswer(name: 'claude' | 'codex' | 'antigravity', prompt: string, brand: string, domain: string): VisibilityAnswer {
  const agent = AGENTS[name]
  const model = agent.defaultModel ?? 'default'
  const directory = mkdtempSync(join(tmpdir(), 'letagentsin-visibility-'))
  execFileSync('git', ['init', '--quiet'], { cwd: directory })
  const result = spawnSync(agent.bin, agent.argv(prompt), { cwd: directory, encoding: 'utf8', input: '', timeout: AGENT_CALL_TIMEOUT_MS, maxBuffer: 16 * 1024 * 1024 })
  rmSync(directory, { recursive: true, force: true })
  const provider = name === 'claude' ? 'anthropic' : name === 'codex' ? 'openai' : 'gemini'
  return visibilityAnswer({ provider, model: `${name}:${model}`, prompt, brand, domain, answer: result.stdout ?? '', error: result.status === 0 ? undefined : (result.stderr || `exit ${result.status}`).slice(0, 2_000) })
}

function perplexityAnswer(prompt: string, brand: string, domain: string): VisibilityAnswer {
  const result = spawnSync('pplx', ['search', 'web', prompt, '--limit', '10', '--intent', 'Find current sources that directly answer this product-discovery question'], { encoding: 'utf8', input: '', timeout: AGENT_CALL_TIMEOUT_MS, maxBuffer: 16 * 1024 * 1024 })
  if (result.status !== 0) return visibilityAnswer({ provider: 'perplexity', model: 'search-api', prompt, brand, domain, answer: '', error: result.stderr || `exit ${result.status}` })
  try {
    const data = JSON.parse(result.stdout) as { hits?: { url?: string; title?: string; snippet?: string; summary?: string }[] }
    const hits = data.hits ?? []
    const answer = hits.map((hit, index) => `${index + 1}. ${hit.title ?? hit.url ?? 'Untitled'}\n${hit.snippet ?? hit.summary ?? ''}`).join('\n\n')
    return visibilityAnswer({ provider: 'perplexity', model: 'search-api', prompt, brand, domain, answer, sources: hits.flatMap((hit) => hit.url ? [hit.url] : []) })
  } catch {
    return visibilityAnswer({ provider: 'perplexity', model: 'search-api', prompt, brand, domain, answer: result.stdout, sources: urlsIn(result.stdout) })
  }
}

const me = `${hostname()}:${process.pid}`
// Between calls, never on a timer: every agent call is a spawnSync that holds the event loop, so a
// timer would not fire during one and a busy worker would read as an absent worker.
const beat = () => recordWorkerHeartbeat(me).catch(() => undefined)
/**
 * Czekanie na budzet trwa dluzej niz prog ciszy, wiec bez bicia w trakcie zywy worker czytalby sie
 * jak nieobecny i strona mowilaby „nikt tego nie mierzy" zamiast prawdy o budzecie. Tu timer JEST
 * poprawny: petla zdarzen jest wolna, bo czekamy na timer, a nie na spawnSync.
 */
async function sleepBeating(ms: number) {
  const ticking = setInterval(() => { void beat() }, 60_000)
  try { await pause(ms) } finally { clearInterval(ticking) }
}

async function runOne() {
  await beat()
  const { job, outOfBudget, retryAfterMs } = await claimJobWithinBudget(me)
  if (outOfBudget) {
    if (once) { console.log('dzienny budzet obserwacji wyczerpany, nie ma czego uruchomic'); return false }
    // Czekamy na budzet, nie na kolejny obrot petli: bez tego ten sam wiersz bylby brany, odrzucany
    // i odkladany co dziesiec sekund az do polnocy. Sufit na pol godziny, zeby reczne podniesienie
    // budzetu nie czekalo do rana.
    const spanie = Math.min(retryAfterMs, 30 * 60_000)
    console.log(`dzienny budzet obserwacji wyczerpany, czekam ${Math.round(spanie / 60_000)} min`)
    await sleepBeating(spanie)
    return true
  }
  if (!job) return false
  console.log(`claimed ${job.id} ${job.domain} (${job.depth})`)
  try {
    const prompts = visibilityPrompts(job.category).slice(0, PROMPTS_PER_DEPTH[job.depth])
    const answers: VisibilityAnswer[] = []
    for (const prompt of prompts) {
      for (const name of ['claude', 'codex', 'antigravity'] as const) {
        const answer = agentAnswer(name, prompt, job.brand, job.domain)
        await beat()
        answers.push(answer)
        console.log(`  ${name}: ${answer.valid ? answer.mentioned ? 'found' : 'not found' : 'failed'}`)
      }
      const answer = perplexityAnswer(prompt, job.brand, job.domain)
      await beat()
      answers.push(answer)
      console.log(`  perplexity-search: ${answer.valid ? answer.mentioned ? 'found' : 'not found' : 'failed'}`)
    }
    const valid = answers.filter((answer) => answer.valid)
    const result: VisibilityAudit = {
      method: VISIBILITY_METHOD,
      brand: job.brand,
      domain: job.domain,
      category: job.category,
      runAt: new Date().toISOString(),
      prompts,
      answers,
      summary: { attempted: answers.length, valid: valid.length, mentioned: valid.filter((answer) => answer.mentioned).length, linked: valid.filter((answer) => answer.linked).length, providers: new Set(valid.map((answer) => answer.provider)).size },
    }
    await finishVisibilityJob(job.id, result)
    console.log(`completed ${job.id}: ${result.summary.mentioned}/${result.summary.valid}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await failVisibilityJob(job.id, message)
    console.error(`failed ${job.id}: ${message}`)
  }
  return true
}

do {
  const worked = await runOne()
  if (once) process.exit(0)
  if (!worked) await pause(10_000)
} while (true)
