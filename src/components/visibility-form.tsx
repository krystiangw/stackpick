'use client'

import { useEffect, useMemo, useState } from 'react'
import type { VisibilityAnswer, VisibilityAudit, VisibilityProvider } from '@/lib/visibility-audit'
import type { VisibilityDepth, VisibilityJob } from '@/lib/visibility-job'
import type { VisibilityQueueState } from '@/lib/visibility-queue'
import { citationGapLine } from '@/lib/visibility-copy'
import { captureAnalytics } from '@/lib/analytics'

const CHANNELS: Record<VisibilityProvider, { name: string; note: string }> = {
  openai: { name: 'Codex', note: 'OpenAI subscription' },
  anthropic: { name: 'Claude', note: 'Anthropic subscription' },
  gemini: { name: 'Gemini', note: 'via Antigravity' },
  perplexity: { name: 'Perplexity Search', note: 'ranked sources, not a chat answer' },
}

type WaitingJob = VisibilityJob & { queue?: VisibilityQueueState | null }

export function VisibilityForm() {
  const [brand, setBrand] = useState('')
  const [domain, setDomain] = useState('')
  const [category, setCategory] = useState('')
  const [depth, setDepth] = useState<VisibilityDepth>('quick')
  const [job, setJob] = useState<WaitingJob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const running = job?.status === 'queued' || job?.status === 'running'

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('audit')
    if (!id || !/^[a-f0-9]{32}$/.test(id)) return
    fetch(`/api/visibility?id=${id}`, { cache: 'no-store' })
      .then(async (response) => { if (response.ok) { setJob(await response.json() as WaitingJob) } })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!running || !job) return
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/visibility?id=${job.id}`, { cache: 'no-store' })
      if (!response.ok) return
      const next = await response.json() as WaitingJob
      setJob(next)
      if (next.status === 'complete') captureAnalytics('visibility_audit_completed')
    }, 4_000)
    return () => window.clearInterval(timer)
  }, [job, running])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setJob(null)
    captureAnalytics('visibility_audit_started', { depth })
    try {
      const response = await fetch('/api/visibility', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ brand, domain, category, depth }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'The audit failed.')
      const created = payload as WaitingJob
      setJob(created)
      window.history.replaceState(null, '', `/visibility?audit=${created.id}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The audit failed.')
    }
  }

  const form = <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
    <label className="font-mono text-xs text-ink-faint">Brand<input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Acme" className="mt-1 w-full border border-rule bg-surface px-4 py-3 text-base text-ink" /></label>
    <label className="font-mono text-xs text-ink-faint">Domain<input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="acme.com" className="mt-1 w-full border border-rule bg-surface px-4 py-3 text-base text-ink" /></label>
    <label className="font-mono text-xs text-ink-faint sm:col-span-2">Product category<input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="file upload API" className="mt-1 w-full border border-rule bg-surface px-4 py-3 text-base text-ink" /></label>
    <fieldset className="flex flex-wrap gap-6 border border-rule p-4 sm:col-span-2">
      <legend className="px-2 font-mono text-xs text-ink-faint">Depth</legend>
      <label className="text-sm"><input type="radio" checked={depth === 'quick'} onChange={() => setDepth('quick')} className="mr-2" />Quick · 4 observations</label>
      <label className="text-sm"><input type="radio" checked={depth === 'full'} onChange={() => setDepth('full')} className="mr-2" />Full visibility · 12 observations</label>
    </fieldset>
    <button disabled={running || !brand || !domain || !category} className="bg-ink px-6 py-3 font-mono text-sm text-ground disabled:opacity-40 sm:col-span-2">{running ? job?.status === 'queued' ? 'Queued…' : 'Asking the agents…' : 'Run audit'}</button>
  </form>

  if (job?.result) return <div data-deliverable>
    <Result audit={job.result} />
    <details className="mt-10 border-t border-rule py-6">
      <summary className="cursor-pointer font-mono text-sm text-brass">Run another audit</summary>
      <div className="mt-6">{form}</div>
    </details>
  </div>

  return <div>
    {form}
    <p className="mt-3 font-mono text-xs leading-relaxed text-ink-faint">Claude, Codex and Gemini through Antigravity run from signed-in subscriptions. Perplexity is a separate Search API observation. Failed calls never count as “not found”.</p>
    {job && running && <Waiting job={job} />}
    {job?.status === 'failed' && <p role="alert" className="mt-4 font-mono text-xs text-fail">{job.error || 'The worker failed.'}</p>}
    {error && <p role="alert" className="mt-4 font-mono text-xs text-fail">{error}</p>}
  </div>
}

