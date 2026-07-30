# Avatar NPC State Tracker

## ✅ Faza 1 zakończona: Parser i Prompt

**Zmiany:**
- `src/lib/parsers/types.ts`: Dodano `portraitName` do `ImageRequest`.
- `src/lib/prompts/image-instructions.ts`: Wymuszono format `[PORTRET: Imię Postaci, opis]` dla LLM.
- `src/lib/parsers/media-parser.ts`: Ekstrakcja `portraitName` (imię przed przecinkiem) ze znacznika obrazu.
- `src/lib/parsers/media-parser.test.ts`: Dodano testy TDD dla ekstrakcji.

**Weryfikacja:**
- Testy: PASS [3/3]
- TypeScript: PASS
- Lint: PASS

## ✅ Faza 2 zakończona: Zapis do dziennika

**Zmiany:**
- `src/lib/types.ts`: Dodano `imageUrl` do typów wpisów dziennika (`JournalEntry`, `ExtendedJournalEntry`).
- `src/hooks/useChat.ts`: Zaktualizowano `generateImages`, by pobierało asynchronicznie wygenerowane portrety, szukało wpisu NPC o pasującym imieniu i aktualizowało `gameContext.characters.journal` o nowo wygenerowany adres portretu (`imageUrl`), po czym synchronizowało się z `persistCharacters` oraz `activeCharacter`.

**Weryfikacja:**
- Testy: N/A (Manual/E2E ready)
- TypeScript: PASS (po wyeliminowaniu braku compatibility typów wpisów)
- Lint: PASS

**Stan kontekstu:** Niski / Średni

## 🎉 Implementacja zakończona: Trwałe Portrety NPC
Wszystkie punkty zaktualizowanego planu zostały zrealizowane bez naruszenia stylizacji kart czatu (zgodnie z życzeniem - portrety jako elementy centralne czatu dla komputerów 16:9). Zapis URL'a do profilu odkrytego NPC gwarantuje jego przyszłą spójność wizualną.
