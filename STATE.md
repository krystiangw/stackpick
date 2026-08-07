# StackPick: stan na 2026-08-08 (noc)

Punkt wejścia po compact. Czytaj przed pracą, razem z `ARCHITECTURE.md`.

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

## Co zostało z audytów

1. Wynik nie ma własnej formy wizualnej: brak sygnaturowego elementu, który niesie markę w OG,
   mailu i na stronie.
2. Wyniki audytów wartości/poprawności i designu z rundy 2026-08-08 (agenty puszczone po
   deployu) - do przerobienia.

## Następne kroki merytoryczne

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

## Otwarte

1. ~~Runda 2 przebiegów agentowych~~ **zrobiona**, pełny opis: `ai-audit/runs/editors-round2.md`.
   Skrót: wszystkie przebiegi wybrały Tiptap, potwierdzone artefaktem (`package.json`, nie
   deklaracją). **Izolacja powtórzyła wynik rundy 1**, więc skażenie go nie wyprodukowało.
   **Froala nie weszła nawet do zbioru kandydatów** (w rundzie 1 była wymieniona i skreślona na
   licencji) - to mocniejszy materiał na rozmowę niż odrzucenie. CKEditor i TinyMCE odrzucane
   cytatami z ich własnej dokumentacji o wymaganym kluczu. **Hipoteza o źródłach potwierdzona:**
   przy zadaniu wymagającym weryfikacji licencji po źródła sięgnęły wszystkie przebiegi, w tym
   wszystkie Sonnety (w badaniu storage: 0/10). 4/6 czytało `node_modules` i pliki `LICENSE`,
   1/6 nie odwiedził żadnej strony dostawcy.
2. **Domena i własny nadawca w Resend.** Jedyna rzecz blokująca outbound, decyzja Krystiana.
   Do czasu zakupu wszystkie adresy na stronie (`/pricing`, `openapi.json`, `llms.txt`,
   `.well-known/agent-access.json`, nota o prywatności) wskazują na `gwizdala.kr@gmail.com`,
   a `AGENT_UA` na host Heroku. **Do przejrzenia przy domenie:** to prywatny adres na
   publicznej stronie, świadomy wybór, bo adres, który odbija, jest gorszy.
3. ~~DNS rebinding~~ **naprawione**: skan chodzi po dispatcherze undici, którego `lookup`
   waliduje adres **wewnątrz nawiązywania połączenia**, więc nie ma okna między sprawdzeniem
   a socketem (`src/lib/scan/dispatcher.ts`). Zweryfikowane na produkcji: `127.0.0.1.nip.io`
   i `localtest.me` odbite, normalne skany bez zmian. Porty ograniczone do 80/443.
4. ~~Kolizja `reportId`~~ **naprawione**: sekundy plus cztery znaki losowe. Zweryfikowane,
   dwa skany tej samej domeny w odstępie dwóch sekund dają różne linki.
3. Trzeci audyt agentowy po tej partii zmian (formuła 3.0 zmieniła dużo w punktacji).
