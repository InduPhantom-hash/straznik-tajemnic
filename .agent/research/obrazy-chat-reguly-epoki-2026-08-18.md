# Research: obrazy czatu, reguły generowania i spójność epok

Data: 2026-08-18
Status: gotowe do `/dev-2-plan`

## Cel

1. Naprawić przycinanie obrazów w czacie.
2. Zagwarantować 1-3 obrazy dla każdej sceny, w której zachodzi istotne zdarzenie wizualne.
3. Zaplanować audyt wszystkich kanałów generowania obrazów pod kątem zgodności z epoką.

## Mapowanie

### Źródła prawdy

- `src/components/chat/narrative/render-narrative-with-images.tsx` renderuje obrazy Markdown w narracji, w tym obraz otwarcia przygody.
- `src/components/chat/chat-window/components/message-card.tsx` renderuje obrazy z `message.generatedImages`.
- `src/hooks/useGameStart.ts` uruchamia niezależnie obraz startowej lokacji i umieszcza go jako obraz Markdown w treści wiadomości.
- `src/lib/prompts/image-instructions.ts` instruuje MG, kiedy ma emitować tagi `[SCENA:]` i `[PORTRET:]`.
- `src/lib/parsers/media-parser.ts` parsuje tagi do `ImageRequest`.
- `src/hooks/useChat.ts` stosuje cooldown, limit na scenę i zleca `/api/imagen`.
- `src/app/api/imagen/route.ts` wzbogaca prompt o profil epoki i blokady anachronizmów.
- `src/lib/era-visual-style.ts` jest aktualnym centralnym resolverem profilu wizualnego epoki.

### Stan testów przed zmianą

- `npm test -- --runInBand src/lib/era-visual-style.test.ts src/lib/equipment-catalog.test.ts src/lib/equipment-prompt-builder.test.ts`
- Wynik: 3 zestawy, 15 testów - wszystkie zaliczone.
- `npx tsc --noEmit` - zaliczone bez błędu.

## Obszar problemu

### 1. Kadrowanie w czacie

- `render-narrative-with-images.tsx:83-87` wymusza `aspect-[16/9] object-cover object-top` dla każdego obrazu Markdown.
- `message-card.tsx:208-210` wymusza `aspect-[16/9] object-cover object-top` dla każdej sceny z `generatedImages`.
- `object-cover` w sztywnej proporcji kadruje obraz źródłowy. `object-top` tylko przesuwa punkt kadrowania do góry, nie zachowuje całego obrazu.
- Generator Gemini nie otrzymuje obecnie faktycznie przekazywanego parametru proporcji obrazu - `/api/imagen/route.ts:82-84` nie odczytuje `aspectRatio`, a request Gemini nie zawiera konfiguracji proporcji. Zatem nawet gdy klient deklaruje `16:9`, rezultat może mieć inną proporcję.
- Obraz otwarcia w `useGameStart.ts:237-245` jest Markdownem, więc trafia do pierwszego, panoramicznego renderera. To bezpośrednio wyjaśnia oba zrzuty.

### 2. Częstotliwość obrazów

- Prompt wspiera trzy poziomy częstotliwości: `image-instructions.ts:17-35` i `:81-114`.
- Poziom „często” prosi model o obrazy dla nowej lokacji, ważnego NPC i dramatycznej sceny, ale nie definiuje minimum na scenę i nie obejmuje wyraźnie ważnego przedmiotu.
- Parser rozpoznaje tylko typy `scene` oraz `portrait`: `media-parser.ts:21-23`.
- `useChat.ts:773-813` ma limit 3 obrazów na scenę, lecz:
  - scena jest utożsamiana wyłącznie z aktualną lokacją,
  - licznik resetuje się po odebraniu metadanych, więc przy zmianie lokacji jest opóźniony o jedną turę,
  - cooldown 20-90 sekund blokuje generację także dla pierwszego obowiązkowego kadru nowej sceny,
  - do generatora trafia najwyżej pierwszy tag z odpowiedzi: `slice(0, 1)`,
  - kod nie śledzi, które rodzaje obowiązkowych kadrów już powstały.
- Efekt: obecna logika wyłącznie ogranicza obrazy. Nie gwarantuje ani minimum jednego, ani pokrycia ważnego NPC, przedmiotu i punktu zwrotnego.

### 3. Spójność epokowa

