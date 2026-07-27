# 🔬 Raport Badawczy: Diagnoza & Architektura Dziennika, Ekwipunku i Predefiniowanych Postaci

**Data:** 27 lipca 2026  
**Projekt:** Strażnik Tajemnic AI (`straznik-tajemnic`)  
**Tryb:** `/dev-1-research`  
**Autor:** Antigravity (Senior Architect & Executor)

---

## 📌 1. Podsumowanie Wyników Diagnozy

Przeanalizowano układ komponentów UI, logikę biznesową oraz zapisy danych w przestrzeni projektu. Zidentyfikowano dokładnie przyczyny opisywanych usterek i braków:

1. **Okno Detali Przedmiotu (`EquipmentDetailDialog.tsx`):**
   - **Układ wizualny & Rozmiar:** Dialog stosuje jednokolumnowy układ z ograniczeniem wysokości, co w połączeniu z `aspect-square` lub `object-cover` przycina obrazy i pozostawia puste, niewykorzystane czarne tło wokół opisu. Okno zostanie powiększone i dostosowane do proporcji 2-kolumnowych.
   - **Błąd "Przeczytaj dokument":** Warunek `isDocument` aktywował się dla każdego przedmiotu mającego kategorię `artifact`, `occult` lub `isReadable`, ignorując realną czytelność (np. Talizman Ochronny). Ponadto handler `handleReadItem` wymaga zintegrowanego silnika generowania treści diegetycznej i weryfikacji czy dany przedmiot jest pismem.
   - **Niedziałający przycisk X:** Przycisk zamykania korzystał z generycznego `Button` Radix bez wymuszenia `type="button"` oraz z konfliktem zdarzeń `stopPropagation` na kontenerze głównym.
   - **Brakujące Grafiki & Fallback Placeholderów:** Jeśli automat `useEquipmentThumbnails` nie zdąży wygenerować grafiki AI, w UI brak eleganckich, dynamicznych placeholderów kategorycznych (broń, dokument, artefakt, narzędzie).

2. **Karta Postaci & Predefiniowane Postacie (`predefined-characters.ts`):**
   - **Stan biografii:** Predefiniowani Badacze posiadali zaledwie zwięzłe, 2-zdaniowe podsumowania (`background` i `backstory` mające łącznie ~80-100 słów). 
   - **Wymóg PO:** Każdą z postaci należy wzbogacić o głęboką, barwną biografię (min. 250-400 słów / pół strony A4) z uwzględnieniem genezy, sekreciarek, traum, relacji i lovecraftowskiego klimatu.

3. **Dziennik Sesji & Tablica Badacza (`session-journal.tsx`, `corkboard-investigation-board.tsx`):**
   - **Stylistyka & Rozmiar:** Dziennik odstawał wizualnie przez standardowe białe scrollbary browsera oraz brak pełnoekranowego wykorzystania przestrzeni (95vw / 92vh viewportu).
   - **Sznurki & Przycisk Usuwania:** Na Tablicy Badacza zdarzenia `onPointerDown` z przechwytywaniem wskaźnika (`setPointerCapture`) nakładały się z kliknięciami przycisków kosza (`Trash2`) i łączenia sznurkiem (`Link2`). Blokowało to usuwanie notatek i powodowało zawieszanie interakcji.
   - **Przebudowa Systemu Odkryć & Szuflady Poszlak:** Obecne zakładki "Misje" / "Encyklopedia" nie realizują celów badawczych. Wymagana jest czysta restrukturyzacja na **Odkrycia** (Miejsca, Postacie, Przedmioty, Informacje) z bocznym panelem szczegółów i przyciskiem *"Dodaj do szuflady poszlak"*.

---

## 🔍 2. Szczegółowy Audyt Obszarów Kodowych

### Obszar A: Ekwipunek i Modal Przedmiotu
- **Główny plik:** `src/components/ui/equipment-detail-dialog.tsx`
- **Wywołania pomocnicze:** `src/hooks/useEquipmentThumbnails.ts`, `src/lib/acquired-equipment.ts`
- **Diagnoza problemu:**
  1. `isDocument` w `equipment-detail-dialog.tsx` (linia 92):
     ```typescript
     const isDocument = item.category === 'document' || item.category === 'artifact' || item.category === 'occult' || item.isReadable;
     ```
     *Fix:* Zmiana warunku tak, aby przycisk czytania pojawiał się **wyłącznie** dla przedmiotów będących dokumentami, pismami, prasą lub mających jawnie flagę `isReadable: true` oraz ustrukturyzowany tekst.
  2. *Przestrzeń wizualna:* Przebudowa z ukierunkowaniem na responsywny flex/grid 2-kolumnowy (strona lewa: wyrenderowana grafika / placeholder w wysokiej rozdzielczości z efektem postarzania, strona prawa: parametry, historia przedmiotu, statystyki CoC 7e oraz opcje diegetyczne).
  3. *Placeholder Graficzny:* Stworzenie dedykowanego komponentu `EquipmentImagePlaceholder` w oparciu o autorskie SVG (dla kategorii: `weapon`, `document`, `artifact`, `tool`, `occult`, `medicine`, `clothing`), wyświetlanego natychmiast gdy `imageUrl` jest niedostępne.
  4. *Przycisk Zamykania (`X`):* Dedykowany element `<button type="button" onClick={onClose}>` z wysokim `z-index` i dużą powierzchnią dotyku (`min-w-[44px] min-h-[44px]`).

