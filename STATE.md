# Let Agents In: migawka na 2026-09-07 (prod v783, korpus 181, formuła 9.57)

Biznes na jednej stronie: `docs/business.md`. Historia rund: `docs/journal-2026-08.md` (do 11.08)
i `docs/journal-2026-08-09.md` (11.08 do 07.09). Ten plik to tylko stan, nie dziennik.

## Nad czym pracujemy

1. **Przepisanie tekstów po audycie** `docs/copy-audit-2026-09-07.md` (codex gpt-6-astra high,
   zgoda Krystiana na wszystkie fazy). Faza 1+2 (generator raportu, drafty) zrobiona przez codexa,
   czeka na mój przegląd i bramki. Dalej: 3 `/pricing`, 4 email-gate i `/r/<id>`, 5 landing,
   `/audit`, kategorie, 6 metodologia, findings, raport branżowy, 7 docs, visibility, `/d/<id>`.
   Każda faza = osobny commit i deploy. Po fazie 1 przegenerować 10 raportów pod tymi samymi id.
2. **Kampania „raport w prezencie"**: 10 raportów pod `/d/<id>`, drafty w
   `outreach/drafts/gift-report-2026-09-03.private.md` (poza gitem). Send-as hello@ przez SMTP
   Resenda działa (mail-tester 9.3/10, dkim/spf/dmarc pass). Wysyła Krystian po „ok" na drafty.
   Odbiorcy: wspólne skrzynki firm z tabeli, imię w pierwszej linii.

## Co blokuje

- „ok" Krystiana na przepisane drafty (nic nie wychodzi bez tego).
- Rozszerzenie Chrome bywa odłączone; popup send-as Gmaila jest poza jego zasięgiem.

## Decyzje, których nie cofamy

- Klucz Resenda z transkryptu zostaje, bez rotacji (07.09).
- Raporty liczone jako `/d`, nigdy po id; kliknięcia jako `/click/<nazwa>` z zamkniętej listy.
- livekit.com i agora.io poza kampanią (pytanie o wideo nie pasuje do ich produktu); polar.sh
  i betterstack.com w zamian.
- Deploy tylko po typecheck, lint, rules, build i codex review; nigdy w trakcie przemiatu.
- Billing wyłączony, monitoring darmowy bez daty końca, raport kupowany mailem.

## Stan produkcji

v783: cennik przebudowany (v782), licznik przycisków (v783), `/app` pokazuje „buttons pressed".
Ruch: 3 kliknięcia z Google w 28 dni; rendery „browser" to głównie crawler z nagłówkiem Mozilla.
Zero klientów, leady i obserwacje w bazie to nasze testy. DMARC p=none, pierwszy raport od Google
zdrowy (DKIM pass przez forward Porkbuna).

## Zaległości (bez zmian)

`oauth_dcr` 0/1 u nas; rescoring historii; schemat odpowiedzi agenta i N>=8; przegląd DMARC
~17.09 i decyzja o `p=quarantine`; PostHog; Paddle i tożsamość sprzedawcy; limit 400 kB odczytu;
typed_package na vercel.com; filtr właściciela llms.txt; wiersz `{day:"probe"}` w visits.
