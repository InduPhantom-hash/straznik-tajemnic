# Brief: Poprawa Wizualizacji i Czytelności Ekwipunku
**Co**: Poprawa czytelności kart wyposażenia, dodanie estetycznych miniatur-placeholderów z tłem i ikonami oraz naprawa ucinania obrazów w podglądzie.
**Jak**: Zmiana siatki na dwukolumnową, dodanie stylizowanych tła i obramowania dla placeholderów w `ItemThumbnail` (zarówno w modalu, jak i na karcie postaci) oraz powiększenie i ujednolicenie proporcji obrazów w oknie szczegółów (`aspect-square object-cover`).
**Pliki**: 
- `_tester/_base/.silnik/src/components/ui/equipment-modal.tsx`
- `_tester/_base/.silnik/src/components/ui/character-sheet/components/sheet-equipment.tsx`
**Test**: Budowanie projektu (`npm run build` / weryfikacja statyczna kodu).
**Ryzyko**: Minimalne (czyste zmiany stylów CSS i klas Tailwind/layoutu w komponentach UI).
