/**
 * The other half of machine_readable_api: docs that serve markdown to a machine.
 *
 * A row fails only when there is no spec AND no negotiation, so refuting either half refutes the
 * verdict. This asks the negotiation half the way the check does: an Accept header, and the .md
 * suffix, against the documentation page rather than the front page.
 *
 * The control is a domain we credit this way. Without it a run of empty answers says nothing,
 * which is how an earlier pass produced twenty false accusations against live servers.
 *
 *   npx tsx scripts/audit-markdown.mts --control uploadcare.com cloudinary.com
 */
async function asMarkdown(url: string, useAccept: boolean): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 9000)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: useAccept ? { accept: 'text/markdown' } : { accept: '*/*' },
    })
    if (!response.ok) return null
    const type = response.headers.get('content-type') ?? ''
    const body = (await response.text()).slice(0, 400)
    if (/^\s*<(!doctype|html)/i.test(body)) return null
    // Markdown, not merely "not HTML": a JSON error page is neither.
    const looksMarkdown = /^#{1,3} |\n#{1,3} |\]\(|^---\n/m.test(body)
    return type.includes('markdown') || looksMarkdown ? `${type || 'brak typu'} ${body.slice(0, 50).replace(/\s+/g, ' ')}` : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function negotiates(domain: string): Promise<string | null> {
  for (const base of [`https://${domain}/docs`, `https://docs.${domain}`, `https://${domain}/documentation`]) {
    const viaAccept = await asMarkdown(base, true)
    if (viaAccept) return `${base} (Accept) ${viaAccept}`
    const viaSuffix = await asMarkdown(`${base}.md`, false)
    if (viaSuffix) return `${base}.md ${viaSuffix}`
  }
  return null
}

const control = process.argv[2] === '--control'
let found = 0
const domains = process.argv.slice(3)
for (const domain of domains) {
  const at = await negotiates(domain)
  if (control) console.log(`KONTROLKA ${domain}: ${at ?? 'NIC - sonda nie umie powiedziec tak'}`)
  else if (at) console.log(`NIEZGODA ${domain}: ${at}`)
  if (at) found += 1
}
console.log(`\n${domains.length} sprawdzonych, ${found} negocjuje markdown`)
process.exit(0)
