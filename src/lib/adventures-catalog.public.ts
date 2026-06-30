/**
 * PUBLICZNY katalog przygód (commitowany domyślny).
 *
 * Pusty z założenia - publiczne i testerskie buildy Strażnika Tajemnic NIE zawierają
 * żadnych wbudowanych przygód (zero treści chronionych prawem autorskim). Ekran
 * „Nowa przygoda" pokazuje wyłącznie box wgrywania własnego scenariusza.
 *
 * Pełny katalog (legalnie posiadane materiały) żyje tylko w prywatnym, gitignored
 * pliku adventures-catalog.private.ts na maszynie autora. Wyboru dokonuje generator
 * scripts/gen-adventure-catalog.mjs (private jeśli istnieje, inaczej ten plik).
 */
import type { AdventureContext } from './adventures-data';

export const ADVENTURE_CATALOG: AdventureContext[] = [];
