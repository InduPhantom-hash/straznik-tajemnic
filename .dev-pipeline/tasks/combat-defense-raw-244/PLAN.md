# Narracyjna obrona w walce wręcz CoC 7e RAW

## Status planu

- Rewizja po niezależnym przeglądzie architektury: gotowa do ponownego zatwierdzenia.
- Implementacja nie może wystartować, dopóki `task.json` nie dostanie rozszerzonej allowlisty i dopóki równoległe prace chase/hazard nie zostaną zakończone albo odizolowane w osobnym worktree.
- Źródła RAW: <https://cthulhuwiki.chaosium.com/rules/combat.html> oraz <https://cthulhuwiki.chaosium.com/rules/hit-points-wounds-and-healing.html>.

## Cel

Naprawić aktywny przepływ obrony przed atakiem wręcz tak, aby gracz podejmował jedną krótką decyzję fabularną, a kod deterministyczny wykonywał całe rozstrzygnięcie CoC 7e RAW. Model MG opisuje zagrożenie i konsekwencje, ale nie wybiera reakcji gracza, nie podaje statystyk, nie rzuca kośćmi i nie zmienia HP.

Sekwencja UX:

`zagrożenie -> Unik albo Kontratak -> rozstrzygnięcie -> zmiana stanu -> narracja MG`

Kolejność DEX, numer rundy, licznik reakcji i stan starcia pozostają ukryte. Kontrakt nie wprowadza mapy, siatki, punktów ruchu, kolejki jednostek ani panelu w stylu turowej gry strategicznej.

## Decyzje architektoniczne

### 1. Historia wiadomości jest trwałym ledgerem

- Wiadomość asystenta przechowuje zwalidowane `pendingMeleeAttacks`.
- Wiadomość gracza utworzona po zamknięciu kolejki rundy przechowuje dokładnie jedną tablicę `CombatResolution[]` w `mechanicsContext.combat`; każdy `eventId` występuje w niej najwyżej raz.
- `useChat` transportuje i zapisuje dane, ale nie utrzymuje drugiej kopii HP, numeru rundy ani liczników. `ChatWindow` wyprowadza najstarszy nierozstrzygnięty atak przez złożenie historii po `eventId`.
- `eventId` tworzy kod jako `${assistantMessageId}:melee:${ordinal}`. Model nie podaje ID zdarzenia, starcia ani rundy.
- Jedna kompletna odpowiedź MG jest jedną ukrytą rundą obronną. Wszystkie tagi ataków z tej odpowiedzi dostają `roundId = assistantMessageId` i trafiają do kolejki według kolejności tagów.
- Gracz rozstrzyga kolejkę modal po modalu. Kolejny atak na tę samą postać w tej samej kolejce dostaje premię za przewagę liczebną. Dopiero po rozstrzygnięciu wszystkich tagów powstaje jedna wiadomość gracza z tablicą `CombatResolution[]` i jedno zbiorcze żądanie narracji do MG.
- Następna odpowiedź MG rozpoczyna kolejną rundę. Prompt wymaga, aby MG umieścił wszystkie nadchodzące ataki z danej rundy w jednej odpowiedzi. Enricher grupuje tagi po `npcId` i odrzuca tagi przekraczające `NPC.combatProfile.attacksPerRound` albo wskazujące atak spoza listy tego NPC.
- Brak tagów kończy rundę bez kolejki. Zmiana sceny albo jawny koniec walki zamyka ledger starcia. Nie istnieje modelowy `ROUND_ADVANCE` ani licznik rundy podawany przez LLM.
- Odświeżenie odtwarza nierozstrzygnięty modal z historii. Istniejący `CombatResolution` blokuje ponowny rzut, zmianę HP i naliczenie reakcji.

### 2. Model wskazuje uczestników, a nie mechanikę