/**
 * The queue runs on one laptop. Saying "queued" while nothing is on shift is the same shape as a
 * green audit over zero rows, so the panel reads the worker's own beat and says which it is.
 */
function Waiting({ job }: { job: WaitingJob }) {
  // Only a read that found silence turns the panel red. Not knowing is not the same as nobody home.
  const nobodyHome = job.queue?.worker === 'never' || job.queue?.worker === 'silent'
  return <div className={`mt-6 border p-5 ${nobodyHome ? 'border-fail/40 bg-fail/5' : 'border-rule bg-brass-soft'}`}>
    <p className="font-medium">Your audit is {job.status}.</p>
    {job.queue && <p className="mt-1 text-sm leading-relaxed text-ink-soft">{job.queue.line}</p>}
    <p className="mt-2 font-mono text-xs text-ink-faint">Reference {job.id.slice(0, 8)}. You can return to this URL later.</p>
  </div>
}

function Result({ audit }: { audit: VisibilityAudit }) {
  const answerRuns = audit.answers.filter((answer) => answer.provider !== 'perplexity')
  const searchRuns = audit.answers.filter((answer) => answer.provider === 'perplexity')
  const validAnswers = answerRuns.filter((answer) => answer.valid)
  const validSearchRuns = searchRuns.filter((answer) => answer.valid)
  const mentions = validAnswers.filter((answer) => answer.mentioned).length
  const links = validAnswers.filter((answer) => answer.linked).length
  const presence = validAnswers.length === 0 ? null : Math.round(mentions / validAnswers.length * 100)
  const channels = [...new Set(audit.answers.map((answer) => answer.provider))]
  const promptGroups = audit.prompts.map((prompt) => ({ prompt, answers: audit.answers.filter((answer) => answer.prompt === prompt) }))
  const sourceDomains = useMemo(() => rankedSourceDomains(audit.answers), [audit.answers])
  const verdict = presence === null ? 'No valid answer-agent sample' : presence === 0 ? 'Not visible in this sample' : presence < 50 ? 'Low visibility in this sample' : 'Visible in this sample'

  return <section>
    <header className="border-b border-rule pb-9">
      <div className="sm:flex sm:items-center sm:justify-between sm:gap-3">
        <p className="font-mono text-xs uppercase tracking-[0.15em] text-brass">AI visibility report</p>
        <p className="mt-2 font-mono text-xs text-ink-faint sm:mt-0 sm:text-right">{formatDate(audit.runAt)} · {audit.prompts.length} buyer prompts</p>
      </div>
      <h2 className="mt-4 text-balance text-4xl font-semibold tracking-tight">{audit.brand}</h2>
      <p className="mt-2 break-words text-ink-soft">{audit.domain} · {audit.category}</p>
    </header>

    <section className="border-b border-rule py-9">
      <div className="grid gap-8 md:grid-cols-[11rem_1fr] md:items-center">
        <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full border-[10px] border-sunken bg-surface md:aspect-square md:h-auto md:w-auto">
          <span className="font-mono text-5xl font-semibold tabular-nums">{presence ?? '—'}</span>
          <span className="mt-1 font-mono text-xs uppercase text-ink-faint">{presence === null ? 'no sample' : '% presence'}</span>
        </div>
        <div>
          <p className={`font-mono text-xs uppercase tracking-[0.15em] ${presence === 0 ? 'text-fail' : 'text-brass'}`}>{verdict}</p>
          <h3 className="mt-3 max-w-2xl text-balance text-3xl font-semibold leading-tight">{validAnswers.length === 0 ? `Every answer agent failed, so this run measured nothing about ${audit.brand}.` : mentions === 0 ? `No valid answer recommended or named ${audit.brand}.` : `${audit.brand} appeared in ${mentions} of ${validAnswers.length} valid answers.`}</h3>
          <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">This is a dated sample, not a universal ranking. Perplexity Search is shown separately because ranked web results are not equivalent to a generated answer.</p>
        </div>
      </div>
    </section>

    <section className="grid gap-px border-b border-rule bg-rule py-px sm:grid-cols-2 lg:grid-cols-4">
      <Metric value={validAnswers.length === 0 ? 'no sample' : `${mentions}/${validAnswers.length}`} label="Brand mentions" note="valid answer-agent runs" />
      <Metric value={validAnswers.length === 0 ? 'no sample' : `${links}/${validAnswers.length}`} label="Owned citations" note="answers linking your domain" />
      <Metric value={`${answerRuns.filter((answer) => answer.valid).length}/${answerRuns.length}`} label="Answer coverage" note="failed runs excluded" />
      <Metric value={validSearchRuns.length === 0 ? 'no sample' : `${validSearchRuns.filter((answer) => answer.mentioned).length}/${validSearchRuns.length}`} label="Perplexity Search" note={validSearchRuns.length > 0 ? 'brand in ranked sources' : searchRuns.length === 0 ? 'the search call did not run' : 'the search call failed'} />
    </section>

    <section className="border-b border-rule py-10">
      <SectionTitle eyebrow="Channel breakdown" title="Where you appeared, and where you did not" />
      <div className="mt-6 overflow-hidden border border-rule">
        {channels.map((provider) => <ChannelRow key={provider} provider={provider} answers={audit.answers.filter((answer) => answer.provider === provider)} />)}
      </div>
    </section>

    <section className="border-b border-rule py-10">
      <SectionTitle eyebrow="What to do next" title="Three actions from this sample" />
      <div className="mt-6 grid gap-px bg-rule lg:grid-cols-3">
        <Action number="01" title={`Own the “${audit.category}” answer`} body={`Publish one canonical page that directly defines the category, states who ${audit.brand} is for, and compares the decision criteria used in these prompts.`} />
        <Action number="02" title="Close the citation gap" body={citationGapLine(sourceDomains)} />
        <Action number="03" title="Rerun the same prompts" body="Keep these questions frozen. Repeat after publishing or earning citations; a changed prompt would measure a different market question, not improvement." />
      </div>
      {sourceDomains.length > 0 && <div className="mt-8">
        <h4 className="font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">Sources shaping the answers</h4>
        <div className="mt-3 flex flex-wrap gap-2">{sourceDomains.slice(0, 10).map((source) => <span key={source.domain} className="border border-rule bg-surface px-3 py-2 font-mono text-xs">{source.domain} <span className="text-ink-faint">×{source.count}</span></span>)}</div>
      </div>}
    </section>

    <section className="py-10">
      <SectionTitle eyebrow="Evidence" title="Prompt-by-prompt results" />
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">The complete model output is preserved for verification, but collapsed by default. Open only the prompt or channel you need.</p>
      <div className="mt-6 space-y-3">{promptGroups.map((group, index) => <PromptEvidence key={group.prompt} index={index + 1} prompt={group.prompt} answers={group.answers} />)}</div>
    </section>
  </section>
}

