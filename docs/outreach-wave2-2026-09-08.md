# Druga partia outreach — 08.09.2026

Wysłano 20 indywidualnych wiadomości do 20 nowych firm, po poleceniu właściciela: „kolejne 20 w nowym stylu (do innych firm)”. Łącznie obie partie obejmują 40 różnych firm. Pierwszej dwudziestki nie kontaktowano ponownie.

## Styl i powód do odpowiedzi

Nadawca: **Krystian from Let Agents In <hello@letagentsin.com>**. Zwykły tekst, bez Cc/Bcc i załączników. Wiadomości mają 88–103 słowa i zaczynają się od: „I'm Krystian, founder of Let Agents In. I study how coding agents choose developer tools.”

Każdy mail zawiera konkretny scenariusz, daty oraz licznik z zapisanych odpowiedzi, jeden prywatny raport i jedno pytanie. Zamiast prośby o ogólny feedback proponujemy krótki plan dwóch testów integracyjnych. Przykład dla Uploadcare: „Want me to send a one-page test plan for the first screenshot upload and an expired-signature retry?”

Wszystkie 20 planów przygotowano przed wysyłką. Są to propozycje zadań, warunków startowych i dowodów do zebrania; testów nie wykonano. Zgoda na otrzymanie planu nie jest zakupem pilotażu ani obietnicą bezpłatnego pełnego audytu. Ewentualny pilotaż wymaga osobnego uzgodnienia zakresu i ceny.

Nie piszemy o utraconej sprzedaży ani nie przypisujemy przyczyn zerowym wynikom. Dla często wymienianych firm powodem kontaktu jest przejście od rekomendacji do działającej integracji. Pierwszej partii nie wysłano „poprawki” do poprzedniego maila.

## Wysłane wiadomości

Wzmianki oznaczają nazwę w odpowiedzi, nie udział w rynku. Czasy Europe/Warsaw.

| Firma | Odbiorca | Wzmianki | Wysłano |
|---|---|---:|---|
| restate.dev | Stephan | 0/25 | 20:05:39 |
| stytch.com | Reed | 16/24 | 20:05:40 |
| kinde.com | Koosha | 0/24 | 20:05:41 |
| meilisearch.com | Quentin | 15/15 | 20:05:42 |
| typesense.org | Jason | 15/15 | 20:05:43 |
| tiptap.dev | Patrick | 15/15 | 20:06:15 |
| uploadcare.com | Egor | 1/15 | 20:06:16 |
| imagekit.io | Manu | 0/15 | 20:06:17 |
| tigrisdata.com | Ovais | 0/15 | 20:06:18 |
| browserbase.com | Paul | 15/15 | 20:06:19 |
| firecrawl.dev | Caleb | 0/15 | 20:06:20 |
| browserless.io | Joel | 15/15 | 20:06:21 |
| scrapingbee.com | Pierre | 2/15 | 20:06:22 |
| apify.com | Marek | 14/15 | 20:06:23 |
| posthog.com | Tim | 15/15 | 20:06:25 |
| getunleash.io | Ivar | 15/15 | 20:07:54 |
| mux.com | Justin | 15/15 | 20:07:55 |
| strapi.io | Nicolas | 1/15 | 20:07:56 |
| sanity.io | Simen | 15/15 | 20:07:58 |
| uploadthing.com | Theo | 3/15 | 20:08:00 |

## Dobór i źródła

Wybrano firmy z istniejącym korpusem odpowiedzi i zastosowaniem potwierdzonym przez aktualną dokumentację. Nie dobrano ich wyłącznie według niskiego wyniku: PostHog i Mux były pierwszą nazwą we wszystkich 15 odpowiedziach swojej kategorii. To dobra okazja do rozmowy o jakości wdrożenia przez agenta, nie do diagnozowania braku widoczności.