- Kanoniczny tag ma dokładnie postać: `[ATAK_WRĘCZ: napastnik=<npcId> | cel=@<dokładne imię> | atak=<attackOptionId> | zamiar=<krótki opis>]`.
- Tag nie przyjmuje statystyk, HP, Build, formuły obrażeń, rzutu, stopnia sukcesu, numeru rundy ani wyniku. Obecność takiego pola odrzuca zdarzenie.
- API dostaje pełną listę aktualnych NPC z `gm_npcs`. `build-context` przekazuje modelowi dozwolone identyfikatory NPC, imiona celów i `attackOptionId` z profili NPC. W duecie każda postać ma jawne `characterId` i imię w ukrytym kontekście systemowym.
- Serwer rozwiązuje `npcId` do jednego zapisanego NPC. Build i premię do obrażeń wylicza z `STR + SIZ`, HP bierze z NPC, a atak wyłącznie z wersjonowanego `NPC.combatProfile`.
- `NPC.combatProfile` zawiera `schemaVersion: 1`, `attacksPerRound`, `attackOptions` i opcjonalne `armorTemplateIds`. Opcja sprzętowa przechowuje `attackOptionId`, `equipmentTemplateId` oraz `combatSkillId`; wartości broni hydratuje katalog, a próg testu pochodzi z `NPC.skills`. Opcja naturalna przechowuje `attackOptionId`, nazwę, kanoniczny `combatSkillId`, jawny `skillValue`, formułę i klasę obrażeń, ponieważ nie ma odpowiednika w katalogu przedmiotów.
- Atak bez broni jest jawną naturalną opcją profilu NPC z formułą `1d3 + DB`; nie powstaje automatycznie dla brakującego profilu. Nieznany profil, atak spoza listy, brak umiejętności albo niejednoznaczny cel zatrzymują zdarzenie. Nie ma wartości domyślnych 25%, Build 0 ani `1d3` dla nierozpoznanej broni.
- `PendingMeleeAttack` powstaje dopiero po serwerowym wzbogaceniu. Model nigdy nie tworzy tego obiektu.

### 3. Katalog jest jedynym źródłem broni i pancerza

- `EquipmentTemplate` dostaje opcjonalny, wersjonowany `combatProfile`; nie powstaje druga tabela w `weapon-context`.
- Profil broni zawiera kanoniczne `combatSkillId`, `damageFormula` i `damageClass: impaling | non_impaling`. Liczba ataków nigdy nie należy do broni, tylko do `NPC.combatProfile`.
- Profil pancerza w tym zadaniu zawiera `armorValue`, `coverage: full` i `protectsAgainst: all | melee`. Częściowy pancerz oraz lokacje trafienia pozostają poza zakresem, bo obecny model danych i wskazane źródła RAW nie definiują kompletnej procedury ich automatycznego stosowania.
- Egzemplarz ekwipunku dziedziczy profil wyłącznie przez `templateId`. Przedmiot bez profilu nie daje mechanicznej ochrony ani ataku, nawet jeśli nazwa brzmi podobnie. Nie ma heurystyk nazw ani sumowania pola `bonus` jako pancerza.
- Pełny pancerz działa bez rzutu lokacji. Uszkodzony lub zepsuty przedmiot nie chroni.
- Postać gracza wskazuje pancerz przez `EquipmentItem.templateId`. NPC wskazuje wyłącznie `NPC.combatProfile.armorTemplateIds`. Wartość i zastosowanie zawsze hydratuje katalog; NPC nie przechowuje kopii liczb.
- Brak referencji do pełnego pancerza jest jawnym stanem `unarmored`. Brak lub niezgodny wpis katalogowy nie daje ochrony i zapisuje kontrolowaną diagnostykę.

### 4. Stan NPC podczas starcia jest wyprowadzany z ledgera

