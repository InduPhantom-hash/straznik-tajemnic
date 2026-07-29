## Plan: Ekwipunek, Finanse, Fallbacki UI
Data: 2026-07-29
Złożoność: Średnia/Duża

### Problem
Odcięty główny katalog Ekwipunku i uwięziony w `_tester`. Całkowity brak funkcjonowania zakładek "Finanse" dla bohaterów. Brzydkie pękanie siatki UI na braki wygenerowanych z API obrazków (stosowane `display: none`).

### Rozwiązanie
Odzyskanie zamrożonego w backupie kodu modułu Ekwipunku i zintegrowanie go na nowo z bazową architekturą `src/lib`. Zbudowanie nowej mechaniki klas CoC 7e (Biedny, Przeciętny, Zamożny) z uniwersalnym fallbackiem w `credit-rating.ts`, aby nie wpaść w króliczą norę tworzenia setek zawodów. Zaimplementowanie standardowych lokalnych wektorów SVG jako fallbacków graficznych w obrazach sprzętu.

### Pliki do modyfikacji
| plik | zmiana | ryzyko |
|------|--------|--------|
| `src/lib/equipment-catalog.ts` | (NOWY) Odzyskanie i import z backupu | Wysokie (wpływ na logikę gry) |
| `src/lib/acquired-equipment.test.ts` | (NOWY) Odzyskanie bazy testowej | Niskie |
| `src/lib/economy/credit-rating.ts` | (NOWY) Wdrożenie elastycznej tabeli gotówki | Średnie |
| `src/components/ui/equipment-modal.tsx` | Optymalizacja UI i podpięcie Finansów | Niskie |
| `src/components/ui/equipment-detail-dialog.tsx` | Zastąpienie fallbacku `onError` | Niskie |
| `src/components/chat/chat-window/components/acquired-item-card.tsx` | Zastąpienie fallbacku `onError` | Niskie |
| `public/...` | Przygotowanie SVG na fallback | Niskie |
| `src/lib/journal/convert-entries.test.ts` | Weryfikacja węzłów Tablicy (Clue) po implementacji | Średnie |

### Fazy implementacji

**Faza 1: Odzyskiwanie Ekwipunku**
- [ ] Zlokalizowanie plików w `_tester/...`
- [ ] Przekopiowanie do `src/lib/` i `src/lib/__tests__/` (lub podobnych)
- [ ] Naprawa ścieżek importów `@/` (wyczyszczenie starych zależności testera).
- Weryfikacja: `npm run test -- src/lib/acquired-equipment.test.ts` oraz `convert-entries.test.ts`.

**Faza 2: Ekonomia i Finanse**
- [ ] Zdefiniowanie klas Zamożności (Biedny 1-9, Przeciętny 10-49, Bogaty 50-98) i poprzestać na fallbackowej kategorii "Przeciętny" dla ról nieuwzględnionych (`credit-rating.ts`).
- [ ] Integracja z `equipment-modal.tsx` tak by zakładka 'finances' poprawnie wyświetlała stan kasy postaci.
- Weryfikacja: Odpalenie UI i sprawdzenie zakładki Finanse.

**Faza 3: Stabilizacja wizualna (Fallbacki obrazków)**
- [ ] Zaprojektowanie bezpiecznego komponentu `ItemImage` lub po prostu podmiana eventów `onError` na spójne logo rezerwowe SVG z katalogu public, zamiast zjawiska `display = 'none'`.
- [ ] Przeszukanie modali Ekwipunku i nadpisanie chowania obiektów.
- Weryfikacja: Załadowanie sztucznie zepsutego pliku przedmiotu, żeby sprawdzić poprawność działania fallbacku.

### Weryfikacja końcowa
`npm run build` by sprawdzić rygor TypeScript na całym projekcie.
`npm run test`

### Co może się zepsuć
Wyrwanie starego kodu z modułu testowego bez sprawdzenia różnicy typów do obecnego `types.ts` może na chwilę wysadzić serwer deweloperski.
Odbudowanie komponentów wyświetlania obrazków Ekwipunku zawsze wiąże się ze zweryfikowaniem spójności flexboxa Tailwind (czy obrazek zapasowy nie "rozwali" ramki).
