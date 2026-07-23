## Plan: Rozbudowa biografii predefiniowanych postaci [CHA-01]
Data: 2026-07-23
Złożoność: Średnia (rozbudowa zawartości 30 postaci w 2 zsynchronizowanych plikach TS + weryfikacja testów)

---

### Problem
Biografie w `predefined-characters.ts` dla 30 postaci są jednoliterowe/zdawkowe. Brakuje w nich literackiej głębi CoC 7e oraz jednoznacznego wskazania Kluczowej Więzi (Key Connection) pośród 8 aspektów tła.

### Rozwiązanie
Przepisanie i wzbogacenie pól biograficznych wszystkich 30 postaci w `src/lib/immersion/predefined-characters.ts` oraz w pliku lustrzanym `_tester/_base/.silnik/src/lib/immersion/predefined-characters.ts`. Każda postać otrzyma wieloakapitowy `backstory` z klimatem Lovecrafta, wyraziste opisy wyglądu (`description`), przekonania (`ideology`), relacje (`significantPerson`), znaczące miejsce (`meaningfulLocation`), cenny przedmiot (`treasuredPossession`) oraz jawną adnotację Kluczowej Więzi w historii.

---

### Pliki do modyfikacji

| plik | zmiana | ryzyko |
|------|--------|--------|
| `src/lib/immersion/predefined-characters.ts` | Rozbudowa 8 aspektów tła dla 30 postaci (Gaslight, Classic, Modern) | Niskie |
| `_tester/_base/.silnik/src/lib/immersion/predefined-characters.ts` | Lustrzana aktualizacja danych 30 postaci | Niskie |

---

### Fazy implementacji

#### Faza 1: Rozbudowa biogramów epoki Gaslight (10 postaci, 1890s)
- [ ] Przepisanie 8 aspektów tła dla 10 postaci Gaslight (Pendleton, Vance, Blackwood, Ashford, Shaw, Croft, Sterling, Cavell, Thorne, Moreau).
- [ ] Uzupełnienie jawnej adnotacji `[Kluczowa więź: ...]` w polu `backstory`.
- Weryfikacja: `npx jest src/lib/immersion/predefined-characters.test.ts`

#### Faza 2: Rozbudowa biogramów epoki Classic (10 postaci, 1920s)
- [ ] Przepisanie 8 aspektów tła dla 10 postaci Classic (O'Brien, Sullivan, Dyer, Updike, Grant, Mason, Whitman, Sterling E., Ward, Blackwell).
- [ ] Uzupełnienie jawnej adnotacji `[Kluczowa więź: ...]` w polu `backstory`.
- Weryfikacja: `npx jest src/lib/immersion/predefined-characters.test.ts`

#### Faza 3: Rozbudowa biogramów epoki Modern (10 postaci, Współczesność)
- [ ] Przepisanie 8 aspektów tła dla 10 postaci Modern (Miller, Vance C., Carter, Rostova, Vance M., Cross, Cole, Patel, Crowley, Marsh).
- [ ] Uzupełnienie jawnej adnotacji `[Kluczowa więź: ...]` w polu `backstory`.
- Weryfikacja: `npx jest src/lib/immersion/predefined-characters.test.ts`

#### Faza 4: Synchronizacja lustrzana i weryfikacja końcowa
- [ ] Kopiowanie zsynchronizowanej zawartości do `_tester/_base/.silnik/src/lib/immersion/predefined-characters.ts`.
- [ ] Sprawdzenie typu TypeScript: `npx tsc --noEmit`.
- [ ] Uruchomienie pełnego zestawu testów jednostkowych i UI.

---

### Weryfikacja końcowa
- `npx tsc --noEmit`
- `npx jest src/lib/immersion/predefined-characters.test.ts`
- `npx jest src/components/ui/predefined-characters-selector.test.tsx`

---

### Co może się zepsuć
- **Desynchronizacja plików**: Plik w `_tester/_base/.silnik/` nie zostanie zaktualizowany (Niskie ryzyko, Faza 4 to zabezpiecza).
- **Złamana konwencja testów**: Zmiana nazw lub identyfikatorów postaci (Niskie ryzyko, identyfikatory `id` i pola ekwipunku pozostają nienaruszone).
