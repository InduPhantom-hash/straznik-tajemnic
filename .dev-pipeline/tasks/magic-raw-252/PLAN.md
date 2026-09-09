# Magia i tomiska CoC 7e RAW

## Cel

Zastąpić odłączony prototyp rytuałów deterministycznym systemem magii CoC 7e.
Kod ma być właścicielem stanu, kosztów, testów, czasu i skutków. Model MG dostaje
gotowy wynik do opisania, ale nie ustala wartości mechanicznych ani nie zmienia
stanu postaci samą narracją.

Plan realizuje zakres Issue #252. Poprawnym źródłem rozdziału zasad magii jest
rozdział 9 Księgi Strażnika, nie rozdział 8. Tomiska opisuje rozdział 11, a
zaklęcia rozdział 12. Szczegółowe warianty i wskazówki prowadzenia pochodzą z
Wielkiego Grymuaru oraz lokalnych poradników MG. Zapis realnej sesji służy jako
dowód potrzeb UX, nie jako źródło RAW.

## Decyzje architektoniczne

1. Jedynym źródłem prawdy dla wyniku mechanicznego jest `src/lib/magic`.
   Prompt MG i RAG nie mogą nadpisywać kosztu, czasu, testu ani skutku.
2. Definicja zaklęcia jest niezmienna i oddzielona od stanu badacza. Zawiera
   krótki opis mechaniczny, formuły, wymagania i dokładne pochodzenie. Nie
   zawiera długich fragmentów podręcznika.
3. Stan osobisty jest opcjonalnym, wersjonowanym polem `Character`. Aktywne
   rytuały i transakcje wieloosobowe należą do oddzielnego
   `SessionMagicState`, zapisywanego razem z sesją. Usunięcie inicjatora nie
   może osierocić rytuału ani historii jego kosztów.
4. UI nadaje trwały `commandId` przed pierwszą próbą. Atomowy reducer zapisuje
   mapowanie `commandId -> resolution` i wersję stanu wejściowego.
   `resolutionId` identyfikuje wynik, ale nie służy jako klucz ponowienia.
5. Koszty są transakcją atomową. Najpierw walidujemy aktora, znajomość
   zaklęcia, wymagania, cel i zasoby, następnie obliczamy wynik i dopiero potem
   zapisujemy wszystkie zmiany.
6. RAG dostarcza kontekst fabularny i odnośnik do źródła. Wartości mechaniczne
   pochodzą wyłącznie ze zwalidowanego katalogu. Brak definicji blokuje
   automatyczne rozstrzygnięcie i nie uruchamia zgadywania przez AI.
7. Interfejs nie pokazuje globalnego sklepu z czarami. W scenie pokazuje tylko
   zaklęcia poznane przez aktywnego badacza albo rytuał uruchomiony przez MG.
   Nazwa diegetyczna jest główna, a nazwa kanoniczna pomocnicza.
8. Mechanika ma działać bez sieci i bez wywołania modelu. Błąd narracji po
   rozstrzygnięciu nie cofa wyniku mechanicznego.

## Kontrakty danych

### Definicje źródłowe

- `MagicSourceRef`: stabilne ID źródła, tytuł, edycja, strona drukowana, strona
  PDF, język i wersja rekordu.
- `DiceFormula`: zwalidowana formuła obsługiwana przez wspólny roller. Nie
  przyjmujemy dowolnego tekstu ani `eval`.
- `SpellDefinition`: ID kanoniczne, nazwa techniczna, aliasy PL/EN, nazwy
  diegetyczne, koszt PM/SAN/POW/HP, czas, zasięg, czas trwania, wymagania,
  składniki, typowany cel, zasady wkładów uczestników, możliwość przerwania,
  wariant głębszy, `definitionVersion` i `MagicSourceRef`.
- `TomeDefinition`: ID, język i trudność językowa, czas wstępnej oraz pełnej
  lektury, CMI, CMF, MR, formuły SAN, lista możliwych zaklęć i źródło.
- Katalog odrzuca rekord bez źródła, z nieznaną formułą, ujemnym kosztem albo
  nieobsługiwanym typem testu.

### Stan badacza

- `CharacterMagicState.schemaVersion` zaczyna się od `1`.
- `belief`: `skeptic` albo `believer`, z datą i powodem zmiany.
- `knownSpells[spellId]`: źródło nauki, data, znany alias, status pierwszego
  rzucenia, odblokowany wariant głębszy oraz przypięta `definitionVersion`.
