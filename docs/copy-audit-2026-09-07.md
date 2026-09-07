# English copy audit, 7 September 2026

The site sits closer to "written by a model" than "written by a person". The measurements give it substance, but the prose keeps explaining how to appreciate them. Three habits dominate: stating a finding and then restating its significance; extending sentences with a defence of the method or the author's honesty; and repeating balanced contrasts about what the product is and is not. The paid report inherits these habits, while the outreach adds an obvious mail-merge structure. A human editor would put the result, its scope and the next step first, retain the evidence, and cut the commentary about being the kind of business that publishes evidence. This is a judgment about the reading experience, not proof of who wrote it.

## File assessment

Read in the requested order. Counts below approximate authored English copy, including headings, metadata, controls and alternative branches, with each source passage counted once. They exclude comments, implementation code, URLs and code examples. Imported page content is outside these source-file counts. The generator count covers its own report wording; the sample includes resolved measurements, fixes and agent quotations. The outreach count covers the ten initial emails and the follow-up, including subjects. Its internal notes and recipient table were read but are excluded from the copy counts.

| File | Rough word count | Verdict | The one habit that dominates there |
|---|---:|---|---|
| `src/app/page.tsx` | 800 | rewrite | Explains the commercial significance after stating the finding. |
| `src/app/pricing/page.tsx` | 2,700 | rewrite | Defends the offer repeatedly instead of letting the comparison sell it. |
| `src/app/audit/page.tsx` | 210, plus imported audit summaries | trim | Extends a useful publication policy into a defence of interpretation. |
| `src/app/methodology/page.tsx` | 4,600, plus imported check descriptions | rewrite | Mixes current rules, repair history and claims of intellectual honesty. |
| `src/app/docs/page.tsx` | 780, plus code examples | trim | Turns API instructions into lessons about product design. |
| `src/app/report/page.tsx` | 980, plus computed rows | trim | Repeats the credential finding through door metaphors. |
| `src/app/findings/page.tsx` | 3,450 | rewrite | Announces the significance of results already visible in the numbers. |
| `src/app/visibility/page.tsx` | 110, plus imported form copy | trim | Uses abstract measurement language where a concrete description would work. |
| `src/app/c/[category]/page.tsx` | 360, plus category data | trim | Replaces definitions with metaphors about rooms and walls. |
| `src/app/r/[id]/page.tsx` | 910, plus findings and component copy | rewrite | Wraps observations in dramatic explanations of what agents do. |
| `src/app/d/[id]/page.tsx` | 110, plus the delivered report | trim | Adds another assurance about reproducibility after the report. |
| `src/components/watch-form.tsx` | 150 | fine | Mostly useful instructions; a few vague pronouns remain. |
| `src/components/scan-form.tsx` | 110, plus code example | fine | Mostly direct status and error messages. |
| `src/components/email-gate.tsx` | 240 | rewrite | Uses a delivery failure to praise the product's honesty. |
| `scripts/client-report.mts` | 680, plus imported and stored copy | rewrite | Explains what every result means before the reader can inspect it. |
| Supplied `agora.io.md` | 1,170 | rewrite | Repeats absence as a diagnosis despite a documented question-fit problem. |
| `outreach/drafts/gift-report-2026-09-03.private.md` | 1,430 of outgoing copy | rewrite | Same sales frame, paragraph sequence and closing question across recipients. |

The sample is `/private/tmp/claude-501/-Users-kgwizdal-projects-testgorilla-agent/76cd64ef-404b-4314-bea0-6ba7d64d44ae/scratchpad/raporty/agora.io.md`. References to `agora.io.md` below mean that file. No private delivery links are reproduced.

The voice reference at `~/.claude/skills/krystian-voice/SKILL.md` was readable. Its useful directions here are simple words, one idea per sentence, low ego and information stated once. Its email guidance is explicitly inferred from other channels. The replacements use first person singular where the author speaks, without importing Slack mannerisms. This audit follows the requested ASCII hyphen rule.

