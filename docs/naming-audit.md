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

## MachineReadiness was the recommendation and the check killed it

Searched 2026-08-10. The first page for "machine readiness" is entirely manufacturing:
Manufacturing Readiness Levels, Technology Readiness Levels, Wikipedia at position one, and an AI
Overview that defines the phrase as a one to ten scale for how prepared a machine is for
production. Both channels a name has to win are already occupied, and the second is occupied by
the exact mechanism we would be fighting: a model answering the phrase with somebody else's
definition before we are mentioned. `readyformachines.com` inherits the same problem and dies
with it.

The lesson generalises, and it is the useful part of this audit. **A descriptive two-word English
phrase is very likely to already be a term of art in some field, with a Wikipedia entry and an AI
Overview behind it.** That occupancy cannot be outranked by a new site, and it is invisible until
you search the exact phrase. So the check is not "is the domain free". It is "does this phrase
already mean something", run before anything else.

## The recommendation

Rename before buying a domain, and go with **Let Agents In** on `letagentsin.com`.

It is the only free candidate that passes the test above: the phrase has no prior occupancy at
all, so brand search, retrieval and recall all resolve to one entity from day one. It says what
we do in four words to somebody who has never heard of the category. It commits to a position
that is already ours in writing, because the published audits argue vendors should be reachable
and then measure whether they are. And it cannot be confused with agent observability, the much
larger and better-funded category that audits the agents you built rather than the product they
are trying to use.

The honest cost: it reads as a stance rather than a firm, and it will look slightly odd on an
invoice for an $11,000 engagement. That is a real price and it is the one being paid for
everything above.

If that price is too high, the alternative is not another descriptive phrase. It is a coined
word, which means another sweep, because every coined word worth having in this space was
registered by somebody without a product.

## What to do regardless of which name wins

The name is not where the search traffic comes from. Titles and slugs are, and they already do
the work: each scorecard should carry the vendor and the question in its title, not the brand.
That is a change to page metadata, not to the brand, and it is worth more than either name.

## Moving to the domain, once it is bought

Written while the domain was still unbought, so the buying is the only step that needs a person.

**One string decides every published address.** `src/lib/site.ts` exports `SITE_URL`, which the
user-agent, the documentation page and both corpus scripts read. Set `STACKPICK_BASE_URL` on the
dyno and change the fallback in that file, and everything a stranger reads moves with it. The
places that fall back to `localhost:3000` are metadata and sitemaps, and they are correct as they
are: in development that is the truth.

1. `heroku domains:add letagentsin.com -a stackpick` and `www.letagentsin.com`, then point DNS at
   the DNS target Heroku prints. On Cloudflare use CNAME flattening for the apex, because Heroku
   gives a hostname and an apex cannot hold a CNAME.
2. `heroku config:set STACKPICK_BASE_URL=https://letagentsin.com -a stackpick`.
3. Change the fallback in `src/lib/site.ts`, and the literal host in `public/llms.txt`,
   `public/robots.txt`, `public/agents.md`, `public/agent-signup.md`,
   `public/.well-known/mcp.json` and `public/.well-known/agent-access.json`, which are static
   files and cannot read an environment variable.
4. `npm run reseed`, because 169 detail sentences quote the user-agent, which carries the URL.
5. **Do not retire the herokuapp host.** Every scorecard link published so far names it, including
   the four audits and anything anyone forwarded. Heroku keeps serving it for free, so the old
   links keep resolving.
6. Rename `STACKPICK_BASE_URL` and `STACKPICK_CONSOLE_TOKEN` at the same time if you want, since
   the dyno config is being touched anyway. Leave `MONGODB_DB` alone: renaming it points
   production at an empty database.
