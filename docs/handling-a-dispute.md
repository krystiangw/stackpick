# When a vendor says a row is wrong

Written 2026-08-18, after five rows had to be corrected by hand in one night. Every vendor page
carries a `mailto:` with the subject "Wrong verdict on <them>", so this arrives eventually, and the
whole product rests on what happens next: a measurement nobody can get corrected is a claim, not a
measurement.

Answer within a day even if the answer is "we are looking". They are usually right that something is
off, and they are the only person in the exchange who knows their own product.

## 1. Reproduce before replying

Every check is one HTTP request with a published rule, so start by running it again rather than by
reading the code.

```bash
VERBOSE=1 npm run scan their.com      # every check with the sentence it would publish
```

`VERBOSE` is the point: without it the command prints the score and the stage totals, and the
argument is never about those.

Three outcomes, and they are different problems:

- **It no longer fails.** They fixed it, or our reading was transient. Then the correction is a
  rescan **through production**, because a local scan writes nothing the public page reads:

  ```bash
  TOKEN=$(heroku config:get STACKPICK_CONSOLE_TOKEN -a stackpick)
  curl -s -X POST https://letagentsin.com/api/scan \
    -H 'content-type: application/json' -H "cookie: stackpick_console=$TOKEN" \
    -d '{"domain":"their.com"}' | grep -o '"saved":[a-z]*'
  ```

  **Check `saved`.** The API answers with a full scorecard and `"saved":false` when the database
  refused the write, which is right for a visitor and a trap here: a reseed once reported 340
  measurements while not one had been stored. Then open `/v/their.com` and read the row before
  telling them it is fixed.
- **It still fails and the sentence is true.** Nothing to correct. Explain the rule in the words on
  `/methodology` and say what would make it pass. Most disputes end here and end well.
- **It still fails and the sentence is not true of them.** This is the one that matters. Go to 2.

## 2. Decide which kind of wrong it is

| What is wrong | What to do |
|---|---|
| The row is stale: their site changed | Rescan. Nothing else to do. |
| Our reading was right about the address but wrong about the meaning | Fix the rule, and add an erratum until the fix is measured |
| We measured the wrong artefact entirely | Erratum now, rule fix as its own task |
| We could not read them at all and scored it as absence | This is our bug, not their row: unmeasured, never failed |

The last two are the ones that cost trust, because the vendor reads a sentence about something they
never shipped. `directus.com` was scored on `directus`, the server, while the package a developer
installs is `@directus/sdk`; `namecheap.com` was scored on a HashiCorp Vault client.

## 3. Publish the correction before the fix

`src/lib/errata.ts` puts a **Correction** paragraph directly under the verdict on the published page.
It costs one entry and it is what makes the delay honest.

```ts
{
  domain: 'their.com',
  checkId: 'typed_package',
  fixedIn: '9.41',                       // the version that will make it right
  wrongWhen: /^their-package ships without/,   // the sentence this corrects, not just the check
  says: 'What the row claims, why it is wrong, and what is true instead, in their favour.',
  example: 'a real sentence of the shape this corrects',
}
```

Two rules the mechanism enforces so nobody has to remember them:

- **It matches the sentence, not only the check.** A row already corrected by a rescan must not
  carry a note contradicting what it now says.
- **It expires by itself** once the row is measured under `fixedIn` or later. Set `fixedIn` to a
  version that will really contain the fix: an erratum that expires before the fix lands leaves the
  wrong verdict standing with nothing beside it.

`npx tsx scripts/after-reseed.mts` prints every entry still firing after a sweep, so an open
correction stays visible rather than becoming furniture.

## 4. Fix the rule, and measure it before it ships

A rule change touches all 177 rows, so it is never justified by the one vendor who wrote in.

- Verify the disputed rows **by hand** first. On `typed_package` this changed the answer: of the ten
  rows failing it, four were true and six were the wrong artefact, so switching the check off would
  have destroyed real findings to avoid false ones.
- Measure the change against the whole corpus before deploying: `npx tsx scripts/audit-attribution.mts`
  for attribution, a local scan of the affected domains for anything else. Two regressions were
  caught this way in one night, both invisible to review.
- Never during a sweep. The scanner and the measurement ask the same services the same questions.

## 5. What we do not do

- **We do not remove a row because somebody asked.** The corpus is published in full and a gap in it
  is a claim of its own. A row can be corrected, rescanned, or marked; it is not deleted.
- **We do not soften a true sentence.** If the check is right, the answer is the rule and the fix,
  not gentler wording.
- **We do not argue about the score.** The number is arithmetic over verdicts; the argument is
  always about a verdict, and it is a better argument.
