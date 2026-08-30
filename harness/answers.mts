/**
 * Reading a discovery answer: what it picked, and what it said about the ones it did not.
 *
 * Both readers live here rather than in whichever script needed them first, because `why-not` and
 * `never-named` must agree on who won a cell. Two copies of that rule would drift, and the first
 * sign of the drift would be a sentence in a stranger's inbox.
 *
 * The rule from `asked.mts` holds throughout: a published list and a published regular expression
 * decide, never a second model reading the first one's answer.
 */
import { certain, mentionsIn, namesFor } from '../src/lib/vendors'

/**
 * The last column of a comparison table, and only when its title is actually negative. "Why" alone
 * is not: one headless-cms run titles that column "Why I'd choose it instead", so every condition
 * favouring a vendor was being read as an objection against it.
 */
const WHY_NOT = /wouldn|didn.t|isn.t|wasn.t|\bnot\b|\bno\b|drawback|downside|trade.?off|against|caveat|concern|limitation|\brisk/i

/**
 * What the run picked, from the first bold span. Every answer opens "I'd use **X**", and the first
 * corpus name in the body is not that: the documents-signature runs choose Yousign and the commerce
 * runs choose Fourthwall, neither of which we track, so reading the body reported Dropbox Sign and
 * Shopify as winners of cells they did not win.
 *
 * Null means the run picked something outside the corpus, which is a finding rather than a gap in
 * the reading: it is a category where we do not carry the vendor an agent actually reaches for.
 */
export function chosenIn(text: string, domains: readonly string[]): string | null {
  const bold = text.match(/\*\*([^*]{2,80})\*\*/)
  if (!bold) return null
  // Two conditions, because neither alone is safe. The bold must carry one of the names, and the
  // whole answer must mention that vendor beyond doubt: half this corpus is named with an ordinary
  // English word - Neon, Paddle, Knock, Sanity - and only the surrounding text tells the company
  // from the word. Positions cannot do this job: `mentionsIn` reports where the DOMAIN appears,
  // which is usually a citation far below the sentence that names the choice.
  const sure = new Set(certain(mentionsIn(text, domains)).map((mention) => mention.domain))
  for (const domain of domains) {
    if (!sure.has(domain)) continue
    const forms = [domain, ...namesFor(domain)]
    if (forms.some((form) => new RegExp(`\\b${form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(bold[1]))) {
      return domain
    }
  }
  return null
}

/** Every vendor the run put in a comparison table under a heading that says why it walked away. */
export function rejectionsIn(text: string, domains: readonly string[]): { domain: string; text: string }[] {
  const out: { domain: string; text: string }[] = []
  let header: string[] | null = null
  for (const line of text.split('\n')) {
    if (!line.trimStart().startsWith('|')) {
      header = null
      continue
    }
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim())
    if (cells.length < 2) continue
    if (cells.every((cell) => /^:?-{2,}:?$/.test(cell))) continue
    if (!header) {
      header = cells
      continue
    }
    if (!WHY_NOT.test(header[header.length - 1] ?? '')) continue
    for (const mention of certain(mentionsIn(cells[0].replace(/[*`]/g, ''), domains))) {
      out.push({ domain: mention.domain, text: cells[cells.length - 1] })
    }
  }
  return out
}

/** Who the runs of one cell picked, most often first. */
export function winnersOf(texts: readonly string[], domains: readonly string[]): [domain: string, runs: number][] {
  const winners = texts.map((text) => chosenIn(text, domains)).filter((winner): winner is string => Boolean(winner))
  return [...new Set(winners)]
    .map((domain) => [domain, winners.filter((winner) => winner === domain).length] as [string, number])
    .sort((a, b) => b[1] - a[1])
}
