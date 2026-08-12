import type { Report } from './store'
import type { Watch, WatchChange } from './watch'
import { measurableOf } from './watch'
import { reportUrl } from './email'

const BASE_URL = process.env.STACKPICK_BASE_URL ?? 'http://localhost:3000'

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
): { subject: string; text: string } {
  const worse = changes.filter((change) => change.worse)
  const better = changes.filter((change) => !change.worse)
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

  return {
    subject: subject.replace(/[\r\n]+/g, ' '),
    text: [
      `${watch.domain} is at ${report.scorecard.total} of ${measurable} measurable points${
        watch.lastTotal === null ? '' : `, from ${watch.lastTotal} of ${watch.lastMeasurable}`
      }.`,
      '',
      ...section(`Lost ground (${worse.length}):`, worse),
      ...section(`Gained or moved (${better.length}):`, better),
      `The scan behind this: ${reportUrl(report)}`,
      `Every check and its rule: ${BASE_URL}/methodology`,
      '',
      `Stop these emails: ${stopUrl(watch)}`,
    ].join('\n'),
  }
}
