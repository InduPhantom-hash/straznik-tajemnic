# Raport audytu wariantów ekwipunku per epoka (Issue #503)

> Manifest katalogu ekwipunku per epoka oraz zestawienie luk w dedykowanych renderach WebP.
> Dokument wygenerowany automatycznie na podstawie TypeScript SSOT (`src/lib/equipment/era-manifest.ts`).

## 1. Założenia architektoniczne i polityka assetów

1. **Docelowe 6 epok**: `1890s` (wiktoriańska), `1920s` (klasyczna/II RP), `1930s` (kryzys/modernizm), `1940s` (wojenna/noir), `1980s` (schyłkowy PRL), `modern` (współczesność).
2. **6 kategorii fizycznych**: `weapon`, `tool`, `medical`, `personal`, `occult`, `armor` (z wyłączeniem dokumentów i traktowaniem unikalnych artefaktów jako osobna ścieżka).
3. **Format identyfikatora**: `<era>.<category>.<slug>`, np. `1920s.weapon.revolver-38`. Każdy wariant ma gwarantowaną unikalność.
4. **Rygorystyczna eliminacja -shared**: pliki `-shared.webp` są traktowane jako brak dedykowanego wariantu epokowego (`assetStatus: missing_era_asset`). Brak odwołań do shared w manifeście.
5. **Bezpieczny fallback**: w przypadku braku dedykowanego renderu epokowego stosowany jest wyłącznie lokalny wektor SVG (`/equipment/predefined/<category>.svg`), bez degradacji do niespójnych grafik z innej epoki.
6. **Filtr anachronizmów**: manifest uwzględnia wyłącznie przedmioty faktycznie istniejące w danej epoce historycznej.

## 2. Podsumowanie macierzy wariantów (6 epok x 6 kategorii)

| Epoka | Gotowe (ready) | Brakujące (missing) | Łącznie wariantów | Pokrycie | Status graficzny |
|---|---|---|---|---|---|
| **1890s** | 4 | 91 | 95 | 4% | Dostępne pojedyncze unikalne assety |
| **1920s** | 9 | 91 | 100 | 9% | Dostępne pojedyncze unikalne assety |
| **1930s** | 0 | 92 | 92 | 0% | Pilna potrzeba partii renderów |
| **1940s** | 3 | 101 | 104 | 3% | Dostępne pojedyncze unikalne assety |
| **1980s** | 1 | 97 | 98 | 1% | Dostępne pojedyncze unikalne assety |
| **modern** | 20 | 76 | 96 | 21% | Częściowo pokryta |
| **ŁĄCZNIE** | **37** | **548** | **585** | **6%** | **Gotowych: 37 / 585** |

### Macierz szczegółowa: Gotowe / Łącznie (Brakujące)

| Epoka | Broń (`weapon`) | Narzędzia (`tool`) | Medycyna (`medical`) | Osobiste (`personal`) | Okultyzm (`occult`) | Pancerz (`armor`) | Suma epoki |
|---|---|---|---|---|---|---|---|
| **1890s** | 2/26 (-24) | 1/21 (-20) | 0/6 (-6) | 1/26 (-25) | 0/14 (-14) | 0/2 (-2) | **4/95** |
| **1920s** | 5/29 (-24) | 2/22 (-20) | 0/6 (-6) | 2/27 (-25) | 0/14 (-14) | 0/2 (-2) | **9/100** |
| **1930s** | 0/26 (-26) | 0/21 (-21) | 0/5 (-5) | 0/24 (-24) | 0/14 (-14) | 0/2 (-2) | **0/92** |
| **1940s** | 1/32 (-31) | 1/23 (-22) | 0/6 (-6) | 1/27 (-26) | 0/14 (-14) | 0/2 (-2) | **3/104** |
| **1980s** | 0/24 (-24) | 1/29 (-28) | 0/5 (-5) | 0/24 (-24) | 0/14 (-14) | 0/2 (-2) | **1/98** |
| **modern** | 2/13 (-11) | 14/37 (-23) | 1/6 (-5) | 2/23 (-21) | 0/14 (-14) | 1/3 (-2) | **20/96** |
| **SUMA** | **10/150** | **19/153** | **1/34** | **6/151** | **0/84** | **1/13** | **37/585** |

## 3. Wykaz 36 próbek priorytetowych (Priority Review Samples)

Zestaw 6 reprezentatywnych przedmiotów fizycznych sprawdzanych przekrojowo w 6 epokach (6 x 6 = 36 wariantów).
Służy do wzorcowej oceny kierunku artystycznego i spójności stylu przed masowym generowaniem.