- `tomeStudies[tomeId]`: status wstępnej lektury, pełnej lektury, liczba
  powtórzeń, przepracowany czas, przyznane WMC/PMC, poniesiony SAN,
  `definitionVersion` oraz ostatni wynik reference check. Stan tomu nie
  przechowuje odroczonej straty SAN niewierzącego.

### Stan sesji

- `SessionMagicState.schemaVersion` zaczyna się od `1`.
- `activeCastings[castingId]`: przypięta definicja i jej wersja, inicjator,
  typowany cel, wkłady uczestników, faza, wymagany oraz przepracowany czas,
  opłacone koszty, warunki, stan przerwania i wynik.
- `commandLedger[commandId]`: wersja stanu wejściowego, status transakcji oraz
  pełny wynik. Powtórzona komenda zwraca zapisany wynik bez ponownej mutacji.
- Reducer przyjmuje stan sesji i mapę postaci, waliduje oczekiwaną wersję, a
  następnie zatwierdza wszystkie zmiany albo żadnej.
- Czas zapisujemy jako serializowany `GameTime` i liczymy wyłącznie jawne
  różnice. Cofnięcie zegara nie regeneruje PM ani nie cofa postępu nauki.

### Komendy i wyniki

- Nauka: `StartTomeReading`, `AdvanceTomeReading`, `ResolveInitialReading`,
  `ResolveFullStudy`, `ReferenceTome`, `LearnSpell`, `AcceptMythosBelief`.
- Rzucanie: `BeginCasting`, `JoinCasting`, `InterruptCasting`,
  `ResumeCasting`, `ResolveFirstCasting`, `PushFirstCasting`,
  `ResolveOpposedCasting`, `CompleteCasting`, `CancelCasting`,
  `AttemptSpontaneousMagic`.
- Każda komenda zawiera `commandId` i oczekiwaną wersję stanu. Każdy wynik
  zawiera `resolutionId`, jawne rzuty, zmiany PM/HP/SAN/POW,
  przesunięcie czasu, zmianę stanu, klucz komunikatu PL/EN i bezpieczny kontekst
  narracyjny dla MG.
- Losowość przechodzi przez wstrzykiwany roller, aby testy mogły podać
  deterministyczne wyniki.

## Zakres implementacji

### Faza 0 - bezpieczna baza i RAG

1. Przed edycją zapisać listę zmienionych plików. Obecny dirty worktree dotyka
   `types.ts`, `gm-protocol.ts`, parserów, `useChat`, komponentów czatu,
   obu stron aplikacji, `run-chat-pipeline.ts` i obu słowników. Implementacja
   nie może ruszyć, dopóki te zmiany nie zostaną
   zakończone albo jawnie przeniesione do izolowanego worktree wraz z aktualnym
   stanem roboczym.
2. `paths.ts` staje się jednym resolverem ścieżek. Rozdziela katalog
   dołączony tylko do odczytu od katalogu użytkownika do zapisu. Wybór jednej
   kanonicznej nazwy pod `Application Support` poprzedza niedestrukcyjna
   migracja albo odczyt starego katalogu `Straznik Tajemnic AI`; nie tworzymy
   równoległego, niewidocznego magazynu `ZewCthulhu`.
3. Launcher jawnie ustawia `ZEW_DATA_DIR`; resolver wyprowadza z niego
   prywatny katalog RAG. Jawne `RAG_DATA_DIR` pozostaje nadpisaniem testowym.
   Mechanika działa przy pustym RAG, ponieważ katalog mechaniczny żyje w kodzie.
4. Dodać test ścieżki źródłowej i test paczki potwierdzający, że runtime nie
   zależy od `/Volumes/Karta` ani worktree.
5. Retrieval zachowuje w wyniku ID źródła i stronę. Prompt odróżnia `rules`
   od `mythos`; materiał fandomowy nie może zasilać mechaniki.

### Faza 1 - domena i migracja stanu

1. Utworzyć `src/lib/magic/` z typami, walidatorem katalogu, normalizatorem
   starego stanu, rollerem formuł, resolverami oraz selektorami UI.
