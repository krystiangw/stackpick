import { notFound } from 'next/navigation'
import { getStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Stopped · Let Agents In', robots: { index: false } }

/**
 * One click, no confirmation step, no login. Asking somebody to prove who they are before we
 * stop mailing them is a wall in front of the exit, and it is the same wall we charge vendors
 * a point for putting in front of the entrance.
 */
export default async function StopWatch({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const store = getStore()
  const watch = await store.getWatch(id)
  if (!watch) notFound()

  // The one page in the product that must never claim success it did not have. An unsubscribe
  // that throws leaves somebody staring at an error page with no idea whether we will keep
  // writing to them, and a database that will not accept writes is exactly when this happens:
  // on 2026-08-13 it would have. Say which of the two it was.
  let stopped = true
  if (!watch.stoppedAt) {
    watch.stoppedAt = new Date().toISOString()
    stopped = await store
      .saveWatch(watch)
      .then(() => true)
      .catch((error) => {
        console.error('could not record a stop request', error)
        return false
      })
  }

  if (!stopped) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col px-6 py-24">
        <h1 className="text-3xl font-semibold">We could not stop it</h1>
        <p className="mt-4 leading-relaxed">
          Something on our side would not record it, so we have to assume you are still on the list for{' '}
          {watch.domain}. Reply to any email from us, or write to{' '}
          <a href="mailto:hello@letagentsin.com?subject=Stop%20watching" className="text-brass underline underline-offset-4">
            hello@letagentsin.com
          </a>
          , and it stops by hand today. Telling you it had worked would have been the easy thing to print here.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col px-6 py-24">
      <h1 className="text-3xl font-semibold">Stopped</h1>
      <p className="mt-4 leading-relaxed">
        We will not write to you about {watch.domain} again. Nothing else needed, and no reply
        required. The measurement itself stays public, because the corpus is published in full.
      </p>
    </main>
  )
}
