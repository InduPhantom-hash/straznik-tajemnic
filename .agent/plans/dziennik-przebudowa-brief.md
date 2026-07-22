# Brief: Przebudowa Dziennika i Tablicy Badacza

**Co**: Naprawa Tablicy Badacza (Miro-style Drag & Drop, czytelne sznurki SVG, obrazki, powiązania ręczne), usunięcie buga celów misji, obsługa liczby mnogiej w Kronice oraz obrazki i czyste Notatki w Encyklopedii.

**Jak**: 
1. Przebudowa `investigator-board.tsx` na pozycjonowanie swobodne (absolutne) z przeciąganiem (DnD) i przeliczaniem punktów zaczepienia sznurków SVG w real-time.
2. Zapewnienie unikalnych ID celów w `session-journal.tsx` dla wyeliminowania błędu jednoczesnego zaznaczania celów.
3. Dodanie pól na ilustracje (`imageUrl`) w węzłach tablicy i encyklopedii.
4. Dynamizacja promptu `/api/summarize-scene` (druga osoba l.mnogiej dla drużyn).

**Pliki**: 
- `src/components/ui/investigator-board.tsx`
- `src/components/ui/session-journal.tsx`
- `src/types/investigator-board.ts`
- `src/lib/types.ts`
- `src/app/api/summarize-scene/route.ts`

**Test**: `npm run test`, `npx tsc --noEmit` oraz weryfikacja wizualna płótna i checkboxów misji.

**Ryzyko**: Średnie (wymaga ostrożnej obsługi zdarzeń myszy/dotyku dla Drag & Drop w Canvasie Tablicy).
