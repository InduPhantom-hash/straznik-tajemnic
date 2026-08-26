import {
  buildEraNarrativeRules,
  isResolvedEraContext,
  resolveGameEraContext,
} from './runtime';
import { validateEraAvailability } from './availability';

describe('runtime epoki', () => {
  const context2001 = resolveGameEraContext({
    gameTime: { year: 2001, month: 10, day: 14 },
    adventure: { yearRange: '1920-1925', country: 'Polska', era: 'modern' },
  });

  it('zamienia miesiąc zegara z indeksu 0 na datę kalendarzową', () => {
    expect(context2001.sceneDate).toBe('2001-11-14');
    expect(context2001.effectiveYear).toBe(2001);
    expect(isResolvedEraContext(context2001)).toBe(true);
  });

  it('buduje neutralne reguły z dokładnego roku bez użycia etykiety modern', () => {
    const rules = buildEraNarrativeRules(context2001);
    expect(rules).toContain('rok 2001');
    expect(rules).toContain('profil regionalny PL');
    expect(rules).toContain('no modern full-screen smartphones');
  });

  it('blokuje smartfon i powerbank w roku 2001', () => {
    expect(
      validateEraAvailability({ name: 'Smartfon z ładowarką' }, context2001)
    ).toMatchObject({ allowed: false, matchedRuleId: 'technology.smartphone' });
    expect(
      validateEraAvailability({ name: 'Powerbank' }, context2001)
    ).toMatchObject({ allowed: false, matchedRuleId: 'technology.powerbank' });
  });

  it('dopuszcza telefon z klawiaturą i zapasową baterię w roku 2001', () => {
    expect(
      validateEraAvailability(
        { name: 'Telefon komórkowy z klawiaturą' },
        context2001
      )
    ).toEqual({ allowed: true });
    expect(
      validateEraAvailability(
        { name: 'Zapasowa bateria do telefonu' },
        context2001
      )
    ).toEqual({ allowed: true });
  });

  it('dopuszcza kontrolowaną anomalię czasową', () => {
    expect(
      validateEraAvailability({ name: 'Smartfon z przyszłości' }, context2001, {
        type: 'time-anomaly',
        scenarioId: 'glogow-2001',
        validFrom: 2001,
        validTo: 2001,
        reason: 'Kontrolowany rekwizyt fabularny',
      })
    ).toMatchObject({ allowed: true, exceptionApplied: 'time-anomaly' });
  });
});
