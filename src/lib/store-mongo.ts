import { MongoClient, type Collection, type Db } from 'mongodb'
import type { Lead, Report, Store } from './store'

type ReportDoc = Report & { _id: string }

let clientPromise: Promise<MongoClient> | null = null
let indexesReady: Promise<void> | null = null

function connect(): Promise<MongoClient> {
  clientPromise ??= new MongoClient(process.env.MONGODB_URI as string, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 8000,
  }).connect()
  return clientPromise
}

async function db(): Promise<Db> {
  const client = await connect()
  return client.db(process.env.MONGODB_DB ?? 'stackpick')
}

async function collections(): Promise<{ reports: Collection<ReportDoc>; leads: Collection<Lead> }> {
  const database = await db()
  const reports = database.collection<ReportDoc>('reports')
  const leads = database.collection<Lead>('leads')

  indexesReady ??= Promise.all([
    reports.createIndex({ domain: 1, scannedAt: -1 }),
    reports.createIndex({ scannedAt: -1 }),
    leads.createIndex({ createdAt: -1 }),
  ]).then(() => undefined)
  await indexesReady

  return { reports, leads }
}

const withoutId = { projection: { _id: 0 } } as const

export class MongoStore implements Store {
  async saveReport(report: Report) {
    const { reports } = await collections()
    await reports.updateOne({ _id: report.id }, { $set: report }, { upsert: true })
  }

  async getReport(id: string) {
    const { reports } = await collections()
    return (await reports.findOne({ _id: id }, withoutId)) as Report | null
  }

  async latestForDomain(domain: string) {
    const { reports } = await collections()
    return (await reports.findOne({ domain }, { ...withoutId, sort: { scannedAt: -1 } })) as Report | null
  }

  async listReports(limit: number) {
    const { reports } = await collections()
    return (await reports.find({}, withoutId).sort({ scannedAt: -1 }).limit(limit).toArray()) as Report[]
  }

  async latestPerDomain(limit: number) {
    const { reports } = await collections()
    return (await reports
      .aggregate([
        { $sort: { domain: 1, scannedAt: -1 } },
        { $group: { _id: '$domain', latest: { $first: '$$ROOT' } } },
        { $replaceRoot: { newRoot: '$latest' } },
        { $sort: { scannedAt: -1 } },
        { $limit: limit },
        { $project: { _id: 0 } },
      ])
      .toArray()) as Report[]
  }

  async saveLead(lead: Lead) {
    const { leads } = await collections()
    await leads.insertOne(lead)
  }

  async listLeads(limit: number) {
    const { leads } = await collections()
    return (await leads.find({}, withoutId).sort({ createdAt: -1 }).limit(limit).toArray()) as Lead[]
  }
}
