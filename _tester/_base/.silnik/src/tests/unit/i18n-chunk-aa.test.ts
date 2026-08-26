import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import enMessages from '../../../messages/en.json';
import plMessages from '../../../messages/pl.json';

/**
 * Audyt i18n paczki chunk_aa: kazdy klucz uzycy przez t('key') / t.raw('key')
 * w przetlumaczonych komponentach MUSI istniec w messages/pl.json i en.json.
 * Chroni przed dryfem kluczy po recznych edycjach (literowka = pusty tekst w UI).
 */

const NS_BY_FILE: Record<string, string> = {
  'src/components/Header.tsx': 'Header',
  'src/components/Footer.tsx': 'Footer',
  'src/components/dialogs/ApiKeysModal.tsx': 'ApiKeysModal',
  'src/components/dialogs/CharacterDialog.tsx': 'CharacterDialog',
  'src/components/dialogs/DiceDialog.tsx': 'DiceDialog',
  'src/components/dialogs/JournalDialog.tsx': 'JournalDialog',
  'src/components/dialogs/DevelopmentPhaseModal.tsx': 'DevelopmentPhaseModal',
  'src/components/chat/chat-window/components/DevelopmentPhaseCard.tsx':
    'DevelopmentPhaseCard',
  'src/components/chat/chat-window/components/skill-test-card.tsx':
    'SkillTestCard',
  'src/components/chat/chat-window/components/tts-hard-loading-screen.tsx':
    'TtsHardLoadingScreen',
  'src/components/chat/chat-window/components/message-card.tsx': 'MessageCard',
  'src/components/chat/chat-window/components/acquired-item-card.tsx':
    'AcquiredItemCard',
};

// Standalone wywolanie t('key') / t("key") - NIE metody typu .split('...').
const T_CALL_RE = /(?<![\w.$])t\(\s*(['"])([\w-]+)\1/g;

function extractKeys(source: string): string[] {
  const keys = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = T_CALL_RE.exec(source)) !== null) {
    keys.add(m[2]);
  }
  return [...keys];
}

describe('audyt i18n chunk_aa', () => {
  it.each(Object.entries(NS_BY_FILE))(
    '%s - wszystkie klucze istnieja w pl.json i en.json',
    (file, ns) => {
      const source = readFileSync(
        resolve(__dirname, '../../..', file),
        'utf-8'
      );
      const keys = extractKeys(source);
      expect(keys.length).toBeGreaterThan(0);

      const plBag = (plMessages as Record<string, Record<string, unknown>>)[ns];
      const enBag = (enMessages as Record<string, Record<string, unknown>>)[ns];
      expect(plBag).toBeDefined();
      expect(enBag).toBeDefined();

      const missing = keys.filter((k) => !(k in plBag!) || !(k in enBag!));
      expect(missing).toEqual([]);
    }
  );

  it('JournalDialog.samples jest tablica w obu jezykach', () => {
    for (const bag of [
      (plMessages as Record<string, Record<string, unknown>>).JournalDialog,
      (enMessages as Record<string, Record<string, unknown>>).JournalDialog,
    ]) {
      expect(Array.isArray(bag.samples)).toBe(true);
      expect((bag.samples as unknown[]).length).toBeGreaterThan(0);
    }
  });
});
