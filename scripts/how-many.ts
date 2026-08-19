/**
 * How many rows an audit should sample, read from the command line and refused when it is not a
 * number.
 *
 * Eleven audit scripts wrote `Number(process.argv[2] ?? 30)`. `Number('accused')` is NaN,
 * `slice(0, NaN)` is empty, and the script then asks nothing, finds nothing and prints that the
 * published sentence holds. These are the scripts whose whole job is to falsify our own sentences,
 * so a run that measured zero rows and reported reassurance is the worst answer they can give.
 *
 * Found on 2026-08-19 by following an instruction written down in STATE.md itself:
 * `audit-entry.mts accused`, a mode name the script never had.
 */
/**
 * @param population How many rows exist to read, when the cap slices that list directly. Given,
 * the cap announces itself: ten of these audits stop after 25 to 40 domains of the 177 in the
 * corpus and then print a verdict that reads like the whole thing. I read "43 credited rows,
 * nothing indistinguishable" on 2026-08-19 and only noticed on the second run that the first had
 * read 12. A cap nobody says out loud is a silent claim about the rows nobody asked.
 *
 * Pass it only when the cap really does cut the population: an audit that counts qualifying rows
 * and walks the whole list has to use `reportCap` instead, or it announces an omission it did not
 * make. That distinction is codex's, on the first version of this, and it was right.
 */
export function howManyRows(fallback: number, population?: number): number {
  const chosen = chooseHowMany(fallback)
  if (population !== undefined && chosen < population) {
    console.log(`czytam ${chosen} z ${population}; reszta POMINIETA - podaj liczbe, zeby przeczytac wszystkie`)
  }
  return chosen
}

/**
 * Coverage read off what the run actually did, for audits whose cap counts qualifying rows while
 * the loop walks everything.
 *
 * `visited`, not the cap: hitting the cap is not the same as stopping early, because the last
 * qualifying row can be the last domain on the list. Reading truncation off `matched >= cap` said
 * "the rest was not read" on a run that read all of it - codex's, on the first version of this,
 * and the second time in one night that a count stood in for a thing it only usually implies.
 */
export function coverageLine(visited: number, population: number, matched: number): string {
  if (visited < population) {
    return `przeszedlem ${visited} z ${population} domen i zatrzymalem sie na sufcie ${matched}; reszta NIE przeczytana - podaj liczbe, zeby przeczytac wszystkie`
  }
  return `przeszedlem cala liste ${population} domen, ${matched} z nich pasowalo do tego audytu`
}

export function reportCap(visited: number, population: number, matched: number): void {
  console.log(coverageLine(visited, population, matched))
}

function chooseHowMany(fallback: number): number {
  const given = process.argv[2]
  if (given === undefined) return fallback
  // Zero is refused for the same reason a word is: it produces a run that measures nothing and then
  // prints that our sentence holds.
  if (!/^[1-9]\d*$/.test(given)) {
    console.error(`"${given}" nie jest dodatnia liczba wierszy. Uzycie: npx tsx ${process.argv[1]?.split('/').pop() ?? 'skrypt'} [ile]`)
    process.exit(2)
  }
  return Number(given)
}
