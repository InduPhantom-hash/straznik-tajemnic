# Kontrakt: Etap 5 - Wielojęzyczność (PL/EN)

## Cel
Wdrożenie podstawowego wsparcia dwujęzycznego (PL/EN) zgodnie z Etapem 5 w `state.md`. 
Zadanie delegowane do agenta Herdr.

## Krok 1: Przełącznik na ekranie startowym
1. Dodaj prosty przełącznik (Toggle/Button) `PL / EN` na ekranie startowym (prawdopodobnie `welcome/page.tsx` lub `page.tsx`).
2. Zapisz wybrany język w lokalnym stanie (np. `localStorage` albo lekki store), tak aby był dostępny dla innych komponentów w sesji.
3. Bezwzględnie NIE wprowadzaj rozbudowanego i globalnego mechanizmu jak `next-i18next`.

## Krok 2: Wymuszenie języka w strumieniu LLM
1. Zlokalizuj plik odpowiadający za potok czatu (według `state.md` to `run-chat-pipeline.ts`).
2. Zmodyfikuj konstrukcję promptu systemowego w tym pliku. Jeżeli język = EN, dodaj na twardo silną instrukcję wymuszającą odpowiedzi wyłącznie po angielsku ("You must act and respond entirely in English...").

## Krok 3: Angielski Master Prompt i RAG
1. Odszukaj plik bazowego promptu MG (np. `public/default-gm-prompt.md`) i na jego podstawie wygeneruj odpowiednik w języku angielskim: `public/default-gm-prompt-en.md`. (Przetłumacz lub poproś użytkownika o przygotowanie wariantu EN, jeśli wolisz - ale powinieneś wdrożyć mechanizm ładujący z odpowiedniego pliku).
2. Spraw, aby podczas inicjalizacji czatu wczytywany był odpowiedni plik (`.md`) zależnie od flagi PL/EN.
3. Jeśli korzystasz z lokalnego RAG, poinstruuj prompt, by wyciągał z bazy wiedzę i samodzielnie tłumaczył ją na angielski przed wygenerowaniem odpowiedzi.

## Instrukcje dla Agenta
- Modyfikuj tylko niezbędne pliki. Nie ruszaj całej architektury lokalizacji, bo cel to prosty przełącznik LLM-owy.
- Środowisko kodu może znajdować się np. w `.silnik/src` - zanim napiszesz nadpisanie pliku, użyj wyszukiwania, by potwierdzić dokładne ścieżki (wyszukaj `run-chat-pipeline.ts` i `page.tsx`).
- Nie używaj placeholderów typu `// existing code`. Wdrażaj pełne kody plików.
