# Kontrakt Wykonawczy: Faza 2 - Abstrakcja UI (next-intl)

## Cel
Ekstrakcja twardo wpisanych polskich tekstów z głównych komponentów React do plików `messages/pl.json` oraz `messages/en.json`, przy wykorzystaniu `useTranslations` z pakietu `next-intl`.

## Zakres plików (Blast Radius)
- `src/components/desk/*` (Tablica Badacza, Dziennik, Ekwipunek)
- `src/components/settings/*` (Ustawienia)
- `src/components/onboarding/*` (Kreator)
- `messages/pl.json`
- `messages/en.json`

## Instrukcja
1. Dla każdego widoku/komponentu z powyższego zakresu (np. `EquipmentTab.tsx`, `Journal.tsx`, `Settings.tsx`):
   - Wyszukaj statyczne napisy po polsku (przyciski, labele, komunikaty).
   - Przenieś je do struktury `messages/pl.json` używając zagnieżdżonych kluczy (np. `"Equipment": { "title": "Ekwipunek", "empty": "Brak przedmiotów" }`).
   - Stwórz ich wierne angielskie odpowiedniki w `messages/en.json`.
   - Zastąp hardcodowane stringi w kodzie poprzez:
     ```tsx
     import { useTranslations } from 'next-intl';
     // wewnątrz komponentu:
     const t = useTranslations('Equipment');
     // render:
     <p>{t('title')}</p>
     ```
2. Jeśli komponent to Server Component, użyj `getTranslations('...')` zamiast hooka.
3. Przeprowadź refaktoryzację bardzo uważnie, aby nie złamać typowania.
4. **Weryfikacja**: Gdy skończysz, uruchom `npx tsc --noEmit` i napraw ewentualne błędy TypeScript wynikające np. z braku domyślnych propsów lub kolizji nazw. Następnie uruchom `npm test`. Muszą przejść.

Zwróć uwagę, by nie usuwać polskiego z logiki rzutów kośćmi (Faza 3) czy promptów (Faza 4), a jedynie z UI!
