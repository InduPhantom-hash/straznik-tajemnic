# Archiwum Efektów Dźwiękowych SFX (Issue #504)

Pliki efektów dźwiękowych SFX (`.mp3`) zostały odseparowane z katalogów publicznych (`public/sounds/sfx/`), aby nie zwiększać rozmiaru paczki dystrybucyjnej oraz aplikacji desktopowej.

Infrastruktura techniczna (`SFX_CATALOG`, wzorce detekcji w parserach oraz sound-director) pozostaje w pełni zachowana w kodzie silnika pod flagą `SFX_ENABLED = false` w `src/lib/audio/sfx-catalog.ts`.

## Przywrócenie odtwarzania SFX w przyszłości
1. Skopiuj pliki `.mp3` z tego katalogu do:
   `_tester/_base/.silnik/public/sounds/sfx/`
2. Zmień flagę w `_tester/_base/.silnik/src/lib/audio/sfx-catalog.ts`:
   ```typescript
   export const SFX_ENABLED = true;
   ```
