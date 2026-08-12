import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Watch confirmed · Let Agents In', robots: { index: false } }

/**
 * Confirming by GET, which a mail client will happily prefetch. That is a real hazard for a
 * destructive link and none at all for this one: the worst a prefetch can do here is confirm a
 * request the same person just made, and the stop link on every email undoes it.
 */
export default async function ConfirmWatch({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const store = getStore()
  const watch = await store.getWatch(id)
  if (!watch) notFound()

  if (!watch.confirmedAt) {
    watch.confirmedAt = new Date().toISOString()
    watch.stoppedAt = null
    await store.saveWatch(watch)
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col px-6 py-24">
      <h1 className="text-3xl font-semibold">We are watching {watch.domain}</h1>
      <p className="mt-4 leading-relaxed">
        You will hear from us when a verdict moves, and not otherwise. A weekly email that says
        nothing changed teaches you to stop opening it, so we only write when something did.
      </p>
      <p className="mt-4 leading-relaxed">
        Every email carries a link that stops this, and it works without logging in to anything.
      </p>
      <p className="mt-8 font-mono text-sm">
        <Link href={`/v/${watch.domain}`} className="text-brass underline underline-offset-4">
          The current measurement for {watch.domain}
        </Link>
      </p>
    </main>
  )
}
