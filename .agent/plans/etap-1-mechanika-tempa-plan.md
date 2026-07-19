## Plan: Etap 1 - mechanika tempa i bezpieczna podstawa

Data: 2026-07-19
Złożoność: Średnia
Runtime: `_tester/_base/.silnik/`
Źródła: `.agent/research/etap-0-analiza-tempa-2026-07-19.md`, `docs/TESTING.md`, `README.md`

### Problem

Obecny czat dobiera długość odpowiedzi wyłącznie heurystycznie na podstawie kontekstu wiadomości. Gracz nie może świadomie włączyć eksperymentalnego rytmu scen ani wybrać poziomu szczegółowości walki i pościgu, a aplikacja nie ma bezpiecznego kontraktu dla przyszłych mechanik sesyjnych.

### Rozwiązanie

Rozszerzyć Sesję Zero o opcjonalny, wersjonowalny kontrakt `mechanics`. Jeden przełącznik eksperymentalny poprzedza wszystkie jego kontrolki: dopiero po świadomym włączeniu gracz wybiera tempo, walkę i pościg. W trybie `pure_narrative` kontrakt jest zawsze nieaktywny, niezależnie od zapisanej flagi.

Istniejący `getPacingDirective(gameContext)` pozostaje jedynym źródłem liczbowego zakresu słów. Eksperyment dodaje co najwyżej jedną, niemierzalną dyrektywę struktury beatu - opisuje liczbę decyzji i wymian, ale nie zawiera drugiego limitu słów. Dzięki temu nie konkuruje z obecną heurystyką sceny.

Etap nie wdraża walk, pościgów, magii, encyklopedii, jawnego `SessionStateV1`, zdarzeń ani zmian w RAG. Nie zmienia też `activeGameState`: jego pełne odtwarzanie jest zakresem Etapu 2.

### Kontrakt Etapu 1

```ts
export type MechanicsPacing = 'narrative' | 'standard' | 'detailed';

export interface SessionMechanicsSettingsV1 {
  schemaVersion: 1;
  enabled: boolean;
  pacing: MechanicsPacing;
  combatDetail: MechanicsPacing;
  chaseDetail: MechanicsPacing;
}

export interface SessionZeroSettings {
  // istniejące pola kalibracji
  narrativeMode: 'full_rpg' | 'story_priority' | 'pure_narrative';
  // ...
  mechanics?: SessionMechanicsSettingsV1;
}
```

- `mechanics` pozostaje opcjonalne, aby stare `ai_settings` i save'y były zgodne.
- Modal tworzy dla nowej Sesji Zero wartości `schemaVersion: 1`, `enabled: false` oraz `standard` dla trzech poziomów. Nie dodajemy ich do globalnego `defaultAISettings`, bo Sesja Zero nie istnieje przed kalibracją.
- Jeden eksportowany normalizator akceptuje wyłącznie wersję 1 i trzy dozwolone wartości. Brak pola, nieznana wersja lub błędny kształt zwraca legacy fallback `undefined`.
- `pure_narrative` ma pierwszeństwo: normalizator kontekstu promptu zwraca `undefined` dla mechaniki, nawet gdy zapis zawiera `enabled: true`.
- `narrativeMode`, `responseLength`, `detailLevel` i `getPacingDirective()` pozostają niezależne od flagi eksperymentalnej.

### Pliki do modyfikacji

| plik | zmiana | ryzyko |
| --- | --- | --- |
| `_tester/_base/.silnik/src/lib/ai-settings/types.ts` | Wyodrębnić eksportowane typy Sesji Zero i kontraktu mechaniki; dodać opcjonalne `mechanics`. | Średnie |
| `_tester/_base/.silnik/src/lib/ai-settings/storage.ts` | Użyć centralnego normalizatora podczas odczytu `ai_settings`. | Średnie |
| `_tester/_base/.silnik/src/components/ui/session-zero-modal.tsx` | Użyć wspólnego typu; pokazać kontrolki dopiero po opt-in i zablokować je dla `pure_narrative`. | Średnie |
| `_tester/_base/.silnik/src/lib/prompts/session-zero-instructions.ts` | Zastąpić lokalny duplikat typu jawnym `Pick<SessionZeroSettings, ...>`. | Niskie |
| `_tester/_base/.silnik/src/lib/pacing-controller.ts` | Dodać czysty normalizator kontekstu oraz dyrektywę struktury beatu bez liczbowych limitów słów. | Średnie |
| `_tester/_base/.silnik/src/app/api/chat/_helpers/resolve-settings.ts` | Dodać głęboki merge `sessionZero`, normalizację na granicy requestu i silniejszy typ patcha klienta. | Wysokie |
| `_tester/_base/.silnik/src/app/api/chat/_helpers/run-chat-pipeline.ts` | Zastąpić `Record<string, unknown>` typem `ClientAISettingsPatch` i przekazać znormalizowaną Sesję Zero do buildera. | Niskie |
| `_tester/_base/.silnik/src/app/api/chat/_helpers/build-context.ts` | Dołączyć maksymalnie jedną dyrektywę struktury po obecnej dyrektywie sceny. | Średnie |
| `_tester/_base/.silnik/src/lib/pacing-controller.test.ts` | Pokryć normalizację, trzy poziomy, `pure_narrative` oraz brak drugiego limitu słów. | Niskie |
| `_tester/_base/.silnik/src/app/api/chat/_helpers/resolve-settings.test.ts` | Pokryć głęboki merge i odrzucenie niepełnego/niepoprawnego `mechanics`. | Średnie |
| `_tester/_base/.silnik/src/app/api/chat/_helpers/build-context.test.ts` | Pokryć przepływ ustawienie -> dokładnie jedna sekcja struktury oraz fallback flagi wyłączonej. | Średnie |
| `_tester/_base/.silnik/src/lib/ai-settings/storage.test.ts` | Pokryć odczyt starego i uszkodzonego `ai_settings`. | Niskie |
| `_tester/_base/.silnik/src/lib/full-game-save-manager.test.ts` | Potwierdzić serializację poprawnego kontraktu w pełnym save'ie. | Niskie |

