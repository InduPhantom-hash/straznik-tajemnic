# Kontrakt Wykonawczy: Etap 5 (Poprawka UI i Autoweryfikacja)

**Projekt:** Strażnik Tajemnic AI
**Zlecający:** Antigravity (PO Proxy)
**Wykonawca:** Koder (OpenCode - w7:p3)
**Audytor:** Audytor wizyjny (OpenCode - w6:p4)

## 1. Kontekst Błędu (FAILED)
Koder zaraportował sukces implementacji wielojęzyczności, opierając się wyłącznie na zielonych testach logicznych (`npm test` / `tsc`). Zrzuty ekranu wykonane przez Użytkownika udowodniły jednak, że **cały sztywny interfejs aplikacji (UI)** (m.in. Karta Postaci, atrybuty Siła/Budowa, przyciski "Dziennik Przygody", "Eksport MD") pozostał całkowicie po polsku. 

Zadanie uznajemy za **NIEWYKONANE**, ponieważ zmiana języka nie zmieniła warstwy wizualnej dla użytkownika końcowego.

## 2. Cele Główne (Scope Naprawczy)
1. **Implementacja `next-intl` w warstwie widoku (React Components):**
   - Zidentyfikować wszystkie hardkodowane polskie stringi w komponentach UI (szczególnie Karta Badacza, Ekwipunek, Dziennik Przygody, nawigacja poboczna).
   - Przenieść te stringi do słowników `messages/pl.json` oraz `messages/en.json`.
   - Zastąpić sztywne teksty wywołaniami hooka `useTranslations()` z biblioteki `next-intl`.
2. **Upewnienie się o dostarczeniu słowników do klienta:**
   - Jeśli Karta Postaci używa `use client`, upewnić się, że `NextIntlClientProvider` poprawnie wstrzykuje wiadomości dla danego `locale` z poziomu layoutu.

## 3. Zastrzeżenie (Autonomiczna Weryfikacja Wizualna) - NOWA REGUŁA DEV-LOOP
- Zabraniam zamykania tego zadania na podstawie samych komend konsolowych.
- Koder **musi** napisać krótki skrypt automatyzujący (np. Playwright), który uruchomi aplikację, kliknie "ENGLISH", wejdzie w widok "Karta Postaci" i wykona zrzut ekranu (`screenshot.png`).
- Koder **musi** samodzielnie wczytać ten zrzut ekranu do swojego modułu Vision i wydać osąd: *"Czy napisy Siła, Budowa, Walka zmieniły się na STR, SIZ, Combat?"*.
- Jeśli Vision LLM odpowie "Nie, dalej widzę Siła", Koder wraca do punktu 1.
- Gotowe poprawki wraz ze zrzutem ekranu przekaż do Audytora (`w6:p4`) w celu finalnej kontroli jakości.

## 4. Wymagania Zakończenia (Dla Kodera i Audytora)
1. `npx tsc --noEmit` i `npm test` muszą nadal przechodzić.
2. W logach musi pojawić się dowód, że agent uruchomił skrypt E2E (Playwright) wykonujący zrzuty ekranu.
3. Koder musi przesłać do Audytora wiadomość ze ścieżką do wygenerowanego zrzutu ekranu angielskiego interfejsu.
4. Audytor poświadcza poprawność wizualną na wygenerowanym zrzucie.
