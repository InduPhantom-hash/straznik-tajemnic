import { renderHook, act } from '@testing-library/react';
import type { CustomAdventure } from '@/lib/adventures-data';
import { useCustomAdventures } from './useCustomAdventures';

// Mock storage
jest.mock('@/lib/custom-adventures-storage', () => ({
  loadCustomAdventures: jest.fn().mockResolvedValue({ adventures: [], activeId: null }),
  saveCustomAdventures: jest.fn().mockResolvedValue(undefined),
  exportAsJSON: jest.fn().mockReturnValue('{}'),
  parseImportJSON: jest.fn().mockReturnValue(null),
}));

describe('useCustomAdventures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('przesyła PDF do /api/pdf/ingest-local w trybie lokalnym i zapisuje wygenerowaną przygodę', async () => {
    const mockAdventure = {
      id: 'custom-adv-1',
      title: 'Cień nad Innsmouth',
      era: 'classic',
      eraLabel: 'Klasyczne lata 20.',
      yearRange: '1927',
      location: 'Innsmouth',
      country: 'USA',
      tone: 'purist',
      themes: ['tajemnica', 'hybrydy'],
      suggestedOccupations: ['detektyw'],
      suggestedArchetypes: ['investigator'],
      hook: 'Śledztwo w Innsmouth...',
      description: 'Opis przygody',
      estimatedSessions: '2-3',
      playerCount: '1-4',
      difficulty: 'normal',
      isCustom: true,
      pdfUrl: '',
      geminiFileUri: '',
      fileName: 'innsmouth.pdf',
      uploadedAt: new Date().toISOString(),
      isAnalyzed: true,
      graph: { npcs: [], locations: [], clues: [], connections: [] },
      documentType: 'scenario',
      attachedLorebookIds: [],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        adventure: mockAdventure,
        adventures: [mockAdventure],
      }),
    });

    const { result } = renderHook(() => useCustomAdventures());

    const file = new File(['%PDF-1.4 dummy content'], 'innsmouth.pdf', {
      type: 'application/pdf',
    });

    let uploaded: CustomAdventure | null = null;
    await act(async () => {
      uploaded = await result.current.uploadAdventure(file);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/pdf/ingest-local',
      expect.objectContaining({
        method: 'POST',
      })
    );

    const target = uploaded as CustomAdventure | null;
    expect(target).toBeDefined();
    expect(target?.title).toBe('Cień nad Innsmouth');
    expect(result.current.uploadError).toBeNull();
  });

  it('poprawnie ustawia uploadError i pozwala go wyczyścić przez clearUploadError', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        success: false,
        error: 'Plik jest uszkodzony.',
      }),
    });

    const { result } = renderHook(() => useCustomAdventures());

    const file = new File(['bad content'], 'corrupted.pdf', {
      type: 'application/pdf',
    });

    let uploaded;
    await act(async () => {
      uploaded = await result.current.uploadAdventure(file);
    });

    expect(uploaded).toBeNull();
    expect(result.current.uploadError).toBe('Plik jest uszkodzony.');

    act(() => {
      result.current.clearUploadError();
    });

    expect(result.current.uploadError).toBeNull();
  });
});
