import {
  cleanResponseText,
  stripMultilineArtifacts,
} from '@/lib/parsers/text-cleaner';

describe('text-cleaner (TTS)', () => {
  it('usuwa tagi systemowe i duchowe zdania', () => {
    const raw =
      'Wchodzisz do kawiarni. [LOKACJA: Kawiarnia Dormand’s] [DZIENNIK: Znaleziono ślad] Co robisz?';
    const cleaned = cleanResponseText(raw);
    expect(cleaned).toBe('Wchodzisz do kawiarni. Co robisz?');
  });

  it('zachowuje polskie znaki diakrytyczne', () => {
    const raw = 'Zażółć gęślą jaźń! Próba dębu, kąt, ścieżka, źródło.';
    const cleaned = cleanResponseText(raw);
    expect(cleaned).toBe('Zażółć gęślą jaźń! Próba dębu, kąt, ścieżka, źródło.');
  });

  it('zachowuje dozwolone emocje audio Gemini TTS', () => {
    const raw = '[whispers] Słyszysz niepokojący szept...';
    const cleaned = cleanResponseText(raw);
    expect(cleaned).toBe('[whispers] Słyszysz niepokojący szept...');
  });

  it('usuwa multiline artifacts bez niszczenia nowych linii', () => {
    const raw =
      'Akapit pierwszy.\n[DZIENNIK: Notatka]\nTreść notatki\n[/DZIENNIK]\nAkapit drugi.';
    const stripped = stripMultilineArtifacts(raw);
    expect(stripped).toContain('Akapit pierwszy.');
    expect(stripped).toContain('Akapit drugi.');
    expect(stripped).not.toContain('Notatka');
  });
});

import { resolveNpcVoice } from '@/lib/npc-voice-mapping';

describe('resolveNpcVoice', () => {
  const map = new Map<string, string>([
    ['fisk', 'voice-fisk-id'],
    ['archibald sterling', 'voice-sterling-id'],
  ]);

  it('dopasowuje dokładne imię NPC', () => {
    expect(resolveNpcVoice('fisk', map)).toBe('voice-fisk-id');
  });

  it('dopasowuje imię z tytułem (Inspektor Fisk)', () => {
    expect(resolveNpcVoice('Inspektor Fisk', map)).toBe('voice-fisk-id');
  });

  it('dopasowuje imię z tytułem naukowym (Profesor Archibald Sterling)', () => {
    expect(resolveNpcVoice('Profesor Archibald Sterling', map)).toBe(
      'voice-sterling-id'
    );
  });
});
