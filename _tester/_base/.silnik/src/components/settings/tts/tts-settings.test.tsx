import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TTSSettings } from './index';
import { defaultAISettings } from '@/lib/ai-settings/defaults';

describe('TTSSettings - przełącznik Push-to-Talk', () => {
  const defaultProps = {
    settings: defaultAISettings,
    setSettings: jest.fn(),
    testResults: {
      gemini: null,
      googleTTS: null,
      replicate: null,
      cloudSessions: null,
    },
    isLoading: false,
    testAPI: jest.fn(),
    getTestResultColor: jest.fn(() => 'text-muted'),
    getTestResultIcon: jest.fn(() => '⚪'),
    availableVoices: [],
    loadAvailableVoices: jest.fn(),
  };

  it('renderuje sekcję Push-to-Talk oraz przełącznik z domyślną wartością false', () => {
    render(<TTSSettings {...defaultProps} />);

    const pttToggle = screen.getByTestId('ptt-settings-toggle');
    expect(pttToggle).toBeInTheDocument();
    expect(pttToggle).toHaveAttribute('aria-checked', 'false');
  });

  it('po kliknięciu przełącznika wywołuje setSettings z pushToTalkEnabled: true', () => {
    const setSettings = jest.fn();
    render(<TTSSettings {...defaultProps} setSettings={setSettings} />);

    const pttToggle = screen.getByTestId('ptt-settings-toggle');
    fireEvent.click(pttToggle);

    expect(setSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        pushToTalkEnabled: true,
        voiceSettings: expect.objectContaining({
          pushToTalkEnabled: true,
        }),
      })
    );
  });

  it('renderuje stan aktywny gdy pushToTalkEnabled jest włączone', () => {
    const enabledSettings = {
      ...defaultAISettings,
      pushToTalkEnabled: true,
      voiceSettings: {
        ...defaultAISettings.voiceSettings,
        pushToTalkEnabled: true,
      },
    };

    render(<TTSSettings {...defaultProps} settings={enabledSettings} />);

    const pttToggle = screen.getByTestId('ptt-settings-toggle');
    expect(pttToggle).toHaveAttribute('aria-checked', 'true');
  });
});