| Epoka | Kategoria | Identyfikator | Nazwa przedmiotu | Status | Zasób / Fallback |
|---|---|---|---|---|---|
| 1890s | weapon | `1890s.weapon.flare-gun` | Pistolet sygnalizacyjny | MISSING | `/equipment/predefined/weapon.svg` |
| 1890s | tool | `1890s.tool.magnifier` | Lupa | MISSING | `/equipment/predefined/tool.svg` |
| 1890s | medical | `1890s.medical.first-aid` | Apteczka | MISSING | `/equipment/predefined/medical.svg` |
| 1890s | personal | `1890s.personal.matches` | Pudełko zapałek | MISSING | `/equipment/predefined/personal.svg` |
| 1890s | occult | `1890s.occult.candles` | Świece | MISSING | `/equipment/predefined/occult.svg` |
| 1890s | armor | `1890s.armor.safety-helmet-industrial` | Przemysłowy kask ochronny | MISSING | `/equipment/predefined/armor.svg` |
| 1920s | weapon | `1920s.weapon.flare-gun` | Pistolet sygnalizacyjny | MISSING | `/equipment/predefined/weapon.svg` |
| 1920s | tool | `1920s.tool.magnifier` | Lupa | MISSING | `/equipment/predefined/tool.svg` |
| 1920s | medical | `1920s.medical.first-aid` | Apteczka | MISSING | `/equipment/predefined/medical.svg` |
| 1920s | personal | `1920s.personal.matches` | Pudełko zapałek | MISSING | `/equipment/predefined/personal.svg` |
| 1920s | occult | `1920s.occult.candles` | Świece | MISSING | `/equipment/predefined/occult.svg` |
| 1920s | armor | `1920s.armor.safety-helmet-industrial` | Przemysłowy kask ochronny | MISSING | `/equipment/predefined/armor.svg` |
| 1930s | weapon | `1930s.weapon.flare-gun` | Pistolet sygnalizacyjny | MISSING | `/equipment/predefined/weapon.svg` |
| 1930s | tool | `1930s.tool.magnifier` | Lupa | MISSING | `/equipment/predefined/tool.svg` |
| 1930s | medical | `1930s.medical.first-aid` | Apteczka | MISSING | `/equipment/predefined/medical.svg` |
| 1930s | personal | `1930s.personal.matches` | Pudełko zapałek | MISSING | `/equipment/predefined/personal.svg` |
| 1930s | occult | `1930s.occult.candles` | Świece | MISSING | `/equipment/predefined/occult.svg` |
| 1930s | armor | `1930s.armor.safety-helmet-industrial` | Przemysłowy kask ochronny | MISSING | `/equipment/predefined/armor.svg` |
| 1940s | weapon | `1940s.weapon.flare-gun` | Pistolet sygnalizacyjny | MISSING | `/equipment/predefined/weapon.svg` |
| 1940s | tool | `1940s.tool.magnifier` | Lupa | MISSING | `/equipment/predefined/tool.svg` |
| 1940s | medical | `1940s.medical.first-aid` | Apteczka | MISSING | `/equipment/predefined/medical.svg` |
| 1940s | personal | `1940s.personal.matches` | Pudełko zapałek | MISSING | `/equipment/predefined/personal.svg` |
| 1940s | occult | `1940s.occult.candles` | Świece | MISSING | `/equipment/predefined/occult.svg` |
| 1940s | armor | `1940s.armor.safety-helmet-industrial` | Przemysłowy kask ochronny | MISSING | `/equipment/predefined/armor.svg` |
| 1980s | weapon | `1980s.weapon.flare-gun` | Pistolet sygnalizacyjny | MISSING | `/equipment/predefined/weapon.svg` |
| 1980s | tool | `1980s.tool.magnifier` | Lupa | MISSING | `/equipment/predefined/tool.svg` |
| 1980s | medical | `1980s.medical.first-aid` | Apteczka | MISSING | `/equipment/predefined/medical.svg` |
| 1980s | personal | `1980s.personal.matches` | Pudełko zapałek | MISSING | `/equipment/predefined/personal.svg` |
| 1980s | occult | `1980s.occult.candles` | Świece | MISSING | `/equipment/predefined/occult.svg` |
| 1980s | armor | `1980s.armor.safety-helmet-industrial` | Przemysłowy kask ochronny | MISSING | `/equipment/predefined/armor.svg` |
| modern | weapon | `modern.weapon.flare-gun` | Pistolet sygnalizacyjny | MISSING | `/equipment/predefined/weapon.svg` |
| modern | tool | `modern.tool.magnifier` | Lupa | MISSING | `/equipment/predefined/tool.svg` |
| modern | medical | `modern.medical.first-aid` | Apteczka | MISSING | `/equipment/predefined/medical.svg` |
| modern | personal | `modern.personal.matches` | Pudełko zapałek | MISSING | `/equipment/predefined/personal.svg` |
| modern | occult | `modern.occult.candles` | Świece | MISSING | `/equipment/predefined/occult.svg` |
| modern | armor | `modern.armor.safety-helmet-industrial` | Przemysłowy kask ochronny | MISSING | `/equipment/predefined/armor.svg` |

## 4. Wytyczne do generacji brakujących wariantów

Dla każdego brakującego wariantu (`assetStatus: missing_era_asset`) generowany obraz WebP musi spełniać standardy:
- **Kadr i kompozycja**: Obiekt przedmiotu dominuje kadr w ujęciu makro/obiektowym, kadr kwadratowy (1:1), brak postaci ludzkich, rąk, napisów, znaków wodnych i elementów z innych epok.
- **Tło i kontekst epoki**: Dyskretne, klimatyczne podłoże zgodne z epoką (np. zniszczone drewniane biurko detektywa z lat 20., gazeta z lat 40., cerata lub laminat z okresu PRL).
- **Izolacja epokowa**: Każdy wariant otrzymuje unikalną nazwę `<przedmiot>-<epoka>.webp`. Zakaz ponownego tworzenia assetów wspólnych (`*-shared.webp`).

## 5. Następne kroki

1. Zatwierdzenie estetyki 36 próbek priorytetowych z sekcji 3 przez PO.
2. Realizacja partii grafik dla epok o najwyższym deficycie (w szczególności `1930s`: 0% gotowych, `1980s`: 1% gotowych, `1940s`: 3% gotowych, `1890s`: 4% gotowych).
3. Stopniowa aktualizacja manifestu i podmienianie statusów z `missing_era_asset` na `ready` wraz z wprowadzaniem dedykowanych plików WebP.
