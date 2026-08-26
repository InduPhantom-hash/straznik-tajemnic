# Kontrakt Wykonawczy: Etap 6 - Translacja Głównego Interfejsu (Grupa 1) - v3

**Projekt:** Strażnik Tajemnic AI
**Zadanie:** Ekstrakcja i internacjonalizacja (i18n) ciągów znaków Głównego Interfejsu
**Stack:** Next.js + `next-intl`
**Lokalizacja Kodu:** `_tester/_base/.silnik`

## 1. Kontekst Zadania
Celem questa jest przygotowanie kluczowych komponentów Głównego Interfejsu (UI) do pełnej obsługi wielojęzyczności w oparciu o bibliotekę `next-intl`. Aplikacja posiada już pliki konfiguracyjne (`messages/pl.json`, `messages/en.json`), a część z komponentów używa hooka `useTranslations()`. Zadanie polega na zlokalizowaniu i przeniesieniu pominiętych, twardo zakodowanych (hardcoded) polskich ciągów znaków z elementów renderowanych dla użytkownika końcowego.

## 2. Zakres Zmian (Scope) i Architektura Namespace'ów
Zmiany obejmują folder `_tester/_base/.silnik/src/components`. Zakomentowany kod jest poza zakresem i nie podlega tłumaczeniu.

### A. CthulhuSidebar (`sidebar/CthulhuSidebar.tsx`)
- **Namespace:** `Sidebar`
- **Wykryte braki i wytyczne:**
  - Wynieść twarde teksty, np. `"Zew Cthulhu 7ed"` (linia ok. 306).
  - Statyczne badge jak `"NEW"` podpiąć pod i18n (np. klucz `newBadge`).
  - Przeskanować pod kątem surowych tekstów w tagach JSX oraz atrybutach `title` / `aria-label`. Zignoruj teksty w zakomentowanym kodzie.

### B. Chat Header (`chat/chat-window/components/chat-header.tsx`)
- **Namespace:** `ChatHeader`
- **Wytyczne:** Komponent już korzysta z `t('defaultTitle')`. Zadbaj jedynie o to, by przy ewentualnych złożeniach (np. znak `·` dla lokalizacji) zachować neutralność gramatyczną bez tworzenia polskich łączników na sztywno.

### C. Message Input (`chat/chat-window/components/message-input.tsx`)
- **Namespace:** `MessageInput`
- **Wytyczne:** Zrewidować tooltipy (`title="…"`) i upewnić się, że stosowana jest prawidłowa interpolacja zmiennych z `next-intl` (np. `t('waiting', { name: player.name })`). Brak polskich ciągów ma obejmować wszystkie widoczne elementy dla gracza.

### D. Welcome Screen i Podzespoły (`chat/WelcomeScreen.tsx` + `chat/welcome/`)
- **Namespace:** Główny plik używa `WelcomeScreen`. UWAGA: Dla subkomponentów współdzielonych, takich jak `start-mode-cards.tsx`, **nie wymuszaj globalnego namespace'u** `WelcomeScreen`. Zastosuj elastyczne dziedziczenie lub dedykowane klucze (np. zachowaj współdzielony namespace z grupy `Onboarding`), aby nie popsuć istniejącej struktury kluczy logicznych.
- **Wykryte braki i wytyczne:**
  - W pliku `bottom-links.tsx` należy przetłumaczyć na sztywno zakodowane akcje: **"Opcje zaawansowane"**, **"Wczytaj zapis"**, **"Klucze API"**, **"Zimny start"**.

### E. Manual Setup Panel (`chat/welcome/components/manual-setup-panel.tsx`)
- **Namespace:** `ManualSetupPanel`
- **Wytyczne:** Rewizja opcji formularzy i placeholderów.

## 3. Wytyczne Implementacyjne (Dla Wykonawcy)
1. **Edycja Słowników (`messages/`):**
   - Dodaj nowe klucze do `messages/pl.json` oraz natychmiast uzupełnij o ich odpowiedniki w `messages/en.json`.
2. **Konwencja Kluczy:** Format *camelCase* bez spacji (np. `advancedOptions`).
3. **Walidacja Struktury JSON:**
   - Wykonawca musi uruchomić lub napisać szybki skrypt walidacyjny, który maszynowo upewni się, że oba pliki `messages/pl.json` oraz `messages/en.json` posiadają **identyczne drzewo kluczy**. Niespójności w strukturze wykluczają zamknięcie zadania.
4. **Zero-Assumption Debugging:**
   - Wykonaj kompilację typu sprawdzającego: `npx tsc --noEmit` po zmianach.
5. **Dane Dynamiczne i Komentarze:**
   - Zakaz używania surowych polskich stringów **dotyczy wyłącznie tekstu renderowanego do HTML** (widocznego dla gracza jako teksty i tooltipe). 
   - Polskie znaki mogą i będą pojawiać się w danych dynamicznych pochodzących od Mistrza Gry, strukturach bazy danych czy komentarzach deweloperskich. Nie próbuj ich internacjonalizować. Zignoruj też w pełni zakomentowany kod TSX.

## 4. Kryteria Zakończenia (Dla Audytora)
- [ ] Zmodyfikowano wszystkie komponenty wymienione w sekcji 2. Utrzymano bezpieczeństwo współdzielonych kluczy (brak bezwzględnego nadpisywania namespace'ów).
- [ ] Zastosowano maszynową walidację plików JSON weryfikującą ich zgodność 1:1.
- [ ] Brak polskich liter i wyrazów umieszczonych na stałe jako widoczny ciąg renderowany użytkownikowi.
- [ ] Kod źródłowy przechodzi bez błędów sprawdzenie za pomocą komendy `npx tsc --noEmit`.
- [ ] Wygenerowano twarde screenshoty testów E2E w Playwright na dowód poprawności, w tym weryfikację braku regresji dla języka polskiego. Artefakty muszą zostać zapisane dokładnie we wskazanych ścieżkach:
  - `_tester/_base/.silnik/test-results/main-ui-en.png` (Wersja EN)
  - `_tester/_base/.silnik/test-results/main-ui-pl.png` (Wersja PL)
