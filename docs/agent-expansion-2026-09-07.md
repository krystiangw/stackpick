# Rozszerzenie raportów o Antigravity i Cursor

Właściciel zlecił dołączenie pozostałych zainstalowanych narzędzi do raportów. Przebiegi dotyczą
siedmiu kategorii wykorzystywanych przez dziewięć aktywnych raportów kampanii. Transloadit pozostaje
wyłączony z powodu nietrafnego wcześniejszego briefu. Nowe próby użyły dotychczasowych pytań bez zmian.

## Zebrane dowody

- Antigravity (`agy` 1.1.27), `gemini-3.7-flash-low`: **35/35 odpowiedzi**, po 5 w każdej kategorii.
- Cursor (`cursor-agent` 2026.09.02-c22c1a3), Auto: **19/35 odpowiedzi**. Próba wyboru Composer 2.5
  została odrzucona przed właściwą serią. Auto nie ujawnia modelu bazowego, więc go nie zgadujemy.
- Cursor Auto: email, podpisy i background jobs po 5; auth 4; monitoring błędów, płatności i wektory
  po 0. Pozostałe 16 prób przerwał limit konta. Brak odpowiedzi nie oznacza braku wzmianki.
- Zachowano wszystkie **78 historycznych partii / 391 odpowiedzi**. Dodano **11 partii / 54 odpowiedzi**.
  Obecny zbiór ma 89 partii / 445 odpowiedzi. W siedmiu kategoriach kampanii jest ich 159.

Nowe sesje działały w osobnych katalogach git poza repozytorium. Cursor: read-only ask i sandbox;
Antigravity: sandbox, wyłączone rozwijanie slash commands, timeout 5 minut. Możliwy wpływ konfiguracji
operatora ujawniono w ustawieniach. Są to próbki różnych środowisk i dat, nie kontrolowany ranking modeli.

| Raport | Wcześniej | Po rozszerzeniu |
|---|---:|---:|
| DocuSeal | 0/15 | 2/25 |
| Loops / próbka | 0/15 | 0/25 |
| Upstash | 0/15 | 1/25 |
| Logto | 0/15 | 0/24 |
| Raygun | 0/15 | 0/20 |
| Windmill | 0/15 | 0/25 |
| Chroma | 0/15 | 2/20 |
| Polar | 0/15 | 0/20 |
| Better Stack | 0/15 | 0/20 |

## Raporty i UI

Narzędzia mają czytelne nazwy, a filtry i tabele pokazują model oraz datę. Cursor Auto jest opisany
jako model nieujawniony przez CLI. Także narzędzie z zerem udanych odpowiedzi pozostaje widoczne
jako brak pomiaru. Ustawienia są dostępne po rozwinięciu i trafiają do wydruku.

Skany, ich daty, oceny briefów i rekomendacji, źródła oraz pytania pozostają niezmienione. Raporty
przeliczono z istniejących ocenionych snapshotów. W dziewięciu niewysłanych draftach zaktualizowano
liczniki; zachowano odbiorców, tematy i adresy raportów. Kampania nadal wstrzymana.

Badanie korelacji na `/findings` zachowuje pierwotny zakres Claude Code i Codex w 26 kategoriach.
Wybrane kategorie nowych narzędzi nie są milcząco dodawane do tego porównania ani liczone jako
zerowe obserwacje w pozostałych kategoriach.

Eksport odczytuje pytanie z zachowanego `ASK.md`, odrzuca nieudane wywołania i partie o mieszanym
pytaniu, modelu, wersji narzędzia, dacie lub ustawieniach. `--append` chroni stare partie przed
nadpisaniem. Metadane prób w `src/data/agent-attempts.json` odpowiadają rzeczywistym wynikom.

## Walidacja i ograniczenie Cursor

Lokalne dowody: `data/agent-expansion-2026-09-07/`, w tym 284 pliki surowych wyników i ich SHA-256,
kopie wcześniejszych dostaw i draftów, modele raportów, testy przeglądarkowe oraz PDF.
Kontrole obejmują zgodność transcriptów, mianowników i źródeł; widoki 390/1440 px; filtry;
komunikaty o brakujących próbach; wydruk z pełnymi dowodami. Status wdrożenia uzupełniany po publikacji.

Free odnawia się 10 września. Pracę na 16 brakujących odpowiedziach przygotowano do wznowienia
po jednej próbie dziennie, bez zmiany planu. Szczegóły: `docs/cursor-free-plan-2026-09-07.md`.
