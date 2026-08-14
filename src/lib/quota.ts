import { clusterUsage } from './store-mongo'

/**
 * How close the cluster is to refusing writes, asked before it does.
 *
 * On 13 August writes were rejected for about an hour and the first sign was a scan failing for a
 * visitor. Nothing was watching the one number that predicts it, and the health check could not
 * help: it reports whether a write succeeds, which goes from true to false with no warning in
 * between. This is the warning in between.
 *
 * Atlas Flex bills `dataSize` plus indexes, not `storageSize`, and the two diverge by an order of
 * magnitude after a large delete. Reading the wrong one has already produced one wrong diagnosis
 * in each direction, so this module takes the billed figure only.
 */
export const FLEX_QUOTA_MB = 5120

/**
 * Warn at 80 per cent because the cluster is shared with another project that we do not control
 * and cannot prune, so the headroom can move without us writing a single row.
 */
const WARN_AT = 0.8
const CRITICAL_AT = 0.92

/** Split out so the thresholds can be tested without a cluster to point at. */
export function verdictFor(usedMb: number): QuotaReading['verdict'] {
  const percent = usedMb / FLEX_QUOTA_MB
  return percent >= CRITICAL_AT ? 'critical' : percent >= WARN_AT ? 'warning' : 'ok'
}

export type QuotaReading = {
  usedMb: number
  quotaMb: number
  percent: number
  verdict: 'ok' | 'warning' | 'critical'
  /** Largest first, because the answer to "what do we delete" is never the smallest one. */
  databases: { name: string; mb: number }[]
  measuredAt: string
}

export async function measureQuota(): Promise<QuotaReading> {
  const databases = await clusterUsage()
  const usedMb = databases.reduce((total, database) => total + database.mb, 0)
  const percent = usedMb / FLEX_QUOTA_MB
  return {
    usedMb: Math.round(usedMb),
    quotaMb: FLEX_QUOTA_MB,
    percent: Math.round(percent * 1000) / 10,
    verdict: verdictFor(usedMb),
    databases: databases.map((d) => ({ ...d, mb: Math.round(d.mb) })).sort((a, b) => b.mb - a.mb),
    measuredAt: new Date().toISOString(),
  }
}

/**
 * The mail is addressed to whoever runs this, not to a customer, so it says what to do rather
 * than what happened. Both remedies are named because the largest database is usually not ours.
 */
export function quotaEmail(reading: QuotaReading): { subject: string; text: string } {
  const worst = reading.databases[0]
  const lines = reading.databases.filter((d) => d.mb > 0).map((d) => `  ${d.name}: ${d.mb} MB`)
  return {
    subject: `Atlas ${reading.percent}% of ${reading.quotaMb} MB (${reading.verdict})`,
    text: [
      `The cluster is at ${reading.usedMb} MB of ${reading.quotaMb} MB billed, which is ${reading.percent} per cent.`,
      '',
      'By database:',
      ...lines,
      '',
      `Largest is ${worst?.name}. If that is stackpick, run:`,
      '  MONGODB_URI=$(heroku config:get MONGODB_URI -a stackpick) npx tsx scripts/prune-reports.mts --delete',
      'If it is another project, this cluster is shared and the space has to come from there.',
      '',
      'Writes start being rejected near the quota, and when they do a scan fails for whoever asked for it.',
    ].join('\n'),
  }
}
