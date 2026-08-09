# Target list, generated from the corpus

Rebuilt 2026-08-09 from `/corpus.json` at formula **6.2**, 156 domains in 24 categories.

Every earlier version is superseded. Two adversarial passes have run against these verdicts since the
last rebuild: the first proved 23 of 138 claims wrong, the second 15 of 675, and everything below
survived the second. Rows flagged `rateLimited` are excluded (defer.run, pandadoc.com).


## 1. Runs an MCP server, publishes client registration, documents no way to get a key (28)

The strongest row in the corpus and the easiest sentence to write. These vendors shipped a door for
a machine **and** RFC 7591 dynamic client registration, which is the standard way an agent registers
itself without a human. An agent can therefore register as a client and still cannot obtain a
credential, because nothing on the site says how. They have done the hard part already.

- `algolia.com` · https://mcp.algolia.com/mcp · provisioning partial
- `amplitude.com` · https://mcp.amplitude.com/mcp · provisioning partial
- `apify.com` · https://mcp.apify.com · provisioning fail
- `axiom.co` · https://mcp.axiom.co/mcp · provisioning partial
- `betterstack.com` · https://mcp.betterstack.com · provisioning fail
- `bitmovin.com` · https://mcp.bitmovin.com · provisioning partial
- `cal.com` · https://mcp.cal.com · provisioning partial
- `calendly.com` · https://mcp.calendly.com · provisioning fail
- `firecrawl.dev` · https://mcp.firecrawl.dev · provisioning partial
- `flagsmith.com` · https://mcp.flagsmith.com · provisioning fail
- `grafana.com` · https://mcp.grafana.com/mcp · provisioning fail
- `honeybadger.io` · https://mcp.honeybadger.io · provisioning partial
- `hygraph.com` · https://mcp.hygraph.com/mcp · provisioning partial
- `mux.com` · https://mcp.mux.com · provisioning partial
- `neon.tech` · https://mcp.neon.tech/mcp · provisioning partial
- `newrelic.com` · https://mcp.newrelic.com/mcp · provisioning fail
- `novu.co` · https://mcp.novu.co · provisioning fail
- `paddle.com` · https://mcp.paddle.com/mcp · provisioning partial
- `posthog.com` · https://mcp.posthog.com · provisioning fail
- `replicate.com` · https://mcp.replicate.com/mcp · provisioning partial
- `resend.com` · https://mcp.resend.com · provisioning partial
- `sanity.io` · https://mcp.sanity.io · provisioning partial
- `savvycal.com` · https://api.savvycal.com/mcp · provisioning fail
- `sentry.io` · https://mcp.sentry.dev/mcp · provisioning fail
- `stripe.com` · https://mcp.stripe.com · provisioning fail
- `turso.tech` · https://api.turso.tech/mcp · provisioning partial
- `vercel.com` · https://mcp.vercel.com · provisioning partial
- `weglot.com` · https://mcp.weglot.com · provisioning fail

## 2. Runs an MCP server, no client registration, no documented key (8)

- `chargebee.com` · https://mcp.chargebee.com · provisioning partial
- `clerk.com` · https://mcp.clerk.com/mcp · provisioning partial
- `courier.com` · https://mcp.courier.com · provisioning fail
- `inngest.com` · https://api.inngest.com/mcp · provisioning fail
- `loops.so` · https://mcp.loops.so · provisioning fail
- `qdrant.tech` · https://mcp.qdrant.tech/mcp · provisioning fail
- `scrapingbee.com` · https://mcp.scrapingbee.com · provisioning fail
- `transloadit.com` · https://api.transloadit.com/mcp · provisioning fail

## 3. The front door is shut (0)


## 4. Docs that render nothing without JavaScript (6)

- `crowdin.com` · Only 38 characters render without JS
- `filestack.com` · Only 41 characters render without JS
- `prosemirror.net` · Only 647 characters render without JS
- `saleor.io` · Only 1,635 characters render without JS, on https://docs.sal
- `signoz.io` · Only 1,315 characters render without JS
- `sinch.com` · Only 1,923 characters render without JS

## 5. Signup form needs JavaScript (51)

Real, and the most common finding in the corpus. Use it as a second line, never as the opening.

agora.io · bunny.net · cloudinary.com · configcat.com · daily.co · datadoghq.com
dropboxsign.com · elastic.co · groq.com · growthbook.io · hatchet.run · here.com
highlight.io · honeycomb.io · june.so · kinde.com · knock.app · launchdarkly.com
logto.io · lokalise.com · mailgun.com · mapbox.com · maptiler.com · medusajs.com
meilisearch.com · mixpanel.com · modal.com · onesignal.com · openrouter.ai · pdfmonkey.io
pinecone.io · plaid.com · plivo.com · radar.com · sendgrid.com · split.io
statsig.com · storyblok.com · strapi.io · telnyx.com · temporal.io · tigrisdata.com
tiny.cloud · tolgee.io · trychroma.com · twilio.com · uploadcare.com · upstash.com
usefathom.com · xata.io · zilliz.com

## 6. No agent entry point at all (47)

Not worth sending one at a time: the finding is the same sentence for all of them.

anvil.co · api.video · auth0.com · baseten.co · bigcommerce.com · browserless.io
bugsnag.com · ckeditor.com · cockroachlabs.com · commercetools.com · cronofy.com · deepl.com
directus.io · documenso.com · docuseal.com · editorjs.io · fireworks.ai · getunleash.io
imagekit.io · lemonsqueezy.com · lexical.dev · liveblocks.io · livekit.io · magicbell.com
nylas.com · oramasearch.com · payloadcms.com · phrase.com · polar.sh · pusher.com
quilljs.com · raygun.com · searchkit.co · sendlayer.com · slatejs.org · stytch.com
supabase.com · supertokens.com · swell.is · tiptap.dev · together.ai · tomtom.com
trigger.dev · turbopuffer.com · typesense.org · uploadthing.com · workos.com
