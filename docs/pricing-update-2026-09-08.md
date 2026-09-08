# Uproszczenie oferty — 08.09

Właściciel zatwierdził rekomendację z rozmowy po audycie konkurencji:

- skan bezpłatny;
- samodzielny monitoring jako bezpłatna beta, bez zapowiedzi ceny i daty końca;
- raport 49 USD jednorazowo;
- pierwsze dwa uzgodnione pilotaże integracji po 1500 USD, dalsze projekty wyceniane osobno.

Cotygodniowe kontrole HTTP i alerty potwierdzonych zmian są oddzielone od eksperymentalnych,
ręcznych pomiarów wzmianek, które nie mają gwarantowanej liczby przebiegów ani terminu.
Nie zmieniono crona, zapisu obserwacji, dostaw raportów ani wysyłki.

Na `/pricing` usunięto zapowiedzi dawnych cen i pakietów oraz powtarzającą karty tabelę.
Cztery karty zajmują dwie kolumny na desktopie i jedną na telefonie. Pilotaż ma jawny zakres,
limit pracy, termin od gotowych dostępów i rozwijane warunki dla wyniku bez poprawki.
Wcześniejsze badania integracji są nazwane wcześniejszymi badaniami, nie wynikami pilotażu.
Usunięcie tabeli usuwa również nieuprawnioną obietnicę znajomości powodów pominięcia produktu.

Zgodność z ofertą poprawiono na stronie głównej, w metadanych, `llms.txt`, przygotowanych
warunkach i zwrotach oraz runbookach. Strony zależne od danych sprzedawcy zachowują swoje
dotychczasowe warunki dostępności. Stare ceny w katalogu są opisane jako wycofane mapowania
nieaktywnej integracji; nie są oferowane ani aktywowane. Billing pozostaje wyłączony.

Zakup nadal zaczyna się mailem. Zalecana obsługa pierwszej płatności:
[payments-first-sales-2026-09-08.md](payments-first-sales-2026-09-08.md).

Walidacja lokalna: build obejmujący typecheck i reguły oraz pełny lint zakończone poprawnie.
Przegląd wskazał stary znacznik wymagany przez reguły i niejasną chronologię audytu; oba
poprawiono. Końcowy przegląd i wdrożenie pozostają do potwierdzenia.
Przeglądarka przy 390 i 1440 px: cztery oferty, poprawne ceny i metadane, brak poziomego
przewijania, działające rozwijanie warunków, poprawne cele linków. Linków mailowych nie
uruchamiano, formularzy nie wysyłano. Zrzuty i wyniki w `data/pricing-2026-09-08/`.