2. Dodać `Character.magic?: CharacterMagicState` i
   `FullGameSave.magicSession?: SessionMagicState`. Wszystkie wejścia
   `null`, `undefined`, stara tablica lub uszkodzona mapa przechodzą przez jeden
   normalizator. Nie używać `any` ani ślepych castów.
3. Rozszerzyć pełny zapis, hook zapisu, modal oraz API tak, aby zachowywały
   `SessionMagicState` i serializowany `GameTime`. Import przywraca oba stany
   przed wznowieniem rytuału albo naliczeniem regeneracji.
4. Udowodnić testem round-trip, że zapis zachowuje naukę, aktywny rytuał,
   `commandLedger`, `definitionVersion` i czas bez zmiany pozostałych danych.
5. Wprowadzić wersje obu schematów oraz migrację pustego stanu. Globalną wersję
   save zwiększyć tylko wtedy, gdy wymaga tego istniejący kontrakt migracji.

### Faza 2 - tomiska i nauka

1. Wdrożyć wstępną lekturę z czasem ustalanym przez MG, testem właściwego
   języka zależnym od wydania i możliwością automatycznego sukcesu. Porażka nie
   daje Mitów ani straty SAN; gracz może forsować albo kontynuować naukę.
   Badacz może studiować tylko jeden tom naraz.
2. Wdrożyć pełne studium, kolejne lektury z podwojeniem czasu oraz reference
   check trwający 1k4 godziny.
3. Rozdzielić WMC, PMC i MR. Jeśli bieżące Mity Cthulhu są niższe od MR, pełna
   lektura daje PMC; jeśli są równe lub wyższe, daje WMC. Wynik może przekroczyć
   MR.
4. Wdrożyć stan niewiary. Niewierzący zdobywa Mity i obniża maksymalny SAN, ale
   nie traci SAN za lekturę i nie może rzucać zaklęć. Gdy staje się wierzącym,
   jednorazowo traci SAN równy bieżącej wartości Mitów Cthulhu. Nie prowadzimy
   osobnego długu SAN dla tomów.
5. Nauka z tomu używa 2k6 tygodni i trudnego INT, od nauczyciela 1k8 dni i
   trudnego INT, a implantacja Mitów własnej procedury SAN oraz INT.
6. Porażka i forsowanie nauki są osobnymi stanami. Konsekwencja forsowania
   pochodzi z kontrolowanej tabeli, nie z dowolnej narracji AI.
7. Usunąć albo odłączyć `calculateStudyProgress` i drugi model `MythosBook`.
   Jedna definicja i jeden stan mają obsługiwać katalog, kartę postaci i UI.

### Faza 3 - rzucanie i zasoby

1. Pierwsze rzucenie wymaga trudnego POW i pobiera pełny koszt także przy
   porażce. Po porażce stan pozwala tylko forsować teraz lub później albo
   nauczyć się zaklęcia od nowa. Forsowanie ponownie pobiera koszt. Nieudane
   forsowanie wykonuje zaklęcie, pobiera dodatkowy koszt pomnożony przez 1k6 i
   stosuje kontrolowaną tabelę konsekwencji. Kolejne rzucenia nie wykonują
   testu rzucania.
2. Resolver pobiera PM, następnie brakujące PM zamienia na HP 1:1. Utrata HP
   przechodzi przez istniejące reguły ran, nieprzytomności i śmierci. Koszt SAN
   może sprowadzić SAN do zera. Koszt POW jest trwały i aktualizuje pochodne
   maksymalnych PM.
3. Test przeciwstawny POW jest osobnym etapem po udanym rzuceniu. Wynik celu
   nie zmienia faktu poniesienia wymaganych kosztów.
4. Zaklęcia natychmiastowe zwracają modyfikator inicjatywy `+50 DEX`; inne
   przechodzą przez rundy lub czas kampanii.
5. Każdy rozpoczęty rytuał zapisuje składniki, warunki miejsca i uczestników.
   Obrażenia, utrata SAN, odejście uczestnika albo działanie przeciwnika może
   wywołać deterministyczne sprawdzenie przerwania.
6. Regeneracja PM wynosi 1 PM za pełną godzinę czasu gry i nigdy nie przekracza
   bieżącego maksimum wynikającego z POW. Nadmiarowe PM można wydać, ale nie
   odrastają.
