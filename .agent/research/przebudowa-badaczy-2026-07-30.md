## Research: Przebudowa Predefiniowanych Badaczy
Data: 2026-07-30
Stack: TypeScript, React, Next.js, Tailwind CSS (katalog `_tester/_base/.silnik/src/`)

### Obszar problemu
- `_tester/_base/.silnik/src/lib/immersion/predefined-characters.ts` — główna baza zdefiniowanych postaci (30 zbalansowanych postaci dla 3 epok: gaslight, classic, modern).
- `_tester/_base/.silnik/src/lib/immersion/strefa-11-characters.ts` — nowo dodany zbiór postaci dla Strefy 11 (4 postacie: Helena, Barbara, Tomasz, Ryszard).
- `_tester/_base/.silnik/src/components/ui/predefined-characters-selector.tsx` — komponent UI modalu odpowiadający za przeglądanie i wybór postaci.
- `_tester/_base/.silnik/src/lib/types.ts` — bazowy interfejs `Character`. Interfejs `PredefinedCharacter` rozszerza go o `era`, `archetype` i nowo dodane `tacticalNotes`.

### Zależności
- Elementy w UI (`predefined-characters-selector.tsx`) korzystają z list. Obiekt `PREDEFINED_CHARACTERS` służy jako główne źródło prawdy. Trzeba się upewnić, że nowa epoka (`prl`) i postacie ze `strefa-11-characters.ts` integrują się w 100% z głównym systemem wyboru postaci.
- Dodano `tacticalNotes` dla 30 bazowych postaci, ale w nowej paczce postaci dla Strefy 11 (oraz ewentualnych 6 dodatkowych do "40") struktury muszą być tożsame i kompletne.

### Istniejące testy
- Zidentyfikowano `_tester/_base/.silnik/src/components/ui/predefined-characters-selector.test.tsx` jako główne ramy bezpieczeństwa dla modalu wyboru. 

### Ryzyka i uwagi
- Dług technologiczny w liczbie postaci: backlog w `state.md` mówi o "40 postaciach", tymczasem w plikach jest ich 34 (30 + 4 ze Strefy 11). Przebudowa prawdopodobnie wymaga dodania kolejnych 6.
- Przebudowa "układu i metadanych" nakłada ryzyko rozbicia UI. Trzeba sprawdzić, czy zaktualizowane metadane nie wymagają dodatkowego ostylowania kafelków badaczy (nowe znaczniki, odświeżony CSS pasujący do niedawnej aktualizacji okna ekwipunku).

### Rekomendowany następny krok
Zalecam przejście do komendy `/dev-2-plan`.
Musimy zdefiniować:
1. Czy w ramach tego etapu dopisujemy brakujące 6 postaci, by dowieźć kamień milowy 40 postaci?
2. Co ma ulec przebudowie w układzie UI wyboru badaczy (czy eksponujemy nowe metadane, zmieniamy kafelki)?
