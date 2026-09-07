# Czytelność strony i raportów, 2026-09-07

Zamknięto pozostałe fazy 5-7 planu `copy-rewrite-plan.md` i zakres UI dodany przez właściciela.
Kierunek wizualny zachowuje jasną/ciemną paletę i spokojną typografię strony. Zmiany dotyczą
hierarchii informacji, długości tekstu, nawigacji oraz wyboru szczegółów do czytania.

## Co się zmieniło

- Strona główna: formularz i przykład wyniku w pierwszej sekcji; krótsze opisy badań;
  rozwijane rankingi kategorii zamiast długiej listy wszystkich tabel.
- Nawigacja: trzy główne pozycje, rozwijane menu badań i dokumentacji, aktywna pozycja,
  obsługa klawiatury i układ mobilny.
- Historia przebiegów: wybór narzędzia/daty i dostawcy, licznik wyników, osobno otwierane
  odpowiedzi, czytelny Markdown z tabelami i kodem. Pełny oryginał pozostaje dostępny.
  Link do konkretnego przebiegu otwiera go także po powrocie przez historię przeglądarki.
- Metodologia i findings: spisy treści, porównania w tabelach, historia zmian i ograniczenia
  w rozwijanych sekcjach. Raport branżowy opisuje zakres pomiaru bez metafor o sprzedaży.
- Dostarczany raport: widoczna ocena trafności pytania, dwa wyniki, następne kroki;
  dokładne pytanie, źródła, uzasadnienia, cytaty i szczegóły pomiarów rozwijane w miejscu.
  Wydruk automatycznie otwiera dowody i przywraca stan sekcji po zakończeniu drukowania.
- Dokumentacja API: wywołanie, odpowiedź i przykład; osobne opisy pól i formatów.
  Visibility wyjaśnia kolejkę i brak ustalonego czasu zakończenia.

## Kontrole

Każda faza przeszła typecheck, pełny lint, reguły repozytorium, build i `codex review --uncommitted`.
Przeglądy końcowe nie zgłosiły regresji. Zachowano literalne zabezpieczenia w `scripts/rules.mts`.
Dodatkowe audyty sprawdziły tożsamość pytania, oceny briefów, powiązanie zaleceń ze skanem
oraz bezpieczne renderowanie odpowiedzi Markdown.

Przeglądarka: szerokości 390 i 1440 px, jasny i ciemny motyw. Brak przewijania całej strony
w poziomie i błędów JS w sprawdzonych widokach. Szerokie tabele mają własne przewijanie.
Przetestowano filtry, brak wyników, reset, rozwijanie, link do przebiegu, Back i Escape w menu.
PDF próbki zawiera dokładne pytanie, pełne obserwacje, walidację i uzasadnienie oceny briefu.

Lokalne dowody: `data/ui-rewrite-2026-09-07/` (katalog ignorowany przez git).
Skrócenie widoku nie oznacza usunięcia dowodów. Modele dostaw, pytania, odpowiedzi,
liczby, ceny i źródła nie zostały zmienione przez tę przebudowę UI.

Kampania nadal wstrzymana. Żadnych wiadomości nie wysłano.

Wdrożenia: v790 (`1bd0ae8`), v791 (`fba5a5f`), v792 (`99b31ca`).
Produkcja: zgodność 10 dostaw, 7 stron przebiegów / 105 pełnych odpowiedzi i 9 stron publicznych.
Zewnętrzny checker discoverability: 10 PASS, 1 FAIL dla świadomie zachowanych dyrektyw
robots.txt; szczegóły i wyniki miernika stylu zapisano w `copy-rewrite-plan.md`.

## Zakres agentów po pytaniu właściciela

Obecny korpus kategorii zawiera Claude Code oraz dwie wersje Codex CLI. Piętnaście prób
w kategorii kampanii nie oznacza piętnastu agentów ani trzech rodzin modeli.
`harness/agents.mts` ma także adaptery Antigravity (Gemini) i Cursor; sam adapter nie jest
wynikiem badania. Worker visibility używa Claude, Codex i Antigravity oraz osobno Perplexity
Search. Obserwacje visibility nie zostały dodane do obecnych raportów kampanii.

Kierunek następnego rozszerzenia: Gemini jako dodatkowa rodzina modeli, następnie Cursor jako
inne środowisko pracy. Model i jego wersję należy zapisać jawnie, wraz z dostępnymi narzędziami
i kontekstem operatora. Wyniki prezentować osobno dla konfiguracji. W pilotażu dobierać dwa
narzędzia do pracy klienta, w ramach istniejącego limitu 24 prób. Nowych przebiegów nie wykonano.
