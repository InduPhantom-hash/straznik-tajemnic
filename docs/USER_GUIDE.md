# Przewodnik gracza

Jak prowadzić sesję _Zew Cthulhu 7e_ z Strażnikiem Tajemnic AI. Zakłada, że
masz już skonfigurowaną aplikację (patrz [`SETUP.md`](../SETUP.md)).

## Czym jest ta aplikacja

To **wirtualny Mistrz Gry** (Strażnik Tajemnic = Keeper w CoC). Ty grasz badaczem,
AI prowadzi świat: opisuje sceny, gra NPC-ami, reaguje na Twoje decyzje. Mechanikę
(rzuty, progi trudności, utratę poczytalności) liczy **aplikacja** - deterministycznie,
zgodnie z zasadami CoC 7e - a AI jedynie opisuje skutek. Dzięki temu nie ma „oszukanych"
sukcesów ani zmyślonych liczb.

## 1. Tworzenie postaci

Kreator badacza prowadzi przez:

- **Charakterystyki** - rzut lub ręczne wartości (SIŁ, KON, BC, ZRC, WYG, INT, MOC, WYK).
- **Zawód** - określa umiejętności zawodowe i startowy ekwipunek (dobierany wg zawodu).
- **Umiejętności** - rozdział punktów; aplikacja pilnuje progów.
- **Historia i portret** - opis postaci + wygenerowany portret (klikalny - powiększa się).

Postać zapisuje się lokalnie i można ją wczytać do kolejnych sesji.

## 2. Sesja Zero (kalibracja)

Przed grą ustawiasz ton i zasady stołu:

- **Ton** - purystyczny (realizm, horror psychologiczny), pulpowy (akcja), noir (detektywistyczny).
- **Trudność** - łatwy / normalny / trudny / morderczy (wpływa na podpowiedzi i surowość konsekwencji).
- **Linie i zasłony** - tematy, których AI ma unikać lub traktować „za kurtyną".

## 3. Rozgrywka

Piszesz, co robi Twoja postać; AI prowadzi narrację i kończy turę pytaniem
**„Co robisz?"**. Kiedy akcja wymaga testu, pojawia się **Tacka na Kości**:

- **Test umiejętności** - rzut k100 przeciw wartości umiejętności. Aplikacja sprawdza
  poziom sukcesu (zwykły / ½ / ⅕), krytyk (01) i fumble wg zasad CoC 7e.
- **Push Roll** - przy porażce możesz „docisnąć" rzut, akceptując gorsze konsekwencje.
- **Szczęście** - możesz wydać punkty Szczęścia, by poprawić rzut (z wyjątkami: nie na
  fumble, nie na testy poczytalności).
- **Walka** - rozgrywana narracyjnie, broń dokłada kontekst (rodzaj, obrażenia) do AI.

## 4. Poczytalność, zdrowie, rozwój

- **Poczytalność (SAN)** i **punkty życia (PŻ)** są śledzone automatycznie - utrata
  zapisuje się na karcie postaci po odpowiednich scenach.
- **Faza Rozwoju** - po sesji oznaczasz użyte umiejętności; aplikacja przeprowadza
  rzuty rozwoju i podbija wartości (oraz odzysk Szczęścia / SAN wg zasad).

## 5. Dziennik i czas

- **Dziennik** - apka zapisuje tropy i wydarzenia; możesz też kliknąć „Podsumuj scenę
  do dziennika".
- **Zegar kampanii** - czas w grze płynie wraz z akcjami (osobny od zegara systemowego).

## 6. Hot Seat (1-2 graczy przy jednym laptopie)

W Ustawieniach włączasz Hot Seat i przypisujesz postacie do graczy. Każdy gracz ma
swój kolor, a AI zwraca się do postaci po imieniu (`@Imię:` w narracji). Kontroler
(klawiatura) przekazujecie sobie między turami.

## 7. Lektor, obrazy, muzyka

- **Lektor (TTS)** - czyta narrację Mistrza Gry; głos zależy od presetu jakości.
- **Ilustracje** - sceny bywają ilustrowane obrazem (zależnie od presetu i częstotliwości).
- Generowanie obrazów/lektora jest opcjonalne i nie blokuje gry.

## 8. Zapis i wczytanie

Sesje i postacie zapisują się **na dysk** (`data/saves/`). Możesz zapisać w dowolnym
momencie i wrócić później - odtworzy się cała rozmowa i stan postaci.

## 9. Presety jakości

W Ustawieniach wybierasz LOW / MID / HIGH / ULTRA - to kompromis między kosztem
(zużyciem Twojego klucza Gemini) a jakością modelu, lektora i obrazów. Domyślnie HIGH.
Licznik na żywo pokazuje przybliżony koszt sesji.

## 10. Skąd wziąć podręcznik

Aplikacja zna zasady tylko z **Twojego** wgranego PDF. Jeśli AI mówi, że czegoś „nie
ma w kontekście" - to znaczy, że danej sekcji nie ma w wgranym podręczniku (i nie
zmyśla). Linki do darmowych i płatnych źródeł są w kreatorze oraz w [`SETUP.md`](../SETUP.md).

---

_Miłej gry. Pamiętaj - kosmiczna groza nie wybacza ciekawości._ 𓂀
