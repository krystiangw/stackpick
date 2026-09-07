# Kontrola merytoryczna czterech raportów — 07.09.2026

**Status: szkice wewnętrzne, nie gotowe do dostawy.** Dopasowanie pytań przeszło przegląd,
ale automatyczne zalecenia wymagają korekty. Zielony test generatora sprawdza spójność danych
i renderowania; nie potwierdza sensowności zaleceń dla klienta.

Aktualizacja: korekty opisane niżej są już w powtarzalnej ścieżce generatora i widoku.
Dziewięć przeglądów w `docs/recommendation-reviews/` obejmuje wszystkie niepełne i niezmierzone
checki. Nowe pliki mają nazwy z pełną domeną, np. `data/product-review-2026-09-07/raygun.com.md`.
Pierwotne cztery pliki poniżej zachowano jako materiał audytu, nie jako wersje do wysyłki.
Pozostają wdrożenie i kontrola wersji pod linkami z draftów.

| Raport lokalny | Nowy skan 07.09 | Historyczne wzmianki | Kontrola |
|---|---|---|---|
| [Loops](../data/product-review-2026-09-07/loops.md) | 14/17 | 0/15 | Dobór dokumentów do provisioningu wymaga oceny; nie dowodzi braku funkcji |
| [DocuSeal](../data/product-review-2026-09-07/docuseal.md) | 13/17 | 0/15 | Strona o weryfikacji tożsamości podpisującego nie ustala sposobu tworzenia klucza API |
| [Raygun](../data/product-review-2026-09-07/raygun.md) | 7/16 | 0/15 | Pominięte OpenAPI; niepotwierdzona rola CAPTCHA; rejestr MCP nie odpowiedział |
| [Logto](../data/product-review-2026-09-07/logto.md) | 9/16 | 0/15 | Pominięte API reference; CRUD użytkowników nie dowodzi utworzenia konta integratora |

Wyniki skanu są obserwacjami z tego środowiska, nie skorygowaną oceną produktu. Nie zmieniono
formuły, korpusu ani historycznych odpowiedzi. Nie wolno porównywać tych liczników bez
uwzględnienia różnych mianowników. Dla Raygun i Logto po jednym checku pozostało niezmierzonym.

## 1. OpenAPI: najpierw sprawdź, co dostawca już opublikował

W obu raportach automat proponuje: „Publish an OpenAPI file at /openapi.json”.
Sam opis skanu mówi ostrożniej: nie znaleziono specyfikacji w sprawdzonych miejscach.

- Raygun: [oficjalna dokumentacja API](https://raygun.com/documentation/product-guides/raygun-api/)
  wprost wskazuje pełną specyfikację OpenAPI. Opisuje też dostęp przez Personal Access Tokens
  oraz operację regeneracji klucza aplikacji. Nie wykonaliśmy tej operacji.
- Logto: [instrukcja Management API](https://docs.logto.io/integrate-logto/interact-with-management-api)
  prowadzi do [osobnego serwisu API reference](https://openapi.logto.io/).
  Opisuje początkowe utworzenie aplikacji M2M w konsoli. Nie należy utożsamiać zarządzania
  użytkownikami tenanta z tworzeniem konta klienta Logto.

**Decyzja produktowa:** wycofać zalecenie tworzenia nowej specyfikacji na podstawie tego
skanu. Najpierw sprawdzić istniejącą specyfikację i czy agent znajduje właściwą operację
z dokumentacji. Dopiero zaobserwowane niepowodzenie może uzasadnić poprawę linkowania.
Nie nazywać ograniczenia naszego wykrywania usterką klienta.

Tekst do zastąpienia zalecenia w raporcie Raygun:

> Your API documentation already links to an OpenAPI specification. Our scan did not discover
> it. First test whether an agent starting from your docs can find that specification and use
> the operation needed for this task. This result does not justify creating another API spec.

Tekst dla Logto:

> Your Management API guide already links to the API reference on openapi.logto.io. Our scan
> did not follow that path. Test discovery from the guide and an authorized Management API
> call before deciding whether any documentation change is needed.

To są korekty redakcyjne do wdrożenia w dostawie; surowych plików generatora nie nadpisano.

## 2. CAPTCHA: obecność skryptu nie dowodzi blokady

Raport Raygun przyznaje, że recaptcha występuje też na stronie głównej i może być wspólnym
skryptem. Nie wysłaliśmy formularza. Mimo to automat zaleca zmianę sposobu uruchamiania CAPTCHA.

**Decyzja produktowa:** najpierw test istniejącej ścieżki w dozwolonym środowisku, z zapisanym
krokiem przekazania człowiekowi. Nie zalecać zmiany ochrony na podstawie samego znacznika HTML.

Tekst zastępczy:

> We found a reCAPTCHA marker in the signup HTML, but did not establish whether it challenges
> this flow. Verify the supported signup path before changing anything. A required human
> verification step should be recorded as a handoff, not assumed to be a product defect.

## 3. Provisioning: cztery strony to ograniczony zakres dowodu

Loops: wybrany dokument o uwierzytelnianiu emaila nie wyjaśnia sam w sobie tworzenia kluczy.
Osobna kontrola [API key](https://loops.so/docs/api-reference/api-key) i
[CLI auth](https://loops.so/docs/cli/auth) została zapisana w
[planie produktu](product-readiness-2026-09-07.md). Te strony opisują użycie istniejącego klucza.

DocuSeal: skan wskazuje m.in. `knowledge-based-authentication.md`. Dokumentacja
[API](https://www.docuseal.com/docs/api) pokazuje żądania z kluczem; sam ten fakt
nie ustala, jak klient pozyskuje klucz. Należy sprawdzić właściwą ścieżkę dostępu przed
zaleceniem budowy nowego management API.

Tekst zastępczy dla takiej obserwacji:

> The pages selected by this scan do not establish how a new integrator obtains a credential.
> Verify the documented access path first, recording any account owner approval separately.
> If the product intentionally requires a person to grant access, document that handoff and
> test the integration after access is granted.

## 4. Priorytet zadania klienta

W raporcie Raygun szybkie punkty za meta description i llms.txt wyprzedzają działającą
obsługę wyjątków. To ranking kosztu/punktów skanu, a nie ważności dla kupującego.
W raporcie płatnym pierwsza rekomendacja powinna dotyczyć zweryfikowanego problemu w uzgodnionym
zadaniu; kiedy nie wykonano integracji, pierwszym krokiem jest jej test, nie deklaracja naprawy.

Brak DCR nie wystarcza do zalecenia rozbudowy OAuth. Testujemy obsługiwany sposób dostępu
i potrzeby konkretnych narzędzi. Kompatybilność protokołu ma wynikać z wymagań integracji.

## Warunek zamknięcia kontroli

Dla każdego zalecenia operator zapisuje: obserwację, sprawdzone źródła, granicę wniosku,
zadanie dotknięte problemem i próbę potwierdzającą. Przegląd może zakończyć się decyzją
„brak uzasadnionej zmiany po stronie dostawcy”. To pełnoprawny wynik raportu.

Przed publikacją: wprowadzić korekty do powtarzalnej ścieżki dostawy, wygenerować ponownie
HTML/markdown z tej samej oceny i sprawdzić, że sporne zalecenia nie wracają.
Sam `--brief-review` zabezpiecza dopasowanie pytania; **nie jest jeszcze automatyczną bramką
kontroli zaleceń**. Nie wystarcza do uznania tych raportów za gotowe do wysyłki.
