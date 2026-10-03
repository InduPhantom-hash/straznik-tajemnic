# Przewodnik gracza (v0.9.5)

Jak prowadzić sesję śledczego RPG grozy ze Strażnikiem Tajemnic AI w wersji **v0.9.5**. Przewodnik zakłada, że masz już skonfigurowaną aplikację (patrz [`SETUP.md`](../SETUP.md)).

---

## Czym jest ta aplikacja

To **wirtualny Mistrz Gry** (Strażnik Tajemnic). Ty wcielasz się w badacza, a AI prowadzi świat: kreuje gęstą atmosferę weird fiction lat 20. XX wieku, odgrywa postacie niezależne (NPC) i reaguje na Twoje decyzje.

Mechanikę zasad (rzuty kośćmi k100, progi trudności, testy Poczytalności, utratę punktów SAN, walkę wręcz oraz rozwój badacza) liczy **kod aplikacji** w 100% deterministycznie, zgodnie z klasycznymi regułami d100 RAW. Model AI otrzymuje twardy wynik i zajmuje się wyłącznie jego sugestywnym, fabularnym opisem.

---

## 1. Tworzenie i wybór postaci

- **Własny Badacz w trybie ręcznym (Manual Setup):** W pełnym trybie przygotowania sesji tworzysz autorskiego bohatera od podstaw w Kreatorze Badacza. Określasz cechy d100, wybierasz zawód, korzystasz z filtru umiejętności (Wszystkie / Zawodowe / Rozwinięte) oraz dobierasz jedną z 12 klimatycznych retro-rycin wektorowych SVG Dark Art Déco.
- **30 Gotowych Postaci w Szybkiej Przygodzie:** Jeśli chcesz zacząć grę natychmiast, tryb Szybka Przygoda pozwala wybrać spośród 30 predefiniowanych badaczy z autorskimi biografiami (w tym postaci dla polskich scenariuszy Strefy 11).
- **Zamożność i Finanse Epoki:** Zawód i poziom zamożności (Credit Rating) automatycznie przeliczają gotówkę i majątek na waluty epoki (dolary, funty wiktoriańskie £/s/d, złote).

---

## 2. Sesja Zero i Kalibracja Bezpieczeństwa

Przed rozpoczęciem gry kalibrujesz ton rozgrywki:
- **Styl i Ton:**
  - *Purystyczny* - bezlitosny realizm, śledztwo, powolny horror psychologiczny.
  - *Pulpowy* - dynamiczna akcja, większa szansa na wyjście cało ze starć.
  - *Noir* - brudny klimat detektywistyczny, korupcja, dym papierosowy i cynizm.
- **Trudność:** Łatwy / Normalny / Trudny / Morderczy (wpływa na podpowiedzi i dotkliwość konsekwencji).
- **Linie i Zasłony (Safety Tools):** Określenie motywów, które mają zostać całkowicie wykluczone ze śledztwa lub traktowane skrótowo („za kurtyną”).

---

## 3. Rozgrywka i Mechanika Kości

Wpisujesz w polu czatu lub dyktujesz, co robi Twój badacz. AI prowadzi narrację i kończy turę pytaniem. Gdy akcja wiąże się z ryzykiem, pojawia się **Tacka na Kości**:

- **Test Umiejętności (k100):** Rzut przeciw wartości umiejętności z karty badacza:
  - *Krytyk (01)*
  - *Sukces Ekstremalny (wartość / 5)*
  - *Sukces Trudny (wartość / 2)*
  - *Sukces Zwykły (≤ wartość)*
  - *Porażka (> wartość)*
  - *Pech / Fumble (96-100 lub 100)*
- **Forsowanie Rzutu (Push Roll):** W razie porażki możesz podjąć drugą próbę, podbijając stawkę fabularną - kolejna porażka wywoła katastrofalne konsekwencje (Fail-Forward).
- **Wydawanie Szczęścia:** Możesz poświęcić punkty Szczęścia, by dociągnąć rzut do wymaganego progu sukcesu (z wyjątkiem testów Poczytalności i pecha).
- **Rzut na Pomysł (Idea Roll RAW):** Gdy śledztwo utknie w impasie, test INT wyciąga kluczowy trop logiczny (zasada Fail-Forward, bez możliwości forsowania i bez wydawania Szczęścia).

---

## 4. Bezwzględna Walka Wręcz d100 (Starcia Przeciwstawne)

Gdy dochodzi do walki, w oknie czatu pojawia się dedykowana karta starcia **`OpposedMeleeCard`**:
- **Wybór Reakcji Obrony:** Wybierasz między **Unikiem** a **Kontratakiem**:
  - *Unik:* Wygrywa w przypadku remisu poziomów sukcesu.
  - *Kontratak:* W razie remisu wygrywa napastnik.
- **Manewry Bojowe & Budowa (Build):** Różnica Budowy modyfikuje szanse powodzenia (kości karne lub całkowita niemożność wykonania manewru przeciw olbrzymom).
- **Przewaga Liczebna (*Outnumbered*):** Każdy kolejny napastnik atakujący badacza w tej samej rundzie otrzymuje kość premiową (+1K).
- **Padnij za Osłonę (*Dive for Cover*):** Natychmiastowa reakcja uniku przed ostrzałem z broni palnej kosztem utraty akcji w następnej turze.

