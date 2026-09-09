import { fireEvent, render, screen } from '@testing-library/react';
import { MessageCard } from './message-card';
import type { Character, Message } from '@/lib/types';
import { PREDEFINED_CHARACTERS } from '@/lib/immersion/predefined-characters';

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
  afterEach(() => {
    delete process.env.NEXT_INTL_TEST_LOCALE;
  });

  it('renders the Game Master label for the English locale', () => {
    process.env.NEXT_INTL_TEST_LOCALE = 'en';

    render(<MessageCard {...baseProps} message={baseMessage} />);

    expect(screen.getByText('Game Master')).toBeInTheDocument();
    expect(screen.queryByText('Mistrz Gry')).not.toBeInTheDocument();
  });

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

  it('renderuje wygenerowany obraz na szczycie wiadomości, przed tekstem narracji', () => {
    const { container } = render(
      <MessageCard
        {...baseProps}
        message={{
          ...baseMessage,
          content: 'Tekst narracji po obrazku',
          generatedImages: ['https://example.com/test-scene.jpg'],
          generatedImageTypes: ['scene'],
        }}
      />
    );

    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();

    const narrative = container.querySelector('.narrative-content');
    expect(narrative).toBeInTheDocument();

    // Sprawdź kolejność w drzewie DOM: obraz występuje PRZED narracją
    expect(img!.compareDocumentPosition(narrative!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });
});

describe('MessageCard - zagrożenia', () => {
  const alice: Character = { ...PREDEFINED_CHARACTERS[0], id: 'alice', name: 'Alice', hp: 12 };
  const bob: Character = { ...PREDEFINED_CHARACTERS[1], id: 'bob', name: 'Bob', hp: 10 };
  const hazardMessage: Message = {
    ...baseMessage,
    id: 'hazard-message',
    content: 'Pod Bobem pęka podłoga.',
    hazardEvents: [{
      id: 'hazard-bob',
      type: 'falling',
      description: 'Krucha podłoga',
      characterName: 'Bob',
      fallHeightMeters: 3,
      surface: 'normal',
    }],
  };

  it('stosuje obrażenia do wskazanego badacza i wysyła stabilny identyfikator', () => {
    const onCharacterUpdate = jest.fn();
    const onSendHazardResult = jest.fn();
    render(
      <MessageCard
        {...baseProps}
        message={hazardMessage}
        activeCharacter={alice}
        characters={[alice, bob]}
        onCharacterUpdate={onCharacterUpdate}
        onSendHazardResult={onSendHazardResult}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reakcja obronna' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bez amortyzacji (pełny upadek)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Odejmij HP postaci' }));

    expect(onCharacterUpdate).toHaveBeenCalledTimes(1);
    expect(onCharacterUpdate.mock.calls[0][0].id).toBe('bob');
    expect(onCharacterUpdate.mock.calls[0][0].hp).toBeLessThan(10);
    expect(onSendHazardResult).toHaveBeenCalledWith(expect.stringContaining('id=hazard-bob'));
  });

  it('nie pozwala rozstrzygnąć zdarzenia zapisanego wcześniej w historii', () => {
    render(
      <MessageCard
        {...baseProps}
        message={hazardMessage}
        activeCharacter={alice}
        characters={[alice, bob]}
        resolvedHazardIds={new Set(['hazard-bob'])}
        onCharacterUpdate={jest.fn()}
        onSendHazardResult={jest.fn()}
      />
    );
    expect(screen.getByText('Rozstrzygnięto')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reakcja obronna' })).not.toBeInTheDocument();
  });

  it.each([
    ['acid', 'Łagodny kwas / rozprysk', 'Rzuć kośćmi na obrażenia od kwasu'],
    ['drowning', 'Woda / tonięcie', 'Test Kondycji (60%) przeciw uduszeniu'],
  ] as const)('otwiera kompletny widok dla typu %s', (type, expectedControl, expectedAction) => {
    render(
      <MessageCard
        {...baseProps}
        message={{
          ...hazardMessage,
          hazardEvents: [{
            id: `hazard-${type}`,
            type,
            description: 'Test zagrożenia',
            characterName: 'Bob',
            ...(type === 'acid' ? { acidPotency: 'splash' as const } : { airlessKind: 'water' as const }),
          }],
        }}
        activeCharacter={alice}
        characters={[alice, bob]}
        onCharacterUpdate={jest.fn()}
        onSendHazardResult={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reakcja obronna' }));
    expect(screen.getByText(expectedControl, { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: expectedAction })).toBeInTheDocument();
  });
});

describe('MessageCard - czary i rytuały (Issue #252)', () => {
  const alice: Character = {
    ...PREDEFINED_CHARACTERS[0],
    id: 'alice',
    name: 'Alice',
    pow: 60,
    mp: 12,
    hp: 12,
    san: 55,
    magic: {
      schemaVersion: 1,
      belief: 'believer',
      deferredSanLoss: 0,
      knownSpells: {},
      tomeStudies: {},
    },
  };

  const spellMessage: Message = {
    ...baseMessage,
    id: 'spell-message',
    content: 'Pradawna inkantacja odbija się echem w krypcie.',
    spellCastEvents: [
      {
        id: 'spell-cast-1',
        spellId: 'wither-limb',
        alias: 'Pieśń Bólu',
        characterName: 'Alice',
      },
    ],
  };

  it('renderuje kartę zaklęcia z nazwą diegetyczną i pozwala rzucić czar', () => {
    const onCharacterUpdate = jest.fn();
    const onSendSpellResult = jest.fn();

    render(
      <MessageCard
        {...baseProps}
        message={spellMessage}
        activeCharacter={alice}
        characters={[alice]}
        onCharacterUpdate={onCharacterUpdate}
        onSendSpellResult={onSendSpellResult}
      />
    );

    expect(screen.getByText('Pieśń Bólu')).toBeInTheDocument();
    expect(screen.getByText('Uwiąd Kończyny')).toBeInTheDocument();

    const castBtn = screen.getByRole('button', { name: /Rzuć zaklęcie/i });
    fireEvent.click(castBtn);

    expect(onCharacterUpdate).toHaveBeenCalled();
    expect(onSendSpellResult).toHaveBeenCalledWith(
      expect.stringContaining('[WYNIK_CZARU: id=spell-cast-1')
    );
  });

  it('oznacza kartę jako rozstrzygniętą, gdy id znajduje się w resolvedSpellIds', () => {
    render(
      <MessageCard
        {...baseProps}
        message={spellMessage}
        activeCharacter={alice}
        characters={[alice]}
        resolvedSpellIds={new Set(['spell-cast-1'])}
      />
    );

    expect(screen.getByText(/Inkantacja rozstrzygnięta/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Rzuć zaklęcie/i })).not.toBeInTheDocument();
  });
});

