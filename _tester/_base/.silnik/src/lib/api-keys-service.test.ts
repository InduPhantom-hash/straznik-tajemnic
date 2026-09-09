import {
  sanitizeApiKey,
  saveApiKeys,
  getApiKeys,
  hasRequiredKeys,
  clearApiKeys,
  getApiKeyHeaders,
} from "./api-keys-service";

describe("api-keys-service (sanityzacja i ochrona nagłówków HTTP)", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe("sanitizeApiKey", () => {
    it("zwraca pusty string dla wartości niebędących stringiem", () => {
      expect(sanitizeApiKey(null)).toBe("");
      expect(sanitizeApiKey(undefined)).toBe("");
      expect(sanitizeApiKey(12345)).toBe("");
      expect(sanitizeApiKey({})).toBe("");
    });

    it("pozostawia nienaruszone prawidłowe klucze ASCII", () => {
      const validKey = "mock_gemini_api_key_abc123";
      expect(sanitizeApiKey(validKey)).toBe(validKey);
    });

    it("usuwa separator linii \\u2028 (reprodukcja błędu z crasha)", () => {
      const dirtyKey = "mock_gemini_api_key_abc123\u2028";
      expect(sanitizeApiKey(dirtyKey)).toBe(
        "mock_gemini_api_key_abc123"
      );
    });

    it("usuwa niewidoczne znaki Unicode: \\u2029, BOM \\uFEFF, zero-width space \\u200B", () => {
      const dirtyKey = "\uFEFFkey_with_\u200Bhidden_\u2029chars\u200B";
      expect(sanitizeApiKey(dirtyKey)).toBe("key_with_hidden_chars");
    });

    it("obcina spacje, tabulatory i znaki nowej linii", () => {
      const keyWithWhitespace = "  \t\r\n AIzaSyD_test-key123 \n\r ";
      expect(sanitizeApiKey(keyWithWhitespace)).toBe("AIzaSyD_test-key123");
    });

    it("usuwa znaki spoza ASCII (np. polskie litery, emoji, znaki > 255)", () => {
      const dirtyKey = "my_key_zażółć_🚀_123";
      expect(sanitizeApiKey(dirtyKey)).toBe("my_key_za__123");
    });

    it("gwarantuje, że każdy znak wyniku mieści się w zakresie kodów 33-126 (bezpieczny ASCII)", () => {
      const mixed = " A1!_~-./\\u2028\u00A0\uFEFF\u200B\u2029ę ";
      const sanitized = sanitizeApiKey(mixed);
      for (let i = 0; i < sanitized.length; i++) {
        const code = sanitized.charCodeAt(i);
        expect(code).toBeGreaterThanOrEqual(33);
        expect(code).toBeLessThanOrEqual(126);
      }
    });
  });

  describe("saveApiKeys i getApiKeys", () => {
    it("zapisuje oczyszczone klucze w localStorage", () => {
      saveApiKeys({
        GEMINI_API_KEY: "test-key\u2028",
        PINECONE_API_KEY: "  pinecone-key  ",
      });

      const keys = getApiKeys();
      expect(keys.GEMINI_API_KEY).toBe("test-key");
      expect(keys.PINECONE_API_KEY).toBe("pinecone-key");
    });

    it("automatycznie sanityzuje zabrudzone klucze istniejące już w localStorage", () => {
      localStorage.setItem(
        "zew-app-api-keys",
        JSON.stringify({
          GEMINI_API_KEY:
            "mock_gemini_api_key_abc123\u2028",
        })
      );

      const keys = getApiKeys();
      expect(keys.GEMINI_API_KEY).toBe(
        "mock_gemini_api_key_abc123"
      );
    });

    it("czyści klucze po wywołaniu clearApiKeys", () => {
      saveApiKeys({ GEMINI_API_KEY: "valid-key" });
      expect(hasRequiredKeys()).toBe(true);
      clearApiKeys();
      expect(getApiKeys()).toEqual({});
      expect(hasRequiredKeys()).toBe(false);
    });
  });

  describe("hasRequiredKeys", () => {
    it("zwraca true dla poprawnego klucza", () => {
      saveApiKeys({ GEMINI_API_KEY: "valid-key" });
      expect(hasRequiredKeys()).toBe(true);
    });

    it("zwraca false gdy klucz składa się wyłącznie ze znaków niewidocznych / spacji", () => {
      saveApiKeys({ GEMINI_API_KEY: " \u2028\uFEFF\u200B " });
      expect(hasRequiredKeys()).toBe(false);
    });
  });

  describe("getApiKeyHeaders i kompatybilność z Headers (ISO-8859-1)", () => {
    it("tworzy nagłówki, które nie rzucają błędu w konstruktorze Headers / fetch", () => {
      localStorage.setItem(
        "zew-app-api-keys",
        JSON.stringify({
          GEMINI_API_KEY:
            "mock_gemini_api_key_abc123\u2028",
          VERTEX_AI_PROJECT_ID: "projekt-testowy\u2029",
        })
      );

      const headersMap = getApiKeyHeaders();
      expect(headersMap["X-Gemini-Api-Key"]).toBe(
        "mock_gemini_api_key_abc123"
      );
      expect(headersMap["X-Vertex-Project-Id"]).toBe("projekt-testowy");

      expect(() => {
        new Headers(headersMap);
      }).not.toThrow();
    });
  });
});
