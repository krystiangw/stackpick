# StackPick: stan na 2026-08-09 (rano)

Punkt wejścia po compact. Czytaj przed pracą, razem z `ARCHITECTURE.md`.
**Dwie sekcje na dole tego bloku, "Co zostało z audytów" i "Następne kroki merytoryczne", są
kontraktem dla watchdoga. Aktualizuj je przy każdej zamkniętej pozycji, inaczej watchdog czyta
listę sprzed trzydziestu rund.** Dziennik rund jest niżej i jest historią, nie listą zadań.

## Stan na teraz, w dziesięciu liniach

- Formuła **7.4**, korpus **155 domen w 24 kategoriach**, `npm run audit` pilnuje **14 liczb**.
  `storyblok.com` nie odpowiada dyno przy siedmiu reseedach z rzędu, a z tej maszyny odpowiada 200
  przez Netlify: to fakt o naszym ruchu, nie o dostawcy, i dlatego wypadł z korpusu.
- Opublikowane liczby: **5 ze 155** przechodzi wszystkie trzy bariery, **7 ze 129** plików llms.txt
  wskazuje na strony, których nie ma, **0 ze 155** serwuje agentom mniej tekstu niż przeglądarce.
- `npm run audit`: **0 sprzeczności w wierszach, 10 liczb ze stron zgodnych z danymi**.
- Siedem przebiegów adwersaryjnych: **16,7 → 2,2 → 3,9 → 2,0 → 0,94 → 7,9 → 1,4 procent błędu**
  (4 na 290). Szósty był skokiem w górę, bo zaatakował trzy zmiany napisane w jedną noc i
  wszystkie trzy się posypały; siódmy potwierdził naprawy i znalazł cztery nowe. Wszystkie
  zamknięte w rundzie 55.
- Znalezisko rynkowe: **41 z 54 vendorów z żywym MCP publikuje RFC 7591**, poza tą grupą 23 ze 102.
  DCR przyszło z wymogu specyfikacji MCP, nie z decyzji o wpuszczeniu agentów. **36 z 54 nadal
  nie dokumentuje żadnej drogi do klucza.**
- Odmowy rejestracji wymierzone w agenty: **0 udowodnionych na 156**. Bariera, którą umiemy
  udowodnić, to **72 ze 156** formularzy rejestracji nieobecnych w serwowanym HTML-u.
- Materiały wyjściowe (`outreach/`) przebudowane na 6.2, wszystko dalej **jako szkice**.
- Skanujemy sami siebie: **12 z 13 mierzalnych**, oblewamy `oauth_dcr` i piszemy o tym wprost.
- Budżet skanu **25 s** (Heroku zabija po 30). Reseed **raz na zestaw zmian**, nie po każdej:
  nasz własny ruch zaczął produkować 429 u `postmark.com` i odmowy u `launchdarkly.com`.

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

## Runda 2026-08-08: co zrobione (formuła 2.2)

1. **"Napraw to najpierw" z deltą** (`src/lib/fixfirst.ts`, `src/components/fix-first.tsx`).
   Kroki sortowane po nakładzie pracy, nie po punktach, z policzoną arytmetyką i nazwanymi
   konkurentami, których przeskakujesz. Ten sam plan otwiera maila zamiast listy "also failing".
   Produkcja: *"Fix the 3 cheapest items below and 8/16 becomes 13/16, past cloudflare.com,
   supabase.com and vercel.com."*
2. **Limit przestał zabijać lejek** (`src/lib/scan-gate.ts`). Skan sprzed <15 min idzie ze
   store'u za darmo, limit liczy się per domena (5/h) z luźnym sufitem per IP (30/h), a odmowa
   pokazuje najlepszą kartę, jaką mamy, plus pole na maila (`source: rate-limited`,
   lead bez `reportId`).
3. **Udostępnianie** na raporcie: kopiuj link, mail z gotową treścią, LinkedIn.
4. **Discovery sonduje subdomeny** `docs./developer./developers./api.` oraz
   `app./dashboard./console./accounts.` gdy nawigacja jest w JS. stripe.com i allegro.pl
   wreszcie mają docsy.
5. **npm przestał zgadywać.** Placeholdery z dokumentacji odrzucane; nazwa nieznana rejestrowi
   idzie do wyszukiwania zamiast twardego zera; a wynik wyszukiwania daje punkt **tylko** gdy
   nazwa to domena/brand/`@brand/brand-js` albo homepage stoi na tej domenie. Reszta to N/A.
   *Dlaczego to ważne:* allegro.pl dostawało punkt za `worker-nodes`, wewnętrzną bibliotekę.
6. Jedna szerokość kontenera (header przestał wystawać), `autoFocus` tylko przy `pointer: fine`,
   ukończone kroki dostają ptaszek zamiast przekreślenia.

**Powtarzalność zmierzona** (3 świeże skany × 3 domeny, produkcja, przez konsolę):
resend.com 14/14/14, cloudinary.com 8/8/8, tiptap.dev 9/9/9. Zero niestabilnych checków.
Uwaga: resend spadł z 15 na 14 przez próg `docs_without_js` (1 778 znaków przy progu 2 000) -
to zmiana po ich stronie, nie nasza, ale pokazuje, że próg jest ostry.

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
- **Dziesiąty przebieg adwersaryjny.** Baseline: **0,77 procent**. Warte ataku: **sonda nazwanymi
  crawlerami** (jedna strona, nie serwis, i to jest opublikowany limit), **klasyfikacja CTA po
  czasowniku** (siódma zmiana `self_serve`), **próbka llms.txt co N-ty link**, słownik
  `find_providers`, i czy poprawka głosowania 429 nie zmieniła czegoś, czego nie sprawdziłem.
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

## Runda 2026-08-09 (50): czwarty przebieg adwersaryjny i formuła 7.2

**2,0 procent błędu, 11 na 547 werdyktów**, wobec 3,9 na 6.3. Dowiedzione: sondowanie punktu
wejścia (156/156, obie strony ataku) i kanoniczna ścieżka cennika (11/11). Niedowiedziona:
atrybucja npm, bo cztery z czterech jej błędów siedzą w logice, którą ten przebieg miał
sprawdzić.

**Najważniejsze znalezisko nie było błędem werdyktu, tylko naszą metodologią.** Reguła „429 to
zawsze nasz ruch" prała najbardziej wrogą agentom konfigurację w korpusie: `pandadoc.com` i
`defer.run` odpowiadają 429 z `x-vercel-mitigated: challenge`, tokenem wyzwania i bez
`Retry-After`, czyli Vercel Attack Challenge Mode. Wyjmowaliśmy im za to sześć checków z
mianownika. Rozróżnienie idzie teraz po znaczniku wyzwania, nie po statusie: przeglądarka
rozwiązuje je niewidocznie, klient HTTP nigdy, więc to najostrzejsza odpowiedź na pytanie,
które ten skan zadaje. Prawdziwy rate limit dalej czyta się jako nasza wina.

Reszta naprawiona: cztery firmy czytane jako „brak darmowego progu", bo wzorzec wymagał liczby
dni przy „free trial"; `usefathom.com` z cudzym pakietem (`fathom-typescript` należy do
fathom.video); i sześć zdań o MCP opisujących pomiar, którego nie było (wymówka o rozmiarze
pliku zasłaniająca rozstrzygniętą sondę, 405 ze strony marketingowej, nazywanie adresu, o który
pytaliśmy, zamiast tego, który odpowiedział).

**Diff korpusu 7.1 → 7.2, i to on złapał moje własne przestrzelenie:**

```
 12  mcp_present            unmeasured -> fail    <- wymówka zdjęta z 12 wierszy
  3  answers_plain_request  unmeasured -> fail    <- ściany wyzwań policzone
  4  self_serve             fail/unmeas -> pass   <- wzorce darmowego progu
  3  typed_package          pass -> unmeasured    <- REGRESJA, moja
  1  typed_package          pass -> fail          <- REGRESJA, moja
```

Reguła o organizacji na GitHubie wyrzuciła `@dropbox/sign`, `@lemonsqueezy/lemonsqueezy.js`,
`@savvycal/appointments-core` i `@statsig/js-client`, żeby złapać jeden fałszywy `fathom-typescript`.
Poprawka: pakiet we własnym scope dostawcy nigdy nie jest kwestionowany tym, gdzie kod jest
lustrzany, a organizacja liczy się tylko w kierunku **skrócenia** nazwy (`dropboxsign` publikuje
z `github.com/dropbox`), nigdy wydłużenia, bo nazwa plus drugie słowo to sposób nazywania firmy
siostrzanej, a nie skracania własnej.

**Trzy audyty strategii cenowej** (komparatory rynkowe, badge, ICP i marża) opisane w sekcji
„Decyzje po stronie Krystiana". Najtwardszy wniosek: problem, który mierzy darmowy skan, jest
**jednorazowy**, więc retainer za ponowny pomiar tych samych checków nie jest uczciwy.

## Runda 2026-08-09 (51): piąty przebieg i twierdzenie, któremu przeczyły nasze dane

**0,94 procent błędu, 6 na 640**, wobec 2,0 na 7.1. Ale najważniejsze znalezisko nie było błędem
werdyktu: **sekcja koniunkcji opublikowana tego ranka twierdziła rzecz, której przeczył sąsiedni
check w tym samym wierszu JSON-a.** Nagłówek mówił „14 dostawców, z których nienadzorowany agent
mógłby faktycznie skorzystać", a pięciu z tych czternastu ma CAPTCHĘ w serwowanym HTML-u
rejestracji: browserbase, chargebee, firecrawl, phrase (recaptcha) i polar.sh (turnstile). Noga
„rejestracja, do której agent dotrze" używała `signup_reachable` i **nigdy nie pytała o
`signup_no_captcha`**, czyli o check mierzący dokładnie tę barierę, od której wzięła nazwę.
Naprawiona noga, nie nagłówek.

Drugi błąd w tej samej sekcji: `rendersFormWithoutJs` sprawdzało `body.includes('<form')`, a
`app.hygraph.com/signup` serwuje `<form method="post" action="/login"></form>`, pusty element z
zerem pól. Teraz wymagane są dwa pola, bo samotny ukryty token CSRF nie jest polem.

**Liczba spadła z 14 na 6, nie na 8, jak szacowałem:** próg dwóch pól wyrzucił też `auth0.com`
i `deepl.com`. Wszystkie sześć zweryfikowane niezależnie z maszyny, która ich nigdy nie dotykała
(`api.video`, `browserless.io`, `contentful.com`, `honeybadger.io`, `resend.com`, `supabase.com`:
formularz, pola, zero CAPTCHY). Największa grupa „o jeden krok" urosła z 40 na **48 na samej
rejestracji**.

Trzy pozostałe naprawy: przycisk „Get started for free" z nawigacji przestał bić zmierzoną
nieobecność cen (`here.com` serwuje 850 znaków nawigacji i Contact Us); zdanie „nie udało się
zidentyfikować pakietu" przestało twierdzić, że wyszukiwanie wróciło puste, kiedy wróciło z CLI
(`pdfmonkey.io` publikuje `@pdfmonkey/cli` z adresu `@pdfmonkey.io`); odmowa MCP nazywa teraz
wszystkie **pięć** sondowanych adresów zamiast dwóch, bo na `kinde.com` pominięty
`api.kinde.com/mcp` jest tym, który odpowiada.

**Wzorzec po raz piąty, tym razem najczystszy:** naprawa atrybucji npm przeniosła błąd z własności
na selekcję, poszerzenie wzorców darmowego progu przeniosło go z gubienia trialów na liczenie
nawigacji, a koniunkcja naprawiła gaming progu i pominęła check mierzący własną barierę.

## Runda 2026-08-10 (52): naprawa selekcji npm zmierzona i odrzucona

Wynik negatywny, i wart zapisania dokładnie dlatego. Reguła brzmiała: **pakiet deklarujący się
jako SDK albo klient bije taki, który tylko nosi markę**, dopasowanie po nazwie zawsze, po opisie
tylko przy opisie krótszym niż 120 znaków (bo `@xata.io/api` ma tam wklejony README). Wyglądała
na wąską i celną.

Zmierzona przez `npm run attribution snapshot` plus dwa `replay` na tych samych 156 zrzutach,
żeby to, co się ruszy, było kodem, a nie pogodą w rejestrze. **Ruszyły 32 domeny, z czego dwie
w dobrą stronę.**

```
directus.io   directus            -> @directus/sdk           typed False -> True   <- cel
xata.io       @xata.io/api        -> @xata.io/codegen        typed False -> True   <- i tak zły brat
stripe.com    stripe              -> @stripe/extensibility-sdk
resend.com    resend              -> @resend/chat-sdk-adapter
twilio.com    twilio              -> twilio-sync
posthog.com   posthog-js          -> @posthog/agent
mapbox.com    mapbox-gl           -> @mapbox/mapbox-sdk      typed True -> False
mux.com       @mux/mux-node       -> mux-embed               typed True -> False
algolia.com   algoliasearch       -> None
... 23 więcej
typed 142 -> 141, „nie zidentyfikowano pakietu" 9 -> 10
```

Przyczyna jest oczywista po fakcie i nie była przed: to **twardy filtr**, więc odrzuca prawdziwy
pakiet wejściowy zawsze, gdy jakikolwiek brat ma w nazwie „sdk" albo „client", a duzi dostawcy
mają takich braci dziesiątki. Zrewertowane, nic nie poszło na produkcję.

**Czego to uczy poza tym jednym przypadkiem:** naprawa celowała w dwa wiersze i dotknęła 32.
Harness replayu jest jedynym powodem, dla którego to widać przed deployem, i kosztuje dwa
przebiegi po ~25 minut. To jest tańsze niż jeden zły reseed.

**Czego NIE robić przy następnym podejściu:** nie warunkować na tym, że brat ma typy. Check mierzy
typy, więc wybieranie pakietu po typach jest wybieraniem pakietu pod odpowiedź, którą chcemy
opublikować. Dowód musi być niezależny od mierzonej cechy, czyli: pakiet **nazwany w dokumentacji
dostawcy**. Docsy directusa nazywają `@directus/sdk` trzy razy, a mimo to nie wygrał, więc
prawdziwy błąd może siedzieć w scrapowaniu docsów, nie w rankingu.

## Runda 2026-08-10 (53): druga próba selekcji npm, też odrzucona pomiarem

