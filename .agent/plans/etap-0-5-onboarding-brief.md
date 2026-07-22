# Brief: Etap 0.5 - Wprowadzenie Gracza (Onboarding & Quick Setup Flow)

**Co**: Wdrożenie ustrukturyzowanego procesu pierwszego uruchomienia gry z testem klucza Gemini, wgraniem PDF oraz narracyjnym ekranem powitalnym Mistrza Gry i opcją Quick Setup.  
**Jak**: Rozbudowa `FirstRunWizard` (4 kroki: Klucz z walidacją -> Podręcznik -> Wgraj PDF -> Ekran Powitalny MG z opcją Quick/Manual Setup) oraz automatyczna konfiguracja przygody i postaci w `page.tsx`.  
**Pliki**: `FirstRunWizard.tsx`, `step-gemini-key.tsx`, `step-welcome-gm.tsx` [NOWY], `useFirstRun.ts`, `page.tsx`.  
**Test**: Pomyślna kompilacja `npx tsc --noEmit` oraz weryfikacja przepływu onboardingu w interfejsie UI.  
**Ryzyko**: Niskie – wykorzystuje istniejące komponenty dialogów i presety scenariuszy/postaci.  
