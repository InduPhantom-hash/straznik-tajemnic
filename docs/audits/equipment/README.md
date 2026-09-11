# Audyt wyposażenia startowego i assetów

Data baseline: 2026-09-01.

## Wynik maszynowy (po wdrożeniu Issue #324)

- Aktywne presety: 46.
- Wszystkie instancje przedmiotów startowych: 264.
- Unikalne nazwy po normalizacji: 133.
- Wzorce katalogowe w `EQUIPMENT_CATALOG`: 150.
- Lokalne katalogowe WebP na dysku (w 100% zmapowane w kodzie): 110 (komplet Partii 1-4 z `catalog-manifest-all.json`).
- Wzorce katalogu z przypisanym WebP: 128 (w tym warianty epokowe i uniwersalne).
- Szablony katalogowe oczekujące na dedykowany render (fallback SVG): 22.
- Pokrycie presetów badaczy przez katalog: 100% (wszystkie przedmioty posiadają deterministyczny szablon, aliasy PL/EN i zasady CoC 7e RAW).
- Przedmioty startowe bez istniejącego lokalnego obrazu lub ikony: 0.
- Przedmioty startowe oznaczone jako generowane: 0.
- Martwe odwołania do plików: 0 (usunięto `laptop-modern.webp`, zastąpiono `heavy-laptop-wifi-1990s.webp`).

## Naprawiony P0 kosztu

- `buildPredefinedEquipment` używa lokalnego WebP, a przy jego braku ikony kategorii.
- Surowe wyposażenie 16 presetów Strefy 11 otrzymuje `source: starting`, ikonę kategorii i `visualSource: fallback`.
- `useEquipmentThumbnails` pomija katalog, wyposażenie startowe i fallbacki.
- Generator pozostaje dostępny dla niekatalogowych przedmiotów znalezionych lub utworzonych w fabule.

## Zawody

- `OCCUPATION_EQUIPMENT` zawiera 30 zestawów zawodowych oraz `default`.
- Kreator postaci udostępnia 29 identyfikatorów zawodów, nie 30.
- Wszystkie 29 identyfikatorów ma jawne mapowanie. Pięć wcześniejszych fallbacków otrzymało własne zestawy: `athlete`, `drifter`, `hacker`, `spy`, `tribe_member`.
- Aliasy `police_detective` i `private_investigator` prowadzą do właściwych, oddzielnych zestawów.

Zakresem runtime pozostaje 29 zawodów kreatora. Nie dodajemy trzydziestego zawodu tylko po to, aby zgadzała się liczba ze starym planem.

## Źródło zasad

Użytkownik wskazał prywatny lokalny PDF `ZewCthulhu_KsiegaStraznika_v.1.3-kopia.pdf`. Plik ma 490 stron, wersję 1.3 i SHA-256 `b463b904d4c2e9d69e08a4268691bed1a3d83e1f157a01e8dce42ef7e6cc795c`.

Zweryfikowane zakresy:

- zawody i przedziały Majętności: strony drukowane 44-45,
- gotówka, dobytek i poziom wydatków: strony drukowane 50 i 107,
- wyposażenie lat 20. i współczesne: strony drukowane 447-450,
- broń i jej mechanika: strony drukowane 452-457.

Podręcznik nie definiuje zamkniętego zestawu przedmiotów startowych dla każdej profesji. Zakresy Majętności i mechanika są warstwą reguł. Zestawy zawodowe są naszą deterministyczną warstwą projektową i nie mogą być opisywane jako RAW.

Repo zapisuje wyłącznie własne dane strukturalne, własne opisy, hash i numery stron. Nie zapisuje tekstu ani obrazów z PDF-u.

## Naprawione mapowanie zawodów

- Wszystkie 29 identyfikatorów kreatora mają jawne mapowanie.
- `police_detective` prowadzi do zestawu detektywa policyjnego.
- `private_investigator` prowadzi do zestawu prywatnego detektywa.
- `athlete`, `drifter`, `hacker`, `spy` i `tribe_member` nie spadają już do `default`.
- Przedział Majętności prywatnego detektywa poprawiono z 9-50 na 9-30.
- Endpoint wyposażenia startowego wymaga jawnej epoki i nie uruchamia Gemini. AI nie może zmienić ceny ani mechaniki.

## Kolejka katalogu do prerenderowania (Partia 5 - 22 przedmioty)

Po wdrożeniu 110 grafik z Partii 1-4, w katalogu `EQUIPMENT_CATALOG` pozostają 22 przedmioty używające lokalnego fallbacku SVG (`CATEGORY_FALLBACK_ASSETS`):

1. `tool.thermometer` – Termometr (`tool`)
2. `tool.photo-tripod` – Statyw fotograficzny (`tool`)
3. `tool.photo-plates` – Klisza fotograficzna (`tool`)
4. `tool.trowel-brush` – Pędzel i kielnia archeologiczna (`tool`)
5. `tool.lab-equipment` – Sprzęt laboratoryjny (`tool`)
6. `tool.typewriter` – Maszyna do pisania (`tool`)
7. `document.source-books` – Książki źródłowe (`document`)
8. `document.library-card` – Karta biblioteczna (`document`)
9. `document.bible` – Biblia / modlitewnik (`document`)
10. `document.music-sheets` – Nuty i partytury (`document`)
11. `document.script` – Scenariusz teatralny (`document`)
12. `weapon.police-baton` – Pałka policyjna (`weapon`)
13. `personal.car-keys` – Kluczyki do samochodu (`personal`)
14. `personal.art-pencils` – Ołówki i węgiel rysunkowy (`personal`)
15. `personal.palette-brushes` – Paleta i pędzle malarskie (`personal`)
16. `personal.sports-gear` – Strój sportowy (`personal`)
17. `personal.sports-bag` – Torba sportowa (`personal`)
18. `personal.towel` – Ręcznik bawełniany (`personal`)
19. `personal.musical-instrument` – Instrument muzyczny (`personal`)
20. `personal.makeup-kit` – Zestaw do charakteryzacji (`personal`)
21. `personal.overalls` – Kombinezon roboczy (`personal`)
22. `personal.blanket` – Wełniany koc (`personal`)

Artefakty Mythos i unikalne dokumenty fabularne pozostają poza katalogiem statycznym (generowane w locie przez MG lub z portretu Flux Kontext).

## Bramka akceptacji

- Mechanika, cena i Majętność: weryfikacja względem wskazanych stron prywatnego PDF-u.
- Alias i `templateId`: test jednoznaczności.
- WebP: arkusz kontaktowy i akceptacja PO.
- Brak WebP: lokalna ikona kategorii, bez API.
