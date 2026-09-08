# Alert monitoringu jako wiadomość do klienta

Właściciel pokazał mail Vercel z 08.09: surowy tekst zaczynał się punktacją, statusem
`fail to partial` i długim opisem metodologii. Alert monitoringu nie miał wersji HTML.

Zmiana dotyczy `changeEmail` i przekazania HTML do istniejącej wysyłki. Najpierw obserwacja,
krótkie wyjaśnienie i przycisk do skanu. Wynik, data podstawy porównania, podwójny pomiar,
ograniczenie do HTTP i wypisanie są niżej. Zwykły tekst nadal jest pełnoprawną alternatywą.
Nie zmieniono reguł pomiaru, harmonogramu, odbiorców ani mechanizmu potwierdzania zmian.

Opis wykrytego pliku z polityką ma krótsze brzmienie tylko wtedy, gdy dokładnie odpowiada
zapisanemu wariantowi dowodu. Nie twierdzimy, że plik właśnie opublikowano, produkt nie ma
innej ścieżki integracji ani że wyższy wynik dowodzi ukończenia zadania przez agenta.

Wiadomość pokazuje najwyżej trzy pełne opisy, ze spadkami na początku. Pozostałe zmiany
zachowują nazwy i poprzedni/obecny status; szczegółowe obserwacje są w skanie pod przyciskiem.
Brak odczytu nie jest poprawą ani karą punktową. Przy przeliczeniu starej podstawy pozostaje
wyjaśnienie, że zmienić mogła się nasza reguła. Istniejący następny krok dla najgorszego
pogorszenia pozostaje w wiadomości, gdy generator ma dla niego instrukcję.

Walidacja: `scripts/audit-watch-email.mts` sprawdza HTML i tekst, zgodność liczb i dat,
źródła, wypisanie, rescore, brak odczytu, skracanie długiej listy i escapowanie danych.
Reguły zachowują kontrolę podwójnego pomiaru i podstawy porównania; dodano kontrolki mutacji
wykrywające nazwanie braku odczytu poprawą lub usunięcie zastrzeżenia o punktacji.
Cztery warianty obejrzano w przeglądarce przy 390 i 800 px, bez poziomego przewijania.
Podglądy: `data/watch-email-2026-09-08/` (lokalne fixture, nie prawdziwe tokeny subskrypcji).

Wdrożono v794 (`09693c7`) po typecheck, lint, rules, build i przeglądzie Codex bez uwag.
Produkcja: web up, strona główna HTTP 200. Nie wysłano wiadomości testowej ani nie uruchomiono
crona ręcznie. Renderowanie sprawdzono w przeglądarce; odbioru w Gmail/Outlook nie testowano
przez wysłanie wiadomości. Następne potwierdzone zmiany korzystają z nowego szablonu.
