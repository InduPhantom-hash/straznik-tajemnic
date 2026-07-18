## Plan: Sekwencyjne Generowanie Obrazów Ekwipunku i Przebudowa Aplikacji
Data: 2026-07-18
Złożoność: Średnia

### Problem
Gdy użytkownik otwiera modal ekwipunku, komponenty `ItemThumbnail` jednocześnie wyzwalają automatyczne generowanie obrazów dla wszystkich brakujących elementów w `useEffect`. Prowadzi to do 8 równoległych zapytań do `/api/imagen`, co natychmiast blokuje API Gemini błędem 429 (Rate Limit). Dodatkowo, zmiany w plikach `.tsx` nie są widoczne w działającej aplikacji desktopowej, ponieważ serwer `next start` korzysta z nieaktualnego buildu w `.next`.

### Rozwiązanie
1. Usuniemy auto-wyzwalanie generowania z poziomu pojedynczego komponentu `ItemThumbnail` (usunięcie `useEffect`).
2. Wprowadzimy sekwencyjny generator w głównym komponencie `EquipmentModal` przy użyciu jednego `useEffect`, który wyszuka pierwszy brakujący obraz, wywoła dla niego generowanie i po aktualizacji stanu (re-renderze) przejdzie do następnego.
3. W karcie postaci (`sheet-equipment.tsx`) zmienimy placeholder na ikonę kategorii (`CATEGORY_ICONS`), aby uniknąć kręcącego się w nieskończoność loadera.
4. Przebudujemy aplikację za pomocą `bash desktop/build-app.sh --rebuild`.

### Pliki do modyfikacji
| plik | zmiana | ryzyko |
|------|--------|--------|
| `_tester/_base/.silnik/src/components/ui/equipment-modal.tsx` | Usunięcie auto-generowania z `ItemThumbnail`. Dodanie sekwencyjnej pętli `useEffect` w `EquipmentModal` oraz dostosowanie obsługi stanu `generatingImage`. | Niskie |
| `_tester/_base/.silnik/src/components/ui/character-sheet/components/sheet-equipment.tsx` | Wyświetlenie ikon kategorii jako placeholderów w `ItemThumbnail` zamiast loadera. | Niskie |

### Fazy implementacji

**Faza 1: Poprawa logiki generowania w modalu i karcie**
- [ ] Zmiana `ItemThumbnail` w `equipment-modal.tsx` — usunięcie `useEffect` wyzwalającego `onGenerateImage`.
- [ ] Dodanie w `EquipmentModal` w `equipment-modal.tsx` nowego `useEffect` wykrywającego pierwszy przedmiot bez `imageUrl` i uruchamiającego `generateImage(item)` tylko wtedy, gdy `generatingImage` jest równe `null`.
- [ ] Zmiana `ItemThumbnail` w `sheet-equipment.tsx` — użycie `CATEGORY_ICONS[item.category]` jako domyślnego renderu, gdy `item.imageUrl` jest puste.
- Weryfikacja: Kod kompiluje się bez błędów.

**Faza 2: Przebudowa i uruchomienie serwera**
- [ ] Uruchomienie `bash desktop/build-app.sh --rebuild` w celu wygenerowania nowego buildu produkcyjnego Next.js i odświeżenia aplikacji desktopowej.
- Weryfikacja: Budowanie kończy się sukcesem, a logi serwera potwierdzają załadowanie nowego buildu.

### Weryfikacja końcowa
- Przebudowanie projektu (`npm run build` lub `build-app.sh`).
- Uruchomienie i otwarcie modalu wyposażenia w celu weryfikacji, czy ilustracje generują się po kolei (jedna po drugiej).

### Co może się zepsuć
- Jeśli API Gemini będzie miało całkowity przestój lub brak klucza, generowanie zakończy się błędem, ale dzięki sekwencyjności nie przeciążymy limitów.
