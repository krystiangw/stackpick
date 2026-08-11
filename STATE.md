# Let Agents In: stan na 2026-08-11 (rano)

Punkt wejścia po compact. Czytaj przed pracą, razem z `ARCHITECTURE.md`.
**Dwie sekcje na dole tego bloku, "Co zostało z audytów" i "Następne kroki merytoryczne", są
kontraktem dla watchdoga. Aktualizuj je przy każdej zamkniętej pozycji, inaczej watchdog czyta
listę sprzed trzydziestu rund.** Dziennik rund jest niżej i jest historią, nie listą zadań.
**Ten nagłówek też się starzeje: 2026-08-11 rano mówił "StackPick, formuła 7.4, 155 domen",
czyli był o dwa dni i pięć wersji formuły do tyłu. Przepisuj go, nie tylko dziennik.**

## Stan na teraz, w dziesięciu liniach

- Produkt nazywa się **Let Agents In** od 2026-08-10. Domena **nie jest kupiona**, adres to nadal
  `stackpick-f12d13a227ea.herokuapp.com`, a nazwa hosta zostaje świadomie do czasu zakupu.
  User-agent skanera to `LetAgentsIn/1.0`.
- Formuła **8.1**, korpus **170 domen w 25 kategoriach**, **15 checków**, **17 punktów na papierze**.
  `npm run audit` pilnuje **17 liczb** i **0 sprzeczności**, czyli **każdą liczbę liczoną z danych, która trafia na publiczną stronę**.
- **Podłoga szumu korpusu: 0,64 procent** (15 zmian na 2338 przy dwóch reseedach bez zmiany reguły).
  Opublikowana na `/methodology`. Każda różnica mniejsza to pogoda, nie zmiana. Przejście 8.0 → 8.1
  ruszyło **25 werdyktów na 2550, czyli 0,98 procent**, i tylko trzy z nich są skutkiem reguły.
- Jedenaście przebiegów adwersaryjnych: **16,7 → 2,2 → 3,9 → 2,0 → 0,94 → 7,9 → 1,4 → 1,29 → 0,77 →
  0,39 procent**, jedenasty bez wspólnej metryki, bo atakował trzy powierzchnie osobno: dwa
  fałszywe twierdzenia w skanerze (patrz runda 102) i **31,8 procent błędu w trasowaniu**.
- Opublikowane liczby: **5 ze 170** przechodzi wszystkie trzy bariery, **48 jest o jeden wymóg od
  tego**, **19 z 66** publikujących endpoint rejestracji ma grant, który agent dokończy bez
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
  5. **`programmatic_provisioning` liczy frazy, nie czyta procedur.** Runda 108 pokazała to na
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

## Runda 2026-08-11 (106): audyt pilnuje teraz też zdań, które nazywają firmę

Ostatnia pozycja dwunastego przebiegu. Każda liczba korpusowa na stronie jest przeliczana i
pilnowana; **zdanie nazywające firmę nie jest ani jednym, ani drugim** i dryfuje ciszej. Runda 105
znalazła jedno takie: przez tydzień pisaliśmy, że Contentful przechodzi wszystkie trzy bariery,
dwa akapity pod listą, która go nie zawierała, a **wszystkie liczby na tej stronie były przez ten
cały czas poprawne**.

Trzy twierdzenia trzymają się teraz danych albo wywalają audyt: dwaj rejestratorzy za tymi samymi
drzwiami (`namecheap.com` zamknięte, `dynadot.com` otwarte), sama lista „wszystkie trzy" i przykład
z późną CAPTCHĄ. Guard wypisuje `17 liczb i 3 twierdzenia o firmach, 0 rozjazdów`.

**Sfalsyfikowany przed wdrożeniem**, bo test, który nie umie oblać, nie jest testem: w kopii
roboczej odjąłem `supabase.com` jedną nogę i dostałem wszystkie trzy skargi plus dwa rozjazdy
liczbowe. Pierwsza wersja wzorca też oblała, ale z własnego błędu: `[^.]+` na liście domen kończy
się na pierwszej kropce, czyli na `auth0`.

Przy okazji: zdanie o powtarzalności na `/methodology` mówiło „oba nasze user-agenty", a od dziś
znaczą co innego. Teraz mówi „oba, którymi pytaliśmy tamtego dnia".

## Runda 2026-08-11 (105): trasowanie z 35 na 20 procent, i jedna rzecz, którą popsułem

