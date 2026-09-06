# v0.9.4 - karta wydania (macOS)

## Status
W przygotowaniu. Ten dokument stanowi specyfikację zakresu wydania v0.9.4 oraz bramki jakościowej przed publikacją paczki.

---

## Zawartość komunikatu wydaniowego

### Polski
Wydanie **v0.9.4** wprowadza kompleksową standaryzację interfejsu w stylu **Dark Art Déco 1920s** (ciepła czerń węgla, mosiądz, postarzane złoto, typografia maszynopisu i brak surowych szarości), pełną implementację **Fazy Rozwoju Postaci CoC 7e RAW** (automatyczne oznaczanie użytych umiejętności, testy rozwoju po sesji i podbicia 1k10 punktów), deterministyczny dobór startowego wyposażenia według profesji i zamożności oraz zoptymalizowany lokalny silnik RAG oparty na binarnych wektorach Float32. Wydanie obejmuje wyłącznie samodzielną paczkę aplikacji na system macOS.

### English
The **v0.9.4** release introduces a comprehensive **Dark Art Déco 1920s** design system standardization (charcoal black, brass, aged gold, vintage typewriter fonts), full implementation of the **CoC 7e RAW Character Development Phase** (automated skill usage tracking, post-session development checks, and 1d10 stat progression), deterministic profession-based starting equipment, and an optimized local vector RAG engine powered by binary Float32 files. This release is distributed exclusively as a standalone macOS package.

---

## Główne filary wydania v0.9.4

1. **Design System Dark Art Déco 1920s (Epic #165):**
   - Usunięcie ponad 200 naruszeń surowego flat designu (`zinc-*`, `gray-*`, `text-white`) na rzecz semantycznych tokenów (`--card`, `--brass`, `--gold`, `--foreground`, `--primary`, `--destructive`).
   - Ujednolicony klimat w oknach dialogowych, modalu Fazy Rozwoju, panelu licznika tokenów, karcie badacza i tablicy dowodowej.
2. **Faza Rozwoju Postaci CoC 7e RAW:**
   - Automatyczna rejestracja udanych testów umiejętności w trakcie sesji.
   - Narzędzie rozliczania postępów badacza po zakończeniu śledztwa (rzut k100 > aktualnej wartości umiejętności = podbicie o 1k10) zintegrowane z trwałym zapisem gry.
3. **Deterministyczny Ekwipunek i Ekonomia:**
   - Przypisanie historycznych zestawów startowych na podstawie zawodu i wskaźnika Majętności (Credit Rating). Eliminacja zmyślania cen i przedmiotów przez model językowy.
4. **Lokalny RAG & Optymalizacja Pamięci RAM:**
   - Wdrożenie binarnego formatu Float32 (`*.bin` + `*.meta.json`) eliminującego narzut pamięciowy i zależność od zewnętrznych baz wektorowych.
5. **Dedykowany Przewodnik Inżynierski (`CONTRIBUTING.md`):**
   - Sformalizowane zasady topologii silnika, 5 żelaznych inwariantów, symetrii i18n oraz pętli testowej dla współpracowników.

---

## Twarda Bramka Publikacji (Release Gate)

Przed utworzeniem tagu i publikacją paczki ZIP na GitHub Releases muszą zostać spełnione następujące warunki:
- [ ] `npm run navigation:check` oraz `npm run navigation:guard` (kod 0 - brak dryfu tras i modali).
- [ ] `npm run qa:quick` (zielony type-check `tsc`, 100% symetrii kluczy `pl.json` i `en.json`).
- [ ] `npm run audit:art-deco` (0 naruszeń w zrefaktoryzowanych modułach).
- [ ] Wszystkie testy jednostkowe Jest przechodzą pomyślnie (`npm test`).
- [ ] Testy E2E Playwright bez błędów konsoli runtime.
- [ ] Zgodność save/load z wersją v0.9.3 bez utraty stanu postaci ani notatek.
- [ ] Świeża paczka macOS zbudowana przez `bash desktop/build-app.sh --rebuild` z potwierdzonym `BUILD_ID`.
- [ ] Ręczna weryfikacja i akceptacja wizualna na Biurku gracza.
