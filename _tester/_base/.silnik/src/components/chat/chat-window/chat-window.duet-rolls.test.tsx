import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { Character, HotSeatConfig, Message } from '@/lib/types';
import { isSkillMarked } from '@/lib/types';
import { PREDEFINED_CHARACTERS } from '@/lib/immersion/predefined-characters';
import { appendRollToJournal } from '@/lib/journal/build-roll-entry';
import { markSkillForImprovement } from '@/lib/skill-migration';
import * as diceUtils from '@/lib/dice-utils';
import { ChatWindow } from './index';

jest.mock('@/hooks/useResolvedPortrait', () => ({
  useResolvedPortrait: () => null,
}));

function makeCharacter(
  sourceIndex: number,
  id: string,
  name: string,
  playerName: string,
  skillValue: number,
  luck: number
): Character {
  return {
    ...PREDEFINED_CHARACTERS[sourceIndex],
    id,
    name,
    playerName,
    portraitUrl: '/test-portrait.webp',
    luck,
    journal: [],
    skills: {
      ...PREDEFINED_CHARACTERS[sourceIndex].skills,
      Spostrzegawczość: {
        value: skillValue,
        markedForImprovement: false,
      },
    },
  };
}

describe('ChatWindow - adresowane rzuty duetu', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('zbiera dwa rzuty, przypisuje skutki kartom i wysyła jedno żądanie do MG', () => {
    const first = makeCharacter(
      0,
      'margaret',
      'Margaret Sullivan',
      'Aga',
      60,
      20
    );
    const second = makeCharacter(
      1,
      'dyer',
      'Prof. William Dyer',
      'Jakub',
      50,
      40
    );
    const hotSeatConfig: HotSeatConfig = {
      enabled: true,
      adventureJournalId: 'adventure-test',
      players: [
        {
          id: 'player-aga',
          name: 'Aga',
          color: '#f472b6',
          characterId: first.id,
          isActive: true,
          turnCount: 0,
        },
        {
          id: 'player-jakub',
          name: 'Jakub',
          color: '#4ade80',
          characterId: second.id,
          isActive: false,
          turnCount: 0,
        },
      ],
      activePlayerIndex: 0,
      allowInterruptions: false,
      showPlayerIndicator: true,
    };
    const message: Message = {
      id: 'gm-tests',
      role: 'assistant',
      content: 'Oboje nasłuchujecie kroków w korytarzu.',
      timestamp: new Date('2026-07-17T18:00:00Z'),
      skillTests: [
        {
          id: 'test-margaret',
          groupId: 'group-duet',
          characterId: first.id,
          characterName: first.name,
          skillName: 'Spostrzegawczość',
          skillValue: 60,
          difficulty: 'zwykly',
          modifiers: [],
          justification: 'Margaret nasłuchuje przy drzwiach.',
        },
        {
          id: 'test-dyer',
          groupId: 'group-duet',
          characterId: second.id,
          characterName: second.name,
          skillName: 'Spostrzegawczość',
          skillValue: 50,
          difficulty: 'zwykly',
          modifiers: [],
          justification: 'Dyer obserwuje cienie.',
        },
      ],
    };
    const handleSendMessage = jest.fn();
    let latestCharacters = [first, second];

    jest
      .spyOn(diceUtils, 'rollD100')
      .mockReturnValueOnce(65)
      .mockReturnValueOnce(30);

    function Harness() {
      const [characters, setCharacters] = useState<Character[]>([
        first,
        second,
      ]);
      latestCharacters = characters;

      return (
        <ChatWindow
          messages={[message]}
          newMessage=""
          setNewMessage={jest.fn()}
          handleSendMessage={handleSendMessage}
          currentAudio={null}
          stopCurrentAudio={jest.fn()}
          isTTSEnabled={false}
          activeCharacter={characters[0]}
          characters={characters}
          hasStartedGame
          hotSeatConfig={hotSeatConfig}
          onSpendLuck={(amount, characterId) => {
            setCharacters((current) =>
              current.map((character) =>
                character.id === characterId
                  ? {
                      ...character,
                      luck: Math.max(0, character.luck - amount),
                    }
                  : character
              )
            );
          }}
          onJournalRoll={(roll, justification, characterId) => {
            setCharacters((current) =>
              current.map((character) => {
                if (character.id !== characterId) return character;
                let updated = appendRollToJournal(
                  character,
                  roll,
                  justification
                );
                if (
                  roll.passedRequirement &&
                  !roll.luckSpent &&
                  roll.skillName
                ) {
                  updated = markSkillForImprovement(updated, roll.skillName);
                }
                return updated;
              })
            );
          }}
        />
      );
    }

    render(<Harness />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Rzuć kością' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Rzuć' }));
    act(() => jest.advanceTimersByTime(700));

    fireEvent.click(screen.getByRole('button', { name: 'Szczęście 5' }));
    expect(screen.getByText('✦ wydano 5 pkt Szczęścia')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Do czatu' }));

    expect(handleSendMessage).not.toHaveBeenCalled();
    expect(latestCharacters[0].luck).toBe(15);
    expect(latestCharacters[1].luck).toBe(40);
    expect(latestCharacters[0].journal).toHaveLength(1);
    expect(latestCharacters[1].journal).toHaveLength(0);
    expect(latestCharacters[0].journal?.[0].metadata?.rollResult).toBe(60);
    expect(latestCharacters[0].journal?.[0].content).toContain(
      'Rzut 60 na Spostrzegawczość (60%)'
    );
    expect(latestCharacters[0].journal?.[0].content).toContain(
      'SUKCES - sukces.'
    );
    expect(isSkillMarked(latestCharacters[0].skills.Spostrzegawczość)).toBe(
      false
    );

    const remainingRollButton = screen
      .getAllByRole('button', { name: 'Rzuć kością' })
      .find((button) => !button.hasAttribute('disabled'));
    expect(remainingRollButton).toBeDefined();
    fireEvent.click(remainingRollButton as HTMLButtonElement);
    fireEvent.click(screen.getByRole('button', { name: 'Rzuć' }));
    act(() => jest.advanceTimersByTime(700));
    fireEvent.click(screen.getByRole('button', { name: 'Do czatu' }));

    expect(latestCharacters[0].journal).toHaveLength(1);
    expect(latestCharacters[1].journal).toHaveLength(1);
    expect(latestCharacters[1].journal?.[0].metadata?.rollResult).toBe(30);
    expect(latestCharacters[1].journal?.[0].content).toContain(
      'Rzut 30 na Spostrzegawczość (50%)'
    );
    expect(isSkillMarked(latestCharacters[1].skills.Spostrzegawczość)).toBe(
      true
    );
    expect(handleSendMessage).toHaveBeenCalledTimes(1);

    const combinedMessage = handleSendMessage.mock.calls[0][0] as string;
    expect(combinedMessage).toContain('Wyniki testów obojga badaczy:');
    expect(combinedMessage).toContain(
      'Margaret Sullivan wykonał test umiejętności "Spostrzegawczość" (60%): wynik 60, REGULAR, wymagany poziom: zwykły - SUKCES'
    );
    expect(combinedMessage).toContain(
      'Prof. William Dyer wykonał test umiejętności "Spostrzegawczość" (50%): wynik 30, REGULAR, wymagany poziom: zwykły - SUKCES'
    );
    expect(combinedMessage.indexOf('Margaret Sullivan')).toBeLessThan(
      combinedMessage.indexOf('Prof. William Dyer')
    );
  });
});
