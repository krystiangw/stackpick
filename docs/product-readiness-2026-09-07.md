# Produkt przed wznowieniem kampanii

Decyzja właściciela z 07.09.2026: wstrzymujemy kampanię do dziesięciu firm i dopracowujemy produkt.
Drafty oraz prywatne adresy raportów pozostają w `outreach/drafts/gift-report-2026-09-03.private.md`.
Gotowy raport nie jest zgodą na wysyłkę. Kampanię wznawia właściciel.

## Cel pierwszego etapu

Odbiorca raportu ma móc ustalić, czy badamy jego klienta, co zaobserwowaliśmy i jak sprawdzić
proponowaną zmianę. Raport rozróżnia wzmianki dla konkretnego pytania, obserwacje HTTP oraz
sprawność integracji. Dwa pierwsze są mierzone w raporcie za $49; trzecie wymaga osobnego testu.
Utracona sprzedaż nie jest wynikiem żadnego z tych pomiarów.

Pierwszy przykład: Loops. Publiczna dokumentacja opisuje zastosowania z pytania;
przegląd znajduje się w `docs/brief-reviews/loops.so.json`. Ocena nie potwierdza
częstotliwości takich zapytań przez klientów ani przyczyny pominięcia marki przez agenta.

Stan pierwszego etapu: wdrożony lokalnie w generatorze i widoku raportu. Przykład w
`data/product-review-2026-09-07/loops.html` oraz `loops.md` opiera się na nowym lokalnym skanie
z 07.09 (14/17); historyczne odpowiedzi i wynik 0/15 pozostają bez zmian. Sprawdzono build,
lint, rules, testy oceny briefu i renderowania, odmowę publikacji bez przeglądu oraz spójność
liczb i kroków walidacji w HTML/markdown. Produkcja i istniejące dostawy nie zostały zmienione
w ramach tego etapu.

Kontrola Loops z 07.09: nowy skan wybrał m.in. stronę `/glossary/email-authentication`
do oceny provisioningu. Osobno przeczytano [API key](https://loops.so/docs/api-reference/api-key)
oraz [CLI auth](https://loops.so/docs/cli/auth). Pierwsza opisuje test istniejącego klucza przez
GET, druga wprowadzenie i przechowywanie istniejącego klucza. Żadna z tych dwóch stron nie
opisuje utworzenia nowego klucza przez API. To weryfikacja tych stron, nie dowód braku takiej
funkcji w całym produkcie. Lepszy dobór dokumentów do provisioningu pozostaje zadaniem skanera.

## Warunki gotowości raportu

1. Dokładne pytanie przed liczbami. Zmienione pytanie rozpoczyna osobne badanie; odpowiedzi na
   różne pytania nie mogą wejść do jednego mianownika.
2. Ocena dopasowania zawiera źródła, datę, uzasadnienie i następny krok.
   Brak oceny oznacza szkic. Częściowe dopasowanie lub błędny brief wymagają nowego pytania
   i nowych przebiegów przed dostawą. Nie przepisujemy pytań dawnych przebiegów.
3. Liczby, daty, narzędzia, oryginalne cytaty i ograniczenia są spójne w HTML oraz markdown.
4. Zalecenia ze skanu zawierają sposób sprawdzenia działania po poprawce. Przyrost punktów
   nie jest prognozą wzrostu wzmianek, konwersji ani przychodu.
5. Test integracji rozróżnia brak technicznej możliwości od świadomego przekazania kroku
   człowiekowi. Potrzebne konto, klucz i zgoda na operację są odrębnymi wymaganiami.

## Kolejność prac

| Etap | Wynik do oceny | Warunek zakończenia |
|---|---|---|
| 1. Raport i trafność briefu | Generator, widok, przykład Loops, zasady dostawy | Spójny HTML/markdown; walidacja błędnego briefu; lokalny podgląd |
| 2. Pozostałe firmy | Ocena każdego pytania na podstawie oferty | Każda firma ma uzasadnione dopasowanie lub odłożony raport; Transloadit czeka na nowy brief |
| 3. Pilotaż integracji | Zakres usługi z testem przed/po | Określone scenariusze, uprawnienia, artefakty, mierniki ukończenia i zakres poprawek |
| 4. Oferta i wznowienie | Cennik zgodny z zakresem i gotowe raporty | Właściciel ocenia komplet i decyduje o wysyłce |

Ten etap nie zmienia cen, formuły ani historycznych przebiegów. Monitoring pozostaje bezpłatny.
Przed jego sprzedażą trzeba ustalić stałą częstotliwość pomiaru i odpowiedzialność za wykonanie.
Brak zmiany może oznaczać brak maila, ale nie zastępuje wykonanego pomiaru.

## Kiedy kończymy dopracowanie

Aktualizacja po drugim etapie (07.09): [przejrzano wszystkie dziesięć briefów](brief-reviews/README.md).
Dziewięć ma udokumentowane dopasowanie, Transloadit pozostaje wstrzymany; nowy brief jest szkicem
bez przebiegów. [Zakres pilotażu](integration-pilot-2026-09-07.md) jest gotowy do oceny:
1500 USD jako cena testowa, dwa zadania, 24 próby, jedna mała poprawka, limit 12 h pracy operatora.

Powstały trzy kolejne raporty lokalne w `data/product-review-2026-09-07/`: DocuSeal 13/17,
Raygun 7/16, Logto 9/16, każde nadal historycznie 0/15 wzmianek. Łącznie z Loops są cztery
szkice, **nie cztery gotowe dostawy**. [Kontrola merytoryczna](evidence-review-2026-09-07.md)
wykazała pominięte API reference Raygun/Logto i zalecenie zmiany CAPTCHA bez potwierdzenia
blokady. Przygotowano źródła oraz teksty korekt. Następny etap zaczyna się od ich włączenia
do powtarzalnej dostawy, zanim dopasujemy publiczny cennik do pilotażu.

Walidacja wszystkich 10 przeglądów, testy zakresu raportu, typecheck oraz lint zmienionego
testu przeszły. To sprawdzenie mechanizmu i danych, nie zatwierdzenie zaleceń dla klientów.

Nie czekamy na idealny skaner ani komplet nowych kategorii. Pierwsza tura może wrócić do oceny
właściciela, gdy 3–4 trafne raporty spełnią powyższe warunki i będzie można wyjaśnić, co klient
dostanie w płatnym pilotażu. Do tego czasu nic nie wychodzi.
