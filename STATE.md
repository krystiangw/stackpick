# Let Agents In: stan na 2026-08-13 (kod na formule 9.9, korpus rozbity 9.8/9.9, zapisy do bazy ZABLOKOWANE)

Punkt wejścia po compact. Czytaj przed pracą, razem z `ARCHITECTURE.md`.
**Dwie sekcje na dole tego bloku, "Co zostało z audytów" i "Następne kroki merytoryczne", są
kontraktem dla watchdoga. Aktualizuj je przy każdej zamkniętej pozycji, inaczej watchdog czyta
listę sprzed trzydziestu rund.** Dziennik rund jest niżej i jest historią, nie listą zadań.
**Ten nagłówek też się starzeje: 2026-08-11 rano mówił "StackPick, formuła 7.4, 155 domen",
czyli był o dwa dni i pięć wersji formuły do tyłu. Przepisuj go, nie tylko dziennik.**

## PONIEDZIALEK: trzy decyzje i jedna komenda

**Produkcja dziala w trybie zdegradowanym. Zapisy do bazy sa odrzucane od nocy 12/13.08.**
Strona, korpus i skanowanie dzialaja; nic sie nie zapisuje i kazda sciezka mowi o tym wprost.

### 1. Baza (blokuje wszystko inne) - REKOMENDACJA ZMIENIONA 13.08 rano

**Blokada NIE jest samonaprawialna, i to jest nowy fakt.** Ustapila na kilkanascie minut, wiec
uruchomilem reseed odzyskujacy; **wrocila po okolo 1,7 MB zapisow**, czyli po jednym przebiegu.
Sam czekanie nie wystarczy: kazdy powazniejszy zapis natychmiast zapycha ja z powrotem.
**Trzeba podjac decyzje** - kasowanie albo platny tier - inaczej korpus zostanie rozbity na
zawsze, bo reseedu nie da sie dokonczyc.

**Drugi wniosek z tej proby, gorszy: reseed zaraportowal 340 udanych pomiarow, a nie zapisal
ANI JEDNEGO.** Skan zwraca teraz pelna karte i `saved:false`, gdy baza odmawia (moja zmiana
z tej nocy, sluszna wobec odwiedzajacego), a skrypt sprawdzal tylko obecnosc karty. Naprawione:
`"saved":false` liczy sie jako porazka i idzie do ponowien. **Reseed, ktory nic nie zmienil, nie
moze wygladac jak reseed, ktory zadzialal.**

Atlas: **5120 MB z 5120 MB**. Klaster dzielony z equity-analyst.

**Rekomendacja z 13.08 rano ("nie kasowac, to prawie na pewno oplog") byla bledna i jest
wycofana.** Czytalem `storageSize`, czyli rozmiar PO kompresji. Atlas Flex nalicza limit wedlug
rozmiaru logicznego dokumentow, a te dwie liczby rozjezdzaja sie na naszych raportach trzykrotnie:

| baza | logicznie | na dysku |
|---|---|---|
| equity-analyst | 2728 MB | 1513 MB |
| stackpick | 2310 MB | 757 MB |
| **razem** | **5039 MB** | **2271 MB** |

Suma logiczna trafia w limit 5120 MB z dokladnoscia do 1,6%. Suma skompresowana nie tlumaczy
niczego i to ona kazala mi szukac ogloga, do ktorego i tak nie mam uprawnien. Zadnej zagadki
nie ma: **to sa nasze raporty**.

**Rekomendacja: skasowac przedawnione skany.** Liczba jest zmierzona przez `$bsonSize`, czyli
dokladnie ta, ktora Atlas nalicza, a nie oszacowana:

```
MONGODB_URI=$(heroku config:get MONGODB_URI -a stackpick) npx tsx scripts/prune-reports.mts
  21179 raportow, 195 najnowszych na domene, 737 zostaje
  20442 przedawnionych skanow domen z korpusu = 2272 MB logicznie
```

Zwalnia **2272 MB**, czyli klaster spada z 5039 do 2767 MB (54% limitu). Zostaje najnowszy skan
kazdej domeny i **wszystkie 542 skany domen spoza korpusu**, bo to sa odwiedzajacy, ktorym
obiecalismy trwaly link `/r/<id>`. Skrypt domyslnie tylko czyta; kasuje dopiero z `--delete`,
partiami po 500, bo kasowanie samo jest zapisem.

Przyczyna jest juz naprawiona osobno: raport wazyl 185 kB przez surowy HTML sond, teraz ~5 kB.
Te 20 tysiecy wierszy to dlug z dziewieciu reseedow sprzed tej poprawki.

**Nie uruchamiam tego bez Twojej zgody** (guardrail: operacje destrukcyjne). Jedna komenda:
`... npx tsx scripts/prune-reports.mts --delete`.

- Trzecia droga: platny tier. Przy dwoch rosnacych projektach 5 GB bedzie wracac, ale samo
  kasowanie kupuje duzo czasu, bo nowe raporty sa 37x lzejsze od tych, ktore zapchaly klaster.

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
formule**: dzis 88 ze 181. Pelny reseed to 340 zapisow, ten to 88, czyli okolo 440 kB zamiast
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
- **`measuredOn: null`, gdy scoreowany URL jest na innej domenie rejestrowalnej** (dropboxsign.com
  → app.hellosign.com, swell.is → swell.store, sentry.io → mcp.sentry.dev).

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
| nasze najnowsze na domene (korpus) | 181 | to publikujemy |
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
