## Research: Diegetic Documents (Bilety i Notatniki)
Data: 2026-07-29
Stack: Next.js, React, Tailwind CSS

### Obszar problemu
1. `src/lib/acquired-equipment.ts` - Główny parser ekwipunku. 
2. `_tester/_base/.silnik/src/lib/acquired-equipment.ts` - Parser z testowanego silnika.
3. `src/components/ui/diegetic-document-viewer.tsx` - Komponent odpowiedzialny za wyświetlanie znalezionych dokumentów.

### Zależności
- Funkcja `inferDocumentType` w `acquired-equipment.ts` (w obu plikach, są zsynchronizowane!) potrafi odróżnić `ticket` i `journal_page`. 
- Kiedy jednak taki przedmiot trafia do UI, to `diegetic-document-viewer.tsx` nie posiada instrukcji `if (docType === 'ticket')` ani `if (docType === 'journal_page')`.
- W efekcie, zarówno bilety jak i wyrwane kartki notatnika wyświetlają się w "defaultowym" wariancie (List Osobisty ze znaczkiem pocztowym).

### Istniejące testy
Testy jednostkowe w `src/lib/acquired-equipment.test.ts` oraz `_tester/_base/.silnik/src/lib/acquired-equipment.test.ts` przypuszczalnie weryfikują parser. Logika dokumentów działa, ale brakuje implementacji frontendowej (CSS/Tailwind) odzwierciedlającej te typy na UI.

### Ryzyka i uwagi
Brak ryzyka biznesowego – modyfikacja dotyka tylko warstwy wizualnej `diegetic-document-viewer.tsx`, w której trzeba obsłużyć dwie dodatkowe gałęzie (bilety, kartki z notatnika). Posiadamy już wytyczne z notatek sesyjnych: bilety (podzielony układ poziomy, gruba czcionka) i notatnik (liniatura, zagięty rożek/taśma).

### Rekomendowany następny krok
Problem jest na tyle dobrze zdefiniowany i prosty w obszarze CSS, że możemy przejść od razu do implementacji za pomocą `/dev-4-implement`. Zaimplementuję dwa dodatkowe bloki `if` w komponencie.
