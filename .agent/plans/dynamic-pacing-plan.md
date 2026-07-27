# Plan: Kontekstowy Pacing Narracji (Opcja A)
Data: 2026-07-27
Złożoność: Prosta

### Problem
Odpowiedzi AI w grze miały niemal identyczną, sztywną długość niezależnie od tego, czy scena opisywała nowe miejsce, czy była krótką dialogową wymianą zdań. Przyczyną były wąskie progi liczbowe (np. 150-250 słów) w `pacing-controller.ts` wstrzykiwane w każdej turze.

### Rozwiązanie
Zastąpienie sztywnych dolnych limitów słownych szerokimi, elastycznymi progami maksymalnymi zależnymi od sytuacji (dialog, eksploracja, nowe otwarcie) oraz zaktualizowanie instrukcji w promptach GM tak, by AI odpowiadało zwięźle w szybkich interakcjach i bogato przy otwarciu scen.

### Pliki do modyfikacji
| plik | zmiana | ryzyko |
|------|--------|--------|
| `_tester/_base/.silnik/src/lib/pacing-controller.ts` | Zmiana zakredu słów na elastyczny i dodanie wytycznych dla dialogów | Niskie |
| `_tester/_base/.silnik/src/lib/prompts/gm-protocol.ts` | Aktualizacja dyrektywy pacingu w protokole | Niskie |
| `public/default-gm-prompt.md` | Aktualizacja instrukcji tempa w domyślnym promptcie | Niskie |
| `_tester/_base/.silnik/public/default-gm-prompt.md` | Synchronizacja domyślnego promptu silnika | Niskie |

### Fazy implementacji

**Faza 1: Implementacja elastycznych wytycznych tempa**
- [ ] Zmiana `PACING_MAP` oraz instrukcji tempa w `pacing-controller.ts`
- [ ] Aktualizacja dyrektywy w `gm-protocol.ts`
- [ ] Aktualizacja w obu plikach `default-gm-prompt.md`
- Weryfikacja: `npx jest src/lib/pacing-controller.test.ts` / testy jednostkowe.

### Weryfikacja końcowa
- `npm test` lub `npx jest`

### Co może się zepsuć
- Testy sprawdzające dokładny ciąg tekstowy `getPacingDirective` mogą wymagać dostosowania asercji do nowego ciągu instrukcji.