function Metric({ value, label, note }: { value: string; label: string; note: string }) {
  return <div className="bg-ground p-6"><p className="font-mono text-3xl font-semibold tabular-nums">{value}</p><p className="mt-2 text-sm font-medium">{label}</p><p className="mt-1 font-mono text-xs text-ink-faint">{note}</p></div>
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <div><p className="font-mono text-xs uppercase tracking-[0.15em] text-brass">{eyebrow}</p><h3 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h3></div>
}

function ChannelRow({ provider, answers }: { provider: VisibilityProvider; answers: VisibilityAnswer[] }) {
  const meta = CHANNELS[provider]
  const valid = answers.filter((answer) => answer.valid)
  const mentioned = valid.filter((answer) => answer.mentioned).length
  const linked = valid.filter((answer) => answer.linked).length
  const unavailable = valid.length === 0
  return <div className="grid gap-3 border-b border-rule bg-ground p-5 last:border-b-0 sm:grid-cols-[1fr_auto_auto] sm:items-center">
    <div><p className="font-medium">{meta.name}</p><p className="mt-1 font-mono text-xs text-ink-faint">{meta.note}</p></div>
    <div className="font-mono text-sm tabular-nums sm:text-right"><span className={mentioned > 0 ? 'text-pass' : unavailable ? 'text-fail' : 'text-ink'}>{unavailable ? 'Unavailable' : `${mentioned}/${valid.length} mentions`}</span><p className="mt-1 text-xs text-ink-faint">{linked} owned citations</p></div>
    <span className={`w-fit px-2 py-1 font-mono text-[11px] uppercase ${unavailable ? 'bg-fail/10 text-fail' : mentioned > 0 ? 'bg-pass/10 text-pass' : 'bg-sunken text-ink-soft'}`}>{unavailable ? 'excluded' : mentioned > 0 ? 'visible' : 'not found'}</span>
  </div>
}

