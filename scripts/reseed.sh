#!/bin/bash
# Rescans every curated domain through the live console so the published corpus is one formula
# version throughout. Lived in /tmp all day, which is how it stayed unversioned while the thing
# it produces is our main evidence asset.
#
#   scripts/reseed.sh                 # uses STACKPICK_CONSOLE_TOKEN from the environment
#   scripts/reseed.sh <token>         # or pass it
#   PAUSE=2 scripts/reseed.sh         # seconds between requests, default 1
#
# The pause is not politeness theatre. Reseeding the same 156 hosts a dozen times in one day
# made postmark.com answer 429 and launchdarkly.com refuse documentation pages, and those rows
# then said more about our load than about the vendor. Reseed once per set of changes.
set -u

BASE="${BASE:-https://stackpick-f12d13a227ea.herokuapp.com}"
TOKEN="${1:-${STACKPICK_CONSOLE_TOKEN:-}}"
PAUSE="${PAUSE:-1}"

if [ -z "$TOKEN" ]; then
  echo "no console token: pass it as \$1 or set STACKPICK_CONSOLE_TOKEN" >&2
  echo "  heroku config:get STACKPICK_CONSOLE_TOKEN -a stackpick" >&2
  exit 2
fi

domains=$(npx tsx -e "
import { CURATED_DOMAINS } from './src/lib/categories'
console.log([...CURATED_DOMAINS].join('\n'))
") || { echo "could not read the curated list" >&2; exit 1; }

ok=0
fail=0
failed=""

while read -r domain; do
  [ -z "$domain" ] && continue
  out=$(curl -s --max-time 120 -X POST "$BASE/api/scan" \
    -H 'content-type: application/json' \
    -H "cookie: stackpick_console=$TOKEN" \
    -d "{\"domain\":\"$domain\"}")
  line=$(printf '%s' "$out" | python3 -c "
import sys, json
try:
    card = json.load(sys.stdin)['scorecard']
    print(f\"{card['formulaVersion']} {card['total']}/{card.get('measurable', card['max'])}\")
except Exception:
    print('ERR')
" 2>/dev/null)
  case "$line" in
    ERR*|"") fail=$((fail + 1)); failed="$failed $domain"; printf '%-24s FAILED\n' "$domain" ;;
    *) ok=$((ok + 1)); printf '%-24s %s\n' "$domain" "$line" ;;
  esac
  sleep "$PAUSE"
done <<< "$domains"

echo "done: $ok ok, $fail failed"
# A domain that failed once usually answers on a second ask, and leaving it out of the corpus
# is worse than the extra minute: the published row would be older than every other row.
if [ -n "$failed" ]; then
  echo "retrying:$failed"
  for domain in $failed; do
    sleep 5
    out=$(curl -s --max-time 120 -X POST "$BASE/api/scan" \
      -H 'content-type: application/json' \
      -H "cookie: stackpick_console=$TOKEN" \
      -d "{\"domain\":\"$domain\"}")
    printf '%s' "$out" | grep -q '"scorecard"' && printf '%-24s recovered\n' "$domain" || printf '%-24s STILL FAILING\n' "$domain"
  done
fi
