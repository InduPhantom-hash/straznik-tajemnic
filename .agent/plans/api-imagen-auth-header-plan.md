# Plan: Dopełnienie autoryzacji w żądaniach /api/imagen

Data: 2026-07-18
Złożoność: Prosta

## Problem
Użytkownik podaje klucz Google na ekranie startowym, ale żądania generowania obrazów do `/api/imagen` (ekran ekwipunku, portrety, cache mediów) kończą się błędem `BYOK_KEY_MISSING` z powodu wywołania przez natywny `fetch()` bez dołączenia nagłówków autoryzacyjnych z `localStorage`.

## Rozwiązanie
Zastąpienie natywnego `fetch()` funkcją `fetchWithApiKeys()` z `api-keys-service.ts`, która automatycznie pobiera klucze z `localStorage` i dokłada nagłówek `X-Gemini-Api-Key`.

## Pliki do modyfikacji
| plik | zmiana | ryzyko |
|------|--------|--------|
| `_tester/_base/.silnik/src/components/ui/equipment-modal.tsx` | Import `fetchWithApiKeys` oraz zamiana wywołania `fetch` | Niskie |
| `_tester/_base/.silnik/src/hooks/use-media-cache.ts` | Import `fetchWithApiKeys` oraz zamiana wywołania `fetch` | Niskie |
| `_tester/_base/.silnik/src/lib/character-portrait-generator.ts` | Import `fetchWithApiKeys` oraz zamiana wywołania `fetch` w dwóch miejscach | Niskie |

## Fazy implementacji

**Faza 1: Zmiana sposobu wysyłania żądań w kodzie**
- [ ] Zmiana `fetch` na `fetchWithApiKeys` w `equipment-modal.tsx`
- [ ] Zmiana `fetch` na `fetchWithApiKeys` w `use-media-cache.ts`
- [ ] Zmiana `fetch` na `fetchWithApiKeys` w `character-portrait-generator.ts`
- Weryfikacja: Weryfikacja poprawności importów i brak błędów typowania TypeScript.

**Faza 2: Testowanie i weryfikacja**
- [ ] Uruchomienie testów jednostkowych projektu za pomocą `npm run test`
- Weryfikacja: Zielone testy w projekcie.

## Weryfikacja końcowa
- Wykonanie `npm run test` w folderze `_tester/_base/.silnik`.

## Co może się zepsuć
- Potencjalne problemy z importami ścieżek relatywnych/aliasów. Ryzyko bardzo niskie ze względu na zastosowanie aliasu `@/lib/...`.
