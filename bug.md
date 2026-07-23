# 🐛 Raport Błędów i Spostrzeżeń (bug.md)

Data rejestracji: 2026-07-23  
Projekt: Strażnik Tajemnic AI  

---

## 🎨 1. Interfejs Użytkownika (UI / UX) & Układ

- **[UI-01] Nowy Nagłówek (Header Bar UI):**
  - Obecny pasek podaje tylko miasto (`📍 Boston`) i marnuje przestrzeń.
  - Wymóg: Wyświetlanie szczegółowej lokacji (`📍 Kawiarnia Dormand’s · Boston`) pobieranej z tagu `[LOKACJA:]`.
  - Wymóg: Jawne słowne opisy pogody i fazy księżyca w psku zamiast wyłącznie ikonek po najechaniu (np. `☁️ Gęsta mgła | 🌗 Nów`).
- **[UI-02] Przycisk "Eksport MD" w Karcie Postaci:**
  - Przycisk nakłada się dolną krawędzią na złotą linię ramki karty (`AKTA ŚLEDCZE`). Trzeba go przesunąć o kilka pikseli w górę.
- **[UI-03] Dublowanie Ekwipunku w Karcie Postaci:**
  - Dolna sekcja modala Karty Postaci zawiera zdublowaną sekcję ekwipunku.
  - Wymóg: Usunięcie ekwipunku z Karty Postaci – ekwipunek ma znajdować się wyłącznie pod przyciskiem `Ekwipunek` w prawym sidebarze.
- **[UI-04] Prostokątne Portrety Postaci na Czacie:**
  - Zamiast małego kółka awatara gracza na czacie, wykorzystać pełną wysokość obszaru wiadomości na prostokątny portret retro.
- **[UI-05] Pełnoekranowy Podgląd Rekwizytów (Full-Screen Inspector):**
  - Podgląd rekwizytów/przedmiotów otwiera się w sztucznym, małym okienku modala z podwójną ramką.
  - Wymóg: Usunięcie małej ramki na rzecz pełnoekranowego podglądu rekwizytu (duża grafika z rewolwerem/pismem + opisy).
- **[UI-06] Licznik Ekwipunku i Odznaka Powiadomień (UX Fix):**
  - Usuwamy stałą cyfrę `8` z przycisku Ekwipunek.
  - Powiadomienie (odznaka `NEW` / kropka) pojawia się TYLKO przy zdobyciu nowego przedmiotu w trakcie gry (tag `[ZDOBYTY_PRZEDMIOT]`). Po obejrzeniu przedmiotu odznaka znika.

---

## 🖼️ 2. Generowanie i Renderowanie Grafik (Assety & Koszty)

- **[IMG-01] Brakujące Grafiki Przedmiotów / Pętla Generowania:**
  - Przedmioty w oknie ekwipunku utkną w stanie `GENERUJ` / placeholderem (np. *Zniszczona odznaka*, *Koperty na dowody*).
  - Pętla nieudanych prób generowania nabiła 21 obrazów w tle i zwiększyła koszt sesji.
  - Wymóg: Przypisywanie statycznych obrazków z katalogu przedmiotów startowych oraz naprawa generowania.

---

## 🎬 3. Logika Sesji & Rozwój Postaci (Session Finale)

- **[LOG-01] Dwuetapowy Przepływ "Koniec Sesji" & Faza Rozwoju:**
  - Przycisk "Koniec Sesji" nie może od razu ucinać gry.
  - **Krok 1:** Kliknięcie ➔ AI przygotowuje domknięcie sceny i zadaje ostatnie pytanie `[Co robisz?]`.
  - **Krok 2:** Gracz wykonuje finałową akcję/gest.
  - **Krok 3:** MG wygłasza monolog z cliffhangerem (lektorem).
  - **Krok 4:** Pod wiadomością wyświetla się **Ekran Fazy Rozwoju CoC 7e** (testy udanych umiejętności `[✓]` z awansem +1k10% i nagrodą SAN) oraz ramka podziękowania i zapisu.

---

## 👤 4. Postacie & Biografie (Predefined Characters)

- **[CHA-01] Rozbudowa Biografie Predefiniowanych Postaci:**
  - Biografie w `predefined-characters.ts` są zdawkowe i 1-zdaniowe.
  - Wymóg: Przepisanie wszystkich 8 aspektów tła (Backstory, Wygląd, Przekonania, Ważna Osoba, Znaczące Miejsce, Cenny Przedmiot, Kluczowa Więź) na bogate, wieloakapitowe opisy z duszą i atmosferą.

---

## 🎙️ 5. Lektor & Synteza Audio (TTS)

- **[TTS-01] Instant Streaming (Szybki Start Lektora):**
  - Lektor czekał nawet minutę przy długim otwarciu. Wymóg: natychmiastowe wysyłanie pierwszego zdania (od ~25 znaków) do TTS, aby lektor ruszał po 2-3s.
- **[TTS-02] Naprawa Multi-Voice dla NPC:**
  - NPC mówił głosem narratora zamiast własnym. Wymóg: sprawne przypisywanie dedykowanych głosów z katalogu Gemini per NPC przy parsowaniu `Imię: „dialog”`.
- **[TTS-03] Polskie Znaki Diakrytyczne:**
  - Lektor sporadycznie omijał polskie znaki (*ą, ę, ś, ć, ż*). Wymóg: upewnienie się, że kodowanie UTF-8 i polski akcent w Gemini API działają poprawnie.
- **[TTS-04] Duchowe Zdania (Ghost Sentences):**
  - Lektor czytał na końcu zdania niewidoczne w tekstowym interfejsie. Wymóg: filtrowanie bufora audio przed ukrytymi tagami i nagłówkami.

---

## ✍️ 6. Jakość Językowa LLM (Prompty Systemowe)

- **[LNG-01] Obowiązkowy System Metryczny:**
  - Wszystkie wymiary i odległości (stopy ➔ metry, funty ➔ kg, mile ➔ km) MUSZĄ być podawane w systemie metrycznym, niezależnie od miejsca akcji (nawet w USA lat 20.).
- **[LNG-02] Zero Ponglish & Poprawna Polszczyzna:**
  - Zakaz wtrącania angielskich słów (*hat*, *room*) oraz likwidacja agramatyzmów (np. *"Złoty setka zaliczki jest pana"*).

---

## 📚 7. Osobny Epik (Dziennik & Tablica Badacza)

- **[EPIC-01] Przebudowa Dziennika & Tablicy Badacza od zera:**
  - Przejście na model ręczny gracza (samodzielne przypinanie poszlak z Kroniki/Notatek).
  - Naprawa łączenia węzłów sznurkami i podglądu zdjęć.
  - Dedykowany plan w osobnej sesji.
