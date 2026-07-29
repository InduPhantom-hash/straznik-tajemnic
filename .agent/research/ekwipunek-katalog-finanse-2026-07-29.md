## Research: Ekwipunek, Finanse, Fallbacki i Tablica
Data: 2026-07-29
Stack: React, TypeScript, Next.js (App Router), Tailwind

### Obszar problemu
- `equipment-modal.tsx`: Główny widok podziału ekwipunku/finansów. Zaciąga nieistniejące zależności finansowe. Fallbacki używają chowania elementu.
- `equipment-detail-dialog.tsx`: Renderowanie pojedynczego przedmiotu Ekwipunku (statystyki). Fallbacki obrazków używają domyślnego SVG lub chowają blok.
- `acquired-item-card.tsx`: Komponent "lootu". Po akceptacji przez gracza dodaje element do ekwipunku i dziennika.
- `CthulhuSidebar.tsx`: Wyświetlanie modali i powiadomień.
- `generate-starting/route.ts`: API generowania początkowego.

### Zależności (w tym Tablica Badacza)
- `useChat.ts` (`confirmAcquiredItem`): Po akceptacji przedmiotu obiekt leci do `character.equipment`, a *równolegle* jego reprezentacja ląduje w `character.journal` jako `type: 'item'`.
- `convert-entries.ts`: Przerabia ten wpadający `journal` na węzeł Tablicy Badacza (jako typ `clue`, poszlaka). Sprzęt to fizyczny model *oraz* logiczny dowód.
- **Krytyczna zależność ukryta**: Moduł `src/lib/acquired-equipment.ts` próbuje wyciągać importy z `@/lib/equipment-catalog`. Tego pliku brakuje w katalogu. Jest zamknięty w `.agent` -> `_tester/_base/.silnik/src/lib/`.
- Zamożność pobierana w teorii z `deriveFinances(character)` w module `lib/economy/credit-rating`, którego również brakuje.

### Istniejące testy
- Tylko 1 sensowny test: `src/components/ui/equipment-detail-dialog.test.tsx` w głównym drzewie.
- Część potężnych testów (`acquired-equipment.test.ts`, `equipment-catalog.test.ts`) utknęła w ukrytym katalogu `_tester/_base/.silnik/src/lib/`.
- Testy konwertera `convert-entries.test.ts` w ogóle nie obejmują Ekwipunku, choć powinny.

### Ryzyka i uwagi
- Ryzyko runtime / build: Pliki `equipment-catalog.ts` oraz `credit-rating.ts` po prostu nie istnieją w głównym repozytorium.
- Fallbacki obrazków to spory ukryty deficyt na UX: nagminne "ucinki" poprzez manipulację po stronie DOM (`display = 'none'`), zamiast płynnej podmiany URL.
- Każdy zdobyty przedmiot fabularny trafia na Tablicę. Jeśli zrobimy błąd w Ekwipunku, graczom rozpadnie się również widok Tablicy Badacza.

### Rekomendowany następny krok
Przejście od razu do `/dev-2-plan`.
Najpierw rekreacja/przeniesienie plików systemów katalogów z _tester i stworzenie systemu finansów (`credit-rating`), potem refaktor `onError` fallbacków grafik, i testy w `convert-entries.test.ts` dotykające wpisów z itemami.
