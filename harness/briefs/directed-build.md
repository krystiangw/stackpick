# A named vendor, and whether an agent can actually get in

A template, not a category. Every other brief here asks an agent to *choose* a provider, and the
finding is who it picked and why. This one names the vendor up front and measures the half nobody
sees: given that the decision is already made, can the agent read the documentation, reach the
signup, obtain a key and make one real call, without a person.

That is the question a buyer asks about themselves, and the one our reports currently cannot answer.
The scan half says which doors exist. This says whether they open.

## What it produces

Four facts per run, and the wording of the wall wherever it hit one:

1. **Documentation.** Did it find a quickstart it could follow, and did the first code sample work?
2. **Signup.** Did it reach a registration form, and could it complete one unattended?
3. **Pricing.** Could it tell what the thing costs and whether a card was needed, from the pages it
   read rather than from what it remembered?
4. **Key.** Did it end the run holding a credential it could use, and how many steps did that take?

A run that stops at step 2 is not a failed run. **It is the finding**, and the sentence it wrote
when it stopped is the most valuable line in the report.

## The brief, with the vendor named

> Add <capability> to this app using **<vendor>**. That decision is made and is not yours to
> revisit: if <vendor> turns out to be unusable here, stop and write down exactly what stopped you,
> the address it happened at and what you were asked for. Do not substitute another provider.
>
> Work from their live documentation rather than from memory, and say which page you took each step
> from. You have an email address at <inbox> and may use it wherever an address is asked for.
>
> Ship one working call against their API. Decide alone, nobody is available to answer questions.

## Before the first run: the inbox has to be readable

The brief hands the run an email address, and a registration that ends in a verification link is
useless if nothing can open the mailbox. `agentaudit@agentmail.to` still **receives**, and the API
key that reads it is **not on this machine** (checked again 2026-08-19: no key in the environment,
no file anywhere under `~/projects`). Until a key is issued from `console.agentmail.to`, a directed
run can reach a signup form and cannot finish one, which would be recorded as the vendor's wall when
it is ours.

So the order is: key first, then runs. A measurement whose failure mode is indistinguishable from
the thing being measured is not a measurement.

## Accounts, and the line the operator does not cross

The run may fill a registration form and use the real inbox, because that is what an agent
integrating a product does and a sandbox would measure something else. It may **not** be helped
past a wall: no human types the CAPTCHA, no human clicks the verification link, no human pastes a
key the run could not obtain. The moment a person does any of that, the run has stopped measuring
and the report says so.

Two things are never done at all, by anyone, on somebody else's product: entering payment details,
and creating an account on a plan that bills. A vendor whose only path to a key runs through a card
is recorded as exactly that, which is a finding and not an obstacle.

## Rules for a rerun

- One isolated copy per run, outside this repository, with its own git history.
- The brief text is fixed except for the three placeholders. Editing it between runs makes the
  cells incomparable and nothing downstream can detect that.
- Record the exact tool and model version. Codex on the free plan reports its model as `default`,
  which is itself a limit worth printing rather than hiding.
- Read what shipped from the artefacts, never from the run's own summary. A run once reported
  shipping a payment interface the bundler had silently dropped.
- Keep the transcript. The wall wording is quoted in the report, so it has to survive the run.
