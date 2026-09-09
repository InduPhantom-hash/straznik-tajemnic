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

    fireEvent.click(screen.getByRole('button', { name: 'Bez amortyzacji (pełny upadek)' }));

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
    expect(screen.queryByRole('button', { name: 'Bez amortyzacji (pełny upadek)' })).not.toBeInTheDocument();
  });

  it.each([
    ['acid', 'Substancja żrąca / Kwas', 'Rzuć kośćmi na obrażenia od kwasu'],
    ['drowning', 'Tonięcie', 'Test Kondycji (60%) przeciw uduszeniu'],
  ] as const)('renderuje bezpośrednią kartę dla typu %s', (type, expectedLabel, expectedAction) => {
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

    expect(screen.getByText(expectedLabel, { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: expectedAction })).toBeInTheDocument();
  });
});

describe('MessageCard - pościg w czacie', () => {
  const alice: Character = { ...PREDEFINED_CHARACTERS[0], id: 'alice', name: 'Alice', hp: 12, dex: 60 };
  const chaseMessage: Message = {
    ...baseMessage,
    id: 'chase-msg',
    content: 'Kultyści depczą ci po piętach w zaułku!',
    chaseState: {
      id: 'chase-msg-state',
      status: 'ongoing',
      round: 1,
      maxRounds: 6,
      turnOrder: ['alice', 'cultist'],
      activeActorId: 'alice',
      participants: [
        {
          id: 'alice',
          name: 'Alice',
          isPlayer: true,
          isFleeing: true,
          mov: 8,
          actionsTotal: 2,
          actionsRemaining: 2,
          segmentIndex: 3,
        },
        {
          id: 'cultist',
          name: 'Kultysta',
          isPlayer: false,
          isFleeing: false,
          mov: 7,
          actionsTotal: 1,
          actionsRemaining: 1,
          segmentIndex: 1,
        },
      ],
      segments: [
        { index: 0, name: 'Lokacja 1' },
        { index: 1, name: 'Lokacja 2' },
        { index: 2, name: 'Lokacja 3' },
        { index: 3, name: 'Zaułek' },
        { index: 4, name: 'Lokacja 5' },
      ],
      logs: [],
    },
  };

  it('renderuje kartę pościgu w strumieniu wiadomości i pozwala wykonać manewr', () => {
    const onChaseManeuver = jest.fn();
    render(
      <MessageCard
        {...baseProps}
        message={chaseMessage}
        activeCharacter={alice}
        characters={[alice]}
        isLastMessage
        onChaseManeuver={onChaseManeuver}
      />
    );

    expect(screen.getByText('Pościg CoC 7e RAW')).toBeInTheDocument();
    expect(screen.getByText('Runda 1/6')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sprint naprzód/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Brawurowy skrót/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Sprint naprzód/i }));
    expect(onChaseManeuver).toHaveBeenCalledWith(
      'sprint',
      expect.objectContaining({ status: 'ongoing' }),
      expect.stringContaining('Alice: Sprint naprzód')
    );
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

  const tomeMessage: Message = {
    ...baseMessage,
    id: 'tome-message',
    content: 'Na dębowym pulpicie spoczywa ciężki, oprawny w skórę wolumin.',
    tomeStudyEvents: [
      {
        id: 'tome-study-1',
        tomeId: 'necronomicon-latin',
        characterName: 'Alice',
      },
    ],
  };

  it('renderuje kartę tomu Mitów i pozwala wykonać wstępny przegląd', () => {
    const onCharacterUpdate = jest.fn();
    const onSendTomeResult = jest.fn();

    render(
      <MessageCard
        {...baseProps}
        message={tomeMessage}
        activeCharacter={alice}
        characters={[alice]}
        onCharacterUpdate={onCharacterUpdate}
        onSendTomeResult={onSendTomeResult}
      />
    );

    expect(screen.getByText(/Necronomicon/i)).toBeInTheDocument();
    expect(screen.getByText(/Abdul Alhazred/i)).toBeInTheDocument();

    const skimBtn = screen.getByRole('button', { name: /Wstępny przegląd/i });
    fireEvent.click(skimBtn);

    expect(onCharacterUpdate).toHaveBeenCalled();
    expect(onSendTomeResult).toHaveBeenCalledWith(
      expect.stringContaining('[WYNIK_TOMU: id=tome-study-1')
    );
  });

  it('oznacza kartę tomu jako rozstrzygniętą, gdy id znajduje się w resolvedTomeIds', () => {
    render(
      <MessageCard
        {...baseProps}
        message={tomeMessage}
        activeCharacter={alice}
        characters={[alice]}
        resolvedTomeIds={new Set(['tome-study-1'])}
      />
    );

    expect(screen.getByText(/Badanie tomu zakończone/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Wstępny przegląd/i })).not.toBeInTheDocument();
  });
});

