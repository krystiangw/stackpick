/**
 * Refuses to let an audit say our sentence holds when it checked nothing.
 *
 * Five audit scripts ended in the same shape: print the coverage, then
 * `findings.length === 0 ? 'the sentence holds everywhere' : ...`. The verdict never looked at the
 * coverage, so a run over zero rows - a bad argument, a filter that matched nothing, a database that
 * answered with an empty list - printed reassurance and exited 0. That answer then lives in
 * somebody's notes as "checked".
 *
 * Exits rather than returning a warning, because the whole value of these scripts is that a green
 * line from them means something.
 */
export function refuseIfNothingMeasured(checked: number, what: string): void {
  if (checked > 0) return
  console.error(`zero ${what} sprawdzonych, wiec ten przebieg NIE MOWI NIC o naszym zdaniu.`)
  console.error('Sprawdz argument i to, czy w korpusie sa jeszcze wiersze, ktore ten audyt ma czytac.')
  process.exit(2)
}
