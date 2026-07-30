## Plan: Wdrożenie wygenerowanych awatarów NPC w czacie ([PORTRET: ...])
Data: 2026-07-30
Złożoność: Średnia

### Problem
Generowane przez LLM awatary dla NPC i badaczy trafiają obecnie do sekcji galerii obrazów na samym dole wiadomości (`message-card.tsx`), a nie są zintegrowane jako pełnoprawne twarze obok ich wypowiedzi lub odpowiednio wycentrowane w narracji. Instrukcja dla MG wymaga też doprecyzowania.

### Rozwiązanie
Ulepszenie instrukcji promptu (`image-instructions.ts`) nakazującej używanie tagu `[PORTRET: Imię Postaci, opis]`. Dodanie testów jednostkowych parsowania (`media-parser.test.ts`). Następnie modyfikacja układu CSS w `message-card.tsx` dla wygenerowanych obrazów typu `portrait`, tak aby wyświetlały się obok głównej narracji w formie bocznego okienka, lub były wycentrowane.

### Pliki do modyfikacji
| plik | zmiana | ryzyko |
|------|--------|--------|
| `_tester/_base/.silnik/src/lib/prompts/image-instructions.ts` | Doprecyzowanie tagu PORTRET z parametrem imienia | Niskie |
| `_tester/_base/.silnik/src/lib/parsers/media-parser.test.ts` | Nowy plik, dodanie pokrycia testami parsera | Niskie |
| `_tester/_base/.silnik/src/components/chat/chat-window/components/message-card.tsx` | Zmiana flex/grid układu kart dla wygenerowanego portretu | Średnie (UI shift) |

### Fazy implementacji

**Faza 1: Prompty i Testy (TDD)**
- [ ] Zaktualizowanie `image-instructions.ts` o wymóg podawania "Imienia i opisu".
- [ ] Utworzenie `media-parser.test.ts` by zweryfikować `aspectRatio: '3:4'` i odróżnienie tagu.
- Weryfikacja: `npm test media-parser` na środowisku `.silnik`.

**Faza 2: Przebudowa UI wiadomości**
- [ ] Modyfikacja `message-card.tsx`: przechwycenie URL wygenerowanego portretu i renderowanie go obok głównej karty dialogowej.
- Weryfikacja: Wyświetlenie poprawnie wygenerowanego portretu bez psucia obecnej wizualizacji kart.

### Weryfikacja końcowa
- Uruchomienie testów: `npm run test` z uwzględnieniem `_tester/_base/.silnik`.
- Ręczna weryfikacja błędu `infinite loop` (upewnienie się, że `SafeImage` działa poprawnie dla portretu z boku).

### Co może się zepsuć
- Przesunięcie układu wiadomości (Text Wrap/Flexbox) na urządzeniach mobilnych, jeśli awatar NPC będzie ustawiony poziomo obok szerokiej wiadomości.
