# Weryfikacja przed kampanią — 07.09.2026

Stan przed wdrożeniem: kod i lokalne materiały sprawdzone, kontrola produkcji pozostaje do wykonania.
Kampania jest wstrzymana przez właściciela. Gotowość materiałów nie oznacza wysłania wiadomości.

## Zakres

Dziewięć firm z udokumentowanym dopasowaniem: DocuSeal, Loops, Upstash, Logto, Raygun,
Windmill, Chroma, Polar i Better Stack. Transloadit wyłączony: nowy brief wymaga osobnych
przebiegów. To jawne wyłączenie z powodu jakości pytania, nie zaakceptowany raport z błędnym briefem.

## Przegląd kodu przez Codex w tej sesji

Wstępny przegląd wykonał agent główny. Wymagane przez projekt `codex review --uncommitted`
zakończyło się bez uwag: „No actionable regressions were found”. Log: `/tmp/stackpick-readiness-codex-review.log`.
Sprawdzono kolejność odmowy publikacji przed zapisem dostawy, powiązanie ocen z pytaniem
i skanem, zgodność domeny przy wejściu z migawki, kompletność oceny checków, bezpieczny
render tekstów i linków oraz zachowanie liczb w starszych modelach. Nie znaleziono blokera
w tych ścieżkach po korektach. Komenda review dodatkowo sprawdziła wszystkie dziewięć ocen względem zapisanych migawek.

## Wykonane kontrole lokalne

- Build zawierający typecheck i rules: zielony (`/tmp/stackpick-readiness-build.log`).
- Pełny lint: zielony (`/tmp/stackpick-readiness-lint.log`).
- `audit-delivery`: spójność cytatów i wzmianek dla 181 dostawców, zielony.
- `audit-report-scope`: 10 zapisanych ocen briefów, tożsamość pytań i render starszego/nowego modelu.
- `audit-recommendations`: odrzucenie innego skanu/pytania/domeny, brakujących checków,
  wadliwych źródeł i dat; ukrycie starych zaleceń przy zachowaniu liczb.
- Rzeczywisty generator z `--publish`: odmówił bez oceny zaleceń przed zapisem plików;
  odmówił również migawki innej domeny.
- Dziewięć raportów wygenerowano z ocenami; model, markdown i HTML zawierają ocenione
  następne kroki, bez automatycznej obietnicy przyrostu punktów. Lokalny raport Raygun
  otwarto w Chrome i sprawdzono sekcję istniejącej specyfikacji, CAPTCHA, liczby i źródła.
- Skrzynki dziewięciu firm potwierdzono w publicznych źródłach; są to skrzynki firmowe.
  Dowód lokalny: `data/product-review-2026-09-07/mailbox-verification.json`.

## Warunki końcowe

Przed uznaniem gotowości: wdrożony kod, dziewięć ocenionych dostaw pod istniejącymi linkami,
próbka zgodna ze standardem, kontrola każdej dostawy bez logowania, zgodność maili z pytaniem
i liczbą wzmianek oraz działające linki do surowych odpowiedzi. Stan końcowy zostanie zapisany
po sprawdzeniu rzeczywistej produkcji.
