'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'

type Run = { id: string; batch: string; vendors: string[]; content: ReactNode }

export function RunBrowser({ runs, batches, vendors }: {
  runs: Run[]
  batches: { id: string; label: string }[]
  vendors: string[]
}) {
  const [batch, setBatch] = useState('all')
  const [vendor, setVendor] = useState('all')
  const root = useRef<HTMLDivElement>(null)
  const matches = (run: Run) => (batch === 'all' || run.batch === batch) && (vendor === 'all' || run.vendors.includes(vendor))
  const shown = runs.filter(matches)
  useEffect(() => {
    const revealLinkedRun = () => {
      let id: string
      try { id = decodeURIComponent(window.location.hash.slice(1)) } catch { return }
      const node = document.getElementById(id)
      if (node instanceof HTMLDetailsElement && root.current?.contains(node)) {
        flushSync(() => { setBatch('all'); setVendor('all') })
        node.open = true
        node.scrollIntoView({ block: 'start' })
      }
    }
    const frame = requestAnimationFrame(revealLinkedRun)
    window.addEventListener('hashchange', revealLinkedRun)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('hashchange', revealLinkedRun) }
  }, [])

  function expand(open: boolean) {
    root.current?.querySelectorAll<HTMLDetailsElement>('[data-run]:not([hidden]) > details').forEach((node) => { node.open = open })
  }
  return (
    <div className="py-8" ref={root}>
      <div className="run-toolbar mb-6 rounded-lg border border-rule bg-surface p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium">Tool and date
            <select value={batch} onChange={(event) => setBatch(event.target.value)} className="min-h-11 w-full rounded-md border border-rule bg-ground px-3 text-sm font-normal">
              <option value="all">All batches ({runs.length} answers)</option>
              {batches.map((one) => <option key={one.id} value={one.id}>{one.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">Vendor mentioned
            <select value={vendor} onChange={(event) => setVendor(event.target.value)} className="min-h-11 w-full rounded-md border border-rule bg-ground px-3 text-sm font-normal">
              <option value="all">Any vendor</option>
              {vendors.map((domain) => <option key={domain} value={domain}>{domain}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-rule pt-3">
          <p role="status" className="text-sm text-ink-soft">Showing {shown.length} of {runs.length} answers</p>
          <div className="flex flex-wrap gap-1">
            <button type="button" className="nav-link text-sm" onClick={() => expand(true)}>Expand shown</button>
            <button type="button" className="nav-link text-sm" onClick={() => expand(false)}>Collapse shown</button>
            {(batch !== 'all' || vendor !== 'all') && <button type="button" className="nav-link text-sm" onClick={() => { setBatch('all'); setVendor('all') }}>Reset filters</button>}
          </div>
        </div>
      </div>
      {shown.length === 0 && <p className="rounded-lg border border-rule p-6 text-sm leading-relaxed text-ink-soft">No recorded answer matches these filters. Try another vendor or reset the filters.</p>}
      <div className="space-y-3">
        {runs.map((run) => <div key={run.id} data-run={run.id} hidden={!matches(run)}>{run.content}</div>)}
      </div>
    </div>
  )
}
