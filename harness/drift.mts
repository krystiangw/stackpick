/**
 * The same cells, two months apart: what moved and what did not.
 *
 *   LETAGENTSIN_RUNS_BEFORE=~/.letagentsin-runs-codex \
 *   LETAGENTSIN_RUNS_AFTER=~/.letagentsin-runs-codex-wrzesien \
 *   npm run drift
 *
 * One measurement of absence is a fact about a day. Two, two months apart, is the first thing here
 * that behaves like a finding, and it is the only version of the outreach claim a vendor cannot
 * answer with "you asked once".
 *
 * Prints the instrument for both sides before any number, because the tool moved between them: the
 * August cells ran on codex 0.147.0 and the September ones on 0.152.1. Reasoning effort is pinned,
 * the question files are unchanged, but a CLI release is a real difference and burying it under a
 * table would be the thing this whole product exists to be an alternative to.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { CATEGORIES } from '../src/lib/categories'
import { certain, mentionsIn } from '../src/lib/vendors'
import { winnersOf } from './answers.mjs'

type Cell = { texts: string[]; cli: string; ranAt: string }

const expand = (path: string) => path.replace(/^~/, homedir())
const BEFORE = expand(process.env.LETAGENTSIN_RUNS_BEFORE ?? join(homedir(), '.letagentsin-runs-codex'))
const AFTER = expand(process.env.LETAGENTSIN_RUNS_AFTER ?? join(homedir(), '.letagentsin-runs-codex-wrzesien'))

/** Only completed runs, the same filter `why-not` uses: a timed-out answer names fewer vendors. */
function readCell(root: string, category: string): Cell | null {
  const dir = join(root, 'ask', category)
  if (!existsSync(dir)) return null
  const texts: string[] = []
  let cli = 'unknown'
  let ranAt = 'unknown'
  for (const name of readdirSync(dir).filter((entry) => entry.startsWith('run-')).sort()) {
    const answer = join(dir, name, 'ANSWER.txt')
    const meta = join(dir, name, 'RUN.json')
    if (!existsSync(answer) || !existsSync(meta)) continue
    const run = JSON.parse(readFileSync(meta, 'utf8')) as { exitCode: number; timedOut: boolean; cli: string; startedAt: string }
    const text = readFileSync(answer, 'utf8')
    if (run.exitCode !== 0 || run.timedOut || text.trim().length === 0) continue
    texts.push(text)
    cli = run.cli
    ranAt = run.startedAt.slice(0, 10)
  }
  return texts.length > 0 ? { texts, cli, ranAt } : null
}

/**
 * The first bold span, whatever it names. Used only to tell one outside-the-corpus winner from
 * another; who won inside the corpus is `chosenIn`'s job and stays there.
 */
const pickedName = (texts: readonly string[]): string | null => {
  const picks = texts.map((text) => text.match(/\*\*([^*]{2,80})\*\*/)?.[1]?.trim().toLowerCase() ?? null)
  const first = picks[0]
  return first !== null && picks.every((pick) => pick === first) ? first : null
}

const namedIn = (cell: Cell, domains: readonly string[]) =>
  new Set(certain(mentionsIn(cell.texts.join('\n'), domains)).map((mention) => mention.domain))

const lines: string[] = ['# Absent in both months', '']
let bothMonths = 0
let onlyBefore = 0
let onlyAfter = 0
let sameWinner = 0
let unreadableWinner = 0
let compared = 0

