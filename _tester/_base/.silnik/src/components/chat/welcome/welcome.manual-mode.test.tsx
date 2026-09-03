import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WelcomeScreen } from './index';

// Mock audio / typewriter sound
jest.mock('./hooks/use-typewriter-sound', () => ({
  useTypewriterSound: () => ({
    displayedText: 'Test quote',
    isTyping: false,
  }),
}));

// Mock api-keys-service
jest.mock('@/lib/api-keys-service', () => ({
  hasRequiredKeys: jest.fn(() => true),
}));

describe('WelcomeScreen - Manual Mode persistence (Issue #40)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('domyślnie renderuje kafelki wyboru trybu (StartModeCards), gdy localStorage jest pusty', () => {
    render(
      <WelcomeScreen
        onUploadRules={jest.fn()}
        onSelectAdventure={jest.fn()}
        onCreateCharacter={jest.fn()}
        onStartGame={jest.fn()}
      />
    );

    expect(screen.getByTestId('btn-manual-setup')).toBeInTheDocument();
    expect(screen.queryByTestId('manual-setup-panel')).not.toBeInTheDocument();
  });

  it('zapisuje welcome_manual_mode = "true" po kliknięciu "Konfiguracja ręczna"', () => {
    render(
      <WelcomeScreen
        onUploadRules={jest.fn()}
        onSelectAdventure={jest.fn()}
        onCreateCharacter={jest.fn()}
        onStartGame={jest.fn()}
      />
    );

    const manualBtn = screen.getByTestId('btn-manual-setup');
    fireEvent.click(manualBtn);

    expect(localStorage.getItem('welcome_manual_mode')).toBe('true');
    expect(screen.getByTestId('manual-setup-panel')).toBeInTheDocument();
  });

  it('automatycznie otwiera ManualSetupPanel gdy welcome_manual_mode = "true" jest w localStorage (np. powrót z kreatora)', () => {
    localStorage.setItem('welcome_manual_mode', 'true');

    render(
      <WelcomeScreen
        onUploadRules={jest.fn()}
        onSelectAdventure={jest.fn()}
        onCreateCharacter={jest.fn()}
        onStartGame={jest.fn()}
      />
    );

    expect(screen.getByTestId('manual-setup-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('btn-manual-setup')).not.toBeInTheDocument();
  });

  it('usuwa welcome_manual_mode z localStorage po kliknięciu "Wróć do wyboru trybu"', () => {
    localStorage.setItem('welcome_manual_mode', 'true');

    render(
      <WelcomeScreen
        onUploadRules={jest.fn()}
        onSelectAdventure={jest.fn()}
        onCreateCharacter={jest.fn()}
        onStartGame={jest.fn()}
      />
    );

    const backBtn = screen.getByRole('button', { name: /Wróć do wyboru trybu/i });
    fireEvent.click(backBtn);

    expect(localStorage.getItem('welcome_manual_mode')).toBeNull();
    expect(screen.getByTestId('btn-manual-setup')).toBeInTheDocument();
    expect(screen.queryByTestId('manual-setup-panel')).not.toBeInTheDocument();
  });
});
