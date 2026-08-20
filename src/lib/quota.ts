import { clusterUsage, ourDatabaseName } from './store-mongo'

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
 * Warn at 80 per cent. Until 20 August the reason was a neighbour we could not prune: the cluster
 * belonged to another project and the headroom moved without us. We now have the cluster to
 * ourselves, and the margin stays where it is for a different reason that outlives the move: a
 * full sweep rewrites every row in the corpus, so the billed figure climbs in steps rather than
 * drifting, and a threshold set close to the wall would leave no room to prune between two steps.
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
 * than what happened.
 *
 * Which remedy it names follows the reading, never an assumption about who else lives here. The
 * line about a shared cluster was true while we were guests on another project's Flex and became
 * false the moment we moved; an alarm that hands out a stale remedy in the middle of an outage is
 * worse than one that says less. So: name the neighbour only when the measurement shows one.
 */
// The command carries the database name as well as the URI. Without it the script falls back to
// its own default, so on a renamed database the remedy would inspect and delete somewhere other
// than the megabytes this mail just reported (codex, fourth pass).
// Quoted because this line is meant to be pasted into a shell during an incident, and MongoDB
// permits names our own config var could carry with a space in them. Cheap here, silent breakage
// at exactly the wrong moment otherwise.
const forShell = (value: string) => `'${value.replaceAll("'", `'\\''`)}'`
const pruneCommand = () =>
  `  MONGODB_DB=${forShell(ourDatabaseName())} MONGODB_URI=$(heroku config:get MONGODB_URI -a stackpick) npx tsx scripts/prune-reports.mts --delete`

/** Atlas keeps its own bookkeeping beside ours; those are not a neighbouring project. */
const ATLAS_BOOKKEEPING = new Set(['admin', 'local', 'config'])
const isOursOrAtlas = (name: string) => name === ourDatabaseName() || ATLAS_BOOKKEEPING.has(name)

export function quotaEmail(reading: QuotaReading): { subject: string; text: string } {
  const worst = reading.databases[0]
  const sharesWith = reading.databases.map((d) => d.name).filter((name) => !isOursOrAtlas(name))
  // Not the whole reading: `admin` and friends are Atlas's own bookkeeping, and telling the reader
  // to prune them during an incident sends them at megabytes that will not move. Codex caught this
  // in the first version of the branch below, which called every listed megabyte ours.
  const oursMb = reading.databases.filter((d) => d.name === ourDatabaseName()).reduce((total, d) => total + d.mb, 0)
  // Every database, not only those over half a megabyte: lines that do not add up to the total
  // invite the reader to distrust the total, and the total is the point of the mail.
  const lines = reading.databases.map((d) => `  ${d.name}: ${d.mb} MB`)
  return {
    subject: `Atlas ${reading.percent}% of ${reading.quotaMb} MB (${reading.verdict})`,
    text: [
      `The cluster is at ${reading.usedMb} MB of ${reading.quotaMb} MB billed, which is ${reading.percent} per cent.`,
      '',
      'By database:',
      ...lines,
      '',
      `Largest is ${worst?.name ?? 'unknown, because the reading came back empty'}.`,
      ...(sharesWith.length > 0
        ? [
            `This cluster also holds ${sharesWith.join(', ')}, which we do not prune. If the space has to come from there, it is not ours to take.`,
            `If the largest is ${ourDatabaseName()}, run:`,
            pruneCommand(),
          ]
        : [
            `No other project lives here. Of the ${reading.usedMb} MB, ${oursMb} MB is ${ourDatabaseName()} and ours to prune; the rest is Atlas bookkeeping we cannot touch:`,
            pruneCommand(),
          ]),
      '',
      'Writes start being rejected near the quota, and when they do a scan fails for whoever asked for it.',
    ].join('\n'),
  }
}
