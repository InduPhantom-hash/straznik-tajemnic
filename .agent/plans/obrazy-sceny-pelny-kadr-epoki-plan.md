# Plan: obrazy scen - pełny kadr, 1-3 obrazy i epoki

Data: 2026-08-18
Złożoność: Duża
Źródło researchu: `.agent/research/obrazy-chat-reguly-epoki-2026-08-18.md`

## Feature Spec

Obrazy czatu są przycinane, a obecny limit maksymalnie trzech obrazów nie gwarantuje pierwszego kadru znaczącej sceny.

Budujemy pełny render obrazów oraz scheduler sceny. Znacząca scena zaczyna się przy jawnej zmianie lokacji albo tagu `priority=required`. Klient tworzy stabilne klucze sceny i encji, generuje najwyżej jeden obraz na odpowiedź i odtwarza stan po save/load. Rok obrazu pochodzi z `timeManager`.

Kryteria akceptacji:
- Scena i intro pokazują cały obraz bez `object-cover`.
- Pierwszy wymagany kadr powstaje mimo cooldownu.
- Jedna scena ma 1-3 obrazy i nie duplikuje tej samej encji.
- Reload zachowuje licznik, triggery i rok obrazu.

Czego NIE budujemy:
- Nie zmieniamy providera ani modelu Gemini.
- Nie generujemy więcej niż jednego obrazu na odpowiedź.
- Nie przebudowujemy galerii, lightboxa ani widoków poza czatem.
- Testy nie wywołują płatnego API.

Przykład: dla roku 1983 tag `[OBRAZ: kind=location; priority=required; entity=Przystanek PKS w Traszynie; prompt=Atmospheric rural bus stop]` tworzy jeden obraz z `sceneKey` wyliczonym przez klienta. Drugi identyczny tag w tej scenie nie generuje duplikatu.

## Kontrakt techniczny

- LLM przekazuje `kind`, `priority`, czytelną nazwę `entity` i prompt, ale nigdy nie tworzy identyfikatora technicznego.
- Klient wylicza `entityKey` przez deterministyczną normalizację rodzaju, nazwy, spacji i znaków diakrytycznych.
- `sceneKey` powstaje przy zmianie sceny z identyfikatora wiadomości rozpoczynającej scenę.
- Kolejność żądań: `required` przed `optional`, następnie `location`, `portrait/creature`, `item/event`.
- Uruchamiane jest najwyżej jedno żądanie na odpowiedź; pozostałe trafiają do kolejki sceny.
- Obraz intro jest pierwszym obrazem `location` sceny otwierającej i używa tego samego `sceneKey` co opening.
- `SceneImageState` jest wersjonowany i zapisywany z grą; stary save bez pola dostaje bezpieczny pusty stan.
- Stare tagi `[SCENA:]` oraz `[PORTRET:]` nadal działają i dostają klucze wyliczone po stronie klienta.

```ts
interface SceneImageState {
  version: 1;
  sceneKey: string;
  locationKey: string;
  imageCount: number;
  completedEntityKeys: string[];
  pendingRequests: ImageRequest[];
  year: number;
}
```

## Pliki do modyfikacji

| Plik | Zmiana | Ryzyko |
|---|---|---|
| `_tester/_base/.silnik/src/components/chat/narrative/render-narrative-with-images.tsx` | Usunięcie sztywnego kadru i `object-cover` dla obrazów Markdown. | Średnie |
| `_tester/_base/.silnik/src/components/chat/chat-window/components/message-card.tsx` | Pełny render scen i pionowe portrety bez utraty lightboxa. | Średnie |
| `_tester/_base/.silnik/src/lib/parsers/media-parser.ts` | Parser nowego tagu i zgodność starych tagów. | Wysokie |
| `_tester/_base/.silnik/src/lib/parsers/types.ts` | Typy `kind`, `entity`, `entityKey` i `priority`. | Średnie |
| `_tester/_base/.silnik/src/lib/types.ts` | `SceneImageState`, metadane obrazów i fallback starego save'a. | Wysokie |
| `_tester/_base/.silnik/src/lib/prompts/image-instructions.ts` | Reguły 1-3, typy triggerów i kontrakt tagu. | Wysokie |
| `_tester/_base/.silnik/src/hooks/useChat.ts` | Scheduler runtime, kolejka, deduplikacja i aktualny rok. | Wysokie |
| `_tester/_base/.silnik/src/lib/constants/chat.ts` | Stałe polityki sceny i cooldownu. | Niskie |
| `_tester/_base/.silnik/src/hooks/useGameStart.ts` | Intro jako pierwszy obraz sceny otwierającej. | Średnie |
| `_tester/_base/.silnik/src/app/api/imagen/route.ts` | Walidacja typu i roku bez zmiany modelu Gemini. | Średnie |
| `_tester/_base/.silnik/src/lib/era-visual-style.ts` | Uzupełnienie tylko po wykryciu luki testem. | Średnie |
| `_tester/_base/.silnik/src/lib/time-manager.ts` | Źródło aktualnego roku renderu. | Niskie |
| `_tester/_base/.silnik/src/lib/full-game-save-manager.ts` | Zapis i odczyt wersjonowanego `SceneImageState`. | Wysokie |
| `_tester/_base/.silnik/src/lib/chat-history-sanitizer.ts` | Zachowanie lekkich metadanych przy usuwaniu base64. | Średnie |
| `_tester/_base/.silnik/src/hooks/useEquipmentThumbnails.ts` | Weryfikacja źródła roku miniatur. | Średnie |
| `_tester/_base/.silnik/src/components/ui/npc-manager.tsx` | Weryfikacja roku ręcznej regeneracji NPC. | Niskie |
| `_tester/_base/.silnik/src/components/ui/location-manager.tsx` | Weryfikacja roku ręcznej regeneracji lokacji. | Niskie |
| `_tester/_base/.silnik/src/components/chat/narrative/render-narrative-with-images.test.tsx` | Regresja pełnego kadru Markdown i data URL. | Niskie |
| `_tester/_base/.silnik/src/components/chat/chat-window/components/message-card.test.tsx` | Regresja scen i portretów w wiadomości. | Niskie |
| `_tester/_base/.silnik/src/hooks/useChat.images.test.ts` | Scheduler, kolejka, deduplikacja i cooldown. | Średnie |
| `_tester/_base/.silnik/src/hooks/useGameStart.images.test.ts` | Dwie kolejności zakończenia tekstu i obrazu intro. | Średnie |
| `tests/e2e/feature-11-images.spec.ts` | Regresje UI, schedulera, save/load i epok z mockiem API. | Średnie |