7. Anulowanie przed opłaceniem nie zmienia zasobów. Przerwanie po opłaceniu
   zachowuje koszty wskazane przez definicję. Brak celu, składnika albo aktora
   daje błąd domenowy i nie wykonuje częściowej aktualizacji.

### Faza 4 - głębsza i spontaniczna magia

1. Głębszy wariant rozpatrujemy po udanym rzuceniu zaklęcia podczas chwilowej
   albo czasowej niepoczytalności. Dopiero wtedy wykonujemy wymagany test
   Cthulhu Mythos i zapisujemy odblokowanie przy zaklęciu.
2. Magia spontaniczna wymaga jawnego zamiaru efektu, testu Cthulhu Mythos przy
   każdej próbie oraz kosztów wybranych przez MG z najbliższej zwalidowanej
   definicji. MG wybiera propozycję, ale kod wymaga zatwierdzenia kosztu przed
   rzutem i zapisuje podstawę porównania.
3. Magia spontaniczna ma osobną komendę forsowania. Przy działaniu przeciw
   postaci wykonuje test przeciwstawny Mity Cthulhu rzucającego kontra POW celu.
   Porażka nie korzysta z procedury pierwszego rzucenia poznanego zaklęcia.

### Faza 5 - czat, UI i narracja

1. Zastąpić `ritual-system.tsx` kartami sceny w czacie. Karta pokazuje aktora,
   nazwę diegetyczną, wymagania, jawne koszty, etap, uczestników i możliwe
   działania. Nie pokazuje arbitralnego procentu sukcesu.
2. Akcję rozpoczyna gracz albo kontrolowane narzędzie MG. AI nie może emitować
   kosztów ani gotowego wyniku w tagu. Po rozstrzygnięciu kod wysyła do
   standardowego kanału czatu bezpieczny raport mechaniczny i osobny kontekst
   do narracji.
3. Błąd lub przerwanie streamu narracji pozostawia wynik mechaniczny w stanie i
   pozwala ponowić wyłącznie opis. Nie wolno drugi raz pobrać kosztów.
4. `gm-protocol.ts` opisuje rolę MG: przygotowanie fikcji, sygnały komponentów,
   konsekwencje i styl grozy. Wprost zabrania wymyślania kosztów oraz
   samodzielnego oznaczania zaklęcia jako poznanego.
5. Nowy ukryty kontekst lub tag techniczny ma parser, czyszczenie widoku i TTS
   oraz test braku wycieku. Preferowany jest obiekt wyniku przekazywany przez
   kod, a nie nowy swobodny tag LLM.
6. Wszystkie komunikaty interfejsu trafiają równolegle do `pl.json` i
   `en.json`. Dane zapisane pozostają kanoniczne i niezależne od locale.
7. Hot Seat rozwiązuje aktora po stabilnym `characterId`. Brak adresata blokuje
   akcję; aktywna postać nie jest cichym fallbackiem dla rytuału drużynowego.

### Faza 6 - katalog i analiza przygody

1. Zastąpić przykładowe rekordy rytuałów zwalidowanymi definicjami z jawnie
   wskazanym źródłem. Do katalogu trafiają fakty mechaniczne i krótkie własne
   streszczenia, nie tekst podręcznika.
2. Przed włączeniem każdego rekordu dodać fixture RAW dla jego kosztu, czasu,
   testu, celu i szczególnych wymagań. Niezatwierdzony rekord pozostaje
   niedostępny w UI.
3. `CompendiumEntity` i analiza PDF mogą przechować znalezioną wzmiankę,
   alias, źródło i stronę, lecz nie tworzą definicji produkcyjnej. Wynik Gemini
   ma status `unverified` do czasu dopasowania do katalogu po kanonicznym ID.
4. Brak dopasowania wyświetla MG informację „brak zweryfikowanej mechaniki” i
   pozwala prowadzić wyłącznie opisowo, bez automatycznego pobierania zasobów.

### Faza 7 - dokumentacja i zamknięcie

1. Zaktualizować `docs/MAPA-POWIAZAN.md`: katalog -> resolver -> stan postaci ->
   karta czatu -> raport narracyjny -> save.
2. Dodać system Magii do `docs/SYSTEMS-CATALOG.md` ze statusem `stable` dopiero
   po niezależnej weryfikacji. Wcześniej ma status `draft` lub `partial`.
3. Issue zamknąć dopiero z linkami do testów RAW, testu save/load, artefaktów
   PL/EN i raportu niezależnego weryfikatora.

