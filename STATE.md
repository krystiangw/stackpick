# Let Agents In: migawka na 2026-09-07 (prod v792, korpus 181, formuła 9.57)

Biznes na jednej stronie: `docs/business.md`. Historia rund: `docs/journal-2026-08.md` (do 11.08)
i `docs/journal-2026-08-09.md` (11.08 do 07.09). Ten plik to tylko stan, nie dziennik.

## Nad czym pracujemy

0. **Produkt przed kampanią — materiały gotowe.** Dziewięć źródłowo ocenionych raportów
   pod dotychczasowymi linkami i zgodna próbka Loops na `/d/sample`. Generator wymaga oceny
   briefu i zaleceń powiązanych z SHA-256 skanu. Korekty niepotwierdzonych zaleceń dostarczone.
   Dziewięć lokalnych `.eml` w `data/product-review-2026-09-07/email-drafts/`, nic nie wysłano.
   Kontrola: 10 stron dostaw bez logowania, 7 stron przebiegów / 105 pełnych odpowiedzi,
   35 działających źródeł, skrzynki i zgodność maili. Dowody i audyt zamknięcia:
   `docs/readiness-verification-2026-09-07.md`. Pilotaż: `docs/integration-pilot-2026-09-07.md`
   (1500 USD jako hipoteza, 2 zadania, 24 próby, limit 12 h, niewykonany i niesprzedany).
1. **Copy i UI zamknięte:** pozostałe fazy 5-7 planu redakcyjnego wdrożone jako v790-v792.
   Krótsze strony, czytelna historia przebiegów z filtrami i rozwijanymi odpowiedziami,
   raport z widoczną oceną zakresu, wynikami i rozwijanymi dowodami. Wydruk zawiera pełne treści.
   Kontrola live: 10 dostaw, 7 stron przebiegów / 105 pełnych odpowiedzi, 9 stron publicznych.
   Opis i testy: `docs/ui-ux-review-2026-09-07.md`; zamknięty plan i liczniki słów:
   `docs/copy-rewrite-plan.md`. Znany wyjątek zewnętrznego checkera: zachowane dyrektywy robots.txt.
2. **Kampania „raport w prezencie”:** 9 aktywnych odbiorców, Transloadit wyłączony do nowego
   briefu i nowych przebiegów. Kanoniczne drafty: `outreach/drafts/gift-report-2026-09-03.private.md`
   (poza gitem); instrukcja pakietu `data/product-review-2026-09-07/README-ready.md`.
   Send-as hello@ przez SMTP Resenda uprzednio sprawdzony (mail-tester 9.3/10, DKIM/SPF/DMARC pass).
   Po odwołaniu wstrzymania: pierwsza mała tura Loops, DocuSeal, Raygun, Logto; ocena odpowiedzi
   o trafności zadania. Wysyła Krystian. Otwarć poszczególnych dostaw nie śledzimy.

## Następny kierunek produktu

Po pytaniu właściciela o innych agentów: rozszerzyć dowody poza Claude Code i dwie wersje
Codexa. Adaptery Gemini przez Antigravity i Cursor istnieją, ale nie mają przebiegów w obecnym
korpusie kategorii. Osobny visibility nie jest pokryciem raportów kampanii. Następny dobór próby:
Gemini, potem Cursor, jawny model/wersja i oddzielne wyniki. To kierunek dalszych pomiarów;
nowych testów w ramach przebudowy UI nie uruchomiono.

## Co blokuje

- **KAMPANIA WSTRZYMANA (Krystian, 2026-09-07): nie wysyłać żadnego maila do dziesięciu firm,
  dopóki nie odwoła wstrzymania wprost.** Do 07.09 nic nie wyszło (Sent z hello@: tylko trzy sondy).

- Transloadit: nowy brief jest szkicem z zerem przebiegów. Nie dodawać starego raportu do
  gotowych dziewięciu wiadomości. Nie blokuje rozpoczęcia od trafnych raportów.
- Billing i tożsamość sprzedawcy pozostają do domknięcia przed przyjęciem płatności.

## Decyzje, których nie cofamy

- Klucz Resenda z transkryptu zostaje, bez rotacji (07.09).
- Raporty liczone jako `/d`, nigdy po id; kliknięcia jako `/click/<nazwa>` z zamkniętej listy.
- livekit.com i agora.io poza kampanią (pytanie o wideo nie pasuje do ich produktu); polar.sh
  i betterstack.com w zamian.
- Deploy tylko po typecheck, lint, rules, build i codex review; nigdy w trakcie przemiatu.
- Billing wyłączony, monitoring darmowy bez daty końca, raport kupowany mailem.

## Stan produkcji

v792 (`99b31ca`): dokumentacja API, visibility i raporty z rozwijanymi dowodami oraz pełnym wydrukiem.
v791 (`fba5a5f`): krótsza metodologia, findings i raport branżowy; tabele i sekcje rozwijane.
v790 (`1bd0ae8`): nawigacja, landing, kategorie i przeglądarka odpowiedzi agentów.

v788 (`33e5b4c`): końcowe korekty obietnic na stronie i źródeł Chroma/Polar.
v787 (`a1139d3`): obowiązkowe oceny briefu/zaleceń, raporty z ocenionymi następnymi krokami,
cennik z konkretnym zakresem pilotażu. Dziewięć dostaw oraz próbka ponownie opublikowane.
Typecheck, lint, rules, build i wymagane przeglądy Codex zielone; korpus i dawne biegi bez zmian.
Ruch: 3 kliknięcia z Google w 28 dni; rendery „browser" to głównie crawler z nagłówkiem Mozilla.
Zero klientów, leady i obserwacje w bazie to nasze testy. DMARC p=none, pierwszy raport od Google
zdrowy (DKIM pass przez forward Porkbuna).

## Zaległości (bez zmian)

`oauth_dcr` 0/1 u nas; rescoring historii; schemat odpowiedzi agenta i N>=8; przegląd DMARC
~17.09 i decyzja o `p=quarantine`; PostHog; Paddle i tożsamość sprzedawcy; limit 400 kB odczytu;
publiczna migawka korpusu / dostępność repo do niezależnego przeliczenia skanów;
typed_package na vercel.com; filtr właściciela llms.txt; wiersz `{day:"probe"}` w visits.
