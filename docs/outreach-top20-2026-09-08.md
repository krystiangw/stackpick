# Kampania 20 firm — 08.09.2026

Wysłano 20 indywidualnych wiadomości do 20 potencjalnych klientów. Każda zawiera jeden prywatny raport dopasowany do firmy i jedno pytanie. To rozpoczęcie rozmów; żadna wysyłka nie jest dowodem płatnego popytu.

## Zakres i nadawca

Pierwszy mail do Loops wysłano po próbce do właściciela. Następnie aktywny cel właściciela rozszerzył zakres do „wyslij wiadomosci do top 20 klientow - dla kazdego przygotuj odpowiednie linki i raporty”. Łącznie wysłano 20, wliczając Loops; bez ponownej wysyłki do tej firmy.

Nadawca każdej wiadomości: **Krystian from Let Agents In <hello@letagentsin.com>**. Zwykły tekst, bez Cc/Bcc i załączników. Kontakty są imienne i pochodzą z publicznych stron firm, wypowiedzi założycieli lub metadanych ich oficjalnych SDK. WorkOS trafił do opiekuna Node SDK. Źródła i adresy pozostają w prywatnej macierzy kontaktów.

## Wysłane wiadomości

Wzmianki oznaczają obecność nazwy w odpowiedzi, nie rekomendację zakupu ani udział w rynku. Kolumna „pierwsza nazwa” zachowuje definicję licznika w raportach. Wszystkie czasy Europe/Warsaw.

| Firma | Odbiorca | Wzmianki | Pierwsza nazwa | Wysłano |
|---|---|---:|---:|---|
| loops.so | Chris Frantz | 0/25 | 0 | 16:04:44 |
| docuseal.com | Alex Turchyn | 2/25 | 0 | 16:09:52 |
| raygun.com | Zheng Li | 0/20 | 0 | 16:09:53 |
| logto.io | Simeng | 0/24 | 0 | 16:09:54 |
| upstash.com | Enes Akar | 1/25 | 1 | 16:09:55 |
| windmill.dev | Ruben Fiszel | 0/25 | 0 | 16:09:57 |
| trychroma.com | Jeff Huber | 2/20 | 0 | 16:09:58 |
| polar.sh | Birk Jernström | 0/20 | 0 | 16:10:00 |
| betterstack.com | Juraj Masar | 0/20 | 0 | 16:10:01 |
| resend.com | Zeno Rocha | 24/25 | 1 | 16:30:56 |
| trigger.dev | Matt Aitken | 21/25 | 11 | 16:30:57 |
| inngest.com | Tony Holdstock-Brown | 25/25 | 6 | 16:30:58 |
| honeybadger.io | Joshua Wood | 3/20 | 0 | 16:30:59 |
| hatchet.run | Alexander Belanger | 1/25 | 0 | 16:31:00 |
| clerk.com | Colin Sidoti | 24/24 | 2 | 16:31:01 |
| workos.com | Mark | 24/24 | 17 | 16:31:02 |
| supertokens.com | Rishabh Poddar | 3/24 | 0 | 16:31:03 |
| qdrant.tech | Andrey Vasnetsov | 20/20 | 13 | 16:31:04 |
| turbopuffer.com | Simon Eskildsen | 0/20 | 0 | 16:31:05 |
| growthbook.io | Jeremy Dorn | 13/15 | 1 | 16:31:07 |

## Dlaczego te firmy

Pierwsza dziewiątka miała już dopasowane, ocenione raporty. Dodano Resend, Trigger.dev, Inngest, Honeybadger, Hatchet, Clerk, WorkOS, SuperTokens, Qdrant, turbopuffer i GrowthBook: ich dokumentacja potwierdza zastosowanie z badania, istnieje konkretny kontakt techniczny lub właścicielski, a zapisane odpowiedzi dają powód do rozmowy. To lista priorytetowych rozmów, nie ranking prawdopodobieństwa zakupu.

Nie wybrano wyłącznie zerowych wyników. Resend, Clerk i GrowthBook często występują w odpowiedziach, ale rzadko jako pierwsza nazwa. Inngest, WorkOS i Qdrant pozwalają zapytać o przejście od rekomendacji do działającej integracji. Transloadit pozostaje poza kampanią z powodu niedopasowanego briefu.

## Raporty i kontrola

- Dla 11 nowych firm przygotowano świeże skany z 08.09 oraz osobne oceny briefu i zaleceń, związane z SHA-256 skanu. Migawki nie zmieniają korpusu ani publicznych rankingów.
- Wykorzystano istniejące, datowane odpowiedzi. GrowthBook: 15 odpowiedzi Claude Code/Codex; error monitoring i vector search: 20 odpowiedzi z trzech narzędzi; auth: 24; background jobs i transactional email: 25. Braki Cursor pozostają poza mianownikiem.
- 38 adresów źródłowych odpowiedziało HTTP 200. Dokumentacja koryguje interpretację skanera, np. istniejący lokalny MCP Trigger.dev, MCP dokumentacji Hatchet i typowany pakiet SuperTokens.
- Lokalne i opublikowane wersje nowych raportów sprawdzono na szerokości 390 px; kompletną kampanię także na desktopie. Właściwa firma, dokładne pytanie, liczniki i link do pełnych odpowiedzi.
- Kontrole audit-delivery, audit-fix-arithmetic, audit-report-scope i audit-recommendations zakończone bez błędów.
- Każdy z 20 maili odczytano z Gmaila po wysłaniu. Sprawdzono SENT, From/To, temat i treść; 20 różnych firm. Linki sprawdzono także względem zapisanych modeli dostaw.

SENT potwierdza przyjęcie wysyłki przez Gmail, nie przeczytanie ani Inbox odbiorcy. Nie śledzimy otwarć poszczególnych raportów. Próby kontroli raportów generują własny ruch, który nie jest sygnałem zainteresowania. Nie wykonano proponowanych testów integracyjnych i nie pobrano opłat.

## Następny krok

Oceniać odpowiedzi według tego, czy zadanie pasuje do ich klientów, czy istnieje konkretny problem z integracją przez agenta i kto za niego odpowiada. Dopiero taka rozmowa uzasadnia uzgodnienie płatnego pilotażu. Nie uruchomiono automatycznych przypomnień. Pierwszy przegląd braku odpowiedzi: 15.09.2026.

## Gdzie są dowody

Prywatnie, poza git: `data/outreach-top20-2026-09-08/campaign.json`, `sent/`, `verified-existing-sent.json`, `verified-new-sent.json`, `published.json`, `final-live-checks.json`. Manifest zawiera rzeczywiste adresy, identyfikatory Gmail i prywatne linki. Źródła nowych kontaktów: `outreach/drafts/contacts-top20-2026-09-08.private.md`. Treści dawnych szkiców przeniesiono poza kolejki wysyłkowe.
