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
  job: { status: string; createdAt: string; startedAt?: string; depth?: VisibilityDepthName },
  workerSeenAt: string | null | undefined,
  now: number,
  spentToday?: number,
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
  // the queue is unstaffed. An abandoned job goes to the next worker once its own heartbeat stops,
  // and saying that is more use to the visitor than a count of minutes.
  const gone = job.status === 'running'
    ? `The worker that took this audit stopped reporting in, so nothing is measuring it right now. Another worker picks it up once that process stops reporting in.`
    : worker === 'never'
      ? `No audit worker has reported in recently, so nothing is measuring this audit right now. ${saved}`
      : `No audit worker has reported in for ${forHumans(workerSilentMinutes ?? 0)}, so nothing is measuring this audit right now. ${saved}`
  // A queued audit with a worker on shift and no budget left is waiting on the budget, not on the
  // worker, and the budget comes back at a known hour while a worker's return does not.
  const outOfBudget = spentToday !== undefined && job.status === 'queued' && !budgetVerdict(spentToday, now).allowed
  const line = worker === 'unknown'
    ? `We could not check whether a worker is on shift, so this says nothing either way. ${saved}`
    : worker === 'online'
      ? outOfBudget
        ? `A worker is online, but today's observation budget is spent. This beta runs on one operator's own subscriptions, so the audit waits for the budget to reset at 00:00 UTC.`
        : `${job.status === 'running' ? 'A worker is asking the agents' : 'A worker is online and this audit is queued behind other work'}. Waiting ${forHumans(waitingMinutes)} so far.`
      : gone
  return { waitingMinutes, worker, workerSilentMinutes, line }
}

export type VisibilityDepthName = 'quick' | 'full'

/**
 * One observation is one agent asked one question. The counts live here so the form, the worker and
 * the budget cannot drift: the form advertises four and twelve, and it has to be the same four and
 * twelve the worker runs and the budget spends.
 */
export const PROMPTS_PER_DEPTH: Record<VisibilityDepthName, number> = { quick: 1, full: 3 }
export const SURFACES_PER_PROMPT = 4
export const observationsFor = (depth: VisibilityDepthName) => PROMPTS_PER_DEPTH[depth] * SURFACES_PER_PROMPT

/**
 * The rate limiter is per caller, in memory, and its own comment says that is the right trade
 * "while a scan costs bandwidth and nothing else". This beta broke that premise: every observation
 * spends an operator's own subscription quota, and the Anthropic one is shared with the work he does
 * all day. So there is a second, global ceiling, counted in the database rather than in a dyno.
 *
 * The number is a judgement, not a measurement: fifteen quick audits, or five full ones, a day.
 *
 * The gate is "is there any budget left", not "does this job fit". A job that does not fit is still
 * taken, so the day can overshoot by at most one audit. Refusing the job that does not fit sounds
 * tighter and is worse: the queue is claimed oldest first, so an unaffordable full audit at the head
 * would sit there blocking every quick one behind it until midnight.
 */
export const DAILY_OBSERVATION_BUDGET = 60

export const startOfUtcDay = (now: number) => new Date(new Date(now).toISOString().slice(0, 10) + 'T00:00:00.000Z')

export function budgetVerdict(spentToday: number, now: number, budget = DAILY_OBSERVATION_BUDGET) {
  const resetsAt = startOfUtcDay(now).getTime() + 86_400_000
  return {
    allowed: spentToday < budget,
    retryAfterSeconds: Math.max(1, Math.ceil((resetsAt - now) / 1000)),
    line: spentToday < budget
      ? ''
      : 'The beta runs on one operator’s own subscriptions and today’s budget is spent. It resets at 00:00 UTC.',
  }
}
