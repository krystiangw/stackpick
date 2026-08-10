# Cell: editors x cursor-agent (auto) x 4, 2026-08-10

Same brief, same scaffold, different harness. The published editors audit is Claude Code, six
runs, Opus 5 and Sonnet 5. This cell is cursor-agent on its `auto` model, four runs, on the
harness in this repository.

## What shipped, read from the artefacts

4 of 4 chose Tiptap: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link` and
`@tiptap/extension-image` installed and imported in every run. One run went further and added
`@tiptap/extension-code-block-lowlight`, `@tiptap/extension-placeholder` and `lowlight`.

**Same winner as the published cell, 6 of 6 there and 4 of 4 here.** On the choice itself the
tool made no difference, which is the null result and worth publishing as one.

## Where the two harnesses diverge, and it is not the choice

| | Claude Code, 6 runs | cursor-agent, 4 runs |
|---|---|---|
| Chose Tiptap | 6 / 6 | 4 / 4 |
| Named a live source | 6 / 6 fetched, 5 of 6 read | 1 of 4 mentions any source |
| Alternatives named and rejected | 4 to 7 per run, 10 distinct vendors | 0 to 2 per run, 3 distinct |
| Froala named at all | 0 of 6 | 1 of 4, in one clause |

The Claude Code cell rejected CKEditor 5 five times, Lexical six times, Slate five times and
three Quill packages between them, each with a reason. Three of the four cursor runs name no
alternative at all: they state the choice and implement it.

## What that means for the product, stated carefully

The headline finding of the published audit is that **Froala was never named, not even to be
rejected**, while ten competitors were named and dismissed. This cell weakens the "not even to be
rejected" half and strengthens the finding underneath it: in a harness that deliberates less, the
absence is total rather than partial. A vendor outside the model's own list is not losing a
comparison in either harness. It is not in one.

The confound to state before this is used anywhere: `auto` does not record which model answered,
so this cell cannot separate "cursor-agent deliberates less" from "auto routed to a cheaper
model". A paid Cursor plan pins the model and settles it. Until then this is one measurement with
a named hole in it, not a result.
