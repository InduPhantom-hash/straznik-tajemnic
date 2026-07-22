## Plan: Usunięcie wymuszania rozmów między graczami i zmiana pytania końcowego dla drużyny
Data: 2026-07-22
Złożoność: Prosta

### Problem
Prompty systemowe i otwarcia zachęcały MG do wymuszania dialogu między graczami w oknie czatu oraz generowały rozbite pytania na końcu tury dla każdej postaci z osobna. Ponadto parser czatu wymaga rozszerzenia o rozpoznawanie tagu `[Co robicie?]`.

### Rozwiązanie
Usuwamy z promptów frazy nakazujące wymianę zdań między graczami na czacie, ujednolicamy zakończenie tury drużynowej do jednego pytania `[Co robicie?]` oraz aktualizujemy regex w `cleanup.ts`.

### Pliki do modyfikacji
| plik | zmiana | ryzyko |
|------|--------|--------|
| `src/hooks/useGameStart.ts` | Zmiana wprowadzenia drużynowego – brak wymuszania rozmów + marker `[Co robicie?]` | Niskie |
| `src/app/api/chat/_helpers/build-context.ts` | Zmiana wytycznych zakończenia tury w Hot Seat na `[Co robicie?]` | Niskie |
| `src/lib/prompts/gm-protocol.ts` | Aktualizacja opisów/przykładów z pytaniem dla drużyny | Niskie |
| `src/components/chat/narrative/cleanup.ts` | Rozszerzenie regexu rozpoznającego inline marker na `[Co robi(sz\|cie)?]` | Niskie |

### Fazy implementacji

**Faza 1: Aktualizacja promptów i parsera**
- [ ] Edycja `src/hooks/useGameStart.ts`
- [ ] Edycja `src/app/api/chat/_helpers/build-context.ts`
- [ ] Edycja `src/lib/prompts/gm-protocol.ts`
- [ ] Edycja `src/components/chat/narrative/cleanup.ts`
- Weryfikacja: Sprawdzenie poprawności kompilacji TS (`npx tsc --noEmit`).

### Weryfikacja końcowa
- Sprawdzenie poprawności typów.
