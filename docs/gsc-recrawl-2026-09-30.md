# Ręczne wymuszenie recrawlu `/c/*/runs` - 30 września 2026

Lista do ręcznego "Request indexing" w interfejsie Search Console. Skraca deindeksację
z tygodni czekania do kilku dni.

## Dlaczego ręcznie

`/c/*/runs` oddają `noindex, follow` od 14.09 (v804), ale noindex działa dopiero wtedy, gdy Google
ponownie pobierze stronę. v804 w tym samym wydaniu wyrzucił te adresy z sitemapy, czyli odciął
sygnał "wróć tu". v806 (28.09) przywrócił je z `lastmod=2026-09-14`.

Stan na 30.09, dwa dni po v806: **25 z 26 nadal w indeksie, żadna nie została przeczołgana
ponownie** (daty crawla wciąż 19.08 i 06-09.09, bez zmian od 28.09). Sitemapa sama nie wystarczy
w rozsądnym czasie.

Indexing API tego nie zrobi: obsługuje wyłącznie `JobPosting` i `BroadcastEvent`. Ping sitemapy
Google wycofał. Zostaje interfejs.

## Jak

1. Otwórz <https://search.google.com/search-console/inspect?resource_id=sc-domain%3Aletagentsin.com>
2. Wklej adres, Enter, potem **"Poproś o zaindeksowanie"**.
3. Limit to około 10-12 adresów dziennie na właściwość. Po jego wyczerpaniu GSC odmawia
   i trzeba wrócić następnego dnia, dlatego lista jest podzielona na trzy dni.

Kolejność nie jest dowolna: od stron, które zabierają najwięcej wyświetleń swojej kategorii.
Kolumna `imp` to wyświetlenia strony `/runs` w oknie 31.08-28.09, `kat` to wyświetlenia strony
kategorii w tym samym oknie. Tam gdzie `kat` jest bliskie zeru, `/runs` zajęła jej miejsce
całkowicie.

## Dzień 1 (10 adresów, największa szkoda)

| # | imp | kat | adres |
|---|-----|-----|-------|
| 1 | 146 | 36 | https://letagentsin.com/c/feature-flags/runs |
| 2 | 76 | 4 | https://letagentsin.com/c/maps-geo/runs |
| 3 | 74 | 12 | https://letagentsin.com/c/rich-text-editors/runs |
| 4 | 53 | 6 | https://letagentsin.com/c/file-storage/runs |
| 5 | 52 | 11 | https://letagentsin.com/c/notifications/runs |
| 6 | 48 | 1 | https://letagentsin.com/c/communications/runs |
| 7 | 39 | 5 | https://letagentsin.com/c/video/runs |
| 8 | 38 | 10 | https://letagentsin.com/c/error-monitoring/runs |
| 9 | 28 | 9 | https://letagentsin.com/c/databases/runs |
| 10 | 24 | 4 | https://letagentsin.com/c/localization/runs |

## Dzień 2 (10 adresów)

| # | imp | kat | adres |
|---|-----|-----|-------|
| 11 | 23 | 7 | https://letagentsin.com/c/domains-dns/runs |
| 12 | 20 | 3 | https://letagentsin.com/c/browser-infrastructure/runs |
| 13 | 19 | 3 | https://letagentsin.com/c/commerce/runs |
| 14 | 16 | 23 | https://letagentsin.com/c/app-hosting/runs |
| 15 | 16 | 0 | https://letagentsin.com/c/llm-infrastructure/runs |
| 16 | 15 | 3 | https://letagentsin.com/c/background-jobs/runs |
| 17 | 15 | 0 | https://letagentsin.com/c/payments/runs |
| 18 | 14 | 0 | https://letagentsin.com/c/headless-cms/runs |
| 19 | 13 | 13 | https://letagentsin.com/c/scheduling/runs |
| 20 | 11 | 2 | https://letagentsin.com/c/auth/runs |

## Dzień 3 (5 adresów, resztki)

| # | imp | kat | adres |
|---|-----|-----|-------|
| 21 | 10 | 7 | https://letagentsin.com/c/search/runs |
| 22 | 8 | 6 | https://letagentsin.com/c/transactional-email/runs |
| 23 | 5 | 28 | https://letagentsin.com/c/vector-search/runs |
| 24 | 3 | 2 | https://letagentsin.com/c/observability/runs |
| 25 | 0 | 0 | https://letagentsin.com/c/product-analytics/runs |

## Czego NIE zgłaszać

`https://letagentsin.com/c/documents-signature/runs` - Google przeczołgał ją 28.09 sam i już
pokazuje "Strona wykluczona za pomocą tagu noindex". Zgłoszenie byłoby zmarnowaniem jednego
z dziennego limitu. To jednocześnie dowód, że tag działa, gdy tylko zostanie odczytany.

## Czego się spodziewać

- GSC zacznie raportować te adresy jako **"Submitted URL marked noindex"**. To nie usterka:
  ten komunikat pojawia się dokładnie wtedy, gdy Google w końcu przeczytał tag.
- Wyświetlenia stron kategorii powinny wrócić, ale nie natychmiast. Deindeksacja jednej strony
  nie przenosi jej pozycji na inną w tym samym tygodniu.
- Kliknięcia witryny to 0 od miesiąca i ta poprawka sama tego nie zmieni. Odzyskuje tylko
  miejsce w wynikach, o które konkurowaliśmy sami ze sobą.

## Domknięcie (tablica #63)

Około 12.10 powtórzyć:

```bash
uv run ~/.claude/scripts/gsc-inspect.py inspect <lista 26 adresów> sc-domain:letagentsin.com
```

Gdy wszystkie 26 pokażą "Strona wykluczona za pomocą tagu noindex", usunąć
`RUNS_AWAITING_RECRAWL` z `src/app/sitemap.ts`. Wcześniejsze usunięcie restartuje czekanie.
