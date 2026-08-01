import { buildAdditionalContext } from '../build-context';
import type { GameContext } from '@/lib/prompt-section-parser';

describe('buildAdditionalContext', () => {
  it('should include directorEventSection if provided', () => {
    const dummyGameContext: GameContext = {
      location: 'Test',
      time: '1920',
      entities: [],
      mode: 'investigation',
    };

    const result = buildAdditionalContext({
      timePromptSection: 'Time Prompt',
      gmProtocol: 'Protocol',
      gameContext: dummyGameContext,
      resolvedCachedContent: null,
      directorEventSection: '## INSTRUKCJA REŻYSERSKA\nEvent here.',
    });

    expect(result).toContain('## INSTRUKCJA REŻYSERSKA\nEvent here.');
    expect(result).toContain('Time Prompt');
  });

  it('should not include directorEventSection if omitted', () => {
    const dummyGameContext: GameContext = {
      location: 'Test',
      time: '1920',
      entities: [],
      mode: 'investigation',
    };

    const result = buildAdditionalContext({
      timePromptSection: 'Time Prompt',
      gmProtocol: 'Protocol',
      gameContext: dummyGameContext,
      resolvedCachedContent: null,
    });

    const hasDirectorEvent = result.some((section) =>
      section.includes('INSTRUKCJA REŻYSERSKA')
    );
    expect(hasDirectorEvent).toBe(false);
  });
});
