# Target list, generated from the corpus

Rebuilt 2026-08-08 from `/corpus.json` at formula **4.8**, 156 domains in 24 categories.

Every earlier version of this file is superseded, not amended. The 4.3 version ranked 23 vendors as
"runs an MCP server, documents no way to get a key" on MCP verdicts that were **false for 18 of 49**
rows: a 405 to a POST at /mcp is what almost every site answers at a path it does not route. The
control probe now asks an unrouted path on the same origin, so every endpoint below answered
differently from the rest of its own site, or challenged for OAuth with a WWW-Authenticate header.

Rows the corpus flags as `rateLimited` are excluded (defer.run, pandadoc.com): thinner than the site deserves.


## 1. Runs an MCP server, documents no way to get a key (36)

The strongest finding in the corpus, and the only one where the vendor has already agreed with our
premise: they built a door for a machine. Lead with their own endpoint URL, because we have it and
it proves we looked. The sentence is not an insult: **you built a door for a machine, and the
machine cannot get a key to walk through it.**

- `algolia.com` · https://mcp.algolia.com/mcp · provisioning partial
- `amplitude.com` · https://mcp.amplitude.com/mcp · provisioning partial
- `apify.com` · https://mcp.apify.com · provisioning fail
- `axiom.co` · https://mcp.axiom.co/mcp · provisioning partial
- `betterstack.com` · https://mcp.betterstack.com · provisioning fail
- `bitmovin.com` · https://mcp.bitmovin.com · provisioning partial
- `cal.com` · https://mcp.cal.com · provisioning partial
- `calendly.com` · https://mcp.calendly.com · provisioning fail
- `chargebee.com` · https://mcp.chargebee.com · provisioning partial
- `clerk.com` · https://mcp.clerk.com/mcp · provisioning partial
- `courier.com` · https://mcp.courier.com · provisioning fail
- `firecrawl.dev` · https://mcp.firecrawl.dev · provisioning partial
- `flagsmith.com` · https://mcp.flagsmith.com · provisioning fail
- `grafana.com` · https://mcp.grafana.com/mcp · provisioning fail
- `honeybadger.io` · https://mcp.honeybadger.io · provisioning partial
- `hygraph.com` · https://mcp.hygraph.com/mcp · provisioning partial
- `inngest.com` · https://api.inngest.com/mcp · provisioning fail
- `loops.so` · https://mcp.loops.so · provisioning partial
- `mux.com` · https://mcp.mux.com · provisioning partial
- `neon.tech` · https://mcp.neon.tech/mcp · provisioning partial
- `newrelic.com` · https://mcp.newrelic.com/mcp · provisioning fail
- `novu.co` · https://mcp.novu.co · provisioning fail
- `paddle.com` · https://mcp.paddle.com/mcp · provisioning partial
- `posthog.com` · https://mcp.posthog.com · provisioning fail
- `qdrant.tech` · https://mcp.qdrant.tech/mcp · provisioning fail
- `replicate.com` · https://mcp.replicate.com/mcp · provisioning partial
- `resend.com` · https://mcp.resend.com · provisioning partial
- `sanity.io` · https://mcp.sanity.io · provisioning partial
- `savvycal.com` · https://api.savvycal.com/mcp · provisioning fail
- `scrapingbee.com` · https://mcp.scrapingbee.com · provisioning fail
- `sentry.io` · https://mcp.sentry.dev/mcp · provisioning fail
- `stripe.com` · https://mcp.stripe.com · provisioning fail
- `transloadit.com` · https://api.transloadit.com/mcp · provisioning fail
- `turso.tech` · https://api.turso.tech/mcp · provisioning partial
- `vercel.com` · https://mcp.vercel.com · provisioning partial
- `weglot.com` · https://mcp.weglot.com · provisioning fail

## 2. The signup gate answers an agent with a refusal (10)

This is the stage nobody else measures. Lighthouse and Cloudflare both stop at documentation and
protocol files; neither asks whether an unattended client can register. Note the first row.

- `anvil.co` · Signup answers 404 to a request identifying itself as an agent
- `baseten.co` · Signup answers 403 to a request identifying itself as an agent
- `cloudflare.com` · Signup answers 403 to a request identifying itself as an agent
- `froala.com` · Signup answers 404, 403, 403 to a request identifying itself as an age
- `liveblocks.io` · Signup answers 403 to a request identifying itself as an agent
- `nylas.com` · Signup answers 429 to a request identifying itself as an agent
- `shopify.com` · Signup answers 403 to a request identifying itself as an agent
- `vonage.com` · Signup answers 403 to a request identifying itself as an agent
- `workos.com` · Signup answers 403 to a request identifying itself as an agent
- `zenrows.com` · Signup answers 403 to a request identifying itself as an agent

## 3. Docs that render nothing without JavaScript (5)

- `crowdin.com` · Only 38 characters render without JS
- `filestack.com` · Only 41 characters render without JS
- `prosemirror.net` · Only 647 characters render without JS
- `saleor.io` · Only 1,635 characters render without JS, on https://docs.sal
- `signoz.io` · Only 1,315 characters render without JS

## 4. The front door is shut (1)

- `postmark.com` · Answered 429 to StackPick/1.0 (+https://stackpick-f12d13a227ea.herokua

## 5. Signup form needs JavaScript (52)

Real, but too common to be a story on its own. Use it as a second line, never as the opening.

agora.io · bunny.net · cloudinary.com · configcat.com · daily.co · datadoghq.com
dropboxsign.com · elastic.co · groq.com · growthbook.io · hatchet.run · here.com
highlight.io · honeycomb.io · june.so · kinde.com · knock.app · launchdarkly.com
logto.io · lokalise.com · mailgun.com · mapbox.com · maptiler.com · medusajs.com
meilisearch.com · mixpanel.com · modal.com · onesignal.com · openrouter.ai · pdfmonkey.io
pinecone.io · plaid.com · plivo.com · radar.com · sendgrid.com · sinch.com
split.io · statsig.com · storyblok.com · strapi.io · telnyx.com · temporal.io
tigrisdata.com · tiny.cloud · tolgee.io · trychroma.com · twilio.com · uploadcare.com
upstash.com · usefathom.com · xata.io · zilliz.com

## 6. No agent entry point at all (46)

Not worth sending one at a time: the finding is the same sentence for all of them and it reads as
a form letter, which is what it would be.

api.video · auth0.com · bigcommerce.com · browserless.io · bugsnag.com · ckeditor.com
cockroachlabs.com · commercetools.com · contentful.com · cronofy.com · deepl.com · directus.io
documenso.com · docuseal.com · editorjs.io · fireworks.ai · getunleash.io · imagekit.io
lemonsqueezy.com · lexical.dev · livekit.io · locationiq.com · magicbell.com · oramasearch.com
payloadcms.com · phrase.com · plausible.io · polar.sh · pusher.com · quilljs.com
raygun.com · rollbar.com · searchkit.co · sendlayer.com · slatejs.org · stytch.com
supabase.com · supertokens.com · swell.is · tiptap.dev · together.ai · tomtom.com
trigger.dev · turbopuffer.com · typesense.org · uploadthing.com
