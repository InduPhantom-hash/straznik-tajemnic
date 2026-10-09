import { extractSkillTests } from '@/lib/parsers/mechanics-parser';
import { sanitizeMechanicalTags } from '@/lib/parsers/text-cleaner';
import { cleanupContent } from '@/components/chat/narrative/cleanup';

describe('Systemowy protokół stawki testu [STAWKA:] (Issue #737)', () => {
  it('parsuje tag [STAWKA: ...] powiązany z testem umiejętności', () => {
    const rawGMMessage = `
Inspektor patrzy na ciebie podejrzliwie, nie wypuszczając teczki z rąk.
[TEST: Perswazja | trudny | | Próbujesz przekonać policjanta do wydania akt sprawy]
[STAWKA: Jeśli zawiedziesz, inspektor uzna cię za podejrzanego i nakaże opuszczenie posterunku.]
[Co robisz?]
    `;

    const tests = extractSkillTests(rawGMMessage);
    expect(tests).toHaveLength(1);
    expect(tests[0].skillName).toBe('Perswazja');
    expect(tests[0].difficulty).toBe('trudny');
    expect(tests[0].justification).toBe('Próbujesz przekonać policjanta do wydania akt sprawy');
    expect(tests[0].stake).toBe(
      'Jeśli zawiedziesz, inspektor uzna cię za podejrzanego i nakaże opuszczenie posterunku.'
    );
  });

  it('parsuje angielski tag [STAKE: ...] jako stawkę testu', () => {
    const rawGMMessage = `
[TEST: Locksmith | regular | | Picking the study lock]
[STAKE: Failure alerts the night guards and jams the mechanism.]
    `;

    const tests = extractSkillTests(rawGMMessage);
    expect(tests).toHaveLength(1);
    expect(tests[0].stake).toBe('Failure alerts the night guards and jams the mechanism.');
  });

  it('parsuje stawkę przekazaną bezpośrednio wewnątrz rozszerzonego tagu [TEST: ... | STAWKA: ...]', () => {
    const rawGMMessage = `
[TEST: Ślusarstwo | zwykły | | Otwieranie zamka | STAWKA: Złamanie wytrychu i hałas]
    `;

    const tests = extractSkillTests(rawGMMessage);
    expect(tests).toHaveLength(1);
    expect(tests[0].skillName).toBe('Ślusarstwo');
    expect(tests[0].stake).toBe('Złamanie wytrychu i hałas');
  });

  it('usuwa tag [STAWKA: ...] z tekstu do czytania przez lektora TTS (brak wycieku do audio)', () => {
    const rawGMMessage = `
Inspektor patrzy na ciebie podejrzliwie.
[TEST: Perswazja | trudny | | Próbujesz go przekonać]
[STAWKA: Jeśli zawiedziesz, trafisz do celi na 24 godziny.]
Powietrze w pokoju gęstnieje.
    `;

    const cleanedForTts = sanitizeMechanicalTags(rawGMMessage);
    expect(cleanedForTts).not.toContain('[STAWKA:');
    expect(cleanedForTts).not.toContain('trafisz do celi');
    expect(cleanedForTts).toContain('Inspektor patrzy na ciebie podejrzliwie.');
    expect(cleanedForTts).toContain('Powietrze w pokoju gęstnieje.');
  });

  it('usuwa tag [STAWKA: ...] z prozy fabularnej w oknie czatu (cleanup display)', () => {
    const rawGMMessage = `
Inspektor milczy.
[TEST: Perswazja | zwykły | | Przekonujesz go]
[STAWKA: Porażka oznacza odmowę.]
Co robisz dalej?
    `;

    const displayProse = cleanupContent(rawGMMessage);
    expect(displayProse).not.toContain('[STAWKA:');
    expect(displayProse).not.toContain('Porażka oznacza odmowę.');
    expect(displayProse).toContain('Inspektor milczy.');
  });
});