## The ten worst passages

Quotes identify passages; replacements cover the stated span. Braced values remain existing variables, not invented measurements. Removed claims about motives or significance are identified below rather than carried forward as facts.

### 1. A failed email becomes a character reference

`src/components/email-gate.tsx`, about lines 88-96, permanent-link branch.

Quote: "This tool exists to say what actually happened."

The reader needs the report. The product instead congratulates itself for admitting a failed send. The preceding explanation also assigns blame before giving the recovery step. This is the clearest example of copy talking to itself.

Full replacement:

> The mail provider refused the email. I have your address. The scorecard for {domain} stays at this URL. Copy the link to keep it.

Keep the separate temporary-link branch accurate about expiry. It cannot promise a permanent URL.

### 2. The solo operator is explained as a purchasing philosophy

`src/app/pricing/page.tsx`, about lines 444-446.

Quote: "which is the part of this that does not survive"

The useful fact is capacity. The second sentence takes 37 words to say that the same person writes the brief and discusses the results. The costs/buys symmetry sounds composed to resemble candour. The claim that this work cannot survive a handover is an opinion, not another service fact.

Full replacement:

> I handle two full audits a month, not ten. I have no cover if a week goes badly. I write your brief and discuss the results with you.

### 3. An operational FAQ becomes a justification for operating that way

`src/app/pricing/page.tsx`, about line 469, the full monthly-automation answer.

Quote: "What that means for you is that the monthly mail arrives"

The answer is 89 words, including a 41-word sentence. It takes four sentences to reach the fact the question asks for: the monthly runs are manual. The cost explanation also implies that a month may be skipped. That limitation needs to remain visible.

Full replacement:

> Weekly checks run automatically, with an email when a verdict changes. I start the five monthly agent runs and read the email before sending it. Runs cost money on external tools, so I may skip them when there is nothing to report. I choose the sending day; it is not a fixed monthly date.

### 4. API documentation tells the reader what to copy

`src/app/docs/page.tsx`, about lines 39-41.

Quote: "that decision is the one worth copying"

Someone opening API docs wants authentication requirements and a request example. The second sentence lectures them about unnecessary gates. It contributes no endpoint behaviour.

Full replacement:

> The scan reads public pages. You do not need an account, an API key or OAuth.

### 5. A control-probe rule contains a 99-word sentence

`src/app/methodology/page.tsx`, about line 496, the whole control-probe item.

Quote: "The MCP check runs the same control, because a bare 405"

This 235-word item combines a rule, an example, exceptions and a second protocol. The longest sentence is 99 words. The technical distinctions matter, but the reader has to retain several branches while the author explains why each exists. Separate the operations and keep the exception beside its rule.

Full replacement:

> Before checking agent entry files, I request an unregistered path in the same namespace with the same Accept header. I discard each file that matches that response.
>
> On sentry.io, unknown .md paths return a 976-byte page; a real descriptor is 106 bytes. Compare files individually.
>
> If the control times out, is rate limited or is refused, I mark the check unmeasured. I cannot distinguish a real file from a catch-all response.
>
> MCP uses the same control. A bare 405 can come from a POST to an unrouted path. An address counts if it completes the handshake, returns WWW-Authenticate, uses a host built for MCP, or differs from an unrouted path on that origin.
>
> A refusal, empty 202 or bare 405 needs a working control; otherwise it is unmeasured. A handshake, JSON body or OAuth challenge counts without one.

### 6. The home-page signature defends a business model

`src/app/page.tsx`, about lines 225-230, including the audit link.

Quote: "rather than by a team you never meet"

The author introduces an imaginary competitor, then tells readers why they might inspect his work. Both additions weaken the useful personal attribution. Link the evidence without narrating the reader's decision.

Full replacement:

> I'm Krystian Gwizdała. I built the scanner and formula, ran the agents, and produced every number here. I also run the audits. Read the four published audits before deciding.

