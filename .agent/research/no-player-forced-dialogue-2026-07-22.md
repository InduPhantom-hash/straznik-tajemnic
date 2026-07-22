# Research: Usunięcie wymuszania rozmów między graczami z promptów MG
Data: 2026-07-22
Stack: Next.js (TypeScript), Gemini API / OpenAI API

## Obszar problemu
Identyfikacja promptów i helperów generujących instrukcje dla Mistrza Gry w trybie jedno- i wieloosobowym (Hot Seat), które nakazują lub sugerują zmuszanie graczy do prowadzenia dialogu między sobą na czacie w celu pchnięcia akcji.

Pliki bezpośrednio zaangażowane:
1. `src/hooks/useGameStart.ts`
   - Generuje prompt wprowadzający (`TURA WPROWADZAJĄCA`) dla trybu jedno- i wieloosobowego przy starcie gry.
   - Obecnie zawiera instrukcję: *"Pozwól im poznać świat i relacje poprzez rozmowę z obecnym NPC-em lub między sobą. Dopiero po wymianie zdań..."*.
2. `src/app/api/chat/_helpers/build-context.ts`
   - Dołącza instrukcje systemowe dla trybu wieloosobowego (`## TRYB GRY DLA DWÓCH OSÓB`).
   - Zawiera odniesienia do interakcji drużynowych, które mogą być interpretowane przez model jako wymóg rozmowy na czacie.
3. `src/lib/prompts/gm-protocol.ts`
   - Główny protokół narracyjny Mistrza Gry (GM Protocol).
   - Zawiera przykłady i reguły (np. przykłady z `[Co robisz? - opowiedzcie jej...]` lub zachęcanie do dyskusji drużynowej).

## Zależności i przepływ danych
- `useGameStart.ts` buduje pierwszy prompt wysyłany do `/api/chat` podczas generowania otwarcia nowej przygody.
- `build-context.ts` dokleja reguły kontekstowe do każdego zapytania czatu w trakcie trwania gry.
- Model LLM (Gemini/Claude) interpretuje wytyczne z promptu i generuje pytania końcowe (np. `[Co robisz, @Gracz1?]`), skłaniając graczy do akcji środowiskowych zamiast rozmowy na czacie.

## Istniejące testy
- Brak dedykowanych unit testów sprawdzających dokładne brzmienie promptów językowych w `useGameStart.ts` i `build-context.ts`.
- Weryfikacja odbywa się poprzez weryfikację odpowiedzi modelu przy starcie nowej gry oraz testach manulanych flow Hot Seat.

## Ryzyka i uwagi
- Zmiana nie wpływa na strukturę techniczną ani stan aplikacji, wyłącznie na zachowanie modelu LLM.
- Należy zachować wywołania tagów `@ImięPostaci` i markerów `[Co robisz, @Imię?]` dla każdego z graczy, zmieniając jedynie intencję (akcja w świecie / decyzja indywidualna/drużynowa w grze, a nie wymóg czatowania ze sobą).

## Rekomendowany następny krok
Przejście do zwięzłego planu edycji (`/dev-2-plan`) w celu zaktualizowania zpisów w `useGameStart.ts`, `build-context.ts` oraz `gm-protocol.ts`.
