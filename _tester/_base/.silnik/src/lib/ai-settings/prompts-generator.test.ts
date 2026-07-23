import { getGameMasterPrompt } from './prompts-generator';
import { getGMProtocolPrompt, getCompactGMProtocolPrompt } from '../prompts/gm-protocol';
import { defaultAISettings } from './defaults';

describe('System Prompt - Wymogi jakości językowej [LNG-01] & [LNG-02]', () => {
  describe('getGameMasterPrompt', () => {
    it('zawiera wymóg [LNG-01] dotyczący obowiązkowego systemu metrycznego', () => {
      const prompt = getGameMasterPrompt(defaultAISettings);

      expect(prompt).toContain('LNG-01');
      expect(prompt).toMatch(/system metryczny|metry|kilometry|kilogramy/i);
    });

    it('zawiera wymóg [LNG-02] dotyczący zakazu Ponglish oraz poprawnej polszczyzny', () => {
      const prompt = getGameMasterPrompt(defaultAISettings);

      expect(prompt).toContain('LNG-02');
      expect(prompt).toMatch(/zero ponglish|poprawna polszczyzna|angielskich słów/i);
    });
  });

  describe('getGMProtocolPrompt & getCompactGMProtocolPrompt', () => {
    it('protokół GM w wersji pełnej zawiera kluczowe dyrektywy LNG-01 i LNG-02', () => {
      const fullProtocol = getGMProtocolPrompt();

      expect(fullProtocol).toContain('LNG-01');
      expect(fullProtocol).toContain('LNG-02');
      expect(fullProtocol).toMatch(/OBOWIĄZKOWY SYSTEM METRYCZNY/i);
      expect(fullProtocol).toMatch(/ZERO PONGLISH/i);
    });
  });
});
