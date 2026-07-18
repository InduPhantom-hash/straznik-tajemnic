# Plan: Pełny podgląd karty postaci dla predefiniowanych badaczy
Data: 2026-07-18
Złożoność: Średnia

## Problem
Podgląd predefiniowanych badaczy przed startem gry wyświetlał wyłącznie uproszczoną biografię i podstawowe wskaźniki (PŻ, PR, PM, SZC). Użytkownik nie miał wglądu w pełną kartę postaci (cechy główne, umiejętności oraz ekwipunek), co utrudniało podjęcie decyzji o wyborze badacza.

## Rozwiązanie
Rozbudujemy modal szczegółowego podglądu postaci w komponencie selektora o responsywny, dwukolumnowy układ prezentujący kompletne atrybuty (STR, DEX itp. przetłumaczone na język polski), umiejętności postaci oraz jej startowy ekwipunek. Ujednolicimy kod w obu plikach selektora (produkcyjnym oraz testowym).

## Pliki do modyfikacji
| plik | zmiana | ryzyko |
|------|--------|--------|
| `_tester/_base/.silnik/src/components/ui/predefined-characters-selector.tsx` | Wdrożenie pełnego dwukolumnowego widoku szczegółów postaci. | Niskie |
| `src/components/ui/predefined-characters-selector.tsx` | Synchronizacja i wdrożenie tego samego kodu co wyżej. | Niskie |

## Fazy implementacji

### Faza 1: Wdrożenie szczegółów w silniku testowym
- Dodanie słownika tłumaczeń `CHARACTERISTIC_LABELS` dla atrybutów.
- Zmiana szerokości kontenera modalu szczegółów (`max-w-4xl`) oraz dodanie obsługi przewijania (`max-h-[90vh] overflow-y-auto`).
- Przebudowa zawartości modalu na strukturę dwukolumnową (lewa kolumna: portret, wiek, zawód, wskaźniki stanu i opis biografii; prawa kolumna: kafelki cech badacza, lista posiadanych umiejętności, lista ekwipunku).
- Weryfikacja: Uruchomienie budowania projektu Next.js w silniku.

### Faza 2: Synchronizacja z kodem produkcyjnym
- Skopiowanie zaktualizowanego komponentu do ścieżki produkcyjnej.
- Weryfikacja: Kompilacja i sprawdzenie poprawności typów TypeScript.

## Weryfikacja końcowa
- Wykonanie `npm run build` w folderze silnika w celu upewnienia się, że nie ma błędów kompilacji ani problemów z typami.

## Co może się zepsuć
- **Przepełnienie UI**: Zbyt duża ilość treści może nie mieścić się na ekranach o małej wysokości. Rozwiązanie to dodanie `max-h-[90vh] overflow-y-auto` oraz responsywnego wrapowania `flex-col md:flex-row`.
