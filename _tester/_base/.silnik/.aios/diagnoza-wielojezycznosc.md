# Diagnoza i Plan Wdrożenia: Dwujęzyczność (PL/EN)

> [!CAUTION]
> **Skala operacji:** Ogromna (Wymaga modyfikacji w niemal każdej warstwie aplikacji od UI, przez API, po Prompty AI). Z tego powodu wymagany jest rygorystyczny proces etapowy i zabezpieczenie kodu.

## 1. Zabezpieczenie kodu (Branching)
Zanim dotkniemy jakiejkolwiek logiki, musimy stworzyć na GitHubie osobnego brancha:
`git checkout -b feature/i18n-bilingual`
Dzięki temu Główna Gałąź (`main`) pozostanie w stanie nietkniętym, a w razie kłopotów jednym poleceniem wrócimy do punktu wyjścia.

## 2. Diagnoza plików do przebudowy (Blast Radius)

Mechanizm wielojęzyczności dotknie następujących sfer:

### A. Ekran Startowy i Mechanika (Middleware)
* **Wymagane pliki:** `src/middleware.ts` (do stworzenia), `src/app/layout.tsx`, `src/app/page.tsx`.
* **Koncepcja:** Zastosowanie biblioteki np. **`next-intl`**. Przy wejściu na stronę główną, aplikacja sprawdzi zapisany stan (np. ciasteczko `locale`). Jeśli go brak – wyświetli ekran powitalny na zimnym starcie (Wybór: "Zagraj po polsku / Play in English").
* Adresy URL zmienią się na `/[locale]/...` (np. `/pl/chat` i `/en/chat`).

### B. Elementy Interfejsu (UI i Komponenty)
* **Gdzie:** Cały katalog `src/components/` oraz pliki `page.tsx` we wszystkich widokach.
* **Co:** Wszystkie twardo zapisane stringi (przyciski, powiadomienia, opisy statystyk, interfejs ekwipunku, okienka modalne).
* **Rozwiązanie:** Zastąpienie ich dynamicznymi zmiennymi, ciągnącymi tłumaczenia z dwóch nowych plików: `messages/pl.json` oraz `messages/en.json`.

### C. Mechanika RPG i Karta Postaci
* **Gdzie:** Głównie w logice rzutów kośćmi oraz interfejsach typów w `src/types/` i ewentualnych plikach z katalogu `src/lib/`.
* **Co:** Skille, statystyki (Siła -> Strength, Poczytalność -> Sanity).
* **Problem:** Z racji odrzucenia wstecznej kompatybilności zapisów, możemy swobodnie refaktorować nazwy atrybutów i umiejętności na czyste, abstrakcyjne klucze (np. `stat_str`), a proces ich tłumaczenia przeprowadzać wyłącznie na etapie renderowania ekranu.

### D. Treści Przygód i Lore
* **Gdzie:** `src/lib/adventures-data.ts`, `content-library` itp.
* **Co:** Intro do scenariuszy, opisy postaci, instrukcje poszczególnych przygód.
* **Rozwiązanie:** Będziemy musieli wygenerować angielskie odpowiedniki wszystkich scenariuszy i ustrukturyzować ten obiekt (aby zwracał przygody po EN, gdy wybrany jest język EN).

### E. Prompty i Narracja (AI System)
* **Gdzie:** `src/lib/prompts/gm-protocol.ts` (oraz inne w tym folderze).
* **Co:** System zarządza logiką Strażnika Tajemnic. 
* **Wybór strategiczny (Do decyzji):** 
    * *Opcja 1:* Dwa osobne pliki z promptami (`gm-protocol-pl.ts` i `gm-protocol-en.ts`). Utrzymanie tego jest trudniejsze, bo każdą zmianę mechaniki trzeba kodować podwójnie.
    * *Opcja 2 (Rekomendowana):* Przepisanie Promptów na język **angielski** (AI lepiej rozumie instrukcje systemowe w EN) z dynamicznym wstrzykiwaniem komendy: `[CRITICAL RULE] You must narrate, output text, and talk to the player STRICTLY in {{LANGUAGE}}. The user interface language is {{LANGUAGE}}.`

## 3. Proponowane Etapy (5-Phase Workflow)

Zamiast robić to za jednym zamachem (co przy liczbie +500 plików doprowadzi do chaosu), proponuję 5 wyizolowanych kroków:

* **Faza 1: Architektura i Setup:** Stworzenie brancha, dodanie `next-intl`, konfiguracja middleware, pliki `.json` ze słownikami oraz stworzenie ekranu wyboru języka na starcie.
* **Faza 2: Abstrakcja UI:** Przejście przez wszystkie główne komponenty React i podpięcie ich pod słownik (pozbycie się hardcodowanego polskiego z plików `.tsx`).
* **Faza 3: Mechanika i Backend:** Ujednolicenie nazw współczynników rzutów kości i przesyłanie wybranego języka w zapytaniach do API.
* **Faza 4: Inteligencja (Prompty):** Przebudowanie plików z folderu `prompts` tak, aby AI w 100% dostosowywało język swojej outputowej prozy do wybranego języka.
* **Faza 5: Treść (Adventures):** Przetłumaczenie zawartości `adventures-data.ts` i dogranie pozostałych statycznych tekstów.

## 4. Pytania do Ciebie (Wizjonera)

Zanim przystąpimy do pisania pierwszej linijki kodu, musimy ustalić trzy rzeczy:
1. **Biblioteka:** Czy zgadzasz się na użycie `next-intl`? To standard branżowy dla Next.js, ale wymaga zmiany struktury folderów w `app/` (przeniesienie wszystkiego do `app/[locale]/`).
2. **Prompty:** Czy wolisz utrzymywać osobne pliki z promptami dla PL i EN, czy ujednolicamy główny systemowy prompt (np. po angielsku, by model LLM lepiej rozumiał instrukcje), z dynamiczną instrukcją narzucającą w jakim języku ma pisać do gracza?
3. **Ekran Powitalny:** Czy po wejściu na adres aplikacji ekran wyboru języka ma być oddzielną stroną na którą trafia nowy użytkownik, czy raczej drobnym popupem/modale przed startem kampanii?
