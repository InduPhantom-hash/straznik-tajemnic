# Plan: Etap 0.5 - Wprowadzenie Gracza (Onboarding & Quick Setup Flow)

Data: 2026-07-22  
Złożoność: Średnia  

### Problem
Gracz przy pierwszym uruchomieniu gry potrzebuje uporządkowanego, immersyjnego wprowadzenia klimatycznego: weryfikacja klucza Gemini API, wgranie podręcznika PDF oraz narracyjne powitanie przez Wirtualnego Mistrza Gry z opcją szybkiego startu (Quick Setup z gotową przygodą i postacią).

### Rozwiązanie
Rozbudowa istniejącego komponentu `FirstRunWizard` oraz hooka `useFirstRun`:
1. Obowiązkowa weryfikacja klucza API Gemini (z natychmiastowym testem połączenia).
2. Obowiązkowy krok wgrania podręcznika PDF do lokalnego indeksu `rules`.
3. Narracyjny ekran powitalny Mistrza Gry (Lovecraftowski styl klimatyczny) prezentujący wybór:
   - ⚡ **Quick Setup**: Wybór predefiniowanej polskiej przygody (np. *Cień nad Prabutami*) oraz gotowego Badacza (mężczyzna/kobieta) dla szybkiego startu.
   - 🛠️ **Manual Setup**: Przejście do standardowego interfejsu z ręcznym wyborem/tworzeniem postaci i scenariusza.

---

### Pliki do modyfikacji

| plik | zmiana | ryzyko |
|------|--------|--------|
| `src/components/onboarding/FirstRunWizard.tsx` | Rozbudowa przepływu o krok powitalny MG i podsumowanie wyboru | Niskie |
| `src/components/onboarding/steps/step-gemini-key.tsx` | Dodanie natychmiastowego testu walidacji klucza Gemini API | Niskie |
| `src/components/onboarding/steps/step-welcome-gm.tsx` [NOWY] | Narracyjny komponent powitalny MG + wybór Quick vs Manual Setup | Niskie |
| `src/hooks/useFirstRun.ts` | Rozszerzenie stanu o flagę wyboru Quick Setup i wybranych presetów | Niskie |
| `src/app/page.tsx` | Podpięcie akcji z ukończenia Onboardingu i auto-startu przygody Quick Setup | Średnie |

---

### Fazy implementacji

**Faza 1: Natychmiastowa Walidacja Klucza API Gemini**
- [ ] Modyfikacja `StepGeminiKey.tsx`: dodanie przycisku/funkcji testującej klucz Gemini API natychmiastowym żądaniem testowym.
- [ ] Zapis walidowanego klucza w lokalnej pamięci.
- Weryfikacja: Wpisanie błędnego klucza pokazuje komunikat błędu, prawidłowy klucz odblokowuje krok 2.

**Faza 2: Narracyjne Ekran Powitalny MG & Quick Setup Selector**
- [ ] Stworzenie `StepWelcomeGM.tsx`: klimatyczny wstęp w stylu Lovecrafta, stylizowany komponent z mosiężnymi ramkami (`brass`).
- [ ] Wybór przygody predefiniowanej z listy (`data/adventures/predefined/`) oraz gotowej postaci.
- [ ] Wybór trybu startu: Quick Setup (natychmiastowe ładowanie) lub Custom Setup (wejście do menu głównego).
- Weryfikacja: Zmiana kroków w `FirstRunWizard.tsx` na 4-krokowy proces: Klucz -> Podręcznik -> Wgraj -> Powitanie & Start.

**Faza 3: Integracja z `page.tsx` i Auto-start Przygody**
- [ ] Po wybraniu Quick Setup: obsługa w `page.tsx` automatycznie ustawia wybrany scenariusz (`adventureContext`) oraz wybraną postać i inicjuje nową sesję czatu.
- [ ] Po wybraniu Manual Setup: zamknięcie modalu i powrót do standardowego widoku startowego.
- Weryfikacja: Przejście pełnego onboarding flow z poziomu przeglądarki.

---

### Weryfikacja końcowa
- `npm test` lub `npx jest src/lib/time-manager.test.ts` (upewnienie się, że testy jednostkowe przechodzą).
- Budowanie TypeScript: `npx tsc --noEmit` w katalogu `.silnik`.

---

### Co może się zepsuć
- Wyczyszczenie localStorage podczas testów może ponownie wymusić wizard (zgodnie z projektem).
- Ryzyko niepoprawnego załadowania postaci przy Quick Setup – zabezpieczone użyciem istniejących presetów postaci z `PredefinedCharactersSelector`.
