# Kontrakt: Ekwipunek i Zgodność Epokowa (Visual Era)

## Cel
Naprawa logiki Ekwipunku i usunięcie anachronizmów, które ujawniły się na zrzucie ekranu oraz zostały zgłoszone przez użytkownika. Zgodnie z zasadami CoC 7e startowy ekwipunek oraz jego reprezentacja zależą od Credit Rating oraz Epoki.

## Zakres modyfikacji
1. `src/lib/immersion/strefa-11-characters.ts` (oraz inne powiązane pliki):
   - Popraw `era` z `modern` na `1990s` dla bohaterów Strefy 11 (Tomasz Nowicki, Krystyna Zawada, Karolina Maj, Helena Krawczyk).
2. `src/components/ui/equipment-modal.tsx`:
   - Uprość logikę `ItemThumbnail` (isSvgFallback, hasRealImage). 
   - Usuń uzależnienie od błędnych ścieżek `/equipment/predefined/` i oprzyj obsługę ikon o wbudowane ikony z Lucide (`CategoryIcon`), gdy użytkownik nie wygenerował jeszcze obrazu lub baza nie ma gotowego obrazu. Zrzut ekranu wskazywał zepsute tła kafelków.
3. `src/lib/immersion/predefined-equipment.ts`:
   - Zweryfikuj by `1990s` nie dodawało "Powerbanku" czy "Smartfonu".
4. Cała logika ekwipunku musi przejść kompilację (`npm run build`).

## Wymagania jakościowe
- `npx tsc --noEmit` nie może zwracać błędów.
- `npm test` musi przechodzić w 100%.

