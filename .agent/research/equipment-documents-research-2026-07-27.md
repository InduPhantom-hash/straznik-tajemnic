## Research: Redesign Ekwipunku & Immersyjny System Dokumentów
Data: 2026-07-27
Stack: React (Next.js), Tailwind CSS, TypeScript

### Obszar problemu
1. **`src/components/ui/equipment-detail-dialog.tsx`** - Główny modal Ekwipunku. Aktualnie używa klas `max-w-5xl` i standardowych proporcji, zamiast wymaganych w planie `w-[85vw] h-[85vh]`. To tutaj znajduje się przycisk "Przeczytaj dokument".
2. **`src/components/ui/predefined-characters-selector.tsx`** - Główny widok "Karty Postaci", w którym wyrenderowana jest siatka z posiadanym Ekwipunkiem. Tu znajdują się winietki i 2-zdaniowe opisy (używają klasy `line-clamp-2`), z których gracz klika przedmiot, aby otworzyć `EquipmentDetailDialog`.

### Zależności
- **`src/components/ui/diegetic-document-viewer.tsx`** - Dedykowany komponent wywoływany wewnątrz `EquipmentDetailDialog` gdy przedmiot ma `isDocument = true` i pobraną treść w `readableContent`. Komponent ten ma już zbudowane layouty: `press_pass`, `evidence_envelope`, `official_document`, `newspaper`, default.
- **`src/lib/types.ts`** - Reprezentacja w `EquipmentItem`, typy: `EquipmentCategory`, `DocumentSubType`, `isReadable`. Model jest już gotowy na przyjmowanie tych danych.

### Istniejące testy
- `src/components/ui/equipment-detail-dialog.test.tsx` - Przetestowane zostało m.in. pobieranie treści dokumentu w tle (API `/api/equipment/read-item`). Należy uważać, żeby zmiana interfejsu (dodanie szpalt, innych układów) nie popsuła istniejącego flow.

### Ryzyka i uwagi
- `DiegeticDocumentViewer` był projektowany na mniejsze modale. Rozszerzenie Ekwipunku do `85vw/85vh` oznacza, że dokumenty wewnątrz (szczególnie list, gazeta) będą miały dużo więcej miejsca. Wymagane będzie dopracowanie paddingów, wielkości fontów lub dodanie maksymalnej szerokości samej „kartki papieru/gazety” wewnątrz ogromnego modalu, by zachować proporcje i czytelność tekstu.
- Widok Ekwipunku znajduje się fizycznie na Karcie Postaci (`predefined-characters-selector.tsx`). Zmiana wyglądu modalu nie powinna naruszyć samego widoku kafelków na karcie, poza ewentualnym ich uestetycznieniem.

### Rekomendowany następny krok
Posiadamy już zatwierdzony plan w `.agent/research/plan-ui-sync-overhaul-2026-07-27.md` z poprzedniej sesji. Jako że zmapowaliśmy już wszystkie powiązane z nim pliki, sugeruję przejść bezpośrednio do implementacji: `/dev-4-implement`.
