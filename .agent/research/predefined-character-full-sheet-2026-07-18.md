# Research: Pełny podgląd karty postaci dla predefiniowanych badaczy
Data: 2026-07-18
Stack: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS

## Cel researchu
Analiza wdrożenia pełnej karty postaci (zawierającej cechy podstawowe, umiejętności oraz ekwipunek) w modalu szczegółów predefiniowanej postaci przed startem gry. Ma to na celu zastąpienie uproszczonego widoku biograficznego pełną specyfikacją mechaniczną.

---

## 1. Obszar problemu
Kluczowe pliki w projekcie zaangażowane w wyświetlanie i konfigurację predefiniowanych postaci:
- [_tester/_base/.silnik/src/components/ui/predefined-characters-selector.tsx](file:///Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/ui/predefined-characters-selector.tsx) - komponent modalnego wyboru postaci w wersji silnika testowego (zawiera podgląd szczegółów).
- [src/components/ui/predefined-characters-selector.tsx](file:///Volumes/Karta/Developer/straznik-tajemnic/src/components/ui/predefined-characters-selector.tsx) - uproszczona wersja komponentu wyboru postaci (wybór następuje bezpośrednio po kliknięciu karty).
- [src/lib/immersion/predefined-characters.ts](file:///Volumes/Karta/Developer/straznik-tajemnic/src/lib/immersion/predefined-characters.ts) - baza predefiniowanych postaci z pełnymi statystykami.
- [src/lib/types.ts](file:///Volumes/Karta/Developer/straznik-tajemnic/src/lib/types.ts) - definicje typów dla postaci (`Character`), umiejętności i ekwipunku.

---

## 2. Zależności i przepływ danych
- **PredefinedCharactersSelector** jest montowany dynamicznie w `src/app/page.tsx` w trybie klient-side.
- Każda predefiniowana postać posiada pełną strukturę typu `Character` (w tym atrybuty `str`, `dex`, `con`, `app`, `pow`, `edu`, `siz`, `int`, `luck`, słownik `skills` oraz tablicę `equipment`).
- Wersja rozszerzona w `.silnik` przechowuje wybrany element w stanie `viewingCharacter: Character | null` i po kliknięciu "Wybierz tę postać" przekazuje go do callbacku `onSelectCharacter`.

---

## 3. Komponenty wizualne z karty postaci
Zidentyfikowaliśmy architekturę pełnej karty badacza (`CharacterSheet`) w katalogu `src/components/ui/character-sheet/`:
- **SheetVitals** (`components/sheet-vitals.tsx`): renderuje cechy podstawowe (STR, DEX itp.) oraz cechy pochodne walki (Bonus DMG, Krzepa, Ruch) obliczane za pomocą `deriveStats`.
- **SheetSkills** (`components/sheet-skills.tsx`): renderuje tabelę umiejętności w gridzie dwukolumnowym z wyróżnieniem umiejętności zawodowych i mitów.
- **SheetEquipment** (`components/sheet-equipment.tsx`): renderuje broń (z obrażeniami i szansą na test) oraz wyposażenie dodatkowe.

---

## 4. Ryzyka i uwagi
- **Zróżnicowanie plików**: Istnieją dwie wersje `predefined-characters-selector.tsx` (główna oraz ukryta w `_tester/_base/.silnik/src`). Należy upewnić się, że obie wersje zostaną zaktualizowane w celu uniknięcia niespójności działania.
- **Rozmiar modalu**: Wyświetlenie wszystkich cech, umiejętności i przedmiotów zajmie sporo miejsca na wysokość. Aby uniknąć ucięcia elementów na małych ekranach, modal musi posiadać właściwość `max-h-[90vh] overflow-y-auto` oraz przechodzić w układ jednokolumnowy na urządzeniach mobilnych (`flex flex-col md:flex-row`).
- **Myślniki**: Zgodnie z nadrzędnymi zasadami użytkownika, w opisach i formatowaniu należy używać wyłącznie klasycznego myślnika `-`, a nie pauz ani półpauz.

---

## 5. Rekomendowany następny krok
Zalecane jest przejście do kroku `/dev-2-plan` w celu sformułowania planu implementacji i diffów modyfikujących pliki.
