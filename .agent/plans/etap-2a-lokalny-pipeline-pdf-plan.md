# Plan: Etap 2A - spójny lokalny pipeline PDF

## Cel

Przełączyć aktywny przepływ indeksowania PDF na lokalny pipeline:

`PDF -> ekstrakcja tekstu -> chunking -> embedding Gemini -> data/rag`

Zachować BYOK, kompatybilność istniejących zapisów i nie usuwać jeszcze legacy API Pinecone.

## Fazy

1. Neutralny kontrakt pamięci PDF, migracja starych pól i klient lokalnego indeksowania.
2. Walidacja parsera, deterministyczny chunking i bezpieczna podmiana namespace.
3. Testy parsera, chunkingu, store, endpointu i przepływu klienta.
4. Pełna regresja, TypeScript, lint i build produkcyjny.

## Kryteria akceptacji

- aktywny przepływ UI nie wywołuje `/api/pdf/index-to-pinecone`;
- nowe zapisy używają neutralnych pól lokalnego indeksu;
- stare pola `*IndexedToPinecone` są tolerancyjnie migrowane;
- nieudane embeddingi nie kasują poprzedniego namespace;
- testy, TypeScript, lint i build przechodzą.
