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
});
