# Let Agents In: stan na 2026-08-19 (kod 9.45, korpus 9.44, przemiat czeka na karencje)

## OD CZEGO ZACZAC PO COMPACT (przeczytaj te czterdziesci linijek, potem reszte)

**WERSJE: produkcja i repo na 9.45, korpus na 9.44.** Przemiat na 9.44 skonczony 09:57 i **caly
zielony**: 177 wierszy, 0 sprzecznosci, `audit-entry-credited` na calym korpusie daje **zero plikow
nieodroznialnych od kontrolki**, adresy publikowane jako dowod: **1 martwy zamiast 3** i to znany
falszywy alarm. Potem wyszlo **9.45** i czeka na wlasny przemiat: waiter `/tmp/reseed-945.sh`,
karencja mediany otwiera sie okolo **16:00**, log `/tmp/reseed-945.log`, **nie deployowac po jego
starcie**. Co ma pokazac: koniec sekcji **„9.45"**.

**ZADANIA IDA NA MUSTER: https://musterboard.dev/r/r_kyvged60vn4c2mvj** (projekt `p_w8vtpkcae5`, token
w `~/.muster/tokens.json`, handle agenta `ai-audytor`). **Tablica wygasa 2026-08-25, dopoki Krystian
jej nie odbierze tym linkiem** - odbior zdejmuje wygasniecie i podnosi limity.

**CO ZMIENILA DRUGA POLOWA NOCY (po 05:30), w kolejnosci waznosci:**
- **9.43 domkniete w sondzie MCP, trzy miejsca.** Kontrolka, ktora sie nie odezwala, nie przyznaje juz
  punktu: ani przy 401/403/202, ani przy 405 czytanym wzgledem strony glownej, ani przy odmowie
  „to wymaga przegladarki". Druga fala sondy nie gubi juz swojego „nie dalo sie zmierzyc".
- **9.44: klucz w cudzej konsoli to nie ich sciezka.** `growthbook.io` trzymal punkt na instrukcji
  tworzenia konta uslugowego **Google**. O czyim produkcie jest dowod, rozstrzyga **etykieta linku**.
- **Dziesiec audytow czytalo cwierc korpusu i nie mowilo o tym.** Sufity sa teraz ogloszone, a piec
  audytow ma **pierwsze pelne przebiegi** (`audit-openapi`: 508 zapytan, zdanie trzyma sie wszedzie).
- **Cennik przyznaje sie, ze miesieczna polowa monitoringu nie ma harmonogramu.** Do dzis przyznawal
  sie tylko runbook, czyli tam, gdzie kupujacy nie zaglada.
- **Wlasne logo i favicon** zamiast domyslnego pliku Next.js, i **zrzuty ekranu 1000px+ okazaly sie
  robic bez czlowieka** (headless Chrome) - zostal sam formularz w claude.ai.

**CO ZMIENILA PIERWSZA POLOWA NOCY, w kolejnosci waznosci:**
- **9.42: opis paczki rozstrzyga, ktory artefakt jest biblioteka vendora** (#47, wisialo od wycofanej
  proby). Zmierzone na calym korpusie **przed** wdrozeniem: trzy zmiany, zero regresji. Po przemiecie
  potwierdzone co do wiersza: `directus.com` → `@directus/sdk` (z typami, sprostowanie wygaslo),
  `onesignal.com` → ich Node SDK zamiast wrappera Angulara, `axiom.co` → `@axiomhq/js`, `mux.com`
  **celowo bez zmiany**.
- **Publikowalismy wiersz o `gandi.net` na paczce innej firmy.** Scope, ktory tylko zaczyna sie od
  nazwy vendora, potrzebuje teraz jednego dowodu poza rejestrem. Gandi ma dzis uczciwe „nie
  znalezlismy paczki" zamiast cudzego artefaktu.
- **`/privacy` ZYJE** (byla 404 razem z `/terms` i `/refunds`). Administrator danych to nie forma
  prawna, a obowiazek z art. 13 zaczyna sie przy ZBIERANIU danych. `/terms` i `/refunds` nadal 404.
- **Zamrozony wiersz mowi, ze jest zamrozony** (trzy daty na stronie vendora, oznaczenie na `/v`,
  mediana w raporcie z zamrozonymi i bez nich). `/bot` przestal opisywac droge powrotna, ktorej nie ma.
- **Jestesmy w oficjalnym rejestrze MCP** (`com.letagentsin/scanner`), a `/privacy` odblokowala
  wymagania katalogu konektorow Anthropica poza zrzutami ekranu.
- **Raport za 49 USD**: zero wymienien niesie swoja dwuznacznosc, gosc z adresu ladujacego w korpusie
  dostaje odmowe zamiast falszywego zera, probka odswiezona na `/d/sample`.
- **Audyt ceny monitoringu** (subagent): 79 USD zostaje, ale **pakiet agencyjny to 49,90 za domene
  przy 3,96 u agentable** i zdanie o kredycie na pierwszy miesiac jest **proza bez mechanizmu**.

**CZTERY ZASADY Z TEJ NOCY, WSZYSTKIE ZAPISANE W KB ALBO W KODZIE:**
0. **Porownanie z brakiem zawsze zwraca „rozni sie".** Szesc wystapien jednego ksztaltu w ciagu nocy;
   `x !== kontrolka?.pole` jest prawda, gdy kontrolki nie ma, i obie galezie ida w strone werdyktu,
   zadna w strone „nie wiem" (`clad-kb show porownanie-z-brakiem-zawsze-zwraca-rozni-sie---szesc-razy-te`).
   Uwaga na przebranie, ktorego sam bym nie zlapal: fetch zwraca **obiekt** ze statusem 0 albo 429,
   wiec test na `undefined` nie wystarcza.
1. Kazde miejsce, gdzie **„nie wiem" ma wartosc domyslna**, jest tym samym bledem, i trzeba go szukac
   **na kazdej warstwie osobno** (`clad-kb show domyslna-wartosc-dla-nie-wiem-powtarza-sie-na-kazdej-warstwi`).
2. Zdanie o tym, co przechowujemy, ma isc **z typu**, nie z pamieci (`WATCH_FIELDS_DISCLOSED`).
3. **Sonda nie moze znajdowac samej siebie**, i wyszlo to **trzy razy**: bramka „nie deployuj w
   trakcie przemiatu" oparta na `pgrep -f "scripts/reseed.sh"` lapala wlasna petle czekajaca;
   straznik szukajacy `process.exit` w `rules.mts` trafial we wlasny literal w kontrolce; straznik
   szukajacy wywolan `howManyRows` znajdowal wlasne przyklady. Lekarstwo za kazdym razem inne
   (`lastIndexOf`, wykluczenie pliku z listy, inny predykat), ale objaw ten sam.

**CZEGO SAM NIE ODBLOKUJE (pelna lista z uzasadnieniami na Musterze):** dane sprzedawcy do Paddle ·
zgoda na imie i nazwisko jako administratora na `/privacy` · klucz do `agentaudit@agentmail.to` ·
platne subskrypcje cursora i gemini · potwierdzenie polityki robots.txt · **szesc decyzji cenowych**
· czy wolno mierzyc klikniecia w CTA (nie zrobilem tego sam, bo `/privacy` mowi od dzis „no profile,
no behaviour" i to jest handel wymienny obietnica).

**DWIE PULAPKI PRZY WERYFIKACJI:**
1. **`/api/scan?key=<token>` NIE zasiewa korpusu.** `fromConsole` czyta wylacznie ciasteczko
   `stackpick_console`, a `?key=` obsluguje middleware tylko dla `/app`. Odpowiedz wyglada
   identycznie, wiec skan weryfikacyjny cicho nie zmienia nic. Poprawnie:
   `curl -X POST .../api/scan -H "cookie: stackpick_console=$TOKEN" -d '{"domain":"..."}'`.
2. Pojedynczy skan domeny z korpusu **jest bezpieczny** dla karencji przemiatu, bo bramka patrzy na
   **mediane** (to byla swiadoma zmiana z `max()`). Dopiero przemiat rusza mediane. Do prob
   niezwiazanych z korpusem i tak lepiej brac domeny spoza (dzis: neon.tech, tally.so, svix.com).

**LIMITY REJESTRU NPM SA ZMIERZONE, NIE DOMYSLANE:** porownanie przemiatu z replayem z pelnego
cache'u rejestru dalo **160 wierszy identycznych, 16 bez paczki po obu stronach i JEDEN rozny**
(pdfmonkey.io, juz poprawiony pojedynczym skanem: 9/15 zamiast 8/14). Szkoda ponizej progu szumu
0,59 %. Zamyka otwarte pytanie z zadania #48.

**Komplet kontroli po nastepnym przemiecie, jednym wklejeniem:**
```
cd ~/projects/stackpick && export MONGODB_URI=$(heroku config:get MONGODB_URI -a stackpick)
npx tsx scripts/after-reseed.mts && npm run audit && npx tsx scripts/audit-study.mts   && npm run audit-delivery && npm run regressions && npm run watch-coverage && npm run audit-our-api
```
## PIEC Z SZESCIU CYTATOW W RAPORCIE ZA 49 USD URYWALO SIE W SRODKU ADRESU (2026-08-17)

Znalezione nie przez audyt, tylko przez **wygenerowanie raportu i przeczytanie go jak klient**.
`scripts/client-report.mts vercel.com` wypisal piec z szesciu cytatow codeksa w tej postaci:

> **codex run 1**: „[Vercel limits](https://vercel."

**Dwie przyczyny, obie w `sentenceAround`.**
1. **Kropka w domenie konczyla zdanie.** Trafienie na `vercel.com` siedzi w adresie, a granica zdania
   szla po pierwszym `[.!?]`, wiec zdanie bylo ciete na wlasnej kropce trafienia. Teraz kropka
   konczy zdanie tylko wtedy, gdy stoi przed bialym znakiem albo koncem tekstu.
2. **Pierwsze trafienie bywa w tabeli linkow.** Nawet po poprawce trzy biegi dawaly
   „[Vercel limits](url) |", bo pierwszy raz nazwa pada w komorce tabeli. `quotedAbout` przeglada
   teraz **wszystkie** wystapienia wszystkich form nazwy (domena + aliasy) i bierze pierwsze zdanie,
   ktore niesie co najmniej piec slow poza linkami; `at` (czyli „kto padl pierwszy") **nie rusza sie**,
   bo to inna wielkosc. Zwykle slowo w roli marki nadal wymaga wielkiej litery, wiec „split the
   traffic" nie stanie sie cytatem o Split.

**Po poprawce** kazdy z szesciu cytatow vercela to zdanie o produkcie
(„| **Vercel** | Best-in-class React/Next.js preview experience..."). Na calym zbiorze: **803 cytaty,
11 ponizej pieciu slow i wszystkie jedenascie to prawdziwe krotkie zdania** („Neon bylby moim
wyborem."). Dlatego straznik w `audit-delivery` nie liczy slow, tylko pyta, **czy cytat niesie
chocz jedno slowo poza linkiem** (`wordsCarried === 0`) - to jest ten blad, a nie dlugosc.

**Piec rund `codex review`, cztery z realnym znaleziskiem** (pierwsze uzycie przywroconej reguly
„review codeksem przed commitem"; kazde znalezisko dotyczylo zdania, ktore poszloby do klienta):
1. granica zdania wymagajaca bialego znaku **gubi kropke pod `**`, `"` i `)`**, wiec cytat wciagalby
   nastepne zdanie, czesto o konkurencie;
2. wielka litera **nie wystarczy** dla nazwy, ktora jest zwyklym slowem: „Split the traffic across
   regions" na poczatku zdania trafiloby do raportu split.io jako pochwala. Warunkiem jest teraz
   **stylizacja marki w calej odpowiedzi** (ten sam test, ktory odroznia `name` od `weak`).
   Pierwsza wersja pytala o to **pojedyncze zdanie** i codex pokazal, ze to zabiera cytat tam, gdzie
   marka jest juz ustalona: `[Neon](url)` w tabeli, a nizej „Neon bylby moim wyborem" - zdanie
   dobre, odrzucone. Zakres testu to byla cala roznica;
3. licznik slow **nie moze liczyc golego adresu**: „vercel.com |" bez skladni linku dawalo dwa
   slowa („vercel", „com") i przechodzilo przez straznik, ktory powstal wlasnie po to;
4. gdy zaden fragment nie niesie ani slowa, `quotedAbout` zwraca **null** zamiast pustego cytatu.
   Wyszlo to dopiero z nowego straznika: resend.com, bieg 2, mial tylko komorke tabeli
   („[Resend plans](url) |"). Raport pokazuje teraz osiem cytatow przy „wymieniony w 9 z 10 biegow",
   i to jest uczciwe: licznik czyta liste biegu, a nie cytat.

**Jedno zastrzezenie codeksa odrzucone z uzasadnieniem** (szosta runda): typografia mowi, ze slowo
jest marka, a nie ze zdanie jest o tej marce, wiec „**Resend** is pricier than SES" wygra z prostym
„Resend provides useful logs". Prawda, ale **oczywista alternatywa zostala zmierzona i wypadla
gorzej**: regula „zdanie, w ktorym nie pada zaden inny dostawca" cofnela cytat do zdania
porownawczego, bo rywalem byl tam SES, ktorego **nie mamy w korpusie**, wiec porownanie uchodzilo
za zdanie wylacznie o Resendzie. Zostaje wersja, ktora wygrywa na odpowiedziach, ktore mamy, a to,
co zostawia, to zdanie prawdziwe, nie puste.

**Zasieg:** dotyczy tylko dokumentow generowanych skryptami (platny raport, miesieczny mail,
`audit-delivery`). Strona `/c/<kat>/runs` uzywa z tego modulu wylacznie `matched` do podswietlania,
wiec **nie wymaga deployu**, zeby poprawka dotarla do klienta.

## 9.35: TRZY STRONY DOKUMENTACJI TO TRZY PYTANIA, NIE TRZY RAZY TO SAMO SLOWO (2026-08-18, v488)

Ciag dalszy 30. przebiegu. Moja pierwsza diagnoza byla bledna i warto to zapisac: myslalem, ze
skaner nie czyta map witryn. **Czyta.** Prawdziwa przyczyna byla o krok dalej.

**Co bylo zle.** Probka to trzy strony dokumentacji, wybierane rankingiem "jak bezposrednio sciezka
obiecuje poswiadczenia". Na vendorze, ktory ma kilka stron z najlepsza wskazowka, ranking wydawal
**caly budzet na jedna rodzine slow**. Zmierzone na korpusie: `supabase.com` przeczytal
`getting-started/api-keys`, `cli/supabase-projects-api-keys` i `migrating-to-new-api-keys`, czyli trzy
strony o tym samym rzeczowniku. `cloudinary.com` przeczytal poradnik o **rotacji** klucza w konsoli i
drugi o **znalezieniu** poswiadczen, a `documentation/provisioning_api`, czyli strona o tworzeniu
poswiadczen maszynowo, lezala w **tej samej mapie witryny, ktora juz mielismy otwarta** (805 wpisow).

**Poprawka.** Najlepsza strona z kazdej rodziny wskazowek najpierw, w kolejnosci rangi, a dopiero
potem reszta miejsc. Najwyzej oceniona strona sie nie rusza, wiec `api-app-keys` Datadoga zostaje w
probce. **Klucz byl w miejscu obciecia**: pierwsza wersja rozpraszala liste juz obcieta do trzech, bo
`sitemapCandidates` tnie w petli. Rozproszenie musi isc **przed** obcieciem.

**Zmierzone przed wdrozeniem, dziewiec domen.** Trzy podejrzane: probka sie zmienila (cloudinary
czyta teraz `provisioning_api`), werdykt zaden. Szesc z punktem (`honeycomb.io`, `axiom.co`,
`planetscale.com`, `nylas.com`, `cronofy.com`, `xata.io`): **zadna nie stracila punktu**. Czyli
poprawa w tym, gdzie patrzymy, bez zmiany w tym, co orzekamy, na probce, ktora umialem sprawdzic.

**Cloudinary i tak zostaje na zero, i to jest teraz uczciwe zero:** ich `provisioning_api` renderuje
sie JavaScriptem, wiec gole pobranie dostaje 26 kB nawigacji bez tresci. Patrzymy juz tam, gdzie
trzeba, i mowimy, czego nie widac.

**Wersja podbita do 9.35 mimo ze regula sie nie zmienila**, bo zmienilo sie **co regula czyta**, a
`CHECK_RULE_CHANGED` ma wpis, zeby monitoring nie powiedzial vendorowi, ze stracil grunt, gdy to my
zajrzelismy gdzie indziej. **Korpus dostanie to przy nastepnym reseedzie** (karencja od 23:50, wiec
najwczesniej okolo 05:50).

## KAZDA KWOTA NA CENNIKU POCHODZI Z KATALOGU (2026-08-18, v487)

Ceny byly wklepane w JSX, w opisie strony i w dwoch odpowiedziach FAQ ("twenty-nine dollars"), a
katalog dla dostawcy platnosci to trzecia kopia tych samych liczb. Pierwsza rzecz, ktora dostawca
robi przy weryfikacji, to porownanie kwoty na stronie z kwota, ktora ma obciazyc.

Teraz strona liczy z `src/lib/billing/catalog.ts`, wiec **nie ma czego porownywac**, a straznik
pilnuje juz nie zgodnosci dwoch kopii, tylko tego, ze strona **nadal czyta katalog**. Sprawdzone na
produkcji: opis, karty i FAQ pokazuja 49, 79, 179, 499 i 29 z jednego zrodla.

## 30. PRZEBIEG ADWERSARYJNY PO RESEEDZIE: ZERO FALSZYWYCH OSKARZEN, JEDNA LUKA W SKANERZE (2026-08-18)

Sonda `audit-provisioning.mts` szuka tego samego co check, ale **drzwiami, ktorych skaner nie
otwiera**: przez `sitemap.xml` witryny i hosta dokumentacji. Nic z niej nie importuje regul skanera.

**Kontrolka pierwsza, bo bez niej druga strona nic nie znaczy:** na 63 wierszach, ktore punkt
DOSTALY, sonda znalazla fraze u **18**, czyli **29 procent pokrycia** (dla porownania: 25. przebieg
przewrocil sie na 2 z 47). To wystarczy, zeby trafienie po drugiej stronie bylo sygnalem.

**Oskarzeni: 54 domeny, 6 kandydatow na falszywe oskarzenie, po obejrzeniu recznie zero.**
Piec to dokladnie to, co 9.32 mialo odrzucac: `cloudinary` i `configcat` maja fraze w **liscie
nawigacji** ("Transformation URL API Upload API Admin API Provisioning API"), `auth0` w **cytacie
klienta na stronie marketingowej**, `bunny.net` pisze "You can find your API key at Account API Key",
czyli o **znalezieniu istniejacego** klucza, a `bird.com` i `supabase` maja Management API do
**czegos innego niz poswiadczenia** (routing SMS, wygasanie kodow OTP). Reguła zachowuje sie tak,
jak opisana.

**Szoste jest realnym znaleziskiem, tyle ze o skanerze, nie o vendorze.** `cloudinary.com` ma strone
`documentation/provisioning_api`, ktorej **nie przeczytalismy**: wzorzec `CREDENTIAL_PATH` zawiera
juz `provisioning`, wiec to nie jest kwestia wzorca, tylko **zrodla kandydatow**. Strony dokumentacji
bierzemy z tego, co jest podlinkowane, a sonda znajduje je w **mapie witryny**, ktorej skaner do tego
nie uzywa (52 z 63 domen ma mape z obiecujacymi sciezkami). Do tego indeks dokumentacji Cloudinary
renderuje sie JavaScriptem, wiec linkow tam po prostu nie ma.

**NASTEPNY KROK, swiadomie NIE zrobiony w nocy:** dodac mape witryny jako **zrodlo kandydatow** na
strony dokumentacji, obok linkow. To zmienia probke, a wiec i punkty, na calym korpusie i wymaga
wlasnego reseedu oraz pomiaru przed i po. Robienie tego o pierwszej w nocy, tuz po przemiacie, byloby
zmiana punktacji bez pomiaru, czyli dokladnie tym, czego ta lista zabrania.

## WARSTWA PLATNOSCI NAPISANA I WYLACZONA (2026-08-18, v486)

Druga polowa planu z audytu decyzji, cala bez zakladania konta. **Wszystko jest martwe, dopoki
`BILLING_PROVIDER` nie zostanie ustawione**: webhook odpowiada 404, sprawdzone na produkcji.

- `src/lib/billing/catalog.ts` - **jedno miejsce z cenami** (SKU, kwota w groszach, interwal, liczba
  domen, identyfikator ceny u dostawcy z env). Straznik porownuje kwote z cennikiem na stronie, bo
  to jest para, ktora sie rozjedzie najszybciej i najbardziej boli.
- `src/lib/billing/provider.ts` - interfejs plus dwie implementacje: `manual` (dzisiejszy mailto,
  domyslny) i `paddle`. Zmiana dostawcy na Polara to jeden plik, nie przepisywanie stron.
- `src/app/api/billing/webhook/route.ts` - podpis, okno czasowe, czytanie zdarzen, przyznawanie i
  odbieranie uprawnien.

**Siedemnascie rund `codex review` na tym jednym kawalku, kazda z realnym znaleziskiem.** Lista, bo
to jest mapa pulapek platnosci asynchronicznych i szkoda, zeby zginela:
1. **Paddle wysyla `customer_id`, nie adres** - kazde prawdziwe zdarzenie odpadaloby jako niekompletne.
2. **Uprawnienie szlo z `custom_data`**, czyli z pola, ktore kupujacy moze podmienic w checkoucie:
   mozna bylo zaplacic taniej, a poprosic o plan agencyjny. Teraz **uprawnienie idzie za cena**,
   ktora dostawca mowi, ze obciazyl.
3. **Id transakcji to nie id subskrypcji** - anulowanie nie trafialoby w nic, a monitoring zostawalby
   platny na zawsze. Teraz obie referencje sa osobne.
4. **Odnowienie subskrypcji** dzielilo referencje z pierwszym miesiacem, wiec drugi miesiac wygladal
   jak powtorka i wypadal na unikalnym indeksie.
5. **Anulowanie pytalo o katalog** - po zmianie cennika stara cena nie pasowala do niczego i
   anulowanie bylo kwitowane bez odebrania uprawnienia.
6. **`extra-question` za 29 USD** wpadalo w galaz monitoringu i dawalo plan, ktorego nikt nie kupil.
7. **Transakcja z dwiema pozycjami** dawala jedno uprawnienie: placisz za dwie rzeczy, dostajesz jedna.
8. **Platnosc bez domeny** byla kwitowana i gubiona; teraz kazda zostawia trwaly slad do przypisania.
9. **Pakiet na dziesiec domen** zapisywal reszte tylko do logu, a log nie jest kolejka pracy.
10. **Rotacja sekretu**: Paddle wysyla wtedy kilka `h1`, a brany byl ostatni.
11. **Nieuporzadkowana kolejnosc zdarzen** - platnosc w locie mogla cofnac anulowanie; marker
    anulowania jest teraz zapisywany **przed** dotknieciem czegokolwiek i czytany po zapisie.
12. **Powtorka starej platnosci** wznawiala obserwacje, ktora klient w miedzyczasie zatrzymal.
13. **Watch niepotwierdzony albo zatrzymany** dostawal `plan: paid` i zadnej uslugi, bo kolejka go
    pomija.

**Jedna rzecz, ktora wygladala na blad, a jest regula produktu:** `plan` niczego nie odbiera, bo cron
obsluguje kazda potwierdzona i niezatrzymana obserwacje. To jest **poprawne, dopoki monitoring jest
darmowy w trakcie budowy**, co obiecuje `/pricing`. Regula siedzi teraz w `MONITORING_IS_FREE` obok
cen, a straznik wiaze ja ze zdaniem na stronie: gdy flaga sie zmieni, zdanie musi zniknac w tym samym
commicie.

**Czego swiadomie NIE ma:** ksiegi platnosci z wersjonowaniem zdarzen dostawcy. Idempotencja stoi
dzis na unikalnym indeksie i na sprawdzeniu przed zmiana uprawnienia, co zamyka okna, ale nie
zastapi ksiegi. To jest robota na tydzien, w ktorym pieniadze naprawde zaczna sie ruszac.

## SCIEZKA PLATNOSCI: DECYZJA Z AUDYTU SUBAGENTA (2026-08-18, do potwierdzenia rano)

**To nie jest decyzja Krystiana, tylko rekomendacja audytu decyzji**, zrobionego subagentem na
polecenie "jesli blokuje cie decyzja, zrob audyt i dzialaj wedlug niego". Wdrazam wedlug niej, ale
**punkty 1-3 na koncu wymagaja jego potwierdzenia, zanim cokolwiek pojdzie na konto**.

**REKOMENDACJA: Paddle** (merchant of record), plan B: **Polar**. Skrot uzasadnienia:
- **VAT UE i podatek w USA zdejmuje z nas MoR.** Goly Stripe tego nie robi: Stripe Tax liczy
  podatek, ale w wiekszosci jurysdykcji **nie sklada deklaracji i nie odprowadza**.
- **Paddle to spolka z UK**, wiec dla polskiej JDG sprzedaz idzie **poza UE**: nie uruchamia
  rejestracji VAT-UE ani informacji podsumowujacej, a przy zwolnieniu podmiotowym nie wlicza sie do
  limitu 200 tys. zl. **Stripe Managed Payments to psuje**, bo acquirerem bywa podmiot irlandzki,
  czyli kontrahent z UE.
- **Prowizje na naszych kwotach:** Paddle 5% + 0,50 (przy 49 USD to 6,0%). Stripe MP w polskim
  cenniku to **3,5% doliczone do zwyklych oplat**, wiec przy karcie z USA wychodzi ~9%, czyli
  drozej niz Paddle, wbrew intuicji.
- **Faktura B2B:** Paddle waliduje NIP w VIES i robi odwrotne obciazenie. Stripe MP wystawia z
  Linka ("Sold through Link", `LINK.COM*` na wyciagu), co dla dzialu zakupow jest dziwnym
  kontrahentem.
- **KSeF od 2026-04-01** to dodatkowy argument przeciw recznej fakturze: przy Paddle **nie
  wystawiamy faktury nikomu**, bo Paddle robi samofakturowanie.
- **Audyt "cztery cyfry" zostaje poza bramka** i idzie faktura z infakt: uslugi z czlowiekiem w
  srodku sa wykluczone z AUP Paddle i wprost z regulaminu Stripe Managed Payments.
- **Cash flow, o ktorym latwo zapomniec:** Paddle wyplaca raz w miesiacu, prog 100 USD, przelew do
  15. Pierwsze pieniadze z pojedynczej sprzedazy 49 USD moga lezec u nich 6-10 tygodni. Polar ma 7
  dni i wyplaty na zadanie, i to jest jedyny powod, dla ktorego moglby wygrac.

**ZROBIONE DZIS Z PLANU WDROZENIA (bez zakladania jakiegokolwiek konta):**
**Strony prawne**, ktore audyt nazwal bramka numer jeden i ktorych **nie bylo wcale**: `/terms`,
`/privacy`, `/refunds` (v485). **Zamkniete same z siebie**: dopoki `SELLER_LEGAL_NAME` i
`SELLER_ADDRESS` nie sa ustawione, kazda z nich zwraca **404**, a stopka ich nie linkuje. Straznik
w `rules.mts` pilnuje obu polowek tej reguly. Sprawdzone na produkcji: `/terms` = 404.
Tresc jest prawdziwa wobec kodu, nie wzieta z szablonu: nie mamy ciasteczek, skryptu analitycznego
ani zadnego taga trzeciej strony, licznik odwiedzin trzyma dzien, sciezke i to, czy to byl agent
(bez IP i bez user-agenta), a jedyne dane osobowe to adres mailowy podany po wynik albo obserwacje.

**Polityka zwrotow, ktora zaproponowalem i ktora trzeba zatwierdzic:** raport jednorazowy **14 dni,
bez podania powodu** (plus alternatywy: darmowy przeskan albo powtorzenie biegow); monitoring
zatrzymywalny w kazdej chwili, **biezacy miesiac bez zwrotu**, bo zostal zmierzony i dostarczony;
audyt rozliczany rozmowa, ale bez placenia za bieg, ktory sie nie odbyl.

**CZEGO POTRZEBUJE OD KRYSTIANA RANO, zanim cokolwiek ruszy dalej:**
1. **Status podatkowy JDG** (czynny VAT czy zwolnienie, jest rejestracja VAT-UE czy nie) oraz
   **dokladna nazwa prawna i adres** - musza sie zgadzac znak w znak miedzy regulaminem a KYC.
   To sa wartosci do `SELLER_LEGAL_NAME`, `SELLER_ADDRESS`, `SELLER_TAX_ID`.
2. **Czy sprzedaz ma isc na JDG, czy planowana jest spolka.** Paddle przypina podmiot na stale, a
   zmiana sprzedawcy to nowe konto i ponowne wpisywanie kart przez klientow.
3. **Akceptacja polityki zwrotow powyzej** albo jej korekta.

## /findings PUBLIKOWALO NIEPRAWDE, BO LICZBY BYLY WPISANE RECZNIE (2026-08-18, wdrozone v484)

Lista po reseedzie kazala sprawdzic, czy `audit-study.mts` zglosi ruch przy provisioningu. **Nie
zglosil** - i to bylo wlasciwe znalezisko. Straznik pilnuje **kierunku** ("niesiony przez polowe
popularnych"), a strona publikowala **liczby**, ktorych nikt nie przeliczal. Po tym, jak 9.32 zabrala
punkt 17 wierszom, cztery figury na `/findings` przestaly odpowiadac danym, a **dwie zmienily znak**:
strona mowila "+37 wsrod znanych i **minus trzy** wsrod reszty", podczas gdy dane mowia +34 i **+10**.
Analogicznie przy drugim narzedziu: "+42 i minus osiem" wobec dzisiejszych +32 i +5.

**Poprawka jest strukturalna, nie tekstowa.** Badanie mieszka teraz w `src/lib/study.ts`:
`buildStudy()` liczy luki, `studyClaims()` trzyma **liste twierdzen z warunkiem prawdziwosci**.
Czytaja to dwa miejsca: `audit-study.mts` (oblewa, gdy twierdzenie przestaje sie trzymac) i sama
strona (interpoluje liczby, a gdy ktores twierdzenie nie trzyma albo korpus jest niepelny,
**zdejmuje eksponat** zamiast drukowac wniosek nad danymi, ktore mu przecza). Naglowek i wstep licza
badania z tego, co faktycznie wyrenderowano, a opis strony nie obiecuje juz szesciu.

**Szesc rund `codex review`, kazda z realnym znaleziskiem**, w tym: eksponat renderowal sie przy
pustym korpusie z "0 of 0" i "too few to read"; wniosek o trzecim checku mieszal dwa narzedzia w
jednym zdaniu; metadane strony obiecywaly szesc badan takze wtedy, gdy szoste sie nie renderuje.

**Zasada, ktora z tego zostaje:** straznik potrafi pilnowac kierunku, nie potrafi czytac zdania.
Kazda liczba, ktora publikujemy w prozie, ma byc **interpolowana z pomiaru** albo pilnowana osobnym
strażnikiem porownujacym dokladna wartosc. Trzecia droga, czyli "poprawimy przy nastepnym reseedzie",
konczy sie publikowaniem znaku minus tam, gdzie dane maja plus.

## 9.34: SZESNASTY CHECK, CZYLI CENA W SNIPPECIE (2026-08-17, w repo, czeka na deploy)

Z przegladu `~/projects/seo-agent/Jak-agenty-wyszukuja-produkty.md` i skilla `agent-discoverability`
wyszla jedna rzecz, ktorej nie mierzylismy, a ktora **sami u siebie naprawilismy** po self-audycie:
**agent eliminuje dostawce na podstawie streszczenia, ktorego nie otworzyl**. WorkOS zostal nazwany
"the most attractive on price" i odrzucony na snippecie; Auth0 wylecial na cudzym twierdzeniu o
karcie, a jedyny bieg, ktory otworzyl ich cennik, zadnej karty nie znalazl.

**Check `price_in_snippet`** (1 pkt, etap discovery, `MAX_SCORE` 17 -> 18): czyta **tag description**
strony cennika, a gdy go nie ma - jej pierwsze widoczne slowa, i **nigdy tresci pod spodem**. To jest
sens tego checka: silnik cytuje tag, ktory dostal, wiec cena trzy akapity nizej nie istnieje w
momencie, w ktorym zapada decyzja. Przechodzi na kwocie, stawce albo warunku wejscia slowami.

**Trzy rzeczy, ktore wyszly z pomiarow na zywych domenach, zanim to poszlo do repo:**
1. `pulumi.com` pisze "free to individuals" i moj pierwszy wzorzec (`free tier|free plan|...`) tego
   nie lapal, czyli **oskarzylbym ich falszywie**. Wzorzec to teraz golе slowo `free` z jednym
   wyjatkiem na idiom "feel free". Kierunek bledu wybrany swiadomie: hojnie, bo zmierzone zero jest
   oskarzeniem.
2. Cytat to **okno wokol trafienia**, nie samo slowo. "carries free entry: free" nie jest dowodem,
   ktory vendor moze sprawdzic.
3. Codex zwrocil uwage, ze czytalem tylko **pierwsze** z dwoch pobran cennika, choc reszta checkow
   cenowych bierze **sume obu** wlasnie dlatego, ze jeden vendor serwowal ta sama strone raz z, raz
   bez zdania o darmowym planie. Teraz snippet tez patrzy na oba.

**Nasz wlasny wiersz przechodzi** i to jest kontrolka, ze regula umie powiedziec "tak":
opis `/pricing` niesie "$49" i "Free scan, no account and no card". **Audyt zlapal przy okazji, ze
`/llms.txt` mowi "15 deterministic checks"** - poprawione na 16, a strony i tak licza z `CHECKS.length`.

**Do zrobienia po deployu:** korpus jest na 9.33, wiec check pojawi sie dopiero przy nastepnym
reseedzie (karencja 6 h od tego, ktory teraz idzie). Do tego czasu `npm run audit` bedzie zglaszal
jeden rozjazd na `/llms.txt`, bo czyta **zywa** strone. Po deployu ma zniknac.

## CO JESZCZE Z TEGO RESEARCHU WARTO ZMIERZYC, I CZEGO NIE DA SIE (2026-08-17)

Przeglad `~/projects/seo-agent/Jak-agenty-wyszukuja-produkty.md` obok skilla `agent-discoverability`.
Zaimplementowany zostal snippet (9.34, sekcja wyzej). Reszta z uzasadnieniem, zeby nikt nie robil
tego przegladu drugi raz od zera.

**Nastepny kandydat, mocny: bramka na kluczu licencyjnym.** Najmocniejszy zmierzony fakt z calego
dokumentu, ktorego NIE mierzymy: audyt edytorow N=6, 6/6 agentow wybralo Tiptapa, a CKEditor i
Froala odpadly **na samym wymogu klucza licencyjnego**, zanim ktokolwiek spojrzal na funkcje. My
mamy CAPTCHE, karte i dostepnosc rejestracji, ale nie mamy "zeby w ogole uruchomic, potrzebujesz
klucza komercyjnego". Ksztalt taki jak `programmatic_provisioning`: fraza plus cytat zdania, w
ktorym padla. **Wymaga przebiegu adwersaryjnego przed wdrozeniem** (ryzyko falszywego oskarzenia
jest tu wyzsze niz przy snippecie: podwojne licencjonowanie open source mowi o kluczach zupelnie
niewinnie).

**Drugi kandydat: martwe linki w dokumentacji.** ZMIERZONE, ze agent nie ponawia 404, tylko zmienia
dostawce. Mamy probowanie linkow w llms.txt i sciezek z robots.txt, ale **nie linkow ze strony
dokumentacji**. Maszyneria istnieje (probka + tolerancja + znacznik `unasked`), koszt to kilka zadan
na skan. Odlozone swiadomie: to drugi check w jednym wieczorze i lepiej wydac 9.34 dobrze.

**Czego nie da sie zmierzyc naszym skanerem, i tak ma zostac:** obecnosc w pamieci modelu (to
warstwa, ktora wygrywa, i nie jest wlasnoscia strony); obecnosc w Bing/Brave/wlasnym indeksie
OpenAI (rozne indeksy, brak API, a przy Brave nie ma nawet zgloszenia); dopasowanie architektoniczne
("Vite SPA nie ma backendu do podpisywania"), ktore bije cene i jest wlasciwoscia pary produkt-
zadanie, nie strony; zalozenia frameworkowe w docsach (UploadThing rozwazony 8/8, wybrany 0/8) -
realne, ale nie widze reguly, ktora nie generowalaby falszywych oskarzen.

## RAPORT ZA 49 USD DAL SIE SPRZEDAC TYLKO 177 DOMENOM (2026-08-17, naprawione)

`categoryFor` dopasowuje domene do **listy** w kategorii, a nie do kategorii, wiec kazdy prawdziwy
prospekt spoza korpusu slyszal "twoj produkt nie nalezy do zadnej z 26 mierzonych kategorii".
Sprzedawalismy wiec produkt wylacznie tym 177 domenom, o ktorych sami zdecydowalismy sie pisac.

**Teraz:** `client-report.mts <domena> --category <id>` czyta goscia z **tych samych** odpowiedzi.
Licznik, podzial na narzedzia, kto byl pierwszy i cytaty licza sie ponownie z jego domena w liscie,
bo matcher rozstrzyga niejednoznaczna nazwe **sasiadami** - inaczej "named first" zostaloby stare.
Wiersze publikowane zostaja zrodlem dla korpusu, wiec raport o naszej 177 nie moze sie rozjechac ze
strona, a przy goscia liczeniu ponownym kazda roznica wobec opublikowanych liczb leci na stderr.

**Bezpieczenstwo nazwy, znalezione przez codex review jako P1.** `mentionsIn` wyprowadza marke z
pierwszego czlonu domeny. Dla goscia to katastrofa, nie halas: `email.com` bylby wymieniony w kazdej
odpowiedzi ze slowem "email", a `postmark.com` przejalby wszystkie wzmianki `postmarkapp.com`.
Dlatego **gosc domyslnie lapie sie tylko na swoj adres**, marke moze nadac czlowiek (`--brand`), a
nazwa **nalezaca juz do kogos publikowanego jest odrzucana**, nie rozstrzygana. Gdy w odpowiedziach
stoi ich nazwa, a `--brand` nie podano, narzedzie mowi, ile wzmianek zostawiamy niepoliczonych.

**Dokument mowi o tym sam:** akapit, ze zostali dopisani do kategorii **po** biegach, ze nic nie
przebiegano pod nich i ze liczniki wszystkich policzono na nowo obok nich. Runbook zabrania go
usuwac. Sprawdzone od poczatku do konca na `mailtrap.io` (skan przez konsole, potem raport).

## PLATNY RAPORT DAWAL MNIEJ NIZ DARMOWA STRONA (2026-08-17, czeka na deploy)

Dalszy ciag czytania dokumentow klienta zamiast ich audytowania. Trzy rzeczy, wszystkie znalezione
przez wygenerowanie raportu dla vendorow o roznym ksztalcie (mocny, sredni, blokujacy nas).

1. **Brak planu naprawy.** `buildFixPlan` mial darmowy skan, mail i eksport maszynowy. Dokument za
   **49 USD** jako jedyny go nie mial, wiec kupujacy dostawal liste "co jest nie tak" i **ani jednego
   "co z tym zrobic"**, czyli mniej niz dostaje za darmo. Sekcja 3 raportu to teraz plan: zdanie z
   arytmetyka, tanie kroki numerowane, reszta ponizej i **sufit** ("N punktow siedzi za checkami,
   ktorych nie zmierzylismy"), zeby plan nie czytal sie jak obietnica pelnej puli.
2. **Vendor, ktorego nie moglismy przeczytac, dostawal wynik bez ostrzezenia.** froala.com odmawia
   nam wszystkiego (403 takze na Chrome), osiem z pietnastu checkow bylo niemierzalnych, a raport
   otwieral sie "4 of 6 measurable points" i przechodzil do rad o OAuth. Teraz **przed tabela** stoi
   zdanie, ile checkow nie dalo sie zmierzyc. Codex zwrocil uwage, ze pierwsza wersja przypisywala
   **wszystkie** niezmierzone jednej przyczynie, wiec liczba jest teraz bezprzyczynowa, a warunki
   skanu (odmowa na brzegu, wyczerpany budzet czasu) sa wymienione osobno i moga wystapic naraz.
3. **`lower()` robilo z "OAuth" - "oAuth".** W zdaniu "Fix one thing, oAuth dynamic client
   registration", w dokumencie, za ktory ktos placi. Etykieta zaczynajaca sie od dwoch wielkich
   liter zostaje nietknieta. Dotyczy tez darmowej strony, wiec **wymaga deployu**.

**Plus jedna kopia mniej:** zdanie "Picked ahead of you" bylo w raporcie i w miesiecznym mailu, w
dwoch osobnych kopiach, i **klamalo liderowi**: stripe.com prowadzil w pieciu biegach z dziesieciu i
czytal, ze zostal wyprzedzony. Jedna funkcja `whoWentFirst` na oba dokumenty, a przy niezerowym
`first` zdanie brzmi "In the 5 runs that did not put you first...". Straznik na oba warianty.

## 9.33: „13 hostow sondowanych" liczylo hosty, o ktore nigdy nie zapytalismy (2026-08-17, v482)

To ostatni nienaprawiony punkt z listy niezaleznego przegladu szesciu wydan (sekcja nizej), tam
opisany jako *„zostaje `probedHosts` w zdaniu o OAuth, ktory nadal liczy hosty niezapytane"*.

**Na czym polegal.** `fetchUrl` odrzuca zadanie **przed wyslaniem**, gdy host juz raz odmowil
polaczenia albo domena wyczerpala limit niedopowiedzianych zadan w tym skanie (znacznik `unasked`
z 9.24). `probeOauthOrigins` liczyl jednak `targets`, czyli **zamiar**, nie zadanie. Vendor mogl
wiec przeczytac na karcie *„No OAuth metadata on any of the 13 hosts probed"*, gdy czesc z tych
trzynastu nie dostala od nas ani jednego pakietu.

**Poprawka.** Do `origins` wchodzi origin, do ktorego **wyszlo cokolwiek**. Zakres jest waski z
zalozenia: wypada tylko taki, ktorego **wszystkie** zadania zostaly stlumione, wiec zgadywana
subdomena, ktora nie rozwiazuje sie w DNS, nadal sie liczy (odpowiedziala nam bledem, czyli
pomiarem). Gdy nie zostal nikt, check jest **niemierzalny**, a nie oblany, i ma na to wlasne zdanie
zamiast starego „no OAuth metadata on the apex", ktore mowiloby o dokumencie, o ktory nie pytalismy.

**Znalezisko codeksa, ktore uratowalo poprawke** (pierwsze uzycie przywroconej reguly „review
przez `codex review` przed commitem"): pierwsza wersja czytala origin **z odpowiedzi**
(`got.url`), a `runFetch` zwraca adres, na ktorym **skonczyl po przekierowaniach**. Well-known
przekierowujacy na inny origin zaliczylby wiec cel, o ktory nie pytalismy, i zgubil ten, o ktory
pytalismy, czyli poprawka na uczciwosc liczenia sama wprowadzalaby to samo klamstwo. Teraz origin
**jedzie razem z adresem** (`{ origin, url }`), wiec nie da sie ich rozjechac.

**Straznicy:** `zero zapytanych hostow: niemierzalne` i `i zdanie nie mowi o apeksie` w
`scripts/rules.mts`, plus `9.33 przenosi zmiane w oauth_dcr` (rescoring monitoringu nie ma prawa
policzyc tej zmiany jako pogorszenia u vendora, bo zapisane `probedHosts` pochodzi ze starej reguly).

**Czego NIE dalo sie zmierzyc przed reseedem:** ile wierszy w korpusie to dotyka. Zapisane findings
trzymaja `probedOrigins`, ale **nie trzymaja informacji, ktore z nich byly niezapytane**, wiec
odtworzenia na starych danych nie ma. Liczbe zobaczymy na najblizszym reseedzie: wobec punktu
odniesienia (**92 oblane `oauth_dcr`, 75 z adresami**) czesc powinna przejsc na **niemierzalne**.
To jest oczekiwany kierunek, nie regres, i **guard regresji na koncu reseedu je pokaze** jako
werdykty gorsze niz poprzedni pomiar. Nie skanuj ich pojedynczo jako podejrzanych, dopoki nie
sprawdzisz, czy nowe zdanie mowi o zadaniach, ktore nie wyszly.

## DZIESIEC BLEDOW W DWOCH DOKUMENTACH, KTORE DOSTAJE PLACACY KLIENT (2026-08-17, naprawione)

**Skan pilnuje `npm run audit`, badanie pilnuje `audit-study.mts`, a platnego raportu i
miesiecznego maila nie pilnowalo nic.** Adwersaryjny przeglad subagentem znalazl dziesiec rzeczy,
z ktorych **dwie sa katastrofalne**, i wszystkie potwierdzilem na korpusie przed naprawa.

**Przyczyna wspolna dwoch najciezszych: oba skrypty mialy WLASNA, slabsza definicje wymieniania**
niz ta, ktora publikujemy na `/methodology` i ktora policzone sa liczby stojace w tym samym
akapicie. Szukaly marki jako **podciagu**, bez granicy slowa.

1. **`name.com` bylby wymieniony w 0 z 10 biegow i dostalby DZIESIEC akapitow „What the runs said
   about you"** - kazdy o Route 53, Openprovider albo Cloudflare, trafiony na „nameservers" i
   „domain name". `tiny.cloud` dostawal zdanie o licencji **CKEditora** (trafienie na „scru**tiny**"),
   `deepl.com` zdanie o Phrase i Transifeksie („deep**ly**"), `here.com` rekomendacje Google Maps
   („w**here**"). Galaz „No run wrote a sentence about you" nie odpalala **nigdy**.
2. **Lista „named more often than you, in the same runs" liczona z jednej celi, a naglowek z obu.**
   `godaddy.com` czytal „you were named in 5 of 10 runs", a pod tym `gandi.net` (4/10) i
   `porkbun.com` (3/10) jako wyprzedzajacych. **Osiem takich inwersji w korpusie**, a klauzula
   „in the same runs" te nieprawde wzmacniala. Blad w druga strone tez: `ckeditor.com` mial 5/5 na
   celi codeksa, wiec lista byla pusta i nie widzial ani jednego konkurenta, choc pieciu go
   wyprzedza w skali dziesieciu biegow.

**Osiem pozostalych, wszystkie naprawione w tym samym commicie:**

3. „Ktory dostawca zostal wybrany zamiast was" siedzialo w galezi `else` bloku cytatow, wiec przy
   dziurawym matcherze dostawal to **prawie nikt**, a sprzedane jest jako osobna pozycja cennika.
4. **Ujawnienie o instrukcjach operatora bylo martwym kodem** w raporcie **i na `/c/<kategoria>`**:
   `held[0]` jest z definicji cela **najczystsza** (sortujemy rosnaco po `operatorContext.length`),
   wiec warunek czytal pusta liste za kazdym razem. Raport twierdzil przy tym *„a result that
   survives two tools is about you rather than about the machine we ran it on"*, gdy `/methodology`
   i `/findings` mowia **wprost odwrotnie**. Platny dokument klocil sie z darmowa strona, do ktorej
   sam linkowal.
5. **`src/data/cells.json` niosl absolutna sciezke do katalogu domowego operatora** i wkleilby ja do
   dokumentu, ktory klient przekazuje dalej. Teraz nazwa pliku; `export-cells.mts` obcina ja u
   zrodla, zeby nie wrocila przy nastepnym eksporcie.
6. Raport wolal skan **zasiany** od najnowszego, wiec klient, ktory wczoraj naprawil `llms.txt` i
   przeskanowal sie sam, dostawal starszy wynik pod naglowkiem w czasie terazniejszym.
7. Brak normalizacji domeny w platnej sciezce: `www.stripe.com` slyszal, ze **nie nalezy do zadnej
   z 26 mierzonych kategorii**, o domenie siedzacej w korpusie. `--out` bez wartosci wolal
   `writeFileSync(undefined)`.
8. Zdanie **„you have not been charged for it"** - raport nie ma pojecia, co zafakturowano, a
   cennik nie ma pozycji na czesciowy zwrot. Usuniete.
9. Cennik obiecywal **„every transcript handed over"**, a raport nie linkowal nawet do
   `/c/<kategoria>/runs`, gdzie transkrypty leza publicznie. Wersja darmowa dawala wiecej niz platna.
10. **„Ten times" i „five runs each" sa juz nieprawda**: cela `app-hosting/codex` ma szesc biegow.
    Cennik mowi teraz „at least", bo dolna granica to jedyna wersja tego zdania, ktorej dobity
    korpus nie obali. Mail dostal tez atrybucje cytatu (narzedzie i numer biegu), bo cela `claude`
    odpowiada **po polsku** i nieoznaczone polskie zdanie w angielskim mailu czyta sie jak pomylka.

**`npm run audit-delivery`** (`scripts/audit-delivery.mts`) pilnuje tego dalej: przechodzi kazdego
dostawce w kazdej kategorii i sprawdza, czy dokument moglby powiedziec cos, czego dane nie niosa.
**Kontrolka pierwsza, zgodnie z zasada 2:** podstawilem stary matcher pod `quotedAbout` i straznik
zglosil **23 zdania**; po przywroceniu poprawnego zgłasza **zero**, przy 107 dostawcach z cytatem i
70 ze zdaniem o absencji (te 70 zgadza sie z liczba publikowana na `/c`).

**Zasada, ktora z tego zostaje:** *dokument, ktory laczy licznik z cytatem, musi brac oba z jednej
definicji.* Dwie implementacje „czy go wymieniono" w jednym akapicie to nie duplikacja kodu, to
dwie rozne prawdy obok siebie, i ta slabsza zawsze wygra, bo jest bardziej hojna.

## SELF-AUDYT WLASNEJ WITRYNY WEDLUG SKILLA `agent-discoverability` (2026-08-17, 15:30)

Sprzedajemy gotowosc na agentow, wiec raz na jakis czas trzeba przepuscic wlasna witryne przez
wlasna liste. **Blokery binarne przechodzimy wszystkie**: HTML renderowany po stronie serwera na
`/`, `/c`, `/findings`, `/methodology` i `/pricing`, `robots.txt` wpuszcza boty pobierajace,
skan bez konta i bez karty, `/agent-signup.md`, `/agents.md`, `/openapi.json`,
`/.well-known/mcp.json`, `/.well-known/agent-access.json` i `/.well-known/api-catalog` odpowiadaja
200, a linki w naszym `llms.txt` zyja.

**Trzy dziury, ktore celowo zostawiamy** (zapisane, zeby nikt nie audytowal tego drugi raz):
`/.well-known/security.txt` (nasz skaner go sonduje, ale **za nic nie przyznaje punktu**, wiec
wystawienie go byloby kultem cargo), `llms-full.txt` (nasz `llms.txt` ma 2,6 kB i nie ma czego
rozwijac) oraz ARD `/.well-known/ai-catalog.json` (adopcja bliska zeru, skill wprost mowi, zeby
nie mierzyc nim sukcesu).

**Dwie rzeczy naprawione i wdrozone.**

1. **Cena i warunek wejscia trafily do snippeta.** Wlasny pomiar mowi, ze agent odrzuca dostawce na
   podstawie wyniku wyszukiwania, ktorego **nie otworzyl** (Auth0 przegral bieg przez cudze zdanie
   o wymaganej karcie; jedyny bieg, ktory otworzyl ich cennik, zadnej karty nie znalazl). Opis
   `/pricing` nie mial ani jednej liczby, wiec czytal sie jak „contact sales", a opis strony
   glownej nie mowil, ze skan jest darmowy i nie chce konta. Oba zmienione, lead na `/pricing` tez.
2. **Adnotacje przy narzedziach MCP**, ktorych nie bylo wcale. `scan_domain` dostal
   `readOnlyHint: false` - jedno wywolanie to seria zadan do **cudzego** serwera i zapisany raport
   pod stalym linkiem, wiec klient auto-zatwierdzajacy read-only puszczalby to bez nadzoru na
   osobie trzeciej. `find_providers` czyta tylko nasz korpus i ma hinty odwrotne.

## 9.31 I ODKRYCIE, ZE REJESTR MCP JEST DLA NASZEGO DYNA NIEOSIAGALNY (2026-08-17)

**Trzy zmiany w jednej wersji formuly, wszystkie zmieniaja publikowane zdanie.**

1. **`signup_reachable` rozdzielony.** Osmiu vendorom pisalismy *„its form needs JavaScript"*,
   choc ich strona nie ma **zadnego** pola i wpuszcza tylko przez dostawce tozsamosci. Nowa regula
   `entersThroughIdentityProvider` wymaga braku pola tozsamosci **w calym HTML** (nie tylko w
   `<form>`), wiec jest ostrozniejsza od sondy audytu. **Kontrolka na 85 oskarzonych wierszach
   przed wdrozeniem: 7 zgod, 0 nadgorliwosci skanera, 1 przypadek gdzie sonda mowi oauth a my nie**
   (`browserless.io` ma pole email poza formularzem, wiec zostaje przy starym zdaniu). Werdykt
   sie nie zmienia, zmienia sie tylko to, co twierdzimy, ze widzielismy.
2. **`machine_readable_api` pyta takze host dokumentacji.** `docs.trychroma.com/openapi.json`
   znajduje sie teraz sam, a zdanie odmowne mowi, ze pytalismy oba miejsca.
3. **Milczenie rejestru MCP przestalo byc oskarzeniem** - i to jest najwazniejsze z dzisiaj.

**Skad to wyszlo: badanie szesciu spadkow z pary pomiarowej 9.30.** Trzy z nich to `mcp_present`
1 -> 0 u `phrase.com`, `tolgee.io` i `medusajs.com`. Wszystkie trzy **maja zywy endpoint w
rejestrze MCP** (`mcp.eu.phrase.com`, `app.tolgee.io/mcp/developer`, `docs.medusajs.com/mcp`), a
my opublikowalismy *„No MCP surface"*. Czwarty spadek, `medusajs.com oauth_dcr`, to skutek tego
samego: metadane OAuth sondujemy na originach znalezionych przez MCP.

**Pomiar, nie hipoteza:** z dyna `registry.modelcontextprotocol.io` **nie odpowiada w ogole**.
Cztery proby z Heroku EU: `status 000` po 10 i po 20 sekundach, przy `api.github.com` 50 ms. Z
laptopa ten sam adres odpowiada w 1,1-1,9 s. Czyli **nasz skaner od jakiegos czasu nie widzi
rejestru** i zamienial to na zdanie o vendorze.

**Zrobione:** `registryEndpoints` zwraca teraz `answered`, a check bez zadnego endpointu przy
milczacym rejestrze jest **niemierzalny**, nie oblany. Do tego **lustro rejestru**: dzienny job
GitHuba (`.github/workflows/mcp-registry.yml` + `scripts/mirror-mcp-registry.mts`) przechodzi cala
liste i wysyla ja do `/api/cron/mcp-registry`, skaner czyta kolekcje `mcpRegistry` po polu `under`
(host i wszystkie domeny nad nim). Zabezpieczenia: **polowicznie przeczytana lista nie jest
zapisywana** (kursor musi dobiec konca), endpoint **odrzuca ladunek ponizej 100 hostow**, a lustro
starsze niz **7 dni** jest traktowane jak brak odpowiedzi.

**Efekt uboczny, ktory jest wlasciwym powodem:** wyszukiwanie w rejestrze bylo **nieodtwarzalne**
(4 s wyscigu z cudzym hostem), a lustro jest deterministyczne i szuka po **hoscie**, nie po slowie
kluczowym z nazwy domeny, wiec znajduje tez serwery zarejestrowane pod inna nazwa.

**Do sprawdzenia po reseedzie:** ile wierszy ma `mcp_present` niemierzalny. Jesli duzo, to znaczy,
ze lustro sie nie zapelnilo albo TTL jest za krotki.

## NASZ WLASNY WIERSZ OBLEWA DOKLADNIE TEN CHECK, KTORY WLASNIE UZNALISMY ZA NAJWAZNIEJSZY

Skan `letagentsin.com` na 9.30: **11/17**, i jedyny check oblany wprost to **`oauth_dcr`** (reszta
braków to `niemierzalne`: nie mamy rejestracji konta ani pakietu npm, wiec nie ma czego mierzyc).

To jest ta sama regula, ktora w pomiarze wymienialnosci wyszla **jedyna przezywajaca kontrole na
slawe** (+27pp u popularnych, +12pp u mniej znanych, w obu narzedziach). Czyli **oblewamy check,
o ktorym wlasnie zebralismy najmocniejszy dowod, ze ma znaczenie.**

**I zostaje tak, jak jest.** `/methodology` publikuje to zdanie od dawna i nadal renderuje sie
poprawnie: *„We fail `oauth_dcr` (...) our tools take no credential, so there is no client for an
agent to register, and rewriting the rule until we passed would be marking our own work."* Nasz
produkt nie ma kont, wiec nie ma klienta do zarejestrowania; napisanie sobie wyjatku byloby
ocenianiem wlasnej pracy. **Do przemyslenia po zamrozeniu**, ale ostroznie: czy `oauth_dcr` powinien
byc `notApplicable` dla produktow bez kont. Odpowiedz „tak" poprawia uczciwosc, ale **zdejmuje
oskarzenie z nas samych**, wiec wymaga podwojnie mocnego uzasadnienia, a nie wygody.

## PRZEGLAD TEGO, CO WIDZI ODWIEDZAJACY, PO RESEEDZIE (2026-08-17)

Sam korpus moze byc zdrowy, a strona i tak pokazywac cos innego, wiec po reseedzie przeszedlem
sciezka klienta zamiast ufac audytowi korpusu.

- **Wszystkie strony 200**, a `170` renderuje sie na `/`, `/findings`, `/report` i `/methodology`.
  Najwolniejsza jest strona glowna, 1,95 s (dynamiczna, liczy rankingi); reszta ponizej 0,4 s.
- **Skan odwiedzajacego przeszedl end to end**: `vercel.com` w 6,1 s, 11/17 na formule 9.30,
  **zero checkow bez zdania**, jeden niemierzalny. Strona vendora i **link trwaly** oba 200.

To jest tania kontrola, ktora warto powtarzac po kazdym reseedzie: audyt korpusu sprawdza dane,
a to sprawdza produkt.

## 29. PRZEBIEG: `signup_reachable` NA 9.30, ZERO OBALONYCH I OSIEM ZDAN, KTORE MYLA

`npx tsx scripts/audit-signup.mts <ile>` na korpusie 9.30 (ta linijka mowila `npm run audit-signup credited|accused`; ani takiego skryptu npm, ani takich trybow nigdy nie bylo). **Kontrolka: 40 z 42**, czyli dokladnie
w udokumentowanym progu tej sondy (`docuseal.com` i `deepl.com` to jej znane pudla, opisane w
naglowku skryptu). **Strona oskarzen: 85 wierszy, zero obalonych** - nigdzie nie ma formularza,
ktorego byśmy nie widzieli.

**Ale osiem wierszy dostaje zdanie, ktore opisuje formularz, jakiego ten vendor nigdy nie napisal:**
`cloudinary.com`, `transloadit.com`, `trychroma.com`, `rollbar.com`, `modal.com`, `browserless.io`,
`cal.com`, `redis.io`. Wszystkim publikujemy *„<url> is reachable, but its form needs JavaScript"*,
a ich strona rejestracji **nie ma zadnego pola** i wpuszcza wylacznie przez dostawce tozsamosci.

Sprawdzone recznie na `modal.com/signup`: **51 983 bajty HTML z serwera, zero `<input>`**, za to
trzy przyciski `Continue with GitHub`, `Continue with Google`, `Continue with SSO`.

**Werdykt (zero punktow) jest sluszny** - agent bez czlowieka i tak nie zalozy tam konta - **ale
zdanie twierdzi istnienie czegos, czego nie zmierzylismy**. To jest dokladnie ten rodzaj bledu,
ktory ten produkt ma nie popelniac, i vendor czytajacy to zdanie ma prawo uznac, ze nie patrzylismy.

**Poprawka jest gotowa do wdrozenia PO pomiarze podlogi szumu** (dotyka zdania, wiec i wersji
formuly): gdy strona nie ma zadnego pola formularza, a niesie wejscia przez dostawce tozsamosci,
publikujemy to zamiast zdania o JavaScripcie. Sonda audytu juz to rozroznia i nazywa `oauth-only`.

## OBIETNICA BIEGOW AGENTA MA DZIURE: DOMENA SPOZA NASZYCH KATEGORII (2026-08-17)

`/pricing` obiecuje obserwowanej domenie biegi agentow co miesiac, a **cela rozpoznawcza wymaga
kategorii i pytania**. Odwiedzajacy moze obserwowac dowolna domene na swiecie. **Dzis 1 z 3
obserwacji nie da sie obsluzyc**: `vercel.com`, usunieta z korpusu 2026-08-11 wlasnie za brak
mierzonej przez nas kategorii. Nic tego nie mowilo.

`npm run watch-coverage` wypisuje kazda obserwacje z kategoria, obecnoscia pytania i data ostatniej
celi, i **odmawia brzmiec uspokajajaco**: brak kategorii to `BRAK KATEGORII`, a na koncu leci
zdanie, ile obserwacji nie da sie obsluzyc.

Obietnica na `/pricing` i na stronie glownej mowi teraz, ze biegi obejmuja **25 mierzonych
kategorii**, a gdy produkt nie nalezy do zadnej, **mowimy o tym zanim ktos wlaczy monitoring**.
Wdrozone i sprawdzone na produkcji.

**Swiadomie NIE dodalem kategorii dla vercela**, choc to bylo by prawdziwe rozwiazanie: zmiana
skladu korpusu w trakcie okna **zepsulaby pare pomiarowa do podlogi szumu**. Do rozwazenia po niej,
razem z pytaniem, czy w ogole chcemy mierzyc hosting.

## POJEMNOSC MONITORINGU POLICZONA, I STRAZNIK KADENCJI (wdrozone 2026-08-17)

**Ile klientow obsluzy dzisiejszy monitoring: okolo 240 obserwowanych domen.** Rachunek:
`watch.yml` chodzi raz na dobe i wywoluje endpoint **do 40 razy**, endpoint bierze **jedna domene
na wywolanie** (Heroku ubija ciche zadanie po 30 s, a skan trwa do 27 s), czyli **40 skanow na
dobe**; wiersz przeterminowuje sie po **szesciu dniach**. 40 x 6 = 240. Powyzej tego tygodniowa
kadencja zaczyna sie sypac.

**Nic tego nie mierzylo.** `quota.yml` sprawdzal tylko, czy przebieg monitoringu konczy sie
sukcesem, a **przebieg z zalegla kolejka konczy sie sukcesem tak samo jak zdrowy**. To ten sam
ksztalt awarii, przez ktory monitoring stal kiedys dwa dni i nikt sie nie dowiedzial.

Endpoint raportuje teraz `watches`, `due` i `longestWaitDays`, a straznik alarmuje powyzej **osmiu
dni** (kadencja plus dzien luzu na przesuniecie crona GitHuba). **Odczyt jest GET-em bez skutkow
ubocznych**, bo pytanie o stan kolejki nie moze przy okazji przeskanowac cudzej domeny ani wyslac
komus maila. Sprawdzone na produkcji: `{"watches":3,"due":0,"longestWaitDays":4}`, a bez tokenu
i ze zlym tokenem 401.

**Dwie rzeczy sprawdzone przy okazji i obie sa w porzadku:** monitoring trzyma **wlasna linie
bazowa** (`watch.lastReportId`) i przelicza ja pod dzisiejsze reguly, wiec reseed korpusu **nie
zjada klientowi zmiany**, o ktorej mial dostac maila; a kolejka jest sortowana po `checkedAt`
rosnaco (nigdy niesprawdzone pierwsze), wiec **nikt nie moze zaglodzic sie na jej koncu**.

## WERYFIKACJA PUNKTU WEJSCIA PO RESEEDZIE: 120 OSKARZEN, ZERO NIEZGOD

Najwieksza rodzina oskarzen na karcie wynikow, sprawdzona na korpusie 9.30.
**Kontrolka: 37 wierszy zaliczanych, 0 niezgod. Oskarzenia: 120 sprawdzonych, 0 niezgod.**

Do tego doszlo w trzech krokach i kazdy z nich byl naprawa MOJEJ SONDY, nie skanera:

1. **`weglot.com`**: ich host odpowiada `# Page Not Found. The URL <sciezka> does not exist` na
   kazde pytanie. Sonda zwijala biale znaki **przed** porownaniem pierwszej linii, wiec obie
   odpowiedzi roznily sie cytowana sciezka i regula wspolnego naglowka nie strzelala. Pierwsza
   linia jest teraz brana z surowego tekstu.
2. **`datadoghq.com/agent.md`**: to ich strona dokumentacji o produkcie nazwanym Agent, z
   `breadcrumbs: Docs > Agent` we front matterze. Skaner ma te regule od 9.28, sonda jej nie miala.
3. **`calendly.com`**: dwie sciezki wielkimi literami wrocily jako 317-bajtowy markdownowy 404 w
   trakcie jednego przebiegu, a minute pozniej ten sam host odpowiadal na nie (i na sciezke
   wymyslona) zwykla skorupa HTML 298 kB. **Trafienie liczy sie teraz dopiero, gdy powtorzy sie
   przy drugim pytaniu.**

**Kontrolka po kazdym z tych zaostrzen nadal daje 37/37**, czyli sonda nie stracila zdolnosci
widzenia plikow, za ktore dajemy punkt. To ten sam test, ktory przy audycie rejestracji kazal
wczesniej odpuscic zaostrzenie, bo psulo kontrolke.

## RESEED NA 9.30: 170 WIERSZY, ZERO SPRZECZNOSCI, PIEC "POGORSZEN" ZBADANYCH PO KOLEI

`170 rows on formula 9.30, 0 contradictions`, `21 stated numbers and 5 named-vendor claims checked
against the data, 0 adrift`. Piec werdyktow gorszych niz poprzedni pomiar, **kazdy przeskanowany
pojedynczo, zanim ktokolwiek nazwal go regresem vendora**, tak jak nakazuje skrypt:

- **`vonage.com` i `phrase.com`, `mcp_present` 1 -> 0: przejsciowe.** Pojedynczy skan odzyskuje oba,
  lokalnie i na produkcji, i oba wpisane z powrotem do korpusu. Przy okazji **vonage potwierdza
  druga fale z 9.29**: ich serwer stoi na `documentation-mcp.vonage.dev`, czyli na innej domenie tej
  samej marki, i znajduje go dopiero regula z tego wydania.
- **`bitmovin.com`, `user_agents_allowed`: niemierzalne**, ich brzeg odmawia nam `robots.txt`.
  Werdykt jest oznaczony jako niemierzalny, wiec nie liczy sie przeciwko nim.
- **`calendly.com`, `agent_entry_point` i `machine_readable_api` 1 -> 0: to NIE jest regres vendora,
  tylko poprawa naszego pomiaru.** Ich host dokumentacji odpowiada **ta sama skorupa HTML o
  rozmiarze 298 kB na kazda sciezke**, sprawdzone recznie na `/skill.md`, `/SKILL.md`, `/AGENTS.md`
  i `/agents.md`: cztery identyczne odpowiedzi. Wczesniejszy przebieg tego samego dnia zaliczyl im
  `skill.md` i to bylo zaliczenie falszywe. **Fala wielkich liter z 9.28 wzmocnila kontrolke
  wspolnego ksztaltu** przypadkiem: wiecej sond na tym samym hoscie to wiecej identycznych cial,
  wiec dedup lapie szablon, ktorego wczesniej nie widzial.

**Do zrobienia po odmrozeniu formuly:** discovery adresu dokumentacji jest niestabilne (raz korzen
`developer.calendly.com/`, raz `/docs/getting-started/overview`), a `machine_readable_api` czyta
deklaracje specyfikacji **tylko z tej jednej wylosowanej strony**. To druga rzecz w tym tygodniu
wskazujaca na te sama poprawke, po 28. przebiegu: **pytaj takze o korzen hosta dokumentacji**.

> **ZAMKNIETE POMIAREM 2026-08-18: nie robimy tego.** Napisalem te poprawke i zmierzylem ja, zanim
> weszla: na **wszystkich 26 wierszach korpusu**, ktore ten check oblewaja i ktorych strona
> dokumentacji nie jest korzeniem hosta, korzen deklaruje specyfikacje w **zero** przypadkach.
> Poprawka kosztowalaby jedno zadanie na kazdej trudnej domenie i nie zmienilaby ani jednego
> werdyktu, wiec kod zostal wycofany. Sama niestabilnosc discovery zostaje, ale **przez deklaracje
> nie przeklada sie na ten check**. Gdyby ktos chcial to otworzyc ponownie, potrzebny jest inny
> dowod niz „to sie moze zdarzyc": lista domen, ktore deklaruja spec w korzeniu i nie deklaruja go
> glebiej.

## PIERWSZY POMIAR: CZY NASZE CHECKI MAJA COKOLWIEK WSPOLNEGO Z TYM, KOGO AGENCI WYMIENIAJA

25 cel rozpoznawczych (wszystkie kategorie, 5 biegow claude/sonnet kazda), **170 dostawcow, 87
wymienionych choc raz**. `npm run named-vs-score`, wynik w `scratchpad/named-vs-score.txt`.
Test permutacyjny 10 000 przetasowan ze stalym ziarnem, plus podzial po medianie tygodniowych
pobran npm, bo **slawa dostawcy jest oczywistym czynnikiem konfundujacym**.

**Na calym korpusie:**

| check | zdaja | oblewaja | roznica | przypadek |
|---|---|---|---|---|
| `oauth_dcr` | 56% | 28% | **+28pp** | 0.000 |
| `mcp_present` | 51% | 31% | **+20pp** | 0.003 |
| `programmatic_provisioning` | 50% | 31% | **+18pp** | 0.006 |
| `typed_package` | 42% | 23% | +20pp | 0.050 |
| **`llms_txt`** | 40% | 37% | **+3pp** | **0.738** |
| `machine_readable_api` | 39% | 40% | -1pp | 0.908 |
| `agent_entry_point` | 41% | 40% | +1pp | 0.905 |

Wynik powyzej mediany: **50% wymienialnosci kontra 31%** ponizej, +19pp, przypadek 0.003.

**Ale wiekszosc tego to slawa, nie nasze checki.** Sami popularni (powyzej mediany 243 891 pobran
tygodniowo): 58% wymienialnosci. Sami mniej znani: 27%. Dopiero wewnatrz polowek widac, co zostaje:

| check | u popularnych | u mniej znanych |
|---|---|---|
| **`oauth_dcr`** | **+32pp** | **+16pp** |
| `mcp_present` | +28pp | +4pp |
| `programmatic_provisioning` | +35pp | -1pp |
| `llms_txt` | +1pp | -7pp |

**`oauth_dcr` jest jedynym checkiem, ktory przezywa kontrole na slawe po obu stronach.** MCP i
provisioning trzymaja sie tylko wsrod popularnych, czyli u nich to w duzej mierze slawa.
**`llms_txt` nie pokazuje niczego nigdzie**, co zgadza sie co do joty z trzema zewnetrznymi
zbiorami logow opisanymi w sekcji o wtyczkach.

### REPLIKACJA NA DRUGIM NARZEDZIU: to samo, mocniej, i BEZ SKAZENIA

Te same 25 kategorii przepuszczone przez **codex (gpt-5.6-sol, `model_reasoning_effort=low`)**.

**Korekta mojego wlasnego raportu skazenia, 2026-08-17:** raportowalem przy tych biegach
`~/.codex/memories_1.sqlite` jako kontekst. **`codex features list` mowi `memories stable false`**,
czyli ta funkcja jest wylaczona i codex tego pliku nie czyta. Nie ma tez zadnego `AGENTS.md` ani
w `~/.codex`, ani w katalogach nadrzednych biegow. **Wiec przy biegach codexa zaden plik instrukcji
nie byl w zasiegu i jest to pierwszy nieskazony pomiar, jaki mamy** - bez klucza API, ktory nadal
jest blokerem tylko dla drogi `--bare` w claude. Harness pyta teraz narzedzie o stan tej funkcji
zamiast zakladac, i zapisuje rozwiazane ustawienia (`model`, `model_reasoning_effort`) do `RUN.json`,
bo efort jest parametrem pomiaru, a nie kontekstem. 90 dostawcow
wymienionych choc raz. **Wynik w `scratchpad/named-vs-score-codex.txt`.**

Liczby ponizej sa **po reseedzie na 9.30 i po poprawce matchera**, czyli porownywalne z tabela
w sekcji wyzej:

| check | claude/sonnet | codex |
|---|---|---|
| `oauth_dcr` | +25pp (0.000) | **+31pp (0.000)** |
| `programmatic_provisioning` | +18pp (0.008) | **+23pp (0.000)** |
| `mcp_present` | +14pp (0.048) | **+22pp (0.001)** |
| `typed_package` | +23pp (0.019) | +19pp (0.066) |
| `llms_txt` | +3pp (0.716) | +15pp (0.105) |

**`llms_txt` jest jedynym miejscem, gdzie narzedzia sie roznia kierunkiem sily:** claude plasko,
codex lekko na plus, ale **zadne z dwoch nie przechodzi testu przypadku**, wiec to nadal brak
sygnalu, a nie sygnal slabszy.

**Uwaga do wydruku codexa:** naglowek nadal wypisuje `memories_1.sqlite` jako kontekst, bo pliki
`RUN.json` tych biegow powstaly **przed** poprawka wykrywania. Same biegi byly czyste (funkcja
`memories` wylaczona), a zapisanych metadanych nie ruszam po fakcie: przepisywanie zapisu przebiegu
po jego zakonczeniu jest dokladnie tym, co niszczy zaufanie do zapisow.

Po kontroli na slawe, codex: `oauth_dcr` **+35pp u popularnych i +19pp u mniej znanych**,
`mcp_present` +34 i +10, `programmatic_provisioning` +41 i +4, `llms_txt` +20 i -2.

**Wniosek, ktory przezyl wszystko, co na niego rzucilem:** `oauth_dcr` jest dodatni w **dwoch
narzedziach, dwoch rodzinach modeli i obu polowkach popularnosci**. `mcp_present` idzie zaraz za
nim. `llms_txt` nie ma sygnalu w zadnym pomiarze, ktory przechodzi test przypadku.

### AKTUALIZACJA PO RESEEDZIE 9.30 I POPRAWCE MATCHERA (2026-08-17)

Liczby wyzej powstaly na korpusie 9.27/9.28. Po reseedzie na 9.30 i po dolozeniu reguly „dwie
marki-slowa w jednym zdaniu licza sie obie" przeliczylem wszystko jeszcze raz:

| check | bylo | jest |
|---|---|---|
| `oauth_dcr` | +28pp (0.000) | **+25pp (0.000)** |
| `programmatic_provisioning` | +18pp (0.006) | **+18pp (0.008)** |
| `mcp_present` | +20pp (0.003) | **+14pp (0.048)** |
| `typed_package` | +20pp (0.050) | +23pp (0.019) |
| `llms_txt` | +3pp (0.738) | **+3pp (0.716)** |
| wynik powyzej mediany | +19pp (0.003) | +16pp (0.019) |

**Najciekawsza zmiana jest w `mcp_present` i warto rozumiec, skad sie wziela: to MOJA poprawka
rozmyla te korelacje.** Druga fala z 9.29 znalazla prawdziwe endpointy u 15 dodatkowych vendorow
(73 zaliczanych przed reseedem, 88 po), a to sa z definicji ci trudniejsi do znalezienia, czyli
mniej znani. Czyli **czesc starej korelacji byla bledem pomiaru skorelowanym ze slawa**: u duzych
firm endpoint lezal tam, gdzie zgadywalismy. Lepszy pomiar oslabil zwiazek i to jest zdrowy
kierunek, a nie strata.

Po kontroli na slawe wnioski sie nie zmieniaja: `oauth_dcr` **+27pp u popularnych i +12pp u mniej
znanych**, `programmatic_provisioning` +26 i +1, `mcp_present` +18 i +5, `llms_txt` +5 i -6.

**Kontrola matchera recznym odczytem** (cela `llm-infrastructure`, najtrudniejsza, bo pelna marek
bedacych zwyklymi slowami): matcher zgadza sie z moim odczytem na **33 z 35 komorek**, a obie
rozbieznosci to te, ktorych **odmowil rozstrzygnac i zacytowal czlowiekowi** (`Replicate` i `Modal`
w liscie z Ollama i vLLM, ktorych nie ma w naszym korpusie). Po poprawce kategoria zgadza sie co do
biegu.

**Czego to NIE dowodzi, i to musi isc razem z kazda liczba:** nic o przyczynie (znany dostawca i
publikuje, i jest wymieniany), nic o pojedynczym dostawcy (piec biegow oddziela sciane od ciszy),
i nic czystego, bo biegi czytaly `~/.claude/CLAUDE.md` tej maszyny. Wiersze z garstka danych sa
w wydruku oznaczone: `answers_plain_request` pokazuje -54pp na **pieciu** oblewajacych, a wszyscy
piatka to firmy dosc duze, by stac je na obrone przed botami, wiec to znowu slawa tylnymi drzwiami.

**Co z tym zrobic (decyzje na po pomiarze podlogi szumu, bo dotykaja punktacji):**
1. `llms_txt` zostaje w formule czy nie? Moja rekomendacja: **zostaje, ale zdanie przy nim mowi, co
   zmierzylismy** - jest tani i nieszkodliwy, a my wlasnie udowodnilismy, ze nie ma zwiazku z
   wymienialnoscia. Konkurencja sprzedaje go jako lek.
2. To jest **material na strone i najmocniejsza roznica wobec Cloudflare i Vercela**, ktorzy mierza
   czytelnosc tresci. Zdanie do publikacji: check poswiadczen (`oauth_dcr`) jest jedynym, ktory
   przezywa kontrole na popularnosc.
3. Powtorzyc na drugim narzedziu (codex) i po odmrozeniu formuly, zanim cokolwiek pojdzie na strone.

## RESEARCH: WTYCZKI "AGENT READY" DLA WORDPRESSA I SKLEPOW (pytanie Krystiana, 2026-08-16)

Pytanie: czy budowac wtyczki gotowosci na agentow dla popularnych platform (WordPress, WooCommerce,
PrestaShop, Magento, frameworki) jako czesc naszego ekosystemu. **Odpowiedz: nie w wersji ogolnej.**
Trzy powody, kazdy ze zrodlem.

**1. Wlasciciele platform wchlaniaja te warstwe.** Yoast i Rank Math generuja `llms.txt` natywnie
(miliony instalacji kazda). Wtyczka Automattica `wordpress-mcp` jest **wygaszana na rzecz
`WordPress/mcp-adapter`**, czyli MCP wchodzi do rdzenia WP przez Abilities API. Mintlify sam
generuje `llms.txt`, `llms-full.txt`, `skill.md` **i serwer MCP dla kazdej instancji docsow**, czyli
cztery nasze checki za darmo. Shopify Spring '26 **automatycznie wlacza kwalifikujacym sie
sprzedawcom** UCP i Global Catalog MCP z syndykacja do ChatGPT, Copilota, Google AI Mode i Gemini.

**2. To, co te wtyczki dodaja, nie ma zmierzonego efektu.** Trzy niezalezne zbiory logow:
MaxAEO (19 witryn, luty-kwiecien 2026) **41 zadan o `llms.txt` na ~1,1 mln pobran stron przez
crawlery AI**; OtterlyAI **84 na 62 100 wizyt botow, 0,1 procent**; Evil Martians **zero zadan o
pliki markdown** od GPTBot, ClaudeBot i PerplexityBot. Cytowalnosc 11,8 kontra 11,6 procent, czyli
**0,2 punktu, wewnatrz szumu**.

**3. Pojemnosc.** Jedna osoba, dwa audyty miesiecznie. Wtyczka na cudzej platformie to biezaca
konserwacja bez konca.

### Wazniejsze od pytania o wtyczki: rynek pomiaru sie zamknal

- **Cloudflare, 17 kwietnia 2026, darmowy `isitagentready.com`**: cztery wymiary, w tym Agent Skills,
  API Catalog (RFC 9727), OAuth discovery, MCP Server Card, WebMCP.
- **Vercel** ma wlasna Agent Readability Spec i paczke `@vercel/agent-readability`;
  **`agent-ready.dev`** robi 70 checkow z opublikowana metodologia (my jestesmy w ich komentarzach
  w kodzie od dawna).
- **`agentchecker.ai` sprzedaje juz nasz platny produkt**: prawdziwy agent w prawdziwej
  przegladarce, ponad 20 zadan lacznie z rejestracja i checkoutem, **od 19 funtow**, plus model
  odsprzedazy dla agencji po ~13 funtow. Nasz audyt to cztery cyfry.

**Nasza obrona jest metodologiczna i lejkowa, nie technologiczna.** Oni sprzedaja jeden
pietnastominutowy przebieg; my mamy juz napisane na `/pricing`, dlaczego jeden przebieg niczego nie
dowodzi, i raportujemy rozrzut z powtarzalnej celi. **Nikt z nich nie mierzy, czy agent zdobedzie
konto i klucz** (rejestracja, OAuth DCR, provisioning) - Cloudflare i Vercel mierza czytelnosc.

### Waska wersja pomyslu, ktora ma sens

Nie wtyczka dla mas, tylko **mala paczka dla NASZYCH kupujacych** (dostawcy API): karta
`.well-known/mcp.json`, `agents.md`, link `rel="service-desc"` do OpenAPI, samo-check lejka
rejestracji, plus akcja CI liczaca nasza opublikowana formule na PR. **Cel to dystrybucja, nie
przychod** - jestesmy niewidoczni i to byl nasz wlasny wniosek. Jedyny segment z prawdziwa luka to
**WooCommerce, jako jedyna duza platforma nie dajaca sprzedawcom niczego automatycznie**, ale to
inny klient i inny zestaw checkow, wiec tylko przy swiadomej zmianie segmentu.

### Co to wymusza na nas

**Punktujemy `llms_txt` jako jeden z 15 checkow, a dowody na jego dzialanie sa zerowe.** Nie wolno
tego bronic, trzeba sprawdzic na wlasnych danych: cele rozpoznawcze ze wszystkich 25 kategorii
(leca w nocy 2026-08-16) pozwalaja zapytac wprost, **czy dostawcy z `llms.txt` sa wymieniani przez
agentow czesciej niz ci bez**. Jesli nie, mowimy to na stronie przed konkurencja. To jest mocniejszy
produkt niz jakakolwiek wtyczka.

## 28. PRZEBIEG: `machine_readable_api`, ZERO ZNALEZIEN I TYM RAZEM ZERO COS ZNACZY

25. przebieg na tym checku byl pusty, bo apis.guru mial pokrycie 2 na 47. Ten pyta dwa zrodla,
ktore **udowodnily, ze umieja cos znalezc**, zanim cokolwiek powiedzialy o oskarzonych
(`scripts/audit-openapi-docs.mts`):

1. **Adres specyfikacji w atrybutach ich strony dokumentacji** (`data-url` Scalara, `spec-url`
   Redoca, `rel="service-desc"`). Kontrolka: **1 trafienie na 113** wierszy zaliczanych. Slabe, bo
   te widgety najczesciej montuje JavaScript, a my czytamy HTML z serwera.
2. **Zwykle sciezki specyfikacji na HOSCIE DOKUMENTACJI**, ktorych skaner nie pyta wcale: probujemy
   `/openapi.json` i cztery inne **tylko na witrynie**. Kontrolka: **3 trafienia na 113**
   (`docs.trychroma.com/openapi.json`, `docs.together.ai/openapi.yaml`,
   `docs.browserless.io/openapi.yaml`), wszystkie prawdziwe, z sparsowana wersja.

**Strona oskarzen: 48 domen, 0 znalezien.** Tym razem zero jest informacyjne, bo to samo narzedzie
na kontrolce znalazlo cztery specyfikacje. **Zadnego falszywego oskarzenia na tym checku.**

**Do wdrozenia PO pomiarze podlogi szumu** (dotyka punktacji, wiec nie teraz): sciezki specyfikacji
probowac takze na hoscie dokumentacji. Dzis nie zmienia zadnego werdyktu, bo te trzy domeny sa juz
zaliczone inna droga, ale to ta sama dziura, ktora `agent_entry_point` mial do 9.19 i `llms_txt`
przed nim, i przy nastepnym vendorze zamieni sie w falszywe oskarzenie.

## CELA ROZPOZNAWCZA POWTORZONA DRUGIM NARZEDZIEM: WYNIK SIE TRZYMA

`file-storage`, to samo pytanie, 5 biegow claude/sonnet i 5 biegow codex (gpt-5.6-sol). Codex nie
czyta `CLAUDE.md` w ogole, wiec czyta zupelnie inny zestaw plikow operatora niz claude, i to jest
sens powtorki: **znalezisko, ktore przezywa dwa narzedzia z dwoma roznymi skazeniami, jest o
vendorach, a nie o tej maszynie.**

| domena | claude/sonnet | codex |
|---|---|---|
| cloudflare.com | 5/5, pierwszy 5x | 5/5, pierwszy 5x |
| cloudinary.com | 4/5 | 5/5 |
| uploadthing.com | 3/5 | 1/5 |
| uploadcare.com | 0/5 | 1/5 |
| bunny, filestack, imagekit, tigris, transloadit | **0/5** | **0/5** |

**Pieciu dostawcow nie padlo ani razu w zadnym z dziesieciu biegow.** Zgadza sie takze to, kto jest
wybierany: cloudflare pierwszy we wszystkich dziesieciu. Rozbieznosci sa na ogonie (uploadthing 3/5
kontra 1/5), czyli dokladnie tam, gdzie FAQ na `/pricing` mowi, ze piec biegow nie rozdziela
bliskich sobie dostawcow.

**Pulapka narzedziowa przy okazji:** `codex exec` wypisuje "Reading additional input from stdin" i
czeka, jesli stdin zostanie otwarty. Pierwszy bieg spalil na tym cala minute i skonczylby sie na
limicie czasu; `spawnSync` dostal `input: ''`.

## PODLOGA SZUMU ZMIERZONA: 0,59 PROCENT, SYMETRYCZNIE (2026-08-17, WDROZONE)

**Zmierzona pierwszy raz w historii tego produktu tak, jak trzeba.** 170 domen, **15 werdyktow na
2550, czyli 0,59 procent**, formula 9.30 po obu stronach, **9 w gore i 6 w dol**.

**Nowa jest para, nie liczba.** Kazdy wczesniejszy pomiar porownywal dwa przebiegi JEDNEGO
przemiatania, a pierwszy przebieg pyta npm na zimno i drugi znajduje odpowiedzi w cache, wiec te
pary ruszaly jednokierunkowo (para sasiednia na 9.30: 27 w gore, 3 w dol). Ta porownuje **cieply
przebieg dwoch osobnych przemiatan** oddalonych o szesc godzin. **Rozklad symetryczny to szum,
jednostronny to grzejacy sie cache z nasza nazwa.**

**Zalozenie sprawdzone, a nie przyjete:** miedzy reseedami **zero commitow** w `src/lib/scan`,
`src/lib/score.ts` i `src/lib/published.ts`, wiec reguly byly bajt w bajt te same.

**Jest WYZSZA niz 0,20, ktore zastepuje, i tak wlasnie ma byc.** Tamta pochodzi z formuly 9.8
sprzed dwunastu dni i dwudziestu kilku zmian regul, a dzisiejszy skaner zadaje domenie znacznie
wiecej pytan. Wolimy wydrukowac gorsza liczbe zmierzona porzadnie niz pochlebna, ktorej nikt tak
nie zmierzyl. Na `/methodology` i `/report` juz stoi, sprawdzone na produkcji.

**ZAMROZENIE FORMULY ZDJETE.**

**Wpadka warta zapamietania:** przygotowujac STATE.md do compactu przepisalem blok startowy przez
`nowy_naglowek + reszta_od_sekcji_X` i **skasowalem szesc sekcji z tego samego dnia**, bo wszystkie
lezaly nad sekcja X. Odzyskane z `git show <commit>:STATE.md`. **Nie sklejaj pliku po indeksie
sekcji, ktora nie jest pierwsza.**

## OKNO NA POMIAR PODLOGI SZUMU: OD TERAZ NIE RUSZAMY FORMULY (2026-08-16, 23:00, ZAMKNIETE)

Podloga szumu jest niezmierzona od poczatku istnienia tego produktu i **powod jest zawsze ten sam:
kazdy reseed konczy sie zmiana formuly, wiec nigdy nie mamy dwoch cieplych przebiegow na TEJ SAMEJ
wersji**. `noise-floor 9.27` dal 0,24 procent, ale jednokierunkowo, czyli mierzyl nasza wlasna
poprawke, a nie szum.

Dzis to okno wreszcie jest otwarte i **kosztuje tylko dyscypline**:

1. Reseed czekajacy w petli (`scratchpad/reseed-929.log`) wjedzie po karencji, ok. **02:12**, i
   postawi korpus na **9.30**.
2. **Do drugiego reseedu NIE WOLNO zmieniac `FORMULA_VERSION`.** Zadnej poprawki punktacji, nawet
   oczywistej. Znaleziska z przebiegow adwersaryjnych mozna w tym czasie zbierac i opisywac, ale
   wdrazac dopiero po pomiarze.
3. Po ok. sze­sciu godzinach (karencja) drugi reseed, dalej na 9.30.
4. `npm run noise-floor 9.30` na tej parze. **Dopiero to jest podloga szumu**: ruch w obie strony
   miedzy dwoma pomiarami tej samej reguly na tym samym korpusie.

**PULAPKA ZLAPANA W PORE (2026-08-17):** skrypt bral **dwa najswiezsze skany**, czyli po drugim
reseedzie porownalby przebieg zimny i cieply TEGO SAMEGO reseedu - dokladnie ten konfund, przed
ktorym sam ostrzega. Cale okno zmierzyloby jeszcze raz cache npm. Teraz grupuje skany po przerwie
90 minut i bierze **ostatni (cieply) z kazdej grupy**. Stare zachowanie zostaje pod argumentem
`adjacent` i na 9.30 pokazuje, po co: **30 ruchow, 27 w gore, 3 w dol**, podrecznikowo
jednokierunkowo.

Co wolno robic w tym oknie, bo nie dotyka punktacji: przebiegi adwersaryjne (same pomiary),
harness biegow rozpoznawczych, audyty, dokumentacja, strony.

## 27. PRZEBIEG: TOKEN CAPTCHY NA CALEJ WITRYNIE TO NIE BRAMKA NA FORMULARZU (9.30)

`signup_no_captcha`, 28 oskarzen, `npm run audit-captcha credited|accused` (skrypt przepisany na
ksztalt dwustronny ze sklepu, stary czytal domeny ze stdin).

**Kontrolka pierwsza: 22 wiersze, ktorym dajemy punkt, sonda widzi czyste. Zero niezgod**, wiec
sonda potrafi odtworzyc nasz pomiar, zanim cokolwiek powie o oskarzonych. **Strona oskarzen: zaden
z 28 nie obalony** - token naprawde jest w HTML rejestracji, dokladnie tak, jak publikujemy.

Znalezisko jest gdzie indziej i dotyczy roznicy miedzy zdaniem a punktem. Check istnieje po to, by
znalezc **bramke na formularzu**, a zdanie dowodzi tylko **stringu na stronie**. **Szesc z 28**
(`mailgun.com`, `chargebee.com`, `sentry.io`, `betterstack.com`, `raygun.com`, `bigcommerce.com`)
serwuje ten sam token **na stronie glownej, gdzie nie ma zadnego konta do zalozenia**. To ich nie
oczyszcza (skrypt ladowany na calej witrynie i tak dziala na tym formularzu) i nie skazuje (HTML
nie umie powiedziec, ktore z dwoch). Wiec **punkt zostaje odjety, a zdanie mowi teraz, ktore z
dwoch faktycznie widzielismy**, dokladnie tak, jak gałąź zaliczajaca mowi juz o bot defence.

**Usterka zlapana w mojej wlasnej kontrolce, warta zapamietania:** pierwsza wersja twierdzila o
`sentry.io`, ze tokenu na stronie glownej nie ma. Strona glowna wazy **628 kB, a domyslny limit
odczytu to 400 kB** i token siedzi za nim, wiec kontrolka wypowiadala sie o bajtach, ktorych nie
przeczytala. Zlapal to dopiero skrypt audytu (curl bez limitu) postawiony obok skanera. `fetchUrl`
przyjmuje teraz `readBytes` na pojedyncze zadanie, a **`readBytes` wchodzi do klucza cache**, bo
inaczej kontrolka dostalaby uciety korpus zapisany wczesniej podczas odkrywania. Regula ogolna:
**limit odczytu to takze zrodlo falszywych "nie ma"**, nie tylko oszczednosc pamieci.

## 26. PRZEBIEG: POKRYCIE ZMIERZONE PRZED WYBOREM ZRODLA, I DWA FALSZYWE OSKARZENIA (9.29)

Kolejka mowila: **zanim wybierzesz check, zmierz pokrycie zrodla prawdy**. Zmierzylem i zrodlo
odpadlo, co samo w sobie jest wynikiem tego przebiegu.

**Katalogi MCP inne niz oficjalny rejestr nie sa zrodlem prawdy o tym, co publikuje vendor.**
`scripts/coverage-mcp-directories.mts`, kontrolka pierwsza: z **73 domen, ktorym zaliczamy zywy
serwer MCP, smithery ma wpis dla 31 i wskazuje na ICH wlasny host dla ZERA**. Strona oskarzen to
samo: 93 sprawdzone, 22 z jakimkolwiek wpisem, **0 pod ich hostem**. Katalog hostuje serwery u
siebie (`stripe` -> `stripe.run.tools`), wiec jego adres nie mowi nic o vendorze. Dwa pozostale
kandydaty odpadly bez pomiaru: **glama ignoruje wlasny parametr wyszukiwania** (`?query=stripe`
zwraca serwery do zakladek Firefoksa) i trzyma same repozytoria spolecznosci, a **pulsemcp v0beta
odbija polowe zadan** w ramach wygaszania API.

**Liczby "22 ma wpis" NIE publikujemy**, bo jest zawyzona przez ten sam problem zwyklych slow, co
matcher nazw: `cloudflare/radar` trafilo na `radar.com`, `GoPlausible/tinyman-mcp` na
`plausible.io`. Liczba, ktora ma znaczenie (0 pod ich hostem), jest odporna, bo decyduje o niej
host adresu, a nie podobienstwo nazwy.

### Zrodlo, ktorego nie pytalismy: ich wlasna dokumentacja

Odpadniecie katalogow zepchnelo na jedyne zrodlo, ktore nie jest ani nasza zgadywanka, ani cudzym
katalogiem: **strony o MCP, ktore vendor sam wymienia w swoich plikach maszynowych**. Ich pliki nie
zawieraja adresu serwera, tylko adres strony o nim, wiec teraz otwieramy te strone i probujemy
adresy z jej wnetrza. Dwa potwierdzone falszywe oskarzenia, oba na fladze produktu:

- **neon.com**: serwer stoi na `mcp.neon.tech/mcp` (inna domena tej samej marki), odpowiada 401 z
  wyzwaniem. **Zaden adres zgadywany na neon.com nie mogl tam trafic**, a `mcp.neon.com` w ogole
  sie nie rozwiazuje.
- **launchdarkly.com**: `mcp.launchdarkly.com/mcp/launchdarkly` odpowiada bledem JSON-RPC
  (`-32001 unauthorized access`), a `mcp.launchdarkly.com/mcp`, ktory zgadujemy, odpowiada 404.
  Wlasciwy host, sciezka nie do zgadniecia.

Straznicy reguly, kazdy z testem, ktory umie oblac (`scripts/rules.mts`): adres liczy sie jako ich,
gdy stoi na skanowanej domenie albo na domenie z **ta sama marka o dlugosci min. 4 znakow** (zeby
"cal" nie lapalo swiata); musi **wygladac jak endpoint, a nie jak strona o endpoincie** (sciezki
`/docs/`, `/guides/`, `/blog/` odpadaja, bo nikt nie routuje JSON-RPC pod prefiksem dokumentacji);
**druga fala rusza wylacznie**, gdy zgadywanie, karta i rejestr nic nie znalazly; i **bierzemy z
niej tylko endpointy**, bo pusta druga fala nie moze nadpisac tego, co wie pierwsza. Zdanie odmowne
wymienia teraz strony, ktore przeczytalismy, wiec vendor widzi, ze zajrzelismy tam, gdzie sam
wskazal.

**Ryzyko do sprawdzenia w reseedzie:** druga fala dodaje do 2 pobran stron i do 3 sond na domenach,
ktore i tak sa najtrudniejsze do przeczytania, a budzet skanu to 27 s. Jesli w diffie pojawia sie
pogorszenia na INNYCH checkach tych domen, to jest wlasnie to, i wtedy limit stron schodzi do 1.

## MONITORING DOSTAJE PRAWDZIWE AGENTY (decyzja Krystiana, 2026-08-16, wdrozone)

Krystian: *"w monitoringu powinnismy miec tez real agents. samo sprawdzanie checklist to malo za
99 miesiecznie. a trzecia kolumna to audyt, rozmowa ze specjalista, praca nad twoim kodem"*. Zgoda,
ale kluczowy jest podzial, KTORE biegi agentow tam wchodza, bo mamy dwa rozne zwierzeta:

- **build run** (`npm run cell`): agent dostaje scaffold i brief i ma wdrozyc integracje. Minuty do
  godzin, izolowana kopia na bieg, wchodzi w cudza rejestracje i klucze. **Wymaga zgody vendora i
  czlowieka przy klawiaturze**, wiec zostaje w platnym audycie i jest wiekszoscia jego kosztu.
- **discovery run** (`npm run ask`, NOWE): jedno pytanie, pusty katalog, bez scaffoldu. Minuta na
  bieg. **Nic po drugiej stronie nie powstaje**, wiec wolno go puszczac co miesiac na dowolna
  domene, takze taka, ktorej wlasciciel nas o nic nie prosil. To jest ta polowa, ktora miesci sie
  w 99 dolarach.

Argument sprzedazowy, ktory z tego wychodzi: **darmowy skan mowi, czy drzwi sa otwarte, monitoring
mowi, czy ktokolwiek przez nie wszedl.** Checklisty odpowiadaja "czy agent MOZE nas uzyc",
discovery runs odpowiadaja "czy agent w ogole nas ROZWAZA". To dwie rozne porazki.

**Ograniczenie, ktore trzeba trzymac:** `/pricing` ma wlasna sekcje "Why one run of an agent proves
nothing", wiec monitoring **nie sprzedaje pozycji z jednego biegu**. Sprzedaje cele (5 biegow) i
ruch tej liczby miedzy miesiacami. Jest to napisane wprost w FAQ razem z tym, czego 5 biegow nie
umie: rozdzielic nas od bliskiego konkurenta.

### Kto zostal wymieniony, decyduje regula, nie drugi model

`src/lib/vendors.ts`: opublikowana lista nazw plus matcher, kontrolka w `scripts/rules.mts`
(sprawdzone, ze umie oblac: skasowanie jednego wpisu wywraca trzy testy). Marki bedace zwyklym
angielskim slowem - Modal, Temporal, Split, Resend, Plaid i ~30 innych - sa **cytowane czlowiekowi
jako `weak`, a nie liczone**: niedoliczenie mowi klientowi, ze jest niewidoczny, gdy nie jest, a
przeliczenie mowi, ze jest widoczny, gdy nie jest, i to sa bledy w rozne strony.

**Pierwsza cela, file-storage, 5 biegow (claude sonnet):** cloudflare 5/5, cloudinary 4/5,
uploadthing 3/5, **szesciu z dziewieciu dostawcow nie padlo ani razu**. Przeliczone recznie przez
grep, zgadza sie co do biegu.

**Druga cela, payments** (bo stripe.com jest jedna z obserwowanych domen): stripe 5/5 i za kazdym
razem jako pierwszy, lemonsqueezy 4/5, paddle 4/5, chargebee 2/5, plaid i polar 0/5. Ta cela od
razu pokazala granice mojej wlasnej reguly: **Paddle padl w 5 biegach na 5 i nie byl liczony**, bo
"paddle" to zwykle slowo. We wszystkich pieciu zdaniach stal obok pewnego dostawcy ("Merchant of
Record (Paddle, Lemon Squeezy)"). Stad awans: **niepewne trafienie staje sie pewnym, gdy w tym
samym zdaniu stoi pewne trafienie na INNEGO dostawce**, przy nadal wymaganej duzej literze. Po
zmianie paddle ma 4/5 policzone i jedno nadal cytowane czlowiekowi, bo w tym zdaniu stoi sam.
file-storage nie drgnelo, wiec awans nie jest po prostu poluzowaniem.

### Bieg czyta konfiguracje maszyny, na ktorej stoi (znalezisko, nienaprawialne bez klucza)

Pierwsza cela wrocila **PO POLSKU** na angielskie pytanie, 5 biegow na 5. Powod: `claude` czyta
`~/.claude/CLAUDE.md` tej maszyny, zanim przeczyta pytanie, a tam stoi, zeby odpowiadac po polsku.
Jezyk to tylko widoczna polowa, bo razem z nim wchodzi caly plik. Izolowany katalog roboczy nic tu
nie daje, wyciek idzie z katalogu domowego. Co sprawdzone:

| droga | wynik |
|---|---|
| izolacja `CLAUDE_CONFIG_DIR` | **wylogowuje bieg**, poswiadczenia sa zwiazane z prawdziwym katalogiem |
| `--system-prompt` zamiast domyslnego | pamiec uzytkownika to przezywa, odpowiedz nadal po polsku |
| `--bare` | zdejmuje CLAUDE.md, hooki, skille. **Czyta wylacznie ANTHROPIC_API_KEY**, nigdy keychaina |

Wiec `ask` bierze czysta droge, gdy w srodowisku jest klucz, a bez niego zapisuje do `RUN.json`
kazdy plik instrukcji, ktory byl w zasiegu, i `asked` drukuje to **NAD tabela, nie pod nia**.
**Dla Krystiana: `ANTHROPIC_API_KEY` jest teraz blokerem produktowym**, nie wygoda. Bez niego zaden
opublikowany pomiar rozpoznawczy nie jest czysty, a z nim staje sie odtwarzalny przez obcego.

### Stan operacyjny

Trzy aktywne obserwacje w produkcji, **wszystkie na naszym wlasnym mailu** (stripe.com x2,
vercel.com), wiec obietnica miesiecznej celi nie kosztuje dzis nic. Cela `payments` puszczona dla
stripe.com, bo obietnicy nie publikuje sie przed jej wykonaniem. Wpiecie w cron ma sens dopiero
przy pierwszym prawdziwym obserwujacym.

Widok dla jednej domeny, czyli to, co idzie do klienta: `npm run asked -- payments stripe.com`
drukuje zdanie z **kazdego** biegu, a gdy domena nie padla, pokazuje, kogo wybrano zamiast niej
(sprawdzone na polar.sh: piec biegow, piec razy "nie padli ani razu, wybrano stripe.com").

Wdrozone i sprawdzone na produkcji: `/pricing` z trzema kolumnami i sekcja o dwoch rodzajach biegu,
`/` z akapitem o miesiecznych biegach przy formularzu obserwacji. Pulapka z CLAUDE.md poszla do KB
(`clad-kb show agent-cli-czyta-claudemd-operatora-i-skazi-kazdy-pomiar-zach`), bo dotyczy kazdego
agenta mierzacego agenta, nie tylko tego projektu.

**Przy okazji, do przemyslenia:** agenty wymieniaja w file-storage S3, Vercel Blob i Supabase
Storage, a zadnego z nich nie ma w naszym korpusie (vercel.com zostal z niego usuniety 2026-08-11).
Korpus mierzy dostawcow "agent-native", a agenci odpowiadaja domyslnie AWS. To nie jest blad
korpusu, ale jest to roznica, ktora bedzie wracac przy kazdej celi.

## PODLOGA SZUMU: NADAL JEJ NIE ZMIERZYLISMY, I TRZEBA TO MOWIC WPROST

`npm run noise-floor 9.27` na parze przebiegow ze swiezego reseedu: **6 werdyktow na 2550
ruszylo, czyli 0,24 procent, ale WSZYSTKIE w jedna strone** (6 w gore, 0 w dol). Narzedzie samo
to nazywa i ma racje: jednokierunkowy ruch to efekt systematyczny, nie szum. Trzy z szesciu to
`postmarkapp.com`, `split.io` i `locationiq.com`, czyli dokladnie domeny odzyskane przez
zamiatanie 429, wiec zachowanie zaprojektowane.

**Wniosek, ktory trzeba powiedziec wprost: nigdy nie zmierzylismy wlasnej podlogi szumu.** Kazda
liczba, ktora publikujemy, opiera sie na zalozeniu, ze werdykt jest stabilny miedzy pomiarami, a
tego zalozenia nie sprawdzilismy ani razu.

**Czego wymaga prawdziwy pomiar:** pary CIEPLY-CIEPLY, czyli dwoch kolejnych reseedow na TEJ SAMEJ
wersji formuly. Dzis jest to niewykonalne przy okazji, bo kazdy reseed konczy sie zmiana formuly, a
karencja to 6 godzin, wiec para kosztuje dobe bez zmian w punktacji. **Tansza alternatywa, ktora
ROZWAZYLEM I ODRZUCILEM:** przeskanowac probke 25 domen dwa razy. Kosztuje to spojnosc korpusu,
bo te 25 wierszy trafia na nowa wersje formuly i wypada z wiekszosci, wiec strona pokazuje 145
zamiast 170 az do nastepnego przesiewu.

**Jak to zrobic, gdy przyjdzie dzien bez zmiany regul:** zrob reseed, odczekaj karencje, zrob drugi
reseed BEZ dotykania `FORMULA_VERSION`, potem `npm run noise-floor <wersja>`. Dopiero ta liczba
jest podloga szumu i dopiero wtedy wolno ja cytowac.

## WERYFIKACJA POPRAWKI PUNKTU WEJSCIA, I JEDNO PRAWDZIWE ZNALEZISKO (9.28)

Powtorzony audyt na przesianym korpusie. **Zbior oskarzonych spadl ze 139 na 121: osiemnastu
vendorow odzyskalo punkt**, czyli poprawka z 9.19 dziala tak, jak miala.

Zostalo **7 niezgodnosci, z czego prawdziwa JEDNA**: `clerk.com` serwuje `/SKILL.md` **wielkimi
literami** z prawdziwym plikiem skilla (`name: clerk-quickstart`), a `/skill.md` malymi zwraca 404,
przy czym sciezka bezsensowna tez zwraca 404, wiec to nie catch-all. Naprawione w 9.28 jako **fala
zapasowa** trzech sciezek (`/AGENTS.md`, `/SKILL.md`, `/AGENT.md`), pytana dopiero, gdy dziewiec
podstawowych nic nie znalazlo, wiec vendor z plikiem nie placi ani jednego dodatkowego zadania.
To spelnienie hipotezy, ktora pilotaz na dwudziestu domenach odrzucil jako nieoplacalna.

**Pozostale szesc to slepe plamy SONDY AUDYTOWEJ, nie skanera**, i to jest dobra wiadomosc:
rzecz testowana okazala sie surowsza niz rzecz testujaca. Piec to markdownowe 404
(`qdrant.tech`, `getunleash.io`, `calendly.com`, `bigcommerce.com`, `weglot.com`), jedno to
blizniak strony dokumentacji (`docs.datadoghq.com/agent.md`). Sonda dostala wlasny test naglowka,
zeby nastepny przebieg byl czytelny.

**Regres, ktory ta zmiana sama wprowadzila i ktory zlapalem od razu:** zdanie wnioskowalo
„pytalismy tez na hoscie dokumentacji" z LICZBY sciezek, wiec dwanascie sond na samej witrynie
kazalo nam nazwac host, do ktorego nie otworzylismy gniazda. Teraz bierze to z tego, gdzie
faktycznie pytalismy.

## RESEED NA 9.27: PIERWSZY DZIS PRZEBIEG BEZ ANI JEDNEGO POGORSZENIA

**170 wierszy na 9.27, zero sprzecznosci, 21 publikowanych liczb i 5 twierdzen o nazwanych
vendorach bez rozjazdu, i zero werdyktow gorszych niz poprzedni pomiar.** Poprzednie reseedy dzis
konczyly sie czterema, szescioma albo dwoma pogorszeniami, z ktorych czesc byla nasza. Ten nie ma
zadnego, mimo ze przeskoczyl osiem wersji formuly naraz (9.19 -> 9.27).

Zamiatanie 429 odzyskalo **3 z 5**: `postmarkapp.com`, `split.io` i `locationiq.com` wrocily do
pomiaru, a `contentful.com` i `savvycal.com` odpowiadaja 429 takze w ciszy, wiec ich wiersze
zostaja jako werdykt o nich. Mechanizm rozdziela te dwie klasy juz trzeci raz z rzedu.

**Pulapka operacyjna do zapamietania:** karencja liczona z mediany odbila trzy proby pod rzad, a
zaplanowane wczesniej zadanie odpalilo dokladnie w chwili, gdy reseed juz trwal, i **slusznie
zostalo odrzucone**. Jesli planujesz reseed na przyszlosc, planuj **petle ponawiajaca**, a nie
jednorazowe uruchomienie: pojedyncze trafia w karencje i traci okazje bez sladu.

## NIEZALEZNY PRZEGLAD SZESCIU WYDAN Z JEDNEGO DNIA (9.23, wdrozone) + LISTA NIENAPRAWIONYCH

Kazda zmiana z 9.17-9.22 byla weryfikowana osobno i **nikt nie patrzyl, jak dzialaja razem**.
Przeglad z czystym kontekstem znalazl to, co temu umknelo. **Piec naprawione i wdrozone:**

1. **Host dokumentacji mogl nalezec do innej firmy.** `docsOrigin` sprawdzal tylko, czy to nie ten
   sam origin co witryna. Skaner wie gdzie indziej, ze marka mieszka czasem na cudzej stronie
   (`twilio.com/docs/sendgrid` nalezy do SendGrida), wiec moglismy wydrukowac na karcie SendGrida
   „Found: https://www.twilio.com/skill.md". Masowo dotyczylo to wspoldzielonych platform
   dokumentacji. Teraz wymagamy tej samej domeny rejestrowalnej.
2. **Regula blizniaka odrzucala prawdziwe pliki**, bo kluczowala na `title:`, a `name:` to format
   skilla i nic nie zmusza vendora, zeby go uzywal. Rozstrzyga teraz sciezka okruszkowa.
3. **Rejestr MCP blokowal cala faze** (obcy host bez budzetu). Teraz 4 s.
4. **Adresy z rejestru byly traktowane jak zgadywanka** i wylatywaly na domenie z wildcardem.
5. **Przeliczanie starej podstawy bez zabezpieczenia** moglo zatrzymac kolejke monitoringu.

**NIENAPRAWIONE, do wziecia w kolejnosci wagi. To jest najwazniejsza czesc tej sekcji:**

- ~~**Najwazniejsze, wspolny mianownik trzech znalezisk**~~ **zrobione 2026-08-16 (9.24), ale tylko
  w polowie i to celowo.** Znacznik `unasked` na `Fetched` jest czytany tam, gdzie probnik linkow w
  llms.txt bral brak 404 za dowod zycia; linki, o ktore nie zapytalismy, wypadaja z probki. **Nie**
  policzylem kazdego niewyslanego zadania jako straty fazy, bo to zepsuloby uczciwe negatywy:
  wiekszosc pominietych zadan to zgadywane subdomeny, ktore nie istnieja, a „zapytalismy dziewieciu
  hostow i zaden nie odpowiedzial" jest prawdziwym zdaniem. **Zostaje `probedHosts` w zdaniu o
  OAuth, ktory nadal liczy hosty niezapytane.** Kontekst pierwotny: `fetchUrl` zwraca `status: 0` takze wtedy,
  gdy **zadanie nigdy nie wyszlo** (host odmowil polaczenia wczesniej w tym skanie albo przekroczyl
  limit timeoutow). Tylko prefiks `Out of time` zasila licznik `lost`, wiec faza nie trafia do
  `incomplete` i siec bezpieczenstwa `missed` nie dziala. Efekt: mozemy opublikowac „the 12 links
  we sampled all answer", choc **zaden z 12 HEAD-ow nie wyszedl**. Ta sama luka podbija
  `probedHosts` w zdaniu o OAuth. Naprawa: osobny znacznik na `Fetched` („nie wyslano zadania") i
  liczenie go tak jak deadline'u. **Zmiana 9.17 to zaostrzyla**, bo probka linkow ladują teraz
  glownie na wlasnej domenie vendora, czyli tej samej, ktorej licznik timeoutow sie przepelnia.
- ~~`firstDead` drukuje adres po przekierowaniach~~ **zrobione (9.25)**: nazywamy link tak, jak
  stoi w pliku.
- ~~Zdanie „across the N files" liczy pliki, ktore dorzucily nowy URL do puli~~ **zrobione (9.26)**:
  liczba opisuje teraz, z ilu plikow pochodzi probka, i mowi to ulamkiem.
- ~~`MCP_ADDRESSES` nie wymienia wszystkich odpytywanych adresow~~ **zrobione (9.25)**.
- ~~obejscie `everyNamespaceFakes`~~ **zrobione (9.27), z obu stron**: przy stronie podrabiajacej
  wszystkie formaty liczy sie wylacznie trafienie spoza jej wlasnego originu, a normalizacja przed
  porownaniem zdejmuje teraz dlugie ciagi szesnastkowe i cyfr, wiec shell z nonce nie udaje juz
  czterech roznych plikow.

**CALA LISTA PO PRZEGLADZIE JEST ZAMKNIETA.** Nastepny krok to reseed (9.19 -> 9.27) i dopiero po
nim: `npx tsx scripts/audit-entry.mts accused` (czy 21 niezgodnosci zeszlo do zera) oraz
`npm run noise-floor 9.27`.
- ~~`entryPathsRefused` obejmuje dwa origins~~ **zrobione (9.25)**: niemierzalny czyni check tylko
  odmowa na samej witrynie, a odmowe hosta dokumentacji zdanie nazywa.

## MONITORING MILCZAL PO KAZDYM NASZYM WYDANIU (naprawione, wdrozone)

Cron monitoringu, czyli **platna, powracajaca czesc produktu**, robil dobra rzecz w polowie. Dwie
karty z dwoch wersji formuly nie sa „przed i po", wiec nie wysylal maila, tylko po cichu podmienial
podstawe. **Drugiej polowy tej reguly nie bylo: kazda prawdziwa zmiana u vendora, ktora wypadnie w
tym samym oknie co nasze wydanie, przepadala bezpowrotnie.** 16.08 wydan bylo piec. Vendor mogl
tego dnia zepsuc rejestracje i nikt by sie nie dowiedzial.

Teraz przeliczamy poprzednie ustalenia dzisiejsza regula i porownujemy jak z jak. **Zmierzone przed
wdrozeniem: przeliczenie wierszy z 9.19 pod 9.22 rusza ZERO werdyktow** na pieciu domenach, wiec
mechanizm nie produkuje szumu. Skladowanie usuwa tylko `catchAll.bodies`, ktorych punktacja nie
czyta, wiec przeliczona karta jest karta, ktora opublikowalibysmy wtedy.

**Rysa, ktora zostaje, i ktora mail teraz nazywa wprost:** kiedy zaczynamy sondowac adres, o ktory
wczesniej nie pytalismy (dzis rejestr MCP), vendor, ktory nie zmienil nic, przeczyta „gained".
Mail mowi wiec, ze podstawa zostala przeliczona pod obecnymi regulami i ze linia mogla ruszyc bez
zmiany po ich stronie. To roznica miedzy raportem a przechwalka.

Stan obserwacji: **szesc, wszystkie testowe** (Krystian plus skrzynka agentowa), zero platnych.

## 25. PRZEBIEG: `machine_readable_api`, WYNIK PUSTY I TAK TRZEBA GO CZYTAC

Ten sam ruch, ktory zadzialal na `mcp_present`: zapytac zrodlo, ktore nie jest naszym zgadywaniem.
Dla OpenAPI jest nim **apis.guru**, katalog okolo 2500 publicznych opisow.

**Wynik: 0 falszywych oskarzen na 47, ale sila tego dowodu jest znikoma.** Tylko **2 z 47**
oskarzonych w ogole wystepuja w katalogu, a u obu adres zrodlowy nie odpowiada, co jest faktem o
nieaktualnosci katalogu, nie o nas. apis.guru pokrywa glownie duzych i starszych dostawcow, wiec
dla naszego korpusu jest praktycznie pusty.

**Wniosek metodyczny, wazniejszy niz sam przebieg:** „nowe zrodlo prawdy" dziala tylko wtedy, gdy
ma pokrycie na naszym korpusie. Rejestr MCP mial i dal piec prawdziwych znalezisk. apis.guru nie
ma i nie dal nic, a zapisanie tego jako „check zweryfikowany" byloby falszywym poczuciem
bezpieczenstwa. **Przed nastepnym przebiegiem tego typu zmierz najpierw pokrycie zrodla.**

Skrypt: `npx tsx scripts/audit-openapi-directory.mts credited|accused`.

## 24. PRZEBIEG: `mcp_present`, I ZRODLO, KTOREGO NIE PYTALISMY WCALE (9.22, wdrozone)

Zdanie „No MCP surface: nothing answered at mcp.<domain>, ..." wymienia **wylacznie adresy, ktore
sami zgadlismy**. Ten przebieg zapytal jedyne zrodlo, ktore nie jest zgadywaniem i ktorego nie
pytalismy w ogole: **oficjalny rejestr MCP**, czyli miejsce, gdzie agent szukajacy narzedzia
faktycznie patrzy.

**Piec z 98 oskarzonych prowadzi zywy serwer wpisany do rejestru, na wlasnej domenie**, pod
adresem, ktorego zadna lista ksztaltow nie osiagnie: `asset-management.mcp.cloudinary.com`,
`api.raygun.com/v3/mcp`, `docs.medusajs.com/mcp`, `mcp.eu.phrase.com` i
`app.tolgee.io/mcp/developer`. Sprawdzone recznie: tolgee odpowiada pelnym handshakiem
(`serverInfo: tolgee v3.216.4`), cloudinary zwraca 401 z `WWW-Authenticate` wskazujacym dokument
protected-resource, raygun ustrukturyzowane 401.

**Rejestr jest tropem, nie dowodem.** Kazdy adres z niego przechodzi przez ten sam handshake i te
sama kontrolke co adres zgadniety, wiec nieaktualny wpis nie zaliczy nikomu serwera, ktory nie
dziala. Hostname musi nalezec do vendora, bo wyszukanie jego nazwy zwraca tez serwery osob
trzecich. Jedno zadanie na skan, awaria rejestru nie zmienia werdyktu.

**Do przekazania Krystianowi, bo jest w tym niezrecznosc:** od 9.22 punktujemy vendorow miedzy
innymi za obecnosc w rejestrze MCP, a **nas samych w nim nie ma**, bo publikacja `server.json` stoi
na rekordzie DNS. To nie jest niespojnosc reguly (check mierzy, czy agent znajdzie serwer, a nie
czy jestes w rejestrze), ale jest to argument, ktory ktos moze podniesc, i jest to dodatkowy powod,
zeby ten rekord DNS w koncu powstal.

## 23. PRZEBIEG ADWERSARYJNY: `signup_reachable`, 88 OSKARZEN, NIC NIE OBALONE

**Pierwszy przebieg od dawna, ktory nie znalazl u nas bledu, i to jest wynik wart tyle samo co
poprawka.** 85 z 88 oskarzen niesie jedno zdanie: „<url> is reachable, but its form needs
JavaScript". Jest to zarazem jedna z dwoch liczb na stronie glownej, wiec falszywa byla by falszywa
publicznie.

Wykrywacz formularza napisalem **od nowa, celowo bez importu `rendersUsableForm`**, bo audyt
uzywajacy testowanego kodu zgadza sie z nim z definicji i nie dowodzi niczego.

**Piec kandydatow na falszywe oskarzenie, wszystkie pieciu okazaly sie MOJE:**
- `api.video`: jedno pole `email` **bez nazwy i bez akcji**, czyli skorupa, ktora dopiero
  JavaScript podlacza. Agent nie ma czego wyslac.
- `browserless.io`: jedyny formularz to trzy checkboxy zgod.
- `lemonsqueezy.com`: 800 bajtow i zero formularzy przy powtorzeniu.
- `rollbar.com`: jedno nienazwane pole tekstowe bez akcji, czyli wyszukiwarka.
- `payloadcms.com`: pole e-mail na stronie „get started".

**Granica metody, wazniejsza niz sam wynik.** Ten wykrywacz **nie jest dosc dokladny**, zeby
rozstrzygac ten check samodzielnie, a dalsze strojenie zamienilo by go w kopie testowanego kodu,
czyli w dokladnie to, czym byc nie moze. Luzny czyta wyszukiwarki jako rejestracje (kontrolka
41/42). Ostry gubi prawdziwe formularze (kontrolka 39/42: `docuseal.com` i `deepl.com`, oba
slusznie zaliczone). **Niezgodnosc traktuj jako trop do recznego sprawdzenia, nigdy jako werdykt.**

Obserwacja bez werdyktu, do ewentualnego podjecia: u szesciu oskarzonych jedynym wejsciem, jakie
widac w HTML od serwera, jest przycisk dostawcy tozsamosci (`cloudinary.com`, `transloadit.com`,
`trychroma.com`, `modal.com`, `cal.com`, `redis.io`). Zdanie o formularzu wymagajacym JavaScriptu
opisuje im formularz, ktorego mogli nigdy nie napisac. **Nie da sie tego jednak rozstrzygnac z
samego HTML**, bo strona moze miec i przyciski OAuth, i formularz doklejany JavaScriptem, wiec
zostawiam to jako obserwacje, a nie jako blad do naprawienia.

Skrypt: `npx tsx scripts/audit-signup.mts credited|accused`.

## 22. PRZEBIEG ADWERSARYJNY: `oauth_dcr`, 94 OSKARZENIA (9.21, wdrozone)

**Wynik: punktacja nie zmienia sie u nikogo, a trzy zdania byly falszywe.** To jest ten rodzaj
znaleziska, ktory ma znaczenie dopiero wtedy, gdy vendor otworzy swoj wiersz.

**Kontrolka znowu zrobila robote i znowu odrzucila MOJA sonde, nie wiersze.** Pierwsza wersja
listowala tylko subdomeny „poza szostka, ktora zgaduje skaner", bo skaner szostke juz pokrywa.
43 z 68 zaliczen nie dalo sie odtworzyc, dokladnie dlatego, ze ich metadane leza na hostach,
ktore pominalem. **Sonda audytujaca pomiar musi najpierw umiec ten pomiar wykonac, a dopiero
potem siegac dalej.** Po poprawce 68 z 68.

Strona oskarzajaca, 94 domeny: **16 publikuje metadane na hoscie, ktorego nie pytamy, i zaden z
tych 16 nie ma `registration_endpoint`**, wiec punkt nie rusza sie u nikogo. **13 z 16 ma juz
poprawne zdanie**, bo metadane niosl inny host, ktory znalezlismy. Falszywe „No OAuth metadata on
any of the N hosts probed" szlo do trzech: `auth2.liveblocks.io`, `sso.meilisearch.com` i
`account.here.com`. Trzy prefiksy, w tym `account` w liczbie pojedynczej obok `accounts`, ktore
juz mielismy.

**Pulapka we wlasnym audycie, warta zapamietania:** moja lista „oskarzonych" to byly wiersze z
zerem punktow, a ten check ma **dwa rozne werdykty za zero** („brak metadanych" i „metadane sa,
brak registration_endpoint"). Przez chwile mialem 16 falszywych oskarzen zamiast trzech. Zanim
zglosisz falszywe zdanie, przeczytaj zdanie, ktore faktycznie publikujemy.

Poprawka to **trzecia fala** pieciu prefiksow (`auth2`, `sso`, `account`, `app`, `signin`), pytana
tylko wtedy, gdy dwie pierwsze nic nie znalazly. Czterem wierszom na piec nie kosztuje to ani
jednego zadania, a dzisiejszy reseed pokazal dobitnie, ze nadmiarowy ruch zamienia pomiary w
odmowy. Sprawdzone dwustronnie: `uploadcare.com` nadal slyszy „brak metadanych" (uczciwie z 13
hostow), `datadoghq.com` zachowuje punkt i trzecia fala u niego nie startuje.

Skrypt: `npx tsx scripts/audit-oauth.mts credited|accused`.

## RESEED 9.19 ZNALAZL TRZY USTERKI W MOJEJ WLASNEJ ZMIANIE (9.20, wdrozone)

**Korpus na 9.19: 170 wierszy. Zamiatanie 429 zadzialalo pierwszy raz na produkcji dokladnie jak
zaprojektowane:** cztery domeny zlapane, `split.io` i `locationiq.com` odzyskane, `contentful.com`
i `savvycal.com` zostaja jako werdykt o nich. Ale audyt zglosil **sprzecznosc wewnatrz wiersza
slatejs.org** i to jedyny powod, dla ktorego znalazlem trzy usterki wprowadzone dzien wczesniej.

1. **Miekki 404 udajacy piec plikow.** `docs.slatejs.org` odpowiada na kazda nieznana sciezke
   naglowkiem „# Page Not Found" i lista sugerowanych stron, a **sugestie roznia sie przy kazdej
   sciezce**, wiec ani dlugosc, ani cialo po usunieciu sciezek nie zgadza sie z kontrolka. Piec
   takich poszlo jako piec plikow wejsciowych. Szablon oglasza sie w pierwszej linii i po niej go
   teraz rozpoznajemy; trzy myslniki sa z tego wylaczone, bo plik skilla i wlasny 404 platformy
   docsowej otwieraja sie tak samo.
2. **Host dokumentacji pytany dopiero, gdy witryna nic nie ma.** Pytanie obu za kazdym razem
   podwajalo ruch do brzegu, ktory wlasnie decyduje, czy nas odrzucic, i kosztowalo `bitmovin.com`
   dwa punkty: publikuja prawdziwy `skill.md`, odmawiaja naszemu centrum danych pod obciazeniem, a
   osiemnascie sond wywrocilo to, czego dziewiec nie wywracalo.
3. **Nie pytamy dalej, gdy witryna nas odmowila.** Odmowa znaczy, ze nie wiemy, co jest na apexie.
   Wtedy odmowa jest znaleziskiem i raportujemy ja z dziewieciu faktycznie zapytanych sciezek.

**Lekcja, ktora warto powtarzac:** wszystkie trzy przeszly przez przeglad subagenta, testy regul i
recznie sprawdzone przypadki. Znalazl je dopiero **reseed calego korpusu plus audyt sprzecznosci
wewnatrz wiersza**. Zmiane w punktacji sprawdza sie na 170 wierszach, nie na czterech.

**Cztery werdykty pogorszone po reseedzie 9.19, wszystkie wyjasnione, zaden nie wymaga poprawki:**
- `bitmovin.com` `agent_entry_point` 2→0: **nasza usterka**, naprawiona w 9.20 (punkt 2 wyzej).
- `oramasearch.com` `llms_txt` 1→0: **prawdziwe**. `github.com/oramasearch/orama-cloud-cli` zwraca
  404 na HEAD i GET, a link stoi w ich `llms.txt` raz i w `llms-full.txt` dwa razy. To nie regres
  vendora ani nasz blad, tylko skutek rownomiernego probkowania z 9.17, ktore siega teraz ogona
  pliku i znalazlo zgnilizne lezaca tam od dawna.
- `froala.com` `answers_plain_request` 1→0 i `weglot.com` `signup_reachable` 1→0: oba wyszly jako
  „Unmeasurable" i oba slusznie. froala odmawia tak samo przegladarce, a weglot odpowiedzial
  (403, 403, 200), czyli jedna z trzech prob weszla, co reguła drzwi wprost obsluguje.

Dyskryminator szablonu jest teraz osobna funkcja `answersWithTheSameTemplate` z testem
dwustronnym, bo to byla trzecia usterka w tym samym miejscu.

**Korpus jest na 9.19, produkcja na 9.20, wiec czeka kolejny przesiew** (karencja liczona z
mediany, patrz `scripts/reseed.sh`).

## PUNKT WEJSCIA: SZUKALISMY GO TYLKO W KORZENIU WITRYNY (9.19, wdrozone)

**Dwudziesty pierwszy przebieg adwersaryjny, na checku z najwieksza liczba publicznych oskarzen w
calym produkcie:** 139 wierszy mowilo „zadna z 9 znanych sciezek nie zwraca pliku", przy 19
zaliczeniach. Regula failujaca siedmiu vendorow na osmiu jest albo centralnym znaleziskiem
produktu, albo jego najwiekszym bledem systematycznym, i nic tego nie sprawdzalo.

**17 ze 139 oskarzonych publikuje `skill.md` i `.well-known/mcp.json` na hoscie dokumentacji**,
ktorego nigdy nie pytalismy. To ta sama pomylka, ktora `llms_txt` naprawil juz dla deepl.com i
mixpanel.com, tylko w innym checku i o rok pozniej.

**Kontrolka poszla pierwsza i wykryla dwie usterki w SONDZIE, nie w wierszach.** To jest wzorzec do
powtarzania: prog 120 znakow odrzucal 106-bajtowy `/.well-known/mcp.json` sentry.io, a pytanie
naglowkiem markdownowym dostawalo od sentry.io te sama notke dla kazdej sciezki, bo oni negocjuja
tresc (`accept: application/json` daje prawdziwy deskryptor). Po poprawkach kontrolka odtwarza
19 z 19. Sonda audytujaca pomiar musi wykonac ten sam request co pomiar.

Zabezpieczenia, kazde sprawdzone na prawdziwych plikach **przed** wdrozeniem:
- **Kontrolka catch-all per origin, nigdy wspolna.** Platforma docsowa odpowiada markdownowym 404
  na kazda nieznana sciezke, wiec kontrolka witryny nie mowi nic o hoscie dokumentacji.
- **Blizniak strony dokumentacji to nie plik dla agenta.** `docs.datadoghq.com/agent.md` to
  instrukcja instalacji ICH produktu Datadog Agent i bral za to punkt. Frontmatter rozdziela to
  czysto: blizniak deklaruje `title:` i `breadcrumbs:`, plik skilla deklaruje `name:` i opis
  zaczynajacy sie od „Use when". Testy reguł sprawdzaja oba kierunki plus przypadek bez
  frontmattera (stripe.com), ktory nie moze wpasc w zadna z tych szuflad.
- **Wykrywanie skorupy liczone per origin**, bo „to samo cialo dwa razy" znaczy skorupe tylko
  wtedy, gdy podal je ten sam serwer.
- **Zdanie podaje liczbe faktycznie zadanych sciezek** (18 przy dwoch hostach). „Z 9" po zapytaniu
  osiemnastu to liczba nie do odtworzenia przez vendora. Adresy sa teraz bezwzgledne.

Skrypt: `npx tsx scripts/audit-entry.mts [ile wierszy]`. **Ta linijka mowila `credited|accused`, czyli
tryby, ktorych skrypt nigdy nie mial** - i to wyszlo dopiero 2026-08-19, gdy ja wykonalem. Szczegoly
w sekcji o jedenastu audytach ponizej. **Zrobione po przemiecie na 9.42:** 27 wierszy, 455 sciezek,
**zero plikow**, wiec 21 niezgodnosci zeszlo do zera.

## 429 Z MARKEREM WYZWANIA TO SCIANA, NIE NASZ NAWAL (9.18, wdrozone)

Regula „a 429 is our own burst" powstala, zeby rozstrzygnac **prawdziwa sprzecznosc**:
contentful.com czytalo „no agent reaches the site at all" w `answers_plain_request` i „a limit we
triggered" w `signup_reachable`, na tym samym skanie, o tym samym brzegu. Wygrala wymowka.

**Wymowka byla falszywa polowa.** contentful.com i pandadoc.com odpowiadaja 429 z naglowkiem
`x-vercel-mitigated: challenge` **takze przegladarce i takze z laptopa**, przy zerowym ruchu z
naszej strony. Tryb ataku Vercela uzywa 429 jako statusu sciany. Kod **juz wykrywal** to wyzwanie
(`isBotChallenge`) i sam sobie te wiedze odrzucal, wypuszczajac dwoch vendorow z jedynego
znaleziska, po ktore ten check istnieje.

**Kontrolka zostaje nietknieta i to jest warunek, ze to nie jest zaostrzanie na sile:**
postmarkapp.com odpowiedzial (200, 429, 200) bez naglowka wyzwania i 200 temu samemu laptopowi,
wiec jego 429 naprawde jest nasz i nadal go nie liczymy. Reguly testuja obie strony, przy
rejestracji tez, zeby te dwa checki nie rozjechaly sie ponownie.

Zasieg zmierzony **przed** wdrozeniem: piec domen ma wyzwanie na brzegu, werdykt zmieniaja dwie
(contentful.com, pandadoc.com). name.com ma (200, 429, 429), wiec i tak nie wchodzil w te galaz,
a bitmovin.com i namecheap.com dostaja wyzwanie na 403 i byly liczone jako sciana od poczatku.

Przy okazji: karencja reseedu twierdzila w komentarzu, ze mierzy czas od ostatniego **przesiewu**,
a liczyla `max(scannedAt)`, wiec jeden skan weryfikacyjny blokowal reseed na szesc godzin. Teraz
liczy mediane. **Pomylka warta zapamietania:** najpierw uznalem, ze to wlasnie mnie blokuje, a
sprawdzenie znacznikow pokazalo, ze wszystkie 169 wierszy pochodzi z osmiu minut - to byl ogon
mojego wlasnego reseedu, bo drugi przebieg na cieplym cache jest osiem razy szybszy niz pierwszy.
Straznik dzialal poprawnie, usterka byla prawdziwa, ale nie byla przyczyna.

**NAZWA PRODUKTU: „Let Agents In" / `letagentsin`.** Zmieniona 2026-08-16, wczesniej „StackPick".
Uzywaj nowej nazwy w rozmowie, w dokumentach i w tekstach na stronie. **Stara nazwa zostaje w
infrastrukturze i to nie jest usterka do naprawienia przy okazji:** katalog repo to nadal
`~/projects/stackpick`, aplikacja Heroku `stackpick`, baza Mongo `stackpick`, ciasteczko konsoli
`stackpick_console`. Przemianowanie tego to osobna, ryzykowna operacja, **nie rob jej bez wyraznej
prosby Krystiana.**

Punkt wejścia po compact. Czytaj przed pracą, razem z `ARCHITECTURE.md`.
**Dwie sekcje na dole tego bloku, "Co zostało z audytów" i "Następne kroki merytoryczne", są
kontraktem dla watchdoga. Aktualizuj je przy każdej zamkniętej pozycji, inaczej watchdog czyta
listę sprzed trzydziestu rund.** Dziennik rund jest niżej i jest historią, nie listą zadań.
**Ten nagłówek też się starzeje: 2026-08-11 rano mówił "StackPick, formuła 7.4, 155 domen",
czyli był o dwa dni i pięć wersji formuły do tyłu. Przepisuj go, nie tylko dziennik.**

## LLMS.TXT: SPRAWDZALISMY CO NAJWYZEJ POLOWE LINKOW, A NA WLASNYM PLIKU ZADNEGO (9.17, korpus przesiany)

Check `llms_txt` odbiera punkt za mape, ktorej linki jeszcze odpowiadaja. Wyciagal **tylko adresy
bezwzgledne**, wiec wzgledne pomijal w ciszy. Skala: **54 ze 136** zaliczajacych vendorow je
publikuje, knock.app pisze **1347 wzglednych na 4 bezwzgledne**, wiec jego "probka dwunastu"
losowala sie z czterech linkow. **Nasz wlasny plik jest w calosci wzgledny**, czyli bralismy punkt
bez sprawdzenia ani jednego linku, w checku, ktorym oceniamy innych. Teraz nasz wiersz probkuje 11.

**Przeglad subagenta zatrzymal ten commit przed wdrozeniem** i to jest tu najwazniejsze. Nie czytal
kodu, tylko **odtworzyl nowy sampler 1:1 i puscil go na prawdziwych plikach z opublikowanego
korpusu**. Moja "scisle lepsza" poprawka opublikowalaby z nazwy falszywe oskarzenia o martwe linki
i zabrala punkt szesciu vendorom, ktorych pliki sa w porzadku. Trzy bledy, kazdy potwierdzony
osobno przed przyjeciem:

1. **Baza to adres, ktory ODPOWIEDZIAL, nie ten, o ktory pytalismy.** `docs.twilio.com/llms.txt`
   serwuje sie z `www.twilio.com/docs/`, wiec szesc zywych stron Twilio wychodzilo jako 404.
   Osiem ze 136 plikow przekierowuje gdzie indziej.
2. **W `llms-full.txt` nie wolno rozwiazywac linkow wzglednych w ogole.** To konkatenacja stron
   dokumentacji, wiec `../queries/select` bylo wzgledne wobec STRONY, nie wobec pliku. Blad z
   definicji, ktorego wybor bazy nie naprawia. Zmierzone: `payloadcms.com/authentication/overview`
   → 404, prawdziwe `payloadcms.com/docs/authentication/overview` → 200.
3. **Obrazek i plik zrodlowy to nie strona.** maptiler.com tracil punkt przez dwie miniatury
   `.webp`. Odfiltrowane razem z `.mdx`, `.svg` i self-linkiem z golej kotwicy.

Przy okazji: probkowanie bralo pierwsze 12 linkow zawsze, gdy bylo ich 13-23 (czyli dokladnie to,
czemu mialo zapobiegac), i nigdy nie siegalo ostatnich 8% duzego pliku. Teraz rownomiernie z
obiema koncowkami. Naprawione tez trzy nieprawdziwe zdania publiczne: liczebnik plikow bral sie z
obecnosci `llms-full.txt` zamiast z liczby plikow, ktore faktycznie wniosly linki; vendor
publikujacy wylacznie `llms-full.txt` byl informowany, ze ma tez `llms.txt`; strona findings
obiecywala "five links from each file" przy dwunastu ze wspolnej puli.

**Efekt na korpusie: 170 wierszy na 9.17, zero sprzecznosci, zaden vendor nie stracil punktu za
`llms_txt`.** knock.app ujawnia jeden **prawdziwy** martwy link (`/api-reference/schedules/.md`,
404, faktycznie obecny w ich pliku), niewidoczny przez caly czas, bo wzgledny.

Pulapka trafila do KB: `clad-kb show skaner-link-wzgledny-rozwiazuj-wzgledem-adresu-ktory-odpowie`.

## 429 NIE JEST WLASNOSCIA VENDORA, TYLKO NASZEGO CIENIA (naprawione, wdrozone v401)

**Werdykt z 429 obiecuje vendorowi wprost: „Nothing for you to do if this was a 429. We will
rescan later and this becomes measurable."** Nic tego nie robilo. Reseed ma teraz zamiatanie:
zbiera domeny, ktore dostaly od nas 429, czeka 180 sekund, az ruch opadnie, i pyta jeszcze raz.
Sprawdzone koncem do konca.

**Ile to kosztowalo w danych, na jednym przykladzie:** wiersz `split.io` z reseedu 9.17 mowil
**6/12** z dwoma „Unmeasurable". Ten sam skan w izolacji, po opadnieciu ruchu: **10/15**, wszystkie
trzy checki zaliczone. Nasz nawal zabral im trzy punkty i zawezil mianownik, a my opublikowalismy
to jako zdanie o nich.

**Rozroznienie dziala w obie strony i to jest tu najwazniejsze.** `contentful.com` i `savvycal.com`
odpowiadaja 429 takze **pojedynczemu, izolowanemu skanowi**, przy zerowym ruchu z naszej strony,
wiec ich wiersze zostaja bez zmian. Zamiatanie nie jest wybielaniem, tylko oddzieleniem naszego
halasu od ich brzegu.

Pulapka pomiarowa do zapamietania: probowalem zamiatac pieciu domenami co 12 sekund i uznalem, ze
sam sobie dokladam presji, bo savvycal.com nabral dwoch nowych 429. Sprawdzenie w izolacji tego
**nie potwierdzilo** - savvycal odpowiada 429 tak samo w pelnej ciszy. Odstep miedzy zapytaniami
zamiatania jest wiec grzecznoscia, a nie zmierzonym progiem, i tak jest opisany w skrypcie.

## 429: STARE ZNALEZISKO, ZANIM POWSTALO ZAMIATANIE

Z czterech werdyktow pogorszonych po reseedzie **dwa to nasze wlasne 429** (split.io i
locationiq.com, `machine_readable_api`). W skali korpusu: **10 z 294 werdyktow "Unmeasurable"
bierze sie z 429**, z czego piec to sam contentful.com, czyli caly wiersz vendora opisuje glownie
nasze limity, a nie jego produkt.

Rozstrzygajacy pomiar: `docs.split.io`, `docs.locationiq.com` i `postmarkapp.com/developer`
odpowiadaja **200 z laptopa i 429 z dyna**, wszystkie za Cloudflare. Cache tego nie zatruwa
(rejestr trzyma tylko `ok` i 404), wiec 429 reprodukuje sie takze przy **pojedynczym** skanie, co
znaczy, ze nawal jest **wewnatrz jednego skanu** (do 6 rownoleglych zadan na host), a nie miedzy
domenami reseedu. To jest do naprawienia po naszej stronie i jest nastepna pozycja.

## NASZ WLASNY OPENAPI POMIJAL DWIE RZECZY, I OBIE SA TYM, CO PUNKTUJEMY U INNYCH

Ten sam obiektyw, przylozony do `/openapi.json`. **Klamiacy albo niepelny spec to doslownie defekt,
za ktory odejmujemy punkty**, wiec dokument opisujacy nasze API zasluguje na to samo traktowanie.

**Brakowalo parametru `format`.** To pole zamienia `/api/scan` w dwie powierzchnie maszynowe warte
posiadania: **SARIF 2.1.0** dla skanera kodu i **markdown napisany po to, zeby agent go wykonal**.
Agent czytajacy nasz wlasny spec **nie mogl odkryc zadnej z nich**, choc obie dzialaja od dawna.

**Brakowalo `/api/watch`**, czyli publicznego zapisu na monitoring: bez konta, e-mail plus domena,
potwierdzenie linkiem. Pominiecie go zostawialo **powracajaca polowe produktu poza maszynowym
opisem produktu**.

Doszla tez odpowiedz **503**, ktora `agent-signup.md` opisuje od dawna („a slow domain can hit
a gateway timeout"), a spec o niej milczal.

**Sprawdzone, a nie tylko dopisane:** wszystkie trzy wartosci `format` odpowiadaja poprawnie
**obiema drogami**, ktore spec deklaruje - w ciele zadania i w query stringu: `json` daje
`application/json`, `sarif` daje `application/sarif+json` (12 217 B), `agent` daje `text/markdown`
(2 561 B). Spec opisuje teraz szesc sciezek zamiast pieciu.

## INSTRUKCJE, KTORE DAJEMY AGENTOM, SPRAWDZONE JAK AGENT I WPIETE W AUDYT

Przeczytalem `agent-signup.md` jak agent, ktory ma tylko to, i sprawdzilem **kazde twierdzenie
osobno**. Wszystkie sie bronia: `POST /api/scan` dziala, `/r/{id}` jest trwalym linkiem,
`/api/scan/stream` **naprawde emituje zdarzenia postepu** (`text/event-stream`, etykiety
„Resolving…", „Reading /docs", „Checking robots.txt against 13 AI crawlers"), adresy IP i zakresy
prywatne sa odrzucane, a `/corpus.json` niesie caly zbior.

**Jedna rzecz byla krucha i to najbardziej agento-zwrocona ze wszystkich.** Limity sa w tych
plikach **wpisane slownie** („Five scans per hour per registrable domain, thirty per hour per
source address") i **nic nie wiazalo ich ze stalymi** `PER_DOMAIN_PER_HOUR` i `PER_CALLER_PER_HOUR`.
Zmiana stalej zostawilaby oba pliki mowiace agentom nieprawde, **w produkcie, ktorego cala teza
brzmi: nie oklamuj agentow.**

Wpiete w audyt (5 pilnowanych twierdzen zamiast 3), z mapowaniem slowa na liczbe. **Udowodnione:**
po ustawieniu stalej na 7 audyt zglasza „says five per domain, code says 7" dla **obu** plikow, po
przywroceniu wraca do zera.

## PUBLIKUJEMY WLASNY WYNIK, LACZNIE Z CHECKIEM, KTOREGO OBLEWAMY

Skaner ocenia 170 firm i **nigdzie nie pokazywal wlasnego wiersza**, a nasza domena nie jest nawet
w korpusie, bo nie jest kuratorowanym vendorem. To luka wiarygodnosciowa, nie techniczna.

`/methodology` mowi teraz, **liczba wyliczana z ostatniego skanu, nie wpisana**: „On 2026-08-15 it
measured **11 of 12** points here", z linkiem do naszej wlasnej karty, publicznej jak kazda inna.

**Oblewamy `oauth_dcr` i nie zamierzamy tego naprawiac**, co strona mowi wprost: nasze narzedzia
nie biora zadnych poswiadczen, wiec **nie ma klienta do zarejestrowania**, a przepisanie reguly az
do naszego zaliczenia byloby ocenianiem wlasnej pracy. To bylo kuszace i dlatego warto zapisac, ze
tego nie zrobilem: audytor, ktory dostraja punktacje pod siebie, przestaje byc audytorem.

**Wpadka warta zapisania, bo trzeci raz w tym weekendzie ta sama:** zobaczylem na stronie
`oauth_dcr ,` ze spacja przed przecinkiem i **dwoma commitami scigalem blad, ktorego nie bylo**.
Surowy HTML mial `<code>oauth_dcr</code>,` bez spacji od samego poczatku; spacje dokladal **moj
skrypt ekstrakcji**, ktory zamienia kazdy tag na spacje. Komentarz, ktory po drodze napisalem
(„line break renders as a space"), **klamal o przyczynie** i zostal poprawiony. Sprawdzaj narzedzie,
zanim uwierzysz w to, co pokazuje - takze wtedy, gdy pokazuje literowke.

## DWA OSTATNIE ZNALEZISKA: straznik zgadzajacy sie przez przypadek i strona placaca za dwa pola

**Audyt liczyl pilnowana liczbe inaczej niz strona, ktora ja wypisuje.** Strona liczy dopasowania
przez rejestr **wsrod wierszy zmierzonych**, audyt liczyl je wsrod wszystkich. Dzis oba daja 132,
ale gdy faza npm wpadnie w limit czasu, `npmSource` jest juz ustawione przez discovery, a scoring
degraduje `typed_package` do „niemierzalne" i **audyt zglosilby nieistniejacy rozjazd**. Zrownane.
**Straznik, ktory zgadza sie przez przypadek, to straznik, ktory zapali sie w spokojny wtorek.**

**Strona metodologii budowala caly korpus przy kazdym renderze po dwa pola.** `buildCorpus`
przepuszcza `erratumFor`, `otherDomainsNamed` i `refusesAgentsAtSignup` przez 170 wierszy po
15 checkow, a strona chce liczby i udzialu. Czyta teraz opublikowane raporty wprost. Baza nie byla
czytana dwa razy (5-minutowy memo w `publishedCorpus`), wiec chodzi o CPU, ale to **ta sama klasa
kosztu, ktora przewrocila nas 12.08**, gdy crawler otworzyl siedemdziesiat stron naraz.
Zweryfikowane: strona 200, audyt nadal 0 rozjazdow, czyli wartosc przetrwala refaktor.

**Stan bazy po dniu pracy:** klaster **56,1 procent** (2870 z 5120 MB), StackPick **59,4 MB**
(cache rejestru 15,2 MB przy 2117 wpisach, raporty 44,2 MB przy 2068). Cache urosnie po zmianie
TTL na 48 h, ale zostaje o rzad wielkosci ponizej progu, a alarm kwotowy to pilnuje.

## POZOSTALE ZNALEZISKA DRUGIEGO PRZEGLADU, I JEDNO SWIADOMIE ODRZUCONE

**Cache rejestru: 7 dni bylo za dlugo i to w gorsza strone niz 6 godzin.** Kazdy nieudany wiersz
niesie rade, a rada przy tym checku brzmi „name your package once in your docs". Vendor, ktory ja
wykona, opublikuje i przeskanuje sie ponownie, **czytalby ten sam werdykt przez tydzien**, bo cache
jest wspolny dla wszystkich dyn. Co gorsza cotygodniowy rescan monitoringu czyta ten sam cache,
wiec **jego naprawa nie wygenerowalaby nawet maila**. Ustawione na **48 godzin**: obejmuje cicha
noc, ktora byla powodem calej zmiany, i ogranicza do dwoch dni to, na co czeka ktos, kto cos u
siebie poprawil.

**Straznik crona pytal o zly przebieg i nie pytal o wiek.** `--limit 1` lapie tez przebieg w toku,
ktory raportuje pusta konkluzje i **oblewalby straznika** (oba workflowy dziela 84 minuty, a cron
GitHuba dryfuje). Doszlo `--status completed`. Osobno: sprawdzanie samej konkluzji **nie widzi
crona, ktory przestal sie uruchamiac** i swieci na zielono na sukcesie sprzed trzech tygodni,
a GitHub wylacza harmonogramy w repo nietykanym od 60 dni. Doszedl prog wieku 48 h, przetestowany
osobno (47 h przechodzi, 49 h alarmuje). Zweryfikowane na produkcji: **„ostatni zakonczony przebieg
monitoringu: success", „sprzed 2 h"**.

**Pusty korpus mowi teraz, ze jest pusty**, zamiast umierac w `jq` na `max` z pustej listy, czyli
w najgorszym mozliwym stanie tracic komunikat.

**Prawdziwy blad w moim wlasnym narzedziu audytowym.** `audit-llms` budowal korzen dokumentacji,
obcinajac wszystko konczace sie kropka i rozszerzeniem, a to **pasuje do nazwy hosta**:
`https://docs.example.com` stawalo sie `https:/`, wiec sonda pytala `https://llms.txt`. To
**falszywe potwierdzenie oskarzenia w narzedziu, ktorego jedynym zadaniem jest obalanie**, i
kontrolka nie mogla tego zlapac, bo dla hostow `docs.` ratowala je lista zapasowa. Poprawione przez
`URL`, sprawdzone na szesciu ksztaltach adresu, kontrolka nadal 8 na 8.

**Jedno znalezisko odrzucam swiadomie:** propozycje, zeby zamrozony korpus zapalal alarm po X dniach.
Reseedy sa reczne, wiec dwutygodniowa przerwa jest **normalna**, a alarm o niej bylby dokladnie ta
klasa falszywki, ktora dzis usuwalem z `health.yml`. Zapisane, zeby nikt nie dodal tego „bo review
kazal".

## DRUGI PRZEGLAD: obie moje wczorajsze poprawki byly zepsute, kazda inaczej

Druga porcja zmian (400 linii) tez poszla bez przegladu, wiec subagent przejrzal ja tak samo.
**Dwa znaleziska wysokiej wagi i oba dotyczyly kodu, ktory napisalem tego samego dnia.**

**1. Straznik TTL byl martwym kodem dokladnie tam, gdzie mial dzialac.** `retuneRegistryExpiry`
wisialo w `.then()` **za** `Promise.all`, w ktorym siedzi kolidujacy `createIndex`. Gdy stala
rozjedzie sie z baza, ten `createIndex` rzuca `IndexOptionsConflict`, `Promise.all` odrzuca,
**wszystkie `.then` sa pomijane**, a `catch` to polyka, bo tak zaprojektowano po awarii z 13.08.
Poprawka dzialala wczoraj **wylacznie dlatego, ze przebudowalem indeks recznie przed wdrozeniem**,
czyli w stanie, w ktorym nie miala nic do roboty.

Przeniesione **przed** wsad. **Udowodnione, a nie zadeklarowane:** ustawilem baze z powrotem na
6 godzin, jeden odczyt przez sklep przywrocil 604800 s, **2117 wpisow przetrwalo**.

**2. Moja wlasna poprawka `worthTelling` wyciszyla to, co produkt obiecuje wykrywac.** Wymog
„zmiana miedzy stanami oba zmierzonymi" jest sluszny dla naszego cache npm i **falszywy dla
blokady po stronie vendora**: klient wlaczajacy bot protection przestawia `docs_without_js`,
`user_agents_allowed` i `no_crawl_delay` z `pass` na `unmeasured` i **nic wiecej sie nie rusza**.
Mail by nie poszedl, choc to doslownie zdanie ze strony glownej: „an edge rule that starts refusing
agents changes nothing a person sees in a browser".

Dolozony waski wyjatek: przejscie w `unmeasured` **liczy sie, gdy skan widzi, ze to ich brzeg nas
odrzucil** (`blocksPlainRequests` albo nieczytelny `robots.txt`), a nie gdy to nasz cache. Przypiete
siedmioma testami, w tym kontrolka „blokada brzegu bez zadnej zmiany to nadal brak maila".

**Wniosek procesowy, drugi raz tego samego dnia: kod, ktory przechodzi typecheck, testy i wlasne
oczy, potrafi byc zepsuty w sposob, ktory widac dopiero z zewnatrz.** Oba znaleziska byly
w poprawkach napisanych po to, zeby cos naprawic.

## PIERWSZY W HISTORII TEGO PRODUKTU MAIL O PRAWDZIWEJ ZMIANIE, DOSTARCZONY

Po poprawce `worthTelling` przeszedlem korpus w poszukiwaniu pary z ruchem miedzy stanami **oba
zmierzonymi** i wyslalem z niej maila na wlasna skrzynke testowa. **Cala sciezka powracajacej
polowy produktu jest wiec zademonstrowana od konca do konca**, czego wczesniej nie bylo nigdy.

**`telnyx.com`, dwa werdykty w gore, oba prawdziwe po ich stronie:**

> telnyx.com: llms.txt published now pass
> llms.txt published: **fail to pass** - 12 probkowanych linkow, wszystkie odpowiadaja
> MCP surface: **fail to pass** - `https://api.telnyx.com/v2/mcp`, odpowiada JSON-em

Status w Resend: **delivered**.

**Poprawka sprawdzila sie przy okazji na prawdziwych danych.** Pierwsza para, po ktora siegnalem
(`postmarkapp.com`), miala zmiany `unmeasured→pass` i `pass→unmeasured`, czyli **wylacznie nasz
pomiar**, i `worthTelling` zwrocilo `false`. Maila nie ma i nie powinno go byc. Dokladnie o to
chodzilo.

**Uwaga o `mcp_present` u telnyx:** `fail → pass` pod adresem `api.telnyx.com/v2/mcp`. To ten sam
adres, ktory 14.08 raportowal 404 na GET i `serverInfo` na POST. Wiersz przeszedl w gore po
**naszej** poprawce z 9.13 (dolozony wersjonowany adres na hoscie `api`), a nie po zmianie u nich.
Formalnie jest to zmiana miedzy stanami zmierzonymi, wiec regula ja przepuszcza, i to jest
**poprawne w tym przebiegu** (para pochodzi z dwoch reseedow rozdzielonych zmiana formuly, czego
`comparableScorecards` w produkcji nie dopusci). W produkcji taka para nigdy nie trafi do maila.

## MAIL, ZA KTORY KLIENT PLACI, POWIEDZIALBY MU O NASZYM CACHE

Monitoring nie wyslal jeszcze **nigdy** maila o zmianie: kazdy przebieg byl cichy, bo podbicia
formuly unieważniaja punkt odniesienia. Czyli **rzecz, za ktora klient ma placic, nie zostala
nigdy zobaczona**. Zrenderowalem ja z prawdziwych danych: para przebiegow reseedu na 9.16 daje
autentyczne zmiany.

Mail czyta sie dobrze i niesie zastrzezenie o sile dowodu, ktore doszlo dzis („matched from the
registry by who publishes it rather than by a link on your site"). **Ale jego tresc byla o nas:**

> datadoghq.com: typed sdk on the registry now pass
> Typed SDK on the registry: **unmeasured to pass**

Wszystkie trzy wyrenderowane maile mialy ten sam ksztalt, bo **21 z 22 ruchow miedzy przebiegami
to `unmeasured → pass`**, w tym szesnascie z zimnego cache npm. Obserwator aktywny w godzinie
reseedu dostalby wiec „wasze SDK teraz przechodzi" o zmianie, ktora zaszla **w calosci wewnatrz
naszego skanera**.

**Kod juz to wiedzial i nie dociagnal wniosku.** Komentarz przy `changesBetween` mowi wprost:
„a check going unmeasured usually says something about our reach, not their site", i dlatego takie
zmiany nie sa nazywane pogorszeniem. Brakowalo jednego kroku: **nie powinny same byc powodem
maila**. `worthTelling` wymaga teraz co najmniej jednej zmiany miedzy stanami, ktore **oba
zmierzylismy**; przejscia z „niemierzalne" nadal sa **wypisywane w mailu**, gdy zasluzyla na niego
inna zmiana, czyli dokladnie tak, jak prosi tamten komentarz.

Przypiete szescioma testami z **dwustronna kontrolka** (`pass → fail` i `fail → pass` nadal
pisza), a po cofnieciu poprawki zestaw oblewa.

## PRZEGLAD WSZYSTKICH HARMONOGRAMOW: drugi straznik tez klamal, tylko w druga strone

Po awarii monitoringu sprawdzilem **wszystkie trzy workflowy**, bo pytanie „co jeszcze pada po
cichu" jest tanie i rzadko bezowocne.

**`health.yml` padl o 23:41, poltorej godziny wczesniej.** Powod: korpus mial wtedy **112 wierszy**,
bo trwal **moj wlasny reseed** w polowie przejscia na 9.16. Straznik nie mial jak odroznic
przemiatania w toku od przemiatania przerwanego.

**To jest fałszywy alarm z prawdziwego powodu i gorszy niz brak alarmu**, bo chodzi co godzine
i uczy ignorowac kolor. Dokladnie ten sam mechanizm, przez ktory nikt nie zauwazyl, ze monitoring
padal dwa dni.

**Rozroznienie, ktore nie wymaga zadnego dodatkowego stanu:** reseed zapisuje wiersz co kilka
sekund, wiec **maly korpus ze swiezym najnowszym wierszem to przejscie, a maly ze starym to
awaria**. Prog: 30 minut.

| wierszy | najnowszy sprzed | werdykt |
|---|---|---|
| 112 | 300 s | przepuszcza, reseed w toku |
| 112 | 7200 s | **alarm** |
| 149 | 1799 s / 1801 s | przepuszcza / **alarm** |
| 170 | dowolnie | przepuszcza |

**Pulapka po drodze:** `fromdate` w jq **odrzuca ulamki sekundy**, a nasze znaczniki maja
milisekundy. Wyszlo to na zywym pliku, bo sprawdzilem wyrazenie na prawdziwych danych zamiast mu
uwierzyc. Workflow zielony, raportuje teraz obie liczby, a obie galezie sa przetestowane osobno.

## MONITORING NIE DZIALAL PRZEZ DWA DNI I NIC O TYM NIE POWIEDZIALO

Poszedlem sprawdzic, czy obserwujacy cokolwiek dostali po trzech podbiciach formuly w dwa dni.
Odpowiedz byla gorsza od pytania: **trzy potwierdzone obserwacje nie byly sprawdzone NIGDY**,
a cron monitoringu **padal 13 i 14 sierpnia**, ostatni sukces 12 sierpnia.

**Przyczyna: HTTP 503, czyli nasz wlasny guard dzialajacy poprawnie.** Endpoint odmawia startu,
gdy baza nie przyjmuje zapisow, a o 5:45 UTC obu tych dni klaster byl jeszcze zapchany (prune
zrobilem 14.08 rano). Guard zachowal sie dokladnie tak, jak zaprojektowany: **nie przeskanowal
czterdziesci razy cudzej strony po to, zeby nie miec gdzie zapisac wyniku.**

**Powracajaca polowa produktu byla martwa przez dwa dni i dowiedzielismy sie przypadkiem.**
Workflow byl czerwony, tyle ze **na czerwone workflowy nikt nie patrzy**.

**Naprawione i potwierdzone:**
- Cron uruchomiony recznie: `{"checked":1,"mailed":0,"remaining":0}`, zaleglosc zeszla do zera.
  Maila nie wyslal **poprawnie**: po zmianie formuly nie ma porownywalnego punktu odniesienia,
  wiec pierwszy przebieg po niej jest z zalozenia cichy.
- Prawdziwy przebieg workflow **konczy sie sukcesem**, wiec to nie byla sztuczka z curlem.
- **Cotygodniowy alarm sprawdza teraz, czy monitoring konczy sie sukcesem** i oblewa, gdy nie.
  Najtansze mozliwe miejsce, bo cos juz tam chodzi co tydzien.
- Sam straznik **zapalil sie przy pierwszym uruchomieniu z 403** (domyslny token nie czyta
  przebiegow) i to byla dobra wiadomosc: alarm, ktory nie dziala, ma padac glosno. Po dodaniu
  `actions: read` raportuje „ostatni przebieg monitoringu: success".

**Sprawdzone przed uruchomieniem czegokolwiek:** wszystkie szesc obserwacji nalezy do skrzynek
Krystiana i mojej testowej. Zaden mail nie moglby trafic do obcej osoby.

## VENDOR SKANUJACY SIEBIE DOSTAWAL GORSZY WYNIK NIZ TEN, KTORY O NIM PUBLIKUJEMY

Wyszlo z pomiaru wyzej: **zimny cache rejestru npm kosztuje szesnascie domen ich pakiet**. Reseed
radzi sobie dwoma przebiegami i **korpus publikujemy z ciepłego**, ale odwiedzajacy dostaje jeden
przebieg. Po szesciu godzinach ciszy pierwszy vendor, ktory sie u nas przeskanuje, widzi wiec
**gorszy wynik niz wiersz, ktory o nim publikujemy**, bez zadnego powodu po jego stronie.

**Cache rejestru przedluzony z 6 godzin do 7 dni.** Uzasadnienie jest w semantyce checku: to, czy
pakiet **dowozi wlasne typy**, zmienia sie mniej wiecej raz w jego zyciu, a nie co wydanie. Odmowy
rejestru nadal nie sa cache'owane nigdy.

**I tu byla pulapka, ktora sama zmiana stalej by ukryla.** Mongo **nie zmienia TTL istniejacego
indeksu** przez `createIndex`, a blad tej proby jest w tym kodzie od dawna **polykany i logowany**
(swiadomie, po awarii z 13.08). Kod mowilby wiec siedem dni, a baza kasowalaby dalej po szesciu
godzinach i **nic by o tym nie powiedzialo**.

Udokumentowanym wyjsciem jest `collMod` i **nasz uzytkownik Atlasa nie ma do niego prawa**
(„user is not allowed to do action [collMod]"). Zostaje przebudowa indeksu, na ktora rola
`readWrite` pozwala. Sprawdzone przed wdrozeniem recznie: **2117 zapisanych odpowiedzi przetrwalo
bez zmiany**, potem wpiete w kod jako `retuneRegistryExpiry`, ktore rusza indeks tylko wtedy, gdy
stala sie rozjechala. **Zweryfikowane na produkcji: 7,0 dnia.**

**Przewidywanie do sprawdzenia przy nastepnym reseedzie:** asymetria miedzy przebiegami powinna
zniknac albo mocno zmalec (dzis 21 w gore, 1 w dol, z czego 16 to `typed_package`). Jesli nie
zniknie, przyczyna jest inna niz cache i trzeba jej szukac gdzie indziej.

## KORPUS NA 9.16, I NARZEDZIE, KTORE ZMIERZYLO SIE Z WLASNEJ ROLI

**Reseed zakonczony: 170 wierszy na formule 9.16, 0 sprzecznosci, 21 pilnowanych liczb bez
rozjazdu.** Okno rozjazdu formul zamkniete. Bariera szesciu godzin zadzialala: petla ponawiala
reseed dziesiec razy i przepuscila go dopiero jej wlasny guard, bez `FORCE`.

**Guard regresji: 6 obnizen, 2 byly nasza flaka.** `locationiq.com` (429 przy pytaniu o markdown)
i `postmarkapp.com` (jedna strona dokumentacji zamiast trzech) wrocily po jednym przeskanowaniu.
Trwale sa cztery: froala nadal odpowiada 403, `mongodb.com` renderuje **66 znakow bez JavaScriptu**,
a `shopify.com` ma rejestracje, ktorej nie da sie zmierzyc.

**Narzedzie do podlogi szumu zmierzylo sie z wlasnej roli i to jest wynik, nie porazka.**
Napisalem je, zeby czytac za darmo pare, ktora reseed i tak zostawia. Pierwszy przebieg na 9.16 dal
**0,86 procent** i o malo tego nie opublikowalem jako nowej podlogi szumu. Rozklad kierunkow
zatrzymal to w pol kroku:

| para | ruchow | w gore | w dol |
|---|---|---|---|
| 9.16 | 22 | **21** | 1 |
| 9.14 | 2 | **2** | 0 |

**Losowy szum bylby symetryczny.** Asymetria 21:1 to efekt systematyczny: pierwszy przebieg reseedu
pyta npm z zimnym cache, npm odmawia, i **szesnascie domen odzyskuje pakiet dopiero w drugim
przebiegu** (`typed_package` 0 → 1). Para z 9.14 jest jednokierunkowa tak samo, tylko slabiej.

**Wniosek: dwa przebiegi jednego reseedu NIE moga zmierzyc podlogi szumu**, bo roznia sie stanem
cache po obu stronach. Narzedzie zostaje jako **detektor efektow systematycznych** i samo o tym
mowi, a publikowany `NOISE_FLOOR_PERCENT` zostaje tam, gdzie postawil go dedykowany pomiar.
Zmiana publikowanej liczby o wlasnej wiarygodnosci na podstawie dwoch ruchow bylaby przesada
w druga strone.

## WEEKEND W SKROCIE (dla Krystiana, poniedzialek rano)

Ponizej jest 70 sekcji. Ta jedna wystarczy, zeby wiedziec, co sie zmienilo i co czeka na Ciebie.

**Co czeka na Twoja decyzje (nic z tego nie jest kodem):**
1. **Sciezka zakupu** inna niz `mailto:` - patrz sekcja o przepakowaniu cennika, z policzonym
   kosztem darmowego monitoringu i rekomendacja.
2. **Nazwanie licencji korpusu** (dzis opisana, nienazwana).
3. **Model sprzedazy** - moja rekomendacja jest w sekcji cennikowej.
4. **`equity-analyst` zajmuje 2807 MB** z 5120 na wspolnym klastrze. To nie nasza baza.

**Dwa blokery z Twojej listy byly juz zrobione** (domena i zweryfikowany nadawca w Resend, od 12.08)
i przez dwa dni straszyly skonczona robota. **Lista jest przejrzana.**

**Co dziala i zostalo sprawdzone od konca do konca na produkcji:**
- **Monitoring** (zapis → mail → potwierdzenie → zatrzymanie), na wlasnej skrzynce testowej.
- **Skan odwiedzajacego** i strona raportu.
- **Eksporty maszynowe**: SARIF (15 regul, 15 wynikow, komplet pol) i CSV (2520 wierszy, zero
  rozjechanych).
- **Zapora przed adresami wewnetrznymi**, lacznie z domena publiczna wskazujaca petle zwrotna.

**Cztery rzeczy, ktore znalazlem i naprawilem, a ktore uderzalyby w klienta:**
- **Monitoring nie dzialal przez dwa dni.** Cron padal na 503 (baza nie przyjmowala zapisow),
  workflow byl czerwony i nikt na to nie patrzyl. Dziala, zaleglosc wyczyszczona, a cotygodniowy
  alarm pilnuje teraz, zeby to sie nie powtorzylo po cichu.
- **Odpowiedz na naszego maila wracala odbiciem.** Nadawca `scorecards@` nie odbiera; `Reply-To`
  wskazuje teraz `hello@`, ktory dowozi do Twojej skrzynki.
- **Komunikat o limicie skanow nazywal zla domene** („docs.acme.com skanowano 5 razy", gdy godzine
  zuzyto na `acme.com`).
- **Skrypt kasujacy dane mogl usunac wiersz, ktory publikuje korpus** (zachowywal najnowszy skan,
  a korpus czyta najnowszy *zasiany*).

**Jakosc danych:** **wszystkie 15 checkow ma teraz udokumentowany przebieg adwersaryjny**
(przebiegi 14-19, okolo 900 werdyktow, **1 blad w danych**: `statsig.com`, naprawiony). Doszly trzy
mechanizmy, ktore pilnuja tego dalej bez mojego udzialu: **alarm o zapasie kwoty Atlas**, **guard
regresji po reseedzie** i **bariera 6 godzin miedzy reseedami** (dwa reseedy w jeden dzien
kosztowaly nas `froala.com` i `bitmovin.com`, ktore zaczely nas blokowac).

**Najslabszy punkt produktu, zmierzony uczciwie:** narzedzie MCP `find_providers` myli sie na
**polowie pytan** (17/34 na zestawie pisanym przez kogos, kto nie widzial regul). Narzedzie **samo
podaje te liczbe agentom**. Trzy pomysly na poprawe zmierzylem i odrzucilem, opisane w sekcji
o trasowaniu.

## PONIEDZIALEK: jedna decyzja podjeta, dwie zostaly

**BAZA ROZWIAZANA 14.08 ok. 08:00Z, za zgoda Krystiana.** Skasowane **20 560 przedawnionych
skanow, zwolnione 2278 MB**. Baza `stackpick` spadla z 2310 MB do **32,9 MB**, caly klaster
z 5039 do 2761 MB z 5120. Zapisy odblokowaly sie w niecale dwie minuty.
Zostalo 737 raportow: najnowszy wiersz kazdej domeny i **wszystkie 542 skany odwiedzajacych**
(obiecany trwaly link `/r/<id>`).

**Skutek uboczny kasowania, ktorego nie przewidzialem:** prune skasowal **punkt odniesienia
zywej obserwacji** na stripe.com. Nikomu nic zlego nie doszlo, bo brak punktu odniesienia to
brak maila, a nie zly mail (`previous = null` → cron nic nie wysyla i zapisuje nowa baze), ale
obserwator stracil po cichu porownanie w tym cyklu. Skrypt **zachowuje teraz `lastReportId`
kazdej obserwacji**; nastepny przebieg trzyma o 2 raporty wiecej. Lekcja ogolniejsza: przed
operacja destrukcyjna wypisz, **kto jeszcze trzyma wskaznik** na kasowane wiersze, nie tylko
ktore wiersze sa przedawnione.

**KORPUS: 170 wierszy na formule 9.12, jedna wersja, 0 sprzecznosci, 0 rozjazdow** na 19 pilnowanych
liczbach. Wszystkie trzy mechanizmy samoczyszczace zadzialaly bez ingerencji: **errata zniknela**
ze wszystkich trzech wierszy, a ze strony glownej same odpadly klauzule o brakujacych vendorach
i o rozjezdzie formul.

**Pulapka warta zapamietania z tego przebiegu:** w polowie reseedu audyt zglosil **17 rozjazdow**
w liczbach na stronie. **Zadna z nich nie byla bledna** - korpus miał wtedy 148 ze 170 wierszy.
Gdybym „naprawil" proze pod stan posredni, zepsulbym siedemnascie poprawnych zdan naraz. **Audyt
uruchomiony w trakcie migracji mierzy migracje, nie dane.** Naprawa to dokonczenie reseedu.

**O samej blokadzie, bo mylila przez poltora dnia:** Atlas nie zwalnial miejsca stopniowo, tylko
dawal kilkunastominutowe okna laski. Przy trzeciej probie bylo 85 MB pozornego zapasu i zapisy
i tak leciały. Dopiero realne zejscie ponizej limitu odblokowalo to na stale.

**Weryfikacja swiezego korpusu 9.12 (14.08, po reseedzie):**
- **Nasz wlasny wiersz jest juz aktualny**: `/v/letagentsin.com` pokazuje **11/12 na 9.12**, bez
  banera o przedawnieniu i znow indeksowalny. Wczesniej stal na 9.2, dziesiec wersji wstecz, przy
  radzie mowiacej vendorom, ze oceniamy sie tak samo jak ich.
- **`mcp_present`: zaden z 67 zaliczonych serwerow nie stoi na 405.** 53 to wyzwanie
  uwierzytelniajace, 14 to pelny uscisk dloni. Klasa dowodu, ktora we wrzesniowym korpusie dala
  trzy falszywe trafienia (strony dokumentacji zaliczone jako serwery), **nie zalicza juz nikogo**.
  To pierwsze zastosowanie poprawki z 9.12 do calych 170 wierszy.
- **Rodziny oskarzen w nowym korpusie:** `agent_entry_point` 140, `oauth_dcr` 102, `mcp_present` 99,
  `signup_reachable` 85, `machine_readable_api` 48, `programmatic_provisioning` 39. Pierwsze dwie
  byly weryfikowane 13.08 na mniejszym zbiorze (66/66 i 44/44) i ich reguly sie od tego czasu nie
  zmienily.
- **Czwarty falszywy alarm z mojej wlasnej sondy w tym weekendzie**, warty zapisania obok trzech
  poprzednich: porownalem zaliczony endpoint ze strona glowna **tego samego hosta** i dostalem 23
  „podejrzanych". Wszystkie to hosty dedykowane (`mcp.stripe.com` i podobne), gdzie kazda sciezka
  odpowiada 401 - **to jest sygnatura serwera MCP za OAuth, opisana w kodzie**, a nie zbieznosc.
  Kontrolka „strona glowna" ma sens tylko dla apeksu serwisu marketingowego, czyli dokladnie tam,
  gdzie ja wprowadzilem, i nigdzie indziej.

**Przeglad tego, co wystawiamy AGENTOM (14.08) - trzy bledy w plikach recznie pisanych:**
- **`/.well-known/mcp.json` deklarowala JEDNO narzedzie, a serwer serwuje dwa.** `find_providers`
  bylo niewidoczne dla kazdego agenta, ktory znalazl nas dokladnie tak, jak KAZEMY szukac vendorom.
  Ta sama karta mowila „Sixteen points" przy `MAX_SCORE` 17.
- **`/llms.txt` mowil „one tool", 14 checkow (jest 15) i „thirty-four runs" (jest thirty-eight).**
- **Wspolna przyczyna: to byly pliki statyczne w `public/`**, wiec nic w aplikacji nie mogło
  zobaczyc, ze sie starzeja. Karta jest teraz **generowana z tych samych definicji narzedzi, ktore
  rejestruje serwer MCP**, i z `MAX_SCORE`; liczba checkow w `llms.txt` jest pilnowana przez
  `npm run audit` (20 pilnowanych liczb).
- **Ironia warta zapisania:** sprawdzamy u innych, czy publikuja karte i czy jest prawdziwa, a nasza
  wlasna przez tygodnie ukrywala polowe serwera.
- **Realne dziury, ktore ZOSTAJA** (swiadomie, nie z przeoczenia): brak `/.well-known/api-catalog`
  (RFC 9727), ktory sami sondujemy u innych, oraz brak kanalu zmian dla korpusu. To drugie
  zostawiam do czasu, az ktos naprawde cos na korpusie zbuduje.

**Widocznosc dla agentow i wyszukiwarek, zrobione 14.08:**
- **`/.well-known/api-catalog` (RFC 9727)** opublikowany jako linkset RFC 9264, z kotwicami na API
  i na endpoincie MCP. Sondowalismy te sciezke u kazdego vendora i sami jej nie mielismy.
- **Dane strukturalne**: `Organization` i `Dataset` (korpus, z `corpus.json` i `corpus.csv` jako
  dystrybucjami). **Swiadomie BEZ `Review` i `AggregateRating`**: taki znacznik mowilby
  wyszukiwarce, ze oceniamy jakosc cudzych produktow, a kazda strona mowi, ze mierzymy wylacznie,
  czy agent sie przebije. **Schemat nie moze przeczyc zdaniu obok niego.**
  Pole `license` wskazywalo poczatkowo `/terms`, ktore jest 404; poprawione na `/methodology`,
  gdzie warunki naprawde stoja.
- **IndexNow**: klucz hostowany, **181 adresow zgloszonych, HTTP 202**. Zasilaja z tego Bing,
  Yandex, Seznam i Naver. Google z IndexNow nie korzysta.
- **170 stron vendorow jest znowu indeksowalnych** - `noindex` znikal automatycznie razem
  z przejsciem wierszy na biezaca formule, wiec przez czas rozbicia korpusu byly niewidoczne.

**Google Search Console: ZROBIONE przez Krystiana.** Domena zweryfikowana jako Domain property
12.08, Google zaczal zbierac wyswietlenia tego samego dnia (potwierdzone mailem od `sc-noreply`).
Sitemap jest znajdowany przez `robots.txt`, wiec nie ma tam nic do zgloszenia recznie.

**Reszta zgloszen czeka na Ciebie i jest spisana w `outreach/listings.md`** z gotowym opisem do
wklejenia. Kazdy adres z tej listy **sprawdzilem zadaniem przed wpisaniem**, a rejestr MCP
odpytalem o nasza nazwe, wiec „nie ma nas tam" jest pomiarem, nie przypuszczeniem.
`server.json` lezy w korzeniu repo i jego ksztalt porownalem z **zywym wpisem z rejestru**, a nie
z wlasnym czytaniem schematu. Publikacja wymaga rekordu DNS, czyli Ciebie.
**Agent nie zaklada kont** - to granica, nie niedoróbka.

**`programmatic_provisioning` zweryfikowane po zmianie z 9.12 (14.08): 10 z 10 poprawnych.**
To rodzina, ktorej regule sam zmienilem (czytanie stron o kluczach wskazanych w `llms.txt`), wiec
najmniej sprawdzona. **39 wierszy nazywa konkretny adres**, ktory przeczytalismy, i nadal oblewa,
czyli stawia najostrzejszy mozliwy zarzut: „byliśmy na waszej stronie o kluczach API i nie ma tam
drogi bez panelu".
- Probka 10, czytana recznie. **Trzy pozorne niezgody, wszystkie na korzysc reguly:**
  `chargebee.com` ma slowo „CLI" w **menu bocznym**, a zdanie o kluczu nie podaje drogi programowej;
  `bunny.net` pisze „API key for **programmatic access**", co opisuje, do czego klucz sluzy, a nie
  jak go zdobyc; `directus.com` tak samo („services need to access Directus programmatically").
- **To jest dokladnie rozroznienie, dla ktorego istnieje okno 80 znakow wokol frazy** (runda 108):
  „klucz do uzytku programowego" kontra „utworz klucz programowo". Bez niego wszystkie trzy
  przeszlyby jako zaliczone.
- **Piaty falszywy alarm z mojej wlasnej sondy w tym weekendzie.** Bilans: pięć razy sonda, zero
  razy skaner.

**Trzecia sprzecznosc „werdykt zastrzega, rada rozkazuje" znaleziona i naprawiona (14.08).**
Wyszla z ponownego uruchomienia `npm run audit-remedies` na swiezym korpusie 170 wierszy.
- `typed_package` **werdykt** mowi, kiedy pakiet dopasowalismy po wydawcy, a nie po linku ze strony
  vendora („matched from the registry by who publishes it rather than by a link on your site").
  **Rada obok gubila to zastrzezenie i dawala rozkaz**: `namecheap.com` czytal „Ship types with
  **node-vault-client**", czyli klient HashiCorp Vault, ktory dzieli z nimi tylko wydawce.
  `godaddy.com` to samo z `warehouse.ai-api-client`.
- Dziewiec wierszy ma taka podstawe. Dostaja teraz zastrzezenie **i naprawe, ktora naprawde pomaga**:
  sprawdzcie, czy to pakiet instalowany przez waszych uzytkownikow, a jesli nie, podlinkujcie
  wlasciwy, co przy okazji konczy nasze zgadywanie. Wiersze z nazwa wzieta z ich wlasnej strony
  bez zmian. Obie galezie przypiete testem.
- **To trzeci raz, gdy to narzedzie lapie ten sam ksztalt bledu.** Warto je uruchamiac po KAZDYM
  reseedzie, nie tylko po zmianie regul: zmienil sie korpus, nie kod, a blad byl widoczny dopiero
  na nowych wierszach.

**Czwarta sprzecznosc tego samego ksztaltu, w najwiekszej rodzinie planu napraw (14.08).**
`programmatic_provisioning` to 91 wierszy, z czego **52 sa CZESCIOWE**: znalezlismy u nich jezyk
provisioningu, dostali punkt i brakuje im jednej frazy. Wszystkie 91 czytalo to samo zdanie
„Document how a key is created: management API, service account or CLI", co dla firmy, u ktorej
wlasnie dopasowalismy `management api`, brzmi jak rada kogos, kto nie patrzyl.
- Wiersze czesciowe slysza teraz, **czego naprawde brakuje**: kroku, ktory zamienia brak klucza
  w klucz, napisanego tam, gdzie fraza juz jest. Wiersze bez zadnego trafienia bez zmian.
- **Trzecia poprawka w `fixfirst.ts` tego samego dnia, z tego samego audytu.** Narzedzie zarabia
  na siebie: **kod sie nie zmienil, zmienil sie korpus**, a zdanie stalo sie bledne dopiero na
  wierszach, ktorych przed reseedem nie bylo.

**Audyt rad wykrywa teraz sam ten ksztalt bledu (14.08).** Cztery sprzecznosci „werdykt zastrzega,
rada rozkazuje" w jeden dzien to wzorzec, nie pech, wiec zamiast szukac piatej recznie nauczylem
narzedzie szukac ksztaltu.
- **Mocny sygnal: jedno zdanie rady obok wierszy o ROZNEJ liczbie punktow.** To laczylo wszystkie
  cztery: wiersz, ktory cos zdobyl, i wiersz z zerem slyszaly to samo polecenie. Zlapalby dzisiejsze
  bledy w `programmatic_provisioning` i `typed_package`, zanim ktokolwiek je przeczytal.
- **Slaby sygnal: czesc wierszy nazywa przeczytana strone, a czesc nie.** Pierwsze trafienie bylo
  **nieszkodliwe** (`filestack.com` podaje dwa adresy, bo mierzylismy nietypowa strone, a rada jest
  prawdziwa dla wszystkich trzech). Zostaje jako zacheta do przeczytania, nie jako znalezisko, i
  narzedzie mowi to wprost, zeby nie uczyc nikogo ignorowania alertow.
- Po wszystkich trzech dzisiejszych poprawkach **mocny sygnal nie zglasza juz nic**.

**Naglowki raportow przejrzane (14.08, `npm run audit-headlines`): wynik NEGATYWNY, nic do
naprawy.** Ta sama technika co przy radach, zastosowana do pierwszego zdania, ktore czyta vendor.
- **87 ze 170 wierszy dzieli jeden naglowek** („you publish files for machines to read, but nothing
  that tells one how to become a customer"). Sprawdzone: jest **prawdziwy na wszystkich 87**
  (kazdy publikuje jakis plik dla maszyn) i **zaden z nich nie ma gorszego znaleziska**, ktore
  kolejnosc by przeskoczyla. Polowa korpusu ma po prostu ten sam najgorszy problem, co jest faktem
  o rynku, a nie wada generatora.
- **Moja sonda twierdzila, ze 63 z nich maja cos gorszego. Mylila sie**, bo liczyla `notApplicable`
  i `inconclusive` jako porazki: `slatejs.org` nie ma zadnej rejestracji, a `tigrisdata.com` ma ja
  osiagalna, tylko wymagajaca JavaScriptu. **Szosty falszywy alarm z mojego audytu w ten weekend,
  przy zerze ze strony skanera.**
- Skrypt zostaje z wynikiem wpisanym w komentarz, zeby ostrzezenie o szerokim rozrzucie punktow
  **nie bylo czytane jako wada** przez nastepna osobe.

**`corpus.json` publikuje teraz zliczenia per check (14.08)**, i to jest naprawa **danych**,
a nie moich skryptow.
- Szesc falszywych alarmow z moich audytow w ten weekend mialo **jedna przyczyne**: liczylem
  `points < max` i wciagalem w to wiersze **nieoznaczalne i nieadekwatne**. Notatka wyjasniajaca te
  roznice byla w `corpus.json` od dawna, wiec **proza tego nie powstrzymuje** - popelnil ten blad
  szesc razy czlowiek, ktory te dane napisal.
- Kazdy check niesie teraz `tally`: `pass`, `partial`, `fail`, `unmeasured`, `notApplicable`
  i `measured` (uczciwy mianownik = pass+partial+fail). Notatka obok mowi, ktorego pola uzyc
  i ktorego filtra nie. **Poprawna liczba jest od teraz ta latwiejsza do wziecia.**
- Zweryfikowane na produkcji: suma piecu kategorii dla **kazdego** checku wynosi dokladnie 170,
  czyli tyle, ile wierszy. Arytmetyka przypieta testem, bo zliczenie, ktore moze sie rozjechac
  z wierszami, jest ozdoba.

**Prog szumu dla PRZEBIEGOW AGENTA, zmierzony 14.08 z danych, ktore juz mielismy (koszt: zero).**
Wyszlo z pytania Krystiana o platna subskrypcje przebiegow agenta. Kazda opublikowana kategoria to
juz powtorzone przebiegi tego samego briefu, wiec nie trzeba bylo kupowac nowych.

| kategoria | zgodnosc wyboru | niezgoda W OBREBIE jednego modelu |
|---|---|---|
| editors | 6/6 Tiptap, oba modele | brak |
| payments | 4/4 Stripe, oba modele | brak |
| storage | 3/4 Cloudinary | **TAK** - Opus 5 wskazal raz R2, raz Cloudinary |
| auth | 2/4 Auth0 | **TAK** - Sonnet 5 wskazal raz Firebase, raz Clerk |

**Wniosek dla produktu: ten sam model, ten sam brief i ten sam scaffold potrafia wybrac innego
dostawce.** Subskrypcja obiecujaca „powiemy, gdy wasza pozycja sie zmieni" raportowalaby w storage
i w auth zmiany, ktore zachodza bez zadnej zmiany po stronie vendora. W edytorach i platnosciach
wybor byl stabilny.

**Uczciwe ograniczenie: n = 2 na model w kategorii.** To wystarcza, zeby stwierdzic, ze
niestabilnosc ISTNIEJE (obserwacja pozytywna), ale nie zeby podac jej wielkosc. Nie nazywaj tego
progiem szumu na wzor 0,2 procent dla skanu deterministycznego.

## KORPUS NA 9.13, I FALSZYWY ALARM NA 11 LICZB (14.08)

**Reseed zakonczony: 170 wierszy na formule 9.13, 0 sprzecznosci, 0 rozjazdow** na 20 pilnowanych
liczbach i 3 twierdzeniach o nazwanych vendorach. Produkcja pokazuje `awaitingRescan: 0`.

**Po drodze audyt zglosil 11 rozjazdow i wszystkie byly falszywe.** Kazdy o dokladnie jeden
(„says 170, data says 169", „says 68 live MCP servers, data says 67"), bo brakowalo jednego wiersza:
`netim.com`, zapisanego o 15:33:44. Wiersz **byl** w bazie, zasiany, na 9.13.

**Przyczyna: `npm run audit` czyta `corpus.json` z ZYWEJ STRONY, a strona trzyma korpus w pamieci
przez 5 minut** (`CORPUS_TTL_MS`). Audyt uruchomiony w sekunde po ostatnim skanie mierzy wiec cache,
nie dane. Gdybym „naprawil" proze pod ten odczyt, przepisalbym **jedenascie poprawnych zdan**.

To jest ta sama regula co przy porannym reseedzie („audyt w trakcie migracji mierzy migracje"),
ale trafila w **ogon** migracji, nie w srodek, i dlatego wygladala wiarygodnie: reseed sie skonczyl,
skrypt wypisal podsumowanie, wszystko wskazywalo na gotowy stan. **Zakonczony zapis to nie to samo,
co zaktualizowany odczyt.**

**Naprawione u zrodla:** `scripts/reseed.sh` czeka teraz, az strona zwroci `awaitingRescan: 0`
(do 10 minut), zanim uruchomi audyt, i mowi wprost, gdy sie nie doczekal. Poprzednio skrypt sam
zapraszal do tego falszywego alarmu.

## RESEED SAM PSUJE WERDYKTY, I NIKT BY NIE ZAJRZAL (14.08, naprawione)

Po reseedzie na 9.13 porownalem kazdy wiersz z pomiarem poprzednim. **Piec werdyktow wyszlo gorzej
niz przed reseedem i tylko JEDEN byl prawdziwy.**

| domena | check | co publikowalismy | po jednym przeskanowaniu |
|---|---|---|---|
| sendlayer.com | `mcp_present` | „brak serwera" | **1 pkt**, `mcp.sendlayer.com` odpowiada 401 |
| sendlayer.com | `signup_reachable` | „nie znalezlismy linku do rejestracji" | **1 pkt**, formularz w HTML |
| sendlayer.com | `signup_no_captcha` | niemierzalne | **1 pkt** |
| sentry.io | `user_agents_allowed` | „wasz brzeg odmowil nam robots.txt" | **1 pkt**, nikt nie jest blokowany |
| sentry.io | `no_crawl_delay` | niemierzalne, bo robots.txt odmowiony | **1 pkt** |
| name.com | `agent_entry_point` | brak pliku wejsciowego | **0 pkt takze na swiezym skanie: PRAWDZIWE** |

**Przyczyna: to my.** Reseed pyta 170 hostow o to samo dwa razy w ciagu godziny, a czesc z nich
odpowiada odmowa. Publikowalismy wiec o sentry.io, ze **ich brzeg nas odmawia**, podczas gdy to my
ich zalalismy, i o sendlayer.com, ze **nie maja serwera MCP**, podczas gdy `mcp.sendlayer.com`
odpowiada JSON-RPC 401 kazdemu, kto zapyta raz. To sa twierdzenia o cudzym produkcie zrobione
z pomiaru naszego wlasnego obciazenia, czyli dokladnie ten sam blad co przy kinde w rundzie 131.

**Naprawione u zrodla, nie recznie:** `scripts/regressions.mts` (`npm run regressions`) porownuje
kazdy wiersz z poprzednim pomiarem tej samej domeny i wypisuje wszystko, co stracilo punkty.
**Wpiete w `reseed.sh`**, ktory sam dociaga `MONGODB_URI`, bo guard uruchamiany tylko wtedy, gdy
ktos pamieta o zmiennej srodowiskowej, to guard nieuruchamiany. Wynik po naprawach: **0 werdyktow
gorszych**.

**Regula: werdykt, ktory pogorszyl sie w reseedzie, jest najpierw kandydatem do przeskanowania,
a dopiero potem regresem vendora.** Dzis proporcja wyniosla 5 do 1 na korzysc naszej flaki.

**Stan koncowy: 170 wierszy na 9.13, 0 sprzecznosci, 0 rozjazdow, 69 zywych serwerow MCP.**
Doszly `statsig.com` (naprawiona luka w sondowaniu) i `kinde.com`, ktory po raz pierwszy dal sie
zmierzyc z dyna: jego brzeg przestal polykac nasze POST-y, wiec „niemierzalne" zamienilo sie
w zaliczone. Sonda z laptopa wskazywala go poprawnie juz wczesniej i **odrzucilem ja slusznie**
(runda 131 opisywala realne zachowanie brzegu), ale powod odrzucenia sie zdezaktualizowal.

## CZTERNASTY PRZEBIEG ADWERSARYJNY (14.08, na swiezym korpusie 9.12)

Trzynasty przebieg byl **przed** reseedem, wiec wszystkie 170 wierszy zmierzonych rano pod 9.12
nie bylo sprawdzone reka. Przebieg celowany w dwie rodziny, ktore zmienily sie miedzy 9.10 a 9.12,
bo tylko tam moglo cos sie zepsuc.

**Rodzina 1: `mcp_present`, regula z 9.11, ktora ZAOSTRZYLA kryterium.** Zaostrzenie moze zawiesc
tylko w jedna strone, wiec przesondowalem **wszystkie 99 wierszy mowiacych „brak serwera"**
prawdziwym `initialize` JSON-RPC na szesciu adresach kazdy. **Kontrolka 8 na 8** (sonda znajduje
serwery, ktore zaliczamy) - bez niej wynik zerowy nie znaczylby nic.

**Znaleziony jeden falszywy negatyw: `statsig.com`.** Odpowiada 401 z naglowkiem
`WWW-Authenticate: Bearer realm="statsig", resource="https://api.statsig.com/v1/mcp"` i publikuje
metadane RFC 9728 (`{"resource":"https://api.statsig.com/v1/mcp"}`), a my publikowalismy, ze nie
maja serwera. **Kontrolka odrozniajaca go od bramy API** (dokladnie pulapka, ktora naprawila 9.11):
sciezki niezarejestrowane na tym hoscie zwracaja **403 bez zadnego wyzwania**, a zarejestrowana
**401 z wyzwaniem wskazujacym samą siebie**.

**Przyczyna: luka w pokryciu, nie blad reguly.** Skaner sondowal `mcp.<domena>/v1/mcp`
(z komentarzem tlumaczacym, po co) i `api.<domena>/mcp`, ale **nikt nie przeniosl argumentu
o wersjonowaniu na host `api`**. Dolozony `api.<domena>/v1/mcp`, **formula 9.13**, precedens
identyczny (6.4 → 6.5 po trzecim przebiegu, ten sam powod). Zweryfikowane na produkcji: statsig
dostaje 1 pkt pod adresem `https://api.statsig.com/v1/mcp`.

**Ograniczenie tego zamiatania, ktore trzeba czytac razem z wynikiem: sondowalem z laptopa,
a skaner mierzy z dyna.** Wyszlo to przy czwartej rodzinie, czterech wierszach „niemierzalne".
`kinde.com` odpowiada z laptopa **401 z wyzwaniem JSON**, wiec wygladal na piaty falszywy negatyw.
Nie jest: runda 131 opisuje, ze **brzeg kinde polyka kazdy POST z naszej sieci** (202, zerowe
cialo) na sciezce MCP, na sciezce niezarejestrowanej i na nieistniejacej subdomenie, a z laptopa
odpowiada normalnie. „Niemierzalne" jest tam werdyktem **poprawnym i swiadomym**. Pozostale trzy
(`quilljs.com`, `modal.com`, `pdfmonkey.io`) potwierdzily sie takze z laptopa: pusty 2xx.

Wniosek: **wynik zerowy na 98 pozostalych domenach jest wazny dla punktu obserwacyjnego laptopa,
nie dyna.** Znaleziony statsig jest odporny na ten zarzut, bo potwierdzilem go **przeskanowaniem
na produkcji**, czyli z dyna. Nastepny przebieg tej rodziny ma leciec z dyna albo miec kontrolke
porownujaca oba punkty; to jest kontrolka, ktorej w tym przebiegu nie mialem.

**Rodzina 2: adresy publikowane jako dowod, regula z 9.12, ktora ROZLUZNILA kryterium.** 9.12
czyta linki z llms.txt i nazywa je w werdyktach, wiec moze zawiesc przez **zaliczenie** czegos,
czego nie ma. Sprawdzone **736 adresow** z werdyktow punktowanych: **0 nie odpowiada**.

**Bilans przebiegu: 99 + 736 + 4 sprawdzonych, 1 blad w danych** (`statsig.com`), przy czym
**siedem pozornych niezgod okazalo sie wada mojej metody**, nie danych.

**Najwazniejsza lekcja tego przebiegu dotyczy MOJEGO narzedzia, nie danych.** Audyt adresow zglosil
kolejno **48, potem 16, potem 3, na koncu 0** znalezisk, i kazde ciecie bylo naprawa mojej sondy:
1. **Koncowy dwukropek** w ekstrakcji (`https://qdrant.tech/pricing:`) - **ta sama pulapka jest
   spisana w STATE.md z wczesniejszego przebiegu, napisalem o niej komentarz w tym skrypcie
   i i tak ja powtorzylem.** Przyciecie mieszka teraz obok zadania, nie w potoku wolajacego.
2. **401 liczone jako martwy adres** - 20 zywych serwerow MCP oskarzonych o zepsuty link.
3. **GET na endpoincie POST-owym** - `betterstack.com`, `telnyx.com` i `qdrant.tech` odpowiadaja
   404/406 na GET i `serverInfo` na handshake, ktory nasz werdykt opisuje.
4. **Audytowanie checku, ktorego zadaniem jest zglaszanie martwych linkow.** `llms_txt` sam pisze
   „One is gone: <url>", wiec sonda flagowala nasze wlasne poprawne raportowanie gnicia u vendora.

**Regula do zapamietania: audyt, ktory zglasza wiecej znalezisk niz skaner ma bledow, mierzy
najczesciej wlasna metode.** Zanim zglosisz N sprzecznosci, sprawdz, czy Twoja sonda pyta o to samo,
o czym mowi zdanie, ktore obalasz - tym samym czasownikiem HTTP i o ten sam zasob.

## OSTRZEZENIE PRZED ZAPCHANIEM BAZY (zrobione 14.08, na produkcji)

Awaria z 13.08 nie miala ostrzezenia i nadal by go nie miala: `/api/health` mowi, **czy zapis sie
udal**, a to jest prawda az do momentu, gdy przestaje nia byc. Doszedl pomiar liczby, ktora rusza
sie pierwsza.

- `/api/cron/quota` (token cronowy) mierzy **`dataSize` + indeksy** kazdej bazy na klastrze
  i **mailuje dopiero powyzej 80 procent**. Codzienne „nadal dobrze" to mail, ktory uczy filtrowac
  nadawce, wiec cicha odpowiedz jest normalna.
- Harmonogram: `.github/workflows/quota.yml`, poniedzialki 05:41Z. Workflow **oblewa rowniez
  wtedy, gdy werdykt nie jest `ok`**, wiec alarm przezyje dostawce poczty, ktory po cichu przestal
  dostarczac. To jest dokladnie ta awaria, ktora zastepuje.
- Progi: ostrzezenie na 80 procent, krytyczne na 92. Dobrane pod to, ze **klaster dzielimy
  z projektem, ktorego nie zapisujemy i nie mozemy przyciac**, wiec zapas potrafi zniknac bez
  jednego naszego wiersza.
- **Zweryfikowane na produkcji:** endpoint zwraca 55,6 procent i `mailed: false`, bez tokenu 401,
  workflow zielony. Wynik zerowy nie jest dowodem, wiec osobno **udowodniona sciezka wysylki**:
  spreparowany odczyt 84 procent poszedl mailem na skrzynke Krystiana, `delivered: true`. Nadawca
  `onboarding@resend.dev` dowozi do wlasciciela konta Resend, czyli dokladnie tam, gdzie alarm ma
  trafiac, wiec **ten alarm nie czeka na zweryfikowana domene**.
- Test progu **udowodniony, ze potrafi oblac**: po podniesieniu `WARN_AT` na 0,99 `scripts/rules.mts`
  konczy sie kodem 1. Test powtarzajacy progi zamiast wolac `verdictFor` wyrzucilem, bo nie mogl
  oblac.

**Pomylka warta zapisania, bo kosztowala juz dwa razy w obie strony:** `scripts/space.mts`
drukowal `storageSize` jako pierwsza kolumne. 13.08 przeczytalem ja jako kwote i **nie doszacowalem**
zapchanej bazy; 14.08 przeczytalem zostawione po prune 1457 MB jako **1424 MB nagłego przyrostu**
i podnioslem falszywy alarm, odwolany jedna komenda. Skrypt pokazuje teraz **`LICZONE DO KWOTY`
jako pierwsze**, dysk osobno i podpisany „nie liczone", plus jedna linia podsumowania
(`2848,9 MB z 5120, 55,6 procent`). Po duzym kasowaniu **te dwie liczby roznia sie o rzad
wielkosci** i to jest normalne: Flex nie kompaktuje.

## PRZEPAKOWANIE CENNIKA (pomysl Krystiana: darmowy skan + darmowy monitoring, platne przebiegi agenta)

**Koszt strony deterministycznej zmierzony, nie zalozony** (`scripts/watch-cost.mts`, 14.08, 170 wierszy):
mediana skanu **5,1 s**, najdluzszy 26,5 s, sredni wiersz **11,3 kB**.

| obserwowanych domen | czas dyno na tydzien | baza, jesli trzymamy KAZDY tydzien |
|---|---|---|
| 100 | 0,1 h | 1 MB/tydz. |
| 1 000 | 1,4 h | 11 MB/tydz. |
| 10 000 | 14,3 h | 110 MB/tydz. |

**Wniosek kosztowy: monitoring da sie rozdac za darmo.** Przy 1000 obserwowanych domen tygodniowy
przebieg to 1,4 h jednego dyna, czyli miesci sie w dynie, ktorego juz placimy, a **baza jest plaska
(22 MB), o ile trzymamy tylko najnowszy wiersz i punkt odniesienia** - dokladnie to, co prune teraz
wymusza. Wersja „trzymamy kazdy tydzien" to 572 MB rocznie przy 1000 domen i **odtworzenie awarii,
ktora wlasnie posprzatalismy**. Darmowy monitoring jest tani tylko razem z polityka retencji.

**Argument ZA, mocniejszy niz koszt: 99 USD zabija jedyny kanal, jaki mamy.** Mail „wasz werdykt sie
zmienil" to jedyny powracajacy kontakt z vendorem i jedyne cieple wejscie w platny audyt. Do tego
**sami opublikowalismy narzedzie MCP `scan_domain`**, wiec techniczny kupujacy zbuduje sobie nasz
monitoring w popoludnie. Sprzedawanie crona nad darmowa rzecza, ktorej API sami wystawilismy, to
najslabsza linia dzisiejszego cennika, a nie audyt.

**Argument PRZECIW, ktory trzeba podjac swiadomie: oddajemy jedyny zaprojektowany przychod
powracajacy i zastepujemy go tym, ktory zmierzylismy jako niestabilny w polowie kategorii.**
Subskrypcja przebiegow agenta obiecuje „powiemy, gdy wasza pozycja sie zmieni", a w storage i auth
zmienia sie ona bez zadnego ruchu po stronie vendora (patrz prog szumu wyzej). Sprzedaz tej
subskrypcji dzis w tych kategoriach to sprzedaz szumu jako sygnalu.

**Rekomendacja (moja, do decyzji Krystiana):**
1. **Skan i monitoring za 0 USD, z retencja dwoch wierszy na domene.** Nowe zdanie na `/pricing`
   zamiast dzisiejszego „placisz za to, ze powiemy, gdy sie zepsuje": **darmowe jest wszystko, co
   maszyna sprawdza deterministycznie; platne jest to, czego maszyna sprawdzic nie umie.** Ten
   podzial jest uczciwszy, bo pokrywa sie z tym, gdzie faktycznie leza nasze koszty.
2. **Jednorazowy przebieg agenta: sprzedawac tylko w kategoriach, w ktorych zmierzylismy
   stabilnosc** (dzis editors i payments). Cena za **liczbe przebiegow potrzebnych do stabilnej
   odpowiedzi**, nie za „audyt".
3. **Subskrypcja przebiegow: nie sprzedawac, dopoki nie ma pomiaru stabilnosci per kategoria.**
   Pomiar kosztuje 150-400 USD wydatku na model na kategorie i to jest decyzja Krystiana.
4. **Audyt czlowieka jako premium: jedyna linia bez problemu kosztowego i bez problemu szumu**,
   i jedyna, ktora sie nie skaluje. Strona glowna juz ja polsprzedaje („an audit is run by me").

**Co to odblokowuje od reki:** trzy z czterech linii nie potrzebuja wtedy bramki platnosci. Darmowy
skan i darmowy monitoring dzialaja dzis, a platne pozostaje rozmowa mailowa, ktora i tak prowadzimy.
**Brak sciezki zakupu przestaje blokowac start**, a Stripe/Paddle robi sie decyzja na moment, w
ktorym subskrypcja przebiegow ma juz pomiar.

**Rekomendacja: subskrypcje przebiegow agenta sprzedawac PER KATEGORIA, po pomiarze stabilnosci**,
a nie globalnie. Dwie kategorie juz wygladaja na bezpieczne, dwie nie.

**Opublikowane 14.08 jako ograniczenie na `/findings`.** Lista ograniczen pokrywala liczebnosc
proby, warianty promptu, modele i scaffold, a nie mowila **czy proporcja na tej stronie jest
stabilna**. Teraz mowi, z liczbami, i wprost prosi czytelnika, zeby czytal „6 na 6" jako mocniejszy
dowod niz „2 na 4", zamiast traktowac je jak te sama liczbe.

**Korekta wlasnej wypowiedzi:** powiedzialem Krystianowi, ze ten pomiar da sie zrobic bez jego
decyzji. Nieprawda dla wersji z nowymi przebiegami: `harness/docs/method.md` podaje **150-400 USD
kosztow modeli na audyt**, wiec piec przebiegow to realny wydatek z jego konta i wymaga zgody.
Wersja z danych archiwalnych kosztuje zero i to ona zostala zrobiona.

**Co zostaje na Ciebie, w kolejnosci wagi:**
1. **Sciezka zakupu.** Skan jest gotowy na klientow, platny audyt nie: konczy sie `mailto:` na
   prywatnego Gmaila. Do tego zweryfikowany nadawca w Resend i domena.
2. **Stripe czy Paddle.** Rekomendacja: **Paddle**, bo jako sprzedawca formalny zdejmuje VAT OSS,
   co przy 99-250 USD i jednoosobowej dzialalnosci jest tansze niz obsluga rozliczen w kilkunastu
   krajach. Stripe tylko jesli chcesz ruszyc w tym tygodniu.
3. **Rosnie equity-analyst: 2728 MB, ponad polowa limitu.** Kasowanie po naszej stronie tego nie
   dotyka. Jesli tamten projekt rosnie dalej, platny tier wroci jako decyzja o dwoch projektach.

### 2. Platnosci: Stripe czy Paddle

Decyzja ksiegowa, nie techniczna. Stripe: uruchamiam od reki, **VAT OSS od klientow z UE
rozliczasz sam**. Paddle: sprzedawca formalny, zdejmuje VAT, wyzsza prowizja, weryfikacja kilka
dni. Pola `plan` i `subscriptionId` czekaja w `src/lib/watch.ts`. **Nie blokuje przyjmowania
uzytkownikow**, bo monitoring jest darmowy i strona to mowi.

### 3. Drugie dyno

Koszt. Jedno dyno to jedyny serwer; cache korpusu zdjal najgorszy przypadek.

### Komenda po odblokowaniu zapisow (MINIMALNA, 88 domen zamiast 170)

```
cd ~/projects/stackpick
export STACKPICK_CONSOLE_TOKEN=$(heroku config:get STACKPICK_CONSOLE_TOKEN -a stackpick)
export MONGODB_URI=$(heroku config:get MONGODB_URI -a stackpick)
DOMAINS=$(npx tsx scripts/stale-domains.mts) PASSES=1 PAUSE=3 bash scripts/reseed.sh
```

`stale-domains.mts` wypisuje **tylko te domeny, ktorych najnowszy pomiar nie jest na aktualnej
formule**: dzis 88 ze 170. Pelny reseed to 340 zapisow, ten to 88, czyli okolo 440 kB zamiast
1,7 MB. **Przy tak cienkim zapasie to jest roznica miedzy dokonczeniem a ponownym zablokowaniem.**

`PASSES=1` swiadomie: drugi przebieg istnieje po to, by rejestr npm odpowiadal z cieplego cache
(zimny kosztuje ~26 domen ich pakietu). Przy odzyskiwaniu wazniejsze jest, zeby przebieg sie
skonczyl. Jesli po nim `typed_package` wyglada na zaniżony, mozna dobic drugim przebiegiem.

**To jest pierwsza rzecz do zrobienia.** Przerwany reseed zostawil korpus rozbity: ~75 wierszy na
9.9, 95 na 9.8, a publikujemy wiekszosc, wiec **strona pokazuje 95 dostawcow zamiast 170**. Audyt
czysty (0 rozjazdow), wiec nic nie jest falszywe, tylko mniejsze. Jeden reseed to zamyka.
Potem `npx tsx scripts/diff-corpus.mts <migawka> https://letagentsin.com/corpus.json`.

**Zamrozone do tego czasu: zmiany w skanerze.** Kazda kolejna zmiana formuly powieksza rozjazd,
ktorego nie da sie zamknac bez reseedu.

### Audyt sprzecznosci WEWNATRZ jednego wiersza (13.08), formula 9.10

Poprzednie audyty sprawdzaly kazda regule osobno. Ten pytal, czy pietnascie werdyktow w jednym
wierszu **da sie jednoczesnie utrzymac**. Znalazl siedem, cztery naprawione i zweryfikowane
lokalnym skanerem:
1. **contentful.com i pandadoc.com placily punktem za NASZ rate limit.** Door test karal 429
   z markerem challenge, a check signupu obok nazywal ten sam 429 "a limit we triggered rather
   than a rule about agents". Challenge zlozony z samych 429 jest teraz niemierzalny; 403 nadal
   kosztuje punkt. Zdanie przestalo tez mowic "the site" na podstawie jednego zadania do jednego
   hosta, obok robots.txt wlasnie przeczytanego z tego samego origin (namecheap.com).
2. **`signup_no_captcha` opisywal server HTML na 11 wierszach, ktorych rodzenstwo mowilo, ze
   strona odpowiedziala 403 wszystkim.** Nieszkodliwe przy dwoch unmeasured i jedna galaz od
   scoreowanego fail z sygnatury CAPTCHA w tresci bledu WAF.
3. **`agent_entry_point` liczyl 429 jako odmowe**, wbrew `isEdgeRefusal`, ktorego reszta skanera
   uzywa wlasnie dlatego, ze 429 to nasze obciazenie. name.com byl raportowany jako odmawiajacy
   wszystkich dziewieciu sciezek na origin, ktorego llms.txt przeczytalismy w calosci; **on
   publikuje skill.md** i teraz to widac.
4. `signup_reachable` ignorowal 2xx wsrod prob, choc door test nauczyl sie tego w sierpniu
   (weglot.com: "answers 403, 403, 200 ... so nothing gets in from here").

`isEdgeRefusal` przeniesiony do warstwy http, zeby oba wywolania mialy jedna definicje zamiast
rozjezdzac sie ponownie.

5. **Pliki llms.txt liczyly sie jako "documentation pages"** i przekraczaly bramke `pages >= 2`
   same z siebie. shopify.com: "none of the 3 documentation pages" obok "no documentation page
   could be found", oba zbudowane z tych samych trzech plikow. Teraz liczone osobno; grep nadal
   czyta oba, bo fraza potrafi siedziec w llms-full.txt. Zweryfikowane: shopify mowi to samo co
   jego wlasny sasiedni werdykt, auth0 nadal przechodzi z "4 documentation pages and 3
   machine-readable files".

6. **`rateLimited` nie znaczyl tego, co obiecuje nota obok niego.** Nota mowi "the host answered
   429 during that scan" i zaleca filtrowanie po tym polu; pole bylo `rateLimitedUs`, prawdziwe
   tylko gdy KAZDA proba door-testu byla 429. nylas.com publikowal "answered 429, which is a limit
   we triggered" z `rateLimited: false` obok. **Kto posluchal naszej wlasnej rady i przefiltrowal,
   zostawal dokladnie z tymi wierszami, ktore mial usunac.** Teraz czyta kazdy status skanu.

**Przy okazji: guard zlapal moja wlasna zmiane.** Przepisanie zdania w hero na "we can compare
today" zostawilo dwa z siedemnastu pilnowanych numerow bez dopasowania, a wzorzec, ktory nic nie
dopasowuje, nic nie sprawdza. `npm run audit` powiedzial to wprost przy nastepnym uruchomieniu.
Dwie linie nizej w tym samym pliku jest komentarz o tym samym zdarzeniu z sierpnia.

**NIENAPRAWIONE z tego audytu, do zrobienia:**
- ~~**`measuredOn: null`, gdy scoreowany URL jest na innej domenie rejestrowalnej**~~ **zamkniete
  2026-08-14 jako ZALATWIONE PRZEZ `alsoNames`, swiadomie bez zmiany kodu.** Wszystkie trzy
  wymienione przypadki widac dzis w korpusie: `dropboxsign.com → hellosign.com`,
  `swell.is → swell.store`, `sentry.io → sentry.dev`.
  **Rozszerzenie `measuredOn` byloby bledem, nie poprawka.** To pole znaczy „domena, na ktorej
  wyladowala STRONA GLOWNA" i niesie ostrzezenie o podwojnym liczeniu plikow (`sendgrid.com`
  oddaje `robots.txt` przekierowaniem na `twilio.com`, ktory jest osobnym wierszem). Tymczasem
  `sentry.io` ma na `sentry.dev` **jeden endpoint MCP**, a `dropboxsign.com` na `app.hellosign.com`
  **jeden formularz rejestracji**. Wpisanie tam `measuredOn` twierdziloby, ze caly wiersz zmierzono
  gdzie indziej, co jest nieprawda i zawyzaloby ostrzezenie o podwojnym liczeniu.
  `alsoNames` mowi dokladnie tyle, ile wiemy: **ktore obce domeny nazywaja wlasne zdania wiersza**,
  bez twierdzenia, ze wiersz tam zmierzono. Notatki w `corpus.json` juz to tlumacza czytelnikowi
  maszynowemu.

### Przeglad wszystkich powierzchni podajacych rozmiar korpusu (13.08)

Cztery miejsca drukowaly **88** tak, jakby to byla calosc naszej pracy, i zadne nie mowilo, ze to
tylko tyle, ile da sie porownac pod jedna formula. Wszystkie naprawione i sprawdzone na produkcji:
1. `/v` - "We hold 170 vendors in total. The 82 not listed here..."
2. `corpus.json` - `curated` i `awaitingRescan` obok `domains`
3. **MCP `find_providers`** - mowilo agentowi *"0 vendors measured, **which is what we hold**"*
   dla kategorii, w ktorej trzymamy szesciu dostawcow. **To bylo zdanie wprost falszywe**, i to
   powiedziane czytelnikowi, ktory nie moze dopytac.
4. strona glowna - "Of 88 vendors we can compare today (we hold 170; the rest are waiting...)"

**Wzorzec, ktory sie za tym kryje i ktory powtorzyl sie dzis kilkanascie razy:** problemem nie
bylo klamstwo, tylko **prawda podana bez kontekstu, ktory czyni ja zrozumiala**. "The scan failed"
po udanym skanie, "Stopped" bez zapisania, 88 firm bez wyjasnienia. Za kazdym razem system mowil
cos technicznie obronnego i za kazdym razem odbiorca wyciagal falszywy wniosek. **Najwiecej
precyzji jestesmy winni temu, kto nie moze zadac pytania uzupelniajacego**, czyli agentowi.

### `corpus.json` zaniżał nas wobec maszyn (13.08)

Plik podawal `domains: 88` i nic o tym, ile trzymamy, wiec czytajacy w trakcie reseedu nie mial
**zadnego** sposobu odroznic korpusu z 88 firm od korpusu ze 170 zlapanego w polowie. A czytelnikami,
na ktorych nam zalezy, sa agenci. **Caly ten produkt argumentuje, ze maszynie nalezy rzeczy
powiedziec, a nie zostawiac ich do wywnioskowania**, i wlasny plik zostawial do wywnioskowania
najbardziej podstawowy fakt o swojej kompletnosci. Dodane `curated` i `awaitingRescan` obok
`domains` plus nota tlumaczaca roznice. Sprawdzone: `domains: 88 | curated: 170 | awaitingRescan: 82`.

### Strona przestala zaniżać sama siebie (13.08)

`/v` drukowalo tyle wierszy, ile ma opublikowany korpus, i przy rozbiciu na dwie formuly bylo to
**88 ze 170**, wygladajace jak calosc naszej pracy. Nic na stronie tego nie prostowalo. Zadna
liczba nie byla falszywa, bo wszystkie licza sie z korpusu, ale byla **mniejsza od prawdy bez
wyjasnienia**, a przy temacie "ile zmierzylismy" to jest wlasna odmiana wprowadzania w blad.
Jedno zdanie, pokazywane tylko gdy zbior opublikowany jest mniejszy od kuratorowanego. Sprawdzone
na produkcji: *"We hold 170 vendors in total. The 82 not listed here were last measured under an
older formula..."*

### Stan zweryfikowany 13.08 (po 48 commitach)

Osiem publicznych stron: **wszystkie 200**, 0,26-0,46 s. Drzewo czyste, nic niewypchniete.
Audyt: **0 sprzecznosci, 0 rozjazdow**. Skan oddaje pelna karte na formule 9.9 z uczciwym
`saved: false`. Monitoring chodzi co godzine i **poprawnie oblewa**.

**Nie ma juz nic, co dalo by sie zrobic bez decyzji Krystiana.** Zamrozenie skanera obowiazuje,
bo kazda zmiana formuly powieksza rozjazd korpusu. Rozwazylem wyciszenie godzinowych maili
z monitoringu i **odrzucilem to**: alert, ktory milczy w trakcie awarii, jest gorszy niz alert
halasliwy, a powiadomienia w repo wycisza sie jednym kliknieciem.

### Co ten weekend dal, w trzech liczbach

- **Oskarzenia o obce firmy w dol:** `programmatic_provisioning` 77 -> 32, `docs_without_js`
  11 -> 2, `llms_txt` 47 -> 36, `user_agents_allowed` 5 -> 3. Formula 9.2 -> 9.9.
- **Szesc sciezek zapisu**, z ktorych **kazda** klamala przy zepsutej bazie, mowi teraz prawde.
- **46 commitow**, monitoring produkcji co godzine, widok mobilny i mail naprawione.

### Trzy rzeczy, ktorych nie wiedzialem, a ktore kosztowaly najwiecej

1. **Reseed pokazuje, na CZYM regula sie dopasowala, i tylko to.** Wzorzec provisioningu trafial
   na **menu nawigacyjne** u mapbox.com, a werdykt byl przy tym prawdziwy. Zaden audyt statyczny
   tego nie zlapie.
2. **Zmiana reguly ma dwie ceny, a korpus pokazuje te, ktorej szukasz.** Przewidywanie dla 9.6
   zgadzalo sie co do liczby i kierunku, a polowa ruchu byla szkoda. Czytaj wiersze, nie sume.
3. **Awaria byla lepszym audytorem niz cztery audyty, ktore zamowilem.** Tamte znalazly zle
   werdykty o obcych firmach; ta znalazla szesc miejsc, w ktorych okłamywalismy wlasnego klienta.

---

## Incydent 2026-08-13: baza zapchana, zapisy odrzucane przez ~godzine (JUZ DZIALA)

**Objaw:** reseed 9.9 zaczal zwracac 42 porazki na 54 wiersze. W logach Heroku:
`MongoServerError: you are over your space quota, using 5121 MB of 5120 MB. Writes are blocked`.
Strona czytala i wygladala normalnie, ale **zaden skan, zapis na monitoring ani lead sie nie
zapisywal**. Reseed zatrzymany od razu.

**STAN NA TERAZ: zapisy NADAL ZABLOKOWANE.** Blokada ustapila na kilkanascie minut i wrocila;
moj wczesniejszy wpis, ze "zapisy dzialaja", byl przedwczesny - probny upsert przeszedl, bo
trafil w istniejaca strone, a kazdy nowy zapis nadal leci na `AtlasError`.

**Co z tego dziala, a co nie (sprawdzone na produkcji):**
- Strona, strony dostawcow, korpus: **dzialaja**.
- Skan: **dziala i zwraca pelna karte**, ale z `saved: false` i zdaniem, ze trwaly link nie
  bedzie dzialal. Pomiar jest produktem; zapis nadaje mu adres.
- `/api/health`: **`degraded`, 503, `writable: false`** i dokladny powod w tresci.
- Zapis na monitoring, lead, reseed: **przepadaja**.

**Trzy naprawy, ktore ta awaria wymusila, wszystkie wdrozone:**
1. `funnel.catchAll.bodies` nie ida juz do bazy (185 kB -> ~5 kB na raport). To byla przyczyna.
2. **`collections()` czekalo na `createIndex`, a to jest zapis.** Przy pelnej bazie wywalalo to
   KAZDA operacje, takze odczyt: health padal, prerender `/methodology` padal, **build sie nie
   kompilowal**. Pelna awaria z powodu uprzejmosci startowej dla indeksow, ktore istnieja od
   miesiecy. Teraz blad idzie do logu i proces leci dalej.
3. Health wie, czy baza przyjmuje zapisy. Wczesniej mowil "ok" przez cala noc odrzuconych zapisow.

**Stara tresc tej sekcji (nieaktualna, zostawiona dla porzadku):** zapisy dzialaja, sprawdzone zapisem probnym i odczytem. Klaster liczony
przez `collStats`: **2327 MB z 5120**, z czego equity-analyst 1568 MB, stackpick 759 MB. Atlas
liczy przydzielone pliki, nie zywe dane, wiec jego licznik i ten moga sie roznic; przy 5121/5120
blokowal, teraz nie blokuje. **Nie mam pewnosci, czy to compaction po stronie Atlasa, czy
opoznienie licznika** - i to jest powod, zeby nie uznawac sprawy za zamknieta.

**Klaster jest WSPOLDZIELONY z innym projektem Krystiana** (bazy `equity-analyst`: `news_items`
246 MB, `forecast_accuracy` 26 MB, ...). StackPick zajmuje ~760 MB z 5 GB, reszta nalezy do
tamtego projektu. To znaczy, ze sam StackPick nie moze zwolnic wystarczajaco duzo, jesli tamten
projekt tez rosnie.

**Przyczyna po naszej stronie, znaleziona i NAPRAWIONA na przyszlosc:** kazdy raport nosil
`funnel.catchAll.bodies`, czyli surowe strony pobrane przez sonde sciezek-bzdur. **180 kB z 185 kB
raportu.** Sonda potrzebuje ich w trakcie skanu, zeby odroznic prawdziwy plik od szablonu, ktory
odbija sciezke; **nic ich nie czyta pozniej**. 21 040 raportow, 97 procent kolekcji to rusztowanie.
Commit `9bdf31a` usuwa je na granicy zapisu, dla kazdego pisarza wlacznie z cronem. Nowy raport
wazy ~5 kB zamiast 185.

**CZEGO NIE ZROBILEM I DLACZEGO: kasowania danych z produkcyjnej bazy.** Po ustapieniu blokady
nie jest juz pilne, ale zostaje jako sprzatanie i jako zapas na przyszlosc. To operacja
destrukcyjna, a guardrail mowi wprost, ze takie wymagaja zgody. Liczby sa policzone i gotowe:

| co | ile | uwaga |
|---|---|---|
| razem raportow | 21 040 | 752 MB |
| skany odwiedzajacych (`seeded: false`) | 1 719 | **NIE RUSZAC**, obiecalismy trwaly link |
| nasze najnowsze na domene (korpus) | 170 | to publikujemy |
| **nasze przedawnione reseedy** | **19 140** | **do skasowania, zwalnia ~684 MB** |

Gotowe polecenie (do uruchomienia po zgodzie Krystiana), kasuje wylacznie nasze wlasne
przedawnione pomiary, zostawia kazdy skan odwiedzajacego i najnowszy wiersz kazdej domeny:
`db.reports.deleteMany({ seeded: true, $nor: [ ...najnowszy (domain, scannedAt) dla kazdej domeny ] })`

**Alternatywa bez kasowania:** platny tier w Atlasie. To tez decyzja Krystiana (pieniadze).

**Co zostalo do zrobienia po incydencie:** pelny reseed 9.9, bo poprzedni przerwal sie w polowie
i korpus jest mieszanka 9.8 i 9.9. Teraz jest tani: raport wazy ~5 kB zamiast 185, wiec caly
reseed dopisuje ~2 MB zamiast ~60.

**Czego to uczy poza samym bugiem:** przez dziewiec reseedow tej nocy nikt nie patrzyl na rozmiar
bazy, bo nic tego nie mierzy. Nie mamy zadnego alertu ani liczby na `/api/health` o zajetosci
klastra. **Kandydat na nastepna robote:** `store` w healthchecku zwraca "readable", a nie wie nic
o tym, czy jest "writable".

## W locie w tej chwili (2026-08-13) - RESEED 9.9 PRZERWANY, PATRZ WYZEJ

**Korpus: 170 wierszy na formule 9.8, audyt czysty (0 rozjazdow, 0 sprzecznosci), drzewo czyste.**

### Runda 9.8: pusta skorupa nie jest dokumentacja. Pozycja 2 z listy ZAMKNIETA

Cztery checki czytaja te sama strone (`docs_without_js`, `machine_readable_api`,
`programmatic_provisioning`, `user_agents_allowed`), wiec **jeden zly wybor strony to cztery zle
werdykty**, a jedna naprawa rusza cztery naraz.

**Prawdziwa przyczyna byla linijke wyzej niz wskazywal audyt.** Audyt mowil, ze pusty szkielet na
`docs.<domena>` wygrywa rankingiem. To prawda, ale u crowdin.com nie o to chodzilo: sonda
subdomen **przerywala szukanie**, gdy `docs.crowdin.com` odpowiedzialo, wiec
`developer.crowdin.com` (8 431 znakow) nigdy nie trafial na liste kandydatow. Naprawione oba:
sonda nie przerywa na pustce, a lider bez tresci przegrywa z najwyzej ocenionym kandydatem, ktory
tresc ma (`bestReadable`, przetestowane bez sieci).

**Zasada zachowana:** tresc nadal niczego nie porzadkuje, tylko zrywa remis, w ktorym lider nie ma
nic. `twilio.com/en-us/developers` ma wiecej prozy niz `twilio.com/docs`, gdzie lezy strona o
kluczach, wiec gdyby tresc decydowala, wybieralibysmy folder marketingowy.

**Diff (0,67 procent, 11 dostawcow, 17 werdyktow), przewidywanie trafione co do skali i kierunku:**
- crowdin.com: **trzy checki w gore naraz** (llms_txt, docs_without_js, provisioning).
- scrapingbee.com: dwa **falszywe oskarzenia** zniknely (docs_without_js i user_agents_allowed;
  jego 403 dla nazwanych agentow byl na pustym hoscie `docs.`, nie na dokumentacji).
- mongodb.com, dynadot.com, deepl.com, kinde.com, medusajs.com: w gore.
- locationiq.com i stytch.com spadly i **odbudowaly sie w pojedynczym skanie** - szum.
- vonage.com: 403 i dla nas, i dla Chrome, wiec niemierzalne i to jest poprawne.

**pandadoc.com wart osobnego zdania:** u niego KAZDY kandydat jest szkieletem, wiec szkielet
zostaje. To ustalenie o nich, nie luka u nas.

**ZNANY, NIENAPRAWIONY WIERSZ: postmarkapp.com.** Po szostym reseedzie tej nocy jego strona
odpowiada nam statusem 0, wiec `programmatic_provisioning` jest niezmierzone, a
`machine_readable_api` oblane. **Sprawdzone recznie: postmark nadal serwuje naglowek
`link: </swagger/server.yml>; rel="service-desc"` i spec odpowiada 200.** To nasze obciazenie, nie
ich blad. **Do zrobienia: pojedynczy skan konsola, gdy ucichnie.** Trzeci raz tej nocy ten sam
dostawca degraduje sie na naszym ruchu - to jest ta zapisana lekcja w praktyce.

**Stan checkow po 9.8** (porownanie z 9.2 w nawiasach): `programmatic_provisioning` fail **32**
(bylo 77), `docs_without_js` fail **2** (bylo 11), `llms_txt` fail **36** (bylo 47),
`user_agents_allowed` fail **3** (bylo 5), `signup_reachable` fail 85 (bylo 88).

### Runda po 9.5: "menu nie jest zdaniem" (9.6 -> 9.7), pozycja 1 z listy otwartych ZAMKNIETA

Kazda regula provisioningu opiera sie na pojeciu zdania, a `visibleText` zamienial kazdy tag na
spacje, wiec nawigacja byla jednym nieprzerwanym ciagiem bez kropki. Reguly czytaly spisy tresci
jak proze. Nowa redukcja `visibleProse` zamienia granice blokow na kropki, **tylko dla
provisioningu**; heurystyki cennikowe licza znaki zapytania i przyciski na strukturze strony i
wstawianie im kropek zmienialoby inny pomiar przy okazji naprawiania tego.

**Dwa przebiegi, bo pierwszy byl za szeroki, i to jest lekcja rundy:**
- **9.6** traktowal takze `p`, `div` i `h1-h6` jako granice. Przewidywanie sprawdzilo sie co do
  liczby (12 wierszy, jeden check, wszystkie w dol, zakres mowil 4-12). **Gdybym poprzestal na
  liczbie, uznalbym to za sukces.** Przeczytanie tych dwunastu pokazalo druga cene: naglowek nie
  jest granica, tylko podmiotem zdania pod nim. mux.com ma "Create a signing key" w naglowku i
  `POST /system/v1/signing-keys` w tresci; stytch.com i meilisearch.com tak samo.
- **9.7** zawezil granice do tagow budujacych listy, menu i tabele (`li td th tr option dt dd nav
  menu`). Zmierzone lokalnym skanerem PRZED wypuszczeniem. Diff potwierdzil: **7 wierszy
  odzyskalo fraze** (elastic.co, honeycomb.io, maptiler.com, meilisearch.com, mux.com,
  stytch.com, tolgee.io), a cloudflare.com i telnyx.com zostaly na dole, bo ich dowod **naprawde**
  byl nawigacja. telnyx.com serwuje 409 kB identycznego szkieletu SPA pod kazdym adresem
  dokumentacji, wiec nie ma tam prozy do przeczytania.

**Lekcja do zapamietania: zmiana reguly ma dwie ceny, a korpus pokazuje tylko te, ktorej
szukales.** Liczba i kierunek sie zgadzaly, a polowa ruchu byla szkoda. Czytaj wiersze, nie
podsumowanie.

**Znane, nienaprawione po tej rundzie:** cloudflare.com prawie na pewno dokumentuje programowe
tworzenie tokenow, a my go teraz niedoszacowujemy, bo prawdziwe zdanie nie znalazlo sie na
zadnej z 8 przeczytanych stron. To problem **doboru stron**, nie dopasowania: pozycje 2 i 4 nizej.

**Stan checkow po 9.7** (dla porownania z 9.2, gdzie provisioning mial 77 oskarzen):
`programmatic_provisioning` pass 27 / partial 50 / **fail 34** / unmeasured 59.
`docs_without_js` fail 5 (bylo 11). `llms_txt` fail 37 (bylo 47). `answers_plain_request` fail 4.

**Krystian wyjechal na weekend i zlecil prace autonomiczna do poniedzialku.** Cel jego slowami:
"poprawa jakosci danych az do zadowalajacych efektow" i "musimy byc gotowi na prawdziwych
klientow". Watchdog chodzi co 30 minut.

**Glowny wynik nocy, jedna liczba:** `programmatic_provisioning` oskarzen z **77 spadlo do 31**,
a 61 wierszy jest teraz uczciwie oznaczonych jako niezmierzone. Przestalismy oskarzac 46 firm o
brak czegos, czego nigdy nie szukalismy. `docs_without_js`: 11 -> 5 oskarzen. `llms_txt`: 47 -> 38.

**NASTEPNY KROK: pozostale rekomendacje z audytow (nizej), albo platnosci, gdy Krystian
zdecyduje.** Zadna regula nie czeka niewdrozona, nic nie jest w polowie.

### Jak przebiegla noc: 9.2 -> 9.3 -> 9.4 -> 9.5, trzy reseedy

Trzy podbicia wersji w jedna noc nie sa porazka procesu, tylko jego dzialaniem. Za kazdym razem
powod byl ten sam: **rows measured by two different scanners under one version string** to
dokladnie to, przed czym ta stala chroni.
- **9.3** zabity w polowie reseedu, bo recenzja diffu znalazla 5 defektow w kodzie, ktory ten
  reseed wlasnie mierzyl.
- **9.4** przeszedl caly, diff potwierdzil **20 z 22 przewidzianych wierszy**, ale pokazal dwie
  moje regresje (nizej).
- **9.5** to wycofanie jednego wzorca; diff 0,82 procent, blisko podlogi szumu.

### Czego nauczyl reseed, a czego nie moglby zaden audyt statyczny

**Dopiero reseed pokazuje, na CZYM regula sie dopasowala.** Dwie rzeczy wyszly tylko tak:
1. **Wzorzec "API nazwane od poswiadczenia" trafial na menu nawigacyjne.** U mapbox.com
   dopasowany tekst to `Creating and managing access tokens | Mapbox Account Dashboard | Mapbox
   Tokens API | Rotating access tokens`, czyli spis tresci. `SAME_SENTENCE` konczy sie na ". ",
   a rozebrana z tagow nawigacja nie ma kropek. **Mapbox jest prawdziwym trafieniem co do
   meritum i to czyni ten blad najgrozniejszym: werdykt sluszny, dowod pod nim to spis tresci.**
   Wzorzec wycofany, nie uszczelniony. **To jest znana, nienaprawiona slabosc `SAME_SENTENCE`
   dla wszystkich pozostalych wzorcow provisioningu** - kandydat na osobna runde.
2. **Preferowanie kandydata z formularzem wybralo u mux.com formularz newslettera.** Newsletter
   to najlatwiejszy formularz do wyrenderowania bez JS na dowolnej stronie marketingowej, wiec
   ta preferencja znajduje go za kazdym razem. Naprawione filtrem
   `NOT_WHERE_ACCOUNTS_ARE_MADE` (newsletter, subscribe, contact, demo, waitlist, blog, events,
   webinars). Po naprawie mux wrocil do uczciwego `fail`.

**Przewidywanie wycofane niesluszne (moja pomylka):** skreslilem `datadoghq.com:signup_reachable` z listy na
rade recenzenta, ktory sprawdzil strone glowna i cennik i nie znalazl zadnego pasujacego linku.
**Ruszylo sie mimo to** - skan czyta wiecej zrodel niz dwie strony. Lekcja: recenzent tez
probkuje.

**Potwierdzona stara lekcja:** postmarkapp.com stracil dwa checki na 429 w trzecim reseedzie tej
samej nocy. Pojedynczy skan po przerwie odbudowal oba. **Reseed rate-limituje sam siebie i
wyglada to jak blad reguly.**

### Co weszlo do formuly (9.3 -> 9.5), kazde z testem w `scripts/rules.mts`
- `programmatic_provisioning`: jesli **zadna** przeczytana strona nie jest o kluczach, check jest
  niemierzalny zamiast zerowy. **To jest ta zmiana warta 46 wierszy.**
- `llms_txt`: jeden martwy link na dwanascie nie kasuje punktu, ale **proporcjonalnie**: 1 na 1
  albo 3 na 11 nadal oblewa.
- `answers_plain_request`: strony z challenge pytane jako ChatGPT-User i Claude-User przed
  napisaniem "no agent reaches the site at all". bitmovin.com dostawal to zdanie i bylo falszywe.
- `docs_without_js`: prog skorupy 2000 -> 500 znakow.
- `user_agents_allowed`: 404 przestal byc odmowa.
- `signup_reachable`: kandydat wybierany po tym, czy renderuje formularz; szersze hinty; nowy
  filtr sekcji. Poprawione `why`, ktore obiecywalo porownanie z przegladarka, ktorego nie robimy.
- `CREDENTIAL` i `CREDENTIAL_PAGE_HINTS`: pisownie, ktorych nie znalismy (access key, service
  token, signing key, license key). **Bez** golego `token`, bo lapal `/docs/tokenizer` i
  `/docs/design-tokens`.
- Ranking: podloga porownywalnosci liczona wobec tego, czego **nie dalo sie odczytac**, nie
  wobec tego, co **nie dotyczy**. 20 wierszy ponizej progu (12 procent korpusu).
- Cron monitoringu: **nie wysyla maila, gdy zmienila sie wersja formuly.** Bez tego pierwszy mail,
  jaki kilka osob by od nas dostalo, mowilby, ze ich strona stracila punkty, a zmienilismy reguly.

### Produkt (prosby Krystiana z piatku, obie zrobione)
- **Naglowek landingu** mowi, czym to jest: "Find out where an AI agent gets stuck on your
  product, before it quietly picks somebody else".
- **Cennik przestal straszyc**: 0 USD (skan), 99 USD/mies. (monitoring, dzis darmowy i tak
  napisane), audyt "po rozmowie". Pieciocyfrowe kwoty zniknely z gory strony.
- **Cron monitoringu wreszcie kogos ma**: GitHub Actions, codziennie 4:17, petla az do zera.
- **Cala petla przetestowana end to end** na wlasnych skrzynkach: formularz, mail, potwierdzenie,
  przeskan, wypisanie sie.
- Cache korpusu (5 min), sciezka sprostowania na kazdej stronie `/v/<domena>`.

**Blokada na Krystianie: Stripe czy Paddle** (decyzja ksiegowa, nie techniczna). Nie blokuje
przyjmowania uzytkownikow, bo monitoring jest darmowy i strona to mowi.

**Zrobione mimo blokady bazy, czesc druga: trzy sciezki zapisu w drodze odwiedzajacego nie mialy
odpowiedzi na nieudany zapis.** Przez kilka godzin oznaczalo to 500 i komunikat "try again in a
moment", czyli obietnice, ktorej nie moglismy dotrzymac.
- `/api/watch`: mowi teraz wprost, ze nic nie zostalo zapisane, zaden mail nie poszedl, i podaje
  adres. Kolejnosc byla juz dobra (zapis przed mailem), wiec nikt nie dostal linku
  potwierdzajacego do wiersza, ktory nie istnieje. Sprawdzone na produkcji: 503 z ta trescia.
- `/api/lead`: **odwrocone**. Zapis leada to nasza ksiegowosc, a wyslanie raportu to rzecz,
  o ktora czlowiek poprosil, wiec lead, ktory sie nie zapisze, idzie do logu, a mail wychodzi.
- Licznik odwiedzin juz wczesniej nie przewracal strony, zostawiony.

**Zrobione mimo blokady bazy (skan dziala, tylko sie nie zapisuje):** adresy rejestracji
przestaly cytowac dostawcom ich wlasny tracking. 12 z 85 opublikowanych oskarzen nosilo
`?ref=nav`, `?utm_source=...`, `?_gl=...`, `?cta=Get+Started`. Werdykt byl prawdziwy i
nieodtwarzalny naraz. Parametry funkcjonalne zostaja (`?plan=free`, `?module=fme`), parametry
w hashu SPA tez sa czyszczone. **Bez podbicia formuly:** zaden werdykt ani punkt sie nie zmienia,
a podbicie oznaczyloby 170 stron jako przedawnione bez mozliwosci reseedu.

### Rekomendacja w sprawie kasowania (pytanie Krystiana, 2026-08-13)

**ODRADZAM kasowanie na teraz.** Pomiar:
- nasze kolekcje: **757 MB plikow** (2311 MB zywych danych, kompresja ~3x), equity-analyst 1501 MB,
  razem **2258 MB**. Atlas naliczal **5121 MB**. Czyli **~2,8 GB to cos, czego nie widze** i na co
  nie mam uprawnien: prawie na pewno oplog (baza `local`).
- Blokada **koreluje z reseedem, nie z iloscia danych**: ustapila gdy zatrzymalem reseed, wrocila
  gdy wznowilem. Licznik zszedl 5121 -> 5120 przez 40 minut ciszy, wiec cos sie saczy samo.
- **Kasowanie jest zapisem.** 19 140 usuniec to 19 140 nowych wpisow do oploga, czyli do tego, co
  prawdopodobnie jest pelne. Moze przedluzyc blokade zamiast ja skrocic. Zwolnilo by najwyzej
  690 MB z 757 MB naszych kolekcji, czyli cwierc problemu.
- Przyczyna po naszej stronie **jest juz naprawiona**: raport 185 kB -> 5 kB, 36x mniej ruchu.

**Kolejnosc dzialan:** (1) Krystian zaglada do konsoli Atlasa i patrzy na rozbicie zajetosci, bo
tylko tam widac oplog; (2) jesli to jednak nasze kolekcje, kasujemy **partiami z przerwami**,
wlasnie dlatego ze kasowanie jest zapisem; (3) niezaleznie: klaster dzielony z equity-analyst,
ktory zajmuje dwa razy wiecej niz StackPick, wiec 5 GB bedzie wracac.

### Skutek uboczny blokady: korpus rozbity na dwie wersje

Przerwany reseed 9.9 zostawil ~75 wierszy na 9.9 i 95 na 9.8. `publishedCorpus` publikuje
wiekszosc, wiec **strona pokazuje 95 dostawcow zamiast 170**, a strony wierszy 9.8 nosza baner
"measured under an older formula" i sa poza indeksem. **Audyt czysty: 0 rozjazdow**, bo wszystkie
liczby licza sie z korpusu, wiec nic nie jest falszywe, tylko mniejsze.

**DECYZJA: zamrazam zmiany w skanerze do czasu odblokowania zapisow.** Kazda kolejna zmiana
formuly powieksza rozjazd, ktorego nie da sie zamknac bez reseedu. Jeden reseed po odblokowaniu
naprawia wszystko naraz.

### Ostatnie klamstwo w produkcie, i bylo w najgorszym miejscu (2026-08-13)

Strona skanuje przez `/api/scan/stream`, a ta trasa zapisywala raport **przed** ogloszeniem
wyniku. Przy zablokowanych zapisach odwiedzajacy ogladal **wszystkie piec krokow konczacych sie
pomyslnie**, a potem dostawal "The scan failed. Try again in a moment." Oba czlony falszywe: skan
sie udal, a probowanie za chwile nic nie da. **To glowne wezwanie do dzialania na calej stronie.**

Teraz dostaje swoja liczbe i prawde: *"val.town scored 10 of 16, and we could not store the
result, so it has no page. That is our problem and not yours: write to hello@letagentsin.com and
we will send it to you."* Sprawdzone na produkcji.

**Szesc sciezek zapisu, szesc uczciwych odpowiedzi:** JSON API, zapis na monitoring, mail ze
scorecardem, strumien skanu, **potwierdzenie obserwacji i wypisanie sie**. Dwie ostatnie znalazlem
czytajac kod, nie testujac: obie pisza do bazy i obie renderowalyby strone bledu. Przy
potwierdzeniu to czlowiek, ktory wlasnie kliknal nasz link i nie dowiaduje sie, czy zadzialalo.
Przy **wypisaniu sie jest gorzej**: patrzy na crash i nie wie, czy przestaniemy do niego pisac,
a to jedyna rzecz, co do ktorej unsubscribe nie moze byc dwuznaczny. Strona wypisania **zaklada
teraz najgorsze na jego korzysc** ("musimy zalozyc, ze nadal jestes na liscie") i proponuje
zrobienie tego recznie dzisiaj. **Wzorzec wart zapamietania: kazda z nich robila
zapis w drodze uzytkownika i zadna nie miala odpowiedzi na nieudany zapis.** Awaria byla lepszym
audytorem niz cztery audyty, ktore zamowilem.

### Mail ze scorecardem tez nigdy nie byl otwarty na telefonie (2026-08-13)

Brak `meta viewport`, wiec klienci pocztowi ukladajacy w szerokosci desktopowej oddalali cala
karte i podawali komus wynik w nieczytelnej wielkosci. Do tego 32 px paddingu z kazdej strony
karty 560 px i **brak lamania dlugich tokenow**, czyli dokladnie ten sam blad, ktory strony
dostawcow mialy do dzis rana: cytowane zdania nosza nasz wlasny user-agent i adresy dostawcy.
Naprawione, zweryfikowane wyrenderowaniem prawdziwego zapisanego raportu przez szablon.

**Zdanie warte zapamietania:** mowimy dostawcom, ze ich rejestracja ma dzialac bez przegladarki,
a sami nigdy nie otworzylismy wlasnego maila na telefonie.

### Monitoring produkcji: cos wreszcie patrzy (2026-08-13)

`.github/workflows/health.yml`, co godzine. Sprawdza trzy rzeczy i **oblewa**, gdy ktorakolwiek
nie gra, a oblany workflow wysyla maila do wlasciciela repo, czyli to jest caly system alertowania
i kosztuje zero:
1. `/api/health` musi byc `ok` **i** `writable`;
2. `/corpus.json` musi miec **co najmniej 150 wierszy** (przerwany reseed zabral nam 170 -> 95
   nie generujac ani jednego bledu nigdzie w systemie);
3. skan `example.com` musi wrocic z kartą wynikową.

**Sprawdzone: uruchomiony recznie, oblal i podal powod** ("store is degraded, writable=false: you
are over your space quota"). **UWAGA: bedzie wysylal maila co godzine, dopoki baza jest pelna.**
To alert dzialajacy poprawnie w trakcie prawdziwej awarii, a nie halas do wyciszenia.

### Widok mobilny sprawdzony po raz pierwszy (2026-08-13)

**Kazda strona dostawcy przewijala sie w poziomie na telefonie, a winny ciag byl NASZ.** Bare `1fr`
to `minmax(auto,1fr)`, wiec kolumna rozpycha sie do najdluzszego niepodzielnego tokenu. Tym tokenem
jest nasz wlasny user-agent: kazda karta zaczyna sie od "Answered 200 to LetAgentsIn/1.0
(+https://letagentsin.com/methodology)", **274 px monospace w kolumnie majacej 223**. Dotyczylo to
170 stron dostawcow i kazdego raportu ze skanu.

Naprawione: `minmax(0,1fr)` + `wrap-anywhere`. **Zweryfikowane pomiarem, nie zrzutem:** szerokosc
minimalna zdan werdyktu spadla z 274 px do **10 px**, przy budzecie 247 px na 375 px.

Pozostale szesc znalezisk: trzy z czterech pol formularza mialy 14 px, a **iOS przybliza strone,
gdy pole ma mniej niz 16 px, i nie oddala jej z powrotem** (jedno z nich to formularz monitoringu,
czyli zapis na rzecz, za ktora bierzemy pieniadze); komorka wyniku ma 56 px i renderuje slowa "not
measured"; przyciski udostepniania mialy 32 px, a nawigacja 16 px celu dotyku, na stronie, ktorej
caly sens to bycie przekazana dalej; naglowek etapu na `/methodology` byl czteroelementowym
rzedem bez zawijania; domena w `h1` nie ma gdzie sie zlamac.

**Metoda warta powtorzenia:** audyt przez **czytanie kodu** (subagent, ~150k tokenow JEGO kontekstu)
zamiast przez zrzuty ekranu (~390k MOJEGO w poprzedniej rundzie). Weryfikacja przez zmierzenie
`min-content` w konsoli zamiast ogladania: trzy wywolania zamiast kilkunastu zrzutow. Rozszerzenie
Chrome i tak renderuje w stalej szerokosci 1440, wiec zrzuty **nie odpowiedzialyby na to pytanie**.

**Otwarte, nienaprawione, w kolejnosci wagi:**
0. **BAZA: Atlas pelny, zapisy odrzucane. Decyzja Krystiana** (kasowanie 19 140 przedawnionych
   raportow ~684 MB, albo platny tier). Do tego czasu: brak reseedu, korpus jest mieszanka 9.8
   i 9.9, skany dzialaja ale nie maja trwalego linku.
1. **Wybor hosta dokumentacji**: `docs.<domena>`, ktory jest pusta skorupa, wygrywa z prawdziwa
   dokumentacja (crowdin.com, scrapingbee.com).
2. **Probkowanie stron dla `docs_without_js`** dziedziczone po hintach pisanych dla provisioningu.
2. **llms.txt jako indeks stron do czytania** (Modal wskazuje w nim dokladnie te strone, ktorej
   nam brakuje). Zero dodatkowych pobran na odkrycie.
3. **Potwierdzanie odmowy na drugim URL-u** przed publikacja `user_agents_allowed: fail`.
4. Jedno dyno, widok mobilny niesprawdzony, nie mierzymy czy strona uniesie crawl.

**Koszty kontekstu (zmierzone):** audyt w przegladarce ~390k tokenow (39 procent okna) w
kilkanascie wywolan - **najdrozsza rzecz, jaka robimy**. Cztery audyty subagentami tej nocy:
~580k tokenow **ich** kontekstu, do mnie wrocily cztery raporty po kilka tysiecy. Subagent do
audytu jest tani, przegladarka nie.

## Stan na teraz, w dziesięciu liniach

- Produkt nazywa się **Let Agents In** od 2026-08-10 i od 2026-08-12 stoi na
  **`https://letagentsin.com`**. Nazwa apki na Heroku (`stackpick`) i repo zostają, bo zmiana
  nic nie kupuje. User-agent skanera to `LetAgentsIn/1.0 (+https://letagentsin.com/methodology)`.
- Formuła **9.2**, korpus **170 domen w 25 kategoriach**, **15 checków**, **17 punktów na papierze**.
  `npm run audit` pilnuje **17 liczb i 3 twierdzeń nazywających firmy**, przy **0 sprzecznościach**,
  czyli każdą liczbę liczoną z danych, która trafia na publiczną stronę, i trzy zdania obok nich.
- **Podłoga szumu korpusu: 0,20 procent** (5 zmian na 2550, ta sama formuła po obu stronach),
  mierzona cztery razy: **0,64 → 0,27 → 0,39 → 0,20**. Spadek nie jest wygładzaniem: między dwoma
  ostatnimi leżą trzy poprawki tego, co liczyliśmy jako szum internetu, a było nasze (ucięte skany,
  brzeg połykający POST-y, „nie dotyczy" dla firm z cennikiem). Liczba żyje jako
  `NOISE_FLOOR_PERCENT` w `src/lib/published.ts` i czytają ją `/methodology` oraz `/report`.
- Jedenaście przebiegów adwersaryjnych: **16,7 → 2,2 → 3,9 → 2,0 → 0,94 → 7,9 → 1,4 → 1,29 → 0,77 →
  0,39 procent**, jedenasty bez wspólnej metryki. Noc 2026-08-12 (rundy 115-139) była dwunastym
  przebiegiem prowadzonym inaczej: **każda zmiana reguły szła z przewidywaniem spisanym wiersz po
  wierszu**, a `npm run diff-corpus` sprawdzał je po reseedzie. Sześć reseedów, przewidywania
  sprawdziły się **5/5, 0/0, 1/1, 1/1, 32/32**, a każda niespodzianka poza listą była czytana
  pojedynczo. Tak znalazły się: karta MCP telnyx, brzeg połykający POST-y u czterech dostawców,
  „nie dotyczy" u szesnastu firm z cennikiem i wildcard DNS hovera.
- Opublikowane liczby: **5 ze 170** przechodzi wszystkie trzy bariery, **42 jest o jeden wymóg od
  tego** (w nocy 5 → 7 → 5: poszerzenie `programmatic_provisioning` dodało dwóch, a wymóg markera
  programowego zabrał ich i jeszcze jednego), **19 z 68** publikujących endpoint rejestracji ma grant, który agent dokończy bez
  człowieka, **0 ze 170** serwuje agentom mniej tekstu niż przeglądarce.
- **67 żywych serwerów MCP, 52 z nich publikuje RFC 7591** (68 w całym korpusie). DCR przyszło
  z wymogu specyfikacji MCP, nie z decyzji o wpuszczeniu agentów, a dwie trzecie tych drzwi i tak
  wymaga człowieka.
- Odmowy rejestracji wymierzone w agenty: **0 udowodnionych na 170**. Bariera, którą umiemy
  udowodnić, to **88** formularzy rejestracji, które bez JavaScriptu nie renderują niczego.
- **Trasowanie `find_providers` to najsłabszy element produktu: 59,3 procent błędu** na 59 pytaniach
  napisanych przed przeczytaniem reguł (`npm run routing-fresh`, runda 126). Wcześniejsze „20
  procent" pochodziło z czterech pytań. Odpowiada na 27 z 59 i 8 z tych odpowiedzi jest złych;
  **cała ta liczba jest w opisie narzędzia MCP**. Mechanizm jest u sufitu: próg i profil zbudowany
  z opisów dostawców zmierzone i odrzucone (runda 127). `scripts/routing.mts` (149 pytań) jest
  zapadką, nie progiem, i cały jest spalony strojeniem.
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

**Stan 2026-08-15 (po 9.17): dwudziesty przebieg byl przegladem wlasnej zmiany punktacji i jako
jedyny do tej pory zatrzymal commit przed wdrozeniem.** Wniosek do powtarzania: przy zmianie regul
punktacji recenzent ma **odtworzyc nowy algorytm na prawdziwych danych z korpusu i policzyc, ile
wierszy zmienia werdykt oraz ktore z tych zmian sa falszywe**, a nie czytac kod. Czytanie kodu nie
wykrylo zadnego z trzech bledow, ktore razem zabralyby punkt szesciu niewinnym vendorom.

**Stan 2026-08-15: wszystkie 15 checkow ma udokumentowany przebieg adwersaryjny.** Przebiegi 14-19
(14.08) objely `mcp_present`, 736 publikowanych adresow, `machine_readable_api`, `signup_no_captcha`,
`llms_txt`, `typed_package` i `self_serve`: **okolo 900 werdyktow, 1 blad w danych** (`statsig.com`,
naprawiony w 9.13). Wczesniejsze przebiegi 1-13 sa opisane w dzienniku rund.

**Co z tej listy zostalo naprawde:**

1. **Blokery po stronie Krystiana** - **zostaly TRZY, nie piec** (domena i nadawca w Resend zrobione,
   patrz przejrzana sekcja „Zablokowane na Krystianie"): sciezka zakupu inna niz `mailto:`, nazwanie
   licencji korpusu, decyzja o modelu sprzedazy. **Agent tego nie rozstrzyga.**
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

**Stan 2026-08-15: lista ponizej jest historia zamknietych pozycji.** Otwarte i wykonalne przez
agenta:

- ~~**429 z naszej winy psuje werdykty w korpusie**~~ **zrobione 2026-08-15 (v401)**: reseed zamiata
  je po odczekaniu, `split.io` wrocil z 6/12 na 10/15. Rozroznienie dziala w obie strony, patrz
  sekcja u gory.
- ~~**contentful.com z pieciopunktowa dziura przez 429**~~ **zrobione 2026-08-15 (9.18)**: to nie
  byl limit tempa, tylko tryb ataku Vercela podany jako 429. Patrz sekcja u gory.
- ~~**punkt wejscia szukany tylko w korzeniu witryny**~~ **zrobione 2026-08-15 (9.19)**: sondujemy
  takze host dokumentacji, 17 falszywych oskarzen. Patrz sekcja u gory.
- **Otwarte, w kolejce, nie wymaga niczyjej decyzji:**
  1. Po reseedzie: `npx tsx scripts/audit-entry.mts accused` i sprawdzic, czy 21 niezgodnosci
     zeszlo do zera. To weryfikacja tego, co wlasnie wypuscilismy.
  2. ~~**22. przebieg adwersaryjny: `oauth_dcr`**~~ **zrobione (9.21)**: trzy falszywe zdania,
     zero zmian w punktacji. Patrz sekcja u gory.
  3. ~~**23. przebieg**~~ **zrobione**: poszedl na `signup_reachable` (88 oskarzen, nigdy nie
     audytowany), a nie na `mcp_present`, ktory mial juz przebieg 14. **Nic nie obalone.**
  4. ~~**24. przebieg: `mcp_present`**~~ **zrobione (9.22)**: piec falszywych oskarzen, naprawione
     przez zapytanie rejestru MCP. Patrz sekcja u gory.
  5. ~~**Do zrobienia po najblizszym reseedzie:** `audit-entry.mts` (czy 21 niezgodnosci zeszlo do
     zera)~~ **zrobione po przemiecie na 9.42: zero plikow na 455 sciezkach.** `npm run noise-floor`
     nadal czeka, bo wymaga dwoch przemiatow tej samej formuly w odstepie szesciu godzin, a my
     zmieniamy reguly czesciej.
  6. ~~**25. przebieg:** `machine_readable_api`~~ **zrobione**: 0 znalezisk, ale zrodlo mialo
     pokrycie 2 na 47, wiec wynik jest pusty, a nie uspokajajacy. Patrz sekcja u gory.
  7. **26. przebieg:** zanim wybierzesz check, **zmierz najpierw pokrycie zrodla prawdy** na
     naszym korpusie. Kandydaci bez zbadanego pokrycia: katalogi MCP inne niz oficjalny,
     `signup_no_captcha` (28 oskarzen) przez ponowne pobranie stron rejestracji.

Reszta wymaga decyzji Krystiana albo konta, ktorego agent nie zaklada:

- **Sciezka zakupu inna niz `mailto:`** i decyzja Stripe kontra Paddle. **Zaudytowane 2026-08-16:
  `krystiangw/agenticpay` tego NIE odblokowuje.** To mikroplatnosci per wywolanie narzedzia MCP
  (x402, USDC, Solana), nie bramka platnicza: kupujacy platny audyt to firma potrzebujaca faktury
  z VAT, hostowany facilitator chodzi na devnecie, a mainnet znaczy keypair platnika oplat na
  dynie, czyli nowa klase ryzyka. Projekt jest pre-alpha, choc porzadnie zaudytowany.
  **Nie wracaj do tego pytania przy okazji checkoutu.**
- **Kandydat obok, tani i wykonalny przez agenta, gdy Krystian powie „tak":** jedno platne
  narzedzie na naszym `/mcp` **wylacznie na devnecie**, jako demo z dowodem on-chain. Produkt,
  ktorego teza brzmi „wpuszczajcie agentow", zarabiajacy na agencie placacym bez czlowieka w
  petli, jest najmocniejsza demonstracja tej tezy. **Przychod planowac na zero**: agentow z
  zasilonym portfelem Solany i obsluga x402 jest dzis w naturze tyle co nic. Integracja nie jest
  darmowa, bo `@agenticpay/mcp-server` to Express z `paymentMiddleware`, a my jestesmy na Next.js
  App Router, wiec albo `@x402/core` w handlerze trasy, albo osobny proces.
- **Pomysl produktowy z tego samego audytu, do rozwazenia pozniej:** przyszly check w scorecardzie
  „czy agent moze ci zaplacic bez czlowieka". Dzisiejsza odpowiedz brzmialaby „prawie nikt nie
  moze", czyli to dokladnie ten rodzaj pustego pola, na ktorym zbudowalismy reszte produktu.
- **Publikacja w rejestrze MCP**: `server.json` gotowy w korzeniu repo, wymaga rekordu DNS.
- **Bing Webmaster Tools i trzy katalogi MCP**: wymagaja zalozenia kont. **Agent kont nie zaklada.**
- **Token do rejestru npm**: przy odmowie rejestru pojedyncze domeny zwracaja uczciwe „nie wiemy".
- **Pomiar progu szumu przebiegow agenta**: 150-400 USD wydatku na model na kategorie.
- **Filozofia punktacji bibliotek**: czy `mcp_present`, `llms_txt`, `agent_entry_point`
  i `machine_readable_api` maja dotyczyc bibliotek npm. Liczby i moja rekomendacja („zostawic jak
  jest") sa w sekcji o granicy „nie da sie" kontra „nie zrobili".

**Co agent moze wziac bez pytania, gdy lista wyzej stoi:** kolejny przebieg adwersaryjny na rodzinie
z najwieksza liczba oskarzen (kontrolka DWUSTRONNA obowiazkowa), albo pomiar podlogi szumu po
najblizszym reseedzie (`npm run noise-floor <formula>`).


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

  **Nietknięte i warte ataku:** ~~reguła `browser-only` w MCP~~ **przejrzana 2026-08-13, patrz
  niżej**, sondowanie `/api/mcp` poza tym jednym wierszem,
  ~~rozgałęzione `REMEDIES` w `fixfirst.ts`~~ **zrobione 2026-08-13, patrz niżej**,
  oraz `find_providers` na **świeżych** pytaniach,
  bo oba istniejące zestawy są spalone dostrajaniem.

- ~~**Rozgałęzione `REMEDIES`**~~ **zrobione 2026-08-13.** `npm run audit-remedies` generuje radę
  dla każdego vendora z żywego korpusu i **grupuje po zdaniu, nie po checku**: dopiero to pokazuje
  gałąź, której nikt nigdy nie wziął, a to inne ryzyko niż gałąź błędna. Dwa znaleziska, oba tego
  samego kształtu co dwa błędy zgłoszone wcześniej przez czytelników, czyli rada sprzeczna
  z werdyktem obok:
  - **`signup_reachable`, 85 vendorów**: zdanie kończyło się „and stop refusing non-browser
    requests to it", a 84 z 85 odpowiada 200 i jest osiągalnych. Nikt niczego nie odmawia.
    Komentarz przy samym checku mówi to od 9.2 („none of them was a 403"), rada trzy linijki niżej
    mówiła coś przeciwnego. Tania gałąź wysiłku była **martwa z konstrukcji**: formularz renderujący
    się bez JS zalicza check, więc `minutes` nie da się osiągnąć z wiersza, który oblewa.
  - **`answers_plain_request`, 3 vendorów**: contentful.com i pandadoc.com dostają 429 i dają 429
    przeglądarce, namecheap.com 403 do obu. Rada nazywała regułę wymierzoną w agenty, której dane
    nie pokazują, i kazała firmie **już zwracającej 429** „rate limit instead of refusing".
  - Predykcja zapisana przed zmianą i trafiona: 85 z 85 i 3 z 3 zmienia zdanie, **żaden wysiłek się
    nie rusza**, więc żaden plan nie zmienia kolejności i żaden wynik nie drgnął.
  - Rady **nie miały żadnych testów**. Obie poprawione gałęzie są przypięte w `scripts/rules.mts`
    i oba asserty sprawdzone na czerwono wobec zdań, które zastępują.

- ~~**MCP: reguła `browser-only` i klasa dowodu `rejects-get`**~~ **zrobione 2026-08-13.**
  Przelot po wszystkich klasach dowodu w korpusie: `challenges` 77, `answers-json` 18,
  `rejects-get` 3, **`browser-only` 0**.
  - **`rejects-get`, 3 wiersze, wszystkie fałszywe.** posthog.com, openrouter.ai i medusajs.com
    odpowiadały na JSON-RPC POST statusem 405 bez nagłówka `Allow`. Sprawdzone ręcznie: **tak samo
    odpowiadają na `/docs`, `/models`, `/pricing` i na własnej stronie głównej**, bo tak działa
    Next.js na Vercelu przy POST do statycznej trasy. Przesłanka reguły („strona serwująca tylko
    GET mówi o tym w `Allow`") jest na tym stacku fałszywa.
  - **Dlaczego przetrwało dwa wcześniejsze zwężenia tej samej reguły:** kontrolka jest ścieżką
    **nieistniejącą**, a ona nie umie ocenić 405. Odpowiada 404, albo 200 na SPA, więc **różni się
    od endpointu w obie strony**. Zadziałała dopiero kontrolka odwrotnego rodzaju: strona główna,
    czyli ścieżka na pewno otrasowana. Wszystkie trzy fałszywe trafienia mają tam identyczny 405,
    a wszystkie trzy prawdziwe serwery 404 albo 200. Koszt: trzy żądania na cały korpus, bo pytamy
    tylko przy kandydacie, który w ogóle odpowiedział 405.
  - **Predykcja była błędna i to jest jej najciekawsza część.** Zapowiedziałem trzy stracone punkty;
    dwa vendory punkt **zachowały i zmieniły adres**. openrouter.ai i posthog.com naprawdę mają
    serwery, na `mcp.openrouter.ai/mcp` i `mcp.posthog.com/mcp`. Strona dokumentacji sortowała się
    pierwsza wśród kandydatów i zostawała jako `live[0]`, więc **fałszywy 405 nie tylko dawał zły
    punkt, ale przesłaniał prawdziwy serwer i drukował zły adres**. Punkt traci sam medusajs.com.
  - **`browser-only` zostaje mimo zera adresatów.** Detektor wymaga 2xx, treści nie-HTML, frazy
    o CSRF/Referer i kontrolki, która tego nie mówi, więc jest wąski, nie niesolidny. Usunięcie go
    kazałoby prawdziwemu serwerowi tylko-dla-przeglądarki czytać się jako „nic nie odpowiedziało".
    **Ale nadal nie jest potwierdzony na żadnym rzeczywistym wierszu** i jego jedyny przypadek
    źródłowy (njal.la) okazał się fałszywy, więc nie traktuj go jako sprawdzonego.

- ~~**Trasowanie `find_providers` na świeżych pytaniach**~~ **zrobione 2026-08-13.**
  **Uwaga: zdanie „runda 105: 35 → 20 procent" myliło.** Te 20 procent dotyczyło zestawu
  `routing.mts`, spalonego dostrajaniem. Na zestawie odłożonym trasowanie miało **24 z 59**, czyli
  59 procent błędu. **Opublikowana liczba była przy tym uczciwa**: opis narzędzia MCP podawał
  dokładnie te wartości i pilnuje ich strażnik w buildzie. Mylące było streszczenie w STATE.md.
  - **Dwa błędy mechaniczne, nie słownikowe.** `stem()` wracał po pierwszej pasującej regule, więc
    liczba mnoga nigdy nie była też odmieniana: `embeddings` → `embedding`, a słownikowe
    `embedding` → `embedd`. **Dziesięć słów było nieosiągalnych w liczbie mnogiej**, m.in.
    embeddings, meetings, bookings, signings, tracings. Run raportował to jako „nic nie punktuje",
    co wskazywało na słownik zamiast na stemmer.
  - `sameTerm` dopuszczał różnicę jednego `e` (dla `geocoding` → `geocode`). Teraz zasługuje na nią
    tylko słowo, które stemmer faktycznie skrócił. `local` w „the local disk" to gołe słowo o jedno
    `e` od `locale` i punktowało lokalizację dziesięcioma punktami, remisując z file-storage.
  - **Wynik: 24 → 27 z 59 na zestawie strojonym, 31 → 31 z 58 na odłożonym.** Zero zysku poza
    zestawem, ale to są naprawy błędu i nic nie kosztują.
  - **ZMIERZONE I ODRZUCONE, nie powtarzaj bez nowego pomysłu:** czterdzieści słów dodanych do
    słownika (`scim`, `mfa`, `receipt`, `gpt`, `claude`, `token`, `retry`, `backoff`, `digest`,
    `bold`, `italic`, `toolbar`, `markdown`, `timezone`, `slot`, `recording`) plus usunięcie
    `model` z `llm-infrastructure`. **Zestaw strojony 27 → 34, zestaw odłożony 31 → 30.** Siedem
    punktów kupionych na pytaniach, które oglądałem, jeden stracony na tych, których nie. Do tego
    „odpowiedział, gdy powinien odmówić" wzrosło z 2 do 6. Kilka z tych słów jest wieloznacznych
    w sposób oczywisty po fakcie: **`token` to klucz API, `receipt` to paragon płatniczy, `digest`
    to mail zbiorczy, `markdown` to dokumentacja**. Następna próba powinna filtrować listę
    definicyjnie, PRZED pomiarem, i mieć własny świeży zestaw.
  - **`FRESH_QUESTIONS` jest od dziś spalony** (przeczytałem jego porażki i na nich naprawiałem).
    Miarą jest `HELD_OUT_2`, 58 pytań napisanych tego samego dnia przez subagenta, któremu
    zabroniono otwierać `lookup.ts` i skrypty routingu. Strażnik w buildzie i opis narzędzia MCP
    wskazują teraz na niego. `BURNED=1 npx tsx scripts/routing-fresh.mts` uruchamia stary zestaw
    jako regresyjny.
  - **Ograniczenie tego pomiaru, zapisane wprost:** liczby zbiorczej `HELD_OUT_2` użyłem raz, żeby
    zdecydować „zostawić czy wycofać dodania słownikowe". To jest wybór modelu na zbiorze
    odłożonym i lekko go nadgryza, choć znacznie mniej niż strojenie pytanie po pytaniu.
    Pojedynczych porażek tego zestawu **nie oglądałem**.
  - **Nadal otwarte:** dominującą porażką są **remisy 10-10**, gdzie jedno trafienie jest
    przypadkowe („stack traces … crashes" remisuje error-monitoring z observability, „slack, email
    or nothing" remisuje notifications z transactional-email). Reguła celowo odmawia rozstrzygać
    remisy. Obie hipotezy z rundy 105 (kanał dostawy wygrywa remis z dziedziną; `chrome` to słowo
    infrastruktury przeglądarkowej) **nadal nietestowane** i wymagają własnego świeżego zestawu.

- ~~**Sondowanie adresow MCP poza tym jednym wierszem**~~ **zrobione 2026-08-13.**
  `npm run audit-mcp-probes` ocenia kandydata po tym, na ilu wierszach byl **jedynym**, ktory
  cokolwiek znalazl, a nie po surowych trafieniach. `mcp.<domain>/mcp` jest jedyny na 27 wierszach,
  `mcp.<domain>` na 8, wersjonowany na 4, `api.<domain>/mcp` na 4, `<site>/mcp` na 2.
  **`<site>/api/mcp` nie znalazl niczego: zero na 170 wierszach korpusu i zero na 567 skanach
  odwiedzajacych.** Zostaje mimo to, bo dodano go po zgloszeniu czytelnika, ktoremu nazwalismy
  zywy serwer nieistniejacym, a nasz korpus to vendorzy z dedykowanym hostem `mcp.*`, czyli nie ta
  populacja. Pomiar jest zapisany przy samym kandydacie: to pierwsze zadanie do ciecia, gdyby
  budzet 27 sekund zaczal uwierac.

- ~~**llms.txt czytany jako mapa, nie jako znaczek**~~ **zrobione 2026-08-13, formula 9.12.**
  Najwazniejsze znalezisko tej rundy. Pobieramy `llms.txt` przy kazdym skanie i probkujemy jego
  linki, zeby sprawdzic, czy odpowiadaja, **po czym nigdy nie patrzymy, dokad prowadza**.
  - Zasieg: **143 ze 170 wierszy publikuje llms.txt, 142 z nich oblewa co najmniej jeden check
    o drzwiach dla maszyny, a 72 pliki nazywaja wprost adres o kluczach albo rejestracji.**
    `inngest.com` podaje `/platform/api-keys` i `/platform/signing-keys`, `bunny.net`
    `/docs/account/api-keys`, `cloudinary.com` swoj endpoint provisioningu, `meilisearch.com`
    i `mongodb.com` adresy rejestracji. Wszystkim mowilismy, ze nie znalezlismy strony o kluczach.
  - Dwa powody. Parser lapal **wylacznie skladnie markdown** `[tekst](url)`, a `oramasearch.com`
    podaje gole adresy, w tym **endpoint rejestracji dla agenta**, podczas gdy nasz werdykt mowil
    „nie znalezlismy linku do rejestracji". Drugi: kandydat musial wygladac jak strona
    dokumentacji, co wykluczalo dokladnie te uzyteczne, bo endpoint provisioningu Cloudinary
    i strona rejestracji Meilisearch dokumentacja nie sa.
  - **Zasada, ktora z tego wynika: link w llms.txt nie jest naszym zgadywaniem, tylko mapa, ktora
    vendor opublikowal dla agentow.** Zasluguje na przeczytanie na ich slowo, nie na nasze.
    Pozostanie na ich wlasnej domenie nadal obowiazuje.
  - **Wycofane w tej samej sesji, w ktorej to napisalem:** straznik trzymajacy jedna stron z
    rankingu wsrod kandydatow, dopisany, bo `oramasearch.com` spadl z dwoch czytanych stron do
    zera. Test tej zmiany przeciwko samej sobie pokazal, ze spadek wystepuje ze straznikiem, bez
    straznika i bez calej tej pracy: ich dokumentacja przestala byc wykrywalna, a wiersz w korpusie
    pochodzi sprzed tego. **Straznik nie naprawial niczego i kosztowal cloudinary.com oraz
    bunny.net po jednej stronie.** Nie dopisuj go ponownie bez sprawdzenia `docs=` w VERBOSE.
  - **Nie widac tego w korpusie, dopoki baza nie przyjmie reseedu.** Dziala za to od razu dla
    odwiedzajacego, ktory skanuje wlasna domene, czyli dla klienta.

- ~~**Rodzina zarzutow o martwe linki w llms.txt**~~ **zaatakowana 2026-08-13, utrzymala sie.**
  Dziesiec wierszy stawia zarzut w formie „N z M probkowanych linkow nie zyje, poczawszy od <url>".
  **Wszystkie dziesiec nazwanych adresow zwraca 404**, sprawdzone recznie tym samym user-agentem.
  Zero falszywych oskarzen. Dwa z nich to cudze serwisy (YouTube dla `dnsimple.com`, GitHub dla
  `oramasearch.com`): to nadal wina vendora, bo on decyduje, co linkuje, a agent idacy w 404 traci
  budzet tak samo. `oramasearch.com` traci punkt na dwoch martwych linkach do wlasnych repozytoriow
  GitHuba, ktore sa prywatne albo skasowane.

- ~~**Sciezka odwiedzajacego przy zablokowanych zapisach**~~ **zrobione 2026-08-13.** Przetestowana
  na produkcji, nie zalozona, i byla najgorsza rzecza, jaka strona wtedy robila: wpisujesz domene,
  czekasz pol minuty, widzisz piec ukonczonych krokow i dostajesz **„scored 11 of 15, and we could
  not store the result, so it has no page, write to hello@letagentsin.com"**. Uczciwe zdanie, ktore
  wyrzuca skonczony pomiar trzymany w pamieci, przez nasz problem z baza.
  - Ostatnie 50 niezapisanych raportow zostaje na dynie, `/r/<id>` do nich sie:ga, wiec odwiedzajacy
    dostaje **zwykla strone raportu**. To nie cache i nie kolejka: kolejnosc wstawiania, limit,
    czysci sie przy kazdym deployu. Held-only nie trafia do indeksu.
  - **Pulapka warta zapamietania: `Map` na poziomie modulu NIE jest wspoldzielona miedzy route
    handlerem a strona.** Next bunduje je osobno, wiec kazde dostaje wlasna instancje modulu
    i wlasna mape: skan pisal do jednej, `/r/<id>` czytal druga, a objawem byl czysty 404, ktorego
    nie da sie wyczytac z kodu. Rozwiazanie: `globalThis`.
  - **Dwie hipotezy rozroznione testem, nie zgadywaniem:** pierwszy test wypadl w tej samej minucie
    co restart po deployu, wiec „restart zjadl raport" bylo rownie dobrym wyjasnieniem. Powtorzenie
    na ustabilizowanym dynie dalo ten sam 404 i to wykluczylo restart.
  - Zweryfikowane na produkcji: `/r/railway-app-...` zwraca 200, pelny raport 12/14 z banerem
    „This link will not last".

- **Zmierzone i ODRZUCONE 2026-08-13: karmienie wyszukiwania rejestracji linkami z llms.txt.**
  Druga polowa znaleziska o llms.txt jako mapie wygladala na oczywista kontynuacje i **nie jest
  warta zrobienia**. Na 17 wierszy mowiacych „nie znalezlismy linku do rejestracji" tylko 3 maja
  w llms.txt adres lapiacy sie na `SIGNUP_HINTS`, **a dwa z tych trzech to falszywe trafienia**:
  `signoz.io` przez „get-started" w sciezce dokumentacji, `stytch.com` przez „registration"
  w slugu wpisu blogowego. Jedyny prawdziwy przypadek to `oramasearch.com`, ktorego adres i tak
  zwraca 401. Zysk 1 wiersz, koszt 2 nowe falszywe trafienia.

- ~~**Rodzina `signup_no_captcha`**~~ **zaatakowana 2026-08-13, utrzymala sie w calosci.**
  Siedemnascie wierszy nazywa konkretnego dostawce CAPTCHA na konkretnej stronie rejestracji, czyli
  zarzut w pelni falsyfikowalny. **17 z 17 potwierdzonych recznie**: recaptcha albo turnstile jest
  naprawde w serwowanym HTML tej strony, tym samym user-agentem. Zero falszywych oskarzen.
  *(Pierwszy przebieg tego testu pokazal 17 z 17 NEGATYWNYCH i byl bledem mojego parsowania
  w shellu, kazde ciało mialo 1 bajt. Wynik „wszystko falszywe" jest podejrzany z definicji.)*

- **Zmierzone i ZOSTAWIONE 2026-08-13: precyzja adresu rejestracji.** Przy okazji wyszlo, ze
  **5 z 84 wierszy** nazywa „formularzem rejestracji" cos innego: goly host (`cloud.directus.com`,
  `dashboard.radar.com`, `cloud.temporal.io`) albo strone logowania (`firecrawl.dev/signin`,
  `cloud.trigger.dev/login`). Sprawdzone: dla `trigger.dev`, `directus` i `temporal` **lepszy adres
  nie istnieje** (404 na `/signup`), a `firecrawl.dev` ma rejestracje pod `/signin?view=signup`,
  czyli to ta sama strona i nasz werdykt („formularz renderuje sie w HTML") jest poprawny.
  Nieprecyzyjny jest wylacznie rzeczownik. Nie warto zmieniac kodu.

- ~~**Strona glowna sugerowala, ze publikowane wiersze sa na biezacej formule**~~ **naprawione
  2026-08-13.** Zdanie brzmialo „we hold 170; the rest are waiting for a rescan **under the current
  formula**", co stawia opublikowane wiersze na biezacej formule przez implikacje. Nie sa:
  publikujemy wersje wiekszosciowa, ktora utknela na **9.8**, podczas gdy skaner chodzi na **9.12**.
  Odwiedzajacy mogl przeskanowac wlasna domene, dostac inna odpowiedz niz wiersz obok i nie miec na
  stronie nic, co by to tlumaczylo. Klauzula nazywa teraz obie wersje i **znika sama**, gdy reseed
  je zrowna. **Nie zmienilem tego, ktore wiersze publikujemy**: preferowanie biezacej wersji
  serwowaloby strone z kohorty prawie pustej, a mieszanie wersji jest dokladnie tym, przed czym
  chroni regula jednej wersji.

- ~~**Trzynasty przebieg adwersaryjny**~~ **zrobiony 2026-08-13: 282 werdykty sprawdzone
  niezaleznie, 0 bledow.** Celowany w rodziny stawiajace zarzuty najlatwiejsze do obalenia, kazda
  z **wlasna kontrolka udowadniajaca, ze sonda umie powiedziec „tak"** (regula 2 tego projektu).
  - **`oauth_dcr`, 44 wiersze**: „No OAuth metadata on any of the 8/9 hosts probed". Przesondowane
    niezaleznie: 9 hostow (apex, www, api, auth, accounts, id, login, app, mcp) x 2 sciezki
    (`/.well-known/oauth-authorization-server`, `/.well-known/openid-configuration`), z parsowaniem
    JSON i wymogiem `issuer` albo `authorization_endpoint`. **Zero trafien, 44 z 44 potwierdzone.**
    Kontrolka: ta sama sonda znajduje metadane u `chargebee.com` (bez `registration_endpoint`,
    dokladnie jak mowi nasz werdykt), `apify.com`, `api.video` i `bitmovin.com` (z endpointem).
  - **`agent_entry_point`, 66 wierszy**: „None of the 9 known agent entry paths returns a file
    rather than your page shell". Przesondowane niezaleznie, z odrzucaniem HTML-owych powlok
    **i z kontrolka na sciezce, ktorej nikt nie zarejestrowal**, zeby catch-all nie liczyl sie jako
    plik. **Zero trafien, 66 z 66 potwierdzone.** Kontrolka: znajduje pliki u wszystkich siedmiu
    vendorow, ktorym je zaliczamy (cloudflare, resend, pinecone, sentry, inngest, neon) oraz
    u nas. Przy okazji niezalezne potwierdzenie liczby z rady naprawczej: nasz `/agent-signup.md`
    ma **1728 bajtow**, a rada mowi „1.7 kB".
  - **`signup_reachable`, 64 oskarzenia + 20 kontrolnych**: „the signup form at <url> is not in the
    server HTML". **Kontrolka 20 z 20**, oskarzenia **64 z 64**. Cztery pozorne niezgody okazaly sie
    naiwnoscia mojej sondy, a kazda odpowiada pulapce juz opisanej komentarzem w kodzie:
    `api.video` renderuje formularz, ale jego pole e-mail ma `disabled=""`, wiec bez JS nikt go nie
    wypelni; `browserless.io` ma input e-mail **poza** formularzem, a jedyny formularz to baner
    ciasteczek; `payloadcms.com/get-started` ma formularz `NewsletterSignUp` z wylaczonym
    przyciskiem, czyli nie jest to nawet rejestracja konta; `name.com` byl artefaktem mojej
    ekstrakcji (wyciagnalem adres cennika ze zdania „nie znalezlismy linku do rejestracji").
    **Wniosek: reguly skanera sa ostrozniejsze niz ich naiwna reimplementacja.** Kto bedzie je
    atakowal, musi sprawdzac wypelnialnosc pola i zasieg formularza, nie sama obecnosc `<form>`.
  - **`llms_txt`, 16 oskarzen + 20 kontrolnych**: „nie publikujecie llms.txt". Przesondowane na
    5 hostach x 2 pliki, z odrzucaniem HTML-owych powlok. **16 z 16 i 20 z 20.** Jedyna niezgoda,
    `crowdin.com`, byla brakiem hosta `support.` w MOJEJ liscie: plik jest dokladnie pod adresem,
    ktory nasz werdykt podaje.
  - **`self_serve`, 5 oskarzen + 20 kontrolnych**: „No free tier or no-card wording at <url>".
    **5 z 5**, kontrolka 18 z 20 (dwa pudla to moje wezsze wyrazenie, nie blad skanera).
  - `signup_no_captcha` 17 z 17 i martwe linki w llms.txt 10 z 10, opisane wyzej.
  - **Wniosek, ktory powtorzyl sie CZTERY razy w jednym przebiegu i jest wazniejszy niz same
    liczby: kiedy moja niezalezna sonda nie zgadzala sie ze skanerem, za kazdym razem myliła sie
    sonda.** `api.video` (pole `disabled`), `browserless.io` (input poza formularzem),
    `payloadcms.com` (newsletter z wylaczonym przyciskiem), `medusajs.com` i `name.com` (`$0.3 / 1M`
    i `$0.00` zlapane przez `\$0\b` jako darmowy poziom), `crowdin.com` (brak hosta w mojej liscie),
    `name.com` (adres cennika wyciagniety ze zdania o braku rejestracji). **Reguly maja w sobie
    rozroznienia, ktorych szybki regex nie ma.** Praktyczny wniosek na przyszlosc: gdy audyt
    zglasza bledy, najpierw sprawdz audyt.
  - **Metodyczna uwaga, dwa razy w jednej sesji:** wynik „wszystko negatywne" jest podejrzany
    z definicji. Pierwszy przebieg testu CAPTCHA pokazal 17 z 17 falszywych oskarzen i byl bledem
    parsowania w shellu (kazde cialo mialo 1 bajt). **Przy wyniku zerowym najpierw udowodnij, ze
    narzedzie umie znalezc cokolwiek.**

- ~~**Errata dla wierszy, o ktorych wiemy, ze sa bledne**~~ **zrobione 2026-08-13**,
  `src/lib/errata.ts`. Wczesniej cos takiego nie bylo potrzebne, bo **poprawka i sprostowanie byly
  tym samym aktem**: zle wiersz sie przeskanowywalo. Przy zablokowanych zapisach korpus stoi na
  9.8, skaner poszedl do 9.12, a trzy wiersze stoja na stronie i przypisuja zywy serwer MCP
  stronie dokumentacji. Sprawdzone recznie tego samego dnia. Zostawienie ich bez adnotacji byloby
  publikowaniem twierdzenia o cudzym produkcie, w ktore juz nie wierzymy.
  - `posthog.com` i `openrouter.ai` **maja** serwery (`mcp.posthog.com/mcp`, `mcp.openrouter.ai/mcp`)
    i nota je nazywa, bo wiersz myli sie na ich korzysc co do adresu. `medusajs.com` nie ma zadnego,
    wiec jego nota mowi, ze wiersz go zawyza.
  - Renderuje sie na `/v/<domena>` przy poprawianym checku **i jedzie w `corpus.json` jako pole
    `correction`**, bo maszyna cytujaca werdykt nie widzi strony.
  - **Wpisy wygasaja same**: nota znika, gdy wiersz zostanie zmierzony pod formula, ktora to
    naprawila, wiec skonczony reseed oprozni te liste bez niczyjej pamieci. To jest czesc przypieta
    testami, razem z tym, ze **9.8 jest starsze niz 9.12**, czego porownanie tekstowe nie widzi
    i co wygasiloby kazde sprostowanie za wczesnie.
  - **Wpis nalezy sie wierszowi BLEDNEMU, nie po prostu staremu.** Wiersze na przedawnionej formule
    sa juz oznaczone wszedzie, gdzie sie pojawiaja.
  - Zweryfikowane na produkcji: trzy strony vendorow pokazuja note, kazda na innej formule sprzed
    9.12 (9.11, 9.9, 9.8). W `corpus.json` jest jedno z trzech i **tak ma byc**: plik publikuje
    jedna wersje, a dwa pozostale maja nowsze zapisane wiersze i wypadaja poza opublikowany zbior.

- **Sciezka zapisu na monitorowanie przy zablokowanych zapisach: sprawdzona 2026-08-13, w porzadku.**
  `POST /api/watch` zwraca 503 i „Nothing was signed up and no email was sent", z adresem
  kontaktowym. Nic do naprawy.

- ~~**Dwie hipotezy o remisach z rundy 105**~~ **przetestowane 2026-08-13, jedna wdrozona, jedna
  obalona.** Obie byly zapisane jako reguly o swiecie, nie o pytaniach, wlasnie po to, zeby dalo
  sie je sprawdzic na zestawie napisanym pozniej.
  - **`chrome` = infrastruktura przegladarkowa: wdrozone.** Warte jedno pytanie na `HELD_OUT_2`
    (31 -> 32). Uczciwe zastrzezenie: **`HELD_OUT_3` nie zawiera slowa „chrome", wiec nie dodaje
    tu dowodu w zadna strone.**
  - **„Kanal dostawy wygrywa remis": OBALONE, nie powtarzaj.** Odpala sie na trzech pytaniach
    w obu zestawach i **myli sie na wszystkich trzech**: ktos, komu support weryfikuje tozsamosc
    mailem, chce `auth`; ktos, kto o bledach dowiaduje sie z maila od klienta, chce
    `error-monitoring`. Slowo „email" w prawdziwym pytaniu opisuje zwykle to, jak ludzie sie
    kontaktuja, a nie produkt.
  - **Pulapka pomiarowa warta zapamietania: wynik punktowy sie NIE zmienil.** Te trzy pytania byly
    juz bledne jako milczenie, wiec licznik nie odroznia „nic nie odpowiedzialem" od
    „odpowiedzialem transactional-email z pewnoscia siebie". Patrzac na sume, uznalbym regule za
    neutralna i wdrozyl. **Trzeba bylo przeczytac, na czym sie odpala.**

- **Publikowana trafnosc trasowania stoi teraz na `HELD_OUT_3`: 29 z 58.** To jedyny zestaw,
  ktorego zadna decyzja jeszcze nie dotknela. Napisany 13.08 przez subagenta odcietego od
  `lookup.ts`, obu wczesniejszych zestawow i STATE.md, **celowo naszpikowany slowami nalezacymi do
  dwoch kategorii naraz**, bo remisy sa dominujaca porazka. Dziewiec odpowiedzi w zlej kategorii
  wobec czterech na `HELD_OUT_2` (32 z 58). **Opis narzedzia MCP podaje obie liczby**, bo pojedyncza
  albo schlebia narzedziu, albo je oczernia, zaleznie od tego, z ktorego zestawu pochodzi.
  `FRESH_QUESTIONS` i `HELD_OUT_2` sa od teraz zestawami regresyjnymi (`BURNED=1`), nie miara.

- **Podglad tego, co reseed na 9.12 zmieni, zrobiony BEZ zapisu (2026-08-13).** Skanowanie co
  piatej domeny i porownanie z zapisanym wierszem: **6 z 34 zmienia wynik**. Dwa najwieksze ruchy
  sprawdzone werdykt po werdykcie:
  - **`sinch.com` 10/13 -> 7/11 okazalo sie SZUMEM.** Powtorzony skan dal z powrotem 10/13.
    Trzypunktowy skok na jednej domenie, nieodtwarzalny. **Wniosek przed reseedem: pojedynczy
    przebieg potrafi zapisac wynik, ktorego druga proba nie potwierdza**, a opublikowany prog szumu
    (0,2 procent) jest liczony na parach identycznych przebiegow calego korpusu, wiec nie mowi nic
    o wahaniu pojedynczego wiersza.
  - **`cockroachlabs.com` 10/15 -> 7/13 jest PRAWDZIWE i w pelni wytlumaczone.** `llms_txt` 1 -> 0,
    bo **wszystkie 12 probkowanych linkow jest martwych**: ich plik wypisuje adresy na
    `docs.cockroachlabs.com`, a dokumentacja stoi pod `www.cockroachlabs.com` (sprawdzone recznie,
    tresc pod `www` odpowiada 200). `programmatic_provisioning` 2/2 -> nieoznaczalne, bo czytamy
    tylko jedna strone dokumentacji. Arytmetyka sie zgadza co do punktu: 10-1-2 = 7, 15-2 = 13.
  - **Ta sama bledna hipoteza postawiona DWA razy w jednym dniu: „kandydaci z llms.txt wypychaja
    czytelne strony dokumentacji z limitu trzech".** Raz przy `oramasearch.com`, raz przy
    `cockroachlabs.com`. Za kazdym razem obalona dwuminutowym testem izolujacym (skan z filtrem
    `isDocumentationPage` i bez niego dal **identyczny** wynik). **Straznik trzymajacy jedna strone
    z rankingu byl przez to napisany i wycofany DWUKROTNIE** - nie pisz go po raz trzeci bez
    uprzedniego testu izolujacego.

- **Niestabilnosc skanu miedzy dwoma przebiegami, zmierzona 2026-08-13.** Wyszlo z anomalii
  `sinch.com` w podgladzie reseedu.
  - **3 z 15 domen nie zgadza sie samo ze soba** przy dwoch skanach plecami do siebie, i
    **wszystkie trzy pogarszaja sie w drugim przebiegu** (`logto.io` 10/15 -> 9/13, `timekit.io`
    7/14 -> 6/11, `pandadoc.com` 4/8 -> 4/7). Za kazdym razem spada **mianownik**, czyli checki
    wpadaja w „nieoznaczalne": sygnatura wyczerpanego budzetu albo limitowania naszych zadan,
    a nie zmiany werdyktu.
  - **75 sekund przerwy naprawia 2 z 3.** `logto.io` i `timekit.io` daja wtedy identyczny wynik.
    `pandadoc.com` waha sie nadal, ale ta domena odpowiada 429 na wszystko, wiec ma wlasna
    przyczyne.
  - **Czego to NIE dowodzi, i to jest wazniejsze niz sam pomiar:** reseed nie skanuje domeny dwa
    razy pod rzad. Przy 170 domenach w przebiegu odstep miedzy dwoma skanami tej samej domeny to
    kilkanascie minut, wiec **ten pomiar nie podwaza dwoch przebiegow reseedu**. Dotyczy sytuacji,
    w ktorej ktos skanuje te sama domene dwa razy z rzedu, zeby „sprawdzic": wtedy drugi wynik
    jest systematycznie gorszy od pierwszego. Odwiedzajacego chroni przed tym cache swiezego skanu
    w `gateScan`, ktory oddaje poprzedni raport zamiast skanowac ponownie.
  - **Konsekwencja dla weryfikacji recznej:** sprawdzajac werdykt przez powtorny skan, odczekaj
    minute, inaczej mierzysz wlasne obciazenie. Tak wlasnie powstala anomalia `sinch.com`.

- ~~**Strony audytow (`/audit`) sprawdzone**~~ **2026-08-14, wszystko sie zgadza.** To jedyna
  powierzchnia z realnymi twierdzeniami, ktorej nie ruszalem, a sprzedaje platny produkt.
  - Liczby na `/audit` sa **wyliczane** z `src/data/audits/*.json`, wiec nie moga sie rozjechac.
    Sprawdzone recznie: **18 przebiegow w czterech plikach, 12 z niepustym `blockedBy`**, i kazda
    z tych dwunastu blokad to naprawde krok wymagajacy czlowieka (zalozenie konta, mail
    weryfikacyjny, 2FA, klikniecie w konsoli, karta platnicza). Szesc niezablokowanych to dokladnie
    kategoria edytorow, ktora konta nie potrzebuje, czyli zgadza sie ze zdaniem na stronie glownej.
  - **Znalezione ryzyko: strona glowna cytuje te same przebiegi jako `18 / 18` i `0 / 12` wpisane
    RECZNIE.** Dzis prawdziwe, ale **piaty audyt unieważnilby oba zdania, nie dotykajac zadnej
    z tych stron.** Obie liczby sa teraz pilnowane przez `npm run audit` (19 pilnowanych liczb
    zamiast 17), zakotwiczone na samym twierdzeniu, bo gole `N / 18` pasowaloby do dowolnego wyniku
    na stronie. Sprawdzone, ze straznik zapala sie przy rozjezdzie.
  - **Pulapka: audyt czyta strone PRODUKCYJNA**, wiec zmiana lokalnego zrodla go nie zapala.
    Zeby udowodnic, ze straznik dziala, trzeba rozjechac strone danych, nie strone prozy.

- ~~**Cotygodniowy przebieg obserwacji przy zablokowanych zapisach**~~ **naprawione 2026-08-14.**
  Sprawdzone, bo ta sciezka **wysyla maile do prawdziwych ludzi**, a bazy nie tknalem od strony crona.
  - **Dobra wiadomosc: zaden blad nie mogl pojsc mailem.** `saveReport` rzuca wyjatkiem, zanim
    cokolwiek zostanie porownane i wyslane, wiec zaden obserwujacy nie dostal nieprawdy.
  - **Zla: wyjatek nie zmniejszal `remaining`, wiec harmonogram dzwonil 40 razy**, a kazde
    ponowienie to pelny skan domeny klienta, 27 sekund zadan na jego serwerze. **Tej samej klasy
    marnotrawstwo co w petli ponowien reseedu**, znalezione tego samego dnia i to ono kazalo mi tu
    zajrzec.
  - Store jest teraz pytany **przed pierwszym skanem**, a 503 zatrzymuje workflow na pierwszym
    wywolaniu zamiast na czterdziestym. Zweryfikowane na produkcji: `503, skipped: 1`, czyli
    **jedna obserwacja byla dzis wymagalna** i nocny przebieg naprawde by to zrobil.

- **Przeglad wszystkich petli wykonujacych prace na cudzych serwerach (14.08): trzeciego
  wystapienia NIE MA.** Jedyna petla skanujaca poza reseedem to cron obserwacji, juz naprawiony;
  petle w samym skanerze siedza wewnatrz jednego pomiaru i tak maja byc. Wynik negatywny, ale
  policzony, a nie zalozony.

- ~~**Bufor trzymanych raportow trzymal surowy obiekt**~~ **naprawione 2026-08-14**, defekt
  w kodzie, ktory sam dodalem dzien wczesniej. `holdUnsaved` zapisywal `report` w calosci, podczas
  gdy `forStorage` obcina z niego ciala sond: **180 kB z 185 kB, ktore wazy raport, i dokladnie to
  pole zapchalo klaster**. Piecdziesiat surowych raportow to **9 MB** zaparkowane na dynie, zeby
  serwowac strone, ktora tego pola nie czyta. Trzymamy teraz dokladnie to, co poszloby do bazy.
  Zweryfikowane na produkcji: strona raportu nadal renderuje sie w calosci (200, 72 kB, baner na
  miejscu).

- **Zmierzylismy sami siebie wlasnym skanerem (14.08): 11/17.** Warte odnotowania, bo pokazuje
  granice dwoch regul na przykladzie, ktorego nie da sie zbyc.
  - `signup_reachable` i `signup_no_captcha` mowia o nas „nie znalezlismy linku do rejestracji,
    **choc publikujecie ceny**, wiec to luka w naszym czytaniu". **My po prostu nie mamy
    rejestracji**: skan jest darmowy i bez konta, a nasz `/agent-signup.md` mowi to wprost.
    Zalozenie „kto publikuje cennik, ten ma konta" jest obalone przez nasza wlasna strone.
    **Nie zmieniam reguly**: zdanie jest ostrozne, oznacza sie jako nieoznaczalne i nie oskarza,
    a jedyny sposob, zeby je naprawic, prowadzilby przez dopasowanie do naszego wlasnego pliku.
  - `programmatic_provisioning` czyta u nas **jedna** strone dokumentacji, ta sama granica co przy
    `cockroachlabs.com`.
  - `oauth_dcr` oblewamy tak samo jak inni i tak ma byc.

- **Errata sama wpadla w blad, przed ktorym miala chronic (14.08), naprawione.** Wpis kluczowal
  po domenie, checku i wersji formuly, wiec `openrouter.ai` na 9.9 (czyli „sprzed poprawki")
  dostawal note, choc **jego wiersz juz nazywal wlasciwy serwer**. Strona czytala „Live MCP
  endpoint at mcp.openrouter.ai/mcp", a linijke nizej: „ten wiersz wskazuje strone dokumentacji".
  **To bylo na produkcji.** Kazdy wpis nosi teraz adres, ktory bledny wiersz faktycznie podaje
  (`wrongWhen`), i nota pojawia sie tylko wtedy, gdy werdykt to mowi.
  - **Jak to wyszlo: przez weryfikacje mechanizmu, nie przez raport.** `posthog.com` zostal
    przeskanowany na 9.12 w ostatnim oknie i jego nota **wygasla sama**, dokladnie jak
    zaprojektowano. Dopiero to postawilo obok siebie wiersz bez noty i wiersz z nota, ktory jej nie
    potrzebowal.
  - Testy przepisane wokol przypadku, ktory przepuscily: **wiersz na starej formule, ktory juz jest
    poprawny, nie dostaje sprostowania**, a ten sam wiersz wskazujacy dokumentacje nadal tak.
  - Stan na produkcji po naprawie: `posthog.com` i `openrouter.ai` bez noty i z poprawnym adresem,
    `medusajs.com` z nota, bo jego wiersz nadal zalicza 405 apeksu jako serwer.

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
  **Zmierzone 2026-08-11 (runda 117): wszystkie dziesięć porażek tego checku pochodzi
  z wyszukiwarki rejestru, ani jedna z pakietu podlinkowanego na stronach, które czytamy** -
  a w snapshotach tych stron nazwy właściwego pakietu **nie ma wcale**, więc brakuje przesłanki,
  a nie parsera. Werdykt zostaje, zdanie od 8.5 mówi, że nazwę zgadliśmy.
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

## PRZEGLAD CALEGO DZISIEJSZEGO DIFFA PRZEZ SUBAGENTA: piec defektow, formula 9.16

Dzis poszlo na produkcje 77 commitow i **1350 linii bez ani jednego przegladu**, wbrew stalej
zasadzie z CLAUDE.md. Nadrobione: subagent read-only przejrzal caly diff. Znalazl piec rzeczy,
ktorych nie zlapal ani `tsc`, ani `rules.mts`.

**1. `prune-reports.mts` kasowal wiersze, ktore publikuje korpus (wysokie, skrypt DESTRUKCYJNY).**
Zbior zachowywanych bral najnowszy wiersz **per domena**, a korpus czyta najnowszy **zasiany**
(`latestPerDomain(1000, true)`). Wystarczyl wiec **jeden odwiedzajacy skanujacy domene kuratorowana**,
zeby jego wlasny, niezasiany wiersz stal sie najnowszy, a wiersz korpusowy przeszedl do skasowania.
Efekt: vendor znika z `corpus.json`, z rankingow i ze wszystkich licznikow do nastepnego reseedu.
**Zmierzylem ekspozycje na zero** - minute po reseedzie, gdy wszedzie najnowszy jest zasiany - i to
byl snapshot, nie obalenie. **Suchy przebieg po poprawce od razu zachowuje jeden wiersz**, ktory
wczesniej by przepadl.

**2. `refusedUs` obwinial vendora za nasz wlasny zegar (moja dzisiejsza poprawka).** Traktowalem
status **0** jako odmowe krawedzi, a `http.ts` zwraca 0 takze wtedy, gdy **skanowi skonczyl sie
budzet czasu**, gdy sami odrzucilismy przekierowanie i gdy host wczesniej nie odpowiadal. Zdanie
„your site answered nothing when we asked for a page" jest wiec **dokladnie ta klasa bledu, ktora ta
poprawka miala usuwac**. Zawezone do statusow >= 400, czyli do odpowiedzi, ktora krawedz naprawde
wyslala.

**3. Dwa z trzech wpisow erraty lapaly zdanie POPRAWNE.** `/posthog\.com\/mcp/` pasuje do
`mcp.posthog.com/mcp`, wiec wiersz **juz naprawiony** dostalby sprostowanie mowiace, ze wskazuje
strone dokumentacji. To ten sam blad, dla ktorego `wrongWhen` w ogole powstalo, a przypiety testem
byl tylko `openrouter.ai`, ktorego regex przypadkiem nie pasowal. Teraz przypiete sa wszystkie trzy
i **udowodnilem, ze test lapie regres**.

**4. Alarm o kwocie milknie, gdy jest potrzebny.** `catch` wokol `db.stats()` zwracal 0 MB dla
**kazdego** bledu, nie tylko dla `local` i `admin`. Timeout na naszej bazie w chwili, gdy klaster
jest pod obciazeniem, dawalby wiec „0 MB", werdykt `ok` i zielony workflow. Teraz milczy wylacznie
dla tych dwoch baz, a reszta rzuca.

**5. Komentarz klamal o harmonogramie** (pisal „daily", workflow chodzi tygodniowo) i mail o kwocie
przy pustym odczycie napisalby „Largest is undefined".

Wszystko zbudowane, przetestowane, wdrozone i sprawdzone na produkcji (**formula 9.16**).

**Wniosek procesowy: przeglad znalazl piec rzeczy w kodzie, ktory przeszedl typecheck i wlasne testy,
w tym jeden defekt w skrypcie kasujacym dane i jeden w poprawce napisanej dwie godziny wczesniej
wlasnie po to, zeby nie obwiniac vendorow za nasze pomiary.** Zasada „subagent przeglada, zanim
uznasz za gotowe" zarobila dzis na siebie.

## DZIEWIETNASTY PRZEBIEG: `self_serve`, i granica audytowania skanera czytaniem

Ostatni nieweryfikowany oskarzyciel: **17 odmow** typu „na waszym cenniku nie ma darmowego progu".
Dopasowanie ciagow byloby przepisaniem skanera, wiec moja zgoda nic by nie znaczyla. Uzylem metody
**niezaleznej**: subagent, ktory nie widzial ani kodu, ani naszych werdyktow, przeczytal 22 strony
cennikowe i odpowiadal z **wymogiem doslownego cytatu**.

**Kontrolki 5 na 5** (stripe, resend, supabase, neon, cloudflare) - kazda z cytatem, wiec czytelnik
umie powiedziec „tak".

**Dwie niezgody na 17, obie wyjasnione, zero bledow w danych:**
- **`xata.io`**: czytelnik znalazl „free forever" i „14-day free trial". W **tekscie widocznym**
  tych fraz nie ma - siedza w `<script>` z payloadem Next.js. Jedyna widoczna wzmianka to
  **zwiniete pytanie FAQ „Is there a free tier?"**, czyli dokladnie to, co mowi nasz werdykt.
- **`savvycal.com`**: jedyne dopasowanie do naszego slownika tez jest pytaniem. Strona mowi
  dodatkowo „**Kick the tires for free**", co jest prawdziwe i czego zaden nasz wzorzec nie lapie.
  **Nie dodaje tego idiomu**, bo to byloby dopasowanie sie do jednego vendora.

**Granica warta zapamietania: czytelnik LLM widzi rzeczy, ktorych nie widzi deterministyczny
ekstraktor tekstu.** Czyta payload w `<script>` jak tresc strony, a agent bez JavaScriptu jej nie
zobaczy. Audytujac skaner czytaniem, **kazda niezgode trzeba sprowadzic do tego samego wejscia**
(tekst widoczny, nie surowy HTML), inaczej mierzy sie roznice narzedzi, a nie blad danych. Ten sam
ksztalt co „sondowalem z laptopa, a skaner mierzy z dyna".

**Wszystkie 15 checkow ma teraz udokumentowany przebieg adwersaryjny.** Bilans przebiegow 14-19:
**~900 werdyktow sprawdzonych, 1 blad w danych** (`statsig.com`).

## EKSPORTY MASZYNOWE SPRAWDZONE (SARIF i CSV), plus dowod pakietu w arkuszu

Nikt nigdy nie sprawdzil tego, co **konsumuja maszyny**, a zepsuty eksport to defekt, ktory zobaczy
dopiero klient.

**SARIF czysty:** `$schema` 2.1.0, jeden `run`, **15 regul i 15 wynikow**, zaden `ruleId` nie
wychodzi poza liste regul, kazdy wynik ma `level`, `message.text` i `locations`, poziomy sa legalne
(`none`, `warning`), a **kazda regula ma `helpUri` i `shortDescription`**. Wersja narzedzia zgadza
sie z formula na produkcji.

**CSV czyste:** 16 kolumn, 2520 wierszy, **ani jednego rozjechanego**. Zabezpieczenie przed
wstrzykiem formuly do Excela dziala (cele zaczynajace sie od `@`, bo scope'y npm).

**Dolozone:** kolumna `npm_source`, bo JSON od dzis mowi, na jakim dowodzie stoi wskazanie pakietu,
a **vendor otwierajacy arkusz nie mial jak tego zobaczyc obok punktu, ktory to rozstrzyga**.
Wypelniona tylko przy `typed_package` (132 / 9 / 7 / 6 / 14 pustych) i pusta w 2352 pozostalych
wierszach, zweryfikowane na produkcji.

## OSIEMNASTY PRZEBIEG: `typed_package`, czyli na jak slabym dowodzie stoi jeden z checkow

STATE.md od dawna trzymal te rodzine jako **niedowiedziona**. Zaczalem od dziewieciu odmow i od razu
mialem „oczywisty" blad: `namecheap.com` → `node-vault-client`, co brzmi jak klient HashiCorp Vault.

**Rejestr obalil moja intuicje, nie nasz wiersz.** `node-vault-client` publikuje **`namecheap_npm`**
z repozytorium `github.com/namecheap/node-vault-client`, a `warehouse.ai-api-client` lezy pod
`github.com/godaddy/`. Atrybucja jest poprawna u wszystkich szesciu sprawdzonych. **Kolejny raz
dzis skaner mial racje, a ja nie.**

Zostalo jednak pytanie prawdziwe: klient Vaulta **nie jest pakietem, ktory instaluje deweloper,
zeby uzyc Namecheapa**. Zamiast spierac sie o pojedynczy wiersz, zmierzylem, **na czym stoi cala
rodzina**:

| jak dopasowalismy pakiet | zaliczone | odmowy |
|---|---|---|
| **`registry-search`** (po tym, KTO publikuje) | **125** | **9** |
| vendor nazwal go na stronie | 9 | 0 |
| w llms.txt | 7 | 0 |
| w dokumentacji | 6 | 0 |

**134 ze 156 zmierzonych werdyktow (86 procent) stoi na najslabszym z czterech dowodow.** Kazdy
wiersz to ujawnial osobno, ale **zbiorczo nie mowilismy tego nigdzie**, a to jest liczba, ktora
zmienia wage punktu.

**Opublikowane, nie tylko zapisane:** `corpus.json` niesie teraz `npmSource` przy kazdym wierszu
(132 / 9 / 7 / 6 / 14 bez pola), a `/methodology` mowi to zdaniem **wyliczanym przy kazdym
renderze**, nie wpisanym recznie. **Audyt pilnuje teraz 21 liczb zamiast 20** i pokazuje 0 rozjazdow,
co jest mocniejszym dowodem obecnosci zdania niz moj wlasny grep, ktory go nie znalazl.

**Wpadka po drodze:** zacommitowalem i wypchnalem na origin kod, ktory sie nie kompilowal (lokalny
typ `Row` w audycie nie znal nowego pola), bo uzylem `;` zamiast `&&` po buildzie. **Heroku
odrzucilo push**, wiec produkcja nigdy tego nie zobaczyla. Druga dzis lekcja o maskowaniu kodu
wyjscia.

## SIEDEMNASTY PRZEBIEG: llms.txt, 41 werdyktow, 0 bledow, i kontrolka ktora zarobila na siebie

Cel: 27 wierszy mowiacych **„No llms.txt at any of the N locations probed"**. Rodzina nietykana,
twierdzenie waskie: plik albo jest pod adresem, albo go nie ma. Sondowalem szerzej niz skaner
(piec hostow x trzy sciezki), wymagajac prawdziwego pliku, a nie powloki strony.

**Wynik: 27 na 27 odmow potwierdzonych, 14 na 14 kontrolek.**

**Kontrolka zlapala wade mojej sondy, zanim zdazyla skazic wynik.** Pierwsza wersja uznala
`imagekit.io` za nietrafiony, choc **nasz wiersz go zalicza**. Powod: oni publikuja pod
`imagekit.io/docs/llms.txt`, czyli w katalogu dokumentacji, a moja sonda szukala tylko w korzeniach
hostow. **Nasz skaner jest tam dokladniejszy ode mnie**, bo zna adres dokumentacji i tam zaglada.
Po dolozeniu tego adresu kontrolka daje 14 na 14.

Gdybym pusil sonde na oskarzeniach przed kontrolka, dostalbym „27 na 27 potwierdzonych" **z sondy,
ktora nie umie znalezc pliku lezacego w najczestszym miejscu**, i nazwal to weryfikacja.

**Bilans przebiegow 15-17: 875 werdyktow sprawdzonych, 1 blad w danych** (`statsig.com`, przebieg 14).

## SZESNASTY PRZEBIEG ADWERSARYJNY: 50 werdyktow, 0 bledow, kontrolka DWUSTRONNA

Cel: `signup_no_captcha`, czyli **28 oskarzen o CAPTCHA przed rejestracja**. Nigdy nie przechodzil
przebiegu, a jest jedna z dwoch liczb na stronie glownej, wiec pomylka jest pomylka publiczna.
Twierdzenie jest tez nietypowo waskie: nazwany ciag albo jest w bajtach, ktore serwer wyslal,
albo go nie ma.

**Wynik: 28 na 28 oskarzen odtworzonych niezaleznie, 22 na 22 wiersze zaliczone czyste.**

**Kontrolka dwustronna, i to jest tu najwazniejsze.** Sama zgodnosc oskarzen dowodzilaby tylko, ze
wzorzec cos lapie; moglby lapac wszystko. Puszczenie tej samej sondy na wiersze, ktorym mowimy
„czysta rejestracja", i **zero trafien tam**, dowodzi, ze wzorzec rozroznia. Probe, ktora umie
powiedziec tylko „tak", jest rownie bezwartosciowa jak ta, ktora umie powiedziec tylko „nie" -
o czym przekonalem sie dzis przy audycie rad, gdzie detektor nie mogl zapalic sie nigdy.

Sonda pyta **tym samym user agentem, co skaner**, bo strona serwowana inaczej przegladarce to inny
pomiar, a ten przebieg sprawdza nasz wiersz, nie cudza przegladarke. `npm run audit-captcha`.

**Bilans piatnastu i szesnastu przebiegow razem: 48 + 736 + 50 werdyktow sprawdzonych, 1 blad
w danych** (`statsig.com`), przy czym wiekszosc pozornych niezgod okazala sie wada metody, nie danych.

## DWA ZNALEZISKA Z PRZEGLADU DOMIERZONE (a nie przyjete na slowo)

**Koszt dolozonej sondy MCP: zaden mierzalny.** Recenzent wskazal, ze `api.<domena>/v1/mcp` ciagnie
za soba wlasna kontrolke, czyli **dwa zadania** w budzecie 27 sekund. Zmierzone na zapisanych
skanach, przed i po:

| formula | n | mediana | p90 | obcietych |
|---|---|---|---|---|
| 9.12 (przed sonda) | 340 | 5,7 s | 12,3 s | 0 |
| 9.13 (z sonda) | 344 | 5,7 s | 12,3 s | 1 |
| 9.14 | 345 | 4,5 s | 10,5 s | 0 |

Mediana i p90 **identyczne**, obciec 1 na 344 przy budzecie 27 s. Obawa jest sluszna co do zasady
i **nieistotna w praktyce**, co dalo sie sprawdzic zamiast rozstrzygac dyskusja.

**Zasieg bledu ze statusem 0: 8 wierszy na 1054.** Rozklad `docsStatus`: 990 w porzadku,
**56 prawdziwych odmow** (20x 403, 19x 404, 17x 429) i **8 zer**. Te osiem to dokladnie wiersze,
ktorym powiedzielibysmy „your site answered nothing when we asked", obwiniajac je za cos, co moze
byc naszym timeoutem. Po poprawce dostaja zdanie, ktore nie obwinia nikogo.

## 9.15 WYSZLA WBREW MOJEMU WSTRZYMANIU, I CZEGO TO UCZY

Wstrzymalem wdrozenie 9.15 do wygasniecia bariery reseedu, **commitujac bez wypychania na Heroku**.
Godzine pozniej wdrozylem niezwiazana poprawke komunikatu limitu i **Heroku wziela cala galaz**,
wiec 9.15 pojechala razem z nia. **Wstrzymanie przez niewypychanie nie jest wstrzymaniem**, jesli
zmiana siedzi na galezi, ktora wdrazasz. Albo osobna galaz, albo godzisz sie, ze pojedzie z
najblizszym deployem.

**Sprawdzajac to, dalem sie nabrac cache czwarty raz tego dnia:** anonimowy skan zwrocil formule
9.14 i uznalem, ze 9.15 nie wyszla. Odpowiedz miala `reused: true`, czyli byla z 15-minutowego
cache. Swiezy skan z konsoli pokazal **9.15 i `lexical.dev` z poprawnym „nie dotyczy"** na
`oauth_dcr`.

**Skutek uboczny okna rozjazdu, ktory zlapal nasz wlasny audyt:** ten jeden swiezy skan
`lexical.dev` na 9.15 sprawil, ze **dwie nasze liczby zaczely sobie przeczyc**. Strona liczy
„domeny porownywalne dzis" jako **169** (pomija wiersz zmierzony nowsza formula), a `corpus.json`
publikuje kohorte 9.14 i ma ich **170**. Obie definicje sa obronne osobno, ale czytelnik widzi
sprzecznosc.

**Nie ruszam prozy.** To jest dokladnie przypadek z porannej lekcji: audyt w trakcie migracji mierzy
migracje. Rozjazd znika sam po reseedzie na 9.15. **Strona w miedzyczasie mowi o tym uczciwie**:
„measured under formula 9.14 while the scanner runs 9.15, so a scan you run today can disagree with
the row below it".

**Do zrobienia po wygasnieciu bariery (okolo 4 h):** reseed na 9.15, potem `npm run audit`
(oczekiwane: 0 rozjazdow) i `npm run regressions`.

## RADY PRZY WERDYKTACH PRZECZYTANE PIERWSZY RAZ (0 sprzecznosci na 66)

Plan naprawczy ma swoj audyt od sierpnia, ale **zdania `unblock`, doczepiane do kazdego nieudanego
checku, nie mial ich nigdy**, a to tez jest rada o cudzym produkcie. `npm run audit-unblock`.

**Wynik: 0 prawdziwych sprzecznosci na 66 rad, ktore prosza o rzecz mozliwa do wykrycia.**

**Pierwsza wersja tego audytu byla bezwartosciowa i o malo jej nie opublikowalem jako czystego
konta.** Grupowala rady i szukala jednej obslugujacej wiersz zaliczony i niezaliczony, czyli
dokladnie tak, jak audytujemy plan naprawczy. Zwrocila zero. Sprawdzilem, dlaczego, i **`unblock`
nigdy nie wystepuje przy zaliczonym checku** (289 razy przy niemierzalnym, 50 przy odmowie, 24 przy
„nie dotyczy", **0 przy zaliczeniu**), wiec ten detektor **nie mogl zapalic sie nigdy**. To trzeci
raz w tej sesji, gdy wynik zerowy okazal sie wlasnoscia sondy, a nie danych.

Wersja druga zapalila sie 15 razy, wersja trzecia raz, i **kazde trafienie bylo moja wina**:
- „Link your **API reference** from your docs index" prosi o strone, ktorej nie przeczytalismy,
  a ja porownywalem to z faktem posiadania **indeksu**. Dwie rozne rzeczy.
- `discovered.pricing` trzyma adresy **zgadniete**, nie tylko zalinkowane, wiec `groq.com` wygladal
  na sprzecznosc, choc jego werdykt mowi „we guessed" w tym samym zdaniu. Sprawdzone recznie:
  `groq.com/pricing` **przekierowuje na strone glowna**, a jedyna kwota na niej to runda
  finansowania. Werdykt i rada sa poprawne.

Obie te granice sa teraz wpisane w kod sondy, nie w moja pamiec.

## GRANICA, KTORA WARTO MIEC SPISANA: „nie da sie" kontra „nie zrobili"

Po poprawce `oauth_dcr` sprawdzilem empirycznie, **ktore inne checki stawiaja bibliotekom twarde
zero**: `agent_entry_point` (5 na 5), `llms_txt` (4 na 5), `mcp_present` (4 na 5),
`machine_readable_api` (4 na 5). Kuszace bylo potraktowac je tak samo. **Policzylem i to zly pomysl.**

| domena | dzis | bez mcp i api | bez wszystkich czterech |
|---|---|---|---|
| lexical.dev | 4/10 | 4/8 | 4/5 |
| quilljs.com | 5/10 | 5/9 | 5/6 |
| prosemirror.net | 5/11 | 5/9 | 5/6 |
| editorjs.io | 4/10 | 4/8 | 4/5 |
| **slatejs.org** | **7/11** | 6/9 | **5/6** |

**Rozstrzyga `slatejs.org`: on czesc z tych checkow ZALICZA.** Wykluczenie skasowaloby mu kredyt
za prace, ktora wykonal, i zrownaloby go z biblioteka, ktora nie zrobila nic. Reszta tez by
„awansowala" z okolo 40 do 80 procent udzialu bez zmiany czegokolwiek u siebie.

**Zasada, ktora z tego wynika i ktora warto stosowac przy kazdym nastepnym `notApplicable`:**
check wylacza sie tylko wtedy, gdy **udogodnienie nie moze u tego ksztaltu produktu istniec**,
a nie wtedy, gdy vendor go po prostu nie zbudowal. Biblioteka npm **nie ma jak** wystawic
endpointu rejestracji OAuth (stad 9.15), ale **ma jak** opublikowac `llms.txt`, plik wejsciowy dla
agenta i dokumentacje serwowana maszynom, i jedna z nich to robi.

Zmiana filozofii punktacji dla bibliotek to **decyzja Krystiana**, nie moja, i liczby wyzej sa po
to, zeby byla latwa. Moja rekomendacja: **zostawic jak jest**.

## OSMIU VENDOROM KAZALISMY MIEC OAUTH, KTOREGO NIE MAJA GDZIE MIEC (9.15, CZEKA NA WDROZENIE)

Wyszlo z pytania o **nasz wlasny wynik**: `letagentsin.com` ma 11/12 i traci punkt na `oauth_dcr`,
choc nasz serwer MCP **nie wymaga zadnych poswiadczen**, wiec nie ma czego rejestrowac.

Sprawdzone na korpusie: **osiem wierszy, ktorym sami mowimy „rejestracja nie dotyczy"** (biblioteki
npm bez konta: `lexical.dev`, `quilljs.com`, `prosemirror.net`, `editorjs.io`, `slatejs.org`, plus
`searchkit.co`, `tomtom.com`, `gandi.net`), dostawalo **twarde zero** za brak endpointu rejestracji
OAuth i ladowalo z tym w mianowniku. Biblioteka npm nie ma serwera wydajacego tokeny.

**Precedens byl juz w kodzie, przy `self_serve`:** „A library with nothing to buy has no free tier
to state… **The signup checks already draw this line; this one was still charging open-source
projects for our confusion.**" Uzylem tego samego sygnalu, nie wlasnego osadu o tym, co jest
biblioteka.

**Zmierzone na ZAPISANYCH danych, bez skanowania kogokolwiek:** przepuscilem 170 wierszy przez nowa
regule i zmienia sie **dokladnie tych osiem**, 162 bez ruchu.

**To drugi raz TEGO SAMEGO DNIA, gdy regula byla napisana dla sasiada i nieprzeniesiona dalej**
(rano: „strona, ktora nas odmowila, to nie strona bez dokumentacji"). Warto przy nastepnej zmianie
reguly zadac sobie pytanie, ktorzy sasiedzi maja ten sam problem.

**Wdrozenie WSTRZYMANE do wygasniecia bariery szesciu godzin**, zeby wyszlo jednym reseedem razem
z tym, co jeszcze dojdzie. To ta sama zasada, ktora dzis kosztowala nas froale i bitmovin.

**Dwie pomylki wlasne z tej rundy, obie warte zapisania:**
- Zacommitowalem **wywalajacy sie test**, bo `npx tsx ... | tail -2` oddaje kod wyjscia `tail`,
  nie skryptu, wiec `&&` poszlo dalej. **Nie maskuj kodu wyjscia potokiem w lancuchu `&&`.**
- Atrapa czytala `f.oauth` zamiast `f.funnel.oauth`. Po poprawce **udowodnilem, ze test potrafi
  oblac**: z wylaczonym guardem `rules.mts` konczy sie kodem 1.

**Zmierzone i ODRZUCONE w tej samej rundzie** (zeby nikt nie szedl tam drugi raz):
- **Poszerzanie wykrywania dokumentacji.** Z dziewieciu domen bez dokumentacji tylko `shopify.com`
  da sie odzyskac, i to lamiac jawna regule „przekierowanie poza domene nie moze byc punktowane".
  `oramasearch.com/docs` przekierowuje do **panelu logowania** (21 znakow tekstu), wiec odrzucamy
  je slusznie.
- **Wiekszy budzet stron dokumentacji.** 27 wierszy mowi „zadna z przeczytanych stron nie jest
  o kluczach". Sprawdzilem zgadywane adresy (`/api-keys`, `/authentication`, `/auth`, `/api-key`)
  pod ich wlasnym korzeniem dokumentacji: **odpowiada 1 na 6**. Te wiersze sa uczciwie
  niemierzalne, a nie zle zmierzone.

## KORPUS NA 9.14, I CENA DWOCH RESEEDOW W JEDEN DZIEN

**170 wierszy na formule 9.14, 0 sprzecznosci, 0 rozjazdow, `awaitingRescan: 0`.** Reseed przeszedl
bez jednej nieudanej domeny (170 ok, 0 failed), a **obie dzisiejsze poprawki procesu zadzialaly
same z siebie**: skrypt poczekal, az strona zobaczy wszystkie wiersze („korpus zaciagniety
w calosci"), i dopiero potem uruchomil audyt, ktory wyszedl czysty za pierwszym razem.

**Guard regresji zglosil 4 obnizenia. Przeskanowalem kazde pojedynczo i zadne nie jest flaka**,
w przeciwienstwie do porannego reseedu, gdzie 5 z 6 nia bylo:

| domena | check | co sie stalo |
|---|---|---|
| froala.com | `answers_plain_request` | **403 na trzy proby**, takze przegladarkowemu UA |
| bitmovin.com | `user_agents_allowed` | brzeg odmawia nam `robots.txt` |
| kinde.com | `mcp_present` | znow pusty 2xx na kazdy POST, jak w rundzie 131 |
| telnyx.com | `llms_txt` | 2 z 12 probkowanych linkow martwe, zmiana po ich stronie |

**Dwa pierwsze to prawdopodobnie NASZA wina.** Froala i bitmovin **odpowiadaly jeszcze rano**,
a przestaly w dniu, w ktorym zrobilem **dwa pelne reseedy** (9.13 po poludniu, 9.14 wieczorem,
kazdy po dwa przebiegi) plus recznie sondy. To 4-6 wizyt u kazdego vendora w kilka godzin.
Zaden z tych wierszy nie oskarza ich o nic (oba mowia „niemierzalne"), ale **stracilismy dwa
pomiary i nie odzyskamy ich, dopoki nas nie odblokuja**.

**Sprawdzone przy okazji, bo watpliwosc byla powazna:** probkowanie 12 linkow z llms.txt jest
**deterministyczne** (co N-ty link, zero losowosci), wiec zmiana u telnyx nie jest artefaktem
losowania. Obietnica powtarzalnego pomiaru sie broni.

**Naprawione u zrodla:** `reseed.sh` **odmawia startu, jesli najnowszy skan korpusu ma mniej niz
6 godzin**, chyba ze `FORCE=1`. Komentarz „reseed raz na zestaw zmian" wisial tam od sierpnia
i nic nie kosztowal; teraz kosztuje. Warunek przetestowany na progach 0,0 / 3,4 / 5,9 / 6,0 / 12,7
godzin w obie strony z FORCE i bez.

**Regula: zmiana formuly nie jest darmowa.** Kosztuje 340 wizyt u 170 obcych firm i czesc z nich
odpowie blokada. Zbieraj zmiany formuly w jedna partie zamiast wdrazac je pojedynczo.

## PIETNASTY PRZEBIEG ADWERSARYJNY (14.08): 48 na 48, i znalezisko obok

**Cel: `machine_readable_api`**, jedyny z wielkich oskarzycieli, ktory nigdy nie przeszedl
udokumentowanego przebiegu, i najtanszy do obalenia, bo specyfikacja albo odpowiada pod adresem,
albo nie.

**Wynik: 48 oskarzen sprawdzonych niezaleznie OBIEMA drogami, ktorymi ten check zalicza, zero
niezgod.** Specyfikacja: 4 hosty (apex, www, api, docs) x 12 sciezek na domene, **kontrolka 8 na 8**
na wierszach, ktore zaliczamy przez OpenAPI. Negocjacja markdownu: `Accept: text/markdown` i sufiks
`.md` na trzech kandydatach na dokumentacje, **kontrolka 3 na 4** (czwarta tlumaczy sie zawezeniem
mojej sondy do `/docs`, gdy nasz wiersz wskazuje konkretna podstrone).

**Zdanie tego checku jest napisane uczciwie i to okazalo sie wazne:** „No OpenAPI spec at the
**5 usual paths**, none declared by …". Komentarz obok mowi wprost: mierzymy „nie znalezlismy
u ciebie", a nie „nie istnieje". Gdyby moja sonda cos znalazla, **nie obalilaby tego zdania**,
tylko pokazala luke w pokryciu. Nie znalazla.

## SITE, KTORY NAS ODMOWIL, TO NIE SITE BEZ DOKUMENTACJI (formula 9.14)

Prawdziwe znalezisko wyszlo obok, z pytania „dlaczego 51 wierszy `programmatic_provisioning` jest
niemierzalnych". Rozbicie: 27 razy „zadna z przeczytanych stron nie jest o kluczach", 14 razy „tylko
jedna strona", **9 razy „ani jednej"**. Te dziewiec ma `discovered.docs = BRAK`, a sa wsrod nich
`contentful.com` i `shopify.com`, ktore maja dokumentacji ogrom.

Sprawdzone recznie: **`froala.com` odpowiada 403, `contentful.com` 429.** A wiersz mowil:

> Unmeasurable: no documentation page could be found to read
> Unmeasurable: we could not read a single documentation page, so there was nothing to look in

**Ten sam skan, ta sama domena, dwie rozne historie:** sasiedni `machine_readable_api` pisal
uczciwie „froala.com answered 403 when we asked it for markdown". Regula byla wiec **juz napisana**
(„A page that would not answer is not a page that declares nothing", sierpien) i **nikt jej nie
przeniosl** do dwoch sasiadow. To jest twierdzenie o cudzym produkcie zrobione z pomiaru naszego
wlasnego dostepu, czyli ten sam blad co przy kinde w rundzie 131 i przy sendlayerze dzis rano.
**Froala jest jednym z czterech opublikowanych audytow.**

**Naprawione, formula 9.14:** oba checki czytaja teraz status i nazywaja go. Zweryfikowane na
produkcji: froala czyta „https://froala.com answered 403 when we asked for a page, so we never got
as far as looking for documentation".

**Blad w mojej wlasnej poprawce, zlapany przez test, nie przeze mnie:** status **0** (brzeg nie dal
nic) jest w JS falsywy, wiec `if (refused)` po cichu przepuszczal **najgorsza z trzech odmow** do
starego zdania. Test na `answered nothing` to wywrocil. Warunek jest teraz jawnie przeciw `null`.

**Do zrobienia osobno** (nie zmieszczone w tej rundzie): `lexical.dev` i `editorjs.io` naprawde maja
dokumentacje, tylko pod sciezkami, ktorych nie zgadujemy (`/docs/intro`, `/base-concepts/`), a
`shopify.com` i `livekit.com` trzymaja ja **na siostrzanej domenie** (`shopify.dev`, `docs.livekit.io`),
ktora regula on-brand slusznie odrzuca. Pierwsze to poszerzenie listy sciezek, drugie wymaga
zaufania linkowi z wlasnej strony glownej vendora i nazwania tego w werdykcie.

## TRASOWANIE: UCZCIWE 50 PROCENT BLEDU I TRZY OBALONE POMYSLY (14.08)

`find_providers` myli sie na **polowie pytan**, i to nie jest artefakt jednego zestawu: 29/58 na
`HELD_OUT_3`, potem **17/34 na swiezym `HELD_OUT_4`**. Zestaw spalony pokazuje 7,4 procent i mierzy
wylacznie to, jak dobrze slownik pamieta wlasna historie.

**`HELD_OUT_4` napisal SUBAGENT, ktory nie widzial regul** ani tego repozytorium: dostal sama liste
kategorii. To jedyny sposob, zeby zestaw byl uczciwy, bo kto przeczytal slowniki, ten nie napisze
juz o nich czystego pytania. Osiem z 34 pytan ma poprawna odpowiedz „nie wiemy" (payroll, rekrutacja,
prawo, dashboard BI, wspolna skrzynka), bo odmowa jest tu wynikiem, nie porazka.

**Dwie poprawki, obie zmierzone, obie bez regresji:**
- **`meaning` stemuje sie do `mean`**, jednego z najpospolitszych czasownikow. „a failover would
  mean real downtime" punktowalo bazy wektorowe rowno z pytaniem o postgresa, ktore naprawde
  zadawano. Sens zachowany fraza, bo goly czasownik i rzeczownik w „based on meaning" to dwie
  rozne rzeczy.
- **`google` nazywa firme sprzedajaca piecdziesiat produktow**, wiec „the copy team works out of
  a google sheet" punktowalo uwierzytelnianie. Kto pyta o przycisk logowania, pisze login, sign in
  albo oauth, i to zostalo. Zamienilo **bledna odpowiedz na milczenie** przy zerowym koszcie.
- Wczesniej tego samego dnia: **fraza `error tracking`**, czyli branzowa nazwa kategorii, ktora do
  niej nie trasowala.

**Trzy pomysly ZMIERZONE I ODRZUCONE** (zapisane, zeby nikt nie szedl ta droga drugi raz):

| pomysl | wynik |
|---|---|
| jedno trafienie w slownik nie wystarcza, potrzebne poparcie | **60,3 proc. bledu zamiast 50** i 58 regresji: zamienia 2 zle zgadywanki na 14 dodatkowych milczen |
| skasowac `log` ze slownika obserwowalnosci | +2 regresje, zero zysku w trafieniach |
| warstwa slow „wspierajacych" (3 pkt zamiast 10) dla `google`, `log`, `slow`, `dashboard`, `inbox` | swiezy zestaw 18/34, ale **5 regresji**: „why is production slow at 3am" i „log aggregation" to prawdziwe pytania o obserwowalnosc, w ktorych te slowa **sa** slowem decydujacym |

**Wniosek, ktory z tego plynie i ktory jest wazniejszy od samych liczb:** te slowa nie sa slabe,
one **decyduja zaleznie od kontekstu** („log aggregation" kontra „logs hours in a spreadsheet").
Tego nie da sie naprawic chirurgia na liscie slow i **kolejna proba tej klasy jest strata czasu**.
Realna poprawa wymaga czegos, co czyta podmiot zdania, a nie zbiór tokenow.

**Opublikowana liczba zaktualizowana**: opis narzedzia MCP podaje agentom wlasny wskaznik bledu,
a test w `rules.mts` pilnuje, zeby zgadzal sie z pomiarem. Przy okazji **pomylilem sie w arytmetyce**
tej liczby (policzylem 23 udzielone odpowiedzi zamiast 18, pomijajac piec pytan, na ktorych narzedzie
slusznie odmowilo) i **zlapal to test**, nie ja.

## AUDYT WLASNYCH NARZEDZI MCP (14.08): „error tracking" nie trasowalo nigdzie

Sprzedajemy gotowosc na agentow, wiec sciezka agenta u nas samych jest tą, na ktorej najmniej wolno
nam zawiesc. Przemierzona na produkcji.

**`scan_domain` dziala** i oddaje pelny wynik z odnosnikami do regul przy kazdym checku.

**`find_providers`: 5 na 6 swiezych pytan trafnie**, a szoste ujawnilo prawdziwa dziure.
„track errors in production and alert me" **nie trasowalo nigdzie**, mimo ze mamy kategorie
`error-monitoring` z siedmioma vendorami.

**Diagnoza, po przeczytaniu reguly zamiast zgadywania.** Trafienie w nasza wlasna proze nie
wystarcza (`if (scored[0].strong === 0) return null`); liczy sie `VOCABULARY`, czyli slowa
pytajacego. Slowo `error` **jest** w tym slowniku, wiec „errors in production" trasowalo poprawnie.
Rozwalalo to dopiero **slowo „track"**, ktore nalezy do analityki produktowej („track events"), wiec
czasownik i dopelnienie punktowaly rowno i **regula remisu slusznie milczala**. Tyle ze branzowa
nazwa tej kategorii to doslownie **error tracking**: tak nazywaja sie Sentry, Rollbar i Bugsnag.

**Naprawione idiomem, ktory juz tam byl:** wpis w `PHRASES` (gdzie mieszka juz `javascript errors`),
bo to ten sam ksztalt: kwalifikator kontra podmiot, i decyduje podmiot. **Zero regresji** na zestawie
routingowym (138/149 przed i po). Przypiete pieciu testami, w tym **dwoma kontrolkami**, ktore
pilnuja, ze „track how many users click" i „track conversion funnels" zostaja w analityce.
Zweryfikowane na produkcji w obie strony.

**Falszywy trop po drodze, znowu moj:** pierwsze szesc pytan wyslalem z argumentem `problem`,
a narzedzie przyjmuje `job`. Tool zachowal sie **poprawnie**, proszac o opis problemu, i wygladalo
to jak awaria calego narzedzia. Schemat wolno przeczytac przed postawieniem diagnozy.

## ODPOWIEDZ KLIENTA WRACALA ODBICIEM (14.08, naprawione i wdrozone)

Wyszlo z pytania, ktorego nikt nie zadal: **maile wychodza od `scorecards@letagentsin.com`, a ludzie
odpowiadaja na maile.** Zmierzone, nie zalozone.

| adres | wynik sondy |
|---|---|
| `hello@letagentsin.com` | **delivered**, wladowal sie do skrzynki odbiorczej Krystiana o 16:07:53 |
| `scorecards@letagentsin.com` | **BOUNCED** |

Czyli do dzis **kazda odpowiedz klienta na maila z monitoringu wracala odbiciem**, a zaden z nas by
sie o tym nie dowiedzial: nadawca nie byl nigdzie publikowany i nikt nigdy nie sprawdzil, czy
odbiera. Adres, ktory reklamujemy w cenniku, na stronie raportu i w komunikacie o nieudanym
zapisie, to `hello@`, i ten dziala.

**Naprawione:** `sendEmail` ustawia `Reply-To` (domyslnie `hello@letagentsin.com`, nadpisywalne
przez `LETAGENTSIN_REPLY_TO`). Zweryfikowane **na produkcji**: mail potwierdzajacy obserwacje
wyszedl z naglowkiem `Reply-To: hello@letagentsin.com`.

**Reszta sciezki klienta przemierzona tego samego dnia, cala na produkcji:**
- **Skan odwiedzajacego bez konta:** `POST /api/scan` zapisuje raport, `/r/<id>` oddaje 200 i 73 kB
  z sekcjami „Fix this first", rozbiciem na etapy i pelna lista checkow.
- **Monitoring:** zapis → mail z wlasciwej domeny → `/watch/confirm` (200, `confirmedAt`) →
  `/watch/stop` (200, `stoppedAt`). Testowane na wlasnej skrzynce i na **naszej wlasnej domenie**,
  zeby nie generowac ruchu u obcych.
- **Sciezka platnego audytu** konczy sie na `mailto:hello@letagentsin.com` i ten adres dociera.

## Zablokowane na Krystianie (lista z 2026-08-08, PRZEJRZANA 2026-08-14)

**Dwie z pieciu pozycji byly juz nieaktualne i nikt tego nie odnotowal.** Punkt 1 (domena) zamknal
sie razem z `letagentsin.com`, a punkt 2 (nadawca w Resend) **12 sierpnia**: domena jest w Resend
zweryfikowana z wlaczona wysylka, a `LETAGENTSIN_FROM` na Heroku wskazuje
`Let Agents In <scorecards@letagentsin.com>`. Przez dwa dni lista blokerow straszyla czyms, co bylo
zrobione. **Przy kazdym przejrzeniu tej listy sprawdz stan, zamiast czytac wpis.**

**Cala sciezka monitoringu zweryfikowana od konca do konca na produkcji 14.08**, na wlasnej
skrzynce testowej i na naszej wlasnej domenie, zeby nie generowac ruchu u obcych:

| krok | wynik |
|---|---|
| `POST /api/watch` na adres spoza konta Resend | `{"ok":true,"delivered":true}` |
| mail | wyszedl z `scorecards@letagentsin.com`, z linkiem potwierdzajacym i zatrzymujacym |
| `/watch/confirm/<token>` | 200, `confirmedAt` zapisane |
| `/watch/stop/<token>` | 200, `stoppedAt` zapisane |

**Falszywy alarm po drodze, wart zapisania, bo to trzeci raz ten sam ksztalt:** najpierw zmierzylem
wysylke **lokalnie, bez `LETAGENTSIN_FROM`**, wiec kod spadl na nadawce testowego
`onboarding@resend.dev` i dostalem 403 „mozesz wysylac tylko na wlasny adres". Wniosek brzmialby
„monitoring nie dziala dla zadnego klienta" i bylby falszywy. **Testowalem inna konfiguracje niz
produkcyjna**, dokladnie tak jak wczesniej sondowalem z laptopa zamiast z dyna. Zanim ogloszisz,
ze cos jest zepsute na produkcji, uruchom to ze srodowiskiem produkcji.

**Zostaja trzy pozycje, wszystkie decyzje, nie kod:** sciezka zakupu, nazwanie licencji korpusu
i model sprzedazy (patrz sekcja o przepakowaniu cennika).

### Oryginalna lista z 2026-08-08

Produkt jest technicznie gotowy: korpus 156 domen na formule 5.0, audyt czysty, każdy werdykt
nazywa adres, który da się odpalić curl-em. **Do startu w poniedziałek brakuje wyłącznie rzeczy,
których agent nie ma prawa rozstrzygnąć sam.**

1. ~~**Domena `stackpick.ai`** (albo inna).~~ **ZROBIONE:** `letagentsin.com`.
2. ~~**Zweryfikowany nadawca w Resend.**~~ **ZROBIONE 12.08**, potwierdzone dostarczeniem na adres
   spoza konta Resend 14.08.
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

## Runda 2026-08-12 (145): audyt UX w przegladarce znalazl cztery rzeczy, a produkcja piata

**Audyt przeszedl przez Chrome, nie przez czytanie kodu**, i to jest jedyny powod, dla ktorego
te rzeczy wyszly.

1. **`/v/<domena>` publikowal KAZDY skan, jaki ktokolwiek kiedykolwiek uruchomil.** `vercel.com`
   pokazywal wynik z **formuly 8.0** sprzed doby, ze zdaniami cytujacymi **martwy adres
   herokuapp**, pod tytulem „Is vercel.com ready for AI agents?". Nieaktualny werdykt przebrany
   za aktualny to dokladnie ten blad, ktorego wykrywanie sprzedajemy. Teraz: banner o starej
   formule, `robots: noindex`, link do przeskanowania.
2. **Domena, ktorej nie mierzylismy, dostawala gole 404.** To najgorsza mozliwa odpowiedz dla
   jedynego odwiedzajacego, na ktorym nam zalezy: **kogos, kto wpisuje wlasna domene**. Teraz
   dostaje ofere skanu z polem juz wypelnionym (`/?domain=…`).
3. **Formularz obserwacji nie mowil nic o cenie.** Obiecywal usluge i milczal o koszcie, czyli
   po cichu sugerowal darmowe. Teraz mowi wprost, ze jest darmowe w fazie budowy i **zapytamy,
   zanim cokolwiek zacznie kosztowac**.
4. Etykieta przycisku lamala sie na dwie linie.

**Piata rzecz znalazla sie sama, w trakcie audytu: PRODUKCJA PADLA.** Rano opublikowalismy
**181 adresow** i zglosilismy sitemap. Crawler Meta (`57.141.20.x`) przeczytal **70 stron `/r/`
i 52 strony `/v/` rownolegle**, kazda `force-dynamic` i kazda z odczytem z Mongo, i jedno dyno
przez minute odpowiadalo 503 **na wszystko**. Naprawione: `robots.txt` odcina `/r/` (to strony
pojedynczych skanow, sa ich tysiace i kazda jest nieaktualna po reseedzie) oraz osobiste linki
`/watch/`, a strony `/v/` sa **cache'owane na 10 minut** (znacznie krocej niz odstep miedzy
dwoma skanami tej samej domeny, wiec nic tam nie jest przeterminowane). Czasy po naprawie:
`/v/stripe.com` 0,28 s, `/v` 0,37 s.

**Wniosek, ktory boli i wart jest zapamietania:** nasza wlasna karta wyniku przechodzi
`no_crawl_delay` i `user_agents_allowed`, bo **wpuszczamy wszystkich**. I wlasnie wpuszczanie
wszystkich nas przewrocilo. **Otwartosc jest zobowiazaniem wydajnosciowym, nie tylko polityka**,
i nasza metodologia tego nie mierzy: dajemy punkt za brak `Crawl-delay`, nie sprawdzajac, czy
strona to uniesie. Kandydat na przyszla dyskusje, nie na szybka regule.

**Otwarte:** jedno dyno to jedyny serwer; przy kolejnej fali crawlerow trzeba bedzie rozwazyc
drugie (decyzja kosztowa Krystiana). Platnosci (Stripe vs Paddle) nadal nietkniete.

## Runda 2026-08-12 (144): przewidywalismy, ze zmiana nazwy poruszy korpus. Nie poruszyla

**Reseed po przeprowadzce na `letagentsin.com`, formula 9.2: 2550 werdyktow, ruszylo 7
(0,27 procent), w podlodze szumu.** Przewidywanie **3 z 3 potwierdzone**: `porkbun.com` wychodzi
z „nie dotyczy" na `signup_reachable` pass, `signup_no_captcha` fail (reCaptcha i Turnstile) oraz
`self_serve` niemierzalne. Czyli regula od rejestracji za strona logowania robi dokladnie to,
co zmierzylem wczesniej na 25 domenach: **1 wiersz, nie wiecej**.

**Wynik negatywny, wart wiecej niz pozytywny, bo obala moja wlasna teze.** Zapowiadalem, ze ten
reseed poruszy wiecej wierszy niz zwykle, bo **user-agent skanera jest cytowany w zdaniach
o odmowach** i czesc WAF-ow reaguje na konkretny ciag. **Nie poruszyl.** Cztery niespodzianki to
znane chwiejne wiersze (`froala.com` i `vonage.com` na 403/200, `postmarkapp.com` na naszym 429,
`getunleash.io` na captchy montowanej warunkowo), a nie efekt nowej nazwy. Wniosek do zapamietania:
**zmiana wlasnego user-agenta nie jest zdarzeniem pomiarowym**, wiec kolejnym razem nie ma powodu
robic z tego osobnego reseeda ani osobnego przewidywania.

**Zbudowany monitoring** (`src/lib/watch.ts`, `watch-email.ts`, `/api/watch`, `/api/cron/watch`,
`/watch/confirm/<id>`, `/watch/stop/<id>`, formularz na kazdej stronie `/v/<domena>`):
- **Adres i domena, zero konta i hasla.** Nie skromnosc, tylko konsekwencja: karzemy kazdego
  dostawce punktem za sciane przed nieobsadzona rejestracja, wiec nasza musi byc do przejscia
  przez agenta. Rezygnacja jednym kliknieciem, bo prosba o zalogowanie przed wypisaniem to ta
  sama sciana ustawiona przy wyjsciu.
- **Mail tylko przy ruchu werdyktu**, nigdy przy pierwszym sprawdzeniu, nigdy „bez zmian".
  Cotygodniowy mail o niczym uczy czlowieka, zeby przestal otwierac takze ten wazny.
- **Spadek do „niemierzalne" jest zglaszany, ale nigdy nazwany strata**, bo mowi o naszym
  zasiegu, nie o ich stronie. Oblozone testami razem z „nowy check nie jest zmiana z niczego".
- **Jedna domena na wywolanie crona**: Heroku ubija ciche zadanie po 30 s, skan trwa do 27.

**Decyzja cennikowa (Krystian, 2026-08-12): monitoring 99 USD/mies. za domene.** Struktura:
darmowy skan → monitoring → audyt na rozmowe. Argument, ktory ja przewazyl: **cena nie decyduje
o konwersji, bo nikt jeszcze nie wie, ze ma ten problem**; kto rozumie problem, zaplaci 99 bez
mrugniecia, a kto nie rozumie, nie kupi i za 29. Niska cena nie kupuje konwersji, tylko obniza
przychod od tych nielicznych, ktorzy i tak zaplaca.

**Otwarte, czeka na Krystiana: Stripe czy Paddle.** Stripe od reki, ale VAT OSS od klientow z UE
rozliczamy sami. Paddle jest sprzedawca formalnym i zdejmuje VAT calkowicie, za wyzsza prowizje
i po ich weryfikacji (kilka dni). To decyzja ksiegowa, nie techniczna.

## Runda 2026-08-12 (143): własna domena, i 170 pomiarów, do których nie było jak dojść

**Domena kupiona i podłączona w jednej sesji.** Rekomendacja rejestratora oparta na trzech
rzeczach, których nasz skan **nie mierzy** i które sprawdziłem ręcznie: **ALIAS na apeksie**
(twardy wymóg Heroku, apeksu nie wskażesz CNAME-em), cena rejestracji równa cenie odnowienia
(11,08 USD, sprawdzone w publicznym API cen Porkbuna), WHOIS privacy w cenie. Ironia jest
warta zapisania: **korpus dawał Porkbunowi 6/13, bo nasz własny skaner nie widział ich speca**
(patrz runda 142), czyli o mało nie odrzuciliśmy najlepiej przygotowanego rejestratora
na podstawie własnego błędu.

**Pułapka, której nie było w planie:** to nie były rekordy parkingowe `A`, tylko przekierowanie
na `letagentsin-com.l.ink` trzymane przez `ALIAS` i `CNAME *`. Skasowanie **samego
przekierowania** zabrało oba rekordy ze sobą. Gdybym kasował rekordy pojedynczo, przekierowanie
odtworzyłoby je.

**Druga pułapka, znaleziona przez skan samych siebie godzinę po przeprowadzce:** `SITE_URL`
przestawia się jedną zmienną, ale **pięć plików w `public/` ma adres wpisany na sztywno**
(`robots.txt`, `agents.md`, `agent-signup.md`, `.well-known/mcp.json`, `.well-known/agent-access.json`
z ośmioma wystąpieniami). Nasza karta MCP ogłaszała serwer pod starym hostem. To jest **dokładnie
ta klasa błędu, którą sprzedajemy**: karta obiecująca serwer tam, gdzie go nie ma. Kandydat na
nową regułę: sprawdzać, czy adres w karcie MCP zgadza się ze skanowaną domeną.

**Nasz własny wynik: 12/13 mierzalnych, 92 procent, trzecie miejsce w korpusie 170 firm**
(lepsze tylko openrouter.ai, cloudflare.com i zenrows.com po 93, mediana 60). Jedyna prawdziwa
porażka `oauth_dcr` jest uczciwa: nie mamy kont.

**Naprawiona dziura, która kasowała cały nasz dorobek pomiarowy:** każda karta wyniku żyła pod
`/r/<id>`, czyli adresem **jednego skanu**, a reseed robimy co kilka dni i mintujemy nowe `id`.
Każdy, kto by nas zacytował, linkowałby stronę na chwilę przed zniknięciem. W sitemapie było
**11 adresów** przy **170 pomiarach**. Teraz `/v/<domena>` pokazuje najnowszy skan pod stałym
adresem, `/v` linkuje wszystkie (sitemap mówi, że strony istnieją, dopiero linki mówią, że są
coś warte), `corpus.json` ma `vendorUrl` obok `scorecardUrl`, a sitemap ma **181 adresów**.

**Rozmowa o cenniku, do zapamiętania, bo wróci:** teza „full audit kosztuje grosze, więc dajmy
$29" jest prawdziwa o **skanie** (koszt krańcowy ~0, i już jest darmowy) i fałszywa o **audycie**,
bo audyt to N=6 izolowanych przebiegów agentowych plus czytanie transkryptów przez człowieka;
compute to kilkanaście dolarów, koszt to godziny. W `harness/` są cztery briefy i **jeden** plik
wyniku, więc ten produkt jest zbudowany w kilku procentach. Jednorazowe $29 jest najgorszym
punktem skali (za drogo na bezmyślne kliknięcie, za tanio na uwagę człowieka) i przesuwa nas
z kotwicy „audyt bezpieczeństwa" na „gadżet SEO". Kierunek do przetestowania: **monitoring
cykliczny**, w pełni automatyczny, zgodny z dowodami rynkowymi już zapisanymi niżej.

## Runda 2026-08-12 (142): sprzedajemy wykrywanie speców, a własnego rejestratora oskarżyliśmy o brak speca

Wybierając rejestratora pod `letagentsin.com` sprawdziłem, co nasz korpus mówi o dziesięciu z nich,
i **Porkbun wyszedł na przeciętniaka (6/13)** z trzema porażkami, w tym „No OpenAPI spec". Poszedłem
to zweryfikować przed rekomendacją i **to my się myliliśmy**.

**Co Porkbun naprawdę publikuje:** spec pod `/api/json/v3/spec` (200, `application/json`),
`llms.txt`, `llms-full.txt`, klucze API ograniczane do IP i domen, darmowy sandbox. Deklaruje to
**dwa razy**: nagłówkiem `Link: <…/spec>; rel="describedby"` i w `<head>` strony docs. My
sprawdzaliśmy **wyłącznie pięć zgadywanych ścieżek** (`/openapi.json` i spółka), więc każdy, kto
trzyma spec pod własnym adresem i uczciwie go deklaruje, dostawał od nas zero.

**Reguła po zmianie** (RFC 8631 i RFC 8288): stronę dokumentacji, którą **i tak już pobieramy**,
czytamy pod kątem `rel="service-desc"` i `rel="describedby"`, w nagłówku i w `<head>`.
Deklaracja **nie jest dowodem**: URL trzeba pobrać i ciało musi się czytać jak spec, tym samym
testem co zgadywane ścieżki. `rel="alternate"` wpuszczamy tylko z typem JSON/YAML **i** słowem
mówiącym o specu, bo inaczej punkt dostałby `docs.github.com` za publikowanie wersji hiszpańskiej.

**Pomiar przed wdrożeniem** (63 domeny korpusu bez speca, skan lokalny): **2 zyskały punkt
z deklaracji** (`porkbun.com` przez `describedby`, `postmarkapp.com` przez dwa `service-desc`
w nagłówku), 2 kolejne (`locationiq.com`, `sentry.io`) przechodzą przez negocjację markdown,
czyli to szum, nie zasługa tej zmiany. **Zero skanów wyczerpało budżet czasu**, mimo dwóch
dodatkowych żądań na domenę.

**Test znalazł dziurę, której nie szukałem:** pisząc przypadek „href, którego nie da się
rozwiązać" zobaczyłem, że `javascript:alert(1)` **rozwiązuje się bez błędu** i poszedłby prosto
do `fetchUrl`. Stąd filtr na schemat. To jest argument za pisaniem przypadków, które mają **nie**
trafić, a nie tylko tych, które mają.

**Weryfikacja po reseedzie: 9.0 → 9.1, 2550 werdyktów, ruszyło 9 (0,35 procent), w normie
podłogi szumu (0,20-0,64).** Z przewidywanych dwóch potwierdził się **jeden**: `porkbun.com`
fail → pass. `postmarkapp.com` **nie ruszył i to nie jest kontrprzykład**: w tym samym przebiegu
jego dwa inne checki zeszły do „niemierzalne" z powodu **429, czyli naszej własnej serii żądań**,
więc strona docs nie odpowiedziała i nie było czego czytać. Skan pojedynczy, poza serią,
potwierdza regułę: `OpenAPI at https://postmarkapp.com/swagger/server.yml, which your docs page
declares with rel="service-desc"`. Wiersz doskanowany osobno przez konsolę produkcyjną.
**Do zapamiętania: reseed sam sobie robi rate limit i to podszywa się pod porażkę reguły.**
Audyt po wszystkim: 170 wierszy na 9.1, 0 sprzeczności, 17 liczb i 3 twierdzenia o nazwanych
dostawcach zgodne z danymi.

**Znalezione przy okazji, do następnej rundy, z dowodami:** `porkbun.com` linkuje `/account`,
a rejestracja stoi pod `/account/create` (200, formularz w serwerowym HTML, **Turnstile i
reCaptcha**). Nasze wykrywanie szuka słów `signup`/`register`, więc nie widzi nic i publikuje
„nothing on the site links to pricing or to an account signup". Skutek jest **gorszy niż zero
punktów**: trzy sprawdzenia wychodzą jako „nie dotyczy", czyli mówimy firmie, że nie ma
rejestracji, podczas gdy ona ją ma i zamyka captchą. To jest dokładnie to zdanie, po które
klient do nas przychodzi. **Nie doklejałem tego do tej zmiany**, bo wtedy nie da się rozdzielić,
co przesunęło korpus.

## Runda 2026-08-12 (141): publiczna ścieżka sprawdzona, bo całą noc chodziłem konsolą

Kilkanaście wdrożeń tej nocy weryfikowałem **endpointem konsoli z tokenem**, czyli nie tą drogą,
którą idzie gość ze strony. Przeszedłem ją więc od początku do końca:

- **Skan bez tokenu**: HTTP 200, pełna karta na formule 9.0, `example.com` 3/9 z sensownymi
  werdyktami (m.in. „nothing on the site links to pricing or to an account signup", czyli nowa
  gałąź z rundy 133 zachowuje się poprawnie także na stronie, która naprawdę nie ma kont).
- **Izolacja korpusu trzyma się w danych, nie tylko w zdaniu**: po tym skanie korpus ma dalej
  **170 wierszy** i `example.com` nie ma w nim. Obietnica „twój skan nie dołącza do naszych
  danych" jest prawdziwa.
- **Karta wyniku renderuje się** (78 kB, nagłówek „agent readiness 3/9", sekcja mailowa na miejscu).
- **Okno ponownego użycia działa**: drugi skan tej samej domeny w ciągu 15 minut oddał **ten sam
  identyfikator**, czyli nie skanujemy dwa razy tego samego na cudze życzenie.

Limity dla obcych: 5 skanów na domenę na godzinę, 30 na wołającego. Nic tu nie zmieniałem.

**Jedno do odnotowania dla Krystiana:** karta publicznego skanu podaje **prywatnego Gmaila** jako
adres do usunięcia danych. To ta sama pozycja co ścieżka zakupu i siedzi na liście blokerów.

## Runda 2026-08-12 (140): liczby o trasowaniu w opisie narzędzia oblewają teraz build

Ryzyko, które sam stworzyłem w rundzie 127: opis narzędzia `find_providers` cytuje **siedem liczb**
z zestawu odłożonego, wpisanych ręcznie. Były prawdziwe, gdy je pisałem. **„16 na 20" też było**,
i przetrwało długo po tym, jak przestało.

`npm run build` przelicza teraz wszystkie siedem z tych samych pytań i porównuje z opublikowanym
zdaniem. Pytania wyprowadzone do `scripts/routing-questions.ts`, więc przebieg drukujący wynik
i strażnik pilnujący opisu czytają **tę samą listę**.

**Sprawdziłem, że strażnik umie oblać:** podmiana jednej liczby dała
`ZLE odpowiedzi poprawnych: dostalem 24, oczekiwane 25` i zatrzymała build. Test, którego nie
widziałem na czerwono, jest tylko nadzieją.

Przy okazji pipeline zadziałał jak trzeba: pierwszy commit miał import z rozszerzeniem `.mts`,
którego typecheck nie przyjmuje, i **hook Heroku odmówił przyjęcia zepsutego builda**. Commit
zdążył trafić na origin, bo w moim łańcuchu `npm run build | tail` zwraca kod `tail`, nie builda.
**Nie łącz builda z pushem przez `|` i `&&` w jednej linii**, bo pierwsza połowa łańcucha kłamie.

## Runda 2026-08-12 (139): dwa zdania na `/methodology`, które przestały być prawdziwe

Przegląd niepilnowanych liczb doniósł dwa realne znaleziska, oba na `/methodology`
(na `/report` wszystkie liczby są liczone z danych, więc tam nie ma czego pilnować):

1. **„That is the stage this corpus measures as 95 percent solved"** - dziś to **91**. Liczba
   wpisana ręcznie w zdanie porównujące nas z innym narzędziem, więc nic jej nie przeliczało.
   Oba udziały w tym zdaniu biorą się teraz z **tego samego raportu, który drukuje `/report`**,
   więc nie mogą się z nim rozjechać.
2. **„our own adversarial audits put the error rate at 0.39 percent, which is below this floor"** -
   **odwróciło się tej nocy**. Podłoga spadła do 0,20, bo przestaliśmy liczyć własne ucięte skany
   jako zmienność internetu, więc 0,39 jest teraz **większe**. Zdanie mówi to wprost razem
   z powodem, zamiast cicho zostać przy wygodniejszej wersji.

**Weryfikacja na produkcji złapała mój własny błąd**, którego build nie widział: udziały etapów
są ułamkami, więc strona przez chwilę pisała „1 percent solved" zamiast 91. To jest dokładnie ten
powód, dla którego każda zmiana tej nocy kończyła się czytaniem strony, a nie zielonym buildem.

## Runda 2026-08-12 (138): liczba podana w dwóch miejscach zaczęła się kłócić sama ze sobą

Pozycje 1 i 2 z listy są na Krystianie, więc wziąłem to, czego nikt nie pilnuje: liczby na
`/report` i `/methodology`. `npm run audit` sprawdza **17 liczb, wszystkie na `/findings`**,
a te dwie strony nie mają strażnika.

Znalezione od razu: `/report` mówił czytelnikom, żeby ignorowali różnice mniejsze niż
**0,64 procent**, podczas gdy `/methodology` od kilku rund mówi **0,20**. Ta sama wielkość, dwie
strony, dwie wartości, i akurat ta służy do decydowania, czy ruch w wynikach coś znaczy.

Naprawione **konstrukcją, nie strażnikiem**: podłoga żyje teraz jako `NOISE_FLOOR_PERCENT`
w `src/lib/published.ts`, obok zapisu, z czego została zmierzona, a obie strony ją czytają.
Liczba podana w dwóch miejscach to liczba, która się kiedyś pokłóci; strażnik wykryłby to po
fakcie, a stała nie pozwala temu zajść.

## Runda 2026-08-12 (137): bilans nocy w jednej liczbie, i nie jest to liczba punktów

Reseed po bezpieczniku: **8 ruszonych werdyktów, 0,31 procent, zero uciętych skanów** (poprzednie
przebiegi miały po trzy do pięciu). Sześć z ośmiu ruchów to **niemierzalne → zmierzone**, czyli
bezpiecznik oddał budżet checkom, które wcześniej nie zdążyły zapytać: `weglot.com` ma znowu
mierzalną rejestrację (`dashboard.weglot.com/register`), `postmarkapp.com` provisioning,
`bitmovin.com` i `name.com` punkt wejścia, `uploadcare.com` provisioning.

Efekt na całym korpusie: **2419 → 2428 mierzalnych punktów**, **257 → 252 werdyktów niemierzalnych**.

**Ale najważniejsza liczba nocy idzie w drugą stronę i tak ma być.** Rano korpus miał **226**
werdyktów niemierzalnych, teraz ma **252**. Przybyło ich **26**, bo tej nocy systematycznie
zamieniałem twierdzenia, których nie umiemy udowodnić, na uczciwe „nie zmierzyliśmy tego":
szesnastu firmom przestaliśmy mówić, że nie mają kont, czterem, że nie mają serwera MCP,
a jednej, że żaden agent nie dociera do jej strony. To jest cena wiarygodności i jedyna cena,
jaką warto tu płacić.

## Runda 2026-08-12 (136): hover nie był wolny, tylko ma wildcard DNS

`hover.com` ucinał się na budżecie **za każdym razem**, zawsze na tych samych sześciu checkach.
Pierwsza hipoteza: strona jest wolna. **Zmierzone z dyno: jest szybka** - strona główna 3,9 s,
robots.txt 254 ms, cennik 1,9 s, reszta poniżej sekundy.

Druga hipoteza: coś na tym hoście wisi, więc dołożyłem bezpiecznik liczący przekroczenia czasu
**per host**. **Nie zmienił niczego**, i to samo w sobie było informacją.

Prawdziwa przyczyna: **`hover.com` ma wildcard DNS**. `mcp.hover.com`, `api.hover.com`,
`docs.hover.com` i moja kontrolka o nazwie `mcp-letagentsin-control-8f3a1c.hover.com` **wszystkie
przyjmują połączenie i milczą po 8 sekund każda**. Licznik per host nigdy nie dobijał do trzech,
bo za każdym razem to inna nazwa, pytana raz. Liczony **per witryna** dobija natychmiast.

Bezpiecznik blokuje tylko nazwy, które w tym skanie **nic nie odpowiedziały**, więc zdrowy apex
czyta się dalej, a wyimaginowane subdomeny przestają kosztować budżet. Efekt na produkcji, trzy
skany z rzędu: **`hover.com` 3/11 mierzalnych, zero ucięć**, wcześniej 3/5 z sześcioma checkami
poza mianownikiem. Jego udział spadł z pozornych 60 na uczciwe 27 procent, bo przestaliśmy
wykluczać checki, których po prostu nie zdążyliśmy zadać.

**Wniosek metodyczny, drugi raz tej nocy:** gdy poprawka nie zmienia nic, to jest wynik pomiaru,
a nie powód, żeby dołożyć drugą. Za pierwszym razem (runda 132) była to flaga patrząca na złą
kontrolkę, teraz licznik liczący złą rzecz.

## Runda 2026-08-12 (135): podłoga szumu spadła z 0,64 na 0,20 procent i wiadomo dlaczego

Czwarty pomiar, ta sama formuła 9.0 po obu stronach: **5 werdyktów z 2550, czyli 0,20 procent**.
Ciąg wygląda tak: **0,64 → 0,27 → 0,39 → 0,20**, i to nie jest przypadek ani wygładzanie liczby.
Między 0,39 a 0,20 leżą **trzy poprawki znalezione przez czytanie, co się rusza**, a nie przez
liczenie, ile się rusza: ponawianie uciętych skanów (129, 134), brzeg połykający POST-y raportowany
jako niemierzalny zamiast „brak serwera MCP" (131-132) i „nie dotyczy" tylko dla firm bez cennika
(133).

`/methodology` mówi teraz **0,20 jako liczbę do użycia** i tłumaczy, że wcześniejsze były większe,
bo część tego, co liczyły, była nasza. Zdjęcie asekuracyjnego „bierz największą z trzech" jest tu
świadome: trzymanie 0,64 po naprawieniu własnego zegara byłoby chowaniem się za pomiarem, o którym
wiemy, że jest zawyżony.

**Co zostało w tych pięciu wierszach:** dwa serwery MCP odpowiadające raz tak, raz nie
(`kinde.com` przeszedł tym razem z niemierzalnego na żywy 401, czyli ich brzeg raz połyka POST-a,
a raz nie), dwie strony dokumentacji odmawiające za pierwszym razem i odpowiadające za drugim,
i jedna strona renderująca się różnie zależnie od tego, na którą podstronę trafimy.

## Runda 2026-08-12 (134): 32 z 32 przewidzianych, a niespodzianki pokazały dziurę w mojej łatce

Reseed 9.0: **43 ruszone werdykty, z tego 32 przewidziane co do wiersza i potwierdzone 32 na 32**.
Pierwszy raz przewidywanie miało dziesiątki pozycji i wszystkie się sprawdziły.

Jedenaście niespodzianek warto przeczytać, bo trzy z nich nie są pogodą:

- **`postmarkapp.com`**: „3 documentation pages we selected did not answer (**429, and a 429 is our
  own burst rather than an answer about agents**)". Zdanie z rundy 124 w akcji: to, co przez
  tygodnie czytaliśmy jako „ich brzeg nas odrzuca", jest naszym własnym obciążeniem i teraz tak
  jest napisane.
- **`name.com`**: `typed_package` z porażki na zaliczenie, bo `@namecom/core-api` przeszedł
  **z 0.0.0 („placeholder - real SDK publishes later") na 1.33.0 z typami**. To zmiana u vendora
  w ciągu jednej nocy, nie u nas.
- **`hover.com`**: `answers_plain_request` na „scan ran out of time" **mimo** poprawki z rundy 129.
  Pętla ponawiająca sprawdzała tylko, czy wrócił scorecard, więc ponowiony ucięty skan szedł do
  publikacji jako „recovered". Poprawione: ponawia jeszcze raz z dłuższą przerwą i raportuje
  `STILL TRUNCATED`.

**Przy okazji hover.com wyszło coś, co nie jest usterką:** skanowany cztery razy ręcznie ucina się
**za każdym razem i zawsze na tych samych sześciu checkach**. To nie migotanie, tylko strona,
która z naszej sieci nie mieści się w 27 sekundach. Zdanie obiecywało „a rescan usually completes",
czyli było fałszywe dokładnie tam, gdzie vendor by je przeczytał. Teraz mówi, co znaczy powtarzające
się ucięcie: ich strona odpowiada na nasze żądania dłużej, niż wynosi budżet.

## Runda 2026-08-12 (133): „nie dotyczy" mówiło szesnastu firmom, że nie mają kont

Drugie źródło szumu z rundy 130 to `planetscale.com`, który raz ma znajdowaną stronę rejestracji,
a raz nie. Pięć skanów z dyno pod rząd: **5 na 5 dobrze**, więc migotanie jest rzadkie i nie do
odtworzenia na żądanie. Ale stan awaryjny okazał się ciekawszy od samego migotania.

Gdy skan nie znajdzie linku do rejestracji, publikujemy **„Not applicable: nothing on the site
links to an account signup"**. To nie jest „nie znaleźliśmy", tylko **twierdzenie, że produkt nie
ma kont**, i wyjmuje dwa checki z mianownika dostawcy. Takich wierszy jest **25**.

Sprawdziłem każdy z nich, czytając stronę główną niezależnie od kodu odkrywania:
**16 z 25 publikuje cennik**, a **trzy linkują rejestrację prosto ze strony głównej**
(`filestack.com` → `/signup-free/`, `magicbell.com` → `app.magicbell.com`, `timekit.io` →
`admin.timekit.io/create`). Przy okazji złapałem **własny fałszywy alarm**: `gandi.net` wyszedł
w mojej sondzie jako „ma rejestrację", bo na stronie stoi „Register a domain", co jest rejestracją
domeny, nie konta.

Formuła **9.0**: produkt z cennikiem dostaje **niemierzalne** ze zdaniem nazywającym jego cennik
(„we found no link to an account signup on the pages we read, while you publish prices at …"),
a „nie dotyczy" zostaje tam, gdzie nie ma ani cennika, ani rejestracji, czyli u bibliotek
(`editorjs.io`, `lexical.dev`, `prosemirror.net`, `slatejs.org`). **Punktacja się nie zmienia**,
bo oba kształty i tak są poza mianownikiem; zmienia się to, co twierdzimy o cudzej firmie.

Przewidywanie reseedu spisane co do wiersza: **32 zmiany werdyktu** (16 domen × 2 checki),
zero zmian punktów.

## Runda 2026-08-12 (132): czterech dostawców, nie jeden, i guard, który zgłosił własne słownictwo

Reseed 8.9 potwierdził przewidywanie **1 z 1** (`kinde.com:mcp_present` fail → unmeasured), ale
reguła znalazła **czterech** dostawców, których brzeg połyka każdy POST z naszej sieci:
`kinde.com`, `modal.com`, `pdfmonkey.io` i `quilljs.com`. Wszyscy czterej byli dotąd publikowani
jako „no MCP surface", czyli **cztery twierdzenia o cudzym produkcie zrobione z pomiaru cudzego
brzegu**, a nie jedno. Liczba żywych serwerów MCP nie drgnęła: dalej **67**.

**Audyt zgłosił sprzeczność i sam był jej źródłem.** `quilljs.com: signup_no_captcha says nothing
links to signup while mcp_present cites one` - bo moje nowe zdanie zawiera frazę „a path nobody
**registered**", a guard szukał gołego słowa `register`. Teraz wymaga **adresu**, który wygląda
na rejestrację, czyli tego, co „cites one" miało znaczyć od początku. To drugi raz tej nocy, gdy
strażnik oskarżył coś, co miało rację (poprzednio runda 129), i oba razy kosztowało to kilka minut,
bo strażnik nazywa dokładnie, co porównał.

Reszta różnicy 8.8 → 8.9 (15 wierszy, 0,59 procent) to znani oscylatorzy: `planetscale.com`
z trzema checkami naraz, `froala.com`, `bitmovin.com`, `postmarkapp.com`, `medusajs.com`
i `chargebee.com`.

## Runda 2026-08-12 (131): trzy razy pomyliłem się co do kinde, zanim zmierzyłem właściwą rzecz

Sonda MCP odpowiadała za trzy z dziesięciu ruchów podłogi, więc wziąłem ją na warsztat. Droga do
odpowiedzi jest tu ważniejsza niż sama poprawka, bo **dwie pierwsze hipotezy były błędne i obie
wyglądały na potwierdzone**.

1. **„To sieć albo wolne serwery".** Pięć sond na adres z tej maszyny: `chargebee`, `kinde`,
   `medusajs` i cztery kontrolne adresy odpowiadają **5 na 5, identycznie, poniżej sekundy**.
   Hipoteza obalona.
2. **„To nasz limit czasu w skanie".** Pięć skanów z dyno: `chargebee` 5 na 5 dobrze,
   `kinde` **1 na 5**. Po czterech minutach przerwy nadal źle, więc to nie chwilowy limit.
3. **„To 202, którego nie znamy".** Z dyno `mcp.kinde.com/mcp` odpowiada **202**, a z laptopa
   **401**. Dopisałem regułę o 202 i **nic to nie dało**, bo kontrolka na nieistniejącej ścieżce
   też odpowiada 202. Reguła o 202 została (jest poprawna, gdy kontrolka mówi co innego), ale
   diagnoza była zła.
4. **Prawdziwa przyczyna:** brzeg kinde **połyka każdy POST z naszej sieci**, odpowiadając 202
   z **zerowym ciałem**, i robi to na ścieżce MCP, na ścieżce, której nikt nie zarejestrował,
   **oraz na nieistniejącej subdomenie**. Nie zmierzyliśmy niczego, a publikowaliśmy
   „No MCP surface: nothing answered at six addresses", czyli twierdzenie o ich produkcie zrobione
   z pomiaru ich brzegu.

Formuła **8.9**: taki przypadek jest teraz **niemierzalny** i wypada z mianownika, dokładnie jak
odmowa, która dotyka tak samo przeglądarki jak agenta. Sprawdzone na produkcji: `kinde.com` czyta
„every JSON-RPC POST we sent came back with an empty 2xx, including one to a path nobody
registered", a `chargebee.com` dalej „Live MCP endpoint".

**Poprawka do poprawki, warta zapamiętania:** pierwsza wersja flagi nie zapaliła się nigdy, bo
patrzyła tylko na kontrolkę per-ścieżka, a host połykający POST-y dyskredytuje kandydata już na
regule wildcard, zanim ta kontrolka w ogóle poleci. Sprawdzenie „czy na pewno zadziałało"
kosztowało jeden skan i było jedyną rzeczą, która to wychwyciła.

## Runda 2026-08-12 (130): podłoga szumu przemierzona po naprawie naszego zegara

Przebieg z **tą samą formułą 8.8 po obu stronach**, nic między nimi nie zmienione, pierwszy
z ponawianiem skanów uciętych: **10 z 2550 werdyktów, 0,39 procent**. Trzy skany faktycznie
zostały ucięte i ponowione zamiast opublikowane, i żaden z nich nie pojawił się w różnicy.

Trzy pomiary podłogi: **0,64 → 0,27 → 0,39 procent**. Na `/methodology` zostaje **0,64 jako
podłoga**, bo jest największa z trzech, ale strona mówi teraz też, **ile z tego było nasze**:
jeden przebieg opublikował jedenaście werdyktów „unmeasurable" z powodu budżetu 27 sekund,
a ręczne powtórzenie dwóch skanów ścięło ruch tego przebiegu z 23 wierszy do 12.

**Resztka nie jest rozłożona równo i to jest użyteczna wiedza:** z dziesięciu ruchów **trzy to
serwery MCP**, które odpowiadają na jednym przebiegu i milczą na drugim (`chargebee.com`,
`kinde.com`, `medusajs.com`), a **trzy to jeden dostawca** (`planetscale.com`), któremu raz
znajdujemy stronę rejestracji, a raz nie, co rusza trzy jego checki naraz. Reszta to pojedyncze
strony dokumentacji, które raz odpowiadają, a raz nie.

Wniosek na przyszłość: **poprawa stabilności odkrywania strony rejestracji i sondowania MCP zbije
podłogę szumu bardziej niż jakakolwiek zmiana reguły**, bo sześć z dziesięciu ruchów siedzi
w tych dwóch miejscach.

## Runda 2026-08-12 (129): audyt oskarżył stronę, która miała rację, i pokazał dwie prawdziwe dziury

Reseed 8.8 poszedł z przewidywaniem „zero zmian werdyktu" i pierwszy raz tej nocy **audyt zgłosił
rozjazd**: `/findings: says 17 for grants an unattended agent can finish, data says 18`. Strona
liczy to z danych, więc rozjazd znaczył, że któraś strona sporu jest źle napisana.

**Rację miała strona.** Zdanie brzmi „**of the 66 vendors publishing a registration endpoint**,
only N advertise a grant", czyli N to część wspólna, a strażnik liczył wszystkich z zapisanym
grantem. Różnicę zrobił jeden wiersz: `launchdarkly.com` ma `unattendedGrant` z wcześniejszego
skanu, a jego `oauth_dcr` w tym reseedzie wyszedł **niemierzalny, bo skan wyczerpał budżet
27 sekund**. Strażnik naprawiony: liczy teraz część wspólną, tak jak zdanie.

**Druga dziura jest poważniejsza i to ona zrobiła ten rozjazd.** Skan, który dobija do budżetu,
publikuje pięć werdyktów „unmeasurable", które są faktem o **naszym zegarze**, nie o dostawcy,
a reseed je publikował: w tym przebiegu **jedenaście werdyktów** na `launchdarkly.com` i
`netim.com`. `scripts/reseed.sh` ponawia teraz skan **ucięty** tak samo, jak ponawia nieudany.
Oba wiersze przeskanowałem ręcznie i oba wróciły kompletne.

Po naprawie tych dwóch wierszy diff 8.7 → 8.8 spadł z **23 na 12 ruszonych werdyktów** (0,90 → 0,47
procent), czyli **połowa „szumu" tego reseedu była nasza własna**, nie internetu. To zmienia sens
poprzednich pomiarów podłogi: część z nich mogła zawierać uciętе skany.

## Runda 2026-08-12 (128): martwe linki w llms.txt to naprawdę dokumenty, nie załączniki

Kandydat z rundy 120 zmierzony przez **odtworzenie próbkowania link po linku**, a nie przez
czytanie `firstDead` z korpusu. Wynik: z dwudziestu wierszy karanych za martwe linki regułę
pomijającą załączniki odwróciłby **jeden** (`pdfmonkey.io`, dwa martwe `.webp`). Reszta traci
punkt na **prawdziwych dokumentach**: wpisy blogowe `calendly.com` i `nylas.com`, strony
dokumentacji `flagsmith.com`, `tigrisdata.com` i `redis.io`, pliki README na GitHubie
`oramasearch.com`, a `tolgee.io` linkuje wprost `tolgee.io/404`.

Jeden wiersz to mniej niż podłoga szumu (0,64 procent to ~16 werdyktów), więc **reguła nie
wchodzi**. Obawa była teoretyczna, dane jej nie potwierdzają.

**Znalezisko uboczne, ważniejsze od samego kandydata: sześciu z dwudziestu wierszy nie umiałem
odtworzyć** (`agora.io`, `baseten.co`, `cloudflare.com`, `dnsimple.com`, `replicate.com`,
`together.ai`) - u nich moja próbka nie znalazła żadnego martwego linku, a u `replicate.com`
złapała tylko jeden link w ogóle. Powód jest po mojej stronie: skan czyta pliki pod adresami,
które **sam odkrył** (często na subdomenie dokumentacji), a ja zgadywałem `llms.txt` obok apexa
i `llms-full.txt` przez podmianę nazwy. To znaczy, że **werdykt tego checku nie jest odtwarzalny
z samego korpusu**: zdanie nazywa pierwszy martwy link, ale nie nazywa plików, z których wzięta
jest próbka. To jest realna luka do zamknięcia i tańsza niż jakakolwiek nowa reguła.

## Runda 2026-08-12 (127): dwie próby naprawy trasowania, obie zmierzone i obie odrzucone

**Próba pierwsza: inny próg.** Cztery reguły decyzyjne na tych samych punktach, oba zestawy naraz.
Żadna nie poprawia trafności, wszystkie tylko wymieniają złą odpowiedź na milczenie. Wymóg
**dwóch słów** z tej samej kategorii kasuje **wszystkie** złe odpowiedzi na obu zestawach i kosztuje
połowę trafnych (świeży 37 → 19 procent, spalony 83 → 36). Reguły marginesu nie ruszają niczego,
bo osiem złych odpowiedzi to **pojedyncze trafienia bez rywala**: „scanned invoices" dosięga
payments i nic więcej, „summarisation job" dosięga background-jobs i nic więcej.

**Próba druga: inny dowód.** Zebrałem, jak **162 ze 170 dostawców opisuje samych siebie**
(`<title>`, meta description, pierwsze nagłówki) i zbudowałem z tego profil terminów per kategoria,
**strojony wyłącznie na spalonym zestawie**, żeby świeży został na jeden pomiar. Najlepsze
parametry (termin u ≥4 dostawców, w ≤2 kategoriach, 63 terminy razem) dały na świeżym zestawie
**25 trafnych i 9 złych wobec 24 i 8**. Jedna odpowiedź w każdą stronę, czyli szum. Powód jest
widoczny w danych: copy marketingowe jest generyczne („platform", „build", „developers"), a to,
co odróżnia kategorie, wypada przy filtrowaniu.

**Wniosek: mechanizm jest u sufitu i dostawą tej rundy jest liczba, nie poprawka.** Opis narzędzia
`find_providers` w MCP mówił dotąd „16 na 20" z pytań pisanych **po** regułach. Teraz mówi prawdę
z zestawu odłożonego: 24 na 59, w tym 27 milczeń, 6 złych kategorii i 2 odpowiedzi tam, gdzie
należało odmówić, plus zdanie wprost: **odpowiedziało na 27 z 59 pytań i 8 z tych odpowiedzi było
złych**. Wdrożone i sprawdzone na produkcji.

**Co zostaje do rozstrzygnięcia (nie przez agenta):** czy `find_providers` ma dalej odpowiadać
często i myląc się w 8 na 27 przypadków, czy rzadko i prawie nigdy się nie myląc. To decyzja
produktowa o tym, czy narzędzie ma być użyteczne, czy bezpieczne, i obie opcje są zmierzone.

## Runda 2026-08-12 (126): trasowanie ma 59 procent błędu, nie 20

Napisałem **59 świeżych pytań** (`scripts/routing-fresh.mts`), wszystkie sformułowane tak, jak
pytanie przychodzi na kanale, **bez otwierania `src/lib/lookup.ts`**, i zaetykietowane przed
pierwszym uruchomieniem. Wynik pierwszego przebiegu, czyli jedyny uczciwy:

**24 na 59 poprawnie. 35 błędów, 59,3 procent.**

Dla porównania: spalony zestaw 149 pytań pokazuje 7,4 procent, a liczba podawana dotąd jako
uczciwa to 20 procent (z czterech pytań odłożonych w dwunastym przebiegu). **Prawdziwa jest ta
najgorsza**, bo tylko ona pochodzi z pytań, których reguły nigdy nie widziały.

Rozkład błędów jest jedyną dobrą wiadomością: **27 z 35 to ciche pudła** (`NO MATCH`), czyli
narzędzie mówi „nie wiem", zamiast wysłać kogoś do złych dostawców. Tylko **2 to zgadywanie tam,
gdzie poprawną odpowiedzią jest „nie wiem"** („our app is slow" → observability, „manage our AWS
bill" → payments). Szkodliwość jest więc niska, ale i użyteczność: co drugie pytanie zostaje bez
odpowiedzi.

**Wniosek o mechanizmie, nie o słowniku.** Ręczna lista słów kluczowych nie uogólnia się z definicji:
„twilio alternative" trafia, bo reguła zna ten wzorzec, a „we are moving off contentful" nie trafia
wcale. Dopisanie 35 słów naprawi te 35 pytań i przegra następne 35, co ten projekt już raz
zmierzył (rundy 52-53). Kolejny krok to **zmiana mechanizmu na deterministyczne dopasowanie do
opisów kategorii i nazw dostawców**, mierzone na obu zestawach naraz: ma poprawić świeży, nie
psując spalonego.

## Runda 2026-08-12 (125): czwarty reseed nocy, przewidywanie znów co do wiersza

8.6 → 8.7: **8 z 2550, 0,31 procent**, przewidywanie `mapbox.com:programmatic_provisioning`
sprawdzone **1 z 1**. Siedem pozostałych to pogoda, i to w większości **te same wiersze, które
oscylują od trzech reseedów**: `calendly.com`, `froala.com`, `here.com`, `split.io` ruszyły się
tym razem w drugą stronę niż poprzednio.

**Nowa instrumentacja zapłaciła za siebie od razu.** `postmarkapp.com` publikuje teraz
„1 documentation page we selected did not answer **(0)**", a status 0 to timeout, nie brzeg.
Przez cały czas czytaliśmy to jako „ich edge nas odrzucił" i pisaliśmy tak vendorowi.

Jedyną zmianę, która mogła być prawdziwa, sprawdziłem ręcznie: `cloudflare.com` linkuje w swoim
`llms.txt` stronę `developers.cloudflare.com/pages/functions/api-routes/`, która **naprawdę
odpowiada 404**, tak samo przeglądarce jak i nam. Ich zmiana, nie nasza, punkt słusznie stracony.

**Bilans nocy: cztery reseedy, 8.4 → 8.7, i za każdym razem przewidywanie sprawdzało się co do
wiersza** (5/5, 0/0, 1/1). Podłoga szumu zmierzona trzy razy: 0,64 / 0,27 / 0,31 procent.
Skaner jest w tym miejscu, w którym szum sieci przewyższa błąd reguł, więc **dalsze dłubanie
w checkach ma malejący zwrot** i następna praca powinna iść w trasowanie, które ma 20 procent
błędu, czyli pięćdziesiąt razy więcej niż skaner.

## Runda 2026-08-12 (124): „odmówili nam" o stronie, której sami źle wybraliśmy

Kandydat z rundy 123 zmierzony i wyszło co innego, niż zakładałem. Check provisioningu wybiera
trzy strony dokumentacji z sitemapy albo z indeksu i o każdej, która nie odpowiedziała, pisze
vendorowi **„N pages we selected refused our request"**. Skaner liczył sztuki i **nie pamiętał
statusu**, więc nie dało się sprawdzić, co to były za odmowy.

Dopisałem status do wyniku skanu i zmierzyłem: **żadnego 429 z tej maszyny**, za to jedyna
nieprzeczytana strona `mapbox.com` odpowiada **404**. Nikt nam niczego nie odmówił, tylko nasz
własny link jest nieaktualny, a vendor dostawał za to „niemierzalne" na najcięższym checku.

Formuła **8.7**: 404 przestaje być powodem do niemierzalności, a każdy inny status **jest nazwany
w zdaniu**, żeby dało się odróżnić regułę na brzegu od naszego zwietrzałego linku. Przy 429 zdanie
mówi wprost, że to nasze obciążenie, co jest opublikowaną regułą tego projektu wszędzie indziej
i akurat tutaj nie było stosowane. Wiersze zeskanowane, zanim skaner zapamiętywał statusy, czyta
się po staremu, bo dowodu na nowe czytanie wtedy nie mieliśmy.

Sprawdzone na produkcji przed reseedem: `mapbox.com` przeszedł z „niemierzalne" na
`None of the 7 provisioning phrases appears in the 4 documents we read`, czyli na werdykt.

## Runda 2026-08-12 (123): drugi pomiar podłogi szumu i to, z czego ten szum jest zrobiony

Reseed 8.6 poszedł z przewidywaniem „zero zmian werdyktu" i przewidywanie się sprawdziło:
**7 z 2550, czyli 0,27 procent**, przy 0,64 zmierzonym dwa dni wcześniej. Żaden z siedmiu
wierszy nie ruszył się z powodu zmiany 8.6.

**Co ważniejsze niż sama liczba: pięć z tych siedmiu przekroczyło granicę mierzalne/niemierzalne**,
a nie zmieniło zdania o dostawcy. `postmarkapp.com`, `medusajs.com` i `bitmovin.com` raz odmawiają
dokumentacji, raz nie; `amplitude.com` raz mieści się w limicie odczytu cennika, raz nie (i w diffie
8.4 → 8.5 ruszył się w drugą stronę, więc to ten sam wiersz oscylujący). Skaner prosi hosta o około
dziewiętnaście dokumentów w budżecie trzydziestu sekund, czyli **sam jest tym obciążeniem**, więc
część tego szumu jest nasza, nie internetu. To poszło na `/methodology` razem z drugim pomiarem,
bo strona twierdziła dotąd „that is the floor" na podstawie jednego przebiegu.

Naprawiony też własny błąd w `diff-corpus`: bez `--expect` indeks -1 zjadał pierwszy argument
i narzędzie umierało na własnym komunikacie pomocy. Znalazł to pierwszy przebieg bez przewidywania.

**Kandydat, który z tego wynika i nie jest wdrożony:** dokument, który odpowiada **429** w trakcie
skanu, jest dziś liczony jako odmowa, a projekt ma już opublikowaną regułę, że 429 to nasze
obciążenie, nie odpowiedź o agentach (stosowaną przy `crawlersRefused` i przy `answers_plain_request`).
Ta sama reguła nie jest stosowana do stron dokumentacji. Przed wdrożeniem trzeba policzyć, ile
dokumentów w skanie faktycznie kończy się na 429, bo dziś tego nie wiemy.

## Runda 2026-08-11 (122): jeden nieudany fetch skasował żywy serwer MCP

Diff 8.5 pokazał siedem wierszy poza przewidywaniem. Sześć to znane klasy pogody (odmowa
dokumentacji, ucięta strona, rejestr npm milczy). Siódmy był prawdziwym błędem.

`telnyx.com` stracił punkt ze zdaniem „nothing answered at mcp.telnyx.com or /mcp. A card is
a claim about a server, not a server." Ich `/.well-known/mcp.json` **nazywa** `api.telnyx.com/v2/mcp`,
a ten adres odpowiada **pełnym handshakiem** (`serverInfo.name = telnyx_api`, protokół 2025-06-18).
Sprawdziłem to ręcznie, a potem trzy rescany z rzędu: za każdym razem „Live MCP endpoint".

Mechanizm: kod dereferencji karty istnieje od dawna i nawet wymienia telnyx w komentarzu, ale
karta jest pobierana **osobnym żądaniem**, a to jedno żądanie się nie udało. Kandydat zniknął
z listy, a zdanie wymieniło dwa adresy, które **zgadujemy**, tak jakby to były adresy, o których
mowa. Dostawca nie ma jak takiego zaprzeczenia odtworzyć.

Dwie poprawki, formuła **8.6**: karta pytana **drugi raz**, gdy pierwszy nie wyszedł, a kiedy
mimo to nie da się z niej odczytać adresu, werdykt jest **niemierzalny**, nie porażką. Gdy da
się odczytać, zdanie **nazywa adres z karty**, a nie tylko nasze zgadywanki. Żaden wiersz
w korpusie nie niósł tego zdania w chwili zmiany (telnyx zdążył wrócić), więc reseed 8.6 jest
zarazem **trzecim pomiarem podłogi szumu**: przewidywanie brzmi „zero zmian werdyktu", a
wszystko, co się ruszy, jest z definicji pogodą.

## Runda 2026-08-11 (121): pierwszy reseed oceniony wobec spisanego przewidywania

8.4 → 8.5, **2550 werdyktów, 12 ruszyło, 0,47 procent**, czyli poniżej podłogi szumu 0,64.
**Wszystkie pięć przewidzianych zmian zaszło co do wiersza i co do kierunku:** `savvycal.com`
i `xata.io` straciły `self_serve`, `name.com` odzyskał `answers_plain_request`, `neon.com`
i `pinecone.io` zeszły z dwóch punktów na jeden za `agent_entry_point`.

To pierwszy raz, kiedy reseed został oceniony inaczej niż jedną liczbą procentową, i od razu
się to opłaciło: siedem wierszy poza listą wymusiło przeczytanie każdego z osobna, a jeden
z nich okazał się błędem (runda 122). Przy samym procencie ten reseed wyglądałby na czystszy
niż poprzednie i nikt by w niego nie zajrzał.

Pozostała szóstka, dla porządku: `amplitude.com` (cennik wcześniej niemierzalny, teraz
przeczytany), `bitmovin.com` i `medusajs.com` i `postmarkapp.com` (odmowy przy naszym własnym
obciążeniu, bo reseed odwiedza każdą domenę dwa razy), `signoz.io` (rejestr npm nie odpowiedział),
`here.com` (więcej przeczytanych stron dokumentacji, dwie frazy zamiast jednej).

## Runda 2026-08-11 (120): dziewiętnaście oskarżeń o martwe linki, wszystkie prawdziwe

`llms_txt` odbiera punkt dziewiętnastu dostawcom za to, że ich mapa dokumentacji prowadzi
donikąd, i każde takie zdanie nazywa konkretny adres. **Sprawdziłem wszystkie dziewiętnaście
z tej maszyny, czyli z innej sieci niż skaner: 404 co do jednego, i dla naszego user-agenta,
i dla przeglądarki.** Zero fałszywych oskarżeń, więc check zostaje bez zmiany.

**Kandydat wyszedł przy okazji i nie jest wdrożony:** próbka linków bierze też **załączniki**,
a nie tylko dokumenty. `agora.io` traci punkt za martwy PDF z certyfikatem ISO, `baseten.co`
zaczyna listę od `styles/proselint/RASSyndrome.yml`, czyli konfiguracji lintera, która wyciekła
do `llms-full.txt`, a `pdfmonkey.io` od `.webp`. Agent czytający mapę nie chodzi po `.webp`,
więc pytanie brzmi, czy próbka nie powinna pomijać rozszerzeń nietekstowych. **Uwaga na kierunek:
ta zmiana może tylko dodawać punkty, czyli ma kształt, którego się tu nauczyliśmy nie ufać.**
Przed wdrożeniem trzeba policzyć, ile wierszy traci punkt **wyłącznie** przez załącznik, a nie
przy okazji, i to policzyć na odtworzonej próbce, nie na `firstDead` z korpusu.

Przy okazji tej samej rundy powstał **`scripts/diff-corpus.mts`** (`npm run diff-corpus`), bo
dotąd każdy reseed oceniała jedna liczba procentowa, a procent nie odróżnia reguły robiącej to,
co zmierzyłem, od reguły robiącej to i coś jeszcze. Narzędzie przyjmuje **przewidywanie** jako
argument: wiersze z listy raportuje cicho, wszystko inne jako niespodziankę, a przewidywanie,
które się nie sprawdziło, też jako niespodziankę. Kod wyjścia zero znaczy „dokładnie to, co
zapowiedziałem, i nic więcej".

## Runda 2026-08-11 (119): dwa pliki dostają najwyższą notę za słowo, które znaczy co innego

`agent_entry_point` to jedyny check wart **dwa punkty**, więc różnica między „plik jest"
a „plik jest procedurą" waży u nas najwięcej. Ściągnąłem **wszystkie piętnaście** plików, które
coś dostały, i wypisałem, co dokładnie zapaliło regułę.

Dziesięć z dwunastu plików na dwa punkty nazywa **od pięciu do dziesięciu różnych rzeczy**, których
agent potrzebuje (klucz, base URL, endpoint rejestracji). Dwa stoją na jednym słowie i oba znaczą
nim co innego: `neon.com/skill.md` łapie `endpoint` trzy razy i **za każdym razem jest to
„each branch has its own compute endpoint"**, czyli host Postgresa, a nie miejsce, do którego się
wysyła żądanie. Jedyne trafienie `pinecone.io/agents.md` to `curl -fsSL .../install.sh | sh`
w pliku, który poza tym jest **spisem odnośników**.

Reguła wymaga teraz **dwóch różnych sygnałów**. Oba pliki zachowują punkt za to, że istnieją,
żaden nie twierdzi już, że opisuje procedurę. Trzy pliki z jednym punktem (`inngest.com/ai.txt`,
`resend.com/agent.md`, `shopify.com/skill.md`) mają **zero trafień**, więc reguła ich nie dotyka,
a przy okazji potwierdziła się ich klasyfikacja: `shopify.com/skill.md` pisze wprost
„This page intentionally contains no operational guidance". Wszystkie piętnaście plików siedzi
w `scripts/rules.mts`.

## Runda 2026-08-11 (118): sami wywołaliśmy ścianę i policzyliśmy ją vendorowi

`answers_plain_request` ma sześć porażek i jedna z nich przeczy własnym danym. `name.com` ma
zapisaną sekwencję **(200, 429, 429)**, a publikowane zdanie brzmi „no agent reaches the site
at all". Pierwsze żądanie dostało 200, czyli agent dotarł.

Mechanizm: `botChallenge` czyta **ostatni** fetch, a zdanie mówi o całym skanie. Trzy żądania pod
rząd to nasze obciążenie, nie zachowanie agenta, więc wyzwanie, na które potem trafiliśmy, jest
nasze. Dokładnie to rozumowanie stało już obok, przy `rateLimitedUs`, gdzie komentarz opisuje
`postmark.com` (200, 429, 200). Teraz 2xx gdziekolwiek w sekwencji obala to zdanie.

Zmierzone przed zmianą: **cztery wiersze w korpusie mają mieszaną sekwencję** (`hover.com`,
`logto.io`, `postmarkapp.com`, `name.com`) i tylko ten jeden na tym tracił. Kafel „A challenge,
not a limit" na karcie wyniku dostał ten sam warunek, bo inaczej mówiłby prozą to, czemu check
obok właśnie zaprzeczył.

**Uwaga na przyszłość:** pozostałe pięć porażek sprawdziłem z tej maszyny i `contentful.com`,
`pandadoc.com`, `bitmovin.com`, `namecheap.com` i `vonage.com` odmawiają tak samo **przeglądarce
jak i nam** (403/403, 429/429). To nie obala werdyktu, bo wyzwanie JS jest wymierzone we
wszystko, co nie wykonuje skryptów, ale znaczy, że nasz punkt obserwacyjny nie rozstrzyga tych
wierszy. Rozstrzygnąłby dopiero skan z innej sieci.

## Runda 2026-08-11 (117): każda porażka „bez typów" mówi o pakiecie, który sam zgadłem

`typed_package` psuje się nie na wykrywaniu typów, tylko na tym, **który pakiet nazywamy vendorowym**.
Dziesięć wierszy ma werdykt „ships without bundled types" i **wszystkie dziesięć pochodzi
z wyszukiwarki rejestru**, ani jeden z pakietu podlinkowanego na stronie czy w dokumentacji
(sprawdzone `pnpm attribution snapshot` + `replay` na tych dziesięciu domenach).

Na kilku zgadliśmy zły artefakt: `directus.com` jest oceniany po pakiecie `directus`, czyli po
serwerze, a SDK, które się instaluje, to otypowany `@directus/sdk`. `xata.io` po `@xata.io/api`
przy istniejącym otypowanym `@xata.io/client`. `namecheap.com` po `node-vault-client`, czyli po
kliencie HashiCorp Vault. Sprawdziłem w snapshotach: nazwy właściwego pakietu **nie ma nigdzie na
stronach, które przeczytaliśmy**, więc to nie jest błąd parsowania, tylko brak przesłanki.

Werdykt zostawiam, bo zgodność wydawcy to prawdziwa przesłanka, a po samej nazwie nie odróżnię
złego strzału od pakietu naprawdę bez typów. Zmieniam zdanie: klauzula „matched from the registry
by who publishes it rather than by a link on your site" stała dotąd **tylko przy zaliczeniu**,
a potrzebna jest bardziej przy porażce. Teraz jest przy wszystkich trzech.

## Runda 2026-08-11 (116): reguła RFC, która nic nie zmienia, nie wchodzi do kodu

`no_crawl_delay` bierze **maksimum** z grupy `*` i wszystkich nazwanych grup botów AI. RFC 9309
mówi co innego: bot słucha grupy, która go nazywa, a wildcard wtedy go nie dotyczy. Napisałem
wersję rozstrzygającą per agent i zmierzyłem: **141 plików robots.txt, w tym wszystkie osiem
z korpusu, które w ogóle mają `Crawl-delay` - zero rozjazdów**.

Własny test to obalił szybciej niż korpus. Dwie wersje mogą się rozjechać **tylko** wtedy, gdy
wszystkie trzynaście botów ma własną grupę bez opóźnienia, bo inaczej reszta i tak dziedziczy
wildcard i maksimum wychodzi to samo. Wycofane, prostsza wersja zostaje. W `scripts/rules.mts`
zostały trzy przypadki przybijające faktyczne zachowanie, w tym ten, który mnie poprawił.

## Runda 2026-08-11 (115): pytanie, które strona zadaje, nie jest planem, który oferuje

Kandydat z rundy 114 zmierzony i wdrożony jako **formuła 8.5**. Na 120 zaliczonych wierszy
przesuwają się **dwa**: `savvycal.com` („Do you offer a free trial?") i `xata.io` („Is there
a free tier?"). U obu akordeon FAQ jest **zwinięty**, więc serwowany HTML niesie samo pytanie
i **odpowiedzi nie ma w nim wcale**. Punktowaliśmy to, że strona porusza temat.

Reguła nie czyta odpowiedzi i nie musi: strona, która odpowiada twierdząco, powtarza te słowa
poza pytaniem, a to drugie trafienie już nie jest pytaniem. Koszt znany i zapisany: odpowiedź
brzmiąca samo „Yes." punktu nie uratuje.

**Pierwsza wersja reguły była zła i pokazał to pomiar, nie przegląd.** Wymagała tylko znaku
zapytania po trafieniu, więc odwracała cztery wiersze, a dwa z nich to tabele cennika bez żadnej
interpunkcji: `pusher.com` („Sandbox Free") i cztery komórki `$0` na `workos.com` łapały pytanie
oddalone o pół ekranu. Teraz reguła wymaga słowa pytającego **w oknie 60 znaków przed** trafieniem.
Oba przypadki siedzą w `scripts/rules.mts` jako przypadki, które nie mają się zapalić.

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

## SZESC SPADKOW Z PARY 9.30 ZBADANYCH PO KOLEI (2026-08-17)

**Piec z pietnastu „ruchow" to nie sa zmiany werdyktu**, tylko wiersz, ktory po jednej stronie jest
**niemierzalny**: `froala.com` (403 przy trzech probach), `postmarkapp.com`, `upstash.com`,
`hatchet.run`, `locationiq.com docs_without_js`. Skrypt podlogi szumu porownuje same punkty, wiec
liczy je jako ruch. **Werdykt kontra werdykt to 10 na 2550, czyli 0,39 procent**, a 0,59 to gorna
granica razem z wierszami, gdzie po jednej stronie nic nie zmierzylismy. Obie liczby sa uczciwe,
ale pierwsza odpowiada na pytanie „czy publikowane zdanie sie chwieje".

**Cztery z szesciu spadkow mialy jedna przyczyne**: rejestr MCP (patrz sekcja o 9.31). Trzy razy
`mcp_present`, a `medusajs.com oauth_dcr` przez to samo, bo metadane OAuth sondujemy na originach
znalezionych przez MCP.

**Zostal jeden niewyjasniony: `telnyx.com agent_entry_point` 2 -> 1.** Raz znajdujemy
`/agent-signup.md` (procedura, 2 pkt), raz tylko `/agents.md` (polityka, 1 pkt). Trzy skany z
laptopa: **za kazdym razem 2 punkty i `agent-signup.md`**. Zadnego obciecia budzetu w obu
przebiegach (`truncation: null`), wiec teoria „skan nie zdazyl" jest **nieudowodniona**, choc telnyx
jest jedna z najwolniejszych domen (17-22 s przy budzecie 27 s). Zgodnie z zasada 5 niezgoda,
ktora sie nie powtarza, nie jest znaleziskiem: zapisane jako instancja szumu, nie jako blad.

## LUSTRO REJESTRU MCP DZIALA OD KONCA DO KONCA (2026-08-17, wdrozone)

Pelne przejscie listy: **743 strony, 27 889 zdalnych adresow, 9 322 hosty**, zapisane do kolekcji
`mcpRegistry`. Skan na produkcji odzyskal wszystkie trzy wiersze, ktore rejestr wczesniej zgubil:

```
tolgee.io      9.31  1  Live MCP endpoint at https://app.tolgee.io/mcp/developer
phrase.com     9.31  1  Live MCP endpoint at https://mcp.eu.phrase.com
medusajs.com   9.31  1  Live MCP endpoint at https://docs.medusajs.com/mcp
```

**Baza po zapisie: `stackpick` 87 MB, caly klaster 2 905 z 5 120 MB (56,7 procent, verdict ok)**,
wiec dziewiec tysiecy malych dokumentow nic tu nie zmienia. Kadencja: **przyrostowo co dobe**
(`updated_since`, dodaje adresy), **cala lista w niedziele** (zastepuje i usuwa to, co zniknelo).
Pierwsze napelnienie zrobione z laptopa, bo runner GitHuba dopiero zacznie w nocy.

## PYTANIE O `oauth_dcr` DLA PRODUKTOW BEZ KONT: ZAMKNIETE, ZOSTAJE JAK JEST (2026-08-17)

STATE trzymal to jako „do przemyslenia po zamrozeniu, ale ostroznie, bo zdejmuje oskarzenie z nas
samych". **Zmierzone zamiast rozwazane:** w korpusie **89 wierszy oblewa `oauth_dcr`**, osiem nie
ma osiagalnej rejestracji, i **czesc wspolna wynosi zero**. Czyli wyjatek „produkt bez kont nie ma
klienta do zarejestrowania" **nie zmienilby ani jednego wiersza vendora**, a zdjalby oskarzenie
dokladnie z jednej domeny: naszej.

Do tego regula musialaby opierac sie na „nie znalezlismy rejestracji", a to najczesciej jest nasze
odkrywanie, ktore zawiodlo, a nie produkt bez kont. **Pozycja zamknieta, check zostaje bez zmian.**

## 30. PRZEBIEG: `programmatic_provisioning`, I ODWROCENIE KIERUNKU (2026-08-17)

Pierwszy przebieg adwersaryjny na najciezszym checku karty (2 punkty, 89 oblanych wierszy). Sonda
(`scripts/audit-provisioning.mts`) szuka tego samego przez **ich wlasna mape witryny**, ktorej
skaner nie czyta wcale: `sitemap.xml` na witrynie i na hoscie dokumentacji, jeden poziom indeksu,
sciezki obiecujace poswiadczenia, do szesciu stron. Reguly frazowe **napisane od nowa**, nie
zaimportowane.

**Kontrolka: 21 trafien na 80 zaliczanych wierszy (26 procent).** Slabe, wiec cisza po stronie
oskarzen nic nie znaczy, i to jest zapisane, zanim padly wnioski.

**Strona oskarzen: 40 wierszy, 2 trafienia, i ZERO falszywych oskarzen.** Oba trafienia to nasza
wlasna fraza lapiaca co innego: `bird.com` „Destination **Management API**" o trasowaniu SMS,
`bunny.net` „**Account API** Key" o kluczu z panelu.

**To odwrocilo kierunek przebiegu.** Ryzykiem nie jest tu falszywe oskarzenie, tylko **falszywy
kredyt**: **43 z 79 zaliczonych wierszy stoi wylacznie na golej frazie** („management api" 16,
„service account" 11, „account api" 5, kombinacje 11). Zliczenie fraz: „management api" trafia 34
razy, „service account" 24, „account api" 9.

**Wdrozone (9.31):**
1. **Wiersz cytuje slowa, w ktorych fraze znalezlismy.** Bez tego nie da sie odroznic powierzchni
   provisioningu od zbiegu okolicznosci, a to jedyny check, gdzie za sama fraze dajemy dwa punkty.
2. **„self-service accounts" przestalo sie liczyc** jako „service account". Pierwszy sprawdzony
   vendor pokazal blad wprost: `auth0.com` mial **dwa punkty za wiersz tabelki porownawczej**
   „Self-service accounts, testing scenarios". Po poprawce ma jeden, a to, co zostalo, to
   **cytat z opinii klienta** o Management API, czyli sample, nie regula.

**Zostawione swiadomie do pomiaru PO reseedzie** (dopiero on zapisze cytaty dla wszystkich
zaliczonych wierszy): zaciesnienie trzech golych fraz tak, zeby wymagaly w tym samym zdaniu slowa
o poswiadczeniu albo o tworzeniu, oraz pisownia „service-account" z myslnikiem, ktora nie trafia ani
przed zmiana, ani po. Obie zmiany rusza punkty, wiec nie robi sie ich na oko.

## STRONY KATEGORII I PODGLAD BIEGOW (2026-08-17, wdrozone)

Z audytu konkurenta `agentchecker.ai`. Mielismy 25 cel rozpoznawczych z prawdziwymi pomiarami i
**zero stron, ktore je pokazuja**: biegi leza w `$LETAGENTSIN_RUNS` na laptopie, wiec dyno nie ma
ich skad wziac. `scripts/export-cells.mts` zamraza je do `src/data/cells.json` (225 kB, razem z
pelnymi odpowiedziami).

- **`/c/<kategoria>`**: pytanie doslownie, ile biegow, narzedzie, model, data, ostrzezenie o
  skazeniu instrukcjami maszyny NAD tabela, tabela „wymieniony" i „wymieniony pierwszy" obok wyniku
  skanu, zdanie ilu dostawcow nie padlo ani razu. Linkowana z rankingow i z mapy witryny.
- **`/c/<kategoria>/runs`**: wszystkie odpowiedzi w calosci, nazwy dostawcow zaznaczone, tekst
  nieedytowany. To nasz odpowiednik ich „step-by-step replay": u nich klikniecia, u nas decyzje.

**Cennik przebudowany po audycie** (Krystian zaakceptowal): darmowy skan, **raport jednorazowy 29
USD** (10 biegow, dwa narzedzia), **monitoring 79 USD za domene** z pakietami (trzy 179, dziesiec
499), audyt „by conversation". Doszly dwa pytania w FAQ: dlaczego jestesmy drozsi od audytu za
dwadziescia dolarow (inna jednostka: jeden przebieg kontra stala miara z opublikowana podloga
szumu) i linia dla agencji.

**Zostalo z tego audytu:** zadanie #45, oferta agencyjna i white label, **zablokowane na decyzji
biznesowej Krystiana** (model sprzedazy i sciezka platnosci inna niz `mailto:`).

**Czego swiadomie nie kopiujemy:** jednego przebiegu agenta na audyt bez ujawnionej wariancji i
nieopublikowanej formuly punktacji. To sa dwie rzeczy, ktorymi sie od nich roznimy.

## RESEARCH CENNIKOWY I PRZEBUDOWA CENNIKA (2026-08-17, wdrozone)

Dwa rownolegle researche, bo nasz cennik dotykal dwoch roznych rynkow.

**Rynek, w ktorym naprawde konkuruje monitoring, to widocznosc w odpowiedziach AI** (Profound,
Peec, Otterly, Scrunch, Athena, Rankscale, Semrush AI Toolkit, Ahrefs Brand Radar, Similarweb):
- **mediana poziomu wejsciowego 99 USD** (Profound 99, Semrush 99, AmIOnAI 100, Similarweb 129,
  Otterly 29 jako wyjatek), **mediana poziomu pro okolo 365 USD**, gorny plan Evertune 800.
- **Jednostka rozliczenia to PROMPT**, nie domena: 25-150 sledzonych pytan w tanim planie,
  odpytywane **dziennie**. Nasze „za domene" jest w tej kategorii nietypowe.
- **Rabat roczny 15-20 procent**, prawie zawsze opisany jako „dwa miesiace gratis".
- **Prawdziwy darmowy poziom ma jeden gracz na czternastu** (Athena), reszta to trial 7 dni.

**Rynek narzedzi audytu i monitoringu stron** (Semrush 139, Ahrefs 129, Little Warden 25 GBP,
Sitebulb 18, Screaming Frog 199 GBP rocznie): drabinka 3-4 poziomow z mnoznikiem 1,5-2x, poziom
agencyjny bramkowany **wolumenem** i nazwany wprost „Agency", white label jako osobny dodatek
(Semrush 20 USD, Ahrefs Report Builder 99 USD), a **powyzej okolo 500 USD miesiecznie cena znika
za formularzem**. Jednorazowe raporty techniczne: **49 do 2 200 USD**, najtanszy porownywalny
produkt to 49 USD za audyt, WAVE AIM zaczyna od 500.

**Co zmienilismy:**
1. **Raport jednorazowy 29 -> 49 USD.** Za 29 bylismy **tansi niz podloga calego porownywalnego
   rynku**, a techniczny kupujacy czyta cene ponizej rynku jako niska jakosc, nie jako okazje.
2. **Monitoring zostaje 79**, czyli **ponizej mediany kategorii (99)**, i dostaje **rok w cenie
   dziesieciu miesiecy**.
3. **Pakiet dziesieciu domen nazwany „Agency"**, bo nazwany poziom pozwala kupujacemu
   zakwalifikowac sie samemu.
4. **Nowa os sprzedazy zgodna z kategoria: kolejne pytanie kupujacych za 29 USD miesiecznie.**
   Rynek skaluje po promptach, my po pytaniach, i teraz to widac w cenniku.
5. **FAQ mowi wprost, ze do szerokiego sledzenia udzialu w odpowiedziach lepsze jest narzedzie
   zbudowane do tego.** Odeslanie kupujacego gdzie indziej jest tansze niz sprzedanie mu czegos,
   co go rozczaruje.

**Swiadomie NIE zrobione, bo to decyzja Krystiana:** nazwanie dolnej granicy audytu („from X")
zamiast samego „cztery cyfry". Research mowi, ze nawet gracze chowajacy cene pokazuja punkt
startowy, ale liczby nie mam skad wziac i nie wymysle jej sam.

**Wciaz brak sciezki platnosci innej niz `mailto:`.** Cennik jest dzis komunikatem, nie kasa.

## MATCHER MYLIL SIE O TRZY FIRMY, A MY PUBLIKOWALISMY „NIE PADL ANI RAZU" (2026-08-17, naprawione)

Nowe strony kategorii publikuja najmocniejsze zdanie, jakie mamy: **„N z M dostawcow nie padl ani
razu"**. To jest twierdzenie o nazwanych firmach, wiec dostalo wlasny audyt
(`scripts/audit-never-named.mts`, celowo grubszy niz matcher, ktory audytuje).

**Cztery leady, trzy prawdziwe pudla:**
- `sanity.io`: odpowiedz poleca **Sanity** wytluszczeniem, my publikowalismy, ze nigdy nie padlo.
- `here.com`: odpowiedz nazywa **HERE** realnym konkurentem wersalikami. Alias brzmial „HERE
  Technologies", wiec samo „HERE" nie trafialo **w zadnym z pieciu biegow**.
- `neon.com`: odpowiedz otwiera sie zdaniem „Neon bylby moim wyborem" i mowi Neon trzy razy.
- `name.com`: jedyny sluszny odrzut, bo trafienie bylo fragmentem slowa „Namecheap".

Kazda z trzech byla **jedynym dostawca w swoim zdaniu**, wiec regula promujaca niepewne trafienie
obok pewnego nie miala jak ich dosiegnac. **Typografia rozstrzyga tam, gdzie sasiad nie moze:**
wyroznienie, backtick albo etykieta linku wokol slowa; wersaliki; forma z wielkiej litery uzyta
wiecej niz raz w tej samej odpowiedzi. Alias pisany wersalikami jest teraz dopasowywany z
uwzglednieniem wielkosci liter, bo „here" to slowo, a „HERE" to firma.

**Efekt na 125 odpowiedziach: 11 licznikow w gore, 6 w dol** (te w dol to same zmiany „kto
pierwszy"). `sanity.io` 0 -> 5 i pierwszy 5 razy, `neon.com` 0 -> 5, `here.com` 0 -> 5,
`clerk.com` 1 -> 5, `resend.com` 1 -> 4, `temporal.io` 2 -> 5. **Kontrolka po poprawce: 1 lead
zamiast 4.**

## POMIAR ZWIAZKU CHECKOW Z WYMIENIALNOSCIA POWTORZONY POPRAWNYM MATCHEREM

Nocny pomiar liczyl sie matcherem, ktory gubil trzy firmy, wiec zostal powtorzony. **Wniosek nie
tylko sie utrzymal, ale sie wzmocnil:**

| check | roznica | przypadek | u popularnych | u mniej znanych |
|---|---|---|---|---|
| `oauth_dcr` | +25pp | 0.000 | +26pp | +17pp |
| `mcp_present` | +17pp | 0.012 | +21pp | +9pp |
| `programmatic_provisioning` | +24pp | 0.000 | +37pp | **+3pp** |
| `llms_txt` | +5pp | 0.577 | **-2pp** | **-4pp** |

**Dwa checki przezywaja kontrole na slawe w obu polowkach: `oauth_dcr` i `mcp_present`** (wczesniej
tylko pierwszy). `programmatic_provisioning` wyglada mocno, ale caly efekt siedzi u popularnych,
czyli to najpewniej slawa, nie regula. **`llms_txt` nadal nie pokazuje niczego, w obu polowkach na
minusie.** Wynik powyzej mediany: 54 procent wymienialnosci kontra 35 procent ponizej, roznica
19pp, przypadek daje taka lub wieksza w 0,006 przebiegow.

**Do rozwazenia jako nastepna publikacja:** to jest badanie, ktorego nie ma zaden konkurent,
„ktore z rzeczy, ktore kazemy naprawiac, maja zwiazek z byciem wymienianym". Wymaga zdania o
skazeniu (biegi czytaly `CLAUDE.md` tej maszyny), bo bez niego to nie jest czysty pomiar.

## DWUDZIESTA SZOSTA KATEGORIA: HOSTING APLIKACJI (2026-08-17, wdrozone)

Zamkniete zobowiazanie, ktore wisialo od wczoraj: **`vercel.com` byl obserwowany przez klienta i
nie mial kategorii**, a `/pricing` obiecuje kazdej obserwowanej domenie bieg agenta co miesiac.
Raport pokrycia mowi teraz **0 z 3 obserwacji nie do obslugi** zamiast 1 z 3.

`app-hosting`, „Application hosting and deployment", siedem domen: `vercel.com`, `netlify.com`,
`render.com`, `fly.io`, `railway.com`, `heroku.com`, `koyeb.com` (wszystkie odpowiadaja 200).
Pytanie rozpoznawcze napisane, wiec cela jest do uruchomienia od reki.

**Czekalo na pomiar podlogi szumu**, bo zmiana skladu korpusu w trakcie okna zepsulaby pare
pomiarowa. Podloga jest zmierzona, wiec blokada znikla, a **reseed na 9.31 zmierzy te siedem domen
w tym samym przemiataniu**, czyli korpus urosnie ze 170 do okolo 177 wierszy.

Przy okazji: **liczba kategorii jest teraz liczona, nie wpisana** w trzech miejscach, gdzie stalo
„25". Pierwsza rzecz, ktora sie rozjezdza po dodaniu kategorii, to zdanie o kategoriach.

## SZOSTE BADANIE OPUBLIKOWANE: KTORE CHECKI MAJA ZWIAZEK Z BYCIEM WYMIENIANYM (2026-08-17)

Na `/findings` stoi teraz badanie, ktorego **nie ma zaden konkurent**, i jako jedyne krytykuje
nasza wlasna karte wynikow. Publikujemy pietnascie checkow i kazemy je naprawiac, wiec pytanie
„ktory z nich ma cokolwiek wspolnego z byciem wymienianym" musialo paść u nas, zanim padnie u kogos
innego.

**Wynik:** `oauth_dcr` +25pp (+26 u znanych, +17 u mniej znanych), `mcp_present` +17pp (+21 i +9),
`programmatic_provisioning` +24pp ogolem ale **+3pp u mniej znanych**, czyli mierzy glownie slawe,
a **`llms_txt` nie rozdziela nikogo**: +5pp ogolem i na minusie w obu polowkach.

**Ograniczenia napisane tak samo wyraznie jak wynik**: piec biegow, korelacja a nie eksperyment, i
skazenie instrukcjami maszyny. Strona **zapowiada replikacje drugim narzedziem i obiecuje ja
opublikowac niezaleznie od wyniku**, wiec to zobowiazanie do dokonczenia (leci w tle, katalog
`~/.letagentsin-runs-codex`, 3 biegi na kategorie).

## PLATNY RAPORT MA SCIEZKE DOSTAWY (2026-08-17)

`scripts/client-report.mts <domena>` sklada gotowy markdown: cela (pytanie doslownie, ile razy
wymieniony, kto byl wybierany zamiast, cytaty run po runie) plus skan (punkty po etapach, kazde
oblane zdanie z rada). Domena spoza mierzonych kategorii dostaje **te sama odpowiedz, ktora
obiecuje cennik, i to przed platnoscia**. Sprawdzone na `uploadcare.com` (0/5 wymieniony),
`sanity.io` (5/5 z cytatami) i `vercel.com` (nowa kategoria, na razie sam skan).

Do zamkniecia, gdy replikacja sie skonczy: raport ma laczyc oba narzedzia, bo `/pricing` obiecuje
**dziesiec biegow na dwoch narzedziach**, a dzis sklada piec z jednego.

## ADWERSARYJNY AUDYT NOWYCH STRON KATEGORII (2026-08-17)

Subagent przeliczyl **recznie, z pelnego tekstu odpowiedzi**, szesc kategorii i sprawdzil tabele w
dziesieciu. **Zero falszywych zer, zero blednej kolejnosci „named first", zero martwych linkow.**
Sumy sie zgadzaja: 26 kategorii, 177 dostawcow, 78 nigdy niewymienionych, i to samo po zsumowaniu
wierszy. Sprawdzil takze przypadki graniczne, np. „OSM/HERE" policzone poprawnie jako HERE oraz
biegi, ktorych faworytem jest dostawca spoza korpusu (AWS Route 53), gdzie „named first" slusznie
wskazuje pierwszego z mierzonych.

**Dwa realne znaleziska, oba nasze, oba naprawione:**
1. Link **„how every number here is measured" prowadzil na `/methodology`, ktora opisywala
   wylacznie skaner** i nie mowila ani slowa o liczeniu wymienien. Link, ktory nie odpowiada na
   pytanie, ktore obiecuje, jest gorszy niz brak linku. Doszla sekcja `#named` z regula zwyklego
   slowa, regula typografii i roznica miedzy „named" a „named first".
2. **Ujawnienie skazenia nie mowilo o jezyku.** Czytelnik widzial polskie zdania i nie mial jak
   powiazac ich z instrukcjami maszyny. Teraz oba miejsca mowia wprost, ze te instrukcje **prosza o
   odpowiedzi po polsku**.

Trzecie znalezisko jest kosmetyczne i samo zniknie: `app-hosting` ma w kolumnie „Scan" wszedzie
„not measured", bo szesc z siedmiu domen nie ma jeszcze skanu. Reseed to zalatwi.

## KTO NAS DZIS CZYTA (2026-08-17, odczyt z kolekcji `visits`)

**305 wizyt dzis**, a rozklad jest sam w sobie dowodem na teze produktu:

```
 101  /            przegladarka
  14  /            agent
  13  /docs        agent
  12  /report      agent
  11  /methodology agent
  11  /pricing     agent
   9  /findings    agent
   5  /c           agent      <- strona ma godzine
```

Agenci czytaja nas systematycznie i **`/c` zostalo znalezione w godzine od wdrozenia**. Dni
wczesniejsze: 460, 23, 228, 615, 172. To nie jest ruch sprzedazowy, ale jest to dokladnie ta
publicznosc, o ktorej piszemy vendorom, ze istnieje.

## REPLIKACJA DRUGIM NARZEDZIEM ZROBIONA I OPUBLIKOWANA (2026-08-17)

26 cel powtorzonych **codeksem**, ktory nie czyta instrukcji tej maszyny i odpowiada po angielsku:
inny dostawca, inny model, inne skazenie, trzy biegi na kategorie zamiast pieciu. **Wniosek trzyma
sie i jest mocniejszy:**

| check | claude (5 biegow) | codex (3 biegi) |
|---|---|---|
| `oauth_dcr` | +25pp (+26 / +17) | **+28pp (+25 / +22)** |
| `mcp_present` | +17pp (+21 / +9) | **+22pp (+20 / +20)** |
| `programmatic_provisioning` | +24pp (+37 / **+3**) | +22pp (+41 / **-1**) |
| `llms_txt` | +5pp (-2 / -4) | +13pp (+11 / **+1**) |
| wynik powyzej mediany karty | 54% kontra 35% | **57% kontra 33%, p = 0,001** |

**Dwa checki przezywaja w obu narzedziach: `oauth_dcr` i `mcp_present`.**
`programmatic_provisioning` powtarza swoj wlasny wzor, czyli caly efekt u popularnych i zero albo
minus u reszty, wiec to slawa. `llms_txt` nadal nie oddziela nikogo po kontroli na popularnosc.

**Opublikowane na `/findings`**, razem ze zdaniem, czego to nadal nie dowodzi. Strona obiecywala
publikacje niezaleznie od wyniku, wiec tym bardziej trzeba bylo dopisac ograniczenia.

**Dane:** `src/data/cells.json` ma teraz **52 cele, po 26 na narzedzie** (600 kB). Strony kategorii
maja kolumne per narzedzie, strona biegow pokazuje odpowiedzi z obu, a **raport klienta sumuje oba
i dowozi obietnice „dziesiec biegow na dwoch narzedziach"** (dzis osiem: 5 claude + 3 codex).

**Pulapka zlapana od razu:** po dolozeniu drugiego narzedzia zdanie „nie padl ani razu" skoczylo z
78 na 91 dostawcow, choc **zaden vendor nic nie zmienil**: pierwsza cela stala sie ta z trzema
biegami. Teraz liczy sie brak wymienienia **we wszystkich celach**, czyli 71 na 177, a kolumna
„named first" mowi, z ktorego narzedzia pochodzi.

## MIESIECZNY MAIL Z BIEGOW AGENTA (2026-08-17)

Monitoring obiecuje **dwie** rzeczy, a sciezke dostawy mial **jedna**: cotygodniowe checki mailuja
sie same, a miesieczny bieg agenta nie mial nic. Wynik siedzial w `cells.json` i nikt nie byl o nim
informowany, czyli polowa produktu za 79 USD nie miala jak dojsc do klienta.

`npx tsx scripts/cell-email.mts [domena]` pisze po jednym szkicu na obserwowana domene: ile biegow
ja wymienilo, kto byl przed nia, jedno zdanie cytatu, link do wszystkich odpowiedzi i do opisu
liczenia. **Drukuje, nie wysyla** - mail do obcego czlowieka jest decyzja czlowieka. Domena bez
kategorii dostaje szkic mowiacy wprost, ze biegu nie bedzie i dlaczego.

**Cytat wybiera punktacja okien, nie pierwsze trafienie**: pierwsza wersja zacytowala `stripe.com`
fragmentem zaczynajacym sie w srodku markdownowego linku i mowiacym glownie o konkurencie. Okno
traci punkty za markdown, za link i za kazdego innego dostawce w srodku.

Do tego `harness/ask.mts --add` dokleja biegi zamiast zastepowac cele, bo dobicie celi z trzech
biegow do dziesieciu obiecanych w raporcie kosztowaloby piec swiezych, zeby zachowac trzy zrobione.

## STRAZNIK ZDAN SZOSTEGO BADANIA ZLAPAL TRZY BLEDY NARAZ (2026-08-17)

`scripts/audit-study.mts` powstal po to, zeby opublikowane twierdzenie nie stalo sie po cichu
falszywe przy nastepnym reseedzie albo dolozeniu biegow. Napisany od zera, zeby **nie zgadzal sie
z tym, co audytuje** - i od razu sie nie zgodzil: `mcp_present` u mniej znanych dostawcow +9pp
kontra -5pp. Trzy przyczyny, wszystkie nasze:

1. **`named-vs-score` liczyl wiersze NIEZMIERZONE jako oblane**, dokladnie wbrew wlasnemu
   komentarzowi („Unmeasured checks are left out rather than counted as failures"). Zbior
   przechowywal tylko id zdanych i nie umial odroznic „zmierzone i oblane" od „niezmierzone".
   Teraz to mapa `id -> czy zdal`.
2. **Czytal najswiezszy skan domeny zamiast wiersza zasianego**, wiec kilka doraznych skanow 9.31
   po cichu decydowalo o pomiarze. **Ta sama pulapka, ktora tego samego dnia zlapalismy na
   `/v/<domena>`** - i to jest wzorzec do zapamietania: *kazde miejsce, ktore czyta „najnowszy skan",
   czyta tez cudze i wlasne skany doraznie uruchomione*.
3. **Najwazniejsze: strona opisywala inna miare niz ta, ktora policzylismy.** Zdanie mowilo „share
   of vendors named at least once", a liczby pochodzily ze sredniej czestosci wymieniania. Obie
   miary sa uczciwe i **roznia sie tam, gdzie to boli**: przy „ilu w ogole" MCP trzyma obie polowki
   na czystym narzedziu i gubi mniej znanych na skazonym.

Strona mowi teraz, ktora miare cytuje, i **publikuje te roznice zamiast wybierac wygodniejsza**.
Straznik pilnuje obu miar i **konczy sie kodem bledu**, gdy ktorekolwiek zdanie przestanie byc
prawdziwe. Do uruchamiania po kazdym reseedzie i po kazdej zmianie cel.

## PORZADEK WERSJI FORMULY BYL ZLY I ROZBRAJAL OCHRONE WATCHERA (2026-08-18, wdrozone v489)

Po kropce w numerze formuly stoi **licznik, nie ulamek**: po 9.9 przyszlo 9.10, dzis jest 9.35.
`rulesChangedBetween` czytalo obie wersje przez `Number`, wiec dla bazy z zakresu **9.4-9.9** okno
wersji wychodzilo puste, a `CHECK_RULE_CHANGED` przestawalo dzialac dokladnie tam, gdzie jest
najbardziej potrzebne: przy najstarszych pomiarach, ktore przekroczyly najwiecej zmian regul.
Skutek bylby taki, ze watcher dostaje maila „straciles punkty" za zmiane, ktora zrobilismy my.

**Poprawny komparator istnial juz w `errata.ts`**, z komentarzem nazywajacym pulapke wprost
(„9.8 jest starsze niz 9.12"). Napisalismy wiec raz dobrze, a raz zle. Teraz jest jeden:
`src/lib/formula.ts` (`isOlderThan`, `inReleaseOrder`), uzywany w `errata.ts` i `watch.ts`.

**Zmierzony zasieg przed poprawka** (`npm run watch-baselines`, nowy skrypt): 4 watche w kolejce,
bazy `brak`, `brak`, **9.2** i **9.16** - obie wypadaly poprawnie **przypadkiem**, bo numerycznie sa
mniejsze od 9.31. Zaden zywy watcher nie dostal zlego maila. Raporty z zakresu 9.4-9.9 istnieja
(val.town ma 9.9), a `regressions.mts` uzywa tej samej funkcji na historii korpusu, wiec blad byl
o jeden stary raport od ugryzienia.

Straznik, ktory by to zlapal, jest w `rules.mts`: `rulesChangedBetween('9.9', '9.35')` musi zwrocic
wszystkie cztery zmienione checki.

## SCIEZKA KLIENTA PRZEJSCIOWO PRZETESTOWANA OD KONCA DO KONCA (2026-08-18)

Na produkcji, na domenie **spoza korpusu** (val.town) i na wlasna skrzynke:

1. `POST /api/watch` -> `delivered: true`, mail w skrzynce w kilkanascie sekund.
2. Link potwierdzajacy -> „We are watching val.town", **drugie klikniecie nic nie psuje** (mail
   klienci prefetchuja linki).
3. `/v/val.town` -> strona zyje i sama mowi, ze pomiar jest pod stara formula (9.9).
4. Link stopu -> „We will not write to you about val.town again".
5. Ponowna prosba po stopie -> nowy mail, `confirmedAt` **wyzerowane**, `stoppedAt` wyczyszczone, a
   watch **nie wchodzi do kolejki** dopoki nie potwierdzi. Czyli nikt nie dostaje maila bez
   ponownej zgody.

**Nie uruchamiaj teraz crona watchy:** dwa oczekujace watche to stripe.com i vercel.com, a skan
domeny korpusowej odmladza mediane i przesuwa reseed.

## CHECK O MARTWYCH LINKACH W DOKUMENTACJI: SWIADOMIE NIE ROBIMY (2026-08-18)

Skill `agent-discoverability` wymienia „zero 404 w dokumentacji" jako blokade binarna i to prawda,
ale check kosztowalby kilkanascie dodatkowych zadan HEAD do **tego samego hosta**, ktory juz
obsluguje ~19 dokumentow na skan. Nasza wlasna zasada mowi, ze 429 to nasze obciazenie, a nie
werdykt o vendorze, wiec ryzykowalibysmy jakosc checkow, ktore juz publikujemy, dla jednego punktu.
Czesc tego i tak mierzymy: `llms_txt` sprawdza probke linkow z llms.txt i wypisuje, ile odpowiada.
Do zrobienia dopiero wtedy, gdy zmierzymy zapas w budzecie 27 s i pokazemy probke bez falszywych
oskarzen.

## 31. PRZEBIEG ADWERSARYJNY: `price_in_snippet` PRZED RESEEDEM (2026-08-18, formula 9.36)

Szesnasty check trafia przy najblizszym reseedzie na 177 wierszy, wiec dostal przebieg **zanim**
zaczal cokolwiek publikowac. Narzedzie: `npx tsx scripts/audit-snippet.mts <domeny>` - pobiera sam
cennik i czyta go **produkcyjnym `readSnippet`**, bez zapisu raportu, wiec **nie odmladza mediany i
nie przesuwa karencji** (karencja liczy `scannedAt` z opublikowanych wierszy, sprawdzone w
`reseed.sh`). Adres cennika brany z ostatniego raportu, a nie zgadywany.

**Probka: 12 domen spoza korpusu + 34 z korpusu** (co piata z listy). Kontrolka spelniona: sonda
umie powiedziec „tak" (13 przejsc na 32 mierzalnych wierszach korpusu).

**Falszywych oskarzen: ZERO.** Przeczytalem wszystkie 19 oblanych opisow po kolei. Kazdy naprawde
nie niesie ani kwoty, ani warunku wejscia (amplitude, deepl, livekit, sanity, tiptap, trigger.dev,
name.com, radar, telnyx, meilisearch, plausible, fastmail, mailerlite, n8n, simpleanalytics,
scaleway, mailjet, dropboxsign bez taga).

**Cztery defekty znalezione i naprawione w 9.36:**
1. **Kwota z symbolem po liczbie.** `9,90 €` (standardowy zapis europejski) nie byla kwota. Klasa
   falszywego oskarzenia dla kazdego, kto wycenia w euro po europejsku.
2. **Cena procentowa.** stripe.com i telnyx wyceniaja w procentach. Ale sam procent kredytowal
   „99.9% uptime", a wersja z `of` kredytowala sendlayer.com za obietnice **zwrotu 100%** pieniedzy -
   zlapane na zywym opisie w drugim przebiegu. Teraz procent liczy sie tylko, gdy pracuje jak
   oplata (`+`, `per`, `/`, slowo `fee` w poblizu), a `100` jest wykluczone.
3. **„no card needed" nie bylo rozpoznawane**, choc `no credit card required` bylo. Bare
   `no credit card` zostawione jako osobna alternatywa, zeby nie przestac czytac zdania bez czasownika.
4. **Cytat byl pierwszym trafieniem, nie najlepszym.** buttondown.com dostawal „carries free entry"
   z dowodem „free migration", podczas gdy w tym samym opisie stoi „Start free today, no card
   needed". Werdykt sie nie zmienia, zmienia sie zdanie, ktore vendor ma poprawic.
   **Dodatkowo:** to samo zdanie bylo cytowane dwa razy (browserbase, courier, pdfmonkey), bo dwa
   wzorce daja okna rozniace sie o kilka znakow. **Codex znalazl tu wiecej niz ja**: moje pierwsze
   scalanie porownywalo teksty, a przy trafieniach oddalonych bardziej niz szerokosc okna zaden
   fragment nie zawiera drugiego. Teraz scalamy **zakresy znakow**, nie napisy.

**Swiadoma decyzja, do zakwestionowania:** cztery opisy mowia tylko „only pay for what you use"
(baseten, koyeb, newrelic, replicate). Zostaja **oblane**. Zdanie jest prawdziwe („nie nazywa ani
kwoty, ani warunku wejscia"), a rada jest wykonalna: replicate moze napisac „od $0.000225/s".
Kredytowanie tego zdania kredytowaloby dokladnie ten snippet, po ktorym agent nadal nie umie
porownac kosztu. **Jesli Krystian uzna inaczej, to jeden wzorzec w `SNIPPET_PATTERNS`.**

**Na probce korpusowej zaden werdykt nie ruszyl sie po zmianach** (13/19 przed i po). Poprawki
zamykaja klasy pokazane na napisach i naprawiaja dowody, a nie przesuwaja punktacji.

**Codex znalazl cos w kazdej z trzech pierwszych rund, za kazdym razem realnie** (czwarta czysta):
1. scalanie dowodow porownywalo teksty, wiec trafienia dalsze niz szerokosc okna dawaly dwa
   fragmenty tego samego zdania;
2. po przejsciu na zakresy: kandydat spinajacy **dwa** istniejace zakresy scalal tylko pierwszy
   (teraz klasyczne scalanie przedzialow po sortowaniu);
3. moja galaz „procent obok slowa fee" przepuszczala **rabat**: „Save 20% on transaction fees".
   Teraz przyimek miedzy procentem a oplata konczy dopasowanie.

**Wniosek do powtorzenia:** przy wzorcach jezykowych sprawdzaj nie tylko „czy lapie to, co ma", ale
**czym jeszcze jest to zdanie** - rabat, gwarancja zwrotu i SLA wygladaja jak cena dla regexpa.

## OFERTA AGENCYJNA / WHITE-LABEL: ODRZUCONE DO ODWOLANIA (2026-08-18, zadanie #45 zamkniete)

**Decyzja podjeta przez audyt subagentem (opus), bo blokowala backlog. WYMAGA POTWIERDZENIA
KRYSTIANA RANO** - jesli sie nie zgadza, cofniecie kosztuje jeden komentarz na boardzie, bo nic nie
zostalo zbudowane ani zmienione na stronie.

**Rekomendacja: nie robimy** ani white-label, ani schodzenia z ceny za domene do poziomu
odsprzedazy. Trzy powody, wszystkie sprawdzone w kodzie przed wykonaniem:
1. Budowalibysmy kanal dystrybucji dla produktu, ktory **nie przyjal jeszcze zadnej platnosci**:
   platnosci to dzis `mailto:`, monitoring rozdajemy za darmo (`MONITORING_IS_FREE = true`), a w
   kolejce watchy nie ma ani jednego obcego platnika. Waskim gardlem jest konto Paddle i decyzja
   JDG kontra spolka, nie opakowanie oferty.
2. Zejscie z ceny odwracaloby decyzje sprzed doby, podjeta na researchu (29 -> 49 USD, bo ponizej
   podlogi rynku techniczny kupujacy czyta cene jako niska jakosc). 17,55 USD za audyt u
   agentchecker.ai to **inna jednostka**: jeden przebieg bez ujawnionej wariancji, przy naszej
   opublikowanej podlodze szumu 0,59 procent.
3. Agencja nie dostarczy lekarstwa, ktore wypisuje nasza diagnoza. `oauth_dcr`, programmatic
   provisioning czy `signup_reachable` to praca inzynierska w produkcie vendora.

**Argument, ktory rozstrzygnal, i wart zapamietania poza tym zadaniem:** white-label **zrywa petle
odpowiedzialnosci**. Cala wartosc stoi na tym, ze pod kazdym werdyktem jest regula, bieg i ktos,
komu mozna ten werdykt podwazyc. Pod cudza marka adresat podwazenia fizycznie znika, a zdanie
„kazde zdanie mozna powtorzyc i podwazyc" przestaje byc prawdziwe w praktyce. To nie jest kwestia
kolejnosci prac, tylko sprzecznosci z produktem.

**Warunek ponownego otwarcia:** trzy niezalezne zapytania PRZYCHODZACE o raport pod cudza marka (nie
o cene za wiele domen), po uruchomieniu platnosci, przy czym co najmniej jedno godzi sie na platny
pilotaz skladany recznie. Slabszy, ale wystarczajacy sygnal: platnik mowi, ze nie moze kupic, bo
zakup idzie przez jego agencje. **Kolejna obnizka u konkurenta sygnalem nie jest.**

**Gdyby jednak „tak", to tylko w wersji co-brandingowej:** okladka i rekomendacje pod marka agencji,
ale kazdy werdykt linkuje do trwalego `/r/<id>` na naszej domenie, ze stopka „measured by Let Agents
In, formula X, reguly publiczne". Cena za domene nie schodzi; ustepstwo tylko na wolumenie powyzej
dziesieciu domen i tylko rozmowa.

**Nic nie trzeba zmieniac na stronie:** FAQ na `/pricing` juz odpowiada na to pytanie (Agency pack
10 domen, dalej rozmowa, a raport pod cudza marka „work we would rather quote than pretend is
automatic").

## PLATNY RAPORT KAZAL KLIENTOWI SZUKAC PUNKTU, KTOREGO NIE MA (2026-08-18, naprawione)

Znalezione tak, jak zawsze: **wygenerowaniem raportu i przeczytaniem go jak klient**
(`npx tsx scripts/client-report.mts tiptap.dev`). Naglowek mowil „**9 of 16 measurable points**", a
tabela etapow pod nim sumowala sie do **17**. Roznicy nie tlumaczylo nic, bo akapit obok obsluguje
tylko checki **niemierzalne**, a brakujacy punkt tiptapa to check, ktory ich **nie dotyczy**
(`robots_paths_resolve`: robots.txt nie wskazuje zadnej konkretnej sciezki, wiec nie ma czego
sprawdzac). Kupujacy, ktory dodaje kolumne, szukal punktu, ktorego nie ma.

Teraz raport wypisuje, ile checkow nie dotyczy klienta, z powodem, i mowi wprost, dlaczego tabela
liczy 17 na papierze, a wynik jest z 16.

**To znowu to samo pojecie liczone dwa razy po swojemu** (patrz zasada 0 na gorze pliku): mianownik
raz `measurable`, raz suma `stage.max`. **Za kazdym razem, gdy dokument stawia liczbe obok tabeli,
sprawdz, czy tabela sumuje sie do tej liczby.**

**Luka domknieta tej samej nocy.** Liczbowa czesc raportu siedzi teraz w `src/lib/report-numbers.ts`
(`scoreSection` plus `arithmeticExplained`), a `rules.mts` sprawdza jedna regule: **jesli kolumna
etapow nie sumuje sie do mianownika, sekcja musi powiedziec dlaczego.** Kontrolka na miejscu -
straznik potwierdza tez, ze rozjazd BEZ powodu jest wytykany, wiec sonda umie powiedziec „nie".
Wolne strony (`/v`, `/r`) tej wady nie mialy, bo wypisuja kazdy check z werdyktem, a miesieczny mail
nie drukuje tabeli punktow.

## ZDANIE O CUDZEJ PRZEWADZE LICZYLO BIEGI, W KTORYCH NIKT NIE WYGRAL (2026-08-18, naprawione)

Znalezione przez przeczytanie miesiecznego maila i platnego raportu jak odbiorca. Zdanie brzmialo
„In the 10 runs that did not put you first, the provider named first was render.com", a liczba
brala sie z **odejmowania** (wszystkie biegi minus twoje pierwsze miejsca), podczas gdy lista
zwyciezcow powstawala tylko z biegow, w ktorych **ktos naprawde padl pierwszy**. Bieg, ktory nie
wymienia nikogo, trafial do licznika, ale nie do listy, wiec zdanie przypisywaloby konkurentowi
prowadzenie w biegu, w ktorym nikt nie prowadzil.

Dzis w danych to nie strzelilo (app-hosting 10x render.com, payments 5x paddle.com,
rich-text-editors 2x prosemirror.net - w kazdym biegu ktos byl pierwszy), ale to zdanie o **cudzym**
produkcie w dokumencie, za ktory ktos placi.

Teraz liczba idzie z biegow, ktore postawily kogos innego na pierwszym miejscu, i zdanie mowi to
wprost: „In the N runs that put somebody else first". Straznik na przypadek „biegow wiecej niz
zwyciezcow" jest w `rules.mts`.

## MAIL O ZMIANIE STAWIAL „NIE UMIELISMY ZMIERZYC" POD SLOWEM „GAINED" (2026-08-18, naprawione)

Znalezione przez wyrenderowanie maila i przeczytanie go jak adresat. Zmiany dzielily sie na dwie
grupy: `worse` i cala reszta pod naglowkiem **„Gained or moved"**. Przejscie `pass -> unmeasured`
nie jest ani zyskiem, ani ruchem w bok, a bywa **najwazniejszym zdaniem, jakie mozemy wyslac**:
„llms.txt published: pass to unmeasured, the host refused ordinary requests" znaczy, ze ich brzeg
zaczal odsylac agenta, czego czlowiek w przegladarce nie zauwazy. Czytalo sie jak dobra wiadomosc.

Teraz sa trzy grupy, a pod trzecia stoi zdanie, ze to nie werdykt o nich, ze nic z tej grupy nie
liczy sie przeciwko wynikowi i ze **czasem to nasz zasieg, a nie ich brzeg**. Straznik w
`rules.mts` sprawdza obie strony: ze naglowek istnieje i ze `unmeasured` nie stoi pod „Gained".

## SKAN NAS SAMYCH ZNALAZL LUKE, KTOREJ SWIADOMIE NIE ZAMYKAMY (2026-08-18)

Puscilismy nasz wlasny skaner na `letagentsin.com` (nie jestesmy w korpusie, wiec to nic nie
kosztuje). Wynik **12 z 13 mierzalnych**, jedyne oblanie to `oauth_dcr`, czyli poprawnie: nie mamy
kont, wiec nie mamy gdzie miec rejestracji klienta OAuth.

Ale przy okazji wyszlo, ze **nasz wlasny opis cennika** brzmi „Free scan, no account and no card", a
check zaliczyl go tylko na slowie `free`: fraza `no card` bez czasownika po niej nie byla warunkiem
wejscia. Vendor, ktory napisze „Pay per use, no card", uslyszalby od nas, ze jego opis nie nazywa
ani kwoty, ani warunku wejscia.

**Proba poszerzenia i decyzja, zeby tego NIE robic.** Trzy podejscia z rzedu wracaly z tym samym
falszywym kredytem u bramek platniczych, za kazdym razem na innym zdaniu, ktore codex wymyslal
szybciej, niz ja dopisywalem wykluczenia: „no card processing fees" (o ich cenniku), „no card
payments accepted" (o tym, czego nie przyjmuja) i „No card, ACH, or wire transfer fees" (lista
oplat, ktora zaczyna sie od tego slowa). Lista wykluczen nie ma konca, a **pomiar rozstrzygnal**:
poszerzenie nie ruszylo ani jednego werdyktu na 46 prawdziwych opisach, bo etykieta `no card asked`
nigdy nie przychodzi sama - zawsze stoi obok `free entry` albo kwoty.

**Zasada z tego, warta wiecej niz sam wzorzec:** regula, ktora nie kredytuje niczego mierzalnego, a
moze skredytowac cos zlego, jest gorsza niz luka, ktora zamyka. Wersja formuly zostaje na **9.36**;
w `rules.mts` stoja trzy straznicy z tymi zdaniami, zeby nikt nie poszerzyl tego z rozpedu.

**Wniosek warty powtarzania: puszczaj wlasny pomiar na siebie.** Wlasna kopia jest najtansza
probka, jaka mamy, i jako jedyna jest napisana przez nas, wiec pokazuje luki, ktorych nie widac na
cudzych stronach.

## MASZYNOM OBIECYWALISMY INNY LIMIT NIZ LUDZIOM I NIZ ROBI KOD (2026-08-18, naprawione)

`/.well-known/agent-access.json` - plik, ktory sami polecamy agentom jako zrodlo prawdy o wejsciu -
mowil **„10 zadan na godzine na adres"**. Prawda z `scan-gate.ts` to **5 na godzine na skanowana
domene i 30 na adres**, czyli dokladnie to, co pisza `/agents.md` i `/agent-signup.md`. Agent
planujacy pod ten JSON albo dusi sie bez powodu, albo wpada w 429 przy 11. zadaniu, bo dwa limity
byly sciete do jednego.

Teraz JSON wymienia oba limity osobno, z oknem i z tym, co sie dzieje po przekroczeniu. Liczby w
`agents.md` i `agent-signup.md` zapisane **cyframi zamiast slowem**, zeby dalo sie ich pilnowac, i
straznik w `rules.mts` porownuje wszystkie trzy pliki ze stalymi `PER_DOMAIN_PER_HOUR` i
`PER_CALLER_PER_HOUR`.

**Wzorzec z calej nocy, juz trzeci raz:** liczba wpisana z reki do pliku statycznego nie ma jak sie
sama poprawic, a pliki statyczne to wlasnie te, ktore czytaja maszyny. `public/llms.txt` dostal ten
sam straznik (liczba checkow).

**I natychmiastowa kara za polowiczna zmiane:** przepisanie liczb ze slow na cyfry zepsulo **inny**
straznik, `audit-corpus.mts`, ktory czytal je slownikiem `five -> 5`. Wynik byl komiczny i dlatego
czytelny: „says 5 per domain, code says 5". Teraz czyta oba zapisy. Wniosek: **zmieniajac format
liczby, poszukaj wszystkich, ktorzy ja czytaja** - to ta sama zasada, co „jedno pojecie liczone w
dwoch miejscach", tylko od strony czytelnika.

**Przy okazji drugi rozjazd w tym samym pliku:** czas skanu. JSON mowil „Takes 15-30s", proza
„about ten seconds". **Zmierzone dzis na produkcji: linear.app 7,3 s, val.town 12,4 s** (height.app
1,1 s, bo nie odpowiada i to jest poprawna odmowa, a nie szybki skan). Pierwsza proba poprawki
obiecywala „nigdy pozniej niz 27 s" i **codex slusznie ja obalil**: 27 s to budzet POBIERANIA,
punktowanie i zapis ida po nim, wiec to nie jest gwarancja czasu odpowiedzi. Teraz plik mowi, czym
ta liczba jest, i radzi dac minute timeoutu. Straznik porownuje ja z **domyslna** stala
`DEFAULT_SCAN_BUDGET_MS`, a nie ze skonfigurowana, bo `SCAN_BUDGET_MS` wolno nadpisac srodowiskiem,
a straznik chodzi w buildzie.

## NASZ WLASNY OPENAPI NIE OPISYWAL TEGO, CO API ZWRACA (2026-08-18, naprawione)

`/llms.txt` mowi agentom, ze spec jest „generated from the same check definitions the scanner runs".
Prawda dla identyfikatorow checkow, nieprawda dla calej reszty: spec jest pisany reka obok route'u.
Brakowalo w nim **`scorecard.stages`** i **`check.why`**, obecnych w kazdej odpowiedzi. Klient
wygenerowany ze specu po prostu gubi to, czego spec nie wymienia.

**Nowy skrypt: `npm run audit-our-api`.** Skanuje **nas samych** przez produkcje, pobiera nasz spec i
wypisuje kazde pole odpowiedzi, ktorego spec nie opisuje. Kontrolka zadzialala od razu: uruchomiony
przed wdrozeniem poprawki wskazal dokladnie te dwa pola, ktore znalazlem recznie.

**I od razu zlapal moj wlasny blad.** Dopisujac `stages` do specu **zgadlem** ich ksztalt
(`id`, `title`, `points`, `max`) zamiast go przeczytac; naprawde jest `stage`, `letter`, `title`,
`question`, `points`, `max`, `measurable`. Wytknal to codex, ale wystarczylo uruchomic nowy audyt po
poprawce - i to jest wniosek: **skrypt, ktory sprawdza dokument, ma sie uruchamiac PO zmianie
dokumentu, a nie tylko przed nia.**

Przy okazji: opis bledu 429 w specu bral liczby z reki („five per hour... thirty per hour"), teraz
idzie z `PER_DOMAIN_PER_HOUR` i `PER_CALLER_PER_HOUR`. Sprawdzone tez, ze publikowane kody bledow sa
prawdziwe: 400 dla zlej domeny i formatu spoza enum, 422 dla domeny, ktora nie odpowiada.

## RUNBOOK PLATNOSCI, A PRZY OKAZJI DWIE DZIURY W SCIEZCE PIENIEDZY (2026-08-18)

**`docs/turning-billing-on.md`**: co dokladnie zrobic, zeby wlaczyc sprzedaz. Produkty do zalozenia
z cenami i nazwami zmiennych, webhook i zdarzenia, ktore obslugujemy, przelacznik, weryfikacja i to,
co zostaje reczne. Straznik w `rules.mts` sprawdza **wiersz po wierszu**, ze runbook wymienia kazdy
produkt z katalogu, z ta cena i z ta zmienna, ktora katalog naprawde czyta (globalne szukanie
przepuszczalo „$49" schowane w „$499").

**Codex wytknal, ze runbook opisuje checkout, ktorego nie ma** - i mial racje. CTA na `/pricing` to
`mailto:`, `paddle().checkoutFor` zwraca `null`, nikt go nie wola. Runbook ma teraz krok 3
„Build the checkout, which does not exist yet" i mowi wprost: samo ustawienie `BILLING_PROVIDER`
niczego nie sprzedaje, daje tylko mozliwosc wyslania zdarzen testowych.

**Dwie realne dziury, obie w sprzecznosci z komentarzem, ktory sam webhook nosi** („platnosc, ktorej
nie da sie zastosowac, i tak zostaje zapisana"):
1. **Platnosc bez `custom_data.email` byla kwitowana 200 i nie zostawiala sladu.** To najbardziej
   prawdopodobny blad pierwszego dnia (zle skonfigurowany checkout), a Paddle wysyla `customer_id`,
   nie adres. Teraz `read` odroznia zdarzenie **nieczytelne** od **ignorowanego**, a webhook
   odpowiada **422**: dostawca ponawia, a nieudana dostawa jest widoczna w jego panelu, czyli tam,
   gdzie jest jedyny trwaly slad, jakiego sami nie mozemy zapisac. Ksiegowe zdarzenia bez adresu
   nadal sa po cichu ignorowane.
2. **Cena spoza katalogu ginela.** Najpierw naprawione tylko dla transakcji, w ktorej NIC nie
   pasuje; codex zauwazyl, ze transakcja z jedna linia znana i jedna nieznana nadal gubi te druga.
   Teraz `unmatchedPrices` liczy linie, a nie transakcje.

**Pulapka przy okazji, warta zapamietania:** ceny ustawilem najpierw w skrypcie `npm run rules`, a
`build` wola `tsx scripts/rules.mts` **wprost**, wiec lokalnie przechodzilo i **wywrocilo deploy**.
Straznik nie moze zalezec od sposobu wywolania: wartosci domyslne siedza teraz w samym pliku
(`process.env.X ??= ...` plus dynamiczny `import`, bo statyczny wykonalby sie przed przypisaniem).

**Trzecia rzecz, ktora wyszla mimochodem i jest wieksza niz obie:** w srodowisku straznikow **zadna
cena nie byla skonfigurowana**, wiec `skusForPrices` nie mial czego dopasowac i **cala sciezka
przyznawania uprawnien byla nietestowana**. `npm run rules` ustawia teraz dwie ceny
(`pri_watch`, `pri_report`) i sprawdza obie strony: co sie rozwiazuje do produktu i co zostaje
nieznane.

## LICENCJA KORPUSU: NAPISANA, WYLACZONA, CZEKA NA JEDNO SLOWO (2026-08-18)

**Publikowalismy w trzech miejscach „free to use and quote with attribution" i nie bylo za tym
zadnych warunkow**: ani tekstu licencji, ani zdania, co znaczy „attribution". Ponowne uzycie korpusu
jest nasza strategia dystrybucji, wiec ta obietnica musi byc prawdziwa.

Przygotowane: `/corpus-licence` z **CC BY 4.0**, bo to dokladnie to zdanie, ktore juz publikujemy, w
slowach, ktore rozumie i prawnik, i scraper. Strona **odmawia (404), dopoki
`CORPUS_LICENCE_PUBLISHED=true`**, tak jak strony sprzedawcy, ale z mocniejszego powodu:
**udzielenia licencji na dane juz opublikowane nie da sie cofnac**, wiec to rzadka rzecz warta tego,
zeby czlowiek powiedzial „tak". **DO DECYZJI KRYSTIANA RANO** - wlaczenie to jedna zmienna.

Wszystko, co sie z tym wiaze, chodzi za ta sama flaga: zdania na `/docs` i `/report`, pole `terms` w
`corpus.json` i `license` w danych strukturalnych. Dwa pliki statyczne (`llms.txt`,
`agent-access.json`) flagi nie znaja, wiec **straznik zatrzymuje build**, gdy flaga jest wlaczona, a
one nadal mowia stare; instrukcja co wpisac stoi przy samej fladze w `seller.ts`.

**Codex zlapal tu blad, ktory bylby realnym bledem prawnym:** moja lista wymogow atrybucji stawiala
„zachowaj wersje formuly" jako czwarty warunek licencji, a **CC BY nie pozwala dokladac warunkow**.
Teraz sa trzy wymogi licencji i osobno prosba, ktora niczego nie warunkuje.

## KADENCJA MONITORINGU: SPRAWDZONA, ZDROWA, WIDOCZNA (2026-08-18)

Poszedlem sprawdzic, czy cotygodniowy skan obserwowanych domen w ogole chodzi, bo dwie obserwacje
mialy **125 godzin** od ostatniego pomiaru. Odpowiedz: **chodzi**. `GET /api/cron/watch` z tokenem
mowi `{"watches":3,"due":0,"longestWaitDays":5}`, a harmonogram to **GitHub Actions**, nie Heroku
Scheduler: `.github/workflows/watch.yml` codziennie o 04:17 w petli, `health.yml` co godzine,
`quota.yml` tygodniowo z alarmem kadencji.

**Wniosek o mnie, wart wiecej niz sam wynik:** przez kilkanascie minut szukalem harmonogramu w
Heroku, bo tam byl zainstalowany dodatek Scheduler, i prawie zapisalem „monitoring nie ma
harmonogramu". **Odpowiedz lezala w repo.** Zanim zglosisz, ze czegos nie ma, przeszukaj repozytorium,
a nie tylko panel.

`npm run watch-coverage` pokazuje teraz kadencje obok pokrycia: najstarszy pomiar, kiedy nalezy sie
skan (144 h) i kiedy pada alarm. Prog jest **liczony tak samo jak w `quota.yml`** (dni zaokraglone,
alarm powyzej osmiu, czyli faktycznie 8,5 dnia) - codex wytknal, ze moja pierwsza wersja krzyczalaby
przez pol dnia, w ktorym produkcyjny alarm jest zdrowy, i przy prawdziwej awarii nie wiadomo byloby,
ktoremu wierzyc.

## 32. PRZEBIEG: `typed_package` STOI NA ZGADYWANEJ PACZCE, I ZMIERZYLEM, W ILU WIERSZACH (2026-08-18)

**Zmierzone na calym korpusie:** dopasowanie po wydawcy (`npmSource === 'registry-search'`) niesie
**127 przejsc i 10 oblan**; mocne dopasowanie (paczka nazwana na ich stronie) **24 przejscia i zero
oblan**. Czyli **wszystkie dzisiejsze oskarzenia stoja na paczce, ktora sami wybralismy z rejestru**.

**Zweryfikowane recznie, wszystkie 10, wobec rejestru npm** (audyt decyzji slusznie kazal zrobic to
PRZED zmiana reguly, nie po):

| domena | ocenilismy | werdykt o vendorze |
|---|---|---|
| cronofy.com | `cronofy`, opisana jako „SDK for Cronofy" | **PRAWDZIWY** |
| newrelic.com | `newrelic`, agent Node, ktory sie instaluje | **PRAWDZIWY** |
| heroku.com | `heroku-client`, ich wrapper API v3 | **PRAWDZIWY** |
| timekit.io | `timekit-booking` zamiast `timekit-sdk` | zly artefakt, ale alternatywa tez bez typow |
| directus.com | `directus` (serwer) zamiast `@directus/sdk` (otypowany) | **ZLY ARTEFAKT** |
| xata.io | `@xata.io/api`, przy kilku otypowanych paczkach w tym samym scope | **ZLY ARTEFAKT** |
| honeycomb.io | `libhoney` zamiast `@honeycombio/opentelemetry-node` (otypowany) | **ZLY ARTEFAKT** |
| namecheap.com | `node-vault-client`, klient HashiCorp Vault | **ZLY ARTEFAKT**, nie maja SDK |
| godaddy.com | `warehouse.ai-api-client`, ich wewnetrzny deploy | **ZLY ARTEFAKT**, nie maja SDK |
| june.so | `@june-so/analytics-node`, oblane na 28 miesiacach bez zmiany rekordu | galaz o wieku, nie o typach |

**To unieważnilo moja pierwotna propozycje.** Chcialem po prostu zamienic kazde oblanie na slabym
dopasowaniu w niemierzalne. Cztery z dziesieciu oskarzen sa prawdziwe, wiec plaskie wylaczenie
**zniszczyloby prawdziwe znaleziska, zeby uniknac falszywych**.

**Rekomendacja audytu decyzji (subagent, opus), do wykonania NA SPOKOJNIE:** bramka na samej galezi
oblania, z materialu, ktory juz liczymy i wyrzucamy na granicy funkcji (`ownershipOf` zwraca
`proved|suggested|none`, `readScrapedPackage` zwraca `aboutThem`, jest `linksToVendorSite`).
Oskarzenie przechodzi tylko, gdy wlasnosc jest **udowodniona**, paczka **mowi o ich produkcie**, i
**nie ma rodzenstwa o rownym lub lepszym `cheapRank`** (sprawdzanego niezaleznie od tego, czy ma
typy, bo inaczej to zakupy pod wynik). Osobno: galaz „rekord starszy niz 24 miesiace" na slabym
dopasowaniu powinna schodzic do niemierzalnej bezwarunkowo, bo to nie jest zdanie o typach.
Do tego `NpmMatch.confidence` ma dzis **jedna mozliwa wartosc** - albo urealnic, albo usunac.

**Bramka jednak powstala tej nocy, jako 9.40, i jest zweryfikowana na produkcji.** Sygnaly
`ownership`, `saysWhose` i `rivals` ida teraz z `searchNpmForDomain` przez findings do reguly.
Oskarzenie o brak typow przechodzi tylko przy **udowodnionej wlasnosci**, paczce, ktora **mowi o
produkcie vendora**, i **zerowej liczbie rywali o tym samym ksztalcie**. Galaz „nie znaleziono w
rejestrze" na dopasowaniu z rejestru tez schodzi do niemierzalnej, bo takie zdanie jest wtedy
falszywe, a nie surowe.

**POMIAR NA ZYWO** (skan dziesieciu domen nowym kodem, bez zapisu do bazy):
**przed: 10 oskarzen, po: 4**. Zostaly cronofy, newrelic i heroku - wszystkie trzy potwierdzone
recznie jako prawdziwe - oraz directus, ktory przechodzi mimo bledu.

**Pomiar zlapal tez moj wlasny blad, i to jest tu najwazniejsza lekcja.** Pierwsza wersja gubila
nowe pola po drodze (`scan/index.ts` przepisuje `discovered` recznie), wiec wszystkie przychodzily
jako `undefined`, a bramka blokowalaby **kazde** oskarzenie - czyli dokladnie plaskie wylaczenie,
ktore audyt odrzucil, tylko w przebraniu bramki. Typy przechodzily, straznicy przechodzili, codex
nie mial jak tego zobaczyc. **Zobaczyl to dopiero skan na zywo.**

**Directus zostaje oskarzony i to jest osobne znalezisko (#47):** `@directus/sdk` ma **siedem razy
wiecej pobran** (135 tys. kontra 19 tys. tygodniowo) i opis „Directus JavaScript SDK", a ranking
ksztaltu nazwy i tak wybiera gola nazwe `directus`. Z punktu widzenia bramki identyfikacja jest
czysta, wiec problem jest wyzej, w atrybucji. Dlatego sprostowanie dla directus ma `fixedIn: '9.41'`
i **nie wygasnie** na 9.40, a pozostale cztery wygasna same, gdy wiersze zostana przemierzone.

**Co zrobilem od razu (9.37, bezpieczna czesc bramki):** galaz „rekord starszy niz 24 miesiace"
przestaje byc oskarzeniem, gdy paczke wybralismy z rejestru sami. To nie jest zdanie o typach, tylko
o tym, ze znalezione przez nas cos wyglada na porzucone - czyli dokladnie tak, jak wyglada zly
strzal. june.so bylo oblane na `@june-so/analytics-node`, podczas gdy ten sam scope niesie
`@june-so/analytics-next`, opisana w rejestrze jako ich SDK.

**I to samo w naglowku raportu, o czym bym nie pomyslal.** Codex zauwazyl, ze `headline.ts` robi
mocniejsze twierdzenie niz check pod nim („The SDK agents will install for you was last published
N months ago"), przy **18** miesiacach zamiast 24, calkiem niezaleznie od werdyktu. Naprawiona
regula w checku zostawilaby strone oskarzajaca **wiekszym drukiem niz wiersz, ktory streszcza**.
Znowu to samo pojecie w dwoch implementacjach.

**Co zostalo na potem:** wlasciwa bramka (wlasnosc udowodniona, paczka mowi o ich produkcie, brak
lepszego rodzenstwa) - zadanie **#46** na boardzie, z cala rekomendacja audytu.

**Co zrobilem zamiast tego:** **piec sprostowan w `errata.ts`** dla wierszy o zlym artefakcie
(directus, xata, honeycomb, namecheap, godaddy), z `fixedIn: '9.40'`, czyli wersja, ktora ma przyniesc
bramke. Sprostowanie pojawia sie **przy werdykcie na opublikowanej stronie**, wiec czytelnik widzi,
ze wiemy, i co dokladnie jest nie tak. Trzy prawdziwe oskarzenia zostaja bez sprostowania, bo sa
prawdziwe. `after-reseed.mts` bedzie od teraz wypisywal te piec jako „nadal wymaga sprostowania" -
to nie awaria reseedu, tylko widoczny dlug.

## KLUCZ INDEXNOW LEZAL NA STRONIE OD TYGODNI I NIKT GO NIE UZYWAL (2026-08-18)

`public/61910d946de69abaddd574578a8da3a0.txt` byl na miejscu, a **nic nigdy nie zglaszalo zadnego
adresu**. Plik reklamowal mozliwosc, z ktorej nie korzystalismy. To wazniejsze niz przy zwyklej
stronie: **wyszukiwarka ChatGPT pobiera z Bing**, a nasze strony vendorow zmieniaja sie przy kazdym
przemiecie, wiec korpus, ktorego indeks nie przeczytal ponownie, to korpus, z ktorego nikt nie
odpowiada na pytania.

**`npm run indexnow`** (steady: 64 adresy) i **`npm run indexnow -- --all`** (241 adresow, po
reseedzie). Zgloszone dzis, odpowiedz 200. Lista bierze sie **z naszej wlasnej `sitemap.xml`**, a nie
z listy wpisanej w skrypcie: pierwsza wersja miala `/audits`, przepisane z etykiety w nawigacji,
podczas gdy trasa nazywa sie `/audit`. Recznie wpisana lista wlasnych stron jest bledna nastepnego
dnia po zmianie nazwy.

Dwie rzeczy od codeksa: podane wprost adresy **nie czytaja juz sitemapy** (tryb na zly moment nie
moze zalezec od tego, ze strona dziala), a straznik w `rules.mts` pilnuje, ze plik klucza zawiera
**wlasna nazwe** - inaczej silnik uznaje kazde zgloszenie za cudze i **nic nie mowi**, czyli porazka
jest cicha z definicji.

## KAZDY PLATNIK JEST GOSCIEM, A MIESIECZNY MAIL TEGO NIE UMIAL (2026-08-18)

Korpus to 177 domen, ktore **my** wybralismy do publikacji, a kupuja ci, ktorych na niej nie ma.
`watch-coverage` mowil o tym od dawna jednym zdaniem („miesieczna cela dla takiej obserwacji wymaga
zapisania tej decyzji przy obserwacji, czego jeszcze nie ma"), ale skutek byl gorszy, niz brzmi.

**Pulapka, ktora prawie zaimplementowalem:** wystarczyloby zapisac kategorie przy obserwacji i mail
by sie wygenerowal - czytajac **gotowe wiersze celi**, w ktorych goscia nigdy nie bylo. Platnik
dostalby zdanie „named in 0 of 10 agent runs" o biegach, w ktorych **nikt go nie szukal**. Zero,
ktorego nikt nie zmierzyl, wyglada dokladnie jak zero zmierzone.

Zrobione:
- `Watch` ma `placedIn` i `brand`; `categoryOfWatch` (w `watch.ts`) rozstrzyga kategorie tak samo
  dla maila i dla raportu, zeby dwa dokumenty nie odpowiadaly inaczej o jednym kliencie.
- **`src/lib/guest-cell.ts`**: `readWithGuest` przelicza wymienienia z surowych odpowiedzi, z nazwa
  goscia w liscie i **z przeliczeniem wszystkich pozostalych obok niego** (matcher rozstrzyga
  dwuznaczna nazwe po sasiadach). Platny raport robil to od dawna we wlasnym kodzie; teraz to jedna
  funkcja dla obu.
- **`npx tsx scripts/assign-watch.mts <domena> <email> --category <id> [--brand Nazwa]`**, bo to
  decyzja czlowieka, nie zgadywanie: „email" dla email.com liczyloby kazde zdanie o mailu.
- Marka jest **wylaczna**: sprawdzana wobec korpusu ORAZ wobec **wszystkich** obserwacji przez nowe
  `store.watchWithBrand`. Codex wytknal dwa razy z rzedu, ze pierwsza wersja pytala tylko o kolejke
  dostaw, a zatrzymana obserwacja wraca w chwili, gdy ktos zaplaci.

**Sprawdzone na zywym gosciu:** `buttondown.com` (spoza korpusu, kategoria transactional-email) na
naszej skrzynce testowej. Mail wychodzi z prawdziwymi liczbami: 0 z 10, ale to **zmierzone** zero,
plus lista tych, ktorzy byli wymieniani czesciej, i uczciwe zdanie o absencji. Obserwacja zostaje
wlaczona jako zywy przypadek testowy.

## ALARM KADENCJI ZAPALALBY SIE PRZY KAZDYM NOWYM KLIENCIE (2026-08-18, naprawione)

Wyszlo przez zalozenie testowej obserwacji goscia: moje wlasne `watch-coverage` wypisalo
„1 obserwacji CZEKA ZA DLUGO" o obserwacji sprzed pieciu minut. Przyczyna byla glebiej niz w
skrypcie: `GET /api/cron/watch` mapowal `checkedAt === null` na **nieskonczonosc**, wiec
`longestWaitDays` skakalo do 9999 w chwili, gdy ktokolwiek potwierdzil adres, a tygodniowy alarm w
`quota.yml` pada powyzej osmiu dni. **Kazdy nowy klient odpalalby alarm o naszej wlasnej dostawie**,
dopoki nocny przebieg go nie obsluzyl.

Teraz obserwacja nieskanowana czeka od **potwierdzenia** (nie od zapisu i nie w nieskonczonosc):
przed potwierdzeniem nie ma jej w kolejce, wiec ktos, kto potwierdzil po dwoch tygodniach, nie jest
kims, kogo kazalismy czekac. Endpoint i skrypt licza to jedna formula, straznik w `rules.mts`
sprawdza trzy przypadki.

Do tego `watch-coverage` czytal kategorie przez `categoryFor`, wiec o przypisanej obserwacji mowil
„BRAK KATEGORII", podczas gdy mail juz umial ja obsluzyc. **Trzeci raz tej nocy to samo pojecie w
dwoch implementacjach**; teraz oba ida przez `categoryOfWatch`.

## JEDEN KLIENT, JEDNA KATEGORIA: RAPORT CZYTA TO, CO WIE MAIL (2026-08-18)

Po dodaniu przypisania przy obserwacji zostal rozjazd: **platny raport nadal wymagal flag**
`--category` i `--brand`, choc decyzja byla juz zapisana. Dwa dokumenty o jednym kliencie mogly
opisywac go inaczej, a operator musial pamietac cos, co raz juz rozstrzygnal. Teraz raport czyta
przypisanie z obserwacji, gdy domeny nie publikujemy i nikt nie podal flagi.

Trzy rzeczy, ktore wyszly przy okazji, wszystkie od codeksa:
1. **Przypisanie jest cecha produktu, nie subskrybenta.** `assign-watch` zmienialo tylko obserwacje
   podanego adresu, wiec dwie osoby obserwujace jedna domene mogly byc czytane wedlug dwoch roznych
   kategorii, a raport bral te, ktora baza zwrocila pierwsza. Teraz przypisanie obejmuje wszystkie
   obserwacje domeny i mowi, kogo jeszcze dotyczy.
2. **Sprzecznych przypisan nie rozstrzyga sie losowaniem:** raport odmawia i kaze je uporzadkowac.
3. Porownanie marek **bez wielkosci liter**, tak samo jak dziala ich wylacznosc i sam matcher.

Poprawiona tez linia konsoli, po ktorej operator decyduje o wyslaniu: brala liczby z pierwszej celi
i z opublikowanych wierszy, wiec dla goscia pisala „0/5" nad raportem mowiacym „0 of 10".

## 47: RANKING NAZW PACZEK, ZMIERZONY NA CALYM KORPUSIE PRZED WDROZENIEM (2026-08-18)

**Przyczyna:** gola nazwa vendora miala najlepsza mozliwa range, wiec `directus` (serwer, 19 tys.
pobran tygodniowo, bez typow) wygrywal z `@directus/sdk` (135 tys., z typami, opisana w rejestrze
jako „Directus JavaScript SDK") **niezaleznie od pobran**. Paczka w scope vendora nazwana `sdk` albo
`client` stoi teraz rowno z gola nazwa, wiec rozstrzygaja pobrania.

**Nowy skrypt `scripts/audit-attribution.mts`**: dla kazdego wiersza korpusu wybranego przez
wyszukiwarke porownuje dzisiejszy wybor z tym, na czym stoi opublikowany wiersz. Tylko rejestr, bez
dotykania stron vendorow i bez zapisu. **Nie uruchamiac w trakcie przemiatu** - skaner pyta npm o to
samo w tym samym czasie, a limit trafiony tutaj dociera tam jako paczka, ktorej nikt nie publikuje.
Pomiar chodzi **wolno i pyta dwa razy** wlasnie dlatego: bez tego trzy z pierwszych szesciu domen
wygladaly na regresje, a zadna nia nie byla.

**Pomiar zlapal dwie rzeczy, ktorych nie zlapalby przeglad:**
1. **Cudzy scope.** Pierwsza wersja uzywala `isVendorScope`, ktore akceptuje **prefiks**, wiec
   `@bunny-agent/sdk` (firma `vikainc`, „AI Provider and React hooks") awansowal ponad wlasna paczke
   bunny.net. Teraz scope musi **byc** nazwa vendora.
2. **Za szeroka definicja SDK.** Wersja przyjmujaca kazda nazwe zlozona ze slow SDK dala na 137
   porownanych wierszy **9 zmian, w tym regresje**: `@datadog/browser-core` (paczka wewnetrzna)
   ponad ich klienta API, plus cztery ruchy w bok miedzy dwiema prawdziwymi paczkami vendora
   (launchdarkly, bitmovin, searchkit, commercetools). Zawezone do **doslownie `sdk` albo `client`**:
   zostaja trzy poprawki, ktore chcielismy (directus, sanity, configcat), znikaja wszystkie ruchy
   watpliwe.

**Stan koncowy: ZMIANA WYCOFANA, zadanie zostaje otwarte.** Pomiar po przemiecie na zawezonej
wersji: 137 wierszy porownanych, 124 bez zmiany, 9 milczacych (rejestr odmowil), **4 zmiany**.
Trzy to dokladnie te, o ktore chodzilo (configcat, sanity, directus). Czwarta byla nowa:

```
netlify.com: @netlify/api -> @netlify/sdk
```

W rejestrze `@netlify/api` to „Netlify Node.js API client", **349 tys. pobran tygodniowo**;
`@netlify/sdk` to „the toolset for developing Netlify Extensions", **89 tys.** - paczka dla kogos,
kto **buduje rozszerzenia Netlify**, a nie dla kogos, kto uzywa Netlify. To ta sama rodzina bledu
co `@datadog/browser-core`, tylko przechodzi przez zawezona regule, bo nazywa sie doslownie „sdk".

**Wniosek, ktory zostaje w kodzie (komentarz przy `shapeRankOf`):** awans po nazwie odwraca przypadek,
ktory pobrania mialy juz dobrze. Prawdziwa naprawa nie polega na przesuwaniu nazw miedzy rangami,
tylko na tym, **zeby pobrania mogly przewazyc roznice jednej rangi** - a to jest zmiana calego
porzadkowania i wymaga wlasnego pomiaru. Trzy poprawki przeciwko jednej regresji na nazwanym
vendorze to za malo, zeby wysylac.

**Co zostaje na miejscu:** `scripts/audit-attribution.mts` (pomiar sam w sobie jest wart wiecej niz
zmiana), straznik w `rules.mts` pilnujacy, ze `@directus/sdk` **nie** awansuje sam z nazwy (zeby
nikt nie wprowadzil tego z powrotem bez pomiaru) oraz sprostowanie directusa. Sprostowanie ma
`fixedIn: 9.41`, wiec **nie wygasnie samo** - i dobrze, bo wiersz nadal stoi na `directus`.

## WCZESNA KONTROLA PRZEMIATU I STRAZNIK NA SLEPA BRAMKE (2026-08-18, w trakcie przemiatu)

Zamiast czekac na koniec, sprawdzilem pierwsze 30 wierszy juz zapisanych przez przemiat, zeby
ewentualny problem zlapac przy trzydziestym, a nie przy sto siedemdziesiatym:

- **`price_in_snippet`: 12 przechodzi, 12 oblewa, 1 niemierzalny, 5 nie dotyczy.** Czyli 50 procent
  na mierzalnych, przy przewidywaniu 45 procent z dwoch probek przedreseedowych. Bez niespodzianki.
- **Bramka atrybucji z 9.40 dziala w produkcji:** wszystkie wiersze wybrane przez wyszukiwarke niosa
  zapisane fakty (`npmOwnership`, `npmSaysWhose`, `npmRivals`), zero oskarzen w tej probce.

**Nowy straznik w `after-reseed.mts`, na blad, ktory sam popelnilem dzis w pierwszej wersji bramki:**
gdy skaner przestanie zapisywac te pola, bramka **po cichu blokuje kazde oskarzenie**, czyli staje
sie plaskim wylaczeniem, ktore audyt odrzucil. Straznik liczy wiersze **tylko na biezacej formule**
(starszy raport nie moze niesc pola, ktorego wtedy nie bylo - policzone inaczej krzyczal o 109
wierszach, ktore niczego nie lamia) i sprawdza **wszystkie trzy pola**, bo bramka czyta wszystkie
trzy, a wiersz z sama wlasnoscia jest tak samo slepy.

## PROCEDURA NA SPOR Z VENDOREM (2026-08-18, `docs/handling-a-dispute.md`)

Kazda strona vendora ma `mailto:` z tematem „Wrong verdict on <oni>", publikujemy imienne
oskarzenia, a **nie bylo spisane, co robi czlowiek, gdy ktos napisze**. Tej nocy pieciu wierszom
trzeba bylo wystawic sprostowanie recznie, wiec procedura powstala z prawdziwego przypadku.

Cztery rzeczy, ktore w niej sa i ktorych nie da sie odtworzyc z pamieci:
1. **Odtworz, zanim odpiszesz**, i to z `VERBOSE=1`, bo bez tego widac tylko wynik, a spor nigdy nie
   jest o wynik.
2. **Lokalny skan niczego nie publikuje.** Poprawka wiersza to skan **przez produkcje** z ciasteczkiem
   konsoli, i trzeba sprawdzic pole `saved`: API zwraca pelna karte i `"saved":false`, gdy baza
   odmowila zapisu (raz zameldowalo 340 pomiarow, z ktorych nie zapisal sie ani jeden).
3. **Sprostowanie idzie przed poprawka reguly**, z `fixedIn` ustawionym na wersje, ktora naprawde
   bedzie zawierac fix - wygasle za wczesnie zostawia zly werdykt bez niczego obok.
4. **Zmiany reguly nie uzasadnia jeden vendor, ktory napisal:** najpierw reczna weryfikacja spornych
   wierszy, potem pomiar na calym korpusie, nigdy w trakcie przemiatu.

Jest tez lista rzeczy, ktorych nie robimy: nie usuwamy wiersza na zyczenie (dziura w opublikowanym
korpusie sama jest twierdzeniem), nie zmiekczamy prawdziwego zdania i nie spieramy sie o punkty,
tylko o werdykt.

**Codex zlapal w pierwszej wersji dwa bledy P1, oba czyniace runbook bezuzytecznym:** komenda bez
`VERBOSE` nie pokazuje werdyktow, a zdanie „rescan poprawia opublikowany wiersz" bylo **nieprawda**
dla komendy, ktora podalem. Operator moglby napisac vendorowi, ze poprawione, podczas gdy publiczna
strona sie nie zmienila.

## PO PRZEMIECIE WIDAC TERAZ, ILE WIERSZY NIESIE NASZ WLASNY 429 (2026-08-18)

`sawRateLimit` istnialo od dawna i jest przemyslane (429 przy drzwiach, przy rejestracji albo na
stronie dokumentacji zostawia wiersz tak samo chudy), ale **po przemiecie nikt nie widzial liczby**.
A to pierwsza liczba mowiaca, czy przemiat byl za ostry: wiersz z naszym limitem opisuje strone
chudziej, niz ona na to zasluguje, i jest to **nasz slad, nie ich regula**.

`after-reseed.mts` wypisuje teraz „429 od nas: N wierszy" z probka domen. **Zmierzone w trakcie
drugiego przebiegu: 7 wierszy** (logto.io, postmarkapp.com, contentful.com, nylas.com, savvycal.com,
pandadoc.com i jeszcze jeden), przy czym cztery z nich przemiat sam ponowil po odczekaniu, a
postmarkapp.com odpowiadal 429 nadal.

## PO PRZEMIECIE 9.40: WSZYSTKIE PRZEWIDYWANIA TRAFIONE (2026-08-18, 06:28)

**177 wierszy na 9.40, 0 sprzecznosci, 0 rozjazdow w publikowanych liczbach, 5 werdyktow gorszych**
niz poprzedni pomiar (3 z nich na split.io, gdzie skan nie znalazl zadnej strony dokumentacji,
1 na postmarkapp.com, ktory odpowiadal nam 429, 1 na calendly.com). **Do przeskanowania pojedynczo
zanim ktokolwiek uzna je za regres vendora.**

| co | przewidywane przed przemiatem | zmierzone po |
|---|---|---|
| `price_in_snippet` przechodzi | 40-50 procent, 70-85 wierszy | **67 ze 158 mierzalnych, 42 procent** |
| `typed_package` oskarzen | okolo 4 zamiast 10 | **dokladnie 4** |
| fakty bramki w wierszach | wszystkie | **137 ze 137** |
| sprostowania, ktore wygasna | 4 z 5 | **4 z 5, zostal directus** |

`programmatic_provisioning`: 61 zaliczonych, **wszystkie cytuja slowa, na ktorych stoi punkt**.
`oauth_dcr`: 91 oblanych, 74 z adresami. `429 od nas`: 6 wierszy.

## KLUCZ LICENCYJNY: NIE BUDUJEMY Z TEGO CHECKA (2026-08-18, zamkniete pomiarem)

Zbieralismy dowody od 9.34, zeby decyzje podjac z korpusu, a nie z trzech vendorow, ktorych ktos
pamieta. **Wynik na pelnym korpusie: dwa wiersze.** ckeditor.com („Some CKEditor 5 features are
premium and require a commercial license") i tiny.cloud („Why is a license key required?").

Dwa wiersze na 177 to za malo, zeby zbudowac na tym check: nie da sie na tym zmierzyc ani progu, ani
falszywych oskarzen, a kazdy nowy check kosztuje zadania na skanie i miejsce na stronie wyniku.
**Zbieranie dowodow zostaje** (nic nie kosztuje, siedzi w findings), decyzja o punktowaniu wraca,
jesli liczba urosnie - i to jest teraz liczba, ktora `after-reseed.mts` wypisuje po kazdym przemiecie.

## PIEC „GORSZYCH WERDYKTOW" PO PRZEMIECIE: TO BYLY NASZE WLASNE 429 (2026-08-18, wyjasnione)

Przeskanowalem pojedynczo cala trojke, ktora przemiat wskazal, i porownalem wiersze:

| domena | co sie zmienilo | dlaczego |
|---|---|---|
| split.io | `programmatic_provisioning` +2 -> niezmierzone | 3 strony dokumentacji odpowiedzialy `429` |
| postmarkapp.com | to samo, +1 -> niezmierzone | 1 strona `429` |
| calendly.com | `machine_readable_api` 0 -> +1 | poprawa, nie regres |

**Zaden z nich nie jest regresem vendora.** Wiersze roznily sie o to, ile stron udalo nam sie
przeczytac, a nie o to, co vendor opublikowal. Skany split.io oddalone o **90 sekund** dawaly
`4 strony / 10 punktow` i `1 strona / 8 punktow`, przy niezmienionej dokumentacji.

**Naprawa (`backoffFor` w `src/lib/scan/http.ts`):** 429 jest wedlug naszej wlasnej opublikowanej
reguly *naszym* obciazeniem, wiec odpowiedzia ma byc odczekanie i ponowne pytanie, a nie dziura w
wierszu. Ograniczone z trzech stron: **dwa razy na witryne**, tylko dopoki budzet skanu uniesie
odczekanie **i** zapytanie po nim, i **najwyzej 3 sekundy** nawet gdy strona prosi o wiecej.
Poprawia odpowiedz tylko wtedy, gdy druga proba naprawde jest odpowiedzia (200 albo 404). Regula
jest czysta funkcja, wiec dziesieciu straznikow w `rules.mts` sprawdza ja bez sieci.

**Zweryfikowane na produkcji (v517, 07:18 UTC), na tych samych dwoch domenach, ktore ucierpialy:**

| domena | przed | po |
|---|---|---|
| split.io | 8/14, provisioning niezmierzone | **10/16, provisioning 2 pkt** |
| postmarkapp.com | 9/14, provisioning niezmierzone | **11/17**, najwiecej mierzalnego, jakie mial |

Cztery zastrzezenia codeksa, wszystkie przyjete: odczekanie siedzi **wewnatrz** tego, co trafia do
memo (inaczej rownolegla faza dostaje odmowe, ktora wlasnie zastepujemy), `fresh` tez ponawia,
404 z drugiej proby zostaje (to odpowiedz, nie odmowa), a `Retry-After` czytamy takze w formie daty,
bo `Number()` robil z niej NaN i po cichu domyslne 1,2 s.

## SPLIT.IO NIE ODMAWIA NAM Z PRZECIAZENIA, TYLKO NAS WYZWANIA (2026-08-18, do zmierzenia)

Przy diagnozie powyzej wyszlo cos wiekszego. Zalogowalem kazde 429 w skanie split.io: **wszystkie
niosa marker challenge** (`cf-mitigated` / `x-vercel-challenge-token`), a `docs.split.io` publikuje
przy tym wlasny limit (`x-ratelimit-limit: 100`). To znaczy, ze ich brzeg **wyzywa zwykle zadanie**,
a nie dusi nas z przeciazenia - czyli jest to fakt o nich, dokladnie taki, jakie ta karta mierzy.

**Skaner zna juz to rozroznienie i stosuje je w polowie miejsc.** Test drzwi pyta
`status !== 429 || isBotChallenge(a)`, a `isEdgeRefusal` odrzuca **kazde** 429 bez patrzenia w
naglowki. Efekt: vendor, ktorego Cloudflare odpowiada wyzwaniem, dostaje u nas **niezmierzone
checki** (co wyglada jak nasza slepota) zamiast zmierzonej odmowy (co jest ustaleniem o nim).

**Dlaczego NIE zmieniam tego dzis w nocy:** to przesunelo by werdykty na calym korpusie w strone
**oskarzen**, a regula domu mowi, ze punkt moze stac na slabym dowodzie, ale oskarzenie nie moze.
Zmierzenie tego wymaga przemiatu z zapisem naglowkow, ktorego nie da sie zrobic przed rankiem.
**Zadanie na tablicy, z ta notatka jako materialem.** Do rozstrzygniecia rowniez: czy wyzwanie
wywolane naszym tempem (Cloudflare potrafi odpowiadac na limit „managed challenge") liczy sie tak
samo jak wyzwanie stale - bo jesli nie, to rozroznienie wymaga drugiego zadania po odczekaniu.

## CZYM NAS ODMAWIAJA: ZMIERZONE NA 92 DOMENACH (2026-08-18, material do #48)

Wiersz zapisuje teraz **kazdy limit, jaki napotkal skan, i czy niosl marker wyzwania**
(`limitsMet` w findings, `limitsAtTheirEdge` w `corpus.ts`, wypisywane przez `after-reseed.mts`).
Zapisane, **nie punktowane**: zmiana werdyktu z tego wymaga liczby, a nie jednego przykladu.

Pomiar lokalny (`scripts/audit-limits.mts`, bez zapisu do korpusu, wiec karencja stoi):

| co | ile z 92 |
|---|---|
| limit w rejestrze npm (`api.npmjs.org`) | **48** - fakt o naszym ruchu, nie o vendorze |
| limit na **wlasnym brzegu vendora** | **5** |
| z tego **kazdy limit z markerem wyzwania** | **4** |

Cztery sciany: `contentful.com` (15/15 na contentful.com i www), `split.io` (13/13 na
docs.split.io), `logto.io` (6/6), `rollbar.com` (2/2 na docs.rollbar.com). Piaty,
`postmarkapp.com`, to zwykly limit bez markera i **2 z 7 wrocily po odczekaniu** - czyli to, co
odczekanie z tej nocy naprawia.

**Pierwsza korekta pomiaru:** poczatkowa wersja liczyla razem limity vendora i rejestru i pokazala
`bunny.net` jako najbardziej odmawiajacego w korpusie na dziesieciu limitach, z ktorych **kazdy byl
api.npmjs.org**. Stad `limitsAtTheirEdge` rozdziela, czyje to byly drzwi.

**Druga korekta, wazniejsza, bo dotyczy tego, co byloby wdrozone:** pierwsza mysl byla taka, zeby
429 z markerem liczylo sie jako odmowa brzegu w `isEdgeRefusal`. To bylby blad. Checki czytajace
strony przeszlyby wtedy z niemierzalnych na **oblane**, czyli wiersz powiedzialby „nie dokumentujesz
tworzenia kluczy" komus, kto to dokumentuje, tylko nam tego nie pokazal. Dokladnie to, czego zasada
domu zabrania. Decyzja o ksztalcie zmiany poszla do **audytu subagenta**; wynik i co potwierdzic z
Krystianem - w sekcji nizej.

## #48 ROZSTRZYGNIETE AUDYTEM SUBAGENTA: ZDANIE, NIE PUNKTY (2026-08-18)

**Decyzja pochodzi z audytu subagenta** (Agent tool, opus, brief z pelnym pomiarem). Do potwierdzenia
z Krystianem rano, lista na koncu tej sekcji.

**Pelny pomiar korpusu (177 domen, lokalnie, bez zapisu):**

| co | ile |
|---|---|
| limit w rejestrze npm | **89 ze 177** - fakt o naszym ruchu |
| limit na wlasnym brzegu vendora | **13** |
| z tego z markerem wyzwania | **11** |
| z tego wyzwanie na **kazdym** zadaniu | **10** |

Sciany: pandadoc.com (20/20), contentful.com (15/15), locationiq.com (15/15), split.io (13/13),
timekit.io (10/10), nylas.com (8/8), logto.io (6/6), name.com (5/5), lokalise.com (3/4),
rollbar.com (2/2), dynadot.com (1/1). Zwykly limit bez markera: postmarkapp.com i savvycal.com,
w obu **odczekanie odzyskalo po 2 zadania**.

**Audyt poprawil mnie w faktach.** Bal em sie, ze zmiana `isEdgeRefusal` przerobi „niezmierzone" w
oskarzenie „nie dokumentujesz kluczy". Nieprawda: `programmatic_provisioning` i `docs_without_js`
**w ogole go nie uzywaja**, stoja na surowym statusie (`refusedUs` w `score.ts`). `isEdgeRefusal`
czytaja tylko `user_agents_allowed` i `agent_entry_point`. Prawdziwe ryzyko tamtej zmiany jest inne:
`agent_entry_point` przerwalby fall-through i przestal odpytywac host dokumentacji o `llms.txt` i
`skill.md`, czyli **cicho ubylby dowod** na wierszach, ktorych nikt nie przeglada.

**Co wiec bylo falszem i co zrobione (opcja B+):** nie brak oskarzenia, tylko **wymowka doklejona do
niezmierzonego**. Wiersz mowil „a 429 is our own burst rather than an answer about agents" i
„Nothing for you to do if this was a burst. We rescan later", podczas gdy przy markerze skaner
**swiadomie nie ponawia** (`backoffFor` zwraca null przed sciana). Obietnica bez pokrycia w kodzie.
Teraz: te same punkty, prawdziwe zdanie, nazwany **host** (nie firma, bo trzy z czterech scian siedza
na subdomenie dokumentacji przy apeksie odpowiadajacym 200), i rada skierowana do vendora. Wszystko
liczone w `src/lib/limits.ts`, bo to samo pojecie stalo w trzech miejscach na karcie.

**Straznik zlapal blad, ktorego przeglad by nie zlapal:** checki podaja `f.site`, czyli
`https://split.io`, a nie nazwe hosta. Czytane jako host daje to dwuczlonowy string `https://split.io`,
ktory nie pasuje do niczego - galaz nazywajaca sciane byla **martwa dokladnie tam, gdzie zostala
napisana**. Stad `siteOf` przyjmuje obie formy i straznik sprawdza obie.

**Dlaczego NIE ruszamy punktacji** (trzy powody, kazdy wystarczy):
1. **Brak kontrolki.** Zmierzylismy, ze ich brzeg wyzywa **nasz** wzorzec ruchu (do 6 rownoleglych
   zadan na host, ~19 dokumentow, z ASN Heroku). Nie zmierzylismy, ze wyzwalby pojedyncze zadanie
   agenta z innej sieci. `docs.split.io` daje 200 z laptopa i 429 z dyna - to juz w STATE bylo.
2. **Podmiot zdania.** Wieksze sciany siedza na subdomenie dokumentacji przy zdrowym apeksie.
3. **N w obrebie wiersza.** rollbar.com to dwa zadania. „Wyzywa kazde zadanie" na dwoch to nie pomiar.

**Pulapka cyrkularna, warta zapamietania:** `backoffFor` nie ponawia przed markerem, wiec dla scian
`recovered` jest z definicji `false`. **Nigdy nie sfalsyfikujemy wlasnej tezy**, bo przestalismy
pytac. Zeby marker mial kiedykolwiek stac sie dowodem, potrzebny jest osobny **tryb audytowy**:
jedno zadanie na URL po >=180 s ciszy, z dwoch sieci (dyno i lacze rezydencjalne), trzema
user-agentami (nasz, Chrome, ChatGPT-User/Claude-User, bo verified-bot allowlist przepuszcza nazwane
agenty) i w dwoch terminach oddalonych o dobe. **Prog spisany PRZED pomiarem.**

**Wieksze znalezisko przy okazji, osobne zadanie:** **89 ze 177 skanow lapie limit w rejestrze npm.**
Ponad polowa wierszy ma dowod npm zebrany pod limitem, a na tym stoi `typed_package` i cala
atrybucja paczek. Liczbowo to powazniejszy problem z danymi niz cale #48 i dotyczy **wylacznie nas**.

**Do potwierdzenia z Krystianem rano:**
1. Zgoda na B+ (zdanie bez punktow). Czy to zdanie ma isc takze do maila o zmianie werdyktu i do
   platnego raportu, czy tylko na `/v/<domena>` i do API.
2. Podmiot zdania: host czy firma (rekomendacja audytu i moja: host).
3. Czy wolno zbudowac tryb audytowy ponawiajacy mimo markera. To dodatkowe zadania do brzegu, ktory
   juz nas odrzuca, wiec decyzja jest tez etyczna.
4. Czy celujemy pozniej w punktowanie i przy jakim progu. Jesli tak, to wylacznie dla
   `user_agents_allowed` i `agent_entry_point`, po pomiarze z dwoch sieci i recznym przeczytaniu
   wszystkich trafien.
5. Zmiana publicznej obietnicy na `/methodology`: bylo „A 429 is never a finding about you", jest
   „nigdy nie zabiera punktu, ale limit z markerem wyzwania raportujemy". **To juz wdrozone**, bo
   inaczej strona obiecywalaby cos, czego kod od dzis nie robi.

**Weryfikacja na produkcji zlapala jeszcze jedno.** Pierwszy skan pandadoc.com po wdrozeniu pokazal
nowe zdanie przy `docs_without_js` i `programmatic_provisioning`, a **trzy linijki nizej**, w tym
samym wierszu, `machine_readable_api` mowilo dalej „a 429 is our own burst rather than an answer
about you". Jedno pojecie liczone w trzecim miejscu po swojemu, czyli **dokladnie ta zasada z calego
dnia**, tylko w nowym miejscu. Trzeci check idzie teraz przez ten sam helper i pilnuja tego dwa
straznicy (z markerem i bez).

**Stan: wdrozone i zweryfikowane** (v520). Zdanie pojawi sie w wierszach dopiero z dowodem, czyli od
najblizszego przemiatu: starych wierszy nie ma za co poprawiac wstecz, bo nie niosa `limitsMet`.

## 49: TO REJESTR NPM ODMAWIA NAM NAJCZESCIEJ, NIE VENDORZY (2026-08-18)

Pomiar z tej samej nocy pokazal, ze **89 ze 177 skanow spotyka limit w `api.npmjs.org`**, czyli
liczbowo wiecej niz wszystkie sciany vendorow razem (#48). Policzone dokladnie, jednym skanem:

| co | ile zadan |
|---|---|
| zadan do npm na jeden skan | **20 do 25** |
| z tego endpoint pobran (`/downloads/point/last-week/`) | **16** |
| odmowionych na cloudinary.com | **10 z 16** |

To znaczy, ze **paczka vendora zalezy od endpointu, ktory odmawia nam najczesciej**, a odmowa konczy
sie zdaniem o CUDZYM wierszu: „we could not identify the package a developer installs to use you".
Zimne przejscie po korpusie kosztowalo kiedys 28 domen ich paczke, i to jest ta sama przyczyna.

**Dwie naprawy, obie o obciazeniu, zadna o atrybucji:**
1. **Pytamy zbiorczo.** `api.npmjs.org/downloads/point/last-week/a,b,c` odpowiada mapa dla nazw bez
   scope'u. Zmierzone: mapbox.com wysylal 16 zapytan, teraz siedem nazw jedzie w jednym. Nazwy ze
   scope'em musza isc pojedynczo, bo **jedna taka odrzuca cala partie** („scoped packages are not
   currently supported in bulk lookups"), wiec jeden `@vendor/sdk` w liscie kosztowalby wszystkie
   pozostale ich liczby. Adresy sa **sortowane**, bo URL jest kluczem cache'u na 48 godzin: ta sama
   domena pytajaca o te same nazwy w innej kolejnosci placilaby rejestrowi drugi raz.
2. **Rejestr dostaje wiecej prob niz cudzy brzeg** (6 zamiast 2 na skan). Uprzejmosc wobec npm nie
   kosztuje nikogo poza nami, a odmowa kosztuje vendora paczke.

**Czego NIE zrobilem, choc zaczalem:** ograniczenia liczby wycenianych kandydatow (dzis 16). Wyglada
na oczywista oszczednosc i nie jest: ta sciezka ma strażnika, ktory **odmawia odpowiedzi**, gdy
kandydat bez wyceny stoi w rankingu na rowni ze zwyciezca albo wyzej (lekcja z mapbox.com). Kandydat,
o ktorego nikt nie zapytal, jest tam **nie do odroznienia** od tego, ktoremu rejestr odmowil, wiec
zmiana wywracalaby ten straznik na kazdym skanie. **Ciecie tej listy jest zmiana atrybucji i wymaga
pomiaru na calym korpusie**, tak jak #47, a nie doklejenia do zmiany o obciazeniu. Zostaje w #49.

**Zmierzone przed wdrozeniem, jak przy #47:** `audit-attribution.mts` na calym korpusie po zmianie:
**137 wierszy, 115 bez zmiany, ZERO zmienionych paczek.** Zbiorcze pytanie nie rusza atrybucji, bo
zwraca dokladnie te same liczby, tylko w jednej odpowiedzi. **22 wiersze milczaly** (rejestr odmowil
dwa razy pod rzad) i to jest liczba o nas, nie o zmianie: poprzedni przebieg tej samej nocy mial ich
dziewiec, a miedzy nimi zrobilismy z tej maszyny ~350 skanow lokalnych. Milczenie nie jest zmiana
paczki - zaden wiersz nie wskazuje dzis czego innego niz wczoraj.

**Znalezisko z codex review, warte zapamietania poza tym projektem:** `constructor`, `toString` i
`valueOf` **sa prawdziwymi paczkami na npm**, wiec `name in parsed` na odpowiedzi rejestru znajduje
je na prototypie i zamienia „rejestr o tej nie odpowiedzial" w „nikt jej nie instaluje". Teraz
`Object.hasOwn`, ze straznikiem na dokladnie ta nazwe.

## SKRACANIE LISTY WYCENIANYCH: KORPUS POWIEDZIAL NIE (2026-08-18, zmierzone i wycofane)

Druga polowa #49: `MOST_DOWNLOAD_LOOKUPS` z 16 na 8, zeby zetnac o polowe zapytania do endpointu,
ktory odmawia nam najczesciej. Zmierzone `audit-attribution.mts` na calym korpusie **przed**
wdrozeniem: **137 wierszy, 130 bez zmiany, 3 zmieniaja paczke**, i to na gorsze:

```
agora.io:          agora-rtc-sdk-ng -> agora-token
commercetools.com: @commercetools/platform-sdk -> @commercetools/sdk-client
ckeditor.com:      @ckeditor/ckeditor5-ui -> ckeditor5
```

`agora-rtc-sdk-ng` to SDK, ktore instaluje developer, a `agora-token` to buildery tokenow.
`@commercetools/sdk-client` wyszedl **pietnascie miesiecy przed** `platform-sdk`. Trzeci ruch
(ckeditor) jest prawdopodobnie poprawa, ale dwa pierwsze wystarcza. **Liczby w dole listy nie sa
ozdoba: to one powstrzymuja dobrze nazwanego kuzyna przed wygraniem.** Zostaje 16.

**Zasada, ktora dzisiejsza noc potwierdzila trzeci raz** (po #47 i po bramce atrybucji): oszczednosc,
ktora dotyka reguly wyboru, jest **zmiana wyboru**, dopoki korpus nie powie inaczej. Koszt sprawdzenia
to dwadziescia minut skryptu, koszt pomylki to cudza nazwa pod naszym werdyktem.

**Co z tego zostalo wdrozone** (zmiany o obciazeniu, nie o wyborze): zbiorcze pytanie o pobrania i
szesc prob odczekania u rejestru, obie zmierzone na zero zmian w atrybucji.

## SCIANA NA BRZEGU JEST TERAZ WIDOCZNA TAM, GDZIE PATRZY KLIENT (2026-08-18)

Zdanie przy niezmierzonym checku bylo tylko polowa roboty: **fix plan swiadomie pomija checki
niezmierzone** (sa poza mianownikiem, wiec nie obiecuja punktow), wiec vendor ze sciana nie mial
nigdzie jednego zdania tlumaczacego chudosc calego wiersza. Doszly dwa miejsca:

- **`/v/<domena>`**: panel nad checkami, tylko gdy cos naprawde wyszlo niezmierzone. Liczony wobec
  domeny, ktora skan **naprawde czytal** (`resolvedElsewhere`), bo sendgrid.com lada na twilio.com.
- **`/api/scan`**: pole `challengedAt { hosts, challenged, refused }`, opisane w `openapi.json`, bo
  wywolanie z CI nie ma strony do ogladania.

**Poprawka z codex review, warta zapamietania:** mianownik zdania musi dotyczyc **tych hostow, ktore
w nim nazywamy**. `hosts` zawieral tylko hosty z wyzwaniem, a `onSite` liczyl wszystkie odmowy na
domenie, wiec zdanie kazalo `app.vendor.com` odpowiadac za limit, ktory przyslal `docs.vendor.com`.
Stad `refusedWhereChallenged` i dwa straznicy.

## 33. PRZEBIEG ADWERSARYJNY: `oauth_dcr`, NAJWIEKSZA POWIERZCHNIA OSKARZEN (2026-08-18)

91 wierszy oblewa ten check, wiecej niz jakikolwiek inny, a jego zdanie **wymienia hosty, ktore
pytalismy**. To czyni je jedynym oblanym werdyktem, ktory vendor moze powtorzyc, i jedynym, ktory da
sie **sfalsyfikowac stad**: jesli host, ktory nazywamy, serwuje dzis metadane, wiersz jest zly.

**Metoda, po dwoch poprawkach (druga z codex review):** pytamy **kazdy** origin, ktory wiersz
wymienia, o **trzy** dokumenty, ktorych szuka skaner (`oauth-authorization-server`,
`openid-configuration`, `oauth-protected-resource`), i **podazamy za wskazaniem**: dokument
protected-resource nie jest metadanymi, tylko nazywa serwer, ktory je ma. Pierwsza wersja pytala
dwie sciezki na szesciu „najbardziej prawdopodobnych" hostach, czyli **wezej niz szuka skaner**, a
audyt wezszy niz sprawdzana rzecz potwierdza wlasna teze zamiast ja falsyfikowac.

**Wynik na calym korpusie: zdanie trzyma sie wszedzie.** 91 oblanych wierszy dzieli sie na dwie
galezie i obie sa sprawdzone, kazda w swoja strone:

| galaz | wierszy | jak sprawdzone | wynik |
|---|---|---|---|
| „No OAuth metadata on any of the N hosts probed" | **74** | **2987 zapytan** do kazdego wymienionego origins, trzy dokumenty, ze sciganiem wskazan | **zero trafien** |
| „OAuth metadata published at X, but no registration_endpoint" | **17** | jedno zapytanie pod dokladnie ten adres | **17 z 17 potwierdzonych** |

Nigdzie, gdzie mowimy „pytalismy i nic tam nie ma", dzis nic nie ma. I wszedzie, gdzie mowimy „jest
tam dokument", ten dokument jest.

**Blad, ktory sam popelnilem przy pierwszym przebiegu, wart zapisania:** filtr bral wiersze po
`points === 0`, a **obie galezie maja zero i znacza rzeczy przeciwne**. Osiem poprawnych wierszy
wygladalo przez to jak osiem falszywych oskarzen, zdazylem je przeskanowac przez produkcje, zanim
zauwazylem, ze wiersz od poczatku mowil „metadata published". Skrypt rozroznia teraz galezie po
tresci zdania, a nie po punktach.

**Druga slepa plamka, tez wart zapisania:** pierwsza wersja sprawdzala galaz „metadane sa" siatka
zgadywanych origins i zglosila dziewiec **nie potwierdzonych**. Wszystkie dziewiec bylo poprawnych:
siedzialy na `auth2.`, `clerk.`, `sso.`, `account.`, `signin.`, pod prefiksem `/oidc/` i na zupelnie
innym apeksie (`cockroachlabs.cloud`). **Siatka zgadywanych adresow nie jest sprawdzeniem adresu,
ktory sami podalismy** - skrypt pyta teraz dokladnie o niego.

Narzedzie zostaje: `MONGODB_URI=... npx tsx scripts/audit-oauth.mts [ile]`, do powtorzenia po
kazdym przemiecie albo przy sporze.

## 34. PRZEBIEG ADWERSARYJNY: `mcp_present`, I JEDNA NIESCISLOSC W ZDANIU (2026-08-18)

Ten sam ksztalt, co przy `oauth_dcr`: wziac adresy z **opublikowanego zdania** i zapytac je jeszcze
raz. `scripts/audit-mcp.mts` wysyla pod kazdy z nich `initialize` po JSON-RPC.

**Wynik: 80 oblanych wierszy, 560 adresow, zero serwerow MCP.** Werdykt sie broni.

**Ale 32 adresy JEDNAK odpowiadaja** - i to jest znalezisko, ktore zmienia zdanie, nie werdykt.
Kazda z tych odpowiedzi to zwykla bramka API: „Missing API Key" (uploadthing), „Invalid CSRF Token"
(imagekit), „Method not allowed" (temporal, groq, planetscale, swell), „Missing required header
Twilio-Api-Version", „Only HTML requests are supported here" (hatchet), 401 bez naglowka wyzwania
(turbopuffer, rollbar). Zaden nie mowi MCP.

**Wiec zdanie bylo nieprecyzyjne w nasza strone.** Mowilismy „nothing answered at api.split.io/mcp",
a api.split.io/mcp odpowiada 405 z JSON-em. Vendor czytajacy to zdanie i widzacy wlasna odpowiedz ma
racje, ze cos odpowiedzialo, i myli sie co do tego, co to znaczy - a to my postawilismy go w tej
sytuacji. **Teraz: „nothing spoke MCP at ..."**, ze straznikiem na obie polowki i z audytem, ktory
czyta obie wersje zdania (stare wiersze do najblizszego przemiatu maja stare brzmienie).

**To samo zdanie zylo jeszcze w trzecim miejscu** (`fixfirst.ts`, plan naprawy: „nothing answered at
the addresses named above"), znalezione przez codex review. Trzeci raz tej nocy jedno pojecie stalo w
kilku miejscach po swojemu - po `429` w trzech checkach i po mianowniku zdania o wyzwaniu.

**Wersji formuly NIE podbijam**, choc codex to zasugerowal: werdykty nie ruszaja sie ani o punkt,
zmienia sie brzmienie, a podbicie na 9.41 **wygasiloby sprostowanie directusa**, ktorego naprawa nie
jest napisana. To ta sama pulapka, ktora opisalem wyzej przy zapisie limitow.

**Warte zapamietania przy pisaniu takiego audytu:** pierwsza wersja skryptu raportowala „wszystko,
co nie jest cisza ani 404" i utonela w 403/405 z HTML-em od statycznych stron. Sygnalem, ze **jest
tam serwer**, sa trzy rzeczy, ktorych szuka sam check: naglowek wyzwania, cialo JSON-RPC albo typ
`application/json` bez HTML-a. Audyt szerszy niz sprawdzana rzecz topi jeden prawdziwy wiersz pod
trzydziestoma nieprawdziwymi - dokladnie odwrotny blad niz ten z `oauth_dcr`, gdzie audyt byl za
waski i potwierdzal wlasna teze.

## 35. PRZEBIEG ADWERSARYJNY: `agent_entry_point`, NAJWIEKSZA POWIERZCHNIA W KORPUSIE (2026-08-18)

129 oblanych wierszy, wiecej niz `oauth_dcr` i `mcp_present`. Zdanie brzmi „None of the 21 agent
entry paths we asked on your site and your documentation host returns a file rather than your page
shell", wiec vendor, ktory **ma** taki plik, czyta to jako „nie szukali".

`scripts/audit-entry.mts` pyta o kazda sciezke z `AGENT_ENTRY_PATHS` i `UPPERCASE_ENTRY_PATHS`, na
**obu** hostach z tego zdania, **tym samym naglowkiem Accept, co skaner** (`entryAccept`), z
**kontrolka osobno dla kazdej przestrzeni nazw** (`.md`, `.json`, `.txt`). Predykaty
(`answersWithTheSameTemplate`, `looksLikeADocsPageTwin`) sa **zaimportowane ze skanera**, nie
napisane drugi raz: druga opinia o tym, co jest plikiem, znalazlaby co innego niz check i zadna z
liczb nie znaczylaby juz nic.

**Trzy poprawki z codex review, wszystkie o tym samym:** audyt musi pytac tak, jak pyta sprawdzana
rzecz. `*/*` zamiast naglowka skanera moglo **przegapic prawdziwy plik** (sentry.io oddaje web UI na
`*/*` i deskryptor na `application/json`) - a wtedy „zero znalezionych" nie znaczy nic. Jedna
kontrolka markdownowa nie rozpoznaje soft-404 w przestrzeni `.json`. Host dokumentacji pytamy tylko
wtedy, gdy nalezy do vendora, bo `agents.md` na cudzej platformie jest cudzym plikiem.

**Wynik: 122 oblane wiersze, 2304 sciezki, zero plikow.** Zdanie trzyma sie wszedzie.

**Pierwszy przebieg pytal tylko hosta serwisu** (1464 sciezki, tez czysto) - ale to jest **polowa
zdania**, bo zdanie mowi takze o hoscie dokumentacji. Ta sama pomylka, co przy `oauth_dcr`, gdzie
audyt byl wezszy niz sprawdzana rzecz; poprawiona zanim wynik trafil do STATE.

## TRZY NAJWIEKSZE POWIERZCHNIE OSKARZEN SPRAWDZONE (2026-08-18, podsumowanie)

| check | oblanych wierszy | zapytan | falszywych zdan |
|---|---|---|---|
| `agent_entry_point` | 122 | 2304 sciezki | **0** |
| `oauth_dcr` | 74 (+17 drugiej galezi) | 2987 | **0** |
| `mcp_present` | 80 | 560 adresow | **0** (ale zdanie doprecyzowane) |

**Razem 5851 zapytan pod adresy, ktore sami opublikowalismy, i ani jedno zdanie nie okazalo sie
falszywe.** Jedyna zmiana w tresci to `mcp_present`: „nothing answered at" bylo nieprecyzyjne w
nasza strone, bo 32 z 560 adresow odpowiadaja zwykla bramka API.

**Trzy skrypty zostaja** (`audit-entry.mts`, `audit-oauth.mts`, `audit-mcp.mts`) i wszystkie maja ten
sam ksztalt: wez adresy **z opublikowanego zdania**, zapytaj je jeszcze raz, uzyj **predykatow ze
skanera** zamiast pisac drugie zdanie o tym, co sie liczy. Do powtorzenia po kazdym przemiecie i
przy kazdym sporze z vendorem.

## PRZEMIAT ZAMOWIONY, CZEKA NA KARENCJE (2026-08-18, 12:00)

Wszystko, co ta noc naprawila, dociera do **opublikowanego** korpusu dopiero przez przemiat: zapis
limitow (`limitsMet`), odczekanie po 429, zbiorcze pytania do rejestru, zdanie o wyzwaniu na brzegu,
„nothing spoke MCP". Wiersze maja teraz 5,8 h, a karencja to 6 h liczone od **mediany**, wiec petla
czeka i probuje co 20 minut.

```
log: /tmp/reseed-940b.log
```

**W trakcie przemiatu NIE WDRAZAC** (dyno restartuje sie w polowie zbioru) i **nie uruchamiac
audytow** (`audit-oauth`, `audit-mcp`, `audit-entry`, `audit-attribution`) - wszystkie pytaja te same
hosty, co skaner, i limit trafiony tam dociera tu jako brak dowodu.

**Po przemiecie, w tej kolejnosci:**
```
cd ~/projects/stackpick && export MONGODB_URI=$(heroku config:get MONGODB_URI -a stackpick)
npx tsx scripts/after-reseed.mts && npm run audit && npx tsx scripts/audit-study.mts && npm run audit-delivery && npm run regressions && npm run watch-coverage
npm run indexnow -- --all
```
`after-reseed.mts` wypisze teraz **pierwsza prawdziwa liczbe scian na brzegu** („limit na brzegu
vendora: X z Y wierszy z zapisem, w tym Z z markerem wyzwania"), bo do dzis zaden wiersz nie niosl
tego pola. Spodziewac sie okolo **13 wierszy z limitem i 11 z markerem** - tyle dal pomiar lokalny
na 177 domenach. Duza roznica w dol znaczy, ze odczekanie po 429 dziala lepiej, niz zakladalem;
duza w gore, ze przemiat bije mocniej niz pojedyncze skany.

## CO JESZCZE NIE BYLO SPRAWDZONE ADWERSARYJNIE (2026-08-18, mapa powierzchni)

Pelny rachunek werdyktow na 192 wierszach (177 korpusu plus goscie), zeby bylo widac, gdzie stoi
najwiecej oskarzen i ktore z nich ktos juz probowal obalic:

| check | oblanych | zaliczonych | niezmierzonych | nd | przebieg |
|---|---|---|---|---|---|
| `agent_entry_point` | **129** | 48 | 15 | 0 | **35 (dzis)** |
| `oauth_dcr` | **102** | 80 | 2 | 8 | **33 (dzis)** |
| `signup_reachable` | **96** | 48 | 38 | 10 | **brak** |
| `price_in_snippet` | 92 | 70 | 11 | 8 | 30-31 |
| `mcp_present` | **90** | 98 | 4 | 0 | **34 (dzis)** |
| `programmatic_provisioning` | 66 | 66 | **60** | 0 | 30 |
| `machine_readable_api` | 50 | 132 | 10 | 0 | **brak** |
| `llms_txt` | 37 | 154 | 1 | 0 | **brak** |
| `signup_no_captcha` | 32 | 25 | **125** | 10 | **brak** |
| `self_serve` | 21 | 136 | 27 | 8 | **brak** |
| `typed_package` | 6 | 159 | 27 | 0 | 32 |
| reszta (6 checkow) | 15 razem | - | - | - | - |

**Nastepny w kolejce: `signup_reachable`, 96 oskarzen i ani jednego przebiegu.** Jego zdanie nazywa
adres rejestracji i mowi, czego przy nim brakuje („is reachable, but its form needs JavaScript"),
wiec jest falsyfikowalne dokladnie tak samo: wziac adres z wiersza, pobrac go i sprawdzic, czy
formularz jest w serwowanym HTML. **Wymaga sieci, wiec nie w trakcie przemiatu.**

**Osobna obserwacja, nie o oskarzeniach tylko o zasiegu:** `signup_no_captcha` jest niezmierzony na
**125 wierszach** ze 192, a `programmatic_provisioning` na 60. To nie sa falszywe zdania, tylko
polowa karty, ktorej nie umiemy zmierzyc - i to jest inna robota niz przebieg adwersaryjny: nie
„czy nie oskarzamy niesprawiedliwie", ale „czy w ogole mamy co powiedziec".

## POLOWA KARTY, KTOREJ NIE MIERZYMY: GDZIE NAPRAWDE JEST CISZA (2026-08-18)

`signup_no_captcha` jest niezmierzony na **125 wierszach ze 192** i wygladalo to na najwieksza dziure
w pokryciu. Policzone parami z `signup_reachable` (zapytanie do naszej bazy, bez ruszania cudzych
hostow, wiec dalo sie zrobic w trakcie przemiatu):

| stan | wierszy | co to znaczy |
|---|---|---|
| captcha niezmierzona + reachable **oblane** | **87** | vendor **dostaje** werdykt: „formularz wymaga JavaScriptu". Pytanie o captche jest bezprzedmiotowe, bo agent i tak nie dochodzi do formularza |
| captcha niezmierzona + reachable niezmierzone | **38** | **cisza**: caly etap rejestracji nie mowi nic |
| captcha zaliczona + reachable zaliczone | 25 | |
| captcha oblana + reachable zaliczone | 23 | |
| nd + nd | 10 | produkt bez kont |
| captcha oblana + reachable oblane | 9 | |

**Wniosek: 125 to nie jest dziura, tylko konsekwencja.** Reguła captchy juz dzis lapie sygnature w
serwowanym HTML **nawet gdy formularz sklada JavaScript**, wiec tam, gdzie nie widzimy captchy, agent
tez by jej nie zobaczyl - bo nie dochodzi do formularza. Nie ma czego naprawiac i **nie warto tego
poszerzac**: captcha ukryta w bundlu JS jest za sciana, ktora karta juz opisuje.

**Prawdziwa cisza to 38 wierszy, a jej glowna przyczyna to my:** na **20 z nich** nie znalezlismy
linku do rejestracji, choc vendor publikuje cennik (oramasearch, qdrant, weaviate, supertokens,
stytch, filestack, uploadthing, commercetools, timekit, railway, name.com, signoz, magicbell,
scrapingbee, livekit, replicate, together.ai, restate, plus my sami - u nas slusznie, bo nie mamy
kont). Reszta to 403 na stronie rejestracji (neon, algolia, workos, liveblocks, froala, cloudflare,
vonage) - te sa uczciwie niezmierzone, bo brzeg nas nie wpuscil.

**Narzedzie gotowe, nieuruchomione:** `scripts/audit-signup-discovery.mts` czyta te same strony, co
skan (glowna i cennik), i wypisuje **kazdy link wygladajacy na wejscie, ktorego nasza regula nie
lapie**. Ma pokazac, jakiego ksztaltu linku nie widzimy, a nie poszerzyc regule automatycznie:
poszerzenie dotyka wyboru i wymaga wlasnego pomiaru, jak przy #47.

## PRZEMIAT 12:20-13:15: PIERWSZE PRAWDZIWE LICZBY SCIAN NA BRZEGU (2026-08-18)

177 wierszy na 9.40, **0 sprzecznosci**, **0 rozjazdow** w publikowanych liczbach, kazde zdanie
szostego badania nadal prawdziwe, kadencja monitoringu zdrowa, 241 adresow zgloszonych do IndexNow.

**Przewidywanie sprzed przemiatu i pomiar** (przewidywanie bylo zapisane w STATE zanim padly liczby):

| co | przewidywane | zmierzone |
|---|---|---|
| wierszy z limitem na brzegu vendora | okolo 13 | **16 ze 177** |
| z tego z markerem wyzwania | okolo 11 | **12** |

Sciany: `contentful.com` (20/20), `split.io` (13/13 na docs.split.io), `timekit.io` (11/11 na
developers.timekit.io), `logto.io` (10/10), `nylas.com` (8/8 na dashboard-v3.nylas.com),
`rollbar.com` (2/2 na docs.rollbar.com), `mailgun.com` i `sinch.com` po jednym. **Panel „Your edge
challenged us" jest zywy na `/v/split.io`**, a `challengedAt` wraca z `/api/scan`.

**Siedem werdyktow gorszych, piec wrocilo po pojedynczym skanie.** To jest ta sama historia, co rano,
i teraz wiersz sam ja opowiada: `split.io` mial `docs_without_js`, `machine_readable_api` i
`programmatic_provisioning` na zero, bo `docs.split.io` wyzwal **trzynascie z trzynastu** naszych
zadan; po przeskanowaniu pojedynczo wszystkie trzy wrocily (1, 1, 2). Tak samo `calendly.com`
(`agent_entry_point`) i `vercel.com` (`llms_txt`). **Bitmovin** jest teraz mierzalny tylko w 7
punktach z 18, bo ich brzeg wyzywa nas na okraglo - i wiersz to mowi zamiast udawac pomiar.

**Jedyny werdykt, ktory NIE wrocil:** `vercel.com`, `programmatic_provisioning` 1 -> 0, ze zdaniem
„none of the 7 provisioning phrases appears in the 4 documentation pages we read". To jest zmierzona
nieobecnosc na czterech przeczytanych stronach, nie dziura w odczycie - do sprawdzenia recznie, czy
zmienil sie dobor stron, czy ich dokumentacja.

**Stabilnosc reguly:** `price_in_snippet` dal **dokladnie te same liczby** co poprzedni przemiat
(67/91/11/8), a bramka `typed_package` znowu 4 oskarzenia z 4 na paczce dopasowanej po wydawcy.
`oauth_dcr`: 74 z 91 oblanych wymienia adresy - i te 74 zdania sa dzis sprawdzone jedno po drugim.

## 36. PRZEBIEG ADWERSARYJNY: `signup_reachable`, I SKAD SIE BIERZE CISZA (2026-08-18)

**Wynik: 92 wiersze z adresem w zdaniu, zero zdan do poprawy.** Na zadnej z tych stron formularz nie
jest w serwowanym HTML, czyli twierdzenie, ktoremu vendor uwierzy najmniej („moja rejestracja
dziala"), broni sie w calosci. Trzy strony odpowiedzialy dzis inaczej niz wtedy (`contentful.com`,
`nylas.com`, `pandadoc.com`) i wszystkie trzy to znane sciany z markerem wyzwania - wiersz juz o tym
mowi, wiec to zgodnosc, nie sprzecznosc.

**To domyka cztery najwieksze powierzchnie oskarzen w korpusie:**

| check | oblanych | zapytan | falszywych zdan |
|---|---|---|---|
| `agent_entry_point` | 122 | 2304 | 0 |
| `oauth_dcr` | 74 (+17) | 2987 | 0 |
| `signup_reachable` | 92 | 92 | 0 |
| `mcp_present` | 80 | 560 | 0 (zdanie doprecyzowane) |

**Razem 5943 zapytania pod adresy, ktore sami opublikowalismy.**

## SKAD SIE BIERZE CISZA W ETAPIE REJESTRACJI (2026-08-18, zmierzone)

`scripts/audit-signup-discovery.mts` przeczytal glowna i cennik u osiemnastu vendorow, u ktorych
mowimy „nie znalezlismy linku do rejestracji":

- **11 nie ma w serwowanym HTML zadnego kandydata.** Nawigacja jest skladana JavaScriptem, wiec nie
  ma czego poszerzac w regule: linku nie widzi ani nasz skan, ani agent.
- **7 ma link, ktorego regula nie lapie** - i po przeczytaniu ich po kolei **wiekszosc nie powinna
  byc lapana**: `replicate.com` „Join us" prowadzi do **kariery**, `commercetools.com` „Start free
  trial" do **kotwicy na tej samej stronie**, `railway.com` do **samej siebie**, `uploadthing.com`
  „Get Started for Free" do **logowania**, a nie rejestracji. Realnie zostaja dwa ksztalty warte
  rozwazenia: `admin.timekit.io/create` („Create account") i `console.weaviate.io` („Get started").

**Decyzja: reguly NIE poszerzam.** Dwa trafienia na osiemnascie domen, przy sygnale („Get started"),
ktory na tym samym zestawie prowadzi do kariery, kotwicy i logowania, to dokladnie ta wymiana, ktora
`no card` przegral w sekcji o luce, ktorej swiadomie nie zamykamy: **regula, ktora nie kredytuje
niczego pewnego, a moze skredytowac cos zlego, jest gorsza niz luka**.

**Co za to zrobione:** zdanie nazywa teraz **strony, ktore przeczytalismy** (glowna i cennik) zamiast
mowic „on the pages we read". Vendor widzi, gdzie patrzylismy, i moze odpowiedziec „link jest na
/product" zamiast zgadywac. To ta sama zasada, co przy `oauth_dcr` i `agent_entry_point`: **zdanie ma
byc powtarzalne przez tego, o kim mowi**.

## 37. PRZEBIEG ADWERSARYJNY: `machine_readable_api` (2026-08-18)

**50 oblanych wierszy, 513 zapytan, zero trafien.** Sprawdzone wszystkie czesci zdania:
`OPENAPI_PATHS` na hoscie serwisu **i** na hoscie dokumentacji, deklaracje na stronie dokumentacji
(czytane `declaredSpecs` ze skanera i **pobierane**, bo deklaracja to wskazanie, nie dokument),
negocjacja markdownu **po naglowku** (liczy sie typ odpowiedzi, nie ksztalt ciala) oraz **wariant
`<docs>.md`**. Nigdzie nie ma dzis specu, deklaracji ani markdownu tam, gdzie mowimy, ze ich nie ma.

**Cztery poprawki z codex review, jedna podwazala wynik:** pierwsza wersja nie pytala o `<docs>.md`,
a check liczy oba mechanizmy razem - vendor, ktory zaczal serwowac ten wariant, kwalifikuje sie do
punktu bez negocjacji naglowkiem, wiec „zero trafien" bez tej sondy nie znaczylo tego, co mowilo.
Pozostale trzy szly w strone falszywych trafien (deklaracja bez pobrania celu, `text/plain` jako
markdown) albo dotyczyly liczenia limitu przed filtrem, wiec nie moglyby niczego ukryc - ale i tak
sa naprawione, bo nastepny przebieg ma znaczyc to samo.

## VERCEL: JEDYNY WERDYKT, KTORY NIE WROCIL, JEST UCZCIWY (2026-08-18, sprawdzone recznie)

`programmatic_provisioning` 1 -> 0 po przemiecie, zdanie: „None of the 7 provisioning phrases
appears in the 4 documentation pages and 1 machine-readable file we read". Sprawdzone po kolei:

1. **Obciecie odczytu nie jest przyczyna**, choc wygladalo na nia: strona `/docs/sign-in-with-vercel/tokens`
   ma **928 kB** przy naszym limicie 400 kB, a `access token` malymi literami siedzi na pozycji
   917 kB. Ale `Access Token` jest na 179 kB, czyli **w zasiegu**, wiec obciecie niczego nie ukryło.
2. **Prawdziwy predykat (`provisioningMatches`) nie znajduje fraz ani w calym dokumencie, ani w
   obcietym prefiksie.** Sama fraza „access token" nie wystarcza od 9.32: musi niesc dowod w
   cytowanym oknie, a tam go nie ma.
3. **Ich strona REST API tez nie ma fraz** (958 kB, zero trafien), a dwa inne adresy dokumentacji
   oddaja **15 znakow** bez JavaScriptu.

**Wniosek: to zmierzona nieobecnosc, nie dziura w odczycie.** Wiersz nazywa strony, wiec vendor moze
wskazac te, ktora pominelismy. Zmiana wzgledem poprzedniego pomiaru bierze sie z **innej probki
stron** po 9.35 (probka rozproszona po rodzinach wskazowek), a nie ze zmiany u nich.

## PIEC POWIERZCHNI SPRAWDZONYCH, RAZEM 6456 ZAPYTAN (2026-08-18)

| check | oblanych | zapytan | falszywych zdan |
|---|---|---|---|
| `agent_entry_point` | 122 | 2304 | 0 |
| `oauth_dcr` | 74 (+17) | 2987 | 0 |
| `signup_reachable` | 92 | 92 | 0 |
| `mcp_present` | 80 | 560 | 0 (zdanie doprecyzowane) |
| `machine_readable_api` | 50 | 513 | 0 |

Zostaly bez przebiegu: `llms_txt` (37 oblanych), `self_serve` (21) i szesc drobnych. `price_in_snippet`
(92) i `programmatic_provisioning` (66) maja przebiegi 30-31, ale **sprzed** zmian 9.36-9.40.

## 38. PRZEBIEG: `llms_txt`, I JEDYNE ZDANIE NA KARCIE, KTOREGO NIE DALO SIE POWTORZYC (2026-08-18)

Przy szostej powierzchni wyszlo cos wiekszego niz przebieg. `llms_txt` oblewa 37 wierszy zdaniem
**„No llms.txt at any of the 4 locations probed"** - i **nie nazywa zadnej z nich**. Cztery to nie
adres. Dwa z tych adresow siedza na hoscie dokumentacji, jeden pod jej sciezka, wiec vendor nie
zgadnie, gdzie patrzylismy, i nie moze powtorzyc naszego pomiaru. To byla ostatnia taka sentencja na
karcie: `oauth_dcr`, `agent_entry_point`, `mcp_present` i `signup_reachable` naprawilismy wczesniej.

**Teraz** (zweryfikowane na produkcji): `No llms.txt at any of the 4 locations probed:
https://www.koyeb.com/llms.txt, https://www.koyeb.com/llms-full.txt, https://docs.koyeb.com/llms.txt,
https://www.koyeb.com/docs/llms.txt`.

**Poprawka z codex review:** przy dokumentacji na `docs.<domena>` **trzy etykiety wskazuja ten sam
adres**, wiec lista liczylaby jedno zapytanie trzy razy - zdanie obiecywaloby dokladnosc, ktorej nie
ma. Odsiew duplikatow stoi w dwoch miejscach, bo straznik pokazal, ze zdanie ufa liscie, ktora
dostaje, a nie tylko temu, co skaner zbierze.

**Druga galaz tego checka tez sprawdzona:** 28 wierszy niesie zdanie „ten link z waszego llms.txt
jest martwy" z adresem. **Wszystkie 28 nadal odpowiada 404.** To sa zdania przy werdyktach
ZALICZONYCH, wiec nikt na nie nie patrzyl, a sa najtansza rzecza, o ktora mozna sie pomylic pod cudza
nazwa. `scripts/audit-llms-links.mts` sprawdza je jednym zapytaniem na wiersz.

## SZESC POWIERZCHNI, 6484 ZAPYTANIA, ZERO FALSZYWYCH ZDAN (2026-08-18, stan koncowy nocy)

| check | oblanych | zapytan | wynik |
|---|---|---|---|
| `agent_entry_point` | 122 | 2304 | czysto |
| `oauth_dcr` | 74 (+17) | 2987 | czysto |
| `signup_reachable` | 92 | 92 | czysto |
| `mcp_present` | 80 | 560 | czysto, zdanie doprecyzowane |
| `machine_readable_api` | 50 | 513 | czysto |
| `llms_txt` (martwe linki) | 28 | 28 | czysto, adresy dopisane do zdania |

**Zmienilo sie nie to, czy oskarzamy slusznie, tylko czy da sie nas sprawdzic.** Cztery zdania na
karcie mowily prawde, ktorej vendor nie mogl powtorzyc - dzis kazde nazywa adres, host albo strone.

## 39. PRZEBIEG: `price_in_snippet` NA ZYWYCH OPISACH (2026-08-18)

Najwieksza powierzchnia, ktorej przebieg byl **sprzed** zmian 9.36-9.40: 92 oskarzenia, kazde
cytujace dokladny string, ktory przeczytalismy. To jednoczesnie najlatwiejszy werdykt do sprawdzenia
i najlatwiejszy do pomylki, bo ten string to jeden meta tag, ktory marketing zmienia co tydzien.

**Metoda inna niz w poprzednich przebiegach, bo powtorzenie wlasnego predykatu tylko zgodziloby sie
samo ze soba.** `scripts/audit-snippet-live.mts` czyta **zywy** tag scannerowym `readSnippet`, a
potem zadaje **luzniejsze** pytanie: czy niedbaly czytelnik widzi tam kwote (`[$€£]\s?\d`, `per
month`, `usd`) albo warunek wejscia (`free`, `trial`, `no credit card`, `starts at`), ktorego regula
nie skredytowala. W takich opisach chowaloby sie falszywe oskarzenie.

**Wynik: 91 opisow przeczytanych na zywo (zaden cennik nie odmowil), zero do przejrzenia.** Do tego dwie liczby, ktorych
nie oczekiwalem i ktore mowia cos o stabilnosci pomiaru: **zaden** wiersz nie przeszedlby dzis (czyli
zaden vendor nie poprawil opisu od naszego skanu) i **zaden** nie cytuje stringu, ktorego juz tam nie
ma. Cytaty w korpusie sa aktualne co do znaku.

**Poprawka z codex review, warta zapamietania przy kazdym takim skrypcie:** licznik rosl **przed**
sprawdzeniem, czy strona w ogole odpowiedziala, wiec „nic do czytania" moglo byc zdaniem o
nieudanych zadaniach zamiast o opisach. Po poprawce liczba wyszla ta sama (zaden cennik nie odmowil),
czyli naglowek byl prawdziwy przez przypadek, a teraz jest prawdziwy z konstrukcji.

**Ograniczenie, zapisane swiadomie:** luzny czytelnik to moj wlasny regex, wiec falszywe oskarzenie
moze sie chowac w sformulowaniu, ktorego nie widzi ani regula, ani on. Dlatego to **uzupelnienie**
przebiegow 30-31, gdzie 80 opisow przeczytano recznie po kolei, a nie ich zastapienie.

## 40. PRZEBIEG: `self_serve`, OSTATNIA POWIERZCHNIA Z ROZMIAREM (2026-08-18)

19 cennikow przeczytanych na zywo, **kazde wystapienie kazdego wzorca** `SELF_SERVE_PATTERNS`
obejrzane z oknem slow wokol niego. **Zadne zdanie nie okazalo sie falszywe**, a te, ktore sa najbardziej szczegolowe,
trafiaja w punkt: `savvycal.com` („Do you offer a free trial?") i `xata.io` („Is there a free tier?")
to **pytania z FAQ**, dokladnie jak mowi wiersz; `here.com` ma „Get started for free" jako **link**;
`replicate.com` ma „Try for free" w **nawigacji**, ktora wisi na kazdej podstronie.

**Poprawka z codex review, ktora podwazala wniosek:** pierwsza wersja brala **pierwsze** trafienie
kazdego wzorca i ucinala liste na trzech oknach. Strona, ktorej nawigacja mowi „Try for free", a
tabela planow „Free tier, no card", pokazalaby tylko przycisk - czyli dokladnie to rozroznienie,
o ktore ten check pyta, znikaloby w pomiarze. Po wyliczeniu wszystkiego wniosek sie utrzymal:
`sinch.com` ma „Try for free" **trzy razy** (naglowek, menu mobilne, stopka), `replicate.com` dwa
razy w nawigacji, `june.so` raz jako przycisk w liscie funkcji. Same chrome, zadnej oferty.

**Jedna obserwacja o wzorcu, warta zapisania, choc nie o oskarzeniu:** na `name.com` wzorzec
`/\$0(?:\.00)?(?![.,\d])/` trafil w **pozycje cennika** „Advanced Security: $0.00". Opublikowany
wiersz tego nie skredytowal (mowi „no free tier or no-card wording"), wiec dzis jest zachowawczy, ale
ryzyko jest realne i **odwrotne niz reszta tej nocy**: to nie groziloby falszywym oskarzeniem, tylko
falszywym **zaliczeniem** - kredytem za darmowy poziom, ktorego nie ma. `$0` jest jednak takze
prawdziwym sposobem pisania darmowego planu („$0/month"), wiec zawezenie wymaga pomiaru na korpusie,
a nie doklejenia warunku. **Nie ruszam bez pomiaru.**

## OSIEM POWIERZCHNI, 6494 ZAPYTANIA, ZERO FALSZYWYCH ZDAN (2026-08-18, koniec przegladu)

`agent_entry_point` (122 wiersze), `oauth_dcr` (74+17), `signup_reachable` (92), `mcp_present` (80),
`machine_readable_api` (50), `llms_txt` (28 zdan o martwym linku), `price_in_snippet` (91 opisow),
`self_serve` (19 cennikow). **Kazde oblane zdanie w korpusie, ktore nazywa adres, zostalo dzis
zapytane ponownie.** Zmienily sie dwie rzeczy: `mcp_present` mowi teraz „nothing spoke MCP" zamiast
„nothing answered", a cztery checki, ktore podawaly liczbe zamiast adresu, podaja adres.

**Bez przebiegu zostaja tylko drobne** (`answers_plain_request` 4 oblane, `docs_without_js` 3,
`user_agents_allowed` 3, `robots_paths_resolve` 3, `no_crawl_delay` 2, `typed_package` 6) oraz
`programmatic_provisioning` (66), ktory ma przebieg 30 sprzed 9.36 i jest najbardziej zlozona regula
na karcie - to jest naturalny nastepny krok.

## 41. PRZEBIEG: `programmatic_provisioning`, NAJCIEZSZY CHECK NA KARCIE (2026-08-18)

66 oskarzen, dwa punkty kazde, przebieg 30 sprzed 9.36. **60 wierszy, 283 strony przeczytane na
zywo**, kazda dwoma czytelnikami: naszym `provisioningMatches` i **niedbalym** regexem szukajacym
jezyka tworzenia klucza (`creat|generat|issu|mint` + `api key|token|credential|secret`).

**42 miejsca do przeczytania recznie, przeczytane, zero falszywych oskarzen.** Wszystkie sa jednego z
trzech ksztaltow, ktore regula odrzuca **slusznie**:
- **instrukcja klikania w panelu**: loops.so „Go to Settings -> API and click Generate key",
  inngest.com „create an API key **from the Inngest Cloud dashboard**", together.ai to samo,
- **podpisywanie tokenow**, nie tworzenie kluczy: bunny.net „Generate tokens server-side",
  transloadit „API2 mints a token",
- **regeneracja istniejacego klucza**: bunny.net „Regenerating your API key", rollbar to samo.

Powod jest wypisany w samej regule: fraza „create an api key" liczy sie **„next to something
programmatic"**. Klikniecie w panelu jest dokladnie tym, czego ten check szuka jako brakujacego, wiec
kazde z tych 42 trafien potwierdza regule zamiast ja podwazac.

**Jeden wiersz byl nieaktualny, nie falszywy:** na `docs.medusajs.com/api/admin` nasza wlasna regula
znajduje juz fraze. Przeskanowany przez produkcje - **wciaz 0 punktow**, bo przemiat czyta inny
zestaw stron niz ten, ktory audyt wzial z wiersza. To jest znane zachowanie proby dokumentacji po
9.35 i nie jest bledem w zdaniu.

## DZIEWIEC POWIERZCHNI, 6777 ZAPYTAN, ZERO FALSZYWYCH ZDAN (2026-08-18)

Do osmiu z poprzedniego podsumowania dochodzi `programmatic_provisioning` (60 wierszy, 283 strony).
**Przeglad oskarzen w korpusie jest domkniety**: kazdy check, ktory oskarza wiecej niz szesc razy,
zostal zapytany ponownie pod adresami, ktore sam publikuje.

## KONKURENCJA: agentable.is I STANDARD AgentReady (2026-08-18)

**agentable.is** zadaje to samo pytanie co my („can AI agents use your site?"), ale mierzy co innego i
sam to pisze w stopce: *„Static spec-compliance scan · implements the open AgentReady standard · not
affiliated with Ora, the official scanner · **verifies artifacts exist, not live agent success**"*.
Skan darmowy i nielimitowany, recepty i prompt za e-mail. **MONITOR 29 USD/mc za domene** (tygodniowy
re-skan, alerty przy regresji, historia, odznaka), **AGENCY 99 USD/mc do 25 domen** z CSV. Maja
leaderboard i llms.txt, nie maja `/docs`. Nasz skan na nich: 7 z 8 mierzalnych.

**Wazniejsze od nich samych: pojawil sie standard.** `agentready.org` v1.0.0, **30 wymagan** w pieciu
sekcjach, MUST/SHOULD/MAY plus podzial na bazowe i warunkowe, Discord i GitHub, oraz „oficjalny
skaner" o nazwie Ora. Ich wlasne uzasadnienie: *skanery, odznaki i oceny gotowosci sa juz wszedzie i
zaden nie zgadza sie z drugim*. Skan zgodnosci ze specyfikacja zostal wlasnie wyceniony na **zero**
przez kogos, kto go implementuje.

**Mapowanie 7 wymagan MUST na nasza karte:**

| wymaganie | nasz check | kto idzie dalej |
|---|---|---|
| AR-DISC-01 robots.txt z polityka AI | `user_agents_allowed`, `no_crawl_delay`, `robots_paths_resolve` | **my** (sprawdzamy, czy sciezki z robots.txt naprawde odpowiadaja) |
| AR-CAPA-01 MCP | `mcp_present` | **my** (handshake JSON-RPC, nie istnienie pliku) |
| AR-CAPA-08 OpenAPI | `machine_readable_api` | **my** (5 sciezek + deklaracje + negocjacja markdownu) |
| AR-IDEN-02 OAuth 2.0 | `oauth_dcr` | **my** (metadane na kilkunastu hostach) |
| AR-IDEN-03 metadane serwera autoryzacji | `oauth_dcr` | remis |
| AR-IDEN-05 PKCE | **brak** | spec |
| AR-CAPA-04 karta A2A | **brak, dolozone dzis** | remis |

**Osiem z naszych szesnastu checkow nie ma w specyfikacji zadnego odpowiednika**: `signup_reachable`,
`signup_no_captcha`, `self_serve`, `programmatic_provisioning`, `typed_package`, `price_in_snippet`,
`docs_without_js`, `answers_plain_request`. To jest cala polowa karty pytajaca „czy agent **naprawde**
wejdzie i dostanie klucz", czyli dokladnie to, czego konkurent nie robi i o czym pisze w stopce.

**Zmierzone przed zmiana, nie zalozone:** `/.well-known/agent-card.json` serwuje **5 domen ze 177**,
a metadane OAuth z `code_challenge_methods_supported` (PKCE) - **12**. Karte A2A dolozylismy do
sciezek wejscia, bo cztery z tych piatki i tak przechodzily check innym plikiem, a **piata,
`tigrisdata.com`, czytala u nas „zadna z 12 sciezek nie zwraca pliku" przy serwowanej karcie**.
Po wdrozeniu: `Only service descriptors: .../.well-known/agent-card.json`, jeden punkt, tak samo jak
`mcp.json`.

**PKCE swiadomie NIE dokladamy jako check.** 12 domen ze 177 to za malo, zeby zmierzyc prog i falszywe
oskarzenia, a kazdy check kosztuje zadania i miejsce na karcie - ta sama decyzja, co przy kluczu
licencyjnym (2 wiersze). **Dowod juz zbieramy** przy okazji `oauth_dcr`, wiec decyzja wraca, gdy
liczba urosnie.

**Czego NIE robimy:** leaderboardow i odznak. Ta gra ma juz trzech graczy i cene zero.

**Do sprawdzenia nastepne:** czym jest **Ora** („oficjalny skaner" standardu) oraz cztery pytania
agenta SEO o **Sapient** (czy raportuja wybor head-to-head, powod odrzucenia w slowach agenta, os
czasu, rozbicie per rodzina modeli). Jesli Sapient ma dwa pierwsze, nasza teza sprzedazowa wymaga
przepisania.

## ORA I LIGHTSAGE: NASZA TEZA SPRZEDAZOWA WYMAGA PRZEPISANIA (2026-08-18)

Dwa researche z rekomendacji, oba zrobione, oba zmieniaja obraz.

**Ora (`ora.ai`, era labs) - „oficjalny skaner" standardu AgentReady.** Zweryfikowane na ich
publicznym API, same odczyty:
- **127 checkow** w czterech warstwach: usability 62, accessibility 44, discovery 15, payments 6.
- **Wynik 0-100 i ocena A-F** - czyli dokladnie to, czego nasza metodologia zabrania.
- **Agent journeys**: prawdziwy agent probuje wykonac zadanie na domenie, trajektoria leci po SSE,
  wraca werdykt, liczba krokow i „insight". Intencje: `pricing`, `signup`, `api-docs`, `integrate`,
  `support`. Uruchamialne agenty: Claude Code (Haiku 4.5, Sonnet 4.6), harness `ash` na Sonnecie
  i na GPT.
- **Darmowe i agentowe do szpiku**: `/pricing` zwraca JSON, jest serwer MCP, CLI (`npx @ora-ai/ax
  audit`, `--min-score` bramkuje CI), skille, katalog ARD, feedback pisany przez agenty.
- Nas jeszcze nie skanowali (`No cached score for this domain`).

**Lightsage (dawniej Sapient, `usesapient.com`).** Free: 1 prompt dziennie, 1 platforma. **Pro 250
USD/mc**, 19 platform. **Agent Experience Arena: 177 API ocenionych przez Claude Code i Codex**,
z ocenami Experience/Discovery/Usability, raportem per narzedzie i data aktualizacji z dzisiaj.

**Co to znaczy dla nas, bez owijania:** zdanie „nikt nie uruchamia prawdziwych agentow i nie mowi,
czym odrzucaja" **przestalo byc prawdziwe**. Ora uruchamia agenty na zadaniach, Lightsage ocenia
177 API dwoma tymi samymi rodzinami modeli, ktorych my uzywamy. Ryzyko z sekcji 4 rekomendacji
agenta SEO zmaterializowalo sie na dwoch frontach naraz.

**Co po tej weryfikacji nadal wyglada na nasze i tylko nasze:**
1. **Kazde zdanie da sie powtorzyc.** 6777 zapytan tej nocy pod adresy, ktore sami publikujemy, i
   zero falszywych zdan. Konkurenci publikuja oceny, nie zdania z adresem.
2. **Podloga szumu 0,59 procent** i regresje w czasie liczone medianami. Ocena punktowa bez podlogi
   szumu nie mowi, czy ruch o dwa punkty cokolwiek znaczy.
3. **Odmowa jednej liczby 0-100.** Oba produkty ja publikuja; my mamy zmierzone, ze ta sama strona
   dostaje 33 albo 67 zaleznie od presetu.

**Czego NIE udalo sie zweryfikowac tanio** (i czego wobec tego nie wolno nam twierdzic publicznie):
czy Ora albo Lightsage pokazuja **slowa odmowy** agenta, czy maja **os czasu i regresje**, i czy
Lightsage rozbija wynik per rodzina modeli w raporcie. Strony sa renderowane po stronie klienta
(3,7 MB payloadu), a raporty per narzedzie sa za routingiem. **To jest nastepny krok researchu**
i dopiero po nim wolno napisac cokolwiek publicznie - zgodnie ze skillem `audit-published-claims`.

**Decyzja dla Krystiana, nie moja:** teza sprzedazowa i cennik. Skan zgodnosci jest dzis darmowy
(Ora, agentable), monitoring artefaktow kosztuje 29 USD/mc, a tracker widocznosci 250 USD/mc.
Nasze 49/79 za raport siedzi miedzy tymi swiatami i po tej nocy trzeba je ustawic wzgledem tego,
co naprawde jest nasze: **powtarzalnosc zdan i szereg czasowy**, a nie „mierzymy to, czego nikt".

## AUDYT DECYZJI O POZYCJONOWANIU (2026-08-18, decyzja z subagenta, do potwierdzenia rano)

**Decyzja pochodzi z audytu subagenta** (Agent tool, opus), odpalonego po odkryciu Ory i Lightsage.
Brief zawieral wylacznie zweryfikowane fakty z ich publicznych API.

**Korekta faktu, ktora audyt wylapal u mnie:** **79 USD to monitoring miesieczny za domene**, nie
rozszerzony raport. Raport jest jeden, 49 USD jednorazowo (`src/lib/billing/catalog.ts`). Nasza realna
konfrontacja cenowa to **79/mc kontra 29/mc agentable**, a nie „49/79 za raport". Do potwierdzenia
z Krystianem, czy w jego glowie 79 to to samo.

**Rekomendacja: kierunek B, „weryfikowalny pomiar w czasie".** Nie szerokosc (A: 127 checkow za
darmo, wyscig przegrany), nie nisza dowodowa jako os (C: najwyzsza gotowosc do zaplaty, ale **nie ma
dzis przymusu** - nikt nie wymaga dowodu agent-readiness w due diligence), nie interop jako
pozycjonowanie (D: to jeden dzien roboty i higiena, nie strategia).

Argument, ktory przekonuje najbardziej: **szeregu czasowego nie da sie dopisac wstecz**, a podloga
szumu jest **niewygodna do skopiowania** - opublikowanie „nasz wynik rusza sie o X bez zmiany u
vendora" dewaluuje ich wlasna liczbe 0-100 i bramke `--min-score` w CI. To przewaga, ktorej konkurent
nie chce domknac, a nie tylko nie zdazyl.

**Co juz zrobione z kolumny „moge sam":**
- **Wlasny katalog ARD** (`/.well-known/ai-catalog.json` + wskazanie w robots.txt), bo tego samego
  zadamy od innych. Straznik pilnuje, ze katalog jest o nas.
- **Wyzwanie na brzegu vendora jest teraz warte maila.** Klient wlaczajacy ochrone przed botami
  przesuwal trzy checki w cisze i nie dostawal nic, choc to jest ta awaria, ktora obiecuje strona
  glowna. Dwie poprawki z codex review, obie o falszywym alarmie do **placacego** klienta: sygnal
  filtrowany po domenie wiersza (wyzwanie z `api.npmjs.org` to nie ich brzeg) i **odzyskane**
  wyzwanie nie liczy sie jako sciana.
- **Sprawdzone i NIEPRAWDZIWE zalozenie audytu:** teza „nikt inny nie uruchamia agentow" **nie byla
  opublikowana** na stronie. Zyla w STATE i w mojej glowie, wiec nie ma bledu poprawnosciowego do
  naprawienia, jest za to teza do napisania od nowa, gdy bedzie czym ja poprzec.

**Co audyt kaze PRZESTAC robic** (i z czym sie zgadzam): przebiegi adwersaryjne w obecnym tempie
(dziewiec powierzchni, zero falszywych zdan, wartosc krancowa dziesiatego bliska zeru), dokladanie
checkow dla parytetu ze specyfikacja, poszerzanie pokrycia tam, gdzie cisza jest konsekwencja,
dopieszczanie tresci raportu **przy niedzialajacym checkoucie**.

**Najwazniejsze ryzyko, ktorego nie widzialem:** nie agentable, tylko **`npx @ora-ai/ax audit
--min-score` w CI**. Gdy check chodzi w pipelinie, monitoring jako usluga traci racje bytu dla
zespolu inzynierskiego. Kontra istnieje (CI nie widzi zywej strony po deployu, rejestru npm, cudzych
powierzchni i nie mowi, ze agent wybral konkurenta), ale **dopoki nie jest napisana, kupujacy sam
tego nie wymysli**.

**Do potwierdzenia rano z Krystianem:** dane sprzedawcy do Paddle (jedyny prawdziwy blocker), czy 79
zostaje wobec 29, kiedy monitoring przestaje byc darmowy i co z trzema obecnymi obserwacjami, dolna
granica ceny audytu, `CORPUS_LICENCE_PUBLISHED` ze swiadomoscia, ze Ora i Lightsage moga zassac
korpus, zdjecie pakietu 10 domen (499/mc kontra 99/mc za 25 u agentable) i zgoda na opublikowane
zdanie **„zaplata nie zmienia werdyktu"** przed pierwsza transakcja, nie po pierwszym telefonie.

## POLITYKA SERII, KONTRA NA BRAMKE W CI I JEDNO NIEPRAWDZIWE ZDANIE O RFC 7591 (2026-08-18, noc)

Trzy rzeczy z kolumny „moge zrobic sam" audytu pozycjonowania, plus jedna poprawka, ktora przyszla
z rekomendacji agenta SEO i okazala sie wazniejsza od calej reszty.

**1. Polityka serii, `/methodology#series`.** Cztery rzeczy, ktore psuja porownywalnosc, i wszystkie
sa nasze, nie klienta: zmiana formuly (stary pomiar jest **przeliczany** dzisiejsza regula, a gdy sie
nie da, mail nie idzie wcale), zmiana reguly checku (wyrzucany z listy, bo rescore odtwarza stare
czytanie tam, gdzie regula czyta w trakcie skanu), wiersz niemierzalny (nigdy nie jest „gorszy",
sam z siebie nie jest powodem maila) i **nasz wlasny 429** (czekamy i pytamy jeszcze raz, a jesli
nadal odmawia, wiersz nazywa hosta zamiast raportowac nieobecnosc).

**Pisalem to z kodu, nie o kodzie, i pierwsza wersja i tak byla nieprawdziwa.** Napisalem „przy innej
formule totale w ogole nie ida obok siebie", a cron robi cos innego i lepszego: przelicza stary
pomiar (`scoreFindings(previous.findings)`) i dopiero wtedy porownuje. Zdanie poprawione przed
wdrozeniem.

**2. Kontra na bramke w CI, `/pricing`.** Cztery rzeczy, ktorych check w pipelinie nie widzi:
brzeg to konfiguracja produkcji (16 domen ze 177 odmowilo nam na wlasnym brzegu w jednym przemiecie,
12 wyzwaniem przegladarkowym), polowa karty lezy na cudzych hostach (rejestr paczek, rejestr
narzedzi, opis w wyszukiwarce), prog nie powie, ze **agent wybral konkurenta**, a bramka na wyniku
oblewa buildy na szumie (nasza podloga: 0,59 proc.). Zakonczone tym, ze **oba maja sens obok siebie**,
bo inaczej to jest sprzedaz przez strach.

**Codex zlapal sprzecznosc, ktorej sam bym nie zobaczyl:** napisalem „jeden wiersz to nie nowina",
a `worthTelling` wysyla maila wlasnie przy jednej zmianie miedzy dwoma mierzalnymi werdyktami.
Podloga szumu jest **rzedem na korpusie**, a nie polityka alertu dla pojedynczej domeny. Zdanie
przepisane tak, zeby mowilo obie te rzeczy naraz.

**3. `oauth_dcr` opieral sie na zdaniu, ktore przestalo byc prawda.** Rekomendacja z
`~/projects/seo-agent/rekomendacja-monitoring-agent-seo.md` (dopisek z 2026-08-18) mowi, ze MCP
wycofuje rejestracje dynamiczna. **Sprawdzone bezposrednio w specyfikacji, nie na slowo**
(`modelcontextprotocol.io/specification/2026-07-28/basic/authorization`, sekcja Overview):

| mechanizm | status w 2026-07-28 |
|---|---|
| Protected Resource Metadata (RFC 9728) | **MUST** dla serwerow MCP |
| Client ID Metadata Documents | **SHOULD** |
| Dynamic Client Registration (RFC 7591) | **MAY**, wprost „is deprecated" |

Nasze zdanie brzmialo *„RFC 7591 is the only standard path by which an agent can register itself
without a human"* i szlo do **platnego raportu jako uzasadnienie oskarzenia vendora**. Bylo prawda,
gdy je pisalismy, i przestalo nia byc bez zadnej zmiany u nas. Poprawione w czterech miejscach:
`score.ts` (why), `fixfirst.ts` (obie galezie recepty), `/findings` i `/report`. **Straznik w
`rules.mts` nie pozwala mu wrocic**: zadna strona ani `score.ts`/`fixfirst.ts` nie moze nazwac
rejestracji „jedyna standardowa", z kontrolka, ktora to zdanie rozpoznaje.

**Czego swiadomie NIE zrobilem:** nie dolozylem `cimd` ani `rfc9728` jako checkow. To zmiana
punktacji, wiec podbicie formuly (wygasza sprostowanie directusa) i nowa powierzchnia oskarzen bez
pomiaru falszywych oskarzen. Pomiar +25pp/+31pp dla `oauth_dcr` **zostaje wazny**, bo mowi, jak
agenty zachowuja sie dzis. **Do decyzji rano:** czy sledzic przejscie DCR -> CIMD jako osobny pomiar
(nie check) na korpusie. Rekomendacja agenta SEO mowi, ze to lepszy naglowek produktu niz sam
`oauth_dcr`, i ma racje w tym, ze inaczej budujemy naglowek na mechanizmie z data waznosci.

## AUDYT SZESCIU ZRODEL: SURFER, DATAFORSEO, SENTRY, POSTHOG, INDIG (2026-08-18, noc)

Trzy subagenty na szesc adresow. Wyniki przefiltrowane przeze mnie, bo dwie rekomendacje nie
przetrwaly zderzenia z naszym kodem.

**CO ODRZUCONE OD RAZU.** Surfer AI Tracker: skrobie piec silnikow i sprzedaje Visibility Score
0-100 bez wzoru, Average Position z dokladnoscia do dziesiatych przy nieujawnionym n. To jest
dokladnie ta liczba, ktorej nasza metodologia zakazuje. Sentry i PostHog: mierza wnetrze petli
agenta, ktorego klient sam uruchamia, przez SDK w jego kodzie. **Zaden z nich nie przesuwa sie w
nasza strone** i nie ma stamtad gotowej metryki do wziecia.

**REKOMENDACJA SUBAGENTA, KTORA JEST NIEPRAWDZIWA:** „dolozyc status Unknown osobno od FAIL, wzorem
Sentry Uptime, 1 dzien". **Mamy to od dawna**: `inconclusive` w `ScoredCheck`, trzy stany werdyktu
i sekcja „Three verdict states" na `/methodology`. Subagent nie mial dostepu do kodu i zgadl.

**CO WARTE WZIECIA, w kolejnosci:**

1. **Cena niewidoczna dla zwyklego pobrania. Zmierzone dzis, na zapisanym korpusie, bez skanowania:**

| stan strony cennika | wierszy |
|---|---|
| cena widoczna dla zwyklego pobrania | **133 z 177** |
| strona cennika jest, ceny nie widac | **25 z 177** |
| zadnej strony cennika nie znalezlismy | 19 z 177 |
| strona cennika ponizej 1200 znakow tekstu | 12 z 177 |

`scripts/price-without-js.mts`. **Poprawka do mojego wlasnego zdania sprzed godziny:** napisalem, ze
nic tego nie scoruje, i to bylo za mocne. Flaga jest uzywana w galezi checku o darmowym progu
(„answers a plain request with no price and no free-tier wording in the N characters it serves"),
ale **nie jest osobnym checkiem** i nikt nie pyta wprost, czy agent zobaczy cene.

**Powierzchnia dzieli sie na dwie i tylko polowe wolno nam oskarzyc.** `pricesVisible: false` powstaje
na dwa sposoby: kanoniczne `/pricing` o wadze cenowej zero (fakt o vendorze) albo strona zapasowa,
ktora sami wybralismy, bo nic kanonicznego nie odpowiedzialo (fakt o naszym odkrywaniu, i punktacja
juz dzis nazywa go niemierzalnym). Rozbicie liczbowe w `/tmp/pricejs2.txt`, skrypt rozdziela je sam.
Check oznacza podbicie formuly, wiec dopiero po sprostowaniu directusa, i dopiero po przebiegu
adwersaryjnym na tej kanonicznej polowie.

2. **Slownik porazek z PostHoga, odwrocony na strone produktu.** Ich lista opisuje wine agenta
(„picked the wrong tool", „retrieval pulled bad context"), nasza wersja opisuje wine produktu
(nie ujawnia narzedzi: brak OpenAPI, MCP, llms.txt; dokumentacja renderowana klientowo). Do platnego
raportu z audytu, okolo dnia roboczej.

3. **„Mention Gap" przelozony na nasz korpus**, czyli twoj werdykt obok werdyktow konkurentow z tej
samej kategorii. Dane juz mamy, zadnego nowego zapytania, 1-2 dni.

4. **Dwie kolejne porazki, zanim zmienimy werdykt** (wzorem progu Sentry Uptime: trzy porazki, 10 s
timeout). U nas monitoring jest miesieczny, wiec jeden nieudany skan przesuwa werdykt od razu.
0,5 dnia i chroni przed „vendor zepsul MCP", gdy to byl ich chwilowy 502.

**DO DECYZJI KRYSTIANA: DataForSEO LLM Mentions.** To jedyne zrodlo zmiennej **wynikowej**, ktorej
nie mamy: ile razy vendor jest realnie cytowany w odpowiedziach AI. Target Metrics to zwykly request
HTTP, przelot calego korpusu rzedu 20-30 USD. Pozwolilby pokazac zwiazek naszych checkow z
cytowalnoscia, czyli dowod, ze 16 checkow mierzy cos o konsekwencjach. **Dwa blokery, oba nie
techniczne:** prawo do redystrybucji (nasz `corpus.json` jest publiczny, warunki republikacji nie sa
opisane na stronie produktu) oraz zalozenie konta, ktorego agent nie zaklada sam. Gdyby weszlo, to
**wylacznie jako osobna kolumna nie-deterministyczna**, nigdy do werdyktu i nigdy do alertu.

**LICZBY INDIGA, warte cytowania z zastrzezeniem.** Proba: 100 produktow B2B, 3 zadania zakupowe,
5 przebiegow kazde, czyli 1500 przebiegow. Zadanie „cennik" wypada najgorzej z trzech: 79 procent
odpowiedzi z pierwszej reki wobec 93 przy integracjach i 92 przy compliance. Bez jawnej ceny
45 procent przebiegow cytowalo zrodlo trzecie, przy jawnej nadal 18. Bledy dostepu wystapily w
7 procentach przebiegow i podbijaly fallback na zrodla trzecie do 77 wobec 17 procent. **Uwaga: oba
linki to jedno badanie**, tekst w Search Engine Land jest syndykacja Growth Memo, wiec to nie sa dwa
niezalezne potwierdzenia. Skala 0-100 autora jest prywatna i bez rubryki wag, wiec **jej nie
cytujemy**. Zadne z tych zrodel nie wspomina llms.txt, MCP, OAuth, CAPTCHY ani provisioningu, czyli
**dziewiec z naszych szesnastu checkow nie dostaje stamtad zadnego wsparcia** i stoi wylacznie na
naszych wlasnych przebiegach agentowych.

**PRZY OKAZJI: baza dla przejscia DCR -> CIMD**, `scripts/registration-mechanisms.mts`, czytane
z zapisanego korpusu: **94 ze 177** publikuje metadane serwera autoryzacji, **77** ma
`registration_endpoint` (RFC 7591, dzis MAY i deprecated), a **8** serwuje
`/.well-known/oauth-protected-resource` (RFC 9728, MUST dla serwerow MCP) i wszystkie osiem ma tez
DCR. RFC 9728 pytamy tylko na hoscie witryny, wiec ta osemka to **dolna granica**. Wniosek na dzis:
mechanizm wycofywany jest wciaz tym, co realnie stoi w sieci (77 kontra 8), wiec `oauth_dcr` zostaje
jako check, a zmienilismy tylko zdanie, ktore obiecywalo wiecej niz specyfikacja.

## 42. PRZEBIEG: CENA NIEWIDOCZNA DLA ZWYKLEGO POBRANIA (2026-08-18)

25 kanonicznych stron cennika zapytanych ponownie, `scripts/audit-price-js.mts`, z kontrolka na
trzech stronach, ktorym cene zaliczylismy (skaner znajduje na nich kwoty, wiec sonda umie powiedziec
„jest"). Szerszy zestaw wzorcow niz nasz wlasny: funty, jeny, rupie, kwota przed kodem waluty,
„per seat", miesiecznie po polsku, francusku i niemiecku.

**Wynik: 16 potwierdzonych, 7 z cena wylacznie w payloadzie skryptu, 0 naszej slepoty, 2 nie na ich
cenniku.** Zero wierszy, gdzie cena stoi w widocznym tekscie, a my jej nie widzimy: nasza lista
sygnalow (dolar, euro, „per month", „/mo", „per user", „billed annually") **nie przegapila zadnej
ceny w innej walucie ani w innym jezyku** na tych 25 stronach.

**Dwa wiersze sa nasze do naprawy, znalezione dopiero po zaostrzeniu sondy:**
- `sendgrid.com/pricing` **przekierowuje na `twilio.com/en-us/sendgrid`**, strone produktowa. Zdanie
  „twoja strona cennika odpowiada bez ceny" jest o stronie, ktorej vendor nigdy nie nazwal cennikiem.
- `deepl.com/pricing` przekierowuje na `deepl.com/en/pro`, ktora ma cene w payloadzie.

**Skad to sie bierze:** `bestPricing` sprawdza sciezke, ktora **zapytalismy**, i nie patrzy, gdzie
zapytanie **wyladowalo**. Sonda tez tego nie sprawdzala w pierwszej wersji i dlatego pierwszy
przebieg wyszedl 0 z 25, a poprawny jest 2 z 25. To ta sama lekcja, co przy oauth: **sonda musi
pytac dokladnie o to, co twierdzi zdanie**, a zdanie mowi „twoja strona cennika".

**Twilio i elastic sprawdzone recznie, bo 15 tysiecy znakow bez ceny brzmi nieprawdopodobnie:**
`twilio.com/pricing` konczy na `www.twilio.com/en-us/pricing` z tytulem „Twilio Pricing", serwuje
15 543 znaki i **ani jednej kwoty w calym dokumencie**, tylko „free", „trial" i „Contact sales".
`elastic.co/pricing` tak samo. To sa uczciwe znaleziska, nie luka w odczycie.

**Powierzchnia dla ewentualnego checku: 23 z 25** (16 bez ceny gdziekolwiek plus 7 z cena tylko dla
JavaScriptu), czyli **13 procent korpusu**. Poprawka `bestPricing` i tak jest potrzebna niezaleznie
od checku, bo dzis produkuje dwa zdania o cudzych stronach, ktore nie sa cennikami.

## 9.41: STRONA, KTOREJ VENDOR NIGDY NIE NAZWAL CENNIKIEM (2026-08-18)

Wynik 42. przebiegu naprawiony w kodzie. `bestPricing` sprawdzalo sciezke, o ktora **pytamy**, i nie
patrzylo, gdzie zapytanie **wyladowalo**. Teraz strona liczy sie jako cennik tylko wtedy, gdy
**laduje na sciezce cennika I na domenie, ktora jest ich wlasna** (skanowana albo ta, na ktora
rozwiazuje sie ich witryna). Gdy nie, wiersz mowi wprost: „`X` przekierowuje na `Y`, ktore nie jest
strona cennika, wiec nie mamy z czego odczytac twoich progow", jako **niemierzalne, nie oskarzenie**.

**Codex zlapal dwa bledy P1, oba byly tym samym bledem, ktory naprawialem:**
1. Sama sciezka nie wystarcza. `sendgrid.com/pricing` laduje na `twilio.com/en-us/pricing`, co jest
   nadal sciezka cennika i nadal **cudzym** cennikiem, chyba ze ich witryna tam sie rozwiazuje.
   Stad warunek o domenie.
2. Sciezka zapasowa (`firstLivePath`) pytala te same dwa adresy jeszcze raz i brala, co odpowie,
   **oddajac dokladnie te strone, ktora odrzucilismy**, tylko pod etykieta „zgadlismy sciezke".
   Po odrzuceniu nie ma juz sciezki zapasowej.

**Zweryfikowane na czterech domenach po kazdej poprawce:** `deepl.com` dostaje zdanie niemierzalne z
oboma adresami, `sendgrid.com` czyta cennik Twilio, bo ich witryna tam sie rozwiazuje, `plausible.io`
(cennik z kotwicy na stronie glownej) i `resend.com` bez zmian.

**Formula 9.41**, wpis w `CHECK_RULE_CHANGED` dla `self_serve`, bo to ta sama regula czytajaca inna
strone. **Sprostowanie directusa przesuniete z `fixedIn: 9.41` na `10.0`**: jego przyczyna to
przepisanie rankingu nazw (#47), ktorego 9.41 nie dotyka, a sprostowanie, ktorego `fixedIn` nadchodzi
przed naprawa, **kasuje sie samo przy zywym bledzie**. Straznik w `rules.mts` pilnuje teraz, ze
`fixedIn` directusa jest zawsze pozniejsze niz biezaca formula.

**Do zrobienia przy najblizszym przemiecie:** korpus jest na 9.40, kod na 9.41, wiec `self_serve`
ruszy sie na tych wierszach i **regressions.mts pokaze to w sekcji „nasza zmiana reguly"**.

## PLATNY RAPORT MA TERAZ ADRES W PORTALU (2026-08-18)

Raport za 49 USD istnial wylacznie jako plik markdown na dysku operatora. Teraz `--publish`
zapisuje go pod nieodgadywalnym adresem `/d/<id>`, a `/d/[id]` renderuje **dokladnie ten sam tekst**,
ktory dostaje kupujacy. Strona jest **poza indeksem i nigdzie nie linkowana**: dokument nazywa
porazki vendora dokladniej niz cokolwiek, co publikujemy za darmo, i nalezy do tego, kto zaplacil.

**Renderer nie jest parserem markdowna** i to jest swiadome: zna dokladnie te konstrukcje, ktore
wypisuje generator, a `rules.mts` oblewa build, gdy generator nauczy sie nowej. Straznik zadzialal
od razu, jeszcze przed codeksem: generator pisze `*Fix:*` kursywa, ktorej renderer nie znal.

**Codex zlapal blad P1, ktorego nie widac inaczej niz na oczy:** rozdzielacz tabeli idzie jako
`|---|---|`, bez spacji po kresce, wiec regula pytajaca o `"| "` konczyla tabele na naglowku i kazdy
wiersz punktacji renderowala jako osobna tabele bez danych. **Cala tabela etapow znikala z raportu**,
ktory ktos kupil.

**Probka do oceny wartosci: `filestack.com`**, 6/12 w skanie, **wymieniony w 0 z 10 biegow**,
opublikowana jako sample. Dobra ilustracja, bo pokazuje obie polowy produktu naraz: sciane
(nikt o nich nie napisal ani jednego zdania) i konkretne, naprawialne porazki techniczne.

**Indeksowanie po zmianach (skill `agent-discoverability`):** wszystkie blokery binarne przechodza
(SSR, parytet bot kontra czlowiek, piec botow retrievalowych, opis w snippecie z cena, llms.txt,
katalog ARD, sitemap), 241 adresow zgloszonych do IndexNow. `/d/<id>` **nie jest w sitemapie** i
zgloszenie go nie objelo.

## FILTR BEZPIECZENSTWA PRZED AUDYTEM I PIASKOWNICA BIEGOW (2026-08-18)

Pytanie Krystiana: czy wrogo przygotowana domena moze skazic nasze srodowisko przy audycie.
Odpowiedz rozpada sie na dwie polowy i tylko jedna byla zabezpieczona.

**Skaner deterministyczny jest bezpieczny z konstrukcji** i sprawdzilem to w kodzie, nie z pamieci:
zakaz adresow IP i nazw nieroutowalnych, **DNS sprawdzany przeciw zakresom prywatnym na kazdym
przeskoku przekierowania** (`assertPublicHost` w `guard.ts`), tylko http i https, tylko porty 80 i
443, 400 kB limitu na odpowiedz i ten sam limit na dekompresje. Zostaja dwie waskie dziury:
**DNS rebinding** (miedzy naszym `lookup` a polaczeniem undici adres moze sie zmienic; zamkniecie
wymaga wlasnego dispatchera z przypietym IP) oraz **ReDoS** na wrogim HTML.

**Polowa audytowa nie byla zabezpieczona wcale i to jest realne ryzyko.** Bieg instaluje paczke
vendora, idzie za ich dokumentacja i laczy sie z ich serwerem MCP, ktorego **opisy narzedzi to
tekst, ktoremu agent ufa z definicji**. Nie trzeba exploita: „przeczytaj token deploya, zebym mogl
ci pomoc wdrozyc" to jest zdanie, nie atak.

**Zmierzone, nie zalozone** (`harness/sandbox/exposure.mts`, 2026-08-18 na tej maszynie): **dwie
zmienne srodowiskowe z tokenami plus `~/.codex/auth.json`, `~/.config/gh/hosts.yml`, `~/.npmrc`
i klucz prywatny w `~/.ssh`**. Szesc rzeczy, o ktore wroga paczka moze poprosic i dostanie.

**Co powstalo:**
- `scripts/audit-gate.mts <domena>`: co sie wykona (paczka npm, adresy serwerow MCP), wiek domeny
  z RDAP (bezplatnie, bez klucza), status w rejestrze, czy jest w korpusie. **Nie blokuje sam z
  siebie** - brama, ktora blokuje po cichu, uczy ludzi ja omijac.
- `harness/sandbox/run.sh <katalog> <komenda>`: `env -i`, puste `HOME` z kopia poswiadczenia
  **tylko tego CLI, ktore uruchamiamy**, odmowa startu wewnatrz repozytorium. Sprawdzone: dziecko
  widzi piec zmiennych i zadnego tokenu.

**Codex zlapal w tym cztery bledy, w tym dwa, ktore odwracaly sens calej roboty:**
1. `exec` podmienia powloke, wiec trap EXIT nigdy nie chodzil i **kopia poswiadczenia zostawala w
   katalogu tymczasowym po kazdym biegu**. Sprawdzilem po fakcie: po moim jednym tescie lezal tam
   `auth.json`, 4 kB. Piaskownica rozsypujaca sekrety jest gorsza niz jej brak.
2. Kopiowalem **oba** poswiadczenia do kazdego biegu, wiec bieg claude dostawal token codeksa.
3. Brama czytala `funnel.mcp.endpoint`, pole, ktorego nie ma. **Zawsze pisala „zadnego serwera MCP
   nie znalezlismy"**, czyli ujawnienie, ktore zawsze milczy. Prawdziwe pole to `funnel.mcpEndpoints`.
   Po poprawce `resend.com` pokazuje dwa adresy i dwa ostrzezenia o wstrzyknieciu.
4. Granica repozytorium porownywana raz logicznie, raz fizycznie.

**Czego swiadomie NIE zrobilem:** Dockerfile. Na tej maszynie **nie ma zadnego runtime kontenerow**
(docker, colima, podman), wiec wyslalbym niesprawdzony plik. `run.sh` zamyka droge oportunistyczna
(srodowisko i `$HOME`), a **nie zamyka drogi swiadomej**, bo dziecko chodzi na tym samym UID i
`/Users/<ty>/.ssh` po sciezce bezwzglednej nadal dziala. Napisane wprost w README.

**DO DECYZJI KRYSTIANA:** kontener (colima albo docker, instalacja i wolniejsze biegi) albo
**osobne konto systemowe dla biegow** (bez nowych narzedzi, jednorazowo admin, pelna separacja
katalogu domowego). Do tego czasu: **nie uruchamiac biegu budujacego na maszynie z kluczami
produkcyjnymi**.

## POPRAWKA DO MOJEGO WLASNEGO ZDANIA I ZNALEZISKO, KTORE Z NIEJ WYSZLO (2026-08-18)

**Napisalem Krystianowi, ze DNS rebinding jest u nas otwarty. To nieprawda.** `src/lib/scan/dispatcher.ts`
instaluje globalny dispatcher undici z wlasnym `lookup`, ktory sprawdza adresy **wewnatrz tego
lookupu, ktorego uzywa polaczenie**, wiec miedzy sprawdzeniem a polaczeniem nie ma juz drugiego
rozwiazania nazwy. Rekord z TTL 0 przelaczajacy sie miedzy adresem publicznym a 127.0.0.1 nie
przechodzi. Sprawdzone w kodzie, nie z pamieci, i wpis w poprzedniej sekcji jest tu prostowany.

**Za to druga dziura, ktora wymienilem obok, okazala sie duzo powazniejsza, niz brzmiala.**
`scripts/audit-redos.mts` przepuszcza ksztalty, jakie moze przybrac wroga strona, w rozmiarze,
ktory naprawde czytamy (400 kB), przez prawdziwe czytelniki. Wynik pierwszego przebiegu:

| ksztalt | `visibleTextLength` |
|---|---|
| 400 000 znakow `<` | **53 792 ms** |
| 200 000 razy `</` | **26 844 ms** |

**Budzet calego skanu to 27 sekund.** Strona zlozona z samych nawiasow zabierala go w calosci, a
kazdy check, ktory nie zdazyl, publikowal sie jako **niemierzalny**: zdania o vendorze wyprodukowane
przez nasz wlasny stall, nie przez jego witryne. Przyczyna to `replace(/<[^>]+>/g, ' ')`, gdzie
`[^>]+` przy kazdym niedomknietym `<` skanuje do konca dokumentu.

**Naprawa: `withoutTags`**, przejscie po ciagu zamiast wzorca. **Musi dawac dokladnie ten sam wynik**,
bo inaczej przesuwa werdykty w calym korpusie, wiec rownowaznosc jest sprawdzona dwa razy:
**200 000 losowych ciagow** z alfabetu nawiasow i ukosnikow (zero rozjazdow) plus dziesiec ksztaltow
brzegowych w `rules.mts`, razem z dwoma, ktore wygladaja na detal i nie sa (`<` bez `>` nie jest
tagiem i zostaje, `<>` nie ma nic miedzy nawiasami, wiec tez nie jest tagiem). Po poprawce
**kazdy ksztalt schodzi ponizej 200 ms**, czyli z 53 sekund na mniej niz pol.

Ten sam kwadratowy wzorzec byl jeszcze w `funnel.ts` (dwa miejsca) i `discover.ts` (waga cenowa),
wszystkie przepiete. Straznik pilnuje, ze **na sciezce skanu nie ma juz `/<[^>]+>/g`**.

**Codex zdjal moj wlasny prog czasowy z `rules.mts`** i mial racje: `rules.mts` chodzi w buildzie,
wiec prog na zegarze oblewalby poprawny build na obcazonej maszynie. Deterministyczny odpowiednik
to nieobecnosc wzorca w zrodle; czas mierzy osobny skrypt.

## RAPORT DOSTAJE MODEL DANYCH, WYKRESY I CYTATY ZWYCIEZCY (2026-08-19)

Krystian obejrzal probke i wypunktowal: **malo miesa** (nie widac, jakie rozmowy toczylismy z
agentami), **brak slow, ktorymi agent wybral konkurenta**, **brak informacji, jakich narzedzi i
modeli uzywamy**, brak polowy audytowej (jak agent poradzil sobie z dokumentacja, rejestracja,
cennikiem) i osobno: **raport nie zachwyca graficznie**, nie da sie z niego zrobic PDF-a na
spotkanie.

**Co bylo w danych i czego nie pokazywalismy:**
- **Cytaty zwyciezcy.** Cytowalismy tylko zdania o kupujacym, wiec raport filestacka mowil „zaden
  bieg nie napisal o was zdania" i nic wiecej. Teraz cytuje **slowa, ktorymi wybrano konkurenta**,
  wylacznie z biegow, w ktorych ten konkurent **byl wymieniony pierwszy** (codex poprawil mi to:
  wzmianka w polowie odpowiedzi to nie jest „tak brzmi bycie wybranym").
- **Czym mierzylismy.** Tabela narzedzie, wersja, model, liczba biegow, data. Przy okazji widac
  rzecz, ktora sama jest znaleziskiem: **codex na darmowym planie raportuje model jako `default`**.

**Prezentacja: `/d/<id>` renderuje teraz model, nie markdown.** Dwie liczby na wierzchu (wymieniony
w N z M biegow oraz punkty mierzalne), paski udzialu, **wykres slupkowy kto zostal wymieniony
zamiast ciebie**, cytaty w ramce, piec etapow z paskami, karty oblanych checkow z poprawka przy
kazdym, plan naprawy z zyskiem i naklademem, oraz co niemierzalne i co niedotyczace. Klasy `print:`
i `break-inside-avoid`, wiec Cmd+P daje sensowny PDF. **Markdown zostaje bez zmian** jako to, co
kupujacy przesyla dalej.

**Jedna decyzja projektowa, ktora byla warta calej reszty:** model jest **liczony raz**, w tym samym
przebiegu co markdown, i zapisywany razem z nim. Dwa renderery czytajace dwa liczenia to jest
dokladnie ten blad, ktory juz raz zrobilismy („wymieniony 9 z 10" obok tabeli mowiacej 5).

**Codex zglosil w tej zmianie dziewiec rzeczy i osiem z nich to byly zastrzezenia, ktore ladniejsza
wersja po cichu gubila:** brak informacji, ze vendor nie byl na liscie przy biegach; brak
ostrzezenia, ze bieg mogl czytac lokalne instrukcje operatora; brak wyjasnienia, czemu mianownik
jest mniejszy (checki niedotyczace); brak linku do pelnych odpowiedzi; brak sekcji „czym ten raport
nie jest"; brak informacji, ze skan jest ze starszej formuly; brak wyjasnienia, czemu cytatow jest
mniej niz wymienien; brak poprawki przy pojedynczym oblanym checku. Do tego jeden prawdziwy blad
logiczny: przy kategorii **bez biegow** strona pisalaby „zaden bieg nie wymienil ciebie" zamiast
„jeszcze nie odpowiedzieliśmy na te polowe". Straznik w `rules.mts` pilnuje teraz czterech z tych
pol, zeby nie wypadly przy nastepnym przepisywaniu.

**Nowa probka: https://letagentsin.com/d/3JaaRSTr2A4H**

**CZEGO WCIAZ NIE MA I CO JEST NASTEPNE (polowa audytowa).** Raport nadal odpowiada tylko na dwa
pytania: czy cie wymieniaja i czy technicznie da sie ciebie uzyc. **Nie odpowiada na trzecie: jak
agent poradzil sobie, gdy mu kazano isc wlasnie z toba.** To wymaga biegu budujacego (dokumentacja,
rejestracja, cennik, klucz), prawdziwej skrzynki (mamy `agentaudit@agentmail.to`) i **zakladania
kont**, czego agent nie robi sam. Do tego szersza siatka narzedzi: dzis claude i codex, docelowo
gemini i cursor, co jest **decyzja o platnych subskrypcjach dla Krystiana**.

## HONORUJEMY ROBOTS.TXT WOBEC SIEBIE, ALE TYLKO IMIENNIE (2026-08-19, decyzja z audytu subagenta)

Pisalem strone `/bot` dla administratora, ktory znajdzie nas w logach, i chcialem tam obiecac, ze
dwie linijki w robots.txt nas zatrzymuja. **Sprawdzilem i tego nie robilismy**: robots.txt czytalismy
wylacznie jako przedmiot pomiaru. Obietnica o wlasnym zachowaniu jest jedyna, ktorej nie wolno
zostawic dobrym checiom, wiec zanim cokolwiek poszlo na produkcje, poszedl audyt decyzji.

**Decyzja pochodzi z audytu subagenta (opus), rekomendacja B z rozroznieniem:**

| sygnal | co robimy |
|---|---|
| `User-agent: LetAgentsIn` + `Disallow: /` | **prosba do nas**: automat przestaje skanowac, wiersz zostaje z ostatnim pomiarem i data |
| `User-agent: *` + `Disallow: /` | **wynik pomiaru**, nie prosba: to samo trafia agenta szukajacego vendora, wiec zostaje w korpusie |
| skan zlecony przez czlowieka na naszej stronie | **zawsze sie wykonuje**, bo ktos o niego poprosil |

**Dlaczego nie usuwamy wiersza:** usuniecie na zadanie tworzy przycisk „skasuj swoj zly wynik",
ktorego nie ma nikt inny, a mediana korpusu staje sie mediana tych, ktorzy nie protestowali. Przy
177 wierszach i raporcie branzowym liczonym z mediany to jest **kanal autoselekcji**, nie detal.
Najmocniejszy kontrargument audytu: zamrozony wiersz starzeje sie i moze klamac o firmie, ktora
poprosila nas o odejscie. Stoi, bo nieaktualnosc jest jawna i datowana, a **odmrozenie jest o jeden
darmowy skan od nich**. Warunek konieczny: ta sciezka musi dzialac i byc widoczna, inaczej wracamy
do usuwania.

**Precedens, ktory audyt przytoczyl i ktory przekonuje najbardziej:** Google rozdziela crawlery od
„user-triggered fetchers", ktore z zalozenia ignoruja robots.txt, bo fetch zlecil czlowiek. To jest
gotowa, cudza podpora pod nasz wyjatek.

**Wdrozone:** `asksUsToStayOut` czyta **kazda** grupe nazywajaca nas (dwie pisownie to dwa wpisy w
mapie), puste `Disallow:` nie liczy sie zgodnie z RFC 9309, wildcard swiadomie nie liczy sie wcale.
`asksUsToStayOutOf` pyta raz, **przed** skanem, bo po sparsowaniu robots.txt w trakcie skanu ruch
juz poszedl. Sprawdzane w dwoch miejscach automatycznych: reseed korpusu (przez `seeded` w
`runScan`) i cron monitoringu.

**Codex zlapal blad, ktory zablokowalby caly monitoring:** kolejka watchow idzie od najstarszego i
bierze jeden na wywolanie, wiec **jedna domena z opt-outem byla by wybierana i pomijana w kolko, a
wszystkie za nia glodowalyby w nieskonczonosc**. Teraz pominiety watch dostaje `checkedAt` i idzie
na koniec kolejki, **nie jest po cichu zatrzymywany**: subskrybent za to zaplacil, nikt mu nie
powiedzial, a gdy blokada zniknie, nastepny przebieg wznawia pomiar.

**Przy okazji, `/bot` i naglowek `From`:** nasz user-agent wskazuje teraz na `/bot` zamiast na
metodologie, a kazde zapytanie niosace nasz wlasny UA ma `From: hello@letagentsin.com`. Zapytania
udajace `Claude-User` czy `GPTBot` **celowo nie niosa niczego naszego**: gdybysmy sie tam
przedstawiali, vendor moglby nas wpuscic na biala liste i publikowana liczba opisywalaby nasza
wlasna liste, a nie jego witryne. Liczby na `/bot` (6 zapytan naraz, 27 sekund, 400 kB) ida ze
stalych, ktore je egzekwuja.

**DO POTWIERDZENIA RANO:** ze honorujemy imienne `User-agent: LetAgentsIn` z **zamrozeniem** wiersza,
ze globalne `User-agent: *` traktujemy jako wynik pomiaru, a nie prosbe, i ze skan zlecony przez
czlowieka zawsze sie wykonuje. **Czego jeszcze nie ma:** adnotacji „od <data> prosza, zebysmy nie
skanowali" na stronie vendora oraz mediany w raporcie branzowym liczonej z zamrozonymi i bez nich.
Strona `/bot` **nie obiecuje** dzis zadnej z tych dwoch rzeczy.

## OBEJRZALEM RAPORT NA OCZY I ZNALAZLEM CZTERY RZECZY (2026-08-19)

Krystian powtorzyl, ze raport nie zachwyca graficznie. Ocena jest wizualna, wiec **otworzylem strone
w przegladarce i przewinalem ja**, zamiast czytac wlasny kod. Cztery defekty, ktorych nie widac
inaczej:

1. **Surowy markdown w cytatach.** Agent pisze markdownem, wiec cytat wygladal doslownie tak:
   „I'd use \*\*Cloudflare R2 behind a Cloudflare custom domain/CDN\*\*". Gwiazdki na stronie za
   49 USD czytaja sie jak dokument, ktorego ktos nie skonczyl. **Nie usuwam ich**, bo to byloby ciche
   edytowanie cytatu, tylko renderuje: pogrubienie jest wtedy emfaza samego agenta.
2. **Etapy bez zadnego mierzalnego punktu** rysowaly sie jako `0/0` z pustym paskiem, czyli
   oskarzenie zrobione ukladem strony. Teraz pisza „nothing measurable" i nie maja paska.
3. **Zdanie z licznikiem** brzmialo „named in 10 of the runs you were named in 0".
4. **Druk.** Nawigacja i stopka szly na papier, a to ma byc dokument.

**Codex zlapal przy tym blad, ktory zobaczylby dopiero klient przy drukarce:** w `@media print`
ustawilem biale tlo, ale **zmienne palety zostawaly ciemne**, wiec czytelnik z ciemnym motywem
systemu dostawal na papierze jasnoszary tekst na bialym. Paleta jest teraz wymuszana w bloku druku.
Drugie: reguly `break-inside` byly nieobjete zakresem i zmienialyby druk **kazdej innej strony**.

**Stan wdrozenia: commit `aff7c0f` czeka**, bo **reseed na 9.41 wlasnie ruszyl** (log
`/tmp/reseed-941.log`, wiersze schodza po kolei). Zgodnie z zasada nocy nie wdrazam w trakcie
przemiatu.

**UWAGA przy nastepnym `npm run audit`:** w trakcie przemiatu audyt pokazal dwa rozjazdy
(`/findings` mowi 36 serwerow MCP bez udokumentowanego klucza, dane mowia 35). To jest **korpus w
locie**, nie blad publikacji: czesc wierszy jest juz na 9.41, czesc na 9.40. Liczby sprawdzic
**po** przemiecie i dopiero wtedy poprawiac, inaczej goni sie ruchomy cel.

## POLOWA AUDYTOWA: BRIEF GOTOWY, JEDEN WARUNEK WSTEPNY NIESPELNIONY (2026-08-19)

`harness/briefs/directed-build.md`. Wszystkie dotychczasowe briefy sa **otwarte** („wybierz
dostawce") i mierza, kogo agent wybral. Krystian pyta o cos innego i tego nam brakuje: **skoro
decyzja juz zapadla, czy agent w ogole wejdzie**. Cztery fakty na bieg: dokumentacja (czy pierwszy
przyklad kodu zadzialal), rejestracja (czy formularz da sie ukonczyc bez czlowieka), cennik (czy z
przeczytanych stron wynika, ile to kosztuje i czy trzeba karty), klucz (czy bieg konczy sie z
poswiadczeniem i po ilu krokach).

**Bieg zatrzymany na scianie nie jest biegiem nieudanym, tylko wynikiem**, a zdanie, ktore agent
wtedy napisal, jest najcenniejsza linijka raportu.

**Granica, ktorej operator nie przekracza:** bieg moze wypelnic formularz i uzyc prawdziwej skrzynki,
ale **nie wolno przeprowadzic go przez sciane**. Nikt nie przepisuje CAPTCHY, nie klika linku
weryfikacyjnego i nie wkleja klucza, ktorego bieg sam nie zdobyl. W momencie, gdy czlowiek to robi,
bieg przestaje mierzyc i raport ma to powiedziec. Dwoch rzeczy nie robimy nigdy: **nie podajemy
danych platniczych i nie zakladamy konta na planie, ktory nalicza**. Vendor, u ktorego jedyna droga
do klucza prowadzi przez karte, jest opisany dokladnie tak i to jest wynik, nie przeszkoda.

**WARUNEK WSTEPNY, KTORY BLOKUJE PIERWSZY BIEG:** skrzynka `agentaudit@agentmail.to` **odbiera**, ale
**klucza API do jej odczytu nie ma na tej maszynie** (sprawdzone ponownie 2026-08-19: brak w
srodowisku, brak pliku gdziekolwiek pod `~/projects`). Bez klucza bieg dojdzie do formularza i **nie
domknie rejestracji**, co zapisaloby sie jako sciana vendora, podczas gdy jest nasza. **Najpierw
klucz z `console.agentmail.to`, potem biegi.** Pomiar, ktorego tryb awarii jest nie do odroznienia
od mierzonej rzeczy, nie jest pomiarem.

**Do decyzji Krystiana przy okazji:** dzis mamy claude i codex. Cursor na darmowym planie nie
pozwala przypiac modelu (`auto`, bez zapisu, ktory model odpowiadal), a gemini wyczerpuje darmowy
limit przed koncem biegu. Bez platnych subskrypcji os „rozne narzedzia" jest **niemierzalna, a nie
tania**.

## PRZEMIAT NA 9.41 ZAMKNIETY (2026-08-19)

**177 wierszy na 9.41, 0 sprzecznosci, 0 rozjazdow.** Dwa rozjazdy, ktore audyt pokazywal w trakcie
przemiatu, byly korpusem w locie i **zniknely same** po jego zakonczeniu, tak jak zapisalem, ze
powinny. Komplet kontroli przeszedl: badanie na `/findings` nadal prawdziwe, platny raport i mail
bez zdania kloccego sie z danymi, kadencja obserwacji zdrowa, nasz OpenAPI opisuje kazde zwracane
pole.

**Cztery werdykty gorsze, kazdy przeskanowany pojedynczo, i tak to sie rozlozylo:**

| domena | check | co pokazal pojedynczy skan |
|---|---|---|
| split.io | `machine_readable_api` | **wrocil** 1/1, markdown dla maszyn jest |
| split.io | `programmatic_provisioning` | **wrocil** 2/2 |
| kinde.com | `mcp_present` | stoi: kazdy POST JSON-RPC wraca pustym 2xx, takze pod sciezka, ktorej nikt nie rejestrowal |
| froala.com | `answers_plain_request` | stoi: 403 w trzech probach, to jest froala bedaca soba |

Czyli **polowa „regresow" to byl nasz zasieg w trakcie przemiatu**, a druga polowa to uczciwe
niemierzalne, nie oskarzenia. Sprostowanie directusa **nadal stoi**, zgodnie z przesunieciem
`fixedIn` na 10.0.

**Wdrozone i zweryfikowane na produkcji:** cytaty renderuja pogrubienie zamiast surowych gwiazdek
(`<strong>` w zrodle strony), etapy bez mierzalnego punktu pisza „nothing measurable" zamiast rysowac
pusty pasek przy `0/0`.

## STRONA O STANDARDZIE, I LICZBA, KTORA SIE NIE OBRONILA (2026-08-19)

`/standard`. Kupujacy, ktory znajdzie agentready.org, ma o nas jedno pytanie: czy jestescie zgodni.
Uczciwa odpowiedz to **mapowanie, nie odznaka**, bo piec z siedmiu MUST-ow jest **warunkowych**
(dotycza tylko produktow wystawiajacych dana powierzchnie). Zweryfikowane bezposrednio na
agentready.org: **28 wymagan**, nie 30 jak mialem w notatkach, piec sekcji, siedem MUST-ow.
Mierzymy **szesc z siedmiu**, na czterech pytamy ostrzej niz spec, jednego (PKCE, AR-IDEN-05)
swiadomie nie mierzymy. **Bez wyniku zgodnosci**, bo standard powstal wlasnie dlatego, ze kazdy
wynik gotowosci klocil sie z kazdym innym.

**Historia jednej liczby, warta zapamietania.** Chcialem napisac, ilu vendorow serwuje karte A2A.
Pierwsza wersja liczyla **opublikowane zdania** i dala **2**. Poprawiona liczyla znaleziska z
korpusu i dala **11**. Notatki mowily **5**. Zamiast wybierac, **zapytalem wprost**: 59 domen
rozlozonych po korpusie, bezposrednio pod `/.well-known/agent-card.json`. **Zero.** Przy stopie
11/177 w probie 59 domen spodziewalibysmy sie okolo czterech, wiec przechowywana liczba mierzyla
cos innego niz to, co zdanie obiecywalo.

**Codex przepuscil te sonde przez siedem rund** i kazda byla o tym samym: **co wolno nazwac brakiem**.
Po kolei wypadly z mianownika: hosty, ktore nie odpowiedzialy; kod 403 i 429; `{}` z kodem 200
uznawane za karte; 200 z markerem wyzwania; 200, ktorego nie umiemy odczytac; porownanie „oba sa
HTML" zamiast szablonu; i wreszcie sciana logowania, ktora pasuje do kontrolki, bo cale
`/.well-known` stoi za nia. Konczy sie na **52 hostach, ktore odpowiedzialy, zero kart**, siedmiu
niejednoznacznych wypisanych z nazwy, i porownaniu szablonu **zaimportowanym ze skanera**, a nie
napisanym drugi raz.

**Zasada, ktora z tego zostaje:** liczba na stronie publicznej ma pochodzic z **zapytania, ktore da
sie powtorzyc** (`scripts/audit-agent-card.mts`), a nie z naszej wlasnej pamieci o tym, co kiedys
zmierzylismy. Przechowywana liczba wygladala solidnie i byla o czym innym.

## PROBKA RAPORTU POD STALYM ADRESEM, LINKOWANA Z CENNIKA (2026-08-19)

Cennik sprzedawal raport za 49 USD i **nie pokazywal ani jednego**. Cztery opublikowane audyty sa
probka audytu, nie raportu. Teraz `/pricing` linkuje **`/d/sample`**, czyli prawdziwy, skonczony
dokument (filestack.com), ten sam, ktory dostaje kupujacy. Generator przyjmuje `--id`, wiec link
raz wyslany dziala dalej po przegenerowaniu raportu.

**Codex zlapal w tym ryzyko prywatnosci, ktore samo by kiedys wybuchlo:** flagi `--id` i `--sample`
sa niezalezne, wiec **opublikowanie raportu klienta pod `--id sample` bez `--sample` wystawiloby
jego dokument z cennika**. Link renderuje sie teraz tylko dla dostawy **oznaczonej jako probka**:
istnienie to nie zgoda. Do tego dwie rzeczy mniejsze: `--id --sample` przechodzilo przez wzorzec i
publikowalo raport pod nazwa flagi, a odczyt z bazy przy awarii wywracalby caly cennik zamiast
schowac opcjonalny link.

**Dlaczego akurat filestack:** ich wiersz i tak jest publiczny na `/v/filestack.com`, a cytaty z
biegow sa publiczne na `/c/file-storage/runs`. Raport **nie ujawnia niczego nowego**, tylko sklada
to w dokument. Strona jest poza indeksem, wiec to material sprzedazowy, a nie SEO.

## INDEKSOWANIE: WSZYSTKO POZA REJESTREM MCP JEST ZROBIONE (2026-08-18)

Pytanie Krystiana: czy mozemy zaindeksowac projekt tak, jak opisuje skill `agent-discoverability`.
Wiekszosc byla zrobiona wczesniej, wiec przemierzylem to od nowa zamiast wierzyc STATE.md.

**Blokery binarne: 9 przechodzi, 0 oblewa, 1 nie dotyczy** (`check.py` na produkcji). SSR, parytet
bot kontra czlowiek (bot widzi 100% strony), piec botow retrievalowych wpuszczonych, opis strony i
opis cennika z liczba w srodku, `llms.txt`, katalog ARD, sitemap. `llms-links` jest SKIP, bo nasz
`llms.txt` nie ma linkow, wiec nie ma czego sprawdzac.

**IndexNow: sitemap ma 243 adresy, ostatnie zgloszenie objelo 241.** Roznica to `/bot` i
`/standard`, ktore powstaly wczoraj. `npm run indexnow` zglosil zestaw staly, **66 adresow, 200 OK**.
Obie nowe strony maja wlasny opis w `<meta>`, wiec wchodza do indeksu z odpowiedzia, a nie z
naglowkiem.

**Jedyna realna dziura: nie ma nas w oficjalnym rejestrze MCP** (`presence.py`: 1 FAIL). To zrodlo
kanoniczne, z ktorego ciagna Smithery, Glama, mcp.so i MCPfinder, wiec nieobecnosc tam jest
nieobecnoscia wszedzie. `server.json` lezy w repo od dawna i nikt go nigdy nie opublikowal.

**Logowanie domenowe nie wymaga niczyjego konta ani dostepu do DNS.** Rejestr akceptuje dowod przez
HTTP: plik pod naszym wlasnym adresem z kluczem publicznym. Zrobione i sprawdzone od konca do konca:
`/.well-known/mcp-registry-auth` odpowiada 200 na produkcji, a `mcp-publisher login http` przeszedl.
Klucz prywatny siedzi w `.env.local` jako `MCP_REGISTRY_SEED` (`.env*` jest w `.gitignore`).

**Zostala jedna komenda i ona wymaga zgody Krystiana**, bo tworzy publiczny wpis pod nasza
przestrzenia nazw: `mcp-publisher publish` z katalogu repo. Nazwa `com.letagentsin/scanner`, opis to
zdanie, ktore agent czyta zamiast tytulu strony.

**Regula pilnuje formatu dowodu**, bo zly format nie objawia sie niczym poza odmowa logowania w
momencie publikacji, czyli miesiace pozniej. Kontrola: sam klucz bez naglowka `v=MCPv1` odpada.

**Trzy indeksy zostaja niesprawdzalne bez kont** (Bing Webmaster Tools, Search Console, Brave bez
API). Mamy licznik odwiedzin, ale zapisuje tylko `agent` albo `browser`, wiec nie odroznia
`OAI-SearchBot` od `curl`. Gdyby zapisywal nazwe dla piatki botow retrievalowych, mielibysmy wlasny
pomiar tego, kto nas faktycznie czyta, zamiast trzech pol „nie do sprawdzenia". Przeczolganie nie
jest tym samym co indeks, wiec to dowod slabszy w jedna strone i mocny w druga: brak wizyty jest
mocnym dowodem nieobecnosci.

**Profil skilla:** `~/.claude/skills/agent-discoverability/profiles/letagentsin.json`. Kanaly B i C.
Kanalu A praktycznie nie mamy: repo jest prywatne, na npm nie ma nic, wiec dla agenta kodujacego
istniejemy tylko przez dokumentacje i serwer MCP.

## ZAMROZONY WIERSZ MOWI, ZE JEST ZAMROZONY, I JEDNO ZDANIE NA `/bot` BYLO NIEPRAWDA (2026-08-19)

Audyt subagenta, ktory ustalil, ze na imienna prosbe w robots.txt **zamrazamy** wiersz zamiast go
usuwac, sam nazwal swoj warunek konieczny: **ta sciezka musi dzialac i byc widoczna, inaczej
wracamy do usuwania**. Zadna z tych dwoch polowek nie istniala.

**Polowa pierwsza: nie bylo widac.** Pominiecie dzialo sie w srodku przebiegu i nie zostawialo
sladu nigdzie, gdzie czytelnik moglby go zobaczyc. Opublikowany wiersz dalej wygladal na biezacy
pomiar firmy, ktora poprosila nas, zebysmy przestali ja mierzyc. Teraz kazdy przebieg automatyczny
(reseed i cron monitoringu) **zapisuje prosbe**, a strona vendora ma nad wynikiem ramke: od kiedy
prosza, z kiedy jest pomiar, ktory nadal pokazujemy, i kiedy ostatnio potwierdzilismy, ze prosba
wciaz tam jest. `since` nie rusza sie nigdy, `lastSeenAt` rusza sie przy kazdym przebiegu, bo to
druga wielkosc: pierwsza to data, ktora drukujemy, druga to dowod, ze nie cytujemy pamieci.

**Polowa druga: `/bot` opisywal droge powrotna, ktorej nie ma.** Strona mowila „jesli cos naprawiles
i chcesz zaktualizowac wpis, przeskanuj swoja domene z naszej strony glownej". Sprawdzone w kodzie,
nie z pamieci: `loadCorpus` bierze `latestPerDomain(1000, true)`, czyli **wylacznie skany z naszej
konsoli**. Skan, ktory vendor odpali u nas, nigdy nie rusza jego opublikowanego wiersza, i tak ma
byc, bo inaczej anonimowe zadanie przepisuje to, co witryna mowi o firmie. Zdanie bylo nieprawdziwe
przez dobe. Teraz `/bot` mowi, jak jest: **usuniecie dwoch linijek odmraza wiersz**, bo nastepny
przebieg automatyczny mierzy domene od nowa i zabiera adnotacje ze soba; skan goscia zawsze sie
wykonuje, ale nie aktualizuje wpisu; szybciej niz nastepny przebieg tylko mailem.

**Codex zlapal P2 w tej samej mechanice, i to takie, ktore trafia dokladnie w cel adnotacji:**
czyscilem prosbe **przed** skanem, wiec rescan, ktory potem umarl na DNS albo timeoucie, zdejmowal
ostrzezenie i zostawial na stronie stary pomiar **bez** informacji, ze jest stary. Teraz czyszczenie
stoi za zapisanym raportem (`seeded && kept`), a regula pilnuje kolejnosci, nie tylko obecnosci
wywolania.

**Drugi przebieg codeksa zlapal dwie rzeczy, ktorych sam nie widzialem.** Zapis prosby byl odczytem
i podmiana, a reseed i cron moga zobaczyc te sama domene naraz: pozniejszy odczyt wygrywal starsza
data, a przy pierwszej obserwacji dwa upserty wchodzily na unikalny indeks bledem duplikatu. Teraz
jest to jedna operacja (`$set` na `lastSeenAt`, `$setOnInsert` na `since`) i **jedno odczytanie
zegara**, bo przy dwoch pierwszy zapis dawal `since` o dwie milisekundy **pozniejsze** niz
`lastSeenAt`, ktore ma poprzedzac, a obie daty ida na strone. Druga rzecz: przy wszystkich wierszach
zamrozonych mediana „bez nich" nie istnieje, a kod podstawial tam mediane wyjsciowa, wiec strona
twierdzilaby, ze usuniecie wszystkiego daje liczbe. Teraz to `null` i osobne zdanie.

**Trzeci przebieg codeksa zlapal P1, ktory jest wprost naruszeniem naszej wlasnej zasady.**
`asksUsToStayOutOf` zwracalo `false` takze wtedy, gdy robots.txt byl **nieczytelny**: 500, wyzwanie
przegladarkowe, strona HTML zamiast pliku. Udany skan po takiej odpowiedzi **odmrazal wiersz**,
czyli jedna zla minuta na ich brzegu wystarczala, zeby wznowic automatyczne pobieranie domeny,
ktora niczego nie wycofala. Brak dowodu nie jest dowodem braku, a tutaj kosztuje kogos innego.

Teraz sa **trzy odpowiedzi, nie dwie**: `out` (przeczytana grupa nazywajaca nas), `in` (przeczytany
plik bez naszej grupy **albo 404**, bo brak pliku to jedyny status, ktory jest odpowiedzia) i
`unknown`. Zamrozony wiersz **zostaje zamrozony przy `unknown`**, a `lastSeenAt` sie wtedy nie
rusza, bo znaczy „widzielismy prosbe", a przy nieczytelnym pliku nie widzielismy nic. Odmrozenie
wisi na `frozen && stance === 'in'` i dopiero po zapisanym raporcie. Logika wyszla do czystej
funkcji `stanceFrom(Fetched)`, wiec regula sprawdza ja na piciu odpowiedziach zamiast czytac zrodlo.

**Czwarty przebieg codeksa znalazl ten sam blad o warstwe nizej** i to jest lekcja warta wiecej niz
sama poprawka: odczyt zamrozenia mial `.catch(() => null)`, wiec **nieudany odczyt bazy wygladal
identycznie jak brak prosby**. Przy nieczytelnym robots.txt jedno zaciecie bazy wznawialoby
pobieranie zamrozonej domeny, czyli dokladnie to, przed czym poprawke wlasnie napisalem. Teraz stan
zamrozenia tez ma trzy wartosci (`frozen`, `clear`, `unknown`), a skan idzie dalej wylacznie przy
`clear`. **Wzorzec do zapamietania: kazde miejsce, gdzie „nie wiem" ma domyslna wartosc, jest
kandydatem na ten sam blad, i trzeba go szukac na kazdej warstwie osobno, bo poprawka na jednej nie
naprawia drugiej.**

**Piaty i szosty przebieg: jedno przyjete, jedno odrzucone z uzasadnieniem.** Przyjete: lista `/v`
zamieniala nieudany odczyt na pusty zbior, wiec kazdy zamrozony wiersz stalby w rankingu jako zwykly,
biezacy wynik; teraz strona pisze, ze nie umiala sprawdzic. **Odrzucone:** codex chcial, zeby nieznany
stan bazy blokowal skan takze przy `stance === 'in'`. Nie, i to jest decyzja, nie przeoczenie:
`in` znaczy, ze **wlasnie przeczytalismy ich robots.txt i on o nic nie prosi**. Ich wlasny biezacy
plik jest autorytetem, a nasz zapis o tym, o co prosili kiedys, nie moze go przebijac. Nieznany stan
bazy liczy sie tylko wtedy, gdy robots.txt tez jest nieczytelny, czyli gdy zgadujemy obie polowy
naraz. Powod jest w komentarzu przy warunku i w regule, zeby nastepny przeglad go nie podnosil trzeci raz.

**Sprawdzone na zywej bazie, nie tylko w typach:** sonda na domenie spoza korpusu przeszla pelny
cykl zapis - drugi przebieg - lista - wyczyszczenie i posprzatala po sobie. `since` stoi, `lastSeenAt`
sie rusza, po wyczyszczeniu nie ma wiersza.

**Raport branzowy drukuje mediane w dwie strony.** Argument „mediana tych, ktorzy nie protestowali,
nie jest mediana" jest uczciwy tylko wtedy, gdy czytelnik moze go sprawdzic, wiec liczba, od ktorej
zalezy, stoi obok tej, ktorej broni. Dzis zamrozonych jest **0 ze 177** i strona pisze to wprost.
Gdy obie mediany kiedys sie rozjada, rozjazd jest nasza historia do opublikowania, a nie czyims
znaleziskiem.

Lista `/v` tez oznacza zamrozone wiersze, jednym odczytem na cala strone: wynik zamrozony stojacy
bez oznaczenia w rankingu to dokladnie to samo nieaktualne twierdzenie, ktorego strona vendora juz
nie stawia, tylko wydrukowane 177 razy.

**Czego nadal nie ma:** zadnego zamrozonego wiersza w danych, wiec **cala ta sciezka nie byla
jeszcze przejechana na zywym przypadku**. Pierwszy vendor, ktory nas o to poprosi, jest zarazem
pierwszym testem.

## LICZNIK ODWIEDZIN NAZYWA CRAWLERY, BO INACZEJ NIE WIEMY, KTO NAS CZYTA (2026-08-19)

`presence.py` ze skilla `agent-discoverability` zwraca trzy pola „nie do sprawdzenia bez konta":
Bing, Search Console i Brave. Mielismy wlasny licznik, ktory zapisywal wylacznie `agent` albo
`browser`, wiec nie odrozniał `OAI-SearchBot` od `curl`.

Teraz zapisuje **nazwe** dla zamknietej listy trzynastu robotow (OpenAI, Anthropic, Perplexity,
Google, Bing, Apple, Meta), a konsola pokazuje je osobno. Kolejnosc na liscie ma znaczenie:
`Claude-SearchBot` musi stac przed `ClaudeBot`, bo drugi wzorzec zjadlby pierwszy.

**Czym ten pomiar jest, a czym nie:** przeczolganie to nie indeks, wiec obecnosc wizyty jest
dowodem slabym. W druga strone jest mocny: crawler, ktory nigdy nie przyszedl, nie mogl niczego
zaindeksowac. **Wyjatek wart zapamietania: Brave.** Claude gruntuje sie na Brave, a Brave buduje
indeks czesciowo z tego, co ludzie przegladaja, a nie tylko wlasnym crawlerem, wiec **brak wiersza
Brave nie jest dowodem niczego**.

**Strona prywatnosci musiala sie zmienic razem z tym**, bo mowila „data, sciezka i czy zapytanie
wygladalo na przegladarke albo agenta". Zdanie o tym, co zbieramy, jest obietnica prawna, wiec
regula wiaze teraz jedno z drugim: gdy licznik nazywa crawlery, prywatnosc musi o tym mowic, i
kontrola oblewa, gdy wroci stare zdanie.

## POLITYKA PRYWATNOSCI ZYJE, REGULAMIN NADAL NIE (2026-08-19, decyzja z audytu subagenta)

Przy weryfikacji indeksowania wyszlo, ze **`/privacy`, `/terms` i `/refunds` zwracaja 404 na
produkcji**. To nie byl bug: wszystkie trzy zaczynaly sie od `if (!SELLER_IS_COMPLETE) notFound()`,
a danych sprzedawcy nie ma, bo forma prawna jest nierozstrzygnieta. Blokada byla wewnetrznie spojna
(stopka ich nie linkowala, sitemapa ich nie zawierala, zero martwych linkow).

**Decyzja pochodzi z audytu subagenta (opus) i brzmi: rozdzielic flagi.** Kluczowa obserwacja audytu,
ktora obala pierwotne zalozenie: **administrator danych to nie forma prawna**. Administratorem jest
ten, kto decyduje o celach i sposobach przetwarzania, czyli dzis Krystian jako osoba fizyczna.
Rejestracja firmy administratora nie tworzy, a jej brak nie zdejmuje obowiazku. Do tego **obowiazek
z art. 13 wiaze sie z momentem ZBIERANIA danych, a nie ze sprzedaza**, a formularz monitoringu na
stronie glownej zbiera adresy e-mail dzisiaj. Wiec 404 nie bylo opcja neutralna: wybor byl miedzy
strona z niepelnym imprintem a brakiem informacji, do ktorej jest obowiazek, i to drugie jest gorsze.

**Wykonane:** `CONTROLLER` i `CONTROLLER_IS_NAMED` obok `SELLER_IS_COMPLETE`. `/privacy` stoi na
fladze administratora i **jest serwowana**: imie i nazwisko, e-mail, jurysdykcja, zero adresu
domowego i zero NIP-u (art. 13 chce tozsamosci i kanalu kontaktu, a nie siedziby), plus zdanie
wprost, ze **nie ma jeszcze zarejestrowanej spolki** i ze przy jej powstaniu kazdy, czyj adres
trzymamy, zostanie o tym powiadomiony. `/terms` i `/refunds` zostaja na 404 pod stara flaga, bo
opisuja sprzedaz, ktorej nie ma, a merchant of record porownuje nazwe znak w znak z KYC. Stopka
linkuje kazda z trzech osobno, sitemapa tez, a **formularz linkuje polityke przy samym polu**, bo
tam zaczyna sie obowiazek, a nie trzy strony dalej.

**Codex zlapal P1 dokladnie w miejscu, w ktorym rozdzielilem role w glowie, a w kodzie je z powrotem
skleilem:** strona brala tozsamosc administratora z `SELLER_IS_COMPLETE`, wiec przy uzupelnionych
danych sprzedawcy publikowalaby spolke jako administratora, choc caly sens tej zmiany jest taki, ze
to dwie niezalezne role. Teraz jest osobne `CONTROLLER.isSeller` (domyslnie falsz), a nazwa
sprzedawcy pojawia sie na tej stronie **tylko wtedy, gdy ktos wprost powie, ze sprzedawca jest
administratorem**. Drugie znalezisko: flaga do formularza idzie **propsem**, bo `WatchForm` to
komponent kliencki i zmienna srodowiskowa tylko serwerowa czyta sie tam jako `undefined`, wiec
formularz linkowalby strone, ktora serwer wlasnie wylaczyl.

**Trzecie znalezisko tej samej rodziny:** trzecie miejsce, w ktorym renderuje sie ten formularz
(bramka na stronie raportu `/r/<id>`), nie dostawalo flagi i brala sie wartosc domyslna. Prop jest
teraz **wymagany**, bo domyslne `true` jest zla odpowiedzia wszedzie, gdzie sie do niego dochodzi
przez pominiecie. Adres do praw z RODO tez poszedl na administratora, nie na sprzedawce: to on
odpowiada za dane, wiec zadanie usuniecia ma trafiac tam, gdzie jest obowiazek na nie odpowiedziec.

**Najostrzejsze znalezisko calej tej sekcji, i nie dotyczy prawa, tylko prawdy:** napisalem przy
formularzu „przechowujemy adres i domene, **nic wiecej**", a rekord watcha trzyma tez daty
utworzenia i potwierdzenia, date ostatniego sprawdzenia, identyfikator ostatniego raportu, ostatni
wynik, plan i identyfikator subskrypcji. To samo zdanie stalo od dawna na `/privacy`. Strona, ktorej
caly sens to opisac, co przechowujemy, opisywala to **z pamieci**, a nie z typu. Pierwsza poprawka byla za slaba: wypisalem
pola recznie i codex od razu pokazal cztery pominiete, w tym `brand`, ktore jest danymi podanymi
przez czlowieka, wiec zdanie „zaden profil" tez bylo nieprawda.

**Poprawka wlasciwa jest typem, nie prosza:** `WATCH_FIELDS_DISCLOSED` to
`Record<keyof Watch, string>` obok samego typu, a strona sklada zdanie z jego wartosci. Nowe pole w
`Watch` **lamie kompilacje**, dopoki nikt nie napisze, czym ono jest dla czytelnika. To mocniejsze
niz straznik, bo nie da sie tego ominac przez przeoczenie.

**PULAPKA NAZWANA PRZEZ AUDYT, WARTA PRZECZYTANIA RANO:** ustawienie `SELLER_LEGAL_NAME` i
`SELLER_ADDRESS` w ENV "zeby odblokowac polityke" odblokowuje **jednoczesnie regulamin i zwroty**,
publikuje adres domowy jako adres sprzedawcy i czyni osobe fizyczna strona umowy sprzedazy. Po tej
zmianie nie trzeba tego robic i nie nalezy.

**DO POTWIERDZENIA RANO:** (1) zgoda na publikacje imienia i nazwiska jako administratora na
`/privacy` (formalnie jest juz w stopce, ale to jego dane); (2) JDG czy spolka, bo to blokuje
`/terms`, `/refunds` i wybor PSP; (3) dokladna nazwa, adres i NIP zgodne z przyszlym KYC;
(4) polityka zwrotow (14 dni na raport, biezacy miesiac monitoringu bez zwrotu).

**Rozbieznosc, ktora audyt zglosil przy okazji, i ktora sprawdzilem:** `/pricing` mowi o monitoringu
za 79 USD, a formularz zapisuje za darmo. **To nie jest pozostalosc.** Strona odpowiada na to wprost
(„darmowy dzisiaj, dla wszystkich, a cena jest wydrukowana, zebys wiedzial, czym sie stanie; nikogo
nie obciazamy bez pytania i nie ma karty do obciazenia"), a kod robi dokladnie to: nowy watch dostaje
`plan: 'trial'`. Otwarta jest **decyzja**, kiedy „darmowy dzisiaj" ma sie skonczyc, a nie stan kodu.

**Czego audyt NIE potwierdzil, a co bylo w moim briefie:** ze brak zywego adresu polityki jest
najczestsza przyczyna odrzutu w katalogu konektorow Anthropica. Przyjal to z briefu i nie
weryfikowal niezaleznie. Trzyma sie tego skill `agent-discoverability`, ale to nie jest nasz pomiar.

## PRZESZEDLEM SCIEZKE KLIENTA OD KONCA DO KONCA NA PRODUKCJI (2026-08-19)

Nie z pamieci i nie na domenie z korpusu, zeby nie odmladzac mediany. Trzy domeny spoza korpusu,
zlecone przez publiczne API tak, jak zrobilby to kupujacy.

**Skan → link → strona vendora dziala.** `POST /api/scan` dla `tally.so` odpowiedzial 200 w 13
sekundach, `12/16`, formula 9.41, a `/r/<id>` i `/v/tally.so` obie 200. Odpowiedz API ma trzy pola i
zaden nie jest nieudokumentowany.

**Generator raportu odmawia PRZED platnoscia, nie po.** `tally.so` nie nalezy do zadnej z 26
kategorii i skrypt konczy sie bledem, ktory to mowi i wypisuje wszystkie kategorie. To jest wlasciwa
strona tej odmowy: kupujacy dowiaduje sie, ze nie mamy dla niego celi, zanim zaplaci.

**Straznik marki zadzialal na przypadku, ktorego bym nie wymyslil.** Dla `railway.app` generator
ostrzegl, ze **10 odpowiedzi zawiera slowo „railway", ale nie liczy ich jako wymienien**, a proba
`--brand Railway` zostala odrzucona, bo ta nazwa nalezy juz do `railway.com` z korpusu. To ta sama
firma po zmianie domeny. **Wniosek, ktory zostaje jako otwarty problem:** firma, ktora przeniosla
sie na nowa domene, dostanie u nas raport „wymieniony 0 razy", podczas gdy agent wymienial ja pod
stara nazwa. To jest ten sam problem co zadanie #47 (atrybucja po golej nazwie), tylko od drugiej
strony, i **nie jest rozwiazany**.

**Raport za 49 USD przeczytany w calosci jak klient**, na `svix.com` (kategoria notifications,
`12/16`, wymieniony 0 z 10). Ma to, czego brakowalo w wersji, ktora nie zachwycila: pytanie zakupowe
w calosci, rozbicie na narzedzia i modele z datami, kto zostal wymieniony zamiast niego z liczbami,
**cytaty slowami, ktorymi wybrano konkurenta**, etapy, oblane checki z konkretnym adresem, ktory
oblal, sekcja „czego nie zmierzylismy i dlaczego to nie liczy sie przeciwko wam", plan naprawy z
liczba punktow i szacunkiem pracy, oraz „czym ten raport nie jest". Arytmetyka planu naprawy sie
zgadza (12 + 1 + 2 = 15).

**Co z tego wynika dla gotowosci:** brakuje **wylacznie checkoutu**. Pomiar, adres, strona vendora,
odmowa dla zlej kategorii, straznik marki i deliverable dzialaja i sa uczciwe. Sciezka „napisz na
hello@" jest do przejscia recznie w jednej komendzie.

## ZERO WYMIENIEN NIESIE TERAZ SWOJA DWUZNACZNOSC (2026-08-19)

Wyszlo z przejscia sciezki klienta, nie z audytu. `railway.app` dostal z generatora **„wymieniony
0 z 11 biegow"**, podczas gdy **dziesiec odpowiedzi mowilo Railway**: ta nazwa nalezy w naszych
danych do `railway.com`, a to ta sama firma po zmianie domeny. Generator ostrzegal o tym **na
stderr**, czyli operatora, a zero czyta kupujacy.

**Poprawka jest jednym zdaniem w dokumencie i jednym polem w modelu:** raport pisze, ile odpowiedzi
uzywa nazwy bez podania domeny, dlaczego ich nie liczymy (liczymy domene, nie slowo, bo slowo moze
nalezec do kogos innego, a wymienienia przeniesionego na cudzy raport nie cofnie zadne zdanie w
srodku) i co zrobic, jesli to jednak oni. Strona `/d/<id>` pokazuje to samo, bo caveat, ktory
zostaje tylko w markdownie, ginie dokladnie dla polowy kupujacych.

Sprawdzone w obie strony: `railway.app` niesie to zdanie, `svix.com` nie niesie go wcale.

**Druga polowa, dopisana po tym, jak sprawdzilem, co skaner juz wie:** skaner **poszedl za 301** i
zapisal, ze `railway.app` laduje na `railway.com` (`resolvedElsewhere.finalDomain`). Nie trzeba wiec
zadnej recznie trzymanej tabeli „ta sama firma": generator **odmawia** goscia, ktorego adres laduje
w korpusie, i podaje komende dla adresu, ktory publikujemy. To ta sama decyzja co odmowa dla
niemierzonej kategorii i z tego samego powodu: przed platnoscia kosztuje zero, po platnosci jest zwrotem.

**Czego to NIE naprawia:** nadal nie umiemy policzyc wymienien firmy po zmianie domeny, bo
`--brand Railway` jest slusznie odrzucane (nazwa nalezy do wiersza w korpusie). Wlasciwe
rozwiazanie to znane zadanie **#47** (atrybucja po golej nazwie) plus pojecie „ta sama firma pod
dwoma adresami", ktorego w danych nie mamy. Teraz przynajmniej kupujacy widzi, ze pytanie istnieje.

## ZADANIA IDA NA MUSTER (2026-08-19)

Krystian poprosil, zeby zaczac uzywac tablicy zadan https://musterboard.dev. Zalozona i zasilona
prawdziwymi pozycjami, nie przykladowymi.

- projekt `p_w8vtpkcae5`, tablica dla czlowieka: **https://musterboard.dev/r/r_kyvged60vn4c2mvj**
- token w `~/.muster/tokens.json` (600), handle agenta `ai-audytor`
- siedem pozycji: piec `blok:` (czekaja na decyzje Krystiana) i dwie `produkt:`

**Wlasnosc jest PENDING, dopoki Krystian nie odbierze tablicy** przez ten link albo
https://musterboard.dev/operator. Ma to znaczenie praktyczne, a nie tylko formalne: niezaklepany
projekt **wygasa 2026-08-25** i ma limit 50 pozycji. Odbior zdejmuje jedno i drugie.

Zalozenie i pulapki opisane tez w KB (`clad-kb show muster-musterboarddev-tablica-zadan-dla-agentow-jak-zalozyc-`),
bo dotycza kazdego agenta, nie tylko tego projektu.

## 9.42: SLOWA PACZKI DECYDUJA O TYM, KTORY ARTEFAKT JEST BIBLIOTEKA VENDORA (#47, 2026-08-19)

Zadanie #47 czekalo od poprzedniej proby, ktora zostala **zmierzona i wycofana**: awans
`<scope>/sdk` o range naprawial directus, sanity i configcat, a **odwracal netlify.com**, gdzie
`@netlify/api` (349 tys.) juz wygrywal z `@netlify/sdk` (89 tys.) na pobraniach. Wniosek stamtad byl
trafny i wykonalem go doslownie: **nie przesuwac nazw miedzy rangami, tylko pozwolic czemu innemu
przewazyc jeden krok rankingu**.

**Czym jest to cos innego: opisem samej paczki.** To jedyny sygnal w calym tym rankingu, ktory
pochodzi z artefaktu, a nie z ksztaltu jego nazwy, i trzy przypadki czytaja sie identycznie dla
czlowieka, a przeciwnie dla rankingu nazw:

| paczka | co o sobie mowi |
|---|---|
| `directus` | „real-time API and App dashboard for managing SQL database content" |
| `@directus/sdk` | „Directus JavaScript SDK" |
| `@mux/mux-node` | „The official TypeScript library for the Mux API" |
| `onesignal-ngx` | „a JavaScript module ... for a website or app that uses Angular" |

Dwie zmiany w `settledOnUsage`: **lider, ktory sam mowi, ze jest biblioteka vendora, nie podlega
wyzwaniu na pobrania** (to blokuje ksztalt bledu netlify raz na zawsze), a **okno rangi rozszerza sie
z jednego kroku na dwa, gdy to wyzywajacy mowi o sobie, ze jest biblioteka**. Do tego osobny prog
dla lidera zasiedzialego (5x zamiast 3x), bo lepiej uksztaltowana nazwa jest dowodem, a nie wyrokiem.
Nazwa vendora musi padac w opisie: samo slowo „client" nie mowi nic o TYM vendorze i kontrola tego
pilnuje.

**POMIAR NA CALYM KORPUSIE, bo tego wymagalo #47 i bo poprzednia proba wlasnie na tym polegla.**
Jedna migawka 177 witryn (`npm-attribution snapshot`), dwa replaye na **jednym cache rejestru**, wiec
roznica jest kodem, a nie pogoda. Pierwszy replay bez cache'u zabilem i uruchomilem od nowa wlasnie
po to: dwie godziny odstepu miedzy przebiegami to inne liczby pobran i inna kolejnosc wynikow.

**Trzy zmiany, zero regresji:**
- `directus.com`: `directus` (serwer, 19 tys., bez typow) → `@directus/sdk` (135 tys., z typami)
- `onesignal.com`: `onesignal-ngx` (wrapper Angulara, 4,9 tys.) → `@onesignal/node-onesignal` (110 tys.)
- `axiom.co`: `axiom` (SDK do instrumentacji AI) → `@axiomhq/js` („official javascript bindings")
- `mux.com` **NIE zmienil sie**, bo `@mux/mux-node` samo mowi, ze jest biblioteka - dokladnie ten
  przypadek, ktory poprzednia proba psula.

**Sprostowanie directusa dostaje `fixedIn: '9.42'`, i przy okazji poprawilem straznika**, ktory
wymagal, zeby `fixedIn` bylo PONIZSZE od biezacej formuly. `erratumFor` porownuje `fixedIn` z wersja
**wiersza**, nie ze stala, wiec rownosc znaczy dokladnie „naprawione w tym wydaniu": wiersze jeszcze
nie przeliczone trzymaja sprostowanie, przeliczone je traca razem z bledem. Zle jest tylko `fixedIn`
starsze niz biezaca formula.

## PUBLIKOWALISMY WIERSZ O GANDI.NET NA PACZCE INNEJ FIRMY (2026-08-19, w 9.42)

Znalezione **przy okazji**, przez przejrzenie wynikow replayu zamiast samego diffu: osiem wierszy ma
paczke starsza niz rok, a jeden z nich to `gandi.net` → `@gandi-ide/gandi-ui`, 23 miesiace.

Sprawdzone w danych, nie z pamieci: opis tej paczki to **„gandi 组件库"** (chinskie „biblioteka
komponentow gandi"), wydawca to prywatny adres `286469838@qq.com`, a linkow **nie ma zadnych** poza
samym rejestrem. To Gandi IDE, srodowisko w stylu Scratcha, czyli **inna firma**. Z francuskim
rejestratorem domen laczy je wylacznie to, ze `gandiide` **zaczyna sie** od `gandi`.

Regula: **scope, ktory tylko zaczyna sie od nazwy vendora, na paczce bez ani jednego linku poza
rejestrem, nie wystarczy**. Oba sygnaly sa slabe i zaden nie jest sprawdzalny, wiec razem sa nadal
slabe: wszystko, co ta paczka o sobie mowi, mowi wewnatrz rejestru. Swiadomie **nie** zakazalem
samego prefiksu: `@axiomhq` tez jest prefiksem, jest naprawde Axioma i ma repozytorium, stronę i
tracker na wlasnej organizacji. Kontrolki pilnuja obu stron.

**Zmierzone na tej samej migawce i tym samym cache: jedna zmiana na 177 domen.** `gandi.net` traci
paczke i dostaje uczciwe „nie znalezlismy zadnej", ktore ma juz 15 innych domen. Lepsze niz wiersz o
cudzym artefakcie.

**Prog, ktory chcialem usunac, i dlaczego zostaje.** Osobna, wyzsza granica pobran dla lidera
zasiedzialego (5x zamiast 3x) **nie zmienia niczego na 177 domenach** - zmierzone, nie zgadniete.
Chcialem ja wyrzucic, bo liczba, ktorej nie da sie pokazac przy pracy, jest liczba, ktora ktos
pozniej zacytuje jako regule. **Codex sie nie zgodzil i ma racje w jednym punkcie, ktory przewazyl:**
przed tym wydaniem lider zasiedzialy nie podlegal wyzwaniu **wcale**, wiec punktem odniesienia nie
jest 3x, tylko brak wyzwania. Z dwoch sposobow poluzowania biore mniejszy, dopoki zaden przypadek
nie przemawia za wiekszym. Komentarz przy stalej mowi wprost, ze dzis nie robi nic.

**Zostaje do zrobienia: przemiat korpusu na 9.42.** Do tego czasu produkcja stoi na 9.41 i to jest
poprawny stan, a nie niedokonczony.

## SPRAWDZILEM TEZ DRUGA STRONE: „NIE ZNALEZLISMY PACZKI" (2026-08-19)

Blad gandi.net byl falszywie POZYTYWNY (cudza paczka przypisana vendorowi). Falszywie negatywne sa
lagodniejsze, bo nie stawiaja twierdzenia o nikim, ale nadal sa bledem, wiec przejrzalem szesnascie
domen bez paczki. Wiekszosc to rejestratorzy domen i hosting, gdzie brak paczki jest prawda.

Trzy sprawdzone w danych z cache'u rejestru, nie z pamieci:
- `fireworks.ai`: wyszukiwanie zwrocilo `fireworks`, `fireworks-js`, `fireworks-canvas`, czyli
  **biblioteki do animacji sztucznych ogni**. Odrzucone poprawnie.
- `weglot.com`: tylko `@weglot/cloudworker`, „node.js runner for Cloudflare Workers". Odrzucone.
- `here.com`: w zadnym zapytaniu nie pojawila sie ani jedna paczka `@here/*`, wiec to nie jest nasze
  odrzucenie, tylko brak trafienia w wyszukiwarce rejestru.
- `betterstack.com`: brak jest **udokumentowana decyzja** w kodzie (github.com/betterstack nalezy do
  innej firmy), a nie przeoczenie.

Wniosek: ta strona jest zdrowa i nie wymaga zmiany.

**Przy okazji, potwierdzone na oczy na produkcji:** strona glowna sama opisuje stan przejsciowy
miedzy wersjami, bez niczyjej interwencji: „measured under formula 9.41 while the scanner runs 9.42,
so a scan you run today can disagree with the row below it". Zdanie jest generowane z dwoch liczb,
wiec rozjazd wersji jest widoczny dla czytelnika, zanim ktos go zglosi.

**Czego NIE zrobie przy zgloszeniu do katalogu konektorow Anthropica:** zrzutow ekranu. Przechwyt
przez przegladarke oddaje obraz w polowie rozmiaru okna (606 px przy oknie 1440 px), a katalog chce
1000 px i wiecej. Reszta wymagan technicznych jest spelniona.

## AUDYT DECYZJI O CENIE MONITORINGU (2026-08-19, decyzja z subagenta, do potwierdzenia rano)

**Rekomendacja: 79 USD zostaje.** Trzy powody, kazdy sprawdzony przez audyt w kodzie i na cudzych
stronach, a nie z rynku „jak wiadomo":

1. **To nie ten sam towar co 29 USD u agentable.** Ich wlasna stopka mowi, ze weryfikuja **istnienie
   artefaktow, a nie realny sukces agenta**. Nasza polowa „checki co tydzien" jest z nimi
   porownywalna i jest commodity; polowa „pytanie zakupowe zadane agentowi piec razy, kto zostal
   wybrany zamiast ciebie i jakim zdaniem" nie ma u nich odpowiednika.
2. **Obnizka nie naprawia lejka, w ktorym nie da sie zaplacic.** Przy zerowej sprzedazy roznica
   79 kontra 59 nie ma jak sie objawic.
3. **Koszt krancowy jest bliski zeru**, bo cele agentowe sa **per kategoria, nie per klient**, i
   ponosimy je i tak dla korpusu. Cene ustala wartosc, a wartosci jeszcze nie zmierzylismy.

**Co audyt znalazl przy okazji, a czego nie szukalem:** pakiet agencyjny 499 USD za 10 domen to
**49,90 za domene**, przy 99 USD za 25 domen u agentable, czyli **3,96**. Na pojedynczej domenie
roznica jest 2,7x, w pakiecie **12,6x**. Agencja policzy to w dwie sekundy. Liczby docelowej nie
podaje ani audyt, ani ja, bo nikt z nas nie ma danych o gotowosci do zaplaty.

**Druga rzecz, ktorej nie szukalem:** relacja 49 do 79 sprzedaje w pierwszym miesiacu **mniej za
wiecej**. Raport za 49 USD to 10 biegow na dwoch narzedziach; miesiac monitoringu to 5 biegow.
Zdanie „credited against your first month" jest **proza bez mechanizmu**. Audyt rekomenduje dac
pierwszemu miesiacowi 10 biegow (cele juz je trzymaja, wiec nie kosztuje nic) albo usunac to zdanie.
Trzeciej mozliwosci nie ma.

**WYKONANE DZIS, bo nie wymagalo niczyjej decyzji:**
- **„Darmowy dzisiaj" ma teraz koniec zapisany jako warunek**, a nie pamietany:
  `FREE_MONITORING_ENDS_ON` (dzis `null`) obok `monitoringIsFree()`. Sama data nalezy do wlasciciela.
  Przy okazji naprawione: `MONITORING_IS_FREE` bylo **stala czytana raz przy ladowaniu modulu**, wiec
  data ustawiona w poniedzialek odpowiadalaby „darmowy" az do nastepnego deployu. To ten sam ksztalt
  bledu co liczba policzona raz i cytowana na zawsze.
- **Runbook billingu niesie kohorte sprzed ceny.** Strona glowna obiecuje wprost, ze **zapytamy,
  zanim to cokolwiek bedzie kosztowac**, a formularz, ktory zebral wszystkich obecnych subskrybentow,
  **nigdy nie pokazal kwoty**. Wiec dzien uruchomienia billingu jest dniem, w ktorym ta obietnica
  jest dotrzymana albo zlamana, i nie da sie jej dotrzymac pamiecia. Straznik pilnuje, ze runbook
  niesie oba kroki: ustawienie daty i napisanie do zapisanych.

**CODEX ZLAPAL, ZE ZBUDOWALEM POL MECHANIZMU I OPISALEM GO JAK CALY.** Ustawienie
`FREE_MONITORING_ENDS_ON` **nie konczy niczego**: cron monitoringu obsluguje kazdego watcha
potwierdzonego i niezatrzymanego, a **nie czyta ani daty, ani pola `plan`**. Data zmienia dzis tylko
to, co robi anulowanie subskrypcji. Kod, ktory to egzekwuje, **swiadomie nie powstal**, bo decyzja o
tym, co sie dzieje z darmowym watchem po dacie (obslugiwany dalej, wstrzymany z informacja, czy
poproszony o platnosc), dotyczy ludzi, ktorzy zapisali sie ze strony bez ceny. Komentarz przy stalej
i runbook mowia to wprost, zamiast udawac przelacznik.

**Drugie znalezisko codeksa, wazniejsze niz wyglada:** moj wlasny straznik „data musi byc null"
**oblewalby build dokladnie w kroku, ktory opisuje runbook**, czyli zabranialby uruchomienia tego, co
mial chronic. Usuniety, z komentarzem, zeby nikt go nie dopisal z powrotem.

**CZEGO NIE WYKONALEM, choc audyt to proponowal, i dlaczego:** pomiaru klikniec w CTA. To jedyna
rzecz, ktora zamienilaby cene z hipotezy w obserwacje, ale **kilka godzin wczesniej opublikowalem na
`/privacy` zdanie „no profile, no behaviour"**. Liczenie klikniec bez identyfikatora da sie z tym
pogodzic, ale to jest **handel wymienny obietnica**, a nie detal techniczny, wiec nalezy do Krystiana.

**LICZBY KONKURENTA SPRAWDZILEM SAM, NIE Z RELACJI SUBAGENTA** (agentable.is, 2026-08-19, pobrane z
naglowkiem przegladarki): MONITOR **29 USD/mies. za domene** to cotygodniowe re-skany, alerty przy
spadku wyniku albo peknieciu checka MUST, historia wyniku i badge do osadzenia. AGENCY **99 USD/mies.
do 25 domen** plus eksport CSV. Ich wlasna stopka opisuje produkt jako statyczny skan zgodnosci,
ktory - ich slowami - **„verifies artifacts exist, not live agent success"**. To jest jedyny material,
na ktorym wolno budowac porownanie, bo pochodzi od nich.

**Szkic akapitu lezy w `docs/draft-priced-against.md` i JEST NIEPUBLIKOWANY.** Dopisalem tam trzy
warunki, ktore musza byc spelnione, zanim cokolwiek pojdzie na strone, w tym ten, ktory boli:
akapit o wartosci za domene zaprasza arytmetyke, ktora **przegrywamy na pakiecie agencyjnym**.

**DO POTWIERDZENIA RANO:** (1) czy 79 zostaje; (2) czy pakiet agencyjny schodzi w dol wobec 12,6x;
(3) czy pierwszy miesiac dostaje 10 biegow, czy zdanie o kredycie znika; (4) ksztalt konca darmowego
(rekomendacja audytu: darmowe do startu checkoutu, potem 30 dni trialu, kohorta sprzed billingu z
grandfatheringiem); (5) czy wolno mierzyc klikniecia w CTA; (6) czy publikujemy porownanie nazywajace
konkurenta (dzis cennik mowi wprost, ze nie mierzylismy cudzego produktu).

## SONDA, KTORA ZNALAZLA SAMA SIEBIE (2026-08-19, drobiazg wart zapisania)

Bramka „nie deployuj w trakcie przemiatu" to `pgrep -f "scripts/reseed.sh"`. Odmowila deployu, choc
przemiat nie chodzil, bo **znalazla wlasna petle czekajaca**: jej linia polecen zawierala dokladnie
ten ciag, ktorego szukala. To ta sama rodzina bledu, co reszta tej nocy - probe, ktore nie odrozniaja
siebie od tego, o co pytaja.

**Poprawny predykat to log, nie lista procesow:** `grep -q "karencja otwarta" /tmp/reseed-942.log`.
Log pisze tylko przemiat i tylko wtedy, gdy naprawde ruszyl.

Przy okazji wyszlo, ze **chodzily dwa czekacze naraz**, wiec przemiat mogl wystartowac podwojnie -
dokladnie to obciazenie, przed ktorym chroni karencja. Jeden ubity, zostal jeden.

## CO POWINIEN ZROBIC PRZEMIAT NA 9.42, ZAPISANE PRZED NIM (2026-08-19, 01:05)

Przewidywanie spisane **zanim** przemiat ruszyl, zeby kontrola po nim byla sprawdzeniem, a nie
opowiadaniem. Bierze sie z replayu atrybucji na migawce 177 witryn, nie z przeczucia.

**Cztery wiersze maja zmienic paczke i zaden inny:**
| domena | bylo | ma byc | skutek dla punktow |
|---|---|---|---|
| directus.com | `directus` (bez typow) | `@directus/sdk` (z typami) | **+1**, i sprostowanie znika |
| onesignal.com | `onesignal-ngx` | `@onesignal/node-onesignal` | bez zmiany, oba z typami |
| axiom.co | `axiom` | `@axiomhq/js` | bez zmiany, oba z typami |
| gandi.net | `@gandi-ide/gandi-ui` | **zadnej** | `typed_package` staje sie niemierzalny, mianownik o 1 mniejszy |

**Czego NIE powinno byc:** zmiany paczki na mux.com (celowo zablokowana) ani nigdzie indziej. Ruch
poza tymi czterema wierszami, wiekszy niz szum 0,59 %, jest znaleziskiem, a nie tlem.

**Po przemiecie sprawdzam w tej kolejnosci:** `after-reseed.mts` (czy sprostowanie directusa wygaslo
i czy wszystkie wiersze sa na 9.42), `npm run audit`, potem reszta kompletu z bloku startowego.

## PRZEMIAT NA 9.42 ZAMKNIETY, PRZEWIDYWANIE TRAFILO CO DO WIERSZA (2026-08-19, 03:05)

Przemiat ruszyl sam o 01:59, gdy mediana wieku korpusu osiagnela karencje, i skonczyl sie o 03:01.
Dwa przebiegi, `/tmp/reseed-942.log`. **Nie forsowalem karencji**, choc bramka na to pozwala: to ona
chroni dane przed tym, zeby vendorzy zaczeli nas blokowac, a dane sa celem tej nocy.

**Wszystkie cztery przewidziane zmiany weszly i zadna piata:**
| domena | jest | co to znaczy |
|---|---|---|
| directus.com | `@directus/sdk@25.0.0`, z typami | **8/17**, sprostowanie wygaslo |
| onesignal.com | `@onesignal/node-onesignal@5.13.2` | 13/16 |
| axiom.co | `@axiomhq/js@2.0.0` | 13/17 |
| gandi.net | **zadnej paczki** | 4/9, mianownik mniejszy o 1, cudzy artefakt zniknal z wiersza |
| mux.com | `@mux/mux-node@15.0.0` | 11/16, **celowo bez zmiany** |

**Komplet kontroli po przemiecie, wszystko zielone:**
- 177 wierszy na 9.42, **0 sprzecznosci**, 21 liczb i 5 twierdzen o nazwanych vendorach **bez
  rozjazdu**, `awaitingRescan: 0`.
- **`errata`: wszystkie wpisy wygasly**, czyli przemiat poprawil kazdy wiersz, o ktorym wiedzielismy,
  ze klamie. To jest ta jedna linijka, dla ktorej sprostowanie directusa czekalo od 9.40.
- Szoste badanie na `/findings` nadal prawdziwe wobec danych, dostawa bez sprzecznosci, kadencja
  monitoringu zdrowa (najdluzsze czekanie 149 h przy alarmie od 8 dni), OpenAPI opisuje kazde pole.
- **Jeden werdykt gorszy: `kinde.com`, `mcp_present` 1 → 0**, i to nie jest regres z tej zmiany:
  „kazdy POST JSON-RPC wrocil pustym 2xx, takze pod sciezka, ktorej nikt nie publikuje". To ten sam
  uczciwie niemierzalny przypadek, ktory stal tam poprzedniej nocy.

**Bramka atrybucji widzi swoje fakty we wszystkich 136 wierszach z wyszukiwarki**, a 130 werdyktow
`typed_package` stoi na paczce dopasowanej po wydawcy - z czego bierze sie wartosc dzisiejszej zmiany:
to jest najliczniejsza i najslabsza kategoria dowodu, jaka mamy, i wlasnie w niej znalezlismy wiersz
o cudzej firmie.

## ILE NAS NAPRAWDE KOSZTUJE LIMIT W REJESTRZE NPM (2026-08-19, zamyka otwarte pytanie z #48)

Ostatni komentarz do zadania #48 zostawil pytanie bez liczby: **„89 ze 177 skanow lapie limit w
rejestrze npm, a na tym stoi `typed_package` i cala atrybucja paczek"**. To jest fakt o zapytaniach.
Pytanie brzmi, ile z tego widac w opublikowanych wierszach, i dzis dalo sie je zmierzyc, bo mialem
pod reka **replay z pelnego cache'u rejestru**, czyli przebieg, w ktorym zaden limit nie mogl paść.

**Wynik: 160 wierszy nazywa te sama paczke, 16 nie ma jej po obu stronach, rozni sie JEDEN.**
`pdfmonkey.io` ma w korpusie „nie umielismy zidentyfikowac paczki", a replay znajduje `pdfmonkey`.

**I ten jeden wiersz najprawdopodobniej nie jest o limicie:** ma `rateLimited: false`, wiec nic w
skanie nie zapisalo odmowy. Bardziej prawdopodobna przyczyna to **wlasna zmiennosc wyszukiwarki
rejestru** - ta sama, ktora `REPLAY_SHUFFLE` w harnessie istnieje po to, zeby ujawniac. Uczciwe
zastrzezenie: replay czyta strony z migawki sprzed kilku godzin, wiec zmiana na samej stronie
vendora tez tlumaczylaby roznice, a przy jednym wierszu nie da sie tych przyczyn rozdzielic.

**Co z tego wynika:** szkoda z limitow rejestru jest **ponizej naszego wlasnego progu szumu (0,59 %)**,
czyli w tej samej klasie co roznica miedzy dwoma identycznymi przemiatami. Konstrukcja, ktora to
absorbuje, juz istnieje i nie trzeba jej dokladac: nieopłacone zapytanie liczy sie jako „nie wiemy",
a kandydat, ktorego nie dalo sie wycenic, **uniewaznia odpowiedz** zamiast oddawac gorsza. Do tego
przemiat idzie dwoma przebiegami wlasnie dlatego, ze pierwszy jest zimny.

**Ten jeden wiersz jest juz poprawiony, i to potwierdza diagnoze.** Pojedynczy swiezy skan znalazl
`pdfmonkey@1.0.0` z typami, wiec **9/15 zamiast 8/14**: odpowiedz przemiatu byla przejsciowym pudlem
wyszukiwarki, dokladnie tak, jak radzi `after-reseed` („przeskanuj pojedynczo, ZANIM uznasz to za
regres"). Karencji to nie rusza, bo bramka patrzy na **mediane**, a mediana porusza sie dopiero, gdy
rusza sie wiekszosc korpusu - o to chodzilo w zmianie z `max()` na `median()`.

**PULAPKA OPERACYJNA, KTORA MNIE ZLAPALA I KTOREJ NIE BYLO NIGDZIE ZAPISANEJ:** `/api/scan?key=<token>`
**NIE zasiewa**. `fromConsole` czyta wylacznie **ciasteczko** `stackpick_console`, a `?key=` obsluguje
middleware tylko dla `/app`. Pierwszy skan pdfmonkey wygladal w odpowiedzi identycznie - te same 9/15
- i **nie trafil do korpusu wcale**, bo skan goscia z definicji do niego nie trafia. Poprawna forma:
`curl -H "cookie: stackpick_console=$TOKEN"`. Zapisane tez w runbooku dostawy i w KB.

**Czego ta liczba NIE mowi:** ze `typed_package` jest mocny. **136 ze 177 wierszy stoi na
`registry-search`**, czyli na najslabszej klasie dowodu, jaka mamy - i to jest powod, dla ktorego
dzisiejsza zmiana (slowa paczki rozstrzygaja) dotyka wlasnie tej polowy, a bramka z #46 oznacza wiele
z nich jako niemierzalne zamiast je punktowac.

## JEDENASCIE AUDYTOW MOGLO POWIEDZIEC „TRZYMA SIE WSZEDZIE" NIE ZAPYTAWSZY O NIC (2026-08-19)

Znalezione przez **wykonanie instrukcji, ktora sama w sobie byla bledna**. STATE.md kazal po
przemiecie uruchomic `npx tsx scripts/audit-entry.mts accused`. Skrypt nigdy nie mial trybu
`accused`: bierze **liczbe wierszy**. `Number('accused')` to `NaN`, `slice(0, NaN)` jest puste, wiec
audyt sprawdzil **zero wierszy, zapytal o zero sciezek** i wydrukowal:

> `0 oblanych wierszy, 0 sciezek zapytanych`
> `zdanie trzyma sie wszedzie: pod zadna z wymienionych sciezek nie ma dzis pliku`

**To sa skrypty, ktorych cala praca polega na falsyfikowaniu naszych wlasnych zdan.** Bieg o zerowym
pokryciu konczacy sie uspokojeniem jest najgorsza odpowiedzia, jaka moga dac, i **jedenascie z nich
mialo dokladnie ten sam ksztalt** (`Number(process.argv[2] ?? N)`): agent-card, attribution,
llms-links, mcp, oauth, openapi, provisioning, selfserve, signup, signup-discovery, snippet-live.

Jeden wspolny `scripts/how-many.ts` odmawia teraz argumentu, ktory nie jest **dodatnia** liczba
(zero tez, bo zero to prosba o niemierzenie niczego). Straznik w `rules.mts` pilnuje, ze zaden audyt
nie wrocil do surowego `Number(process.argv[2]`, z kontrolka, ze sonda ten wzorzec w ogole widzi.

**Uruchomiony poprawnie, audyt wejscia potwierdzil zdanie na pelnym pokryciu: 121 oblanych wierszy,
2483 sciezki zapytane, ZERO plikow znalezionych.** Kolejka 21 niezgodnosci z poprzednich rund zeszla
do zera. `agent_entry_point` to najwieksza powierzchnia oskarzen w korpusie (133 oblane wiersze), wiec
to jest najdrozsze zdanie, jakie publikujemy o cudzych witrynach, i teraz stoi na 2483 zapytaniach,
a nie na `NaN`.

**Lekcja szersza niz ten blad:** instrukcja zapisana w STATE.md jest kodem, ktory wykonuje czlowiek
albo agent, i **starzeje sie tak samo jak kod**, tylko nikt jej nie kompiluje. Ta konkretna byla
nieprawdziwa od dawna i przez caly ten czas dawala zielona odpowiedz.

**Wiec przeszukalem wszystkie instrukcje** i znalazlem jeszcze jedna martwa: `npm run audit-signup
credited|accused` (ani takiego skryptu npm, ani takich trybow nigdy nie bylo). Poprawione, a straznik
sprawdza teraz, ze **kazda komenda wymieniona w `docs/` istnieje** - i celowo **tylko `docs/`**, bo to
sa instrukcje do wykonania, a STATE.md jest dziennikiem i ma prawo wspominac narzedzia, ktorych juz
nie ma. Codex slusznie zauwazyl, ze pierwsza wersja regula lapala wylacznie `.mts`, wiec przepuszczala
`reseed.sh` i `scan-cli.ts`, czyli akurat te wywolania, ktore najlatwiej zgnic.

**Ten sam ksztalt bledu siedzial w samej bramce buildu.** Cztery reguly w `rules.mts` stoja na
`.every(...)`, a `[].every(...)` jest **prawda**: dwie z nich (kazdy wpis katalogu ARD na naszej
domenie, wpis rejestru MCP wskazujacy nasz endpoint) przechodzilyby na **pustej liscie**, nie
sprawdziwszy niczego. Dolozone dwie reguly, ze te listy nie sa puste. Straznik, ktory przechodzi, bo
nie mial czego sprawdzic, jest straznikiem, ktorego nie ma.

## NARZEDZIE SPRAWDZAJACE NASZE OSKARZENIA SAMO NIE MIALO KONTROLKI (2026-08-19)

Ciag dalszy poprzedniej sekcji: skoro audyty mogly mierzyc zero, sprawdzilem, co mowia, gdy naprawde
mierza. `audit-mcp` zglosil **szesc adresow, ktore „jednak odpowiadaja"** przy `uploadthing.com` i
`imagekit.io`, czyli sugerowal, ze dwa opublikowane wiersze („nothing spoke MCP at ...") sa falszywym
oskarzeniem.

**Sprawdzilem to sam, wlasnym zapytaniem, ze sciezka kontrolna - i wiersze sa poprawne.**
`api.uploadthing.com/nonsense-8f3a1c` oddaje **identyczne** `{"error":"Missing API Key"}` 400, a
`api.imagekit.io/v1/nonsense-8f3a1c` identyczne 401. Te hosty zadaja klucza, **zanim cokolwiek
zrouteuja**, wiec odpowiedz pod adresem `/mcp` nie mowi nic o MCP. Trzecia para (403 „Invalid CSRF
Token" na `imagekit.io/mcp`) to zwykla ochrona ich aplikacji webowej przed kazdym POST-em.

**Bez tej kontrolki bylem o krok od zaliczenia dwom vendorom serwera MCP, ktorego nikt nie widzial.**
Narzedzie, ktorego cala praca polega na sprawdzaniu naszych oskarzen, samo nie mialo tego, czego
wymagamy od kazdej sondy: kontroli, ktora potrafi znalezc przypadek negatywny. Sprawdzacz wejscia
(`audit-entry`) ja ma od dawna, ten jej nie mial.

**Wdrozone:** `audit-mcp` pyta teraz o sciezke, ktorej nie ma, na tym samym hoscie i katalogu, i
rozdziela wynik na dwie listy: adresy, ktore odpowiadaja **inaczej** niz adres nieistniejacy (to jest
znalezisko), i adresy, pod ktorymi **host odpowiada tak samo wszedzie** (to nie jest dowod na serwer),
z kontrolka wydrukowana obok kazdego. Po zmianie: „zdanie trzyma sie wszedzie", szesc adresow w
drugiej liscie.

**Codex znalazl w moim wlasnym straznika dwa bledy, oba w te sama strone - w strone CISZY:**
1. Pusta odpowiedz kontrolki sprawiala, ze `includes('')` bylo prawda dla wszystkiego o tym samym
   statusie, wiec **prawdziwy serwer MCP odpowiadajacy 401 z challenge zostalby schowany jako szum**.
2. Po poprawce porownywalem `challenge:` (naglowek) z trescia odpowiedzi kontrolki, czyli dwie rozne
   rzeczy, ktore zawsze sa rozne - wiec bramka odpowiadajaca tym samym challenge wszedzie i tak
   zostawalaby „znaleziskiem".

Obie naprawione przez jedno: **ta sama funkcja liczy „jak odpowiedzial" dla adresu i dla kontrolki**,
a gdy kontrolka nie powiedziala nic, adres zostaje znaleziskiem. Uciszenie prawdziwego znaleziska to
jedyny blad, ktorego ta kontrolka miec nie moze.

**Sprawdzilem potem pozostale osiem sond audytowych i zadna z nich tego nie potrzebuje** - i to nie
jest przeoczenie, tylko wniosek z jednego rozroznienia. `audit-oauth` uznaje dokument dopiero, gdy ma
`issuer` albo `authorization_endpoint`; `audit-openapi` gdy ma klucz `openapi` albo `swagger`;
`audit-agent-card` gdy ma `url`, `skills`, `capabilities` albo `protocolVersion`. **Predykat, ktory
nazywa dokument, nie da sie nabrac na brame zadajaca klucza.** `audit-mcp` byl jedyny z predykatem
**bezksztaltnym** (naglowek challenge albo dowolny typ JSON), wiec byl jedyny do nabrania. Kontrolka
jest potrzebna tam, gdzie sonda pyta „czy cokolwiek odpowiada", a nie tam, gdzie pyta „czy odpowiada
TO".

**A skaner ma to wszystko od dawna i w mocniejszej wersji**, co sprawdzilem w `probeMcpEndpoints`:
kontrolka w **wlasnym katalogu kandydata** (nie w korzeniu, bo `njal.la` odpowiada tym samym tekstem
pod calym `/api/`), osobna kontrolka na **niezarejestrowanym hoscie** dla bram z wildcardem, regula
dyskredytujaca **tylko przy tym samym statusie**, i tell po **ciele HTML** (interstitial Cloudflare
kontra 27 bajtow JSON-a od prawdziwego serwera). Czyli opublikowane wiersze byly bezpieczne; slabe
bylo **narzedzie, ktore je audytuje**. Jego dokumentacja mowi wprost, ze jest **celowo grubsze** niz
check, zeby nie budowac drugiej opinii o tym, co liczy sie za serwer - i to jest sluszne, ale tej
nocy pokazalo swoja cene: grubsze bez kontrolki **krzyczy wilk**, a czlowiek po drugiej stronie
(czyli ja) prawie na ten krzyk zareagowal zmiana punktacji.

## PODSUMOWANIE, KTORE NIE ZALEZALO OD POMIARU (2026-08-19)

Trzeci wariant tej samej rodziny w ciagu jednej nocy, tym razem znaleziony przez uruchomienie
audytow, ktorych nie ma w standardowym komplecie po przemiecie.

`audit-remedies` konczyl sie zdaniem **„Mocny sygnal znalazl DZIS 2 prawdziwe sprzecznosci"** -
wpisanym z reki, drukowanym **niezaleznie od wyniku przebiegu**. Przeczytalem to jak dzisiejsze
znalezisko i zaczalem szukac dwoch sprzecznosci, ktorych ten przebieg nie zglosil. Teraz skrypt mowi
osobno **co znalazl ten przebieg** (dzis: **0 mocnych sygnalow, 5 slabych**) i osobno, co dala
historia. Rada naprawcza jest wiec dzis czysta.

`audit-markdown` bez argumentow drukowal spokojne „0 sprawdzonych, 0 negocjuje markdown" i konczyl
sie zerem, choc **jego wlasna dokumentacja mowi**, ze bez kontrolki bieg pustych odpowiedzi nie mowi
nic i ze wlasnie tak powstalo kiedys dwadziescia falszywych oskarzen. Teraz odmawia, gdy nie dostal
ani jednej domeny.

**Trzy warianty, jedna zasada:** zdanie koncowe narzedzia pomiarowego ma **zalezec od pomiaru**.
Argument, ktory nie jest liczba (jedenascie skryptow), lista pusta (`[].every`), i podsumowanie
wpisane z reki (to) - wszystkie trzy daja zielone swiatlo, ktorego nikt nie zapalil.

## AUDYT WIERSZY, KTORE ZALICZYLISMY - I TRZY FALSZYWE PUNKTY, KTORE ZNALAZL (2026-08-19)

Wszystkie dotychczasowe audyty pytaja, czy nasze **oskarzenie** jest nadal prawdziwe. Zaden nie
pytal o wiersze, ktorym **przyznalismy punkt**, a to tam blad kosztuje wiecej: oskarzenie vendor
odbije, a niezasluzony punkt zostaje w danych i w raporcie branzowym.

**`npm run audit-published-urls` istnial i byl nieuruchamialny.** Czytal adresy ze stdin w formacie,
ktorego nie opisywal zaden runbook, zaden skrypt npm i zadna sekcja STATE.md, wiec uruchomiony
wprost drukowal „0 adresow sprawdzonych, 0 nie odpowiada" - ksztalt narzedzia, ktore nigdy nie
chodzilo. Dolozony `scripts/published-urls.mts`, ktory wyciaga adresy z zywego korpusu, i jedna
komenda w `package.json`.

**Cztery poprawki, zanim jego wynik zaczal cokolwiek znaczyc**, i kazda to ten sam ksztalt - alarm
o czyms, co nie jest bledem:
- 152 „martwych" adresow to **niezistniejace hosty kandydackie** `oauth_dcr` (`login.<vendor>`,
  `auth.<vendor>`), czyli dokladnie to, co zdanie twierdzi. Host bez metadanych nie jest martwym
  dowodem, tylko potwierdzeniem.
- 3 „martwe" strony dokumentacji, bo skrypt **wysylal POST z uchwytem MCP** pod adres, ktory jest
  strona, a nie endpointem. `docs.rollbar.com`, `uploadcare.com` i `docs.weaviate.io` oddaja 200
  na GET. Fallback ograniczony potem do adresow **wygladajacych na strone**, bo inaczej martwy
  endpoint na hoscie ze stroną-smietnikiem raportowalby sie jako zywy (znalezione przez codeksa).
- 2 adresy urwane na `>` i na cudzyslowie typograficznym, ktore skrypt brał za czesc adresu.
- **165 → 3.** Zostaly trzy, wszystkie przeczytane recznie: jeden to sciezka POST cytowana z
  dokumentacji cal.com (nie twierdzimy, ze odpowiada na GET), jeden to adres urwany juz w cytacie
  w korpusie, jeden to `uploadcare.com/_mcp/server`, ktorego zdanie mowi, ze tam szukalismy, a ta
  strona nie istnieje.

**Nowy `npm run audit-entry-credited` pyta o punkt, nie o oskarzenie**, i pyta w jedyny sposob,
ktory to obnaza: czy plik, za ktory placimy punktem, rozni sie od sciezki, ktora **nie moze
istniec**, zapytanej na **tym samym hoscie** i z **tym samym rozszerzeniem**. Obie polowy sa
konieczne, co zmierzylem: `docs.bigcommerce.com/letagentsin-audit-probe-8f3a1c` oddaje 404 i 340 kB
HTML-a, a ta sama sciezka **z `.md`** oddaje **200 i 374 bajty markdownu „# Page Not Found"**.

**Trzy falszywe punkty, kazdy potwierdzony recznie:**
| vendor | plik, za ktory zaliczylismy | co jest naprawde |
|---|---|---|
| bigcommerce.com | `agent-signup.md`, `skill.md`, `ai.txt` | dwa soft-404 w markdownie (200), trzeci twardy 404 |
| sentry.io | `/.well-known/mcp.json` | 976 bajtow „You've hit the web UI", bajt w bajt jak kontrolka |
| calendly.com | `developer.calendly.com/skill.md` | 298 102 bajty HTML-a, bajt w bajt jak kontrolka |

**PRZYCZYNA, i to jest szosty raz tej nocy ten sam ksztalt:** skaner **ma** kontrolke na catch-all i
ma ja per host, ale gdy **kontrolka nie odpowie** (budzet 27 sekund, a kontrolka calendly to 298 kB),
`answersWithTheSameTemplate` dostaje `undefined` i zwraca `false`, czyli **„nie wiem" znaczy „vendor
dostaje punkt"**. Ponowny skan `bigcommerce.com` z konsoli daje dzis **0/2** i zdanie o 23 sciezkach,
wiec obrona dziala - zawodzi tylko wtedy, gdy sama nie dojdzie.

**NASTEPNA POZYCJA (nie zaczeta, bo wymaga przemiatu do weryfikacji):** kontrolka, ktora nie
odpowiedziala, ma czynic check **niemierzalnym**, a nie zaliczonym. To zmiana punktacji, wiec formula
9.43 i przemiat - karencja otwiera sie okolo 09:00. Blast radius zmierzony z gory: 3 wiersze z 43
zaliczonych.

**I ostatnia ironia, zlapana przez codeksa:** moj wlasny nowy audyt, napisany tej nocy przeciwko
uspokojeniu bez pomiaru, **uspokajal bez pomiaru**, gdy zapytanie sie nie udalo - liczyl probe jako
porownanie. Teraz liczy osobno **porownania**, wypisuje pominiete i odmawia werdyktu przy zerze.

## 9.43: KONTROLKA, KTORA NIE ODPOWIEDZIALA, PRZESTAJE PLACIC (2026-08-19)

Naprawa przyczyny trzech falszywych punktow z poprzedniej sekcji. Skaner **ma** kontrolke na
catch-all, ma ja per host i per rozszerzenie, i ona dziala - zawodzi tylko wtedy, gdy **sama nie
dojdzie**. Wtedy `answersWithTheSameTemplate` dostawalo `undefined`, zwracalo `false`, i „nie wiem"
znaczylo „vendor dostaje punkt". Budzet skanu to 27 sekund, a kontrolka calendly.com to 298 kB.

**Zmiana w trzech miejscach, wszystkie w jedna strone - w strone wstrzymania punktu:**
- `CatchAll` niesie teraz `answered` per przestrzen nazw. Kontrolka **wiarygodna** to taka, ktora
  wrocila i wrocila **o sciezce, a nie o nas**: `status > 0`, bez odmowy brzegowej i **bez 429**.
- Plik, ktorego nie da sie porownac, jest oznaczony jako niepewny i **wypada z punktowania
  pojedynczo**, a nie dopiero gdy wszystkie sa niepewne. Gdy nie zostaje nic pewnego, check jest
  **niemierzalny**, nie oblany: nie wiemy, czy vendor ma plik, i tak to mowimy.
- Niepewne trafienie **nie zatrzymuje sondowania**: wczesniej liczylo sie jak znalezisko, wiec
  przerywalo szukanie wielkich liter i hosta dokumentacji, gdzie moze lezec plik prawdziwy.

**Codex przeszedl przez to piec razy i za kazdym razem mial racje**, co przy zmianie punktacji jest
warte tych piatek:
1. `every` zamiast filtrowania pojedynczo: vendor z prawdziwym deskryptorem i fantomowym `skill.md`
   nadal dostawal dwa punkty za fantom.
2. Zdanie przy samym deskryptorze wypisywalo `usable`, wiec **wymienialo jako znaleziony ten plik,
   za ktory wlasnie odmowilismy zaplaty**.
3. Niepewne trafienie zatrzymywalo sonde przed hostem dokumentacji (opisane wyzej).
4. Odmowa brzegowa na kontrolce liczyla sie jako odpowiedz.
5. **429 wypada z `isEdgeRefusal` celowo** - nasza wlasna regula mowi, ze 429 to nasze obciazenie, a
   nie sciana vendora. To jest sluszne w werdykcie o vendorze i **bledne w kontrolce**, bo limit nie
   mowi nic o tym, co host serwuje pod adresem, ktorego nikt nie rejestrowal. Nazwany osobno.

**Ta sama dziura o warstwe dalej, w MCP (`da74f96`).** `mcp_present` czytal 401/403/202 przez
`got.status !== control?.status`, ktore jest **prawda, gdy kontrolka w ogole nie odpowiedziala**
(status 0), wiec host odmawiajacy pod kazdym adresem dostawal punkt za serwer na podstawie pytania,
ktore sie nie odbylo. Teraz adres bez wiarygodnej kontrolki idzie na liste
`unmeasuredForWantOfAControl` i check jest **niemierzalny**, nie zaliczony i nie oblany.

Codex znalazl przy tym drugie dno, ktorego sam nie widzialem: sonda MCP ma **dwie fale** (zgadywane
hosty, potem adresy z ICH stron dokumentacji), a scalanie brało z drugiej fali **tylko endpointy** -
slusznie, bo druga fala nie wie nic o karcie ani o brzegu. Skutkiem ubocznym gubila jednak swoje
wlasne „nie dalo sie zmierzyc", wiec **dwa milczenia byly publikowane jako jedno pewne „nie maja
serwera"**. Scalanie jest teraz jedna funkcja `mcpAcrossWaves` z wlasnymi straznikami (mutacja
sprawdzona: bez laczenia list `rules.mts` oblewa).

**Przeszedlem potem cala sonde MCP w poszukiwaniu tego samego ksztaltu i znalazlem jeszcze dwa
(`ad080ab`):**
- **405.** `methodRefusalIsRouted` konczylo sie na `frontPageStatus !== got.status`, co jest prawda,
  gdy strona glowna **nie odpowiedziala**. Wiec 405 na zwyklej stronie stawal sie „routowany
  endpoint", gdy tylko kontrolka milczala. Codex dolozyl do tego P1, ktory sam bym przegapil:
  `fetchUrl` nie zwraca `undefined`, tylko obiekt ze **statusem 0 albo 429**, a te tez roznia sie od
  405. Sam status nie wystarczy - trzeba go podac dopiero wtedy, gdy kontrolka cos powiedziala.
- **browser-only.** Odmowa „ta sciezka wymaga przegladarki" byla odrzucana tylko `if (control && ...)`,
  wiec brak kontrolki oznaczal **zaliczenie**.

Ksztalt jest zawsze ten sam i wart nazwania raz: **porownanie z czyms, czego nie ma, zwraca „rozni
sie"**. `x !== brak` to prawda, `x === brak` to falsz, i obie odpowiedzi ida w strone vendora na
minus albo na plus, ale nigdy w strone „nie wiem". Kazde takie porownanie potrzebuje zdania
„kontrolka sie odezwala" **przed** soba.

**Sprawdzilem tez trzecia droge i tam naprawa NIE jest potrzebna**, co warto zapisac, zeby nikt jej
nie robil drugi raz: zapytanie zabite przez deadline skanu (`Out of time ... in flight`) **nie**
udaje odpowiedzi, bo kazda sciezka `fetchUrl` przechodzi przez `countIfLost`, a faza, ktora
cokolwiek stracila, oznacza **wszystkie swoje checki jako niemierzalne** (`truncationOf`). Raport
mowi to wprost. Zmiana semantyki `unasked` byloby wiec przeliczeniem korpusu bez powodu.

**Straznik na sprostowanie directusa zdjety**, bo jego zadanie sie skonczylo: naprawa weszla w 9.42,
przemiat przeliczyl korpus, `after-reseed` potwierdzil wygasniecie. Regula pilnujaca terminu jednego
wpisu jest z natury tymczasowa, a trzymana po naprawie **oblewa build za to, ze naprawa doszla**.

**Stan: kod na 9.43, korpus na 9.42.** Przemiat wymaga karencji, ktora po przemiecie z 03:01 otwiera
sie **okolo 09:00**. Blast radius zmierzony z gory: **3 wiersze z 43 zaliczonych** (bigcommerce.com,
sentry.io, calendly.com), i po przemiecie kazdy z nich ma byc **niemierzalny albo oblany**, nie
zaliczony. Sprawdzenie: `npm run audit-entry-credited` ma pokazac zero plikow nieodroznialnych.
Dla MCP nie ma predykcji z gory, bo lista niemierzalnych adresow powstaje dopiero w skanie: po
przemiecie sprawdzic, ile wierszy ma `mcp_present` niemierzalny i czy kazdy z nich nazywa adres.

**Pomiar bazowy przed przemiatem, 2026-08-19 06:15, pelne 43 zaliczone wiersze** (wczesniejszy
przebieg czytal tylko 12, bo `howManyRows` ma domyslne 60 **domen**, nie zaliczonych wierszy - przy
177 wierszach trzeba podac liczbe recznie: `npx tsx scripts/audit-entry-credited.mts 200`):

| wiersz | co dzis widac |
|---|---|
| calendly.com | `developer.calendly.com/skill.md` **nadal nieodroznialny** od kontrolki (ten sam HTML) |
| sentry.io | kontrolka **nie odpowiedziala w tym przebiegu**, wiec audyt o tym wierszu nic nie mowi - i to jest dokladnie ten stan, ktory 9.43 ma publikowac jako niemierzalny |
| bigcommerce.com | **juz nie wychodzi** jako nieodroznialny; ponowny skan dawal 0/2, wiec przemiat ma to tylko utrwalic |

Razem: **45 plikow zapytanych, 44 porownanych, 1 nieodroznialny, 1 bez porownania**. Po przemiecie
ten sam przebieg ma dac **zero nieodroznialnych**, a wiersz bez porownania ma miec `agent_entry_point`
niemierzalny zamiast zaliczonego.

## CENNIK PRZYZNAJE SIE DO TEGO, DO CZEGO PRZYZNAWAL SIE TYLKO RUNBOOK (2026-08-19)

`docs/delivering-a-report.md` od dawna mowi, ze **miesieczna polowa monitoringu nie ma za soba
harmonogramu**: trzy crony na tej aplikacji odswiezaja rejestr MCP, limity i checki tygodniowe, a
piec biegow agentowych miesiecznie uruchamia czlowiek. `/pricing` sprzedawal w tym czasie „Real
agents every month" i nie mowil o tym ani slowa. Przyznanie sie lezalo w pliku, do ktorego kupujacy
nie ma dostepu, czyli tam, gdzie nic nie kosztuje.

Cennik ma teraz pytanie **„Is the monthly agent run automatic?"** i odpowiedz, ktora nie owija:
tygodniowa polowa jest na harmonogramie, miesieczna nie, bieg kosztuje prawdziwe pieniadze na cudzych
narzedziach, a mail przychodzi w dniu, ktory wybieramy, a nie tego samego kazdego miesiaca.

**Straznik wiaze oba zdania.** Dopoki runbook zawiera „The monthly half of monitoring has no schedule
behind it", cennik musi zawierac „The five agent runs are started by a person" - inaczej build
oblewa. Gdy harmonogram wreszcie powstanie, oblewa tak samo i zmusza do przepisania obu miejsc
zamiast zostawienia na stronie zdania, ktore przestalo byc prawda.

**Sama decyzja - cron czy przypomnienie z nazwiskiem - zostaje na Krystiana razem z billingiem.**
Dzis nikt nie placi, wiec nic nie zmusza do wyboru mechanizmu dzisiaj; zmusza wylacznie do tego, zeby
strona nie obiecywala harmonogramu, ktorego nie ma.

**Przy okazji zlapalem wlasnego bubla w `rules.mts`, wart zapisania, bo jest podstepny:** dopisalem
nowa regule na **koniec pliku**, a plik konczy sie `process.exit`. Regula drukowala sie na zielono i
**nigdy nie mogla oblac** - martwy kod udajacy pomiar. Jest teraz strażnik na sam ten plik: nic z
`check(` nie moze stac za `process.exit`. Sonda szuka **ostatniego** wystapienia tego napisu, bo
pierwsze dwa to jej wlasne literaly, czyli ten sam ksztalt „porownanie z samym soba" w trzecim
przebraniu tej nocy.

## DZIESIEC AUDYTOW CZYTALO CWIERC KORPUSU I NIE MOWILO O TYM (2026-08-19)

Znalezione przypadkiem, przez wlasna pomylke: przeczytalem „43 zaliczone wiersze, zero
nieodroznialnych" i dopiero drugi przebieg pokazal, ze **pierwszy przeczytal 12**. `howManyRows` ma
domyslna liczbe **domen**, nie wierszy, wiec `audit-entry-credited` bral 60 ze 177 - a `audit-mcp`,
`audit-oauth`, `audit-openapi`, `audit-provisioning`, `audit-selfserve`, `audit-signup`,
`audit-signup-discovery`, `audit-snippet-live`, `audit-llms-links` i `audit-entry` bralo od 25 do 40.
Kazdy z nich konczyl zdaniem, ktore czyta sie jak wypowiedz o calym korpusie.

To ten sam blad, co reszta tej nocy, tylko o pietro wyzej: **nie fałszywy pomiar, tylko prawdziwy
pomiar czegos mniejszego, niz sugeruje zdanie pod nim.**

`howManyRows(fallback, population)` drukuje teraz **„czytam N z M; reszta POMINIETA"**, gdy sufit jest
nizszy od populacji, a straznik w `rules.mts` szuka w `scripts/` kazdego wywolania z jednym
argumentem i oblewa build.

**Codex zdjal z tego dwie warstwy, obie moje wlasne, obie tego samego rodzaju co reszta nocy:**
1. Sufit tnie **dwie rozne rzeczy**. W polowie audytow kroi liste wprost (`slice(0, most)`), ale w
   drugiej polowie liczy wiersze **pasujace**, a petla i tak idzie przez cala liste. Tam ogloszenie
   „czytam 30 ze 177" **zglaszalo pominiecie, ktorego nie bylo**. Te audyty raportuja teraz na koncu
   petli, a nie na starcie.
2. Ale `matched >= cap` na koncu **tez nie znaczy obciecia**: ostatni pasujacy wiersz moze byc
   ostatnia domena na liscie. Liczy sie wiec `visited`, czyli domeny, przez ktore petla naprawde
   przeszla. Znowu licznik udajacy rzecz, ktora tylko **zwykle** implikuje.

Pierwszy pelny przebieg czegos, co dotad chodzilo po 30 wierszach: `audit-openapi` na calym korpusie
to **49 oblanych wierszy i 508 zapytan**, i zdanie trzyma sie wszedzie. `audit-selfserve` na calym
korpusie: **18 dopasowan**, `audit-provisioning`: **25 adresow potwierdzonych jako martwe**. Wyjatki nazwane z imienia: `audit-agent-card` (jego liczba to **krok
probkowania**, nie sufit) i sam `rules.mts`, bo trafialby we wlasne literaly w kontrolkach - trzeci
raz tej nocy, kiedy sonda znajduje sama siebie.

## 9.44: KLUCZ W CUDZEJ KONSOLI TO NIE ICH SCIEZKA (2026-08-19)

Znalezione przez `audit-published-urls`, ktory zapytal **1529 adresow, ktore publikujemy jako dowod**,
i znalazl **3 martwe**. Dwa z nich siedzialy na wierszach, ktore **zaliczylismy**:

1. **growthbook.io** trzymal punkt za programatyczny provisioning na zdaniu z ICH dokumentacji:
   „Create a new service account under [IAM & Admin → Service Accounts](https://console.cloud.google.c…)".
   To instrukcja stworzenia konta uslugowego **Google** przy podlaczaniu BigQuery. Slowa sa ich,
   **poswiadczenie nie**, a ten check pyta, czy vendor dokumentuje droge do **wlasnego** klucza bez
   czlowieka. Ten sam ksztalt co 9.42 przy paczkach: **link decyduje, o czyim produkcie jest dowod**.
2. **cal.com** cytuje `https://api.cal.com/v2/api-keys/refresh`, ktory odpowiada 404 na zapytanie bez
   klucza. To **falszywy alarm audytu**, nie falszywy punkt: cytat jest z ich dokumentacji, a check
   pyta o to, co dokumentuja, nie o to, czy my tam wejdziemy bez poswiadczenia. Zostawione.
3. **uploadcare.com** (wiersz oblany, wiec slabsze): zdanie mowilo „nor at any address in
   `https://uploadcare.com/_mcp/server`", a ta strona jest **404**. Wymienialismy strony, o ktore
   **zapytalismy**, a nie te, ktore przeczytalismy - czyli „szukalismy i nie znalezlismy" o stronie,
   ktorej nie ma. Teraz `followed` zawiera tylko strony, ktore odpowiedzialy.

**Blast radius zmierzony przed zmiana: 1 z 63 zaliczonych wierszy** provisioningu cytuje adres spoza
domeny vendora. Regula jest wiec o jednym zdaniu dzis, a nie o przeczesaniu checku.

**Codex zdjal z tego dwie warstwy, obie trafione:**
1. Pierwsza wersja czytala tylko markdown, bo `visibleProse` wyrzuca tagi razem z `href`. Zwykly
   `<a href="...">` - czyli to, co skaner naprawde dostaje - przechodzil dalej, a growthbook zlapal
   sie **tylko dlatego, ze ich zrodlo markdown wycieklo na strone**. Obcy link wraca teraz do prozy
   jako `[etykieta](adres)`, ale **wylacznie obcy**: wpisywanie tam wlasnych adresow vendora
   wypychaloby slowa potwierdzajace poza okno 70 znakow i po cichu przeliczaloby checki, o ktore w
   tej zmianie nie chodzi.
2. **Sam obcy adres w oknie to za malo.** „Create an API key programmatically, then test it with our
   [Postman collection](https://postman.com/…)" to vendor dokumentujacy **wlasny** klucz, a regula
   czytajaca kazdy obcy adres jako dyskwalifikacje zabralaby punkt za zdanie, ktore go dowodzi.
   Decyduje **etykieta linku**: gdy nazywa poswiadczenie („Service Accounts"), klucz powstaje po
   tamtej stronie; gdy nazywa cos innego („Postman collection"), zdanie nadal jest o vendorze.
   Kontrolka z tym zdaniem stoi w `rules.mts` i **oblewalaby pierwsza wersje**.

**Trzecia rzecz, moja wlasna, warta zapisania jako pulapka narzedziowa:** przy przepisywaniu tej
funkcji `str.replace('', X)` w skrypcie pomocniczym wstawilo caly blok **na poczatek pliku**, przed
importy, i TypeScript zglosil to jako duplikat funkcji. Pusty wzorzec w `replace` nie jest bledem,
tylko wstawieniem na pozycji zero.

## CO MA POKAZAC PRZEMIAT NA 9.44, ZAPISANE PRZED NIM (2026-08-19, 06:55)

Przemiat startuje sam, gdy **mediana wieku korpusu** dojdzie do 6 h (o 06:48 bylo 4.12 h, wiec okolo
**08:45**). Czeka `/tmp/reseed-943.sh`, log `/tmp/reseed-943.log`. Nazwa pliku i jeden `echo` w nim
mowia „9.43", bo powstal przed 9.44 - **nie ruszac go w trakcie**, bash doczytuje skrypt z pliku i
edycja dzialajacego skryptu potrafi go rozjechac. Wersje bierze `scripts/reseed.sh` z kodu, czyli
**9.44**.

Do sprawdzenia po nim, po kolei:

1. **`npm run audit`** ma powiedziec `177 rows on formula 9.44, 0 contradictions`.
2. **`npx tsx scripts/audit-entry-credited.mts 200`** ma dac **zero plikow nieodroznialnych**
   (przed: 1 nieodroznialny - calendly.com, i 1 bez porownania - sentry.io).
3. **bigcommerce.com, sentry.io, calendly.com**: `agent_entry_point` ma byc **niemierzalny albo
   oblany**, nigdy zaliczony.
4. **growthbook.io**: `programmatic_provisioning` ma **stracic punkt** albo stanac na innej frazie -
   ale nie na zdaniu o konsoli Google.
5. **uploadcare.com**: zdanie `mcp_present` **nie ma juz wymieniac** `https://uploadcare.com/_mcp/server`,
   bo ta strona jest 404.
6. **`mcp_present` niemierzalny**: policzyc, ile wierszy go tak ma i czy **kazdy nazywa adres**. Przed
   przemiatem zero, bo to nowa galaz - jesli po przemiacie tez zero, to znaczy albo ze kontrolki
   wszedzie dochodza (dobrze), albo ze galaz jest martwa (do sprawdzenia recznie na jednym hoscie).
7. **`npm run audit-published-urls`** ma dac **mniej niz 3 martwe** (przed: 3, z czego cal.com jest
   falszywym alarmem audytu i ma zostac).
8. Dopiero potem: **odswiezyc probke** `/d/sample` (dzis niesie „formula v9.41"):
   `MONGODB_URI=$(heroku config:get MONGODB_URI -a stackpick) npx tsx scripts/client-report.mts filestack.com --publish --id sample --sample`
   Bez `--sample` dokument **nie pokaze sie z cennika**, bo link renderuje sie tylko dla dostawy
   oznaczonej jako probka - i to jest zabezpieczenie, nie usterka.
9. **Zrzuty do katalogu konektorow**, dopiero po punkcie 8, bo zrzut z numerem starej formuly zyje w
   katalogu latami. Recepta (sprawdzona, KB `zrzuty-ekranu-1000px-bez-czlowieka`):
   `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --hide-scrollbars --screenshot=out.png --window-size=1440,1000 <url>`
   Strony warte zrzutu: `/d/sample`, `/`, `/methodology`, `/findings`, `/pricing`.

## PIERWSZE PELNE PRZEBIEGI AUDYTOW, ZAMIAST PROBEK (2026-08-19, 07:00)

Po zdjeciu niemych sufitow (`088c57f`) puscilem cztery audyty na **calym korpusie 177 domen**
zamiast na 25-40 wierszach. Zadne z nich nie znalazlo sprzecznosci, i to jest wynik, ktorego przedtem
nie mielismy - poprzednie „zdanie trzyma sie wszedzie" dotyczylo cwiartki:

| audyt | zasieg | wynik |
|---|---|---|
| `audit-openapi` | 49 oblanych wierszy, **508 zapytan** | ani specu pod zwyklymi sciezkami, ani deklaracji, ani markdownu w negocjacji |
| `audit-selfserve` | 18 dopasowan | kazde do przeczytania recznie, zero sprzecznosci |
| `audit-provisioning` | 25 adresow | wszystkie potwierdzone jako martwe |
| `audit-snippet-live` | **86 opisow przeczytanych na zywo** | w zadnym nie widac kwoty ani warunku wejscia, ktorego regula by nie skredytowala |
| `audit-llms-links` | 25 wierszy ze zdaniem o martwym linku | **kazdy adres, o ktorym mowimy, ze go nie ma, odpowiada 404** |

Do tego cztery audyty lokalne (`headlines`, `delivery`, `our-api`, `remedies`): zero mocnych
sygnalow, piec slabych, wszystkie znane i nieszkodliwe.

## JOB, KTORY NIGDY NIE ZADZIALAL, I NIKT TEGO NIE ZAUWAZYL (2026-08-19, 07:15)

Wyszlo z liczby, ktora `after-reseed.mts` drukuje po kazdym przemiacie i na ktora nikt nie patrzyl:
**„lustro rejestru MCP zsynchronizowane 32.6 h temu"**, przy jobie opisanym jako **dzienny**.

`gh run list --workflow=mcp-registry.yml`: **dwa przebiegi, oba oblane, oba w osiem sekund**. Czyli
job nie zadzialal **ani razu**. Przyczyna trywialna i cala w jednej linii: repo ma `pnpm-lock.yaml`,
a workflow wola `npm ci`, ktore bez `package-lock.json` odmawia. Trzy pozostale workflow'y zyja, bo
nie instaluja niczego - tylko strzelaja curlem.

**Dlaczego to jest grozne, a nie kosmetyczne:** lustro jest czytane jeszcze przez **siedem dni**
(`MIRROR_TTL_MS`), a potem `mcp_present` staje sie **niemierzalny na calym korpusie**. Lustro wypelnil
recznie czlowiek 2026-08-17, wiec cisza zaczelaby sie **2026-08-24** i w aplikacji nie byloby zadnego
sladu przyczyny. To jest dokladnie ten ksztalt, ktorego szukamy w werdyktach - **brak dowodu udajacy
dowod** - tyle ze w infrastrukturze.

**Zrobione teraz:**
- **Lustro odswiezone recznie**, przed przemiatem, bo przemiat je czyta: 15 stron, 973 zdalne adresy,
  **346 hostow zaktualizowanych**, `zsynchronizowane 0.0 h temu`, 9513 hostow w sumie.
- **Workflow poprawiony na `pnpm/action-setup` + `pnpm install --frozen-lockfile`** (wersja 10.33.2 z
  `packageManager`), plus **straznik w `rules.mts`**: zaden plik w `.github/workflows` nie moze wolac
  `npm ci`, dopoki repo stoi na pnpm.
- `after-reseed.mts` liczy teraz takze **niemierzalne z 9.43** - osobno dla `mcp_present` i dla
  `agent_entry_point` - i wypisuje po piec przykladow z adresem, bo „zero" bez przykladu nie odroznia
  dzialajacej galezi od martwej.

**CZEGO NIE ZROBILEM I DLACZEGO:** poprawka workflow **nie jest wypchnieta na GitHub**, bo push do
`origin` to nie deploy i guardrail mowi wprost „nie pushuj, jesli nie poproszono". Nie odpalilem tez
recznie `workflow_dispatch`, bo to job manualny. **Do zrobienia rano, dwie komendy:**
`git push origin main` i `gh workflow run mcp-registry.yml`. Do tego czasu lustro jest swieze recznie
i ma **siedem dni** zapasu.

## PRZECZYTALEM WYGENEROWANY RAPORT JAK KUPUJACY I ZNALAZLEM DWIE RZECZY (2026-08-19, 07:25)

Wygenerowalem platny raport dla `growthbook.io` nie po to, zeby sprawdzic kod, tylko zeby go
**przeczytac tak, jak czyta go ktos, kto za niego zaplacil**. Dwie rzeczy widac dopiero stamtad:

**1. Piec z dziewieciu cytatow bylo po polsku.** Dokument jest po angielsku i sprzedawany
anglojezycznemu vendorowi, a polowa cytowanych odpowiedzi to zdania, ktorych on nie przeczyta.
Przyczyna jest znana i **juz opisana w metodologii jako kontaminacja**: cele claude chodza na
maszynie, ktorej instrukcje operatora prosza o polski. Nowe jest to, ze **nikt nie powiedzial o tym
kupujacemu w miejscu, w ktorym to widzi**.

Kazdy taki cytat ma teraz znacznik **`(in Polish)`**, a pod lista stoi zdanie z liczba, powodem i
jedna decyzja wprost: **nie tlumaczymy tego, co cytujemy**, bo przetlumaczony cytat jest naszym
zdaniem, a nie agenta. Regula rozpoznaje polski po znakach diakrytycznych, z `ó` wlacznie (codex:
„który produkt wybrać" nie ma innego ogonka), a jej granica jest **nazwana w kodzie i w kontrolce**:
polszczyzna bez ogonkow przechodzi tu jak angielski.

**Lekarstwem nie jest znacznik, tylko czysty przebieg:** przy najblizszym odswiezeniu cel puscic
claude z **neutralnym CLAUDE.md**, co naprawia jezyk i kontaminacje naraz. Karta na Musterze
(`produkt:biegi-claude-po-polsku`), bo to wydatek na tokeny, a nie decyzja techniczna.

**2. Cytat konczyl sie polowa adresu:** `„…[IAM & Admin → Service Accounts](https://console.cloud.google.c"`.
Okno ma 70 znakow i potrafi przeciac adres w pol. Dwa z 79 cytatow w korpusie tak wygladaly.
Poszerzenie okna byloby gorsze - cytowaloby slowa, ktorych regula nie czytala - wiec ucieta polowa
adresu **znika z cytatu**.

**Codex wchodzil w to trzy razy i za kazdym razem zwezal regule o jeden prawdziwy przypadek:**
1. Zdanie skonczone kropka (`Visit https://example.com/x.`) tez nie ma po adresie spacji, wiec
   pierwsza wersja kasowala **caly poprawny adres**.
2. Granica 70 znakow potrafi wypasc **dokladnie za** calym adresem, i wtedy tez nie ma po nim spacji
   **w oknie** - a adres jest caly.
3. Nawias zamykajacy na granicy zostaje **poza** oknem, wiec cytat niesie niedomkniete
   `[IAM](https://x`. Tylko **bialy znak** jest bezpiecznie poza tokenem.

Koncowa regula jest jednym zdaniem: **okno skonczone kropka, koncem strony albo spacja niczego nie
przecielo; wszystko inne przecielo.**

## DRUGI DOKUMENT, KTORY DOSTAJE PLATNIK, PRZECZYTANY TAK SAMO (2026-08-19, 07:35)

Po raporcie przeczytalem **miesieczny mail monitoringu** (`scripts/cell-email.mts`) jako odbiorca.
`audit-delivery` mowi o nim „zadne zdanie nie kloci sie z danymi" i to prawda - a mimo to dwie rzeczy
byly do poprawy, bo spojnosc z danymi to nie to samo, co uczciwosc wobec czytajacego:

**1. „What codex run 1 said about you".** Mail bierze **pierwszy** cytat, jaki ma, a naglowek czyta
sie tak, jakby bieg 1 byl werdyktem. Vendor wymieniony w 10 na 10 biegow moze dostac akurat to
jedno zdanie, ktore brzmi najgorzej - stripe.com dostawal cytat o tym, ze **Stripe Billing bierze
0,7% wolumenu i moga dojsc kolejne oplaty**. Zdanie jest prawdziwe i naprawde padlo, ale bylo
podane jak podsumowanie. Teraz mail mowi **„One of the 10 sentences the runs wrote about you (codex
run 1)"**, wiec liczba od razu pokazuje, ze reszta jest o jedno klikniecie dalej, a nie ze jej nie ma.

**2. Znacznik jezyka byl tylko w raporcie.** Ten sam cytat z tych samych biegow, drugi dokument, i
tylko jeden z nich mowil, ze zdanie jest po polsku. Komentarz w kodzie **wiedzial o problemie** i
rozwiazywal go przez atrybucje („two tools both have a run 1 and one of them answers in Polish"),
czyli mowil, **ktory bieg**, ale nigdy **jaki jezyk**. Teraz oba dokumenty niosa ten sam znacznik, a
straznik w `rules.mts` pilnuje obu plikow naraz - inaczej jeden z nich klamie przez przemilczenie.

**A potem znalazlem trzecie miejsce z tym samym cytatem:** `src/app/d/[id]/report-view.tsx`, czyli
**strona, w ktora kupujacy klika**. Markdown mowil „(in Polish)", portal nie mowil nic. To dokladnie
ten ksztalt, ktory ten kod znajduje u siebie w punktacji od trzech dni - **jeden fakt, dwa miejsca,
drugie po cichu nieprawdziwe** - tyle ze w warstwie prezentacji. Znacznik i zdanie wyjasniajace sa
teraz we wszystkich trzech renderingach, a straznik czyta wszystkie trzy pliki.

**Zamykajac ten watek: przeczytanie wlasnego produktu jako odbiorca dalo w jedna godzine piec
poprawek, ktorych zaden audyt danych nie mogl zlapac**, bo wszystkie zdania **zgadzaly sie z
danymi**. Spojnosc z danymi i uczciwosc wobec czytajacego to dwa rozne pomiary, a mamy narzedzia
tylko do pierwszego.

## „175 DOMEN" OBOK KORPUSU, KTORY MA 177 (2026-08-19, 08:05)

Czytajac `/report` jak obcy: naglowek mowi **„175 domains · formula v9.42"**, a `corpus.json` oddaje
**177 wierszy**. Roznica to dwa wiersze, ktore ktos przeskanowal na zywo po wdrozeniu 9.43, wiec
filtr wersji je wyrzucil - **slusznie**, bo mieszanie wersji porownywaloby liczby, ktore nigdy nie
byly porownywalne. Strona nie mowila o tym **ani slowa**.

To jest ten sam ksztalt, co nieme sufity w audytach kilka godzin wczesniej: **liczba z cichym
odejmowaniem w srodku**. I okno, w ktorym to widac, jest dokladnie tym, w ktorym ktos czyta te
strone: **miedzy wdrozeniem formuly a przemiatem**. Po przemiecie `heldBack` wraca do zera i problem
staje sie niewidzialny az do nastepnej zmiany formuly.

Strona mowi teraz wprost: **„2 further domains are left out of every number above for exactly that
reason"**, z liczba pojedyncza i mnoga obsluzona osobno. Przy okazji **wybor wersji przestal byc
liczony w dwoch miejscach**: `publishedCorpus` juz zwracal jedna wersje, a `buildIndustryReport`
grupowal po wersji **drugi raz** na danych, ktore z definicji mialy jedna. Martwa kopia reguly, ktora
mogla sie tylko rozjechac z oryginalem. Straznik pilnuje, ze `industry.ts` nie ma juz `byVersion`.

## SPRAWDZILEM CZWARTE MIEJSCE I OKAZALO SIE, ZE JUZ BYLO UCZCIWE (2026-08-19, 08:30)

Po trzech renderingach cytatu poszedlem na **darmowa, publiczna strone z transkryptami**
(`/c/<kategoria>/runs`), na ktora **oba platne dokumenty odsylaja** slowami „Every answer, in full
and unedited". Bylem gotowy dopisac ten sam znacznik. Nie bylo trzeba: strona **od poczatku** mowi
„…which is also why some answers below are in Polish rather than English: those instructions ask
for it".

Warto to zapisac, bo wynik jest odwrotny do intuicji i ma z tego morał: **darmowa strona byla
uczciwsza niz dwa platne dokumenty**. Zastrzezenie napisano tam, gdzie tekst stoi obok siebie po
polsku i po angielsku i roznica **rzuca sie w oczy autorowi**; w raporcie i w mailu cytat jest
wyrwany z kontekstu, wiec autor go nie widzi, a **czytelnik owszem**. Nie dopisalem drugiego zdania
o tym samym - sprawdzenie zakonczylo sie tym, ze **nic nie zmienilem**, i to tez jest wynik.

## PIERWSZE WYNIKI PRZEMIATU: PREDYKCJA TRAFILA W DWA WIERSZE Z PIECIU (2026-08-19, 09:10)

Piatka z predykcji przeskanowana w pierwszym przejsciu. Wynik jest mieszany i **wart wiecej niz
gdyby byl czysty**:

| wiersz | predykcja | co wyszlo |
|---|---|---|
| uploadcare.com | zdanie przestaje wymieniac stron 404 | **TAK**, zdanie konczy sie na rejestrze MCP |
| bigcommerce.com | nie zaliczony | **TAK**, oblany |
| sentry.io | nie zaliczony | **NIE**, nadal zaliczony - i **predykcja byla bledna, nie kod** |
| calendly.com | nie zaliczony | **NIE**, zaliczony na innym pliku - do wyjasnienia po przemiecie |
| growthbook.io | traci punkt za provisioning | **NIE**, punkt przetrwal na innym zdaniu o Google |

**SENTRY: to ja sie mylilem, nie skaner.** `/.well-known/mcp.json` oddaje **106 bajtow prawdziwego
deskryptora** przy naglowku, ktorym pyta skaner (`application/json;q=1`), a **976 bajtow catch-alla**
przy naglowku, ktorym pytal **audyt**. Audyt porownywal wiec dwie odpowiedzi, **ktorych skaner nigdy
nie widzial**, i zglaszal falszywy alarm o falszywym punkcie. Naprawione (`354a2de`): audyt bierze
`entryAccept` prosto ze skanera, plus naglowek `From`, ktory skaner wysyla pod swoim user-agentem
(to codeksa). **Regula ogolna, warta zapamietania: audyt, ktory pyta inaczej niz badany, produkuje
alarmy o samym sobie.**

**GROWTHBOOK: moja regula z 9.44 zadzialala i nie wystarczyla.** Zdanie z linkiem do konsoli Google
przestalo liczyc, ale punkt przetrwal na **innym wystapieniu tej samej frazy**, tez o Google:
„Give Storage `Object Admin` role access to the newly created service…". Regula patrzy na **link w
oknie**, a to zdanie linku nie ma. Do domkniecia po przemiecie.

**CALENDLY: nie wiem jeszcze.** Punkt przeszedl ze `skill.md` na `agent-signup.md`, obie strony maja
**298 101 bajtow, dokladnie tyle co kontrolka**, wiec porownanie dlugosci powinno to zlapac. Sprawdzone
recznie tym samym naglowkiem: plik i kontrolka sa **identyczne**. Czyli albo kontrolka nie doszla w
tamtym skanie (wtedy werdykt powinien byc **niemierzalny**, a nie zaliczony), albo cos jeszcze.
**Do zdiagnozowania po przemiecie, na swiezym wierszu z drugiego przejscia.**

## PRZEMIAT NA 9.44 ZAMKNIETY, OSIEM PUNKTOW CHECKLISTY ODHACZONE (2026-08-19, 10:10)

Przemiat 08:41-09:57, dwa przejscia, oba czyste. **177 wierszy na 9.44, 0 sprzecznosci**, 21 liczb i
5 twierdzen o nazwanych vendorach zgodnych z danymi.

**1. Predykcja: trafione 3 z 5, a jedno chybienie bylo bledem MOJEJ predykcji, nie kodu.**

| wiersz | predykcja | wynik |
|---|---|---|
| bigcommerce.com | nie zaliczony | **oblany** |
| calendly.com | nie zaliczony | **oblany** (1 -> 0, wyszedl tez na liscie regresow) |
| uploadcare.com | zdanie nie wymienia strony 404 | **potwierdzone** |
| sentry.io | nie zaliczony | **zaliczony i slusznie** - patrz nizej |
| growthbook.io | traci punkt | **punkt przetrwal** na innym zdaniu o Google, bez linku |

**2. Kluczowy sprawdzian przeszedl: `audit-entry-credited` na calym korpusie daje ZERO plikow
nieodroznialnych** - 41 zaliczonych wierszy, 43 pliki zapytane, **43 porownane** (poprzednio jedno
porownanie przepadalo). Kazdy zaliczony plik rozni sie od sciezki, ktorej nie ma.

**3. Galaz 9.43 zyje i widac, gdzie:** `agent_entry_point` jest **niemierzalny na 2 wierszach**
(getunleash.io, bitmovin.com) dokladnie z powodu milczacej kontrolki. Przed przemiatem takich wierszy
bylo zero, bo galaz byla nowa. `mcp_present` przez milczaca kontrolke: **zero** - kontrolki MCP
dochodza wszedzie, wiec galaz jest przygotowana, ale dzis nieuzywana.

**4. Adresy, ktore publikujemy: z 3 martwych zrobilo sie 1**, i to znany falszywy alarm audytu
(cal.com cytuje wlasna dokumentacje, a check pyta o to, co dokumentuja, nie czy my tam wejdziemy bez
klucza). `growthbook`owe `console.cloud.google.c` i `uploadcare`owe `_mcp/server` zniknely.

**5. Trzy wiersze mniej w regresach, niz sie balem:** cztery werdykty gorsze niz poprzedni pomiar
(telnyx, calendly, froala, deepl), z czego **calendly jest zamierzony**, froala to ich 403 wobec nas,
a telnyx i deepl do przeskanowania pojedynczo, zanim ktos je nazwie regresem vendora.

**6. `inwx.com` nie dal sie zasiac trzy razy z rzedu** i zostal na 9.42, przez co strona liczyla 176
z 177. Doskanowany recznie z konsoli POST-em, teraz 9.44. Strona pokazuje **177 domains · formula
v9.44** i zdanie o pominietych wierszach slusznie znikneło.

**7. Probka `/d/sample` przegenerowana na 9.44** (byla 9.41) i **zrzuty do katalogu konektorow
zrobione** na aktualnych danych: piec plikow 1440x1000 w scratchpadzie sesji.

**8. Dwie poprawki, ktore wyszly Z przemiatu, nie przed nim.** Obie o tym samym: **narzedzie badajace
nie moze zadawac innego pytania niz badany.**
- `audit-entry-credited` pytal wlasnym naglowkiem `Accept`, a sentry.io oddaje pod
  `/.well-known/mcp.json` **106 bajtow prawdziwego deskryptora** na naglowek skanera i **976 bajtow
  catch-alla** na naglowek audytu. Stad falszywy alarm o falszywym punkcie. Naprawione razem z
  naglowkiem `From`, ktory skaner wysyla pod swoim user-agentem (to codeksa).
- `audit-published-urls` mial dwa kubelki, a martwy adres znaczy **trzy** rozne rzeczy. Na wierszu
  **niemierzalnym** zdanie zwykle samo mowi, ze ten adres nas nie wpuscil - namecheap.com pisze
  „answers 403, 403, 404" - wiec audyt zglaszal **nasza wlasna deklaracje** jako znalezisko przeciwko
  nam. Werdykt jedzie teraz z `corpus.json` zamiast byc zgadywany z punktow.

**9. Regula „przeskanuj pojedynczo, zanim nazwiesz to regresem vendora" wlasnie sie oplacila.**
- **deepl.com** stracil w przemiecie punkt za provisioning (1 -> 0). Pojedynczy skan oddaje
  **z powrotem 1**, na frazie „programmatically create". Vendor nie zmienil nic - to nasz przebieg
  nie zdazyl przeczytac tej strony. Gdybym zaufal liscie regresow, opublikowalbym utrate punktu
  jako fakt o nich.
- **telnyx.com** stoi na 1 i po skanie pojedynczym tez 1, wiec spadek 2 -> 1 jest **powtarzalny** i
  nie jest artefaktem. Ciekawe jest co innego: **zdanie sie zmienilo** miedzy przebiegami (raz
  `agents.md`, raz trzy deskryptory w `.well-known`), czyli ktory plik znajdujemy pierwszy, potrafi
  sie wahac. Do obserwacji, nie do naprawy dzisiaj.
- Oba wiersze doskanowane i zasiane, korpus dalej **177 na 9.44, 0 sprzecznosci**.

**CO ZOSTALO OTWARTE:** growthbook.io - punkt za provisioning stoi na zdaniu o koncie uslugowym
Google **bez linku w oknie**, wiec regula 9.44 go nie widzi. Blast radius: jeden wiersz.

## 9.45: SAME SLOWA „SERVICE ACCOUNT" TO JESZCZE NIE SCIEZKA DO KLUCZA (2026-08-19, 10:20)

Zaczelo sie od jednego otwartego wiersza (growthbook.io), a skonczylo na najwiekszym pojedynczym
znalezisku tej nocy. Zamiast naprawiac ten wiersz, **policzylem, ile wierszy stoi na tej samej
frazie**: 22 zaliczone wiersze uzywaja `service account`, a **13 stoi na niej SAMEJ**. Przeczytalem
ich wlasne cytaty - te, ktore sami publikujemy pod ich nazwiskiem:

| wiersz | co naprawde cytujemy |
|---|---|
| cronofy.com | „Service Accounts \| Enterprise Connect \| Cronofy Docs **Menu**" - okruszek nawigacji |
| datadoghq.com | „**59% of AWS IAM users, 55% of Google Cloud service accounts**…" - statystyka z bloga |
| zenrows.com | „Check your **CAPTCHA solver** service account for sufficient balance" - cudze konto |
| nylas.com | „Service account" - dwa slowa, naglowek |
| crowdin.com | Vertex AI · onesignal.com Firebase · phrase.com Google AutoML · turbopuffer.com GCP · restate.dev Google IAM · zilliz.com GKE |
| windmill.dev | „every connection uses that single service account" - opis zachowania |
| mixpanel.com | „[Create Service Account](…/create-service-account.md)" - **jedyny bezspornie wlasciwy** |

**Dziesiec z trzynastu nie mowi ani slowa o tworzeniu czegokolwiek.** To nie jest nowy pomysl na
regule: **9.32 rozbroil dokladnie tak samo trzy frazy** („management api", „provisioning api",
„account api") z tego samego powodu, a komentarz przy nich mowi wprost, ze „gola fraza to tylko
nazwa w menu". `service account` jest **czwarta taka fraza** i uszla, bo nazywa poswiadczenie, a nie
API.

**Regula 9.45:** fraza liczy sie tylko, gdy zdanie **tworzy** konto uslugowe. Blast radius zmierzony
przed wdrozeniem: **10 wierszy traci punkt** (1 -> 0), 3 zostaja (mixpanel slusznie, growthbook i
zilliz to nadal Google, ale ze slowem „create" - nie gonimy tego lista nazw chmur), a do 6 wierszy z
dwiema frazami moze spasc 2 -> 1. Symulacja puszczona na **prawdziwych 13 cytatach z korpusu**, nie
na wymyslonych - i te same cytaty stoja jako kontrolki w `rules.mts`.

**Codex zlapal roznice miedzy regula a dopasowaniem rdzenia:** `provision\w*` lapie tez rzeczownik.
„Service account **provisioning**" i „service account **generation** settings" to naglowki sekcji,
czyli dokladnie ta klasa falszywego kredytu, ktora ta zmiana usuwa. Dwa kierunki biora wiec rozne
formy: **przed** fraza gerundium jest czasownikiem („provisioning a service account" tworzy jedno),
**po** frazie ten sam wyraz jest czlonem rzeczownikowym.

**Stan: kod 9.45, korpus 9.44.** Waiter `/tmp/reseed-945.sh` czeka na karencje mediany (6 h od 09:57,
czyli okolo **16:00**), log `/tmp/reseed-945.log`. **Nie deployowac po jego starcie.** Po przemiecie:
sprawdzic, czy dokladnie te 10 wierszy stracilo punkt i czy zadne zdanie nie mowi juz „service
account" bez slowa o tworzeniu.

## KAZDY ADRES, NA KTORYM STOI ZALICZONY WIERSZ, DZIS ODPOWIADA (2026-08-19, 11:05)

`audit-published-urls` mowi po raz pierwszy: **„zaden zaliczony wiersz nie stoi na adresie, ktorego
dzis nie ma"**. 1514 adresow sprawdzonych, 1 pominiety, 3 martwe - i **wszystkie trzy leza na
wierszach NIEMIERZALNYCH**, czyli takich, ktorych zdanie samo mowi, ze nas tam nie wpuszczono.

Ostatni wisial `cal.com`. Nazywalismy go „znanym falszywym alarmem" **trzy razy** i za kazdym razem
zostawiali. To bylo lenistwo: przyczyna jest konkretna i naprawialna. Ich cytat brzmi
`curl --request POST --url https://api.cal.com/v2/api-keys/refresh`, a audyt pytal **GET-em**, wiec
dostawal 404 z adresu, ktory istnieje i przyjmuje POST-y. **Trzeci raz tej nocy ten sam ksztalt:
narzedzie badajace zadawalo inne pytanie niz badany.**

Naprawa jest ostrozna z wyboru: **nie wysylamy POST-a**. Strzelanie zapisem w cudze API, zeby
zamknac wlasny audyt, nie jest nasza rzecza - wiec po prostu przestajemy udawac, ze GET czegokolwiek
dowiodl. Adres ladzie w czwartym kubelku „nie zapytane" i **nie liczy sie jako sprawdzony**.

**Codex wchodzil w te jedna zmiane cztery razy i za kazdym razem mial racje:**
1. `mcp_present` musi zostac przy swoim handshake - jego adresy sa badane POST-em, ktory czyta, a
   nie pisze, i kilka z nich odpowiada 404 na GET. Bez wyjatku stracilibysmy pokrycie, dla ktorego
   ten skrypt powstal.
2. Pominiete **nie sa sprawdzone**: inaczej wejscie z samych POST-ow drukuje „N adresow
   sprawdzonych", nie wysylajac ani jednego zapytania, i mija bramke zerowego pomiaru.
3. Czasownik trzeba wiazac z **tym** wystapieniem adresu, nie z pierwszym w tekscie, a wczesniejszy
   adres konczy klauzule - inaczej metoda z jednej komendy przechodzi na nastepna.
4. **Samo slowo to za malo**: „POST requests are documented at <adres>" to proza o stronie, ktora
   odpowiada na GET; pominiecie jej ukryloby martwy adres. Czasownik musi pochodzic z konstrukcji
   (`--request POST`, `-X POST`, albo stac tuz przed adresem). A skoro tak, okno moglo urosnac do
   200 znakow, bo naglowki curla staja miedzy czasownikiem a adresem.

## PAGESPEED NIE CHCIAL RUSZYC, A ZNALAZLEM PRZEZ TO PRAWDZIWY BLAD (2026-08-19, 11:10)

Krystian nie mogl puscic PageSpeed: „Unable to resolve https://letagentsin.com/". **Strona jest
zdrowa** - apex rozwiazuje sie na cztery adresy i **kazdy** oddaje 200 z poprawnym TLS, `robots.txt`
przepuszcza wszystko, DNSSEC nie ma, middleware nie dotyka `/`. Publiczne API PageSpeed odpowiada
`429 Quota exceeded` dla anonimowego projektu Google, a webowy PSI korzysta z tej samej puli i
zamienia to na mylacy komunikat o rozwiazywaniu adresu.

Zamiast czekac, puscilem **Lighthouse lokalnie**: performance **100** na obu form factorach, LCP
1,5 s mobile i 0,4 s desktop, CLS 0.

**I ten objazd znalazl blad, ktorego zaden nasz audyt nie mogl zlapac.** Przycisk formularza
monitoringu mial klase `text-ink-inverse` - **token, ktorego nigdy nie zdefiniowalismy**. Klasa nie
robila nic, napis dziedziczyl zwykly kolor tekstu, wiec kontrast wynosil **1,98 w ciemnym motywie i
2,89 w jasnym**: oblane WCAG AA **po obu stronach**, na glownym CTA strony, ktora zbiera adresy.
Po zmianie na istniejacy `text-ground`: **7,86 i 5,85**. Accessibility **96 -> 100**, zweryfikowane
na produkcji.

**Zla nazwa klasy w Tailwindzie nie mowi ani slowa** - to cicha awaria dokladnie tej samej rodziny,
co reszta tej nocy. Straznik oblewa teraz build, gdy jakakolwiek klasa nazywa kolor spoza
`globals.css`.

**OTWARTE, DO DECYZJI KRYSTIANA:** Lighthouse daje SEO 92, bo uznaje nasz `robots.txt` za
nieprawidlowy - nie zna dyrektyw `Content-Signal:` i `AI-Catalog:`. **RFC 9309 kaze ignorowac
nieznane linie**, wiec formalnie to blad narzedzia, nie nasz. Moja rekomendacja: **zostawiamy** -
sami doradzamy vendorom publikowanie ARD, a usuniecie sygnalu, zeby zadowolic linter, byloby
sprzeczne z wlasna rada. Warte natomiast tekstu na `/methodology`: to konkretny, sprawdzalny
przyklad narzedzia surowszego niz standard, ktory mierzy.

## SPRAWDZILEM DOSTEPNOSC NA KAZDEJ STRONIE, KTORA WIDZI KLIENT (2026-08-19, 11:25)

Po naprawie kontrastu na stronie glownej puscilem Lighthouse na **wszystkich powierzchniach klienta**,
bo jedna naprawiona strona nic nie mowi o reszcie:

| strona | accessibility | best practices | SEO |
|---|---|---|---|
| `/` | 100 | 100 | 92 |
| `/pricing` · `/privacy` · `/report` · `/v/<domena>` · `/c/<kat>/runs` | **100** | 100 | 92 |
| `/methodology` | 100 | 100 | 91 |
| `/d/<dostawa>` (platny raport) | **100** | 100 | 54 |

**Zadnej zmiany nie trzeba bylo robic** i to tez jest wynik. SEO 54 na dostawie jest **zamierzone**:
ta strona jest celowo poza indeksem, bo to material sprzedazowy, a nie SEO. Pozostale 92 to
wylacznie spor o `robots.txt` opisany wyzej.

**Przy okazji zweryfikowalem na produkcji dwie rzeczy, ktore dotad sprawdzilem tylko w markdownie:**
opublikowalem raport `growthbook.io` pod `/d/qa-jezyk` (bez `--sample`, wiec **nie linkuje sie z
cennika**; to zwykla dostawa QA, ktora moze tam zostac). W renderze HTML: **5 cytatow niesie
znacznik `· in Polish`** i zdanie wyjasniajace, a cytat provisioningu **nie konczy sie polowa
adresu**. Formularz na tej stronie tez przechodzi dostepnosc na 100.

**Jedna obserwacja bez zmiany:** bramka e-mail na stronie dostawy jest **renderowana po stronie
klienta**, wiec bez JS nie ma tam formularza. Dla dokumentu wysylanego czlowiekowi to w porzadku - ale
warto pamietac, ze mierzymy vendorow dokladnie za to samo na ICH powierzchniach agentowych.
