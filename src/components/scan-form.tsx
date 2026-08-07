'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function ScanForm({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter()
  const [domain, setDomain] = useState('')
  const [status, setStatus] = useState<'idle' | 'scanning'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (status === 'scanning') return
    setStatus('scanning')
    setError(null)

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ domain }),
      })
      const payload = await response.json()
      if (!response.ok) {
        setError(payload.error ?? 'The scan failed. Try again in a moment.')
        setStatus('idle')
        return
      }
      router.push(`/r/${payload.id}`)
    } catch {
      setError('Could not reach the scanner. Check your connection and try again.')
      setStatus('idle')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={domain}
          onChange={(event) => setDomain(event.target.value)}
          placeholder="yourdomain.com"
          autoFocus={autoFocus}
          disabled={status === 'scanning'}
          aria-label="Domain to scan"
          className="min-w-0 flex-1 border border-rule bg-surface px-4 py-3 font-mono text-base placeholder:text-ink-faint disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={status === 'scanning' || domain.trim().length === 0}
          className="bg-ink px-6 py-3 font-mono text-sm font-medium tracking-wide text-ground transition-opacity hover:opacity-85 disabled:opacity-40"
        >
          {status === 'scanning' ? 'Scanning…' : 'Scan'}
        </button>
      </form>

      {status === 'scanning' && (
        <p className="font-mono text-xs text-ink-faint">
          Running 13 checks across 5 stages. Signup probes run three times, so this takes 15 to 30 seconds.
        </p>
      )}
      {error && (
        <p role="alert" className="font-mono text-xs text-fail">
          {error}
        </p>
      )}
    </div>
  )
}
