import path from 'path';

/**
 * Katalog zapisywalnych danych aplikacji (save'y gry, sesje, instrukcje MG).
 *
 * W trybie dev (`npm run dev`) oraz w obecnym launcherze zwraca `<cwd>/data` -
 * zachowanie identyczne jak wcześniejsze `path.join(process.cwd(), 'data', ...)`.
 *
 * W zainstalowanej aplikacji (instalator .dmg / .exe) folder aplikacji jest
 * tylko-do-odczytu, więc launcher ustawia `ZEW_DATA_DIR` na prywatny folder
 * użytkownika (Mac: ~/Library/Application Support/ZewCthulhu,
 * Windows: %APPDATA%/ZewCthulhu) - dzięki temu zapisy gry trafiają w miejsce
 * zapisywalne, a nie w read-only paczkę.
 *
 * Czysty resolver (NIE tworzy katalogu) - `mkdirSync` robią poszczególne route'y,
 * tak jak siostrzany `dataDir()` w `vector-db/local-vector-store.ts`
 * (`RAG_DATA_DIR`, dane tylko-do-odczytu zostają w paczce).
 *
 * @returns absolutna ścieżka bazowego katalogu danych zapisywalnych
 */
export function getWritableDataDir(): string {
  return process.env.ZEW_DATA_DIR || path.join(process.cwd(), 'data');
}
