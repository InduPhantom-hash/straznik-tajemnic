# Kontrakt: Podmiana portretów paczki 1 (Cień nad Prabutami)

## Cel
Podmiana na sztywno zakodowanych ścieżek URL portretów 4 postaci ze scenariusza "Sygnały Nieznanego" na nowe pliki JPG.

## Dozwolone pliki do modyfikacji
- `_tester/_base/.silnik/src/lib/immersion/strefa-11-characters.ts`

## Zadanie
Dla podanych poniżej identyfikatorów zaktualizuj właściwość `portraitUrl` na nowe wartości:
1. `strefa11_tomasz_nowicki` -> `/portraits/predefined/tomasz-nowicki.jpg`
2. `strefa11_helena_krawczyk` -> `/portraits/predefined/helena-krawczyk.jpg`
3. `strefa11_barbara_zawadzka` -> `/portraits/predefined/barbara-zawadzka.jpg`
4. `strefa11_ryszard_klucznik` -> `/portraits/predefined/ryszard-kaczmarek.jpg`

## Kryteria akceptacji (Wymagane testy)
Po zmianach:
1. `cd /Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik && npx tsc --noEmit`
Muszą przejść w 100%. Jeśli tak, powróć i zgłoś wykonanie zadania.
