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
      // The method the vendor's own example uses, read off the words just before the address. A
      // documented POST endpoint answers a GET with 404 or 405 and the audit called that dead:
      // cal.com quotes `curl --request POST --url https://api.cal.com/v2/api-keys/refresh` and has
      // been reported as standing on a missing address ever since. We do not send the POST - firing
      // writes at a stranger's API to satisfy our own audit is not ours to do - we stop claiming a
      // GET proved anything.
      //
      // Bound to THIS occurrence and to the clause it sits in, which is codex's: a detail can name
      // several addresses, and a 60-character look-behind otherwise carries a verb from the
      // previous command onto the next one. Any earlier address in that window ends the clause.
      const detail = check.detail ?? ''
      // Two hundred characters, not sixty: a curl example puts its headers between the verb and the
      // address, so a short window drops the verb and the audit sends the GET this exists to avoid.
      // Widening is safe only because the verb has to come from a construct - `--request POST` in
      // the same clause is a command, while the same word in prose is not. Codex's, both halves.
      const before = detail.slice(Math.max(0, (found.index ?? 0) - 200), found.index ?? 0)
      const prior = [...before.matchAll(/https?:\/\/[^\s,)\]]+/g)].pop()
      const clause = prior ? before.slice((prior.index ?? 0) + prior[0].length) : before
      // Only from an actual request construct, never from the word alone: "POST requests are
      // documented at <url>" is prose about a page that answers a GET perfectly well, and skipping
      // it would hide a dead address, which is the one thing this audit exists to catch. Codex's.
      const method = (/(?:--request|-X)\s+(POST|PUT|PATCH|DELETE)\b/i.exec(clause) ??
        /\b(POST|PUT|PATCH|DELETE)\s*[`'"<(]*\s*$/i.exec(clause))?.[1]?.toUpperCase() ?? 'GET'
      const line = `${row.domain}\t${check.id}\t${found[0]}\t${check.verdict ?? (Number(check.points ?? 0) > 0 ? 'pass' : 'fail')}\t${method}`
      if (seen.has(line)) continue
      seen.add(line)
      console.log(line)
    }
  }
}
