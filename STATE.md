# Let Agents In: stan na 2026-08-11 (wieczór)

Punkt wejścia po compact. Czytaj przed pracą, razem z `ARCHITECTURE.md`.
**Dwie sekcje na dole tego bloku, "Co zostało z audytów" i "Następne kroki merytoryczne", są
kontraktem dla watchdoga. Aktualizuj je przy każdej zamkniętej pozycji, inaczej watchdog czyta
listę sprzed trzydziestu rund.** Dziennik rund jest niżej i jest historią, nie listą zadań.
**Ten nagłówek też się starzeje: 2026-08-11 rano mówił "StackPick, formuła 7.4, 155 domen",
czyli był o dwa dni i pięć wersji formuły do tyłu. Przepisuj go, nie tylko dziennik.**

## W locie w tej chwili (2026-08-11, wieczór)

**Reseed publikujący cytaty free-tier leci**, log `/tmp/reseed-8.4d.log`, dwa przebiegi po 170
domen, po nim automatycznie `npm run audit`. Kod jest wdrożony i drzewo czyste, więc reseed można
w razie czego powtórzyć: `STACKPICK_CONSOLE_TOKEN=$(heroku config:get STACKPICK_CONSOLE_TOKEN -a stackpick) bash scripts/reseed.sh`.
Sprawdzenie po nim: `npm run audit` ma powiedzieć `170 rows on formula 8.4, 0 contradictions`
i `17 stated numbers and 3 named-vendor claims checked against the data, 0 adrift`.

## Stan na teraz, w dziesięciu liniach

- Produkt nazywa się **Let Agents In** od 2026-08-10. Domena **nie jest kupiona**, adres to nadal
  `stackpick-f12d13a227ea.herokuapp.com`, a nazwa hosta zostaje świadomie do czasu zakupu.
  User-agent skanera to `LetAgentsIn/1.0`.
- Formuła **8.4**, korpus **170 domen w 25 kategoriach**, **15 checków**, **17 punktów na papierze**.
  `npm run audit` pilnuje **17 liczb i 3 twierdzeń nazywających firmy**, przy **0 sprzecznościach**,
  czyli każdą liczbę liczoną z danych, która trafia na publiczną stronę, i trzy zdania obok nich.
- **Podłoga szumu korpusu: 0,64 procent** (15 zmian na 2338 przy dwóch reseedach bez zmiany reguły).
  Opublikowana na `/methodology`. Każda różnica mniejsza to pogoda, nie zmiana. Trzy reseedy tej
  nocy: 8.0 → 8.1 ruszyło **0,98 procent**, 8.1 → 8.2 **0,78**, 8.2 → 8.3 **0,43**, 8.3 → 8.4
  **1,53** i to jest największa pojedyncza zmiana od tygodnia, bo **29 wierszy** straciło kredyt
  za zdanie o klikaniu w panelu.
- Jedenaście przebiegów adwersaryjnych: **16,7 → 2,2 → 3,9 → 2,0 → 0,94 → 7,9 → 1,4 → 1,29 → 0,77 →
  0,39 procent**, jedenasty bez wspólnej metryki, bo atakował trzy powierzchnie osobno: dwa
  fałszywe twierdzenia w skanerze (patrz runda 102) i **31,8 procent błędu w trasowaniu**.
- Opublikowane liczby: **5 ze 170** przechodzi wszystkie trzy bariery, **42 jest o jeden wymóg od
  tego** (w nocy 5 → 7 → 5: poszerzenie `programmatic_provisioning` dodało dwóch, a wymóg markera
  programowego zabrał ich i jeszcze jednego), **19 z 66** publikujących endpoint rejestracji ma grant, który agent dokończy bez
  człowieka, **0 ze 170** serwuje agentom mniej tekstu niż przeglądarce.
- **67 żywych serwerów MCP, 52 z nich publikuje RFC 7591** (68 w całym korpusie). DCR przyszło
  z wymogu specyfikacji MCP, nie z decyzji o wpuszczeniu agentów, a dwie trzecie tych drzwi i tak
  wymaga człowieka.
- Odmowy rejestracji wymierzone w agenty: **0 udowodnionych na 170**. Bariera, którą umiemy
  udowodnić, to **87** formularzy rejestracji, które bez JavaScriptu nie renderują niczego.
- **Trasowanie `find_providers` to najsłabszy element produktu: 20 procent błędu** na pytaniach,
  na których go nie strojono (poprzedni pomiar 31,8), przy 0,39 procent skanera. Liczba jest
  w opisie narzędzia MCP, a `scripts/routing.mts` jest zapadką na jedenastu znanych błędach,
  nie progiem zaliczenia. Wszystkie 149 pytań w tym pliku jest spalonych strojeniem.
- Skanujemy sami siebie: **12 z 13 mierzalnych**, oblewamy `oauth_dcr` i piszemy o tym wprost.
  **Nie zmieniamy reguły, która poprawiłaby nasz własny wynik.**
- Budżet skanu **27 s** (router Heroku zabija ciche żądanie po 30). Reseed **raz na zestaw zmian**:
  nasz własny ruch produkował 429 u `postmark.com` i odmowy u `launchdarkly.com`.

## Gdzie to żyje

- Repo: `krystiangw/stackpick` (private), lokalnie `~/projects/stackpick`
- Produkcja: **https://stackpick-f12d13a227ea.herokuapp.com** (Heroku Basic, eu)
- Baza: MongoDB Atlas, klaster `equity-analyst-flex`, baza `stackpick`
- Konsola: `/app?key=<STACKPICK_CONSOLE_TOKEN>` (`heroku config:get STACKPICK_CONSOLE_TOKEN -a stackpick`)
- Poczta: Resend przez klucz współdzielony z `equity-analyst-web`, nadawca `onboarding@resend.dev`.
  **Właścicielem konta jest `gwizdala.kr@gmail.com` i tylko tam dociera cokolwiek** - wysyłka na
  `krystiantestgorilla@gmail.com` wraca jako 403 `validation_error`. Zweryfikowane 2026-08-08,
  `delivered: true` na adres właściciela. Powód dodania logowania w `/api/lead`: wcześniej ta
  odmowa była niewidoczna, endpoint zwracał `ok: true` i milczał.
- Domena `stackpick.ai` **nie jest kupiona**. Do outboundu potrzebna domena plus własny nadawca.

