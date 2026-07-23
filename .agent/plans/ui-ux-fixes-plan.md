## Plan: Poprawki UI/UX i Układu (UI-01 do UI-06)
Data: 2026-07-23  
Złożoność: Średnia  

### Problem
Sześć usterek wizualnych i funkcjonalnych w interfejsie użytkownika (m.in. brak szczegółowej lokacji i jawnej pogody w nagłówku, nachodzący przycisk eksportu i dublowany ekwipunek w karcie postaci, kółka awatarów zamiast retro portretów, ciasny podgląd rekwizytów oraz brak odznaki NEW dla nowych przedmiotów).

### Rozwiązanie
Zrozumiana architektura komponentów w `_tester/_base/.silnik/src/`. Zmodułujemy prezentację `ChatHeader` i `CampaignClock`, dostosujemy układ `CharacterSheet`, zmienimy kształt i rozmiar portretu w `MessageCard`, zrefaktoryzujemy `EquipmentDetailDialog` na nakładkę pełnoekranową oraz zastąpimy stałą cyfrę na przycisku sidebara dynamicznym powiadomieniem `NEW`.

### Pliki do modyfikacji
| Plik | Zmiana | Ryzyko |
|------|--------|--------|
| `_tester/_base/.silnik/src/components/chat/chat-window/components/chat-header.tsx` | Formatowanie nazwy lokacji (`[Miejsce] · [Region]`) | Niskie |
| `_tester/_base/.silnik/src/components/ui/campaign-clock.tsx` | Słowne etykiety pogody i fazy księżyca | Niskie |
| `_tester/_base/.silnik/src/hooks/useChat.ts` | Parser tagu `[LOKACJA:]` ze strumienia prozy | Średnie |
| `_tester/_base/.silnik/src/components/ui/character-sheet/index.tsx` | Korekta położenia przycisku Eksport MD & usunięcie `<SheetEquipment />` | Niskie |
| `_tester/_base/.silnik/src/components/chat/chat-window/components/message-card.tsx` | Zmiana awatara z kółka (`rounded-full`) na prostokątną ramkę retro | Niskie |
| `_tester/_base/.silnik/src/components/ui/equipment-detail-dialog.tsx` | Przebudowa z modala do pełnoekranowej nakładki (Full-Screen Inspector) | Średnie |
| `_tester/_base/.silnik/src/components/sidebar/CthulhuSidebar.tsx` | Usunięcie zahardkodowanej liczby & obsługa odznaki `NEW` | Niskie |

### Fazy implementacji

**Faza 1: Nagłówek & Karta Postaci (UI-01, UI-02, UI-03)**
- [ ] Zintegrować `currentLocation` w `ChatHeader` oraz wyświetlanie pogody i fazy księżyca w `CampaignClock`.
- [ ] Przesunąć przycisk Eksport MD w `CharacterSheet` o kilka pikseli w górę.
- [ ] Usunąć komponent `<SheetEquipment />` z Karty Postaci.
- Weryfikacja: `npm test` oraz sprawdzenie renderowania `CharacterSheet` i `ChatHeader`.

**Faza 2: Portrety, Rekwizyty i Powiadomienia (UI-04, UI-05, UI-06)**
- [ ] Zmienić kształt awatara gracza na prostokątny retro portret w `MessageCard`.
- [ ] Przekształcić `EquipmentDetailDialog` w okno pełnoekranowe z powiększonym podglądem grafiki.
- [ ] Wyeliminować cyfrę `8` z przycisku `Ekwipunek` w `CthulhuSidebar` i dodać odznakę `NEW` gasnącą po otwarciu ekwipunku.
- Weryfikacja: Uruchomienie `npm run qa:e2e`.

### Weryfikacja końcowa
- `npm test`
- `npm run qa:e2e`

### Co może się zepsuć
- Przesunięcie portretów na czacie może wpłynąć na marginesy wiadomości gracza na małych ekranach (Ryzyko: Niskie).
- Pełnoekranowy inspector przedmiotu wymaga sprawnej obsługi zamykania klawiszem `ESC` oraz przyciskiem zamknięcia (Ryzyko: Niskie).
