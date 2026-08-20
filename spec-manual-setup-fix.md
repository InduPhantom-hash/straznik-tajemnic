# Specyfikacja Naprawy: Pętla Ustawień Ręcznych (Manual Setup Loop Fix)

## 1. Problem (Diagnoza)
Gracz wchodzi na ekran startowy (`WelcomeScreen`), klika kafel "Ustawienia Ręczne", pojawia się modal wyboru trybu ("🎮 Tryb gry", Solo/Duet) z przyciskiem "🎮 Rozpocznij". Po kliknięciu "Rozpocznij", modal zamyka się, a gracz zostaje cofnięty do ekranu z dwoma kaflami ("Szybka Przygoda" i "Ustawienia Ręczne"), ponieważ:
1. `WelcomeScreen` po kliknięciu "Ustawienia Ręczne" jedynie otwiera modal `HotSeatSetup` zamiast przełączyć ekran powitalny w widok ręcznej konfiguracji sesji.
2. W `HotSeatSetup` przycisk nosi mylącą nazwę "🎮 Rozpocznij" i po kliknięciu jedynie zapisuje nazwy graczy oraz zamyka modal, nie uruchamiając gry ani nie prowadząc do wyboru scenariusza i postaci.
3. `WelcomeScreen` nie posiadał widoku wyboru scenariusza, tworzenia/wyboru postaci oraz finalnego przycisku "Rozpocznij Grę" dla trybu manualnego.

## 2. Plan Wdrożenia

### A. Komponent Ustawień Ręcznych (`ManualSetupPanel`) i rozszerzenie `WelcomeScreen`
1. W `_tester/_base/.silnik/src/components/chat/welcome/types.ts`:
   - Dodać `activeCharacter?: Character | null` do `WelcomeScreenProps`.
2. Utworzyć dedykowany, klimatyczny komponent `_tester/_base/.silnik/src/components/chat/welcome/components/manual-setup-panel.tsx`:
   - Art Déco styling spójny z makiem Dark Art Déco (złote ramki, font `Cinzel` / `Special Elite`, narożniki déco).
   - Przycisk "← Wróć do wyboru trybu" przełączający z powrotem na kafle startowe.
   - **Krok 1: Tryb gry (Solo / Duet)**:
     - Wyświetla aktualny tryb i imiona graczy.
     - Przycisk "Zmień tryb" wywołujący `onChoosePlayMode` (modal `HotSeatSetup`).
   - **Krok 2: Scenariusz (Przygoda)**:
     - Wyświetla aktualnie wybraną przygodę (`adventureTitle` lub "Nie wybrano przygody").
     - Przycisk `hasAdventure ? "Zmień przygodę" : "Wybierz przygodę"` wywołujący `onSelectAdventure`.
   - **Krok 3: Badacz / Badacze**:
     - Dla Solo: Jeśli postać wybrana (`hasCharacter` i `activeCharacter`), pokazuje miniaturowy portret `SafeImage`, imię, profesję oraz przyciski "Zmień postać", "Stwórz nową", "Z katalogu". Jeśli brak postaci: 3 przyciski ("Stwórz nową postać", "Wybierz gotową postać", "Wybierz z katalogu").
     - Dla Duetu (`isDuet`): Wyświetla 2 sloty dla Gracza 1 i Gracza 2 z przypisaną postacią lub statusem "Brak postaci" i dedykowanymi przyciskami per gracz.
   - **Krok 4 (opcjonalny): Sesja Zero**:
     - Wyświetla status Sesji Zero i przycisk jej uruchomienia (`onSessionZero`).
   - **Krok 5: Przycisk "Rozpocznij Grę"**:
     - Jeśli `hasAdventure` i `hasCharacter`: aktywny, pulsujący złoto-szmaragdowy przycisk wywołujący `onStartGame`.
     - Jeśli niegotowe: wyszarzony z podpowiedzią, czego brakuje do startu.
3. W `_tester/_base/.silnik/src/components/chat/welcome/index.tsx`:
   - Dodać stan `isManualMode: boolean` (domyślnie `false`).
   - Jeśli `isManualMode === false`: renderować `StartModeCards` (z zachowaniem `onQuickStart` oraz `onManualStart={() => setIsManualMode(true)}`).
   - Jeśli `isManualMode === true`: renderować `ManualSetupPanel` z przyciskiem `onBack={() => setIsManualMode(false)}`.
4. W `_tester/_base/.silnik/src/components/chat/chat-window/index.tsx`:
   - Przekazać `activeCharacter={activeCharacter}` do `<WelcomeScreen />`.

### B. Poprawka Etykiety w `HotSeatSetup`
1. W `_tester/_base/.silnik/src/components/ui/hot-seat-setup.tsx`:
   - Zmienić tekst przycisku akcji z `"🎮 Rozpocznij"` na `"Zatwierdź tryb"`, aby było jasne, że modal konfiguruje graczy przed wejściem do wyboru postaci/przygody.

## 3. Weryfikacja (Checker)
- Uruchomienie `npx tsc --noEmit` w `_tester/_base/.silnik`.
- Uruchomienie `npm test` w `_tester/_base/.silnik` (wszystkie 48+ suitów musi przejść na zielono).
- Uruchomienie `npm run build` w `_tester/_base/.silnik`.