`defaults.ts` i `useFullSave.ts` pozostają poza zmianą, chyba że implementacja ujawni dodatkową ścieżkę zapisu omijającą powyższe granice normalizacji.

### Fazy implementacji

**Faza 1: Jeden kontrakt i dwie granice normalizacji**

- [ ] Przenieść `SessionZeroSettings` do `ai-settings/types.ts` i użyć go w modalu oraz generatorze promptu zamiast lokalnych duplikatów.
- [ ] Dodać `MechanicsPacing`, `SessionMechanicsSettingsV1`, fabrykę wartości dla nowej Sesji Zero i jeden normalizator danych nieufnych.
- [ ] Użyć normalizatora w `loadAISettings()` bez zapisywania ani zmieniania historycznych ustawień.
- [ ] Rozszerzyć `resolveSettings()` o jawny, głęboki merge `sessionZero` oraz normalizację po merge. Zachować aktualne merge `geminiSettings` i `gameMasterNarration`.
- [ ] Znormalizować mechanikę do `undefined`, gdy `narrativeMode === 'pure_narrative'`.

Weryfikacja: testy storage i `resolveSettings()` obejmują brak pola, złą wersję, nieprawidłowy poziom, częściowy patch klienta oraz priorytet Czystej Narracji.

**Faza 2: Kalibracja w Sesji Zero**

- [ ] W kroku „Tryb narracji i trudność” dodać przełącznik „Eksperymentalna mechanika sesji” przed pozostałymi nowymi kontrolkami.
- [ ] Gdy flaga jest wyłączona, nie renderować wyborów tempa, walki i pościgu albo renderować je jako nieaktywne z czytelną informacją, że nie wpływają jeszcze na grę.
- [ ] Przy pierwszym włączeniu utworzyć kontrakt z trzema wartościami `standard`; późniejsze zmiany gracza są niezależne.
- [ ] Gdy gracz wybierze `pure_narrative`, wymusić wyłączenie przełącznika i ukryć sekcję z wyjaśnieniem, że ten tryb nie używa mechanik. Zachować dane, aby po powrocie do innego trybu można było je ponownie włączyć.
- [ ] Zachować liczbę kroków i istniejący zapis przez `saveAISettings()`.

Weryfikacja: test komponentu lub Playwright potwierdza, że kontrolki są niedostępne przed opt-in, `pure_narrative` je wyłącza, a poprawne ustawienia są zapisywane i odtwarzane po ponownym otwarciu modalu.

**Faza 3: Niesprzeczna dyrektywa promptu**

- [ ] Zachować `getPacingDirective(gameContext)` bez zmian w liczbowych zakresach słów.
- [ ] Dodać czystą funkcję `getSessionMechanicsDirective`, która opisuje wyłącznie strukturę: Narracyjne to jedna decyzja i odpowiedź, Standardowe to jedna-dwie znaczące wymiany, Szczegółowe to jawne kroki i reakcje; poziomy walki i pościgu opisują analogicznie rytm sceny.
- [ ] Nie kodować limitów rund, tokenów ani drugich zakresów słów - audyt nie dostarcza jeszcze wiarygodnych danych do tych wartości.
- [ ] `buildAdditionalContext()` dodaje co najwyżej jedną sekcję struktury wyłącznie po otrzymaniu aktywnego, znormalizowanego kontraktu.
- [ ] `run-chat-pipeline.ts` używa `ClientAISettingsPatch` i przekazuje wynik `resolveSettings()`; klient nadal wysyła istniejące `aiSettings`, bez nowego pola HTTP.
- [ ] Nie zmieniać RAG, `gameContext`, protokołu Hot Seat ani kolejności istniejących sekcji promptu.

