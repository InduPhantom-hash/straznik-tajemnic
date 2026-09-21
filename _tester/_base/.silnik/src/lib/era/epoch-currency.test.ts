import { formatEraCurrency, formatWeaponRange, resolveGameEraContext } from './runtime';
import { getLovecraftStylePrompt } from '../lovecraft-style-guide';

describe('formatEraCurrency - waluty epokowe i siła nabywcza PPP (Issue #191, Issue #400)', () => {
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

  it('dla Polski po denominacji (od 1995 r.) przelicza stawkę bazową na współczesne PLN', () => {
    const postDenomContext = resolveGameEraContext({
      gameTime: { year: 1997, month: 8, day: 20 },
      adventure: { yearRange: '1997', country: 'Polska' },
    });

    const formatted = formatEraCurrency(25, postDenomContext);
    expect(formatted).toMatch(/1[\s\u00A0]?250 zł/); // 25 * 50 zł
  });

  it('dla Polski w okresie klasycznym lat 20. (II RP) przelicza wg reformy Grabskiego (x5.18)', () => {
    const classicContext = resolveGameEraContext({
      gameTime: { year: 1925, month: 9, day: 17 },
      adventure: { yearRange: '1925', country: 'Polska' },
    });

    const formatted = formatEraCurrency(10, classicContext);
    expect(formatted).toBe('52 zł'); // 10 * 5.18 ~= 52 zł
  });

  it('dla wiktoriańskiej Anglii (Gaslight 1890s UK) przelicza na funty (£) i szylingi', () => {
    const gaslightContext = resolveGameEraContext({
      gameTime: { year: 1895, month: 4, day: 12 },
      adventure: { country: 'Wielka Brytania' },
    });

    expect(formatEraCurrency(25, gaslightContext)).toBe('£5'); // 25 / 5 = £5
    expect(formatEraCurrency(1, gaslightContext)).toBe('4s'); // 1/5 GBP = 4 szylingi
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

describe('formatWeaponRange - dynamiczne formatowanie zasięgów broni (Issue #400)', () => {
  it('zamienia jardy na metry dla systemu metrycznego', () => {
    expect(formatWeaponRange('15 yards', 'metric', 'pl')).toBe('15 m');
    expect(formatWeaponRange('10/20/50 yards', 'metric', 'pl')).toBe('10/20/50 m');
    expect(formatWeaponRange('110 yards', 'metric', 'pl')).toBe('110 m');
    expect(formatWeaponRange('15 m', 'metric', 'pl')).toBe('15 m');
  });

  it('tłumaczy warunki diegetyczne w języku polskim', () => {
    expect(formatWeaponRange('Touch', 'metric', 'pl')).toBe('dotyk');
    expect(formatWeaponRange('Point blank', 'metric', 'pl')).toBe('przyłożenie');
    expect(formatWeaponRange('Touch or up to 15 yards', 'metric', 'pl')).toBe('dotyk lub do 15 m');
  });

  it('formatuje w jardach dla systemu imperialnego', () => {
    expect(formatWeaponRange('15 yards', 'imperial', 'en')).toBe('15 yards');
    expect(formatWeaponRange('15 yards', 'imperial', 'pl')).toBe('15 jardów');
    expect(formatWeaponRange('10/20/50 yards', 'imperial', 'pl')).toBe('10/20/50 jardów');
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
