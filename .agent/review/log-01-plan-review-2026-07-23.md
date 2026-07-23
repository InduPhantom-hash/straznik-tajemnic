## Plan Review: LOG-01 Dwuetapowy Przepływ "Koniec Sesji" & Faza Rozwoju CoC 7e
Data: 2026-07-23  

### Ocena ogólna
🟢 **Zielony** — Plan jest kompletny, precyzyjnie zaadresował diagnozę i nie łamie konwencji projektu.

---

### Analiza wg siedmiu wymiarów

1. **Definicja problemu:** 🟢 Doskonała. Plan trafia w punkt zgłoszenia `LOG-01` w `bug.md` (potrzeba 2-etapowego zamykania sesji z pytaniem `[Co robisz?]` oraz automatycznej Fazy Rozwoju na dole czatu).
2. **Kompletność:** 🟢 Kompletne zestawienie plików backendu (`run-chat-pipeline.ts`, `default-gm-prompt.md`), hooków (`useChat.ts`), routing-u (`page.tsx`) i UI (`CthulhuSidebar`, `MessageInput`, `MessageCard`, `DevelopmentPhaseCard`).
3. **Dopasowanie do architektury:** 🟢 Używa istniejącego mechanizmu parsowania tagów SSE, hooka `useSkillMarking` i biblioteki rzutów `character-development.ts`.
4. **Rabbit holes:** 🟡 Wyodrębnienie `DevelopmentPhaseCard` z `DevelopmentPhaseModal` — aby uniknąć duplikacji kodu rzutów K100/SAN, komponent inline powinien bezpośrednio wykorzystywać funkcje czyste z `character-development.ts` (`rollSkillDevelopment`, `rollLuckRecovery`, `rollSanityRecovery`).
5. **Promise gaps:** 🟢 Płynne przejście etapów `idle` ➔ `awaiting_player_closure` ➔ `ended`.
6. **Strategia testowania:** 🟢 Komendy `npx tsc --noEmit` i `npx jest` z dedykowanymi testami w `cleanup.test.ts` i `useChat.test.ts`.
7. **Zgodność z guardrails:** 🟢 Precyzyjne, defensywne zmiany bez naruszania pozostałej logiki biznesowej.

---

### Znalezione uwagi i sugestie

**Ostrzeżenia (do uwzględnienia podczas implementacji):**
- **[Dopasowanie Ścieżek]**: Ścieżki źródłowe znajdują się w podkatalogu silnika `_tester/_base/.silnik/src/` (oraz są zsynchronizowane z `src/`). Zmiany należy nanosić na pliki źródłowe w `_tester/_base/.silnik/src/`.
- **[Czyszczenie Taga]**: Upewnić się w `cleanup.ts`, że reguła regex sprawnie wycina tag `[KONIEC_SESJI:POTWIERDZENIE]` ze strumienia audio lektora i tekstu narracji przed dodaniem do czatu.

---

### Rekomendacja
🟢 **Rekomendowane przejście do `/dev-4-implement`**. Plan jest bezpieczny i gotowy do realizacji.
