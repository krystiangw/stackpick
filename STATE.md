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

1. ~~Wynik nie ma własnej formy wizualnej~~ **zrobione 2026-08-08 (runda 11)**: znak scorecardu
   ma jedną definicję (`src/lib/mark.ts`) i rysują go trzy powierzchnie.
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
