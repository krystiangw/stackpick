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
export function howManyRows(fallback: number): number {
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
