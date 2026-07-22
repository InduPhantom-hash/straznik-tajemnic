# Plan Review: Persystencja Tablicy Badacza (Investigator Board)

Data: 2026-07-22  

### Ocena ogólna
🟢 **Zielony** – Plan jest dobrze przemyślany, kompletny i precyzyjnie adresuje brak persystencji bez ryzyka zepsucia wstecznej kompatybilności zapisów gry.

---

### Analiza w 7 wymiarach

1. **Definicja problemu:** 🟢 Bardzo dobra. Jasno zidentyfikowano efemeryczność stanu `useState` w `SessionJournal.tsx` oraz brak miejsca na Tablicę Badacza w obiekcie `FullGameSave`.
2. **Kompletność:** 🟢 Zmapowano wszystkie 6 kluczowych plików w warstwach typów, komponentów React, hooków i silnika zapisów.
3. **Dopasowanie do architektury:** 🟢 Plan szanuje architekturę `FullGameSaveManager` oraz konwencję obiektów postaci i Hot Seat.
4. **Rabbit holes:** 🟡 Warto uważać na pętlę aktualizacji React (`useEffect`) przy synchronizacji z `onUpdateCharacter` / `onUpdateSharedJournal`, by uniknąć zapętlenia rerenderów.
5. **Promise gaps:** 🟢 Każda faza ma zdefiniowane punkty weryfikacji.
6. **Strategia testowania:** 🟡 Zamiana `npx tsc --noEmit` na `npm run test` lub `npm run type-check`, jako że bezpośrednie wywołanie `npx tsc` jest zablokowane w tym środowisku przez npx registry guard.
7. **Zgodność z guardrails:** 🟢 Respektuje zasady nieinwazyjności i izolacji zmian.

---

### Rekomendacja
**Implementuj (`/dev-4-implement`)**. Plan jest gotowy do realizacji.
