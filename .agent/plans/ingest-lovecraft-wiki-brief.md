## Brief: Integracja Bazy Wiedzy Fandom Lovecraft Wiki & UI Legal Notice
**Co**: Skrypt parsera MediaWiki XML do zasilenia encyklopedii aplikacji 7000+ hasłami Mitów Cthulhu z notami licencyjnymi w UI.
**Jak**: Skrypt `ingest-lovecraft-wiki.mjs` zamienia zrzut XML na JSON `lovecraft-mythos`, a `EpochWikiTab.tsx` dodaje przełącznik słowników oraz notę CC-BY-SA z podaniem źródła Fandom Wiki.
**Pliki**: `scripts/ingest-lovecraft-wiki.mjs`, `src/components/help-modal/EpochWikiTab.tsx`, `NOTICE`, `data/epochs/lovecraft-mythos/*`.
**Test**: `node scripts/ingest-lovecraft-wiki.mjs && npx tsc --noEmit && npm test`.
**Ryzyko**: Duży rozmiar pliku JSON słownika - zoptymalizowany przez przefiltrowanie stubów i spamu.
