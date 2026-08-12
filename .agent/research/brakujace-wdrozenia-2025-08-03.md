---
typ_wiedzy: wniosek
tematy: [debug, quick-setup, character-sheet, biografia, cold-start, launcher]
podmioty: [Strażnik Tajemnic]
ai_summary: Research trzech otwartych bugów - Quick Setup wraca do menu, biografia w złym boksie, brak przebudowy po zmianach kodu.
---

# Research: Brakujące wdrożenia (3 kluczowe bugi)

Data: 2026-08-03

## Mapowanie (Wiedza z RAG + Drzewo Plików)

Aplikacja działa z katalogu `_tester/_base/.silnik/` - to jest prawdziwy root Next.js.
Pliki w `src/` to "lustro" / kopie, ale **NIE SĄ źródłem prawdy** dla buildu.

Kluczowe pliki:
- `_tester/_base/.silnik/src/app/page.tsx` - główna strona, orchestrator stanu
- `_tester/_base/.silnik/src/components/ui/quick-setup-modal.tsx` - modal Szybkiej Przygody
- `_tester/_base/.silnik/src/components/ui/character-sheet/components/sheet-biography.tsx` - boks biografii w karcie postaci
- `_tester/_base/.silnik/src/components/ui/predefined-characters-selector.tsx` - selektor postaci
- `_tester/_base/.silnik/src/lib/immersion/strefa-11-characters.ts` - dane postaci Strefy 11
- `_tester/_base/.silnik/src/hooks/useFirstRun.ts` - logika pierwszego uruchomienia
- `desktop/launcher.sh` - launcher desktopowy
- `desktop/cold-start.sh` - zimny start

## Obszar problemu

### Bug 1: Quick Setup Modal - po wybraniu przygody i postaci wraca do menu

**Plik**: `page.tsx` linie 402-467, `quick-setup-modal.tsx` linie 307-312

**Mechanizm awarii**:
1. Gracz wybiera przygodę i postać w modalu Quick Setup
2. Klika "Rozpocznij przygodę"
3. Modal wywołuje `onQuickStart(...)` → `handleQuickStartOnboarding()` w `page.tsx`
4. Handler ustawia postać, przygodę, zamyka wizard
5. **Kluczowy warunek (linia 462):**
   ```typescript
   if (!firstRun.loading && !firstRun.needsWizard) {
     setPendingGameStart(true);
   }
   ```
6. **Po zimnym starcie** `firstRun.needsWizard` jest `true` (bo `completedOnboarding` z localStorage jest wyczyszczone przez cold-start.sh), więc `pendingGameStart` NIGDY nie jest ustawiane → gra się nie startuje → wraca do menu.

**Alternatywna ścieżka awarii**: Nawet gdy `needsWizard === false`, modal wywołuje `onOpenChange(false)` na linia 310 quick-setup-modal.tsx - ale Quick Setup jest otwarty przez `start-mode-cards.tsx` (lokalne `quickSetupOpen` state), NIE przez `page.tsx`. Zamknięcie modala w start-mode-cards nie wywołuje żadnego efektu w page.tsx. Natomiast `handleQuickStartOnboarding` ustawia `setShowFirstRunWizard(false)` (linia 459) co ma efekt tylko gdy wizard był otwarty.

**Przyczyna root**: Brak w `handleQuickStartOnboarding` ustawienia `onboarding_completed` w localStorage ORAZ warunek na linia 462 blokuje `pendingGameStart` gdy `needsWizard === true`.

### Bug 2: Karta Postaci - biografia w złym boksie

**Plik**: `sheet-biography.tsx` linie 131-157, `strefa-11-characters.ts`

**Mechanizm**:
- Dane postaci mają DWA pola tekstowe:
  - `background`: krótki opis roli (2-3 zdania), np. "Gospodarz programu Sygnały Nieznanego..."
  - `backstory`: rozbudowana biografia (200-300 słów)
- W `sheet-biography.tsx`:
  - `background` renderuje się pod nagłówkiem "🔗 Kluczowa Więź / Maska" (linia 137)
  - `backstory` renderuje się pod nagłówkiem "📜 Biografia i Życiorys Postaci" (linia 151)
- **Problem**: `background` w danych zawiera opis zawodowy/społeczny postaci - NIE "kluczową więź" ani "maskę". Etykieta boksu jest myląca.

**To jest problem semantyczny etykiety**: pole `background` (opis tła postaci) wyświetla się pod mylącym nagłówkiem "Kluczowa Więź / Maska". Treść jest we właściwym boksie (`backstory` w "Biografii"), ale nagłówek drugiego boksu sugeruje coś innego niż jego zawartość.

### Bug 3: Zimny start nie przebudowuje aplikacji

**Pliki**: `desktop/cold-start.sh`, `desktop/launcher.sh`

**Mechanizm**:
- `cold-start.sh` czyści: sesje, profil Chrome, dane gry, RAG NPC
- **NIE czyści**: katalogu `.next/`, pliku `BUILD_ID`
- `launcher.sh` sprawdza BUILD_ID (commit c9dacaf dodał to), ale:
  - Porównuje BUILD_ID z `.next/BUILD_ID` na dysku vs odpowiedź serwera
  - Jeśli serwer nie działa → uruchamia `npm start` z istniejącym buildem
  - **Brak `npm run build` w launcher.sh** - tylko `npm start` (linia 95-98 w launcher.sh)
  - `build-app.sh` robi `npm run build` tylko z flagą `--rebuild` lub gdy brak BUILD_ID

**Problem**: Gdy agent zmieni pliki źródłowe, a stary build jest na dysku, launcher uruchomi STARY KOD. Żeby zobaczyć zmiany, trzeba ręcznie odpalić `npm run build` w silniku lub `build-app.sh --rebuild`.

## Blast Radius Analysis

| Zmiana | Pliki do edycji | Ryzyko kaskadowe |
|---|---|---|
| Fix Quick Setup flow | `page.tsx` (handleQuickStartOnboarding) | Niskie - zmiana warunku na linia 462 |
| Fix etykiety biografii | `sheet-biography.tsx` (linia 137) | Zerowe - zmiana tekstu nagłówka |
| Dodanie rebuildu do cold-start | `cold-start.sh` | Średnie - wydłuży zimny start o ~30s buildu |

## Zależności (Testy i Markdowny do aktualizacji)

- `state.md` - po naprawie bugów zaktualizować statusy
- `zadania.md` - zamknąć odpowiednie taski
- Brak testów automatycznych dla Quick Setup flow - warto dodać smoke test

## Rekomendowany następny krok

Trzy niezależne poprawki, które można zrobić w jednym kroku `/dev-4-implement`:

1. **Quick Setup flow** (~5 min): W `handleQuickStartOnboarding` dodać `localStorage.setItem('onboarding_completed', 'true')` PRZED warunkiem `pendingGameStart`, oraz usunąć warunek `!firstRun.needsWizard` z linii 462 (bo Quick Setup omija wizard z definicji).

2. **Etykieta biografii** (~1 min): Zmienić nagłówek "🔗 Kluczowa Więź / Maska" na "🔗 Tło i Rola Fabularna" w `sheet-biography.tsx` linia 137.

3. **Cold start + rebuild** (~3 min): W `cold-start.sh` dodać `cd "$SILNIK_DIR" && npm run build` przed wywołaniem launchera.

→ **Idziemy do `/dev-2-plan`** z tymi trzema poprawkami.
