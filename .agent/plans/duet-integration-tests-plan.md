## Plan: testy integracyjne duetu W4 i W5

Data: 2026-07-17
Złożoność: Średnia

### Problem

Obsługa duetu działa i przeszła dotychczasowe testy, ale brakuje dwóch testów granicznych: pełnego przebiegu dwóch adresowanych rzutów przez interfejs oraz mutacji wspólnego Dziennika Przygody.

### Rozwiązanie

Dodać dwa testy integracyjne oparte na rzeczywistych komponentach i obecnych helperach produkcyjnych. Rzuty zostaną ustabilizowane mockiem źródła losowości, a test dziennika użyje kontrolowanego stanu trzech postaci, aby sprawdzić synchronizację uczestników i izolację karty spoza przygody.

### Pliki do modyfikacji

| plik | zmiana | ryzyko |
|------|--------|--------|
| `_tester/_base/.silnik/src/components/chat/chat-window/chat-window.duet-rolls.test.tsx` | Nowy test W4 przechodzący przez `ChatWindow`, kartę testu i `RollTestModal` | Średnie |
| `_tester/_base/.silnik/src/components/ui/session-journal.test.tsx` | Rozszerzenie o test W5: dodanie, edycja i usunięcie wpisu oraz synchronizacja kart | Średnie |

### Fazy implementacji

**Faza 1: W4 - dwa adresowane rzuty duetu**

- [ ] Zbudować minimalne dane dwóch graczy, dwóch kart z różnymi wartościami umiejętności i jednej wiadomości MG zawierającej dwa testy z tym samym `groupId` oraz właściwymi `characterId`.
- [ ] Renderować rzeczywisty `ChatWindow` z uruchomioną grą i obsłużyć oba przyciski `Rzuć` oraz modal `RollTestModal` przez Testing Library.
- [ ] Ustabilizować wyniki k100 mockiem `dice-utils` lub kontrolowanym `Math.random`, tak aby pierwszy rzut wymagał wydania Szczęścia, a drugi zakończył się sukcesem bez Szczęścia.
- [ ] Potwierdzić, że wydane Szczęście obciąża tylko właściwą kartę i że każdy rzut trafia do dziennika właściwego badacza.
- [ ] Potwierdzić, że sukces ze Szczęściem nie oznacza umiejętności do rozwoju, a sukces bez Szczęścia oznacza umiejętność drugiej postaci.
- [ ] Potwierdzić brak żądania do MG po pierwszym rzucie oraz dokładnie jedno po drugim, z wynikami obu badaczy w kolejności testów.
- Weryfikacja: `npm test -- --runInBand src/components/chat/chat-window/chat-window.duet-rolls.test.tsx`

**Faza 2: W5 - mutacje wspólnego Dziennika Przygody**

- [ ] Rozszerzyć test `SessionJournal` o kontrolowany wrapper przechowujący trzy karty: dwóch uczestników i jedną postać spoza przygody.
- [ ] Połączyć `onUpdateSharedJournal` z produkcyjnym `synchronizeAdventureJournal`, używając konkretnego `adventureJournalId`.
- [ ] Przez interfejs dodać notatkę i potwierdzić identyczny wpis na obu kartach uczestników oraz brak zmiany trzeciej karty.
- [ ] Przez interfejs edytować ten sam wpis i potwierdzić synchronizację treści oraz ustawienie `updatedAt` u obu uczestników.
- [ ] Przez interfejs usunąć wpis po potwierdzeniu dialogu i sprawdzić pusty bieżący dziennik obu uczestników oraz niezmienioną historię postaci spoza przygody.
- Weryfikacja: `npm test -- --runInBand src/components/ui/session-journal.test.tsx`

**Faza 3: regresja i jakość**

- [ ] Uruchomić oba nowe scenariusze razem i usunąć zależności od czasu, kolejności testów oraz rzeczywistej losowości.
- [ ] Uruchomić pełny zestaw Jest, TypeScript i ESLint tylko dla zmienionych plików.
- [ ] Zaktualizować `.agent/implementation/duet-gameplay-readability-state.md`, oznaczając W4 i W5 jako zakończone wraz z wynikami weryfikacji.
- Weryfikacja: pełne komendy z sekcji poniżej oraz czyste wyniki bez nowych ostrzeżeń.

### Weryfikacja końcowa

Uruchomić z katalogu `_tester/_base/.silnik/`:

```bash
npm test -- --runInBand src/components/chat/chat-window/chat-window.duet-rolls.test.tsx src/components/ui/session-journal.test.tsx
npm test -- --runInBand
npx tsc --noEmit
npx eslint src/components/chat/chat-window/chat-window.duet-rolls.test.tsx src/components/ui/session-journal.test.tsx
npx prettier --check src/components/chat/chat-window/chat-window.duet-rolls.test.tsx src/components/ui/session-journal.test.tsx
```

Kryterium ukończenia: test W4 potwierdza dwa adresowane rzuty, wydanie Szczęścia, właściwe dzienniki, rozwój i jedno żądanie do MG; test W5 potwierdza dodanie, edycję i usunięcie wpisu, identyczny zapis uczestników oraz brak zmian na trzeciej karcie.

### Co może się zepsuć

- Średnie: animacja `RollTestModal` może powodować niestabilność testu. Użyć fałszywych timerów i jawnie opróżniać kolejkę timerów po każdym rzucie.
- Średnie: globalny mock losowości może wpływać na identyfikatory wpisów dziennika. Ograniczyć mock do konkretnego testu i przywracać go w `afterEach`.
- Średnie: test W4 może przypadkowo sprawdzać atrapę callbacku zamiast realnego przepływu. Callbacki testowego wrappera mają używać tych samych produkcyjnych helperów co `page.tsx`: `appendRollToJournal`, `markSkillForImprovement` i aktualizacja Szczęścia po `characterId`.
- Niskie: `confirm()` w usuwaniu wpisu nie istnieje jako przewidywalna implementacja w jsdom. Zamockować `window.confirm` tylko na czas scenariusza usunięcia.
- Niskie: portale Radix i automatyczne przewijanie mogą generować szum. Korzystać z istniejącego `jest.setup.ts` i czyścić DOM oraz timery po teście.

