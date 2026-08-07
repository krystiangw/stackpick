import type { Report } from './store'

const FROM = process.env.STACKPICK_FROM ?? 'StackPick <reports@stackpick.ai>'
const BASE_URL = process.env.STACKPICK_BASE_URL ?? 'http://localhost:3000'

export type SendResult = { delivered: boolean; detail: string }

export function reportUrl(report: Pick<Report, 'id'>): string {
  return `${BASE_URL}/r/${report.id}`
}

export function scorecardEmail(report: Report): { subject: string; text: string } {
  const { scorecard, domain } = report
  const failing = scorecard.checks.filter((check) => check.points < check.max)
  const worst = failing.slice(0, 3)

  const subject = `${domain}: agent readiness ${scorecard.total} of ${scorecard.max}`
  const lines = [
    `${domain} scores ${scorecard.total} of ${scorecard.max} on agent readiness.`,
    '',
    'By stage:',
    ...scorecard.stages.map((stage) => `  ${stage.letter}  ${stage.title.padEnd(14)} ${stage.points}/${stage.max}`),
    '',
    worst.length > 0 ? 'The three that cost the most:' : 'Nothing is failing, which is rare.',
    ...worst.map((check) => `  - ${check.label}: ${check.detail}`),
    '',
    `Full scorecard: ${reportUrl(report)}`,
    '',
    'Every check is an HTTP request with a published rule, so you can reproduce this yourself.',
    `Formula: ${BASE_URL}/methodology`,
  ]
  return { subject, text: lines.join('\n') }
}

export async function sendEmail(to: string, subject: string, text: string): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.log(`[email not configured] to=${to} subject=${subject}\n${text}`)
    return { delivered: false, detail: 'RESEND_API_KEY is not set, so the message was logged instead of sent.' }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, text }),
  })

  if (!response.ok) {
    return { delivered: false, detail: `Resend answered ${response.status}: ${await response.text()}` }
  }
  return { delivered: true, detail: 'sent' }
}
