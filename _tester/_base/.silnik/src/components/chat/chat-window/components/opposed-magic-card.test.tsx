import { fireEvent, render, screen } from '@testing-library/react';
import { OpposedMagicCard } from './opposed-magic-card';
import { magicEngine } from '@/lib/magic';
import type { RollOutcome } from '@/lib/dice-utils';
import type { Character, OpposedMagicEventData } from '@/lib/types';
import { PREDEFINED_CHARACTERS } from '@/lib/immersion/predefined-characters';

describe('OpposedMagicCard - obrona przed wrogą magią CoC 7e RAW', () => {
  const baseDefender: Character = {
    ...PREDEFINED_CHARACTERS[0],
    id: 'char-defender-1',
    name: 'Tomasz Nowicki',
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

  const sampleEvent: OpposedMagicEventData = {
    id: 'opposed-event-1',
    attackerName: 'Kultysta Silas',
    attackerPow: 65,
    spellId: 'dominate',
    spellName: 'Dominacja',
    characterId: 'char-defender-1',
    characterName: 'Tomasz Nowicki',
    description: 'Kultysta wpatruje się w Twoje oczy, próbując przełamać Twoją wolę.',
  };

  it('renderuje kartę obrony z napastnikiem, obrońcą, progami i opisem', () => {
    render(<OpposedMagicCard opposedEvent={sampleEvent} activeCharacter={baseDefender} />);

    expect(screen.getByText(/Wroga Magia: Starcie Woli/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Dominacja/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Kultysta Silas/i)).toBeInTheDocument();
    expect(screen.getByText(/Tomasz Nowicki/i)).toBeInTheDocument();
    expect(screen.getByText(/Trudny:/i)).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument(); // 60 / 2
    expect(screen.getByText(/Ekstremalny:/i)).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument(); // 60 / 5
    expect(screen.getByRole('button', { name: /Broń się siłą woli/i })).toBeInTheDocument();
  });

  it('ostrzega o Zasadzie Granic Możliwości przy różnicy 100+ punktów', () => {
    const extremeEvent: OpposedMagicEventData = {
      ...sampleEvent,
      attackerName: 'Przedwieczny Cthulhu',
      attackerPow: 180, // 180 vs 60 = różnica 120 (>= 100)
    };

    render(<OpposedMagicCard opposedEvent={extremeEvent} activeCharacter={baseDefender} />);
    expect(screen.getByText(/Zasada granic możliwości/i)).toBeInTheDocument();
    expect(screen.getByText(/Obrona jest niemożliwa!/i)).toBeInTheDocument();
  });

  it('rozstrzyga obronę po kliknięciu i wysyła tag WYNIK_OBRONY_MAGII do czatu', () => {
    const onCharacterUpdate = jest.fn();
    const onSendChat = jest.fn();

    const resolveSpy = jest.spyOn(magicEngine, 'resolveOpposedDefense').mockReturnValueOnce({
      success: true,
      attackerName: 'Kultysta Silas',
      attackerPow: 65,
      defenderName: 'Tomasz Nowicki',
      defenderPow: 60,
      spellId: 'dominate',
      spellName: 'Dominacja',
      attackerRoll: 42,
      attackerSuccessLevel: 1,
      attackerOutcome: 'regular' as RollOutcome,
      defenderRoll: 18,
      defenderSuccessLevel: 2,
      defenderOutcome: 'hard' as RollOutcome,
      winner: 'defender',
      defenderPowImprovementEligible: true,
      ruleOfLimitsApplied: false,
      statChanges: { hpDelta: 0, sanDelta: 0, mpDelta: 0 },
      message: {
        pl: 'Tomasz Nowicki odparł zaklęcie Dominacja.',
        en: 'Tomasz Nowicki repelled Dominate.',
      },
      gmNarrativeContext: 'Obrona powiodła się.',
    });

    render(
      <OpposedMagicCard
        opposedEvent={sampleEvent}
        activeCharacter={baseDefender}
        onCharacterUpdate={onCharacterUpdate}
        onSendChat={onSendChat}
      />
    );

    const defendBtn = screen.getByRole('button', { name: /Broń się siłą woli/i });
    fireEvent.click(defendBtn);

    expect(resolveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        attackerName: 'Kultysta Silas',
        attackerPow: 65,
        defenderName: 'Tomasz Nowicki',
        defenderPow: 60,
      })
    );

    // Sukces obrony i rozwój POW
    expect(
      screen.getAllByText(/Obrona powiodła się! Czar został odparty/i).length
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/kwalifikuje MOC \(POW\) badacza do rozwoju/i)).toBeInTheDocument();

    // Wysłanie raportu do czatu
    expect(onSendChat).toHaveBeenCalledWith(
      expect.stringContaining('[WYNIK_OBRONY_MAGII: id=opposed-event-1 | cel=Tomasz Nowicki | rzucajacy=Kultysta Silas | czar=Dominacja | sukces=true')
    );

    resolveSpy.mockRestore();
  });
});
