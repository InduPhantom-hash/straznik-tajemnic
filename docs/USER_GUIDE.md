# Przewodnik gracza

Jak prowadzić sesję _Zew Cthulhu 7e_ ze Strażnikiem Tajemnic AI (v0.9.4). Zakłada, że
masz już skonfigurowaną aplikację (patrz [`SETUP.md`](../SETUP.md)).

## Czym jest ta aplikacja

To **wirtualny Mistrz Gry** (Strażnik Tajemnic = Keeper w CoC). Ty wcielasz się w badacza,
a AI prowadzi świat: kreuje gęstą atmosferę lat 20. XX wieku, odgrywa postacie niezależne (NPC) i reaguje na Twoje decyzje.

Mechanikę zasad (rzuty kośćmi k100, progi trudności, testy Poczytalności, utratę punktów poczytalności, walkę oraz rozwój badacza) liczy **kod aplikacji** - w 100% deterministycznie, zgodnie z oficjalnymi regułami _Call of Cthulhu 7e RAW_. Model AI otrzymuje twardy wynik i zajmuje się wyłącznie jego sugestywnym, fabularnym opisem.

---

## 1. Tworzenie i wybór postaci

Możesz wybrać jedną z **30 gotowych postaci** (w tym dedykowanych badaczy z autorskimi biografiami dla polskich scenariuszy Strefy 11) lub stworzyć własnego bohatera w Kreatorze:

- **Charakterystyki CoC 7e** - rzut kośćmi lub ręczne przypisanie wartości (SIŁ, KON, BC, ZRC, WYG, INT, MOC, WYK).
- **Zawód i Klasa Zamożności** - determinuje umiejętności zawodowe, startowy stan posiadania oraz gotówkę (Credit Rating).
- **Deterministyczny Ekwipunek** - aplikacja automatycznie przydziela historyczny ekwipunek adekwatny do profesji i epoki.
- **Historia i portret** - opis, powiązania osobiste oraz generowany w klimacie epoki portret (powiększany w lightboxie).

---

## 2. Sesja Zero i Kalibracja Bezpieczeństwa

Przed rozpoczęciem gry kalibrujesz ton rozgrywki:

- **Styl i Ton:**
  - *Purystyczny* - bezlitosny realizm, śledztwo, powolny horror psychologiczny.
  - *Pulpowy* - dynamiczna akcja, większa szansa na przeżycie starć.
  - *Noir* - brudny klimat detektywistyczny, korupcja, dym papierosowy i cynizm.
- **Trudność:** Łatwy / Normalny / Trudny / Morderczy (wpływa na podpowiedzi i dotkliwość konsekwencji).
- **Linie i Zasłony (Safety Tools):** Określenie motywów, które mają zostać całkowicie wykluczone lub traktowane skrótowo („za kurtyną”).

---

## 3. Rozgrywka i Mechanika Kości

Wpisujesz w polu czatu lub dyktujesz, co robi Twój badacz. AI prowadzi narrację i kończy turę pytaniem. Gdy akcja wiąże się z ryzykiem, pojawia się **Tacka na Kości**:

- **Test Umiejętności (k100):** Rzut przeciw wartości umiejętności z karty. Kod sprawdza poziom sukcesu:
  - *Krytyk (01)*
  - *Sukces Ekstremalny (wartość / 5)*
  - *Sukces Trudny (wartość / 2)*
  - *Sukces Zwykły (≤ wartość)*
  - *Porażka (> wartość)*
  - *Pech / Fumble (96-100 lub 100)*
- **Forsowanie Rzutu (Push Roll):** W razie porażki możesz podjąć drugą próbę, podbijając stawkę fabularną - kolejna porażka wywoła katastrofalne konsekwencje (Fail-Forward).
- **Wydawanie Szczęścia:** Możesz poświęcić punkty Szczęścia, by dociągnąć rzut do wymaganego progu sukcesu (z wyjątkiem testów Poczytalności i pecha).
- **Rzut na Pomysł (Idea Roll):** Gdy śledztwo utknie w martwym punkcie, test INT wyciąga kluczowy trop logiczny (sukces daje czysty wniosek, porażka daje trop za cenę kłopotów).

---

## 4. Poczytalność (SAN) i Faza Rozwoju Postaci

- **Poczytalność i Szaleństwo:** Każde zetknięcie z kosmiczną grozą wyzwala test SAN.
  - Utrata ≥ 5 SAN w jednym rzucie wywołuje test INT i groźbę Szoku Psychicznego.
  - Utrata 1/5 aktualnego SAN w ciągu doby wprowadza postać w stan Czasowej Niepoczytalności z atakami szału, maniami i fobiami.
- **Faza Rozwoju Postaci (Po Sesji):**
  - Umiejętności, w których badacz odniósł sukces w trakcie gry, zostają automatycznie oznaczone do testu rozwoju.
  - W podsumowaniu sesji aplikacja wykonuje rzuty k100: jeśli wynik jest **większy** niż bieżąca wartość cechy, umiejętność wzrasta o `1k10` punktów.

---

## 5. Tablica Badacza i Dziennik Śledztwa

- **Korkowa Tablica Dowodów:** Interaktywny stół śledczy w stylu Dark Art Déco. Przypinasz notatki, poszlaki, wycinki gazet i portrety podejrzanych, łącząc je czerwonymi sznurkami dedukcyjnymi. Pozycje i połączenia są trwale zapisywane.
- **Dziennik Sesji:** Automatyczna kronika wydarzeń oraz diegetyczne dokumenty z gry.

---

## 6. Tryb Hot Seat (1-2 graczy)

Wspólna rozgrywka przy jednym ekranie. W Ustawieniach włączasz tryb Hot Seat i przypisujesz postacie do graczy. Każdy gracz ma swój kolor interfejsu, a AI bezpośrednio zwraca się do postaci po imieniu.

---

## 7. Lektor TTS i Ilustracje Scen

- **Lektor (TTS):** Głos Mistrza Gry czyta narrację w czasie rzeczywistym z natychmiastowym buforowaniem audio.
- **Ilustracje Gemini Flash Image:** Dynamicznie generowane sceny, lokacje i portrety NPC zgodne z realiami epoki lat 20. XX wieku.

---

## 8. Presety Jakości i Kontrola Kosztów API

Preset wybierasz w Ustawieniach; domyślny to **HIGH**:

| Preset | Model czatu | Lektor TTS | Obrazy | Koszt sesji 3h |
|---|---|---|---|---|
| **LOW** | Gemini 3.6 Flash | brak | wyłączone | ~$0.02 - $0.05 |
| **MID** | Gemini 3.6 Flash | Gemini TTS | Włączone | ~$0.15 - $0.35 |
| **HIGH** ⭐ | Gemini 2.5 Flash / 3.8 Flash | Gemini TTS | Włączone | ~$0.20 - $0.45 |
| **ULTRA** | Gemini 3.1 Pro Preview | Gemini TTS | Włączone | ~$1.50 - $3.00 |

Panel w Ustawieniach na bieżąco zlicza zużyte tokeny wejściowe i wyjściowe oraz szacuje koszt w dolarach.

---

## 9. Zapis Gry i Bezpieczeństwo Danych

Wszystkie zapisy sesji, postacie oraz notatki trafiają wyłącznie na Twój lokalny dysk (`data/saves/`). Nie potrzebujesz połączenia z chmurą poza zapytaniami do Google AI Studio.

---

_Miłej gry. Pamiętaj - kosmiczna groza nie wybacza ciekawości._ 𓂀
