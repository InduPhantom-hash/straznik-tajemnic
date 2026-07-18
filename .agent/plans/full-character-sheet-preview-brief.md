# Brief: Pełny podgląd karty postaci dla predefiniowanych badaczy
- **Co**: Rozbudowanie modalu szczegółowego podglądu badacza o pełną kartę postaci (cechy, umiejętności, ekwipunek).
- **Jak**: Wdrożenie responsywnego dwukolumnowego układu (podział: biografia po lewej, statystyki/mechanika po prawej) w obu plikach selektora.
- **Pliki**: 
  - `_tester/_base/.silnik/src/components/ui/predefined-characters-selector.tsx`
  - `src/components/ui/predefined-characters-selector.tsx`
- **Test**: Kompilacja i weryfikacja poprawności stylów oraz testów.
- **Ryzyko**: Overflow przy małych ekranach - mitygowane przez `max-h-[90vh] overflow-y-auto`.
