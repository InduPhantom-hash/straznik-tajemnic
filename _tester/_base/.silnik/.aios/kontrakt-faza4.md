# Kontrakt Wykonawczy: Faza 4 - Inteligencja (Prompty)

## Cel
Ujednolicenie instrukcji systemowych (AI Prompts) do języka angielskiego w celu zwiększenia posłuszeństwa modeli LLM, z jednoczesnym wprowadzeniem wstrzykiwania docelowego języka wyjściowego (`{{LANGUAGE}}`).

## Zakres plików (Blast Radius)
- `src/lib/prompts/*.ts` (m m.in. `gm-protocol.ts`, `session-zero-instructions.ts`, itp.)
- `src/app/api/chat/route.ts` (lub inne handlery API zasilające model system promptem)
- `src/lib/ai-settings/types.ts` lub mechanizmy budowania promptu w celu przekazania flagi języka (np. na podstawie cookisa `NEXT_LOCALE` z headera requestu).

## Instrukcja
1. **Tłumaczenie Promptów:** Przepisz wszystkie stałe instrukcje w `src/lib/prompts/*.ts` na rygorystyczny język angielski.
2. **Dyrektywa Językowa:** Dodaj do głównego `gm-protocol.ts` (i ewentualnie innych) wstrzykiwaną zmienną w postaci np. `{{LANGUAGE}}` lub przekaż ją dynamicznie do funkcji generującej prompt. Dopisz klauzulę o najwyższym priorytecie:
   `[CRITICAL RULE] You must narrate, output text, and talk to the player STRICTLY in {{LANGUAGE}}. The user interface language is {{LANGUAGE}}. NEVER output in English unless the language is English.`
3. **Logika API:** Zaktualizuj miejsce, które wysyła prompt do LLM (zapewne w `src/app/api/chat/route.ts` lub `src/lib/chat-utils.ts`), by odczytywało `req.cookies.get('NEXT_LOCALE')` i przekazywało 'Polish' lub 'English' na miejsce zmiennej `{{LANGUAGE}}`.
4. Po zakończeniu uruchom `npx tsc --noEmit` i upewnij się, że nie złamałeś żadnych typów zwracających prompty.
