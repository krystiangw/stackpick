# Trafność pytań kampanii — 07.09.2026

Przegląd obejmuje wszystkie 10 firm z wstrzymanej kampanii. **9 pytań ma udokumentowane
dopasowanie; 1 raport wymaga nowego pytania i przebiegów.** Pliki JSON zawierają dokładne
historyczne pytanie, źródła, datę, uzasadnienie i następny test. Nie wykonaliśmy tu integracji
ani badań popytu. Dzisiejsza oferta nie potwierdza dostępności wszystkich funkcji w dniu dawnych biegów.

`documented` oznacza zgodność podstawowego zastosowania z dokumentacją. Nie oznacza najlepszego
wyboru, potwierdzonej wydajności przy podanej skali ani dowodu, dlaczego marka miała 0/15 wzmianek.
Nie jest też zgodą na wysyłkę. Przed dostawą pozostają kontrola aktualnego raportu i decyzja właściciela.

| Firma / przegląd | Ocena | Co odpowiada pytaniu | Co trzeba jeszcze sprawdzić |
|---|---|---|---|
| [Loops](loops.so.json) | documented | Reset hasła i potwierdzenie zakupu przez API | Dostarczenie testowych maili, nie tylko przyjęcie przez API; skala 50 tys./mies. |
| [DocuSeal](docuseal.com.json) | documented | Dokument z danych, podpis, webhook ukończenia | Typ umowy i wymagany poziom podpisu; człowiek podpisuje świadomie |
| [Upstash](upstash.com.json) | documented | QStash do zlecania pracy, Workflow do kolejnych kroków | PDF wykonuje endpoint klienta; limity czasu i ponowienia |
| [Logto](logto.io.json) | documented | Migracja użytkowników i enterprise SSO | Zgodność hashy, wybrany IdP, konfiguracja po stronie administratora |
| [Raygun](raygun.com.json) | documented | Wyjątki Node/React i grupowanie | Source maps, powtórzone i różne wyjątki, zachowanie alertów |
| [Windmill](windmill.dev.json) | documented | Praca na workerach, ponowienia, workflow | Tryb NodeJS wymaga Cloud lub Self-Hosted Enterprise; zależności generatora PDF |
| [Chroma](trychroma.com.json) | documented | Zapis embeddingów i trzy podobne rekordy | Jakość wyników, opóźnienia i koszt przy milionach rekordów |
| [Polar](polar.sh.json) | documented | Subskrypcje, faktury, model Merchant of Record | Kwalifikacja sprzedawcy i wymagania fakturowania; test sandbox |
| [Better Stack](betterstack.com.json) | documented | Errors: zbieranie i grupowanie wyjątków | Obsługa błędów React i czytelne stosy, konfiguracja powiadomień |
| [Transloadit](transloadit.com.json) | partial — wstrzymany | Upload, przetwarzanie i eksport | Obecne pytanie kupuje głównie storage/CDN, nie przetwarzanie |

Do pierwszego kompletu wybieramy **Loops, DocuSeal, Raygun i Logto**: zadania mają widoczny
wynik, który da się sprawdzić w małym środowisku testowym. Logto jest trudniejszy operacyjnie
(SSO, migracja); w pierwszym płatnym pilotażu prostszy będzie Loops lub Raygun.
To priorytet przygotowania materiałów, nie lista firm o potwierdzonej gotowości do zakupu.

## Transloadit

Historyczne pytanie zawiera „put those uploads and serve them back fast”. Dokumentacja
[tymczasowego storage](https://transloadit.com/docs/faq/temporary-purge/) podaje 24 godziny
retencji oraz wymaga eksportu do własnego storage przy serwowaniu użytkownikom.
[Przykład pipeline](https://transloadit.com/demos/file-exporting/watermark-an-image-and-store-it-over-sftp/)
pokazuje upload, transformacje i eksport. To uzasadnia częściowe dopasowanie; nie uzasadnia
tezy o niesprawnym produkcie. Nowy szkic: [upload processing](../briefs/upload-processing-proposed-2026-09-07.md).

## Kontrola

`npm run audit-report-scope` porównuje pytania we wszystkich JSON-ach z zapisanymi przebiegami.
Generator z `--publish` odrzuca brak przeglądu, `partial` i `mismatch`.
Zmiana pytania oznacza osobny zbiór odpowiedzi. Nie podmieniamy pytania przy dawnym wyniku.
