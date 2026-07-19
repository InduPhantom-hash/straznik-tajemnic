## Plan: Katalog ekwipunku, przedmioty kontekstowe i przebudowa dziennika
Data: 2026-07-19
Złożoność: Duża

### Problem
Stałe, powtarzalne przedmioty startowe nie powinny być generowane przez API przy każdej sesji, a obecny model wyposażenia nie rozróżnia zwykłego przedmiotu od przedmiotu, który gracz powinien móc przeczytać. Dziennik jest kolejnym osobnym problemem UX i nie powinien być przebudowywany razem z ekwipunkiem.

### Stan obecny
- Szybki toggle `Obrazy: Wł/Wył` już istnieje w sidebarze i korzysta z `imageGenerationEnabled`.
- Hot Seat pozostaje konfiguracją trybu sesji, a nie ustawieniem kosztowym.
- Ikona aplikacji wygląda na już poprawioną: `desktop/make-icon.sh` nie ma żółtej ramki i zawiera korektę pionowego położenia oka. Nie planujemy ponownej zmiany bez nowej obserwacji wizualnej.
- Istniejące lokalne miniatury predefiniowanego ekwipunku oraz katalog `equipment-data.ts` są punktem wyjścia, ale trzeba sprawdzić ich kompletność i zgodność z epoką.

### Rozwiązanie
Rozdzielimy wyposażenie na trzy źródła: lokalny katalog kanonicznych przedmiotów pospolitych, przedmioty fabularne otrzymywane w trakcie sesji oraz przedmioty wyjątkowe generowane przez AI na żądanie. Zwykłe przedmioty będą miały lekkie, wersjonowane assety w aplikacji. Dokumenty, listy i inne czytalne handouty dostaną osobny typ treści generowanej kontekstowo i otwieranej po kliknięciu. Dziennik zaplanujemy dopiero po ustabilizowaniu tego modelu.

### Fazy implementacji

**Faza 0: Research źródła przedmiotów**
- [ ] Ustalić dokładny tytuł i legalnie dostępne źródło podręcznika, o którym mowa jako `The Walk Toolu`.
- [ ] Jeśli źródło nie jest dostępne w repozytorium, użytkownik dostarcza własny legalny PDF albo dokładny spis treści/sekcję katalogową.
- [ ] Zmapować katalog na kategorie aplikacji, epoki i mechaniczne pola `EquipmentItem`.
- [ ] Wytypować pierwszą paczkę przedmiotów pospolitych: broń, narzędzia, medyczne, osobiste, dokumenty i przedmioty okultystyczne.
- Weryfikacja: research zapisany jako `.agent/research/equipment-catalog-2026-07-19.md`, bez kopiowania całych treści chronionych prawem autorskim.

**Faza 1: Lokalny katalog i assety**
- [ ] Dodać kanoniczne identyfikatory oraz dane katalogowe przedmiotów, niezależne od postaci.
- [ ] Zastąpić generowanie obrazów dla przedmiotów katalogowych lokalnymi, małymi obrazami WebP/SVG.
- [ ] Zmienić `buildPredefinedEquipment` i `generate-starting`, aby korzystały z katalogu zamiast tworzyć powtarzalne elementy przez API.
- [ ] Zachować migrację istniejących zapisów i istniejące `imageUrl`.
- [ ] Zostawić generowanie AI tylko dla przedmiotów fabularnych i wyjątkowych.
- Weryfikacja: testy danych katalogu, brak wywołania `/api/imagen` dla przedmiotów kanonicznych, kontrola rozmiaru assetów i paczki.

**Faza 2: Czytalne przedmioty fabularne**
- [ ] Rozszerzyć model przedmiotu o typ treści, np. `readable`, status wygenerowania treści i kontekst przygody.
- [ ] Dodać akcję `Przeczytaj` tylko dla listów, dokumentów, notatek, stron ksiąg i podobnych elementów.
- [ ] Wygenerować treść po kliknięciu, z kontekstem przygody, epoki, lokacji, autora i dotychczasowej narracji.
- [ ] Zapisywać wynik w save oraz pokazywać go w czytelnym dialogu z tytułem, źródłem i treścią.
- [ ] Rozdzielić opis mechaniczny przedmiotu od treści diegetycznej, którą gracz faktycznie czyta.
- Weryfikacja: test dokładnego payloadu kontekstowego, cache/save treści, obsługa błędu API i test manualny dokumentu.

**Faza 3: Kontrolowane generowanie nowych przedmiotów**
- [ ] Zdefiniować, jakie przedmioty mogą powstawać z narracji i jak są oznaczane jako fabularne.
- [ ] Generować obraz dopiero po utworzeniu takiego przedmiotu, z poszanowaniem toggle `Obrazy`.
- [ ] Dodać kolejkę i deduplikację tylko dla tych nowych przedmiotów, bez generowania katalogu stałego.
- Weryfikacja: scenariusz znalezienia listu/przedmiotu podczas gry, jeden asset i jeden wpis w ekwipunku, brak duplikatów po reloadzie.

**Faza 4: Dziennik jako osobny projekt UX**
- [ ] Najpierw zmapować obecne wpisy, kategorie, filtrowanie, eksport i wspólny dziennik duetu.
- [ ] Zaprojektować prosty model: co jest automatycznym śladem sesji, co notatką gracza, a co odkryciem fabularnym.
- [ ] Przygotować wireframe i test z użytkownikiem przed zmianą kodu.
- [ ] Dopiero potem przebudować nawigację, karty wpisów, wyszukiwanie i relację z czytalnymi handoutami.
- Weryfikacja: test manualny na jednej sesji solo i jednej sesji duetowej, z zachowaniem migracji starych wpisów.

### Kluczowe pliki do dalszej analizy
| plik | rola | ryzyko |
|---|---|---|
| `_tester/_base/.silnik/src/lib/equipment-data.ts` | obecny katalog bazowy | Średnie |
| `_tester/_base/.silnik/src/lib/immersion/predefined-equipment.ts` | ekwipunek predefiniowanych postaci | Średnie |
| `_tester/_base/.silnik/src/lib/types.ts` | model `EquipmentItem` i save | Wysokie |
| `_tester/_base/.silnik/src/app/api/equipment/generate-starting/route.ts` | obecne generowanie startowego ekwipunku | Wysokie |
| `_tester/_base/.silnik/src/components/ui/equipment-modal.tsx` | UI, generowanie i podgląd | Średnie |
| `_tester/_base/.silnik/src/lib/character-image-store.ts` | trwałość obrazów i migracje | Wysokie |
| `_tester/_base/.silnik/src/components/sidebar/CthulhuSidebar.tsx` | szybki toggle obrazów | Niskie |

### Weryfikacja końcowa
- `npm test`
- `npx tsc --noEmit`
- `npm run build`
- testy payloadów API i migracji save
- kontrola zawartości oraz rozmiaru paczki desktopowej
- manualny test: zwykły przedmiot, znaleziony dokument, reload, solo i duet

### Co może się zepsuć
- Stare save'y mogą mieć przedmioty bez nowych pól - potrzebna tolerancyjna migracja.
- Ten sam przedmiot może występować jako katalogowy i fabularny - identyfikator musi rozróżniać template od konkretnego egzemplarza.
- Wyłączenie obrazów nie może blokować tworzenia przedmiotu ani czytania dokumentu.
- Nie należy kopiować do repozytorium pełnego katalogu z podręcznika; przechowujemy tylko potrzebne, własne dane aplikacji i assety.
