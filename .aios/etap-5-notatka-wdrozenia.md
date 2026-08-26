# Etap 5: Notatka wdrożeniowa Wielojęzyczności (PL/EN) - dla Audytora GPT-4o

**Wykonawca:** Ox Alpha
**Podstawa:** `.aios/kontrakt-etap-5.md` (pkt 5 - zrewidowany po audycie Recenzenta)
**Data:** 2026-08-24
**Weryfikacja:** `npx tsc --noEmit` → PASS | `npm test` → 63 suite, 250 testów PASS

## Środowisko kodu
Aplikacja żyje w `_tester/_base/.silnik/` (Next.js + next-intl v4, locales: pl/en).

## Wdrożone poprawki (mapowanie na listę z kontraktu)

### 1. Plik promptu EN
- **Nowy plik:** `public/default-gm-prompt-en.md` - pełny angielski odpowiednik master promptu (22 sekcje, benchmarki, handouty, mechanika CoC 7e; sekcja "Kontekst polski" zamieniona na domyślny kontekst amerykański/New England).

### 2. Aktualizacja typowania (Zero-Assumption)
- `src/app/api/chat/_helpers/run-chat-pipeline.ts`: destrukturyzacja body zawiera `locale?: 'pl' | 'en'` (`SupportedLocale` z prompts-generator).
- Runtime-walidacja: `normalizeLocale(rawLocale)` przyjmuje `unknown`, fallback `'pl'`. Pipeline nie wybuchnie przy braku flagi ani przy śmieciowej wartości.

### 3. Źródło prawdy locale (race condition)
- Nowy helper `resolveRequestLocale(request, explicitLocale?)`: **body.locale wygrywa nad cookie `NEXT_LOCALE`**, cookie tylko fallback.
- `getLocaleInstruction(request, explicitLocale?)` rozszerzony o parametr; instrukcja EN dodaje wymóg tłumaczenia materiału RAG/handoutów na angielski.
- `getGameMasterPrompt(aiSettings, locale)` przekazuje locale do `getLovecraftStylePrompt(locale)` (sekcja stylu PL/EN).

### 4. Refaktoryzacja SSR vs Client (eliminacja wycieku)
- `loadDefaultPrompt(locale = 'pl')` jest teraz izomorficzny:
  - serwer (`typeof window === 'undefined'`): dynamiczny import `node:fs/promises`, odczyt `public/<plik>` (wcześniej `fetch('/...')` rzucał "Failed to parse URL" po stronie SSR);
  - klient: `fetch` jak dotychczas.
- Mapa plików: `pl → default-gm-prompt.md`, `en → default-gm-prompt-en.md`.
- `initializeDefaultPrompt(locale = 'pl')`: lokalizowana etykieta pliku (`Strażnik Tajemnic (domyślny)` / `Keeper of Arcane Lore (default)`).
- Nowe eksporty w `prompts-generator.ts`: `SupportedLocale`, `normalizeLocale`, `isDefaultPromptFileLabel`, `DEFAULT_PROMPT_FILE_NAMES`.
- `isDefaultPromptFileLabel()` rozpoznaje obie etykiety ("domyślny"/"default") - chroni własny plik gracza przed nadpisaniem niezależnie od języka.

### 5. UX welcome page (rekomendacja kontraktu - wdrożona)
- `src/app/welcome/page.tsx`: `useRouter` z `@/i18n/routing` + `router.push('/', { locale })`. Zero ręcznego `document.cookie`; ciastko i URL prowadzone przez next-intl.

### Spójność callerów
- `useChat.ts`: wysyła `locale` w body `/api/chat` (źródło: `useLocale()` z next-intl) - to ta sama flaga, którą backend priorytetyzuje.
- `[locale]/page.tsx`: init promptu z locale + dep `[locale]` (zmiana języka przeładowuje prompt przy starcie gry).
- `useSettingsInit.ts` / `gm-prompt-status.tsx`: ładowanie/przywracanie domyślnego promptu w języku gry.

## RAG (zastrzeżenie czystości)
Logika RAG nietknięta. Instrukcja językowa nakłada obowiązek przetłumaczenia angielskiego kontekstu źródłowego na język gracza (wymóg z etap-5.md krok 3 pkt 3).

## Ryzyka do audytu
1. Użytkownik ze starym localStorage (etykieta PL "domyślny") wybierający EN: init nadpisze mainPrompt wariantem EN dopiero gdy etykieta = default (obie odmiany rozpoznawane) - celowe.
2. `fs.readFile` działa na Node runtime; route `/api/chat` nie korzysta z loadDefaultPrompt (tylko pipeline stringowy), więc edge runtime nie dotyczy.
3. Gemini context cache: zmiana języka zmienia systemPrompt → cache miss po przełączeniu języka (oczekiwane, jednorazowy koszt).
