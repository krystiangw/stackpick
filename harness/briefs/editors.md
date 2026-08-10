# Embeddable rich text editors

Published audit: `/audit/froala-editors`, run 2026-08-08, 6 runs on Opus 5, Sonnet 5.
Recovered into the harness on 2026-08-10 from the published record, which was the only place it
survived. Everything below is the brief as delivered.

## Scaffold

A working helpdesk knowledge base: Vite, React 19, TypeScript, an API client whose Article body is documented as HTML. Six isolated copies, one per run, seeded fresh from the same script.

## The brief every run received, verbatim

Support agents need to write help articles with rich formatting: bold, italics, headings, bullet lists, links, inline code, code blocks and pasted images. Pick a rich text editor library for this app and wire up a minimal ArticleEditor component that saves through the existing API client. Decide alone, nobody is available to answer questions.

## Rules for a rerun

- Deliver this text unchanged. Editing a brief between runs makes the cells incomparable and
  nothing downstream can detect it: on the same cheaper model one brief produced 0 of 10 runs
  that fetched a live source and another produced 3 of 3.
- One isolated copy per run (`npm run seed -- editors <n>`).
- Record the exact model version. A model change between an audit and its re-measure is a
  confound and is reported as one, never as a result.
- Read what shipped from the artefacts (`npm run collect -- editors`), never from the run's own
  summary.
