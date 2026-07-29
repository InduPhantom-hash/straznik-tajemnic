## Plan: SafeImage UI
Data: 2026-07-29
Złożoność: Prosta

### Problem
Aplikacja ma niestabilne, zduplikowane metody obsługi błędów ładowania obrazów (`onError={(e) => ...}`) na surowych tagach `img`, co w przypadku błędu źródła fallbacku prowadzi do nieskończonej pętli i zawieszenia UI.

### Rozwiązanie
Zbudowanie i wdrożenie pojedynczego komponentu `SafeImage`, który izoluje stan ładowania i przy błędzie bezpiecznie podmienia wadliwy obraz na czysty komponent ikony (z biblioteki Lucide) zamiast próbować pobrać kolejny potencjalnie nieistniejący plik obrazu.

### Pliki do modyfikacji
| plik | zmiana | ryzyko |
|------|--------|--------|
| `src/components/ui/safe-image.tsx` | [NEW] Stworzenie komponentu wrapper. | Niskie |
| `src/components/ui/equipment-modal.tsx` | [MODIFY] Wymiana `img` na `SafeImage`. | Niskie |
| `src/components/ui/equipment-detail-dialog.tsx` | [MODIFY] Wymiana `img` na `SafeImage`. | Niskie |
| `src/components/ui/investigator-board.tsx` | [MODIFY] Wymiana `img` na `SafeImage`. | Niskie |
| `src/components/ui/session-journal.tsx` | [MODIFY] Wymiana `img` na `SafeImage`. | Niskie |
| `src/components/ui/predefined-characters-selector.tsx`| [MODIFY] Wymiana `img` na `SafeImage`. | Niskie |
| `src/components/ui/diegetic-document-viewer.tsx` | [MODIFY] Wymiana `img` na `SafeImage`. | Niskie |
| `src/components/sidebar/CthulhuSidebar.tsx` | [MODIFY] Wymiana `img` na `SafeImage`. | Niskie |

### Fazy implementacji

**Faza 1: Utworzenie Komponentu**
- [ ] Utworzenie `safe-image.tsx` w kat. `ui`.
- [ ] Oprogramowanie stanu powstrzymującego próbę załadowania SVG jako "src", a zamiast tego zrenderowanie bezpośrednio ikony `FileImage` (Lucide) na dyskretnym, mrocznym tle (np. neutralna sepia).
- Weryfikacja: Komponent eksportuje się poprawnie i przyjmuje wszystkie właściwości (w tym klasę i obiekt stylów `HTMLImageElement`).

**Faza 2: Propagacja do interfejsu**
- [ ] Oczyszczenie w.w. siedmiu plików ze starych `<img src... onError.../>` i wstrzyknięcie czystego `<SafeImage src... />`.
- Weryfikacja: Brak błędów TS przy przypisywaniu klas.

### Weryfikacja końcowa
- `npm run build`
- Ręczne wpisanie nieprawidłowego `src` podczas testów w UI i weryfikacja czy pojawia się ikona błędu bez wchodzenia w infinite loop.

### Co może się zepsuć
Niskie ryzyko: o ile `SafeImage` poprawnie przyjmie i przekaże argument `className`, układ wizualny komponentów-rodziców pozostanie nietknięty.
