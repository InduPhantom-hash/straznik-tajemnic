## Plan: Czyszczenie kodu chmurowego Pinecone
Data: 2026-07-20
Złożoność: Prosta

### Problem
Lokalny RAG jest jedynym docelowym magazynem wiedzy i pamięci gry. Pinecone nie jest już potrzebny. Aby zlikwidować dług techniczny i oczyścić architekturę, musimy usunąć wszelkie powiązania z Pinecone z kodu źródłowego.

### Rozwiązanie
Usunięcie klienta Pinecone (`pinecone-client.ts`), usunięcie endpointu API `/api/pinecone/clear`, wyczyszczenie odwołań do Pinecone w hooku `useFullReset.ts` (w sekcji czyszczenia endpointów API) oraz usunięcie/zaktualizowanie powiązanych testów jednostkowych i E2E.

### Pliki do modyfikacji
| plik | zmiana | ryzyko |
|------|--------|--------|
| `src/lib/vector-db/pinecone-client.ts` | [DELETE] Całkowite usunięcie pliku klienta | Niskie |
| `src/app/api/pinecone/clear/route.ts` | [DELETE] Usunięcie endpointu czyszczącego Pinecone | Niskie |
| `src/hooks/useFullReset.ts` | [MODIFY] Usunięcie wywołania API `/api/pinecone/clear` z tablicy endpointów do wyczyszczenia | Niskie |
| `tests/e2e/feature-15-pdf-rag.spec.ts` | [MODIFY] Usunięcie asercji lub kroków testowych polegających na obecności Pinecone (jeśli istnieją) | Średnie |

### Fazy implementacji

**Faza 1: Usunięcie kodu produkcyjnego**
- [ ] Skasować plik `src/lib/vector-db/pinecone-client.ts`
- [ ] Skasować plik `src/app/api/pinecone/clear/route.ts`
- [ ] Zmodyfikować `src/hooks/useFullReset.ts` (linia 86) i usunąć wpis `/api/pinecone/clear` z tablicy `apiEndpoints`.
- Weryfikacja: Kod kompiluje się bez błędów (`npx tsc --noEmit` lub `npm run build`).

**Faza 2: Dostosowanie testów**
- [ ] Uruchomić testy E2E i jednostkowe, aby zidentyfikować błędy importu lub brakujące endpointy.
- [ ] Poprawić testy E2E w `tests/e2e/` (szczególnie te powiązane z RAG/ustawieniami).
- Weryfikacja: Wszystkie testy przechodzą pomyślnie (`npm test`).

### Weryfikacja końcowa
- `npm run build`
- `npm test`

### Co może się zepsuć
- Przerwanie testów E2E, które symulowały pełny reset i oczekiwały, że mockowany endpoint `/api/pinecone/clear` odpowie statusem 200. Naprawimy to poprzez usunięcie tego endpointu również z mocków testowych.
