import { getGameMasterPrompt, loadDefaultPrompt } from './prompts-generator';
import { getGMProtocolPrompt, getCompactGMProtocolPrompt } from '../prompts/gm-protocol';
import { defaultAISettings } from './defaults';
import { getPacingDirective } from '../pacing-controller';
import { getLovecraftStylePrompt } from '../lovecraft-style-guide';

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

    it('uses English role instructions for the English locale', () => {
      const prompt = getGameMasterPrompt(defaultAISettings, 'en');

      expect(prompt).toContain('SECURE INSTRUCTIONS');
      expect(prompt).toContain('Keeper of Secrets');
    });
  });

  it('loads the English default prompt asset for /en', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => 'English prompt',
    } as Response);

    await expect(loadDefaultPrompt('en')).resolves.toBe('English prompt');
    expect(fetchMock).toHaveBeenCalledWith('/default-gm-prompt-en.md');
    fetchMock.mockRestore();
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

  describe('Architektura Narracji i Pacingu v2 [Issue #98]', () => {
    it('wymusza regułę Fail-Forward (brak zacięć, pchnięcie fabuły komplikacją)', () => {
      const fullProtocol = getGMProtocolPrompt();
      const compactProtocol = getCompactGMProtocolPrompt();
      const prompt = getGameMasterPrompt(defaultAISettings);

      expect(fullProtocol).toMatch(/FAIL-FORWARD/i);
      expect(fullProtocol).toMatch(/NIGDY nie pisz "nie udało się/i);
      expect(compactProtocol).toMatch(/FAIL-FORWARD/i);
      expect(prompt).toMatch(/FAIL-FORWARD/i);
    });

    it('bezwzględnie zakazuje grania za gracza (anti-puppeteering)', () => {
      const fullProtocol = getGMProtocolPrompt();
      const compactProtocol = getCompactGMProtocolPrompt();
      const prompt = getGameMasterPrompt(defaultAISettings);

      expect(fullProtocol).toMatch(/ABSOLUTNY ZAKAZ GRANIA ZA GRACZA/i);
      expect(fullProtocol).toMatch(/nie pisz wypowiedzi.*postaci gracza/i);
      expect(compactProtocol).toMatch(/SPRAWCZOŚĆ GRACZA \(absolutny zakaz\)/i);
      expect(prompt).toMatch(/postacią gracza steruje/i);
      expect(prompt).toMatch(/ABSOLUTNY ZAKAZ GRANIA ZA GRACZA/i);
    });

    it('różnicuje Matrycę 4 Biegów Kadencji i eliminuje monotonię (anti-monotony)', () => {
      const socialPacing = getPacingDirective({ mode: 'social', hasNPCs: true, recentSANLoss: false, findingDocument: false, inDarkness: false, nightTime: false });
      const explorationPacing = getPacingDirective({ mode: 'exploration', hasNPCs: false, recentSANLoss: false, findingDocument: false, inDarkness: false, nightTime: false });
      const combatPacing = getPacingDirective({ mode: 'combat', hasNPCs: true, recentSANLoss: false, findingDocument: false, inDarkness: false, nightTime: false });
      const voidPacing = getPacingDirective({ mode: 'exploration', hasNPCs: false, recentSANLoss: true, findingDocument: false, inDarkness: false, nightTime: false });
      const enPacing = getPacingDirective({ mode: 'social', hasNPCs: true, recentSANLoss: false, findingDocument: false, inDarkness: false, nightTime: false }, 'en');

      expect(socialPacing).toContain('BIEG 1 (PING-PONG');
      expect(explorationPacing).toContain('BIEG 2 (SZEROKI KADR');
      expect(combatPacing).toContain('BIEG 3 (PRZEŁAMANIE');
      expect(voidPacing).toContain('BIEG 4 (ZAWIESZENIE / PUSTKA');
      expect(socialPacing).toMatch(/ZAKAZ MONOTONII/i);

      expect(enPacing).toContain('GEAR 1 (PING-PONG');
      expect(enPacing).toMatch(/ANTI-MONOTONY/i);
    });

    it('wymusza test Inteligencji przy utracie >=5 SAN oraz somatykę grozy w obu językach', () => {
      const compactProtocol = getCompactGMProtocolPrompt();
      const stylePl = getLovecraftStylePrompt('pl');
      const styleEn = getLovecraftStylePrompt('en');

      expect(compactProtocol).toMatch(/≥5 SAN.*Inteligencja/i);
      expect(stylePl).toMatch(/REAKCJA MIKROŚRODOWISKA I SOMATYKA/i);
      expect(stylePl).toMatch(/FAIR PLAY/i);
      expect(styleEn).toMatch(/MICRO-ENVIRONMENT REACTION & SOMATIC DREAD/i);
      expect(styleEn).toMatch(/FAIR PLAY/i);
    });

    it('wymusza regułę sędziego i twarde weto RAW przy czynnościach niemożliwych [Issue #137]', () => {
      const fullProtocol = getGMProtocolPrompt();
      const compactProtocol = getCompactGMProtocolPrompt();

      // Wymogi protokołu (pełny i kompaktowy)
      expect(fullProtocol).toMatch(/TWARDE WETO SĘDZIEGO/i);
      expect(fullProtocol).toMatch(/THE REFEREE STANCE/i);
      expect(fullProtocol).toMatch(/BEZWZGLĘDNY ZAKAZ.*\[TEST:\]/i);
      expect(fullProtocol).toMatch(/Nie możesz tego zrobić/i);
      expect(compactProtocol).toMatch(/TWARDE WETO SĘDZIEGO/i);
      expect(compactProtocol).toMatch(/Nie możesz tego zrobić/i);

      // Twarde granice CoC 7e RAW skatalogowane w protokole
      expect(fullProtocol).toMatch(/Budowie \(Build\) wyższej o 3/i);
      expect(fullProtocol).toMatch(/4x zasięgu bazowego/i);
      expect(fullProtocol).toMatch(/forsowania testu w walce/i);
    });
  });
});
