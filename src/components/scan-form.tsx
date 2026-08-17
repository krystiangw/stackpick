'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { LimitReached } from './limit-reached'

type Step = { label: string; done: number; total: number }
type Limited = { error: string; example: { id: string; domain: string; total: number; max: number } | null; domain: string }

export function ScanForm({ autoFocus = false, initialDomain = '' }: { autoFocus?: boolean; initialDomain?: string }) {
  const router = useRouter()
  const [domain, setDomain] = useState(initialDomain)
  const [scanning, setScanning] = useState(false)
  const [steps, setSteps] = useState<Step[]>([])
  const [error, setError] = useState<string | null>(null)
  const [limited, setLimited] = useState<Limited | null>(null)
  const field = useRef<HTMLInputElement>(null)

  // Autofocus only where a keyboard is already there. On a phone it throws up the keyboard
  // and hides the page someone came to read.
  useEffect(() => {
    if (!autoFocus) return
    if (window.matchMedia('(pointer: fine)').matches) field.current?.focus()
  }, [autoFocus])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (scanning) return
    setScanning(true)
    setSteps([])
    setError(null)
    setLimited(null)

    try {
      const response = await fetch('/api/scan/stream', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ domain }),
      })

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => ({}))
        // A limit is not a failure. Refusing with a red line would end the only funnel we have.
        if (response.status === 429 && payload.limited) {
          setLimited({ error: payload.error, example: payload.example ?? null, domain: payload.domain ?? domain })
        } else {
          setError(payload.error ?? 'The scan failed. Try again in a moment.')
        }
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
          ref={field}
          value={domain}
          onChange={(changed) => setDomain(changed.target.value)}
          placeholder="yourdomain.com"
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
            {steps.map((step, index) => {
              const done = index !== steps.length - 1
              return (
                <li
                  key={`${step.label}-${index}`}
                  className={`flex gap-2 ${done ? 'text-ink-faint' : 'text-ink'}`}
                >
                  {/* A tick, not a strikethrough: crossed-out steps read as cancelled work. */}
                  <span aria-hidden className={done ? 'text-pass' : 'text-brass'}>
                    {done ? '✓' : '▸'}
                  </span>
                  {step.label}
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {/* We score vendors on whether their signup works without JavaScript and this form does not,
          which is a fair thing to be caught on. A form cannot do it honestly here: a scan takes
          longer than the gateway allows, which is why the browser path streams. So the client
          without a runtime gets the thing it can actually use, an instruction, rather than a
          button that does nothing. */}
      <noscript>
        <p className="font-mono text-xs leading-relaxed text-ink-faint">
          This form needs JavaScript, because a scan takes longer than a plain form submit is allowed to wait.
          Without a runtime, ask the API directly and it answers the same scorecard:
          <br />
          <code>curl -X POST https://letagentsin.com/api/scan -H &apos;content-type: application/json&apos; -d
          &apos;&#123;&quot;domain&quot;:&quot;example.com&quot;&#125;&apos;</code>
          <br />
          Add <code>&quot;format&quot;:&quot;agent&quot;</code> for markdown tasks, or connect an MCP client to{' '}
          <code>https://letagentsin.com/mcp</code>.
        </p>
      </noscript>

      <p className="font-mono text-xs leading-relaxed text-ink-faint">
        Your scan gets a permanent link you can forward. It is never added to the published corpus, and we do
        not post it anywhere.
      </p>

      {limited && <LimitReached {...limited} />}

      {error && (
        <p role="alert" className="font-mono text-xs text-fail">
          {error}
        </p>
      )}
    </div>
  )
}