- `era-visual-style.ts:36-83` poprawnie rozróżnia lata 80., w tym rok 1983.
- `era-visual-style.ts:119-145` wstrzykuje zakazy iPhone'ów, smartfonów, powerbanków, ekranów dotykowych oraz współczesnych samochodów dla 1983.
- `equipment-prompt-builder.ts:116-139` dodaje ścisły opis telefonu właściwy dla epoki oraz te same blokady.
- `useGameStart.ts:204-224`, `useChat.ts:479-500`, `npc-manager.tsx:172-192`, `location-manager.tsx:112-123` przekazują epokę do generatora.
- `summarize-scene/route.ts:149-176` wymaga w promptach dziennika opisu zgodnego z przekazaną epoką.
- Część historycznej specyfikacji `spec-audit-image-rendering-and-era-consistency.md` opisuje problemy już naprawione w kodzie. Nie może być traktowana jako aktualny plan bez odświeżenia.
- Aktywny `/api/imagen` używa wyłącznie `gemini-2.5-flash-image`. Część testów i dokumentacji nadal opisuje dawny łańcuch Vertex → Replicate → Gemini.
- `AdventureContext.yearRange` może zawierać zakres, np. `1983-1999`. Prompt obrazu wybiera dziś pierwszy rok zakresu, a nie rok bieżący w grze. Kampania obejmująca kilka lat może więc utracić zgodność technologii po upływie czasu fabularnego.
- W danych trzeba rozstrzygnąć konflikt: scenariusz PRL 1973-1974 i część danych gotowych postaci Strefy 11 mogą zawierać szczegóły z późniejszych epok.

## Decyzje do planu

### D1. Kontrakt wyświetlania

- Obraz w czacie ma być zawsze pokazany w całości.
- Dla scen: szerokość kontenera 100%, wysokość naturalna, `h-auto`, bez `aspect-ratio` i bez `object-cover`.
- Dla portretów: pionowa rama `3:4`; preferowane `object-contain` z tłem, a nie kadrowanie twarzy.
- Lightbox pozostaje miejscem pełnego, powiększonego podglądu.
- Wspólny komponent lub wariant `ChatImage` musi obsłużyć zarówno Markdown, jak i `generatedImages`, aby reguły nie rozjechały się ponownie.

### D2. Model sceny i minimalna liczba obrazów

- „Scena” = wejście do nowej znaczącej lokacji albo zmiana stanu fabularnego oznaczona przez MG, nie sam tekst nazwy lokacji.
- Każda scena dostaje osobny `sceneId` i rejestr wygenerowanych kadrów.
- Minimum: 1 obraz ustanawiający scenę.
- Maksimum: 3 obrazy na scenę.
- Kolejność obowiązkowych kandydatów:
  1. nowa znacząca lokacja - kadr ustanawiający,
  2. pierwsze pojawienie się ważnego NPC albo istoty - portret,
  3. ważny przedmiot, odkrycie albo punkt zwrotny - detal przedmiotu lub scena akcji.
- W jednej odpowiedzi nadal generujemy najwyżej jeden obraz, aby nie blokować lektora i nie mnożyć kosztu. Kolejne obowiązkowe kadry powstają przy następnych turach sceny.
- Cooldown nie może blokować pierwszego wymaganego kadru nowej sceny.
- Wyłączenie generowania obrazów w ustawieniach zachowuje pierwszeństwo nad regułą minimum.

### D3. Typy tagów i dane

- Rozszerzyć typ obrazu z `portrait | scene` o `location | item | event | creature` albo dodać do niego pole `trigger`.
- Tagi MG muszą przekazywać typ i identyfikator podmiotu, aby klient wiedział, czy dany NPC/przedmiot został już zwizualizowany.
- Zachować zgodność ze starymi tagami `[SCENA:]` i `[PORTRET:]`.
- Opcjonalny, rekomendowany format: `[OBRAZ: typ=location; id=...; priorytet=required|optional; opis=...]` - parser może nadal obsłużyć stare tagi jako `optional`.

### D4. Audyt epok

- Utworzyć jedną tabelę kanałów renderowania i dla każdego sprawdzić: źródło epoki, typ promptu, przekazanie `era`, guardrails, proporcję, test.
- Kanały obowiązkowe:
  1. obraz intro,
  2. scena i portret w czacie,
  3. NPC manager,
  4. location manager,
  5. kreator badacza i portrety,
  6. miniatury i zdobywane przedmioty,
  7. podsumowanie sceny i dziennik,
  8. ręczne regeneracje i cache.
