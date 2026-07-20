# Roadmap rozwoju Strażnika Tajemnic

Roadmapa opisuje docelową wersję aplikacji lokalnej. Aplikacja działa na komputerze użytkownika, przechowuje stan gry i indeks wiedzy lokalnie, a z siecią łączy się tylko przez jawnie wybrane integracje.

## Zasady architektury

- lokalny RAG jest jedynym docelowym magazynem wiedzy i pamięci gry;
- Pinecone nie jest potrzebny i nie jest częścią docelowego planu;
- save'y, postacie, dziennik, mapy, audio i indeksy są przechowywane lokalnie;
- Google AI jest zewnętrznym dostawcą generowania tekstu, embeddingów, obrazów i opcjonalnie TTS;
- API danych świata są dodatkami: ich brak nie może uniemożliwić rozpoczęcia ani kontynuowania gry;
- każda integracja zewnętrzna musi mieć timeout, komunikat błędu i lokalny fallback;
- tryb bez sieci powinien nadal pozwalać na pracę z zapisanymi materiałami i lokalnym stanem gry, o ile funkcja nie wymaga modelu Google.

## Etap 0 - bezpieczny system aktualizacji aplikacji

Aktualizacja dotyczy wyłącznie kodu i artefaktów aplikacji. Nie może nadpisywać danych użytkownika.

### Programistyczne

- [ ] Ustalić źródło wydań - GitHub Releases - oraz publiczny format manifestu aktualizacji: wersja, platforma, URL, rozmiar, checksum i data wydania.
- [ ] Dodać okresowe sprawdzanie nowej wersji z kontrolą timeoutu, cache'em i możliwością wyłączenia automatycznego sprawdzania.
- [ ] Pokazywać graczowi informację o nowej wersji z przyciskiem „Pobierz i zaktualizuj”.
- [ ] Pobierać aktualizację do katalogu tymczasowego, sprawdzać checksum i odrzucać niepełny lub zmieniony plik.
- [ ] Wykonywać backup przed aktualizacją: save'y, lokalny RAG, pamięć sesji, postacie, ustawienia i lokalne assety.
- [ ] Stosować atomową podmianę wersji albo katalogów wersji, tak aby przerwane pobieranie nie uszkodziło działającej aplikacji.
- [ ] Przekazać aktualizację do launchera `.app`, zamknąć serwer, podmienić kod, uruchomić nową wersję i ponownie otworzyć aplikację.
- [ ] Oddzielić katalog kodu aplikacji od katalogu danych użytkownika.
- [ ] Dodać migracje formatu save'ów, ustawień, indeksu RAG i pamięci sesji z wersją schematu.
- [ ] Zapewnić rollback do poprzedniej wersji po nieudanym starcie lub błędzie migracji.
- [ ] Dodać testy: brak sieci, brak miejsca, przerwane pobieranie, zła suma kontrolna, przerwanie restartu, migracja i rollback.

### Nieprogramistyczne

- [ ] Ustalić politykę wydań i numerowania wersji.
- [ ] Ustalić, czy aktualizacje są tylko sugerowane, czy krytyczne wersje mogą wymagać aktualizacji.
- [ ] Przygotować komunikaty dla gracza i politykę prywatności dla sprawdzania wydań.
- [ ] Ustalić minimalny okres przechowywania poprzedniej wersji i backupów.
- [ ] Zweryfikować dystrybucję ZIP/.app oraz uprawnienia systemowe macOS i Windows.

Zależności: stabilny układ katalogów danych, wersjonowanie schematów i działający launcher. System aktualizacji nie może zależeć od Google AI ani od Pinecone.

## Stan bazowy - zrealizowane

- Konstytucja, Ustawy i Uchwały dla MG.
- Pacing, style Noir/Pulp/Klasyczny i bodźce motywacyjne.
- Deterministyczne rzuty i progi CoC 7e po stronie kodu.
- Lokalny import PDF, chunking, embeddingi i indeks `data/rag/`.
- Namespace'y lokalnego RAG: `rules`, `adventures`, `mythos`.
- Save/load sesji, dziennik, postacie i tryb Hot Seat.
- Katalog i selektor własnych przygód.
- Integracje danych świata: część endpointów Daylight, Prices i Historical News.

## Etap 1 - domknięcie sesji

### Programistyczne

- [ ] Obsłużyć komendę `[KONIEC_SESJI]` jako osobny stan aplikacji, a nie zwykłą wiadomość gracza.
- [ ] Dodać protokół odpowiedzi `[KONIEC_SESJI:POTWIERDZENIE]`.
- [ ] Ograniczyć wygaszanie do 1-2 tur i zablokować przypadkowe dalsze wysyłanie wiadomości.
- [ ] Po potwierdzeniu wykonać pełny autosave i pokazać stan „sesja bezpiecznie zamknięta”.
- [ ] Dodać testy jednostkowe i E2E dla solo, Hot Seat, błędu API i przerwanego streamu.

### Nieprogramistyczne

