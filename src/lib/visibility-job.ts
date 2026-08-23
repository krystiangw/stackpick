import { randomBytes } from 'node:crypto'
import { MongoClient } from 'mongodb'
import type { VisibilityAudit } from './visibility-audit'
import { budgetVerdict, DAILY_OBSERVATION_BUDGET, observationsFor, visibilityQueueState, WORKER_SILENT_AFTER_MS, type VisibilityQueueState } from './visibility-queue'
export { WORKER_SILENT_AFTER_MS } from './visibility-queue'

export type VisibilityDepth = 'quick' | 'full'
export type VisibilityJob = {
  id: string
  brand: string
  domain: string
  category: string
  depth: VisibilityDepth
  status: 'queued' | 'running' | 'complete' | 'failed'
  createdAt: string
  startedAt?: string
  finishedAt?: string
  worker?: string
  error?: string
  result?: VisibilityAudit
}

let client: Promise<MongoClient> | null = null
const jobs = async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required for production audit jobs.')
  client ??= new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 3, serverSelectionTimeoutMS: 8_000 }).connect()
  const collection = (await client).db(process.env.MONGODB_DB || 'stackpick').collection<VisibilityJob>('visibilityJobs')
  await collection.createIndex({ id: 1 }, { unique: true }).catch(() => undefined)
  await collection.createIndex({ status: 1, createdAt: 1 }).catch(() => undefined)
  await collection.createIndex({ createdAt: 1 }).catch(() => undefined)
  return collection
}

export async function createVisibilityJob(input: Pick<VisibilityJob, 'brand' | 'domain' | 'category' | 'depth'>) {
  const job: VisibilityJob = {
    ...input,
    id: randomBytes(16).toString('hex'),
    status: 'queued',
    createdAt: new Date().toISOString(),
  }
  // The Mongo driver mutates the inserted object by attaching `_id`. Insert a copy so the public
  // 202 response contains only our random job identifier and never a database implementation id.
  await (await jobs()).insertOne({ ...job })
  return job
}

/**
 * The day the budget belongs to comes from the database, not from whoever is asking. The worker is a
 * laptop; a clock an hour into tomorrow would reserve against a fresh day while today's sixty are
 * already spent. Heartbeats are stamped with `$currentDate` for the same reason.
 */
export async function databaseNow(): Promise<number> {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required for production audit jobs.')
  client ??= new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 3, serverSelectionTimeoutMS: 8_000 }).connect()
  const db = (await client).db(process.env.MONGODB_DB || 'stackpick')
  const [row] = await db.aggregate<{ now: Date }>([{ $documents: [{}] }, { $set: { now: '$$NOW' } }]).toArray()
  return new Date(row.now).getTime()
}

const dayOf = (now: number) => new Date(now).toISOString().slice(0, 10)

/** Advisory only: what today has already spent, for a message and for refusing new work early. */
export async function observationsSpentToday(now: number): Promise<number> {
  const today = await (await budgetDays()).findOne({ _id: dayOf(now) })
  return today?.spent ?? 0
}

/**
 * Charged where the spending happens, which is when a worker takes the job, not when a visitor asks
 * for it. Admission cannot be the charge: a queue filled yesterday runs today, and an abandoned job
 * is claimed a second time, so a ceiling held at the door lets both walk past it.
 *
 * Reserving and spending have to be one write. Reading the day's total and then inserting the job
 * let two requests arriving together both see room that only one of them had, which is how a global
 * ceiling stops being a ceiling. The filter is the ceiling: when the day's row is already too high
 * the upsert collides on `_id` and Mongo refuses, which is the refusal we want.
 */
export async function reserveObservations(depth: VisibilityDepth, now: number): Promise<{ reserved: boolean; spent: number }> {
  const day = dayOf(now)
  const budgets = await budgetDays()
  try {
    const after = await budgets.findOneAndUpdate(
      { _id: day, spent: { $lt: DAILY_OBSERVATION_BUDGET } },
      { $inc: { spent: observationsFor(depth) } },
      { upsert: true, returnDocument: 'after' },
    )
    return { reserved: true, spent: after?.spent ?? observationsFor(depth) }
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error
    const today = await budgets.findOne({ _id: day })
    return { reserved: false, spent: today?.spent ?? DAILY_OBSERVATION_BUDGET }
  }
}

/** Only for the path where the job could not be written after its observations were reserved. */
export async function releaseObservations(depth: VisibilityDepth, now: number) {
  await (await budgetDays()).updateOne({ _id: dayOf(now) }, { $inc: { spent: -observationsFor(depth) } })
}

export async function getVisibilityJob(id: string): Promise<VisibilityJob | null> {
  return await (await jobs()).findOne({ id }, { projection: { _id: 0 } }) as VisibilityJob | null
}

/**
 * Waiting work first, then work whose worker went away. Abandonment used to be a fixed fifteen
 * minutes, which is shorter than a full audit can legitimately take (twelve calls, five minutes
 * each), so a slow run was taken a second time: the observations were paid for twice and the first
 * worker's finished result landed on a job somebody else owned. Now the question is asked of the
 * heartbeat, which is the thing that actually knows whether that process is still there.
 */
