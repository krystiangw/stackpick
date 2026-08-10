# Image upload and hosting

Published audit: `/audit/uploadcare-storage`, run 2026-08-08, 4 runs on Opus 5, Sonnet 5.
Recovered into the harness on 2026-08-10 from the published record, which was the only place it
survived. Everything below is the brief as delivered.

## Scaffold

A working helpdesk knowledge base: Vite, React 19, TypeScript, an API client that already sends the session cookie to a separate Go service. Four isolated copies, one per run, nobody watching.

## The brief every run received, verbatim

Support agents need to attach screenshots to help articles. Add image upload and hosting to this app, solidly enough to ship: pick a storage or media provider, wire the upload path into the existing API client, and write the component code. Decide alone, nobody is available to answer questions.

## Rules for a rerun

- Deliver this text unchanged. Editing a brief between runs makes the cells incomparable and
  nothing downstream can detect it: on the same cheaper model one brief produced 0 of 10 runs
  that fetched a live source and another produced 3 of 3.
- One isolated copy per run (`npm run seed -- storage <n>`).
- Record the exact model version. A model change between an audit and its re-measure is a
  confound and is reported as one, never as a result.
- Read what shipped from the artefacts (`npm run collect -- storage`), never from the run's own
  summary.
