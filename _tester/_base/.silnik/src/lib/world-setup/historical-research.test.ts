import type { GoogleGenAI } from '@google/genai';
import { resolveEraContext } from '@/lib/era';
import {
  clearHistoricalResearchCache,
  runHistoricalResearch,
} from './historical-research';

describe('runHistoricalResearch', () => {
  beforeEach(clearHistoricalResearchCache);

  it('dopuszcza wyłącznie źródła z rejestru i używa cache', async () => {
    const generateContent = jest.fn().mockResolvedValue({
      text: 'Zweryfikowany kontekst historyczny.',
      candidates: [{
        groundingMetadata: {
          webSearchQueries: ['Polska 1973 transport'],
          groundingChunks: [{
            web: {
              domain: 'nac.gov.pl',
              title: 'Narodowe Archiwum Cyfrowe',
              uri: 'https://nac.gov.pl/example',
            },
          }],
        },
      }],
    });
    const genAI = { models: { generateContent } } as unknown as GoogleGenAI;
    const eraContext = resolveEraContext({
      userSelection: { year: 1973, country: 'Polska' },
    });

    const first = await runHistoricalResearch(genAI, eraContext);
    const second = await runHistoricalResearch(genAI, eraContext);

    expect(first).toMatchObject({ status: 'passed', fromCache: false });
    expect(first.sources[0]).toMatchObject({
      trustLevel: 'primary',
      verificationStatus: 'verified',
    });
    expect(second.fromCache).toBe(true);
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it('kwarantannuje nową domenę i nie wpuszcza jej treści do promptu', async () => {
    const generateContent = jest.fn().mockResolvedValue({
      text: 'Niezweryfikowane twierdzenie.',
      candidates: [{
        groundingMetadata: {
          groundingChunks: [{
            web: {
              domain: 'unknown.example',
              title: 'Nowe źródło',
              uri: 'https://unknown.example/article',
            },
          }],
        },
      }],
    });
    const genAI = { models: { generateContent } } as unknown as GoogleGenAI;
    const eraContext = resolveEraContext({
      userSelection: { year: 1973, country: 'Polska' },
    });

    const result = await runHistoricalResearch(genAI, eraContext);

    expect(result).toMatchObject({ status: 'degraded', summary: '' });
    expect(result.sources).toHaveLength(0);
    expect(result.quarantinedSources[0]).toMatchObject({
      trustLevel: 'untrusted',
      verificationStatus: 'quarantined',
    });
  });
});
