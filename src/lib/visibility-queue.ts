/** How long one agent call may run before the worker gives up on it. */
export const AGENT_CALL_TIMEOUT_MS = 300_000

/**
 * The queue is served by a laptop, so "queued" and "nobody is home" look identical from the
 * browser. The worker beats between agent calls and the page reads that beat, because a spinner
 * over a dead queue is the same lie as a guard that prints a reassuring line after reading zero
 * rows.
 *
 * The threshold has to clear one whole agent call. The agents run through `spawnSync`, which holds
 * the event loop for the entire call, so a timer cannot beat during one: a worker in the middle of
 * a five-minute call would read as absent and the page would accuse itself of doing nothing while
 * measuring. That is the same false claim in the other direction, which is why this is derived from
 * the timeout rather than picked.
 */
export const WORKER_SILENT_AFTER_MS = AGENT_CALL_TIMEOUT_MS + 120_000

/**
 * `unknown` is its own state on purpose. A heartbeat we could not read is not a heartbeat that is
 * missing, and telling a visitor nobody is working because our own database blinked is the same
 * false accusation this panel exists to prevent.
 */
export type VisibilityQueueState = {
  waitingMinutes: number
  worker: 'online' | 'silent' | 'never' | 'unknown'
  workerSilentMinutes: number | null
  line: string
}

const minutesBetween = (from: string, to: number) => Math.max(0, Math.round((to - new Date(from).getTime()) / 60_000))
const forHumans = (minutes: number) =>
  minutes < 1 ? 'less than a minute' : minutes === 1 ? '1 minute' : minutes < 90 ? `${minutes} minutes` : `${Math.round(minutes / 60)} hours`

/**
 * `now` and `workerSeenAt` must come from the same side of the wire. The caller is the server for
 * exactly that reason: the visitor's laptop clock is not evidence about our worker.
 */
export function visibilityQueueState(
  job: { status: string; createdAt: string; startedAt?: string },
  workerSeenAt: string | null | undefined,
  now: number,
): VisibilityQueueState {
  const waitingMinutes = minutesBetween(job.status === 'running' ? job.startedAt ?? job.createdAt : job.createdAt, now)
  const workerSilentMinutes = typeof workerSeenAt === 'string' ? minutesBetween(workerSeenAt, now) : null
  const worker = workerSeenAt === undefined
    ? 'unknown'
    : workerSeenAt === null
      ? 'never'
      : now - new Date(workerSeenAt).getTime() < WORKER_SILENT_AFTER_MS
        ? 'online'
        : 'silent'
  const saved = 'It stays saved at this URL and runs when a worker is back.'
  // A running job asks after its own worker, so silence there means that process is gone, not that
  // the queue is unstaffed. The queue hands an abandoned job to the next worker after fifteen
  // minutes, and saying so is more use to the visitor than a count of minutes.
  const gone = job.status === 'running'
    ? `The worker that took this audit stopped reporting in, so nothing is measuring it right now. Another worker picks it up within fifteen minutes.`
    : worker === 'never'
      ? `No audit worker has reported in recently, so nothing is measuring this audit right now. ${saved}`
      : `No audit worker has reported in for ${forHumans(workerSilentMinutes ?? 0)}, so nothing is measuring this audit right now. ${saved}`
  const line = worker === 'unknown'
    ? `We could not check whether a worker is on shift, so this says nothing either way. ${saved}`
    : worker === 'online'
      ? `${job.status === 'running' ? 'A worker is asking the agents' : 'A worker is online and this audit is queued behind other work'}. Waiting ${forHumans(waitingMinutes)} so far.`
      : gone
  return { waitingMinutes, worker, workerSilentMinutes, line }
}
