'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { Lead } from '@/lib/store'

type ReportRow = { id: string; domain: string; scannedAt: string; total: number; max: number }

export function AdminConsole({ reports, leads }: { reports: ReportRow[]; leads: Lead[] }) {
  const router = useRouter()
  const [domains, setDomains] = useState('')
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<string[]>([])

  async function runBatch(event: React.FormEvent) {
    event.preventDefault()
    const list = domains
      .split(/[\s,]+/)
      .map((entry) => entry.trim())
      .filter(Boolean)
    if (list.length === 0 || running) return

    setRunning(true)
    setLog([])
    for (const domain of list) {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ domain }),
      })
      const payload = await response.json().catch(() => ({}))
      setLog((previous) => [
        ...previous,
        response.ok
          ? `${domain}: ${payload.scorecard.total}/${payload.scorecard.max}`
          : `${domain}: ${payload.error ?? response.status}`,
      ])
    }
    setRunning(false)
    router.refresh()
  }

  return (
    <div className="mt-10 flex flex-col gap-12">
      <section>
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Run scans</h2>
        <form onSubmit={runBatch} className="mt-4 flex flex-col gap-3">
          <textarea
            value={domains}
            onChange={(event) => setDomains(event.target.value)}
            placeholder="supabase.com cloudinary.com imagekit.io"
            rows={3}
            disabled={running}
            className="border border-rule bg-surface px-4 py-3 font-mono text-sm placeholder:text-ink-faint disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={running}
            className="w-fit bg-ink px-6 py-2.5 font-mono text-sm text-ground disabled:opacity-40"
          >
            {running ? 'Scanning…' : 'Scan all'}
          </button>
        </form>
        {log.length > 0 && (
          <pre className="mt-4 overflow-x-auto border border-rule bg-sunken p-4 font-mono text-xs">
            {log.join('\n')}
          </pre>
        )}
      </section>

      <section>
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Reports</h2>
        <div className="mt-4 flex flex-col">
          {reports.length === 0 && <p className="text-sm text-ink-faint">Nothing scanned yet.</p>}
          {reports.map((report) => (
            <div key={report.id} className="flex flex-wrap items-center gap-4 border-t border-rule py-3">
              <Link href={`/r/${report.id}`} className="font-mono text-sm font-medium hover:text-brass">
                {report.domain}
              </Link>
              <span className="font-mono text-xs tabular-nums text-ink-faint">
                {report.total}/{report.max}
              </span>
              <span className="font-mono text-xs text-ink-faint">{report.scannedAt.slice(0, 16).replace('T', ' ')}</span>
              <SendToOwner reportId={report.id} domain={report.domain} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Leads</h2>
        <div className="mt-4 flex flex-col">
          {leads.length === 0 && <p className="text-sm text-ink-faint">No one has asked for a report yet.</p>}
          {leads.map((lead) => (
            <div key={`${lead.email}-${lead.createdAt}`} className="flex flex-wrap gap-4 border-t border-rule py-2 font-mono text-xs">
              <span className="font-medium">{lead.email}</span>
              <span className="text-ink-faint">{lead.domain}</span>
              <span className="text-ink-faint">{lead.createdAt.slice(0, 16).replace('T', ' ')}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function SendToOwner({ reportId, domain }: { reportId: string; domain: string }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'logged'>('idle')

  async function send(event: React.FormEvent) {
    event.preventDefault()
    setState('sending')
    const response = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, reportId, source: `outbound:${domain}` }),
    })
    const payload = await response.json().catch(() => ({}))
    setState(response.ok ? (payload.delivered ? 'sent' : 'logged') : 'idle')
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="ml-auto font-mono text-xs text-brass hover:underline">
        send to owner
      </button>
    )
  }

  if (state === 'sent') return <span className="ml-auto font-mono text-xs text-pass">sent</span>
  if (state === 'logged') return <span className="ml-auto font-mono text-xs text-warn">logged, email not configured</span>

  return (
    <form onSubmit={send} className="ml-auto flex gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder={`devrel@${domain}`}
        className="border border-rule bg-surface px-2 py-1 font-mono text-xs"
      />
      <button type="submit" disabled={state === 'sending'} className="bg-ink px-3 py-1 font-mono text-xs text-ground">
        {state === 'sending' ? '…' : 'send'}
      </button>
    </form>
  )
}
