## Brief: Wdrożenie awatarów NPC w czacie
**Co**: Wyświetlanie wygenerowanych portretów NPC z tagu `[PORTRET: ...]` jako twarzy obok wiadomości.
**Jak**: Zmiana instrukcji w `image-instructions.ts`, dodanie pokrycia testami w `media-parser.test.ts` i przebudowa layoutu portretu w `message-card.tsx`.
**Pliki**: `image-instructions.ts`, `media-parser.test.ts`, `message-card.tsx`.
**Test**: Weryfikacja TDD (`npm test`) wewnątrz `.silnik` i sprawdzenie działania UI w przeglądarce.
**Ryzyko**: Potencjalne rozbicie układu wiadomości czatu na mniejszych ekranach (wymagane odpowiednie breakpointy CSS).
