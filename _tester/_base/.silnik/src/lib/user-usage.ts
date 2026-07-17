import fs from 'fs';
import path from 'path';
import { getWritableDataDir } from '@/lib/paths';

/**
 * Akumulator zużycia API per-konto - licznik kosztów dla gracza Zew Home.
 *
 * Wersja domowa (offline, jeden klucz Gemini) trzyma licznik LOKALNIE na dysku
 * (`<data>/usage/{userId}/usage.json` przez `getWritableDataDir`), bez GCS.
 * `userId` jest zawsze `'local'` (Clerk wyłączony), więc to po prostu jeden plik
 * "ile wydałem" widoczny w widżecie 💰. Wcześniej (wariant online) akumulator żył
 * w Google Cloud Storage per-konto Clerk; warstwa GCS wycięta w Liście 2.A1.
 *
 * Zapis jest read-modify-write (last-write) - przy dwóch równoległych żądaniach
 * możliwy jeden zgubiony inkrement, akceptowalne dla orientacyjnego budżetu solo
 * sesji.
 *
 * BEZPIECZEŃSTWO/SERWER: moduł wyłącznie server-side (FS). Rejestracja jest
 * fire-and-forget - callerzy MUSZĄ swallować błędy (`.catch(() => {})`), żeby
 * licznik nigdy nie blokował streamu czatu ani generacji obrazu/głosu.
 */

/** Budżet testera na kluczu Google (model "$10 + własny klucz", Faza 4). */
export const BUDGET_USD = 10;

/**
 * Orientacyjne stawki Gemini TTS za znak wejściowego tekstu (USD).
 *
 * Wyprowadzenie (cennik Google zweryfikowany 2026-06-02,
 * https://ai.google.dev/gemini-api/docs/pricing):
 * - wyjście audio dominuje koszt: Pro TTS $20/1M tok, Flash TTS $10/1M tok
 *   (wejście tekstowe pomijalne: Pro $1/1M, Flash $0.50/1M)
 * - tokenizacja audio ~25 tok/s; mowa ~15-17 znaków wejścia/s
 *   => ~1.5 audio-tokena na znak wejściowy
 * - Pro: 1.5 x $20/1M ≈ $0.00003/znak; Flash (NPC) ~połowa = $0.000015/znak.
 *
 * IND-197: stawka liczona per-model (narrator=Pro / NPC=Flash). Wcześniej cały
 * TTS szedł po stawce Pro → segmenty NPC (Flash, ULTRA multi-voice) zawyżane ~2×.
 * Licznik jest orientacyjny (display-only); realny limit wymusza klucz Google
 * testera, realne rozliczenie robi Google per klucz.
 */
export const TTS_COST_PER_CHAR_PRO = 0.00003;
export const TTS_COST_PER_CHAR_FLASH = 0.000015;

/**
 * @deprecated Użyj {@link ttsCostPerChar} (stawka zależna od modelu).
 * Zachowane jako alias stawki Pro dla zgodności wstecznej.
 */
export const TTS_COST_PER_CHAR = TTS_COST_PER_CHAR_PRO;

/**
 * Stawka TTS za znak zależna od modelu Gemini.
 *
 * Dyskryminator: obecność `pro` w nazwie modelu (`gemini-2.5-pro-preview-tts`
 * = narrator MG → Pro; `gemini-2.5-flash-preview-tts` = NPC → Flash). Nieznany
 * / pusty model → Flash, spójnie z domyślnym modelem endpointu (`DEFAULT_MODEL`).
 */
export function ttsCostPerChar(model: string | undefined): number {
  return model?.includes('pro')
    ? TTS_COST_PER_CHAR_PRO
    : TTS_COST_PER_CHAR_FLASH;
}

export interface UserUsage {
  gemini: { cost: number; tokens: number; calls: number };
  image: { cost: number; count: number; calls: number };
  tts: { cost: number; chars: number; calls: number };
  total: { cost: number; calls: number };
  updatedAt: string;
}

/** Zdarzenie rejestrowane przez punkt generacji (chat / obraz / TTS). */
export type UsageEvent =
  | { type: 'gemini'; cost: number; tokens: number }
  | { type: 'image'; cost: number }
  | { type: 'tts'; cost: number; chars: number };

function initialUsage(): UserUsage {
  return {
    gemini: { cost: 0, tokens: 0, calls: 0 },
    image: { cost: 0, count: 0, calls: 0 },
    tts: { cost: 0, chars: 0, calls: 0 },
    total: { cost: 0, calls: 0 },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Normalizuje userId. Gdy Clerk wyłączony, `resolveUserId` zwraca fallback,
 * ale puste/whitespace dałoby ścieżkę `usage//usage.json` - dlatego puste → 'local'
 * (review #1 planu Fazy 6, normalizacja w jednym punkcie zamiast w callerach).
 */
function normalizeUserId(userId: string): string {
  return userId?.trim() || 'local';
}

/** Absolutna ścieżka pliku akumulatora na dysku (`<data>/usage/{userId}/usage.json`). */
function usageFilePath(userId: string): string {
  return path.join(
    getWritableDataDir(),
    'usage',
    normalizeUserId(userId),
    'usage.json'
  );
}

/** Pobierz akumulator konta. Brak pliku (nowe konto) → zerowy `UserUsage`. */
export async function getUserUsage(userId: string): Promise<UserUsage> {
  const file = usageFilePath(userId);
  if (!fs.existsSync(file)) return initialUsage();

  try {
    const content = await fs.promises.readFile(file, 'utf-8');
    const parsed = JSON.parse(content) as Partial<UserUsage>;
    return { ...initialUsage(), ...parsed };
  } catch {
    return initialUsage();
  }
}

/**
 * Dorzuć zdarzenie zużycia do akumulatora konta (read-modify-write, last-write).
 * Fire-and-forget po stronie callera - rzuca tylko gdy GCS niedostępny.
 */
export async function recordUserUsage(
  userId: string,
  event: UsageEvent
): Promise<void> {
  const usage = await getUserUsage(userId);

  switch (event.type) {
    case 'gemini':
      usage.gemini.cost += event.cost;
      usage.gemini.tokens += event.tokens;
      usage.gemini.calls += 1;
      break;
    case 'image':
      usage.image.cost += event.cost;
      usage.image.count += 1;
      usage.image.calls += 1;
      break;
    case 'tts':
      usage.tts.cost += event.cost;
      usage.tts.chars += event.chars;
      usage.tts.calls += 1;
      break;
  }

  usage.total.cost += event.cost;
  usage.total.calls += 1;
  usage.updatedAt = new Date().toISOString();

  const file = usageFilePath(userId);
  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  await fs.promises.writeFile(file, JSON.stringify(usage), 'utf-8');
}

/** Wyzeruj akumulator konta (ścieżka Pełnego Resetu). */
export async function resetUserUsage(userId: string): Promise<boolean> {
  const file = usageFilePath(userId);
  const exists = fs.existsSync(file);
  if (exists) await fs.promises.unlink(file);
  return exists;
}
