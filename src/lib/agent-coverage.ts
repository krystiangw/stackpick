import attempts from '@/data/agent-attempts.json'
export type AgentCoverage = {
  tool: string; model: string; date: string; attempted: number; answered: number; reason?: string
}
/** Only completed collection batches are published; failures never become silent zero mentions. */
export function coverageFor(category: string): AgentCoverage[] {
  return attempts.filter(batch => batch.category === category).map(({ tool, model, date, attempted, answered, reason }) => ({ tool, model, date, attempted, answered, ...(reason ? { reason } : {}) }))
}
export function excludedAnswers(coverage: AgentCoverage[]): number {
  return coverage.reduce((sum, batch) => sum + batch.attempted - batch.answered, 0)
}
