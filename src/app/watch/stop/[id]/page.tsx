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

  if (!watch.stoppedAt) {
    watch.stoppedAt = new Date().toISOString()
    await store.saveWatch(watch)
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