Dwunasty przebieg na trasowaniu. Czterdzieści nowych pytań w dwóch rejestrach, których wcześniejsze
zestawy nie mają: **krótkie jak w wyszukiwarce** i **człowiek opowiadający problem**.
Zaetykietowane przed uruchomieniem, **baseline 35 procent błędu**. Poprawki wyłącznie z połowy
parzystej, potem połowa odłożona uruchomiona raz: **20 procent, cztery na dwadzieścia**, przy
sześciu przed poprawkami. Ta liczba zastępuje 31,8 w opisie narzędzia MCP.

**Największa dziura była systemowa, nie leksykalna: nie znaliśmy nazw vendorów.** „stripe
alternative", „algolia alternative", „auth0 alternative" wszystkie milczały, podczas gdy korpus
trzyma każdą z tych firm w dokładnie jednej kategorii. Teraz nazwa vendora trasuje, ale **tylko
przyklejona do słowa proszącego o inną firmę**. Pierwsza wersja wymagała jedynie, żeby marka
i słowo „alternative" były gdziekolwiek w pytaniu, i natychmiast przeczytała „screenshot every
competitor page **daily**" jako szukanie zamiennika dla Daily. Ćwierć korpusu nazywa się zwykłym
angielskim słowem (`here.com`, `name.com`, `daily.co`, `split.io`, `loops.so`, `polar.sh`), więc
sąsiedztwo jest tu jedyną obroną.

**Cztery słowa wypadły ze słownika, bo rozstrzygały kategorie, które tylko modyfikują:** `webhook`
(dostarcza je każda kategoria), `headless` (CMS, commerce i przeglądarka), `markdown` (edytor go
pisze, CMS przechowuje), wcześniej `page`. To jest ta klasa poprawek, która **uogólnia się na
pytania, których nie widziałem**: usunięcie samego `page` naprawiło trzy pytania w połowie
odłożonej poprzedniego przebiegu.

