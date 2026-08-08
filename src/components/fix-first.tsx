import type { FixPlan } from '@/lib/fixfirst'

const EFFORT_LABEL: Record<string, string> = {
  minutes: 'minutes',
  'an afternoon': 'an afternoon',
  'a project': 'a project',
}

export function FixFirst({ plan }: { plan: FixPlan }) {
  const rest = plan.steps.filter((step) => !plan.quickWins.some((win) => win.checkId === step.checkId))
  // Split by what the work costs, not by what fell off the end of the top three. A vendor
  // with five "minutes" fixes was told two of them could wait.
  const alsoCheap = rest.filter((step) => step.effort !== 'a project')
  const later = rest.filter((step) => step.effort === 'a project')

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

      {plan.unmeasured > 0 && (
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          This is the whole list: everything we could measure and you do not pass. Another {plan.unmeasured}{' '}
          {plan.unmeasured === 1 ? 'point sits' : 'points sit'} behind checks we could not evaluate on your
          domain, and each of those lines below says what would make it measurable.
        </p>
      )}

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

      {alsoCheap.length > 0 && (
        <div className="mt-8 border-t border-rule pt-6">
          <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">Cheap too, same week</h3>
          <ul className="mt-4 flex flex-col gap-3">
            {alsoCheap.map((step) => (
              <li key={step.checkId} className="grid grid-cols-[1.6rem_minmax(0,1fr)] gap-4">
                <span aria-hidden className="font-mono text-sm text-brass">
                  ·
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">
                    {step.label}{' '}
                    <span className="font-mono text-xs font-normal text-ink-soft">
                      {EFFORT_LABEL[step.effort]} · <span className="text-pass">+{step.gain}</span>
                    </span>
                  </span>
                  <span className="max-w-2xl text-xs leading-relaxed text-ink-soft">{step.how}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {later.length > 0 && (
        <div className="mt-8 border-t border-rule pt-6">
          <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">Then, when you have room</h3>
          <ul className="mt-4 flex flex-col gap-3">
            {later.map((step) => (
              <li key={step.checkId} className="grid grid-cols-[1.6rem_minmax(0,1fr)] gap-4">
                <span aria-hidden className="font-mono text-sm text-ink-faint">
                  ·
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">
                    {step.label}{' '}
                    <span className="font-mono text-xs font-normal text-ink-soft">
                      {EFFORT_LABEL[step.effort]} · <span className="text-pass">+{step.gain}</span>
                    </span>
                  </span>
                  <span className="max-w-2xl text-xs leading-relaxed text-ink-soft">{step.how}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
