'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

const primary = [['/audit', 'Audits'], ['/c', 'Categories'], ['/pricing', 'Pricing']] as const
const resources = [
  ['/findings', 'Research findings'], ['/report', 'Industry report'],
  ['/methodology', 'Methodology'], ['/docs', 'API docs'], ['/visibility', 'AI visibility'],
] as const

export function SiteNavigation() {
  const pathname = usePathname()
  const menu = useRef<HTMLDetailsElement>(null)
  const current = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (event.target instanceof Node && !menu.current?.contains(event.target)) menu.current?.removeAttribute('open')
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])

  return (
    <nav aria-label="Main navigation" className="site-navigation flex items-center gap-1 text-sm">
      {primary.map(([href, label]) => (
        <Link key={href} href={href} aria-current={current(href) ? 'page' : undefined} className="nav-link">{label}</Link>
      ))}
      <details ref={menu} className="relative" onKeyDown={(event) => {
        if (event.key === 'Escape') {
          menu.current?.removeAttribute('open')
          menu.current?.querySelector('summary')?.focus()
        }
      }}>
        <summary className="nav-link cursor-pointer">Research & docs</summary>
        <div className="nav-panel absolute right-0 z-30 mt-2 w-64 rounded-lg border border-rule bg-surface p-2 shadow-lg">
          {resources.map(([href, label]) => (
            <Link key={href} href={href} aria-current={current(href) ? 'page' : undefined} className="nav-link flex w-full"
              onClick={() => menu.current?.removeAttribute('open')}>{label}</Link>
          ))}
        </div>
      </details>
    </nav>
  )
}
