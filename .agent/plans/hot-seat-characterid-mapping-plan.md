## Plan: Przesyłanie characterId w trybie Hot Seat (AcquiredItemCard)
Data: 2026-07-27
Złożoność: Prosta

### Problem
Komponent `AcquiredItemCard` pozwala na wybór postaci, z którą powiązany zostanie znaleziony przedmiot. Przekazuje to ID do callbacku `onConfirm(characterId)`, ale komponent nadrzędny `MessageCard` ignoruje go wewnątrz funkcji anonimowej i nie przepuszcza wyżej w hierarchii, przez co przedmioty przypisywane są do domyślnego gracza zamiast wybranego z listy.

### Rozwiązanie
Rozszerzenie interfejsów `ChatWindowProps` oraz `MessageCardProps` o trzeci parametr `characterId?: string` w funkcji `onConfirmAcquiredItem` oraz przepuszczenie argumentu w renderowanej karcie wewnątrz `MessageCard`.

### Pliki do modyfikacji
| plik | zmiana | ryzyko |
|------|--------|--------|
| `_tester/_base/.silnik/src/components/chat/chat-window/types.ts` | Rozszerzenie sygnatury `onConfirmAcquiredItem` w `ChatWindowProps` o parametr `characterId?: string` | Niskie |
| `_tester/_base/.silnik/src/components/chat/chat-window/components/message-card.tsx` | Rozszerzenie sygnatury w `MessageCardProps` i przekazanie `characterId` w wywołaniu `onConfirmAcquiredItem` | Niskie |

### Fazy implementacji

**Faza 1: Aktualizacja typów i propagacja argumentu**
- [ ] Modyfikacja `ChatWindowProps` w `types.ts`
- [ ] Modyfikacja `MessageCardProps` w `message-card.tsx`
- [ ] Aktualizacja anonimowej funkcji z `onConfirm` z `acquired-item-card.tsx` tak, aby wysyłała `characterId` dalej.
- Weryfikacja: Kompilacja TypeScriptu (nie powinna rzucać błędów)

### Weryfikacja końcowa
- Uruchomienie budowania sprawdzającego (np. przez `npm run build` w `.silnik`). 
- Logiczny rzut okiem na przebieg argumentu do funkcji `useChat.ts`.

### Co może się zepsuć
- Istniejące testy mogą nie zawierać trzeciego argumentu w przypadku mocków dla `onConfirmAcquiredItem` (ryzyko Niskie, opcjonalność parametru sprawia że w TS nie będzie to błąd składniowy).
