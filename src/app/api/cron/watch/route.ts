import { NextResponse } from 'next/server'
import { scanDomain } from '@/lib/scan'
import { scoreFindings } from '@/lib/score'
import { getStore, reportId, type Report } from '@/lib/store'
import { sendEmail } from '@/lib/email'
import { changesBetween, comparableScorecards, measurableOf, reproducedChanges, rulesChangedBetween, turnedAwayAtTheEdge, unseenChanges, watchIsDue, worthTelling } from '@/lib/watch'
import { stanceTowardsUs } from '@/lib/scan/robots'
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

/**
 * The queue as it stands, without touching it. A guard that has to POST to find out whether the
 * queue is healthy performs a scan and can send somebody an email as a side effect of asking a
 * question, which is not a health check.
 *
 * A watch nobody has scanned yet waits from the day it became servable, not forever. Reading it as
 * forever made `longestWaitDays` 9999 the moment anybody confirmed an address, and the weekly
 * cadence alarm in quota.yml fails above eight: every new customer would have set off an alarm
 * about our own delivery until the next nightly run served them. From the confirmation rather than
 * the signup, because an unconfirmed watch is not in this queue and we could not have served it:
 * somebody who confirms a fortnight later is not somebody we kept waiting.
 */
export async function GET(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: 'Not for you.' }, { status: 401 })
  const store = getStore()
  const now = Date.now()
  const queue = await store.listWatchesDue(500)
  const waitedDays = (watch: { checkedAt: string | null; confirmedAt: string | null; createdAt: string }) =>
    (now - Date.parse(watch.checkedAt ?? watch.confirmedAt ?? watch.createdAt)) / 86_400_000
  const longestWait = queue.length === 0 ? 0 : Math.max(...queue.map((watch) => Math.min(waitedDays(watch), 9_999)))
  const due = queue.filter((watch) => watchIsDue(watch, now, STALE_AFTER_MS))
  return NextResponse.json({ watches: queue.length, due: due.length, longestWaitDays: Math.round(longestWait) })
}

