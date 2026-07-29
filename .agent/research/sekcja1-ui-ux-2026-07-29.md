## Research: Sekcja 1 - UI/UX Globalne
Data: 2026-07-29
Stack: Next.js 14, React 18, Tailwind CSS, shadcn/ui

### Obszar problemu
1. **`src/app/globals.css` (Mosiężne scrollbary):** Mosiężne scrollbary są prawidłowo wdrożone za pomocą zmiennych `--brass` i `--gold` oraz w regułach `.dark`. Jednak w wariancie `.light` całkowicie brakuje przypisania kolorów dla tych zmiennych. Przy przełączeniu na jasny motyw scrollbary i akcenty stają się wadliwe/niewidoczne.
2. **`src/components/ui/campaign-clock.tsx` (Powrót ikon pogody):** Logika z `lucide-react` istnieje (funkcja `getWeatherEmoji`). Ikony poprawnie ładują się z managera czasu, jednak renderowanie jest warunkowane (`if (compact)`). Główny widok pełny (nieskompaktowany) ignoruje tę zmienną i w ogóle nie pokazuje zdefiniowanego stanu pogody, przez co ikona i status znikają z interfejsu.
3. **`_tester/_base/.silnik/src/components/chat/narrative/cleanup.ts` (Prompt LLM w czacie):** Wyciek promptów z obrazów bierze się z dziurawego wyrażenia regularnego (linia 44). Wyłapuje ono `Prompt:` lub `Prompt graficzny:`, ale nie obejmuje wariantów takich jak "Prompt LLM:". Model wpisujący nieoczekiwane prefiksy przełamuje mechanizm czyszczący, wypuszczając techniczne prompty na czat.

### Zależności
- Stylowanie scrollbarów zależne od klas `.light` i `.dark` Tailwind / next-themes na `html`. Zmienne wykorzystywane są globalnie w projekcie.
- Zegar kampanii korzysta synchronicznie z `timeManager` by wydobyć aktualny tekst pogody z instancji. 
- `cleanup.ts` to czysta funkcja rzutująca tekst z modelu przed renderem w widoku narracji.

### Istniejące testy
- Nie zidentyfikowano testów dla komponentu UI (`campaign-clock.tsx`). `cleanup.ts` operuje jako główny sanitizer, więc każda zmiana regexa może być bezpośrednio zweryfikowana podczas generacji logów czatu.

### Ryzyka i uwagi
- **Globals CSS:** Uzupełnienie zmiennych dla motywu jasnego musi zachować poprawny kontrast z tłem jasnym. Oprócz dodania ich w `.light`, może istnieć konieczność zmiany na base/utilities dla specyfikacji Webkit.
- **Clock:** Dodanie komponentu w pełnym widoku może wpłynąć na flexbox i marginesy głównego headera. Zegar może się "rozjechać" w gridzie jeśli nie będzie wystarczająco dużo miejsca.
- **Cleanup Regex:** Dodawanie kolejnego warunku do catch-all'a na początku musi być bardzo ostrożne, by nie ucinać faktycznej prozy rozpoczynającej się od słów z "Prompt", ale zważając na specyfikę (wymagany dwukropek), ryzyko false-positive'ów jest minimalne.

### Rekomendowany następny krok
Problem jest w pełni rozeznany. Uzupełnienie CSS, drobny update widoku UI dla pogody oraz patch w regex'ie. Rekomenduję przejście do `/dev-2-plan` by ustrukturyzować ten zestaw zmian i określić specyfikację w oparciu o plan.
