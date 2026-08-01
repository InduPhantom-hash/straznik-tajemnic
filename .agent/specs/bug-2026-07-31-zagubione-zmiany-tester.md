---
typ: bug
data: 2026-07-31
projekt: straznik-tajemnic
severity: Critical
status: open
slug: zagubione-zmiany-katalog-tester
---

# BUG: Brakujące zmiany z ostatnich 2 dni, błędy UI Szybkiej Przygody i domyślny scenariusz "Boston Globe"

## Streszczenie
Zmiany z ostatnich 2 dni (wdrożenie Szybkiej Przygody, nowe portrety NPC, miniatury) nie są widoczne w uruchomionej aplikacji, ponieważ większość modyfikacji kodu została omyłkowo wykonana w folderze izolowanego testera (`_tester/_base/.silnik/src/`) zamiast w głównym katalogu projektu (`src/`). Dodatkowo ekran "Szybka Przygoda" ma problemy UI (biały pasek przewijania), brakuje mu pełnych kart i portretów z trybu manualnego, a wybór scenariusza ignoruje decyzję gracza, odpalając domyślny kontekst z Boston Globe.

## Kontekst i Rekonesans
- Ostatnie 5 commitów (m m.in. `1c19b95`, `0cdf720`, `d63c9fe`) dodawało pliki takie jak `quick-setup-modal.tsx`, `hard-loading-screen.tsx`, komponenty `chat-window` z awatarami w złej ścieżce: `_tester/_base/.silnik/src/...`.
- `page.tsx` w głównym katalogu ma asynchroniczny problem w `handleQuickStart` - wywołuje `setAdventureContext(adv)`, a potem natychmiast `setPendingGameStart(true)`. Główny useEffect odpala grę zanim kontekst zdąży się zaktualizować (albo fallback w kodzie chatu jest nadpisywany). Z tego powodu ładuje się domyślna gazeta "Boston Globe".
- Modale i komponenty dodane do trybu szybkiej przygody (`quick-setup-modal.tsx`) są napisane w sposób uproszczony i nie korzystają z układu wizualnego `predefined-characters-selector.tsx` (brakuje im portretów i opisów).
- Biały pasek przewijania prawdopodobnie wynika z braku ukrycia `scrollbar` lub konfliktu globalnych stylów w nowym modalu.

## Kroki Repro
1. Uruchomić aplikację.
2. Ekran główny nie posiada nowego, czystego layoutu.
3. Przejść do Szybkiej Przygody - widać biały scrollbar ("flutes"), brak portretów.
4. Wybrać przygodę i kliknąć "Rozpocznij" - ładuje się intra dla gazety Boston Globe niezależnie od wybranej przygody.
5. Logi NPC nie pokazują awatarów - logika awatarów została wdrożona tylko w `_tester`.

## Akceptacja (Skąd wiem, że gotowe)
- [ ] Wszystkie zmiany z katalogu `_tester/_base/.silnik/src/` zostały zintegrowane i przeniesione do `src/`.
- [ ] Ekran startowy faktycznie działa zgodnie z planem (Czysty Start).
- [ ] Ekran Szybkiej Przygody (Quick Setup Modal) ma naprawiony wygląd:
  - Brak białego scrollbara.
  - Posiada portrety postaci i możliwość podejrzenia ich karty/opisu (spójność z trybem manualnym).
- [ ] Wybór przygody z Szybkiego Startu przekazuje poprawnie dane (adventureContext) do pętli czatu - ładuje się dedykowane wprowadzenie, a nie "Boston Globe".
- [ ] Portrety NPC renderują się prawidłowo na głównym środowisku (przeniesiony kod z _tester).

## Zakres Zmiany
- **W zakresie:** Przeniesienie kodu ze złego folderu do dobrego, naprawa Quick Setup Modalu (style + funkcjonalność), naprawa asynchronicznego state'u w `page.tsx`.
- **Poza zakresem:** Tworzenie zupełnie nowych mechanik (naprawiamy tylko wdrożenia z 2 ostatnich dni).

## Otwarte pytania
- Czy `src/app/page.tsx` został zedytowany hybrydowo, tak że jego zawartość trzeba będzie ręcznie łączyć, czy po prostu przyjmie nową logikę? 
- W jakim stopniu "flutes" (biały scrollbar) pochodzi z bazowego Tailwind, a w jakim z `quick-setup-modal.tsx`? Zbadam to podczas implementacji.

## Sugerowany next step
Przejście do utworzenia Implementation Plan, akceptacji od Użytkownika i `/dev-4-implement`.
