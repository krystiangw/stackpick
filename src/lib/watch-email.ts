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

const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const states: Record<WatchChange['to'], string> = {
  pass: 'Meets this check', partial: 'Partly meets this check', fail: 'Does not meet this check',
  unmeasured: 'Could not verify', notApplicable: 'Does not apply',
}
const CONFIRMATION = 'Each change appeared in two scans. Changes seen only once are held for another check.'
const UNMEASURED = 'We could not verify these checks. They do not count against your score; the scan explains what prevented measurement.'
const RESCORED = 'We updated our checks. The earlier score was recomputed from the evidence we still hold. Some older readings cannot be recomputed without the original pages, so a result may differ because we tightened a rule. Reply if a change looks wrong.'

function describe(change: WatchChange): { title: string; detail: string; source?: string } {
  // This is a shorter rendering of a specific recorded observation, never a claim about the
  // whole product or the cause of the change. Other evidence keeps its original wording.
  const policy = change.checkId === 'agent_entry_point' && change.to === 'partial'
    ? /^Found (https?:\/\/\S+), but it states a policy rather than a procedure: nothing in it names a credential, an endpoint or a way to get an account\.$/.exec(change.detail) : null
  if (policy) return {
    title: 'Agent information found, setup steps missing',
    detail: 'We found an agent information file. It describes a policy, but does not name an API endpoint, credentials or a way to create an account.',
    source: policy[1],
  }
  const outcome = change.to === 'unmeasured' ? 'could not verify'
    : change.to === 'notApplicable' ? 'no longer applies'
    : change.to === 'pass' ? 'now meets this check'
    : change.to === 'partial' ? 'partly meets this check' : 'does not meet this check'
  return { title: `${change.label}: ${outcome}`, detail: change.detail }
}