- Bazowy stan NPC pochodzi z `gm_npcs`.
- Obrażenia zadane NPC przez Kontratak zapisuje `CombatResolution`. Bieżące HP NPC jest wynikiem złożenia rezultatów tego samego napastnika w historii, więc przeżywa odświeżenie bez drugiej mutowalnej kopii w modalu.
- Kontekst kolejnej odpowiedzi MG dostaje wyprowadzone HP i stan NPC.
- Synchronizacja końcowego HP z panelem NPC pozostaje poza zakresem. W ramach sesji i narracji autorytatywny jest ledger walki.

### 5. Aktualizacja badacza jest transakcyjna

- Przed pierwszym modalem `commitCombatRound` tworzy write-ahead journal z `roundId`, kryptograficznym `roundSeed`, pełną kolejką, stanem rosteru przed rundą, pustymi wyborami i pustymi wynikami.
- Kliknięcie ustawia synchroniczną blokadę `eventId`, zapisuje wybór reakcji do journalu przed obliczeniem i dopiero potem uruchamia resolver.
- Resolver działa jako czysta redukcja `latestParty -> nextParty + resolution`. Wszystkie rzuty korzystają z deterministycznego PRNG wyprowadzonego z `roundSeed + eventId + rollKind`, więc restart po zapisanym wyborze odtwarza identyczny wynik. Testy wstrzykują kontrolowane seed/RNG.
- `persistCharacters` zwraca jawny wynik `ok | error` zamiast połykać oba błędy zapisu. Asynchroniczne odkładanie obrazów pozostaje poza transakcją HP.
- Po każdym modalu kod zapisuje do journalu wybór, gotowy `CombatResolution`, absolutny `nextRoster` i listę pozostałych eventów, a dopiero potem pokazuje wynik i przechodzi do następnego modalu.
- Po ostatnim modalu journal przechodzi z `resolving` do `committing` i zawiera finalny roster oraz gotową wiadomość rundy. Kod zapisuje roster i historię, oznacza journal jako `committed`, aktualizuje stan React, wysyła API, a po przyjęciu lokalnych zapisów usuwa journal.
- Recovery zawsze wykonuje roll-forward, nigdy rollback: `resolving` odtwarza zapisane wyniki i absolutny `nextRoster`, przelicza identycznie event z zapisanym wyborem bez wyniku i otwiera pierwszy event bez wyboru; `committing` lub `committed` ponownie zapisuje finalny roster i wiadomość po stabilnych ID, bez duplikatów, po czym kontynuuje albo ponawia ten sam request.
- Przy błędzie dowolnego zapisu nie ma requestu. Journal zostaje do deterministycznego roll-forward przy następnym starcie.
- `nextParty`, aktywna postać i wiadomość z tablicą `CombatResolution[]` trafiają do stanu i magazynu dokładnie raz przed żądaniem API.
- Żądanie dostaje jawnie `nextCharacter`, `nextCharacters` i tę samą tablicę `CombatResolution[]`; nie czyta HP z opóźnionego stanu React.
- Błąd sieci pozostawia zapisany wynik i HP. Ponowienie wysyła ten sam wynik, ale nigdy nie rzuca ponownie.
- Przy starcie `useChat` wykonuje opisany roll-forward journalu, następnie składa historię wyników po `eventId` i rekoncyliuje roster wartościami absolutnymi `hpAfter` oraz flagami zdrowia. Nie odejmuje ponownie obrażeń. Crash po dowolnym modalu nie umożliwia rerollu ani ponownej utraty HP.

### 6. Jawna bramka mechanik

- Tagi walki są instruowane, parsowane i wykonywane wyłącznie, gdy `sessionZero.mechanics.schemaVersion === 1`, `enabled === true` i tryb narracji nie jest `pure_narrative`.
- Brak pola `mechanics`, nieznana wersja, `enabled === false` i `pure_narrative` oznaczają mechanikę wyłączoną. Nie ma legacy fallbacku do `true`.
- `full_rpg` i `story_priority` różnią tempo narracji, ale uruchamiają modal tylko po jawnie włączonej mechanice.

## Zakres funkcjonalny

### 1. Parser, streaming i brak wycieku tagu

