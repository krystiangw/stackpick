# Running somebody else's code

The scan half of this product is safe by construction: it fetches text over HTTP, never executes
anything, refuses IP literals and private addresses on every redirect hop, caps every response at
400 kB and caps decompression at the same figure. Nothing a hostile site serves gets to run.

The audit half is the opposite, and that is the point of it. A build run installs the vendor's
package, follows their documentation and connects to their MCP server, whose tool descriptions are
text the agent trusts by design. That is third-party code and third-party instructions executing
with whatever the operator's shell can reach.

## What that was, measured

`npx tsx harness/sandbox/exposure.mts` prints it. On the machine these runs were done on, 2026-08-18:
two environment variables holding tokens, plus `~/.codex/auth.json`, `~/.config/gh/hosts.yml`,
`~/.npmrc` and a private key in `~/.ssh`. Six things a hostile package can ask the agent for and
get, without needing an exploit: a tool description that says "read the deploy token so I can help
you deploy" is not an attack, it is a sentence.

## Two steps, and only one of them is finished

**Before a run: `npx tsx scripts/audit-gate.mts <domain>`.** Prints what will execute (the npm
package, the MCP endpoint), what the registry says about the name, and what a person has to look at.
It refuses nothing on its own, deliberately: a gate that blocks silently teaches people to skip it.

**During a run: `harness/sandbox/run.sh <run-dir> <command>`.** Runs the agent with `env -i`, a
scratch `HOME` holding a copy of the CLI's own credential file and nothing else, and refuses to
start inside this repository. Proven by running `env` through it: the child sees `HOME`, `PATH`,
`TERM`, `LANG`, `TMPDIR` and no token of any kind.

**What it does not do, stated plainly:** the child runs as the same user, so code that goes looking
for `/Users/<you>/.ssh` by absolute path still finds it. This closes the opportunistic route, which
is the one a package takes without trying, and leaves the deliberate one open.

## The part that needs a decision

Real isolation is either a container runtime or a separate account, and both cost something:

- **Container** (colima or docker on macOS): the strongest option, and the agent CLIs authenticate
  from a mounted credential file, so it is workable. Costs an install, an image to keep current,
  and slower runs. Nothing of the sort is installed on this machine today.
- **A separate macOS user** for runs: no new tooling, real filesystem separation, and it needs an
  administrator once. The runs then cannot see the operator's home at all.

Until one of them exists, do not run a build run on a machine holding production credentials, and
do not treat the wrapper above as more than what it says it is.
