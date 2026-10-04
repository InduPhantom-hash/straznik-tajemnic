import { buildTimeContext } from './build-time-context';
import { resolveGameEraContext } from '@/lib/era';
import { timeManager } from '@/lib/time-manager';

describe('buildTimeContext (OPT-C01 Deduplication)', () => {
  beforeEach(() => {
    timeManager.setTime({
      year: 1924,
      month: 9, // October (0-indexed)
      day: 15,
      hour: 21,
      minute: 30,
    });
  });

  const classicEraContext = resolveGameEraContext({
    gameTime: { year: 1924, month: 9, day: 15 },
    adventure: { yearRange: '1920-1929', country: 'USA', era: 'classic' },
  });

  const gaslightEraContext = resolveGameEraContext({
    gameTime: { year: 1895, month: 5, day: 10 },
    adventure: { yearRange: '1890-1899', country: 'England', era: 'gaslight' },
  });

  const modernEraContext = resolveGameEraContext({
    gameTime: { year: 2024, month: 2, day: 1 },
    adventure: { yearRange: '2020-2029', country: 'Polska', era: 'modern' },
  });

  it('generuje pełną sekcję czasu wraz z eraRules domyślnie (cache wyłączony)', () => {
    const result = buildTimeContext({
      eraContext: classicEraContext,
    });

    expect(result.eraRules).toBeTruthy();
    expect(result.timePromptSection).toContain('## KONTEKST CZASOWY');
    expect(result.timePromptSection).toContain(result.eraRules);
    expect(result.timePromptSection).toContain('**Aktualna Pogoda & Warunki:**');
    expect(result.timePromptSection).toContain('**Atmosfera:**');
    expect(result.timePromptSection).toContain('**INSTRUKCJA DLA MG:**');
  });

  it('pomija eraRules w timePromptSection gdy omitEraRules jest true, zachowując eraRules w wyniku', () => {
    const result = buildTimeContext({
      eraContext: classicEraContext,
      omitEraRules: true,
    });

    expect(result.eraRules).toBeTruthy();
    expect(result.timePromptSection).toContain('## KONTEKST CZASOWY');
    // eraRules nie mogą występować w timePromptSection
    expect(result.timePromptSection).not.toContain(result.eraRules);
    // Podstawowe dyrektywy czasu i pogody pozostają nienaruszone
    expect(result.timePromptSection).toContain('**Aktualna Pogoda & Warunki:**');
    expect(result.timePromptSection).toContain('**Atmosfera:**');
    expect(result.timePromptSection).toContain('**INSTRUKCJA DLA MG:**');
  });

  it('automatycznie dedukuje i pomija eraRules gdy przekazano resolvedCachedContent', () => {
    const mockCachedContent = {
      name: 'cachedContents/test-cache-coc-7e-12345',
      model: 'models/gemini-2.5-flash',
      displayName: 'straznik-tajemnic-cache',
    };

    const result = buildTimeContext({
      eraContext: classicEraContext,
      resolvedCachedContent: mockCachedContent,
    });

    expect(result.eraRules).toBeTruthy();
    expect(result.timePromptSection).not.toContain(result.eraRules);
    expect(result.timePromptSection).toContain('## KONTEKST CZASOWY');
  });

  it('zawiera eraRules gdy resolvedCachedContent jest null i omitEraRules jest undefined/false', () => {
    const result = buildTimeContext({
      eraContext: classicEraContext,
      resolvedCachedContent: null,
      omitEraRules: false,
    });

    expect(result.eraRules).toBeTruthy();
    expect(result.timePromptSection).toContain(result.eraRules);
  });

  it('zachowuje czystą strukturę markdown (brak nadmiarowych podwójnych pustych linii) przy pominięciu eraRules', () => {
    const withRules = buildTimeContext({
      eraContext: classicEraContext,
      omitEraRules: false,
    });

    const withoutRules = buildTimeContext({
      eraContext: classicEraContext,
      omitEraRules: true,
    });

    expect(withoutRules.timePromptSection.length).toBeLessThan(withRules.timePromptSection.length);
    // Sprawdź brak 3 lub więcej kolejnych znaków nowej linii (\n\n\n)
    expect(withoutRules.timePromptSection).not.toMatch(/\n{3,}/);
  });

  it('daje pierwszeństwo jawnej fladze omitEraRules: false nawet gdy resolvedCachedContent jest obecny', () => {
    const mockCachedContent = {
      name: 'cachedContents/test-cache-coc-7e-12345',
      model: 'models/gemini-2.5-flash',
    };

    const result = buildTimeContext({
      eraContext: classicEraContext,
      resolvedCachedContent: mockCachedContent,
      omitEraRules: false, // Jawne wymuszenie reguł epoki
    });

    expect(result.eraRules).toBeTruthy();
    expect(result.timePromptSection).toContain(result.eraRules);
  });

  it('daje pierwszeństwo jawnej fladze omitEraRules: true nawet gdy resolvedCachedContent jest null', () => {
    const result = buildTimeContext({
      eraContext: classicEraContext,
      resolvedCachedContent: null,
      omitEraRules: true,
    });

    expect(result.eraRules).toBeTruthy();
    expect(result.timePromptSection).not.toContain(result.eraRules);
  });

  it('zawsze zwraca pełny string eraRules w polu wynikowym niezależnie od omitEraRules/cache', () => {
    const withCache = buildTimeContext({
      eraContext: classicEraContext,
      resolvedCachedContent: { name: 'cached' },
    });
    const withoutCache = buildTimeContext({
      eraContext: classicEraContext,
      resolvedCachedContent: null,
    });

    expect(withCache.eraRules).toBeTruthy();
    expect(withCache.eraRules).toBe(withoutCache.eraRules);
  });

  it('działa poprawnie dla różnych epok (Gaslight 1890s, Modern 2020s)', () => {
    for (const eraCtx of [gaslightEraContext, modernEraContext]) {
      const full = buildTimeContext({ eraContext: eraCtx, omitEraRules: false });
      const deduped = buildTimeContext({ eraContext: eraCtx, omitEraRules: true });

      expect(full.eraRules).toBeTruthy();
      expect(deduped.eraRules).toBe(full.eraRules);
      expect(full.timePromptSection).toContain(full.eraRules);
      expect(deduped.timePromptSection).not.toContain(full.eraRules);
      expect(deduped.timePromptSection).toContain('## KONTEKST CZASOWY');
    }
  });
});