- Rozszerzyć typy parsera o surową referencję ataku i wzbogacony `PendingMeleeAttack`.
- Parser wymaga dokładnego zestawu pól i odrzuca nieznane pola.
- `useChat` przed każdym żądaniem odczytuje świeży snapshot `gm_npcs` z localStorage, waliduje tablicę przez type guard i przesyła go do API. Wadliwy magazyn daje pustą listę oraz kontrolowaną diagnostykę.
- `run-chat-pipeline` waliduje mechanics gate oraz przekazuje `createSseStream` snapshot NPC, postaci i katalogowy enricher.
- `createSseStream` po pełnym `parseAIResponse` wzbogaca referencje, nadaje im `assistantMessageId`, `roundId` i ordinal, a potem wysyła `PendingMeleeAttack[]` wyłącznie jako metadane. `useChat` przypina je do tej samej wiadomości asystenta.
- Bufor streamingu nie przekazuje do renderowania ani TTS fragmentu zaczynającego się od `[ATAK_WRĘCZ:` aż do domknięcia `]`. Pełny i niedomknięty tag usuwa też historia, display cleanup i TTS.
- Duplikat metadanych, wznowienie streamu i podwójne `onText` nie tworzą drugiego zdarzenia.

### 2. Reakcje zgodne z RAW

- Modal udostępnia wyłącznie `Unik` i `Kontratak`.
- Unik używa umiejętności Unik. Remis stopni sukcesu chroni obrońcę.
- Kontratak używa właściwej specjalizacji Walki dla wybranej broni. Remis stopni sukcesu wygrywa napastnik.
- UI pokazuje wybór legalnej broni dopiero po wybraniu Kontrataku. Atak bez broni pozostaje jawną opcją.
- Broń wymagająca innej specjalizacji nie może użyć Bijatyki po cichu.
- Manewr bojowy pozostaje akcją inicjującą i nigdy nie występuje jako reakcja.
- Rzutów walki nie można forsować.

### 3. Rozstrzygnięcie, obrażenia i zdrowie RAW

- Jedno potwierdzenie pojedynczego modalu wykonuje rzut ataku, obrony i, tylko gdy wymagany, automatyczny test CON po Ciężkiej Ranie. Kolejka rundy nie wysyła żądania do MG pomiędzy modalami.
- Resolver obsługuje asymetrię remisów, pancerz, premię do obrażeń, sukces ekstremalny, Przebicie oraz przewagę liczebną.
- Flaga broni ma wartości `impaling | non_impaling`. Sam fakt, że broń jest tnąca, nie nadaje Przebicia.
- Kontratak, także przy sukcesie ekstremalnym, zadaje zwykłe losowane obrażenia.
- Formuły kości są normalizowane z polskiego `K` do wewnętrznego `d`. Parser akceptuje wyłącznie `NdM`, opcjonalny modyfikator liczbowy i osobną premię DB. Niepoprawna formuła nie daje cichego zera.
- Ciężka Rana powstaje przy obrażeniach co najmniej `ceil(maxHp / 2)`.
- Ciężka Rana wymaga testu CON; porażka ustawia nieprzytomność.
- 0 HP bez Ciężkiej Rany oznacza nieprzytomność bez umierania.
- 0 HP przy aktywnej Ciężkiej Ranie oznacza nieprzytomność i umieranie.
- Pojedynczy cios równy lub większy niż maksymalne HP oznacza natychmiastową śmierć. UI musi rozróżniać śmierć od samego `hp === 0`.
- `Character` dostaje trwałe `isDead?: boolean`. `isDead === true` blokuje dalsze akcje; `hp === 0` z `isDead !== true` pozostaje stanem nieprzytomności albo umierania. Hydracja starszych zapisów nie uznaje automatycznie każdego `hp === 0` za śmierć.
- HP nie spada poniżej zera.
- Pierwszy atak wręcz na postać w rundzie jest normalny. Każdy kolejny po Uniku lub Kontrataku dostaje jedną kość premiową dla napastnika. Nowa runda zeruje licznik. Reguła nie obejmuje broni palnej.