**Koszt zapisany, nie zamieciony:** usunięcie `headless` zamieniło jedno pytanie odłożone
(„headless chrome do renderowania pdf-ów") z cichego pudła na **złą odpowiedź**
(documents-signature, po słowie „pdfs"). Zostaje w pliku z adnotacją. Naprawienie go teraz
znaczyłoby strojenie na połowie odłożonej, czyli spalenie jedynego uczciwego pomiaru, jaki mam.

## Runda 2026-08-11 (104): dwie powierzchnie zaatakowane, obie się obroniły

**Reguła o 429 sprawdzona w każdej gałęzi, która zamienia status na werdykt.** Runda 103 znalazła
jedną, która jej nie odziedziczyła, więc przejrzałem resztę: próbnik martwych linków w `llms.txt`
(tylko 404 i 410 liczą się jako martwe), ścieżki `Allow` z `robots.txt` (to samo, plus osobny
kubełek „nie odpowiedziało"), ścieżki wejścia (429 robi check **nieoznaczalnym**, co jest stroną
ostrożną), `answers_plain_request` (osobna gałąź `rateLimitedUs`), `self_serve` (gałąź oblewająca
jest za bramką `pricingFetched`), rejestr npm. **Zero dalszych znalezisk.**

**`machine_readable_api` zaatakowany kontrolką w przestrzeni nazw dokumentacji i obronił się w
całości: 106 na 106.** To jest ten check, w którym kontrolka catch-all stoi w korzeniu serwisu,
a dowód pochodzi z hosta dokumentacji, czyli z zupełnie innej przestrzeni nazw. Wysłałem bzdurną
ścieżkę do katalogu każdej z 97 stron kredytowanych za negocjację markdownu: **dziewięć oddało
markdown**, w tym `groq.com` prawdziwie wyglądającą stronę zamiast błędu.

Porównanie treści oczyściło wszystkie dziewięć: kontrolki to markdownowe „Page Not Found" na 280
do 2226 bajtów, a strony kredytowane mają od 814 bajtów do 33 kB prawdziwej dokumentacji z
frontmatterem. Dziewięć kredytów za OpenAPI sprawdzone osobno: **każdy plik parsuje się jako
dokument OpenAPI 3.x** i ma od 3 do 866 ścieżek.

**Z tego wyszło rozróżnienie, którego wcześniej nie miałem nazwanego** i które trafiło do KB:
- **Twierdzenie o istnieniu** („macie serwer pod tym adresem") kontrolka w tej samej przestrzeni
  nazw rozstrzyga: identyczna odpowiedź znaczy, że twierdzenie jest fałszywe.
- **Twierdzenie o zdolności** („wasza dokumentacja negocjuje markdown") kontrolka oddająca ten sam
  **rodzaj** odpowiedzi niczego nie obala, bo platforma serwująca markdown także dla nieistniejącej
  ścieżki tym bardziej negocjuje markdown. Rozstrzyga dopiero porównanie treści.

Mieszanie tych dwóch przypadków dałoby dziewięć fałszywych oblań u vendorów, którzy robią dokładnie
to, o co prosimy.

## Runda 2026-08-11 (103): reseed na 8.1, jedno fałszywe oskarżenie znalezione i cofnięte

Reseed przeszedł **170 domen, zero błędów**, korpus jest w całości na **8.1**, `npm run audit`
mówi **17 liczb sprawdzonych, 0 rozjazdów, 0 sprzeczności**.

**Koszt dodatkowych kontrolek: ujemny.** Sonda MCP wysyła teraz do dwóch żądań więcej na domenę, bo
kontrolka siedzi w przestrzeni nazw kandydata, a mimo to **nieoznaczalnych ubyło: 231 → 220**,
a wierszy uciętych budżetem **2 → 1**. Suma punktów 1490 → 1491. Reguła numer trzy z tego pliku
(„naprawa dokładająca żądania zabiera budżet gdzie indziej") tym razem nie zadziałała i dobrze,
że sprawdziłem zamiast założyć.

**Diff wszystkich werdyktów 8.0 → 8.1: 25 na 2550, czyli 0,98 procent**, tuż nad podłogą szumu
0,64. Z tego z reguły wynikają **trzy** wiersze w `user_agents_allowed`, reszta to pogoda.
Sprawdziłem oba nowe oblania ręcznie, bo nowy zarzut wobec nazwanej firmy to najgorsza klasa błędu
w tym projekcie, i wyszły z tego dwa przeciwne wyniki:

- **`workos.com` jest prawdziwe i powtarzalne**: `Claude-User` dostaje 404 na `/docs`, a
  przeglądarka, `ChatGPT-User` i `ClaudeBot` dostają 200 i 95 kB. Dokładnie ta dyskryminacja,
  której ten check szuka, i **stara sonda nie mogła jej zobaczyć**, bo pytała crawlerami
  treningowymi. To jest dowód, że zmiana z rundy 102 była warta zachodu.
- **`savvycal.com` było moim błędem.** Opublikowaliśmy „wasz brzeg odpowiedział ChatGPT-User 429",
  a 429 to **nasze własne obciążenie z reseedu**, nie ich decyzja. Reszta skanera od dawna traktuje
  429 jako nieoznaczalne i tylko ta gałąź robiła z niego werdykt. Zapytany raz, savvycal odpowiada
  każdemu nazwanemu agentowi 200 tym samym plikiem 18 kB. Poprawione, przeskanowane, wiersz wrócił
  do „Explicitly allowed: ChatGPT-User".

**Wniosek do zapamiętania:** każda nowa gałąź, która zamienia status HTTP na werdykt, musi osobno
odziedziczyć regułę o 429. Ta reguła jest w projekcie od rundy 60 i i tak nie weszła sama do kodu
napisanego wczoraj.

`measuredOn` w korpusie ma dokładnie **dwa** wiersze: `sendgrid.com → twilio.com` (podwójne
liczenie plików Twilio, poniżej podłogi szumu, opisane w notatkach `corpus.json`) i
`oramasearch.com → orama.com`, gdzie decyzja z 2026-08-10 **sprawdzona ponownie i nadal się broni**:
`oramasearch.com/llms.txt` odpowiada 200, `orama.com/llms.txt` 404, więc przemianowanie wiersza
skasowałoby plik, który vendor naprawdę publikuje.

Nasz własny wiersz na 8.1: **12 z 13 mierzalnych**, nadal oblewamy `oauth_dcr`.

## Runda 2026-08-11 (102): jedenasty przebieg, trzy powierzchnie nietknięte i jedna z nich fałszywa

Zaatakowałem dokładnie to, co poprzednia runda zostawiła jako "nietknięte i warte ataku", i dwie
z trzech powierzchni okazały się zepsute.

**Reguła `browser-only` w MCP była wprowadzona na jednym przypadku i ten przypadek był fałszywy.**
`njal.la/api/mcp` odpowiada odmową CSRF w JSON-RPC, ale `njal.la/api/cokolwiek-innego` odpowiada
tym samym: całe `/api/` to jeden widok Django. Opublikowaliśmy im serwer MCP, którego nigdy nie
zbudowali. Przyczyna jest ogólna i warta zapamiętania: **kontrolka stała w korzeniu hosta, a
badana ścieżka w przestrzeni nazw `/api/`**, więc catch-all w tej przestrzeni był dla niej
niewidoczny. To ta sama lekcja, co `sentry.io` w rundzie 100, gdzie moja sonda pytała o bzdurę
`.md`, a kredyt był za `.json`. Kontrolka to teraz **ostatni segment ścieżki kandydata podmieniony
na nazwę, której nikt nie zarejestrował**, a nie korzeń hosta.

Sprawdzone na całym korpusie zanim to naprawiłem: 1020 sond po sześciu adresach na 170 domen, potem
75 kontrolek w tej samej przestrzeni nazw dla wszystkiego, co odpowiedziało. **Żaden opublikowany
pass nie pochodził ze ścieżki `/api/mcp`**, więc korpus traci jedno fałszywe zdanie i zero punktów.
`betterstack.com/mcp` sprawdzony osobno, bo to jedyny pass na ścieżce apeksu bez uściśnięcia
handshakiem: 401 `invalid_token` przy 404 HTML na rodzeństwie, czyli werdykt jest zdrowy.

**Sonda brzegowa pytała jako klasa crawlerów, o której ten check nie jest.** `user_agents_allowed`
mierzy, czy przepuszczacie agenta działającego na zlecenie człowieka, i w arm-ie robots.txt liczy
wyłącznie klasę `user`. W arm-ie brzegowym pytała jako **ClaudeBot i GPTBot, czyli crawlery od
zbierania danych treningowych**, i na tym oblewała vendora, po czym rada mówiła "wypuśćcie agentów
on-demand". Klasy naprawdę się różnią: `algolia.com` odpowiada ClaudeBot 403, ChatGPT-User 403,
**Claude-User 200**. Sonda pyta teraz jako ChatGPT-User i Claude-User, liczba żądań bez zmian.
Cztery wiersze na tym arm-ie (algolia, froala, lemonsqueezy, scrapingbee) sprawdzone ręcznie na
wszystkich czterech user-agentach: **werdykty bez zmian, zmienia się zdanie i dowód**.

**Pięć rozgałęzionych rad w `fixfirst.ts` sprawdziłem na vendorach, których dotyczą.** Poza
powyższym wszystkie wyszły prawdziwe: martwy link agory to naprawdę 404, cronofy naprawdę nie ma
typów w pakiecie, `here.com` ma na cenniku dokładnie jedno "free" i jest w przycisku, chargebee
naprawdę publikuje metadane AS bez `registration_endpoint` (znalezione dopiero przez
`authorization_servers` w dokumencie protected-resource, bo pod apeksem tego dokumentu nie ma).

**Trasowanie `find_providers` to najsłabsza rzecz w produkcie i teraz wiem o ile.** Napisałem 45
nowych pytań i **zaetykietowałem je przed uruchomieniem**: 40 procent błędu, przy 64/64 na starym
zestawie. Naprawiałem **tylko na połowie**, drugą uruchomiłem raz: **31,8 procent**. Ta liczba
poszła do opisu narzędzia MCP, bo caller ma prawo wiedzieć, że brak wyniku znaczy "nie umiemy
przeczytać pytania". Test jest teraz **zapadką na siedmiu błędach**, a nie progiem zaliczenia,
żeby nikt nie naprawił długu dopasowaniem do testu. Oba zestawy są spalone, dwunasty przebieg pisze
nowe pytania. Procedura w KB: `zestaw-testowy-na-ktorym-stroisz-regule-przestaje-ja-mierzyc`.

Formuła **8.1**, reseed w biegu. Osobno: `corpus.json` i `corpus.csv` publikują teraz `measuredOn`,
czyli domenę, na której wiersz faktycznie zmierzono. `sendgrid.com` oddaje robots.txt
przekierowaniem na `twilio.com/robots.txt`, więc jego wiersz kredytuje plik Twilio SendGridowi,
a twilio.com liczy ten sam plik obok. **Czy taki wiersz ma wypadać ze statystyk, jest następnym
pytaniem i wymaga najpierw policzenia, ilu wierszy dotyczy.**

## Runda 2026-08-11 (101): dziennik wyprowadzony, bo płaciła za niego każda sesja

`STATE.md` miał **3274 linie i 225 kB**, czyli około 55 tysięcy tokenów, i jest **punktem wejścia
po compact**, więc ten koszt płaciła każda następna sesja na starcie, żeby dojść do dwóch sekcji
kontraktu. Po wycięciu zostało **35 kB**, sześciokrotnie mniej.

Podziału **nie da się zrobić jednym cięciem po numerze linii**, i to jest cała trudność: plik nie
był ułożony od najnowszej rundy, bo runda z 2026-08-08 leżała nad sekcjami kontraktu, a rundy
50-57 pod nimi. Cięcie zakresu przeniosłoby połowę historii i zostawiło resztę. Zamiast tego
skrypt zebrał wszystkie nagłówki `## Runda` z obu plików, posortował po numerze i rozdzielił:
jedenaście najnowszych zostaje, reszta idzie do `docs/journal-2026-08.md`.

**Sprawdzenie, że to przeniesienie, a nie kasowanie:** `HEAD:STATE.md` miał 101 rund, po podziale
jest 11 + 90. Zgadza się co do jednej.

Poprawke na catch-all echoujacy sciezke wdrozylem po jednym przypadku (`restate.dev`) i
zweryfikowalem na trzech domenach, wiec sprawdzilem ja na **wszystkich 18 vendorach z przyznanym
plikiem wejscia**: kazdemu wyslana bzdurna sciezka `.md`. **Jedno trafienie i okazalo sie moje.**

`sentry.io` odpowiada na dowolne `.md` 976-bajtowym stubem („You've hit the web UI"), ale jest
kredytowany za plik **`.json`**, a moja sonda pytala tylko o `.md`. Sprawdzenie wlasciwej
przestrzeni nazw: `/.well-known/mcp.json` to prawdziwa karta serwera (106 B JSON-a), a bzdura w tej
samej przestrzeni daje 301. **Kredyt zasluzony, konstrukcja per-namespace robi dokladnie to, po co
powstala.**

Rozklad potwierdza to niezaleznie: 16 vendorow z jednym plikiem, 2 z dwoma, **zero z trzema albo
wiecej**, czyli ksztalt `restate.dev` nie wystepuje juz nigdzie.

Warte odnotowania, ze **sonda byla slepa na przestrzenie nazw i zlapalem to zanim zglosilem
znalezisko**. Gdyby poszlo odwrotnie, wpisalbym vendorowi blad, ktorego nie ma.

## Runda 2026-08-11 (99): wzorzec nocy zapisany poza tym repo

Cztery razy tej nocy pierwsza wersja poprawki byla zla i cztery razy wyszlo to wylacznie dlatego,
ze sprawdzalem **skutek**, a nie kod wyjscia: push, ktory powiedzial DEPLOYED i zostal odrzucony
przez hook; kanarek typow, ktory nie mogl zaspiewac, bo nazwalem go z kropka; podmiana nazwy, ktora
pominela polowe plikow przez wielkie P; wykluczenie licznika, ktore objelo jedno z dwoch wywolan.

Zapisane do wspolnej bazy, bo to nie jest wiedza o StackPicku:
`clad-kb show weryfikuj-skutek-nie-kod-wyjscia-cztery-przypadki-z-jednej-n`. Razem z dwoma
wariantami, ktore tez wyszly tej nocy: **guard porownujacy proxy z prawda zawsze kiedys sklamie**
(brakuje pola w danych, nie sprytniejszego regexa) oraz **zanim wyciagniesz wniosek ze zmiany
liczby, sprawdz, czy miernik jest ten sam** (`slopscore.py` zmienil ksztalt wyniku miedzy dwoma
pomiarami tej samej prozy, `typed_package` skakal przez zimny cache npm).

## Runda 2026-08-11 (98): atak na wlasny licznik, dzien po jego wdrozeniu

Zweryfikowane, co dzialalo: trzy zadania z UA przegladarki daly dokladnie **`/pricing browser · 3`**,
zero podwojnego liczenia, klasyfikacja poprawna w obie strony.

**I znalazlem powazniejsza rzecz.** `/findings agent · 29` to byl **w wiekszosci nasz wlasny skrypt
audytu**, ktory odpytuje `/findings` i `/report` po kazdym reseedzie. Pierwszym wnioskiem z tych
danych byloby „agenci uwielbiaja nasza strone z wynikami", a to bylibysmy my. Licznik zbudowany
wczoraj po to, zeby wiedziec, czy ktokolwiek przyszedl, **mierzylby glownie nas samych**.

Wykluczenie po user-agencie, i **pierwsza wersja nie zadzialala**: nazwalem tylko pobranie korpusu,
a audyt pobiera **osobno takze same strony**. Zmierzone zamiast zalozone: licznik wzrosl z 29 na 43
mimo poprawki. Po nazwaniu obu wywolan pelny przebieg audytu **nie doklada ani jednego renderu**.

Czwarty raz tej nocy pierwsza wersja poprawki byla zla i czwarty raz wyszlo to tylko dlatego, ze
sprawdzam skutek, a nie kod wyjscia.

## Runda 2026-08-11 (97): przeniesienie na domene przygotowane, zeby zakup byl jedyna praca

Adres bazowy byl **zaszyty w czternastu plikach, 28 razy**, i w dwoch odmianach, ktorych nikt nie
odrozniał: metadane i sitemapa spadaja na `localhost:3000` (i **slusznie**, bo w developmencie to
jest prawda), a user-agent i strona dokumentacji na produkcje. Ta druga rodzina siedzi teraz w
`src/lib/site.ts` jako jedno `SITE_URL`, ktore czytaja user-agent, `/docs` i oba skrypty korpusowe.

Procedura przeniesienia dopisana do `docs/naming-audit.md`, szesc krokow, w tym dwa nieoczywiste:
- **Nie wygaszac hosta herokuapp.** Kazdy dotad opublikowany link do scorecardu go nazywa, lacznie
  z czterema audytami. Heroku serwuje go dalej za darmo, wiec stare linki zyja.
- **Reseed po przelaczeniu**, bo **169 zdan detail cytuje user-agenta**, ktory niesie adres.
- Pliki w `public/` (llms.txt, robots.txt, agents.md, agent-signup.md, oba `.well-known`) sa
  statyczne i **nie przeczytaja zmiennej srodowiskowej**, wiec maja wlasny punkt na liscie.

## Runda 2026-08-11 (96): piec decyzji zaudytowanych pomiarem i wykonanych

**1. Retencja: NIE kasujemy, i to jest odwrocenie mojej wlasnej rekomendacji.** 222,8 MB danych
logicznych to po kompresji **74,7 MB storage'u**, indeksy 1,7 MB. Awaria byla problemem zapytania
(`$group` bez spilla), ktory juz naprawilem indeksowanym odczytem na domene, a nie problemem
miejsca. Kasowanie 12 tysiecy dokumentow byloby operacja nieodwracalna dla problemu, ktorego juz
nie ma. **Prog do rewizji: storage powyzej 300 MB**, czyli okolo 700 reseedow stad.

**2. Kuracja, rozstrzygnieta wlasnymi slowami vendorow.**
- `vercel.com` **usuniety**: tytul „Agentic Infrastructure", opis „The autonomous stack for every
  app and agent", slowo storage nie pada ani razu. Nie mamy kategorii hostingu, a wymyslanie jej
  dla jednego vendora jest gorsza odpowiedzia niz przyznanie, ze hostingu nie mierzymy.
- `supabase.com` **przeniesiony do baz danych**: tytul „The Postgres Development Platform", a
  storage jest jednym z siedmiu produktow w opisie.
- `sendgrid.com` i `twilio.com` **oba zostaja**, bo teza o podwojnym liczeniu **upadla na pomiarze**:
  12 z 15 werdyktow zgodnych, ale tylko **6 identycznych co do zdania**, a trzy checki roznia sie
  wprost (`robots_paths_resolve`, `agent_entry_point`, `oauth_dcr`). To nie jest ten sam pomiar.

Korpus: **170 wierszy**, 0 sprzecznosci, 17 liczb bez rozjazdow.

**3. Analityka: zbudowana, nieopublikowana.** Liczona **po stronie serwera w komponentach stron**,
bo middleware chodzi w runtime Edge bez dostepu do bazy, a beacon po stronie klienta wymaga
JavaScriptu i **nie policzylby agentow**, czyli akurat tych, o ktorych ten produkt jest. Zero
ciasteczek, zero identyfikatorow, zero trzeciej strony. Rozbite na **przegladarke i klienta,
ktorego ktos napisal**, czyli po linii, po ktorej dzieli sie caly nasz argument. Widoczne w
konsoli `/app`, **nieopublikowane na stronie**: nasze wyniki i wskazniki bledu sa jawne, bo
czytelnik moze je sprawdzic w korpusie, a licznik odwiedzin to fakt o nas, ktorego nikt nie
zweryfikuje i ktory nikomu niczego nie rozstrzyga.

**4. Monitoring: `/api/health`.** Czyta **jeden raport, nie korpus**, bo zapytanie o korpus jest
tym, ktore padlo, wiec health zbudowany na nim bylby awaria, ktora ma wykrywac. Odpowiada 503 z
powodem, gdy baza milczy. Zewnetrzny poller (UptimeRobot albo podobny) zostaje po stronie
Krystiana, bo wymaga jego konta.

**5. Domena:** jedyna pozycja, ktorej nie da sie wykonac bez niego, bo wymaga karty.

## Runda 2026-08-11 (95): szukalem sposobu, zeby nie pytac Krystiana o retencje, i nie ma takiego

Rozmiar dokumentu rozlozony na czesci: **11,3 kB, z czego scorecard 6,9 i findings 4,2**.
**Zadnych tresci stron, zadnych cial odpowiedzi.** Raport jest juz chudy i nie ma w nim nic do
przyciecia, wiec zmniejszenie przyszlych dokumentow **nie jest droga wyjscia** i jedyna dzwignia
zostaje retencja.

Kuszace „przechowujmy tylko findings i przeliczajmy scorecard przy odczycie" **jest bledem i warto,
zeby to gdzies stalo**: przeliczenie starego raportu biezaca formula **po cichu przescoringowaloby
historie**, a scorecard jest zapisany wlasnie po to, zeby zachowac to, co opublikowalismy wtedy.
Te 6,9 kB to nie duplikat, to zapis.

## Runda 2026-08-11 (94): jedno zapytanie nie powinno zabierac calej strony

Wniosek konstrukcyjny z awarii, a nie tylko jej opis. **Cztery powierzchnie czekaja na te sama
dana** (`/` przez `loadRankings`, `/findings` i `/report` przez `buildIndustryReport`, scorecard
przez `buildComparison`), wiec jedno zapytanie polozylo wszystkie naraz, lacznie ze strona glowna,
ktorej zadaniem jest formularz skanu i argument za jego uruchomieniem.

- **`loadRankings` degraduje sie zamiast rzucac.** Nieczytelny korpus kosztuje teraz ranking i nic
  wiecej: landing renderuje sie bez niego, bo bloki liczbowe byly juz oslonietе warunkami `> 0`.
- **`src/app/error.tsx`**, ktorego nie bylo w ogole, wiec podczas 44 minut awarii odwiedzajacy
  widzial domyslny ekran frameworka. Teraz mowi, ktorego pomiaru brakuje, zapewnia, ze nic nie
  zostalo opublikowane blednie, i **kieruje tam, gdzie dziala**: skan wlasnej domeny i metodologia,
  ktore nie potrzebuja korpusu.

Zweryfikowane, ze nic sie nie zepsulo: piec stron po 200.

## Runda 2026-08-11 (93): analityka (nie ma zadnej), zasieg awarii i koszt retencji

**Awaria trwala co najmniej 44 minuty**, pierwszy 500 o 08:38:02 UTC, ostatni o 09:22:23, czyli do
mojego wdrozenia. Zaczela sie **w trakcie reseedu**, gdy kolekcja przekroczyla prog `$group`.
Pracowalem przez caly ten czas i **nie zauwazylem**. Jedyny powod, dla ktorego w ogole wyszlo na
jaw, to audyt dopiety pod koniec reseedu **godzine wczesniej**. Bez tego strona lezalaby do rana.

**Analityka: nie ma zadnej.** Zero integracji (Plausible, PostHog, GA, cokolwiek). Nie wiemy nic
o ruchu. Za to baza trzyma kazdy skan i kazdego leada, wiec przeczytalem je pierwszy raz:
**ani jeden obcy nie uzyl produktu**. 12 domen poza kuracja, wszystkie nasze testy z 7-10 sierpnia
(`github.com`, `openai.com`, `htmx.org`, `linear.app`, `allegro.pl`, portfolio Krystiana, strona
recenzenta). 25 leadow, w tym `xff-probe-a/b/c`, czyli moje wlasne sondy limitow. **Zero
prawdziwych.** To nie jest zla wiadomosc, tylko brak wiadomosci: nie ma domeny i nie bylo ogloszenia.

**Retencja, zmierzona i czekajaca na decyzje Krystiana:** 12 786 dokumentow, **207 MB, 67 kopii na
domene**. Zostawienie dwoch pokolen na domene usuwa **97 procent** danych (12 786 → 377), pieciu 93
procent. **Nic nie usuwam bez zgody**, bo stare raporty trzymaja trwale linki do scorecardow.

Do rozwazenia przy analityce, gdy przyjdzie czas: **nie dokladac zapisu przy kazdym zadaniu do tej
samej bazy, ktora wlasnie polozyla strone.** Wlasciwy ksztalt to licznik po stronie serwera bez
ciasteczek albo self-hosted Umami: sprzedajemy pomiar cudzych stron, wiec skrypt sledzacy na
wlasnej bylby zlym zartem.

## Runda 2026-08-11 (92): cala strona lezala i to moja wina, a znalazl to straznik dopiety godzine wczesniej

**Produkcja zwracala 500 na kazdej stronie.** Przyczyna w logach byla jednoznaczna:
`Exceeded memory limit for $group, but didn't allow external spilling`. **Dziesiec reseedow w ciagu
doby** rozdmuchalo kolekcje raportow (kazdy raport niesie tresci stron, ktore przeczytal) poza to,
co `$group` utrzyma w pamieci, a `latestPerDomain` bylo zbudowane wlasnie na `$group` po calej
kolekcji.

`allowDiskUse: true` **nie pomoglo**, bo klaster nie pozwala na spill, wiec agregacja poszla w
calosci: `distinct('domain')` plus jedno **indeksowane** zapytanie na domene, osiem rownolegle.
Nic nie trzyma w pamieci wiecej niz jeden raport naraz. Strona wrocila, 171 wierszy, formula 8.0,
0 sprzecznosci.

**Znalazl to audyt dopiety pod reseed godzine wczesniej** i znalazl go tylko dlatego, ze biegnie
automatycznie. Przy okazji sam pokazal wade: wywalil sie stosem wywolan na pustej odpowiedzi.
Teraz ponawia trzy razy i mowi jednym zdaniem, ze **nie zmierzyl niczego**, co jest czym innym niz
rozjazd liczb.

**I drugi straznik zarobil na siebie w tej samej godzinie.** Ten na zerze odmow przy rejestracji
zglosil rozjazd: strona liczy 1, korpus 0. Zadna ze stron nie klamala. `/findings` liczy z
`browserStatus`, ktorego `corpus.json` nie publikowal, wiec moj wzorzec dopasowywal **proze
zamiast faktu**. Naprawione przez opublikowanie faktu (`refusesAgentsAtSignup` per wiersz), a nie
przez poluzowanie straznika. Kazdy moze teraz sprawdzic te liczbe sam.

**Reguła do noszenia:** straznik, ktory porownuje proxy z prawda, predzej czy pozniej zglosi
falszywy alarm. Jesli strona twierdzi cos, czego korpus nie niesie, **brakuje pola w korpusie**,
a nie sprytniejszego regexa.

## Runda 2026-08-11 (91): piec wierszy dodanych, jeden falszywy pozytyw zlapany przez wlasny audyt

**Uzupelnione trzy najciensze kategorie**, kazdy wpis na podstawie wlasnych slow vendora:
`mongodb.com` („a flexible, AI-ready database") i `redis.io` do baz danych, `restate.dev`
(„lightweight runtime ... innately resilient distributed apps") i `windmill.dev` („code-first
orchestration platform") do zadan w tle, `timekit.io` („Scheduling, at scale") do kalendarzy.
**Odrzucone po sprawdzeniu:** `fauna.com` (nie odpowiada w ogole) i `hookdeck.com` (bramka
webhookow, dwuznaczna polka, a dwuznacznych filowan wlasnie unikamy). Korpus: **171 wierszy**.

**I audyt natychmiast zglosil sprzecznosc na jednym z nowych wierszy.** `restate.dev`:
`agent_entry_point` cytowal trzy znalezione pliki wejscia, a `signup_reachable` mowil, ze nic nie
linkuje do rejestracji. Sonda kontrolna potwierdzila: **strona odpowiada 200 markdownem na dowolna
sciezke `.md`**, lacznie z wymyslona przeze mnie.

Kontrolka na catch-all istniala i **przegrala z szablonem, ktory wpisuje w tresc sciezke, o ktora
pytano**. Stub brzmi „# Restate - /<sciezka> A markdown rendering of this page is not available",
wiec `/agent-signup.md` mial 227 bajtow, `/skill.md` 213, kontrolka jeszcze inna liczbe, a
porownanie bylo **na dokladnej rownosci dlugosci**. Trzy kopie jednej odmowy poszly jako trzy pliki
wejscia.

Teraz porownywane sa cialaod kontrolki i sondy **po usunieciu segmentow sciezek z obu**.
Zweryfikowane, ze nie lamie prawdziwych plikow: `sentry.io` zachowuje swoj `mcp.json`, a
`resend.com` swoj `agent.md`. **Formula 7.9 → 8.0.**

Pierwsza wersja poprawki **nie zadzialala i sprawdzilem to zamiast zalozyc**: usuwalem z tresci
`/agent-signup.md` z rozszerzeniem, a w tresci jest `/agent-signup` bez niego.

## Runda 2026-08-11 (90): straznik liczb biegnie tam, gdzie liczby sie zmieniaja

`npm run audit` znalazl dzis dwie prawdziwe rzeczy i obie tylko dlatego, ze **akurat go
uruchomilem**. Skrypt, ktory chroni przed dryfem, a odpala sie z pamieci czlowieka, jest tym samym
rodzajem strazy co check, ktory po cichu przestal pasowac.

Dopisany na koncu `scripts/reseed.sh`, czyli **dokladnie w momencie, w ktorym liczby sie zmieniaja**.
Niefatalny swiadomie: reseed, ktory doszedl do konca, jest wart zachowania nawet gdy audyt zglosi
rozjazd, a komunikat mowi wprost, ze korpus jest zaciagniety i to liczby wymagaja sprawdzenia.

## Dziennik wcześniejszych rund

Rundy 1-89 są w `docs/journal-2026-08.md`. Wycięte 2026-08-11, bo ten plik czyta się przy
każdym compactcie i 225 kB historii kosztowało około 55 tysięcy tokenów na starcie sesji.
