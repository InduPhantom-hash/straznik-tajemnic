# Audyt wyposażenia startowego i assetów (Issue #469)

Data baseline: 2026-09-22.

## Wynik maszynowy audytu semantyki i spójności epokowej

- Wszystkie przeskanowane instancje: 830.
- Instancje przedmiotów z 46 aktywnych presetów: 264.
- Unikalne sloty przedmiot-epoka: 573.
- Poprawne, dedykowane lokalne WebP: 448.
- Przedmioty używające bezpiecznego lokalnego fallbacku ikony kategorii SVG: 125.
- Wykryte i naprawione błędy semantyczne oraz anachronizmy: 0.
- Gotowe prompty studyjne OpenAI przygotowane pod wykonanie w Herdr: 29.

## Naprawione krytyczne błędy semantyczne (Issue #469)

1. **Dokumenty tożsamości:**
   - Poprzednio: alias `Dokumenty tożsamości` przypisany do `document.letter` (zalakowana koperta `letter-shared.webp`).
   - Teraz: wydzielony szablon `document.id-card` z bezpiecznym fallbackiem do `/equipment/predefined/document.svg`, dopóki nie powstaną dedykowane rendery epokowe.
2. **Aparat fotograficzny w PRL:**
   - Poprzednio: `tool.camera` posiadał `shared: camera-1920s.webp`, co wymuszało miechowy aparat z lat 20. dla bohaterów z PRL i lat 90.
   - Teraz: usunięto fałszywy `shared`. W 1920s aparat rozstrzyga się do `camera-1920s.webp`, w modern do `dslr-camera-modern.webp`, a w PRL czysto do ikony `/equipment/predefined/tool.svg` w oczekiwaniu na render `camera-prl.webp` (Zenit/Zorka).
3. **Zapasowe baterie AA:**
   - Poprzednio: baterie posiadały `shared: flashlight-1920s.webp` (wyświetlały latarkę).
   - Teraz: usunięto fałszywy `shared`, czysty fallback do ikony narzędzia SVG do czasu wygenerowania dedykowanego WebP.

## Kolejka do wygenerowania przez OpenAI w Herdr (Partia 5 + nowe warianty epokowe)

Wykaz wszystkich gotowych promptów studyjnych (format 1:1, noir / dark museum / art deco, bez rąk, bez tekstu) znajduje się w:
- `docs/audits/equipment/equipment-audit-matrix.json` (sekcja `queuedPrompts`)
- `docs/audits/equipment/review-era-consistency.html` (interaktywny arkusz kontaktowy z przyciskami kopiowania promptu)

Łącznie przygotowano **29 precyzyjnych promptów**, w tym:
- 22 szablony ogólne z Partii 5 (termometr, statyw, klisze, maszyna do pisania, książki źródłowe, biblia itd.)
- 7 dedykowanych wariantów epokowych z Issue #469 (Dowód PRL, Legitymacja 1920s, ID modern, Paszport 1890s, Aparat PRL Zenit, Aparat 1890s, Baterie AA).
