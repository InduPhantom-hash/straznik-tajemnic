# Cel i Zakres Zmian (Życiorys vs Małe Boksy)

Użytkownik uściślił wytyczne i wskazał błąd w poprzednim założeniu. Należy ZACHOWAĆ małe, podręcznikowe boxy biograficzne (Miejsce urodzenia, Ideologia, Ważna osoba, Znaczące miejsce, Cenny przedmiot, Cechy charakteru) jako krótkie formy/hasła służące do szybkiego odwołania. 
Zamiast jednak wyświetlać "Koncept postaci", ten właśnie nadrzędny boks zostaje przemianowany na **"Życiorys"** i ma prezentować pełną, literacką (na pół strony) narrację opartą na zawartości wszystkich tych boksów.

## Zadania dla Makera:
1. **Frontend (UI) - Karta Predefiniowanej Postaci**:
   - W pliku `src/components/ui/predefined-characters-selector.tsx` odszukać sekcję z `viewingCharacter.characterConcept` z etykietą `🎭 Koncept Postaci` (L: 668-676).
   - Zmienić nazwę etykiety w tym górnym boksie na **"🎭 Życiorys"**.
   - W miejsce dotychczasowego wstrzyknięcia `{viewingCharacter.characterConcept}` wstawić długi tekst z `{viewingCharacter.backstory}`.
   - Usunąć duplikat – stary dolny boks "📜 Biografia i Życiorys Postaci", który znajduje się niżej (L: 730-741), ponieważ jego zawartość została podciągnięta do pierwszego górnego boksu.
   - Pomiędzy nowym "Życiorysem" na górze, a "Tłem fabularnym" na dole – **ZACHOWAĆ** wyświetlanie siatki z małymi boksami (Miejsce urodzenia, Ideologia itd.).

2. **Dostosowanie Typów**:
   - Pola typu pozostają jak były, bez destrukcji dla bazy danych.

## Twarda Weryfikacja:
- Należy odpalić kompilator `npx tsc --noEmit`
- Linter `npm run lint`
- Jeśli będą błędy, naprawić je w kodzie.