Kontakty są imienne: założyciele lub osoby rozwijające oficjalne SDK. Wszystkie adresy opublikowano w zawodowym kontekście: metadane SDK, oficjalne repozytoria i własne wypowiedzi założycieli. Nie użyto brokerów ani zgadywanych aliasów. Skrzynkę Ovaisa z Gmaila opublikowano w oficjalnym pakiecie Tigris. Adres Joela jest zapisany słownie w jego artykule; adres Pierre'a potwierdza indeksowana wypowiedź autora na Indie Hackers, podczas gdy zwykłe pobranie strony zwraca powłokę JavaScript.

Liveblocks odłożono, bo pytanie o podstawowy edytor słabo odzwierciedla jego warstwę współpracy. Flagsmith i ConfigCat odłożono ze względu na pełny zakres analizy A/B w pytaniu. Orama wymaga wyjaśnienia aktualnej tożsamości/domeny. Unleash pozostaje w partii z jawnym warunkiem: pomiar eksperymentu wymaga zewnętrznej analityki. Strapi wymaga odpowiedniego płatnego planu dla historii treści.

## Raporty i sprawdzenie

- 20 świeżych skanów z 08.09, 20 ocen dopasowania pytania i 20 ocen zaleceń związanych z SHA-256 skanu. Wszystkie nieudane i niezmierzone kontrole mają interpretację redakcyjną.
- 57 adresów dokumentacji i źródeł raportów odpowiedziało HTTP 200. To kontrola dostępności; oceny treści są zapisane oddzielnie w plikach brief-reviews i recommendation-reviews.
- Wykorzystano istniejące datowane odpowiedzi. Restate: 25; Stytch/Kinde: 24, z czterech narzędzi, 16.08–07.09. Pozostałe firmy: 15, Claude Code i Codex, 16.08–02.09. Nie wykonano nowych biegów i nie kupiono upgrade'u Cursor.
- Raporty mają krótkie podsumowania i rozwijane dowody. Lokalne i opublikowane wersje sprawdzono na 390 px; wszystkie opublikowane także na desktopie: właściwa firma, dokładne pytanie, licznik, działający link do przebiegów i brak poziomego przepełnienia. Wybrane zrzuty obejrzano wizualnie.
- Przeszły audit-report-scope, audit-recommendations, audit-delivery i audit-fix-arithmetic. Generator i publikacja zweryfikowały finalne oceny każdego raportu. Migawki nie zmieniły publicznego korpusu ani kodu strony; nie było wdrożenia aplikacji.
- Każdy z 20 maili odczytano z Gmaila po wysłaniu: SENT, dokładne From/To, temat i treść, właściwy prywatny raport. Zapis dostawy w bazie porównano z lokalnym modelem i korpusem.
- Przy PostHog narzędzie zwróciło błąd mimo wysłania wiadomości. Pierwsze wyszukanie nie zwróciło wyniku; ponowne wykazało SENT. Odczyt potwierdził zgodną treść. Nie ponawiano wysyłki i nie powstał duplikat.

SENT nie potwierdza przeczytania ani umieszczenia w Inbox. Nie śledzimy otwarć poszczególnych raportów. Kontrole live generują nasz własny ruch. Ta partia nie jest kontrolowanym testem A/B stylu, ponieważ trafia do innych firm.

## Co dalej

Zatrzymać rozszerzanie listy po tych 40 kontaktach i ocenić odpowiedzi. Na „tak” dostarczyć przygotowany plan, potem ustalić ważne dla firmy zadanie, istniejący problem i osobę odpowiedzialną. Odpowiedź na ofertę darmowego planu nie potwierdza gotowości zapłaty 1500 USD. Nie uruchomiono automatycznych follow-upów ani wysyłek planów. Pierwszy przegląd braku odpowiedzi: 15.09.2026.

## Dowody prywatne

Poza git: `data/outreach-wave2-2026-09-08/campaign.json`, `messages.json`, `sent/`, `verified-sent.json`, `published.json`, `final-live-checks.json`, `test-plans/`. Źródła kontaktów: `outreach/drafts/contacts-wave2-2026-09-08.private.md`. Prywatny tracker: `outreach/drafts/wave2-sent-2026-09-08.private.md`. Stare pliki szkiców przeniesiono poza kolejkę. **Nie wysyłać ponownie.**
