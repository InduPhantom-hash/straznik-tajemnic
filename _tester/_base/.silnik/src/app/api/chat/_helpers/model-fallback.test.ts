import {
  isModelNotFoundError,
  isInvalidKeyError,
  isQuotaOrCreditsError,
  isPrepaymentCreditsError,
} from './model-fallback';

describe('model-fallback helper functions', () => {
  describe('isModelNotFoundError', () => {
    it('returns true for status 404', () => {
      expect(isModelNotFoundError({ status: 404, message: 'Not found' })).toBe(true);
    });

    it('returns true for message containing NOT_FOUND', () => {
      expect(isModelNotFoundError({ message: 'models/gemini-2.0-flash is NOT_FOUND' })).toBe(true);
    });

    it('returns false for unrelated errors', () => {
      expect(isModelNotFoundError({ status: 500, message: 'Server error' })).toBe(false);
      expect(isModelNotFoundError(null)).toBe(false);
    });
  });

  describe('isInvalidKeyError', () => {
    it('returns true for 400 with INVALID_ARGUMENT', () => {
      expect(isInvalidKeyError({ status: 400, message: 'API_KEY_INVALID' })).toBe(true);
    });

    it('returns true for API key not valid message', () => {
      expect(isInvalidKeyError(new Error('API key not valid. Please pass a valid API key.'))).toBe(true);
    });
  });

  describe('isQuotaOrCreditsError', () => {
    it('detects HTTP 402 prepayment credits depleted from Google AI Studio SDK', () => {
      const googleRawError = new Error(
        '{"error":{"code":402,"message":"Your prepayment credits are depleted. Please go to AI Studio at https://ai.studio/projects to manage your project and billing. Learn more at https://ai.google.dev/gemini-api/docs/billing#prepay. ","status":"RESOURCE_EXHAUSTED"}}'
      );
      expect(isQuotaOrCreditsError(googleRawError)).toBe(true);
      expect(isPrepaymentCreditsError(googleRawError)).toBe(true);
    });

    it('detects 429 RESOURCE_EXHAUSTED quota limits', () => {
      const quotaError = { status: 429, message: 'Quota exceeded for quota metric' };
      expect(isQuotaOrCreditsError(quotaError)).toBe(true);
      expect(isPrepaymentCreditsError(quotaError)).toBe(false);
    });

    it('returns false for unrelated errors', () => {
      expect(isQuotaOrCreditsError(new Error('SyntaxError: Unexpected token'))).toBe(false);
      expect(isPrepaymentCreditsError(new Error('SyntaxError: Unexpected token'))).toBe(false);
    });
  });
});
