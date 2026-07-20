## Brief: Czyszczenie kodu chmurowego Pinecone
**Co**: Całkowite usunięcie martwego kodu i integracji z chmurową bazą wektorową Pinecone z aktywnego runtime aplikacji.
**Jak**: Usunięcie pliku `pinecone-client.ts`, endpointu `/api/pinecone/clear`, wyczyszczenie odwołań do Pinecone z hooka `useFullReset.ts`, usunięcie testów E2E powiązanych z Pinecone oraz wyczyszczenie plików typu `README.md` w bazie wektorowej.
**Pliki**: `pinecone-client.ts` [DELETE], `/api/pinecone/clear/route.ts` [DELETE], `useFullReset.ts` [MODIFY], `retrieval-service.ts` [MODIFY], `feature-15-pdf-rag.spec.ts` [MODIFY]
**Test**: `npm test` oraz testy e2e (`npx playwright test`)
**Ryzyko**: Ryzyko regresji w testach E2E, które mogły polegać na obecności endpointów Pinecone.
