## Research: Przesyłanie characterId z Dziennika w trybie Hot Seat
Data: 2026-07-27
Stack: React (Next.js), TypeScript, Tailwind

### Obszar problemu
- **`_tester/_base/.silnik/src/components/chat/chat-window/components/acquired-item-card.tsx`**
  Komponent już wspiera wybór postaci przez rozwijaną listę (gdy `isDuet === true`) za pomocą lokalnego stanu `selectedCharId`. Kliknięcie przycisku prawidłowo wywołuje `onConfirm(selectedCharId)`.

- **`_tester/_base/.silnik/src/components/chat/chat-window/components/message-card.tsx`**
  W tym komponencie wywołanie `AcquiredItemCard` zawiera w funkcji anonimowej:
  ```tsx
  onConfirm={(characterId?: string) => void onConfirmAcquiredItem?.(message.id, proposal.id) // TODO: Potrzeba obsłużyć characterId w nadrzędnym komponencie}
  ```
  Zatem `characterId` odbierane z niższego komponentu jest ignorowane i nie płynie wyżej.

- **`_tester/_base/.silnik/src/components/chat/chat-window/types.ts`**
  Interfejs `ChatWindowProps` posiada definicję:
  ```tsx
  onConfirmAcquiredItem?: (messageId: string, proposalId: string) => void;
  ```
  Tutaj brakuje trzeciego, opcjonalnego parametru `characterId`. Zmiana ta kaskaduje na `MessageCardProps` (definiowane wewnątrz `message-card.tsx`).

### Zależności
- **`_tester/_base/.silnik/src/hooks/useChat.ts`**
  Zależność docelowa, gdzie hook zarządza właściwym dodaniem wpisu do postaci. Sygnatura tej funkcji jest już prawidłowo napisana:
  ```tsx
  confirmAcquiredItem = useCallback(async (messageId: string, proposalId: string, characterId?: string) => { ... })
  ```
  Hook od początku czeka na otrzymanie `characterId`. Jeśli go nie ma, domyślnie dodaje przedmiot do `activeCharacter` (co jest błędne w przypadku wyboru innej postaci z rozwijanej listy).

### Istniejące testy
Istnieją testy UI związane z discoveries-view, ale z perspektywy samego flow w chat-window. Głównym testem w tym obszarze będzie upewnienie się w logice (typescript) że w Hot Seat, po przekazaniu `characterId` do funkcji w hooku `useChat`, jest odpowiednio wykorzystywane, co hook na szczęście już pokrywa linią resolving: 
`const recipientId = characterId || proposal.recipientName || activeCharacter?.id` (przynajmniej logicznie).

### Ryzyka i uwagi
- Zmiana wymaga modyfikacji wyłącznie interfejsów TypeScript i przepuszczenia argumentu wyżej przez jedno piętro komponentów (`MessageCard` -> `ChatWindow` -> `page.tsx`).
- Nie ma istotnego ryzyka dla bazy danych ani zapisanych save'ów - aktualizacja logiki przedmiotu dotyczy tylko nowo dodawanych elementów do stanu lokalnego postaci.

### Rekomendowany następny krok
Idziemy bezpośrednio do `/dev-4-implement`. Problem jest na tyle prosty i punktowy (wymaga dodania argumentu w sygnaturze i przekazania go z funkcji anonimowej), że pełnoprawne planowanie w `/dev-2-plan` jest zbędne.
