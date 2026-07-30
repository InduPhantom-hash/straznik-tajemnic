## Research: Onboarding Etap 0.5 (Wybór Trybu Startu)
Data: 2026-07-30
Stack: Next.js App Router, React, Tailwind CSS (główny kod znajduje się w izolowanym środowisku `_tester/_base/.silnik/src/`)

### Obszar problemu
Głównym zadaniem jest spięcie przycisków na nowym, czystym "Ekranie Startowym" z odpowiednimi ścieżkami logiki startowej. Zidentyfikowano następujące pliki odpowiedzialne za problem:

- `_tester/_base/.silnik/src/components/chat/welcome/index.tsx` (WelcomeScreen) - ekran pojawiający się na start przy braku aktywnej sesji gry, na którym renderowany jest `StartModeCards`.
- `_tester/_base/.silnik/src/components/chat/welcome/components/start-mode-cards.tsx` (StartModeCards) - komponent z przyciskami "Szybka Przygoda" oraz "Ustawienia Ręczne".
- `_tester/_base/.silnik/src/app/page.tsx` - rdzeń aplikacji nasłuchujący zdarzenia `onQuickStart` oraz `onChoosePlayMode`.
- Ewentualny, powiązany `<QuickSetupModal>` (uruchamiany zmienną stanu `quickSetupOpen`), za pośrednictwem którego gracz wybierze gotową przygodę.

### Zależności
Zbadaliśmy przepływ danych w obu ścieżkach:

1. **Ustawienia Ręczne (Manual Setup):**
   - Po kliknięciu "Ustawienia Ręczne" w `StartModeCards`, wywoływany jest callback `onManualStart()`, bindowany do `onChoosePlayMode` w `page.tsx`.
   - Zmienia to flagę `setShowHotSeatSetup(true)`, co otwiera istniejący formularz pozwalający skonfigurować sesję po staremu (wybór ilości graczy, zdefiniowanie własnej postaci z archetypów, wgranie PDF).

2. **Szybka Przygoda (Quick Setup):**
   - Po kliknięciu otwierany jest `<QuickSetupModal>` (lokalny stan modalu ulega zmianie na `true`).
   - Finalne kliknięcie (start gry w tym modalu) zwraca wywołanie `onQuickStart(adventureId, characterId1, mode, characterId2)`.
   - Funkcja `handleQuickStart` w `page.tsx` odnajduje wybraną przygodę z predefiniowanych zbiorów (np. `STREFA_11_ADVENTURES`) oraz postacie z `PREDEFINED_CHARACTERS`, po czym przekazuje gotowe struktury `AdventureContext` oraz `Character` i uruchamia grę (inicjując `HotSeatConfig` jeśli trzeba i odpalając hook `useGameStart.ts`).

Do uruchomienia gry `useGameStart.ts` wymaga spójnych typów: kontekstu przygody (m.in. era, tone, hook) oraz pełnych postaci (str, dex, ekwipunek, HP, SAN itp). Modele JSON znajdziemy w `data/adventures/predefined/`.

### Istniejące testy
Testy E2E znajdują się w katalogu `tests/` i zostały wczoraj zaktualizowane pod nowy ekran.
- **`homepage.spec.ts`:** Sprawdza statyczną strukturę. Oczekuje, że na stronie głównej pojawią się teksty "Witaj, Badaczu Tajemnic", linki nawigacji ("Pulpit", "Postacie") oraz dwa nowe kafelki: "Szybka Przygoda" i "Ustawienia Ręczne".
- **`feature-2-game-start.spec.ts`:** Mniej restrykcyjny test mockujący API `/api/**`. Ważna uwaga — oczekuje obecności cytatu "H.P. Lovecraft" w stopce (WelcomeScreen rendering proxy) podczas startu, bez wycieków starych struktur z Next.js, oraz chroni przed awarią typu `Application error`.

### Ryzyka i uwagi
1. **Działamy w martwej gałęzi:** Pamiętaj, aby pliki edytować WYLĄCZNIE w katalogu `_tester/_base/.silnik/src/`. Edycja w root directory (`/src/`) jest modyfikacją "starego/martwego" kodu.
2. **Kruchość testów:** Modyfikacje WelcomeScreen nie mogą usunąć cytatów użytych w testach E2E jako wskaźniki pomyślnego renderowania ani linków w bocznej nawigacji. E2E nie przetestuje całej głębokości wyboru postaci dla Szybkiej Przygody, robią tylko dymny test.

### Rekomendowany następny krok
Problem jest jasny i znane są powiązane komponenty, co pozwala na zaplanowanie wdrożenia i spięcie komponentu `<QuickSetupModal>` (stworzenie go lub uzupełnienie jeśli jest puchem) dla "Szybkiej Przygody" i upewnienie się, że obiekty trafiające do `handleQuickStart` formują się prawidłowo, a testy nie pękają.

Należy uruchomić: `/dev-2-plan`
