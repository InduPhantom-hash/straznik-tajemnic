# Plan: Ilustracje Przedmiotów - Łączenie Katalogu WebP i Obowiązkowa Generacja AI dla Reszty

Data: 2026-07-22
Złożoność: Średnia

### Problem
Przedmioty ekwipunku postaci wyświetlają sztywne, generyczne ikony SVG (np. zegary/skrzynki) zamiast prawdziwych ilustracji. Jeśli przedmiot nie pasuje do gotowego katalogu 35 plików WebP, system nie generuje dla niego obrazka AI, blokując auto-generację w tle oraz przycisk w UI.

### Rozwiązanie
Wdrożenie surowej reguły: **Żadnych widocznych placeholderów SVG w ekwipunku jako docelowych obrazów**.
1. Przypisanie gotowych WebP z katalogu dla wszystkich dopasowanych nazw (rozszerzenie aliasów w `equipment-catalog.ts`).
2. Dla każdego przedmiotu bez dedykowanej grafiki katalogowej WebP, system **Musi wygenerować ilustrację AI przez API Imagen w tle** (`useEquipmentThumbnails.ts`).
3. Ikona SVG pozostaje wyłącznie tymczasowym wskaźnikiem ładowania (spinner / icon placeholder) w widoku UI podczas trwania generacji API.

---

### Pliki do modyfikacji

| Plik | Zmiana | Ryzyko |
|------|--------|--------|
| `src/lib/equipment-catalog.ts` | Dodanie pełnych aliasów presetu (np. "Klucz francuski", "Gogle i skórzana pilotka", "Mapy lotnicze regionu") do katalogu WebP | Niskie |
| `src/lib/immersion/predefined-equipment.ts` | Usunięcie wpisywania na sztywno `imageUrl` z ikonek SVG z `CATEGORY_IMAGES`. Przedmioty bez WebP dostają `imageUrl: undefined` | Średnie |
| `src/hooks/useEquipmentThumbnails.ts` | Aktualizacja filtru `pending`: generowanie ilustracji AI w tle dla KAŻDEGO przedmiotu, który nie ma właściwego pliku WebP z `/catalog/` ani wygenerowanego URL | Niskie |
| `src/components/ui/equipment-modal.tsx` | Pozwolenie na generowanie AI (`canGenerate`) dla dowolnego przedmiotu, jeśli nie ma on przypisanego gotowego assetu z `/equipment/catalog/*.webp` | Niskie |
| `src/hooks/useGameStart.ts` | Upewnienie się, że przedmioty bez dedykowanego WebP czyszczą `imageUrl` na starcie gry, by wymusić wygenerowanie świeżej ilustracji | Niskie |

---

### Fazy implementacji

**Faza 1: Rozszerzenie Katalogu i Czyszczenie Przeterminowanych Plików SVG**
- [ ] Rozszerzenie aliasów w `EQUIPMENT_CATALOG` (`equipment-catalog.ts`) o przedmioty presetu postaci.
- [ ] Zmiana w `predefined-equipment.ts`: przedmioty bez dopasowania w katalogu mają `imageUrl: undefined` zamiast generycznego SVG.

**Faza 2: Egzekucja Obowiązkowej Auto-Generacji AI**
- [ ] W `useEquipmentThumbnails.ts` zapewnienie, że przedmioty bez grafiki z `/catalog/` od razu trafiają do sekwencyjnej kolejki generowania API Imagen.
- [ ] W `equipment-modal.tsx` odblokowanie przycisku "Generuj" dla przedmiotów nieposiadających dedykowanego pliku `.webp` z katalogu.

**Faza 3: Testy i Weryfikacja**
- [ ] Uruchomienie testów jednostkowych katalogu (`npm test equipment-catalog.test.ts`).
- [ ] Weryfikacja działania na presetach (np. Agnes Mason) oraz przedmiotach dodawanych dynamicznie.

---

### Weryfikacja końcowa
- `npm test -- equipment-catalog`
- `npx tsc --noEmit`

---

### Co może się zepsuć
- Wygenerowanie 5-8 miniatur przy starcie nowej gry zwiększy zużycie tokenów Imagen API o ~$0.10 przy starcie przygody (kontrolowane przez istniejący limit `MAX_THUMBNAILS = 12`).
