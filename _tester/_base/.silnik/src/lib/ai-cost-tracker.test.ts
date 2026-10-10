import { applyGeminiPricingOverlay, resetGeminiPricingOverlay } from './pricing/pricing-data';
import { calculateGeminiCost, calculateGeminiImageCost } from './ai-cost-tracker';

describe('Gemini cost accounting', () => {
  it('charges thinking output and model-specific cached input', () => {
    // 1M input, 0.5M cached, 0.1M visible output, 0.2M thinking.
    expect(calculateGeminiCost('gemini-3.8-flash', 1000000, 100000, 500000, 200000)).toBeCloseTo(1.5375);
  });
});

it('separates image tokens from text and thinking', () => {
  expect(calculateGeminiImageCost('gemini-3.1-flash-image', { promptTokenCount: 100, candidatesTokenCount: 1120, thoughtsTokenCount: 20, candidatesTokensDetails: [{modality: 'IMAGE', tokenCount: 1120}] }, true)).toBeCloseTo(0.06731);
});

it.each([-10, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid optional pricing %s', rate => {
  resetGeminiPricingOverlay();
  expect(applyGeminiPricingOverlay({ 'gemini-3.8-flash': { input: 1, output: 1, cachedInput: rate } }, 'fresh')).toBe(false);
});