- Jeden resolver epoki pozostaje źródłem profilu wizualnego. Nie tworzyć drugiego równoległego mapowania.
- Źródłem roku dla promptu ma być aktualny czas gry (`timeManager`), a nie pierwszy rok `AdventureContext.yearRange`. Zakres przygody zostaje tylko fallbackiem dla nowej sesji.
- Audyt ma objąć również aktualność dokumentacji i testów względem jedynego aktywnego providera Gemini.
- Dodać testy kontraktowe dla co najmniej: 1895, 1925, 1946, 1974, 1983, 1995, 2004, współczesności.
- Testy powinny sprawdzać także przekazanie epoki do endpointu, nie tylko tekst zwracany przez resolver.

## Blast Radius

### Kod do modyfikacji

- `src/components/chat/narrative/render-narrative-with-images.tsx`
- `src/components/chat/chat-window/components/message-card.tsx`
- `src/hooks/useChat.ts`
- `src/lib/constants/chat.ts`
- `src/lib/prompts/image-instructions.ts`
- `src/lib/parsers/media-parser.ts`
- `src/lib/parsers/types.ts`
- `src/lib/types.ts`
- `src/app/api/imagen/route.ts`

### Kod do weryfikacji bez domyślnej zmiany

- `src/hooks/useGameStart.ts`
- `src/hooks/useEquipmentThumbnails.ts`
- `src/lib/equipment-prompt-builder.ts`
- `src/lib/equipment-catalog.ts`
- `src/lib/era-visual-style.ts`
- `src/components/ui/npc-manager.tsx`
- `src/components/ui/location-manager.tsx`
- `src/app/api/summarize-scene/route.ts`
- `src/lib/persistent-media-cache.ts`
- `src/hooks/useFullSave.ts`
- `src/components/ui/full-game-save-modal.tsx`

### Testy do dodania lub rozszerzenia

- `src/lib/parsers/media-parser.test.ts`
- nowy test jednostkowy polityki obrazów sceny
- testy komponentowe obu rendererów czatu
- test integracyjny `useChat` dla: wymaganego pierwszego kadru, limitu 3, resetu sceny i nieblokowania przez cooldown
- test endpointu `/api/imagen` dla przekazania proporcji, typu oraz strażników epokowych
- test przekazania faktycznego roku gry do każdego kanału renderu oraz regresję dla kampanii przechodzącej między dekadami
- testy i dokumentacja nie mogą deklarować nieistniejących fallbacków obrazów
- Playwright: nowa scena, NPC, przedmiot, punkt zwrotny oraz brak przycięcia obrazu źródłowego

## Dokumentacja do aktualizacji po implementacji

- `docs/MAPA-POWIAZAN.md` - mapa nie zgadza się już z aktualnym modelem dostawcy obrazów i częścią ścieżek.
- `docs/adr/ADR-002-imagen-primary-provider.md` oraz testy E2E - opis aktywnego Gemini zamiast historycznego łańcucha fallbacków.
- `state.md` - tracker zawiera nieaktualne statusy i stare ścieżki.
- `zadania.md` - nowe zadanie z zależnościami faz.
- `CHANGELOG.md` - po wdrożeniu.
- `README.md` i `docs/USER_GUIDE.md` - jeśli zmieni się zachowanie widoczne dla gracza.
- Prompt mastera, tylko jeśli do jego treści trafi nowy format tagu. Wtedy synchronizacja kopii `public/default-gm-prompt.md` jest obowiązkowa.

## Proponowana kolejność wdrożenia

1. Naprawa wspólnego renderera i testy brakującego kadrowania.
2. Wprowadzenie modelu sceny i polityki 1-3 obrazów bez generowania kosztownych obrazów w testach.
3. Rozszerzenie tagów, parsera i integracji `useChat`.
4. Audyt wszystkich kanałów epoki oraz testy kontraktowe.
5. Testy E2E z mockiem `/api/imagen`, typy, pełny zestaw testów oraz ręczny przegląd na desktopie.
6. Aktualizacja dokumentacji zgodnie z rzeczywistym kodem.

## Rekomendowany następny krok

`/dev-2-plan` dla jednego zadania: „Obrazy scen: pełny kadr, reguła 1-3 i audyt epok”.

Przed rozpoczęciem implementacji warto uruchomić `/zew-update`, bo mapa powiązań i tracker projektu zawierają nieaktualne informacje o architekturze obrazów.
