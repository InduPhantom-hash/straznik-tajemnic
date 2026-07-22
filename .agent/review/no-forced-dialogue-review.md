## Code Review: Usunięcie wymuszania rozmów między graczami i ujednolicenie pytania drużynowego
Data: 2026-07-22

### Podsumowanie
✅ **Zatwierdź** — Wszystkie zmiany są w 100% zgodne z planem, poprawiają zachowanie modelu LLM oraz parsera czatu i pomyślnie przechodzą weryfikację typów.

### Znalezione problemy
Brak problemów krytycznych ani ostrzeżeń.

**Obserwacje:**
- Usunięto instrukcje zachęcające MG do wymuszania dyskusji między graczami na czacie we wszystkich promptach wprowadzających i systemowych (`useGameStart.ts`, `build-context.ts`, `gm-protocol.ts`).
- Zastąpiono indywidualnie adresowane pytania na końcu tury drużynowej wspólnym markerem `[Co robicie?]`.
- Regex w `cleanup.ts` został prawidłowo rozszerzony na `/(\S)[ \t]*(\[Co robi(?:sz|cie)\?\])/gi`, zapobiegając błędnemu renderowaniu markera inline.

### Statystyki
- Pliki zmienione: 4
- Zgodność z planem: 100% (wszystkie fazy zrobione)
- TypeScript: PASS (0 błędów)
