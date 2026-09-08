# Płatności przy pierwszych klientach

Rekomendacja z 08.09: pozostawić zakup przez rozmowę. Publiczny cennik pokazuje cenę
i zakres, a przyciski otwierają mail do właściciela. To wystarcza do sprawdzenia zainteresowania
i uzgodnienia zlecenia. Nie potrzebujemy obecnie checkoutu, panelu klienta ani abonamentów.
Nie pokazujemy przycisku udającego płatność, potwierdzenia zakupu ani rezerwacji bez pokrycia.

## Najprostsza ścieżka

1. Klient potwierdza zainteresowanie konkretnym zakresem i ceną.
2. Uzgadniamy zadania, dostępy, termin, zasady odbioru i płatności. Sprawdzamy dostępność
   ceny dla pierwszych dwóch pilotaży; wyświetlenie strony nie rezerwuje miejsca.
3. Przed pobraniem pieniędzy mamy gotowe dane sprzedawcy, rachunek i sposób wystawienia
   właściwego dokumentu rozliczeniowego. Obecny brak tych danych nie blokuje rozmów,
   ale nie wolno go zastąpić fikcyjnymi danymi na fakturze.
4. Dla pierwszego zlecenia B2B proponuję ręczne rozliczenie i przelew na rachunek sprzedawcy.
   Kwotę, walutę oraz termin lub zaliczkę zapisujemy w zamówieniu. Realizację rozpoczynamy
   według uzgodnionych warunków; sam mail z zainteresowaniem nie jest opłaconą sprzedażą.

Jeśli klient potrzebuje karty, najpierw sprawdzamy możliwość aktywacji i weryfikacji konta
Stripe dla sprzedawcy. **Stripe Invoicing** pasuje do indywidualnego zlecenia, a **Payment Links**
do prostego produktu o stałej cenie. Oba pozwalają pobrać płatność przez stronę Stripe bez
budowania integracji w naszym repo. Nie zakładamy, że weryfikacja konta będzie natychmiastowa.
[Porównanie w dokumentacji Stripe](https://docs.stripe.com/payment-links).

To wariant awaryjny do potrzeb klienta, nie polecenie założenia konta teraz. Nie wybrano
operatora, nie skonfigurowano kluczy, nie utworzono faktury ani linku płatniczego.
Rozliczenie podatkowe zależy od faktycznych danych sprzedawcy i nabywcy; ten dokument
nie ustala stawek ani sposobu księgowania.

## Kiedy wrócić do automatyzacji

Gdy powtarzają się płatne zamówienia o takim samym zakresie albo ręczna obsługa faktycznie
zajmuje istotny czas. Wówczas zaczynamy od gotowego linku, nie od własnego checkoutu.
Sam zamiar zakupu uzasadnia przygotowanie rozliczenia; dopiero płatność potwierdza sprzedaż.
Monitoring pozostaje bezpłatny i nie wymaga metody płatności. Kampania nadal jest wstrzymana.

`turning-billing-on.md` opisuje historyczną integrację, a nie warunek przeprowadzenia rozmowy
czy jednorazowego rozliczenia poza aplikacją. Nie uruchamiamy jej w ramach zmiany cennika.
