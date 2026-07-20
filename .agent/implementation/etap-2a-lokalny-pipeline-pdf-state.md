# Stan implementacji: Etap 2A - spójny lokalny pipeline PDF

- Data: 2026-07-20
- Gałąź: `feature/immersion-context-injection`
- Runtime: `_tester/_base/.silnik/`
- Plan: `.agent/plans/etap-2a-lokalny-pipeline-pdf-plan.md`

## Stan wyjściowy

- Zastana zmiana `docs/ROADMAP-MECHANIKI-AI.md` pozostaje poza zakresem.
- Brak dedykowanych testów parsera PDF, chunkingu, lokalnego store i `ingest-local`.
- Bazowe wywołanie testów skupionych: brak znalezionych testów.

## Fazy

1. Kontrakt i migracja pamięci PDF: zakończona, TypeScript PASS.
2. Parser, chunking i atomowy zapis: zakończona, TypeScript PASS.
3. Testy regresji: zakończona.
4. Weryfikacja końcowa: zakończona.

## Wynik końcowy

- Aktywny przepływ UI indeksuje przez `/api/pdf/ingest-local`; legacy endpoint pozostaje nieaktywnym API kompatybilnościowym.
- Nowe pola `rulesIndexedLocally` i `adventureIndexedLocally` są zapisywane, a stare `*IndexedToPinecone` migrowane tolerancyjnie przy hydratacji i load save'a.
- Parser waliduje nagłówek PDF, rozpoznaje dokument chroniony i jawnie obsługuje brak warstwy tekstowej.
- Naprawiono duplikowanie końcowego chunka przez overlap.
- Reindeks zasad zastępuje namespace dopiero po kompletnym wygenerowaniu embeddingów; częściowy błąd zachowuje poprzedni indeks.
- Endpoint zwraca jeden kontrakt sukcesu i błędu: `success`, `indexed`, `failed`, `totalChunks`, `namespace`, `durationMs`, `error`.

## Weryfikacja

- Nowe testy skupione: PASS, 6 zestawów / 23 testy.
- Pełny Jest: PASS, 34 zestawy / 102 testy.
- TypeScript `npx tsc --noEmit`: PASS po sekwencyjnym uruchomieniu po buildzie.
- ESLint zmienionych plików: PASS, 0 błędów; 3 wcześniejsze ostrzeżenia hooków w `page.tsx`.
- `git diff --check`: PASS.
- Produkcyjny `npm run build`: PASS, 61 stron; wcześniejsze ostrzeżenia Sentry/OpenTelemetry i Browserslist bez wpływu na wynik.

## Poza zakresem

- Nie usunięto legacy endpointu, zależności Pinecone ani historycznych testów E2E.
- Nie zmieniono analizy przygód o NPC, lokacje, mapy i handouty.
- Zastane i równolegle rozszerzone zmiany w `docs/ROADMAP-MECHANIKI-AI.md` pozostają nietknięte.