## Co działa

Darmowy skan: 14 checków, 5 etapów, 16 punktów, zero LLM, wynik odtwarzalny (zmierzone, patrz niżej).
Landing z żywymi rankingami 7 kategorii, karta wyniku pod trwałym linkiem, `/methodology`,
`/findings`, `/pricing`, `/docs`, konsola operatora, wysyłka raportu mailem w HTML,
karta OG generowana per raport, skan strumieniowany przez SSE z realnymi krokami.

**51 domen zeskanowanych** w kategoriach: storage, edytory, auth, email, analytics, wektory, płatności.
Skrajne wyniki: `resend.com` 15/16 (wzorzec do pokazywania), `june.so` 2/16.

Pełny audyt agentowy: `/audit/froala-editors`, dane w `src/data/audits/*.json`.

## Cennik (uzgodniony, `ai-audit/10-cennik.md`)

Free $0 · Diagnostic $2 900 (zaliczany na poczet audytu w 90 dni) · Full audit $11 000 ·
Fix sprint $7 500-16 000 · MCP build $14 000-28 000 · Retainer $3 000/mies ·
godzinowo $250/h min. 8h (podawać tylko na żądanie). Founding client: pierwsze trzy audyty $6 500.
Kotwica: audyty bezpieczeństwa, nie SEO.

## Pierwszy pełny audyt: Froala, N=6

Sześć agentów, dwa modele, zadanie o edytor tekstu. **6/6 wybrało Tiptap.** Froala wymieniona
w 2 przebiegach, w obu skreślona na licencji bez oglądania produktu:
*"Froala / CKBox - Fully commercial, licence key required."*
CKEditor i TinyMCE odpadły tak samo, więc to dynamika całej kategorii.

Materiał na CKSource: *"Since v44 licenseKey is mandatory even for open-source use... Commercial
licence needs a human."*

**Runda 1 była skażona**: sześć agentów w jednym katalogu, dwa zgłosiły to same. Izolowane kopie
i skrypt są gotowe w `<scratchpad>/runs/run-N` oraz `<scratchpad>/seed-app.sh`. Runda 2 nie ruszyła.

## Co naprawiły trzy audyty zewnętrzne

Wszystkie krytyczne błędy **zawyżały** wynik, co jest najgorszym rodzajem błędu tutaj:
sonda kontrolna na catch-all (sentry miał 2/2 za nieistniejące pliki), CAPTCHA po tokenie a nie
po hoście CDN (stripe miał punkt mając hCaptcha w HTML), llms.txt czytany jako źródło discovery,
grep po tekście zamiast po payloadach `<script>`, brak podwójnego liczenia `.well-known`,
robots.txt nieodczytany nie daje darmowych punktów, kontrast WCAG w obu motywach,
paski etapów przestały odwracać dane, karta OG nazywa domenę.

## Co zostało z audytów, w kolejności wagi

Stan 2026-08-09 po **czterech** przebiegach adwersaryjnych (16,7 → 2,2 → 3,9 → **2,0 procent
błędu**, 11 błędów na 547 werdyktów) i po zamknięciu wszystkiego, co one znalazły poza pozycjami
niżej. Wszystko powyżej tej listy jest zrobione i opisane w dzienniku rund.