---

### Obszar B: Biografie Predefiniowanych Badaczy
- **Główny plik:** `src/lib/immersion/predefined-characters.ts`
- **Zakres zmian:**
  - Wzbogacenie wpisów dla 30 predefiniowanych postaci z 3 er (Gaslight 1890s, Classic 1920s, Modern 1990s/2000s).
  - Rozbudowa pól `background` i `backstory` do pełnych, dramatycznych historii życiowych zawierających:
    1. **Młodość i punkt zwrotny:** Co ukształtowało bohatera przed pierwszym zetknięciem z nieznanym.
    2. **Mroczny epizod / Sekret:** Wydarzenie, które zasiało pierwsze ziarno niepokoju lub traumy.
    3. **Motywacja Śledcza:** Dlaczego postać zaryzykuje życie i poczytalność dla rozwiązania tajemnicy.
    4. **Relacje i Więzi:** Pogłębiony opis ważnych postaci niezależnych (`significantPerson`) oraz cennego przedmiotu.

---

### Obszar C: Nowy Silnik Dziennika Sesji & Tablica Badacza
- **Główne pliki:** 
  - `src/components/ui/session-journal.tsx`
  - `src/components/ui/journal/corkboard-investigation-board.tsx`
  - `src/types/investigator-board.ts`
  - `src/lib/journal/convert-entries.ts`

- **Architektura Przebudowy Dziennika:**
  ```
  +-----------------------------------------------------------------------------------+
  | DZIENNIK SESJI (Full-screen Modal 95vw / 92vh, Ciemny motyw Art-Deco / Lovecraft) |
  +-----------------------------------------------------------------------------------+
  | Zakładki: [ 📌 TABLICA BADACZA ] [ 🔍 ODKRYCIA ] [ 📜 KRONIKA ]                   |
  +-----------------------------------------------------------------------------------+
  |                                                                                   |
  | [ TABLICA BADACZA ]                                                               |
  |  - Płótno korkowe z możliwością przesuwania i przybliżania (Pan & Zoom)           |
  |  - Domyślnie PUSTA tablica po rozpoczęciu nowej gry                               |
  |  - Szuflada Poszlak (Drawer): Lista odkrytych dowodów do przeciągania             |
  |  - Przycisk "Nowa notatka" i czyste zamykanie/usuwanie bez blokowania wskaźnika    |
  |  - Łączenie sznurkami z wyborem koloru i etykiety w modalu                         |
  |                                                                                   |
  | [ ODKRYCIA ] (Zastępuje dawne Misje / Encyklopedię)                               |
  |  - Lewy Sidebar z podziałem: 📍 Miejsca | 👤 Postacie | 🗡️ Przedmioty | 📰 Dokumenty |
  |  - Główny Panele Podglądu: Portret / Ilustracja + Pełny Opis Fabularny             |
  |  - Przycisk: [ 📌 DODAJ DO SZUFLADY POSZLAK ]                                     |
  |                                                                                   |
  | [ KRONIKA ]                                                                       |
  |  - Chronologiczny, czytelny recap wydarzeń przyrastający scenami                  |
  |  - Najnowsze wpisy na górze, subtelne powiadomienia bez irytowania gracza         |
  |                                                                                   |
  +-----------------------------------------------------------------------------------+
  ```

---

## 🛠️ 3. Zależności i Zmiany w Plikach

| Komponent / Plik | Rola | Zakres Modyfikacji |
| :--- | :--- | :--- |
| `src/components/ui/equipment-detail-dialog.tsx` | Podgląd przedmiotu | Powiększone okno 2-kolumnowe, naprawa `isDocument`, naprawa `X`, fallback graficzny |
| `src/lib/immersion/predefined-characters.ts` | Baza badaczy | Rozbudowa biografii wszystkich postaci do pełnego formatu A4 |
| `src/components/ui/session-journal.tsx` | Kontener Dziennika | Stylizacja scrollbarów, ukrycie obcych ramek, nowa nawigacja i układ 95vw |
| `src/components/ui/journal/corkboard-investigation-board.tsx` | Tablica korkowa | Domyślnie pusta tablica, naprawa Pointer Events przy usuwaniu/łączeniu, szuflada poszlak |
| `src/components/ui/journal/discoveries-view.tsx` | [NOWY] Widok Odkryć | Wyświetlanie Miejsc, Postaci, Przedmiotów z przyciskiem "Dodaj do szuflady" |
| `src/lib/journal/convert-entries.ts` | Konwerter wpisów | Dostosowanie ekstrakcji danych z narracji AI do szuflady poszlak |

---

## 🎯 4. Rekomendacja Dalszych Kroków

1. **Przejście do Etapu `/dev-2-plan`:**  
   Przygotowanie szczegółowego planu implementacji (`implementation_plan.md`) obejmującego krok po kroku modyfikacje modali, rozbudowę tekstu postaci i budowę nowej zakładki Odkryć.
2. **Kolejność wdrażania:**
   - **Krok 1:** Naprawa wizualna i logiki Ekwipunku (`EquipmentDetailDialog.tsx`).
   - **Krok 2:** Wzbogacenie biografii predefiniowanych badaczy (`predefined-characters.ts`).
   - **Krok 3:** Przebudowa Dziennika Sesji (Tablica Badacza + Widok Odkryć + Szuflada Poszlak).
