## ✅ Faza 1 zakończona: Aktualizacja typów i propagacja argumentu

**Zmiany:**
- `_tester/_base/.silnik/src/components/chat/chat-window/types.ts`: Rozszerzono `ChatWindowProps.onConfirmAcquiredItem` o `characterId?: string`.
- `_tester/_base/.silnik/src/components/chat/chat-window/components/message-card.tsx`: Rozszerzono `MessageCardProps` o `characterId` i przekazano argument w anonimowej funkcji z `AcquiredItemCard` do `onConfirmAcquiredItem`.

**Weryfikacja:**
- Trwa kompilacja `npm run build` by potwierdzić, że prop-drilling w `index.tsx` i podpięcie w `useChat.ts` są bezbłędne dla TS.

**Stan kontekstu:** Niski
