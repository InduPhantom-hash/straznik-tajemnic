## Research: Architektura testów i struktura plików
Data: 2026-07-29

### Obszar problemu
Testy jednostkowe (`npx jest`) oraz TypeScript (`npx tsc`) sypały błędami w głównym katalogu o braku plików konfiguracyjnych (m.in. `tsconfig.jest.json`).

### Zależności i Architektura Projektu (Odkrycie krytyczne!)
Wyszło na jaw, że główny katalog `src/` widoczny w korzeniu projektu jest **nieaktualnym reliktem (odpadem/backupem)**! 
Prawdziwa aplikacja (Source of Truth), nad którą aktualnie trwają prace deweloperskie i która jest kompilowana przez polecenie budowania, została w całości spakowana do ukrytego podkatalogu:
👉 `_tester/_base/.silnik/`

Zrobiono tak, aby gotowa paczka gry dostarczana na komputery graczy ukrywała całe środowisko programistyczne w folderze `.silnik`, eksponując jedynie proste skrypty "Uruchom gre.command".

Dlatego właśnie główny `package.json` ma tylko komendy `cd _tester/_base/.silnik && npm run build`. Główny `src/` przestał być w ogóle uaktualniany (brakuje w nim nowszych hooków, czy plików proxy) – modyfikowanie w nim czegokolwiek nie wpływa na grę.

### Istniejące testy
Pliki testowe oraz konfiguracje (np. `tsconfig.jest.json`) zostały poprawnie sklonowane lub utworzone wewnątrz `.silnik`. Zatem oficjalną ścieżką do uruchomienia testów lub builda jest uderzanie bezpośrednio z poziomu `.silnik/`, albo używanie globalnego delegata `npm test` po przejściu do tego katalogu.

### Ryzyka i uwagi
Modyfikacja wykonana w pierwotnym zablokowanym trybie /goal (jak i proponowana wcześniej w planie) uderzała w główny `src/lib/acquired-equipment.ts`, czyli edytowała tzw. "martwy kod". Właściwy plik znajduje się w:
`_tester/_base/.silnik/src/lib/acquired-equipment.ts`

### Rekomendowany następny krok
Zaktualizowanie planu modyfikacji – skierowanie edycji na poprawną ścieżkę wewnątrz katalogu `.silnik` oraz uruchomienie testów z poziomu tego katalogu.
