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
