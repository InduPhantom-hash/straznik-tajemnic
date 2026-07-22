## Plan: Pipeline Generowania, Opisów i Ilustracji Przedmiotów Ekwipunku
Data: 2026-07-22
Złożoność: Średnia

### Problem
Przedmioty dynamiczne (pozyskane podczas gry lub wygenerowane startowo) w ekwipunku Badaczy nie posiadają bogatych opisów i wyliczonych parametrów mechanicznych Call of Cthulhu 7e, a w przypadku braku wygenerowanej ilustracji AI spadają na brzydką ikonę klucza płaskiego `Wrench`. Co więcej, ich auto-generowanie obrazków potrafiło przekraczać limity zapytań (Error 429) lub wpadać w stan zablokowania przez niewłaściwy plik SVG.

### Rozwiązanie
Wdrożenie 3-etapowego Pipeline'u Przedmiotów Ekwipunku:
1. **Wzbogacanie Słownikowe & Aliasów PL:** Rozszerzenie dopasowywania w `equipment-catalog.ts` o polskie nazwy i synonimy (np. *"pistolet", "rewolwer", "latarka", "nóż"*), aby od razu podłączać dedykowane grafiki WebP epoki.
2. **AI Item Enrichment Service (`enrichItemWithAI`):** Dla zupełnie nowych przedmiotów dynamicznych automatyczne wygenerowanie bogatego, lovecraftowskiego opisu (faktura, wiek, wycena w USD 1920s, waga) oraz uzupełnienie statystyk walki CoC 7e.
3. **Optymalizacja UI & Kolejki Renderowania:** Naprawa komponentów `ItemThumbnail` i `CategoryIcon` – zastąpienie surowej ikony `Wrench` eleganckim placeholderem kafelka Art Déco z etykietą kategorii oraz ulepszona sekwencyjna kolejka generowania w tle bez błędów 429.

---

### Pliki do modyfikacji
| Plik | Zmiana | Ryzyko |
|------|--------|--------|
| `_tester/_base/.silnik/src/lib/equipment-catalog.ts` | Dodanie polskich aliasów i elastycznego dopasowania dla 39+ szablonów | Niskie |
| `_tester/_base/.silnik/src/lib/acquired-equipment.ts` | Wdrożenie automatycznego wzbogacania (`enrichAcquiredItem`) dla przedmiotów pozyskanych od MG | Niskie |
| `_tester/_base/.silnik/src/components/ui/equipment-modal.tsx` | Redesign placeholderów braku obrazka (`CategoryIcon` & `ItemThumbnail`), usunięcie SVG-lock | Niskie |
| `_tester/_base/.silnik/src/hooks/useEquipmentThumbnails.ts` | Zapewnienie stabilnej kolejki 1-by-1 z zapobieganiem przekroczeniu rate limitów | Niskie |
| `src/app/api/equipment/enrich/route.ts` | [NOWY] Lightweight endpoint Gemini Flash do tworzenia lore i parametrów przedmiotu | Niskie |

---

### Fazy implementacji

#### Faza 1: Polskie Synonimy & Dopasowywanie Katalogowe
- [ ] Rozszerzenie `EQUIPMENT_CATALOG` w `equipment-catalog.ts` o tablice polskich aliasów dla każdego szablonu.
- [ ] Zaktualizowanie funkcji `findEquipmentTemplate` o dopasowywanie bez względu na wielkość liter i polskie znaki.
- Weryfikacja: Test jednostkowy `equipment-catalog.test.ts` potwierdzający, że *"Stara latarka"* oraz *"Rewolwer policyjny"* trafiają w odpowiednie assety WebP.

#### Faza 2: Endpoint AI Item Enrichment & Automatyczne Parametry CoC 7e
- [ ] Stworzenie lekkiego endpointu `/api/equipment/enrich` (Gemini 3.6 Flash Low), który przyjmuje nazwę przedmiotu oraz erę i zwraca: klimatyczny opis (2 zdania), wartość USD z lat 20., wagę oraz ewentualne statystyki CoC 7e (obrażenia, wadliwość).
- [ ] Integracja w `acquired-equipment.ts` i w procesie dodawania przedmiotu.
- Weryfikacja: Wymuszenie wzbogacenia dla nowego przedmiotu i weryfikacja poprawności danych JSON.

#### Faza 3: Przebudowa Placeholderów UI & Bezpieczna Kolejka Renderowania
- [ ] Przebudowa `ItemThumbnail` i `CategoryIcon` w `equipment-modal.tsx` — estetyczne, klimatyczne tło Art Déco z dyskretnym symbolem i przyciskiem "Generuj obraz AI".
- [ ] Usunięcie przypadkowego ustawiania fallbackowego SVG jako trwałego `imageUrl`.
- [ ] Weryfikacja sekwencyjnego generowania miniaturek w `useEquipmentThumbnails.ts`.
- Weryfikacja: Przetestowanie widoku w `equipment-modal.tsx` na przedmiotach bez obrazka oraz uruchomienie testu zbiorczego.

---

### Weryfikacja końcowa
- Uruchomienie istniejącego zestawu testów ekwipunku:
  - `npx jest _tester/_base/.silnik/src/lib/equipment-catalog.test.ts`
  - `npx jest _tester/_base/.silnik/src/components/ui/equipment-modal.test.tsx`
- Weryfikacja braku błędów TypeScript (`npx tsc --noEmit`).

### Co może się zepsuć
- **Przekroczenie quota API przy generowaniu grafiki:** Zapobieganie przez sekwencyjny bufor (1 request na raz z przerwą 500ms).
- **Zasłonięcie tekstu na kafelku:** Zabezpieczenie klasami `line-clamp-2` oraz rozdzielenie na modale detalu przedmiotu.
