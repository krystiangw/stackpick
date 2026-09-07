# Pilotaż: od dokumentacji do działającej integracji

Status: przygotowana propozycja zakresu. Cena jest hipotezą do sprawdzenia w rozmowach,
nie zmianą publicznego cennika ani uruchomieniem sprzedaży. Nie wykonano jeszcze tego pilotażu.

## Co klient kupuje

Sprawdzamy, czy dwa uzgodnione zadania da się wykonać agentem na podstawie publicznej
dokumentacji produktu. Dostarczamy powtarzalny przykład miejsca zatrzymania, jedną ograniczoną
poprawkę dokumentacji lub przykładu integracji i ponowny pomiar. Jeśli nie znajdziemy problemu
albo poprawka nie pomoże, wynik mówi to wprost.

Kupujący: founder, osoba odpowiedzialna za developer experience lub produkt API, która może
zmienić onboarding, dokumentację lub przykład SDK. Kwalifikujemy firmę po konkretnym zadaniu
i możliwości działania na wynikach. Samo 0/15 wzmianek nie kwalifikuje do płatnego audytu.

**Proponowana cena pierwszych dwóch pilotaży: 1500 USD za jeden produkt.**
W cenie dwa scenariusze, 24 zaplanowane próby, jedna mała poprawka i omówienie.
Przed przyjęciem zlecenia potrzebne są kompletne dane sprzedawcy, uzgodniony zakres,
sposób rozliczenia i działający sposób zapłaty. Obecny brak billing pozostaje blokadą pobrania pieniędzy.

## Zakres i granice

- Dwa zadania, każde z jednoznacznym artefaktem sukcesu; dwa narzędzia; po trzy niezależne
  próby przed i po zmianie: 2 × 2 × 3 × 2 = **24 próby**.
- Każda próba trwa do 20 minut. Maksymalnie 8 godzin łącznego czasu agentów, wykonywanego
  w izolowanych sesjach. Model, narzędzie i jego wersja oraz uprawnienia są zapisane przed startem.
- Do 12 godzin pracy operatora łącznie: uzgodnienie/fixture 2 h, wykonanie i ocena 4 h,
  diagnoza i poprawka 2 h, ponowny pomiar 2 h, raport i rozmowa 2 h.
- Jedna poprawka do 2 godzin: instrukcja, działający quickstart lub przykład użycia istniejącego
  API. Zmiana API, systemu kont, płatności lub rozbudowany MCP wymaga osobnego zakresu.
- Do 100 USD kosztów narzędzi/testów wliczone w cenę. Po osiągnięciu limitu nie ponosimy
  dalszych kosztów bez osobnego uzgodnienia; dokumentujemy nieukończone próby.
- Cel dostawy: 10 dni roboczych od gotowych dostępów i akceptacji briefu. Przerwa po stronie
  klienta przesuwa termin; uzgadniamy nowy termin pisemnie.

Limit pracy to warunek przyjęcia zlecenia: jeśli dwa zadania są zbyt szerokie, zawężamy je
przed sprzedażą. Pilotaż nie obejmuje pełnej migracji użytkowników, testu skali milionów
rekordów, oceny prawnej podpisów, prawdziwych zakupów ani wysyłki do klientów dostawcy.

## Karta badania — wypełnić przed startem

| Pole | Co ustalamy |
|---|---|
| Produkt i odbiorca | Jedna usługa, jeden typ integratora, cel potwierdzony przez kupującego |
| Dwa zadania | Dokładny brief, wymagania, oczekiwane artefakty i automatyczne asercje |
| Punkt startu | Repo fixture, wersja runtime, dostęp do sieci, narzędzia, źródła dokumentacji |
| Dostępy | Kto tworzy konto, jakie klucze dostarczono, co wolno agentowi, limity i sprzątanie |
| Warunki A/B | Wersja dokumentów/kodu przed i po; lista różnic; bez pamięci poprzednich prób |
| Wykonanie | Wersje narzędzi i modeli, daty, limity czasu/kosztów, kolejność prób |
| Kryteria | Zaliczenie, wymagany udział człowieka, błąd produktu, błąd środowiska, timeout |
| Dane i odbiór | Syntetyczne fixture, usunięte sekrety, prywatna dostawa, warunki publikacji case study |

Nie traktujemy konieczności zgody, podpisu, wyboru planu czy dostarczenia klucza jako usterki
samodzielności agenta. Rejestracja klienta OAuth, utworzenie konta klienta i autoryzacja to
odrębne operacje. Test może zaczynać się od dostarczonego klucza; wtedy wynik dotyczy integracji
po nadaniu dostępu, a nie samodzielnego onboardingu od zera.

## Przykład zakresu: Raygun

1. Node: agent instrumentuje prosty endpoint. Kontroler wywołuje ten sam syntetyczny wyjątek
   trzy razy i jeden inny. Zaliczenie: oba błędy widoczne, powtórzenia w jednej grupie,
   odrębny błąd w drugiej, czytelne miejsce w kodzie.