function Action({ number, title, body }: { number: string; title: string; body: string }) {
  return <article className="bg-ground p-6"><p className="font-mono text-xs text-brass">{number}</p><h4 className="mt-3 font-semibold">{title}</h4><p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p></article>
}

function PromptEvidence({ index, prompt, answers }: { index: number; prompt: string; answers: VisibilityAnswer[] }) {
  const valid = answers.filter((answer) => answer.valid)
  const found = valid.filter((answer) => answer.mentioned).length
  return <details className="group border border-rule bg-surface">
    <summary className="grid cursor-pointer list-none gap-3 p-5 sm:grid-cols-[2rem_1fr_auto] sm:items-center">
      <span className="font-mono text-xs text-brass">{String(index).padStart(2, '0')}</span>
      <span className="text-sm font-medium leading-relaxed">{prompt}</span>
      <span className="font-mono text-xs text-ink-faint">{found}/{valid.length} found <span aria-hidden className="ml-2 inline-block transition-transform group-open:rotate-45">＋</span></span>
    </summary>
    <div className="border-t border-rule p-5">{answers.map((answer) => <details key={`${answer.provider}-${answer.model}`} className="border-b border-rule py-4 last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
        <span className="font-mono text-xs">{CHANNELS[answer.provider].name}</span>
        <span className={`font-mono text-xs ${answer.mentioned ? 'text-pass' : answer.valid ? 'text-ink-faint' : 'text-fail'}`}>{answer.valid ? answer.mentioned ? 'mentioned' : 'not mentioned' : 'unavailable'} <span aria-hidden>＋</span></span>
      </summary>
      <div className="mt-4 border-l-2 border-rule pl-4">
        {answer.valid ? <p className="whitespace-pre-wrap text-sm leading-7 text-ink-soft">{answer.answer}</p> : <p className="font-mono text-xs text-fail">Run excluded: {answer.error}</p>}
        {answer.sources.length > 0 && <div className="mt-5"><p className="font-mono text-xs uppercase text-ink-faint">Sources</p><ul className="mt-2 space-y-1">{answer.sources.map((source) => <li key={source} className="truncate text-xs"><a href={source} rel="noreferrer" target="_blank" className="text-brass underline underline-offset-4">{hostOf(source)}</a></li>)}</ul></div>}
      </div>
    </details>)}</div>
  </details>
}

function hostOf(source: string) {
  try { return new URL(source).hostname.replace(/^www\./, '') } catch { return source }
}

function rankedSourceDomains(answers: VisibilityAnswer[]) {
  const counts = new Map<string, number>()
  for (const source of answers.flatMap((answer) => answer.sources)) {
    const domain = hostOf(source)
    counts.set(domain, (counts.get(domain) ?? 0) + 1)
  }
  return [...counts].map(([domain, count]) => ({ domain, count })).sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain))
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' }).format(new Date(value))
}
