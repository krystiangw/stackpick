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

Stan końcowy 07.09: mechanizm ocen wdrożony, dziewięć raportów opublikowanych pod
istniejącymi linkami, publiczna próbka Loops zgodna z tym samym standardem. Raporty wykorzystują
zamrożone lokalne skany; historyczne odpowiedzi oraz korpus publiczny pozostały bez zmian.
Pełna kontrola i dowody: [weryfikacja gotowości](readiness-verification-2026-09-07.md).

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

Dziewięć raportów spełnia warunki dostawy: DocuSeal, Loops, Upstash, Logto, Raygun,
Windmill, Chroma, Polar i Better Stack. Każda ocena zaleceń jest powiązana z pytaniem,
domeną i SHA-256 konkretnego skanu. Generator wymaga obu przeglądów przed publikacją.
Pominięte dokumenty Raygun/Logto, niepotwierdzona rola CAPTCHA oraz błędny dobór stron
o provisioningu zostały wyjaśnione w ocenach. Żaden raport nie obiecuje wzrostu punktów
ani skuteczności poprawki, której nie przetestowano.

Cennik opisuje zakres pilotażu i wymagany dostęp do środowiska. Landing i findings odróżniają
obserwacje od hipotez; częstotliwość ręcznych biegów monitoringu jest ujawniona. 35 źródeł
i wszystkie raporty sprawdzono na żywo. Dziewięć maili jest gotowych jako lokalne pliki `.eml`.

Próg tego etapu został spełniony: miały wystarczyć 3–4 trafne raporty i zrozumiały zakres
pilotażu, przygotowano dziewięć. Nie czekamy na idealny skaner ani nową kategorię dla
Transloadit. Następny krok po odwołaniu wstrzymania przez właściciela: pierwsze cztery
wiadomości (Loops, DocuSeal, Raygun, Logto), ocena odpowiedzi i trafności pytania przed
rozmową o cenie. Żadnej wiadomości nie wysłano w ramach tych prac.
