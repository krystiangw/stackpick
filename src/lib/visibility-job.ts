import { randomBytes } from 'node:crypto'
import { MongoClient } from 'mongodb'
import type { VisibilityAudit } from './visibility-audit'
import { visibilityQueueState, type VisibilityQueueState } from './visibility-queue'
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

export async function getVisibilityJob(id: string): Promise<VisibilityJob | null> {
  return await (await jobs()).findOne({ id }, { projection: { _id: 0 } }) as VisibilityJob | null
}

export async function claimVisibilityJob(worker: string): Promise<VisibilityJob | null> {
  const abandonedBefore = new Date(Date.now() - 15 * 60_000).toISOString()
  return await (await jobs()).findOneAndUpdate(
    { $or: [{ status: 'queued' }, { status: 'running', startedAt: { $lt: abandonedBefore } }] },
    { $set: { status: 'running', startedAt: new Date().toISOString(), worker } },
    { sort: { createdAt: 1 }, returnDocument: 'after', projection: { _id: 0 } },
  ) as VisibilityJob | null
}

export async function finishVisibilityJob(id: string, result: VisibilityAudit) {
  await (await jobs()).updateOne(
    { id, status: 'running' },
    { $set: { status: 'complete', result, finishedAt: new Date().toISOString() }, $unset: { error: '' } },
  )
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
  return visibilityQueueState(job, beat, Date.now())
}

export async function failVisibilityJob(id: string, error: string) {
  await (await jobs()).updateOne(
    { id, status: 'running' },
    { $set: { status: 'failed', error: error.slice(0, 2_000), finishedAt: new Date().toISOString() } },
  )
}
