import { certain, mentionsIn } from './vendors'

export type DiscoveryRun = {
  question: string
  answer: string
  meta: {
    run: number; exitCode: number | null; timedOut: boolean; model: string; cli: string
    cleanRoom?: boolean; operatorContext?: string[]; toolSettings?: string[]; finishedAt?: string
  }
}
export type DiscoveryCell = {
  category: string; question: string; runs: number; tool: string; model: string
  operatorContext: string[]; toolSettings?: string[]; ranAt: string
  rows: { domain: string; named: number; first: number }[]
  answers: { run: number; text: string; named: string[]; first: string | null }[]
}

/** Read the frozen question, and reject a batch whose configuration changed between answers. */
export function discoveryCell(category: { id: string; domains: readonly string[] }, runs: DiscoveryRun[]): DiscoveryCell | null {
  const answered = runs.filter(run => !run.meta.timedOut && run.meta.exitCode === 0 && run.answer.trim())
  if (!answered.length) return null
  const first = answered[0]
  const identity = (run: DiscoveryRun) => JSON.stringify([run.question.trim(), run.meta.cli, run.meta.model, run.meta.finishedAt?.slice(0, 10), run.meta.toolSettings ?? []])
  if (!first.question.trim() || !/^\d{4}-\d{2}-\d{2}T/.test(first.meta.finishedAt ?? '')) throw new Error(`${category.id}: missing recorded question or date`)
  if (answered.some(run => identity(run) !== identity(first))) throw new Error(`${category.id}: mixed question, tool, model, date or settings`)
  if (new Set(answered.map(run => run.meta.run)).size !== answered.length) throw new Error(`${category.id}: duplicate run number`)
  const domains = [...category.domains]
  const answers = answered.map(run => {
    const matches = certain(mentionsIn(run.answer, domains))
    return { run: run.meta.run, text: run.answer.trim(), named: [...new Set(matches.map(match => match.domain))], first: matches[0]?.domain ?? null }
  })
  return {
    category: category.id, question: first.question.trim(), runs: answers.length,
    tool: first.meta.cli, model: first.meta.model, ranAt: first.meta.finishedAt!.slice(0, 10),
    operatorContext: [...new Set(answered.flatMap(run => run.meta.cleanRoom ? [] : run.meta.operatorContext ?? []).map(path => path.split('/').pop() ?? path))],
    toolSettings: first.meta.toolSettings ?? [],
    answers,
    rows: domains.map(domain => ({ domain, named: answers.filter(answer => answer.named.includes(domain)).length, first: answers.filter(answer => answer.first === domain).length }))
      .sort((a, b) => b.named - a.named || b.first - a.first || a.domain.localeCompare(b.domain)),
  }
}

/** Append new evidence without rebuilding historical cells from today's local directories. */
export function appendDiscoveryCells(held: DiscoveryCell[], additions: DiscoveryCell[]): DiscoveryCell[] {
  const result = [...held]
  const key = (cell: DiscoveryCell) => JSON.stringify([cell.category, cell.tool, cell.model, cell.ranAt])
  // JSON object key order is formatting, not evidence. Arrays retain their recorded order.
  const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical)
    : value !== null && typeof value === 'object'
      ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([name, item]) => [name, canonical(item)]))
      : value
  const evidence = (cell: DiscoveryCell) => JSON.stringify(canonical({ ...cell, toolSettings: cell.toolSettings ?? [] }))
  for (const cell of additions) {
    const previous = result.find(candidate => key(candidate) === key(cell))
    if (previous) {
      if (evidence(previous) !== evidence(cell)) throw new Error(`${cell.category}: refusing to replace an existing batch`)
      continue
    }
    if (result.some(candidate => candidate.category === cell.category && candidate.question !== cell.question)) throw new Error(`${cell.category}: question differs from published evidence`)
    result.push(cell)
  }
  return result
}
