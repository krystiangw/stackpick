import { getStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

/**
 * Cheap enough to poll every minute and honest enough to be worth polling. On 2026-08-11 every
 * page answered 500 for 44 minutes because one query failed, and nothing anywhere noticed: the
 * only reason it surfaced was an audit that happens to run after a reseed.
 *
 * It reads one report rather than the corpus on purpose. The corpus query is the expensive one
 * and the one that broke, so a health check built on it would be the outage it is meant to
 * detect; a single indexed read proves the database is reachable without doing the work again.
 */
export async function GET() {
  const started = Date.now()
  try {
    const store = getStore()
    const [reports, writable] = await Promise.all([store.listReports(1), store.writable()])
    // A store that reads and will not write is not healthy, and answering ok because the pages
    // still render is how a whole night of refused scans went unnoticed.
    return Response.json(
      {
        status: writable === true ? 'ok' : 'degraded',
        store: reports.length > 0 ? 'readable' : 'empty',
        writable: writable === true,
        ...(writable === true ? {} : { writeError: writable }),
        latestScan: reports[0]?.scannedAt ?? null,
        ms: Date.now() - started,
      },
      { status: writable === true ? 200 : 503, headers: { 'cache-control': 'no-store' } },
    )
  } catch (error) {
    return Response.json(
      { status: 'failing', reason: (error as Error).message, ms: Date.now() - started },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    )
  }
}
