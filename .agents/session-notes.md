## Podsumowanie sesji: 2026-08-12
Branch: main (lub obecny)

### Co zrobiono
- **UX Karty Postaci**: Refaktoryzacja okna wyboru postaci oraz karty w trakcie gry. Zamiana okna "Koncept" na potężny "Życiorys" zasilany głównym polem backstory, pozostawiając mniejsze notatki w spokoju.
- **Master Rule QA**: Utworzenie Złotej Zasady Antigravity dla tego repozytorium - wszystkie testy przeniesione natywnie na pulpit przez build silnika (`_tester/_base/.silnik`). 
- **Hotfixy TS**: Rozwiązanie krytycznych braków typowań w interfejsie Next.js oraz naprawa błędnych rekwizytów (`onNext`) przy Ekwipunku.
- *(Z poprzednich pętli)*: Naprawa silnika czytania i czyszczenia TTS.

### Co otwarte (do następnej sesji)
- Optymalizacja wizualna lub ewentualne przepięcia w kreatorze (do decyzji).

### Decyzje podjęte
- Aplikacja desktopowa to ostateczny autorytet weryfikacyjny. Pusty folder `src/` to przeżytek, każda zmiana ląduje z twardą weryfikacją w `.silnik`.
