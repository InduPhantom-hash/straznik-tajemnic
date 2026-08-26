# Kontrakt Wykonawczy: Faza 2.2 (Ekstrakcja ABSOLUTNIE WSZYSTKICH polskich tekstów w UI)

**Zadanie:** Użytkownik zauważył, że proces internacjonalizacji (i18n) pominął ważne elementy interfejsu (pasek nagłówka, zegar kampanii, fazy księżyca, pogoda, cytaty na ekranie powitalnym). Twoim celem jest zmapowanie WSZYSTKICH polskich ciągów znaków (hardcoded) i przeniesienie ich do `messages/pl.json` i `messages/en.json`, po czym użycie `useTranslations` (lub `getTranslations` dla plików poza Reactem) we wszystkich tych miejscach.

## Lista plików krytycznych do modyfikacji (do weryfikacji przez Ciebie):
1. `src/components/chat/chat-window/components/chat-header.tsx` - (Tytuł okna, np. "Tajemnica Biblioteki Miskatonic")
2. `src/components/chat/welcome/data/quotes.ts` - (Wszystkie cytaty Lovecrafta - przenieś je do słowników, a tablicę `WELCOME_QUOTES` zbuduj tak, by klucze czytało przez `next-intl`)
3. `src/lib/time-manager.ts` - (Miesiące, np. "Stycznia", domyślna pogoda "Lekka mgła", fazy księżyca np. "Rosnący Sierp")
4. `src/lib/parsers/time-parser.ts` - (Parsowanie i generowanie miesięcy w polskim / angielskim)
5. Dowolny inny plik UI zawierający hardkodowany polski tekst.

## Wymagania:
- Zmodyfikuj `messages/pl.json` i `messages/en.json` by obsłużyć powyższe.
- Jeśli `time-manager.ts` lub parsery działają w czystym TypeScripcie (brak hooków Reacta), użyj oficjalnych metod tłumaczenia dla Vanilla JS w next-intl (np. przekazywanie funkcji renderującej lub użycie bazy językowej na poziomie parsera), albo zrefaktoryzuj komponent wyświetlający czas tak, aby to UI tłumaczyło angielską/neutralną wartość na polski/angielski (rekomendowane - wewnątrz `chat-header.tsx` z użyciem `useTranslations`).
- Po zmianach musisz uruchomić `npx tsc --noEmit` oraz `npm test`. Mają przejść bez błędów.

Gdy to zrobisz, zgłoś sukces z kodem powrotu 0.