2. React: agent instrumentuje aplikację fixture, łapie błąd komponentu i wysyła go do testowej
   aplikacji. Zaliczenie: kontrolowany błąd widoczny i stos odnosi się do źródła; screenshot/odczyt
   panelu oraz identyfikator zdarzenia dołączone jako dowód.

Nie potrzebujemy 4000 prawdziwych zdarzeń, aby sprawdzić podstawową obsługę powtórzeń.
Te zadania są przykładem do uzgodnienia, nie wynikiem wykonanych testów Raygun.

## Jak porównujemy przed i po

Kontroler sprawdza artefakty niezależnie od deklaracji agenta. Kod bez wykonania,
sam komunikat „done” lub HTTP 200 bez oczekiwanego skutku nie zalicza zadania.

Dla każdej pary zadanie/narzędzie pokazujemy ukończenia **x/3**, liczbę interwencji człowieka,
czas do pierwszego potwierdzonego skutku, błędy oraz koszt. Nie mieszamy tych wyników z 0/15
historycznych wzmianek. Przy tak małej próbie nie prognozujemy współczynnika konwersji.

A i B korzystają ze świeżych sesji i tych samych fixture, dostępów oraz wersji narzędzi.
Jeśli poprawka jest lokalna, agent dostaje kontrolowany pakiet dokumentacji A lub B.
Wynik opisujemy jako test tego pakietu; nie dowodzi on lepszej odkrywalności publicznej witryny.
Jeśli testujemy żywą witrynę, zapisujemy zmiany zewnętrzne i ograniczenie wnioskowania o przyczynie.
Kolejność powtórzeń A/B mieszamy, o ile obie wersje są dostępne równocześnie.

Nie usuwamy porażek. Błąd infrastruktury pozostaje w rejestrze; można wykonać najwyżej dwie
dodatkowe próby zastępcze w całym badaniu, w ramach limitów czasu pracy i kosztu.
Timeout jest wynikiem próby. Zmiana modelu lub dostępów uniemożliwia opis jako porównania
w tych samych warunkach; wymaga jawnego rozdzielenia wyników.

Jeśli nie ma poprawki możliwej w zakresie, powtarzamy scenariusze bez zmiany i oznaczamy
drugą turę jako powtórzenie bazowe. Klient otrzymuje diagnozę i zakres potrzebnej pracy;
nie obiecujemy naprawy problemu wymagającego przebudowy produktu.

## Dostawa i odbiór

Klient dostaje prywatny raport, repo fixture z instrukcją uruchomienia, manifest prób,
zanonimizowane transkrypty/logi, wyniki asercji, poprawkę do przeglądu i porównanie A/B
lub jasno oznaczone powtórzenie bazowe. Każda rozpoczęta próba ma zapis i status.
Sekrety są usunięte; dane testowe i uprawnienia sprzątamy zgodnie z uzgodnionym planem.

Odbiór dotyczy wykonania uzgodnionego badania i dostarczenia dowodów, również wyniku
negatywnego. Sukces produktu, wzrost wzmianek lub sprzedaży nie jest obiecanym rezultatem.
Nieukończony zakres wskutek limitów oznaczamy jako nieukończony; sposób domknięcia lub
rozliczenia ustalamy z klientem, nie nazywamy go pełną dostawą.

Publikacja case study i wdrożenie poprawki u klienta wymagają osobnego uzgodnienia.
Jedna rozmowa do 45 minut i jedna korekta błędów faktycznych w ciągu 7 dni od dostawy
są wliczone w limit pracy.

## Ekonomika i decyzja po dwóch klientach

Przy 12 h pracy cena 1500 USD daje 125 USD/h przed kosztami, a po 100 USD kosztów około
117 USD/h. To świadoma cena testowa za naukę procesu i referencję; nie potwierdzona marża
ani docelowa stawka operatora 250 USD/h. Przy tym samym zakresie 3000 USD daje 250 USD/h
przed kosztami. Po dwóch pilotażach mierzymy rzeczywisty czas i koszt, zanim ustalimy ofertę stałą.

Sygnał do dalszej sprzedaży: płatny zakup, problem uznany przez klienta za wart poprawienia,
dowód wykonanej zmiany i dostawa mieszcząca się w limicie. Darmowy raport i odpowiedź
„ciekawe” nie walidują ceny. Jeśli problem jest mało istotny lub dostawa stale przekracza
12 h, zawężamy usługę albo cenę podnosimy; nie rozbudowujemy automatycznie monitoringu.

## Krótki opis dla klienta — szkic angielski

> Can a coding agent complete two real integration tasks using your docs? We test them,
> show the exact failures and human handoffs, improve one small part of the docs or sample
> code, and run the tasks again. You receive the runnable example, evidence from every
> attempt and a before/after comparison. The first two pilots are $1,500 each.
> We agree the tasks and access before starting. Larger product changes are scoped separately.

Ten tekst wymaga zgodności z finalnym zamówieniem. Kampania pozostaje wstrzymana.
