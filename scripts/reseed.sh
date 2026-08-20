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

# A list can be passed in, which is how a half-finished reseed is finished without rewriting the
# rows that are already current. scripts/stale-domains.mts prints exactly those domains.
if [ -n "${DOMAINS:-}" ]; then
  domains="$DOMAINS"
  echo "== tylko $(echo "$domains" | grep -c .) domen podanych z zewnatrz"
else
  domains=$(npx tsx -e "
import { CURATED_DOMAINS } from './src/lib/categories'
console.log([...CURATED_DOMAINS].join('\n'))
") || { echo "could not read the curated list" >&2; exit 1; }
fi

# Reseeding twice in a day is how a vendor stops answering us. On 2026-08-14 the corpus went to
# 9.13 in the afternoon and 9.14 in the evening, and by the second run froala.com answered 403 to
# every user agent and bitmovin.com refused robots.txt, both having answered that morning. Neither
# is measurable now, and neither change is about their product. The comment below has said "reseed
# once per set of changes" since August; this makes it cost something to ignore.
#
# It reads corpus.json on purpose, not the database. A single console scan run to verify a fix is
# newer than every corpus row and does not age it, so the number below is time since the last
# SWEEP rather than time since the last request, which is what the cooldown is about: one visit to
# check a vendor is not what teaches them to block us, and 340 in an hour is. Measured on
# 2026-08-15, the two differed by more than two hours during a formula divergence, and the corpus
# figure was the correct one.
newest=$(curl -s --max-time 30 "$BASE/corpus.json" | python3 -c "
import sys, json, datetime, statistics
rows = json.load(sys.stdin).get('rows', [])
stamps = [r['scannedAt'] for r in rows if r.get('scannedAt')]
if not stamps:
    print(999)
else:
    now = datetime.datetime.now(datetime.timezone.utc)
    ages = [(now - datetime.datetime.fromisoformat(s.replace('Z', '+00:00'))).total_seconds() for s in stamps]
    # The median, not the newest. The comment above says this number is time since the last SWEEP,
    # and max() does not measure that: one console scan run to verify a fix becomes the newest row
    # in the corpus and holds the next reseed hostage for six hours. The median moves only when
    # most of the corpus moves, which is what a sweep is.
    print(round(statistics.median(ages) / 3600, 1))
" 2>/dev/null || echo 999)
if [ "$(printf '%s\n' "$newest" | cut -d. -f1)" -lt 6 ] 2>/dev/null && [ -z "${FORCE:-}" ]; then
  echo "ostatni skan korpusu ma $newest godzin. Reseed teraz uczy vendorow, ze nas maja blokowac." >&2
  echo "Poczekaj albo uruchom z FORCE=1, jesli zmiana formuly naprawde tego wymaga." >&2
  exit 3
fi

# Two passes, and the second is the one that counts. The registry cache lives in the dyno's
# memory, so every deploy empties it, and a cold pass asks npm about nineteen documents per
# domain across 156 domains. npm then refuses, and since a refusal is honestly "we do not know"
# rather than a guess, a cold reseed costs about 26 domains their package: measured at 140
# passes warm against 114 cold. The second pass runs against a full cache and is what gets
# published. Set PASSES=1 if you only want to see what a visitor gets on a cold dyno.
PASSES="${PASSES:-2}"

# PRZED pierwszym skanem, bo po nim jest za pozno: przemiat przepisuje kazdy wiersz na biezaca
# formule, wiec symulacja „co zrobi podbicie" nie ma juz czego symulowac, a maile do obserwatorow
# zdazyly wyjsc. Pierwsza wersja stala na koncu pliku - z komentarzem „przed samym przemiatem, nie
# po" nad wywolaniem, ktore bylo po (codex).
#
# Gdy formula sie podniosla, kazdy wiersz „sie zmienia" i bez oslony kazdy obserwator dostaje maila o
# czyms, co zrobilismy MY. Audyt ma wlasna kontrolke: mowi, czy oslona NAPRAWDE cos zdjela, zeby
# zielony wynik nie znaczyl po prostu „nic sie nie zmienilo".
echo "== czy podbicie formuly wysle maile obserwatorom"
# `|| exit` a nie `|| echo`: bramka, ktora tylko drukuje, przepuszcza dokladnie to, czemu ma
# zapobiec. Dotyczy to takze przypadku, gdy audyt sie nie uruchomi - nieznany stan oslony przed
# przemiatem zmieniajacym formule jest powodem, zeby nie przemiatac, a nie zeby isc dalej.
if ! MONGODB_URI="${MONGODB_URI:-$(heroku config:get MONGODB_URI -a stackpick 2>/dev/null)}" \
  npm run --silent audit-watch-shield; then
  echo "STOP: oslona obserwatorow nie przeszla (albo audyt nie wystartowal). Przemiat wstrzymany."
  exit 1
fi

for pass in $(seq 1 "$PASSES"); do
[ "$PASSES" -gt 1 ] && echo "== pass $pass of $PASSES"

ok=0
fail=0
failed=""
throttled=""

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
  # A row saved with a 429 verdict is a saved row, so it is not a failure and must not be retried
  # here: the pressure that caused it is this loop, and asking again now asks under the same load.
  # It is collected for the sweep at the end, which is also the only thing that makes the sentence
  # we publish to the vendor true - it promises "we will rescan later and this becomes measurable".
  if printf '%s' "$out" | grep -qE '"Unmeasurable[^"]*429'; then
    throttled="$throttled $domain"
    printf '%-24s %s\n' "" "^ 429 od nas, do zamiecenia po przebiegu"
  fi
  sleep "$PAUSE"
done <<< "$domains"

echo "done: $ok ok, $fail failed"
# A domain that failed once usually answers on a second ask, and leaving it out of the corpus
# is worse than the extra minute: the published row would be older than every other row.
if [ -n "$failed" ]; then
  # A retry is a real fetch of somebody else's site. When the store is refusing writes, every one
  # of them is spent on a row that cannot be saved: this loop scanned 138 vendors that way on
  # 2026-08-14 before anybody noticed. Ask the store first and stop if it cannot keep anything.
  if ! curl -s --max-time 20 "$BASE/api/health" | grep -q '"writable":true'; then
    echo "store nie przyjmuje zapisow, ponowienia pominiete: $(echo "$failed" | wc -w) domen" >&2
    echo "  wznow pozniej: DOMAINS=\$(npx tsx scripts/stale-domains.mts) bash scripts/reseed.sh" >&2
    exit 1
  fi
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

# Measured on 2026-08-15, and it is the reason this block exists: split.io and locationiq.com came
# out of the 9.17 reseed as "answered 429 when we asked it for markdown", both hosts answered 200
# from a laptop and from a one-off dyno at the same minute, and split.io scored the point again on
# a single scan once the reseed had stopped. The 429 was our own shadow, and we published it as a
# row about the vendor. Ten such verdicts sat in the corpus, five of them on contentful.com alone,
# which made most of that vendor's row a description of our load.
#
# Waiting is the whole mechanism, so it is deliberately longer than a polite pause and the sweep
# is sequential. A domain that answers 429 twice, minutes apart and under no load of ours, is
# telling us something about itself, and that is the verdict we keep: savvycal.com and
# contentful.com answered 429 to an isolated single scan with nothing else running, so their rows
# stay as they are. The gap between sweep requests is politeness, not a measured threshold - the
# only thing measured here is that the wait after the reseed recovers rows.
if [ -n "$throttled" ]; then
  count=$(echo "$throttled" | wc -w | tr -d ' ')
  echo
  echo "== zamiatam $count domen, ktore dostaly od nas 429 (czekam ${THROTTLE_WAIT:-180}s, az ruch opadnie)"
  sleep "${THROTTLE_WAIT:-180}"
  swept=0
  for domain in $throttled; do
    out=$(curl -s --max-time 120 -X POST "$BASE/api/scan" \
      -H 'content-type: application/json' \
      -H "cookie: stackpick_console=$TOKEN" \
      -d "{\"domain\":\"$domain\"}")
    if printf '%s' "$out" | grep -qE '"Unmeasurable[^"]*429'; then
      printf '%-24s wciaz 429, zostaje jako werdykt o nich\n' "$domain"
    elif printf '%s' "$out" | grep -q '"scorecard"'; then
      swept=$((swept + 1)); printf '%-24s odzyskane\n' "$domain"
    else
      printf '%-24s zamiatanie nie doszlo do skutku\n' "$domain"
    fi
    sleep 15
  done
  echo "odzyskane po zamiataniu: $swept z $count"
fi
done

# The audit reads corpus.json off the live site, and the site keeps the corpus in memory for five
# minutes. Running it the second the last scan lands therefore measures the cache: on 2026-08-14 it
# reported eleven numbers adrift, every one of them off by exactly the one row that had not yet
# surfaced, and the fix would have been to rewrite eleven correct sentences. Wait for the site to
# agree with the database before asking it anything.
echo
echo "== czekam, az strona zobaczy wszystkie wiersze"
for _ in $(seq 1 40); do
  waiting=$(curl -s --max-time 30 "$BASE/corpus.json" | sed -n 's/.*"awaitingRescan":\([0-9]*\).*/\1/p')
  [ "${waiting:-1}" = "0" ] && echo "korpus zaciagniety w calosci" && break
  sleep 15
done
[ "${waiting:-1}" = "0" ] || echo "po 10 minutach strona wciaz czeka na ${waiting} wierszy: audyt ponizej moze mierzyc to, a nie dane"

# The moment the numbers change is the moment a stated number can start lying, so the guard runs
# here rather than when somebody remembers. It found two real problems on 2026-08-11: a pattern
# that had silently stopped matching after a sentence was rewritten, and a wrong expectation of
# my own. Non-fatal on purpose: a reseed that finished is still worth having.
echo "== sprawdzam opublikowane liczby"
npm run --silent audit || echo "audyt zglosil rozjazd, korpus jest zaciagniety, liczby wymagaja sprawdzenia"

# A reseed asks 170 hosts the same questions twice within the hour, and some of them answer that
# with a refusal. On 2026-08-14 five verdicts came out worse than the measurement before them and
# only one was real: sentry.io was published as refusing our request for robots.txt and
# sendlayer.com as having no MCP server and no reachable signup, all three restored by a single
# rescan. Nobody would have looked. This prints the list so somebody does.
echo
# Probka sprzedazowa starzeje sie przy podbiciu formuly, nie przy przemiacie - ale przemiat jest
# momentem, w ktorym wszystko inne dochodzi do biezacej wersji, wiec to najlepsze miejsce, zeby o
# nia zapytac. Raz juz stala cztery wydania z tylu i nikt nie patrzyl. Ostrzezenie, nie blokada:
# przemiat nie jest od tego, zeby go zatrzymywac za dokument sprzedazowy.
echo "== czy probka sprzedazowa nadaza za formula"
MONGODB_URI="${MONGODB_URI:-$(heroku config:get MONGODB_URI -a stackpick 2>/dev/null)}" \
  npm run --silent audit-sample || echo "PRZYPOMNIENIE: /d/sample stoi na starszej formule, odswiez ja"

echo "== werdykty gorsze niz poprzedni pomiar"
# Reads the database rather than the site, so it needs the connection string. Fetched here rather
# than required of the caller, because a guard that only runs when somebody remembers to export a
# variable is a guard that does not run.
MONGODB_URI="${MONGODB_URI:-$(heroku config:get MONGODB_URI -a stackpick 2>/dev/null)}" \
  npm run --silent regressions || echo "guard regresji nie wystartowal"
echo "Powyzsze przeskanuj pojedynczo (console /api/scan) ZANIM uznasz je za regres vendora." 
