# Plan: Etap 3.5 — Encyklopedia Gracza & HelpModal RAG

Data: 2026-07-21  
Złożoność: Średnia  

### Problem
Gracz potrzebuje dostępnej w dowolnym momencie, pełnoekranowej encyklopedii wiedzy i wsparcia (zasady CoC 7e, lore epoki lat 90./2000., objaśnienia UI) połączonej z szybkim wyszukiwaniem oraz bezpośrednią pytajką AI (Local RAG Assistant) bez zanieczyszczania głównego czatu gry.

### Rozwiązanie
Rozbudujemy istniejący komponent `HelpModal.tsx` o 5 pełnoprawnych zakładek, podepniemy przycisk otwarcia modalu w pasek UI/menu oraz wdrożymy pod-komponent Asystenta RAG (`HelpAssistantTab.tsx`) zintegrowany z lokalnym endpointem wiedzy (`/api/context` / `/api/pdf-memory`).

### Pliki do modyfikacji
| plik | zmiana | ryzyko |
|------|--------|--------|
| `src/components/help-modal/HelpModal.tsx` | Rozbudowa zakładek do 5: `EPOCH_WIKI`, `RULES`, `INTERFACE`, `BESTIARY`, `RAG_ASSISTANT` + pełny layout i obsługa klawisza Esc | Niskie |
| `src/components/help-modal/HelpAssistantTab.tsx` | [NEW] Komponent czatu RAG do pytań o zasady i epokę wewnątrz modalu pomocy | Niskie |
| `src/components/help-modal/BestiaryRulesTab.tsx` | [NEW] Dedykowany podgląd mechaniki CoC 7e oraz stworów/mitów | Niskie |
| `src/app/page.tsx` | Dodanie stanu `showHelpModal`, przycisku otwarcia w nagłówku/sidebarze oraz podpięcie modalu z dynamic importem | Niskie |
| `src/components/help-modal/HelpModal.test.tsx` | [NEW] Testy jednostkowe widoczności zakładek i nawigacji modalu | Niskie |

---

### Fazy implementacji

**Faza 1: Komponenty zakładek i interfejs Modalu Pomocy**
- [ ] Utworzenie `BestiaryRulesTab.tsx` dla przejrzystej prezentacji zasad CoC 7e i bestiariusza.
- [ ] Utworzenie `HelpAssistantTab.tsx` jako lekka pytajka AI (zaintegrwana z Gemini 3.6 Flash / RAG w tle).
- [ ] Zaktualizowanie `HelpModal.tsx` o nawigację po 5 zakładkach, responsywność i stylizację w limie Lovecrafta.
- Weryfikacja: Kompilacja TypeScript `npx tsc --noEmit`.

**Faza 2: Integracja w główny interfejs aplikacji (`page.tsx`)**
- [ ] Dodanie stanu `showHelpModal` w `page.tsx`.
- [ ] Renderowanie `HelpModal` przez `dynamic()` z SSR disabled.
- [ ] Podpięcie wyzwalacza modalu pomocy w odpowiednim miejscu paska narzędzi.
- Weryfikacja: Uruchomienie testów `npm test` w `_tester/_base/.silnik`.

**Faza 3: Testy jednostkowe & Weryfikacja zbiorcza**
- [ ] Napisanie testów `HelpModal.test.tsx`.
- [ ] Weryfikacja budowania projektu `npm run build`.

---

### Weryfikacja końcowa
- `cd _tester/_base/.silnik && npm test`
- `npm run build`

### Co może się zepsuć
- Zwiększenie rozmiaru bundle'a UI w przypadku załadunku encyklopedii sync -> rozwiązanie: użycie istniejącej lazy-load integracji z `/data/epochs/pl-1990s-2000s/dictionary_wiki.json`.
