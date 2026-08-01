## Plan: Generatory Fabularne (Etap 3.5)
Data: 2026-08-01
Złożoność: Średnia

### Problem
Przycisk "Użyj w Grze" w panelu narzędzi Mistrza Gry (`RandomEventGenerator`) nie robi nic - callback `onEventGenerated` nie jest podpięty. Wylosowane zdarzenie tła (pogoda, NPC, atmosfera) ginie w próżni i nigdy nie dociera do AI.

### Rozwiązanie
**Piggybacking** - zdarzenie z generatora nie trafia do czatu jako osobna wiadomość (co popsułoby TTS, race conditions, modale). Zamiast tego ląduje w ukrytym buforze (`pendingDirectorEvent`), a przy najbliższej wiadomości gracza jest dołączane do `body` zapytania API i wstrzykiwane do `additionalContext` jako `[INSTRUKCJA REŻYSERSKA]`. AI MG naturalnie wplata zdarzenie w swoją odpowiedź.

**W skrócie:** Gracz (lub MG) klika "Użyj w Grze", wybiera zdarzenie, a przy następnej turze AI dostaje podpowiedź reżyserską i opisuje np. nagłą mgłę czy spotkanie z NPC - bez żadnego szarpania UI, nakładania się audio ani blokowania inputu.

### Pliki do modyfikacji

| plik | zmiana | ryzyko |
|------|--------|--------|
| `components/ui/gm-tools-modal.tsx` | Dodać prop `onEventGenerated` i przekazać go do `RandomEventGenerator` | Niskie |
| `app/page.tsx` | Dodać stan `pendingDirectorEvent`, przekazać callback do `GMToolsModal`, przekazać bufor do `ChatWindow`/`useChat` | Niskie |
| `hooks/useChat.ts` | Przyjąć `pendingDirectorEvent`, dołączyć do `body` w `handleSendMessage`, wyczyścić bufor po wysłaniu | Średnie |
| `app/api/chat/_helpers/run-chat-pipeline.ts` | Odczytać `directorEvent` z `body`, przekazać do `buildAdditionalContext` | Niskie |
| `app/api/chat/_helpers/build-context.ts` | Dodać opcjonalne pole `directorEventSection` do `BuildAdditionalContextOpts`, wstrzyknąć do tablicy `additionalContext` | Niskie |
| `lib/prompts/gm-protocol.ts` | Dodać instrukcję `[INSTRUKCJA REŻYSERSKA]` do kompaktowego protokołu GM | Niskie |

### Fazy implementacji

**Faza 1: Backend (Piggybacking pipeline)**
- [ ] W `build-context.ts`: dodać pole `directorEventSection?: string` do `BuildAdditionalContextOpts`; push do `additionalContext` gdy niepuste
- [ ] W `run-chat-pipeline.ts`: odczytać `directorEvent` z `body` (destructuring), zbudować string sekcji `[INSTRUKCJA REŻYSERSKA - WYDARZENIE: ...]` i przekazać do `buildAdditionalContext`
- [ ] W `gm-protocol.ts`: dodać 3-linijkową instrukcję do `getCompactGMProtocolPrompt()` opisującą jak AI ma traktować tag `[INSTRUKCJA REŻYSERSKA]`
- Weryfikacja: `npx tsc --noEmit` przechodzi; testy `npm test` w `.silnik/` na zielono

**Faza 2: Frontend (Przepięcie callbacków)**
- [ ] W `gm-tools-modal.tsx`: rozszerzyć `GMToolsModalProps` o `onEventGenerated?: (event: RandomEvent) => void`; przekazać do `<RandomEventGenerator>`
- [ ] W `page.tsx`: dodać `const [pendingDirectorEvent, setPendingDirectorEvent] = useState<RandomEvent | null>(null)`; przekazać `setPendingDirectorEvent` jako callback `onEventGenerated` do `<GMToolsModal>`; przekazać `pendingDirectorEvent` + setter do `<ChatWindow>` / hooka `useChat`
- [ ] W `useChat.ts`: dodać parametr `pendingDirectorEvent` + `clearPendingDirectorEvent` do opcji hooka; w `handleSendMessage` dołączyć `directorEvent` do `body` JSON; po wysłaniu wywołać `clearPendingDirectorEvent()`
- Weryfikacja: `npx tsc --noEmit` przechodzi; uruchomić `npm run dev`, otworzyć panel MG, wylosować zdarzenie, kliknąć "Użyj w Grze", wysłać wiadomość - AI powinno wpleść zdarzenie w odpowiedź

**Faza 3: Test i dokumentacja**
- [ ] Dodać test jednostkowy `build-context.test.ts` (lub rozszerzyć istniejący) sprawdzający obecność sekcji `INSTRUKCJA REŻYSERSKA` w `additionalContext`
- [ ] Zaktualizować `session-notes.md` o podsumowanie sesji

### Weryfikacja końcowa
```bash
cd _tester/_base/.silnik && npx tsc --noEmit && npm test
```
Plus ręczny test: panel MG -> Generator Wydarzeń -> "Użyj w Grze" -> napisz cokolwiek na czacie -> AI wplata zdarzenie w narrację.

### Co może się zepsuć
| Ryzyko | Prawdopodobieństwo | Łagodzenie |
|--------|-------------------|------------|
| TTS czyta tag `[INSTRUKCJA REŻYSERSKA]` na głos | Niskie - tag jest w system prompt, nie w odpowiedzi AI | Instrukcja w `gm-protocol` wyraźnie zabrania AI powtarzania tagu |
| Zdarzenie wisi w buforze, ale gracz nie wysyła wiadomości | Niskie - zdarzenie czeka, nic się nie psuje | Opcjonalnie: wizualny wskaźnik "Oczekujące zdarzenie" w UI czatu (v2) |
| TypeScript error z nowym polem `directorEvent` w body | Niskie | Pole jest opcjonalne (`directorEvent?: {...}`) |
