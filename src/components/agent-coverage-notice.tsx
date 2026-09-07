import { agentLabel, modelLabel } from '@/lib/agent-label'
import type { AgentCoverage } from '@/lib/agent-coverage'

export function AgentCoverageNotice({ batches }: { batches: AgentCoverage[] }) {
  return batches.filter(batch => batch.answered < batch.attempted).map(batch => (
    <p key={`${batch.tool}-${batch.model}-${batch.date}`} className="mt-4 max-w-3xl rounded-md border-l-2 border-warn bg-surface p-4 text-sm leading-relaxed text-ink-soft">
      {agentLabel(batch.tool)} · {modelLabel(batch.model)} · {batch.date}: {batch.answered}/{batch.attempted} attempts returned answers.{' '}
      {batch.reason ?? 'The remaining calls did not return answers'}. Missing answers are excluded from mention counts.
    </p>
  ))
}
