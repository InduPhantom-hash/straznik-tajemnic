#!/usr/bin/env node
/**
 * Generator aktywnego katalogu przygód.
 *
 * Pisze src/lib/adventures-catalog.generated.ts (gitignored), który re-eksportuje
 * ADVENTURE_CATALOG z:
 *   - adventures-catalog.private.ts  (gitignored, PEŁNY katalog) - jeśli istnieje (build prywatny),
 *   - adventures-catalog.public.ts   (commitowany, PUSTY)       - w przeciwnym razie (build publiczny/testerski).
 *
 * Uruchamiany automatycznie w `prepare` (po npm install), `predev` i `prebuild`.
 * Dzięki temu publiczne paczki (git archive bez plików gitignored) NIGDY nie dostają
 * katalogu płatnych przygód, a prywatny build autora ma go bez żadnej ręcznej akcji.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const libDir = path.join(__dirname, '..', 'src', 'lib');
const privatePath = path.join(libDir, 'adventures-catalog.private.ts');
const generatedPath = path.join(libDir, 'adventures-catalog.generated.ts');

const hasPrivate = fs.existsSync(privatePath);
const source = hasPrivate
  ? './adventures-catalog.private'
  : './adventures-catalog.public';

const content = `// PLIK GENEROWANY przez scripts/gen-adventure-catalog.mjs - NIE EDYTUJ RĘCZNIE.
// Źródło: ${hasPrivate ? 'PRYWATNY katalog (pełny)' : 'PUBLICZNY katalog (pusty)'}.
export { ADVENTURE_CATALOG } from '${source}';
`;

fs.writeFileSync(generatedPath, content);
console.log(
  `[gen-adventure-catalog] generated.ts -> ${source} (${hasPrivate ? 'prywatny/pełny' : 'publiczny/pusty'})`
);
