## Brief: Naprawa zagubionych zmian i Szybkiej Przygody
**Co**: Skopiowanie plików z deweloperskiej próżni (`_tester/`) do `src/` i naprawa UI oraz asynchroniczności.
**Jak**: Ręczna migracja zgubionych modali, mechaniki awatarów i plików, wyczyszczenie błędnego scrollbara oraz refaktoryzacja opóźnienia stanu w `page.tsx`, przez które Szybka Przygoda startowała "Boston Globe".
**Pliki**: m.in. `quick-setup-modal.tsx`, `page.tsx`, `welcome/index.tsx`, `chat-window/index.tsx`.
**Test**: Uruchomienie trybu "Szybka Przygoda" musi ładować ładny UI i skutkować poprawnym wpisem fabularnym (np. "Cień nad Prabutami" zamiast Boston Globe).
**Ryzyko**: Uszkodzenie istniejącego state'u React w `page.tsx` w wyniku łatania "Race Condition".
