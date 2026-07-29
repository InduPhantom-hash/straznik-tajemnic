---
typ: bug/feature/change
data: 2026-07-29
projekt: straznik-tajemnic
severity: High
status: draft
slug: masowa-naprawa-ui-ux
---

# Roadmapa Naprawy Błędów i Rozwoju: UI, Ekwipunek, Dziennik, Ustawienia (TTS Ultra)

## Streszczenie
Zgłoszono szereg błędów i niedoróbek wizualnych / funkcjonalnych w aplikacji. Obejmują one: brakujące ikony w topbarze, błędy generowania grafik ekwipunku, nieodpowiedni design dziennika sesji, niechciane scrollbary, brak paska ładowania przy wgrywaniu przygody, ubogą kartę badacza, prompty w czacie zamiast ukrytych w tle komend, brak portretów NPC i postaci w scenach, oraz potrzebę przeglądu profili kosztów (Tryb Ultra ze Słuchowiskiem Radiowym TTS) oraz usunięcie zbędnych linków z ekranu przygód. Dodatkowo w planach jest pełna wielojęzyczność (i18n). Zmiany muszą obsługiwać tryb single-player i multiplayer.

## Podział Zadań i Zakres Zmian

### Sekcja 1: UI / UX Globalne
1. **Topbar / Zegar / Pogoda**:
   - Przywrócenie dynamicznych ikon w miejsce białego kwadratu.
2. **Scrollbary**:
   - Ukrycie "obrzydliwych białych pasków" bądź zastąpienie cienkimi, stylistycznie spójnymi scrollbarami.
3. **Czat (Prompty zamiast grafik)**:
   - Ukrycie promptów przed graczem. Gracz ma widzieć wyłącznie wygenerowaną grafikę bez tekstu polecenia.

### Sekcja 2: Ekwipunek i Przedmioty
1. **Ikony Ekwipunku**:
   - Unikalne grafiki/ikony (dokumenty, koperty) oraz poprawne zaciąganie assetów broni.
2. **Niedziałający przycisk "Przeczytaj Dokument"**:
   - Przypięcie poprawnej akcji otwarcia treści dokumentu (`diegetic-document-viewer.tsx`).
3. **Licznik budżetu**:
   - Audyt kalkulacji kosztów $ w HUD.

### Sekcja 3: Karta Badacza (Postaci)
1. **Przebudowa Biografii i Postaci**:
   - Przebudowa WSZYSTKICH 40 predefiniowanych postaci pod kątem obecnego kanonu wiedzy.
   - Złączenie bloków z wiedzą postaci (znaczące miejsce itp.) w narracyjną całość bez sztucznych nawiasów kwadratowych.

### Sekcja 4: Dzienniki (Sesji i Przygody)
1. **Design Dziennika Sesji**:
   - Zaimportowanie do Dziennika Sesji designu, ramek, akcentów (zielonych) z Karty Badacza (pozbycie się jednolitego brązu).
2. **Setup Przygody (Bloker / Ekran Ładowania)**:
   - Ekran ładowania (magia w tle) zasłaniający UI tak długo, aż cały setup, scena otwarcia oraz wygenerowany, zbuforowany dźwięk TTS do niej nie spłyną.
3. **Odkrycia i Grafiki Scenowe (NPC)**:
   - Kluczowi NPC zyskują prywatny render (portret) do zakładki Odkryć.
   - Generowane w czacie sceny sytuacyjne zawierają na jednym kadrze graczy (Badaczy), rzeczonego NPC oraz adekwatne otoczenie w określonym klimacie.

### Sekcja 5: Ustawienia (Cost Control) i Audio Ultra
1. **Audyt Ustawień Kosztów**:
   - Dialog i mapowanie blokad zapytań dla pakietów Low/Mid/High.
2. **Tryb ULTRA (Słuchowisko Radiowe TTS)**:
   - Analiza (research dokumentacji 2026) silnika TTS pod kątem języka polskiego, ilości głosów (męskie, kobiece, dziecięce) i emocji.
   - Orkiestracja w prompcie: Narrator / Strażnik Tajemnic otrzymuje stały ton lektorski, każda inna postać niezależna posiada zdefiniowany w karcie unikalny głos modulujący emocje (szept, krzyk, strach, styl robotnika, profesora itd.). Pełna separacja głosowa na Gemini TTS.

### Sekcja 6: Predefiniowane Przygody (Strefa 11) i Ekran Wyboru
1. **Ekran Wyboru Przygód**:
   - Usunięcie brzydkich zewnętrznych linków z referencjami (Filmweb, Wikipedia, TVN).
2. **Aktualizacja Przygód**:
   - Przebudowa zawartości by korzystały ze zaktualizowanej puli wiedzy z repozytorium (mitów/systemu śledztw).

### Sekcja 7: Wielojęzyczność (i18n) [Future]
1. **Ekran startowy i silnik językowy**:
   - Ekran wyboru Polski/Angielski, który pociąga za sobą przestawienie całego UI, promptów generacji i TTS do określonego języka docelowego. Traktowane jako finalny element planu.

## Akceptacja
- Zmiany wdrażane fazowo (według sekcji).
- Zgodność z trybami 1-osobowym oraz multiplayer.
- Akceptacja każdej sekcji przez użytkownika z weryfikacją wizualną.

## Sugerowany next step
Przejście do systematycznego planowania implementacji i rozpoczęcie od Sekcji 1. Zostaw spec do akceptacji.
