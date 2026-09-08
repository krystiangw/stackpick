# Czy Let Agents In ma przewagę biznesową?

**Późniejsza decyzja właściciela z 08.09:** zatwierdzono bezpłatną betę monitoringu bez
zapowiedzi przyszłej ceny oraz 1500 USD za każdy z pierwszych dwóch pilotaży. Poniższa
ocena opisuje ofertę w chwili audytu, przed tą decyzją; nie jest bieżącym cennikiem.

Ocena z 8 września 2026. Dokument wewnętrzny: rekomendacja dla właściciela, bez zmiany
cennika, wdrożenia ani zgody na wysyłkę kampanii. Ceny konkurentów sprawdzono tego dnia
na ich stronach. Kwoty pozostają w walutach źródłowych; rozliczenie roczne oznaczono osobno.

**Może z tego powstać dochodowy biznes jednej osoby. Najbardziej wiarygodna droga prowadzi
przez płatną pracę nad konkretną integracją. Dzisiejszy raport i monitoring nie mają jeszcze
przewagi wystarczającej, żeby uzasadnić budowę samodzielnego biznesu abonamentowego.**

Nie mamy płacącego klienta, ukończonego pilotażu za 1500 USD ani potwierdzenia, że odbiorca
uznaje wykryty problem za wart tej ceny. Potencjał nie jest walidacją. Największe ryzyko:
sprzedajemy ciekawą obserwację o agentach, podczas gdy klient nie widzi pilnego problemu,
który może i chce naprawić.

## Co naprawdę oferuje konkurencja

To trzy sąsiadujące rynki: skanowanie dostępności, monitorowanie rekomendacji oraz testy
wykonania zadania. Nie należy sumować ich funkcji ani porównywać samych cen bez zakresu.