for (const category of CATEGORIES) {
  const before = readCell(BEFORE, category.id)
  const after = readCell(AFTER, category.id)
  if (!before || !after) continue
  compared++

  const namedBefore = namedIn(before, category.domains)
  const namedAfter = namedIn(after, category.domains)
  const missingBoth = category.domains.filter((domain) => !namedBefore.has(domain) && !namedAfter.has(domain))
  const appeared = category.domains.filter((domain) => !namedBefore.has(domain) && namedAfter.has(domain))
  const vanished = category.domains.filter((domain) => namedBefore.has(domain) && !namedAfter.has(domain))
  bothMonths += missingBoth.length
  onlyBefore += vanished.length
  onlyAfter += appeared.length

  const winnerBefore = winnersOf(before.texts, category.domains)[0]
  const winnerAfter = winnersOf(after.texts, category.domains)[0]
  // Two months of "nobody from our corpus won" is not automatically a cell that held: Yousign in
  // August and DocuSign in September would be two nulls and a real change. So when the winner is
  // outside the corpus both times, the names themselves are compared, and a cell whose winner we
  // cannot read at all is counted as unknown rather than quietly as stable.
  const outsideBoth = !winnerBefore && !winnerAfter
  const outsideNames = outsideBoth ? [pickedName(before.texts), pickedName(after.texts)] : null
  const outsideHeld = outsideNames !== null && outsideNames[0] !== null && outsideNames[0] === outsideNames[1]
  const held = outsideBoth ? outsideHeld : Boolean(winnerBefore && winnerAfter && winnerBefore[0] === winnerAfter[0])
  // Stable to the eye and unreadable by rule is its own answer, not a change. Both months of
  // documents-signature pick Yousign and both months of domains-dns pick OpenSRS or Openprovider,
  // but each run writes the name differently ("Yousign API", "Yousign, now transitioning to
  // Youtrust"), so the rule cannot say so and must not pretend either way.
  const unreadable = outsideBoth && !outsideHeld
  if (held) sameWinner++
  if (unreadable) unreadableWinner++

  console.log(
    `${category.id.padEnd(24)} ${before.texts.length}+${after.texts.length} biegow  ` +
      `zwyciezca ${winnerBefore?.[0] ?? 'spoza korpusu'} -> ${winnerAfter?.[0] ?? 'spoza korpusu'}` +
      `${held ? (outsideBoth ? ` = (nie nasz: ${outsideNames?.[0]})` : ' =') : unreadable ? ' NIECZYTELNE' : ' ZMIANA'}  ` +
      `nieobecni w obu ${missingBoth.length}, wrocilo ${appeared.length}, zniknelo ${vanished.length}`,
  )

  if (missingBoth.length > 0) {
    lines.push(
      `## ${category.label} (\`${category.id}\`)`,
      '',
      `Zmierzone dwa razy: ${before.ranAt} (${before.cli}, ${before.texts.length} biegow) i ` +
        `${after.ranAt} (${after.cli}, ${after.texts.length} biegow).`,
      `Wybrano: ${winnerBefore?.[0] ?? 'spoza korpusu'}, potem ${winnerAfter?.[0] ?? 'spoza korpusu'}.`,
      `Dowod: https://letagentsin.com/c/${category.id}/runs`,
      '',
      'Nie padli ani razu w ZADNYM z dwoch miesiecy:',
      '',
      ...missingBoth.map((domain) => `- \`${domain}\``),
      '',
    )
  }
}

console.log(`\n=== DWA PUNKTY, ${compared} kategorii`)
console.log(`zwyciezca ten sam w obu miesiacach: ${sameWinner}/${compared}`)
console.log(`zwyciezca spoza korpusu, nieczytelny dla reguly: ${unreadableWinner}/${compared}`)
console.log(`realnie zmieniony: ${compared - sameWinner - unreadableWinner}/${compared}`)
console.log(`nieobecnych w OBU miesiacach: ${bothMonths}`)
console.log(`pojawilo sie we wrzesniu po nieobecnosci: ${onlyAfter}`)
console.log(`zniknelo we wrzesniu po obecnosci: ${onlyBefore}`)

lines.push('---', '', `Razem **${bothMonths}** firm nienazwanych w obu miesiacach, z ${compared} kategorii.`)
writeFileSync(join('outreach', 'absent-both-months.md'), `${lines.join('\n')}\n`)
console.log('\noutreach/absent-both-months.md zapisane')
