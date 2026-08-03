## Research: Rozwinięcie Biografii Postaci
Data: 2026-08-02

### Mapowanie (Wiedza z RAG + Drzewo Plików)
Analiza wykazała, że postacie predefiniowane przechowują swoje opisy w dwóch głównych plikach (`predefined-characters.ts` oraz `strefa-11-characters.ts`). Każda z nich posiada wyczerpujące dane strukturalne (ideologia, wygląd, miejsce urodzenia, etc.), które jednak dotychczas nie znajdowały pełnego, narracyjnego odzwierciedlenia w zaledwie jedno- lub dwuzdaniowej biografii (`backstory` lub `background`). Zgodnie z wytycznymi Użytkownika i mechaniką CoC/Zew Cthulhu, biografia (od teraz pole `backstory`) powinna płynnie wplatać cechy z tychże boxów w treść o objętości ok. 200-300 słów.
Obecny kreator ręczny/interfejs do manualnego tworzenia postaci z API jeszcze nie istnieje wprost (jest zaplanowany w krokach Onboardingu - Etap 0.5), jednak architektura na przyszłość musi zakładać prompt budujący obszerny życiorys zebrany na bazie formularzy Gracza.

### Obszar problemu
- `/Volumes/Karta/Developer/straznik-tajemnic/src/lib/immersion/predefined-characters.ts` - Zawiera definicje postaci predefiniowanych (ery Gaslight, Classic itp.). Należy zmodyfikować pole `backstory` dla kilkunastu postaci, łącząc narracyjnie informacje z pól pomocniczych.
- `/Volumes/Karta/Developer/straznik-tajemnic/src/lib/immersion/strefa-11-characters.ts` - Dedykowane postacie z polskiego odpowiednika (Tomasz Nowicki, Helena Krawczyk, dr Barbara Zawadzka, Ryszard Kaczmarek). Podobna refaktoryzacja pola `backstory`.

### Blast Radius Analysis (Zagrożenia i Skutki Uboczne)
- Rozrost długości `backstory` (Biografii Postaci) nie uszkodzi układu karty wyboru. Interfejs karty w pliku `src/components/ui/predefined-characters-selector.tsx` obsługuje długie bloki tekstowe przez swobodny rozwój bloku CSS (`whitespace-pre-line`) oraz przewijanie okna modalu.
- Zwiększony rozmiar obiektów postaci spowoduje przesłanie większego kontekstu do modelu LLM w trakcie gry (wstrzyknięcie pełnej historii w pipeline czatu). Jest to wysoce pożądane: znacząco poprawi jakość immersji i pamięć AI bez przekraczania limitu tokenów (Gemini 3.6 Flash czyta długie prompty bazowe).

### Zależności (Testy i Markdowny do aktualizacji)
- Ewentualnie zaplanować zasady dla generatora nowych postaci ręcznie przez graczy, gdy ta część w `state.md` (Onboarding) zostanie odblokowana. Prawdopodobnie do wdrożenia będzie mały endpoint AI służący do konwersji zebranych z formularza tagów/ideologii na 300-słowny życiorys przed zapisem w bazie.

### Rekomendowany następny krok
Przejście do kodowania (czyli /dev-4-implement bez fazy dev-2-plan, jako że zmiana ma charakter głównie contentowy) - napisanie rozbudowanych, "pełnokrwistych" historii i wdrożenie ich w wymienionych plikach predefiniowanych.
