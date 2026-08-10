# The name

Measured 2026-08-10. Domain availability from RDAP, not from a registrar's search box, which
shows a name as taken the moment you look at it.

## A name cannot do the SEO work here, and it is worth knowing why before choosing one

Three different things get called "SEO for the name" and only one of them is the name's job.

**Brand search.** Somebody hears the name once at a conference and types it in a week later. This
is the only channel a name controls, and it needs exactly one property: nothing else answers to
that string.

**Category search.** Somebody searches "can AI agents sign up for my product". Putting the keyword
in the domain buys nothing: Google's exact-match-domain update in 2012 removed that effect, and
what ranks now is a page whose title and content answer the query. We already own the asset that
does this, and it is not the name. It is 155 vendor scorecards across 24 categories, each one a
page that answers "can an agent get through <vendor>". Buying agentreadiness.com would not rank
us for agent readiness. Writing 155 pages that answer it does, and they are written.

**Retrieval.** Somebody asks a model instead of a search engine. A model binds facts to an entity
name, and an ambiguous name inside a crowded prefix is the case where retrieval merges you with
something else or declines to answer. Our own lookup returns null on a tie rather than guess, and
a name that ties is a name that loses this channel. We sell agent readiness while carrying a name
a retrieval system would tie-break away from us.

So: keywords belong in page titles and slugs, where they already are. The name's whole job is to
be unmistakable.

## Where StackPick fails, in order of how much it costs

**It promises the one thing the product refuses to do.** "Pick" says we choose a vendor for you.
`src/lib/lookup.ts` says the opposite in writing: an elimination service and not a
recommendation, because recommending would sell a judgement we never measured while we also sell
those vendors the fix. Every sales conversation would open with a correction, and the corrections
that stick are the ones the name keeps re-asserting.

**It reads as a stack comparison site.** That is StackShare's category, and it brings a visitor
who wants "which database should I use", not a vendor who wants to know why agents stop at their
signup form. Wrong visitor is worse than no visitor: it inflates traffic and flattens conversion.

**`stack` is the most saturated prefix in developer tooling.** Stack Overflow, StackShare,
StackBlitz, StackHawk, Stack AI, StackState, Stackbit. Brand recall gets absorbed by them, which
is the one channel above that a name is supposed to win.

**We do not own the name and cannot cheaply.** `stackpick.com` is parked on BrandBucket, a domain
broker, so the .com is priced as an asset rather than a registration. `stackpick.dev` and
`stackpick.io` are registered by other parties. `stackpick.ai` is the only free variant, which
would make us the fourth stackpick.

The counter-argument is switching cost, and right now it is close to zero: no domain bought, no
customers, no backlinks, no press. In three months the corpus starts accumulating links and the
cost is real. This is the cheapest moment a rename will ever have.

## The descriptive namespace is bought out

Of about 110 domains checked, 16 are free. Every single-word English candidate is registered, and
so is every `agent`-prefixed compound worth having:

    agentaccess  agententry  agentintake  agentpass  agentgate  agentwall  agentprobe
    agentindex   agentscore  agentcheck   agentaudit agentready agentreadiness  agentdoor
    machineready machineaccess machinepath machinecheck machinedoor machineentry machinereadable
    latchkey  doorman  doorbell  doorstep  dryrun  onramp  unattended  coldstart  entrypoint
    firstmile threshold  passage  reachable  gatecheck  botgate  keyless  adit  wicket  postern

Most resolve to parking pages. `agentgate.ai` and `agentindex.com` share an IP with a domain
marketplace. This is not bad luck, it is a market: the category word was bought by people who do
not have a product, and a one-person business cannot outbid them.

The consequence for the shortlist is direct. We are not choosing the best name in English. We are
choosing the best name that can be registered this afternoon for the price of a registration.

## Free, and worth considering

| Domain | Reads as | Cost |
|---|---|---|
| `machinereadiness.com` | Exactly what we measure, no explanation needed | Collides with a manufacturing term (machine readiness, OEE), so brand search starts polluted |
| `letagentsin.com` | Nothing else on the internet uses this phrase | A stance, not a company; awkward on an invoice for an $11k engagement |
| `readyformachines.com` | Clear | Clunky, and inherits the same manufacturing collision |
| `chokepoint.dev` | The thing we find, named precisely | Negative-only framing, and .dev not .com |
| `stackpick.ai` | Nothing changes | Keeps every problem above and buys a TLD we would abandon on rename |

## The recommendation

Rename, before buying a domain, and go with **MachineReadiness** on `machinereadiness.com`.

It wins on the criterion that actually matters for a category nobody searches for yet: a person
who hears it once knows what we sell, and there is no competitor, no adjacent product and no
crowded prefix absorbing the recall. It avoids the trap every `agent`-prefixed name walks into,
which is sounding like agent observability, a much larger and better-funded category that audits
the agents you built rather than the product they are trying to use. And it is the only
descriptive .com in the whole sweep that is free at registration price.

The one thing to verify before committing: what the first page of results for "machine readiness"
actually looks like today. My reading is that the manufacturing sense is thin as an exact phrase,
but the search budget for this session is spent and that is a check, not an assumption.

`letagentsin.com` is the higher-variance alternative. It is unmistakable in every channel and it
states our position, which is genuinely ours: the published audits argue that vendors should be
reachable and then measure whether they are. It is worth taking if the memorability is worth more
than sounding like a firm.

## What to do regardless of which name wins

The name is not where the search traffic comes from. Titles and slugs are, and they already do
the work: each scorecard should carry the vendor and the question in its title, not the brand.
That is a change to page metadata, not to the brand, and it is worth more than either name.
