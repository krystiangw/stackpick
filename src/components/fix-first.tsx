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
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-brass">Fix this first</h2>
        <p className="flex items-baseline gap-2 font-mono text-sm tabular-nums">
          <span className="text-ink-faint">
            {plan.from}/{plan.max}
          </span>
          <span aria-hidden className="text-ink-faint">
            →
          </span>
          <span className="font-semibold text-pass">
            {plan.to}/{plan.max}
          </span>
          <span className="text-xs text-ink-faint">
            +{plan.gain} {plan.gain === 1 ? 'point' : 'points'}
          </span>
        </p>
      </div>

      <p className="mt-4 max-w-3xl text-balance text-2xl font-semibold leading-snug tracking-tight">{plan.claim}</p>

      <ol className="mt-8 flex flex-col">
        {plan.quickWins.map((step, index) => (
          <li key={step.checkId} className="grid grid-cols-[1.6rem_1fr] gap-4 border-t border-rule py-4">
            <span className="font-mono text-sm tabular-nums text-brass">{index + 1}</span>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-sm font-semibold">{step.label}</span>
                <span className="font-mono text-[0.65rem] uppercase tracking-widest text-ink-faint">
                  {EFFORT_LABEL[step.effort]} · +{step.gain}
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