- [ ] Ustalić, co dokładnie oznacza „koniec sesji”: cliffhanger, streszczenie, wskazówki do wznowienia.
- [ ] Ustalić komunikaty UX i zachowanie przy niedostępnym Google AI.

Zależności: istniejący save system i stabilny kontrakt promptu MG.

## Etap 2 - lokalny pipeline przygody

### Programistyczne

- [ ] Uporządkować lokalny pipeline PDF: ekstrakcja -> chunking -> embedding -> lokalny indeks.
- [ ] Dodać stabilny identyfikator przygody i izolację jej namespace'u w lokalnym RAG.
- [ ] Rozszerzyć analizę PDF o NPC, lokacje, przedmioty, mapy i handouty w JSON.
- [ ] Zapisywać metadane i assety przygody lokalnie razem z save'em.
- [ ] Zbudować lokalny fallback dla danych świata oraz cache ostatnich wyników.
- [ ] Usunąć z aktywnego runtime'u nieużywane wywołania Pinecone i cloud storage po osobnym audycie.

### Nieprogramistyczne

- [ ] Zdefiniować schemat danych przygody, NPC, lokacji i handoutów.
- [ ] Ustalić, które źródła historyczne są dozwolone i wystarczająco wiarygodne.
- [ ] Określić zakres Encyklopedii Zwyczajów i presetów epok.

Zależności: decyzja o lokalnym RAG jako jedynym docelowym magazynie; nie zależy od Pinecone.

## Etap 3 - immersja i dowody

### Programistyczne

- [ ] Wyświetlanie map z lokalnym zapisem w ekwipunku.
- [ ] Odtwarzacz MP3/audio z lokalnym zapisem w Dzienniku Dowodów.
- [ ] Włączanie danych Daylight, Prices i Historical News do kontekstu MG tylko wtedy, gdy są dostępne.
- [ ] Dodać oznaczenie źródła danych i daty pobrania.
- [ ] Dodać cache i tryb „brak danych zewnętrznych”.

### Nieprogramistyczne

- [ ] Przygotować mapy, nagrania i handouty bez naruszania praw autorskich.
- [ ] Zdefiniować, które dane świata są potrzebne do konkretnej epoki i scenariusza.

Zależności: lokalny model assetów i lokalny save. Integracje zewnętrzne są opcjonalne.

## Etap 4 - tworzenie przygód i Quick Start

### Programistyczne

- [ ] Zdefiniować model sceny, węzła, przejścia i stanu przygody.
- [ ] Zbudować Adventure Creator Engine generujący JSON/Markdown z 3-4 założeń gracza.
- [ ] Dodać walidację grafu i bezpieczny fallback do liniowej przygody.
- [ ] Zintegrować graf z deterministycznym stanem gry, save/load i lokalnym RAG.
- [ ] Dodać rejestr presetów epok i światów.
- [ ] Dodać Quick Start z gotowym bohaterem, assetami i pierwszą sceną.

### Nieprogramistyczne

- [ ] Opracować presety epok, w tym lata 90. i 2000.
- [ ] Przygotować i przetestować pierwszą gotową przygodę, np. „Oczy z Klisz”.
- [ ] Zweryfikować prawa do wszystkich treści i materiałów startowych.
- [ ] Przeprowadzić playtesty tempa, czytelności i stabilności grafu.

Zależności: presety i model przygody -> generator -> Quick Start -> playtesty.

## Etap 5 - PL/EN

### Programistyczne

- [ ] Wprowadzić warstwę i18n dla interfejsu.
- [ ] Przenieść teksty UI do słowników PL/EN.
- [ ] Dodać angielski Master Prompt i mapowanie tagów systemowych.
- [ ] Zweryfikować wyszukiwanie angielskich materiałów w lokalnym RAG.

### Nieprogramistyczne

- [ ] Ustalić terminologię PL/EN dla mechaniki, UI i tagów.
- [ ] Przetłumaczyć i zredagować UI oraz prompt MG.
- [ ] Przygotować legalny angielski materiał testowy do RAG.

Zależności: decyzja o terminologii -> i18n UI i prompt EN -> testy angielskiego RAG.

## Tematy usunięte z roadmapy

- Indeksowanie przygód w Pinecone.
- Pinecone jako pamięć sesji.
- Wymagany cloud storage dla NPC, lokacji, timeline'u lub save'ów.
- Zewnętrzna baza danych jako warunek działania aplikacji.

## Zasada aktualizacji danych użytkownika

Aktualizacja może zmienić kod, zależności i zasoby aplikacji. Nie może usuwać ani nadpisywać bez migracji:

- `data/saves/`;
- `data/rag/`;
- lokalnego profilu launchera i `localStorage`/IndexedDB;
- ustawień AI i kluczy API;
- postaci, dziennika, assetów i pamięci sesji.

Jeżeli w kodzie nadal występują te elementy, traktujemy je jako dług techniczny do audytu i usunięcia, a nie jako przyszłą funkcję produktu.
