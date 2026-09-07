export type DiscoveryBudget = { notBefore: string; lastAttemptAt?: string; paused: boolean }
export function budgetDecision(state: DiscoveryBudget, now: Date): 'paused' | 'waiting' | 'ready' {
  if (state.paused) return 'paused'
  const starts = Date.parse(state.notBefore)
  const last = state.lastAttemptAt === undefined ? null : Date.parse(state.lastAttemptAt)
  if (!Number.isFinite(starts) || (last !== null && !Number.isFinite(last))) throw new Error('Invalid queue budget date')
  return now.getTime() < starts || (last !== null && (last > now.getTime() || new Date(last).toISOString().slice(0, 10) === now.toISOString().slice(0, 10))) ? 'waiting' : 'ready'
}
export function isAccountLimit(stderr: string): boolean {
  return /ActionRequiredError:[\s\S]*(?:usage limit|Named models unavailable)/i.test(stderr)
}
