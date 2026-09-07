# Upload processing — proponowane nowe badanie

Stan: **szkic, 0 wykonanych przebiegów**. Kandydat dla Transloadit i innych usług
przetwarzania uploadów. Nie zastępuje pytania `file-storage` ani jego wyników.
Nie wolno przenieść historycznego 0/15 pod ten brief.

## Pytanie do zamrożenia

> Our users upload photos from phones into a Node and React app. Before an image is published, we need to validate its type and size, generate a thumbnail and a web-sized version, and put the results in our existing S3 bucket. Processing must happen outside the web request, with a completion callback and a way to diagnose failures. We do not want to maintain our own image-processing workers. Which service would you use, and what alternatives would you consider?

## Dlaczego taki zakres

Potrzeba dotyczy przetwarzania, asynchronicznego zakończenia i eksportu do istniejącego
storage. Nie wymaga nazwy dostawcy, MCP ani rozwiązania charakterystycznego tylko dla
Transloadit. Usługi zarządzanych transformacji i pipeline uploadów mogą uczciwie konkurować.

Przed biegami: potwierdzić, że ten scenariusz reprezentuje klienta dostawcy, oraz porównać
dokumentację co najmniej dwóch alternatyw. To pozostaje do zrobienia; obecny szkic nie jest
nową kategorią produkcyjną ani gotowym badaniem.

## Protokół

Nadać osobny identyfikator badania i zachować dokładny tekst. Ustalić wersje dwóch narzędzi,
modele, dostęp do sieci, limit czasu i liczbę powtórzeń **przed** startem. Zapisać wszystkie
odpowiedzi, również odmowy i timeouty; oddzielić błąd infrastruktury od odpowiedzi bez marki.
Nie dobierać pytania lub prób pod oczekiwane 0/N.

Pomiar discovery kończy się na nazwaniu/rozważeniu dostawcy. Oddzielny test integracji może
sprawdzić w sandboxie transformacje, obiekty w S3 i callback. Sam wygenerowany kod nie zalicza
integracji. Dopiero po nowych przebiegach można przygotować nowy przegląd dopasowania i raport.
