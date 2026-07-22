## Plan: Wprowadzenie Sztywnego Workflow Otwarcia Przygody
Data: 2026-07-22
Złożoność: Średnia

### Problem
Prompty otwierające nową przygodę nie realizowały spójnie 5-etapowej sensoryczno-fabularnej struktury otwarcia sceny i miewały cechy "instrukcji obsługi".

### Rozwiązanie
Zaktualizowanie protokołu GM w `gm-protocol.ts` o ścisły 5-etapowy algorytm narracyjny dla pierwszej tury sesji (czas/miejsce -> sensoryka -> relacje badaczy wplecione w prozę -> powód obecności -> incydent inicjujący NPC).

### Pliki do modyfikacji
| plik | zmiana | ryzyko |
|------|--------|--------|
| `_tester/_base/.silnik/src/lib/prompts/gm-protocol.ts` | Dodanie sekcji 5-etapowej struktury otwarcia pierwszej tury przygody dla 1 oraz 2+ graczy | Niskie |

### Fazy implementacji

**Faza 1: Aktualizacja Promptów Mistrza Gry**
- [ ] Zaktualizowanie `getGMProtocolPrompt` i `getCompactGMProtocolPrompt` w `gm-protocol.ts`
- Weryfikacja: Sprawdzenie składni i wygenerowanego promptu

### Weryfikacja końcowa
- Sprawdzenie spójności oraz kompilacji projektu.
