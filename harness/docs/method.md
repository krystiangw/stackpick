# What stays human

The scripts beside this file do the mechanical half: isolated copies, and reading what a run
shipped from the files rather than from its own account. This file is the other half, and it is
here because the automatable part is not what anyone pays for.

Measured on the four published audits: roughly 31 operator hours for a full audit, of which
**11 to 17 cannot be automated**. Model spend is 150 to 400 dollars against an 11,000 dollar
engagement, so the cost of an audit is those hours and nothing else. That sets a floor: below
roughly 3,500 dollars you are selling the part the scripts already do, and that part is free.

## The four things a script must not do

**Design the brief.** The brief decides whether your documentation is opened at all. On the same
cheaper model, the storage brief produced 0 of 10 runs that fetched a live source, and the editors
brief produced 3 of 3, because the second turned on a licence question that cannot be answered
from memory. Anyone can run an agent. Knowing which question makes a category legible is the
experiment design.

**Label a quotation.** Three published pages had to be corrected: two fragments spliced into one
quote, a quote with no archive entry behind it, and a sentence prepended to a real one. The rule
that came out of it is absolute: **a quotation is verbatim with its transcript line, or it is
labelled our summary.** This is exactly where a model cannot check itself, because a plausible
sentence is what it produces when it has nothing.

**Interpret disagreement between runs.** Where runs disagree, the disagreement is the finding.
One run refused to create an account it was technically able to create, because ownership is a
decision it would not make for someone else. No count expresses that, and it was the most
valuable sentence in that audit.

**Recommend, with an effort estimate.** "Add an MCP server" is worthless without knowing what the
client's engineering can ship this quarter. That requires the conversation, not the transcript.

## Two traps this project already walked into

**A shared working directory is not a set of runs.** Round one of the editors study put six agents
in one folder. They read each other's edits. The whole round was discarded and it is not in the
published counts, which the audit page says out loud.

**A green build is not a shipped feature.** One run produced a passing build whose payment
interface the bundler had removed. It is reported in that audit as a finding rather than hidden,
and it is why `collect.mts` reads `package.json` and the imports instead of the run's report.

## What the numbers may not be built from

- Never from what a run says it chose. Only from what it installed and imported.
- Never from a round with shared state.
- Never across model versions without saying so.
- Never from a quote that is not in the archive.
