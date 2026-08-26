# Master Plan: Całkowita Ekstrakcja Językowa (Zero Polish Policy)

W związku z wykryciem potężnego długu językowego (ponad 11,000 linii kodu zawierających twarde polskie wpisy) oraz zawodnością dotychczasowych prób masowego podejścia, projekt zostaje podzielony na 4 hermetyczne fazy. Każda faza będzie procesowana przez wydzieloną, świeżą instancję Codexa i rygorystycznie weryfikowana.

## Faza 1: Startup & Character Flow (Krytyczne Ekrany Użytkownika)
Obejmuje ekrany logowania, kreatora postaci, ekranu ładowania i podstawowych widoków przed rozpoczęciem sesji.
*   `src/components/ui/character-wizard.tsx`
*   `src/components/ui/character-sheet.tsx`
*   `src/components/ui/quick-setup-modal.tsx`
*   `src/components/ui/hard-loading-screen.tsx`
*   `src/components/chat/welcome/**/*.tsx`
*   `src/app/[locale]/page.tsx`
*   `src/app/[locale]/characters/new/page.tsx`

## Faza 2: Gameplay UI (Interfejs Rozgrywki)
Obejmuje okno czatu, mechaniki kostek, paski boczne, ustawienia i modale deweloperskie w trakcie gry.
*   `src/components/chat/chat-window/**/*.tsx`
*   `src/components/ui/campaign-clock.tsx`
*   `src/components/ui/ritual-system.tsx`, `phobia-mania-system.tsx`
*   `src/components/settings/**/*.tsx`
*   `src/components/dialogs/**/*.tsx`

## Faza 3: Mechanics & Static Lore (Dane Fabularne)
Wyciągnięcie polskich tekstów z plików generujących zawartość (często przekazywanych do UI bez pośrednictwa reactowych tłumaczeń).
*   `src/lib/immersion/**/*.ts` (np. postacie Strefy 11)
*   `src/lib/content-library/**/*.ts` (np. mitos, księgi, potwory)
*   `src/lib/data/**/*.ts` (np. profesje, ekwipunek)

## Faza 4: Engine, Parsers & Prompts (Silnik i AI)
Rdzeń aplikacji. Wiadomości błędów, parsery czasu, opisy dla AI (jeśli aplikacja docelowo obsługuje AI po angielsku).
*   `src/lib/parsers/**/*.ts`
*   `src/lib/time-manager.ts`, `random-event-generator.ts`
*   `src/lib/prompts/**/*.ts` (tłumaczenie System Promptów)
