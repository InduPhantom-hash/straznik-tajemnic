## Research: Awatary NPC w czacie ([PORTRET: ...])
Data: 2026-07-30
Stack: Next.js (App Router), React, TailwindCSS, Gemini AI (TypeScript)

### Obszar problemu i obecny stan (Backend i Parsery)
Obecna infrastruktura wspiera już podstawy dla zadeklarowanego tagu:
- Plik `_tester/_base/.silnik/src/lib/parsers/media-parser.ts` posiada regex, który wyłapuje słowa kluczowe `PORTRET` lub `PORTRAIT` i przypisuje z nich typ obrazka jako `portrait`, styl `portrait` oraz propocję `aspectRatio: '3:4'`.
- Tag wyłapywany przez ten parser jest potem usuwany z wiadomości przez `text-cleaner.ts`.
- Punkt końcowy `/api/imagen/route.ts` potrafi przetwarzać styl portretu dodając do promptu frazy w stylu `period-accurate portrait photography, realistic, head and shoulders shot...`. 

### Zależności (UI i Renderowanie)
Wiadomości w czacie przechodzą przez strumień SSE i trafiają do `useChat.ts`, który wysyła wniosek wygenerowania portretu, po czym wyświetla z powrotem w wiadomości.
- **`message-card.tsx`**: Aktualnie wygenerowane portrety (typ `'portrait'`) są wyświetlane na samym dole karty wiadomości w formie galerii w układzie `flex flex-wrap`. Aby to zachowywało się jak wycentrowany duży avatar lub avatar z boku tekstu, konieczne będzie zmodyfikowanie klas Tailwind w bloku dla `isPortrait` (np. przerzucenie wyżej lub z boku bloku z treścią `NarrativeFormatter`).
- **`render-sections.tsx`**: Posiada wewnętrzny fallback małych avatarów NPC generowanych podczas wypowiedzi w `dialogue`. Będzie to wymagać rozważenia, czy [PORTRET: ...] zastępuje ten avatar, czy jest to oddzielny pełnoprawny widok wygenerowanego zdjęcia ze skryptu w bloku tekstu.

### Istniejące testy i Prompty
- **`image-instructions.ts`**: Posiada instrukcję nakazującą używania składni `[PORTRET: szczegółowy opis w języku ANGIELSKIM]`. Rekomendowana będzie jej aktualizacja pod tag z imieniem i rozszerzeniem.
- **Testy**: Brakuje pliku `media-parser.test.ts` w środowisku silnika. Zostanie dopisany w planie jako krok pokrycia TDD (do weryfikacji proporcji 3:4 i różnicowania tagu). 

### Ryzyka i uwagi
1. Renderowanie dużego wygenerowanego portretu z użyciem ułożenia obok tekstu (side-aligned) uważa się za ryzykowne na układach mobilnych. Prawdopodobnie wycentrowany widok lub kontener owijający jest bezpieczniejszy. 
2. Przypisanie awatara NPC. System z portretów NPC opiera się obecnie na lokalnym zasobie (`resolveNpcPortrait`). Musimy uzgodnić, czy nowy wygenerowany awatar ma zostać również zachowany na karcie NPC.

### Rekomendowany następny krok
Gotowi do planowania (`/dev-2-plan`). Problem jest zrozumiały, wymaga jedynie punktowych zmian UI z przetasowaniem logiki Tailwind, aktualizacji promptów i pokrycia nowymi testami.
