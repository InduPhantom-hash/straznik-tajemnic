# Kontrakt Wykonawczy: Naprawa braku języka EN (i18n) w kartach postaci, menu oraz narracji

Użytkownik zgłosił błąd: 
"Nadal karty postaci są po polsku, menu i narracja są po polsku mimo wyboru języka angielskiego."

Twoim zadaniem jest przeprowadzić analizę oraz implementację rozwiązań naprawczych dla tego problemu w ramach frameworka Next.js (i18n, next-intl).

## Zakres Błędu & Wymagania
1. **Menu pozostające po polsku:** Sprawdź komponenty wyboru języka (np. src/components/onboarding/language-selection-modal.tsx, src/app/welcome/page.tsx) oraz to, w jaki sposób przekazane locale z Next.js (przez middleware i ciasteczka) jest dostarczane do layoutów. Napraw mechanizm.
2. **Karty postaci po polsku:** Definicje np. w src/lib/immersion/strefa-11-characters.ts oraz predefined-characters.ts zawierają polskie stringi na sztywno. Skonwertuj je do użycia słowników next-intl (np. w folderze messages/) bądź zapewnij by ładowały właściwe opisy i nazwy.
3. **Narracja AI po polsku:** Prompt systemowy MG (default-gm-prompt.md) w src/app/api/chat/_helpers/run-chat-pipeline.ts operuje bez świadomości języka. Zlokalizuj punkt budowania promptu i zapewnij przekazanie wybranego locale (np. z nagłówka requestu, ciasteczka NEXT_LOCALE), a w razie języka "en" wstrzyknij nadrzędną instrukcję do systemPrompt: "The user has selected English. You MUST reply and narrate strictly in English."

## Ograniczenia i Weryfikacja
- Zachowaj aktualną funkcjonalność aplikacji i style.
- Pracuj wewnątrz katalogu _tester/_base/.silnik.
- Po wprowadzeniu zmian uruchom: npx tsc --noEmit oraz npm test aby upewnić się, że nie ma regresji. Testy muszą przejść na 100%.
- Zgłoś powrót i ewentualne problemy po zakończeniu pracy.