Weryfikacja: test `build-context` potwierdza obecność jednej sekcji bez wyrażeń liczbowych typu „słów”, jej brak przy fladze wyłączonej i `pure_narrative` oraz niezmienione sekcje RAG i Hot Seat w scenariuszu kontrolnym.

**Faza 4: Trwałość i regresja**

- [ ] Dodać test `FullGameSaveManager`: poprawny `gameSettings.aiSettings.sessionZero.mechanics` przeżywa `createFullSave`, kompresję i dekompresję.
- [ ] Dodać test ścieżki legacy: save bez `mechanics` po przejściu przez `resolveSettings()` nie daje dyrektywy eksperymentalnej.
- [ ] Uruchomić testy skupione, pełny Jest, TypeScript strict, ESLint zmienionych plików i build produkcyjny w `_tester/_base/.silnik/`.
- [ ] Ręcznie przejść Sesję Zero w trybach `full_rpg`, `story_priority` i `pure_narrative`, zapisać/wczytać sesję oraz wysłać wiadomość przy fladze wyłączonej i włączonej.

Weryfikacja: każda aktywna konfiguracja daje jedną niesprzeczną instrukcję struktury, a wszystkie ścieżki legacy zachowują aktualne zachowanie.

### Kryteria akceptacji

- Gracz może wybrać Narracyjne, Standardowe albo Szczegółowe tempo wyłącznie po włączeniu eksperymentalnej mechaniki sesji.
- Gracz może niezależnie ustawić poziom szczegółowości walki i pościgu po tym samym opt-in.
- Dla nowej Sesji Zero eksperymentalna flaga jest wyłączona.
- `pure_narrative` zawsze blokuje aktywację mechaniki niezależnie od danych w zapisie.
- Stare ustawienia i stare pełne save'y nie rzucają błędu oraz nie dostają dyrektywy eksperymentalnej.
- Poprawny kontrakt przechodzi przez istniejące `aiSettings` do `/api/chat`, po głębokim merge i normalizacji.
- Prompt otrzymuje najwyżej jedną nową sekcję struktury i nie otrzymuje drugiego zakresu słów.
- RAG, obecna heurystyka `getPacingDirective`, Hot Seat i poprzedni przepływ czatu pozostają aktywne.
- Pełny save zachowuje poprawny kontrakt, ale Etap 1 nie obejmuje odtwarzania `activeGameState.session`.

### Weryfikacja końcowa

W katalogu `_tester/_base/.silnik/`:

```bash
npm test -- --runInBand src/lib/pacing-controller.test.ts src/lib/ai-settings/storage.test.ts src/lib/full-game-save-manager.test.ts src/app/api/chat/_helpers/resolve-settings.test.ts src/app/api/chat/_helpers/build-context.test.ts
npm test -- --runInBand
npx tsc --noEmit
npx eslint src/lib/ai-settings/types.ts src/lib/ai-settings/storage.ts src/lib/prompts/session-zero-instructions.ts src/lib/pacing-controller.ts src/components/ui/session-zero-modal.tsx src/app/api/chat/_helpers/resolve-settings.ts src/app/api/chat/_helpers/run-chat-pipeline.ts src/app/api/chat/_helpers/build-context.ts
npm run build
```

Jeżeli testy dostaną inną nazwę podczas implementacji, komenda skupiona ma zostać dostosowana do faktycznie utworzonych plików. Pełny Jest, TypeScript i build pozostają obowiązkowe.

### Co może się zepsuć

| ryzyko | poziom | zabezpieczenie |
| --- | --- | --- |
| Stary lub ręcznie zmodyfikowany zapis ma niepoprawny kontrakt. | Wysokie | Jeden normalizator w storage i po merge po stronie `/api/chat`. |
| Patch klienta nadpisze część Sesji Zero. | Wysokie | Jawny głęboki merge `sessionZero` w `resolveSettings()` i test częściowego patcha. |
| Prompt dostanie sprzeczne instrukcje długości. | Średnie | Nowa dyrektywa nie zawiera limitów słów; liczby nadal ustala istniejący kontroler. |
| `pure_narrative` zostanie przypadkiem zmienione w tryb mechaniczny. | Wysokie | Blokada UI oraz wymuszenie fallbacku w normalizatorze serwerowym. |
| Szczegółowy tryb będzie rozumiany jako gotowa walka. | Niskie | UI opisuje go jako rytm instrukcji MG, bez obietnicy pełnego silnika. |
| Zakres rozszerzy się do `SessionStateV1`. | Wysokie | Jawnie pozostawić stan i zdarzenia dla Etapu 2. |
