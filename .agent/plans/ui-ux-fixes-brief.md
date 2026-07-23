## Brief: Poprawki UI/UX (UI-01 do UI-06)
**Co**: Naprawa 6 usterek interfejsu z pliku bug.md (nagłówek z lokacją i słowną pogodą, przesunięty przycisk eksportu i usunięty ekwipunek z karty postaci, prostokątny portret retro, pełnoekranowy inspector rekwizytów oraz powiadomienie NEW w sidebarze).
**Jak**: Zmiany w komponentach React silnika (`ChatHeader`, `CampaignClock`, `CharacterSheet`, `MessageCard`, `EquipmentDetailDialog`, `CthulhuSidebar`).
**Pliki**: `chat-header.tsx`, `campaign-clock.tsx`, `useChat.ts`, `character-sheet/index.tsx`, `message-card.tsx`, `equipment-detail-dialog.tsx`, `CthulhuSidebar.tsx`.
**Test**: `npm test` oraz `npm run qa:e2e`.
**Ryzyko**: Dopasowanie responsywności portretów i nakładki pełnoekranowej na mniejszych ekranach.
