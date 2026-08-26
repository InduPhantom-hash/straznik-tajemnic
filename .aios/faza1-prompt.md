Jesteś agentem Codex pracującym nad całkowitym wyczyszczeniem polskiego języka z kodu (i18n). To jest **Faza 1: Startup & Character Flow**.

W tej sesji masz przeskandować i przetłumaczyć na angielski wszystkie twarde polskie stringi w poniższych plikach, zastępując je odpowiednio hookiem `useTranslations` (dla React) lub `getTranslations` (dla komponentów serwerowych).

Lista plików dla tej fazy:
1. src/components/ui/character-wizard.tsx
2. src/components/ui/character-sheet.tsx
3. src/components/ui/quick-setup-modal.tsx
4. src/components/ui/hard-loading-screen.tsx
5. src/components/chat/welcome/index.tsx
6. src/app/[locale]/page.tsx
7. src/app/[locale]/characters/new/page.tsx

Zasady krytyczne:
- Zmień pliki `messages/en.json` i `messages/pl.json` dodając klucze.
- **UWAGA:** Wiele z tych komponentów może mieć już wdrożony `useTranslations`, ale musisz sprawdzić, czy nie pominięto w nich jakichkolwiek polskich znaków (szukaj np. "Inicjalizacja Wirtualnego Mistrza Gry", "Dziennikarz Śledczy", tekstów wewnątrz `{/* ... */}` ignoruj).
- Pokaż mi każdą zmianę jako patch lub wykonaj ją za pomocą pythona/sed.
- Po zakończeniu KAŻDEGO pliku uruchom `npx tsc --noEmit` aby upewnić się, że typy nie wybuchły.

Gdy przetłumaczysz WSZYSTKIE powyższe 7 plików, napisz "FAZA 1 ZAKOŃCZONA".
