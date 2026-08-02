## Research: Szybka Przygoda (Strefa 11) - Design i Portrety
Data: 2026-08-02

### Mapowanie (Wiedza z RAG + Drzewo Plików)
Główny problem dotyczy modala "Szybka Przygoda" (Strefa 11). Użytkownik zgłosił dwa główne zastrzeżenia:
1. **Design**: Wygląda zbyt prosto, brakuje mu stylu z innych okien (jak `adventure-selector.tsx` czy kreator postaci). Brakuje elementów deco, mosiężnych obramowań i odpowiedniej typografii.
2. **Portrety postaci**: Są uszkodzone (broken links) i "nieklikalne" (problemy z UX).

### Obszar problemu
1. **`_tester/_base/.silnik/src/components/ui/quick-setup-modal.tsx`**
   - Modal nie posiada stylizacji "deco" (używa podstawowych klas zielonych `primary/40` i czarnego tła, brakuje mosiężnych rogów, krawędzi, i typografii `font-special-elite`).
   - Logika klikania postaci jest zagmatwana: cały kafelek postaci służy do wyboru bohatera (dodatkowo wyszarza się w trybie hot-seat), ale wgląd w biografie ukryty jest pod małą ikonką `Info` w rogu. Użytkownik odnosi wrażenie, że portret jest "nieklikalny".
2. **`_tester/_base/.silnik/src/lib/immersion/strefa-11-characters.ts`**
   - Zdefiniowane ścieżki do awatarów (np. `/portraits/predefined/male_investigator_1.webp`) **nie istnieją** w fizycznym katalogu `public/portraits/predefined/`. Istnieją tam pliki o konkretnych imionach (np. `andrzej-sokolowski.webp`).

### Blast Radius Analysis (Zagrożenia i Skutki Uboczne)
- **Ryzyko Niskie**. Komponent `QuickSetupModal` to wyizolowany modal wywoływany przez `start-mode-cards.tsx`. Dopóki nie zmienimy interfejsu (propsów `open`, `onOpenChange`, `onQuickStart`), aplikacja pozostanie stabilna.
- Zmiana ścieżek do portretów w `strefa-11-characters.ts` nie wpłynie na resztę gry, gdyż są to dane dedykowane wyłącznie dla tego jednego modala.

### Zależności (Testy i Markdowny do aktualizacji)
- Kod E2E testów (`homepage.spec.ts`) prawdopodobnie nie sprawdza wewnątrz struktury tego modala, ale na wszelki wypadek należy upewnić się, że po zmianie layoutu wciąż można kliknąć przycisk "Rozpocznij przygodę".
- Brak innych poważnych zależności w dokumentacji markdown, plik `ROADMAP-MECHANIKI-AI.md` nie zostanie naruszony.

### Rekomendowany następny krok
Przejście do skilla `/dev-2-plan`, aby określić z Użytkownikiem nowy układ UI modala, naprawę linków portretów oraz nową, bardziej intuicyjną logikę zaznaczania postaci.
