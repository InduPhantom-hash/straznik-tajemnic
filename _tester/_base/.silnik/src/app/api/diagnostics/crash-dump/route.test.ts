import { promises as fs } from "node:fs";
import { join } from "node:path";

jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

import { POST } from "./route";

describe("POST /api/diagnostics/crash-dump", () => {
  const createdReportPaths: string[] = [];

  afterAll(async () => {
    for (const p of createdReportPaths) {
      try {
        await fs.unlink(p);
      } catch {
        // Ignoruj
      }
    }
  });

  it("poprawnie zapisuje raport awarii i maskuje klucze API", async () => {
    // 39 znaków: AIzaSy (6) + 33 znaki = 39 znaków klucza Gemini
    const geminiKey = "AIzaSy" + "A".repeat(33);
    const openAiKey = "sk-" + "B".repeat(25);

    const rawPayload = {
      error: `Simulated Crash with ${geminiKey} and ${openAiKey}`,
      stack: "Error: secret apiKey: \"secret_value_123\"\n    at TestComponent",
      digest: "test-digest-42",
      url: "http://localhost:3000/pl/game",
      locale: "pl",
      userActions: ["click_inventory", "open_character_sheet"],
    };

    const mockRequest = {
      json: async () => rawPayload,
    } as unknown as Request;

    const response = await POST(mockRequest);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.reportPath).toBeDefined();

    createdReportPaths.push(data.reportPath);

    const savedContent = await fs.readFile(data.reportPath, "utf-8");
    const parsed = JSON.parse(savedContent);

    expect(parsed.digest).toBe("test-digest-42");
    expect(parsed.locale).toBe("pl");
    expect(parsed.url).toBe("http://localhost:3000/pl/game");
    expect(parsed.userActions).toEqual(["click_inventory", "open_character_sheet"]);
    expect(parsed.platform).toBeDefined();
    expect(parsed.platform.platform).toBe(process.platform);

    expect(parsed.error).toContain("[MASKED_GEMINI_KEY]");
    expect(parsed.error).toContain("[MASKED_API_KEY]");
    expect(parsed.error).not.toContain(geminiKey);
    expect(parsed.error).not.toContain(openAiKey);
    expect(parsed.stack).toContain("[MASKED]");
  });

  it("obsługuje błędy i wartości domyślne", async () => {
    const mockRequest = {
      json: async () => ({}),
    } as unknown as Request;

    const response = await POST(mockRequest);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    createdReportPaths.push(data.reportPath);

    const savedContent = await fs.readFile(data.reportPath, "utf-8");
    const parsed = JSON.parse(savedContent);

    expect(parsed.error).toBe("Unknown Error");
    expect(parsed.digest).toBeNull();
    expect(parsed.locale).toBe("unknown");
    expect(parsed.userActions).toEqual([]);
  });
});
