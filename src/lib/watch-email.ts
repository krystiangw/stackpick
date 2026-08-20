import type { Report } from './store'
import type { Watch, WatchChange } from './watch'
import { measurableOf } from './watch'
import { reportUrl } from './email'
import { remedyFor } from './fixfirst'
import { SITE_URL } from './site'

// Jak w `email.ts`: link potwierdzajacy i link wypisujacy sa jedynym mechanizmem zgody, jaki ten
// produkt ma, wiec nie moga spasc na localhost.
const BASE_URL = SITE_URL

export const confirmUrl = (watch: Watch) => `${BASE_URL}/watch/confirm/${watch.id}`
export const stopUrl = (watch: Watch) => `${BASE_URL}/watch/stop/${watch.id}`

/**
 * The address has to be confirmed before we mail it weekly, and the confirmation is also the
 * only unsubscribe anybody needs: one link that starts it, one that ends it, no account to
 * remember. We ask for a domain and an address and nothing else, which is the same bar we hold
 * every vendor to on the signup checks.
 */
export function confirmEmail(watch: Watch): { subject: string; text: string } {
  return {
    subject: `Confirm you want ${watch.domain} watched`,
    text: [
      `You asked us to watch ${watch.domain} and tell you when its agent readiness changes.`,
      '',
      `Confirm: ${confirmUrl(watch)}`,
      '',
      'If that was not you, ignore this and nothing happens. We do not mail an address that has',
      'not been confirmed, and the link above is the only thing that starts it.',
      '',
      `Stop at any time: ${stopUrl(watch)}`,
    ].join('\n'),
  }
}

const arrow = (change: WatchChange) => `${change.from} to ${change.to}`

/**
 * What changed, worst first, and nothing else. A weekly email that says "no change" trains
 * somebody to stop opening it, so this is only ever sent when a verdict actually moved.
 */
export function changeEmail(
  watch: Watch,
  report: Report,
  changes: WatchChange[],
  /**
   * True when the rules moved since the last measurement, so the before was recomputed from the
   * findings we already held rather than read off what we published then. The comparison is still
   * like for like, but a line of it can be ours rather than theirs: when we start probing an
   * address we never asked before, a vendor who changed nothing reads "gained". Saying so costs
   * one sentence and is the difference between a report and a boast.
   */
  rescoredBaseline = false,
  /**
   * When the before was measured, read off the previous report rather than off the watch.
   * `checkedAt` says when we last looked, and looking is not measuring: a domain whose robots.txt
   * asks us out moves its `checkedAt` on every pass without touching the score, so a baseline two
   * months old would have been dated to yesterday. Null when we do not hold that report.
   */
  measuredBefore: string | null = null,
): { subject: string; text: string } {
  const worse = changes.filter((change) => change.worse)
  // A check falling out of measurement is not a gain, and it was being listed under a heading with
  // the word "gained" in it. "llms.txt published: pass to unmeasured, the host refused ordinary
  // requests" is the single most important line we can send a vendor, because their edge turning
  // agents away changes nothing a person sees in a browser, and it read as good news.
  const unreadable = changes.filter((change) => !change.worse && change.to === 'unmeasured')
  const better = changes.filter((change) => !change.worse && change.to !== 'unmeasured')
  const measurable = measurableOf(report)
  const headline = worse.length > 0 ? worse[0] : changes[0]

  const subject =
    worse.length > 0
      ? `${watch.domain}: ${headline.label.toLowerCase()} went ${arrow(headline)}`
      : `${watch.domain}: ${headline.label.toLowerCase()} now ${headline.to}`

  const section = (title: string, list: WatchChange[]) =>
    list.length === 0
      ? []
      : [title, ...list.flatMap((change) => [`  ${change.label}: ${arrow(change)}`, `    ${change.detail}`]), '']

  // One instruction, for the worst thing that happened, and only when we publish one for that
  // check. A mail that says a vendor lost a point and leaves them to find the page that explains
  // what to do is an alert; this is the difference between an alert and a service somebody pays
  // for monthly. The whole plan stays in the report: more than one step here would bury the change.
  const lost = worse[0]
  const scored = lost ? report.scorecard.checks.find((check) => check.id === lost.checkId) : undefined
  const step = scored ? remedyFor(report.findings, scored) : null

  return {
    subject: subject.replace(/[\r\n]+/g, ' '),
    text: [
      `${watch.domain} is at ${report.scorecard.total} of ${measurable} measurable points${
        watch.lastTotal === null
          ? ''
          : `, from ${watch.lastTotal} of ${watch.lastMeasurable}${measuredBefore ? ` measured on ${measuredBefore.slice(0, 10)}` : ''}`
      }.`,
      '',
      'Every verdict listed here was measured twice, about half an hour apart; a verdict that moved only once is not in this email.',
      '',
      ...section(`Lost ground (${worse.length}):`, worse),
      ...(step ? [`What to do about ${lost.label.toLowerCase()}: ${step}`, ''] : []),
      ...section(`Gained or moved (${better.length}):`, better),
      ...section(`We could not measure it this time (${unreadable.length}):`, unreadable),
      ...(unreadable.length > 0
        ? [
            'That is not a verdict about you, and nothing in this last group counts against your score. Sometimes it is your edge turning a non-browser away, which is worth knowing because it changes nothing a person sees in a browser, and sometimes it is our own reach. The reason we have is on the line itself.',
            '',
          ]
        : []),
      ...(rescoredBaseline
        ? [
            'Our checks changed since your last measurement, so the before above was recomputed from the evidence we still hold rather than taken from the older score. That recompute is honest for a check whose rule reads a stored measurement, and it is not the whole story for a check whose reading was made during the scan itself: we keep what those rules matched, not the pages they matched it in, so the older reading stands and a line can move because we tightened a rule rather than because anything changed on your side. Where you think that is what happened, say so and we will rescan and correct it.',
            '',
          ]
        : []),
      `The scan behind this: ${reportUrl(report)}`,
      `Every check and its rule: ${BASE_URL}/methodology`,
      '',
      `Stop these emails: ${stopUrl(watch)}`,
    ].join('\n'),
  }
}
