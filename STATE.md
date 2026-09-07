# Let Agents In: migawka na 2026-09-07 (prod v784, korpus 181, formuła 9.57)

Biznes na jednej stronie: `docs/business.md`. Historia rund: `docs/journal-2026-08.md` (do 11.08)
i `docs/journal-2026-08-09.md` (11.08 do 07.09). Ten plik to tylko stan, nie dziennik.

## Nad czym pracujemy

0. **Produkt przed kampanią** — zakres i warunki wznowienia:
   `docs/product-readiness-2026-09-07.md`. Pierwszy etap: trafność pytania w raporcie, źródła
   dopasowania oraz sposób sprawdzenia zaleceń po zmianie. Pierwszy etap zrobiony lokalnie:
   `data/product-review-2026-09-07/loops.html` i `.md`, świeży lokalny skan 07.09 (14/17),
   historyczne biegi bez zmian (0/15). Build, lint, rules i audit-report-scope zielone.
   Generator wymaga `--brief-review FILE` przy publikacji. Zmiany czekają na przegląd i wdrożenie.
   Etap 2: ocenione 10 firm (`docs/brief-reviews/README.md`), 9 dopasowań, Transloadit partial.
   Etap 3: zakres pilotażu gotowy (`docs/integration-pilot-2026-09-07.md`): propozycja 1500 USD,
   24 próby, limit 12 h operatora; nie zmienia cennika. Nowe lokalne raporty: DocuSeal 13/17,
   Raygun 7/16, Logto 9/16, historycznie każde 0/15. NIE GOTOWE DO DOSTAWY: kontrola zaleceń
   wykazała pominięte API reference Raygun/Logto oraz niepotwierdzoną rolę CAPTCHA.
   Konkretne źródła i korekty: `docs/evidence-review-2026-09-07.md`.
   Aktualizacja: korekty są w generatorze/widoku, 9 ocen powiązanych z SHA-256 skanu w
   `docs/recommendation-reviews/`. Publikacja wymaga obu ocen; nowe raporty `data/product-review-2026-09-07/<domena>.md`.
   9 maili bez prognoz wzrostu punktacji, skrzynki ponownie sprawdzone. Build, lint, audit-delivery,
   audit-report-scope i audit-recommendations zielone. Pozostały wdrożenie i sprawdzenie żywych linków.

1. **Przepisanie tekstów po audycie** `docs/copy-audit-2026-09-07.md` (codex gpt-6-astra high,
   zgoda Krystiana na wszystkie fazy). Faza 1+2 ZROBIONA (v784, c3ecc05): generator, widok
   `/d/<id>`, drafty; 10 raportów i próbka przegenerowane pod tymi samymi id, bramki dostawy zielone.
   Faza 3 (`/pricing`) w toku u codexa. Dalej: 4 email-gate i `/r/<id>`, 5 landing, `/audit`,
   kategorie, 6 metodologia, findings, raport branżowy, 7 docs, visibility. Osobny commit i deploy
   na fazę. Brief do fazy w scratchpadzie sesji (`rewrite-phase3-prompt.md`), wzór dla kolejnych.
2. **Kampania „raport w prezencie"**: 10 raportów pod `/d/<id>`, drafty w
   `outreach/drafts/gift-report-2026-09-03.private.md` (poza gitem). Send-as hello@ przez SMTP
   Resenda działa (mail-tester 9.3/10, dkim/spf/dmarc pass). Wysyła Krystian po „ok" na drafty.
   Odbiorcy: wspólne skrzynki firm z tabeli, imię w pierwszej linii.

## Co blokuje

- **KAMPANIA WSTRZYMANA (Krystian, 2026-09-07): nie wysyłać żadnego maila do dziesięciu firm,
  dopóki nie odwoła wstrzymania wprost.** Do 07.09 nic nie wyszło (Sent z hello@: tylko trzy sondy).

- Drafty ma za „ok" (07.09), ale wysyłka czeka na odwołanie wstrzymania. Transloadit pozostaje
  wstrzymany: częściowe dopasowanie wymaga nowego pytania i biegów. Otwarte: korekta zaleceń
  raportów oraz widoczność repo albo migawki korpusu na stronie.
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
