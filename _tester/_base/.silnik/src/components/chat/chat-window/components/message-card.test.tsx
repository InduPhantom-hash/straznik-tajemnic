import { fireEvent, render, screen } from '@testing-library/react';
import { MessageCard } from './message-card';
import type { Message } from '@/lib/types';

const baseMessage: Message = {
  id: 'assistant-partial',
  role: 'assistant',
  content: 'Urwany fragment narracji',
  timestamp: new Date('2026-08-23T12:00:00.000Z'),
};

const baseProps = {
  activeCharacter: null,
  isTTSEnabled: false,
  currentAudio: null,
  stopCurrentAudio: jest.fn(),
  playerColors: new Map<string, string>(),
  onImageClick: jest.fn(),
};

describe('MessageCard - ręczna kontynuacja narracji', () => {
  it('pokazuje akcję tylko dla ostatniego MAX_TOKENS i wywołuje callback', () => {
    const onContinueNarration = jest.fn();
    render(
      <MessageCard
        {...baseProps}
        message={{ ...baseMessage, finishReason: 'MAX_TOKENS' }}
        isLastMessage
        onContinueNarration={onContinueNarration}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Kontynuuj narrację' })
    );
    expect(onContinueNarration).toHaveBeenCalledWith('assistant-partial');
  });

  it.each([
    ['STOP', true],
    ['MAX_TOKENS', false],
  ])('ukrywa akcję dla finishReason=%s, isLast=%s', (finishReason, isLast) => {
    render(
      <MessageCard
        {...baseProps}
        message={{ ...baseMessage, finishReason }}
        isLastMessage={isLast}
        onContinueNarration={jest.fn()}
      />
    );

    expect(
      screen.queryByRole('button', { name: 'Kontynuuj narrację' })
    ).not.toBeInTheDocument();
  });

  it('blokuje akcję po pierwszym kliknięciu', () => {
    render(
      <MessageCard
        {...baseProps}
        message={{
          ...baseMessage,
          finishReason: 'MAX_TOKENS',
          continuationRequested: true,
        }}
        isLastMessage
        onContinueNarration={jest.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: 'Kontynuacja zamówiona' })
    ).toBeDisabled();
  });
});
