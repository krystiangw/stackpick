# The questions

One file per category, and **the whole file is the prompt**. No headers, no metadata, nothing the
run has to skip past: the file is what the agent receives, character for character, so "delivered
verbatim" is something anybody can check rather than something we assert.

## The rules

1. **Never name a vendor.** A question that mentions one has already answered itself. This is the
   difference between measuring who an agent reaches for and measuring whether it can read.
2. **Phrase it the way it arrives**, as a developer's problem with a deadline attached, not as a
   category name. `scripts/routing-questions.ts` has the long version of why: a question phrased
   as its own answer measures nothing.
3. **Ask what else was considered.** The number that matters most is whether a vendor is in the
   candidate set at all, and an answer that names one provider and stops cannot tell us that.
4. **Frozen once run.** Editing a question between runs makes the cells incomparable and nothing
   downstream can detect it. A better question is a new file and a new baseline, dated as one.

## What is not in here

A question that asks the agent to sign up, get a key, or ship code. That is a build run
(`npm run cell`), it needs the vendor's agreement and a person watching, and it stays in the paid
audit. Everything in this directory is read-only: an agent answering a question touches nobody's
signup form, which is what makes it safe to run every month on a domain whose owner never asked
us to look at them.
