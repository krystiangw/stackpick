# Formularz kontaktowy Formspree — 2026-09-09

Sprzedażowe wezwania do działania na stronie kierują teraz do krótkiego formularza na
`/pricing#contact`, zamiast otwierać program pocztowy. Formularz jest wspólny dla raportu,
pilotażu i pytań o dopasowanie oferty. Prawa do danych, spory i zgłoszenia błędów nadal mają
bezpośredni adres email.

## Konfiguracja

- Usługa: Formspree, istniejący pusty formularz `mpzkgdjw`, przemianowany w panelu na
  `Let Agents In inquiries`.
- Endpoint używany przez stronę: `https://formspree.io/f/mpzkgdjw`.
- Pola: imię, email służbowy, firma lub produkt, rodzaj zainteresowania i krótki opis.
- Plan: darmowy, limit 50 zgłoszeń miesięcznie.
- Powiadomienia: jedyny obecnie zweryfikowany adres to prywatny Gmail właściciela. Nie kupiono
  upgrade'u.
- Test produkcyjny 09.09, 11:22 CEST: jedno zgłoszenie z oznaczeniem `TEST` przeszło przez
  endpoint (`302 → /thanks`), pojawiło się w panelu Submissions i dostarczyło powiadomienie do
  Gmaila z kompletem pól. Zgłoszenie można usunąć lub zarchiwizować w panelu Formspree.

## Ograniczenia i następny krok

Formspree jest użyte jako lekki kanał walidacji popytu, nie jako system CRM ani dowód konwersji.
Po pierwszych prawdziwych odpowiedziach trzeba zdecydować, czy dodać zweryfikowany adres
`hello@letagentsin.com`, przejść na płatny plan lub wrócić do własnego `/api/lead`. Przed
zmianą dostawcy należy sprawdzić treść powiadomień, retencję danych i aktualizację `/privacy`.
