# Brief: Autoryzacja w żądaniach /api/imagen

**Co**: Naprawa braku przesyłania klucza API do generowania obrazów z `localStorage` do endpointu `/api/imagen`.
**Jak**: Zastąpienie standardowego `fetch` funkcją `fetchWithApiKeys()` z `api-keys-service.ts` w plikach `equipment-modal.tsx`, `use-media-cache.ts` oraz `character-portrait-generator.ts`.
**Pliki**:
- `_tester/_base/.silnik/src/components/ui/equipment-modal.tsx`
- `_tester/_base/.silnik/src/hooks/use-media-cache.ts`
- `_tester/_base/.silnik/src/lib/character-portrait-generator.ts`
**Test**: Uruchomienie testów jednostkowych za pomocą `npm run test` w folderze `.silnik/`.
**Ryzyko**: Bardzo niskie (zmiana wstrzykuje jedynie brakujące nagłówki do żądań HTTP).
