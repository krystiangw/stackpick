# Target list, generated from the corpus

Rebuilt 2026-08-08 from `/corpus.json` at formula 4.3, 103 domains in 15 categories, after four
systemic scanner errors were found and fixed. The previous version of this file was built on
verdicts that were wrong about MCP servers and npm packages, so it is superseded, not amended.

Rows the corpus flags as `rateLimited` are excluded: they are thinner than the site deserves.

**95 of 101 have a hook.** That is too many to be useful as a list, so the order below is the
order worth sending, and the last group is deliberately marked as not worth sending one at a time.

## 1. Runs an MCP server, documents no way to get a key (23)

The strongest finding we have ever produced, and it did not exist yesterday: it only became
countable when the scan started following the endpoint vendors name in their own card, which took
the count of live MCP servers from 27 to 49.

clerk.com · inngest.com · tiptap.dev · betterstack.com · highlight.io · raygun.com · sentry.io ·
flagsmith.com · growthbook.io · supabase.com · transloadit.com · uploadcare.com · vercel.com ·
directus.io · payloadcms.com · replicate.com · stripe.com · amplitude.com · posthog.com ·
loops.so · qdrant.tech · agora.io · mux.com

The sentence writes itself and it is not an insult: **you built a door for a machine, and the
machine cannot get a key to walk through it.** These are companies who have already decided agents
matter, which makes them the warmest audience in the corpus and the least likely to argue with the
premise. Lead with their own MCP endpoint URL, because we have it and it proves we looked.

## 2. The door is shut (3)

froala.com · vonage.com · bitmovin.com

Their edge answers 403 to a plain request from a data centre. An agent integrating them runs in a
data centre. Everything else we measured is a floor rather than a score, and we say so on the card.

Note on bitmovin.com: its edge is inconsistent, the same path answering 200 and 403 on different
attempts. If it comes up in conversation, say that plainly rather than defending the number.

## 3. The documentation needs JavaScript (11)

upstash.com · prosemirror.net · bugsnag.com · bunny.net · filestack.com · imagekit.io ·
chargebee.com · june.so · algolia.com · mailgun.com · resend.com

Two are worth leading with because the number is absurd: **chargebee.com serves 14 characters** and
**filestack.com serves 41** to a plain fetch of their documentation. resend.com is the friendliest
first email in the whole corpus: 14/16 overall, one specific gap, nothing to be defensive about.

## 4. Below their category median, with a named leader above (1)

Only one domain now clears this bar, because the corpus got more accurate and the spread narrowed.
Keep the shape of the hook for later rather than forcing it today.

## 5. No agent entry point (57)

Fifty-seven domains publish none of the nine known entry paths. That is most of the market, which
makes it a finding about the category rather than about any one company. Send it as one piece of
writing about the category, or fold it into a conversation that started with a hook above. One
email per domain saying "you are like everyone else" is not worth anyone's two minutes.

## What this list still cannot tell you

Whether an agent chose them. Every hook here comes from the free scan, which measures files. The
paid audit is the only thing that measures the choice, and no email should blur the two.

## How it was built

Group by category, take the median share per category, then for each domain take the first hook
that applies in this order: door refused, documentation needs JavaScript, MCP server with no
documented credential path, more than twelve points of share below the category median while a
named leader sits above, then no agent entry point. First match wins, so nobody appears twice, and
a domain with no match gets no email.