export async function claimVisibilityJob(worker: string): Promise<VisibilityJob | null> {
  const collection = await jobs()
  const take = (filter: Record<string, unknown>) => collection.findOneAndUpdate(
    filter,
    { $set: { status: 'running', startedAt: new Date().toISOString(), worker } },
    { sort: { createdAt: 1 }, returnDocument: 'after', projection: { _id: 0 } },
  ) as Promise<VisibilityJob | null>

  const waiting = await take({ status: 'queued' })
  if (waiting) return waiting

  const running = await collection.find({ status: 'running' }, { projection: { _id: 0, id: 1, worker: 1 } }).sort({ createdAt: 1 }).limit(20).toArray()
  if (running.length === 0) return null
  // Read once, from the database, because the heartbeat it is compared against was stamped there.
  // A claiming laptop running a few minutes fast would otherwise call a fresh beat stale and take a
  // job that is being worked on, which is a duplicate paid run.
  const now = await databaseNow()
  for (const one of running) {
    if (one.worker === worker || await workerIsBeating(one.worker, now)) continue
    const abandoned = await take({ id: one.id, status: 'running', worker: one.worker })
    if (abandoned) return abandoned
  }
  return null
}

async function workerIsBeating(worker: string | undefined, now: number): Promise<boolean> {
  if (!worker) return false
  const beat = await seenAt(worker)
  return beat !== null && now - new Date(beat).getTime() < WORKER_SILENT_AFTER_MS
}

/**
 * Not filtered on `running`: a measurement that was actually taken is never thrown away because the
 * queue moved underneath it while the agents were answering.
 */
export async function finishVisibilityJob(id: string, result: VisibilityAudit) {
  await (await jobs()).updateOne(
    { id },
    { $set: { status: 'complete', result, finishedAt: new Date().toISOString() }, $unset: { error: '' } },
  )
}

const budgetDays = async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required for production audit jobs.')
  client ??= new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 3, serverSelectionTimeoutMS: 8_000 }).connect()
  return (await client).db(process.env.MONGODB_DB || 'stackpick').collection<{ _id: string; spent: number }>('visibilityBudget')
}

const workers = async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required for production audit jobs.')
  client ??= new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 3, serverSelectionTimeoutMS: 8_000 }).connect()
  const collection = (await client).db(process.env.MONGODB_DB || 'stackpick').collection<{ _id: string; worker: string; seenAt: Date }>('visibilityWorkers')
  // The row is per process, so two workers on one laptop do not overwrite each other, and the TTL
  // is what keeps a restarting LaunchAgent from leaving a trail under a query the waiting page runs
  // every four seconds. An hour is far past the point where a beat still means anything.
  await collection.createIndex({ seenAt: 1 }, { expireAfterSeconds: 3_600 }).catch(() => undefined)
  return collection
}

/**
 * `$currentDate` stamps the beat on the database clock, so the laptop's own clock never becomes
 * evidence about how long ago that laptop spoke.
 */
export async function recordWorkerHeartbeat(worker: string) {
  await (await workers()).updateOne({ _id: worker }, { $set: { worker }, $currentDate: { seenAt: true } }, { upsert: true })
}

/** The newest beat from one worker, or from any worker, or null when none has ever beaten here. */
async function seenAt(worker?: string): Promise<string | null> {
  const newest = await (await workers()).findOne(worker ? { worker } : {}, { sort: { seenAt: -1 }, projection: { _id: 0, seenAt: 1 } })
  return newest?.seenAt ? new Date(newest.seenAt).toISOString() : null
}

/**
 * Judged on the server, because the visitor's clock is not evidence about our worker. A running job
 * asks after the worker that claimed it: a crashed process leaves the job assigned to itself for
 * fifteen minutes, and a fresh process beating in its place would otherwise read as somebody
 * working on this audit. `undefined` means we could not look, which is not the same as nobody home.
 */
export async function visibilityQueueStateFor(job: VisibilityJob): Promise<VisibilityQueueState> {
  let beat: string | null | undefined
  try {
    beat = await seenAt(job.status === 'running' ? job.worker : undefined)
  } catch {
    beat = undefined
  }
  const now = Date.now()
  let spent: number | undefined
  try {
    spent = job.status === 'queued' ? await observationsSpentToday(await databaseNow()) : undefined
  } catch {
    spent = undefined
  }
  return visibilityQueueState(job, beat, now, spent)
}

/**
 * The worker's own door: claim, then pay for what was claimed. Paying first would mean guessing the
 * depth of a job somebody else might take in between, and a guess is what the reservation must not
 * be. A job we cannot afford goes straight back on the queue rather than sitting marked running.
 */
export async function claimJobWithinBudget(worker: string): Promise<{ job: VisibilityJob | null; outOfBudget: boolean; retryAfterMs: number }> {
  const job = await claimVisibilityJob(worker)
  if (!job) return { job: null, outOfBudget: false, retryAfterMs: 0 }
  const now = await databaseNow()
  const reservation = await reserveObservations(job.depth, now)
  if (reservation.reserved) return { job, outOfBudget: false, retryAfterMs: 0 }
  await returnJobToQueue(job.id, worker)
  // Told to the caller so it can wait for the budget instead of taking, refusing and putting the
  // same job back every ten seconds until midnight.
  return { job: null, outOfBudget: true, retryAfterMs: budgetVerdict(reservation.spent, now).retryAfterSeconds * 1_000 }
}

/** Only the claim we are holding: another worker's running job is not ours to put back. */
async function returnJobToQueue(id: string, worker: string) {
  await (await jobs()).updateOne({ id, status: 'running', worker }, { $set: { status: 'queued' }, $unset: { startedAt: '', worker: '' } })
}

export async function failVisibilityJob(id: string, error: string) {
  await (await jobs()).updateOne(
    { id, status: 'running' },
    { $set: { status: 'failed', error: error.slice(0, 2_000), finishedAt: new Date().toISOString() } },
  )
}
