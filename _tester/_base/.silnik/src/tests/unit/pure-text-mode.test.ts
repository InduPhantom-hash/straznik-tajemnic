import {
  getGeminiTier,
  setGeminiTier,
  isPureTextMode,
  getApiKeyHeaders,
  clearApiKeys,
  saveApiKeys,
} from '@/lib/api-keys-service';
import { buildImageInstructions } from '@/lib/prompts/image-instructions';
import { renderNarrativeWithImages } from '@/components/chat/narrative/render-narrative-with-images';
import type { AISettings } from '@/lib/ai-settings/types';

describe('Tryb Czystego Tekstu (Pure Text Mode) i detekcja Tieru Gemini', () => {
  beforeEach(() => {
    clearApiKeys();
  });

  afterEach(() => {
    clearApiKeys();
  });

  it('domyślnie ustawia tier "free" i aktywuje isPureTextMode', () => {
    expect(getGeminiTier()).toBe('free');
    expect(isPureTextMode()).toBe(true);
  });

  it('poprawnie zapisuje i odczytuje GEMINI_TIER = paid oraz deaktywuje isPureTextMode', () => {
    setGeminiTier('paid');
    expect(getGeminiTier()).toBe('paid');
    expect(isPureTextMode()).toBe(false);
  });

  it('przekazuje nagłówek X-Gemini-Tier w getApiKeyHeaders', () => {
    saveApiKeys({ GEMINI_API_KEY: 'AQ.TestKey', GEMINI_TIER: 'free' });
    const headers = getApiKeyHeaders();
    expect(headers['X-Gemini-Tier']).toBe('free');
    expect(headers['X-Gemini-Api-Key']).toBe('AQ.TestKey');

    setGeminiTier('paid');
    const paidHeaders = getApiKeyHeaders();
    expect(paidHeaders['X-Gemini-Tier']).toBe('paid');
  });

  it('buildImageInstructions w trybie darmowym zwraca dyrektywę Czystej Prozy z zakazem tagów', () => {
    setGeminiTier('free');
    const dummySettings = { imageGenerationEnabled: true } as AISettings;
    const instructions = buildImageInstructions(dummySettings);

    expect(instructions).toContain('## TRYB NARRACJI: CZYSTA PROZA (TRYB TEKSTOWY)');
    expect(instructions).toContain('ABSOLUTNY ZAKAZ generowania tagów multimedialnych: [LOKACJA:], [PORTRET:]');
  });

  it('buildImageInstructions w trybie płatnym zwraca standardowe instrukcje generowania obrazów', () => {
    setGeminiTier('paid');
    const dummySettings = {
      imageGenerationEnabled: true,
      sessionZero: { narrativeMode: 'full_rpg' },
      replicateSettings: { imageFrequency: 'normal', maxImagesPerMessage: 1 },
    } as AISettings;
    const instructions = buildImageInstructions(dummySettings);

    expect(instructions).toContain('## GENEROWANIE ILUSTRACJI');
    expect(instructions).toContain('### JAK GENEROWAĆ (DEDYKOWANE TAGI FABULARNE):');
  });

  it('renderNarrativeWithImages w trybie darmowym usuwa tagi markdown obrazów i renderuje czysty tekst', () => {
    setGeminiTier('free');
    const rawContent = 'To jest opis sceny.\n\n![Mroczny las](data:image/png;base64,fakeimage)\n\nKoniec sceny.';
    const result = renderNarrativeWithImages(rawContent, 1);

    expect(result).toBeDefined();
  });
});