## Mapa Zadań

### Faza 1: Kontrakt i deterministyczne klucze

- [ ] Zdefiniować `ImageKind`, `ImagePriority`, `ImageRequest` i wersjonowany `SceneImageState`. `(Blokuje: Fazy 2-6)`
- [ ] Dodać czyste `normalizeEntityKey(kind, entity)` i `createSceneKey(messageId)`. `(Blokuje: Fazy 3-6)`
- [ ] Rozszerzyć parser `[OBRAZ:]`, zachowując `[SCENA:]` i `[PORTRET:]`. `(Blokuje: Fazy 3-6)`
- [ ] Dodać testy kluczy, parsera, kolejności i fallbacków starych tagów. `(Blokuje: Fazy 3-7)`
- Weryfikacja: `npm test -- --runInBand src/lib/parsers/media-parser.test.ts src/lib/scene-image-policy.test.ts` z katalogu silnika.

### Faza 2: Pełny kadr w obu rendererach czatu

- [ ] Wyodrębnić lub jednolicie zastosować reguły renderu obrazów Markdown i `generatedImages`. `(Zablokowane przez: Faza 1; Blokuje: Faza 5)`
- [ ] Dla scen pokazać pełne źródło: `w-full h-auto`, bez wymuszonego `aspect-ratio` i bez `object-cover`. `(Zablokowane przez: Faza 1)`
- [ ] Dla portretów zachować pionowy layout z `object-contain` i tłem, bez ucinania twarzy. `(Zablokowane przez: Faza 1)`
- [ ] Zachować lazy loading, filtr wizualny, kliknięcie lightboxa i obsługę data URL. `(Zablokowane przez: Faza 1)`
- Weryfikacja: `npm test -- --runInBand src/components/chat/narrative/render-narrative-with-images.test.tsx src/components/chat/chat-window/components/message-card.test.tsx` z katalogu silnika.

### Faza 3: Scheduler runtime

- [ ] Zmieniać scenę natychmiast po jawnej zmianie lokacji albo `priority=required`. `(Zablokowane przez: Faza 1; Blokuje: Fazy 4-7)`
- [ ] Sortować kolejkę: required → optional, potem location → portrait/creature → item/event. `(Zablokowane przez: Faza 1)`
- [ ] Uruchamiać najwyżej jedno żądanie na odpowiedź i przechowywać resztę w kolejce sceny. `(Zablokowane przez: Faza 1)`
- [ ] Pierwszy wymagany kadr omija cooldown; pozostałe zachowują cooldown i limit 3. `(Zablokowane przez: Faza 1)`
- [ ] Deduplikować przez `entityKey` wyliczony po stronie klienta. `(Zablokowane przez: Faza 1)`
- Weryfikacja: `npm test -- --runInBand src/hooks/useChat.images.test.ts` z katalogu silnika.

### Faza 4: Persistence i migracja save

- [ ] Zapisać `SceneImageState.version=1` w pełnym save. `(Zablokowane przez: Fazy 1 i 3; Blokuje: Faza 7)`
- [ ] Zachować lekkie metadane sceny podczas usuwania base64. `(Zablokowane przez: Fazy 1 i 3)`
- [ ] Dla starego save'a bez pola zastosować pusty stan bez migracji destrukcyjnej. `(Zablokowane przez: Fazy 1 i 3)`
- [ ] Po reloadzie odtworzyć licznik, kolejkę, triggery i aktualny `sceneKey`. `(Zablokowane przez: Fazy 1 i 3)`
- Weryfikacja: `npm test -- --runInBand src/lib/full-game-save-manager.test.ts src/lib/chat-history-sanitizer.test.ts` z katalogu silnika.