## Podział na kontrakty wykonawcze

Ten dokument jest planem nadrzędnym Issue #252. Kontraktu
`magic-raw-252` nie wolno uruchamiać przez `run --approved`. Przed
implementacją Issue wymaga podziału na osobne, zatwierdzane karty i lokalne
kontrakty:

1. Domena RAW i katalog definicji.
2. Tomiska, nauka i wiara.
3. Rzucanie, zasoby, zdrowie i czas.
4. Stan sesji, save/load, idempotencja i Hot Seat.
5. Karty UI i kontrakt narracyjny.
6. RAG, provenance oraz analiza przygody.
7. Desktop, migracja danych użytkownika i release.

Każdy kontrakt ma własną allowlistę, kryteria, testy i zgodę. Następny może
zależeć od interfejsów poprzedniego, ale nie może automatycznie przejąć jego
uprawnień.

## Dozwolone ścieżki planu nadrzędnego

- `.dev-pipeline/tasks/magic-raw-252/PLAN.md` na etapie planowania.
- Obecna allowlista `task.json` nie jest allowlistą implementacji. Kontrakty
  wykonawcze muszą objąć, zależnie od fazy, także:
  `src/lib/full-game-save-manager.ts`, `src/hooks/useFullSave.ts`,
  `src/components/ui/full-game-save-modal.tsx`,
  `src/app/api/game-save/route.ts`, `src/lib/time-manager.ts`,
  `src/lib/paths.ts`, obie strony aplikacji, właściwe helpery
  `src/app/api/chat`, testy save i zegara oraz ewentualnie
  `desktop/build-app.sh`.

## Poza zakresem

- Root `src/`, system walki, pościgu, zagrożeń, zdrowia i Poczytalności poza
  wywołaniem ich istniejących interfejsów.
- Przepisywanie ogólnego systemu kości, czasu albo save/load bez testu
  wykazującego brak potrzebnej możliwości.
- Kopiowanie materiałów źródłowych do repozytorium, pełne cytaty z podręcznika
  i publiczna dystrybucja niezweryfikowanych danych licencyjnych.
- Nowy system klas maga, poziomów, many fantasy, slotów czarów albo dowolnych
  procentów sukcesu nieobecnych w CoC 7e RAW.
- Commit, push, PR, merge, zmiana Issue, build aplikacji desktopowej i release
  bez osobnej zgody.

## Obsługa awarii

- Nieznane zaklęcie, błędna definicja lub brak źródła: brak rozstrzygnięcia i
  brak zmiany zasobów.
- Niepełny stan starego zapisu: normalizacja do pustych map z zachowaniem
  rozpoznanych rekordów; uszkodzone wpisy raportujemy, nie zgadujemy.
- Powtórzony `commandId`: zwrot zapisanego wyniku bez ponownej mutacji.
- Nieaktualna wersja stanu wejściowego: konflikt komendy bez częściowej zmiany.
- Brak PM: kontrolowana konwersja na HP; jeśli wymagany koszt przekracza
  dozwolony stan postaci, resolver zwraca jawny wynik zgodny z RAW zamiast
  ujemnych lub `NaN` zasobów.
- Brak składnika, celu, uczestnika albo wymaganej lokalizacji: rytuał nie
  startuje. Warunki nie są automatycznie dopowiadane przez model.
- Przerwanie streamu AI: stan mechaniczny zostaje zapisany; ponawiamy tylko
  narrację.
- Brak RAG lub klucza API: mechanika i UI działają offline; opis używa krótkiego
  komunikatu z katalogu.
- Konflikt z obecnymi zmianami użytkownika: implementacja zatrzymuje się przed
  pierwszą edycją wspólnego pliku. Nie używamy `checkout`, resetu ani
  automatycznego scalania.

## Kryteria akceptacji

- Kod deterministyczny, nie narracja AI, rozstrzyga naukę, rzucanie, koszty i
  stan magii zgodnie z CoC 7e RAW.
- Tomiska obsługują initial reading, full study, CMI, CMF, MR, kolejne lektury,
  reference check oraz belief bez utraty stanu po zapisie.
- Zaklęcia obsługują pierwsze rzucenie Hard POW, forsowanie, kolejne
  automatyczne rzucenia, PM do HP, SAN, trwałe POW, testy przeciwstawne, czas,
  składniki i przerwanie.
