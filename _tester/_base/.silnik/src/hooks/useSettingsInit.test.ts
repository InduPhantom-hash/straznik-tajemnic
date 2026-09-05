import { renderHook, act, RenderHookResult } from '@testing-library/react';
import { useSettingsInit, UseSettingsInitReturn, UseSettingsInitOptions } from './useSettingsInit';
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

    let hookResult!: RenderHookResult<UseSettingsInitReturn, UseSettingsInitOptions>['result'];
    await act(async () => {
      const { result } = renderHook(() =>
        useSettingsInit({
          open: true,
          onClose,
          onOpenChange,
        })
      );
      hookResult = result;
    });

    await act(async () => {
      await hookResult.current.handleSave();
    });

    expect(aiSettingsModule.saveAISettings).toHaveBeenCalled();
    expect(alertMock).not.toHaveBeenCalled();
    expect(hookResult.current.saveStatus).toBe('saved');
    expect(onClose).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('handleReset otwiera dialog potwierdzenia zamiast window.confirm', async () => {
    const onClose = jest.fn();

    let hookResult!: RenderHookResult<UseSettingsInitReturn, UseSettingsInitOptions>['result'];
    await act(async () => {
      const { result } = renderHook(() =>
        useSettingsInit({
          open: true,
          onClose,
        })
      );
      hookResult = result;
    });

    expect(hookResult.current.showResetConfirm).toBe(false);

    act(() => {
      hookResult.current.handleReset();
    });

    expect(confirmMock).not.toHaveBeenCalled();
    expect(hookResult.current.showResetConfirm).toBe(true);

    act(() => {
      hookResult.current.closeResetConfirm();
    });
    expect(hookResult.current.showResetConfirm).toBe(false);

    act(() => {
      hookResult.current.openResetConfirm();
    });
    expect(hookResult.current.showResetConfirm).toBe(true);

    act(() => {
      hookResult.current.confirmReset();
    });
    expect(aiSettingsModule.resetAISettings).toHaveBeenCalled();
    expect(hookResult.current.showResetConfirm).toBe(false);
  });
});
