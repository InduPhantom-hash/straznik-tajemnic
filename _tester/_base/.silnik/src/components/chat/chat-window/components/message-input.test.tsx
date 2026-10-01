import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MessageInput } from './message-input';
import type { ResolvedEraContext } from '@/lib/era';

describe('MessageInput - detekcja anachronizmów i dymek Art Déco', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const era1924US: ResolvedEraContext = {
    schemaVersion: 1,
    sceneDate: null,
    effectiveYear: 1924,
    countryCode: 'US',
    regionProfile: 'US',
    source: 'scenario-range',
    rulesVersion: '1.0.0',
  };

  const era1973PL: ResolvedEraContext = {
    schemaVersion: 1,
    sceneDate: null,
    effectiveYear: 1973,
    countryCode: 'PL',
    regionProfile: 'PL',
    source: 'scenario-range',
    rulesVersion: '1.0.0',
  };

  const eraModern: ResolvedEraContext = {
    schemaVersion: 1,
    sceneDate: null,
    effectiveYear: 2024,
    countryCode: 'US',
    regionProfile: 'US',
    source: 'scenario-range',
    rulesVersion: '1.0.0',
  };

  it('wyświetla dymek anachronizmu po wpisaniu słowa smartfon w epoce 1924', () => {
    const handleSendMessage = jest.fn();
    const setNewMessage = jest.fn();

    const { rerender } = render(
      <MessageInput
        newMessage=""
        setNewMessage={setNewMessage}
        handleSendMessage={handleSendMessage}
        messagesCount={0}
        eraContext={era1924US}
      />
    );

    expect(screen.queryByTestId('anachronism-alert')).not.toBeInTheDocument();

    // Symulacja wpisywania anachronizmu
    rerender(
      <MessageInput
        newMessage="Wyciągam smartfon i sprawdzam mapę"
        setNewMessage={setNewMessage}
        handleSendMessage={handleSendMessage}
        messagesCount={0}
        eraContext={era1924US}
      />
    );

    // Przed upływem debounce 250ms alert jeszcze się nie pojawia
    expect(screen.queryByTestId('anachronism-alert')).not.toBeInTheDocument();

    // Upływ debounce 250ms
    act(() => {
      jest.advanceTimersByTime(260);
    });

    const alert = screen.getByTestId('anachronism-alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Realia roku 1924');
    expect(alert).toHaveTextContent('smartfon');
  });

  it('pozwala zamknąć dymek przyciskiem "Zrozumiałem"', () => {
    const handleSendMessage = jest.fn();
    const setNewMessage = jest.fn();

    render(
      <MessageInput
        newMessage="Dzwonię z telefonu komórkowego"
        setNewMessage={setNewMessage}
        handleSendMessage={handleSendMessage}
        messagesCount={0}
        eraContext={era1924US}
      />
    );

    act(() => {
      jest.advanceTimersByTime(260);
    });

    expect(screen.getByTestId('anachronism-alert')).toBeInTheDocument();

    const dismissBtn = screen.getByTestId('anachronism-dismiss-button');
    fireEvent.click(dismissBtn);

    expect(screen.queryByTestId('anachronism-alert')).not.toBeInTheDocument();
  });

  it('nie wyświetla dymka dla technologii dozwolonych w danej epoce (rok 2024)', () => {
    const handleSendMessage = jest.fn();
    const setNewMessage = jest.fn();

    render(
      <MessageInput
        newMessage="Wyciągam smartfon i dzwonię"
        setNewMessage={setNewMessage}
        handleSendMessage={handleSendMessage}
        messagesCount={0}
        eraContext={eraModern}
      />
    );

    act(() => {
      jest.advanceTimersByTime(260);
    });

    expect(screen.queryByTestId('anachronism-alert')).not.toBeInTheDocument();
  });

  it('wykrywa zakazane instytucje regionalne (prywatny detektyw w PRL 1973)', () => {
    const handleSendMessage = jest.fn();
    const setNewMessage = jest.fn();

    render(
      <MessageInput
        newMessage="Wynajmuję prywatnego detektywa w Warszawie"
        setNewMessage={setNewMessage}
        handleSendMessage={handleSendMessage}
        messagesCount={0}
        eraContext={era1973PL}
      />
    );

    act(() => {
      jest.advanceTimersByTime(260);
    });

    const alert = screen.getByTestId('anachronism-alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Realia roku 1973');
    expect(alert).toHaveTextContent('prywatny detektyw');
  });

  describe('tryb duetu i przycisk Wyślij turę', () => {
    it('przycisk "Wyślij turę" jest zablokowany, gdy isTurnReady=false', () => {
      const handleSendMessage = jest.fn();
      const setNewMessage = jest.fn();
      const onAddDeclaration = jest.fn();
      const onSendTurn = jest.fn();

      render(
        <MessageInput
          newMessage=""
          setNewMessage={setNewMessage}
          handleSendMessage={handleSendMessage}
          messagesCount={0}
          isDuet={true}
          onAddDeclaration={onAddDeclaration}
          onSendTurn={onSendTurn}
          isTurnReady={false}
        />
      );

      const sendTurnBtn = screen.getByRole('button', { name: /Wyślij turę/i });
      expect(sendTurnBtn).toBeInTheDocument();
      expect(sendTurnBtn).toBeDisabled();
    });

    it('przycisk "Wyślij turę" jest aktywny i klikalny, gdy isTurnReady=true', () => {
      const handleSendMessage = jest.fn();
      const setNewMessage = jest.fn();
      const onAddDeclaration = jest.fn();
      const onSendTurn = jest.fn();

      render(
        <MessageInput
          newMessage=""
          setNewMessage={setNewMessage}
          handleSendMessage={handleSendMessage}
          messagesCount={0}
          isDuet={true}
          onAddDeclaration={onAddDeclaration}
          onSendTurn={onSendTurn}
          isTurnReady={true}
        />
      );

      const sendTurnBtn = screen.getByRole('button', { name: /Wyślij turę/i });
      expect(sendTurnBtn).toBeInTheDocument();
      expect(sendTurnBtn).toBeEnabled();

      fireEvent.click(sendTurnBtn);
      expect(onSendTurn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Issue #571: przycisk Zatrzymaj (Stop) i przełącznik skrótu wysyłania', () => {
    it('wyświetla czerwony przycisk Stop gdy isLoading=true i wywołuje onStopGeneration po kliknięciu', () => {
      const handleSendMessage = jest.fn();
      const setNewMessage = jest.fn();
      const onStopGeneration = jest.fn();

      render(
        <MessageInput
          newMessage=""
          setNewMessage={setNewMessage}
          handleSendMessage={handleSendMessage}
          messagesCount={1}
          isLoading={true}
          onStopGeneration={onStopGeneration}
        />
      );

      const stopBtn = screen.getByTestId('stop-generation-button');
      expect(stopBtn).toBeInTheDocument();
      expect(screen.queryByTitle(/Wyślij wiadomość/i)).not.toBeInTheDocument();

      fireEvent.click(stopBtn);
      expect(onStopGeneration).toHaveBeenCalledTimes(1);
    });

    it('wysyła wiadomość klawiszem Enter w trybie domyślnym', () => {
      const handleSendMessage = jest.fn();
      const setNewMessage = jest.fn();

      render(
        <MessageInput
          newMessage="Badam ślady na podłodze"
          setNewMessage={setNewMessage}
          handleSendMessage={handleSendMessage}
          messagesCount={1}
          isLoading={false}
        />
      );

      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      expect(handleSendMessage).toHaveBeenCalledWith('Badam ślady na podłodze');
      expect(setNewMessage).toHaveBeenCalledWith('');
    });

    it('pozwala przełączyć tryb wysyłania na Ctrl+Enter i zapisuje wybór w localStorage', () => {
      const handleSendMessage = jest.fn();
      const setNewMessage = jest.fn();

      render(
        <MessageInput
          newMessage="Nowa wiadomość"
          setNewMessage={setNewMessage}
          handleSendMessage={handleSendMessage}
          messagesCount={1}
        />
      );

      const toggleBtn = screen.getByTestId('send-mode-toggle');
      expect(toggleBtn).toBeInTheDocument();
      expect(toggleBtn).toHaveTextContent('↵ Enter');

      fireEvent.click(toggleBtn);
      expect(localStorage.getItem('straznik_chat_send_mode')).toBe('ctrl_enter');
      expect(toggleBtn).toHaveTextContent(/Ctrl\+↵|⌘\+↵/);

      // W trybie ctrl_enter sam Enter nie wysyła wiadomości
      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false, ctrlKey: false, metaKey: false });
      expect(handleSendMessage).not.toHaveBeenCalled();

      // Ctrl+Enter wysyła wiadomość
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
      expect(handleSendMessage).toHaveBeenCalledWith('Nowa wiadomość');
    });

    it('Issue #590: nie wyświetla przestarzałego przycisku książki (Podsumuj ostatnią scenę do dziennika) przy messagesCount >= 3', () => {
      const handleSendMessage = jest.fn();
      const setNewMessage = jest.fn();
      const onStopGeneration = jest.fn();
      const onSummarizeScene = jest.fn();

      const legacyProps = {
        newMessage: '',
        setNewMessage,
        handleSendMessage,
        messagesCount: 5,
        isLoading: true,
        onStopGeneration,
        onSummarizeScene,
      };

      render(<MessageInput {...legacyProps} />);

      expect(screen.getByTestId('stop-generation-button')).toBeInTheDocument();
      expect(
        screen.queryByTitle('Podsumuj ostatnią scenę do dziennika')
      ).not.toBeInTheDocument();
    });
  });
});