### 4. Raport i narracja MG

- `CombatResolution` zapisuje: `eventId`, `roundId`, uczestników, reakcję i broń, rzuty i stopnie sukcesu, bonus przewagi, zwycięzcę, obrażenia surowe/pancerz/efektywne, HP przed i po, Ciężką Ranę, test CON, nieprzytomność, umieranie i śmierć.
- Raport UI pokazuje reakcję, oba rzuty, wynik, obrażenia, zmianę HP i skutki zdrowotne.
- `buildAdditionalContext` przekazuje MG ten sam wynik jako fakt. Model opisuje konsekwencję, ale go nie przelicza ani nie zmienia HP.
- Narracja przechodzi do następnego punktu napięcia bez tabeli inicjatywy, listy jednostek i rekomendacji najlepszego ruchu.
- `[COMBAT]` korzysta z tego samego zdarzenia, resolvera, ledgera i raportu. Może używać jawnego profilu demonstracyjnego, ale nie osobnej ścieżki.
- Tryb `pure_narrative` nie generuje ani nie wykonuje zdarzeń mechanicznych.

### 5. UI i dostępność

- Modal pokazuje napastnika, zagrożenie, broń oraz wartości Uniku i legalnego Kontrataku badacza. Nie pokazuje procentów napastnika ani kalkulacji najlepszego wyboru.
- Usunąć etykiety `niskie ryzyko` i `wysokie ryzyko`; użyć neutralnego opisu konsekwencji.
- Użyć istniejących prymitywów dialogu: tytuł dostępnościowy, `aria-modal`, pułapka fokusu, klawiatura i blokada tła.
- Escape nie rozstrzyga ataku i nie zamyka nierozstrzygniętego modalu bez jawnego potwierdzenia.
- Widok oczekiwania, wybór broni i raport działają na mobile i desktop.
- Wszystkie nowe teksty mają parytet PL/EN. Identyfikatory mechanik i specjalizacji pozostają niezależne od języka.

## Interfejsy

### `MeleeAttackReference`

- `attackerNpcId: string`
- `targetCharacterName: string`
- `attackOptionId: string`
- `intent: string`

### `PendingMeleeAttack`

- `eventId: string`
- `roundId: string`
- `attacker: { id; name; build; hp; maxHp; armor; attackSkill; damageBonus }`
- `target: { characterId; name }`
- `weapon: { catalogId; name; damageFormula; damageClass }`
- `intent: string`
- `ordinal: number`

### `CombatResolution`

- Pełny niezmienny zapis opisany w sekcji raportu.
- Opcjonalny `conCheck` tylko przy Ciężkiej Ranie.
- `schemaVersion: 1` dla migracji zapisanych sesji.

### `Message.mechanicsContext`

- Zachowuje obecne `chase`.
- Dostaje `combat?: { resolutions: CombatResolution[] }`.
- Wiadomość asystenta dostaje `pendingMeleeAttacks?: PendingMeleeAttack[]`.
- Jedna wiadomość gracza zamykająca rundę zapisuje wszystkie `resolutions` tej kolejki, bez pośrednich żądań sieciowych.

## Zachowanie awaryjne

- Brak NPC, statystyki, celu, umiejętności albo broni pokazuje lokalny komunikat i nie wykonuje rzutu.
- Zniknięcie broni badacza przed potwierdzeniem wraca do wyboru legalnej broni.
- Nieudany zapis postaci blokuje wysłanie narracji do MG i pozwala ponowić zapis tego samego wyniku bez rerollu.
- Nieudane API pozostawia wynik lokalnie i daje opcję ponowienia narracji.
- Nierozstrzygnięty modal po odświeżeniu wraca; nie nalicza reakcji ani obrażeń.
- Nieznany `schemaVersion` nie jest wykonywany i daje kontrolowany błąd.

