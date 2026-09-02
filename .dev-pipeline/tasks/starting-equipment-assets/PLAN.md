# Kanoniczne zestawy startowe i statyczne rendery przedmiotów

## Cel

Zapewnić deterministyczne, zgodne z epoką zestawy startowe i lokalne rendery najczęściej używanych przedmiotów. AI może redagować opis fabularny, ale nie wybiera mechaniki, dostępności, ceny ani wpływu Majętności.

## Zakres

- Zbudować spis wszystkich nazw wyposażenia używanych przez 46 aktywnych presetów.
- Utworzyć stabilne `templateId`, mapę aliasów oraz mapę 30 profesji po normalizacji.
- Rozdzielić cztery klasy: wyposażenie zasad i zawodowe, neutralne dodatki biograficzne, rzeczy osobiste zależne od Majętności oraz dynamiczne przedmioty fabularne.
- Mechanikę, broń, ceny i progi Majętności weryfikować wyłącznie względem lokalnie wgranego legalnego PDF-u użytkownika. W repo zapisać własne dane strukturalne i oryginalne opisy, bez kopiowania tekstu podręcznika.
- Kod deterministycznie buduje zestaw z `templateId`, profesji, roku, regionu i Majętności.
- Wariant epoki ma osobny asset tylko wtedy, gdy wygląd przedmiotu rzeczywiście się zmienia.
- Każdy zatwierdzony popularny wzorzec ma lokalny WebP w `public/images/equipment-catalog/`.
- Render katalogowy: jeden przedmiot, prawidłowa skala i materiały, realistyczne światło, bez dłoni, logo, czytelnych napisów i przypadkowej symboliki.
- Brak assetu daje ikonę kategorii. Element katalogowy nie może uruchamiać API obrazów.
- API obrazów pozostaje dostępne wyłącznie dla spersonalizowanych i fabularnych przedmiotów bez katalogowego `templateId`.

## Kolejność

1. Zinwentaryzować użyte nazwy, istniejące template'y, aliasy i assety.
2. Wykazać nieznane nazwy, konflikty aliasów, martwe template'y i brakujące WebP.
3. Zbudować kanoniczną mapę 30 profesji i deterministyczne zasady wyboru.
4. Dodać testy mechaniki, epoki, Majętności i braku wywołań API dla katalogu.
5. Przygotować listę renderów oraz kontaktowe zestawienie do akceptacji PO.
6. Włączać assety partiami dopiero po akceptacji wizualnej.

## Walidacja

- Wszystkie elementy startowe 46 presetów rozwiązują się do stabilnego `templateId` albo jawnie oznaczonego dodatku biograficznego.
- Każda profesja ma jednoznaczne reguły zestawu bazowego i wariantów Majętności.
- Test z atrapą generatora dowodzi, że katalogowy `templateId` nie wywołuje API obrazów.
- Test braku assetu dowodzi użycia ikony kategorii.
- Raport rozdziela zgodność mechaniczną z PDF-em od jakości wizualnej assetu.

## Kryteria akceptacji

- Kanoniczna lista obejmuje przedmioty 46 presetów i mapę profesji po normalizacji aliasów
- Mechanika i dostępność są deterministyczne, a AI nie ustala reguł ani wartości
- Katalogowy przedmiot nigdy nie uruchamia API obrazów i ma lokalny WebP albo ikonę kategorii
- Dane pochodzące z prywatnego PDF nie kopiują chronionej treści do repo
