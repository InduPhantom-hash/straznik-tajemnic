# Plan Review: niepełna odpowiedź MG po limicie tokenów - po korekcie

Data: 2026-08-18

## Ocena ogólna

🟢 Zielony - plan ma zamknięty zakres, przechodzi bramkę specyfikacji i uwzględnia rzeczywiste ścieżki streamu, ręcznej kontynuacji oraz save/load.

## Potwierdzone poprawki

- `useFullSave.ts` jest w zakresie wraz z testem round-trip; ręczne mapowanie wiadomości nie zgubi statusu po wczytaniu.
- Stan partialu i akcja kontynuacji są rozdzielone na dwie fazy.
- Plan mówi, że efekty już odebranego partialu zostają, a kontynuacja interpretuje wyłącznie własny tekst i ma własny `messageId`.
- Feature Spec ma jawną sekcję „Czego NIE budujemy” oraz przykład SSE -> UI.

## Spec Quality Gate

SPEC CHECK: Feature Spec | 157w / 200w

1. Budget: 2/2 - OK
2. Boundaries: 2/2 - jawna sekcja z pięcioma wyłączeniami
3. Verification: 2/2 - więcej niż trzy mierzalne kryteria
4. Examples: 2/2 - konkretny input `Genowefa: „` i `finishReason: 'MAX_TOKENS'` oraz wynik UI
5. Focus: 2/2 - jeden feature

SCORE: 10/10 - READY

## Obserwacje

- `zadania.md` nadal opisuje wcześniejszą, nierozdzieloną Fazę 2 i Fazę 3. Nie blokuje implementacji, ale powinien zostać zsynchronizowany z aktualnym planem przed rozpoczęciem pracy.
- Dokumentacja ma istniejące, niezwiązane zmiany użytkownika. Podczas implementacji potrzebne są punktowe patche tylko do zaplanowanych sekcji.
- `run-chat-pipeline.ts` przekracza limit 200 linii z udokumentowanym wyjątkiem. Plan poprawnie ogranicza zmianę do przekazania gettera i nie dokłada tam logiki domenowej.

## Rekomendacja

Plan jest gotowy do `/dev-4-implement` po synchronizacji `zadania.md` z aktualną mapą faz.
