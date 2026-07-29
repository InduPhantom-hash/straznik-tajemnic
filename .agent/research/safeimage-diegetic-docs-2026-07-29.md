## Research: SafeImage & Dokumenty Diegetyczne
Data: 2026-07-29
Stack: Next.js 14, React 18, Tailwind CSS, TypeScript

### Obszar problemu
**1. SafeImage (Globalny Fallback Obrazów)**
- `src/components/ui/equipment-modal.tsx`
- `src/components/ui/equipment-detail-dialog.tsx`
- `src/components/ui/investigator-board.tsx`
- `src/components/ui/session-journal.tsx`
- `src/components/ui/predefined-characters-selector.tsx`
Wyżej wymienione komponenty posiadają ryzykowną, zduplikowaną logikę obsługi błędu (inline `onError`), która potrafi powodować infinite loop, gdy fallback (plik SVG) zawiedzie.
- `src/components/ui/diegetic-document-viewer.tsx`
- `src/components/sidebar/CthulhuSidebar.tsx`
Brak całkowitej obsługi błędów ładowania obrazu – puste placeholdery.

**2. Dokumenty Diegetyczne (Błędy i Luki Logiczne)**
- `src/lib/acquired-equipment.ts` (w głównym katalogu, nie testerze) brakuje logiki wstrzykującej `documentType`. Prowadzi to do spadania wszystkiego w UI do domyślnego widoku listu.
- `src/components/ui/equipment-detail-dialog.tsx` posiada zbyt szeroki (chciwy) warunek czytelności – wyświetla przycisk "Przeczytaj dokument" dla artefaktów i ksiąg, nawet gdy nie są one dokumentami z tekstową zawartością z API.
- `src/components/ui/diegetic-document-viewer.tsx`: Typ `journal_page` dzieli renderowany układ z listem osobistym (pojawia się błędnie znaczek pocztowy z lat 20).
- `src/lib/types.ts`: Brakuje sformalizowanego podtypu `ticket`, przez co komponent ekwipunku wymusza przypisywanie go twardymi regexami.

### Zależności
- Komponent **SafeImage** (do stworzenia w `src/components/ui/safe-image.tsx`) stanie się głównym owrapperem dla elementów `img` zależnych od zewnętrznych źródeł (Gemini). Będzie wymagał stanu `hasError` i fallbacka ikony (lucide-react).
- **Logika czytania**: Zmiana w `EquipmentDetailDialog` wymusi korzystanie z pola `documentType`, aby decydować, jak ma wyglądać okno. Przepływ opiera się o: `types.ts` (słownik typów) -> `acquired-equipment.ts` (ekstrakcja z czatu) -> `EquipmentDetailDialog` (UI).

### Istniejące testy
- `_tester/_base/.silnik/src/lib/acquired-equipment.test.ts` w środowisku testowym ma poprawną funkcję wyliczającą, lecz nie jest ona spięta z warstwą UI głównego katalogu.

### Ryzyka i uwagi
- **Rozdwojenie logiki:** Konieczność poprawnego synchronizowania warstwy logiki z testowego silnika `_tester` do produkcyjnego `src/` (zgodnie z decyzjami z poprzedniej nocy). Należy przenieść logikę `createAcquiredEquipmentSeed` do poprawnej gałęzi, tak jak sugeruje badanie.
- Modyfikacja komponentu `DiegeticDocumentViewer` pod `journal_page` i `ticket` będzie wymagała dodatkowych stylów Tailwind, które mogą zderzyć się z układem modalnym 90vw z poprzedniej sesji.

### Rekomendowany następny krok
Problem jest wielowątkowy. Sugeruję uruchomić **/dev-2-plan**, aby:
1. Zdefiniować kontrakt (API) dla nowego komponentu `SafeImage`.
2. Sporządzić jasny wykaz zmian dla `_tester` vs `src/` (aby nie popsuć ułożonych już testów).
3. Zaplanować modyfikacje wizualne dla podtypów dokumentów w widoku immersyjnym.
