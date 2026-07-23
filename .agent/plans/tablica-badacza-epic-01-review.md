# Plan Review: Przebudowa Dziennika & Tablicy Badacza od zera (EPIC-01)
Data: 2026-07-23  

---

### Ocena ogólna
🟢 **Zielony** — Plan jest kompletny, bezpieczny architektonicznie i bardzo dobrze ustrukturyzowany. Wprowadzenie natywnego płótna opartego na React 19, Pointer Events oraz warstwie SVG w pełni rozwiąże problem efemeryczności i braku ręcznego pozycjonowania bez ryzyka konfliktów z zewnętrznymi bibliotekami.

---

### Analiza przez 7 wymiarów

1. **Definicja problemu**: 🟢 Precyzyjna. Problem efemeryczności stanu tablicy i braku podglądu rekwizytów zostały wprost zaadresowane.
2. **Kompletność**: 🟢 Wytypowano wszystkie niezbędne pliki, w tym typy `investigator-board.ts`, komponenty UI, konwerter `convert-entries.ts`, czyszczenie starego widoku i aktualizację testów `session-journal.test.tsx`.
3. **Dopasowanie do architektury**: 🟢 Nienaganne. Podejście wykorzystuje natywne mechanizmy React 19, Tailwind CSS i SVG bez obciążania aplikacji obcymi zależnościami.
4. **Rabbit holes**: 🟡 Obliczenie punktu kontrolnego dla grawitacyjnego zwisu nitek Beziera SVG wymaga precyzyjnego wzoru (odległość między pineskami ➔ odpowiedni `sag`). *Rozwiązano w sugestii.*
5. **Promise gaps**: 🟢 Przejścia między fazami są czyste i testowalne.
6. **Strategia testowania**: 🟢 Jasne komendy weryfikacyjne (`npx tsc --noEmit` oraz testy Jest).
7. **Guardrails**: 🟢 Zgodny ze standardami TypeScript (strict) i architekturą local-first.

---

### Znalezione problemy & Sugestie

**Ostrzeżenia (Warto zaadresować podczas pisania kodu)**:
- **Obliczanie grawitacji sznurków SVG (Rabbit hole)**:
  - *Sugestia*: Dla zakrzywionych linii Beziera drugiego stopnia `<path d="M x1 y1 Q cx cy x2 y2" />` zastosować wzór:
    ```typescript
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const distance = Math.hypot(x2 - x1, y2 - y1);
    const sag = Math.min(80, Math.max(20, distance * 0.15));
    const controlX = midX;
    const controlY = midY + sag;
    ```
- **Optymalizacja płynności przeciągania (Pointer Events)**:
  - *Sugestia*: Przeciąganie karty powinno aktualizować szybki stan lokalny za pomocą `requestAnimationFrame` lub bez pośrednich re-renderów całej tablicy, a utrwalanie stanu do `Character.investigatorBoard` nastąpi dopiero po zdarzeniu `onPointerUp`.

---

### Rekomendacja

**Działajmy — Przejdźmy do wdrożenia (`/dev-4-implement`)**. Plan jest gotowy i zweryfikowany.