| Alternatywa | Sprawdzona oferta i cena | Znaczenie dla nas |
|---|---|---|
| **Lightsage, wcześniej Sapient** | Startup **250 USD/mc**, 4000 kredytów, Claude Code i Codex. Ten sam budżet wystarcza według cennika na około **400 uruchomień agenta albo 40 ewaluacji**; to alternatywne wykorzystanie kredytów. Growth 1000 USD/mc dodaje m.in. Cursor i Antigravity. [Cennik](https://lightsage.com/pricing). | Bezpośredni konkurent w badaniu wyboru i użycia narzędzi deweloperskich. Liczba agentów nie wyróżnia nas. |
| **Ora** | Publiczny skaner i API **0 USD**, limit 10 skanów/min. Osobny interfejs Journey pozwala podać cel agentowi Claude Code. Nie sprawdzono kosztu wykonania Journey. [Cennik](https://ora.ai/pricing), [Journey](https://journey.ora.ai/). | Darmowy substytut części diagnostyki; skaner i wykonanie zadania trzeba rozróżniać. |
| **Agent Checker** | Szybki skan bezpłatny; pełny audyt **19 GBP jednorazowo**, deklarowane ponad 20 zadań wykonywanych przez agenta w przeglądarce. Starter **39 GBP/mc**, 3 strony i 3 pełne audyty miesięcznie. [Cennik](https://agentchecker.ai/pricing). | Tani raport behawioralny już istnieje. Zadania zakupowe i formularze w przeglądarce mają inny zakres niż integracja API z poprawką inżyniera. |
| **Agentable** | **29 USD/mc/domenę**: cotygodniowy skan, alarmy regresji, historia; **99 USD/mc za 25 domen**. Skan sprawdza artefakty i zgodność, nie powodzenie żywego agenta. [Oferta](https://agentable.is/). | Silna presja cenowa na naszą część HTTP. Nasze dodatkowe przebiegi agentów muszą uzasadniać dopłatę. |
| **Otterly** | **29 USD/mc**, 15 promptów, 4 podstawowe silniki odpowiedzi, codzienne pomiary. [Cennik](https://otterly.ai/pricing), [opis planów](https://help.otterly.ai/pricing-of-otterlyai). | Dla kupującego sam monitoring wzmianek jest dostępny taniej i częściej. Odpowiedzi wyszukiwarek AI nie są testami integracji przez coding agents. |
| **Peec** | Starter **70 EUR/mc przy rozliczeniu rocznym**: 50 promptów, 3 modele, codzienne pomiary. Roczny ekwiwalent: 840 EUR. [Cennik](https://peec.ai/pricing). | W podobnym przedziale nominalnym klient marketingowy dostaje większy zakres monitoringu. To inny odbiorca niż właściciel SDK. |
| **Profound / Scrunch** | Profound Starter: 50 promptów i śledzenie ChatGPT; Scrunch Starter **300 USD/mc** lub 250 USD/mc przy rozliczeniu rocznym. [Profound](https://www.tryprofound.com/pricing), [Scrunch](https://scrunch.com/pricing). | Szersze platformy marketingowe. Nie są podstawą do twierdzenia, że nasz abonament jest tani albo równoważny ich produktom. |

Istotnym substytutem jest również własny inżynier klienta z agentem: może sam przejść
quickstart. Nasza cena musi kupować zaoszczędzony czas, sensownie zaprojektowany test
i użyteczną poprawkę. Sam dostęp do modelu nie uzasadnia zlecenia.

### Lightsage: obejrzano dowód, nie tylko landing page

W publicznym [raporcie Chroma](https://lightsage.com/agent-experience-arena/chroma)
otwarto istniejącą ewaluację ukończoną 19 maja 2026: zadanie wyszukania odpowiedzi w trzech
FAQ, wygenerowany plik Python, wynik wykonania, oś wywołań narzędzi i rozbicie oceny.
Raport pokazuje **172 sekundy, 7 wywołań, 2 błędy i koszt 0,1154 USD**, z końcowym kodem
wyjścia 0. Nie odtwarzano tego wykonania niezależnie.

To wystarcza, żeby odrzucić argument „tylko my pokazujemy prawdziwe wykonanie i pełne
dowody”. Nie dowodzi natomiast jakości dowolnego testu ani powodzenia integracji produkcyjnej.
Ich zadanie trzech FAQ nie jest równoważne naszemu briefowi o dużej bazie danych.

Lightsage opisuje też własne scenariusze i wykonywanie kodu dla API, MCP i CLI.
To pokrywa sporą część kierunku naszego pilotażu. [Agent Usability](https://lightsage.com/agent-usability).
W dodatku sprzedaje obsługę Managed: do Startup **+3000 USD/mc**, obejmującą strategię,
wykonanie i optymalizację. Osobista pomoc również nie jest kategorią zarezerwowaną dla nas.
[Zakres i cennik](https://lightsage.com/pricing).

Sprawdzono także dwa [publiczne przykłady Agent Checker](https://agentchecker.ai/examples):
[własną witrynę](https://agentchecker.ai/share/agentchecker-ai-9c4e1f) oraz
[kontrolowany sklep Cratewell](https://agentchecker.ai/share/cratewell-agentchecker-ai-a0c7bb).
Są tam zadania, wyniki, opisane dowody i zalecenia, w tym porażki. To przykłady dostawcy,
nie niezależnie sprawdzone wdrożenia klientów. Nie uruchamiano nowych audytów.

Ora wyraźnie rozróżnia statyczne sygnały od eksperymentów z agentami; sama ostrożność
metodologiczna też nie daje nam wyłączności. [Opis Deep Scan](https://ora.ai/blog/deep-scan-v2).
Publikuje historię Telnyx i ogłoszenie współpracy z Vercel. To sygnały silniejszej dystrybucji
i dostępu do klientów, nie niezależny dowód wpływu Ora na przychody.
[Telnyx](https://ora.ai/blog/telnyx-agent-readiness), [ogłoszenie Vercel](https://ora.ai/blog/is-agentic-with-vercel).

## Co mamy, a czego jeszcze nie udowodniliśmy

| Nasz materiał | Wartość dla kupującego | Granica dowodu |
|---|---|---|
| 181 domen, 26 kategorii, 445 odpowiedzi łącznie; rozszerzenie narzędzi w 7 kategoriach | Punkt startu do porównania i wyboru tematu rozmowy | Publiczny korpus i transkrypty można odtworzyć; nie mamy wyłączności na dane ani pełnego badania 4 narzędzi we wszystkich kategoriach. |
| Loops: **0/25 wzmianek**, zapisany skan **14/17** | Konkretna, sprawdzalna obserwacja | Nie mierzy utraconych klientów, przyczyny pominięcia ani błędu integracji. |
| Dziewięć ocenionych raportów, źródła i jawne ograniczenia | Oszczędność wstępnej analizy, możliwość zakwestionowania wyniku | Trzeba zmierzyć, czy klient rzeczywiście oszczędza czas i podejmuje działanie. |
| Cztery opublikowane badania integracji, razem 18 przebiegów | Dowód praktycznej kompetencji operatora | Nie są ukończonymi płatnymi pilotażami z poprawą przed/po. |
| Powtarzalne kontrole HTTP i historia | Przydatność do wykrywania regresji powierzchni publicznej | Stabilność skanera nie mówi o niepewności losowych odpowiedzi agentów. |

Źródła własne: [opis biznesu](business.md), [próbka Loops](https://letagentsin.com/d/sample),
[badania integracji](https://letagentsin.com/audit), [rozszerzenie agentów](agent-expansion-2026-09-07.md).

Najważniejsze zdanie próbki brzmi: **„The proposed integration tests have not been executed.”**
To uczciwe, ale wyznacza granicę aktualnej wartości: klient widzi propozycję sprawdzenia,
jeszcze nie wykazaną usterkę z rozwiązaniem. [Próbka](https://letagentsin.com/d/sample).

W cenniku zostało **„quoted reasons for passing over your product”**. Tak można opisać
wyłącznie jawną wypowiedź agenta o odrzuceniu produktu. Sam brak nazwy nie dostarcza
powodu odrzucenia. Przy kolejnej korekcie należy ograniczyć obietnicę do tego, co rzeczywiście
zapisano w odpowiedziach. [Cennik](https://letagentsin.com/pricing).

**Możliwa przewaga:** małe, jasno ograniczone zlecenie dla dostawcy API — dwa jego zadania,
odtwarzalny problem, jedna poprawka dokumentacji lub przykładu, niezależne sprawdzenie skutku
i ponowny test. Klient dostaje pracę gotową do przeglądu, a właściciel osobiście odpowiada
za diagnozę. Niższe zobowiązanie niż stała obsługa dużej platformy może ułatwić pierwszy zakup.
To hipoteza sposobu obsługi i zakresu, nie odkryta luka bez konkurencji.

Trwalszą przewagę mogłyby z czasem tworzyć referencje, znajomość konkretnej kategorii API,
własne fixture, powtarzalny proces i zbiór sprawdzonych napraw. Dzisiaj nie mamy jeszcze
takiego dorobku u płacących klientów. UI podnosi czytelność i wiarygodność, ale go nie zastępuje.

## Która oferta może zarabiać

| Oferta | Ocena | Decyzja proponowana |
|---|---|---|
| **Raport 49 USD** | Rozsądny materiał otwierający rozmowę. Słaba podstawa firmy, jeśli każda dostawa wymaga długiej analizy i pozyskania klienta. | Zachować jako wejście do diagnozy; mierzyć czas przygotowania i przejścia do rozmowy. Nie rozwijać osobnego rozbudowanego produktu raportowego przed pierwszą sprzedażą. |
| **Monitoring 79 USD/mc** | Najsłabiej obroniona oferta. Tygodniowe HTTP konkuruje z tańszymi skanerami; pięć ręcznych przebiegów miesięcznie nie tworzy mocnej obietnicy regularności. Dziś jest bezpłatny. | Nie uruchamiać płatnego abonamentu, dopóki klient nie potwierdzi powtarzalnej potrzeby, a zakres i rytm dostaw nie będą jednoznaczne. |
| **Pilotaż 1500 USD** | Największa szansa na opłacalny biznes jednej osoby. Płaci się za wykonanie, diagnozę i ograniczoną poprawkę. Cena i popyt pozostają niesprawdzone. | Sprzedać dwa pilotaże w istniejącym zakresie i zmierzyć rzeczywistą ekonomikę przed ustaleniem stałej oferty. |

Monitoring ma dodatkowy problem: cennik pozwala operatorowi pominąć przebiegi i samemu
wybrać dzień wysyłki. Nie wystarczy obiecać klientowi większej liczby narzędzi; potrzebna jest
przewidywalna usługa i odpowiedź na pytanie, co robi po otrzymaniu alarmu.
[Aktualny zakres](https://letagentsin.com/pricing).

Prosta kalkulacja, nie prognoza przychodów:

- Raport 49 USD przy 30 minutach pracy daje **98 USD/h przed wszystkimi kosztami**.
  Przy przykładowych 5 USD kosztu narzędzi i celu 125 USD/h zostaje około **21 minut** pracy
  na raport. Koszt 5 USD jest założeniem, a 125 USD/h pochodzi z kalkulacji pilotażu;
  nie zmierzono jeszcze rzeczywistego kosztu pozyskania i obsługi kupującego raport.
- Pilotaż: 1500 USD minus maksymalne 100 USD kosztów, podzielone przez 12 h operatora,
  daje około **117 USD/h**, przed sprzedażą, administracją i podatkami. Dodatkowe 4 h
  na pozyskanie i obsługę obniżają tę liczbę do **87,50 USD/h**.
- Dwa pilotaże miesięcznie oznaczałyby **3000 USD przychodu i do 24 h realizacji**;
  cztery — **6000 USD i do 48 h**. Do tego dochodzą sprzedaż, administracja i koszty.
  To scenariusze przy założeniu znalezienia kupujących, a nie oszacowanie wielkości rynku.

Zakres już istnieje: 2 zadania × 2 narzędzia × 3 próby × 2 wersje = **24 próby**,
jedna poprawka do 2 h, 12 h pracy operatora, cel dostawy 10 dni roboczych od gotowych
dostępów. Nie należy rozszerzać go o cztery narzędzia w tej samej cenie tylko dlatego,
że potrafimy je uruchomić. [Warunki pilotażu](integration-pilot-2026-09-07.md).

## Kampania: dobry początek rozmowy, jeszcze nie dowód popytu

Przejrzano aktualne lokalne drafty. Dziewięć trafnych odbiorców z pierwotnych dziesięciu,
gotowy raport, jeden konkretny brief i jedno pytanie to sensowny eksperyment. Wyłączenie
Transloadit jest właściwe: niepasujące pytanie podważałoby całą diagnozę. Próba jest jednak
dobrana pod wcześniejszy brak wzmianek; nie reprezentuje rynku. Darmowy prezent nie testuje ceny.

**Pierwszy odbiorca nadal: Loops / Chris Frantz.** Firma już inwestuje w interfejsy dla
agentów, a jej dokumentacja obejmuje maile transakcyjne z naszego briefu.
[Narzędzia dla agentów](https://loops.so/agents), [dokumentacja](https://loops.so/docs/transactional),
[zespół](https://loops.so/about). To przesłanka do rozmowy, nie dowód posiadanego budżetu.
Drugi: DocuSeal. Pierwotna mała tura Loops, DocuSeal, Raygun, Logto pozostaje sensowna.

Pytanie Loops o problemy zgłaszane do supportu sprawdza dopasowanie, ale może nie ujawnić
potrzeby zakupu. Po odpowiedzi trzeba ustalić: jakie zadanie agent ostatnio próbował wykonać,
gdzie się zatrzymał, kto odpowiada za naprawę i czy problem jest obecnie priorytetem.
Nie przechodzić automatycznie od „0/25” do oferty poprawy widoczności albo obietnicy sprzedaży.

Mierzyć odpowiedzi merytoryczne, potwierdzone problemy, zgodę na zakres i płatne zakupy.
Otwarcia i „ciekawy raport” nie walidują biznesu. Nie czekać z kwalifikacją na brakujące
16 odpowiedzi Cursor: uzupełniają materiał, ale nie odpowiadają na pytanie o chęć zakupu.
Kampania pozostaje **wstrzymana**, dopóki właściciel wyraźnie tego nie zmieni.

## Trzy rzeczy do zrobienia następnie

1. **Pokazać jeden ukończony przykład diagnozy i ponownego testu.** Wybrać wąskie zadanie,
   realny skutek sprawdzany poza deklaracją agenta, dwa narzędzia i po trzy próby przed/po
   — razem 12 prób dla jednego zadania. Wyznaczyć najwyżej dwa dni na ten demonstrator,
   bez przebudowy platformy. Pokazać na początku raportu zadanie, wynik, zmianę i wynik
   ponowny; logi dopiero pod spodem. Dostępy i działania zewnętrzne uzgodnić przed testem.
   Gdy nie ma usterki albo poprawa nie pomaga, opublikować uczciwy wynik, nie tworzyć sukcesu.
   Nie wykonywać całego darmowego pilotażu dla każdego odbiorcy.
2. **Po odwołaniu wstrzymania uzyskać trzy rozmowy kwalifikujące, zaczynając od Loops.**
   Wysłać małą turę istniejących, zatwierdzonych wiadomości i poznać konkretne zadanie,
   właściciela problemu oraz powód działania teraz. Demonstrator nie musi blokować rozmów.
   Proponowany limit eksperymentu: po 20 trafnie dobranych, osobistych kontaktach bez
   potwierdzonego problemu zmienić segment lub ofertę. To próg decyzji operacyjnej,
   nie statystyczny dowód braku rynku. Rozszerzenie listy i wysyłka wymagają osobnej decyzji.
3. **Sprzedać i dostarczyć pierwszy pilotaż za 1500 USD, następnie drugi.** Przed pobraniem
   pieniędzy domknąć tożsamość sprzedawcy, płatność i pisemny zakres. Rejestrować cały czas
   sprzedaży i realizacji, koszty, wynik niezależnych asercji i ocenę użyteczności przez klienta.
   Odbiór dotyczy wykonanego badania, także wyniku negatywnego. Sygnałem do rozwijania
   usługi będzie zakup, problem wart naprawy i dostawa w limicie; powtarzające się wyniki
   bez użytecznego działania wymagają zmiany kwalifikacji. Dopiero potem decydować o cenie
   stałej, abonamencie i rozbudowie narzędzi.

## Zakres sprawdzenia i ograniczenia

To audyt oferty i publicznego materiału dowodowego, nie benchmark skuteczności konkurentów.
Czytano ich strony, cenniki oraz wskazane istniejące raporty; nie kupowano planów, nie
zakładano kont, nie uruchamiano próbnych audytów i nie badano ich prywatnych dostaw.
Opinie klientów publikowane przez dostawców nie zostały niezależnie zweryfikowane.

Cenniki dynamiczne sprawdzono również w przeglądarce. Lightsage ma niespójne informacje:
FAQ strony głównej podaje inne plany niż `/pricing`; ta ocena używa dedykowanego cennika.
Dodatek Managed dla Scale jest niespójny między tabelą a FAQ, więc jego ceny nie przytoczono.
Peec odczytano w trybie rocznym. Nie użyto niepewnego odczytu ceny Profound do kalkulacji.

Wyszukiwarka zwracała starszą wersję części naszych stron, dlatego ich stan sprawdzono
bezpośrednim pobraniem. Lokalne migawki HTML, odczyty przeglądarki, zrzuty i manifest
źródeł z czasem odczytu oraz SHA-256 znajdują się w ignorowanym katalogu
`data/business-advantage-2026-09-08/`; nie są publicznym archiwum ani częścią tej publikacji.
Nie dołączono prywatnych linków dostaw. Dane o zerze klientów i ruchu pochodzą z
`docs/business.md`; 3 kliknięcia/600 wyświetleń dotyczą 28 dni do 3 września, nie nowego
pomiaru z 8 września. Nie zmieniono produktu ani cennika, nie wysłano wiadomości.
