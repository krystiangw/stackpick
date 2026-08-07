'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Step = { label: string; done: number; total: number }

export function ScanForm({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter()
  const [domain, setDomain] = useState('')
  const [scanning, setScanning] = useState(false)
  const [steps, setSteps] = useState<Step[]>([])
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (scanning) return
    setScanning(true)
    setSteps([])
    setError(null)

    try {
      const response = await fetch('/api/scan/stream', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ domain }),
      })

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => ({}))
        setError(payload.error ?? 'The scan failed. Try again in a moment.')
        setScanning(false)
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // SSE frames are separated by a blank line; a partial frame waits for the next chunk.
        const frames = buffer.split('\n\n')
        buffer = frames.pop() ?? ''

        for (const frame of frames) {
          const type = frame.match(/^event: (.+)$/m)?.[1]
          const data = frame.match(/^data: (.+)$/m)?.[1]
          if (!type || !data) continue
          const payload = JSON.parse(data)

          if (type === 'step') setSteps((previous) => [...previous, payload as Step])
          if (type === 'failed') {
            setError(payload.error)
            setScanning(false)
            return
          }
          if (type === 'done') {
            router.push(`/r/${payload.id}`)
            return
          }
        }
      }
      setError('The scan ended without a result. Try again.')
      setScanning(false)
    } catch {
      setError('Could not reach the scanner. Check your connection and try again.')
      setScanning(false)
    }
  }

  const current = steps.at(-1)

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={domain}
          onChange={(changed) => setDomain(changed.target.value)}
          placeholder="yourdomain.com"
          autoFocus={autoFocus}
          disabled={scanning}
          aria-label="Domain to scan"
          className="min-w-0 flex-1 border border-rule bg-surface px-4 py-3 font-mono text-base placeholder:text-ink-faint disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={scanning || domain.trim().length === 0}
          className="bg-ink px-6 py-3 font-mono text-sm font-medium tracking-wide text-ground transition-opacity hover:opacity-85 disabled:opacity-40"
        >
          {scanning ? 'Scanning…' : 'Scan'}
        </button>
      </form>

      {scanning && (
        <div className="flex flex-col gap-2" aria-live="polite">
          <div className="h-1 w-full bg-sunken">
            <div
              className="h-full bg-brass transition-[width] duration-500 ease-out"
              style={{ width: `${current ? (current.done / current.total) * 100 : 4}%` }}
            />
          </div>
          <ol className="flex flex-col gap-1 font-mono text-xs">
            {steps.map((step, index) => (
              <li
                key={`${step.label}-${index}`}
                className={index === steps.length - 1 ? 'text-ink' : 'text-ink-faint line-through decoration-1'}
              >
                {step.label}
              </li>
            ))}
          </ol>
        </div>
      )}

      {error && (
        <p role="alert" className="font-mono text-xs text-fail">
          {error}
        </p>
      )}
    </div>
  )
}
