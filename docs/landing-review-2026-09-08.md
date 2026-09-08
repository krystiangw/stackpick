# Landing page: audyt i poprawki — 08.09.2026

## Werdykt przed zmianą

Strona była schludna, ale nie tłumaczyła szybko wartości dla nabywcy. Wyglądała jak katalog
badań i skaner. Ocena redakcyjna i wizualna, nie test konwersji ani badanie z użytkownikami.

| Problem | Konkretny przykład | Zmiana |
|---|---|---|
| Brak jasnego odbiorcy i rezultatu | „Agent readiness”, „From your docs to a working integration.” | Nazwano zespoły budujące API i narzędzia dla programistów. Nagłówek mówi o miejscach, w których agenci utknęli; opis wymienia nieudane kroki, dowody i zmianę do sprawdzenia. |
| Punktacja wymagała nauki metodologii | name.com 11/15, słupki A–E, potem link do innego rodzaju raportu | Pierwszy ekran pokazuje konkretny problem z opublikowanego badania integracji i proponowany test poprawki. |
| Usługa znikała za badaniami | Cztery karty wyników, rankingi i pięć etapów przed drugą kopią formularza | Trzy porównywalne oferty zaraz po pierwszym ekranie: bezpłatny skan, raport 49 USD, pilotaż 1500 USD. |
| Niejednoznaczne liczby | „18 / 18” obok „0 / 12”, „5 → 0” obok „one line of code” | Zostały dwa badania z opisanymi jednostkami i pełnymi mianownikami. Pozostałe wyniki dostępne na /findings. |
| Nadmiar powtórzeń | Dwa formularze skanu, osobna lista pięciu etapów, długi blok o monitoringu | Jeden formularz skanu. Definicje punktacji i rankingów przy rozwijanych szczegółach. Monitoring ma krótki opis tygodniowych kontroli i osobne wyjaśnienie eksperymentalnych rekomendacji. |
| Formularz ucinał podpowiedzi | Pole domeny monitoringu miało 106 px przy ekranie 1440 px | Układ zależy od dostępnego miejsca formularza; na nowym landingu pola mają 414 px. |

## Nowy argument produktu

„See where coding agents get stuck with your product.”

Odbiorca: zespoły budujące API i developer tools. Wartość: zobaczyć konkretną przeszkodę,
przeczytać dowód i wybrać zmianę do przetestowania. W pilotażu dochodzi mała poprawka i retest.
To obietnica zakresu pracy, nie obietnica wzrostu sprzedaży lub rekomendacji.

Pierwszy przykład pochodzi z `src/data/audits/paddle-payments.json`, run B, 08.08.2026:
w wygenerowanej aplikacji brak klucza usuwał interfejs płatności mimo poprawnego buildu.
Nie jest to stwierdzenie defektu SDK Stripe ani Paddle. Nowy tekst proponuje jawny błąd
konfiguracji i sprawdzenie buildu; jasno mówi, że tej poprawki jeszcze nie retestowano.

Ceny pochodzą ze wspólnego katalogu. Darmowy skan pozostaje HTTP-only, raport bada nazwy
w odpowiedziach, pilotaż wykonanie zadania. Monitoring jest samodzielną bezpłatną betą.
Badania publiczne są opisane jako niezależne, nie płatne referencje klientów.

## Weryfikacja

- Widoczny tekst w main: 738 → 596 słów, około 19% mniej mimo pokazania pełnej oferty.
- Wysokość strony przy zamkniętych szczegółach: 6065 → 4990 px na 390 px; 3503 → 2915 px na 1440 px.
- Playwright/Chrome: 320, 390, 768 i 1440 px; jasny i ciemny motyw na 390/1440.
- Obejrzano zrzuty desktop/mobile, sprawdzono brak poziomego przepełnienia i błędów JS,
  przejście do skanu, zachowanie domeny z query string, rozwijanie punktacji i zakresu monitoringu.
- Formularze nie wysyłały zapytań ani maili podczas testu widoku.
- `pnpm build` (typecheck, rules i Next build), `pnpm lint`, `git diff --check`: pass.
- `codex review --uncommitted`: bez wykrytych problemów poprawności. Próba uruchomienia rules
  przez sam reviewer trafiła na jego ograniczenie IPC; rzeczywisty build z rules przeszedł poza tym sandboxem.

Dowody lokalne poza gitem: `data/landing-review-2026-09-08/` (before, local, pomiary i kontrole).
To poprawa czytelności i sposobu prezentacji oferty. Jej wpływ na zainteresowanie i sprzedaż
pozostaje do sprawdzenia na rzeczywistych odbiorcach.

## Produkcja

Wdrożono jako **v796 (`cc97d24`)**. Przed wdrożeniem: brak procesu przemiatu korpusu,
brak workflow in progress, Heroku tylko web. Istniejący worker visibility nie jest przemiotem
i nie był zatrzymywany. Po wdrożeniu ponowiono kontrolę sześciu kombinacji ekranu/motywu.
Wszystkie bez overflow i błędów JS. Homepage, pricing, metodologia, findings, próbka i badanie
płatności odpowiadają HTTP 200. Metadane strony głównej zawierają nowy opis usługi.
Dowody: live-checks.json, live-routes.json i live-*.png w katalogu audytu.
