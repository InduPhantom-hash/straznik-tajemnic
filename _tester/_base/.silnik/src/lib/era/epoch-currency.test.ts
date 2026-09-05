import { formatEraCurrency, resolveGameEraContext } from './runtime';
import { getLovecraftStylePrompt } from '../lovecraft-style-guide';

describe('formatEraCurrency - waluty epokowe i denominacja (Issue #191)', () => {
  it('dla Polski w okresie PRL i transformacji (przed denominacją 1995) formatuje jako stare złote PLZ', () => {
    const prlContext = resolveGameEraContext({
      gameTime: { year: 1980, month: 5, day: 10 },
      adventure: { yearRange: '1980', country: 'Polska' },
    });

    const formattedPrl = formatEraCurrency(15, prlContext);
    expect(formattedPrl).toContain('zł (stare złote PLZ)');
    expect(formattedPrl).toMatch(/1[\s\u00A0]?500/); // 15 * 100 zł
  });

  it('dla Polski w okresie hiperinflacji 1989-1994 mnoży do skali ówczesnych cen', () => {
    const hyperinflContext = resolveGameEraContext({
      gameTime: { year: 1993, month: 2, day: 1 },
      adventure: { yearRange: '1993', country: 'Polska' },
    });

    const formatted = formatEraCurrency(10, hyperinflContext);
    expect(formatted).toContain('zł (stare złote PLZ)');
    expect(formatted).toMatch(/100[\s\u00A0]?000/); // 10 * 10000
  });

  it('dla Polski po denominacji (od 1995 r.) formatuje w nowych złotych bez dopisku PLZ', () => {
    const postDenomContext = resolveGameEraContext({
      gameTime: { year: 1997, month: 8, day: 20 },
      adventure: { yearRange: '1997', country: 'Polska' },
    });

    const formatted = formatEraCurrency(25, postDenomContext);
    expect(formatted).toBe('25 zł');
  });

  it('dla Polski w okresie klasycznym lat 20. (II RP) formatuje w złotych', () => {
    const classicContext = resolveGameEraContext({
      gameTime: { year: 1925, month: 9, day: 17 },
      adventure: { yearRange: '1925', country: 'Polska' },
    });

    const formatted = formatEraCurrency(10, classicContext);
    expect(formatted).toBe('10 zł');
  });

  it('dla USA formatuje w dolarach ($)', () => {
    const usContext = resolveGameEraContext({
      gameTime: { year: 1925, month: 9, day: 17 },
      adventure: { yearRange: '1925', country: 'USA' },
    });

    const formatted = formatEraCurrency(50, usContext);
    expect(formatted).toBe('$50');
  });
});

describe('getLovecraftStylePrompt - przełącznik miar metryczny vs imperialny (Issue #191)', () => {
  it('dla języka polskiego zawsze wymusza system metryczny', () => {
    const promptPl = getLovecraftStylePrompt('pl', 'imperial');
    expect(promptPl).toContain('OBOWIĄZKOWY SYSTEM METRYCZNY');
    expect(promptPl).toContain('ZAKAZ stosowania jednostek imperialnych');
  });

  it('dla języka angielskiego z imperial wymusza system imperialny', () => {
    const promptEnImperial = getLovecraftStylePrompt('en', 'imperial');
    expect(promptEnImperial).toContain('MANDATORY IMPERIAL SYSTEM');
    expect(promptEnImperial).toContain('feet, inches, miles, yards, pounds, ounces');
  });

  it('dla języka angielskiego z metric zachowuje system metryczny', () => {
    const promptEnMetric = getLovecraftStylePrompt('en', 'metric');
    expect(promptEnMetric).toContain('MANDATORY METRIC SYSTEM');
    expect(promptEnMetric).toContain('meters, kilometers, centimeters, kilograms, grams');
  });
});
