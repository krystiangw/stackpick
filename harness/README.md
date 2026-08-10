# The audit harness

Four audits are published at `/audit` and until now **not one of them could be repeated**: the
scaffolds, the briefs and the run transcripts lived outside the repository. That is the same
failure the reseed script had, and it matters more here, because the behavioural audit is the
part of this product that cannot be reproduced from a public corpus. An audit nobody can rerun
is an anecdote with a table in it.

This directory is the reproducible half. It does not automate the reading, which is deliberate:
`docs/method.md` records which parts must stay human and why.

## What it does

```
npm run seed    -- <category> <n>              # n isolated copies, one per run
npm run cell    -- <category> <agent> [model] <n>   # one brief, one agent, one model
npm run collect -- <category>                  # what shipped, read from the files
```

Agents: `claude`, `codex`, `gemini`, `cursor`. A cell is (agent x model x brief) and comparing
cells is the whole experiment, so only one of the three may vary between them.

`seed` writes `runs/<category>/run-1 .. run-n`, each a full copy with its own `node_modules`
target and its own git history, so nothing an agent does in one is visible in another. Round one
of the editors study shared a working directory between six agents and had to be discarded.

`collect` reads `package.json`, the lockfile and the imports each run left on disk, and reports
what it finds. **It never reads the run's own summary of what it did.** In the storage study a
run reported shipping a payment interface that the bundler had silently dropped, and the only
reason we know is that the artefacts disagreed with the report.

## Directory layout

```
harness/
  scaffolds/<category>/     the application every run starts from, committed
  briefs/<category>.md      the brief every run receives, verbatim, one file
  runs/<category>/run-N/    generated, gitignored, one isolated copy per run
  docs/method.md            what stays human, and what the numbers may not be built from
```

## What each account actually allows, measured 2026-08-10

Everything runs on subscriptions rather than API keys, which is cheaper and is a stated limit of
any audit produced this way: **a stranger holding no accounts cannot reproduce the run.** Say so
in the limits section of anything published from it.

| CLI | state | note |
|---|---|---|
| `cursor-agent` | works | Free plan allows the `auto` model only. A named model answers `ActionRequiredError: Named models unavailable`, so a cell that pins a model needs a paid plan. `auto` gives no record of which model ran, which is itself a confound. |
| `codex` | installed, untested here | `auth_mode: chatgpt`. Seven models listed. |
| `gemini` | quota | Falls back to the free API tier: 20 requests a day on `gemini-3.5-flash`, exhausted before a run finishes. Needs a key or a paid plan. |
| `claude` | works | The harness this project already runs in. |

The one measurement that needs no extra spend: **the same model in two harnesses.**
`cursor-agent` can run Opus, so a disagreement between it and Claude Code on the same brief is a
finding about the tool rather than the model, and nobody publishes that.

## The rules that are not negotiable

1. **One brief, verbatim, to every run.** The brief decides whether documentation gets read at
   all: on the same cheaper model one brief produced 0 of 10 runs that fetched a live source and
   another produced 3 of 3, because the second turned on a licence. A brief edited between runs
   makes the cells incomparable and there is no way to detect it afterwards.
2. **Isolation per run, always.** See round one above.
3. **Pin the model version and record it.** A model change between the audit and the re-measure
   is a confound, and it has to be reported as one rather than as a result.
4. **Artefacts decide what was shipped, never the run's own report.**
5. **A quotation is verbatim or it is labelled a summary.** Three published pages had to be
   corrected for splicing two fragments into one quote and for a quote with no archive entry
   behind it. Every verbatim quote needs its transcript line.
