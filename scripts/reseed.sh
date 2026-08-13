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

BASE="${BASE:-https://letagentsin.com}"
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

# Two passes, and the second is the one that counts. The registry cache lives in the dyno's
# memory, so every deploy empties it, and a cold pass asks npm about nineteen documents per
# domain across 156 domains. npm then refuses, and since a refusal is honestly "we do not know"
# rather than a guess, a cold reseed costs about 26 domains their package: measured at 140
# passes warm against 114 cold. The second pass runs against a full cache and is what gets
# published. Set PASSES=1 if you only want to see what a visitor gets on a cold dyno.
PASSES="${PASSES:-2}"

for pass in $(seq 1 "$PASSES"); do
[ "$PASSES" -gt 1 ] && echo "== pass $pass of $PASSES"

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
  # A scan that ran and could not be stored is not a reseeded row. The scan API answers with the
  # full scorecard and `saved:false` when the database refuses the write, which is right for a
  # visitor and a trap here: on 2026-08-13 this script reported 340 successful measurements while
  # the cluster was over quota and not one of them was written. A reseed that changes nothing must
  # not look like a reseed that worked.
  if printf '%s' "$out" | grep -q '"saved":false'; then
    fail=$((fail + 1)); failed="$failed $domain"; printf '%-24s NOT SAVED\n' "$domain"
    sleep "$PAUSE"; continue
  fi
  # A scan that hit the 27 second budget publishes five "unmeasurable" verdicts that are about our
  # clock and not about the vendor, so it is retried like a failure rather than published. The 8.8
  # reseed lost eleven verdicts this way across launchdarkly.com and netim.com.
  if printf '%s' "$out" | grep -q 'ran out of time'; then
    fail=$((fail + 1)); failed="$failed $domain"; printf '%-24s TRUNCATED\n' "$domain"
    sleep "$PAUSE"; continue
  fi
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
    # A retry that truncates again is still a row about our clock, so it is asked one more time
    # with room to breathe rather than reported as recovered. hover.com went out as "the scan ran
    # out of time" on the 9.0 reseed because this line only looked for a scorecard.
    if printf '%s' "$out" | grep -q 'ran out of time'; then
      sleep 20
      out=$(curl -s --max-time 120 -X POST "$BASE/api/scan" \
        -H 'content-type: application/json' \
        -H "cookie: stackpick_console=$TOKEN" \
        -d "{\"domain\":\"$domain\"}")
      printf '%s' "$out" | grep -q 'ran out of time' && printf '%-24s STILL TRUNCATED\n' "$domain" && continue
    fi
    if printf '%s' "$out" | grep -q '"saved":false'; then printf '%-24s STILL NOT SAVED\n' "$domain"; continue; fi
    printf '%s' "$out" | grep -q '"scorecard"' && printf '%-24s recovered\n' "$domain" || printf '%-24s STILL FAILING\n' "$domain"
  done
fi
done

# The moment the numbers change is the moment a stated number can start lying, so the guard runs
# here rather than when somebody remembers. It found two real problems on 2026-08-11: a pattern
# that had silently stopped matching after a sentence was rewritten, and a wrong expectation of
# my own. Non-fatal on purpose: a reseed that finished is still worth having.
echo
echo "== sprawdzam opublikowane liczby"
npm run --silent audit || echo "audyt zglosil rozjazd, korpus jest zaciagniety, liczby wymagaja sprawdzenia"
