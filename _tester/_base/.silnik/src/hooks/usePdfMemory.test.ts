import { getApiKeyHeaders } from '@/lib/api-keys-service';
import { indexPdfLocally, normalizePdfMemory, usePdfMemory } from './usePdfMemory';
import { renderHook, act } from '@testing-library/react';

jest.mock('@/lib/api-keys-service', () => ({
  getApiKeyHeaders: jest.fn(() => ({ 'X-Gemini-Api-Key': 'key' })),
}));

describe('lokalna pamięć PDF', () => {
  beforeEach(() => jest.clearAllMocks());

  it('migruje stare pola Pinecone bez usuwania danych save', () => {
    expect(
      normalizePdfMemory({
        rulesFileName: 'rules.pdf',
        rulesIndexedToPinecone: true,
        adventureIndexedToPinecone: false,
      })
    ).toMatchObject({
      rulesFileName: 'rules.pdf',
      rulesIndexedToPinecone: true,
      rulesIndexedLocally: true,
      adventureIndexedLocally: false,
    });
  });

  it('nie nadpisuje nowych pól wartościami legacy', () => {
    expect(
      normalizePdfMemory({
        rulesIndexedLocally: false,
        rulesIndexedToPinecone: true,
      }).rulesIndexedLocally
    ).toBe(false);
  });

  it('wysyła PDF do ingest-local jako FormData z BYOK', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        indexed: 2,
        failed: 0,
        totalChunks: 2,
        namespace: 'rules',
        durationMs: 12,
      }),
    } as Response);
    const file = new File(['%PDF-1.7'], 'rules.pdf', {
      type: 'application/pdf',
    });

    await expect(indexPdfLocally(file, 'rules')).resolves.toMatchObject({
      success: true,
      namespace: 'rules',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/pdf/ingest-local',
      expect.objectContaining({
        method: 'POST',
        headers: { 'X-Gemini-Api-Key': 'key' },
        body: expect.any(FormData),
      })
    );
    expect(getApiKeyHeaders).toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('handlePdfUpload ujednolica flow na parse-local oraz lekki ingest-local JSON', async () => {
    const responses = [
      // 1. mock parse-local response
      {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          geminiFileUri: 'gemini://rules-file-uri',
          fileName: 'rules.pdf',
          parsedData: {
            pages: 10,
            textLength: 5000,
            text: 'Taka sobie treść podręcznika zasad',
          },
        }),
      },
      // 2. mock pdf-memory POST response
      {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      },
      // 3. mock ingest-local POST response
      {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          indexed: 5,
          totalChunks: 5,
          namespace: 'rules',
          durationMs: 15,
        }),
      },
    ];

    let callCount = 0;
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async () => {
      const res = responses[callCount++];
      return res as Response;
    });

    const setMessagesMock = jest.fn();
    const { result } = renderHook(() => usePdfMemory({ setMessages: setMessagesMock }));

    const file = new File(['%PDF-1.7'], 'rules.pdf', {
      type: 'application/pdf',
    });

    await act(async () => {
      await result.current.handlePdfUpload(file, 'rules');
    });

    // Weryfikacja kroków
    expect(fetchMock).toHaveBeenCalledTimes(3);

    // Krok 1: parse-local (FormData)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/pdf/parse-local');
    expect(fetchMock.mock.calls[0][1]?.body).toBeInstanceOf(FormData);

    // Krok 2: pdf-memory (JSON)
    expect(fetchMock.mock.calls[1][0]).toBe('/api/pdf-memory');

    // Krok 3: ingest-local (JSON z tekstem!)
    expect(fetchMock.mock.calls[2][0]).toBe('/api/pdf/ingest-local');
    const ingestCallBody = JSON.parse(fetchMock.mock.calls[2][1]?.body as string);
    expect(ingestCallBody).toMatchObject({
      text: 'Taka sobie treść podręcznika zasad',
      type: 'rules',
      fileName: 'rules.pdf',
      clearBefore: true,
    });

    fetchMock.mockRestore();
  });
});