## Wymagana korekta allowlisty przed `run --approved`

Obecna allowlista jest niewystarczająca. Należy dodać co najmniej:

- `_tester/_base/.silnik/src/lib/types.ts`
- `_tester/_base/.silnik/src/lib/combat/weapon-context.ts`
- `_tester/_base/.silnik/src/lib/character/derived-stats.ts`
- `_tester/_base/.silnik/src/lib/equipment-catalog.ts`
- `_tester/_base/.silnik/src/lib/equipment-data.ts`
- `_tester/_base/.silnik/src/lib/equipment-catalog.test.ts`
- `_tester/_base/.silnik/src/lib/combat/npc-combat-profile.ts`
- `_tester/_base/.silnik/src/lib/combat/npc-combat-profile.test.ts`
- `_tester/_base/.silnik/src/lib/chat-history-sanitizer.ts`
- `_tester/_base/.silnik/src/lib/character-cloud-sync.ts`
- `_tester/_base/.silnik/src/lib/character-cloud-sync.test.ts`
- `_tester/_base/.silnik/src/lib/combat/combat-transaction.ts`
- `_tester/_base/.silnik/src/lib/combat/combat-transaction.test.ts`
- `_tester/_base/.silnik/src/hooks/useCharacterManagement.ts`
- `_tester/_base/.silnik/src/hooks/useCharacterManagement.test.tsx`
- `_tester/_base/.silnik/src/components/chat/narrative/cleanup.ts`
- `_tester/_base/.silnik/src/components/chat/narrative/cleanup.test.ts`
- `_tester/_base/.silnik/src/components/chat/chat-window/components/message-card.tsx`
- `_tester/_base/.silnik/src/components/ui/character-manager.tsx`
- `_tester/_base/.silnik/src/app/page.tsx`
- `_tester/_base/.silnik/src/app/[locale]/page.tsx`
- `_tester/_base/.silnik/src/hooks/useChat.test.tsx`
- `_tester/_base/.silnik/src/components/chat/chat-window/index.test.tsx`
- `_tester/_base/.silnik/src/lib/chat-history-sanitizer.test.ts`
- `_tester/_base/.silnik/src/lib/ai-settings/types.ts`
- `_tester/_base/.silnik/src/lib/ai-settings/storage.test.ts`
- `_tester/_base/.silnik/src/app/api/chat/_helpers/resolve-settings.test.ts`

Jeżeli preflight wykaże potrzebę innego pliku, implementacja zatrzymuje się i wraca do korekty zakresu. Nie wolno obchodzić allowlisty przez casty ani duplikację typu lub stanu.

## Poza zakresem

- Taktyczna mapa, siatka, zasięg w polach, punkty akcji i jawna kolejka DEX.
- Ataki inicjowane przez gracza, osobny modal manewru, broń palna, nurkowanie za osłonę, pościgi i zagrożenia środowiskowe.
- Pancerz częściowy, losowanie lokacji trafienia i ochrona inna niż pełny pancerz przeciwko obrażeniom wręcz.
- Przebudowa historycznego `combat-system.tsx` i `combat-utils.tsx`.
- Trwała synchronizacja obrażeń NPC z panelem zarządzania NPC.
- Release desktopowy, commit, push, PR, merge i zmiana statusu Issue.

## Testy i bramki

### Testy celowane

