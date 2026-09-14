# Let Agents In: migawka na 2026-09-14 (prod v804, korpus 181, formuła 9.57)

Biznes: `docs/business.md`. Historia rund: `docs/journal-2026-08.md`, `docs/journal-2026-08-09.md`
(do 07.09). Ten plik to stan, nie dziennik; szczegóły wdrożeń są w `docs/` i w git log.

## Nad czym pracujemy

**SEO, 14.09 (tablica #61/#62, zamknięte):** SEO-raport wykazał w GSC, że `/c/*/runs` weszły
do indeksu 06-08.09 i zabrały 184/421 wyświetleń bez klików, spychając strony kategorii.
Decyzja właściciela: `noindex, follow` na `/c/*/runs` plus usunięcie ich z sitemapy (v804,
`9b08a11`). Unikalne h1/title/description były już od v803 (11.09). Sprawdzić GSC ok. 17-18.09,
czy wyświetlenia wróciły na strony kategorii. Nie otwieramy prywatnych `/r/`, `/watch/` do indeksu.

**Kampania „raport w prezencie”:** 40 firm w dwóch partiach wysłano 08.09 (listy:
`docs/outreach-top20-2026-09-08.md`, `docs/outreach-wave2-2026-09-08.md`; `.eml` w
`data/outreach-*/sent/`). Nie wysyłać ponownie, bez automatycznych follow-upów, bez kolejnej
partii przed oceną odpowiedzi. Odpowiedzi trafiają na Formspree (`mpzkgdjw`, 50/mies.) i Gmail.
Następny krok: odpowiedzi i dopasowanie pilotażu (1500 USD, 2 zadania, 24 próby;
`docs/integration-pilot-2026-09-07.md`). Popyt nadal niepotwierdzony, zero klientów.

**Cursor Free:** LaunchAgent `com.letagentsin.cursor-discovery` o 10:15 dobiera 16 braków,
najwyżej jedna próba dziennie, błąd zatrzymuje kolejkę; wyniki wymagają ręcznej kontroli
i publikacji. `docs/cursor-free-plan-2026-09-07.md`.

## Co blokuje

- Billing i tożsamość sprzedawcy do domknięcia przed przyjęciem płatności (sprzedaż przez
  rozmowę, rozliczenie ręczne; `docs/payments-first-sales-2026-09-08.md`).
- Transloadit: brief bez przebiegów, nie wraca do kampanii bez nowych pomiarów.
- GSC ma 2-3 dni opóźnienia: efektów v803/v804 nie da się jeszcze zmierzyć.

## Decyzje, których nie cofamy

- Klucz Resenda z transkryptu zostaje bez rotacji (07.09).
- Raporty liczone jako `/d`, nigdy po id; kliki jako `/click/<nazwa>` z zamkniętej listy.
- livekit.com i agora.io poza kampanią; polar.sh i betterstack.com zamiast nich.
- Deploy po typecheck, lint, rules, build i review świeżym subagentem na innym modelu
  (Codex wyłączony od 11.09); nigdy w trakcie przemiatu korpusu.
- Billing wyłączony, monitoring darmowa beta bez daty końca, raport 49 USD, dwa pierwsze
  pilotaże po 1500 USD; sprzedaż zaczyna się od `/pricing#contact`.
- Noindex na `/c/*/runs` (14.09): nie przywracać do sitemapy bez nowych danych GSC.

## Stan produkcji

v804 (`9b08a11`, 14.09): noindex,follow na `/c/*/runs`, sitemap bez tych URL (223 wpisy).
v803 (`e9c8e3b`, 11.09): unikalne h1/title/og:description dla `/c/*/runs`.
v801 (`c57c8b4`, 09.09): `license` na Datasetach kategorii, formularz skanu, stopka; walidacja
GSC 24 elementów uruchomiona 09.09.
v798 (`258d5ff`, 09.09): HTTPS bez www, canonicale, Formspree (`docs/seo-fix-2026-09-09.md`).
GSC baseline 28 dni do 06.09: 5 kliknięć / 721 wyświetleń.
Wcześniej: v796 landing, v795 cennik, v793 Antigravity+Cursor w raportach (445 odpowiedzi
łącznie), v787 obowiązkowe oceny briefu i zaleceń. DMARC p=none, decyzja o quarantine ~17.09.

## Zaległości (bez zmian)

`oauth_dcr` 0/1 u nas; rescoring historii; schemat odpowiedzi agenta i N>=8; PostHog; Paddle;
limit 400 kB odczytu; publiczna migawka korpusu; typed_package na vercel.com; filtr właściciela
llms.txt; wiersz `{day:"probe"}` w visits.
