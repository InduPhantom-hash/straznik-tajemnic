## Plan: Dwuetapowy Przepływ "Koniec Sesji" & Faza Rozwoju CoC 7e (LOG-01)
Data: 2026-07-23  
Złożoność: Średnia  

### Problem
Przycisk "Koniec Sesji" ucina grę jednolicie i natychmiast w 1 turze bez dania graczowi możliwości wykonania finałowego gestu/akcji, a Faza Rozwoju CoC 7e jest schowana w osobnym modalem w sidebarze.

### Rozwiązanie
Wprowadzenie stanu etapu `sessionEndStatus` (`'idle' | 'awaiting_player_closure' | 'ended'`). Kliknięcie "Koniec Sesji" wymusza na AI domknięcie sceny z pytaniem `[Co robisz?]`. Po finałowej akcji gracza AI wygłasza epilog z tagiem `[KONIEC_SESJI:POTWIERDZENIE]`, a pod wiadomością w czacie automatycznie wyświetla się interaktywny widok Fazy Rozwoju CoC 7e (`DevelopmentPhaseCard`).

### Pliki do modyfikacji
| Plik | Zmiana | Ryzyko |
|------|--------|--------|
| `public/default-gm-prompt.md` | Dwuetapowy protokół Koniec Sesji w system prompcie | Niskie |
| `src/app/api/chat/_helpers/run-chat-pipeline.ts` | Rozróżnienie instrukcji dla `[KONIEC_SESJI]` vs `[KONIEC_SESJI:FINAL]` | Niskie |
| `src/hooks/useChat.ts` | Stan `sessionEndStatus` i flaga wysyłki finałowej tury | Średnie |
| `src/app/page.tsx` | Przekazanie `isSessionEnded` i `sessionEndStatus` do Sidebar/ChatWindow | Niskie |
| `src/components/sidebar/CthulhuSidebar.tsx` | Dynamiczny przycisk (Koniec Sesji ➔ Oczekiwanie ➔ Zamknięta 🔒) | Niskie |
| `src/components/chat/chat-window/components/message-input.tsx` | Placeholder dla finałowej akcji gracza | Niskie |
| `src/components/chat/chat-window/components/message-card.tsx` | Renderowanie `DevelopmentPhaseCard` pod finałową wiadomością | Niskie |
| `src/components/chat/chat-window/components/DevelopmentPhaseCard.tsx` | NEW: Dedykowana Faza Rozwoju CoC 7e inline pod czatem | Niskie |

### Fazy implementacji

**Faza 1: Backend & Prompty (Pipeline)**
- [ ] Zaktualizowanie `public/default-gm-prompt.md` z dwuetapowym protokołem.
- [ ] Obsługa wstrzykiwania dedykowanych instrukcji w `run-chat-pipeline.ts` dla `[KONIEC_SESJI]` i `[KONIEC_SESJI:FINAL]`.
- Weryfikacja: Wysłanie `[KONIEC_SESJI]` w testowym zestawie danych i sprawdzenie braku tagu `[KONIEC_SESJI:POTWIERDZENIE]` w Kroku 1.

**Faza 2: Frontend State & Navigation (Hooks/Sidebar/Page)**
- [ ] Rozbudowanie `useChat.ts` o `sessionEndStatus`.
- [ ] Przekazanie propów w `page.tsx`.
- [ ] Dostosowanie styków przycisków w `CthulhuSidebar.tsx` oraz placeholdera w `MessageInput.tsx`.
- Weryfikacja: Przejście płynne przycisku sidebaru między 3 stanami.

**Faza 3: Development Phase Inline Component & Integration**
- [ ] Stworzenie `DevelopmentPhaseCard.tsx` z obsługą rzutów K100 (+1K10%), nagrody SAN (+2K6 przy 90%+), odzysku Szczęścia i Samopomocy.
- [ ] Podłączenie `DevelopmentPhaseCard` w `MessageCard.tsx` pod banerem Kroniki.
- Weryfikacja: Automatyczne wyświetlenie ekranu Fazy Rozwoju po zasygnalizowaniu `[KONIEC_SESJI:POTWIERDZENIE]`.

### Weryfikacja końcowa
- `npx tsc --noEmit`
- `npx jest`

### Co może się zepsuć
- Wycinanie tagu `[KONIEC_SESJI:POTWIERDZENIE]` ze strumienia audio lektora (Niskie - istniejący cleanup regex radzi sobie z wycinaniem).
- Brak oznaczonych umiejętności u gracza (Niskie - zaimplementowano obsługę `markedSkills.length === 0`).
