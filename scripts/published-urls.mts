/**
 * Every address our published rows name as evidence, as `domain<TAB>check<TAB>url`.
 *
 * The other half of `audit-published-urls.mts`, which reads this on stdin. That script was written
 * to keep the extraction "visible in the shell" and the shell command was then written down
 * nowhere: no npm script, no runbook, no line in STATE.md. Run without it, it reads an empty stdin
 * and prints "0 adresow sprawdzonych, 0 nie odpowiada", which is the reassuring shape of a tool
 * that has never run. Making it one command is the whole point of this file.
 *
 *   npm run audit-published-urls
 */
import { SITE_URL } from '../src/lib/site'

type Row = { domain: string; checks: { id: string; detail?: string; points?: number }[] }

const corpus = (await (await fetch(`${SITE_URL}/corpus.json`)).json()) as { rows: Row[] }
const seen = new Set<string>()
for (const row of corpus.rows) {
  for (const check of row.checks) {
    for (const found of (check.detail ?? '').matchAll(/https?:\/\/[^\s,)\]]+/g)) {
      // Our own addresses are in the remedy sentences on every failing row. They are ours to keep
      // alive and the site's own build already fails on a dead internal link.
      if (found[0].includes('letagentsin.com')) continue
      // The points come along, because a dead address means opposite things on the two kinds of
      // row: on a row that scored it is evidence we cannot support, on a row that failed it is the
      // sentence being right about having found nothing there.
      const line = `${row.domain}\t${check.id}\t${found[0]}\t${check.points ?? 0}`
      if (seen.has(line)) continue
      seen.add(line)
      console.log(line)
    }
  }
}
