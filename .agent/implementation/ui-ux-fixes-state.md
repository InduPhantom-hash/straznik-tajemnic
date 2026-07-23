## Stan Implementacji: Poprawki UI/UX (UI-01 do UI-06)
Data: 2026-07-23

### Zaimplementowane funkcjonalności:
- **[UI-01] Header Bar UI:** Zmieniono formatowanie nazwy lokacji w `ChatHeader` na `📍 Kawiarnia Dormand’s · Boston` (Miejsce · Region). W `CampaignClock` dodano słowne opisy pogody i fazy księżyca (`☁️ Gęsta mgła | 🌗 Nów`).
- **[UI-02] Przycisk Eksport MD:** Przesunięto przycisk w górę (`-mt-1`) w `CharacterSheet`, likwidując nachodzenie na złocistą linię ramki.
- **[UI-03] Dublowanie Ekwipunku:** Usunięto sekcję `<SheetEquipment />` z modala Karty Postaci.
- **[UI-04] Retro Portrety:** Zastąpiono okrągłe awatary gracza (`rounded-full`) prostokątną ramką retro (`w-12 h-16 object-cover`) w `MessageCard`.
- **[UI-05] Inspector Pełnoekranowy:** Przebudowano `EquipmentDetailDialog` z modala na pełnoekranową nakładkę z zakotwiczeniem w `createPortal` oraz obsługą zamykania klawiszem `ESC`.
- **[UI-06] Powiadomienie NEW Ekwipunku:** Usunięto stałą liczbę `8` z przycisku sidebara. Dodano dynamiczną odznakę `NEW` przy wykryciu nowego przedmiotu, gasnącą po otwarciu ekwipunku.

### Weryfikacja:
- TypeScript (`npx tsc --noEmit`): PASS (0 błędów)
- Testy jednostkowe UI (`npx jest`): PASS (7/7 testów przeszło)
