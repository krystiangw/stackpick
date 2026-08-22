#!/bin/zsh
set -eu

export PATH="/Users/kgwizdal/.local/bin:/Users/kgwizdal/.local/share/fnm/aliases/default/bin:/usr/local/bin:/usr/bin:/bin"
cd /Users/kgwizdal/projects/stackpick

export MONGODB_URI="$(heroku config:get MONGODB_URI -a stackpick)"
exec /Users/kgwizdal/.local/share/fnm/aliases/default/bin/node node_modules/tsx/dist/cli.mjs harness/visibility-worker.mts
