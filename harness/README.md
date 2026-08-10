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
harness/seed.mts   <category> <n>     # n isolated copies of a scaffold, one per run
harness/collect.mts <category>         # what each run actually installed, read from its own files
```

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