### Faza 5: Aktualny rok i audyt epok

- [ ] Wprowadzić adapter: `timeManager.getTime().year`, fallback pierwszego roku `AdventureContext.yearRange`. `(Zablokowane przez: Faza 1; Blokuje: Fazy 6-7)`
- [ ] Przepuścić adapter przez czat, NPC, lokacje, portrety, ekwipunek i podsumowanie sceny. `(Zablokowane przez: Faza 1)`
- [ ] Potwierdzić guardrails dla 1895, 1925, 1946, 1974, 1983, 1995, 2004 i współczesności. `(Zablokowane przez: Faza 1)`
- [ ] Dodać regresję przejścia między dekadami, telefonów i pojazdów. `(Zablokowane przez: Faza 1)`
- Weryfikacja: `npm test -- --runInBand src/lib/era-visual-style.test.ts src/lib/equipment-prompt-builder.test.ts` z katalogu silnika.

### Faza 6: Intro jako pierwsza scena

- [ ] Utworzyć opening `sceneKey` przed równoległym startem tekstu i obrazu. `(Zablokowane przez: Fazy 1 i 5; Blokuje: Faza 7)`
- [ ] Podpiąć obraz intro jako `generatedImages[0]` typu `location` do wiadomości otwierającej. `(Zablokowane przez: Fazy 1 i 5)`
- [ ] Zarejestrować trigger lokacji i `imageCount=1`, aby tag openingu nie tworzył dubla. `(Zablokowane przez: Fazy 1 i 5)`
- Weryfikacja: `npm test -- --runInBand src/hooks/useGameStart.images.test.ts` obejmuje obraz przed tekstem oraz tekst przed obrazem.

### Faza 7: Integracja, regresje i dokumentacja

- [ ] Zaktualizować E2E z mockiem `/api/imagen` dla 1, 2 i 3 obrazów, pełnego kadru, save/load i epok. `(Zablokowane przez: Fazy 2-6)`
- [ ] Przywrócić albo wskazać repozytoryjny harness Playwright; obecnie root nie ma konfiguracji/zależności, a runner silnika nie odkrywa `tests/e2e`. `(Zablokowane przez: Fazy 2-6)`
- [ ] Uruchomić testy jednostkowe, TypeScript oraz build. `(Zablokowane przez: Fazy 2-6)`
- [ ] Wykonać ręczny test desktopowy: intro, lokacja, NPC, przedmiot, reload i przeskok czasu. `(Zablokowane przez: Fazy 2-6)`
- [ ] Uaktualnić dokumentację wyłącznie do stanu potwierdzonego testami. `(Zablokowane przez: Fazy 2-6)`
- Weryfikacja: `git diff --check`, pełne testy, kontrola typów, build i brak nieprawdziwych opisów providerów w dokumentacji.

## Weryfikacja końcowa

```bash
cd /Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik
npm test -- --runInBand src/lib/parsers/media-parser.test.ts src/lib/era-visual-style.test.ts
npx tsc --noEmit
npm test
npm run build
```

- Testy E2E muszą mockować `/api/imagen`; nie wolno generować płatnych obrazów podczas weryfikacji.
- Playwright jest aktualnie zablokowany przez brak repozytoryjnej konfiguracji/zależności. Faza 7 nie może zostać uznana za ukończoną, dopóki działający harness nie zostanie wskazany lub przywrócony i zweryfikowany przez `--list`.
- Ręczny test desktopowy uruchamiamy dopiero po zielonych testach automatycznych.

## Co może się zepsuć

- Wysokie: `SceneImageState` może uszkodzić zgodność save. Chroni to `version=1`, pole opcjonalne i fixture starego zapisu.
- Wysokie: błędny `sceneKey` może wywołać obrazy za często albo pominąć wymagany kadr.
- Średnie: parser nowego tagu może pozostawić tag widoczny w narracji lub złamać stare tagi; wymagane są testy obu formatów.
- Średnie: zmiana renderu może rozbić lightbox, lazy loading albo wygląd obrazów data URL.
- Średnie: rok gry musi wygrywać nad zakresem przygody, lecz bez cofania zegara po wczytaniu starego save'a.
- Niskie: testy i dokumentacja mogą nadal odwoływać się do nieaktywnej konfiguracji providerów.

## Brief: obrazy scen - pełny kadr, 1-3 obrazy i epoki

**Co**: Naprawiamy przycinanie obrazów i wymuszamy 1-3 obrazy dla każdej znaczącej sceny.
**Jak**: Trzy niezależne sesje funkcjonalne: pełny kadr, scheduler z persistence oraz aktualny rok z audytem epok; intro jest osobną fazą integracyjną.
**Pliki**: Renderery czatu, parser, prompt, `useChat`, typy, endpoint obrazu i testy.
**Test**: Jest, TypeScript, build, Playwright z mockiem Gemini oraz ręczny test desktopowy.
**Ryzyko**: Save'y i IndexedDB muszą zachować zgodność z wcześniejszym formatem wiadomości.
