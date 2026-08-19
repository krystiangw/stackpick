# Submitting the connector to Anthropic's directory

Everything a person needs in front of them when they open the form, so the answer to every field is
read rather than invented. Written 2026-08-19, when all of it except the form itself was ready.

## What the directory asks for, and what we have

| Field | Our answer | Where it comes from |
|---|---|---|
| Server name | `Let Agents In` | `server.json` `title` |
| MCP address | `https://letagentsin.com/mcp`, Streamable HTTP, no login | `server.json` `remotes` |
| Description | Deterministic score of whether an unattended AI agent can find, sign up for and integrate a domain. | `server.json`, 99 characters because the registry rejects over 100 |
| Website | `https://letagentsin.com` | |
| Privacy policy | `https://letagentsin.com/privacy` | Live since 2026-08-19. A missing one is the commonest rejection. |
| Terms | **We have none**, and `/terms` is deliberately a 404 | Nothing is sold yet; see `docs/turning-billing-on.md` |
| Proof we own the domain and the API | We are in the official MCP registry as `com.letagentsin/scanner`, proved by the file at `/.well-known/mcp-registry-auth` | |
| Logo | `public/logo.svg`, and `public/logo-512.png` for a raster field | One mark, guarded byte for byte against `src/app/icon.svg` |
| Screenshots | 1440x1000 PNG, made with headless Chrome | See the recipe below |
| Demo account | **Probably not applicable**: our server needs no login, so a reviewer just calls the tools | To confirm on the form |

## The two tools, and what their annotations claim

Both are declared honestly rather than flatteringly, because a client auto-approves a read-only tool
and running an unattended scanner against a stranger's servers is not read-only.

| Tool | readOnly | destructive | idempotent | openWorld | Why |
|---|---|---|---|---|---|
| `scan_domain` | **false** | false | false | true | It fires HTTP requests at a third party's servers and stores a report |
| `find_providers` | true | false | true | false | It reads our own published corpus and touches nobody |

Verified live on 2026-08-19 with one request:

```bash
curl -s -X POST https://letagentsin.com/mcp -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Screenshots

They need to be at least 1000 px wide. The browser extension yields about 606, which is why this
looked like it needed a person; headless Chrome does not.

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu \
  --hide-scrollbars --screenshot=out.png --window-size=1440,1000 https://letagentsin.com/d/sample
```

Worth shooting, in this order: `/d/sample` (a finished report, which is what the tool produces),
`/`, `/methodology`, `/findings`, `/pricing`.

**Take them after a sweep, never before.** A screenshot carrying a stale formula version lives in a
directory for years, and the sample page prints the version it was scored under.

## What is left for a person

The form itself is in claude.ai and needs a human. Nothing else on this page does.
