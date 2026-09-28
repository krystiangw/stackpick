# Let Agents In: migawka na 2026-09-28 (prod v806, korpus 181, formuła 9.57)

Biznes: `docs/business.md`. Historia rund: `docs/journal-2026-08.md`, `docs/journal-2026-08-09.md`
(do 07.09). Ten plik to stan, nie dziennik; szczegóły wdrożeń są w `docs/` i w git log.

## Nad czym pracujemy

**SEO, `/c/*/runs` (tablica #61/#62 zamknięte, #63 otwarte):** `/runs` kanibalizowały strony
kategorii, więc 14.09 dostały `noindex, follow` (v804). Ta poprawka nie zadziałała i wiem dlaczego.
Zmierzone 28.09 przez URL Inspection na 249 adresach: 25 z 26 `/runs` nadal w indeksie, z crawlami
z 19.08 i 06-09.09, czyli sprzed poprawki. Jedyny przeczołgany tego dnia
(`/c/documents-signature/runs`) od razu wypadł jako „wykluczona przez noindex”. Czyli tag jest
dobry, tylko Google po niego nie wracał: v804 ustawił noindex I w tym samym wydaniu wyrzucił te
URL z sitemapy, a sitemapa była sygnałem „wróć tu”. Impresje 13-26.09 to potwierdzają:
`/c/feature-flags/runs` 109 (+72), `maps-geo/runs` 51 (+31), `rich-text-editors/runs` 41 (+18),
a `/c/feature-flags` i `/c/app-hosting` wypadły z raportu. Kliknięć witryny 0.
**Następny krok (#63):** powtórzyć inspection ok. 12.10; gdy wszystkie 26 pokażą „wykluczona przez
noindex”, usunąć `RUNS_AWAITING_RECRAWL` z `src/app/sitemap.ts`. Wcześniej nie ruszać.
Nie otwieramy prywatnych `/r/`, `/watch/` do indeksu.

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
- GSC ma 2-3 dni opóźnienia. Deindeksacja `/runs` czeka na crawl Google i nie da się jej wymusić
  z API (Indexing API obsługuje tylko JobPosting i BroadcastEvent); ręczne „Request indexing”
  w UI, ok. 10-12 URL dziennie, to jedyna szybsza droga i wymaga właściciela.

## Decyzje, których nie cofamy

- Klucz Resenda z transkryptu zostaje bez rotacji (07.09).
- Raporty liczone jako `/d`, nigdy po id; kliki jako `/click/<nazwa>` z zamkniętej listy.
- livekit.com i agora.io poza kampanią; polar.sh i betterstack.com zamiast nich.
- Deploy po typecheck, lint, rules, build i review świeżym subagentem na innym modelu
  (Codex wyłączony od 11.09); nigdy w trakcie przemiatu korpusu.
- Billing wyłączony, monitoring darmowa beta bez daty końca, raport 49 USD, dwa pierwsze
  pilotaże po 1500 USD; sprzedaż zaczyna się od `/pricing#contact`.
- Noindex na `/c/*/runs` zostaje. Same URL-e wróciły do sitemapy 28.09 (v806) i to NIE jest cofnięcie
  tamtej decyzji: są tam po to, żeby Google je przeczołgał i wyrzucił z indeksu. Wychodzą z sitemapy
  dopiero, gdy inspection pokaże wszystkie jako wykluczone. Nie mieszać tych dwóch rzeczy.

## Stan produkcji

v806 (28.09): `/c/*/runs` z powrotem w sitemapie z `lastmod=2026-09-14` i priority 0.1 (249 wpisów),
IndexNow ich nie zgłasza. Tymczasowe, warunek wyjścia w `src/app/sitemap.ts` i w #63.
v805 (`82517c7`, 14.09): formularz kontaktowy potwierdza w miejscu zamiast redirectu na formspree.io,
`/thanks` jako ścieżka bez JS, `scripts/traffic.mts`.
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
