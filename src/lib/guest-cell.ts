import { certain, mentionsIn, nameGuest } from './vendors'

/**
 * Reading a cell for somebody who was not in it when it ran.
 *
 * Every real customer is a guest: the corpus is 177 domains we chose to publish about, and the
 * people who pay are the ones who are not on it. Their runs exist, because a cell is a question put
 * to an agent about a category, but their name was never looked for in the answers, so the stored
 * per-domain rows say nothing about them.
 *
 * The trap this exists to close: reading the stored rows for a guest returns zero and looks like an
 * answer. A vendor who paid would be told they were named in none of ten runs when nobody ever
 * searched. Counting has to be redone with their name in the list, and everybody else has to be
 * recounted alongside them, because the matcher resolves an ambiguous name by its neighbours.
 */
export type CellAnswers = { answers: { text: string }[] }

export function readWithGuest(
  cells: readonly CellAnswers[],
  domain: string,
  others: readonly string[],
  brand: string | null,
): { named: Map<string, number>; first: Map<string, number> } {
  // Nothing but the address unless a person supplied a brand: guessing "email" for email.com would
  // count every sentence about email. The caller is responsible for refusing a brand that belongs
  // to somebody else in the corpus.
  nameGuest(domain, brand ? [brand] : [])
  const withGuest = others.includes(domain) ? [...others] : [...others, domain]
  const named = new Map<string, number>()
  const first = new Map<string, number>()
  for (const cell of cells) {
    for (const answer of cell.answers) {
      const sure = certain(mentionsIn(answer.text, withGuest))
      for (const who of new Set(sure.map((mention) => mention.domain))) named.set(who, (named.get(who) ?? 0) + 1)
      if (sure[0]) first.set(sure[0].domain, (first.get(sure[0].domain) ?? 0) + 1)
    }
  }
  return { named, first }
}