export async function POST(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: 'Not for you.' }, { status: 401 })

  const store = getStore()
  const now = Date.now()
  // Asked for far more than one call can serve, because the number that matters to a customer is
  // not how many we got through: it is whether anybody has been waiting too long. A queue capped
  // at the batch size reports a healthy `remaining` while the backlog behind it grows, and this
  // product has already been down for two days once without anything saying so.
  const queue = await store.listWatchesDue(500)
  const due = queue.filter((watch) => watchIsDue(watch, now, STALE_AFTER_MS))
  /** The oldest check in the whole queue, in days. The one number a cadence alarm can be built on. */
  const waitedDays = (watch: { checkedAt: string | null; confirmedAt: string | null; createdAt: string }) =>
    (now - Date.parse(watch.checkedAt ?? watch.confirmedAt ?? watch.createdAt)) / 86_400_000
  const longestWait = queue.length === 0 ? 0 : Math.max(...queue.map((watch) => Math.min(waitedDays(watch), 9_999)))
  if (due.length === 0) {
    return NextResponse.json({ checked: 0, mailed: 0, remaining: 0, watches: queue.length, longestWaitDays: Math.round(longestWait) })
  }

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
  /** Domains that asked us to stay out. Reported rather than silently missing from `checked`. */
  const skipped: string[] = []
  for (const watch of due.slice(0, MOST_PER_CALL)) {
    // The same rule the reseed follows: a group naming us in robots.txt stops the automated pass.
    // A watch is not a person asking; it runs on a schedule and nobody is at the keyboard.
    const stance = await stanceTowardsUs(`https://${watch.domain}`)
    // A frozen row stays frozen while robots.txt is unreadable: a 500 at their edge is not a
    // withdrawal, and treating it as one resumes fetching a domain that never asked us back. A
    // failed lookup is a third state for the same reason: it is not "no request on file".
    const freeze = await store
      .stayOutFor(watch.domain)
      .then((found) => (found ? 'frozen' : 'clear'))
      .catch(() => 'unknown')
    if (stance === 'out' || (stance === 'unknown' && freeze !== 'clear')) {
      console.log(`watch ${watch.domain}: prosza w robots.txt, zebysmy nie skanowali, pomijam`)
      skipped.push(watch.domain)
      // The monitoring pass is seeded, so it writes the same annotation the reseed does. Whichever
      // pass sees the request first is the date the vendor page prints. Only when we read the
      // request: `lastSeenAt` means we saw it, and on an unreadable file we saw nothing.
      if (stance === 'out') {
        await store
          .recordStayOut(watch.domain)
          .catch((error) => console.error('stay-out request not recorded, watch still skipped', error))
      }
      // Moved to the back of the queue rather than left where it is. The queue is oldest first and
      // this call takes one watch, so a domain that opts out would otherwise be picked and skipped
      // for ever and every watch behind it would starve. Not stopped either: the subscriber paid
      // for this and nobody has told them, and if the block goes away the next pass resumes.
      if (watch.pending) watch.recheckAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
      watch.checkedAt = new Date().toISOString()
      await store.saveWatch(watch)
      continue
    }
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
    // Only a robots.txt we read and found not to name us thaws the row, and only after the fresh
    // measurement is stored.
    if (stance === 'in' && freeze !== 'clear') {
      await store
        .clearStayOut(watch.domain)
        .catch((error) => console.error('stay-out record not cleared, watch continues', error))
    }

    // A chained confirmation can keep comparing with the report before the standing baseline.
    // That is why the pending record carries the report it was measured against instead of merely
    // assuming `lastReportId` still names it.
    const baselineReportId = watch.pending?.baselineReportId ?? watch.lastReportId
    const previous = baselineReportId ? await store.getReport(baselineReportId) : null
    // Two scorecards from two formula versions are not a before and an after. We reseed the
    // corpus every few days and the rules move with it, so without this the first rescan after
    // every formula change mails every watcher a list of verdicts that moved because we changed
    // our mind, under a subject line saying their site lost ground. The baseline is replaced
    // silently and the next comparison is like for like.
    // Rescored rather than skipped, which is the other half of that rule and the half that was
    // missing. Replacing the baseline silently loses any real change that lands in the same window
    // as one of our releases, and on 2026-08-16 there were five releases in a day: a vendor could
    // have broken their signup that morning and the recurring half of the product would never have
    // said so. The previous findings are still on disk, so they can be scored under today's rules
    // and compared like for like. Only `catchAll.bodies` is stripped before storage and scoring
    // does not read it, so the rescored card is the card we would have published then.
    // Guarded, because this is the first time stored findings are put through today's rules: a
    // report old enough to be missing a shape the current checks read would throw here, and the
    // throw would land before saveWatch, so the same watch would be picked again on every call and
    // the queue would stop moving. A baseline we cannot recompute is the old behaviour, not a
    // reason to take the cron down.
    const rescored = (): typeof report.scorecard | null => {
      try {
        return scoreFindings(previous!.findings)
      } catch {
        return null
      }
    }
    const previousCard = previous ? (comparableScorecards(previous.scorecard, report.scorecard) ? previous.scorecard : rescored()) : null
    const comparable = previousCard !== null
    const all = previousCard ? changesBetween(previousCard.checks, report.scorecard.checks) : []
    // A check whose rule we changed between the two measurements is not news about the vendor, and
    // the rescore cannot undo that for a rule that does its reading during the scan. Dropped from
    // the list rather than explained in a paragraph nobody reads under a subject line that already
    // said they lost ground.
    const ourDoing = previousCard
      ? rulesChangedBetween(previous!.scorecard.formulaVersion, report.scorecard.formulaVersion)
      : new Set<string>()
    const changes = all.filter((change) => !ourDoing.has(change.checkId))
    if (all.length !== changes.length) {
      console.log(`watch ${watch.domain}: ${all.length - changes.length} zmian pominietych, bo zmienila sie regula`)
    }
    const edgeTurnedUsAway = turnedAwayAtTheEdge(report.findings, report.domain)
    const defer = (waiting: typeof changes, against: string | null) => {
      watch.pending = {
        baselineReportId: against,
        changes: waiting.map(({ checkId, to }) => ({ checkId, to })),
        since: report.scannedAt,
      }
      watch.recheckAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
      console.log(`watch ${watch.domain}: ${waiting.length} zmian czeka na ponowny pomiar`)
    }

    // Nothing is mailed on the first check: there is no before, and "here is your score again"
    // is the email that teaches somebody to stop reading us. A first sighting against a real
    // baseline waits for the next cron call instead of spending a second scan in this request.
    let advanceBaseline = true
    if (watch.pending && previous && comparable) {
      const waiting = watch.pending.changes
      const confirmed = reproducedChanges(waiting, changes)
      const didNotReproduce = waiting.length - confirmed.length
      console.log(`watch ${watch.domain}: ${didNotReproduce} zmian nie powtorzylo sie przy ponownym pomiarze`)

      if (worthTelling(confirmed, edgeTurnedUsAway)) {
        // A chained round can stand against a report older than `lastReportId`. Keep the score in
        // the opening sentence tied to that same before, just like the verdicts below it.
        const watchAtBaseline = {
          ...watch,
          lastTotal: previousCard.total,
          lastMeasurable: previousCard.measurable ?? previousCard.max,
        }
        const { subject, text, html } = changeEmail(
          watchAtBaseline, report, confirmed, previousCard !== previous.scorecard, previous.scannedAt)
        const sent = await sendEmail(watch.email, subject, text, html)
        if (sent.delivered) mailed += 1
      }

      // A move first seen by this confirming scan has one measurement too. Keep it against this
      // same older report for one more round; advancing the standing baseline must not erase it.
      const newlySeen = unseenChanges(waiting, changes)
      watch.pending = null
      watch.recheckAt = null
      if (worthTelling(newlySeen, edgeTurnedUsAway)) defer(newlySeen, previous.id)
    } else if (!watch.pending && previous && comparable && worthTelling(changes, edgeTurnedUsAway)) {
      defer(changes, previous.id)
      advanceBaseline = false
    } else if (watch.pending) {
      // A vanished or unreadable baseline cannot support an honest intersection. Stand behind the
      // fresh measurement and let the next ordinary comparison start cleanly.
      console.log(`watch ${watch.domain}: ${watch.pending.changes.length} zmian nie dalo sie potwierdzic bez baseline`)
      watch.pending = null
      watch.recheckAt = null
    }

    if (advanceBaseline) {
      watch.lastReportId = report.id
      watch.lastTotal = report.scorecard.total
      watch.lastMeasurable = measurableOf(report)
    }
    watch.checkedAt = new Date().toISOString()
    await store.saveWatch(watch)
    done.push(watch.domain)
  }

  return NextResponse.json({
    checked: done.length,
    mailed,
    // A skipped domain is not remaining work: nothing here will ever check it again until they
    // change robots.txt, and leaving it in the count would make the queue look permanently behind.
    skippedByRobots: skipped,
    remaining: due.length - done.length - skipped.length,
    watches: queue.length,
    longestWaitDays: Math.round(longestWait),
    domains: done,
  })
}
