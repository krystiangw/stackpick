# Ocena zaleceń przed dostawą

Dziewięć JSON-ów odpowiada dziewięciu firmom z trafnym briefem kampanii. Każdy zawiera ocenę
wszystkich niepełnych lub niezmierzonych checków z konkretnego skanu, źródła dokumentacji,
następny krok i sposób jego weryfikacji. Transloadit nie ma takiej dostawy: jego brief pozostaje partial.

`verify` oznacza test przed decyzją o zmianie, `change` uzasadnioną zmianę,
`no-change` brak uzasadnienia dla zmiany na podstawie danej obserwacji.
Żaden z obecnych przeglądów nie twierdzi, że wykonano test integracji.

`scanFingerprint` to SHA-256 domeny, daty, findings i scorecard; dokładne pytanie jest osobnym
warunkiem zgodności. Zmiana danych wymaga ponownej oceny, nawet pod tym samym id skanu.
Generator sprawdza zgodność przez `--recommendation-review FILE`; przy publikacji wymaga
również `--brief-review FILE`. `--scan-file FILE` pozwala użyć ocenionej migawki bez podmiany
publicznego korpusu. Migawki kampanii: `data/product-review-2026-09-07/scans/` (poza gitem).

Automatyczna kontrola sprawdza kompletność i tożsamość danych. Trafność wniosku wymaga
przeczytania źródeł przez operatora. Pierwsze wykryte błędy i ich dowody opisano w
`docs/evidence-review-2026-09-07.md`.
