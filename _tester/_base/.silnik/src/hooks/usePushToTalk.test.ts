import { renderHook, act } from '@testing-library/react';
import { usePushToTalk, isEditableTarget } from './usePushToTalk';
import { toast } from '@/components/ui/use-toast';

jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
}));

jest.mock('@/lib/api-keys-service', () => ({
  getApiKeyHeaders: jest.fn(() => ({ 'X-Gemini-Api-Key': 'mock-key' })),
}));

interface MockMediaRecorderInstance {
  start: jest.Mock;
  stop: jest.Mock;
  state: string;
  ondataavailable: ((event: { data: Blob }) => void) | null;
  onstop: (() => void) | null;
}

interface MockStream {
  getTracks: jest.Mock<Array<{ stop: jest.Mock }>, []>;
}

describe('usePushToTalk', () => {
  let mockMediaRecorder: MockMediaRecorderInstance;
  let mockStream: MockStream;
  let originalMediaRecorder: typeof MediaRecorder | undefined;
  let originalMediaDevices: MediaDevices | undefined;

  beforeEach(() => {
    jest.clearAllMocks();

    mockStream = {
      getTracks: jest.fn(() => [{ stop: jest.fn() }]),
    };

    mockMediaRecorder = {
      start: jest.fn(),
      stop: jest.fn(function (this: MockMediaRecorderInstance) {
        if (this.onstop) this.onstop();
      }),
      state: 'recording',
      ondataavailable: null,
      onstop: null,
    };

    originalMediaRecorder = global.MediaRecorder;
    originalMediaDevices = navigator.mediaDevices;

    const mockRecorderConstructor = jest.fn(() => mockMediaRecorder) as unknown as typeof MediaRecorder & {
      isTypeSupported: jest.Mock<boolean, [string]>;
    };
    mockRecorderConstructor.isTypeSupported = jest.fn((_type: string) => true);
    global.MediaRecorder = mockRecorderConstructor as unknown as typeof MediaRecorder;

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: jest.fn().mockResolvedValue(mockStream),
      },
      writable: true,
      configurable: true,
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        text: 'Wchodzę do biblioteki.',
        segments: [{ speaker: 'Speaker 1', text: 'Wchodzę do biblioteki.' }],
      }),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    if (originalMediaRecorder) {
      global.MediaRecorder = originalMediaRecorder;
    }
    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalMediaDevices,
      writable: true,
      configurable: true,
    });
  });

  describe('isEditableTarget', () => {
    it('poprawnie wykrywa elementy edytowalne', () => {
      const input = document.createElement('input');
      const textarea = document.createElement('textarea');
      const select = document.createElement('select');
      const editableDiv = document.createElement('div');
      editableDiv.contentEditable = 'true';
      const roleTextbox = document.createElement('div');
      roleTextbox.setAttribute('role', 'textbox');

      expect(isEditableTarget(input)).toBe(true);
      expect(isEditableTarget(textarea)).toBe(true);
      expect(isEditableTarget(select)).toBe(true);
      expect(isEditableTarget(editableDiv)).toBe(true);
      expect(isEditableTarget(roleTextbox)).toBe(true);

      // Elementy zagnieżdżone w edytowalnych
      const nestedSpan = document.createElement('span');
      editableDiv.appendChild(nestedSpan);
      expect(isEditableTarget(nestedSpan)).toBe(true);

      const nestedInRole = document.createElement('span');
      roleTextbox.appendChild(nestedInRole);
      expect(isEditableTarget(nestedInRole)).toBe(true);
    });

    it('zwraca false dla zwykłych elementów UI', () => {
      const div = document.createElement('div');
      const button = document.createElement('button');
      const body = document.body;

      expect(isEditableTarget(div)).toBe(false);
      expect(isEditableTarget(button)).toBe(false);
      expect(isEditableTarget(body)).toBe(false);
      expect(isEditableTarget(null)).toBe(false);
    });
  });

  it('uruchamia nagrywanie w trybie toggle i wysyła audio po zatrzymaniu', async () => {
    const onTranscriptionSuccess = jest.fn();
    const onFocusInput = jest.fn();

    const { result } = renderHook(() =>
      usePushToTalk({
        onTranscriptionSuccess,
        onFocusInput,
        mode: 'solo',
      })
    );

    expect(result.current.isRecording).toBe(false);

    // Włącz nagrywanie
    await act(async () => {
      result.current.toggleRecording();
    });

    expect(result.current.isRecording).toBe(true);
    expect(result.current.isHoldMode).toBe(false);
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();

    // Wyłącz nagrywanie
    await act(async () => {
      result.current.toggleRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(mockMediaRecorder.stop).toHaveBeenCalled();

    // Symuluj ondataavailable i onstop
    await act(async () => {
      if (mockMediaRecorder.ondataavailable) {
        mockMediaRecorder.ondataavailable({
          data: new Blob(['audio-data'], { type: 'audio/webm' }),
        });
      }
      if (mockMediaRecorder.onstop) {
        mockMediaRecorder.onstop();
      }
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/transcribe',
      expect.objectContaining({
        method: 'POST',
      })
    );
    expect(onTranscriptionSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Wchodzę do biblioteki.',
      })
    );
    expect(onFocusInput).toHaveBeenCalled();
  });

  it('obsługuje błąd braku uprawnień mikrofonu wyświetlając toast i zwracając fokus', async () => {
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(
      new Error('Permission denied')
    );

    const onTranscriptionSuccess = jest.fn();
    const onFocusInput = jest.fn();

    const { result } = renderHook(() =>
      usePushToTalk({
        onTranscriptionSuccess,
        onFocusInput,
      })
    );

    await act(async () => {
      await result.current.startRecording(false);
    });

    expect(result.current.isRecording).toBe(false);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'destructive',
      })
    );
    expect(onFocusInput).toHaveBeenCalled();
  });

  it('reaguje na spację poza elementami edytowalnymi jako Hold-to-Talk', async () => {
    const onTranscriptionSuccess = jest.fn();
    const { result } = renderHook(() =>
      usePushToTalk({
        onTranscriptionSuccess,
      })
    );

    // KeyDown: Space na divie
    const targetDiv = document.createElement('div');
    document.body.appendChild(targetDiv);

    await act(async () => {
      const spaceDown = new KeyboardEvent('keydown', {
        code: 'Space',
        bubbles: true,
      });
      Object.defineProperty(spaceDown, 'target', { value: targetDiv });
      window.dispatchEvent(spaceDown);
    });

    expect(result.current.isRecording).toBe(true);
    expect(result.current.isHoldMode).toBe(true);

    // KeyUp: zwolnienie Spacji
    await act(async () => {
      const spaceUp = new KeyboardEvent('keyup', {
        code: 'Space',
        bubbles: true,
      });
      Object.defineProperty(spaceUp, 'target', { value: targetDiv });
      window.dispatchEvent(spaceUp);
    });

    expect(result.current.isRecording).toBe(false);
  });

  it('zwalnia nagrywanie Hold-to-Talk na keyup nawet jeśli target zdarzenia przeniósł się na pole edycyjne', async () => {
    const { result } = renderHook(() => usePushToTalk({ onTranscriptionSuccess: jest.fn() }));

    const bodyDiv = document.createElement('div');
    document.body.appendChild(bodyDiv);

    // Start wciśnięciem spacji na divie
    await act(async () => {
      const spaceDown = new KeyboardEvent('keydown', { code: 'Space', bubbles: true });
      Object.defineProperty(spaceDown, 'target', { value: bodyDiv });
      window.dispatchEvent(spaceDown);
    });

    expect(result.current.isRecording).toBe(true);
    expect(result.current.isHoldMode).toBe(true);

    // Zwolnienie spacji w momencie gdy focus/target przeniósł się na textarea
    const input = document.createElement('textarea');
    document.body.appendChild(input);

    await act(async () => {
      const spaceUp = new KeyboardEvent('keyup', { code: 'Space', bubbles: true });
      Object.defineProperty(spaceUp, 'target', { value: input });
      window.dispatchEvent(spaceUp);
    });

    // Nagrywanie MUSI zostać bezwzględnie przerwane (brak zacięcia mikrofonu)
    expect(result.current.isRecording).toBe(false);
  });

  it('ignoruje spację gdy aktywnym elementem dokumentu jest pole tekstowe', async () => {
    const { result } = renderHook(() => usePushToTalk({ onTranscriptionSuccess: jest.fn() }));

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    await act(async () => {
      const spaceDown = new KeyboardEvent('keydown', { code: 'Space', bubbles: true });
      Object.defineProperty(spaceDown, 'target', { value: input });
      window.dispatchEvent(spaceDown);
    });

    expect(result.current.isRecording).toBe(false);
  });

  it('ignoruje spację i nie rozpoczyna nagrywania gdy disabled jest true', async () => {
    const { result } = renderHook(() =>
      usePushToTalk({
        onTranscriptionSuccess: jest.fn(),
        disabled: true,
      })
    );

    const bodyDiv = document.createElement('div');
    document.body.appendChild(bodyDiv);

    await act(async () => {
      const spaceDown = new KeyboardEvent('keydown', { code: 'Space', bubbles: true });
      Object.defineProperty(spaceDown, 'target', { value: bodyDiv });
      window.dispatchEvent(spaceDown);
    });

    expect(result.current.isRecording).toBe(false);
    expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
  });

  it('startRecording nie uruchamia nagrywania ani getUserMedia gdy disabled jest true', async () => {
    const { result } = renderHook(() =>
      usePushToTalk({
        onTranscriptionSuccess: jest.fn(),
        disabled: true,
      })
    );

    await act(async () => {
      await result.current.startRecording(false);
    });

    expect(result.current.isRecording).toBe(false);
    expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
  });

  it('używa spersonalizowanego / przetłumaczonego tytułu toastu błędu mikrofonu', async () => {
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(
      new Error('NotAllowedError')
    );

    const { result } = renderHook(() =>
      usePushToTalk({
        onTranscriptionSuccess: jest.fn(),
        tMicPermissionDeniedTitle: 'Microphone Access',
        tMicPermissionDenied: 'Permission was denied by browser.',
      })
    );

    await act(async () => {
      await result.current.startRecording(false);
    });

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Microphone Access',
        description: 'Permission was denied by browser.',
      })
    );
  });
});
