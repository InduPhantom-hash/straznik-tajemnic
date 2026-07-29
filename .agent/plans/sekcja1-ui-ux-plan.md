## Plan: Sekcja 1 - UI / UX Globalne (Zaktualizowany)
Data: 2026-07-29
Złożoność: Prosta

### Problem
Aplikacja gubi kolor scrollbarów po zmianie na motyw jasny. Zegar w pełnym widoku gubi informacje o pogodzie, a okno czatu przepuszcza "Prompty LLM" do generatorów obrazów (brakuje przy tym testów na nową logikę).

### Rozwiązanie
Uzupełniamy brakujące zmienne w `globals.css`, wpinamy funkcję `getWeatherEmoji` do pełnego widoku w UI zegara, i poszerzamy Regex w pliku czyszczącym `cleanup.ts`. Dodatkowo piszemy assercje do `cleanup.test.ts`, by chronić zmiany.

### Pliki do modyfikacji
| plik | zmiana | ryzyko |
|------|--------|--------|
| `src/app/globals.css` | Dodanie zmiennych wariantu jasnego `.light` | Niskie |
| `src/components/ui/campaign-clock.tsx` | Render `{getWeatherEmoji(weather)}` przy dacie | Niskie |
| `_tester/_base/.silnik/src/components/chat/narrative/cleanup.ts` | Poszerzenie regexa (linia 44) | Średnie |
| `_tester/_base/.silnik/src/components/chat/narrative/cleanup.test.ts` | Test-case'y pod różne wersje z markdownem | Niskie |

### Fazy implementacji

**Faza 1: Klimat mosiądzu**
- [ ] Klonowanie `--brass` i `--gold` do `.light`
- Weryfikacja: Przełączenie trybu Light i wizualne potwierdzenie.

**Faza 2: Ikony pogody**
- [ ] Osadzenie widżetu `{getWeatherEmoji(weather)}` w bloku dużym zegara kampanii.
- Weryfikacja: Załadowanie widoku UI i potwierdzenie.

**Faza 3: Prompty LLM**
- [ ] Zamiana regexa w linijce 44 `cleanup.ts` na `^[*\s]*(?:Prompt|Ilustracja)(?:[^:\n]{0,20})[*\s]*:\s*.*$` z flagą `gim`.
- [ ] Dodanie `it()` sprawdzającego edge-case'y w `cleanup.test.ts`.
- Weryfikacja: `npm test` w celu symulacji wyrenderowania tekstu czyszczenia.

### Weryfikacja końcowa
- Sprawdzenie wizualne przez przeglądarkę pod kątem regresji. 
- Uruchomienie testów pakietu `.silnik/src/components/chat/narrative`.

### Co może się zepsuć
- **Regex w `cleanup.ts` (Średnie ryzyko)** - Zbyt chciwy regex może uciąć zdania Mistrza Gry. Dodanie testu w pełni niweluje to ryzyko.