1. **Blokery po stronie Krystiana** (pełny opis w sekcji „Zablokowane na Krystianie"): domena,
   zweryfikowany nadawca w Resend, ścieżka zakupu inna niż `mailto:` na prywatnego Gmaila,
   nazwanie licencji korpusu, decyzja o modelu sprzedaży. **Agent tego nie rozstrzyga.**
2. ~~**Ściana bota czytana jako wyzwanie OAuth.**~~ **zrobione 2026-08-09 (7.1).** Zmierzone
   przed zmianą, nie założone: ściany to HTML (`mcp.sentry.io` 6 698 B, `mcp.cloudinary.com`
   372 B), a serwery odpowiadają w protokole, którym mówią (`contentful.com` 79 B JSON,
   `datadoghq.com` 27 B, `stripe.com` 81 B z `WWW-Authenticate`). Bez tego nagłówka ciało HTML
   jest teraz ścianą, nie wyzwaniem. Obawa subagenta o `baseten.co` i `telnyx.com` była
   nieuzasadniona: oba mają prawdziwe endpointy na `api.<domena>` i je zachowują. `sentry.io`
   schodzi z czterech endpointów do jednego, tego z własnej karty, a `cloudinary.com` przestaje
   przechodzić na blokadzie bota.
3. ~~**Cache rejestru npm żyje w pamięci dyno**~~ **zrobione 2026-08-09:** odpowiedzi idą teraz
   do Mongo z indeksem wygasającym po sześciu godzinach, więc **deploy ani restart go nie kasuje**.
   Zweryfikowane `heroku restart` plus skany: `mapbox.com`, `statsig.com`, `commercetools.com`
   i `uploadcare.com` rozwiązują się natychmiast po restarcie. Pomiar całego korpusu:

   ```
   pamięć, zimny      typed 116  unmeasured 35  avg 9.06
   pamięć, ciepły     typed 139  unmeasured 11  avg 9.20
   Mongo, przebieg 1  typed 120  unmeasured 31  avg 9.10   <- zapełnia cache
   Mongo, przebieg 2  typed 142  unmeasured  8  avg 9.22   <- najlepszy wynik dnia
   ```

   **Pułapka pomiarowa do zapamiętania:** przebieg, który cache dopiero zapełnia, wygląda jak
   dowód, że cache nie działa. Przy każdej zmianie dotyczącej cache mierzy się dopiero drugi.
   Zostaje mniejsza sprawa: przy odmowie rejestru pojedyncze domeny zwracają uczciwe „nie wiemy"
   zamiast pakietu. Zamknięcie wymaga mniejszego ruchu na domenę (~19 żądań) albo tokenu do
   rejestru. **Decyzja o tokenie jest Krystiana.**
4. **`typed_package` dla `newrelic.com`, `honeycomb.io` i `directus.io`** wskazuje pakiet
   flagowy zamiast scoped SDK z typami. Świadoma decyzja subagenta, opisana w rundzie 44:
   przełączenie byłoby wybraniem pakietu pod odpowiedź, którą chcemy opublikować. Do rewizji
   tylko wtedy, gdy vendor to zakwestionuje.
5. ~~**Czwarty przebieg adwersaryjny.**~~ **zrobione 2026-08-09 (7.2), 2,0 procent błędu.**
   Dowiedzione: sondowanie punktu wejścia (156/156 w obie strony) i kanoniczna ścieżka cennika
   (11/11). Niedowiedziona: atrybucja npm, cztery z czterech jej błędów w logice, którą
   przepisywaliśmy. Wszystkie jedenaście naprawione, patrz runda 50.

## Następne kroki merytoryczne

- ~~**Piąty przebieg adwersaryjny**~~ **zrobione 2026-08-09: 0,94 procent** (6 na 640). Dowiedzione:
  ściana wyzwania (156/156), dowody MCP (63 endpointy odtworzone, 465 sond, zero wymyślonych zdań),
  arytmetyka koniunkcji. Niedowiedzione: **selekcja pakietu npm** (zero błędnych przypisań na 141,
  ale publikujemy CLI, serwer i niskopoziomowego klienta jako odpowiedź dostawcy) i **twierdzenie**
  koniunkcji, patrz runda 51.
- ~~**Szósty przebieg adwersaryjny**~~ **zrobione 2026-08-10: 7,9 procent** (17 na 216). Wszystkie
  trzy zmiany z nocy obalone lub niedowiedzione, naprawione w rundzie 54.
- ~~**Siódmy przebieg adwersaryjny**~~ **zrobione 2026-08-10: 1,4 procent** (4 na 290). Potwierdzone
  niezależnie: reguła wyzwania bota, dowody MCP (16/16 z kontrolkami), własność npm (5/5 z
  przypadkiem negatywnym), arytmetyka koniunkcji, poprawka Tailwinda, długość N w nowym zdaniu.
- ~~**Harness audytowy w repo**~~ **zrobione 2026-08-10**, katalog `harness/`. Cztery opublikowane
  audyty **nie dawały się powtórzyć**: scaffoldy, briefy i transkrypty leżały poza repozytorium.
  Briefy odzyskane z opublikowanego rekordu, bo to było jedyne miejsce, gdzie przetrwały.
  `npm run seed -- <kategoria> <n>` robi izolowane kopie i **odmawia startu bez pliku briefu**;
  `npm run collect -- <kategoria>` czyta, co przebieg zainstalował i zaimportował, **nigdy jego
  własnego raportu**. `harness/docs/method.md` zapisuje, co zostaje ludzkie i dlaczego.
  Scaffoldy dla wszystkich czterech kategorii są w repo (`editors`, `storage`, `auth`,
  `payments`), każdy z ograniczeniem, które dało najostrzejsze znalezisko: statyczny bundle przed
  serwisem w Go, którego przebieg nie widzi i nie edytuje, a tożsamość przychodzi jako ciasteczko
  ustawione przez proxy.
- ~~**Harness wieloagentowy i pierwsza komórka**~~ **zrobione 2026-08-10.** `npm run cell` obsługuje
  `claude`, `codex`, `gemini`, `cursor` i zapisuje wersję CLI, model i tryb auth do każdego
  przebiegu. **Kontaminacja złapana przy pierwszym użyciu:** przebieg zasiany w `harness/runs/`
  wszedł do korzenia repo StackPicka, przeczytał dokumentację harnessu i uznał, że ma powtórzyć
  audyt. Exit 0, spójny raport, scaffold nietknięty. Przebiegi idą teraz do `~/.stackpick-runs`,
  każdy z własnym `git init`. **Nigdy nie zasiewaj przebiegu w repo o mierzeniu agentów.**
  Wynik pierwszej komórki: `harness/results/editors-cursor-2026-08-10.md`.
- **Ograniczenia subskrypcji, zmierzone:** Cursor free pozwala tylko na model `auto` (nazwany model
  = `ActionRequiredError`), a `auto` **nie zapisuje, który model odpowiedział**, co samo w sobie
  jest confoundem. Gemini spada na darmowy próg API (20 żądań dziennie) i nie kończy przebiegu.
- ~~**Ósmy przebieg adwersaryjny**~~ **zrobione 2026-08-10: 1,29 procent** (4 na 311), runda 56.
- ~~**Dziewiąty przebieg adwersaryjny**~~ **zrobione 2026-08-10: 0,77 procent** (4 na 523), runda 57.
- ~~**Dziesiąty przebieg adwersaryjny**~~ **zrobione 2026-08-10: 0,39 procent** (1 na 256), rundy
  60-63. Dowiedzione: sonda nazwanymi crawlerami (109/109), reguła 429 (53/53), kuracja (155
  apeksów przemiecionych). Niedowiedzione i naprawione: klasyfikacja CTA (fałszywy fail
  `pinecone.io`) oraz `find_providers` (23 procent złych trasowań).

- ~~**Jedenasty przebieg adwersaryjny**~~ **zrobiony 2026-08-11, rundy 102-103.** Bez jednej
  metryki, bo trzy powierzchnie mierzą się osobno: **reguła `browser-only` była fałszywa na swoim
  jedynym przypadku** (njal.la, kontrolka w złej przestrzeni nazw), **sonda brzegowa pytała jako
  crawlery treningowe** przy checku o agentach on-demand, a **trasowanie ma 31,8 procent błędu**
  na pytaniach, na których go nie strojono. Rozgałęzione `REMEDIES` sprawdzone na vendorach,
  których dotyczą, i poza powyższym wszystkie wyszły prawdziwe. Zapis niżej jest tym, co ten
  przebieg zastał, i zostaje jako historia:

  **Zaatakowane przeze mnie i dowiedzione, nie marnuj na to przebiegu:** `robots_paths_resolve`
  (wszystkie 22 werdykty odtworzone ręcznie, znalezione i naprawione 4 złe zdania), twierdzenie o
  grantach (66 twierdzeń odtworzonych niezależnie, znalezione i naprawione 2), każda liczba na
  `/findings` i `/report` (kilkanaście, wszystkie zgodne), spójność `corpus.csv` z `corpus.json`.

  **Nietknięte i warte ataku:** reguła `browser-only` w MCP (wprowadzona po jednym przypadku,
  `njal.la`, i nigdy nie sprawdzona na innych), sondowanie `/api/mcp` poza tym jednym wierszem,
  rozgałęzione `REMEDIES` w `fixfirst.ts` (pięć rad przepisanych jednej nocy, żadna nie
  zweryfikowana na vendorze, którego dotyczy), oraz `find_providers` na **świeżych** pytaniach,
  bo oba istniejące zestawy są spalone dostrajaniem.

- **Dwunasty przebieg adwersaryjny, do zrobienia.** Powierzchnie, których jedenasty nie ruszył,
  w kolejności wagi:
  1. ~~**Trasowanie po raz drugi.**~~ **zrobione w rundzie 105: 35 → 20 procent.** Wszystkie 149
     pytań w `scripts/routing.mts` jest teraz spalone, więc trzynasty przebieg pisze kolejne.
     Dwie hipotezy nadal **nieprzetestowane i celowo nie wdrożone**, bo obie wyszły z połowy
     odłożonej: (a) gdy pytanie nazywa **kanał dostawy** (sms, głos, push, mail), kanał powinien
     wygrywać remis z dziedziną, (b) `chrome` jest słowem infrastruktury przeglądarkowej. Obie są
     regułami o świecie, nie o pytaniu, więc wolno je sprawdzić na nowym zestawie.
  2. ~~**Gałęzie zamieniające status HTTP na werdykt.**~~ **zrobione w rundzie 104**, zero dalszych
     znalezisk poza tą jedną z rundy 103.
  3. ~~**`machine_readable_api`**~~ **zrobione w rundzie 104: 106 na 106.** `robots_paths_resolve`
     był atakowany wcześniej (22 werdykty odtworzone ręcznie, 4 złe zdania naprawione).
  5. ~~**`programmatic_provisioning` liczy frazy, nie czyta procedur.**~~ **zrobione w rundzie 110**,
     29 werdyktów, netto minus 25 punktów, cztery pierwsze straty przeczytane i wszystkie słuszne.
     Zapis niżej jest tym, co ten przebieg zastał. Runda 108 pokazała to na
     `loops.so`: „This creates an API key" opisuje kliknięcie w panelu i jest punktowane tak samo
     jak zdanie o endpoincie. Dotyczy wszystkich 58 wierszy z tą frazą. Hipoteza do sprawdzenia na
     całym korpusie: fraza liczy się dopiero, gdy w promieniu ~80 znaków stoi marker programowy
     (`via the API`, `curl`, `POST /`, `CLI`, `SDK`, nazwa endpointu). **To odejmie punkty**, więc
     wymaga własnego przebiegu, własnego reseedu i przeczytania, komu odjęło i dlaczego.
     Szkic przetestowany offline na dziewięciu zdaniach (runda 108), gotowy do wpięcia:
     marker `(?:via|through|using|with) the api|(?:management|admin|account|provisioning|rest|public)[ -]api|curl|POST|GET|/v\d|CLI|SDK|endpoint|programmatic\w*|request`,
     okno `(?:(?!\.\s)[\s\S]){0,80}` z każdej strony frazy. **Okno musi być takie, a nie `[^.]`**:
     `curl -X POST https://api.example.com/keys creates an api key` ma kropki w URL-u i `[^.]`
     ucina okno na `example`, czyli reguła gubi dokładnie te zdania, o które w niej chodzi.
  4. ~~**Zdania w `/findings` obok liczb.**~~ **zrobione w rundach 105-106.** Znalezione jedno
     fałszywe (Contentful), a audyt pilnuje teraz trzech twierdzeń nazywających firmy. **Nie
     obejmuje to zdań na `/methodology` i `/report`**, które są historyczne i datowane, więc
     dryfują wolniej, ale nie są pilnowane niczym.
- ~~**Kuracja korpusu jest niesprawdzona**~~ **zrobione 2026-08-10**, przelot po wszystkich 156
  wierszach z pytaniem, czy domena to firma, o której myślimy. **155 zweryfikowanych, 1 nieczytelny**
  (`digger.tools`, 429). Znaleziska: `defer.run` **wypada z korpusu** (apex 301 na cudzą domenę na
  każdej ścieżce, więc to, co skanowaliśmy, nigdy nie było ich stroną), `tigrisdata.com` przeniesiony
  z baz danych do storage (własna strona: „Bottomless object storage", słowo database zero razy),
  **siedmiu dostawców pisze na własnych stronach, że zostali przejęci** (june.so, highlight.io,
  split.io, stytch.com, payloadcms.com, lemonsqueezy.com, bugsnag.com), z czego czterech nabywców
  jest osobno w korpusie. Zapisane w `ownership.ts` ze zdaniem z ich strony.
  **Zostaje do rozstrzygnięcia:** `sendgrid.com` przekierowuje na `twilio.com/en-us/sendgrid`, więc
  **dwa wiersze mierzą ten sam serwis, ten sam robots.txt i ten sam llms.txt**. To nie jest błąd
  werdyktu, tylko podwójne liczenie w każdej statystyce rynkowej, którą publikujemy.
  `vercel.com` siedzi w file-storage i jego strona nie mówi o storage ani razu, ale **żadna z 24
  kategorii do niego nie pasuje**, więc to decyzja o kuracji, nie przesunięcie.
- **`auth0.com` serwuje dyno inne ciało niż nam.** Z tej maszyny `auth0.com/signup` daje 200 i
  formularz z dwoma polami, a skan widzi „form needs JavaScript". To fakt o tym, skąd pytamy, i
  ta sama klasa co `storyblok.com`. Nie jest to błąd reguły i nie da się naprawić kodem skanera.
- **Selekcja pakietu npm, nie własność.** `directus.io` dostaje `directus` (serwer) zamiast
  `@directus/sdk`, `xata.io` dostaje `@xata.io/api@0.1.7` zamiast `@xata.io/client@0.30.1`, oba
  we własnym scope dostawcy i oba otypowane. `betterstack.com` gubi `@logtail/node` przez
  `pointsAtAnotherCompany`. Zdanie jest dosłownie prawdziwe i odpowiada na złe pytanie.
  **Dwie próby naprawy zmierzone i odrzucone 2026-08-10, rundy 52 i 53. Nie powtarzaj żadnej:**
  filtr „pakiet deklarujący się SDK bije nosiciela marki" ruszył 32 wiersze zamiast 2, a
  ekstrakcja nazw z instrukcji importu dołożyła dwie fałszywe atrybucje i nie naprawiła żadnej.
  Dowód nadal musi być **niezależny od mierzonej cechy** (nie „ma typy"), ale ani ranking, ani
  ekstrakcja nie są dźwignią. Trzecia próba bez nowego rodzaju dowodu jest stratą czasu.
- ~~**Bramka mailowa na wyniku skanu.**~~ **zrobione 2026-08-09.** Audyt cenowy twierdził, że
  nie zbieramy maila. Zbieraliśmy, tylko formularz był **ostatnią sekcją strony**, po dziesięciu
  sekcjach i całej tabeli dowodów, czyli w miejscu, w którym intencja, której potrzebuje, już
  wyparowała. Teraz stoi bezpośrednio pod listą napraw, jedynym punktem, w którym czytelnik trzyma
  coś, co komuś przekaże. Zmierzone na produkcji: znak 1792 z 6954 widocznych, wcześniej ostatni.
  **Świadoma decyzja: wynik i dowody zostają bez bramki.** Korpus jest publiczny, a formuła
  opublikowana, więc bramkowanie liczby kosztowałoby to, co czyni ją wartą przeczytania, i nic
  by nie kupiło. Do rewizji tylko z twardymi danymi o konwersji.
- ~~**Pole własności w korpusie**~~ **zrobione 2026-08-09**: `src/data/ownership.ts` plus
  `npm run targets`, który generuje `outreach/targets.md` z żywego korpusu. Lista była pisana
  ręcznie i **stała dwie wersje formuły za danymi**, na które się powoływała, czyli nazywała
  vendorów na werdyktach, które od tego czasu poprawiliśmy. Zapisane jest **tylko to, co
  sprawdziłem z pierwszej ręki**, ze zdaniem źródłowym: `june.so` i `highlight.io` (przejęcia,
  cytat z ich własnych stron), `pusher.com` (MessageBird, cytat), `defer.run` (301 na
  `digger.tools`), `searchkit.co` (projekt OSS w organizacji GitHuba). Reszta korpusu zostaje
  **nieznana, nie „niezależna"**: brak wpisu to luka w naszym researchu, nie fakt o firmie.
  **Pole nigdy nie trafia na stronę**: każda liczba, którą publikujemy, jest odtwarzalna jednym
  żądaniem, a twierdzenie o tym, kto jest właścicielem firmy, nie jest.
  Zostaje do uzupełnienia reszta wpisów, w tempie „tylko zweryfikowane".
- ~~**Raport „jedna rzecz dzieli was od drzwi"**~~ **zrobione 2026-08-09**, sekcja na `/findings`.
  Lejek czytany jako **koniunkcja, nie próg na wyniku**, i to jest cała pointa: check nieoznaczalny
  wypada z mianownika, więc próg **nagradza bycie nieczytelnym**, a nogi koniunkcji nie da się
  spełnić chowając cokolwiek, bo schowanie nogi ją usuwa. Wynik: **14 ze 156** spełnia wszystkie
  trzy, **61 jest o jeden wymóg od tego**, z czego **40 oblewa wyłącznie rejestrację**, 11 drzwi
  dla maszyny, 10 udokumentowaną drogę po klucz. Obie liczby przeliczane przy każdym żądaniu i
  **pilnowane przez audyt** (12 liczb zamiast 10), więc zdanie i dane nie mogą się rozjechać.
- **Trzy reguły, które ten projekt wypracował bólem i które trzeba stosować przy każdym nowym
  checku czytającym cudzy serwer:**
  1. Tylko **404** znaczy „nie ma". Każda inna odmowa znaczy „nie przeczytaliśmy". Musiała być
     dopisana osobno przy `robots.txt`, stronach dokumentacji i ścieżkach wejścia.
  2. **Kontrolka musi wysyłać dokładnie to żądanie, które ocenia**, i pytać tak samo jak check,
     który z niej korzysta. Złamane trzy razy: nagłówek `Accept`, metoda HTTP, dwa checki na
     jednym boolu.
  3. **Naprawa dokładająca żądania zabiera budżet gdzie indziej.** Pytaj nie tylko „czy to
     poprawne", ale „co przez to wypadnie". `sentry.io` stracił sześć checków na naprawie npm.
  4. **Zacieśnienie mierzy się na całym korpusie, nie na przypadku, który je wywołał.** Reguła
     o organizacji na GitHubie wyrzuciła cztery prawdziwe pakiety, żeby złapać jeden fałszywy,
     i widać to było dopiero w diffie 156 wierszy. Dotyczy każdej reguły dopasowującej nazwy.
  5. **Werdykt może być dobry, a zdanie fałszywe.** Czwarty przebieg znalazł sześć takich przy
     MCP. Nic w liczbach nie wygląda źle, więc łapie to tylko czytanie zdań obok dowodów.

## Zablokowane na Krystianie, stan 2026-08-08 wieczorem

Produkt jest technicznie gotowy: korpus 156 domen na formule 5.0, audyt czysty, każdy werdykt
nazywa adres, który da się odpalić curl-em. **Do startu w poniedziałek brakuje wyłącznie rzeczy,
których agent nie ma prawa rozstrzygnąć sam.**

1. **Domena `stackpick.ai`** (albo inna). Wszystko na stronie pokazuje dziś
   `stackpick-f12d13a227ea.herokuapp.com`, łącznie z `helpUri` w SARIF i adresami w `/corpus.json`.
2. **Zweryfikowany nadawca w Resend.** Bez tego dostarczanie scorecardów mailem jest wyłączone,
   a to jedyny mechanizm zbierania leadów, jaki mamy.
3. **Ścieżka zakupu inna niż `mailto:` na prywatnego Gmaila.** Za 11 000 USD nikt nie napisze na
   adres z gmail.com.
4. **Licencja korpusu.** Terms mówią dziś „free to use, quote and republish with attribution",
   co jest treściowo CC BY 4.0, ale **nienazwane**. Research pokazuje, że nazwana licencja plus
   stały identyfikator to dokładnie to, co odróżnia zbiór cytowany od zbioru czytanego (OpenSSF
   Scorecard: CDLA Permissive 2.0, Web Almanac: CC BY 4.0 z DOI na rozdział). **Nie nazywam jej
   sam**, bo CC BY 4.0 jest nieodwołalna dla każdej pobranej kopii, a to jest decyzja o cudzej
   własności, nie o kodzie.
5. **Model sprzedaży.** Dowody z rynku mówią, że pieniądze są w powtarzalnym pomiarze, nie
   w jednorazowym audycie (ogłoszenie Iterable wprost: „This role is not about one-time audits";
   Scope zrobił 24k MRR w cztery tygodnie na subskrypcji). Dziś sprzedajemy jednorazowy audyt za
   11 000 USD. **Zmiana cennika to decyzja biznesowa, nie naprawa błędu**, więc czeka.

## Runda 2026-08-11 (114): 120 wierszy mówiło „są sygnały" i nie pokazywało żadnego

`self_serve` to ostatni nieatakowany check z wagą. Jego zdanie o przejściu, **najczęstsze zdanie
w całym korpusie, 120 wierszy**, brzmiało „Free tier or no-card signals at *URL*" i nie nazywało
ani słów, ani reguły. Twierdzenie, którego vendor nie ma jak sprawdzić.

Teraz cytuje to, co było na stronie: `resend.com` → `"free trial", "$0"`, `algolia.com` →
`"try for free", "Free to start, then pay as you go"`, `qdrant.tech` → `"Free Tier", "Free forever"`.

**Zmiana zarobiła na siebie natychmiast.** Sprawdziłem cytaty ręcznie: `$0` u Resenda pochodzi
z prawdziwego wiersza darmowego planu („Free Recommended $0 / mo 3,000 emails"), ale drugi cytat,
`free trial`, jest u nich **wyłącznie jako pytanie w FAQ**: „Is there a free trial available?".
Werdykt broni się na `$0`, ale słaba połowa dowodu jest teraz widoczna zamiast schowanej za
podsumowaniem.

**Następny kandydat, celowo nie wdrożony razem z tym** (jedna zmiana reguły na reseed): fraza
o darmowym planie stojąca w zdaniu pytającym nie jest twierdzeniem. Do sprawdzenia na całym
korpusie, bo „Is there a free trial?" i „Do you have a free tier?" to częsty nagłówek FAQ i reguła
może dotknąć kilkunastu wierszy.

## Runda 2026-08-11 (113): dwóch vendorów bez CAPTCHY ma za to obronę przed botami

Check zna cztery CAPTCHE. Zapytałem te same strony rejestracji **szerszą listą dziesięciu**
(friendlycaptcha, altcha, geetest, AWS WAF, mtcaptcha, datadome, perimeterx, kasada, captchafox,
challenges.cloudflare.com) i wyszły dwa trafienia: **`resend.com`**, czyli jeden z pięciu vendorów
z listy „przechodzi wszystkie trzy bariery", oraz **`turbopuffer.com`**. Oba serwują na stronie
rejestracji klienta **Kasady** (`KPSDK`).

**Nie zaliczyłem tego jako CAPTCHY i to jest sedno tej rundy.** Nie ma tam widgetu ani niczego do
rozwiązania; ta warstwa decyduje w tle. Wrzucenie jej do checku o nazwie „No CAPTCHA in the signup
HTML" uczyniłoby zdanie fałszywym, a oblanie vendora na tej podstawie byłoby **twierdzeniem
o pomiarze, którego nie zrobiliśmy**: formularzy rejestracji nie wysyłamy, więc nie wiemy, co się
dzieje po submicie. To dokładnie ta klasa nadgorliwości, którą zewnętrzny recenzent wytknął nam
przy MCP.

Punkt więc zostaje, a zdanie mówi, co jeszcze jest na stronie: *„The page does carry kasada, a bot
defence that decides in the background rather than a challenge anyone solves. We did not submit the
form, so whether it lets an unattended request through is not something we measured."*

**Sprawdzone przed napisaniem tego zdania:** SDK siedzi też na stronie głównej i cenniku
`resend.com`, czyli to obrona całego serwisu, a nie bramka postawiona na rejestracji.

Reszta szerokiej listy nie znalazła nic: **żaden vendor, któremu dajemy pass, nie ma CAPTCHY,
której po prostu nie umieliśmy nazwać**, i żaden oblany nie jest oblany bez trafienia z naszej
listy. Nowa reguła ma swoje przypadki w `scripts/rules.mts`, łącznie z negatywnym („kaskada is
a river in Poland").

Reseed odświeżający potwierdzony na produkcji: oba wiersze niosą nowe zdanie **przy zachowanym
punkcie**, a cały diff to **6 werdyktów, 0,24 procent**, czyli grubo poniżej podłogi szumu. W tym
`weglot.com`, który sam poprawił się na nieoznaczalny, dokładnie jak zapowiadałem w rundzie 111.

## Runda 2026-08-11 (112): reguła, która umiała powiedzieć tylko „nie"

`/findings` publikuje wynik zerowy: **0 ze 170** serwuje agentowi mierzalnie mniej tekstu niż
przeglądarce. Wynik zerowy z narzędzia, które nigdy nie pokazało, że umie powiedzieć „tak", jest
tym samym co test, który nie umie oblać.

**Zmierzyłem sam stosunek, nie werdykt: 104 wiersze, po dwa pobrania każdy, przeglądarka kontra
nasz user-agent.** Rozkład jest ostrzejszy niż to, co publikujemy: **103 wiersze mają dokładnie
zero różnicy**, żaden nie siedzi w paśmie 5-50 procent. Jedyne trafienie, `calendly.com` ze
spadkiem 0,5, sprawdzone ręcznie po chwili: **te same 2844 znaki i te same 310 kB dla obu
klientów**, czyli był to jednorazowy artefakt pobrania, nie cloaking.

**Wniosek: wynik zerowy jest prawdziwy i mocniejszy, niż go opisujemy.** To nie jest „nikt nie
przekracza progu", tylko „prawie nikt nie różnicuje w ogóle".

**Nowy plik `scripts/rules.mts` i to jest trwała część tej rundy.** Reguły skanera puszczone na
zdaniach napisanych specjalnie, połowa ma trafiać, połowa nie: reguła cloakingu (umie zwrócić
liczbę, umie zwrócić null, ma podłogę 2000 znaków), siedem wzorców provisioningu (sześć zdań
programowych i siedem panelowych, w tym wszystkie fałszywe pozytywy z tej nocy) oraz reguła
„samo free w przycisku". Wchodzi w `npm run build`, więc reguła, która przestaje zachowywać się
jak opisana, wywala build przed deployem. Sfalsyfikowany na miejscu: podmieniona oczekiwana
wartość wywala go z komunikatem, przywrócona przechodzi.

**Zapisany limit, którego strona nie mówi:** reguła odpala się dopiero powyżej **50 procent**
spadku, więc vendor serwujący agentowi 45 procent mniej tekstu jest publikowany jako
nie-cloakujący. Test to teraz stwierdza wprost zamiast chować.

## Runda 2026-08-11 (111): dwa checki przestały mówić o stronie, której nie nazywają

Nogi koniunkcji z `/findings` opierają się na jednej stronie każda, a `signup_reachable`
i `signup_no_captcha` **nie mówiły której**. Reszta skanera ma tę zasadę zapisaną w kodzie od
dawna („every sentence here says which page it read") i te dwa checki po prostu jej nie miały,
mimo że są najbardziej narażone: **stronę rejestracji zgadujemy**, idąc za linkami i próbując
ścieżek, i projekt raz już opublikował 404 z cudzego hosta jako znalezisko o `anvil.co`.

Teraz obie sentencje nazywają adres, **144 wiersze ze 170** go niosą (reszta to nieoznaczalne
i nieistotne), a reguła audytu o checkach popartych jednym dokumentem obejmuje `signup_reachable`,
więc pass, który przestanie nazywać stronę, wywali guard.

**Dzięki temu dało się zaatakować ten check niezależnie i przeszedł.** Napisałem drugi czytnik
formularza **z opisu checku, nie z jego kodu**, i puściłem go na wszystkie 127 wierszy z werdyktem
pass albo fail: **trzy rozjazdy**.

- `api.video` i `payloadcms.com`: mój prostszy czytnik mówi „jest formularz", nasz mówi „nie ma".
  **Nasz ma rację i wie dlaczego**: u `api.video` jedyny input jest `disabled`, a checkbox zgody
  stoi poza formularzem, u `payloadcms.com` to newsletter w stopce. Oba przypadki są opisane
  w komentarzu przy regule, bo oba już raz nas kosztowały.
- `weglot.com`: my mówimy pass, ja widzę 403. Sprawdzone ręcznie: `dashboard.weglot.com/register`
  odpowiada **403 i przeglądarce, i agentowi**, czyli teraz jest nieoznaczalne, a pass pochodzi
  z momentu, w którym odpowiadało. To zmienność po ich stronie, nie błąd reguły.

Zgodność na 124 wierszach warta jest mniej niż te trzy rozjazdy i po to się je czyta.

## Runda 2026-08-11 (110): check przestał kredytować przyciski i zabrał 25 punktów

`programmatic_provisioning` liczył frazę, nie procedurę, więc `strapi.io` dostawał punkt za
„Creating a new API token: **Click on the Create new API Token button**". Fraza liczy się teraz
tylko z markerem programowym w tym samym zdaniu.

**To pierwsza zmiana tej nocy, która odejmuje.** Reseed na 8.4: **29 werdyktów ruszonych, wszystkie
w tym checku, netto minus 25 punktów** w korpusie. Rozkład `pass` 37 → 28, `partial` 56 → 49,
`fail` 58 → 76. Średnia korpusu 8,79 → 8,66. Diff całości to **1,53 procent**, najwięcej od
tygodnia, i tym razem to nie jest podejrzane, tylko zamierzone.

**Przeczytałem, co stracił każdy z czterech pierwszych, i wszystkie cztery straty są słuszne:**
- `chargebee.com`: „only the Site admin or the site owner **can create the API keys**" - zdanie
  o uprawnieniach ludzi.
- `groq.com`: „**Please visit here** to create an API Key" - link do panelu.
- `inngest.com`: „Create an Inngest API key **in the Cloud dashboard**".
- `mux.com`: „You create an access token, upload a video, and play it" - narracja z quickstartu,
  nie ścieżka.

**Cena, którą płacimy świadomie:** vendor, który naprawdę ma API do kluczy, ale opisuje je słowami
spoza listy markerów, dostaje teraz zero. Zdanie w raporcie mówi wprost „None of the 7 provisioning
phrases appears in the N documents we read", czyli twierdzi o frazach, nie o istnieniu ścieżki,
a `/methodology` mówi teraz wprost, czego wymaga fraza tworzenia. To jest ta sama asymetria, co
przy całym skanerze: **fałszywy pozytyw kosztuje wiarygodność, fałszywy negatyw kosztuje punkt**.

Liczba na `/findings` przeszła w nocy **5 → 7 → 5**, bo poszerzenie dodało dwóch vendorów, a marker
zabrał ich i jeszcze `deepl.com`. Lista „wszystkie trzy" to dziś `auth0.com`, `bird.com`,
`resend.com`, `sendlayer.com`, `supabase.com`, a strażnik zdań sprawdza te nazwy przy każdym audycie.

## Runda 2026-08-11 (109): trzeci reseed zamknął noc i pierwszy raz odjął punkty

`170 wierszy na 8.3, 0 sprzeczności, 17 liczb i 3 twierdzenia o firmach, 0 rozjazdów.`

Diff 8.2 → 8.3: **11 werdyktów, 0,43 procent, czyli poniżej podłogi szumu**. W
`programmatic_provisioning` ruszyło pięć i **wszystkie w dół**, co jest kształtem, jakiego się
spodziewałem po usuwaniu fałszywych trafień, i odwrotnością tego, co pokazał reseed 8.2.

**Jedno z nich było fałszywe od dawna, nie od wczoraj:** `polar.sh` traci punkt za zdanie
„**Programmatically create** dynamic **checkout sessions** for custom flows". To pasowało już do
starego, dosłownego wzorca `programmatically create`, więc było fałszywym pozytywem także w 8.1
i wcześniej. Wymóg poświadczenia pomiędzy słowami wyczyścił przy okazji błąd, którego nie
szukałem. `modal.com` to ten sam przypadek.

**Bilans całej nocy na tym checku, 8.1 → 8.3, jedenaście wierszy:** w górę `stripe.com`,
`launchdarkly.com`, `amplitude.com`, `windmill.dev`, `medusajs.com`, `sendlayer.com`, `loops.so`;
w dół `modal.com`, `polar.sh`; do nieoznaczalnych `postmarkapp.com` i `signoz.io` (odmowy stron,
czyli pogoda). Rozkład: `pass` 37 → 37, `partial` 53 → 56, `fail` 62 → 58.

**Wniosek metodyczny, który zapisuję na przyszłość:** poszerzenie i zacieśnienie tej samej reguły
trzeba było zrobić w **dwóch osobnych reseedach**, i to nie było marnotrawstwo. Gdyby poszły razem,
diff pokazałby kilka ruchów w obie strony i nie dałoby się powiedzieć, które z nich są skutkiem
której połowy zmiany. Osiem ruchów w górę było czytelnym sygnałem, że coś jest nie tak, właśnie
dlatego, że nic nie szło w dół.

## Runda 2026-08-11 (108): osiem werdyktów w górę to nie sukces, to kształt błędu

Reseed na 8.2 przeszedł 170 domen i ruszył **20 werdyktów na 2550, czyli 0,78 procent**, tuż nad
podłogą szumu. Osiem z nich siedzi w `programmatic_provisioning`, czyli w checku, który zmieniłem,
i **wszystkie osiem poszło w górę**. To jest dokładnie kształt, jaki przybiera złe poszerzenie,
więc przeczytałem, co każde z nich dopasowało.

**Jedno było fałszywe:** `hatchet.run` dostał punkt za nagłówek „**Programmatically Creating** Cron
Triggers". Słowa się zgadzają, temat nie. Weszło **gałęzią wiodącą**, którą poprzednia poprawka
zostawiła bez opieki: stary wzorzec był dosłownym `programmatically create`, a ja poszerzyłem go do
dowolnego słowa na `creat`, jednocześnie dokładając wymóg poświadczenia **tylko w kolejności
odwrotnej**. Teraz obie kolejności wymagają poświadczenia pomiędzy.

**Sprawdzone ponownie na zdaniach, nie na liczbach:** zostają `launchdarkly.com` („list, create,
modify, and delete access tokens programmatically") i `deepl.com` („create a developer API key
programmatically"), wypadają cron triggery Hatcheta, projekty Agory i konta Nylasa.

Formuła **8.3**, trzeci reseed tej nocy w biegu.

**Znane ograniczenie tego checku, zapisane świadomie zamiast naprawiane po drodze:** to jest
**licznik fraz, nie czytnik procedur**. `loops.so` dostaje punkt za „This **creates an API key**",
zdanie opisujące kliknięcie w panelu. Ta słabość jest w checku od początku i dotyczy wszystkich 58
wierszy z tą frazą, nie tylko nowych, bo `create an api key` w zdaniu o dashboardzie wygląda tak
samo jak w zdaniu o API. Naprawa wymagałaby markera programowego (endpoint, CLI, „via the API")
w pobliżu frazy i **odjęłaby punkty wielu vendorom**, więc jest kandydatem na osobny przebieg
z własnym reseedem, a nie dokładką do tego.

## Runda 2026-08-11 (107): najcięższy check czytał połowę zdań, które go dotyczą

`programmatic_provisioning` waży dwa punkty i jest jedną z trzech nóg koniunkcji na `/findings`,
a nie był atakowany od wprowadzenia. Szukał stworzenia i poświadczenia **bez niczego pomiędzy**,
a najczęstszy sposób, w jaki vendorzy to piszą, ma pomiędzy spójnik.

**`stripe.com` był publikowany jako nie dokumentujący żadnej drogi do klucza**, podczas gdy
`docs.stripe.com/keys/managed-api-keys` mówi, że platforma „can **create and manage** API keys on
your behalf" i że „the platform creates them **programmatically**". Dwa zdania, oba o dokładnie
tym, o co ten check pyta, oba przepuszczone przez odstęp jednego słowa.

**Poszerzenie musiałem cofnąć w połowie i to jest tu najważniejsze.** Pierwsza wersja drugiego
wzorca łapała `creat...` w promieniu czterdziestu znaków od `programmatically` i natychmiast
przeczytała `agora.io` „creating projects and retrieving usage data programmatically" oraz
`nylas.com` „create accounts programmatically" jako udokumentowane wydawanie kluczy. **Oba zdania
są o innym obiekcie.** Teraz poświadczenie musi stać **pomiędzy** tymi słowami, co zachowuje
prawdziwe trafienia (`deepl.com` „create a developer API key programmatically", `nylas.com`
„Create, list, and revoke API keys programmatically") i wyrzuca oba fałszywe.

Złapane **czytaniem, co nowy wzorzec dopasował**, a nie liczeniem, że dopasował więcej.
Poszerzenie, które wyłącznie dodaje punkty, jest sposobem, w jaki korpus się nadyma.

Przy okazji: zdanie kredytujące cytowało **jeden wzorzec jako sześć fraz**, bo jego etykieta była
listą pisowni oddzieloną przecinkami wewnątrz jednej pary cudzysłowów. Vendor czytał „1 of 7
provisioning phrases", a potem sześć rzeczy. 58 wierszy niosło tę etykietę.

Formuła **8.2**, reseed w biegu.

**Zamknięte przez pomiar, nie przez naprawę: 13 wierszy bez pakietu npm.** Hipoteza była taka, że
to nasze ograniczenie, bo rejestr nas odmawia. Zmierzone: **limit siedzi wyłącznie na
`/-/v1/search`** (429 po kilkunastu zapytaniach), a **dokumenty pakietów nie limitują się w ogóle**
(20 pobrań pod rząd, zero odmów). Napisałem więc ścieżkę zgadującą nazwy konwencjonalne i
sprawdzającą je po dokumencie, i **wyszła pusta na 13 z 13**: te firmy albo nie mają pakietu npm
(`calendly.com`, `porkbun.com`, `weglot.com`), albo publikują pod inną marką (`betterstack.com`
→ `@logtail/node`), albo pakiet jest cudzy (`usefathom.com` → `fathom-client` od osoby prywatnej).
**Ścieżkę wycofałem zamiast wdrożyć**, bo martwy kod jest gorszy niż brak kodu. W KB jako
`npm-limit-jest-na--v1search-nie-na-dokumentach-pakietow`.

## Dziennik wcześniejszych rund

Rundy 1-106 są w `docs/journal-2026-08.md`. W tym pliku zostaje osiem ostatnich,
bo starsze nie mówią już nic, czego nie mówi kod albo sekcja kontraktu.
