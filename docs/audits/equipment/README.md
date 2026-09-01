# Audyt wyposażenia startowego i assetów

Data baseline: 2026-09-01.

## Wynik maszynowy

- Aktywne presety: 46.
- Wszystkie instancje przedmiotów startowych: 264.
- Unikalne nazwy po normalizacji: 133.
- Wzorce katalogowe: 37.
- Lokalne katalogowe WebP: 35.
- Unikalne nazwy rozwiązywane przez obecny katalog i aliasy: 53.
- Unikalne nazwy bez wzorca: 80.
- Przedmioty startowe bez istniejącego lokalnego obrazu lub ikony: 0.
- Przedmioty startowe oznaczone jako generowane: 0.

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

## Kolejka katalogu

Priorytet 1:

- normalizacja 80 nazw bez wzorca,
- osobne wzorce broni o odrębnej mechanice,
- warianty telefonów, komputerów, aparatów i nośników dla 1973-1974, 1980s, 1990s i 2000-2005,
- poprawa aliasu `Latarnia oliwna` do lampy naftowej,
- test dostępności zestawów zawodowych w każdej obsługiwanej epoce.

Priorytet 2:

- osobiste dokumenty, notesy, ubrania i pamiątki,
- przedmioty scenariuszowe Strefy 11,
- rendery zatwierdzane partiami według epoki.

Artefakty Mythos i unikalne dokumenty pozostają poza katalogiem statycznym, chyba że PO jawnie zatwierdzi konkretny wzorzec.

## Bramka akceptacji

- Mechanika, cena i Majętność: weryfikacja względem wskazanych stron prywatnego PDF-u.
- Alias i `templateId`: test jednoznaczności.
- WebP: arkusz kontaktowy i akceptacja PO.
- Brak WebP: lokalna ikona kategorii, bez API.
