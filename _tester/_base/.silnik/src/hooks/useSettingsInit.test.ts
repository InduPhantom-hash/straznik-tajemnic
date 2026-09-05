import { renderHook, act } from '@testing-library/react';
import { useSettingsInit } from './useSettingsInit';
import * as aiSettingsModule from '@/lib/ai-settings';

jest.mock('@/lib/ai-settings', () => {
  const original = jest.requireActual('@/lib/ai-settings');
  return {
    ...original,
    saveAISettings: jest.fn(),
    loadAISettings: jest.fn(() => original.defaultAISettings),
    resetAISettings: jest.fn(() => original.defaultAISettings),
  };
});

describe('useSettingsInit', () => {
  let originalAlert: typeof window.alert;
  let originalConfirm: typeof window.confirm;
  let alertMock: jest.Mock;
  let confirmMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    originalAlert = window.alert;
    originalConfirm = window.confirm;
    alertMock = jest.fn();
    confirmMock = jest.fn();
    window.alert = alertMock;
    window.confirm = confirmMock;
  });

  afterEach(() => {
    window.alert = originalAlert;
    window.confirm = originalConfirm;
  });

  it('handleSave zapisuje ustawienia, zamyka modal i NIE wywołuje window.alert', async () => {
    const onClose = jest.fn();
    const onOpenChange = jest.fn();

    let resultHook: any;
    await act(async () => {
      const { result } = renderHook(() =>
        useSettingsInit({
          open: true,
          onClose,
          onOpenChange,
        })
      );
      resultHook = result;
    });

    await act(async () => {
      await resultHook.current.handleSave();
    });

    expect(aiSettingsModule.saveAISettings).toHaveBeenCalled();
    expect(alertMock).not.toHaveBeenCalled();
    expect(resultHook.current.saveStatus).toBe('saved');
    expect(onClose).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('handleReset otwiera dialog potwierdzenia zamiast window.confirm', async () => {
    const onClose = jest.fn();

    let resultHook: any;
    await act(async () => {
      const { result } = renderHook(() =>
        useSettingsInit({
          open: true,
          onClose,
        })
      );
      resultHook = result;
    });

    expect(resultHook.current.showResetConfirm).toBe(false);

    act(() => {
      resultHook.current.handleReset();
    });

    expect(confirmMock).not.toHaveBeenCalled();
    expect(resultHook.current.showResetConfirm).toBe(true);

    act(() => {
      resultHook.current.closeResetConfirm();
    });
    expect(resultHook.current.showResetConfirm).toBe(false);

    act(() => {
      resultHook.current.openResetConfirm();
    });
    expect(resultHook.current.showResetConfirm).toBe(true);

    act(() => {
      resultHook.current.confirmReset();
    });
    expect(aiSettingsModule.resetAISettings).toHaveBeenCalled();
    expect(resultHook.current.showResetConfirm).toBe(false);
  });
});
