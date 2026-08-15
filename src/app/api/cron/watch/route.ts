import { NextResponse } from 'next/server'
import { scanDomain } from '@/lib/scan'
import { scoreFindings } from '@/lib/score'
import { getStore, reportId, type Report } from '@/lib/store'
import { sendEmail } from '@/lib/email'
import { changesBetween, comparableScorecards, measurableOf, turnedAwayAtTheEdge, worthTelling } from '@/lib/watch'
import { changeEmail } from '@/lib/watch-email'

export const maxDuration = 60

/**
 * The recurring half of the product. A scorecard is a photograph; this is the thing somebody
 * pays for, because the failures we measure are the ones nobody notices: an edge rule that
 * starts refusing agents changes nothing a person sees in a browser.
 *
 * Deliberately small per call. Heroku kills a silent request at thirty seconds and a scan takes
 * up to twenty-seven, so one domain per call is the only honest batch size, and the scheduler
 * calls it as often as there are watches to serve.
 */
const MOST_PER_CALL = 1

/** How long a measurement stays fresh enough that rescanning is only noise. */
const STALE_AFTER_MS = 6 * 24 * 60 * 60 * 1000

function authorised(request: Request): boolean {
  const secret = process.env.STACKPICK_CRON_TOKEN
  if (!secret) return false
  const header = request.headers.get('authorization') ?? ''
  return header === `Bearer ${secret}`
}

export async function POST(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: 'Not for you.' }, { status: 401 })

  const store = getStore()
  const now = Date.now()
  const due = (await store.listWatchesDue(50)).filter(
    (watch) => watch.checkedAt === null || now - Date.parse(watch.checkedAt) > STALE_AFTER_MS,
  )
  if (due.length === 0) return NextResponse.json({ checked: 0, mailed: 0, remaining: 0 })

  // Asked before the first scan, not after it. saveReport throws when the cluster refuses writes,
  // which aborts the request before anything is mailed, so no watcher is ever told something
  // false. What it does instead is leave `remaining` unchanged, and the schedule calls back forty
  // times: forty full scans of a customer's own site, spent on a row that cannot be stored. The
  // same waste this project found in the reseed loop on 2026-08-14.
  const writable = await store.writable()
  if (writable !== true) {
    return NextResponse.json(
      { checked: 0, mailed: 0, remaining: 0, skipped: due.length, error: `store is not accepting writes: ${writable}` },
      { status: 503 },
    )
  }

  let mailed = 0
  const done: string[] = []
  for (const watch of due.slice(0, MOST_PER_CALL)) {
    const findings = await scanDomain(watch.domain)
    const report: Report = {
      id: reportId(findings.domain, findings.scannedAt),
      domain: findings.domain,
      scannedAt: findings.scannedAt,
      findings,
      scorecard: scoreFindings(findings),
      // Ours, not a visitor's, so the published corpus keeps counting it.
      seeded: true,
    }
    await store.saveReport(report)

    const previous = watch.lastReportId ? await store.getReport(watch.lastReportId) : null
    // Two scorecards from two formula versions are not a before and an after. We reseed the
    // corpus every few days and the rules move with it, so without this the first rescan after
    // every formula change mails every watcher a list of verdicts that moved because we changed
    // our mind, under a subject line saying their site lost ground. The baseline is replaced
    // silently and the next comparison is like for like.
    const comparable = comparableScorecards(previous?.scorecard, report.scorecard)
    const changes = previous && comparable ? changesBetween(previous.scorecard.checks, report.scorecard.checks) : []
    // Nothing is mailed on the first check: there is no before, and "here is your score again"
    // is the email that teaches somebody to stop reading us.
    if (previous && comparable && worthTelling(changes, turnedAwayAtTheEdge(report.findings))) {
      const { subject, text } = changeEmail(watch, report, changes)
      const sent = await sendEmail(watch.email, subject, text)
      if (sent.delivered) mailed += 1
    }

    watch.lastReportId = report.id
    watch.lastTotal = report.scorecard.total
    watch.lastMeasurable = measurableOf(report)
    watch.checkedAt = new Date().toISOString()
    await store.saveWatch(watch)
    done.push(watch.domain)
  }

  return NextResponse.json({ checked: done.length, mailed, remaining: due.length - done.length, domains: done })
}
