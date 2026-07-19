## Brief: Etap 1 - mechanika tempa i bezpieczna podstawa

**Co**: Dodać eksperymentalne ustawienia tempa oraz szczegółowości walk i pościgów, bez zastępowania obecnego czatu.
**Jak**: Jeden opt-in w Sesji Zero aktywuje wszystkie kontrolki. `pure_narrative` je blokuje, a centralny normalizator chroni localStorage i `/api/chat`.
**Prompt**: Nowa sekcja mówi tylko o strukturze beatu; obecny kontroler pozostaje wyłącznym źródłem limitów słów.
**Pliki**: `ai-settings`, Sesja Zero, `pacing-controller`, `resolve-settings`, pipeline czatu i testy jednostkowe.
**Test**: Deep merge, legacy fallback, trzy poziomy po opt-in, blokada Czystej Narracji, serializacja save'a i jedna niesprzeczna dyrektywa.
**Ryzyko**: Średnie - chronione przez opt-in, normalizację na dwóch granicach i brak zmiany istniejącej heurystyki.
