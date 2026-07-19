## Plan Review: Etap 1 - mechanika tempa i bezpieczna podstawa

Data: 2026-07-19
Plan: `.agent/plans/etap-1-mechanika-tempa-plan.md`

### Ocena ogólna

🔴 Czerwony - kierunek i granice Etapu 1 są właściwe, ale aktualny plan ma trzy sprzeczności w aktywacji i promptcie oraz pomija granicę zaufania `/api/chat`. Wdrożenie w obecnej formie mogłoby dawać graczowi wybór bez skutku albo zmieniać zachowanie starej sesji.

### Znalezione problemy

#### Krytyczne - blokują implementację

- **Definicja problemu i promise gap**: Faza 2 pozwala wybrać tempo, ale Faza 3 wysyła instrukcję tylko przy `mechanics.enabled === true`. Gdy gracz wybierze tempo i pozostawi domyślnie wyłączoną flagę, interfejs zapisze wybór, który nie wpływa na grę. → Plan musi jednoznacznie wybrać jeden model: albo flaga włącza cały blok tempa i UI ukrywa/wyłącza jego wybór przed opt-in, albo tempo działa niezależnie od flagi, a flaga obejmuje wyłącznie przyszłe mechaniki walki i pościgu.

- **Dopasowanie do architektury**: Plan nakazuje dołączyć nową dyrektywę po istniejącym `getPacingDirective(gameContext)`. Istniejący kontroler ustala zakres słów według sceny, a proponowana dyrektywa również ma regulować długość beatu. Kolejność sekcji nie usuwa sprzeczności: MG może dostać dwa różne limity. → Nowy blok nie może definiować drugiego zakresu słów. Ma być jedną, krótką dyrektywą struktury sceny, uzupełniającą obecne limity, albo plan musi zastąpić oba wywołania jedną funkcją kompozycyjną z jasno opisanym priorytetem.

- **Zgodność semantyczna**: `pure_narrative` oznacza obecnie brak mechanik, a generator promptu celowo nie dodaje nawet instrukcji testów umiejętności w tym trybie. Plan pozwala równocześnie włączyć „eksperymentalną mechanikę sesji” i ustawić walkę/pościg. → Plan musi określić pierwszeństwo: w `pure_narrative` mechanika jest zawsze nieaktywna, kontrolki są niedostępne, a istniejące preferencje mogą zostać zachowane tylko jako nieaktywne dane na wypadek zmiany trybu.

- **Kompletność i bezpieczeństwo danych**: Plan normalizuje tylko `loadAISettings()` z localStorage. Pełny save trafia wprost do `useFullSave.setAiSettings()`, a request do `/api/chat` jest scalany przez `resolveSettings()` płytko na poziomie `sessionZero`. Niepełny albo ręcznie zmodyfikowany save/request może ominąć normalizację lub skasować pola Sesji Zero. → Wydzielić jeden normalizator i użyć go na serwerowej granicy `resolve-settings.ts`; dodać głęboki merge `sessionZero`. `build-context` ma pozostać defensywny, ale nie powinien być jedyną warstwą ochrony.

#### Ostrzeżenia - warto adresować

- **Kompletność**: `defaults.ts` nie definiuje obecnie `sessionZero`; nowe wartości dla świeżej kalibracji powstają w stanie `session-zero-modal.tsx`. Wymienienie `defaults.ts` jako pliku obowiązkowego tworzy pozorną pracę i grozi dodaniem globalnego stanu, którego nie potrzebują stare sesje. → Usunąć `defaults.ts` z planu, a fabrykę domyślnego kontraktu dodać obok jego typu lub w module normalizującym.

- **Dopasowanie do architektury**: `SessionZeroSettings` jest lokalnym typem modalu, a `AISettings.sessionZero` i `SessionZeroShape` w generatorze promptu to trzy podobne, niezależne definicje. Rozszerzenie tylko jednej z nich utrzyma obecny dryf. → Wydzielić eksportowany typ Sesji Zero w `ai-settings/types.ts`; modal i prompt mają używać go lub jego jawnego `Pick`.

- **Strategia testowania**: Plan wymienia test `handleLoadFullSave`, lecz nie istnieje test hooka i `FullGameSaveManager.createFullSave()` nie wykonuje tego kodu. → Rozdzielić dowody: test serializacji save'a dla poprawnej konfiguracji oraz test `resolveSettings()` dla niepełnego/niepoprawnego `sessionZero`. Test hooka jest potrzebny tylko wtedy, gdy implementacja zmieni `useFullSave`.

- **Guardrails**: W repozytorium nie ma `CLAUDE.md` ani `GEMINI.md`; obowiązują README, `docs/TESTING.md`, TypeScript strict i faktyczny runtime `_tester/_base/.silnik/`. → Plan powinien wskazać te źródła jako konwencje, a komendy wykonywać w katalogu runtime.

#### Obserwacje

- Klient już przesyła pełne `aiSettings` do `/api/chat`, więc nowy transport HTTP nie jest potrzebny. `run-chat-pipeline.ts` wymaga jednak silniejszego typu `ClientAISettingsPatch` zamiast `Record<string, unknown>`, aby głęboki merge i testy chroniły kontrakt.

- Modal zapisuje ustawienia przez `saveAISettings()`, a `settingsEmitter` aktualizuje stan strony. W `CthulhuSidebar` callback służy jedynie oznaczeniu ukończonej Sesji Zero - nie trzeba dodawać osobnego przepływu danych, ale warto objąć go testem integracyjnym modalu.

- Najbezpieczniejsza wersja produktu na Etap 1: przełącznik eksperymentalny poprzedza wszystkie trzy kontrolki, tempo i szczegółowość są aktywne wyłącznie po opt-in, a `pure_narrative` wymusza wyłączenie. Nowy prompt dodaje wyłącznie strukturę beatu i nigdy drugi limit słów.

### Rekomendacja

Poprawić plan przed implementacją. Po korekcie należy dodać do listy plików co najmniej `resolve-settings.ts` i jego test, usunąć `defaults.ts` oraz zastąpić kryterium „dokładnie jedna dodatkowa dyrektywa” kryterium „jedna niesprzeczna dyrektywa struktury, aktywna wyłącznie po opt-in”. Następnie plan będzie gotowy do `/dev-4-implement`.

### Status po korekcie

Poprawiony plan uwzględnia wszystkie blokery: opt-in poprzedza kontrolki, `pure_narrative` ma pierwszeństwo, dyrektywa eksperymentalna nie zawiera limitów słów, a centralny normalizator działa przy odczycie ustawień i po serverowym merge requestu. Plan jest gotowy do implementacji.
