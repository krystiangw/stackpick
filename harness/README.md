# The audit harness

Four audits are published at `/audit` and until now **not one of them could be repeated**: the
scaffolds, the briefs and the run transcripts lived outside the repository. That is the same
failure the reseed script had, and it matters more here, because the behavioural audit is the
part of this product that cannot be reproduced from a public corpus. An audit nobody can rerun
is an anecdote with a table in it.

This directory is the reproducible half. It does not automate the reading, which is deliberate:
`docs/method.md` records which parts must stay human and why.

## Two kinds of run

A **build run** hands an agent a working application and a brief and tells it to ship. It walks
into somebody's registration form and their API key, it takes minutes to hours, and it is the
audit deliverable. A **discovery run** asks one question and keeps the answer: who gets named, who
gets chosen, in what words. It creates nothing on anybody's side, which is why it can be repeated
every month on a domain whose owner never asked us to look at them, and why it is the half that
fits inside monitoring.

```
npm run seed    -- <category> <n>                   # n isolated copies, one per build run
npm run cell    -- <category> <agent> [model] <n>   # one brief, one agent, one model
npm run collect -- <category>                       # what shipped, read from the files

npm run ask     -- <category> <agent> [model] <n>   # one question, n isolated discovery runs
npm run asked   -- <category>                       # who was named, read by rule
```

`asked` never sends an answer to a model to be graded. Who was named is decided by
`src/lib/vendors.ts`: a published list of names and a published matcher, with a control in
`scripts/rules.mts` that can fail. Where a brand is also an ordinary English word (Modal,
Temporal, Split, Resend, Plaid and thirty more) the hit is quoted for a human instead of counted,
because an undercount and an overcount are wrong in different directions and both are worth
keeping apart.

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
  (runs live OUTSIDE the repo, at ~/.letagentsin-runs/<category>/run-N, see below)
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

## Why the runs are not in this repository

Measured 2026-08-10, on the first real cell. Seeded inside `harness/runs/`, one of three runs
walked up to the Let Agents In git root, read the harness documentation, **decided its task was to
re-measure a published audit**, and shipped nothing. Its transcript is a competent report about
running `seed` and `cell`. Its artefacts show an untouched scaffold.

That is worse than the shared-directory contamination of round one, because the run looks well
behaved from every angle: exit 0, a coherent write-up, and artefacts that read as an honest
refusal rather than as a run that answered a question it found lying around.

So `seed` writes to `$LETAGENTSIN_RUNS` or `~/.letagentsin-runs`, and gives every copy its own
`git init` so an agent looking for the project boundary finds the scaffold and stops there.
**Never seed a run inside a repository that is about measuring agents.**

## The operator leaks into the run, measured 2026-08-16

The first discovery cell came back **in Polish**, on an English question, five runs out of five.
Nothing in the answers looked wrong and the vendor names in them were plausible. The cause is that
`claude` reads the machine's user-level `~/.claude/CLAUDE.md` before it reads the question, and on
this machine that file says to answer in Polish. Every run had been handed a page of instructions
belonging to whoever started it.

The language is only the visible half. The same file carries working preferences, tool rules and a
project history, all of it in the context that produced the answer. **A run that inherits whoever
ran it is not a measurement of what an agent does**, and the isolated working directory does
nothing about it: the leak arrives from the home directory, not from the cwd.

What was tried, and what it costs:

| approach | result |
|---|---|
| isolated `CLAUDE_CONFIG_DIR` | logs the run out. Credentials are keyed to the real config dir, so the run cannot authenticate |
| `--system-prompt` replacing the default | user memory survives it. Verified: the answer came back in Polish anyway |
| `--bare` | shuts out CLAUDE.md, hooks, skills and plugins. **Reads `ANTHROPIC_API_KEY` only, never the keychain**, so a subscription cannot use it |

So `ask` takes the clean path the moment an API key exists in the environment, and without one it
records every instruction file that was in scope into `RUN.json` and prints them above the table
rather than below it. A number produced this way describes an agent on this machine, not an agent
at a customer's desk, and it says so out loud in both places.

## The rules that are not negotiable

1. **One brief, verbatim, to every run.** The brief decides whether documentation gets read at
   all: on the same cheaper model one brief produced 0 of 10 runs that fetched a live source and
   another produced 3 of 3, because the second turned on a licence. A brief edited between runs
   makes the cells incomparable and there is no way to detect it afterwards.
2. **Isolation per run, always**, and from the surrounding repository too. See both cases above.
3. **Pin the model version and record it.** A model change between the audit and the re-measure
   is a confound, and it has to be reported as one rather than as a result.
4. **Artefacts decide what was shipped, never the run's own report.**
5. **A quotation is verbatim or it is labelled a summary.** Three published pages had to be
   corrected for splicing two fragments into one quote and for a quote with no archive entry
   behind it. Every verbatim quote needs its transcript line.
