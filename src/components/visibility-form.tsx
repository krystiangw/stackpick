'use client'

import { useState } from 'react'
import type { VisibilityAudit } from '@/lib/visibility-audit'
import { captureAnalytics } from '@/lib/analytics'

export function VisibilityForm({ providers }: { providers: string[] }) {
  const [brand, setBrand] = useState('')
  const [domain, setDomain] = useState('')
  const [category, setCategory] = useState('')
  const [result, setResult] = useState<VisibilityAudit | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setRunning(true); setError(null); setResult(null); captureAnalytics('visibility_audit_started')
    try {
      const response = await fetch('/api/visibility', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ brand, domain, category }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'The audit failed.')
      setResult(payload as VisibilityAudit); captureAnalytics('visibility_audit_completed')
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'The audit failed.') } finally { setRunning(false) }
  }
  return <div>
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <label className="font-mono text-xs text-ink-faint">Brand<input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Acme" className="mt-1 w-full border border-rule bg-surface px-4 py-3 text-base text-ink" /></label>
      <label className="font-mono text-xs text-ink-faint">Domain<input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="acme.com" className="mt-1 w-full border border-rule bg-surface px-4 py-3 text-base text-ink" /></label>
      <label className="font-mono text-xs text-ink-faint sm:col-span-2">Product category<input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="file upload API" className="mt-1 w-full border border-rule bg-surface px-4 py-3 text-base text-ink" /></label>
      <button disabled={running || providers.length === 0 || !brand || !domain || !category} className="bg-ink px-6 py-3 font-mono text-sm text-ground disabled:opacity-40 sm:col-span-2">{running ? 'Asking the models…' : 'Run visibility audit'}</button>
    </form>
    <p className="mt-3 font-mono text-xs text-ink-faint">{providers.length > 0 ? `Configured: ${providers.join(', ')}. ` : 'The interface is live; model API keys still need to be configured. '}Beta: one run per hour. Three neutral prompts per configured model. Failed calls never count as “not found”.</p>
    {error && <p role="alert" className="mt-4 font-mono text-xs text-fail">{error}</p>}
    {result && <section className="mt-10 border-t border-rule pt-8">
      <p className="font-mono text-xs uppercase tracking-[0.15em] text-brass">Result · {result.method}</p>
      <h2 className="mt-3 text-3xl font-semibold">Found in {result.summary.mentioned} of {result.summary.valid} valid answers</h2>
      <p className="mt-3 text-ink-soft">Linked in {result.summary.linked}. {result.summary.attempted - result.summary.valid} failed calls were excluded. Run {result.runAt.slice(0, 10)} across {result.summary.providers} providers.</p>
      <div className="mt-7 space-y-8">{result.answers.map((answer, index) => <article key={`${answer.provider}-${index}`} className="border-t border-rule pt-5">
        <div className="flex flex-wrap justify-between gap-2 font-mono text-xs"><span>{answer.provider} · {answer.model}</span><span className={answer.mentioned ? 'text-pass' : answer.valid ? 'text-ink-faint' : 'text-fail'}>{answer.valid ? answer.mentioned ? `mentioned · line ${answer.position}` : 'not mentioned' : 'invalid'}</span></div>
        <p className="mt-3 text-sm font-medium">{answer.prompt}</p>
        {answer.valid ? <><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{answer.answer}</p>{answer.sources.length > 0 && <details className="mt-3"><summary className="cursor-pointer font-mono text-xs text-ink-faint">{answer.sources.length} cited source{answer.sources.length === 1 ? '' : 's'}</summary><ul className="mt-2 space-y-1 font-mono text-xs text-ink-faint">{answer.sources.map((source) => <li key={source} className="truncate"><a href={source} rel="noreferrer" target="_blank" className="underline underline-offset-4">{source}</a></li>)}</ul></details>}</> : <p className="mt-3 font-mono text-xs text-fail">{answer.error}</p>}
      </article>)}</div>
    </section>}
  </div>
}