The final sentence should link to the existing audit index.

### 7. The report buries its run design in a parenthesis

`scripts/client-report.mts`, about line 283; `agora.io.md`, line 7.

Quote: "Two tools rather than one because a result that appears"

The sample opens with a 39-word sentence containing the run count, tool count, batch count and three dates. It then makes an unsupported general inference about results seen on only one tool. Different results can have several explanations. Keep the recorded setup; drop that causal claim.

Full replacement for the sample paragraph:

> I asked one buying question in 15 separate sessions on 2 tools, across 3 batches. Sessions shared no context.

| Tool | Date | Runs |
|---|---|---:|
| codex | 2026-08-17 | 5 |
| codex | 2026-09-02 | 5 |
| claude | 2026-08-16 | 5 |

For implementation, retain these fields from the existing variables. Consolidate this with the existing model/version table instead of adding another table to the finished report.

### 8. The report instructs a CTO how to interpret absence

`scripts/client-report.mts`, about lines 431-447; `agora.io.md`, lines 41-45.

Quote: "That is the wording your own pages have to answer."

The command assumes the report has established a documentation problem. It then explains non-comparison, introduces a wall/silence metaphor, and comments on disclosures elsewhere on the site. A CTO needs the observed scope and its limits. The recommendations must also respect the question-fit issue described below.

Full replacement for these sample paragraphs:

> The runs did not review Agora or compare it with mux.com. None reached Agora. The quoted Mux reasons can guide a review of your pages.
>
> A one-run gap in this sample of 15 does not establish a rank. Both tools ran on one laptop; claude could read CLAUDE.md. The results describe that setup.

This is a shorter account of the existing passage, not a repair for the wrong question. Do not send this as an Agora diagnosis without resolving that issue.

### 9. The closing limitation restarts the argument

`scripts/client-report.mts`, about line 509; `agora.io.md`, line 113.

Quote: "we publish which two rather than implying every check matters equally"

The reader gets another contrast, another statement of publishing virtue and another assurance of reproducibility. The real limitation is narrower: correlation does not establish that fixing a check changes choices. Also distinguish reproducing a deterministic scan from checking recorded, variable agent answers.

Full replacement:

> This report does not rank vendors or show that a fix changes agent choices. Only two checks correlate with being named; see the findings. You can reproduce the scan using the published formula and check the counts against the printed question and quoted answers.

Link "the findings" to the existing findings page. The two-check count is preserved; no new effect size is asserted.

### 10. The follow-up performs reluctance before pitching

`outreach/drafts/gift-report-2026-09-03.private.md`, about lines 245-246.

Quote: "then I will leave you alone"

The phrase advertises the mechanics of a follow-up sequence. The next sentence is 39 words and tries to fit the offer, both cadences and the notification policy into one breath. State the offer once and make stopping it concrete.

Full replacement:

> One last follow-up on last week's report. Monitoring is free while I build it: weekly checks and the agent question once a month. You'll get an email when something changes. No change, no email. Any email has a link to stop monitoring.
>
> [Watch your domain](https://letagentsin.com/#watch)

## Repeated tics

Literal counts are case-insensitive, with whitespace and JSX entities normalised. Scope is the copy described in the file table, including alternative source branches. Generator wording and its appearance in the sample count separately because both files were requested. Source comments, outreach planning notes, the voice reference and guards do not count. Imported helper wording counts here only where it appears in the sample. These are source occurrences, not the number of times a visitor sees a phrase across generated category or vendor pages.

| Pattern | Occurrences | Example file |
|---|---:|---|
| `the same checks` | 4 | `src/app/pricing/page.tsx`, about 79 |
| `on purpose` | 1 | `src/app/report/page.tsx`, about 180 |
| `nothing else` | 5 | `src/app/pricing/page.tsx`, about 138 |
| `which is` | 49 | `src/app/pricing/page.tsx`, about 446 |
| `so you` | 10 | `src/app/page.tsx`, about 230 |
| `rather than` | 77 | `src/app/methodology/page.tsx`, about 239 |
| `we say so` | 4 | `src/app/c/[category]/page.tsx`, about 202 |
| `we will ask before` | 2 | `src/app/page.tsx`, about 202 |
| `worth stating` | 1 | `src/app/findings/page.tsx`, about 348 |
| `that is the` | 15 | `scripts/client-report.mts`, about 370 |
| `the thing`, whole phrase | 6 | `src/app/findings/page.tsx`, about 193 |
| `what it buys you` | 1 | `src/app/pricing/page.tsx`, about 445 |
| Colon-led explanations or reveals | At least 116 | `src/app/findings/page.tsx`, about 80 |
| Three-part parallel lists or clauses | At least 46 | `src/app/pricing/page.tsx`, about 465 |
| `Short version:` | 10 | Outreach, about 40 |
| `I ran the report we sell for $49` | 10 | Outreach, about 37 |
| `I ask a coding agent the same buying question` | 5 | Outreach, about 56 |
| `Does this match` | 10 | Outreach, about 42 |
| `no charge` in subjects | 11, including follow-up | Outreach, about 31 |

The structural counts are conservative manual inventories. Colon counts include sentences that announce an explanation or a finding; plain field labels, URL punctuation, dates and code syntax are excluded. Triads include factual lists as well as rhetorical ones. Neither construction is automatically bad. Their repeated use makes unrelated sections sound as though they were assembled from the same instructions.

For traceability, the colon inventory by file is: home 3; pricing 14; audit 2; methodology 27; docs 6; industry report 5; findings 30; category 4; scorecard 6; generator 7; sample 10; outreach 2. Other requested files contribute none to this conservative inventory. The triad inventory is: home 3; pricing 10; methodology 12; docs 4; industry report 2; findings 5; category 1; scorecard 2; generator 2; sample 4; outreach 1.

The biggest issue is not the isolated phrase "on purpose". It is the larger habit of explaining intent. Examples include "The uncomfortable consequence, printed because it is true" in methodology, about 276; "Limits we will not hide" in findings, about 388; and "the honest limit" in pricing, about 298. State the consequence, limit or sample size. Keep the promise to ask before charging, but put it beside the price once.

## Length, structure and reader needs

The length problem is measurable. Counts use words and numbers, treating contractions and hyphenated terms as single tokens; URLs and markup are excluded.

| Passage | Length observed | Editorial action |
|---|---:|---|
| Pricing, about 290-295 | 94-word paragraph | Put counts and transcript contents in the deliverables table; link to the method. |
| Pricing, about 483 | 100-word FAQ answer; 43-word sentence | Answer the price comparison with the included agent runs. Cut the lecture to the buyer. |
| Pricing, about 511 | 93-word FAQ answer | Separate public scans, visitor scans and paid-audit publication permissions into rows. Preserve every permission and deadline. |
| Audit index, about 93-98 | 98-word paragraph | Separate commissioned work from the correction policy. |
| Methodology, about 250-258 | 149-word paragraph | Move repair history into a dated log, retaining the measurements. |
| Methodology, about 496 | 235-word item; 99-word sentence | Separate control behaviour, example and MCP exceptions. |
| Findings, about 40 | 120-word paragraph; sentences of 34 and 33 words | Keep the run results together; separate the removed payment interface as its own finding. |
| Findings, about 193 | 118-word paragraph | State the research question and comparison method directly. |
| Outreach, about 35 | 33-word opening sentence | Start with the recipient's question or result. |
| Outreach follow-up, about 245 | 39-word offer sentence | Split cadence, notification condition and cancellation. |

Repeated sections are a bigger burden than individual long sentences. Pricing gives the same offer in the comparison table, tier cards, long explanation and FAQs. Choose one detailed comparison and use the cards for price and action. The scanner's low cost is explained in the introduction and again in the free-scan FAQ. Discovery versus build runs appears in the table, the long details block and the monitoring-signup FAQ. Small sample size is defended in the first details block and again in the five-run FAQ.

Methodology explains its own failing score around lines 388-409 and again around 458-473. Combine those accounts beside the actual score. The history of noise measurements around 216-294 needs a current result followed by a dated table of scan pairs, formula versions, changed verdicts and exclusions. Keep the old measurements, but stop asking the reader to reconstruct chronology from successive corrections.

Abstract language adds work without adding precision. "This is a variable model observation" in visibility, about line 17, can become "Answers can change between runs." "The question is the unit here" in pricing, about line 80, should say what the plan includes and what an extra question costs. In pricing, about 339, "Reading the answers is done by rule" hides the actor and operation; name the matcher and say that it counts mentions. In the sample, about 94, "not evidence of negotiation" needs the concrete behaviour: the same text arrives at unknown markdown paths. Keep protocol terms where they identify the measured operation; remove abstractions that merely sound analytical.

Headings should help the reader find something. Pricing's "What each one is" at about 165 is vague where a plan comparison needs a name. "The long version, for the sceptical buyer" at about 268 assigns the reader a personality; its contents need task names such as "Run method" and "Monitoring schedule". Methodology's main heading at about 84 uses a thesis where "Scoring formula" would work. The generator's unmeasured heading at about 473 appends a defence to a perfectly useful label.

Research headings can carry a conclusion. The licence-key finding at `src/app/findings/page.tsx`, about 101, does this well: "A licence key eliminated two vendors before either product was opened." By contrast, the heading around 182 tries to hold the two-check result, the llms.txt comparison and the fame control. Give it one finding and put the comparison in a table. The industry's read-versus-join headline can stay as a framing device if the body immediately supplies the measured scope. It does not need another door metaphor under every figure.

The pricing FAQ sounds generated because answers repeatedly follow the same sequence: acknowledge an objection, explain the philosophy, contrast a bad alternative, then restate the benefit. The details summary at about 280 overstates what one run can prove; one observation is still evidence, even when it cannot support a ranking. The audit form and scanner errors largely avoid this pattern. Use their directness as the internal reference.

## The paid report and outreach need more than shorter sentences

The Agora sample has a documented relevance problem. The outreach notes, about lines 16-19, explicitly remove Agora and LiveKit because the question concerns upload, encoding and playback while those products sell real-time calls. The sample at line 9 asks that same question. Its zero is a count from those runs; it does not by itself diagnose Agora's visibility among its buyers. Preserve the 0 of 15 result and its dates, but do not send it with a broader absence claim. Establish a relevant brief before producing that diagnosis. This concern comes from the supplied notes, not a new market assessment.

Several report choices would irritate a technical buyer:

- `agora.io.md`, about 11, 22 and 41: the report states zero mentions, repeats that nobody wrote about the vendor, then explains absence again. Keep the count and one scope note. "That is the finding: not a bad review, an absence" is a verdict delivered with unnecessary authority.
- About 13-15 and 26-30: two indistinguishable codex bullets become distinct only in the later dated table. Use one batch table with date, tool/version, recorded model, runs and mentions. Retain `default` where that is all the model record contains.
- About 33-35, and `src/app/c/[category]/page.tsx`, about 256-258: naming first becomes being picked or being the answer. The methodology defines order of mention. Use that definition consistently; a position in text does not establish a purchasing decision.
- About 51-65: present scan date, formula 9.57, score 9/15, 16 checks, 2 unmeasured checks and 1 inapplicable check in labelled rows. The stage table uses maxima totalling 18, so label that column explicitly. Do not solve this by silently changing denominators.
- About 71-73 and 100: the pricing description and instruction appear twice, with the later quote visibly cut mid-word. Keep the full observed text once. Put action, point gain and effort beside it.
- About 98-102: "None of it needs a rewrite" precedes an instruction to rewrite a description. The provisioning estimate also assumes a usable key-creation path; the next sentence allows that none exists. Keep 9/15 and 13/15 as the stated score calculation, but make the condition visible. Effort labels are estimates, not measurements of the vendor's implementation.
- About 109: the extra 2 unmeasured points belong beside the gain calculation as a table note. They do not need another sentence about arithmetic.
- `scripts/client-report.mts`, about 294, 302-305 and 356: guest matching, ambiguous names and Polish quotations need disclosures. State what was counted, what was excluded and which instructions were readable. Cut the moral argument after each disclosure.
- `src/app/r/[id]/page.tsx`, about 338-342: "No agent can pass it" outruns the described HTTP test. The site's own WebMCP copy discusses agents in browsers. Keep the observed status and JavaScript requirement; scope the conclusion to clients without JavaScript.

I also read the report-producing wording in `src/lib/report-numbers.ts`, the remedies and claims in `src/lib/fixfirst.ts`, and `whoWentFirst` in `src/lib/vendors.ts`. These supply text that shortening the generator alone will not change. The delivered page can use a structured `ReportView` instead of markdown, as `src/app/d/[id]/page.tsx` shows around line 61. A future rewrite must inspect that rendering too; the wrapper's small word count is not an assessment of the entire report UI.

The outreach has recipient-specific numbers, but the same wrapper makes them look inserted. Every initial email introduces the author's measuring service, assigns the gift a $49 value, says it belongs to the recipient, announces a short version and asks a near-identical closing question. The first email's "no strings attached" at about 37 and all ten price references sell the favour before the recipient has read it. This also conflicts with the internal instruction against a price or pitch around line 21.

Lead each email with the actual question tested and the relevant result. Put the report link immediately after it, keep the raw-run link, and ask one answerable question about fit or the recipient's observations. Remove the $49 sales anchor from these gift emails while leaving the product's actual price unchanged. Drop the general introduction to what the business measures. Personalisation should come from why this brief fits the product, not an expression of surprise such as Chroma's closing rationale around 187.

Do not ask a vendor to validate a discovery experiment solely through signups. These runs did not create accounts, so a question about whether the brief matches incoming requests may be more useful. Review Transloadit's fit as carefully as Agora's: its draft, about 82, says the runs never reached the upload layer. Also check the unit behind every outreach scan ratio. The drafts call them passing checks, while the report system distinguishes checks from weighted points. Do not relabel those numbers without checking the associated scan. DocuSeal's claim at about 40 that the scan establishes usability is stronger than the stated limits of HTTP checks.

## Recommended rewrite order

1. **Paid report: `scripts/client-report.mts` and the supplied sample.** Fix question fit, definitions and the order of evidence before shortening the template. Put the vendor's result and relevant limits first. Combine batch information and consolidate repeated finding/fix text. Include the output helpers identified above and check the structured report view in the same editorial pass. Buyers forward this document as evidence.
2. **Outreach drafts.** Remove the gift valuation, generic service introduction and repeated interpretation. Check brief fit and score units before any send. The existing raw-run links and one-question format are worth keeping.
3. **`src/app/pricing/page.tsx`.** Retain the comparison, prices, scope, manual monitoring limitation and actions. Cut duplicate explanations from the cards and FAQs. Replace third-person founder copy and institutional "we" with the owner's direct account of what he does.
4. **`src/components/email-gate.tsx`, then `src/app/r/[id]/page.tsx`.** Give error recovery before explanation. Keep temporary-link and unmeasured states explicit. State the scan's findings before the audit upsell, and shorten the unrelated editor study around lines 392-399.
5. **`src/app/page.tsx`, then the audit and category pages.** Make the scan action, monitoring offer and author clear. Trim repeated consequences from evidence cards. Use literal definitions for counts and a short publication policy.
6. **Methodology, findings and the industry report.** Separate current rules from history, turn comparative numbers into tables, and keep scope limitations beside the affected claims. Remove honesty declarations. Preserve the empirical details that make these pages useful.
7. **Docs, visibility and the delivery wrapper.** Remove product philosophy from instructions and use concrete definitions. Leave the watch and scan forms mostly alone; check their wording only where the revised pages change terminology.

### Exact-literal guards

`scripts/rules.mts` greps source text with exact literals and regular expressions. Any rewrite must update the affected guards in the same change, preserving the behaviour or disclosure each guard protects. Passing a literal check does not establish that the surrounding sentence is accurate. This audit changes neither the copy nor the guards.

These copy-sensitive literals were observed. Line numbers below refer to `scripts/rules.mts`; required and forbidden matches are distinguished.

| Source protected | Literal | Guard location / expectation |
|---|---|---|
| Report generator | `without naming ${domain}, and we did not count them` | About 400, required |
| Watch form | `the domain, nothing else` | About 418, forbidden |
| Pricing | `Free while we are building it` | About 534, compared with billing state |
| Industry report | `entry files we look for by name` | About 710, required |
| Docs | `result kinds are the same four` | About 1449, forbidden |
| Docs | `Only the failing checks become results` | About 1450, required |
| Docs | `counted in the run properties` | About 1451, required |
| Methodology | `counted on their own pages on {RIVALS_READ_ON}` | About 1556, required |
| Findings | `Read on {RIVALS_CHECKED_ON}` | About 1570, required |
| Docs | `read on {WEBMCP_READ_ON}` | About 1582, required |
| Methodology | `${MAX_BYTES_PER_RESPONSE.toLocaleString('en-US')} bytes` | About 1688, required |
| Methodology | `stopped deciding which of your pages we read` | About 1689, required |
| Methodology | `if the control does not answer, we skip the path` | About 1690, required |
| Methodology | `up to three times` | About 3212, required |
| Methodology | `every hit in that namespace is suppressed` | About 3219, forbidden |
| Methodology | `Per file, not per namespace` | About 3220, required |
| Methodology | `the check says it could not tell` | About 3221, required |
| Methodology | `needs no control and still counts` | About 3227, required |
| Methodology | `an answer is one only a control can read` | About 3228, one accepted variant |
| Methodology | `the answer is one only a control can read` | About 3228, other accepted variant |
| Pricing | `The five agent runs are started by a person` | About 3791, required while monthly runs remain manual |
| Report generator | ` (in Polish)` | About 3925, required |
| Report generator | `a translated quote is our sentence` | About 3926, required |
| Industry report | `left out of every number` | About 3944, required |

There are also guards on price interpolation, noise-floor interpolation, date constants and their age, formula-driven findings, privacy flags, publication branches and markdown structures. Those are implementation contracts, not wording to imitate. In particular, do not keep the translation sermon merely to satisfy its guard: retain the language disclosure and update the guard to protect it.

## What not to change

- Preserve facts, prices, dates, counts, formula versions, denominators and units. Cutting a sales reference to $49 from an email does not change the $49 offer. Apparent contradictions need checking against the record, not editorial arithmetic.
- Preserve check names, check IDs, category names and the distinctions between failed, partial, unmeasured and inapplicable results. Keep the conditions on proposed score gains.
- Preserve original prompts and agent quotations as evidence. Shorten the framing, not the underlying record. Keep language labels and any translation labels accurate.
- Preserve real limits: small samples, operator instructions, one-laptop scope, formula differences, HTTP-only observations and the distinction between mention order and a decision.
- Preserve the publication permissions, correction process, charging consent, cancellation instructions and ten-working-day reply period. Keep legal wording in privacy and terms unchanged. Those pages were outside this copy audit.
- Keep useful specifics: scan errors with a next step, observable HTTP results, dated evidence, the comparison table, raw transcripts and the author's name. The human voice is already present when the copy says what happened and stops.
