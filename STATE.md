# StackPick: stan na 2026-08-07 (wieczór)

Punkt wejścia po compact. Czytaj przed pracą, razem z `ARCHITECTURE.md`.

## Gdzie to żyje

- Repo: `krystiangw/stackpick` (private), lokalnie `~/projects/stackpick`
- Produkcja: **https://stackpick-f12d13a227ea.herokuapp.com** (Heroku Basic, eu)
- Baza: MongoDB Atlas, klaster `equity-analyst-flex`, baza `stackpick`
- Konsola: `/app?key=<STACKPICK_CONSOLE_TOKEN>` (`heroku config:get STACKPICK_CONSOLE_TOKEN -a stackpick`)
- Poczta: Resend przez klucz współdzielony z `equity-analyst-web`, nadawca `onboarding@resend.dev`,
  co fizycznie wysyła **tylko na adres właściciela konta**. Zweryfikowane, `delivered: true`.
- Domena `stackpick.ai` **nie jest kupiona**. Do outboundu potrzebna domena plus własny nadawca.

## Co działa

Darmowy skan: 14 checków, 5 etapów, 16 punktów, zero LLM, wynik odtwarzalny.
Landing z żywymi rankingami 7 kategorii, karta wyniku pod trwałym linkiem, `/methodology`,
`/findings`, `/pricing`, `/docs`, konsola operatora, wysyłka raportu mailem w HTML,
karta OG generowana per raport, skan strumieniowany przez SSE z realnymi krokami.

**51 domen zeskanowanych** w kategoriach: storage, edytory, auth, email, analytics, wektory, płatności.
Skrajne wyniki: `resend.com` 15/16 (wzorzec do pokazywania), `june.so` 2/16.

Pełny audyt agentowy: `/audit/froala-editors`, dane w `src/data/audits/*.json`.

## Cennik (uzgodniony, `ai-audit/10-cennik.md`)

Free $0 · Diagnostic $2 900 (zaliczany na poczet audytu w 90 dni) · Full audit $11 000 ·
Fix sprint $7 500-16 000 · MCP build $14 000-28 000 · Retainer $3 000/mies ·
godzinowo $250/h min. 8h (podawać tylko na żądanie). Founding client: pierwsze trzy audyty $6 500.
Kotwica: audyty bezpieczeństwa, nie SEO.

## Pierwszy pełny audyt: Froala, N=6

Sześć agentów, dwa modele, zadanie o edytor tekstu. **6/6 wybrało Tiptap.** Froala wymieniona
w 2 przebiegach, w obu skreślona na licencji bez oglądania produktu:
*"Froala / CKBox - Fully commercial, licence key required."*
CKEditor i TinyMCE odpadły tak samo, więc to dynamika całej kategorii.

Materiał na CKSource: *"Since v44 licenseKey is mandatory even for open-source use... Commercial
licence needs a human."*

**Runda 1 była skażona**: sześć agentów w jednym katalogu, dwa zgłosiły to same. Izolowane kopie
i skrypt są gotowe w `<scratchpad>/runs/run-N` oraz `<scratchpad>/seed-app.sh`. Runda 2 nie ruszyła.

## Co naprawiły trzy audyty zewnętrzne

Wszystkie krytyczne błędy **zawyżały** wynik, co jest najgorszym rodzajem błędu tutaj:
sonda kontrolna na catch-all (sentry miał 2/2 za nieistniejące pliki), CAPTCHA po tokenie a nie
po hoście CDN (stripe miał punkt mając hCaptcha w HTML), llms.txt czytany jako źródło discovery,
grep po tekście zamiast po payloadach `<script>`, brak podwójnego liczenia `.well-known`,
robots.txt nieodczytany nie daje darmowych punktów, kontrast WCAG w obu motywach,
paski etapów przestały odwracać dane, karta OG nazywa domenę.

## Co zostało z audytów, w kolejności wagi

1. **"Napraw to najpierw" z deltą** w karcie wyniku: *"Napraw 403, a 3/16 → 6/16, wyprzedzasz
   tiptap.dev"*. Wszystkie dane już są. Najmocniejsza sugestia audytu designu.
2. **429 zabija jedyne CTA.** Przy limicie pokazać przykładowy raport i pole na maila zamiast
   czerwonego błędu. Limit per domena, nie per IP.
3. **Brak przycisku udostępniania** na raporcie, którego zadaniem jest bycie przekazywanym.
4. **Discovery nie sonduje subdomen** `docs.` / `developer.` / `api.` (allegro, stripe).
5. **npm trafia w placeholdery** z dokumentacji (`htmx-ext-extension-name`) i przy 404 z rejestru
   daje twarde zero zamiast fallbacku na wyszukiwanie.
6. Header szerszy niż treść na `/methodology` i `/findings`; `autoFocus` otwiera klawiaturę na
   telefonie; przekreślenie ukończonych kroków czyta się jak anulowanie.
7. Wynik nie ma własnej formy wizualnej: brak sygnaturowego elementu, który niesie markę w OG,
   mailu i na stronie.

## Następne kroki merytoryczne

- Runda 2 przebiegów w izolacji, żeby zmierzyć **stabilność** i wpływ skażenia.
- Hipoteza do potwierdzenia: zadanie wymagające weryfikacji licencji **zmusza** model do sięgnięcia
  po źródła. W badaniu storage Sonnet 0/10, tutaj 6/6 sięgnęło. Jeśli się potwierdzi, to osobny
  wynik handlowy: treść zadania decyduje, czy twoja dokumentacja jest czytana.
- Jeden przebieg (Opus) nie odwiedził **żadnej strony dostawcy**, tylko rejestr npm i `node_modules`.
  Stąd rekomendacja: licencja musi być w metadanych pakietu, nie tylko na stronie.
