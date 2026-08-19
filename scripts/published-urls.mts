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

type Row = { domain: string; checks: { id: string; detail?: string; points?: number; verdict?: string }[] }

const corpus = (await (await fetch(`${SITE_URL}/corpus.json`)).json()) as { rows: Row[] }
const seen = new Set<string>()
for (const row of corpus.rows) {
  for (const check of row.checks) {
    for (const found of (check.detail ?? '').matchAll(/https?:\/\/[^\s,)\]]+/g)) {
      // Our own addresses are in the remedy sentences on every failing row. They are ours to keep
      // alive and the site's own build already fails on a dead internal link.
      if (found[0].includes('letagentsin.com')) continue
      // The verdict comes along, because a dead address means three different things. On a row we
      // credited it is evidence we cannot support. On a row we failed it is the sentence being
      // right about having found nothing there. On a row we called unmeasurable the sentence is
      // usually reporting that very refusal - namecheap.com's reads "answers 403, 403, 404" and
      // the audit was flagging the 404 it names - so calling those "failed rows" was a mislabel
      // that turned our own disclosure into a finding against us.
      const line = `${row.domain}\t${check.id}\t${found[0]}\t${check.verdict ?? (Number(check.points ?? 0) > 0 ? 'pass' : 'fail')}`
      if (seen.has(line)) continue
      seen.add(line)
      console.log(line)
    }
  }
}
