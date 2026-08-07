import type { FixPlan } from '@/lib/fixfirst'

const EFFORT_LABEL: Record<string, string> = {
  minutes: 'minutes',
  'an afternoon': 'an afternoon',
  'a project': 'a project',
}

export function FixFirst({ plan }: { plan: FixPlan }) {
  const later = plan.steps.filter((step) => !plan.quickWins.some((win) => win.checkId === step.checkId))

  return (
    <section className="border-b border-rule py-10">
      <h2 className="text-lg font-semibold tracking-tight">Fix this first</h2>

      {/* The gain is the only number this section adds; the score itself is already above. */}
      <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="font-mono text-4xl font-semibold tabular-nums text-pass">+{plan.gain}</span>
        <span className="font-mono text-sm text-ink-soft">
          {plan.gain === 1 ? 'point' : 'points'}, taking {plan.from}/{plan.max} to {plan.to}/{plan.max}
          {plan.overtakes.length > 0 && `, past ${plan.overtakes.join(', ')}`}
        </span>
      </div>

      <ol className="mt-8 flex flex-col">
        {plan.quickWins.map((step, index) => (
          <li key={step.checkId} className="grid grid-cols-[1.6rem_1fr] gap-4 border-t border-rule py-4">
            <span className="font-mono text-sm tabular-nums text-brass">{index + 1}</span>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-sm font-semibold">{step.label}</span>
                <span className="font-mono text-xs text-ink-soft">
                  {EFFORT_LABEL[step.effort]} · <span className="text-pass tabular-nums">+{step.gain}</span>
                </span>
              </div>
              <p className="max-w-2xl text-sm leading-relaxed text-ink-soft">{step.how}</p>
            </div>
          </li>
        ))}
      </ol>

      {later.length > 0 && (
        <div className="mt-8 border-t border-rule pt-6">
          <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">Then, when you have room</h3>
          <ul className="mt-4 flex flex-col gap-3">
            {later.map((step) => (
              <li key={step.checkId} className="grid grid-cols-[1fr_auto] items-baseline gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{step.label}</span>
                  <span className="max-w-2xl text-xs leading-relaxed text-ink-soft">{step.how}</span>
                </div>
                <span className="whitespace-nowrap font-mono text-[0.65rem] uppercase tracking-widest text-ink-faint">
                  {EFFORT_LABEL[step.effort]} · +{step.gain}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
