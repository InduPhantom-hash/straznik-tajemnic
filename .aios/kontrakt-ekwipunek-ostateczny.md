# Kontrakt: Ostateczny Audyt i Przebudowa Ekwipunku (Mechanika + Epoki + Generowanie)

## Zgłoszone Problemy przez Gracza (Użytkownika)
1. Ekwipunek broni potrafi zniknąć po otwarciu, a fallbacki graficzne nadal bywają niestabilne. Należy całkowicie USUNĄĆ przycisk "Generuj" z miniaturek kafelków w Ekwipunku - zamiast tego system ma polegać na predefiniowanych wektorach/grafikach lub generować obrazy automatycznie pod spodem bez interakcji klikania (lub nie generować ich na siłę).
2. Wciąż pojawiają się anachronizmy (współczesne przedmioty jak "Smartfon", "Powerbank" w latach 70.). Wynika to z twardego podpięcia ekwipunku postaci do jej domyślnej ery (np. Strefa 11 na lata 90.), nawet jeśli jest wrzucana do przygody w innej epoce (np. lata 70. "Cień nad Prabutami").
3. System metryczny - wymiary takie jak zasięg broni "15 yards" mają zostać zamienione na system metryczny (np. "15 m", "100 m"). 
4. Mechanika przedmiotów w trakcie gry (generowanie w locie, używanie, dodawanie do ekwipunku) musi zostać zaudytowana tak, by wszystkie dodawane przedmioty otrzymywały poprawne mechaniki z katalogu `equipment-data` i `equipment-catalog`.

## Zakres modyfikacji dla Codexa
1. `src/components/ui/equipment-modal.tsx`: 
   - Usuń kod interakcji `onGenerateImage` / "Generuj" z miniatur (kolejny krok w stronę czytelności) tak by fallback SVG ładował się zawsze gdy brak grafiki `imageUrl`.
2. `src/lib/immersion/predefined-characters.ts` oraz `predefined-equipment.ts`:
   - Zmień mechanizm budowania predefiniowanego ekwipunku. Zamiast sztywno opierać się na `preset.era`, udostępnij mechanizm dostosowywania ekwipunku startowego (zmiana "Smartfona" na odpowiednik z lat 70., jeśli postać z lat 90. ląduje w przygodzie z lat 70.). Alternatywnie, przypisz poprawne `era` wszystkim badaczom Strefy 11 (jeśli wariant 70s jest dla nich domyślny, upewnij się, że nie dostaną powerbanku).
3. Metrykalizacja: Przeszukaj cały katalog broni i statystyk w `equipment-data.ts`, `equipment-catalog.ts` oraz `weapon-context.ts` pod kątem zamiany jednostek imperialnych ("yards", "lbs") na metryczne ("m", "kg"). 
4. Pomyślne przejście zestawu testów `npm test`.

