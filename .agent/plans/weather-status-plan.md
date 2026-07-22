# Plan: Dynamiczny i Klimatyczny Wskaźnik Pogody (Klimat > Fakty)

Data: 2026-07-22  
Złożoność: Średnia  

### Problem
Na górnym pasku statusu aplikacji brak wskaźnika pogody, a pobieranie czystych, słonecznych danych pogodowych z historycznego API Open-Meteo może niszczyć klimat horroru lovecraftowskiego, jeśli przygoda lub Mistrz Gry wymagają deszczowej / mrocznej atmosfery.

### Rozwiązanie
Wdrożenie 2-poziomowej hierarchii prawdy o pogodzie (Klimat > Fakty):
1. **Wola Mistrza Gry (LLM Tag):** MG w toku narracji może dynamicznie zmieniać pogodę przez tag `[POGODA: opis]`, co natychmiast aktualizuje stan i czyści tag z czatu.
2. **Opis / Preset Przygody:** Parser przygody w `analyze/route.ts` lub dane przygody dostarczają domyślny klimat/pogodę dla scenariusza.
3. **Pasek Statusu UI:** `CampaignClock` oraz `ChatHeader` renderują czytelną ikonę z tooltipem pogodowym pobieraną ze stanu `timeManager`.

---

### Pliki do modyfikacji

| plik | zmiana | ryzyko |
|------|--------|--------|
| `_tester/_base/.silnik/src/lib/time-manager.ts` | Dodanie pola/metod `weather` i `setWeather` z subskrypcją zdarzeń do `timeManager`. | Niskie |
| `_tester/_base/.silnik/src/components/chat/narrative/cleanup.ts` | Wyłapywanie i wycinanie tagu `[POGODA: ...]` z narracji MG przed wysłaniem do czatu / TTS. | Niskie |
| `_tester/_base/.silnik/src/components/ui/campaign-clock.tsx` | Subskrypcja stanu pogody i renderowanie ikony z tooltipem pogodowym. | Niskie |
| `_tester/_base/.silnik/src/app/api/chat/_helpers/build-time-context.ts` | Przekazywanie aktualnej pogody do `buildTimeContext` w prompcie LLM. | Niskie |
| `_tester/_base/.silnik/src/lib/prompts/image-instructions.ts` | Wstrzykiwanie aktualnego stanu pogody do dyrektywy generowania ilustracji sceny. | Niskie |

---

### Fazy implementacji

**Faza 1: Rozszerzenie stanu pogody w `timeManager` & `cleanup`**
- [ ] Dodanie typu i metod zarządzania pogodą w `src/lib/time-manager.ts`.
- [ ] Dodanie regexa wyłapującego `[POGODA: ...]` w `src/components/chat/narrative/cleanup.ts` oraz aktualizującego stan w `timeManager`.
- Weryfikacja: `npm test` dla parsowania tagów systemowych.

**Faza 2: Prezentacja pogody na pasku statusu (UI)**
- [ ] Modyfikacja `CampaignClock.tsx` w celu wyświetlania ikony pogody i tooltipa ze stanem.
- [ ] Integracja przekazywania domyślnej pogody z analizatora przygody w `ChatHeader`.
- Weryfikacja: Przegląd UI oraz testy jednostkowe `campaign-clock.test.tsx`.

**Faza 3: Spięcie z promptem LLM oraz generacją ilustracji**
- [ ] Wstrzyknięcie aktualnej pogody do `buildTimeContext`.
- [ ] Uwzględnienie słów kluczowych pogody w promptach graficznych (`image-instructions.ts`).
- Weryfikacja: `npm test` weryfikujący poprawność wstrzykiwania kontekstu.

---

### Weryfikacja końcowa
- `npm test` — weryfikacja wszystkich testów jednostkowych Jest.
- `npx tsc --noEmit` — sprawdzanie spójności typów TypeScript.

### Co może się zepsuć
- Wyciek tagu `[POGODA:]` do tekstu czytanego przez TTS (Ryzyko: Niskie — zostanie zabezpieczone w `cleanupContent`).
