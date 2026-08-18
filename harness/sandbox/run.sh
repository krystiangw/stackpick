#!/usr/bin/env bash
# Run a build run with the operator's credentials out of reach.
#
#   harness/sandbox/run.sh <run-dir> <command> [args...]
#
# A build run executes the vendor's package and trusts their MCP server's tool descriptions.
# `exposure.mts` measures what that process can currently read: on this machine, a GitHub token,
# an npm token, the codex credentials and a private SSH key. This wrapper removes the two paths a
# hostile package takes without trying: the environment, and $HOME.
#
# WHAT THIS IS NOT. The child runs as the same user, so nothing here stops code that goes looking
# for /Users/<you>/.ssh by absolute path. It closes the opportunistic route, not the deliberate one.
# Real isolation is a container or a separate account, and that is a decision with a cost, written
# up in harness/sandbox/README.md rather than pretended away here.
set -euo pipefail

if [ $# -lt 2 ]; then
  echo "usage: harness/sandbox/run.sh <run-dir> <command> [args...]" >&2
  exit 2
fi

RUN_DIR="$1"
shift

if [ ! -d "$RUN_DIR" ]; then
  echo "nie ma katalogu biegu: $RUN_DIR" >&2
  exit 1
fi

# Inside the repository is the one place a run must never start: an agent that walks up to the git
# root of a project about measuring agents decides its task is to re-measure a published audit.
# Both sides canonicalised, or a checkout reached through a symlink compares a logical path against
# a physical one and the boundary this promises to hold does not hold.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
# On the directory boundary, not the prefix: a sibling named stackpick-runs is a legitimate place
# for runs and shares the first characters of the repository path.
# `pwd -P`, because a symlink outside the repository can point inside it and the logical path would
# pass this check while the cd that follows lands in the repository anyway.
RUN_DIR="$(cd "$RUN_DIR" && pwd -P)"
case "$RUN_DIR" in
  "$REPO_ROOT"|"$REPO_ROOT"/*) echo "bieg nie moze startowac wewnatrz $REPO_ROOT" >&2; exit 1 ;;
esac

SCRATCH="$(mktemp -d "${TMPDIR:-/tmp}/letagentsin-run-XXXXXX")"
trap 'rm -rf "$SCRATCH"' EXIT

# Only the CLI's own credential, and only the file, never the directory it sits in. A symlink would
# hand back the whole ~/.claude, which is the thing being taken away. Chosen by the command being
# run rather than copied wholesale: handing a Claude run the Codex token means a hostile package in
# one run can take a credential the run never needed.
case "$(basename "$1")" in
  claude*) WANTS=".claude/.credentials.json" ;;
  codex*)  WANTS=".codex/auth.json" ;;
  *)       WANTS="" ;;
esac
copied=()
if [ -n "$WANTS" ] && [ -f "$HOME/$WANTS" ]; then
  mkdir -p "$SCRATCH/$(dirname "$WANTS")"
  cp "$HOME/$WANTS" "$SCRATCH/$WANTS"
  copied+=("$WANTS")
fi

echo "piaskownica:"
echo "  katalog biegu   $RUN_DIR"
echo "  HOME            $SCRATCH"
echo "  przeniesione    ${copied[*]:-nic}"
echo "  srodowisko      PATH, TERM, LANG i nic wiecej"
echo ""

# Not exec. `exec` replaces this shell and the EXIT trap never runs, which would leave a copy of
# the CLI credentials in a temporary directory after every single run: a wrapper whose whole purpose
# is keeping credentials out of reach, quietly scattering them.
cd "$RUN_DIR"
status=0
env -i \
  HOME="$SCRATCH" \
  PATH="$PATH" \
  TERM="${TERM:-xterm}" \
  LANG="${LANG:-en_US.UTF-8}" \
  TMPDIR="$SCRATCH" \
  "$@" || status=$?
exit "$status"