- Resolver: macierz Uniku/Kontrataku, remisy, ekstremalny Kontratak, impaling/non-impaling, pancerz, nieparzyste maxHP, test CON, 0 HP w obu wariantach, natychmiastowa śmierć, przewaga liczebna i normalizacja `K/d`.
- Parser/stream: dozwolony tag, nieznane pola, próba podania wyniku/statystyk, brak NPC, nieznany cel, duet, duplikat metadanych i niedomknięty tag. Test integracyjny prowadzi prawdziwe dane przez `parseAIResponse -> enricher -> createSseStream metadata`, bez mockowania połączeń wewnętrznych.
- `useChat`: double-click, stale closure, replay po błędzie, refresh, dokładnie jeden zapis HP, jeden request, jawne `nextCharacter/nextCharacters`, `pure_narrative` i ponowienie bez rerollu.
- Bramka ustawień: `full_rpg` i `story_priority` z `enabled=false/true`, `pure_narrative`, brak pola mechanics i nieznana wersja.
- Runda: dwa ataki na jedną postać w jednej odpowiedzi, ataki na dwie postacie, wiele legalnych ataków NPC, przekroczenie `attacksPerRound`, atak spoza profilu, sekwencyjna kolejka, bonus dopiero od kolejnej obrony i jeden zbiorczy request po zamknięciu kolejki.
- Persistencja: jawny błąd localStorage, brak requestu po błędzie zapisu, crash przed i po każdym modalu oraz w każdej fazie commit, identyczny wynik z seed, roll-forward i idempotentna rekonsyliacja wartościami `hpAfter`.
- `ChatWindow`: najstarszy nierozstrzygnięty event, wybór legalnej broni, niedostępny Escape, focus trap i raport skutków zdrowotnych.
- Sanitizer/cleanup/TTS: pełny i częściowy tag nigdy nie trafia do UI, historii API ani syntezy mowy.
- E2E Playwright PL/EN z zamockowanym API i wstrzykniętym RNG: Unik, Kontratak, drugi atak w rundzie, duet, zmiana HP, identyczny `CombatResolution`, brak tagu, `console` i `pageerror`.
- Cztery stabilne zrzuty: PL/EN przed wyborem i po wyniku. Weryfikator musi je otworzyć i ocenić.

### Polecenia

- `npx jest src/tests/unit/combat-defense.test.ts src/tests/unit/cheat-engine.test.ts src/lib/parsers/mechanics-parser.test.ts src/lib/parsers/text-cleaner.test.ts src/components/chat/narrative/cleanup.test.ts src/lib/chat-history-sanitizer.test.ts src/hooks/useChat.test.tsx src/components/chat/chat-window/index.test.tsx src/app/api/chat/_helpers/create-sse-stream.test.ts src/app/api/chat/_helpers/__tests__/build-context.test.ts --runInBand`
- `npx tsc --noEmit`
- `npm run i18n:check`
- `npm run navigation:check`
- `CI=1 npx playwright test tests/e2e/combat-defense.spec.ts --project=chromium --workers=1`
- Odczyt czterech zapisanych zrzutów.
- Po testach celowanych: `npm test -- --runInBand`, `npm run lint`, `npx tsc --noEmit`, `npm run navigation:check` i testy UI profilu.
- Bramka końcowa wymaga niezależnego wewnętrznego weryfikatora Codex. Nie wolno wysyłać kodu, diffu ani zrzutów do zewnętrznego modelu bez zgody PO.

## Kryteria akceptacji

- Zwalidowany atak wręcz MG otwiera modal dokładnie raz i daje wyłącznie Unik lub Kontratak.
- Model nie podaje statystyk ani wyniku. Kod bierze dane z postaci, NPC i katalogu, wykonuje rzuty i zapisuje dokładnie jeden `CombatResolution` na `eventId`.
- HP i stany badacza oraz ledger HP napastnika są spójne po odświeżeniu, błędzie sieci i ponowieniu narracji.
- Reguły remisów, Kontrataku ekstremalnego, Przebicia, Ciężkiej Rany, CON, nieprzytomności, umierania, śmierci i przewagi liczebnej przechodzą testy RAW.
- Manewr nie występuje jako reakcja.
- UI zachowuje tempo narracyjne, dostępność, parytet PL/EN i nie pokazuje technicznego tagu ani interfejsu taktycznego.
- Wszystkie celowane i pełne bramki są zielone, zrzuty obejrzane, a niezależny wewnętrzny weryfikator wydał `passed`.
