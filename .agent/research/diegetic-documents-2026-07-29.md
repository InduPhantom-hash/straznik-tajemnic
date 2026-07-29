## Research: System generowania dokumentów fabularnych
Data: 2026-07-29
Stack: Next.js 14, React, Tailwind CSS

### Obszar problemu
- **`src/components/ui/equipment-detail-dialog.tsx`**: Główny modal prezentujący przedmioty. Ma już zaimplementowaną logikę sprawdzania, czy przedmiot jest dokumentem (np. kategoria `document`, `artifact`, `isReadable`). Posiada przycisk "Przeczytaj dokument", który po kliknięciu wywołuje `/api/equipment/read-item`. Kiedy wygenerowana treść (`readableContent`) jest gotowa, modal ładuje komponent `<DiegeticDocumentViewer>`.
- **`src/components/ui/diegetic-document-viewer.tsx`**: Moduł w stylu "Dark Art Déco", operujący klasami Tailwind CSS do renderowania realistycznych kształtów rekwizytów na podstawie `documentType` (np. dowód tożsamości z miejscem na portret gracza, stara teczka policyjna, gazeta, klasyczny notatnik). Posiada już system filtrów, fontów i nakładających się warstw z cieniami, symulując fizyczne wycinki (rekwizyty / handouts).
- **`src/app/api/equipment/read-item/route.ts`**: Endpoint obsługujący leniwe generowanie treści dokumentu. Wysyła prompt do Gemini, prosząc o narracyjny, lovecraftowski wsad od autentycznego twórcy notatki/listu, a nie prozę MG. Zwraca czysty tekst gotowy do wyświetlenia przez widżet `DiegeticDocumentViewer`.

### Zależności
- **Data Flow**: Podczas eksploracji, AI MG generuje odpowiedź z tagiem AI `[ZDOBYTY_PRZEDMIOT: @Gracz | Nazwa | Opis]`. Regex parsera w `src/lib/acquired-equipment.ts` to wyłapuje i zamienia w powiadomienie na czacie. Po zatwierdzeniu przez gracza, wywoływana jest funkcja `createAcquiredEquipmentSeed`.
- **Typ Dokumentu (`documentType`)**: Obecnie mamy `inferDocumentType` w `acquired-equipment.ts`, które parsuje nazwę na typ (np. list, gazeta, akta). Brakuje jednak podpięcia tego pod finalny obiekt `EquipmentItem` dodawany do ekwipunku postaci (co zgłosił Subagent B).
- **Leniwe vs Eager Generowanie**: Na ten moment treść przedmiotu jest generowana asynchronicznie po dodaniu przedmiotu, dopiero jak gracz kliknie w przycisk "Przeczytaj" (`readableContent`). Dzięki temu system działa wydajniej podczas normalnej pracy i ogranicza zbędne zapytania do LLM.

### Istniejące testy
- **`src/components/ui/equipment-detail-dialog.test.tsx`**: Sprawdza poprawne wczytywanie szczegółów, wyzwalacz "Przeczytaj dokument" dla kategorii dokumentowych, ładowanie zmockowanej odpowiedzi z API i renderowanie pełnej treści w przypadku jej obecności. Wprowadzone przez nas zmiany nie mogą zaburzyć logiki zmiany stanu modala.
- **Wzorce wizualne (CSS/Tailwind)**: Opieramy się na customowych czcionkach (`font-special-elite`, `font-serif`), specjalnie dobranych paletach "postarzanego papieru" (`#d9cbb0`, `#ebdfc6`) oraz rzucających cień zagnieżdżonych `div`ach z pseudo-elementami symulującymi tekstury i stemple.

### Ryzyka i uwagi
- **Puste generowania (Infinite Loop fallback)**: Poprzednie zlecenia (z sesji 29 lipca) naprawiły crashe pętli renderowania awatarów i fallbacków. Nasz `DiegeticDocumentViewer` musi z nich korzystać (szczególnie kiedy rysuje np. placeholder na zdjęcie w legitymacji, którego gracz nie posiada w postaci).
- **Spójność Typów**: Musimy się upewnić, że `createAcquiredEquipmentSeed` przypina wywnioskowany `documentType` w obiekcie, ponieważ bez niego dokumenty mogą wchodzić tylko z ogólnym generycznym layoute'm listu w widżecie diegetycznym.

### Rekomendowany następny krok
Przejście do `/dev-2-plan`.
Zidentyfikowane zadania do implementacji:
1. Rozszerzenie `createAcquiredEquipmentSeed` w `src/lib/acquired-equipment.ts` o przypinanie `documentType` dla obiektów typu dokument.
2. Zaktualizowanie testów, jeśli dodanie nowej właściwości wymaga obsłużenia nowego przypadku brzegowego w parserze.
3. Potwierdzenie z użytkownikiem, czy pozostawiamy leniwe generowanie zawartości (przycisk w `EquipmentDetailDialog.tsx`), czy przebudowujemy system tak, aby dokument wchodził od razu wypełniony na czacie (co by wymagało głębokiej modyfikacji regexu). 
   - *Rekomendacja dla Użytkownika*: Zostawmy obecny system leniwego generowania. Jest bezpieczniejszy dla okna kontekstowego i nie spowalnia płynności chatu.
