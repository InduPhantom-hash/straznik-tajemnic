## Research: katalog ekwipunku, lokalne assety i migracja zapisów

Data: 2026-07-19
Stack: Next.js 16, React, TypeScript, Jest, Playwright, IndexedDB

### Zakres i źródło prawdy

- Właściwy silnik aplikacji znajduje się w `_tester/_base/.silnik/`. Katalog główny `src/` jest niepełną kopią i nie może być podstawą zmian w ekwipunku.
- Repozytorium nie zawiera informacji pozwalającej rozpoznać źródło zapisane w planie jako `The Walk Toolu`. Nie należy zgadywać ani kopiować katalogu z niezweryfikowanego podręcznika. Do uzupełnienia zawartości katalogu potrzebny jest dokładny tytuł i legalnie dostępny materiał źródłowy albo spis dostarczony przez użytkownika.

### Obszar problemu

| plik | rola | wniosek |
|---|---|---|
| `src/lib/equipment-data.ts` | Katalog 39 szablonów i zestawy zawodów | Katalog jest `Partial<EquipmentItem>` i wyszukuje wyłącznie po nazwie. Zestawy używają głównie polskich nazw, a katalog głównie angielskich, co tworzy niekanoniczne fallbacki. |
| `src/lib/immersion/predefined-equipment.ts` | Ekwipunek 30 gotowych badaczy | Łączy bazowy zestaw z epoką i archetypem, deduplikuje po nazwie i przypisuje 8 lokalnych SVG kategorii. |
| `src/components/ui/character-wizard.tsx` | Faktyczna ścieżka własnej postaci | Tworzy ekwipunek lokalnie z `getStartingEquipmentForOccupation`; nie używa endpointu generowania startowego ekwipunku. |
| `src/app/api/equipment/generate-starting/route.ts` | Starszy endpoint | Wzbogaca opisy przez Gemini i nie jest aktualnie używany przez kreator - wymaga decyzji: usunięcie albo spójne przełączenie na nowy katalog. |
| `src/hooks/useEquipmentThumbnails.ts` | Automatyczne miniatury na starcie | Traktuje lokalne SVG jako brak obrazu, nie sprawdza `imageGenerationEnabled` i może wysyłać do 12 żądań `/api/imagen`. To bezpośrednio przeczy celowi katalogu lokalnego oraz toggle `Obrazy`. |
| `src/hooks/useGameStart.ts` | Start gry | Czyści `imageUrl` oraz `imagePrompt` ekwipunku aktywnej postaci przed automatycznym generowaniem - musi rozróżniać asset katalogowy od obrazu unikalnego. |
| `src/components/ui/equipment-modal.tsx` | Ręczne obrazy i szczegóły | Pozwala wygenerować AI-obraz także dla przedmiotu katalogowego; model docelowy powinien ograniczyć tę akcję do egzemplarzy fabularnych i wyjątkowych. |

### Zależności i trwałość danych

`EquipmentItem` w `src/lib/types.ts` miesza dane szablonu i egzemplarza: ma `id`, nazwę, kategorię, opis, źródło, daty oraz `imageUrl`, ale nie zna identyfikatora katalogowego ani treści czytalnej.

`character-image-store.ts` przenosi obrazy `data:` do IndexedDB pod kluczem `char:{characterId}:equip:{itemId}`. Identyfikator `id` musi więc pozostać stabilnym identyfikatorem egzemplarza - nie może zostać zastąpiony identyfikatorem szablonu. Zapis pełnej gry usuwa obrazy inline, a importer nie migracji pól ekwipunku.

Rekomendowany podział:

```text
EquipmentTemplate
- templateId i wersja, nazwa, kategoria, opis bazowy i mechanika
- era, lokalny asset, reguły dostępności

EquipmentInstance
- id, templateId?, source, condition, obtainedAt
- opcjonalne fabularne nadpisania nazwy/opisu
- contentRef dla dokumentu i imageRef dla unikalnej grafiki
```

`templateId` powinno być stałe i wersjonowane, np. `tool.flashlight.v1`; `id` nadal losowe i unikalne dla każdego posiadanego egzemplarza. Stare przedmioty bez `templateId` pozostają poprawnymi egzemplarzami legacy - bez automatycznego zgadywania po nazwie.

### Istniejące testy

- `src/lib/immersion/predefined-characters.test.ts` kontroluje 30 presetów, co najmniej 6 przedmiotów, brak duplikatów i lokalne SVG.
- `tests/e2e/duet-stage-2.spec.ts` sprawdza widok lokalnych miniatur w duecie.
- `tests/e2e/feature-11-images.spec.ts` jest tylko testem smoke orkiestratora obrazów.

Brakuje testów katalogu zawodowego, endpointu `generate-starting`, braku wywołań AI dla assetów katalogowych, respektowania `imageGenerationEnabled`, migracji i round-trip save/load nowych pól.

### Ryzyka i uwagi

- Po reloadzie na innym urządzeniu obrazy `data:` nie istnieją w nowym IndexedDB; lokalne assety katalogowe są bezpiecznym fallbackiem.
- Obecna deduplikacja nazw nie odróżni dwóch fizycznych egzemplarzy tego samego przedmiotu.
- Dokumenty potrzebują osobnego pola treści i stanu generacji - opis mechaniczny nie może być ich zawartością diegetyczną.
- Przed dodawaniem nowych pozycji katalogowych trzeba odciąć generowanie AI dla istniejących assetów lokalnych i zachować trwałość save'ów.

### Rekomendowany następny krok

Przejść do `dev-2-plan` i zaplanować najpierw fundament techniczny: `templateId`, tolerancyjny normalizator legacy, rozróżnienie lokalnego assetu od obrazu AI oraz testy zakazu generowania miniatur katalogowych. W osobnym kroku, po potwierdzeniu legalnego źródła, uzupełnić zawartość katalogu i przygotować przedmioty czytalne.