Hipoteza z rundy 52 („czytamy docsy za płytko") **sprawdzona i obalona**: podanie atrybucji
głębokiej strony SDK Directusa, z siedemnastoma wystąpieniami `@directus/sdk`, nie zmieniło
wyniku. Dalej `directus` przez `registry-search`.

Prawdziwa przyczyna okazała się inna i jest ogólna: `namedPackages` rozpoznaje **tylko** linki
`npmjs.com/package/...` i `npm install X`. Strona SDK Directusa nie ma ani jednego snippetu
instalacyjnego, jedyne linki do npmjs prowadzą do `node-fetch`, `ofetch` i `whatwg-fetch`, czyli
zależności tego SDK, a wszystkie wystąpienia `@directus/sdk` siedzą w instrukcjach `import`.
Skala w baseline: **dokumentacja dostawcy rozstrzyga 5 wierszy na 156, a rejestr 125.**

Próba: dodać ekstrakcję z `import ... from '...'`, `require('...')` oraz `pnpm add`, `yarn add`,
`bun add`. Zmierzone tym samym replayem. **Ruszyły 2 wiersze i oba w złą stronę:**

```
betterstack.com   None -> routes           (nazwa z importu, nie pakiet dostawcy)
calendly.com      None -> usabilla_live    (cudzy widget analityczny)
```

Zamiana uczciwego „nie zidentyfikowaliśmy pakietu" na fałszywe twierdzenie o nazwanej firmie jest
gorsza niż problem, który miała naprawić. Zrewertowane, nic nie poszło na produkcję.

**Konkretny trop dla następnego podejścia:** `pickNamedPackage` zwraca `names[0]` bezwarunkowo,
gdy nazwa jest jedna. To zamienia jeden przypadkowy import w atrybucję. Dopóki ekstrakcja jest
szeroka, ta gałąź musi wymagać, żeby nazwa niosła markę dostawcy.

**Stan pozycji: problem realny, dwie hipotezy obalone pomiarem, żadnej zmiany w kodzie.**
Zdania o `directus.io` i `xata.io` są dosłownie prawdziwe o pakiecie, który nazywają, więc
publikowanie ich dalej jest tańsze niż trzecia próba na wyczucie.

## Runda 2026-08-10 (54): szósty przebieg wywrócił wszystko, co napisałem w nocy

**7,9 procent (17 na 216)** wobec 0,94 na 7.2. Skok w górę jest prawdziwy i pokazuje, na czym
polega ryzyko pracy w jednym ciągu: trzy zmiany napisane w jedną noc, żadna nie atakowana
niezależnie, wszystkie trzy wadliwe.

**Obalona: strażnik cennika.** Tłumienie sygnału darmowego progu wszędzie tam, gdzie nie dopasowała
się cena, zaprzeczyło podanemu wprost progowi na `qdrant.tech` (cztery nazwane progi i „Free Tier
Free forever" w 6 934 znakach), `daily.co`, `split.io` i `crowdin.com`. Zdanie „nothing about your
tiers survives without JavaScript" było fałszywe na **9 z 12** wierszy, które je nosiły.

Naprawiane **dwa razy**, bo pierwsza poprawka wzięła złe kryterium. Progiem była długość tekstu, a
`here.com` ma 850 znaków i `daily.co` 1 230, więc długość ich nie rozdziela. **Rozdziela je to, co
się dopasowało:** „Get started for free" to przycisk, „10 000 darmowych minut miesięcznie" to zdanie
o produkcie. Stąd `CTA_WORDING` i reguła: tłum tylko wtedy, gdy **każdy** sygnał jest wołaniem do akcji.

**Niedowiedziona: reguła formularza.** Próg dwóch pól, który sam nazwałem arbitralnym, nie był
problemem. Problemem było liczenie inputów w całej stronie: przechodziło pole wyszukiwarki
(`commercetools.com`), newsletter ze zablokowanym submitem (`payloadcms.com`) i formularz
`api.video`, którego jedyny input jest `disabled`, a checkbox zgody leży poza formularzem.

**I ta naprawa też miała buga, złapany dopiero na liczbie po reseedzie.** Nagłówek spadł z 6 na 3,
bo `\bdisabled\b` dopasowywało **`disabled:opacity-50` w klasie Tailwinda**, więc każdy ostylowany
input czytał się jako niedostępny i wypadły `supabase.com`, `resend.com` i `browserless.io`.
Wartości atrybutów są teraz usuwane, zanim szukamy słowa.

**Twierdzenie na `/findings` obniżone do tego, co mierzymy.** Nagłówek mówił „an unattended agent
could actually use", a `supabase.com` i `contentful.com` bramkują rejestrację hCaptchą montowaną
przez JavaScript. Nasze własne zdanie w wierszu to przyznaje, nagłówek zapominał. Teraz brzmi
„clear all three barriers we can measure", a pod listą stoi nazwana ślepa plamka instrumentu.

**Jedno znalezisko przebiegu sprawdzone i FAŁSZYWE.** Rzekome 44 wiersze fałszywie twierdzące o
`llms-full.txt`: agent testował wyłącznie apeks, a pliki leżą na subdomenie docs, dokładnie tam,
gdzie patrzy nasza sonda (`docs.kinde.com/llms-full.txt` to 2,7 MB `text/plain`,
`docs.honeybadger.io` 2,1 MB, `docs.growthbook.io` i `docs.knock.app` po ~2,1 MB). Przyjęcie tego
na wiarę zepsułoby 44 poprawne wiersze. **Raport subagenta falsyfikuje się przed użyciem, zawsze.**

Stan po naprawach: **5 ze 155** spełnia wszystkie trzy nogi (`browserless.io`, `contentful.com`,
`honeybadger.io`, `resend.com`, `supabase.com`), 56 jest o jeden krok, 50 z nich na rejestracji.

## Runda 2026-08-10 (55): siódmy przebieg, 1,4 procent, i cztery naprawy

**1,4 procent (4 na 290)** wobec 7,9 na 7.3. Naprawy z rundy 54 potwierdzone niezależnie.
Cztery nowe błędne werdykty, wszystkie zamknięte, i przy trzech z nich **przyczyna okazała się
inna niż w raporcie przebiegu**, co jest tu regułą, a nie wyjątkiem.

**Reguła formularza przebudowana od podstaw, bo liczenie pól nigdy nie było przybliżeniem
rejestracji.** `browserless.io` przechodził na **banerze cookies**: jedyny `<form>` to widget zgód
z dwoma checkboxami, a pole email leży poza jakimkolwiek formularzem, i ta firma była na
opublikowanej liście. W drugą stronę `docuseal.com` i `betterstack.com` oblewały, mając działające
rejestracje serwerowe z polem email i celem POST. Nowa reguła: formularz musi mieć **pole pytające,
kim jesteś** (email, hasło, albo tekst o nazwie wskazującej to samo) **i dokąd to wysłać**
(`action` albo niezablokowany przycisk).

**Własny błąd po drodze:** użyłem `isFillable` do oceny przycisku, a ta funkcja z definicji odrzuca
`type=submit`, więc wypadły `supabase.com`, `resend.com` i `contentful.com`, których formularze
React-owe wysyłają z handlera i nie mają `action`. Rozdzielone na `isAvailable` (przyciski) i
`isFillable` (pola).

**`strapi.io` nie przechodził przez „Free updates for upcoming features", tylko przez `+$0,60 per
GB`.** Wzorzec `\$0(?![.\d])` nie wykluczał **przecinka dziesiętnego**, więc europejski zapis czytał
się jako darmowy próg, przy najtańszym planie 35 USD za projekt.

**Luka, nie fałszywy pozytyw: „try for free" nie pasowało do żadnego z siedemnastu wzorców.**
`replicate.com` pisze to cztery razy, `sinch.com` trzy, i obu mówiliśmy, że nie mają wzmianki o
darmowym progu. Zdanie też poprawione: mówi teraz, że jedyna wzmianka jest wołaniem do akcji,
zamiast twierdzić, że jej nie ma.

**Koniunkcja: nieznana noga to nie porażka.** Grupa „o jeden krok" wymieniała 48 dostawców
oblewających na rejestracji, a **dwunastu miało rejestrację, której nigdy nie zmierzyliśmy**.
Metodologia mówi wprost, że raportowanie własnego ruchu jako odmowy byłoby oskarżeniem, a ten
akapit robił to z nazwiskami. **I ta naprawa też przestrzeliła:** wymaganie, żeby obie kontrole
rejestracji były zmierzone, wycięło grupę z 56 na 16, bo CAPTCHA jest nieoznaczalna **dokładnie
dlatego**, że formularza nie ma. Agent nie dosięgnie formularza, którego nie ma. Po korekcie:
**6 ze 155 przechodzi wszystko, 44 o jeden krok, 35 na rejestracji**, 38 wierszy z nieznaną
rejestracją poprawnie wyłączonych.

`auth0.com` przechodzi teraz `signup_reachable`, co **obala** wcześniejszą diagnozę „to kwestia
tego, skąd pytamy": to była reguła, nie punkt obserwacyjny. `storyblok.com` nadal wypada, przy
piątym reseedzie z rzędu, i to zostaje faktem o naszym ruchu.

## Runda 2026-08-10 (56): ósmy przebieg, konkurencja i indeks dla agentów

**Ósmy przebieg: 1,29 procent** (4 na 311), ten sam poziom co siódmy, bez regresji. Sześć znalezisk
zamkniętych, ale dwie rzeczy ważniejsze od wskaźnika.

**Pomiar przed wdrożeniem uratował poprawkę drugi raz z rzędu.** Chciałem zaostrzyć `self_serve` tak,
żeby wzmianka złożona wyłącznie z przycisku zawsze oblewała. Przeliczyłem na 116 przechodzących
cennikach: takich wierszy są trzy, i **dwa mają prawdziwy darmowy próg** (algolia.com „Free to start",
calendly.com „Always free"), tylko tych sformułowań nie było w liście wzorców. Bez dopisania ich
zamieniłbym jeden błąd na dwa.

**Klasa błędu do zapamiętania: `[].every()` zwraca `true`.** Strona **bez ani jednej wzmianki o
„free"** wchodziła w gałąź mówiącą „twoja jedyna wzmianka to przycisk". `anvil.co` i `radar.com`
zawierają to słowo zero razy.

Reszta ósmego przebiegu: `input type=submit` to trzeci sposób wysłania formularza (kosztował
`flagsmith.com` rejestrację z sześcioma polami); `cockroachlabs.com` i `swell.is` przeniosły
rejestrację na **własną markę pod innym TLD** i były publikowane jako niemające do niej linku, co
wyrzucało je z lejka i z mianownika.

**Odrzucone zgłoszenie przebiegu:** rzekomy „cross-tenant leak" na agora.io okazał się ich własnym
endpointem zbudowanym na produkcie MCP Algolii. **Trzeci raz w tym projekcie zgłoszona przyczyna
była zmyślona.**

### Konkurencja, zbadana

`agent-ready.dev`: 70 checków plus 23 dostępnościowe, REST API, serwer MCP, GitHub Action, badge,
płatność x402, Pro za 19 USD. Zbudowane wokół Vercel Agent Readability Spec. **Zero z ich checków nie
pyta o rejestrację, klucz ani CAPTCHĘ** (sprawdzone w ich `llms-full.txt`: `signup` 0, `provisioning`
0, `captcha` 0). Ich własny opis: Discovery, Structure, Context. Robią 70 checków na etapie, który
nasz korpus mierzy jako rozwiązany w 95 procentach.

`kodustech/agent-readiness`: ocenia **cudze repozytorium** (linting, testy, CI), oś do wewnątrz.
Nie konkurencja.

**Wzięte od nich dwa checki**, oba wdrożone: żywotność linków w llms.txt i cloaking na dokumentacji.
**Nie wzięte:** P1-P23, bo to checki SEO (canonical, meta, JSON-LD) na etapie, który i tak wszyscy
zaliczają.

**Pierwsze liczby z nowych checków, i pierwsza wpadka:** check linków wskazał 8 nieaktualnych map, ale
`play.honeycomb.io` odpowiada **404 na HEAD i 200 na GET**. Kandydat jest teraz potwierdzany GET-em.
Cloaking na docsach: **0 na 155**, czyli wynik zerowy wart opublikowania.

### Indeks dla agentów (`find_providers`)

Nowe narzędzie MCP odpowiadające na pytanie **wołającego**, nie dostawcy: „z kim faktycznie skończę".
Świadomie **eliminacja, nie rekomendacja**: nie mierzymy, czy dostawca pasuje do zadania, a sprzedajemy
tym samym firmom naprawę, więc ranking od nas byłby osądem, którego nie zrobiliśmy, sprzedawanym przez
zainteresowanego. Trzy kubełki: przeszedł / zatrzymuje się / niemierzalny. Zmierzone na produkcji:
upload plików 1 z 10, e-mail transakcyjny 1 z 6, feature flags **0 z 7**.

To odwraca problem sprzedaży: dostawca dowiaduje się, że **agent zapytał o jego kategorię i go nie
dostał**, czyli premisa rozmowy jest jego, nie nasza.

## Runda 2026-08-10 (57): dziewiąty przebieg, 0,77 procent, i nagłówek, którego nikt nie zna

**0,77 procent (4 na 523), najlepszy wynik projektu.** Ale trzy znaleziska ważniejsze od wskaźnika.

**Publikowaliśmy pełną kartę o niewłaściwej firmie.** `anvil.co` to producent części precyzyjnych
z przyciskiem JOIN WAITLIST; firma od e-podpisów to `useanvil.com`. Zweryfikowane osobiście przed
zmianą. Najgorsza klasa błędu w tym projekcie: twierdzenie faktograficzne o nazwanej firmie, która
nie jest tą, o którą chodziło.

**429 przegłosowywał 200, wbrew naszej własnej regule.** `deepl.com` odpowiedział 200, 429, 429, a
głosowanie większościowe uczyniło 429 statusem reprezentatywnym, więc limit stał się **zmierzoną
odmową**. Pociągnęło to cztery checki do „nieoznaczalne" i **wpuściło DeepL do kubełka
„przeszedł wszystkie bariery"** w `find_providers`, czyli dwa z czterech błędów przebiegu z jednej
przyczyny. 429 nie głosuje, chyba że każda próba nim była.

**Pytaliśmy nagłówkiem, przeciwko któremu nikt nie napisał reguły.** To prawdopodobnie
najważniejsza poprawka pomiarowa w projekcie. Zmierzone osobiście na tych samych URL-ach:

```
ClaudeBot   amplitude 404 (84 B)    algolia 403
GPTBot      amplitude 404 (84 B)    algolia 403
StackPick   amplitude 200 (263 kB)  algolia 308
Chrome      amplitude 200 (263 kB)  algolia 308
```

Wiersz algolii mówił „No on-demand agent is blocked", co było **prawdą o robots.txt i fałszem na
brzegu sieci**. Sondujemy teraz dokumentację także jako ClaudeBot i GPTBot. Testujemy **odmowę, nie
cieńszą treść**: dziesięć serwisów na Mintlify serwuje Claude-Userowi czysty markdown zamiast
480 kB powłoki JS, czyli mniej tekstu i przeciwieństwo problemu.

**`find_providers` kierował 11 z 27 pytań źle**, bo dopasowywaliśmy gołe tokeny do **naszej własnej
prozy**: „let users sign in with Google" trafiało do File upload, bo nasz opis storage zaczyna się
od „let users". Jawny słownik terminów, których w naszej prozie nie ma, frazy bijące tokeny, remis
zwracający nic. **20 na 20.**

**Próbka llms.txt brała pierwsze pięć linków, a zdanie mówiło „sampled".** Teraz dwanaście
rozłożonych po całym pliku, bo zgnilizna siedzi w ogonie: branie głowy przegapiało martwe linki
w ośmiu plikach, które przechodziły.

**`self_serve`, siódma zmiana: klasyfikacja po kontekście, nie po wzorcu.** `june.so` to jeden
nieocenowany plan i przycisk „Start free trial", a przechodziło, podczas gdy `here.com` i
`sinch.com` oblewały na tym samym kształcie. Lista fraz nie mogła tego naprawić, bo `free trial`
jest wzorcem zdaniowym. Rozstrzyga **czasownik**: „Start free trial" to kontrolka, „14 day free
trial, no credit card required" to fakt o produkcie.

## Runda 2026-08-10 (61): kategoria Domeny i DNS, najgorsza w korpusie

Pomysł Krystiana, i okazał się mocniejszy niż większość tego, co już mamy. 12 rejestratorów
(`namecheap`, `porkbun`, `dynadot`, `name.com`, `gandi`, `dnsimple`, `godaddy`, `hover`,
`opensrs`, `inwx`, `netim`, `njal.la`), korpus rośnie do **167 wierszy w 25 kategoriach**.

**Wynik: 46,2 procent punktów wobec 62,8 dla reszty korpusu, czyli najgorsza kategoria, jaką
zmierzyliśmy.** Druga jest Commerce z 47,7. Mocniejsza liczba: **`agent_entry_point` przechodzi
0 razy na 12**. Ani jeden rejestrator nie ma drzwi zbudowanych dla maszyny, w kategorii, której
całym zadaniem jest sprzedanie rzeczy, którą agent musi kupić przed wszystkim innym. Przez
`find_providers` zero z dwunastu przechodzi wszystkie bariery, dziesięć zatrzymuje się na pierwszej.

Średnia liczba **mierzalnych** sprawdzeń to 10,8 z 16 wobec 14,4 dla reszty. Czyli te strony
odmawiają, zanim w ogóle dojdzie do pytania o API: `answers_plain_request` ma 2 porażki i 2
niezmierzone na 12, a w reszcie korpusu to rzadkość.

**To pierwsza kategoria, w której ścianą są pieniądze, a nie formularz**, więc `self_serve` jest
`notApplicable` albo niemierzalne w 8 wierszach na 12. To jest pierwszy prawdziwy test, czy
mianownik mierzalny jest uczciwy, czy tylko wygodny, i przeszedł: żaden wiersz nie dostaje kary
za brak darmowego progu, którego w tej branży nie ma.

Kontekst, dla którego to trafiło do korpusu akurat teraz: sami kupujemy domenę. **Cloudflare
wystawia `POST /accounts/{id}/registrar/registrations`, operację płatną obciążającą kartę konta**,
czyli pełną ścieżkę zakupu przez API. Namecheap wymaga 50 dolarów salda albo 20 domen plus IP na
białej liście, GoDaddy co najmniej 10 domen na koncie. Ten rozrzut jest argumentem sprzedażowym:
rejestrator, którego agent potrafi użyć, zostaje domyślnym rejestratorem każdej strony zbudowanej
przez agenta.

## Runda 2026-08-10 (60): wszystko, co znalazł dziesiąty przebieg

**Dziesiąty przebieg adwersaryjny: 0,39 procent błędu** (1 na 256), wobec 0,77. Dowiedzione:
sonda nazwanego crawlera (109 na 109), reguła 429 (53 na 53), kuracja (155 apeksów przemiecionych
pod kątem przekierowań). Wszystkie cztery znaleziska zamknięte.

**1. `find_providers` trasował 23 procent pytań źle.** Zbudowany stały zestaw 61 pytań
(`scripts/routing.mts`): 21,3 procent błędu przed zmianą, 0 po. **To była iluzja.** Zestaw 20
pytań, których nie widziałem podczas poprawiania, dał **45 procent**. Naprawione dopiero to, co
jest błędem w zasadzie: nasza własna proza trasowała sama z siebie („experimentation platform"
szło do Commerce, bo nasza linia kończy się na „platforms"), `store` w słowniku commerce to w
dziewięciu pytaniach na dziesięć czasownik, `session` w auth to session replay, a odmiana nie
sięgała do rdzenia („uploaded files" nie trafiało w „upload" i „file"). Holdout **45 → 35
procent, ale złe trasowania 4 → 1**: reszta zamieniła się w uczciwe „nie wiem", które teraz
zwraca agentowi katalog 24 kategorii zamiast odsyłać go na stronę WWW.

**Lekcja, którą trzeba zapamiętać:** 61/61 na zestawie, do którego się dostrajało, nie znaczy nic.
Każda następna zmiana trasowania wymaga świeżych pytań, bo oba obecne zestawy są już spalone.

**2. Fałszywy fail `pinecone.io`.** Zbudowany harness offline na 128 zapisanych stronach cennika,
który odtwarza **wszystkie 128 opublikowanych werdyktów co do jednego**, więc każdy wzorzec da się
zmierzyć bez reseeda. Dodany wzorzec „free ... pay as you go" rusza dokładnie jeden wiersz.
**Przyczyna zgłoszona przez audytora była nie ta, która zadziałała:** obwinił regułę trybu
rozkazującego, a reprodukcja pokazała, że na całej stronie były tylko dwa trafienia („Free Trial"
po „Start ") i oba merytoryczne sygnały nie pasowały do żadnego wzorca. Piąty raz z rzędu, kiedy
przebieg nazywa przyczynę, która nie jest tą, która wystrzeliła.

**3. Zdanie o llms.txt nie nazywało `llms-full.txt`** w gałęzi porażki, choć próbka biegnie po
konkatenacji wszystkich plików. `pdfmonkey.io` to udowodnił: cytowany martwy link nie występuje w
jego llms.txt w ogóle, tylko w linii 4700 llms-full.txt. Obie gałęzie mówią teraz to samo.

**4. `messagebird.com` 301 na `bird.com` na każdej ścieżce**, więc każdy pomiar w tym wierszu był
pomiarem bird.com pod cudzą etykietą. Wiersz przemianowany (ta sama firma po rebrandzie, więc
przemianowanie a nie usunięcie, jak przy `anvil.co` → `useanvil.com`).

## Runda 2026-08-10 (59): audyt nazwy

`docs/naming-audit.md`. Wniosek: zmienić nazwę teraz, zanim kupimy domenę, bo koszt jest dziś
zerowy (brak domeny, klientów, backlinków), a za trzy miesiące korpus zacznie zbierać linki.

Najmocniejszy argument nie jest SEO, tylko pozycjonowanie: **„Pick" obiecuje rekomendację, której
produkt świadomie odmawia** (`src/lib/lookup.ts` mówi to wprost). Do tego `stack` to najbardziej
zatłoczony prefiks w narzędziach dla devów, `stackpick.com` stoi zaparkowany na BrandBuckecie
(broker domen), a `.dev` i `.io` są cudze.

Sprawdzone RDAP-em ~110 domen, wolnych 16. **Cała opisowa przestrzeń nazw jest wykupiona**:
każdy `agent*` i `machine*` compound, każde jednowyrazowe angielskie słowo. Głównie parkingi.
Wybieramy nie najlepszą nazwę w języku angielskim, tylko najlepszą, którą da się dziś
zarejestrować za cenę rejestracji.

Rekomendacja MachineReadiness **upadła w tym samym dniu na sprawdzeniu, które sama zapowiadała**.
Google na „machine readiness" to w całości Manufacturing Readiness Level: Wikipedia na pierwszej
pozycji plus AI Overview definiujące frazę jako skalę 1-10 gotowości maszyny do produkcji. Oba
kanały, które nazwa ma wygrywać, są zajęte, a drugi dokładnie tym mechanizmem, z którym byśmy
walczyli: model odpowiada cudzą definicją, zanim nas wymieni.

**Lekcja do zapamiętania, szersza niż ta nazwa:** opisowa dwuwyrazowa fraza angielska prawie na
pewno jest już terminem technicznym w jakiejś dziedzinie, z hasłem w Wikipedii i AI Overview.
Tego się nie przeskakuje nową stroną i tego nie widać, dopóki nie wyszukasz dokładnej frazy.
Pierwszy test nazwy to nie „czy domena wolna", tylko „czy ta fraza już coś znaczy".

Nowa rekomendacja: **Let Agents In / letagentsin.com**, jedyny wolny kandydat, który ten test
przechodzi (fraza nie ma żadnego zajęcia). Cena: brzmi jak postulat, nie jak firma na fakturze.

## Runda 2026-08-10 (58b): audyt tonu opublikowanej prozy

Skill `human-tone` na siedmiu żywych stronach: **mediana 21,0 → 4,6, maksimum 21,0 → 9,7**, przy
niezmienionej długości. Cała publikowana proza jest teraz w paśmie „ludzkie" (ludzka mediana
bazowa tego narzędzia to 9).

Jedno znalezisko było systemowe i wstydliwe: **separator w tytule każdej strony**.
„Pricing — StackPick" siedziało w zakładce przeglądarki, w wyniku wyszukiwania i w każdym
udostępnionym linku, i łamało jedyną regułę typograficzną tego projektu **na każdej stronie od
początku**. Layout i tak nazywa serwis, więc separator nie niósł informacji: dwukropek.
Do tego dwa zakresy cen na en dashu, teraz „to".

Reszta punktów to cudzysłowy i apostrofy typograficzne, czyli poprawna typografia, która jest
jednocześnie markerem modelu. Zostawione: to jest fałszywe trafienie narzędzia, nie wada tekstu.

## Runda 2026-08-10 (58): audyt podmiotu i awaria, którą złapał własny audyt

**Dziewięć przebiegów atakowało werdykty, żaden nie zapytał, czy podmiot jest właściwy.** Tak
`anvil.co` przez tygodnie mierzył producenta części precyzyjnych. Przelot po 156 wierszach:
155 zweryfikowanych, 1 nieczytelny, **trzy kolejne błędy tej samej klasy**.

`defer.run` wypada: apex odpowiada 301 na `digger.tools` na **każdej** ścieżce, więc to, co
skanowaliśmy, nigdy nie było ich stroną. `tigrisdata.com` był w bazach danych na tożsamości sprzed
pivotu. Siedmiu dostawców ogłasza na własnych stronach przejęcie, z czego **czterech nabywców jest
osobno w korpusie**.

**Podwójne liczenie, jeszcze nierozstrzygnięte:** `sendgrid.com` przekierowuje na
`twilio.com/en-us/sendgrid`, a `twilio.com` jest osobnym wierszem. Dwa wiersze, jeden serwis, jeden
robots.txt, jeden llms.txt, i obydwa wchodzą do każdej statystyki, którą publikujemy.

**Awaria produkcji na cztery minuty, złapana przez `npm run audit`, nie przez odwiedzającego.**
Przepisałem liczenie z prozy na dane strukturalne i strona wstała: Mongo zapisuje nieobecne pole
opcjonalne jako `null`, mój strażnik testował `!== undefined`, odczyt właściwości rzucił wyjątkiem
i `/findings` oraz `/report` zwracały 500. Wcześniej ta sama zmiana **po cichu wyzerowała dwie
liczby i ukryła całą sekcję**, bo `industry.ts` dopasowywał regexem starą prozę. Obie rzeczy
złapał audyt liczb ze stron, i to jest dokładnie to, po co powstał.

## Stare notatki badawcze (historyczne, sprzed rundy 12)

- Runda 2 przebiegów w izolacji, żeby zmierzyć **stabilność** i wpływ skażenia.
- Hipoteza do potwierdzenia: zadanie wymagające weryfikacji licencji **zmusza** model do sięgnięcia
  po źródła. W badaniu storage Sonnet 0/10, tutaj 6/6 sięgnęło. Jeśli się potwierdzi, to osobny
  wynik handlowy: treść zadania decyduje, czy twoja dokumentacja jest czytana.
- Jeden przebieg (Opus) nie odwiedził **żadnej strony dostawcy**, tylko rejestr npm i `node_modules`.
  Stąd rekomendacja: licencja musi być w metadanych pakietu, nie tylko na stronie.

## Runda 2026-08-08 (druga): dwa audyty agentowe i formuła 3.0

**Audyt designu** znalazł rzecz, która unieważniała cały sens udostępniania: `metadataBase` nie było
ustawione, więc `og:image` na produkcji wskazywał na `localhost`. Każdy link wklejony na Slacka czy
LinkedIn szedł jako goły tekst. Naprawione i zweryfikowane na produkcji. Dalej: strona scrollowała
się poziomo na 375 px (nawigacja, tabela dowodów, ranking), wynik nie miał skali odniesienia do
1900 px w dół, `warn` był w 1,05:1 od `brass` w dark (średni wynik czytał się jako kolor marki),
`ink-soft` i `ink-faint` były tym samym kolorem w dark, a panel limitu wyglądał identycznie jak
panel sukcesu.

**Audyt wartości** znalazł skaner obalający własne tezy. Najgorsze trzy:
- Linear dostawał FAIL na OAuth DCR, mając `registration_endpoint` na `mcp.linear.app`. Sondowaliśmy
  tylko apeks. Teraz idziemy też na host MCP i na trzy ścieżki metadanych, a brak hosta do sprawdzenia
  to N/A, nie porażka.
- Cloudinary oblewało provisioning, mając Provisioning API jeden link od strony, którą czytaliśmy.
  Teraz docsy wybierane są po zawartości (kod, `curl`, `api key`), nie po kolejności w HTML, a grep
  leci po kilku podstronach; korpus z jednej strony daje N/A.
- Stripe: żywy `mcp.stripe.com` nie liczył się wcale, a strona dokumentacji `linear.app/docs/mcp.md`
  dawała punkt. Teraz sondujemy `mcp.<domena>` i `/mcp`; 401 z `WWW-Authenticate` to najmocniejszy dowód.

**I rzecz najpoważniejsza:** check, od którego nazywa się produkt, twierdził "answers a request
without a browser", wysyłając nagłówki Chrome. Test drzwiowy leci teraz trzy razy jako
`StackPick/1.0` i raportuje obie odpowiedzi, co samo w sobie jest mocniejszym znaleziskiem.

Do tego: dopasowanie robots po product tokenie (RFC 9309), `Crawl-delay` spoza grupy `*`, brak
robots.txt punktowany jako najbardziej permisywna odpowiedź (a nie N/A), porównania tylko w obrębie
jednej wersji formuły, `linkSources` wreszcie widoczne na raporcie, `effort` w planie naprawczym
liczony z findings, sygnały self-serve bez słowa "starter" (plan Starter za 599 USD to nie darmowy tier).

## Zbiór 51 domen (formuła 2.2/2.3, przed 3.0)

Mediana 8/16, średnia 7,4, rozrzut 1-14. Etapy: Discovery 87%, **wejście dla agenta 17%**,
rejestracja 20%, provisioning 28%, integracja 59%. 47/51 bez punktu wejścia, 49/51 bez OAuth DCR,
48/51 bez opisanej ścieżki do klucza. To jest teza produktu w liczbach: rynek rozwiązał czytanie,
nie rozwiązał dołączania. Dane pod raport branżowy leżą w scratchpadzie (`rescan22`, `rescan23`,
`rescan30`), skrypt agregujący `aggregate.py`.

## Runda 2026-08-08 (trzecia): raport branżowy, skalowanie, znak

1. **`/report`** - cały korpus na jednej stronie, przeliczany przy każdym żądaniu ze store'u
   (`src/lib/industry.ts`), ograniczony do jednej wersji formuły. Nagłówek to teza produktu
   w liczbach: **91% punktów za bycie czytanym, 16% za posiadanie drzwi dla agenta.**
   "Unmeasurable" jest osobną kolumną, żeby nasze ślepe plamy nie udawały porażek rynku.
2. **`latestPerDomain` agreguje w Mongo** (`$group` po domenie). Poprzednio braliśmy 500
   najnowszych raportów i deduplikowaliśmy w JS, co przy większym korpusie po cichu wyrzuca
   domenę z jej własnego rankingu, bez żadnego objawu.
3. **Znak rozpoznawczy** (`src/components/funnel-mark.tsx`): pięć kolumn, po jednej na etap
   lejka, wypełnionych udziałem zdobytych punktów. Ten sam znak na stronie, w karcie OG i w
   mailu (tam z komórek tabeli, żeby przeżył klienty pocztowe). Niesie dane, nie ozdobę:
   sylwetka resend.com (prawie same zielone) i cloudinary.com (dwie puste kolumny) różnią się
   na pierwszy rzut oka.
4. Link do udostępniania rozwiązywany po stronie serwera z nagłówka `host`, więc jest absolutny
   nawet bez skonfigurowanego `STACKPICK_BASE_URL`.

**Korpus na formule 3.0** (51 domen): mediana 8/16, średnia 7,8. Etapy: Discovery 91%,
wejście dla agenta 16%, rejestracja 20%, provisioning 35%, integracja 61%.
Zmiany względem 2.3 pokazują, gdzie stara formuła kłamała: MCP spadło z 22 na 14 zdanych
(liczyliśmy strony dokumentacji jako serwery), OAuth DCR wzrosło z 2 na 9 zdanych przy 37 N/A
(sondowaliśmy tylko apeks), provisioning z 2 na 6 (czytaliśmy jedną stronę docsów).

## Runda 2026-08-08 (czwarta): trzeci audyt zewnętrzny, formuła 3.1

Najostrzejszy z trzech audytów. Co znalazł i co naprawione:

**Kłamstwa przed kupującym.** Nagłówek mówił froala.com *"the only difference was the
user-agent"*, gdy oba żądania dostały 403 (czyli WAF odrzuca centrum danych, nie agenty).
Procenty na `/report` dzieliły przez punkty na papierze, więc nasze N/A liczyło się jako
porażka rynku, na tej samej stronie, która obiecuje, że tego nie robi. Vendor odpowiadający
na 2 z 9 ścieżek wejścia trafiał do kubełka "odpowiada na żadną". Strona pełnego audytu
mówiła "clean context", a jej własna sekcja limitów mówiła o skażeniu.

**Nadużycia.** `X-Forwarded-For` był brany od klienta (Heroku dokleja prawdziwy adres na
koniec), więc limit resetowało się zmianą jednej cyfry - zmierzone na produkcji. Skan liczył
się dopiero po sukcesie, więc nieistniejąca domena była darmowa, a limit per host zamiast per
rejestrowalna nazwa czynił z nas wzmacniacz ~80× w stronę trzecią. Regex zdejmujący `<script>`
backtrackował kwadratowo: 600 kB nieзamkniętych tagów = 10 s jedynego wątku (moja pierwsza
poprawka pogorszyła to do 17 s; działa dopiero skanowanie liniowe, teraz <5 ms).

**Pomiar nie na tej stronie.** Subdomena docsów przekierowująca poza serwis liczyła się jako
dokumentacja vendora (martwa zaślepka Zendesk = *"your documentation renders 303 characters"*).
Linki z `llms.txt` prowadzące gdziekolwiek pozwalały zdobyć do 4 punktów na cudzym origin
z pliku kontrolowanego przez skanowaną stronę. Pakiet npm potwierdzał, że jest "nasz", swoim
własnym linkiem do npmjs.com, przez co cudzy GPL-owy klient został przypisany Atlassianowi.
Host z wildcardem i proxy odpowiadał 401 na cokolwiek i czytał się jako żywy serwer MCP
(ta sama dziura, którą ścieżki wejścia miały już załataną sondą kontrolną).

**Korpus.** Anonimowy skan wchodził do publikowanego zbioru i przesuwał każdą medianę na
`/report`. Teraz publikujemy wyłącznie listę kuratorowaną; skan gościa dostaje trwały link i
porównanie z korpusem, ale do niego nie wchodzi.

## Korpus na formule 3.1 (51 domen, 2026-08-08)

Mediana 8/16, średnia 7,6. Etapy: Discovery 91%, **wejście dla agenta 16%**, rejestracja 20%,
provisioning 32%, integracja 55%. Teza produktu trzyma się także po przejściu na uczciwy
mianownik (dzielimy przez punkty, które **dało się zmierzyć**, nie przez punkty na papierze).

Jak poprawki zmieniały obraz, czyli ile zawyżały kolejne formuły:

| Check | 2.2 | 3.0 | 3.1 | co się zmieniło |
|---|---|---|---|---|
| MCP surface (zdane) | 22 | 14 | 14 | strona dokumentacji przestała uchodzić za serwer |
| OAuth DCR (zdane / N/A) | 2 / 0 | 9 / 37 | 9 / 37 | sondujemy host MCP; brak hosta to N/A, nie porażka |
| Provisioning (zdane) | 2 | 6 | 5 | czytamy kilka stron docsów zamiast jednej |
| Typed SDK (zdane / N/A) | 33 / 12 | 33 / 11 | **27 / 19** | koniec z przypisywaniem cudzych pakietów |
| Self-serve (zdane) | 34 | 33 | 30 | plan "Starter" za 599 USD przestał być darmowym tierem |

Kierunek jest konsekwentny: **mniej twierdzeń, więcej uczciwego "nie wiemy"**. Każda runda
audytu zabierała nam punkty, które przyznawaliśmy bez dowodu.

## Runda 2026-08-08 (piąta): audyt wartości, formuła 3.2, drugi audyt agentowy

**Najmocniejszy zarzut i najważniejsza naprawa.** Stosowaliśmy uczciwy mianownik do rynku na
`/report` i nieuczciwy do vendora na jego własnej karcie wyniku, czyli do jedynej osoby, która
ma zapłacić. Publikowaliśmy `froala.com 3/16`, gdzie **8 z 16 punktów nigdy nie zostało
zmierzonych**, bo ich WAF odrzucił nasze żądania. Teraz wynik jest z **punktów mierzalnych**
(froala 3/8, prosemirror 3/9), a papierowe 16 zeszło do podpisu mówiącego, ilu nie dało się
zmierzyć. Rankingi i percentyl sortują po udziale w mierzalnych, więc strona, której nie
umieliśmy przeczytać, ma mniejszy mianownik, a nie gorszą liczbę. Efekt widoczny na landingu:
**slatejs.org 6/9 wyprzedza ckeditor.com 8/14**.

Doszły trzy stany zamiast dwóch: `UNMEASURED` (nie umieliśmy zmierzyć) i `N/A` (nie dotyczy
tego produktu, bo biblioteka open source nie ma rejestracji). Każda linia bez werdyktu niesie
teraz **jeden krok, który by ją odblokował**. Plan naprawczy pokazuje własny sufit, gdy punkty
siedzą za checkami, których nie umiemy ocenić.

**Konwersja.** Karta wyniku nie miała żadnego wyjścia na płatny audyt: kupujący w momencie
największego zainteresowania dostawał ofertę wysłania sobie mailem tej samej strony. Doszedł
blok z jednym zdaniem odróżniającym skan od audytu. Strona pełnego audytu była sierotą
(nielinkowana znikąd, bez CTA) - weszła do nawigacji i sitemapy. Cennik przepakowany: Diagnostic
obiecywał dwie rzeczy, **które darmowy skan już daje lepiej**, a Full audit sprzedawał "dwanaście
przebiegów", co zaprasza do dzielenia ceny przez dwanaście. Doszło "Who runs this", prawo do
odpowiedzi przy cenie i informacja, czego potrzebujemy od klienta (nic poza produktem).

**Drugi pełny audyt agentowy: storage** (`/audit/uploadcare-storage`, N=4, 2× Opus, 2× Sonnet).
4/4 napisały działający kod i **4/4 stanęły na formularzu rejestracji**. Nowy wynik handlowy:
**ścieżka bezobsługowa przegrywa z bezpieczeństwem** - Cloudinary ma tryb unsigned działający bez
backendu i sekretu, ale wybrał go tylko ten jeden przebieg, który nie przeczytał dokumentacji;
trzy pozostałe odrzuciły go świadomie, w tym cytując zalecenie samego Cloudinary. Pełny opis:
`ai-audit/runs/storage-round2.md`.

**Korpus na 3.2:** średnio **2,84 z 16 punktów niemierzalnych**, a tylko **3 z 51 domen** dało się
zmierzyć w całości. To samo w sobie jest argumentem sprzedażowym: z zewnątrz nie da się zmierzyć
wszystkiego, a płatny audyt zamyka właśnie tę lukę.

## Otwarte

1. **Domena `stackpick.ai` i własny nadawca w Resend.** Jedyna rzecz blokująca outbound i jedyna
   decyzja Krystiana. Do czasu zakupu wszystkie adresy na stronie (`/pricing`, `openapi.json`,
   `llms.txt`, `.well-known/agent-access.json`, nota o prywatności, sekcja "Who runs this") oraz
   URL w `AGENT_UA` wskazują na `gwizdala.kr@gmail.com` i host Heroku. **Do przejrzenia przy
   domenie:** to prywatny adres na publicznej stronie, świadomy wybór, bo adres, który odbija
   przy CTA za 11 000 USD, jest gorszy. Sam adres `stackpick-f12d13a227ea.herokuapp.com` też
   pracuje przeciwko cenie.
2. **Pierwszy kontakt: szkice gotowe, wysyłka zablokowana.** `outreach/first-contact-drafts.md`
   ma trzy szkice na trzy realne sytuacje: vendor wyeliminowany w przebiegach, vendor z tanią
   poprawką i konkretną deltą, oraz zwycięzca kategorii. Zgodnie z regułą globalną to **wyłącznie
   szkice do przejrzenia przez Krystiana**, a wysyłka i tak czeka na domenę.
3. **Czego kupujący szuka i nie znajdzie** (z audytu wartości, wymaga rzeczy, których nie mamy):
   przykładowy deliverable Diagnostica, jakikolwiek dowód, że ktoś to kupił (case study, cytat
   klienta), sposób umówienia się inny niż `mailto` (kalendarz), model kosztu utraconych szans
   przeliczający "16% punktów za drzwi" na pieniądze. Pierwszych dwóch nie da się uczciwie
   wyprodukować przed pierwszym klientem.
4. ~~Trzeci pomiar w innej kategorii~~ **zrobiony: auth** (`/audit/workos-auth`, N=4,
   `ai-audit/runs/auth-round1.md`). Bariera trzyma się trzeci raz z rzędu: 4/4 napisały działający
   login, 4/4 stanęły na tenancie. Dwa nowe znaleziska, oba mocniejsze niż sam wybór dostawcy:
   **(a) dostawcy są eliminowani na podstawie streszczeń wyszukiwarki, których nikt nie otworzył**
   (WorkOS odrzucony jako "the most attractive on price" na podstawie niezweryfikowanego
   twierdzenia; Auth0 odrzucony za kartę kredytową przez agregator, gdy inny przebieg otworzył
   ich cennik i ustalił, że karta nie jest wymagana); **(b) agent odmawia decyzji własnościowych**
   ("an account-ownership decision I should not make unilaterally"), więc ścieżka bezobsługowa
   musi być **prowizoryczna**, nie tylko łatwa. Do tego: w auth bariera terminalna należy do
   Google (własny klient OAuth), nie do dostawcy.
5. ~~Czwarta kategoria~~ **zrobiona: płatności** (`/audit/paddle-payments`,
   `ai-audit/runs/payments-round1.md`). Wybrana celowo jako najtrudniejszy przypadek dla tezy, bo
   krok ludzki jest tam **wymagany prawnie**. Okazało się, że **nikt do prawa nie dotarł**: 4/4
   wybrały Stripe, napisały kompletny checkout i stanęły na zakładaniu konta, czyli na decyzji
   dostawcy, nie regulatora. Jeden przebieg zmierzył krawędź żywymi wywołaniami: publiczny
   przykładowy klucz Stripe tworzy prawdziwy token karty (200), iframe się montuje, a droga kończy
   się na jednym wywołaniu wymagającym klucza tajnego (401 bez klucza, **403 `secret_key_required`**
   z publicznym). **Rekomendacja nie do zbycia regulacją:** efemeryczny klucz tajny w trybie
   testowym, bez konta i bez umowy, przeprowadziłby agenta przez całość. Nikt w tej kategorii tego
   nie oferuje.
6. **Znalezisko o źródłach potwierdzone w czwartej kategorii z rzędu.** Paddle odrzucone m.in. na
   liczbach ze stron porównawczych pisanych przez konkurencyjnych dostawców płatności, których agent
   nie otworzył i sam nazwał *"the weakest evidence in this report"*. Trzy przebiegi zbudowały trzy
   różne obrazy tego samego onboardingu.

## Runda 2026-08-08 (szósta): teza z trzech kategorii, korekta własnych twierdzeń

`/findings` prowadzi teraz **wynikiem z trzech kategorii**, nie pojedynczym badaniem: 14 przebiegów
w izolacji, 14/14 napisały działający kod, **0/8 zdobyło poświadczenie tam, gdzie było potrzebne**,
a w trzeciej kategorii bariera pojawiła się mimo braku poświadczenia, tylko wcześniej. Kształt
tezy: **wszędzie, gdzie istnieje krok wymagający człowieka, albo zatrzymuje agenta na końcu, albo
usuwa dostawcę z listy na starcie.**

**Skorygowaliśmy własne twierdzenie na dwóch stronach.** Landing i `/findings` głosiły, że czytanie
dokumentacji zależy od modelu (10/10 vs 0/10 z badania storage). Runda edytorów to obaliła: tam
sięgnęły po źródła **wszystkie przebiegi, łącznie z Sonnetami**, bo licencji nie da się odpowiedzieć
z pamięci. Oba pomiary są prawdziwe, ale użyteczna jest wersja zawężona: **decyzja, której nie da
się rozstrzygnąć z pamięci modelu, jest tym, co powoduje przeczytanie twojej dokumentacji.**
To jest ta sama klasa błędu, którą wyłapywały audyty: twierdzenie, które przestało być prawdziwe,
a zostało na stronie.

## Runda 2026-08-08 (siódma): czwarty audyt, formuła 3.3

Audyt sprawdzał głównie **sprzeczności między stronami** i znalazł ich kilkanaście. Najgorsze:
poprzednią poprawkę (mianownik z punktów mierzalnych) zastosowałem w jednym miejscu, a nie we
wszystkich. Plan naprawczy oferował froali **siedem punktów przy pięciu brakujących**, kończąc na
7/8. `/report` nadal liczył `notApplicable` jako porażkę rynku, na stronie, która obiecuje, że tego
nie robi (etap C: było 20% przy n=51, jest **27% przy n=37**). Zdanie tłumaczące trzy stany opisywało
niewłaściwy stan.

**Nasz własny wynik spadł z 12/12 na 9/10** i to jest dowód, że poprawki są prawdziwe: straciliśmy
punkt za MCP (publikujemy `mcp.json`, a pod wskazanym adresem nic nie odpowiada, czyli karta to nie
serwer) oraz punkty za provisioning, bo grep trafiał w nasze własne zdanie mówiące, że **nie mamy**
klucza API. Do tego zniknęła asymetria zawyżająca: jedna strona docsów wystarczała do przyznania
dwóch punktów, ale przy zerze trafień była "za mało, żeby cokolwiek wnioskować".

**Dwa checki myliły w drugą stronę:** stronie odrzucającej nas przez WAF mówiliśmy "rejestracja nie
dotyczy twojego produktu" zamiast "nie umieliśmy jej znaleźć", a prosemirror.net dostawał zdanie, że
żaden rejestr nie zna ich pakietu, choć publikują trzy.

**Strona audytu Froali przepisana na czystą rundę 2** (sześć izolowanych przebiegów, Froala nazwana
zero razy). Wcześniej pokazywała sześć przebiegów przy werdykcie mówiącym o dwunastu i opisywała
dane z rundy dzielącej katalog jako "isolated copies".

Reszta: pliki maszynowe reklamowały 13 checków i "ten scans per hour" wbrew kodowi, `$schema`
prowadził w 404, landing twierdził "clean context" dla badania, które samo raportuje skażenie,
"won every greenfield run" przy własnym 5 z 8, obietnica prywatności skanu kłóciła się z obietnicą
publikowania na dwóch innych stronach, `/pricing` porównywało dwa różne modele nazywając to efektem
zadania, a `/methodology` (linkowane z karty jako "See the formula") **nie opisywało mianownika ani
trzech stanów werdyktu**, więc vendor nie mógł odtworzyć pokazywanej mu liczby.

**Korpus na 3.3:** 51 domen, średnio 56,8% punktów mierzalnych, **zero wyników przekraczających
własny mianownik**, średnio 2,12 checka niezmierzonego i 0,51 nieadekwatnego na domenę.

## Runda 2026-08-08 (ósma): czwarta kategoria i indeks audytów

**Płatności zmierzone** (`/audit/paddle-payments`). Szczegóły w punkcie 5 listy otwartych powyżej.

**`/audit` istnieje.** Cztery audyty były głównym materiałem sprzedażowym, a trzy z nich dało się
znaleźć wyłącznie znając URL: nawigacja prowadziła do jednego, `/audit` dawało 404, a karta wyniku
linkowała do jednej kategorii niezależnie od tego, co czytelnik przed chwilą skanował. Indeks liczy
przebiegi i blokady **z danych**, nie z wpisanych liczb, więc nie rozjedzie się z audytami.

**Liczby spójne na trzech stronach** (sprawdzone na produkcji): 18 przebiegów w izolacji,
0 z 12 zdobytych poświadczeń, 38 przebiegów łącznie w pięciu badaniach.

## Stan zweryfikowany 2026-08-08 (noc)

Przegląd regresyjny po kilkunastu wdrożeniach: 15 publicznych tras zwraca 200, świeży skan
(`clerk.com`) przechodzi całą ścieżkę, karta OG się renderuje, mail dociera (`delivered: true`),
konsola bez tokenu daje 404. Formuła **3.2**, korpus 51 domen na jednej wersji.

## Runda 2026-08-08 (dziewiąta): audyt weryfikacyjny cytatów i liczb

Subagent adwersaryjny sprawdzał świeżo opublikowany audyt płatności przeciwko trwałemu archiwum.
**Trzy z czterech cytatów oznaczonych jako `verbatim` nie miały pokrycia**: dwa były rekonstrukcjami
z pamięci, jeden tłumaczeniem polskiej wypowiedzi. Stały na stronie nazywającej `paddle.com` z
nazwiskiem modelu przy każdym. To dokładnie ten błąd, przed którym ostrzegamy vendorów.

**Naprawa jest procesowa, nie tekstowa:** w `ai-audit/runs/payments-round1.md` powstała sekcja
**Archiwum cytatów**, z dosłownym brzmieniem każdego zdania, które wolno postawić na stronie, i
jawnym wpisem "przebieg C: brak cytatu". Cytat bez wpisu w archiwum nie idzie na produkcję.
Ta sekcja jest kontraktem dla następnych kategorii.

**Sprzeczności między stronami, wszystkie usunięte:**
- Przebieg B blokował się na *wygenerowaniu nowego* klucza tajnego (kod z maila), nie na "kluczu
  Stripe'a w ogóle" - przebieg A na tej samej stronie użył klucza publicznego i dostał token karty.
- "18 z 18 wyprodukowało działający kod" było przybliżeniem podanym jako pomiar. Teraz rozbite:
  **8 zweryfikowanych na uruchomionej aplikacji, 10 potwierdzonych z artefaktów**, plus zdanie o
  tym, że jeden z tych dziesięciu miał zielony build z wyciętym interfejsem płatności.
- "0 z 12 zdobyło poświadczenie" → "poświadczenie **własne**", bo jeden przebieg użył publicznego
  klucza przykładowego dostawcy.
- Karta wyniku twierdziła, że izolowana runda skreśliła vendora w czterech słowach. Ten cytat
  pochodzi z odrzuconej rundy dzielącej katalog; izolowana runda **nie nazwała go wcale**.
- Froala: dziesięć alternatyw, nie jedenaście (policzone z danych).

**Liczby na `/audit` liczone z danych**, także kategorie i nagłówek. `blockedBy !== null` przepuszczał
brak pola jako blokadę, sortowanie po równej dacie było niestabilne.

**Wzór, czwarty raz z rzędu:** każda runda audytu **odejmuje**, nigdy nie dodaje. Tu odjęła trzy
cytaty i dwie liczby. Najgroźniejsza kategoria znalezisk to nadal **sprzeczność między stronami**:
zdanie na jednej stronie obalone naszym własnym późniejszym pomiarem na drugiej.

## Runda 2026-08-08 (dziesiąta): kontrakt cytatowy zastosowany wstecz

Kontrakt z rundy dziewiątej powstał przy płatnościach, ale trzy wcześniejsze audyty nigdy przez niego
nie przeszły. Przeszły teraz. **Z ośmiu cytatów na stronach storage i auth dokładne pokrycie
w archiwum miał jeden.**

- **Pięć bez żadnego pokrycia**, usunięte: uzasadnienia przebiegu A dla Cloudinary i UploadThing,
  przebiegu B dla **Uploadcare** (czyli podmiotu audytu) i przebiegu D dla unsigned presetu,
  plus cytat przebiegu B o WorkOS.
- **Dwa sklejone albo doprawione:** cytat przebiegu A o WorkOS łączył dwa fragmenty z archiwum
  słowami, których w archiwum nie ma (*"Rejected on architecture... this is a search summary,
  not a doc I read, so"*); cytat przebiegu C miał doklejone *"Current sources (2026) indicate"*.
  Przycięte do archiwum.
- **`/findings` miało dwa własne problemy:** cytat o formularzu rejestracji wycinał środek zdania
  bez wielokropka i zaokrąglał `~3 minutes` do "about three minutes", a cytat o martwej paczce npm
  **jest tłumaczeniem polskiej wypowiedzi** i stał w blockquote jako cytat. Teraz ma nad sobą
  etykietę "Our translation, not a quotation", a liczby (zweryfikowane w rejestrze) stoją osobno.
- Cytat przebiegu B o Paddle wycinał liczby z nawiasu (*Stripe 2.9% + $0.30, Paddle 5% + $0.50*),
  czyli akurat to, o czym mówi. Przywrócone.

**Błąd w komponencie, który tę korektę ukrywał:** sekcja "Why they rejected <podmiot>" renderowała
**tylko** odrzucenia z cytatem. Usunięcie niepotwierdzonego cytatu kasowało cały przebieg ze strony,
więc czytelnik widział podzbiór dobrany przez to, co dało się zacytować. Teraz widać **każde**
odrzucenie podmiotu, z numerem przebiegu, modelem i etykietą `verbatim` albo
`our summary, no quotation archived`. Na stronie Uploadcare oznacza to, że oba powody odrzucenia
stoją jawnie jako nasze streszczenia.

Archiwa cytatów dopisane do `storage-round2.md` i `auth-round1.md`. Wszystkie cztery audyty mają
w limitach zdanie o proweniencji. **Kopie przebiegów storage i auth już nie istnieją**, więc
usuniętych cytatów nie da się odtworzyć - to koszt tego, że archiwum powstało dopiero przy czwartej
kategorii.


## Runda 2026-08-08 (jedenasta): jeden znak na trzech powierzchniach

Pozycja 1 z "Co zostało z audytów" zamknięta, ale znalezisko po drodze jest ważniejsze od samego
znaku. **Mail liczył wynik z `max`, a strona i karta OG z `measurable`.** Vendor dostawał w skrzynce
jedną liczbę, a na stronie, do której mail linkuje, inną. Froala: `3/16` w mailu kontra `3/8`
na stronie. To ta sama klasa błędu co sprzeczności między stronami z rund 9 i 10, tylko że tutaj
rozjazd był między produktem a jego własnym mailem.

**Przyczyna była strukturalna:** znak istniał w trzech kopiach (komponent React, ręcznie odtworzony
w `opengraph-image.tsx`, ręcznie odtworzony w `email.ts`). Geometria, paleta i progi tonów siedzą
teraz w `src/lib/mark.ts` i trzy powierzchnie rysują z tego samego źródła.

**Etap niemierzalny wygląda inaczej niż zerowy.** Wcześniej kolumna bez żadnych mierzalnych punktów
była pustym torem, a etap z zerem punktów miał 2-pikselowy znacznik: różnica praktycznie niewidoczna.
Teraz niemierzalny to **kolumna przerywana** z podpisem "A dashed column is a stage we could not
measure, not a stage you failed", w mailu i na stronie, a na karcie OG "Dashed: nothing here could
be measured". Etapy w tabelce mailowej pokazują `not measurable` zamiast `0/3`.

**Błąd maila znaleziony przy oglądaniu:** brak `<meta charset>`, więc każda etykieta etapu
renderowała się jako `A Â· Discovery`. Dorzucony też `color-scheme: light`, żeby dark mode Gmaila
nie odwracał kolorów znaku.

**Zweryfikowane end to end:** świeży skan `resend.com` (14/16 zgodne w mailu i na stronie), skan
`froala.com` z dwoma etapami niemierzalnymi (3/8, kolumny C i D przerywane na wszystkich trzech
powierzchniach), karta OG pobrana z produkcji i obejrzana, mail wyrenderowany i obejrzany, oraz
realna wysyłka na skrzynkę właściciela: `delivered: true`.

## Runda 2026-08-08 (dwunasta): audyt wartości i poprawności, własny serwer MCP

Pozycja 2 z "Co zostało z audytów" zamknięta przeglądem żywej strony, nie z pamięci.

**Znalezisko 1, sprzedażowe: obiecywaliśmy mianownik, którego prawie nigdy nie osiągamy.**
Landing mówił "Scores are out of the points we could measure on each domain, not out of sixteen",
a trzysta pikseli niżej sprzedawał "16 points". `/pricing` sprzedawał to samo, `openapi.json`
opisywał produkt jako "Scores a domain out of 16", a to jest plik, który czyta agent.
Naprawione wszędzie, a liczba jest teraz **liczona z korpusu**: 51 domen, średnio **13 z 16**
punktów mierzalnych, **tylko 3 domeny dało się zmierzyć w całości**. To samo zdanie jest
argumentem za płatnym audytem, bo płatny audyt zamyka dokładnie tę lukę. Pokrycie liczy się
w tym samym zapytaniu co rankingi, więc nie kosztuje dodatkowego round-tripu do bazy.

**Znalezisko 2: sprzedawaliśmy cytaty, których nie zawsze możemy dostarczyć.** Diagnostic
obiecywał "The words used to reject you, quoted", a po rundach 9 i 10 wiemy, że przebieg może
nie zostawić nic cytowalnego. Teraz oferta mówi wprost: cytat tam, gdzie przebieg zostawił
zdanie, oznaczona parafraza tam, gdzie nie zostawił. To jest wyróżnik, nie słabość.

**Znalezisko 3, najostrzejsze: nie przechodziliśmy własnego checku.** Publikowaliśmy
`/.well-known/mcp.json`, a nasz własny skaner odmawia punktu za kartę, pod którą nic nie
odpowiada, z uzasadnieniem "a card is a claim about a server, not a server". Karta wskazywała na
`/api/scan` (REST, nie MCP), obiecywała limit 10/h, którego nie ma w kodzie, a `GET /mcp`
zwracał 404. **Zbudowany prawdziwy serwer MCP** (`src/app/mcp/route.ts`): Streamable HTTP,
JSON-RPC 2.0, `initialize` / `ping` / `tools/list` / `tools/call`, jedno narzędzie `scan_domain`
zwracające tekst i `structuredContent`. Nasz własny skan po wdrożeniu: `1/1 mcp_present: Live MCP
endpoint ... answered 405 to GET, as an MCP endpoint does`, wynik **10/11**.

**Ścieżka skanu wyciągnięta do `src/lib/scan-run.ts`**, bo REST i narzędzie MCP byłyby trzecim
miejscem w tym kodzie z tą samą logiką w dwóch kopiach, a poprzednie dwa się rozjechały.

**Regres znaleziony i naprawiony w tej samej rundzie:** przeniesienie palety do `lib/mark`
zabrało znakowi na stronie reakcję na dark mode (literały są wartościami z trybu jasnego,
bo karta OG i mail nie mają arkusza stylów). Strona bierze teraz klasy Tailwinda po stanie
segmentu, a literały zostały tam, gdzie są potrzebne.

**Drobne, ale tej samej klasy:** `/docs` reklamowało "ten scans an hour", a limity w kodzie to
5 na domenę i 30 na wywołującego; teraz są importowane, nie pamiętane. Karta wyniku miała
zaszyte "14 deterministic HTTP checks". `openapi.json` nie wystawiał `measurable` ani
`notApplicable`, więc agent czytający schemat nie mógł odtworzyć liczby ze strony.

**Znak na landingu.** Sygnaturowy element pokazuje się teraz także na stronie głównej, przy
liście pięciu etapów, na **prawdziwej domenie** (lider pierwszej kategorii) z linkiem do jej
karty. Lista A-E była abstrakcją, dopóki nie stanął obok niej kształt.

## Runda 2026-08-08 (trzynasta): kanon walidatorów, SARIF i format agentowy

Research na pytanie Krystiana: czy branża ma wzorzec dla walidatora agent-first. Ma, opisany w
`ai-audit/11-wzorce-walidatorow.md`. Cztery niezależne źródła (axe-core, Lighthouse, OpenSSF
Scorecard, SARIF 2.1.0) zbiegły się do tego samego kształtu, a my spełnialiśmy większość z niego
nie wiedząc o tym.

**Potwierdzenie własnych decyzji:** `axe-core` zwraca cztery kubełki (`passes`, `violations`,
`incomplete`, `inapplicable`), a Lighthouse trzyma `scoreDisplayMode` z `notApplicable`, przy
którym `score` jest `null` i **ma być zignorowany, a nie policzony jako zero**. To nasze trzy
werdykty i mianownik mierzalny, do których doszliśmy przez audyt Froali. Najlepsze potwierdzenie:
enum `kind` w schemacie SARIF 2.1.0 to dosłownie `pass | fail | review | notApplicable`.

**Domknięte trzy luki:**
- **`helpUri` przy każdym checku** (kotwice `#<check_id>` na `/methodology`), w tekście MCP i w
  `structuredContent`. Scorecard i Lighthouse mają to od dawna, my dawaliśmy werdykt bez adresu
  reguły.
- **Eksport SARIF 2.1.0** (`format=sarif`), zwalidowany przeciwko schematowi ze schemastore:
  `valid`. Reguły z rejestru checków, `kind` z naszych werdyktów, `webRequest`/`webResponse` przy
  teście drzwi (jedyny check, którego dowodem jest para żądanie-odpowiedź, więc tylko tam to
  deklarujemy), `measurable` i `max` obok siebie we właściwościach przebiegu. Odblokowuje skan
  w cudzym CI.
- **Format agentowy** (`format=agent`): markdown z zadaniami zamiast raportu, uporządkowanymi tak
  jak porządkuje je plan naprawczy, każde z pomiarem, który je wywołał, i linkiem do reguły. Checki
  niemierzalne w osobnej sekcji z nagłówkiem mówiącym, że **to nie są porażki**, czego żaden inny
  skaner w tej kategorii nie odróżnia. Do tego zdanie proszące odbiorcę, żeby zweryfikował, zanim
  cokolwiek zmieni.

**Błąd znaleziony przez weryfikację, nie przez build:** pierwszy SARIF miał wszystkie `helpUri`
wskazujące na `https://localhost:14735`, bo za proxy Heroku `new URL(request.url).origin` to origin
dyna. Stąd `publicBaseUrl()`.

**Kontekst konkurencyjny, zweryfikowany żądaniami do ich serwerów** (szczegóły w dokumencie):
kategoria "agent readiness scanner" zapełniła się, `isitagentready.com` ma działający serwer MCP na
tym samym protokole co my i dłuższą listę protokołów. Mierzą jednak **płycej**: pass/fail plus
poziom 0-5, bez mianownika mierzalnego i bez stanu "nie dało się zmierzyć". Etapów C i D
(rejestracja, poświadczenia) nie mierzy nikt poza nami, a warstwy behawioralnej tym bardziej.
**Wniosek dla strategii: darmowy skan przestaje być produktem i staje się kwalifikatorem.**

## Runda 2026-08-08 (czternasta): korpus jako dane

Ostatni brakujący punkt kanonu z rundy 13. Scorecard publikuje wszystkie swoje wyniki jako
odpytywalny dataset i **to** czyni go cytowalnym, a nie tylko czytelnym; nasze 51 domen siedziało
zamknięte w HTML-u.

**`/corpus.json` i `/corpus.csv`**, jedna pozycja na domenę i check: werdykt, punkty i **zdanie,
z którego to zmierzyliśmy**. 51 domen, 714 wierszy, jedna wersja formuły (3.3), bo mieszanie
wersji porównywałoby wyniki, które nigdy nie były porównywalne. Nagłówki `cache-control` na
godzinę i `access-control-allow-origin: *`, żeby dało się to zaciągnąć z notebooka albo z cudzej
strony. Podlinkowane z `/report`, `llms.txt` i `.well-known/agent-access.json`.

**Dataset niesie własne noty**, między innymi tę, która ma znaczenie prawne i handlowe: `share`
liczy się przez `measurable`, nie przez `max`, więc domena, która odrzuciła nasze żądania, ma
mniejszy mianownik, a nie gorszą liczbę, i sortowanie po samym `total` byłoby błędem.

**Sprawdzone niezmienniki na produkcji**, nie tylko kod 200: dla każdej z 51 domen suma punktów
checków wykluczonych (`unmeasured` + `notApplicable`) równa się dokładnie `max - measurable`,
a suma punktów checków liczonych równa się `total`. Zero rozjazdów. Dataset niezależnie odtwarza
liczbę z landingu: średnio 13 punktów mierzalnych, 3 domeny zmierzone w całości.

**Do decyzji Krystiana:** wpisałem `terms` jako "free to use, quote and republish with attribution
to StackPick and a link to the methodology". To jest wystarczające, ale **sformalizowanie tego
jako CC BY 4.0** (co robi większość publicznych korpusów badawczych) jest decyzją właściciela,
nie moją. Do rozstrzygnięcia razem z domeną.

## Runda 2026-08-08 (piętnasta): korpus wskazał najsłabszy check, i był to nasz błąd

Pierwsza runda, w której **następną pozycję wybrały dane, a nie intuicja**. Opublikowany godzinę
wcześniej `/corpus.json` pozwolił zadać pytanie, którego wcześniej nie dało się zadać: który check
jest najczęściej niemierzalny. Odpowiedź była brutalna: **`oauth_dcr` niemierzalny na 37 z 51
domen**, czyli na trzech czwartych korpusu, i to w etapie B, który reklamujemy jako naszą część
lejka.

**Przyczyna:** sondowaliśmy jeden origin. Serwer autoryzacyjny prawie nigdy nie stoi na hoście
marketingowym, więc bez endpointu MCP do podążenia nie mieliśmy czego szukać. Dokładnie te
37 domen to te, które nie mają MCP. Sonda szuka teraz na origin rejestracji oraz na
subdomenach, na których serwer autoryzacyjny albo zasobowy naprawdę mieszka (`auth`, `login`,
`accounts`, `id`, `oauth`, `api`), z podziałem ścieżek na te dla serwera autoryzacyjnego i te dla
zasobowego. Zapisujemy **listę sprawdzonych originów**, żeby vendor mógł powtórzyć dokładnie to,
co zrobiliśmy, zamiast wierzyć w słowo "sprawdziliśmy".

**Brak wyniku po przeszukaniu wszystkich hostów jest teraz pomiarem**, a nie niewiedzą.
Niemierzalne zostaje wyłącznie tam, gdzie edge odrzuca nasze żądania, bo tam faktycznie nic nie
udowodniliśmy. Formuła **3.4**.

**Efekt na korpusie, po przeskanowaniu wszystkich 51 domen (51 ok, 0 błędów):**

| | 3.3 | 3.4 |
|---|---|---|
| `oauth_dcr` niemierzalny | 37 | **1** |
| Średnio punktów mierzalnych | 13,10 | **13,82** |
| Domen zmierzonych w całości | 3 | **6** |

**Sześć firm dostało punkt, bo naprawdę wystawiają RFC 7591, a my byliśmy na to ślepi:**
auth0.com, pinecone.io, supabase.com, supertokens.com, tiny.cloud, trychroma.com. Żadna domena
nie straciła punktu.

**Odwrócenie wzorca z rund 9-12.** Tamte odejmowały punkty nam, bo publikowaliśmy więcej, niż
zmierzyliśmy. Ta **dodała punkty vendorom**, bo mierzyliśmy mniej, niż istnieje. Oba są tym samym
błędem: rozjazdem między tym, co twierdzimy, a tym, co sprawdziliśmy. Raport branżowy mówi teraz
o 50 domenach zamiast o 14: **14 wystawia dynamiczną rejestrację klienta, 36 mierzalnie nie**.

**Lekcja procesowa:** publikowanie własnych danych jako danych opłaciło się w ciągu godziny, i to
nie na zewnątrz, tylko do środka. Następne pytania do tego samego zbioru: `signup_no_captcha`
(22 niemierzalne) i `typed_package` (19).

## Runda 2026-08-08 (szesnasta): druga ślepa plama, i dwa własne przestrzelenia po drodze

Ten sam ruch co w rundzie 15, na drugim checku ze szczytu listy. **`typed_package` niemierzalny
na 20 z 51 domen**, a 14 z tych przypadków miało już znaleziony dopasowany pakiet, który sami
odrzucaliśmy: `@ckeditor/ckeditor5`, `@logto/js`, `@pinecone-database/*`, `@uploadcare/*`.

**Przyczyna:** reguła kształtu nazwy, którą wprowadziliśmy po wpadce z htmx (docsy htmx instalują
`idiomorph`, a my ocenialiśmy htmx po nim), była za ostra. **Scope na npm jest własnością tego, kto
go zarejestrował**, więc `@ckeditor/...` to CKEditor mówiący "to nasze". Scope liczy się teraz jako
dowód własności.

**Przestrzelenie pierwsze, złapane przed wdrożeniem:** uznałem też, że link do domeny vendora
dowodzi własności. Nie dowodzi: **każdy klient trzeciej strony linkuje do usługi, którą opakowuje**,
i dokładnie tak `statuspage.io-api` został kiedyś przypisany Atlassianowi. Sam dowód linkiem wymaga
teraz dodatkowo repo w organizacji vendora.

**Przestrzelenie drugie, złapane po wdrożeniu na własnym korpusie:** widząc, że scope przypisał
`@transloadit/prettier-bytes` (formater bajtów jadący jako zależność Uppy) i
`@workos/radar-signals@0.0.1`, zablokowałem punkt dla pakietów, których nazwa nie wygląda na SDK.
To odebrało punkt `chromadb` i `@amplitude/analytics-browser`, czyli **dokładnie tym pakietom,
które deweloper instaluje**. Nazwa jest za grubym klasyfikatorem na to pytanie. Punkt wraca, a
zdanie niesie własne zastrzeżenie: *"published under your npm scope. If this is not the package you
want evaluated, name that one in your docs"*. Vendor poprawia nas jedną linijką zamiast tracić
punkt za naszą heurystykę.

Po drodze jeszcze jeden regres własny: ranking "im więcej marki w nazwie, tym lepiej" wybrał
`froala-pages` zamiast `froala-editor`, czyli ten sam błąd co historyczne `angular-froala` w innym
przebraniu. Rozstrzyganie kształtem jest binarne, resztę decydują pobrania.

**Stan korpusu po obu rundach (3.3 → 3.7, wszystkie 51 domen przeskanowane, 0 błędów):**

| | 3.3 | 3.7 |
|---|---|---|
| `oauth_dcr` niemierzalny | 37 | **1** |
| `typed_package` niemierzalny | 20 | **8** |
| Średnio punktów mierzalnych | 13,10 | **14,04** |
| Domen zmierzonych w całości | 3 | **10** |
| Domen ze zmienionym wynikiem | - | 18, **żadna w dół** |

Zostały trzy ślepe plamy i wszystkie trzy są **problemem discovery, nie projektu checku**:
`signup_no_captcha` (22, formularz nie istnieje w HTML-u serwera), `programmatic_provisioning`
(14, za mało stron docsów do przeczytania), `self_serve` (10, nie udało się pobrać cennika).
Pierwsza jest nienaprawialna bez przeglądarki, dwie kolejne to jakość wyszukiwania stron.

## Runda 2026-08-08 (siedemnasta): trzecia ślepa plama i wybór właściwej dokumentacji

Trzeci przebieg tej samej pętli: pytanie do korpusu, poprawka, przeskanowanie, porównanie.

**`programmatic_provisioning` niemierzalny na 14 domenach, bo czytaliśmy jedną stronę docsów.**
Przyczyna jest ładna: **strony z największą dokumentacją renderują nawigację JavaScriptem**, więc
w HTML-u nie ma żadnych linków do pójścia dalej. Dotyczyło to auth0.com, chargebee.com,
supabase.com, workos.com i zilliz.com. **Sitemapa przeżywa dokładnie ten rendering, który chowa
nawigację**, więc gdy w HTML-u brakuje kandydatów, dobieramy je z `sitemap.xml` (sekcja docsów,
apex, `/docs/`, `docs.<domena>`), filtrując po tych samych wzorcach ścieżek co wcześniej.

**Znalezisko przy okazji, poważniejsze od samego licznika: czytaliśmy nie tę stronę.**
Dla `auth0.com` discovery wybrało `developer.auth0.com`, bo strona główna tak linkuje "developers",
a **sitemapa tego portalu to eventy i newslettery**. Referencja, której szukaliśmy, nigdy nie
trafiła do korpusu. To znaczy, że przez cały czas oceniałiśmy Auth0 po niewłaściwym serwisie.

**Biblioteka bez cennika dostaje N/A, nie "nie dało się zmierzyć".** `self_serve` mówiło
open-source'owym projektom, że nie umieliśmy znaleźć czegoś, czego nie ma. Tę linię checki
rejestracyjne rysowały już wcześniej.

**Korpus po trzech rundach (3.3 → 3.8, 51 domen, 0 błędów):**

| | 3.3 | 3.7 | 3.8 |
|---|---|---|---|
| `oauth_dcr` niemierzalny | 37 | 1 | 1 |
| `typed_package` niemierzalny | 20 | 8 | 8 |
| `programmatic_provisioning` niemierzalny | 14 | 14 | **8** |
| `self_serve` niemierzalny | 10 | 10 | **3** (7 jako N/A) |
| Średnio punktów mierzalnych | 13,10 | 14,04 | **14,27** |
| Domen zmierzonych w całości | 3 | 10 | **13** |

**Jedyny spadek okazał się szumem, nie regresem.** `supertokens.com` spadł 7 → 6 na `self_serve`;
dwa natychmiastowe przeskanowania wróciły do 7. **Ich strona cennika odpowiada niedeterministycznie**,
a my pobieramy ją raz. To jest ta sama klasa problemu, dla której sondy rejestracji uruchamiamy
trzy razy, i **to jest następna pozycja**: pobranie cennika też powinno być powtarzane, a rozjazd
między próbami raportowany, tak jak przy drzwiach.

Zostająca ślepa plama numer jeden: `signup_no_captcha` (22), gdzie formularz nie istnieje w HTML-u
serwera. Bez przeglądarki nienaprawialne, i tak ma zostać opisane.

## Runda 2026-08-08 (osiemnasta): powtarzalność pomiaru zamiast kolejnych punktów

Runda o **wariancji**, nie o zasięgu. Wyszła z jednego spadku zauważonego w rundzie 17.

**Cennik czytany raz był próbką, nie pomiarem.** `supertokens.com` odpowiadał tym samym URL-em raz
z frazą o darmowym planie, raz bez, w odstępie czterdziestu minut, i to przesuwało punkt. Cennik
jest teraz pobierany dwa razy, a sygnały to **suma obu prób**; karta mówi wprost, gdy próby się
różniły. To ta sama zasada, którą test drzwi stosuje od dawna, tylko przeniesiona z kodu odpowiedzi
na treść.

**Trzy strony cenowe, których "nie umieliśmy znaleźć", istnieją.** `bunny.net` i `filestack.com`
serwują cennik, którego **ceny składa JavaScript**: agent czytający serwowany HTML też ich nie
zobaczy, więc to jest znalezisko o nich, a nie luka u nas. Zamiast "nie dało się pobrać cennika"
mówimy teraz, że **nic z ich cennika nie przeżywa bez JavaScriptu**. `plausible.io` sprzedaje
z kotwicy na stronie głównej, więc osobnej strony nigdy nie było czego szukać.

**Próbka dokumentacji była loterią.** Czytamy trzy strony z setek, a braliśmy je w kolejności, w
jakiej wypisała je strona albo sitemapa: `amplitude.com` dostał raz 1 z 7 fraz, raz 0, z innej
trójki. Kandydaci są teraz sortowani po tym, **jak wprost ścieżka obiecuje poświadczenia**
(`api-key` przed `credential` przed `provisioning` ... przed `reference`), z krótszą ścieżką jako
rozstrzygnięciem remisu. Próbka jest ta sama przy każdym uruchomieniu i lepiej wycelowana:
auth0.com +2, pinecone.io +1, supabase.com +1, zilliz.com +1.

**Korpus (3.3 → 3.9, 51 domen):** niemierzalnych werdyktów **108 → 45**, średnio punktów
mierzalnych **13,10 → 14,35**, domen zmierzonych w całości **3 → 14**.

**Test powtarzalności na produkcji, dwa skany pod rząd:** amplitude.com 9/15 = 9/15,
paddle.com 9/15 = 9/15, editorjs.io 4/10 = 4/10, **auth0.com 12/16 kontra 10/15**.

**To jest następna pozycja i jedyna znana niestabilność.** auth0.com potrafi między dwoma skanami
zmienić mianownik, czyli jeden check przechodzi z mierzalnego w niemierzalny. Podejrzenie: wybór
źródła dokumentacji (`developer.auth0.com` kontra `auth0.com/docs`) albo powodzenie sondy sitemapy
bywają różne. **Nie zgaduj, zmierz:** puścić ten sam skan kilka razy z logiem, które URL-e trafiły
do korpusu, i porównać.

Do czasu naprawy limit jest **opublikowany** na `/methodology`: czytamy stronę główną dokumentacji
plus najwyżej trzy, karta podaje ile stron przeczytała, a vendor, którego strona o poświadczeniach
nie trafiła do próbki, może nam to powiedzieć i przeskanujemy ponownie.

## Runda 2026-08-08 (dziewiętnasta): niestabilność auth0 była moja, nie ich

Pozycja z rundy 18 zamknięta, i wniosek jest niewygodny: **niestabilność wyprodukowałem sam
testując powtarzalność**. Instrumentacja najpierw, zgadywanie nigdy: dopisałem do wyników listę
adresów, z których faktycznie czytaliśmy dokumentację, i lokalnie auth0.com dał **trzy identyczne
przebiegi 12/16 z tą samą czwórką URL-i**. Sortowanie kandydatów z rundy 18 zadziałało.

Na produkcji wahanie zostało, więc porównałem check po checku ze świeżym wpisem z korpusu. Winne
były trzy pozycje naraz: `answers_plain_request` 1/1 → 0/1, `user_agents_allowed` 1/1 → 0/1,
`machine_readable_api` 0/1 → niemierzalne. Wspólna przyczyna: **auth0 odpowiadał 429 po czterech
skanach pod rząd**, czyli po moim własnym młóceniu.

**To był realny błąd produktowy, nie tylko artefakt testu.** Traktowaliśmy 429 tak samo jak 403
i pisaliśmy vendorowi, że **jego edge odrzuca zwykły HTTP**, za coś, co spowodowaliśmy sami. To
jest dokładnie ta klasa błędu, którą tępimy od rundy 9, tylko wycelowana na zewnątrz.

Naprawa:
- 429 daje **niemierzalne** z jawnym zdaniem *"which is a rate limit on us rather than a rule about
  agents"*, a nie zero. To samo dla `user_agents_allowed`.
- `blocksPlainRequests` **zostaje prawdą**, więc reszta checków dalej mówi "nie umieliśmy
  przeczytać" zamiast po cichu zamienić się w zmierzoną nieobecność. Zmienia się tylko to, **czyj
  to jest problem**.
- Test drzwi **rozstawia swoje trzy próby o 400 ms**, żeby nie produkować 429, który potem trzeba
  tłumaczyć.
- Korpus ma kolumnę **`rateLimited`** i notę o niej: skan pod limitem daje wiersz chudszy niż
  strona, a że korpus bierze najświeższy skan na domenę, taki wiersz mógłby wejść do publikacji
  bez ostrzeżenia. Filtrowanie go jest teraz możliwe dla każdego, kto bierze nasze dane.

**Dowód na produkcji, pięć skanów pod rząd:** 12/16, 12/16, potem 429 i **10/13** trzy razy, z
checkiem drzwi jako niemierzalnym. Zwróć uwagę na sam mechanizm: pod limitem **kurczy się
mianownik**, a nie wynik vendora, więc jego pozycja idzie 75% → 77% zamiast spaść. Przed naprawą
byłoby to 10/15 i dwa oskarżenia.

Korpus na formule **4.0**: 51 domen, niemierzalnych 45, średnio 14,35 punktu mierzalnego,
14 domen zmierzonych w całości, zero wierszy oznaczonych jako rate limited.

## Runda 2026-08-08 (dwudziesta): korpus podwojony, pięć audytów w tle

Na prośbę Krystiana: więcej sektorów, żeby było do kogo iść, gdy ruszamy na rynek.

**Korpus 51 → 103 domeny, 7 → 15 kategorii.** Dołożone: monitoring błędów, feature flagi, search
as a service, SMS/voice, headless CMS, kolejki i workflowy, hosting modeli i bramki LLM, oraz
wideo. Reguła doboru bez zmian: produkty, które deweloper integruje przez API i gdzie **zdobycie
poświadczenia jest krokiem, który agent musi przeżyć**. Każda kategoria ma co najmniej sześć
domen, więc wszystkie pokazują się w rankingach.

Skan całości na formule 4.0: **100 od razu, 3 timeouty** (sentry.io, telnyx.com, temporal.io),
wszystkie trzy przeszły przy powtórce. Średnio 14,17 punktu mierzalnego, **20 domen zmierzonych
w całości**, jeden wiersz oznaczony jako rate limited.

**Raport branżowy dostał punkt, którego wcześniej nie mógł postawić:** `36 z 50 nie publikuje
metadanych OAuth z endpointem rejestracji na żadnym hoście, który umieliśmy sprawdzić`. Przed
rundą 15 ten check był niemierzalny na 37 domenach, więc raport milczał o RFC 7591. Do tego trzy
nowe limity opublikowane na `/methodology`: 429 nigdy nie jest znaleziskiem o vendorze, cennik
czytany dwa razy, rejestracja klienta szukana na wielu hostach.

**Korekta własnego zdania o 429.** `defer.run` odpowiada 429 dynowi Heroku przy pierwszym
kontakcie, a 301 mojemu laptopowi, więc dla części hostów to **bramka na ruch z centrum danych**,
a nie limit, który wywołaliśmy. Nie umiemy tych dwóch przyczyn rozróżnić z samej odpowiedzi, więc
zdanie **wymienia obie** zamiast twierdzić jedną. Dla mierzalności to bez różnicy: nadal
niemierzalne.

**Pięć audytów puszczonych równolegle** (bezpieczeństwo, wartość dla kupującego, poprawność
werdyktów na nowych kategoriach, UI/UX przy 15 kategoriach, badanie problemów rynku). Wyniki
i decyzje w następnej rundzie.

## Runda 2026-08-08 (dwudziesta pierwsza): pięć audytów, i większość znalezisk była o nas

Pięć równoległych audytów subagentami: bezpieczeństwo, wartość dla kupującego, poprawność
werdyktów na nowych kategoriach, UI/UX przy 103 domenach, badanie rynku. Wszystkie wróciły
z dowodami, nie z opiniami. Poniżej to, co już wdrożone, i to, co zostało.

### Najdroższe: formularz mailowy kłamał

`/api/lead` zwraca 200 z `delivered: false`, gdy Resend odrzuca wysyłkę, a komponent uznawał
każde 200 za sukces i pisał **„The scorecard is in your inbox"**. Każdy odwiedzający, który
dotarł najgłębiej, czyli wpisał firmowy adres na własnej karcie wyniku, był tracony i dostawał
nieprawdę. Teraz osobny stan mówi, co się stało, i przypomina, że karta ma trwały URL.

### Bezpieczeństwo: rdzeń SSRF wytrzymał atak, reszta nie

Audytor próbował obejść `assertPublicHost` i walidujący `connect.lookup` (DNS rebinding,
przekierowania, kodowanie dziesiętne i ósemkowe, IPv6, userinfo) i **nie złamał tego**. Naprawione
natomiast: `/api/lead` sprawdzał dwa limity i **nie naliczał żadnego**, dopóki wysyłka się nie
powiodła; ten sam endpoint przyjmował żądania cross-origin z ciałem `text/plain`, które nie
wymaga preflightu, więc dowolna strona mogła kazać przeglądarkom gości wysyłać nasz mail na
wybrany adres; `endsWith(domain)` bez granicy etykiety (skan `ank.com` poszedłby na `mybank.com`);
sortowanie wrogiej sitemapy budujące trzy obiekty URL na porównanie; IPv6 link-local jako literał
`fe80` zamiast zakresu `fe80::/10`; brak neutralizacji formuł w CSV; zaufanie do
`x-forwarded-host` lądujące w każdym `helpUri`.

### Poprawność werdyktów: dwie przyczyny systemowe naprawione, jedna w toku

**Karta MCP nazywa serwer, a my zgadywaliśmy.** Sentry i Telnyx publikują `/.well-known/mcp.json`
z polem `endpoint`, którego nigdy nie odpytaliśmy, i dostali FAIL ze zdaniem *„karta to deklaracja
o serwerze, a nie serwer"*, podczas gdy ich serwery kończą handshake. Sentry ma go na innej domenie.
Teraz: dereferencja karty, `api.<domena>`, kombinacje host plus ścieżka, prawdziwe `initialize`
po POST zamiast GET, a **ukończony handshake bije sondę wildcardową**, bo adres podany przez
vendora nie jest zgadywaniem. Telnyx 0 → **1/1**, Sentry 0 → **1/1** plus `oauth_dcr` 1/1.

**Zamknięte drzwi frontowe traktowaliśmy jak ślepotę na całą witrynę.** Vonage odpowiada 403 na
hoście marketingowym, a w tym samym skanie przeczytaliśmy jego llms.txt, dokumentację i paczkę,
i mimo to **pięć checków wypadało z mianownika** ze zdaniem „każde żądanie zostało odrzucone".
Wygaszenie wymaga teraz, żebyśmy naprawdę niczego nie przeczytali (`readAnything`).
Vonage 4/10 → **5/13**, Bitmovin 8/12 → **9/14**.

**W toku:** atrybucja npm, błędna w 19 z 52 wierszy w trzech odmianach, w tym oskarżenie
*„is not clearly yours"* rzucane paczkom, których maintainerem jest vendor, w tej samej odpowiedzi
registry, którą już pobieramy.

### UI: dwie naprawy

Sekcja rankingu na landingu miała **5 339 z 10 002 pikseli** strony na telefonie, czyli sześć
i pół ekranu listy, zanim czytelnik dotarł do opisu pięciu etapów. Pokazujemy pięć pozycji na
kategorię i odsyłamy po resztę do danych. Druga: **etap oblany rysował się jako 2 piksele**, więc
przy pobieżnym spojrzeniu wyglądał jak etap niemierzalny, co niszczy cały sens znaku. Teraz zero
ma 10% toru, a każdy wynik powyżej zera co najmniej 20%, więc kolejność jest zawsze czytelna.

### Rynek: dwie rzeczy przeciwko nam

**llms.txt prawdopodobnie nie działa.** Niezależny pomiar przez 90 dni: 84 żądania na 62 100
wizyt botów AI. Cloudflare celowo nie wlicza go do wyniku. Sprawdziłem nasze własne dane:
**w 18 izolowanych przebiegach żaden agent nie zacytował llms.txt wśród źródeł.** Nie usunąłem
punktu, bo nasz dowód jest słabszy, niż brzmi (przebieg może pobrać plik i go nie wymienić), ale
**opublikowałem to jako limit i w opisie samego checku**. Jeśli ktoś wybiera, co robić najpierw,
to nie to.

**Jednorazowy pomiar to szum, i rynek już to mówi głośno.** Rand Fishkin na 2961 wykonaniach
promptów: te same marki wracały w mniej niż 1 na 100 powtórzeń. To jest zarzut wycelowany
w **płatny audyt**, nie w skaner, a jedyna obrona to powtórzenia i rozkład zamiast pojedynczego
wyniku. **To musi trafić do metodologii płatnego audytu, zanim ktoś zapyta** i jest to następna
pozycja merytoryczna.

### Zostało z audytu wartości, w kolejności straty

1. Brak ścieżki zakupu: jedyny mechanizm to `mailto` na prywatnego Gmaila.
2. Brak próbki deliverable'u za 11 000 USD. Cztery opublikowane audyty są nią i leżą za linkiem
   w menu.
3. Cena i nazwisko nie występują na landingu ani razu.
4. Darmowa warstwa oddaje wiedzę, płatna sprzedaje potwierdzenie tej wiedzy. To odwrotnie, niż
   powinno być.
5. Korpus 103 vendorów jest wspomniany na jednej stronie, na dole. Jako jedyny asset zdolny
   przyciągać ruch bez outboundu, powinien być na `/docs`, `/methodology` i karcie wyniku.

### Efekt poprawki MCP na korpusie: byliśmy ślepi na 22 działające serwery

Przeskanowanie 103 domen na formule 4.1 (102 od razu, payloadcms.com przy powtórce):

| | 4.0 | 4.1 |
|---|---|---|
| **Znalezione serwery MCP** | 27 | **49** |
| Werdyktów niemierzalnych łącznie | 119 | **108** |
| `machine_readable_api` niemierzalny | 6 | 3 |
| `signup_reachable` / `user_agents_allowed` / `oauth_dcr` niemierzalne | 3 / 3 / 3 | 1 / 1 / 1 |
| Średnio punktów mierzalnych | 14,17 | 14,24 |

**Mówiliśmy 22 firmom, że nie mają serwera MCP, a mają.** To najdroższy błąd, jaki ten skaner
popełnił, bo dotyczył checku, który sami reklamujemy jako nasz obszar, i był sprawdzalny jednym
curlem. Przyczyna: sondowaliśmy nazwę hosta zamiast rozwiązać adres, który vendor sam podaje
w karcie.

Przy okazji zdanie w raporcie branżowym przestało być prawdziwe w chwili, gdy skan się poprawił:
*„Talking about MCP is common; running one is not"* przy 49 na 103. Teraz raport mówi, że to
jedyny etap lejka, który rynek ruszył, i że serwer, który agent może wywołać, to nie poświadczenie,
które agent może zdobyć.

## Runda 2026-08-08 (dwudziesta druga): odpowiedź na zarzut, który decyduje o zakupie

Z audytu wartości i badania rynku wynikało to samo: kupujący przychodzi z jedną obiekcją, która
przesądza wszystko, a strona jej nie dotykała.

**„Jeden przebieg agenta niczego nie dowodzi".** Najlepszy publiczny pomiar tego zjawiska to 2961
wykonań promptów, w których ten sam zestaw marek wracał rzadziej niż raz na sto prób. Kto sprzedaje
pozycję w rankingu AI z jednego przebiegu, sprzedaje szum. `/pricing` ma teraz sekcję, która mówi
to wprost **i mówi, czego nasza próbka nie potrafi**: cztery do sześciu przebiegów na komórkę
wystarczą, by zobaczyć ścianę, w którą uderza każdy przebieg, i nie wystarczą, by uszeregować
dwóch dostawców kończących blisko siebie. Za każdym razem mówimy, którym z tych dwóch jest dane
znalezisko.

**Cztery opublikowane audyty stały się próbką deliverable'u**, bo nią są, a leżały wyłącznie za
linkiem w menu. Sekcja o powtórzeniach kończy się linkiem do nich ze zdaniem, że można je
sprawdzić przed zapłaceniem czegokolwiek.

**Cena i nazwisko wróciły na landing.** Oba były dwa kliknięcia w dół strony pełnej rankingów, więc
VP z LinkedIna nie dowiadywał się ani ile to kosztuje, ani kto wystawia fakturę na cztery cyfry.

**Korpus podlinkowany z `/docs` i `/methodology`**, nie tylko z dołu raportu. To jedyny asset
zdolny przyciągać ruch bez outboundu, a na stronie o metodologii jest dodatkowo argumentem:
kłócić się z formułą łatwiej danymi niż prozą.

### Zostało z listy audytu wartości

1. **Brak ścieżki zakupu innej niż `mailto` na prywatny adres.** Kalendarz i firmowy adres to
   decyzja Krystiana, tak samo jak domena.
2. **Darmowa warstwa oddaje wiedzę, płatna sprzedaje jej potwierdzenie.** Strukturalne i
   najtrudniejsze: scorecard oddaje priorytetyzowaną roadmapę, `/findings` oddaje wnioski
   wszystkich pięciu badań, a strony audytów oddają rekomendacje kategorialne. Do przemyślenia,
   nie do załatania jednym akapitem.

## Runda 2026-08-08 (dwudziesta trzecia): atrybucja npm przepisana, i wada produkcyjna pod spodem

**Atrybucja npm rozdzielona na dwa pytania z osobnymi dowodami.** Kto publikuje: `maintainers[]`
z odpowiedzi registry, którą i tak już czytamy, domena w mailu maintainera albo repo w organizacji
nazwanej po vendorze. **Scope npm nie jest dowodem własności** i to jest kontrintuicyjne, ale
`@betterstack/*` należy do innej firmy niż `betterstack.com`. Która z ich paczek jest SDK: odsiew
CLI, wtyczek i bindingów po nazwie **i po opisie**, zepchnięcie paczek uśpionych i przedpremierowych,
potem kształt nazwy, potem użycie, a przy remisie pytanie manifestu, która paczka wciąga którą.

Naprawione: launchdarkly, algolia, daily, sinch, searchkit, baseten, temporal, together, typesense,
split, unleash, orama, twilio, raygun, highlight, honeybadger, storyblok, mailgun, workos,
tiny.cloud i transloadit. Regresje historyczne trzymają: htmx nadal wybiera `htmx.org`, nie
`idiomorph`, `statuspage.io` i `allegro.pl` nadal odrzucone, froala nadal `froala-editor`.

**Dwa nowe błędy weszły razem z poprawką i wyłapałem je na korpusie, nie na testach.**
`@boundstate/editorjs-attaches` to fork opublikowany w cudzym scope, którego pole `repository`
nadal wskazuje `github.com/editor-js`, więc trafiło w regułę „repo w organizacji vendora". Repo
liczy się teraz tylko wtedy, gdy paczka **nie jest w cudzym scope**. Druga: paczka `agora` nie ma
repozytorium, opisu ani słów kluczowych i jest publikowana przez `agora.build`, inną firmę niż
`agora.io`. Paczka, która nic o sobie nie mówi, nie jest niczyim SDK.

**Efekt na korpusie:** `typed_package` niemierzalny **24 → 7**, zdanych **68 → 87**, werdyktów
niemierzalnych łącznie **108 → 91**, domen zmierzonych w całości **20 → 23**.

### Wada produkcyjna: skan wolnej domeny umiera na 30 sekundach

Zmierzone na produkcji: `resend.com` 200 w 9,8 s, `api.video` **503 po 30,19 s**, `payloadcms.com`
**503 po 30,32 s**. To jest **timeout routera Heroku**, a `maxDuration = 60` w trasie to dyrektywa
Vercela i na tym hoście nie robi nic. Każda domena, której skan trwa dłużej niż 30 sekund, zawodzi
dla każdego wywołującego: strony, narzędzia MCP i CI. Robi to po cichu od zawsze, a dzisiejsze
dodatki (handshake MCP do pięciu adresów, OAuth po ośmiu hostach, sitemapy, kilka zapytań do
registry przy atrybucji) zbliżyły reszcie domen do progu.

**Zlecone subagentowi:** najpierw pomiar, gdzie idzie czas, potem **twardy deadline mieszczący się
w 30 sekundach**, przy którym skan **nadal zwraca kartę**: co zmierzone zostaje zmierzone, a każdy
check bez dowodu wraca jako **niemierzalny ze zdaniem, że zabrakło czasu**, nigdy jako zmierzone
zero. Ucięty skan nie może wyglądać jak kompletny.

## Runda 2026-08-08 (dwudziesta czwarta): własne pliki dla agentów były najbardziej nieaktualną rzeczą, jaką publikujemy

Ironiczne, bo dokładnie to grillujemy u innych. `agents.md` i `agent-signup.md` mówiły agentowi,
że skan **„can reach a minute"**, co jest nie tylko nieprawdą, ale i szkodliwe: zwykły endpoint
umiera na timeoucie bramy, a odpowiedzią jest strumieniowy. Opisywały `inconclusive` i nie
opisywały `notApplicable`, **nie wspominały o `measurable`**, czyli o mianowniku, który jest całym
sensem wyniku, i milczały o serwerze MCP, formatach `sarif` i `agent` oraz o zbiorze danych.

Poprawione: agent czytający `agents.md` dostaje teraz wprost, że ma czytać `measurable`, a nie
`max`, że są dwa różne stany „nie policzone" i czym się różnią, że ten sam skan jest narzędziem
MCP, i że wszystko opublikowane leży w `/corpus.json`.

Drobne z audytu UI: tabela na `/report` przewija się w bok, a na telefonie kolumna
**Unmeasurable**, czyli ta, o którą cała strona się spiera, leżała poza krawędzią bez żadnej
informacji. Teraz jest o tym zdanie, widoczne tylko na wąskim ekranie.

**Karta OG w firmowym kroju.** Satori bez podanego fontu używa własnego, więc **każdy scorecard,
którym ktoś się podzielił, renderował się generycznym krojem**, choć cała strona jest w IBM Plex.
To akurat ten jeden asset, który reprezentuje markę w momencie udostępnienia. Dwie wagi wgrane
jako TrueType, bo satori nie czyta woff2, czytane raz na proces, licencja OFL leży obok plików.

## Runda 2026-08-08 (dwudziesta piąta): skan mieści się w bramie, i nie punktuje tego, czego nie dotknął

Wada z rundy 23 zamknięta. Przyczyny zmierzone, nie zgadnięte, i były trzy naraz:

1. **Martwy host sondowany w kółko po 10 sekund.** `api.payloadcms.com` rozwiązuje się i nie
   przyjmuje połączeń; domyślny timeout połączenia undici odpalał **cztery razy w jednym skanie**
   (subdomena docsów, sonda MCP, dwie ścieżki OAuth), co dało ~30 z 37,8 s. Nic nie dzieliło się
   wiedzą, że host już raz nie odpowiedział.
2. **Sześć faz szło szeregowo bez powodu.** Discovery 8,3 s → funnel 7,1 s → machine 2,1 s,
   prawie nic wzajemnie zależne.
3. **Rozgałęzienie czekało na najwolniejszego.** Jeden martwy `api.` blokował adres docsów, który
   już mieliśmy w ręku.

**Naprawa:** budżet całego skanu w `AsyncLocalStorage`, dziedziczony przez REST, MCP i SSE, timeout
pojedynczego żądania pod timeoutem połączenia undici, **pamięć zdrowia hostów** pomijająca tylko te,
które nigdy nie odpowiedziały, cache odpowiedzi w obrębie skanu (test drzwi i powtórka cennika
świadomie z niego wypisane) oraz limit równoległości na witrynę z pałeczką podawaną następnemu
czekającemu, żeby zwolniony slot nie przepuścił nadmiarowego żądania.

**Zmierzone:** payloadcms.com 37,9 → 10,0 s, stripe.com 19,9 → 6,7 s, resend.com 11,4 → 4,0 s,
api.video 10,2 → 3,0 s, przy **wszystkich 70 wynikach checków identycznych** z wersją sprzed zmiany.
Na produkcji `api.video` i `payloadcms.com` **zwracają wynik zamiast 503**, a przeskanowanie korpusu
poszło **103 na 103, zero błędów** - pierwszy raz bez ani jednego timeoutu.

**Najważniejsze jest w scorerze, nie w skanerze.** Ucięty skan oznacza teraz każdy nietknięty check
jako niemierzalny **niezależnie od tego, ile punktów dostał**, bo punkty nie są dowodem: `robots.txt`,
którego nigdy nie pobraliśmy, czytał się jako „brak robots.txt, więc nic nie jest zabronione"
i dostawał za to punkt. Sprawdzone przy wymuszonym budżecie 3 s: karta wraca, mianownik kurczy się
do tego, co faktycznie zmierzone.

**Jedno zdanie sprzeczne samo ze sobą, znalezione przy porównaniu korpusu:** `postmark.com`
odpowiedział 200, 429, 200, a karta mówiła **„Unmeasurable: answered 200"**. Rate limit oślepia nas
tylko wtedy, gdy jest **jedyną** odpowiedzią, jaką dostaliśmy.

**Do obserwacji po wdrożeniu:** `bitmovin.com` stracił punkt za punkty wejścia, a ich edge jest
udokumentowany jako niedeterministyczny (ta sama ścieżka raz 200, raz 403). Nie widzę mechanizmu po
naszej stronie, ale to jest domena do sprawdzenia przy następnym korpusie. Drugi punkt uwagi:
**SSE dzieli teraz ten sam budżet 21 s** co REST, więc przeglądarka może uciąć skan, który wcześniej
kończyła; zostawione celowo, żeby wszystkie powierzchnie mierzyły tak samo, i sterowalne przez
`SCAN_BUDGET_MS`.

## Runda 2026-08-08 (dwudziesta szósta): narzędzie, które czyta nasze wiersze tak, jak przeczyta je obcy

Czwarta przyczyna systemowa z audytu poprawności, ta najtańsza do złapania: **wiersz sprzeczny sam
ze sobą**. Rzędy mówiły „każde żądanie zostało odrzucone", a sąsiedni check w tym samym wierszu
cytował właśnie pobraną stronę. To widać bez wykonania choćby jednego żądania, samym czytaniem
wiersza linia po linii, więc powinno być łapane przed publikacją, a nie przez obcego.

**`npm run audit`** czyta opublikowany korpus i szuka: sprzeczności między odmową a zacytowaną
treścią, wiersza twierdzącego „nic nie linkuje do rejestracji", gdy inny check cytuje link
rejestracji, oraz dwóch niezmienników arytmetycznych (suma punktów liczonych równa się `total`,
a checki wykluczone tłumaczą dokładnie różnicę `max - measurable`). Na 103 wierszach formuły 4.3:
**zero sprzeczności**, po naprawie jednego fałszywego trafienia w samym detektorze („only 0
documentation pages could be read" to zaprzeczenie, nie dowód).

Przy okazji poprawione zdanie, które i tak było bez sensu: przy zerze stron mówimy teraz, że nie
udało się przeczytać ani jednej strony dokumentacji, zamiast „only 0 pages".

**W toku:** subagent naprawia trzecią przyczynę systemową, czyli discovery przyjmujące dowolny URL
jako „docs", „signup" albo „pricing" bez sprawdzenia, czy strona jest tym, co mówi etykieta.
To stąd dokumentacja Pipecata jako dokumentacja Daily, wpis blogowy jako docsy GrowthBooka,
`/ebooks` jako dokumentacja Flagsmitha i wpis blogowy Twilio jako strona rejestracji.

## Runda 2026-08-08 (dwudziesta siódma): czwarta i ostatnia przyczyna systemowa

Discovery przyjmowało URL jako „dokumentację", „rejestrację" albo „cennik" **na podstawie tego,
gdzie znaleziono link**, a nie czym strona jest. Wszystko poniżej mierzyło potem złą stronę
i publikowało to pod nazwą vendora ze zdaniem „w N stronach dokumentacji, które przeczytaliśmy".

Naprawione przypadki: `daily.co` oceniane po dokumentacji **innego frameworka** (Pipecat),
`growthbook.io` po wpisie blogowym o multi-arm bandits, `flagsmith.com` po marketingowej liście
e-booków, `twilio.com` po stronie-hubie, gdy ich własne `/docs` leżało jedno zgadnięcie dalej,
`honeybadger.io` po surowym pliku tekstowym policzonym jako „strona dokumentacji", a jako
„rejestracja" braliśmy wpis blogowy Twilio, bo miał słowo signup w slugu.

**Reguła:** każdy kandydat jest teraz pobierany i sprawdzany, czym jest. Link vendora jest
**preferowany** nad zgadnięciem, ale nie **bardziej ufany**, więc llms.txt straciło przywilej -
kilka najgorszych wyborów pochodziło właśnie stamtąd. Dokumentacja odpada, gdy nie jest HTML-em,
gdy końcowy URL wychodzi poza witrynę vendora albo gdy leży w sekcji, która dokumentacją nigdy nie
jest. Zwycięzcy są sortowani po tym, **jak kanoniczne jest miejsce**, a nie po ilości tekstu, bo
każdy błędny wybór czytał się bogaciej niż strona, którą pokonał. Rejestracja musi mieć formularz
z polem hasła lub e-maila, host uwierzytelniający albo segment ścieżki, który **jest** słowem
signup. **401 i 403 na stronie rejestracji są akceptowane**, bo to jest dokładnie to znalezisko,
dla którego te checki istnieją.

Do tego wyłapane linki rejestracji leżące na stronach, które i tak już pobraliśmy, oraz na innej
domenie rejestrowalnej po przejęciu: `elastic.co`, `typesense.org` i `split.io` były raportowane
jako **niemające żadnego linku do rejestracji**, mając go w HTML-u, który mieliśmy w ręku.

**Korpus 4.4, 103 na 103, zero błędów, zero sprzeczności w `npm run audit`:**

| | 4.3 | 4.4 |
|---|---|---|
| Werdyktów „nie dotyczy" | 58 | **38** |
| Domen zmierzonych w całości | 22 | **29** |
| Średnio punktów mierzalnych | 14,43 | **14,60** |
| Domen ze zmienionym wynikiem | - | 32 (15 w górę, 17 w dół) |

Spadek liczby „nie dotyczy" o dwadzieścia to sedno: tyle razy pisaliśmy „to cię nie dotyczy",
podczas gdy dotyczyło, tylko patrzyliśmy na złą stronę. Rozkład zmian mniej więcej po równo w obie
strony jest tym, czego się spodziewać, gdy przestaje się mierzyć niewłaściwą stronę: jednych
schlebiał bogaty wpis blogowy, innych krzywdziła chuda strona docelowa. `auth0.com` spadł
z 12 na 10, bo jest wreszcie oceniany po `auth0.com/docs`, a nie po portalu deweloperskim.

### Wszystkie cztery przyczyny systemowe zamknięte

1. Sonda MCP zgadywała nazwę hosta zamiast rozwiązać adres z karty vendora → **27 → 49** znalezionych
   serwerów.
2. Atrybucja npm po kształcie nazwy zamiast po tym, kto publikuje → **19 z 52** wierszy poprawionych.
3. Zamknięte drzwi frontowe traktowane jak ślepota na całą witrynę → pięć checków wracało do
   mianownika.
4. Typ strony brany z etykiety linku, nie ze strony → powyżej.

### Lekcja procesowa

Dwukrotnie moje `git add -A` wciągnęło do commita pliki, nad którymi pracował subagent. Nic nie
przepadło, ale historia jest myląca. **Gdy subagent pracuje na plikach, commituję po ścieżkach,
nie `-A`.**

## Runda 2026-08-08 (dwudziesta ósma): trzy stany skanu widoczne na karcie, i sprzeczność, którą sam zrobiłem

Skan może się teraz skończyć na trzy sposoby i **dwa z nich były niewidoczne dla czytelnika karty**,
choć siedziały w zdaniach przy pojedynczych checkach. Liczba na górze jest tym, co ludzie cytują,
więc ucięty skan wyglądał jak kompletny.

Doszły dwa bannery obok istniejącego „Blocked at the door":
- **„This scan ran out of time"** z liczbą checków, które nie dostały dowodu, i zdaniem, że wynik
  nie jest gorszy, tylko mniejszy.
- **„We were rate limited"**, jedyny banner, który **broni vendora zamiast go oskarżać**: 429 to
  albo limit, który wywołaliśmy, albo bramka na sieć, z której skanujemy, i z zewnątrz nie
  rozróżnimy tych dwóch.

**I natychmiast zrobiłem sprzeczność, którą tępię od rundy 9.** Na karcie `defer.run` renderowały
się **oba** bannery naraz: jeden mówił, że 429 nie jest pomiarem tego, jak traktujesz agenty,
a drugi zaraz pod nim, że drzwi są zamknięte dla agentów, o tym samym 429. Jedna strona nie może
trzymać obu. „Blocked at the door" nie pokazuje się już przy rate limicie. Wyłapane przez
sprawdzenie na produkcji, nie przez build.

**W toku:** subagent weryfikuje, czy cztery naprawione przyczyny są naprawdę zamknięte, co te
naprawy popsuły (32 domeny zmieniły wynik, 17 w dół) i czy istnieje piąta przyczyna, której nikt
jeszcze nie nazwał.

**`/findings` argumentowało połowę sprawy.** Badania agentowe mówią, że ściana istnieje; korpus
mówi, **ilu z rynku za nią stoi**, a strona robiąca ten argument nigdy tego nie pokazywała. Doszedł
blok liczony na żywo: 103 vendorów, z czego **26 uruchamia serwer MCP i nie dokumentuje żadnej
drogi do poświadczenia dla niego**. To jest ta sama teza co osiemnaście przebiegów wyżej, tylko
w skali, do której żadna liczba przebiegów by nie dobiła, i za zero kosztu modelu.

## Runda 2026-08-08 (dwudziesta dziewiąta): piąta przyczyna, większa niż cztery poprzednie razem

Weryfikacja czterech napraw przyniosła gorszą wiadomość niż same naprawy. **Piąta przyczyna
systemowa: każdy check treściowy rozstrzygamy na jednym adresie i na dopasowaniu ciągu znaków,
po czym publikujemy wynik jako twierdzenie o całej witrynie, mimo że ten sam skan trzyma już
w pamięci dowody, które temu przeczą.**

Mechanizmy, każdy sprawdzony realnym żądaniem:
- Ranker dokumentacji premiuje **najpłytszą** stronę, a front docsów to dokładnie shell nawigacji
  renderowany JS-em. Publikujemy `chargebee.com` jako **„Only 14 characters render without JS"**,
  podczas gdy strona o kluczach API tego samego serwisu, **pobrana w tym samym skanie**, ma 8 856
  znaków. Tak samo stytch.com (1 680 kontra 16 957), plivo.com (883 kontra 12 377) i siedem innych.
- `docsTextChars` liczy się z tej jednej strony; trzy strony z `readDeeper()` idą wyłącznie do
  grepa provisioningu i nigdy nie wracają.
- Plik pobrany dla jednego checku jest niewidoczny dla drugiego. `trigger.dev` ma „Management API"
  we własnym `llms.txt`, **który przeczytaliśmy**, i dostaje 0/2 za brak tego, co mieliśmy w ręku.
- Sitemapa jest ucinana do pierwszych 500 URL-i **przed** rankingiem, a strony o kluczach API
  algolii siedzą od pozycji 816, launchdarkly od 853.
- **Publikujemy zdanie o żądaniu, którego nie wysyłamy:** „Signup answers N to a non-browser
  request", podczas gdy sonda idzie z UA przeglądarki. `liveblocks.io` odpowiada 200 z prawdziwym
  formularzem agentowi trzy razy na trzy i jest za to oblany. **Naprawione po mojej stronie od
  razu:** zdanie nie twierdzi już nic o user-agencie, dopóki sonda go nie wysyła.
- `ckeditor.com`: „MCP mentioned 108x" pochodzi z ciała uciętego na 400 kB przy pliku 7,08 MB.
  Prawdziwa liczba to 540. Publikujemy zaniżoną pięciokrotnie liczbę jako fakt o vendorze.

**Osobna klasa błędu, znaleziona przy okazji:** `sendgrid.com` przekierowuje na
`www.twilio.com/en-us/sendgrid`, a my mierzymy Twilio i publikujemy to **pod nazwą SendGrida**.
Dziesięć z czternastu zdań w obu wierszach jest identycznych.

### Lekcja o moim własnym sprawdzaniu

Deploy odrzucony przez Heroku ujawnił, że **grepowanie „Compiled successfully" nie jest zieloną
kompilacją**: `next build` puszcza typecheck **po** tym komunikacie. Mój skrypt audytowy miał
`process.exit` w środku, więc dopisany kod był nieosiągalny, typowany jako `never` i nie
kompilował się. Lokalnie widziałem „Compiled successfully" i uznawałem to za zielone.
**Od teraz grepuję też `Failed to type check` i `error TS`.**

## Runda 2026-08-08 (trzydziesta): weryfikacja piątej naprawy realnym żądaniem

Poprzednia runda podniosła średnią z 8,50 do 9,23 i zmieniła 56 domen. Raport subagenta zawierał
zdanie, którego nie dało się pogodzić z opublikowanym korpusem: **„ckeditor stays 0 (it genuinely
does not negotiate)"**, podczas gdy korpus 4.5 pokazywał `ckeditor.com | Docs serve markdown to
machines`. Jedno z dwóch było fałszem, więc poszło żądanie po żądaniu.

**Wygrał korpus, nie raport.** `ckeditor.com/docs/` oddaje `text/html`, ale
`ckeditor.com/docs/ckeditor5/latest/getting-started/index.html` oddaje **`text/markdown`, 5 897 B**.
Subagent sprawdził front docsów i uogólnił to na witrynę, czyli popełnił dokładnie tę piątą
przyczynę, którą naprawiał. Sprawdzone ręcznie sześć nowych przejść (`ckeditor`, `bitmovin`,
`chargebee`, `configcat`, `contentful`, `directus`): **wszystkie negocjują naprawdę**, żadne nie
robi tego na stronie tytułowej dokumentacji.

Z tego wynikła naprawa, nie z testu: **werdykt „Docs serve markdown to machines" nie nazywał
strony**. Vendor testował jedyny adres, jaki podawaliśmy, dostawał HTML i miał pełne prawo uznać
finding za wymyślony. Teraz zdanie kończy się adresem, który faktycznie odpowiedział.

**Druga naprawa, znaleziona przy trzech domenach, które spadły.** `postmark.com` zjechał 10 -> 8 na
`programmatic_provisioning`, a lokalnie ten sam skan znajduje u nich „management api" i „account
api". Różnica: produkcja przeczytała 2 dokumenty, lokalna maszyna 3. **Stronę, która odmówiła nam
odpowiedzi, liczyliśmy jako stronę, która milczy o kluczach.** Postmark dokumentuje tworzenie
kluczy przez Account API, a my publikowaliśmy o nich „No programmatic credential creation
described". Nieprzeczytana strona daje teraz `inconclusive`, nie porażkę.

`getunleash.io` (11 -> 10) nie jest regresją wyceny: skan skończył się na budżecie 21 s, trzy checki
poszły jako niemierzalne. `baseten.co` (10 -> 9) czeka.

**Wciąż otwarte i oddane subagentowi:** liczba głębszych stron dokumentacji **waha się między
identycznymi przebiegami na tej samej maszynie** (postmark: raz 1 strona, raz 0), a przy zerze
`docsPagesUnread` też jest zerem, więc kandydaci nie odpadli na pobieraniu, tylko lista wyszła
pusta. Zgadywałem dwa razy i dwa razy się myliłem, więc analiza poszła do subagenta z poleceniem
instrumentacji zamiast hipotez. Podejrzenie do potwierdzenia: `sitemapCandidates` wymaga
`hostname === domain`, a docsy Postmarka stoją na **postmarkapp.com** przy skanowanej domenie
**postmark.com**, więc cała sitemapa (950 wpisów) mogła zostać odrzucona.

Formuła **4.6**.

## Runda 2026-08-08 (trzydziesta pierwsza): audyt z zewnątrz, czyli co widzi obcy

Subagent przeczytał **tylko to, co widać przez HTTP**, w trzech rolach: DevRel u zeskanowanego
vendora, inżynier szukający co zrobić w poniedziałek, i sceptyk z jednym curl-em. Zweryfikowałem
najcięższe zarzuty własnymi żądaniami, zanim cokolwiek ruszyłem. Formuła **4.7**, potem **4.8**.

### 1. Złamana obietnica o prywatności, jedyny zarzut prawny na liście

Cztery razy na stronie obiecywaliśmy, że skan uruchomiony przez odwiedzającego **nigdy nie trafia
do publikowanego korpusu**. Trafiał. Skan zeskanowanej domeny stawał się najnowszym raportem, jaki
trzymamy, więc **jedno anonimowe żądanie usunęło `resend.com`** z opublikowanych danych i z raportu
branżowego. Potwierdzone: korpus miał 101 wierszy i nie miał resend.com, który dzień wcześniej był
numerem jeden rankingu.

Naprawa: raport niesie znacznik `seeded` (czy uruchomiliśmy go my), a `publishedCorpus()` jest
**jedyną definicją korpusu**. Przy okazji znikły trzy różne liczby domen, bo strona główna, `/report`
i `corpus.json` liczyły każde po swojemu (103 kontra 104 kontra 101 w tej samej minucie).

### 2. Sztandarowa teza fałszywa dla 18 z 49 wierszy

„Live MCP endpoint, answered 405 to GET" brało **405 na POST** za dowód serwera, a zdanie mówiło
o GET, którego nie wysyłamy. Sprawdzone ręcznie: `tiptap.dev/mcp` i `tiptap.dev/zzz-nonsense-9182`
odpowiadają **identycznie**, tak samo temporal.io i configcat.com. Sonda kontrolna, która od dawna
chroni pliki `.md`, **nie była zapięta na MCP**.

Teraz jest: nierutowana ścieżka na tym samym origin, ta sama metoda. Wyjątek dla wyzwania OAuth
z nagłówkiem `WWW-Authenticate`, bo host bramkujący każdą ścieżkę to dokładnie `mcp.sentry.dev`
(bez tego wyjątku wycinałem prawdziwy serwer Sentry). Zweryfikowane na produkcji: tiptap, temporal,
configcat i postmark wypadły, sentry, stripe, cloudflare, supabase, linear i agora zostały.

### 3. Karaliśmy vendora za własną ślepotę

`openai.com`: proza na karcie mówiła „to wasz WAF odrzuca sieć, z której skanujemy, a nie reguła
o agentach", a punkt i tak szedł do mianownika. Gdy przeglądarka też dostaje odmowę, check jest
teraz niemierzalny, zgodnie z tym, co obiecuje metodologia.

### 4. Dwa punkty za istnienie pliku

`agent_entry_point` to 2 z 16 punktów, najwięcej w formule, i dostawało się je za **sam plik**.
`inngest.com` miał pełne 2/2 za 583-bajtowy `ai.txt`, którego cała treść to `Allow-AI-Training: yes`,
czyli polityka uprawnień w kształcie robots.txt. Plik musi teraz nazwać poświadczenie, endpoint albo
drogę do konta. Inngest spada na 1/2 z uzasadnieniem, loops.so, weaviate.io i openrouter.ai zostają.

### 5. `facebook/react` jako repozytorium buttondown.com

Discovery brało **pierwszy link do GitHuba na stronie**, czyli framework każdego docsa na Mintlify.
To jedyna linijka, którą vendor sprawdza w pół sekundy. Właściciel musi teraz nieść nazwę vendora,
a brak repozytorium jest lepszą odpowiedzią niż cudze.

### Reszta z tej rundy

- Najcięższy check nazywa dopasowane frazy, a metodologia publikuje wszystkie siedem i przestaje
  twierdzić o pułapie czterech stron, który łamała na 67 ze 103 wierszy.
- Akapit o sześciu agentach na każdej karcie brzmiał, jakby dotyczył czytelnika. Teraz mówi wprost,
  że badanie było o innym vendorze.
- `/docs` nie dokumentowało pola `measurable`, czyli **jedynego mianownika**, o którym cała reszta
  strony mówi, że jest najważniejszy. Integrator implementujący nasz kontrakt publikowałby 8/16
  zamiast 8/14, czyli dokładnie ten błąd, który zwalczamy.
- Trzy pożyczone liczby bez źródła: dwie dostały je (Otterly, `browser-image-compression` do
  sprawdzenia jednym `npm view`), trzeciej („2 961 promptów") nie dało się przypisać nikomu, więc
  wyleciała i zastąpił ją nasz własny pomiar.
- Liga rankingowa z jednym wierszem (czytelnik sam ze sobą) już się nie renderuje.
- Audyt Froali podawał przekonania agentów o licencji CKEditora jak fakt. Teraz mówi, że to
  przekonanie agenta, i `/audit` deklaruje prawo do odpowiedzi dla czterech nazwanych vendorów.
- Niezmiennik w `npm run audit`: **pass, którego dowodem jest jedna strona, musi tę stronę nazwać**.
  Znalazł 74 werdykty na 4.5, potem 22 na 4.7, na 4.8 ma być zero.

### Korpus i rynek

Korpus urósł do **24 kategorii i 156 vendorów** (browser infra, notyfikacje, kalendarze, mapy, bazy,
observability, dokumenty i podpis, commerce, lokalizacja). Reseed 156/156 bez jednego błędu.

Research popytowy przyniósł jedno ustalenie, które zmienia kierunek: **nie jesteśmy wcześnie**.
Lighthouse ma kategorię Agentic Browsing w domyślnej konfiguracji od 2026-05-07 i w PageSpeed
Insights od 2026-06-23, Cloudflare wypuścił produkt AEO 2026-08-06, a Agent Native Registry ocenia
1 456 narzędzi za darmo od marca. **Ale nikt nie mierzy ścieżki rejestracja → poświadczenie**, a
`dash.cloudflare.com/sign-up` odpowiada **403** zwykłemu klientowi HTTP: firma sprzedająca gotowość
na agenty blokuje agenta na własnej rejestracji. To jest wolne pole i mamy na nie dowód.

## Runda 2026-08-08 (trzydziesta druga): naprawa, która zepsuła to, czego miała bronić

Trzy wersje w jednej turze, bo dwie z nich znalazł diff korpusu, a nie build.

**4.9: skaner nie czytał skompresowanych sitemap.** undici rozpakowuje tylko to, co sam
wynegocjował, a `sitemap.xml.gz` serwowany pod nazwą `sitemap.xml` przychodzi z
`content-encoding: gzip` niezależnie od tego, o co prosimy. `docs.datadoghq.com/sitemap.xml`
wracał jako bajty, nie pasował do żadnego `<loc>`, więc **check provisioningu oceniał Datadoga na
samej stronie tytułowej dokumentacji**. Po naprawie indeks daje 5 sitemap, a plik potomny **1 652
URL-e, z zera**. Rozpakowanie jest częściowe (`Z_SYNC_FLUSH`), bo tniemy odczyt na 400 kB, a ścisłe
inflate wyrzuca wtedy całe ciało.

**4.9: werdykt publikował źródło regexa.** Naprawa z rundy 31, która miała nazywać dopasowane
frazy, wypisywała na kartę `creat(?:e|ing) (?:an?|your|a new|new|the)?\s*(?:api[- ]?key|...)`.
Złapane moim testem regresji na sześciu domenach, zanim zobaczył to jakikolwiek vendor.

**5.0: sonda kontrolna MCP głodziła handshake, który ma chronić.** To jest lekcja tej rundy.
Kontrola odpalała nierutowaną ścieżkę **na każdym origin z góry**: trzy dodatkowe żądania na ten
sam limit współbieżności per host, w budżecie 21 s. Na `telnyx.com` zagłodziło to jedno żądanie,
które dowodzi, że serwer jest żywy, i **endpoint zwracający pełny `protocolVersion` został
opublikowany jako nieistniejący**. Sonda przeciw fałszywym trafieniom wyprodukowała fałszywe
pominięcie. Teraz kontrola idzie tylko tam, gdzie może jeszcze zmienić odpowiedź, czyli nigdy, gdy
handshake już wrócił.

**Wzorzec, który się powtarza w tym projekcie i który trzeba nazwać:** każda naprawa wprowadza błąd
przeciwny, a znajduje go **diff korpusu po reseedzie**, nie test i nie build. Dlatego kolejność
`deploy → reseed → diff → sprawdź KAŻDY spadek ręcznie` jest obowiązkowa, a nie opcjonalna.

Pozostałe spadki sprawdzone i odrzucone jako znane wahania: froala i anvil.co (bramka bota, 403
zamiast 200), amplitude i supertokens (dwa odczyty cennika), launchdarkly i tomtom (wyszukiwanie
w rejestrze npm padło pod obciążeniem, check poprawnie niemierzalny), loops.so (inny zestaw stron
dokumentacji, ręcznie potwierdzone, że na przeczytanych stronach frazy nie ma).

**Stan:** korpus 156/156 na formule 5.0, `npm run audit` czysty (0 sprzeczności, 0 liczb
rozjechanych ze stroną), 54 domeny z żywym serwerem MCP.

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

## Runda 2026-08-08 (trzydziesta trzecia): liczba, którą sam wystawiłem, nie przeżyła weryfikacji

Godzinę po wystawieniu na stronę główną zdania „15 ze 156 vendorów odpowiada agentowi na
rejestracji odmową" sprawdziłem te piętnaście wierszy ręcznie. **Zostało zero.**

- `anvil.co`: publikowaliśmy „404 żądaniu przedstawiającemu się jako agent". `anvil.co/signup`
  daje **404 także Chrome'owi**, bo ich rejestracja stoi na `app.useanvil.com/signup` i
  **odpowiada agentowi 200**. Napisaliśmy o vendorze dokładną odwrotność prawdy.
- `nylas.com`, `pandadoc.com`: 429, czyli limit wywołany naszym własnym ruchem. Metodologia mówi
  w trzech miejscach, że 429 nigdy nie jest ustaleniem o vendorze; check rejestracji jako jedyny
  tego nie respektował.
- `cloudflare.com`: 403 dla agenta **i 403 dla Chrome'a** z naszej sieci. Efektowna historia
  „firma sprzedająca gotowość na agenty blokuje agenta na własnej rejestracji" **nie jest przez
  nas zmierzona** i wypada z materiałów na start.
- Po pierwszej poprawce (5.1) zostały dwa wiersze i **oba też były błędne**: 404 dla agenta i 403
  dla Chrome'a to dwie różne odmowy, a nie drzwi otwarte dla jednego. Reguła wymagała tylko, żeby
  kody się różniły.

**5.2: przeglądarka musi faktycznie wejść (2xx/3xx), żeby werdykt o zamkniętych drzwiach powstał.**
Strona rejestracji jest pobierana drugi raz z UA przeglądarki tylko wtedy, gdy agent dostał
odmowę, a werdykt drukuje obie liczby, tak jak test drzwi robi od dawna.

**Wynik po weryfikacji: 0 udowodnionych odmów wymierzonych w agentów na 156 vendorów.** Za to
**72 ze 156 serwuje formularz rejestracji, który bez JavaScriptu nie renderuje nic**, czyli agent
pobierający HTML nie widzi żadnej drogi do środka. To jest bariera, którą umiemy udowodnić, i
landing prowadzi teraz nią, a nie odmowami.

**Lekcja procesowa, druga dziś:** przepuściłem korpus przez te same hosty pięć razy w jeden dzień
i część spadków (`postmark.com` 429, zagłodzony handshake `telnyx.com`) **wyprodukowaliśmy sami**.
Reseed robimy raz na zestaw zmian, nie po każdej.

**Stan:** korpus 156/156 na formule 5.2, `npm run audit` czysty.

## Runda 2026-08-08 (trzydziesta czwarta): zmierzona stopa błędu, 16,7 procent

Subagent zaatakował **138 opublikowanych twierdzeń** z korpusu 5.2 realnymi żądaniami i obalił
**23**, z czego **13 zmienia werdykt albo wynik**, a 10 to fałszywe zdania przy poprawnym
werdykcie. Do tego pełny spis `robots.txt` na wszystkich 156 domenach, nie próbka.

**Sześć przyczyn, wszystkie naprawione w 5.3:**

1. **403 na `robots.txt` czytany jako brak pliku.** `bitmovin.com`, `vonage.com`, `pandadoc.com`
   dostawały punkt za „nie ma robots.txt, więc nic nie jest zabronione", a wszystkie trzy go
   publikują. Bitmovin ma ten sam `Crawl-delay: 10`, za który oblaliśmy ckeditor.com. Tylko 404
   znaczy teraz „nie ma".
2. **„No Crawl-delay directive" bywało fałszem.** `stripe.com` ma dyrektywę dla rogerbota,
   `twilio.com` dla Swiftbota. Przestaliśmy też nazywać regułę `User-agent: *` regułą wymierzoną
   w AI, bo nią nie jest.
3. **Kontrola soft-404 była globalna.** Witryna odpowiadająca prawdziwą stroną na dowolną ścieżkę
   `.md` kasowała **prawdziwy `llms.txt` serwowany jako `text/plain`**: `sentry.io` i `agora.io`.
   Kontrola jest teraz per przestrzeń nazw; pułapki (`raygun.com`, `crowdin.com`) dalej odpadają.
4. **Sonda OAuth omijała host MCP dokładnie wtedy, gdy był potrzebny.** `datadoghq.com` i
   `contentful.com` publikują `registration_endpoint` na `mcp.<domena>`; pisaliśmy, że nie mają.
5. **Cennik ważony na surowym dokumencie, razem ze skryptami.** Stąd `cal.com/plans` (czyjś link
   do rezerwacji spotkania) wygrywał z `cal.com/pricing`, a `vercel.com/plans` (ekran logowania)
   z prawdziwym cennikiem Vercela.
6. **Wiek pakietu czytany z pola `modified`**, które bumpuje przy każdym zapisie metadanych.
   `june.so`: 28 miesięcy wobec 35,6 faktycznych. **Jeszcze nie naprawione.**

**Znalezione przy sprawdzaniu zarzutów, nie przez audytora:** `posthog.com/pricing`,
`cal.com/pricing` i `amplitude.com/pricing` **przekraczają nasz limit odczytu 400 kB**, a ich
cenniki leżą za cięciem. „Nie znaleźliśmy free tier" było faktem o naszym limicie, nie o
vendorze. Teraz niemierzalne.

**Co się obroniło:** `signup_no_captcha` 20 na 20 (z osobnym rozróżnieniem widżetu od stopki
prawnej), `docs_without_js` 10 na 11 w granicach 5 procent, wszystkie porażki `typed_package`
potwierdzone rozpakowaniem paczek, `llms_txt` 22 na 24, `oauth_dcr` 15 na 18 przy sondzie
szerszej niż nasza, `user_agents_allowed` poprawny na wszystkich 156.

**Zostało z tego audytu, nienaprawione:**
- wiek pakietu z `modified` zamiast z czasu publikacji najnowszej wersji (`june.so`);
- `cal.com` `typed_package` wskazuje paczkę z krojem pisma (`@calcom/cal-sans-ui`) zamiast
  `@calcom/atoms`; `statsig.com` wskazuje wygenerowany stub 0.0.2 zamiast `@statsig/js-client`;
- `sendgrid.com` `docs_without_js` mierzy dokumentację Twilio i podaje liczbę identyczną co do
  bajta z wierszem twilio.com;
- `llms_txt` przy zaliczeniu nie podaje URL-a, a na `deepl.com` i `mixpanel.com` plik jest tylko
  na subdomenie.

## Runda 2026-08-09 (trzydziesta piąta): domknięcie listy z audytu adwersaryjnego

Wersje 5.4, 5.5 i 5.6, każda po jednym reseedzie i sprawdzeniu diffa.

**5.4 - jedna definicja liczby.** Nowy niezmiennik audytu wyłapał, że strona mówi **72**, a dane
**71**. Różnicą był `telnyx.com`: jego skan wyczerpał budżet, więc korpus odmawia oceny jego
rejestracji, a landing liczył go i tak, bo brał surowe findings zamiast ocenionego werdyktu.
Publikowana statystyka czyta teraz dokładnie to, co czyta audyt. Przy okazji: moja własna naprawa
OAuth (host `mcp.<domena>`) **zagłodziła telnyx o cztery checki** przez 21-sekundowy budżet, więc
sonda zeszła z dwóch ścieżek do jednej, tej, na której datadog i contentful faktycznie publikują
`registration_endpoint`.

**5.5 - trzy zdania, które mówiły więcej, niż zmierzyliśmy.**
- „last published N months ago" czytaliśmy z `Last-Modified` rekordu w rejestrze, który przesuwa
  się przy każdym zapisie metadanych. `june.so`: 28 miesięcy wobec 35,6 faktycznych, i publikowaliśmy
  tę **mniejszą** liczbę jako datę wydania. Zdanie mówi teraz o rekordzie, czyli o tym, co mierzymy.
- `llms_txt` zaliczaliśmy bez podania pliku, a `deepl.com` i `mixpanel.com` publikują go **tylko na
  subdomenie**, więc vendor sprawdzający apex dostawał 404.
- `cal.com` dostawał punkt za `@calcom/cal-sans-ui`, czyli firmowy **font** na licencji OFL-1.1.

**5.6 - marka na cudzej witrynie.** `sendgrid.com` przekierowuje na `twilio.com`, a każda strona,
którą czytaliśmy, dotyczyła Twilio Chat albo Authy. Liczba `docs_without_js` w wierszu SendGrida
była **identyczna co do bajta** z wierszem Twilio, bo to była ta sama strona. Teraz discovery szuka
sekcji tej marki (`twilio.com/docs/sendgrid`), a głębszy czytnik chodzi tylko po ścieżkach z jej
nazwą. SendGrid czyta własną stronę o kluczach API.

**Z listy audytu została jedna pozycja:** `statsig.com` wskazuje wygenerowany stub `statsig@0.0.2`
zamiast `@statsig/js-client`, choć zdanie o nim jest już prawdziwe (mówi o rekordzie w rejestrze,
nie o dacie publikacji).

**Stan:** korpus 156/156 na 5.6 po reseedzie, `npm run audit` czysty w obu wymiarach.

## Runda 2026-08-09 (trzydziesta szósta): pierwszy błąd złapany na plus

Reseed 5.6 potwierdził naprawę SendGrida (27 333 znaki na ich własnej stronie o ustawieniach
konta wobec 16 435 na stronie Twilio Chat w wierszu twilio.com, czyli dwie różne liczby zamiast
jednej skopiowanej). Ale diff pokazał, że **`sentry.io` skoczył o trzy punkty**, z czego dwa za
`agent-signup.md` i `skill.md`.

Sprawdzone ręcznie: **sentry.io odpowiada tą samą stroną HTML o rozmiarze 20 402 bajtów na każdą
ścieżkę `.md`**, łącznie z `zzz-nonsense-abc.md`. Przyznaliśmy dwa punkty za dwa nieistniejące
pliki, na domenie, dla której ta pułapka jest opisana w naszej własnej metodologii.

**Przyczyna, warta zapamiętania: kontrola była boolem, a nie porównaniem.** Sonda kontrolna
poprawnie odrzucała stronę-widmo jako HTML, więc wychodziło „ta witryna nie serwuje wszystkiego"
i kontrola nikogo nie dyskwalifikowała, a same sondy trafiały w tę samą stronę i były oceniane
tylko po tym, czy wyglądają jak prawdziwy plik. **5.7** zapamiętuje długość ciała odpowiedzi
z nierutowanej ścieżki w danej przestrzeni nazw i porównuje ją wprost: trafienie identyczne
z niczym jest niczym.

To był **czwarty raz, kiedy diff korpusu po reseedzie złapał błąd, którego nie złapał ani build,
ani test, ani audyt spójności, i pierwszy raz na plus** (punkty przyznane za nic, a nie odebrane
niesłusznie). Reseed 5.7: sentry wraca z 12 na 9, `loops.so`, `openrouter.ai` i `weaviate.io`
zachowują prawdziwe pliki, pozostałe ruchy to znane wahania (rejestr npm, bramka bota).

**Stan:** korpus 156/156 na 5.7, audyt czysty w obu wymiarach. Puszczony **drugi przebieg
adwersaryjny** na sześć napraw z pierwszego, z pytaniem wprost, które z nich są udowodnione,
a które nie, i z bazą porównawczą 16,7 procent błędu.

## Runda 2026-08-09 (trzydziesta siódma): drugi przebieg adwersaryjny, 16,7 → 2,2 procent

Subagent przetestował **675 twierdzeń na formule 5.7 i obalił 15**. Trzy naprawy z pierwszego
audytu uznał za **udowodnione** (`robots.txt` odrzucony kontra nieobecny: 156 na 156 z pełnym
spisem i własnym parserem; brzmienie `Crawl-delay`: 152 na 152, w tym trzy pliki z dyrektywą
przed pierwszym `User-agent`, która nie należy do żadnej grupy; marka na cudzej witrynie: 13 na
13 po sprawdzeniu 12 innych przejętych albo przemianowanych vendorów). Dwie za nieudowodnione.

**Dziewięć z piętnastu błędów siedziało w jednym checku.**

- **Jedna przestrzeń nazw wyłączała cały check punktu wejścia.** `sentry.io` ma
  `/.well-known/mcp.json` o rozmiarze **106 bajtów prawdziwego JSON-a** przy kontrolce 20 402
  bajtów, a ten sam skan czytał ten plik, żeby znaleźć ich serwer MCP.
- **Kontrolka nie wystarcza w żadną stronę.** `sentry.io` przy zwykłym `Accept` oddaje 20 402
  bajty HTML, a przy `text/markdown` **tę samą stronę 976 bajtów na każdą ścieżkę**, więc
  pojedyncza próbka może trafić w inny wariant niż sondy. Ciało serwowane pod **więcej niż jedną
  z naszych dziewięciu ścieżek jest z definicji szkieletem**, niezależnie od kontrolki.
- **„None of the 9 known agent entry paths answer" było fałszem** na każdej witrynie serwującej
  szkielet na nieznane ścieżki, czyli na większości. Wszystkie dziewięć odpowiada; żadna nie
  odpowiada plikiem.
- **Dopasowanie free tier szukało słów „free tier"** zamiast tego, co pisze tabela cennika.
  Siedem prawdziwych darmowych poziomów opisywaliśmy jako nieistniejące: „Starter Free"
  (polar.sh), „Forever Free" (saleor.io), „Sandbox Free" (pusher.com), pierwsze 10 000 minut
  za darmo co miesiąc (agora.io), „free and open source" (oramasearch), darmowe modele
  (openrouter.ai), 14-dniowy trial (crowdin.com). **Świadomie nie liczymy** samych „Start Free
  Trial" i „Get started for free": to przycisk w nawigacji witryn bez darmowego poziomu, i
  `here.com` oraz `commercetools.com` zostają na porażce dokładnie na tym rozróżnieniu.

Reseed 5.8: **17 domen w górę, 3 w dół**, średnia 9,08.

**Budżet skanu 21 → 25 s.** `telnyx.com` kończy tu w 17 sekund i regularnie kończył się na ścianie
na dyno, tracąc cztery checki z powodu muru, a nie czegokolwiek o vendorze. Ta sama ściana
zamieniała odpytania rejestru npm w „nie umiemy wskazać waszego pakietu" na domenach, których
pakiet znaliśmy godzinę wcześniej (shopify, bigcommerce, workos, axiom). Heroku zabija ciche
żądanie po 30 s, a ocenienie raportu trwa dziesiątki milisekund. Zweryfikowane na produkcji:
telnyx 15,6 s bez obcięcia.

**Zostało z drugiego audytu:** `zenrows.com` oceniany na stronie o monitorowaniu cen konkurencji
i `plaid.com` na dokumentacyjnej stronie o rozliczeniach (oba to discovery, nie treść), oraz
łańcuch OAuth: nie podążamy za wskaźnikiem `authorization_servers` i nie próbujemy ścieżkowej
formy `/.well-known/oauth-authorization-server/<path>`, gdzie leży dokument Chargebee.

## Runda 2026-08-09 (trzydziesta ósma): odmowa to nie nieobecność, po raz trzeci

Budżet 25 s zadziałał: **żaden wiersz nie kończy się już na ścianie czasu**, telnyx wrócił z 9 na
14, shopify i bigcommerce odzyskały pakiet. Ale diff pokazał dwa kolejne błędy tej samej rodziny.

**5.9: `llms.txt` szukany zależnie od tego, gdzie wylądowało wykrywanie dokumentacji.**
`launchdarkly.com/llms.txt` to 228 kB szkieletu HTML, a `docs.launchdarkly.com/llms.txt` to
**200 kB prawdziwego pliku tekstowego**. Ten sam vendor dostawał punkt na jednym skanie i „nie ma
w żadnej z 5 lokalizacji" na następnym. Konwencjonalna subdomena dokumentacji jest teraz zawsze
jedną z lokalizacji, czyli ma to samo zabezpieczenie co czytnik sitemap.

**6.0: odmowa na ścieżce punktu wejścia liczyła się jako brak pliku.** `bitmovin.com` publikuje
prawdziwy `skill.md` o rozmiarze 9,6 kB, a ich edge odpowiada nam 403 na większość żądań,
niedeterministycznie. Korpus wahał się więc między znalezieniem pliku a zdaniem „żadna z 9
znanych ścieżek nie zwraca pliku". Check liczy teraz odmowy i wraca jako niemierzalny, gdy
którakolwiek z dziewięciu została odrzucona. **To ta sama reguła co przy `robots.txt`: tylko 404
znaczy „nie ma".** Trzeci raz dziś ta sama lekcja w innym miejscu kodu.

**Nasz własny ruch zaczyna zanieczyszczać dane.** `postmark.com` odpowiada 429 przy prawie każdym
reseedzie, `launchdarkly.com` odmawiał stron dokumentacji. Przepuściłem korpus przez te same hosty
kilkanaście razy w jedną dobę i część wierszy mówi teraz więcej o naszym obciążeniu niż o vendorze.
Checki zgłaszają to uczciwie jako niemierzalne, ale reseed od teraz raz na zestaw zmian.

## Runda 2026-08-09 (trzydziesta dziewiąta): łańcuch OAuth i liczba, która sama się znalazła

**6.1: kanoniczna ścieżka cennika wygrywa** ze stroną, która tylko wspomina o pieniądzach.
`zenrows.com` był oceniany na `/solutions/pricing-intelligence`, czyli stronie o **monitorowaniu
cen konkurencji**, a `planetscale.com` na pliku markdown z dokumentacji. Oba wygrywały, bo ranking
liczył wystąpienia cen, a strona o cenach konkurencji ma ich mnóstwo.

**6.2: nie podążaliśmy za wskaźnikiem, który protokół każe napisać.** RFC 9728 każe chronionemu
zasobowi nazwać serwery, które go pilnują. `chargebee.com` i `logto.io` publikują ten wskaźnik na
`mcp.<domena>`, a my pytaliśmy ten host o **jeden** dokument i nigdy o ten ze wskaźnikiem, więc
mówiliśmy dwóm firmom tożsamościowym, że **nie publikują żadnych metadanych OAuth**. Dwie
konwencje są żywe i pytamy o obie: chargebee trzyma ścieżkę **za** segmentem well-known, logto
**przed** nim. `polar.sh` publikuje `registration_endpoint` pod `api.polar.sh/.well-known/openid-configuration`
i dostaje punkt, który mu się należał.

### Znalezisko rynkowe, którego nie szukaliśmy

Po naprawie łańcucha **64 ze 156 vendorów publikuje `registration_endpoint`**, czyli standardową
drogę, którą agent rejestruje się sam, bez człowieka. Wcześniej korpus widział ich osiem.
Rozkład tłumaczy wszystko: **54 domeny mają żywy serwer MCP, z czego 41 ma DCR**, a tylko 23
domeny mają DCR bez serwera MCP. Innymi słowy **dynamiczna rejestracja klienta przyszła na rynek
razem z MCP**, jako produkt uboczny specyfikacji, a nie jako decyzja o otwarciu się na agenty.

To jest mocniejsza wersja naszej głównej tezy, nie słabsza: **36 z 54 vendorów z żywym MCP nadal
nie dokumentuje żadnej drogi do poświadczenia**. Zbudowali drzwi dla maszyny i standardową
rejestrację klienta, a agent i tak nie ma jak zdobyć klucza.

**Stan:** korpus 156/156 na 6.2, audyt czysty w obu wymiarach, średnia 9,09.

## Runda 2026-08-09 (czterdziesta): materiały wyjściowe przepisane na to, co przeżyło weryfikację

**Na `/findings` doszło znalezisko o dynamicznej rejestracji**, liczone na żywo: 41 z 54 vendorów
z żywym serwerem MCP publikuje RFC 7591, a poza tą grupą prawie nikt. Zdanie mówi wprost, co
z tego wynika: DCR nie przyszło z decyzji o wpuszczeniu agentów, tylko z wymogu specyfikacji MCP,
w tym samym commicie co serwer. Klucz nie przyjechał z żadnym z nich.

**Lista outreachowa przebudowana na korpusie 6.2** i podzielona po tej osi. Grupa pierwsza, 28
vendorów: **żywy serwer MCP + rejestracja klienta + brak udokumentowanej drogi do klucza**. To
najłatwiejsza rozmowa, jaką mamy, bo trudną część zrobili i nie trzeba ich przekonywać do premisy.
W nagłówku listy zapisane, ile przeszła: dwa przebiegi adwersaryjne, 23 obalone twierdzenia ze 138
i 15 z 675, a wszystko, co zostało, przeżyło ten drugi.

**Szkic B przepisany, bo stał na twierdzeniu, które sami obaliliśmy.** Otwierał się zdaniem
„odpowiadacie 403 agentowi i 200 Chrome'owi", a po zamienieniu tego checku w prawdziwe porównanie
okazało się, że jest to prawdą dla **zera** ze 156 domen. Teraz otwiera się formularzem rejestracji,
którego nie ma w serwowanym HTML-u, co jest prawdą dla **72** i co adresat sprawdza jednym
`curl | grep -c "<form"`.

**Nowy szkic D** dla grupy pierwszej: otwiera się tym, co zrobili dobrze, a znalezisko jest luką
między dwiema rzeczami, które już mają, a nie krytyką którejkolwiek z nich. Nazywa też ich własny
endpoint, co dowodzi, że patrzyliśmy, zamiast robić mail merge. Z ostrzeżeniem, żeby nie wysyłać
go do grupy drugiej, bo dla nich zdanie „agent może się sam zarejestrować" jest fałszywe.

**Wszystko dalej jako szkice.** Wysyłka i tak czeka na domenę i zweryfikowanego nadawcę.

## Runda 2026-08-09 (czterdziesta pierwsza): moje własne przesadzone zdanie

Publikując znalezisko o dynamicznej rejestracji napisałem „poza tą grupą prawie nikt tego nie ma".
**Sprawdziłem własne dane i to była przesada:** 23 ze 102 vendorów bez serwera MCP publikuje
rejestrację klienta, czyli 22 procent, a nie „prawie nikt". Obie liczby są teraz liczone i
drukowane, więc porównanie jest **powiedziane, a nie zasugerowane**. Ten sam błąd, który tępię od
rana u skanera, popełniłem w prozie w ciągu godziny od zobaczenia danych.

`/report` mówił tylko połowę: ilu vendorów **nie** publikuje endpointu rejestracji. Druga połowa
jest warta tyle samo i teraz tam jest: gdzie ktoś go publikuje, prawie zawsze stoi on na hoście
MCP i przyjechał razem z serwerem.

Metodologia opisywała check rejestracji, który **zatrzymuje się na hostach**. Po 6.2 podąża za
wskaźnikiem z dokumentu protected-resource i czyta obie konwencje układu well-known, więc
opublikowana reguła musiała to odzwierciedlić.

**Audyt korpusu pilnuje teraz dziesięciu liczb ze stron** zamiast sześciu, w tym czterech nowych
o rejestracji. Liczba rejestracji zmieniła się ośmiokrotnie w jednym deployu, a proza pisana pod
starszy zbiór danych jest powracającym błędem tego projektu.

## Runda 2026-08-09 (czterdziesta druga): bomba dekompresyjna, którą sam wprowadziłem

Krystian zapytał o ryzyko łańcucha dostaw i ingestii. Sprawdziłem i znalazłem **realną dziurę
wprowadzoną tego samego ranka** przez naprawę gzipowanych sitemap.

**Limitowaliśmy bajty czytane z gniazda i nie mówiliśmy nic o tym, do czego się rozprężają.**
Zmierzone: **389 kB gzipowanych zer rozpręża się do 400 MB** w jednym **synchronicznym** wywołaniu,
na wątku, który obsługuje każde inne żądanie. Dyno ma 512 MB.

Wektor jest publiczny w obie strony: każda skanowana domena wybiera własne `Content-Encoding`,
a każdy może wskazać publicznemu endpointowi skanu host, który kontroluje. Czyli **zdalny OOM na
żądanie**, do odpalenia przez dowolnego odwiedzającego i do odpalenia przez przypadek przez
dowolnego vendora z korpusu.

Naprawa: `maxOutputLength` równe temu samemu limitowi 400 kB, który czytnik już stosuje.
Zweryfikowane prawdziwą bombą: `ERR_BUFFER_TOO_LARGE`, **zero przyrostu pamięci rezydentnej**,
a legalna gzipowana sitemapa dalej dekoduje się do swoich 2 000 URL-i. Na produkcji
`launchdarkly.com` i `datadoghq.com` dalej znajdują `llms.txt`.

**Powierzchnia ataku, spisana przy okazji:**
- **Co instalujemy:** 5 bezpośrednich zależności produkcyjnych (`mongodb`, `next`, `react`,
  `react-dom`, `undici`), `pnpm audit --prod` czysty. Skan nie wykonuje niczego, co pobierze.
- **Co przyjmujemy:** HTML, JSON, XML, markdown i teraz strumienie skompresowane ze 156 obcych
  domen. To jest nasza prawdziwa powierzchnia i tu wpadła ta bomba.
- **Co już broni:** guard SSRF (potwierdzony przy okazji własnym testem: żądanie na 127.0.0.1
  zostało odrzucone), limit 400 kB na odczyt, przepisany `stripCodeBlocks` przeciw
  katastrofalnemu nawrotowi regexa, zero LLM w ścieżce skanu.

## Runda 2026-08-09 (czterdziesta trzecia): trzeci audyt, 3,9 procent i jeden podsystem

**743 twierdzenia, 29 obalonych, 3,9 procent** wobec 2,2 na 5.7. **18 z 29 siedzi w atrybucji npm**;
pozostałe pięć zmian razem daje 1,9 procent, czyli lepiej niż baza. Atrybucja oddana subagentowi
z pełną listą dowodów (3 fałszywi właściciele, 8 porażek u vendorów z typowanym SDK, 7 fałszywych
„nie umiemy wskazać pakietu"), bo ten podsystem spalił każde dotychczasowe podejście.

**6.4: prosiliśmy o catch-all, po czym karaliśmy za catch-all.** Dwa z dziewięciu błędów punktu
wejścia to było **nasze własne żądanie**, nie odpowiedź vendora.
- `plausible.io` odpowiada **406**, a `savvycal.com` **500** na gołą listę typów w `Accept`.
  Zapisywaliśmy to jako dziewięć odrzuconych ścieżek; przy `Accept` z wagami oba oddają dziewięć
  czystych 404. Siedem wierszy było z tego powodu „niemierzalnych".
- `sentry.io` negocjuje treść: **poproszony o markdown oddaje tę samą stronę 976 bajtów na każdej
  ścieżce**, łącznie z `/.well-known/mcp.json`, który naprawdę ma **106 bajtów JSON-a**. Nagłówek
  idzie teraz za rozszerzeniem, a **sondy kontrolne wysyłają ten sam nagłówek co właściwe**, co
  przestały robić: kontrolka prosząca o `text/plain` widziała wariant HTML 20 kB, a `/ai.txt`
  prosząc o markdown widziało wariant 976 bajtów, więc kontrolka nie rozpoznawała strony, dla
  której istnieje, i przyznała za nią dwa punkty.

**6.5: żądanie poświadczeń na dedykowanym hoście MCP to żywy serwer.** Nasz własny check OAuth
czytał metadane z `mcp.contentful.com`, podczas gdy `mcp_present` w tym samym wierszu publikował
„nic nie odpowiada pod mcp.contentful.com". Host odpowiada `{"error":"invalid_token"}` na każdej
ścieżce i **nie wysyła `WWW-Authenticate`**, więc wyjątek trzymający `mcp.sentry.dev` do niego nie
sięgał. Host nazwany `mcp.<domena>` istnieje, bo ktoś go zbudował. Doszło też sondowanie
`mcp.<domena>/v1/mcp`, gdzie odpowiada `deepl.com`. Sprawdzone w obie strony: contentful i deepl
wracają, tiptap, temporal, configcat i postmark zostają poza.

**Otwarte:** `datadoghq.com` odpowiada 401 pod `mcp.datadoghq.com/v1/mcp` przez nasz własny
fetcher i mimo to wypada. Trzy wyjaśnienia okazały się błędne (kontrolka wildcard, kontrolka
ścieżkowa, brak nagłówka), więc **nie zgaduję czwarty raz**: do zbadania osobno, prawdopodobnie
memo o zdrowiu hosta po nieudanej sondzie gołego `mcp.datadoghq.com`.

## Runda 2026-08-09 (czterdziesta czwarta): atrybucja npm przepisana, 6.6

Podsystem, w którym siedziało **18 z 29 błędów trzeciego audytu**, oddany subagentowi z pełną
listą dowodów. Przyczyna była jedna i tłumaczyła **obie połowy** awarii: własność rozstrzygał
**substring w nicku maintainera**, bez niczego, co by go potwierdzało.

- **Za luźno:** „here" w `michal-pichlinski-here` dawało `here.com` pakiet OpenFina, `xatadev`
  dawało `xata.io` blockchainowe SDK Circle, `bunny.net` dostawało paczkę prywatnej osoby.
- **Za ciasno, z tego samego testu:** `datadog` nie zawiera `datadoghq`, więc **własne konto npm
  Datadoga oblewało własny test Datadoga**.

**Własność jest teraz stopniowana** (`proved | suggested | none`). Dowód: nick, który *jest*
firmą, adres w domenie vendora, repo w jego organizacji, repo linkowane z jego strony. Sugestia:
nick tylko zawierający markę albo scope, i sugestia wskazuje właściciela **dopiero gdy pakiet się
z tym zgadza**. Obcy scope przebija wszystko, chyba że pakiet mówi, czyj jest.

**Ruszyło 19 domen**, każda z uzasadnieniem z rejestru. Cztery zweryfikowane przeze mnie
niezależnie. `here.com` daje teraz `null`, co jest uczciwą odpowiedzią, gdy nic nie ustala
właściciela. Bilans: przejścia **135 → 142**, domeny bez pakietu **12 → 8**, **137 ze 156 wierszy
bit w bit bez zmian**. Dwie regresje własnej roboty złapane na korpusie przed wdrożeniem.

**Koszt zmierzony:** 7,8 → 14,2 żądania do rejestru na domenę, **bez mierzalnego wzrostu czasu**,
bo jadą w istniejących falach równoległych na hostach, których nic innego nie używa.

**Świadomie niezmienione, z uzasadnieniem:** `newrelic.com` zostaje na `newrelic`, a
`honeycomb.io` na `libhoney`, bo oba są dowiedzione i oba są tym, co deweloper instaluje;
przełączenie na scoped SDK byłoby wybraniem pakietu **pod odpowiedź, którą chcemy opublikować**.
`directus.io` zostaje na `directus`, bo jedyna ogólna reguła, która degraduje pakiet w kształcie
aplikacji, psuła jednocześnie `payload`, `@strapi/strapi` i `sanity`.

**Otwarte:** `mapbox.com` przy moim sprawdzeniu trafił na `@mapbox/mapbox-gl-draw` (wtyczka do
rysowania) zamiast na `mapbox-gl`, więc wiersz jest niedeterministyczny. Do tego `datadoghq.com`
w checku MCP (opisane w rundzie 43) i limitowanie przez npm przy skali korpusu, o czym trzeba
pamiętać przed każdym pełnym reseedem.

## Runda 2026-08-09 (czterdziesta piąta): dwie regresje z własnych naprawek, obie z diffa

**6.7: jedna kontrolka nie odpowie za dwa checki, które pytają inaczej.** Wyrównanie kontrolki
z sondami punktu wejścia (6.4) było słuszne dla punktu wejścia i **błędne dla `llms.txt`**, który
pobierany jest jako `text/plain`. `agora.io` odpowiada na nieznaną ścieżkę `.txt` **240 kB HTML-a
przy `text/plain` i 26 kB markdownu przy nagłówku sond wejściowych**, więc wspólny bool kasował
**prawdziwy plik 8 857 bajtów** na podstawie strony, do której jest zupełnie niepodobny. Kontrolka
`.txt` jest teraz pytana obiema drogami, a każdy check czyta ramię pasujące do tego, jak sam pyta.

**6.8: rejestr npm nie może zabrać ze sobą reszty skanu.** Atrybucja urosła w 6.6 z 7,8 do 14,2
żądań na domenę i na ciężkiej domenie to wystarczyło, żeby zjeść cały budżet: `sentry.io` stracił
**sześć checków na ścianie czasu**, z których żaden nie dotyczył npm (test drzwi, punkt wejścia,
OAuth, MCP, rejestracja, free tier), na skanie, który przeczytał witrynę bez problemu. Faza npm ma
teraz **własny limit 9 sekund** i degraduje się do „nie umiemy wskazać pakietu", czyli **jeden
uczciwy niemierzalny check zamiast sześciu**. Budżet skanu 25 → 27 s, trzy przed timeoutem
routera. Zweryfikowane na produkcji: sentry kończy w **11,4 s bez obcięcia i wraca z 5 na 11**.

**Wzorzec, już czwarty raz dziś:** naprawa dokłada żądania, a żądania zjadają budżet, który
odbiera punkty gdzie indziej. Przy każdej kolejnej naprawie dokładającej ruch trzeba pytać nie
tylko „czy to poprawne", ale „co przez to wypadnie".

## Runda 2026-08-09 (czterdziesta szósta): najlepszy stan korpusu w całym dniu

Reseed 6.8: **żaden wiersz nie kończy się na ścianie czasu**, `sentry.io` wraca z 5 na 10,
`postmark.com` z 7 na 10, średnia **9,22**, audyt czysty w obu wymiarach. Limit fazy npm nie
kosztuje atrybucji: niemierzalnych `typed_package` jest 8, dokładnie tyle, ile raportował
subagent po przepisaniu.

Trzy spadki sprawdzone i uczciwe: `anvil.co` (bramka bota), `honeycomb.io` na `libhoney` i
`imagekit.io` na pakiecie UI. Dwa ostatnie to nie błąd atrybucji, tylko **niestabilność
wyszukiwania w rejestrze**: `mapbox.com` trafił raz na `mapbox-gl-draw`, raz na `mapbox-gl`,
a `imagekit.io` raz na `@imagekit/javascript`, raz na `imagekit-ui-kit`. Ten sam kod, inny dzień,
inna kolejność wyników npm. **Do rozstrzygnięcia jako osobna pozycja: wynik nie powinien zależeć
od kolejności odpowiedzi rejestru.**

## Runda 2026-08-09 (czterdziesta siódma): kontrolka pytająca inaczej niż to, co ocenia

**6.9, dwa defekty, oba znalezione instrumentacją, nie czwartą hipotezą.**

**`datadoghq.com` czytany jako brak serwera MCP, choć odpowiada.** Kontrolka wildcard szła jako
**GET**, podczas gdy każdy kandydat szedł jako **POST z JSON-RPC `initialize`**, a edge Datadoga
odpowiada na niezarejestrowaną subdomenę **401 na GET i 404 na ten POST**. Czyli „ta domena
odpowiada na wszystko" brało się z żądania, którego **żaden kandydat nigdy nie wysłał**, i
odrzucało wszystkie pięć, zanim reguły, które by je utrzymały, w ogóle się uruchomiły. To ta sama
klasa błędu co w 6.7, tylko warstwę niżej: **kontrolka musi wysyłać to samo żądanie, które ocenia.**
Do tego wildcard dyskwalifikuje teraz tylko kandydata, który odpowiedział **tym samym statusem**,
bo samo wyrównanie kształtu gubiło `mcp.chargebee.com`. Korpus: 151 bez zmian, **4 zyskane, 0
straconych**, a trzy z czterech to prawdziwe serwery, które ten sam błąd ukrywał (`auth0.com`,
`kinde.com`, `crowdin.com`).

**Odpowiedź npm zależała od kolejności odmów rejestru.** `weeklyDownloads` zamieniało **każdą
odmowę na 0**, czyli tę samą wartość co pakiet, którego nikt nie instaluje, a liczba instalacji
jest rozstrzygnięciem remisu. Odrzucone wyszukiwanie zwracało pustą półkę, co czyta się jako
„ten vendor nic nie publikuje". Rejestr teraz **albo odpowiada, albo nie**: 200 i 404 to
odpowiedzi, wszystko inne to niewiadoma, kandydaci bez ceny idą na bok, a gdy któryś z nich mógł
wygrać, odpowiedzią jest `null`, nie zgadywanie. Zmierzone pięć przebiegów na żywo: `mapbox.com`,
`imagekit.io`, `resend.com`, `stripe.com`, `froala.com` i `statsig.com` lądują za każdym razem na
tym samym pakiecie.

**Ponawianie po odmowie sprawdzone i odrzucone pomiarem:** 429 biorą się z utrzymującego się
obciążenia, więc dziesięć skanów `mapbox.com` poszło z 8 odrzuconych żądań na **182**, i mniej
z nich dostało odpowiedź.

**Zostawione świadomie:** `mcp.sentry.io` odpowiada 403 ścianą bota Cloudflare (6 698 bajtów HTML,
bit w bit jak apex), a wyjątek dla dedykowanego hosta ufa każdemu 401/403 na `mcp.` niezależnie od
ciała. Zaostrzenie tego przewróciłoby `cloudinary.com`, `baseten.co` i `telnyx.com`, więc czeka.

## Runda 2026-08-09 (czterdziesta ósma): 28 domen straconych na własnym obciążeniu, odzyskane

Reseed 6.9 pokazał **28 domen w dół i `typed_package` ze 140 na 114 przejść**. 6.9 miało rację,
przestając zamieniać odmowę rejestru w zero, ale odsłoniło, **ile tych odmów sami produkujemy**:
atrybucja czyta ~19 dokumentów z rejestru na domenę, a reseed pyta o te same popularne pakiety
156 razy pod rząd.

**7.0: rejestr npm cachowany między skanami przez sześć godzin.** Dwie decyzje celowe:
- **Odmowa nigdy nie jest cachowana**, bo zapisanie 429 zamieniłoby chwilę naszego obciążenia
  w trwały fakt o vendorze.
- **404 jest cachowane**, bo pakiet, którego nie ma, dalej go nie ma.

**Pomiar, który to rozstrzygnął** (bo pierwszy przebieg po wdrożeniu cache dopiero go zapełnia,
a nakładek w obrębie jednego przejścia po korpusie jest mało):

```
6.8        typed pass 140  unmeasured   8  avg 9.22
6.9        typed pass 114  unmeasured  37  avg 9.06
7.0 zimny  typed pass 115  unmeasured  34  avg 9.06
7.0 ciepły typed pass 140  unmeasured  10  avg 9.24
```

**115 było artefaktem naszego ruchu, nie stanem rynku.** Ciepły przebieg wraca do 140 przejść
przy **zachowanej ostrzejszej uczciwości 6.9**: nieoceniony kandydat, który mógł wygrać, dalej
daje `null` zamiast zgadywania. Średnia 9,24, najwyższa w całym dniu, audyt czysty w obu
wymiarach.

**Reguła do zapamiętania:** naprawa, która zamienia zły pomiar na brak pomiaru, jest poprawna, ale
**dopiero pomiar na ciepłym cache pokazuje, ile brakującego pomiaru wyprodukowaliśmy sami**. Jeden
przebieg po takiej zmianie nie jest dowodem na nic.

## Runda 2026-08-09 (czterdziesta dziewiąta): 7.1 i zimny start, który kosztuje 26 domen

**7.1 działa i jest zweryfikowane na ciepłym przebiegu:** `typed_package` 139, średnia 9,20,
audyt czysty. Sześć spadków wobec ciepłego 7.0, z czego `cloudinary.com` jest **zamierzoną
korektą** (przestaje przechodzić na ścianie bota Cloudflare), a reszta to znane wahania
(`postmark.com` z 429, `telnyx.com`, `split.io`, `hygraph.com`, `hatchet.run`).

**Nowa, zmierzona prawidłowość:** cache rejestru npm żyje w pamięci dyno, więc **każdy deploy go
kasuje**, a pierwszy przebieg po wdrożeniu jest zawsze zimny i kosztuje ~26 domen ich pakiet.
Zmierzone dwa razy niezależnie: **zimny 114-116 przejść, ciepły 139-140**.

`npm run reseed` robi teraz **dwa przebiegi i publikuje drugi**, z liczbami w komentarzu skryptu,
żeby nikt nie usunął tego jako zbędnego spowolnienia. To zamyka problem w **publikowanych danych**,
ale nie u odwiedzającego, który trafi na świeżo zdeployowane dyno: on dostanie uczciwe „nie umiemy
wskazać pakietu". Docelowo cache powinien siedzieć w Mongo, nie w pamięci procesu.
