## Brief: Sekwencyjne Generowanie Obrazów Ekwipunku
**Co**: Naprawa blokady API (błędy 429/500) przy automatycznej generacji miniatur ekwipunku oraz wdrożenie poprawek przez przebudowanie aplikacji.
**Jak**: Usunięcie równoległych zapytań z miniatur `ItemThumbnail` i zaimplementowanie sekwencyjnego generowania w głównym komponencie `EquipmentModal` za pomocą jednego `useEffect` (kolejka). Dodatkowo, przywrócenie ikon kategorii jako placeholderów w karcie postaci.
**Pliki**: 
- `_tester/_base/.silnik/src/components/ui/equipment-modal.tsx`
- `_tester/_base/.silnik/src/components/ui/character-sheet/components/sheet-equipment.tsx`
**Test**: Uruchomienie `bash desktop/build-app.sh --rebuild` i sprawdzenie czy miniatury generują się kolejno w grze.
**Ryzyko**: Minimalne. Błędy API przy generowaniu zostaną wyłapane bez blokowania UI.
