---
typ: change
data: 2026-07-18
projekt: straznik-tajemnic
severity: low
status: draft
slug: poprawa-ikony-aplikacji
---

# CHANGE: Centrowanie oka i usunięcie żółtej ramki w ikonie aplikacji

Poprawa wyglądu ikony aplikacji poprzez usunięcie ozdobnej żółtej ramki/narożników oraz dokładne pionowe wyśrodkowanie symbolu Oka Horusa (𓂀), który domyślnie renderuje się zbyt nisko z powodu specyfiki fontu. Zmiana dotyczy obu wariantów ikony (standardowej zielonej i czerwonej "reset").

## Kontekst

Ikona generowana jest dynamicznie za pomocą skryptu [make-icon.sh](file:///Volumes/Karta/Developer/straznik-tajemnic/desktop/make-icon.sh) (oraz jego kopii w `_tester/_base/.silnik/desktop/make-icon.sh`), który uruchamia bezgłową instancję Chrome w celu wyrenderowania kodu HTML do pliku PNG, a następnie konwertuje go do formatu ICNS.

Główne pliki powiązane ze zmianą:
- [desktop/make-icon.sh](file:///Volumes/Karta/Developer/straznik-tajemnic/desktop/make-icon.sh) - skrypt generujący ikonę
- [_tester/_base/.silnik/desktop/make-icon.sh](file:///Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/desktop/make-icon.sh) - zduplikowany skrypt silnika
- Zewnętrzne pliki wynikowe PNG/ICNS w `public/`, `desktop/` i `_tester/_base/.silnik/public/`

## Opis Zmiany

1. **Usunięcie ramki:** Usunięcie z szablonu HTML w skrypcie `make-icon.sh` elementu `.frame` oraz czterech narożników `.c` odpowiadających za żółte obramowanie.
2. **Wyśrodkowanie oka:** Dodanie przesunięcia w pionie dla klasy `.eye` za pomocą `transform: translateY(-4.5cqmin)` (lub zbliżonej wartości), aby skompensować przesunięcie fontu "Noto Sans Egyptian Hieroglyphs".
3. **Regeneracja zasobów:** Uruchomienie skryptów dla wariantu standardowego oraz `reset` w celu nadpisania dotychczasowych plików `.png` i `.icns`.

## Kryteria Akceptacji

- [ ] Brak żółtej ramki i narożników na wygenerowanych ikonach standardowych i reset.
- [ ] Symbol oka (𓂀) znajduje się idealnie w geometrycznym środku tła (wyśrodkowany względem rozchodzących się promieni).
- [ ] Zmiany zostały zaimplementowane w obu plikach `make-icon.sh`.
- [ ] Wygenerowane nowe pliki graficzne zastąpiły dotychczasowe w `public/app-icon.png`, `desktop/icon.png`, `desktop/icon-reset.png` oraz w podkatalogach `_tester/_base/.silnik/`.

## Zakres zmiany

- **W zakresie:**
  - Modyfikacja kodu HTML/CSS generującego ikonę w obu plikach `make-icon.sh`.
  - Regeneracja plików graficznych i ich dystrybucja do odpowiednich katalogów.
- **Poza zakresem:**
  - Modyfikacja samego kształtu oka lub tła (promienie i poświata zostają bez zmian).

## Otwarte pytania

- Dokładna wartość przesunięcia pionowego oka - zostanie ustalona eksperymentalnie podczas renderowania testowego i podglądu pliku PNG.

## Severity
- **Low** - zmiana ma charakter czysto kosmetyczny i nie wpływa na działanie mechaniki gry.

## Sugerowany next step
- Przejście do fazy wdrożenia (modyfikacja skryptów, wyrenderowanie ikon, weryfikacja wizualna).
