'use client'

import { useEffect, useState } from 'react'

/**
 * A scorecard is only useful once it reaches whoever owns the fix, and until now the page
 * gave a reader no way to pass it on except selecting the address bar.
 */
export function ShareRow({ domain, headline, url }: { domain: string; headline: string; url: string }) {
  const [copied, setCopied] = useState(false)
  // Starts as whatever the server rendered so hydration matches, then becomes absolute.
  const [link, setLink] = useState(url)

  useEffect(() => {
    if (!url.startsWith('http')) setLink(window.location.origin + url)
  }, [url])

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(false)
    }
  }

  const mail = `mailto:?subject=${encodeURIComponent(`${domain}: agent readiness scorecard`)}&body=${encodeURIComponent(
    `${headline}\n\nThe full scorecard, every check reproducible with one HTTP request:\n${link}\n`,
  )}`

  const primary = 'bg-ink px-3 py-2 font-mono text-xs text-ground transition-opacity hover:opacity-85'
  const button = 'border border-ink/40 px-3 py-2 font-mono text-xs transition-colors hover:border-brass hover:text-brass'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 font-mono text-xs text-ink-faint">Pass it on</span>
      <button type="button" onClick={copy} className={primary}>
        {copied ? 'Link copied' : 'Copy link'}
      </button>
      <a href={mail} className={button}>
        Email it
      </a>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`}
        target="_blank"
        rel="noreferrer"
        className={button}
      >
        LinkedIn
      </a>
      <span role="status" aria-live="polite" className="font-mono text-xs text-pass">
        {copied ? 'Copied' : ''}
      </span>
    </div>
  )
}
