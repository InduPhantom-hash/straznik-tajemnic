# Plan: Poprawa Czytelności i Wizualizacji Ekwipunku
Data: 2026-07-18
Złożoność: Średnia

### Problem
Ekwipunek postaci ma słabą czytelność: brak miniatur (wyświetlany jest surowy znak `✦` lub ikona kategorii bez tła), boksy przedmiotów w siatce są za małe przez co opisy są ucinane, a wygenerowane z AI obrazy w widoku szczegółowym są ucinane/zbyt małe przez sztywne ograniczenie rozmiaru ramki.

### Rozwiązanie
Usprawnimy wygląd miniatur i boksów wyposażenia poprzez:
1. Wprowadzenie ładnego, ciemnego tła z ramką z mosiądzu i wycentrowaną ikoną kategorii dla miniatur-placeholderów (gdy obrazek z AI jeszcze nie został wygenerowany).
2. Zmianę układu siatki w zakładce wyposażenia na dwukolumnową (zamiast trzykolumnowej) oraz zwiększenie paddingów i umożliwienie łagodnego zawijania tekstu opisu zamiast ucinania go.
3. Poprawę pozycjonowania obrazu w modalu detalu (zastosowanie `object-cover rounded-md` z większą ramką i odpowiednimi proporcjami `aspect-square`).

### Pliki do modyfikacji
| plik | zmiana | ryzyko |
|------|--------|--------|
| `_tester/_base/.silnik/src/components/ui/equipment-modal.tsx` | Poprawa GearCard (siatka, style), ItemThumbnail (placeholdery z tłem i ramką), modal detalu (ramka i skalowanie obrazu). | Niskie |
| `_tester/_base/.silnik/src/components/ui/character-sheet/components/sheet-equipment.tsx` | Poprawa ItemThumbnail (placeholdery o spójnym wyglądzie) i dopasowanie paddingów. | Niskie |

### Fazy implementacji

**Faza 1: Ulepszenie miniatur (placeholders)**
- [ ] Zmiana wyglądu `ItemThumbnail` w `equipment-modal.tsx` i `sheet-equipment.tsx` — dodanie tła `bg-gradient-to-br from-[#1c1712] to-[#0f0b07]`, obramowania `border-brass/30`, cienia oraz wyśrodkowanie ikon Lucide z zachowaniem odpowiednich proporcji i złotej kolorystyki (`text-brass/70`).
- Weryfikacja: Miniatury bez obrazów AI wyglądają estetycznie i spójnie w obu miejscach.

**Faza 2: Poprawa czytelności boksów (GearCard)**
- [ ] Zmiana siatki z `grid-cols-3` na `grid-cols-2` w `equipment-modal.tsx` (wyposażenie).
- [ ] Usunięcie `truncate` dla opisu w `GearCard` i zastąpienie go `line-clamp-2` lub elastycznym zawijaniem (zwiększenie czytelności).
- Weryfikacja: Opisy nie są ucinane w połowie słowa, a boksy mają odpowiednią ilość przestrzeni.

**Faza 3: Naprawa ucinania powiększonych obrazów**
- [ ] Zmiana styli obrazu w modalu szczegółów w `equipment-modal.tsx` z `object-contain max-h-72` na `aspect-square w-full object-cover max-h-[380px]` oraz dodanie ozdobnej ramki art deco.
- Weryfikacja: Kliknięcie w przedmiot z obrazem wyświetla go w pięknej, dużej, kwadratowej ramce bez zniekształceń.

### Weryfikacja końcowa
Uruchomienie builda deweloperskiego projektu w celu sprawdzenia wyglądu UI i upewnienia się, że nie występują błędy kompilacji TypeScript:
`npm run build` (lub testowe renderowanie komponentu).

### Co może się zepsuć
- Zmiana struktury siatki może wpłynąć na bardzo małe ekrany mobilne (zapewnimy odpowiednie klasy `grid-cols-1 sm:grid-cols-2`).