/** Confirmed scan changes, with a short reading view and the full evidence one click away. */
export function changeEmail(
  watch: Watch,
  report: Report,
  changes: WatchChange[],
  rescoredBaseline = false,
  measuredBefore: string | null = null,
): { subject: string; text: string; html: string } {
  if (!changes.length) throw new Error('A change email needs at least one confirmed change')
  const worse = changes.filter(change => change.worse)
  const unreadable = changes.filter(change => !change.worse && change.to === 'unmeasured')
  const other = changes.filter(change => !change.worse && change.to !== 'unmeasured')
  // Unverified readings get their own category, never an improvement label.
  const groups = [
    { title: 'Checks that declined', changes: worse },
    { title: 'Other changes', changes: other },
    { title: 'Could not verify', changes: unreadable },
  ].filter(group => group.changes.length)
  const ordered = groups.flatMap(group => group.changes)
  const lead = describe(ordered[0])
  const visible = ordered.slice(0, 3)
  const remaining = ordered.length - visible.length
  const url = reportUrl(report)
  const score = `Scan score: ${report.scorecard.total}/${measurableOf(report)} measurable points.`
  const baseline = watch.lastTotal === null ? ''
    : `Previous: ${watch.lastTotal}/${watch.lastMeasurable}${measuredBefore ? `, measured on ${measuredBefore.slice(0, 10)}` : ''}.`
  const lost = worse[0]
  const scored = lost ? report.scorecard.checks.find(check => check.id === lost.checkId) : undefined
  const step = scored ? remedyFor(report.findings, scored) : null
  const next = step ? `Suggested next step for ${lost.label.toLowerCase()}: ${step}` : null
  const context = 'This update concerns the HTTP scan. It does not establish whether an agent can complete an integration.'
  const extra = remaining ? `${remaining} more confirmed ${remaining === 1 ? 'change is' : 'changes are'} listed below.` : ''
  const subject = `${watch.domain}: ${lead.title.charAt(0).toLowerCase()}${lead.title.slice(1)}`.replace(/[\r\n]+/g, ' ')
  // Keep all observations in both formats. Additional changes are concise status lines; their
  // recorded explanations remain in the linked scan, rather than filling the inbox with logs.
  const compact = ordered.slice(3).map(change => `${change.label}: ${states[change.from]} -> ${states[change.to]}`)
  const text = [
    watch.domain, '', lead.title, '',
    ...visible.flatMap((change, index) => {
      const item = describe(change)
      return [...(index ? [item.title] : []), item.detail, ...(item.source ? [`Agent file: ${item.source}`] : []),
        `Previously: ${states[change.from]}. Now: ${states[change.to]}.`, '']
    }),
    ...(next ? [next, ''] : []),
    ...(remaining ? [extra, ...compact, ''] : []),
    ...(unreadable.length ? [UNMEASURED, ''] : []),
    ...(rescoredBaseline ? [RESCORED, ''] : []),
    `View scan and evidence: ${url}`, '', score, ...(baseline ? [baseline] : []),
    '', CONFIRMATION, context, '',
    'Questions about this change? Reply to this email.',
    `How we check: ${BASE_URL}/methodology`,
    `Unsubscribe from ${watch.domain} updates: ${stopUrl(watch)}`,
  ].join('\n')
  const paragraph = (value: string, small = false) => `<p style="margin:12px 0;font-size:${small ? 13 : 16}px;line-height:1.6;color:${small ? '#66645f' : '#302e29'}">${escape(value)}</p>`
  const cards = visible.map((change, index) => {
    const item = describe(change)
    return `<div style="${index ? 'border-top:1px solid #e5e1d8;padding-top:18px;margin-top:22px' : ''}">
      ${index ? `<h2 style="font-size:19px;line-height:1.35;margin:0">${escape(item.title)}</h2>` : ''}
      ${paragraph(item.detail)}
      ${item.source ? `<p style="margin:10px 0"><a href="${escape(item.source)}" style="color:#805d10;text-decoration:underline">Read the agent file</a></p>` : ''}
      ${paragraph(`Previously: ${states[change.from]}. Now: ${states[change.to]}.`, true)}
    </div>`
  }).join('')
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light">
<style>@media(max-width:480px){.content{padding:24px 20px!important}.outer{padding:16px 8px!important}}</style></head>
<body style="margin:0;background:#f7f6f2;font-family:Arial,Helvetica,sans-serif;color:#24231f;word-break:break-word;overflow-wrap:anywhere">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${escape(`${changes.length} confirmed ${changes.length === 1 ? 'change' : 'changes'} in your latest scan.`)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="outer" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e5e1d8;border-radius:12px"><tr><td class="content" style="padding:32px">
<p style="margin:0 0 24px;font-size:14px;color:#805d10;font-weight:bold">Let Agents In <span style="color:#777;font-weight:normal">/ ${escape(watch.domain)}</span></p>
<h1 style="font-size:28px;line-height:1.2;letter-spacing:-0.5px;margin:0 0 20px">${escape(lead.title)}</h1>
${cards}
${next ? `<div style="background:#f7f6f2;border-left:3px solid #ad842e;padding:4px 16px;margin:20px 0">${paragraph(next)}</div>` : ''}
${remaining ? `${paragraph(extra, true)}<ul style="padding-left:20px;font-size:14px;line-height:1.6">${compact.map(line => `<li>${escape(line)}</li>`).join('')}</ul>` : ''}
${unreadable.length ? paragraph(UNMEASURED, true) : ''}
${rescoredBaseline ? paragraph(RESCORED, true) : ''}
<p style="margin:26px 0"><a href="${escape(url)}" style="display:inline-block;background:#24231f;color:#fff;padding:14px 20px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:bold">View scan and evidence</a></p>
<div style="border-top:1px solid #e5e1d8;padding-top:12px">${paragraph(`${score} ${baseline}`.trim(), true)}${paragraph(CONFIRMATION, true)}${paragraph(context, true)}</div>
${paragraph('Questions about this change? Reply to this email.', true)}
<p style="margin:20px 0 0;font-size:12px;line-height:1.7"><a href="${BASE_URL}/methodology" style="color:#66645f">How we check</a> &nbsp; &middot; &nbsp; <a href="${escape(stopUrl(watch))}" style="color:#66645f">Unsubscribe from ${escape(watch.domain)} updates</a></p>
</td></tr></table></td></tr></table></body></html>`
  return { subject, text, html }
}
