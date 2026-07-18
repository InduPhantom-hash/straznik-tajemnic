## Brief: Przeniesienie przełącznika Hot Seat do wiersza tury
**Co**: Usunąć `PlayerSwitcher` z sidebaru, uczynić plakietki "Czeka: Gracz X" nad polem czatu klikalnymi (klik = przełącz gracza).
**Jak**: Przepchnąć `onSwitchPlayer` i `onDisableHotSeat` przez `page.tsx -> ChatWindow -> MessageInput`. Zamienić statyczne `<div>` plakietek "Czeka:" na `<button>` z `onClick`. Dodać `✕` w wierszu "Tura". Usunąć `PlayerSwitcher` z `CthulhuSidebar`.
**Pliki**: `types.ts`, `index.tsx` (ChatWindow), `message-input.tsx`, `page.tsx`, `CthulhuSidebar.tsx`
**Test**: `npx tsc --noEmit` + `npm run build` + test manualny przełączania graczy w Hot Seat
**Ryzyko**: Niskie - zmiana czysto UI, logika biznesowa bez zmian.
