import { randomBytes } from 'node:crypto'
import { MongoClient } from 'mongodb'
import type { VisibilityAudit } from './visibility-audit'

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
  await (await jobs()).insertOne(job)
  return job
}

export async function getVisibilityJob(id: string): Promise<VisibilityJob | null> {
  return await (await jobs()).findOne({ id }, { projection: { _id: 0 } }) as VisibilityJob | null
}

export async function claimVisibilityJob(worker: string): Promise<VisibilityJob | null> {
  return await (await jobs()).findOneAndUpdate(
    { status: 'queued' },
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

export async function failVisibilityJob(id: string, error: string) {
  await (await jobs()).updateOne(
    { id, status: 'running' },
    { $set: { status: 'failed', error: error.slice(0, 2_000), finishedAt: new Date().toISOString() } },
  )
}
