import { buildFixPlan } from './fixfirst'
import { pickHeadline } from './headline'
import type { Report } from './store'

const FROM = process.env.STACKPICK_FROM ?? 'StackPick <onboarding@resend.dev>'
const BASE_URL = process.env.STACKPICK_BASE_URL ?? 'http://localhost:3000'

export type SendResult = { delivered: boolean; detail: string }

export function reportUrl(report: Pick<Report, 'id'>): string {
  return `${BASE_URL}/r/${report.id}`
}

const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function scorecardEmail(report: Report): { subject: string; text: string; html: string } {
  const { scorecard, findings, domain } = report
  const headline = pickHeadline(findings, scorecard)
  const plan = buildFixPlan(findings, scorecard)
  const url = reportUrl(report)

  // The subject is the finding, not the product name. A subject line that could have been
  // sent to a thousand companies gets treated as if it was.
  const subject = `${domain}: ${headline.claim}`

  const text = [
    headline.claim,
    '',
    headline.evidence,
    '',
    `Agent readiness: ${scorecard.total} of ${scorecard.max}`,
    ...scorecard.stages.map((stage) => `  ${stage.letter}  ${stage.title.padEnd(14)} ${stage.points}/${stage.max}`),
    '',
    plan ? plan.claim : '',
    ...(plan ? plan.quickWins.map((step) => `  ${step.gain > 0 ? `+${step.gain}` : ''} ${step.label} (${step.effort}): ${step.how}`) : []),
    '',
    `Full scorecard: ${url}`,
    `How it is scored: ${BASE_URL}/methodology`,
    '',
    'Every check is one HTTP request with a published rule, so you can reproduce all of it.',
  ]
    .filter((line, index, all) => !(line === '' && all[index - 1] === ''))
    .join('\n')

  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 16px 6px 0;color:#8a8b8f;font:13px ui-monospace,SFMono-Regular,Menlo,monospace">${escape(label)}</td>` +
    `<td style="padding:6px 0;font:13px ui-monospace,SFMono-Regular,Menlo,monospace;color:#16181c">${escape(value)}</td></tr>`

  const html = `<!doctype html>
<html><body style="margin:0;background:#faf9f6;padding:32px 16px">
<table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dedbd2">
  <tr><td style="padding:32px 32px 0">
    <div style="font:12px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:2px;text-transform:uppercase;color:#9a7318">
      Agent readiness &middot; ${escape(domain)}
    </div>
    <h1 style="margin:20px 0 0;font:600 26px/1.25 ui-sans-serif,system-ui,sans-serif;color:#16181c;letter-spacing:-0.5px">
      ${escape(headline.claim)}
    </h1>
    <p style="margin:16px 0 0;font:14px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;color:#55575c">
      ${escape(headline.evidence)}
    </p>
  </td></tr>

  <tr><td style="padding:28px 32px 0">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid #dedbd2;padding-top:20px">
      <tr><td style="padding-top:20px">
        <span style="font:700 44px ui-sans-serif,system-ui,sans-serif;color:${
          scorecard.total <= scorecard.max / 3 ? '#a4382a' : scorecard.total >= (scorecard.max * 2) / 3 ? '#2c6a4c' : '#9a4f0a'
        }">${scorecard.total}</span>
        <span style="font:16px ui-sans-serif,system-ui,sans-serif;color:#8a8b8f"> / ${scorecard.max}</span>
      </td></tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:18px">
      <tr>
        ${scorecard.stages
          .map((stage) => {
            const share = stage.max > 0 ? stage.points / stage.max : 0
            const fill = share >= 0.67 ? '#2c6a4c' : share >= 0.34 ? '#9a4f0a' : '#a4382a'
            const filled = share === 0 ? 2 : Math.max(Math.round(share * 56), 5)
            return `<td style="padding-right:8px;vertical-align:bottom">
              <table role="presentation" cellpadding="0" cellspacing="0" width="26">
                <tr><td height="${56 - filled}" style="background:#e3dfd4;font-size:0;line-height:0">&nbsp;</td></tr>
                <tr><td height="${filled}" style="background:${fill};font-size:0;line-height:0">&nbsp;</td></tr>
              </table>
            </td>`
          })
          .join('')}
      </tr>
      <tr>
        ${scorecard.stages
          .map(
            (stage) =>
              `<td style="padding:6px 8px 0 0;font:11px ui-monospace,SFMono-Regular,Menlo,monospace;color:#8a8b8f;text-align:center;width:26px">${stage.letter}</td>`,
          )
          .join('')}
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:14px">
      ${scorecard.stages.map((stage) => row(`${stage.letter} · ${stage.title}`, `${stage.points}/${stage.max}`)).join('')}
    </table>
  </td></tr>

  ${
    plan
      ? `<tr><td style="padding:24px 32px 0">
    <div style="border-top:1px solid #dedbd2;padding-top:20px">
      <div style="font:12px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:1.5px;text-transform:uppercase;color:#9a7318">Fix this first</div>
      <p style="margin:12px 0 0;font:600 18px/1.4 ui-sans-serif,system-ui,sans-serif;color:#16181c">${escape(plan.claim)}</p>
      <ol style="margin:14px 0 0;padding-left:18px;font:14px/1.7 ui-sans-serif,system-ui,sans-serif;color:#55575c">
        ${plan.quickWins
          .map(
            (step) =>
              `<li><strong style="color:#16181c">${escape(step.label)}</strong> <span style="font:11px ui-monospace,SFMono-Regular,Menlo,monospace;color:#8a8b8f">${escape(step.effort)} &middot; +${step.gain}</span><br>${escape(step.how)}</li>`,
          )
          .join('')}
      </ol>
    </div>
  </td></tr>`
      : ''
  }

  <tr><td style="padding:28px 32px 32px">
    <a href="${url}" style="display:inline-block;background:#16181c;color:#faf9f6;text-decoration:none;padding:12px 22px;font:14px ui-monospace,SFMono-Regular,Menlo,monospace">
      Open the full scorecard
    </a>
    <p style="margin:20px 0 0;font:12px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;color:#8a8b8f">
      Every check is one HTTP request with a published rule, so you can reproduce all of it:
      <a href="${BASE_URL}/methodology" style="color:#9a7318">${BASE_URL}/methodology</a>
    </p>
  </td></tr>
</table>
</body></html>`

  return { subject, text, html }
}

export async function sendEmail(to: string, subject: string, text: string, html?: string): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.log(`[email not configured] to=${to} subject=${subject}\n${text}`)
    return { delivered: false, detail: 'RESEND_API_KEY is not set, so the message was logged instead of sent.' }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, text, ...(html ? { html } : {}) }),
  })

  if (!response.ok) {
    return { delivered: false, detail: `Resend answered ${response.status}: ${await response.text()}` }
  }
  return { delivered: true, detail: 'sent' }
}
