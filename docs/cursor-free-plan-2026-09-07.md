# Cursor Free: limit i kolejka pomiarów

Sprawdzone 2026-09-07 w oficjalnych materiałach oraz zalogowanym panelu tego konta.

## Co wiadomo

- [Cennik](https://cursor.com/pricing) opisuje Hobby jako Free z ograniczonymi żądaniami Agent;
  nie podaje dokładnej liczby żądań ani tokenów. Nie przyjmujemy starego limitu 50/500 z cudzych wpisów.
- [Opis planów](https://prod.cursor.com/help/account-and-billing/pricing) wymienia Auto w Hobby.
  W naszym CLI próba Composer 2.5 została odrzucona komunikatem `Named models unavailable`.
  Cennik strony wymienia także dostęp do Composer; nie dowodzi to dostępności wyboru Composer 2.5
  w tym koncie i wersji CLI. Do pomiarów użyliśmy działającego Auto.
- [Limity](https://prod.cursor.com/help/models-and-usage/usage-limits) odnawiają się miesięcznie
  według cyklu konta. Panel Spending naszego konta pokazuje **Free, reset 10 września, 3 dni**.
- Panel Usage dla 1-7 września: **834,5 tys. tokenów, 20 zdarzeń, on-demand 0**. W tej serii
  zachowaliśmy **19 pełnych odpowiedzi**. Zdarzenie rozliczeniowe nie musi być ukończoną odpowiedzią.
  To obserwacja tego konta i tych zadań, nie ustalony limit Free dla każdego użytkownika.
- Kolejne 16 prób Auto zakończyło się `ActionRequiredError: You've hit your usage limit`.
  Są wyłączone z mianowników. Dodatkowy preflight Composer również nie był odpowiedzią badawczą.

Przerwy minutowe nie odnawiają miesięcznej puli. Rozłożenie pracy ma sens przy ograniczeniu
łącznego zużycia i zachowaniu już zebranych odpowiedzi. Upgrade pozostaje opcją, ale na razie
korzystamy z Free. Nie zmieniono planu ani ustawień płatnego zużycia.

## Oszczędny tryb

Jedna kategoria obsługuje wszystkie pasujące raporty: Upstash i Windmill korzystają z tych samych
odpowiedzi. Nie powtarzamy badania dla każdego dostawcy. Pytanie pozostaje bez zmian; skracanie
go dla oszczędności zmieniłoby pomiar. Każda sesja ma pusty katalog poza repozytorium produktu.

`harness/discovery-queue.mts` zbiera najwyżej jedną odpowiedź na dzień UTC, zachowuje udane
wyniki i zatrzymuje kolejkę przy pierwszym błędzie konta lub wykonania. Domyślnie działa bez
wywołania agenta; wykonanie wymaga `--execute`. Nie eksportuje ani nie publikuje raportów i nie
wysyła wiadomości. Nowe daty pozostają osobnymi partiami przy eksporcie.

Stan: `data/agent-expansion-2026-09-07/cursor-queue.json` (lokalny, poza gitem).
Brakuje: auth 1, error-monitoring 5, payments 5, vector-search 5. Pierwsza dopuszczalna próba:
**11 września 08:00 UTC**, po dniu odnowienia, którego dokładnej godziny panel nie pokazuje.
Przy jednej udanej próbie dziennie komplet przypadnie najwcześniej na 26 września.
Nie jest to obietnica dostępności Free: inne użycie konta i koszt Auto mogą zmniejszyć pulę.

Pole `paused` blokuje wszystkie dalsze wywołania po błędzie. Wznowienie wymaga sprawdzenia
panelu, ustawienia potwierdzonego `notBefore` i usunięcia pauzy. Plik `.lock` chroni przed dwoma
uruchomieniami naraz; po przerwaniu procesu należy sprawdzić zapisane `RUN.json` przed zdjęciem blokady.

```bash
npx tsx harness/discovery-queue.mts data/agent-expansion-2026-09-07/cursor-queue.json
```

Surowe wyniki kolejki są przechowywane poza repozytorium w `~/.letagentsin-cursor-queue/2026-09-07/`.
Przed dopisaniem do raportów trzeba przejrzeć wyniki, wyeksportować każdy datowany katalog przez
`export-cells.mts --append`, przeliczyć modele raportów i przejść zwykłe kontrole publikacji.

## Włączony harmonogram

Zainstalowano i załadowano lokalny LaunchAgent:
`~/Library/LaunchAgents/com.letagentsin.cursor-discovery.plist`.
Sprawdza kolejkę codziennie o **10:15 czasu komputera** (obecnie Europe/Warsaw).
Pierwsze wywołanie agenta może nastąpić **11 września o 10:15**. Kontrola po instalacji:
zadanie załadowane, zero uruchomień; kolejka zgłasza 16 braków i `waiting`.

To zadanie lokalne: wymaga zalogowanego użytkownika i dostępnego komputera. Uśpienie lub brak
sieci może opóźnić pomiar. Nie gwarantujemy ukończenia 26 września. Po zebraniu 16 odpowiedzi
kolejne kontrole nie wywołują Cursor. Wyniki wymagają osobnego przeglądu i publikacji.
Logi: `data/agent-expansion-2026-09-07/cursor-schedule.log` i `cursor-schedule-error.log`.

Wyłączenie harmonogramu:

```bash
launchctl bootout "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.letagentsin.cursor-discovery.plist"
```
