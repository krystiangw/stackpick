import { fetchUrl } from './http'

export type NpmFindings = {
  package: string | null
  found: boolean
  version?: string
  bundledTypes?: boolean
  hasRepository?: boolean
  hasHomepage?: boolean
  weeklyDownloads?: number
  lastPublish?: string
  /** Verbatim license field. Agents eliminate on this before they look at the product. */
  license?: string
  /** Popular packages abandoned for years are what cheaper models recommend from memory. */
  staleMonths?: number
}

type Manifest = {
  version?: string
  license?: string | { type?: string }
  types?: string
  typings?: string
  exports?: unknown
  repository?: unknown
  homepage?: string
}

export async function checkNpm(packageName: string | null): Promise<NpmFindings> {
  if (!packageName) return { package: null, found: false }
  const encoded = encodeURIComponent(packageName)

  const [latest, downloads, packument] = await Promise.all([
    fetchUrl(`https://registry.npmjs.org/${encoded}/latest`, { accept: 'application/json' }),
    fetchUrl(`https://api.npmjs.org/downloads/point/last-week/${encoded}`, { accept: 'application/json' }),
    // The full packument carries publish times but runs to megabytes. Its Last-Modified is
    // the timestamp of the most recent publish, which is the only part we need.
    fetchUrl(`https://registry.npmjs.org/${encoded}`, { method: 'HEAD' }),
  ])

  const result: NpmFindings = { package: packageName, found: latest.ok }
  if (!latest.ok) return result

  try {
    const meta = JSON.parse(latest.body) as Manifest
    result.version = meta.version
    // Modern packages declare types in the exports map, not at the top level.
    result.bundledTypes = Boolean(meta.types ?? meta.typings) || JSON.stringify(meta.exports ?? {}).includes('"types"')
    result.license = typeof meta.license === 'string' ? meta.license : meta.license?.type
    result.hasRepository = Boolean(meta.repository)
    result.hasHomepage = Boolean(meta.homepage)
  } catch {
    return result
  }

  if (downloads.ok) {
    try {
      result.weeklyDownloads = (JSON.parse(downloads.body) as { downloads?: number }).downloads
    } catch {
      /* registry occasionally answers 200 with an error body */
    }
  }

  const lastModified = packument.headers['last-modified']
  if (lastModified) {
    const published = Date.parse(lastModified)
    if (Number.isFinite(published)) {
      result.lastPublish = new Date(published).toISOString()
      result.staleMonths = Math.round((Date.now() - published) / (1000 * 60 * 60 * 24 * 30.44))
    }
  }

  return result
}
