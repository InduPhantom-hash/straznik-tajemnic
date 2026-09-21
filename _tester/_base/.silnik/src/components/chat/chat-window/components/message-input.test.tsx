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

    it('wyświetla przycisk "Odwróć role", gdy są co najmniej 2 deklaracje w buforze', () => {
      const handleSendMessage = jest.fn();
      const setNewMessage = jest.fn();
      const onAddDeclaration = jest.fn();
      const onSwapDuetDeclarations = jest.fn();

      render(
        <MessageInput
          newMessage=""
          setNewMessage={setNewMessage}
          handleSendMessage={handleSendMessage}
          messagesCount={0}
          isDuet={true}
          onAddDeclaration={onAddDeclaration}
          onSwapDuetDeclarations={onSwapDuetDeclarations}
          pendingDeclarations={[
            { playerId: 'p1', playerName: 'Badacz 1', text: 'Sprawdzam drzwi' },
            { playerId: 'p2', playerName: 'Badacz 2', text: 'Świecę latarką' },
          ]}
        />
      );

      const swapBtn = screen.getByTestId('swap-roles-button');
      expect(swapBtn).toBeInTheDocument();
      expect(swapBtn).toHaveTextContent('Odwróć role');

      fireEvent.click(swapBtn);
      expect(onSwapDuetDeclarations).toHaveBeenCalledTimes(1);
    });
  });

  describe('Push-to-Talk kontrolka mikrofonu', () => {
    it('renderuje przycisk mikrofonu w stylu Dark Art Déco', () => {
      const handleSendMessage = jest.fn();
      const setNewMessage = jest.fn();

      render(
        <MessageInput
          newMessage=""
          setNewMessage={setNewMessage}
          handleSendMessage={handleSendMessage}
          messagesCount={0}
        />
      );

      const micBtn = screen.getByTestId('ptt-mic-button');
      expect(micBtn).toBeInTheDocument();
      expect(micBtn).toHaveAttribute('title');
      expect(micBtn.className).toContain('border-brass');
    });
  });
});

