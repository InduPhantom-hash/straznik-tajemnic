# Kontrakt Wykonawczy: Etap 5 - Wielojęzyczność (PL/EN)

**Projekt:** Strażnik Tajemnic AI
**Architekt:** Gemini 3.1 Pro
**Reviewer Planu:** Terra Med
**Wykonawca:** Ox Alpha
**Audytor QA:** GPT-4o

## 1. Kontekst Zadania
Zgodnie z plikiem `state.md`, wdrażamy "Etap 5 - Wielojęzyczność". Naszym zadaniem jest dodanie przełącznika PL/EN w aplikacji bez użycia globalnego `next-i18next`.

## 2. Cele Główne (Scope)
1. **Przełącznik w Interfejsie (UI):** 
   - Wprowadzić natywny przełącznik flagi PL/EN na głównym ekranie startowym (`src/app/welcome` lub odpowiednim pliku roota w środowisku `_tester/_base/.silnik`).
   - Zachować stan wybranego języka w localStorage lub lokalnym stanie.
2. **Wymuszenie języka w LLM (Backend):**
   - W pipeline `src/app/api/chat/_helpers/run-chat-pipeline.ts` odczytywać przekazaną flagę.
   - Wstrzyknąć twarde polecenie systemowe wymuszające, aby model MG odpowiadał bezwzględnie w wybranym języku (PL lub EN).
3. **Plik Promptu EN:**
   - Stworzyć w `public/` nowy plik bazowy: `default-gm-prompt-en.md` jako odpowiednik polskiego promptu.
   - Dynamicznie zaciągać ten plik zależnie od przekazanego stanu języka.

## 3. Zastrzeżenia Czystości i Bezpieczeństwa (Security & Anti-Regressions)
- Nie naruszaj obecnych funkcjonalności RAG (lokalnej pamięci DB wektorowej). Zostaw ewentualną weryfikację angielskich źródeł PDF na dalsze iteracje.
- Wszystkie instrukcje powinny się ograniczyć stricte do komponentów UI ekranu powitalnego i logiki czatu, upewniając się, że nie wybuchnie pipeline błędem typu "Cannot read property of undefined" przy braku flagi (fallback na PL).
- Zastosuj Zero-Assumption Debugging - dopisz typowanie TypeScript w API dla nowej flagi (np. w zodiaku lub typach Requesta).

## 4. Wymagania Zakończenia (Dla Ox Alpha)
- Wykonanie `npx tsc --noEmit` musi dać czysty wynik (PASS).
- Skrypt testowy `npm test` nie może zostać przerwany nowymi błędami.
- Stworzenie notatki o wykonanych zmianach, która posłuży jako baza dla audytora GPT-4o.

## 5. Zarys Planu Implementacji (Zaktualizowany po Audycie Recenzenta)

**Ocena pewności (Confidence): 10/10**

Po wykonanej analizie struktury kodu (`_tester/_base/.silnik/`) i weryfikacji agenta QA (Recenzenta), plan został zrewidowany. 
Stan obecny: Przełącznik UI w `src/app/welcome/page.tsx` wstawia cookie `NEXT_LOCALE`, a backend odczytuje je w `getLocaleInstruction`. Jednak obecne rozwiązania mają luki i powodują wycieki przy SSR.

**Lista poprawek do wdrożenia (Dla agenta Kodera):**
1. **Utworzenie pliku promptu EN:**
   Wygenerowanie `public/default-gm-prompt-en.md` jako zlokalizowanego wariantu głównego promptu Strażnika. Wymaga on wczytywania bezpiecznego.
2. **Aktualizacja Typowania (Zero-Assumption):**
   W pliku `src/app/api/chat/_helpers/run-chat-pipeline.ts` w `ChatPipelineInput.body` dodać silne typowanie `locale?: 'pl' | 'en'`.
3. **Zabezpieczenie Źródła Prawdy (Locale):**
   - W `run-chat-pipeline.ts`: zmodyfikować `getLocaleInstruction(request, explicitLocale?)` aby w pierwszej kolejności korzystał z parametru wejściowego (`body.locale`), a dopiero potem jako fallback ratował się cookie, aby uniknąć "Race Condition" z `next-intl`.
   - W `src/lib/ai-settings/prompts-generator.ts`: zmodyfikować `getGameMasterPrompt(settings, locale?)` przekazując odczytany locale do asercji w `getLovecraftStylePrompt(locale)`.
4. **Refaktoryzacja Bezpieczeństwa (SSR vs Client):**
   W `src/lib/ai-settings/prompts-generator.ts` zmienić `loadDefaultPrompt` i `initializeDefaultPrompt`, tak aby akceptowały argument `locale`. Należy również pamiętać o bezpiecznym odczycie (isomorficznym) — jeśli używany na serwerze użyć `fs.readFile` (lub alternatywy zależnej od środowiska Next.js), a na kliencie `fetch`. 
5. (Opcjonalne, zalecane UX): Aktualizacja `src/app/welcome/page.tsx` by polegał na hookach nawigacji z `next-intl` (np. linkowanie ścieżek `pl`/`en`) zamiast ręcznego nadpisywania ciastka, co w pełni ujednolici mechanizm routingu.