- Głębsza i spontaniczna magia mają osobne ścieżki RAW i nie używają swobodnej
  decyzji AI jako wyniku mechanicznego.
- RAG i dane zaklęć mają jawne źródło oraz stronę. Brak indeksu lub rekordu nie
  prowadzi do halucynowanej wartości.
- Desktop korzysta z katalogu danych użytkownika i działa po przeniesieniu
  aplikacji bez dostępu do worktree.
- Save/load zachowuje pełny stan postaci i sesji, aktywny rytuał, wersję
  definicji, czas gry i rejestr komend.
- UI działa dla solo i Hot Seat, ma parytet PL/EN i nie pokazuje technicznych
  tagów w widoku ani TTS.
- Odłączony prototyp oraz duplikat modelu księgi nie pozostają aktywnymi
  źródłami prawdy.
- Niezależny weryfikator potwierdza kod, testy RAW i artefakty ekranowe.

## Dokładne bramki weryfikacji

Wszystkie polecenia uruchamiamy z `_tester/_base/.silnik`.

1. Testy domeny RAW:
   `npx jest src/tests/unit/magic-engine.test.ts src/tests/unit/magic-tomes.test.ts src/tests/unit/magic-catalog.test.ts --runInBand`
2. Parser, idempotencja i zapis:
   `npx jest src/lib/parsers/mechanics-parser.test.ts src/tests/unit/magic-chat-integration.test.ts src/tests/unit/magic-save-roundtrip.test.ts --runInBand`
3. RAG i ścieżki desktopowe:
   `npx jest src/lib/vector-db/local-vector-store.test.ts src/lib/vector-db/retrieval-service.test.ts src/tests/unit/magic-rag-provenance.test.ts --runInBand`
4. Typy i słowniki:
   `npx tsc --noEmit`
   `npm run i18n:check`
5. Nawigacja:
   `npm run navigation:check`
   `npm run navigation:guard`
6. Celowany E2E w PL i EN, pojedynczy worker:
   `CI=1 npx playwright test tests/e2e/magic-raw.spec.ts --project=chromium --workers=1`
   E2E używa testowego adaptera rzutów uruchamianego wyłącznie w trybie testów,
   aby stabilnie odtworzyć porażkę, forsowanie i wyniki przeciwstawne.
7. E2E musi pokryć: naukę z tomu, zmianę wiary, pierwsze rzucenie i forsowanie,
   kolejne rzucenie bez testu, konwersję PM na HP, trwały POW, test
   przeciwstawny, przerwanie rytuału grupowego, save/reload oraz brak RAG.
8. Odczytać ręcznie zrzuty PL i EN dla karty zaklęcia, rytuału drużynowego,
   błędu wymagań i wznowienia po reloadzie. Zielony test bez odczytu obrazów nie
   stanowi akceptacji UI.
9. Po bramkach celowanych uruchomić pełne bramki projektu:
   `npm test -- --runInBand`
   `npm run lint`
   `npm run qa`
   Po każdej bramce sprawdzić `git status --short`, ponieważ `pretest` może
   wygenerować pliki poza allowlistą. Nowy albo zmieniony plik poza kontraktem
   zatrzymuje próbę.
10. `npm run build`, zimny start i `desktop/build-app.sh --rebuild` należą do
    osobnej bramki release po zgodzie użytkownika. Nie są dowodem planowania ani
    nie uruchamiają się automatycznie.

## Kolejność zatwierdzania

1. Niezależny architekt ocenia granice domeny, model stanu, idempotencję,
   zgodność RAW i promień zmian.
2. Product Owner zatwierdza UX: karta sceny zamiast globalnej listy, jawność
   nazw kanonicznych oraz sposób zatwierdzania kosztu magii spontanicznej.
3. Po decyzjach PO trzeba utworzyć osobne karty i kontrakty wykonawcze.
   Nadrzędny `magic-raw-252` pozostaje nieuruchamialnym planem programu.
4. Każdy kontrakt wykonawczy może rozpocząć `run --approved` dopiero po
   usunięciu konfliktu dirty worktree i zapisaniu raportu architekta.
5. Implementacja przebiega fazami 0-7. Każda faza kończy się testami celowanymi;
   awaria nie otwiera automatycznie zakresu następnej fazy.
