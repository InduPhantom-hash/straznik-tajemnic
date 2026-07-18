# Stan Implementacji: Sekwencyjne Generowanie Obrazów Ekwipunku

## Stan Wyjściowy
- Z powodu ograniczeń piaskownicy (standard sandbox mode) budowanie produkcyjne (`next build`) za pomocą Turbopacka rzuca błąd `TurbopackInternalError` przy procesach potomnych PostCSS. Kompilacja kodu i budowanie muszą być uruchamiane z `BypassSandbox: true`.

## Fazy
- Faza 1: Poprawa logiki generowania w modalu i karcie (Zakończona)
- Faza 2: Przebudowa i uruchomienie serwera (Zakończona - przebudowano za pomocą `build-app.sh --rebuild` z bypass_sandbox)
