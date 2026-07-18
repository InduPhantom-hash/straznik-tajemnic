# Research: Brak autoryzacji w żądaniach /api/imagen (Gemini)

Data: 2026-07-18
Stack: Next.js (React), TypeScript, LocalStorage (BYOK)

## Obszar problemu

Wykryto trzy miejsca w kodzie frontendu, w których żądanie generowania obrazu przez `/api/imagen` jest wywoływane za pomocą natywnego `fetch()` zamiast systemowego `fetchWithApiKeys()`. Powoduje to pominięcie klucza API zapisanego przez użytkownika w `localStorage` (nagłówek `X-Gemini-Api-Key`), skutkując błędem `BYOK_KEY_MISSING` (401/500) ze strony serwera.

Pliki bezpośrednio powiązane z problemem:
- [equipment-modal.tsx](file:///Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/ui/equipment-modal.tsx#L125) - obsługa generowania obrazów przedmiotów w oknie modalnym ekwipunku.
- [use-media-cache.ts](file:///Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/hooks/use-media-cache.ts#L281) - hook automatycznego pobierania/generowania ilustracji scen i NPC.
- [character-portrait-generator.ts](file:///Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/lib/character-portrait-generator.ts#L171) - generator portretów postaci na bazie szablonów (wywołania na liniach 171 i 269).

## Zależności

Przesyłanie kluczy API na frontendzie jest zorganizowane w serwisie:
- [api-keys-service.ts](file:///Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/lib/api-keys-service.ts)

Funkcja `fetchWithApiKeys()` automatycznie pobiera klucze z `localStorage` i dokłada nagłówek `X-Gemini-Api-Key` do każdego zapytania.

## Existing Tests

Brak dedykowanych testów jednostkowych badających integrację tych konkretnych komponentów/funkcji z `/api/imagen`. 
Istniejące testy integracyjne:
- [useChat.duet.test.ts](file:///Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/hooks/useChat.duet.test.ts) - testuje logikę chatu i rzutów, ale mockuje lub pomija zapytania do `/api/imagen`.

## Ryzyka i uwagi

- Zmiana `fetch` na `fetchWithApiKeys` jest bezinwazyjna i bezpieczna, ponieważ funkcja ta zachowuje identyczną sygnaturę jak natywny `fetch()`.
- Wprowadzenie tej poprawki nie wpływa na inne mechaniki aplikacji.

## Rekomendowany następny krok

- Bezpośrednie wdrożenie poprawek w wymienionych 3 plikach za pomocą planu `/dev-2-plan` lub bezpośredniej modyfikacji po zatwierdzeniu diffa przez użytkownika.
