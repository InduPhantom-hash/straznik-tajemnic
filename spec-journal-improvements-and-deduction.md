# Specyfikacja Techniczna: Udoskonalenie Dziennika, Portretów NPC i Mechaniki Dedukcji (CoC 7e RAW)

> **Data:** 2026-08-15  
> **Priorytet:** Wysoki  
> **Status:** Do wdrożenia (Approved: Opcje A dla punktów 1, 2, 3, 4)

---

## 1. Zakres Zmian

### Moduł 1: Liczniki i Czytelność w Odkryciach (`discoveries-view.tsx` & `session-journal.tsx`)
- Poprawa stylizacji badge'y liczników kategorii (Miejsca, Postacie, Przedmioty, Misje):
  - Wysoki kontrast: `bg-[#bfa15f]/25 text-[#f4ebd0] border border-[#bfa15f]/60 font-mono text-xs font-bold px-2 py-0.5 rounded-full`.
  - Poprawne mapowanie wszystkich typów encyklopedycznych i dynamicznych (`location`, `encyclopedia_location`, `npc`, `encyclopedia_character`, `item`, `encyclopedia_item`, `discovery`, `quest`).
  - Usunięcie mylących czerwonych kropek powiadomień z zakładki głównej "Odkrycia", zastąpienie czytelnym licznikiem sumarycznym.

### Moduł 2: Portrety NPC, Visual DNA & Diegetyczny Fallback
- **Automatyczna synchronizacja:** Gdy w czacie wygenerowany zostanie obraz dla tagu `[PORTRET: Imię, opis]`, system aktualizuje pole `imageUrl` we wpisie postaci w Dzienniku / Aktach Sprawy.
- **Visual DNA w promptach MG:** Wzbogacenie instrukcji reżyserskich i reguł `image-instructions.ts` o bezwzględny wymóg zachowywania cech fizycznych (wiek, ubiór, detale twarzy) w każdym kolejnym renderze NPC.
- **Klimatyczny Fallback w Dossier:** Gdy NPC nie posiada jeszcze wygenerowanego zdjęcia, w aktach wyświetla się stylizowana rycina sylwetki / pieczęć akt policyjnych z epoki z napisem *„ARCHIWUM POLICJI :: FOTOGRAFIA W TRAKCIE WYWOŁYWANIA”* zamiast pustej białej plamy.

### Moduł 3: Wizualizacja Przedmiotów i Rekwizytów
- W Aktach Sprawy (`discoveries-view.tsx`) dla przedmiotów:
  - Automatyczne dopasowanie do biblioteki `/equipment/catalog/` na podstawie nazwy lub tagów.
  - W przypadku braku dopasowania: renderowanie diegetycznego komponentu `EquipmentImagePlaceholder` z ikoną i barwą kategorii (artefakt, broń, dokument, okultyzm, medycyna, narzędzie).

### Moduł 4: Inteligentna Dedukcja MG (CoC 7e RAW & Wiedza Domenowa)
- **Modal Dedukcji (`DeductionModal`):**
  - Wybór trybu testu:
    1. **Umiejętność Domenowa / Specjalistyczna:** Gracz wybiera konkretną wiedzę badacza (np. *Medycyna*, *Okultyzm*, *Spostrzegawczość*, *Historia*, *Nauka*, *Psychologia*, *Mechanika*, *Wiedza o Mitach*) do zbadania wybranego dowodu.
    2. **Rzut na Pomysł (Idea Roll - INT):** Zgodnie z CoC 7e RAW – ogólny rzut ratunkowy na Inteligencję (INT) dla zablokowanych śledczych.
  - Wybór badanego dowodu/poszlaki z listy na tablicy.
  - Rzut k100 z kalkulacją progów sukcesu CoC 7e (Zwykły, Trudny, Ekstremalny, Krytyk, Porażka, Fumble).
- **Integracja z AI (Strażnik Tajemnic):**
  - Wysłanie zapytania do endpointu `/api/ai/utility` lub dedykowanego handlera z danymi: badacz, umiejętność, wynik rzutu, badany dowód, zebrane poszlaki.
  - Generowanie autentycznego, fabularnego wniosku śledczego:
    - *Sukces:* odkrycie kluczowego faktu / zależności bez ryzyka.
    - *Porażka:* trop obarczony komplikacją, ryzykiem lub stratą czasu (RAW).
  - Wniosek zapisuje się bezpośrednio w `investigatorInsight` badanego dowodu bez tworzenia niepotrzebnych, pustych kafelków.

---

## 2. Plan Wdrożenia

1. **`src/components/ui/journal/discoveries-view.tsx`:**
   - Zaktualizować style liczników kategorii (wysoki kontrast, font-mono).
   - Zintegrować `EquipmentImagePlaceholder` dla przedmiotów bez `imageUrl`.
   - Zintegrować stylizowany fallback polaroidu dla NPC/lokacji bez `imageUrl`.
   - Zintegrować wyszukiwanie referencji z `entity-visual-resolver`.

2. **`src/components/ui/journal/corkboard-investigation-board.tsx`:**
   - Zastąpić prosty `IdeaRollModal` pełnym `DeductionModal` (wybór umiejętności domenowej lub INT, wybór badanego dowodu, rzut kością, wywołanie AI).
   - Zaimplementować asynchroniczne generowanie fabularnego wniosku przez endpoint `/api/ai/utility`.
   - Bezpośredni zapis do `investigatorInsight` wybranego węzła i synchronizacja ze stanem tablicy/postaci.

3. **`src/lib/prompts/image-instructions.ts` & `src/lib/journal/entity-visual-resolver.ts`:**
   - Rozszerzyć resolver o automatyczne dopasowywanie predefiniowanych portretów i miniatur katalogowych.
   - Wzmocnić wytyczne Visual DNA w promptach MG.

4. **Weryfikacja CI / Testy:**
   - Uruchomienie `npx tsc --noEmit` i `npm test` w `_tester/_base/.silnik`.
