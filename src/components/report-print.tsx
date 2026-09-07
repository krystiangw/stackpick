'use client'

import { useEffect } from 'react'

/** Print all report evidence, then restore the reader's disclosure choices. */
export function ReportPrint() {
  useEffect(() => {
    let closed: HTMLDetailsElement[] = []
    const before = () => {
      const nodes = [...document.querySelectorAll<HTMLDetailsElement>('[data-deliverable] details:not([open])')]
      closed.push(...nodes)
      nodes.forEach((node) => { node.open = true })
    }
    const after = () => {
      closed.forEach((node) => { node.open = false })
      closed = []
    }
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
    }
  }, [])
  return <button type="button" onClick={() => window.print()} className="nav-link text-sm print:hidden">Print report</button>
}
