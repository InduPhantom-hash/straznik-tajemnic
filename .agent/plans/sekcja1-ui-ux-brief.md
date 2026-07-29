## Brief: Sekcja 1 - UI / UX Globalne
**Co**: Naprawa mosiężnych scrollbarów w trybie light, przywrócenie pogody w zegarze i odcięcie promptów AI z czatu.
**Jak**: Zmienne CSS, jeden insert do TSX oraz update zepsutego regex'a łapiącego.
**Pliki**: `globals.css`, `campaign-clock.tsx`, `cleanup.ts`
**Test**: Hot-reload w UI, weryfikacja logiki Regex.
**Ryzyko**: Regex w catch-all może false-positive'owo ucinać słowa w czacie.
