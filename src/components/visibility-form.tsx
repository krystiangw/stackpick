'use client'

import { useEffect, useState } from 'react'
import type { VisibilityAudit } from '@/lib/visibility-audit'
import type { VisibilityDepth, VisibilityJob } from '@/lib/visibility-job'
import { captureAnalytics } from '@/lib/analytics'

export function VisibilityForm() {
  const [brand, setBrand] = useState('')
  const [domain, setDomain] = useState('')
  const [category, setCategory] = useState('')
  const [depth, setDepth] = useState<VisibilityDepth>('quick')
  const [job, setJob] = useState<VisibilityJob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const running = job?.status === 'queued' || job?.status === 'running'

  useEffect(() => {
    if (!running || !job) return
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/visibility?id=${job.id}`, { cache: 'no-store' })
      if (!response.ok) return
      const next = await response.json() as VisibilityJob
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
      setJob(payload as VisibilityJob)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The audit failed.')
    }
  }

  return <div>
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <label className="font-mono text-xs text-ink-faint">Brand<input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Acme" className="mt-1 w-full border border-rule bg-surface px-4 py-3 text-base text-ink" /></label>
      <label className="font-mono text-xs text-ink-faint">Domain<input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="acme.com" className="mt-1 w-full border border-rule bg-surface px-4 py-3 text-base text-ink" /></label>
      <label className="font-mono text-xs text-ink-faint sm:col-span-2">Product category<input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="file upload API" className="mt-1 w-full border border-rule bg-surface px-4 py-3 text-base text-ink" /></label>
      <fieldset className="flex gap-6 border border-rule p-4 sm:col-span-2">
        <legend className="px-2 font-mono text-xs text-ink-faint">Depth</legend>
        <label className="text-sm"><input type="radio" checked={depth === 'quick'} onChange={() => setDepth('quick')} className="mr-2" />Quick · 4 observations</label>
        <label className="text-sm"><input type="radio" checked={depth === 'full'} onChange={() => setDepth('full')} className="mr-2" />Full visibility · 12 observations</label>
      </fieldset>
      <button disabled={running || !brand || !domain || !category} className="bg-ink px-6 py-3 font-mono text-sm text-ground disabled:opacity-40 sm:col-span-2">{running ? job?.status === 'queued' ? 'Queued…' : 'Asking the agents…' : 'Run audit'}</button>
    </form>
    <p className="mt-3 font-mono text-xs text-ink-faint">Claude, Codex and Gemini through Antigravity run from signed-in subscriptions. Perplexity is measured through its Search API and labelled separately. Failed calls never count as “not found”.</p>
    {job && running && <p className="mt-4 font-mono text-xs text-brass">Audit {job.id.slice(0, 8)} is {job.status}. Keep this page open while the local subscription worker runs.</p>}
    {job?.status === 'failed' && <p role="alert" className="mt-4 font-mono text-xs text-fail">{job.error || 'The worker failed.'}</p>}
    {error && <p role="alert" className="mt-4 font-mono text-xs text-fail">{error}</p>}
    {job?.result && <Result audit={job.result} />}
  </div>
}

function Result({ audit }: { audit: VisibilityAudit }) {
  return <section className="mt-10 border-t border-rule pt-8">
    <p className="font-mono text-xs uppercase tracking-[0.15em] text-brass">Result · {audit.method}</p>
    <h2 className="mt-3 text-3xl font-semibold">Found in {audit.summary.mentioned} of {audit.summary.valid} valid observations</h2>
    <p className="mt-3 text-ink-soft">Linked in {audit.summary.linked}. {audit.summary.attempted - audit.summary.valid} failed calls were excluded. Run {audit.runAt.slice(0, 10)} across {audit.summary.providers} channels.</p>
    <div className="mt-7 space-y-8">{audit.answers.map((answer, index) => <article key={`${answer.provider}-${index}`} className="border-t border-rule pt-5">
      <div className="flex flex-wrap justify-between gap-2 font-mono text-xs"><span>{answer.provider} · {answer.model}</span><span className={answer.mentioned ? 'text-pass' : answer.valid ? 'text-ink-faint' : 'text-fail'}>{answer.valid ? answer.mentioned ? `mentioned · line ${answer.position}` : 'not mentioned' : 'invalid'}</span></div>
      <p className="mt-3 text-sm font-medium">{answer.prompt}</p>
      {answer.valid ? <><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{answer.answer}</p>{answer.sources.length > 0 && <details className="mt-3"><summary className="cursor-pointer font-mono text-xs text-ink-faint">{answer.sources.length} cited sources</summary><ul className="mt-2 space-y-1 font-mono text-xs text-ink-faint">{answer.sources.map((source) => <li key={source} className="truncate"><a href={source} rel="noreferrer" target="_blank" className="underline underline-offset-4">{source}</a></li>)}</ul></details>}</> : <p className="mt-3 font-mono text-xs text-fail">{answer.error}</p>}
    </article>)}</div>
  </section>
}
