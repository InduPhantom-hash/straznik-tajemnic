# Mapa Zadań - Strażnik Tajemnic

**Zadanie: Naprawa Szybkiej Przygody (Strefa 11)**

**Faza 1: Aktualizacja Danych Portretów**
- [x] Poprawienie linków do obrazków w `strefa-11-characters.ts` aby wskazywały na realne pliki w `public/portraits/predefined/` (np. `andrzej-sokolowski.webp`, `ewa-nowak.webp`). `(Blokuje: Faza 2)`
- Weryfikacja: Włączenie aplikacji i sprawdzenie w zakładce Network, czy zniknęły błędy 404 dla portretów.

**Faza 2: Przebudowa UX i UI Modala Szybkiej Przygody**
- [x] Zmiana głównego kontenera `DialogContent` w `quick-setup-modal.tsx` na wzór z `adventure-selector.tsx` (dodanie `deco-corners`, mosiężnych ramek, gradientów tła). `(Zablokowane przez: Faza 1)`
- [x] Refaktoryzacja kafelków postaci: wyraźne oddzielenie stanu `selected` (złota/mosiężna obwódka) od "nieaktywny/disabled" (hot-seat). Zmiana ukrytej ikonki `Info` na czytelniejszy przycisk "Biografia" pod imieniem bohatera.
- [x] Aktualizacja typografii na `font-special-elite` i `font-display`.
- Weryfikacja: `npm run dev`, otworzenie okna "Szybka Przygoda" i manualne przeklikanie trybu Solo oraz Hot-Seat. Zaznaczanie postaci musi działać bezbłędnie.

---

**Do zrobienia w kolejnych etapach (Backlog):**
- [ ] **Dedykowane portrety postaci dla Strefy 11:** Wygenerowanie nowych portretów pasujących epokowo (Polska lat 90. / ekipa programu telewizyjnego Strefa 11) dla wszystkich 12 badaczy i podłożenie ich do `/public/portraits/predefined/strefa11/`.

