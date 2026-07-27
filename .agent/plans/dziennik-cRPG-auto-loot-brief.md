## Brief: Dziennik cRPG & Auto-loot
**Co**: Przeprojektowanie Dziennika Misji na 85vw z klasycznymi scrollbarami i stylem akt, oraz usunięcie przycisków łupu na czacie.
**Jak**: Zmiana klas Tailwind w `session-journal.tsx` oraz modyfikacja logiki zamykania karty w `acquired-item-card.tsx`.
**Pliki**: `session-journal.tsx`, `acquired-item-card.tsx`.
**Test**: `npm run test` dla testów UI Dziennika oraz manualne przeklikanie.
**Ryzyko**: Regresja w przypisywaniu przedmiotów postaciom przy trybie Hot Seat.
