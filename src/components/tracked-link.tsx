'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { clickBeacon, type Click } from '@/lib/clicks'

/**
 * A link that also tells the server which button was pressed. A beacon rather than a counting
 * redirect on purpose: the href stays the real address, so an agent reading the HTML still sees
 * the mailbox and a person hovering still sees where they are going. A click is something only a
 * browser does, so the beacon missing the agents that never run JavaScript costs nothing here.
 */
export function TrackedLink({
  click,
  href,
  className,
  children,
}: {
  click: Click
  href: string
  className?: string
  children: ReactNode
}) {
  const count = () => {
    try {
      navigator.sendBeacon(clickBeacon(click))
    } catch {
      // A blocked beacon must never stop the link itself.
    }
  }
  return href.startsWith('/') ? (
    <Link href={href} className={className} onClick={count}>
      {children}
    </Link>
  ) : (
    <a href={href} className={className} onClick={count}>
      {children}
    </a>
  )
}