---

## 5. Dziennik Śledztwa, Raporty Aktów i Licznik Poszlak

- **Reżyseria Scen:** Każda scena kończy się podsumowaniem ustaleń i zebranych faktów.
- **Raporty Aktów:** Podsumowania etapowe śledztwa (Fakty, Podejrzani, Luki i Wiodąca hipoteza).
- **Licznik Poszlak:** Dynamiczny wskaźnik potwierdzonych tropów w nagłówku Dziennika.
- **Quote-to-Input:** Jednym kliknięciem cytujesz wiodącą hipotezę roboczą prosto do pola akcji czatu.

---

## 6. Kompendium Badacza & Kodeks Zasad (Mini-Obsidian)

W prawym bocznym pasku narzędzi znajdziesz podręczny skarbiec wiedzy:
1. **Instrukcja Badacza & UI:** Przewodnik po 6 modułach pulpitu śledczego i kluczowych kontrolkach.
2. **Sztuka Odgrywania:** Zasady Fiction First i Fail Forward, side-by-side kontrast wpisów zwięzłych vs immersyjnych oraz przewodnik dyktowania głosowego STT.
3. **Encyklopedia Wiedzy:** Podręczny Kodeks Zasad d100 RAW, leksykon Mitów Cthulhu oraz lokalna wyszukiwarka Twojego podręcznika PDF.

---

## 7. Świadomy Ekwipunek i Finanse Epoki

- **Brak Auto-Lootu:** Rekwizyty, broń i dokumenty trafiają do ekwipunku wyłącznie po kliknięciu przycisku `[Zabierz do torby]` na karcie `[ZDOBYTY_PRZEDMIOT]`. Zwykłe notatki i tropy śledcze kierowane są automatycznie do Dossier.
- **Pełnoekranowy Widok Przedmiotów:** Szczegółowe karty rekwizytów z deterministycznymi grafikami SVG/WebP i opisami fabularnymi bez żargonu programistycznego.
- **Kompaktowy Pasek Finansów:** W nagłówku ekwipunku widzisz bieżący poziom zamożności, gotówkę i majątek przeliczone według realiów wybranej epoki (USA lat 20., Polska lat 20., PRL lat 70., epoka wiktoriańska, czasy współczesne).

---

## 8. Poczytalność (SAN) i Faza Rozwoju Postaci

- **Testy SAN:** Zetknięcie z kosmiczną grozą wyzwala test Poczytalności.
  - Utrata ≥ 5 SAN w jednym rzucie wywołuje test INT i groźbę Szoku Psychicznego.
  - Utrata 1/5 aktualnego SAN w ciągu doby wprowadza postać w stan Czasowej Niepoczytalności z atakami szału, maniami i fobiami.
- **Faza Rozwoju Postaci:**
  - Umiejętności, w których badacz odniósł sukces w trakcie gry, zostają automatycznie oznaczone do testu rozwoju.
  - W podsumowaniu sesji aplikacja wykonuje rzuty k100: jeśli wynik jest **większy** niż bieżąca wartość cechy, umiejętność wzrasta o `1k10` punktów.

---

## 9. Zakończenie Sesji i Autozapis

Gdy zechcesz zakończyć grę, Mistrz Gry uruchamia procedurę podsumowania kroniki śledztwa. Aplikacja automatycznie zapisuje pełny stan gry do archiwum (`data/saves/`), wyświetlając trójstanową kartę statusu z potwierdzeniem pomyślnego zapisu oraz opcją ponowienia w razie problemów.

---

## 10. Tryb Hot Seat (1-2 graczy)

Wspólna rozgrywka przy jednym ekranie. W Ustawieniach włączasz tryb Hot Seat i przypisujesz postacie do graczy. Każdy gracz ma swój unikalny kolor interfejsu, a AI bezpośrednio zwraca się do postaci po imieniu. Przełącznik postaci w panelu bocznym pozwala wygodnie inspekcjonować ekwipunek i kartę obu badaczy.

---

## 11. Profile Jakości i Kontrola Kosztów API

Profil wybierasz w panelu **Ustawienia → Profil Jakości** (sesja ≈ 3h gry, domyślnie **HIGH**):

| Profil | Model czatu | Lektor (TTS) | Ilustracje scen | Szacowany koszt sesji 3h |
|---|---|---|---|---|
| **LOW** | Gemini Flash-Lite | brak | wyłączone | ~$0.02 - $0.05 USD |
| **MID** | Gemini Flash | Gemini TTS (Charon) | Gemini Image | ~$0.15 - $0.20 USD |
| **HIGH** ⭐ *(Domyślny)* | **Gemini 3.8 Flash (High)** | **Gemini TTS (Charon)** | **Gemini Image** | **~$0.40 - $0.50 USD** |
| **ULTRA** | Gemini 3.1 Pro (High) | Multi-voice słuchowisko | Gemini Image HD | ~$1.00 - $1.50 USD |

Panel Ustawień na bieżąco zlicza zużyte tokeny wejściowe i wyjściowe oraz szacuje koszt w dolarach.

---

_Miłej gry. Pamiętaj - kosmiczna groza nie wybacza ciekawości._ 𓂀
