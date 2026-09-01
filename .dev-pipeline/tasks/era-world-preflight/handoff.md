# Handoff

Stan: `needs_human` po wygaśnięciu technicznego deadline'u karty. Użytkownik 2026-09-01 jawnie polecił kontynuować ten sam zatwierdzony zakres.

Zweryfikowane:

- pełny Jest i TypeScript przechodzą,
- `navigation:check` przechodzi,
- lint i Playwright mają zapisane, wcześniejsze fingerprinty baseline,
- typy manifestu, `WorldSetupBundleV1`, walidacja sceny i zgodność save istnieją,
- `/api/adventure/setup` nie ma aktywnego callera w ścieżce startu gry.

Blokada:

- `useGameStart` przechodzi bezpośrednio do `/api/chat`, więc preflight nie buduje ani nie utrwala kanonu przed pierwszą narracją.

Następna akcja:

- wznowić kartę i podłączyć krytyczną bramkę preflightu do rzeczywistej ścieżki startu bez zmiany zachowania starych save'ów.
