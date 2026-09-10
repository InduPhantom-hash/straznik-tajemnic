import { fireEvent, render, screen } from '@testing-library/react';
import { SpellCard } from './spell-card';
import { magicEngine, getSpellDefinition } from '@/lib/magic';
import type { RollOutcome } from '@/lib/dice-utils';
import type { Character, SpellCastEventData } from '@/lib/types';
import { PREDEFINED_CHARACTERS } from '@/lib/immersion/predefined-characters';

describe('SpellCard - rzucanie zaklęć i rytuałów Fiction First CoC 7e RAW', () => {
  const baseCaster: Character = {
    ...PREDEFINED_CHARACTERS[0],
    id: 'char-caster-1',
    name: 'Tomasz Nowicki',
    pow: 70,
    mp: 14,
    hp: 12,
    san: 60,
    magic: {
      schemaVersion: 1,
      belief: 'believer',
      deferredSanLoss: 0,
      knownSpells: {},
      tomeStudies: {},
    },
  };

  const spellEventWitherLimb: SpellCastEventData = {
    id: 'spell-event-1',
    spellId: 'wither-limb',
    characterId: 'char-caster-1',
    characterName: 'Tomasz Nowicki',
    targetName: 'Kultysta Silas',
    targetPow: 55,
  };

  it('renderuje kartę zaklęcia z diegetycznym tytułem, bilanse zasobów i stawkami starcia woli', () => {
    render(<SpellCard spellEvent={spellEventWitherLimb} activeCharacter={baseCaster} />);

    // Tytuł diegetyczny i kanoniczny
    expect(screen.getByText(/Pieśń Bólu/i)).toBeInTheDocument();
    expect(screen.getByText(/Uwiąd Kończyny/i)).toBeInTheDocument();

    // Bilans zasobów Pre-flight
    expect(screen.getByText(/14 PM/i)).toBeInTheDocument();
    expect(screen.getByText(/60 SAN/i)).toBeInTheDocument();

    // Stawki pierwszego rzucenia i pojedynku woli
    expect(screen.getByText(/Pierwsze rzucenie: Wymaga Trudnego testu Mocy/i)).toBeInTheDocument();
    expect(screen.getByText(/Kultysta Silas/i)).toBeInTheDocument();
  });

  it('rozwija mini-przewodnik zasad magii CoC 7e po kliknięciu', () => {
    render(<SpellCard spellEvent={spellEventWitherLimb} activeCharacter={baseCaster} />);

    const guideToggle = screen.getByText(/Zasady magii CoC 7e/i);
    fireEvent.click(guideToggle);

    expect(screen.getByText(/Tajemnice Inkantacji CoC 7e RAW/i)).toBeInTheDocument();
    expect(screen.getByText(/Magia w Zewie Cthulhu to nie rzucanie czarów fantasy/i)).toBeInTheDocument();
  });

  it('rozstrzyga pierwsze rzucenie zaklęcia z sukcesem i pojedynek woli, wyświetlając kości K100 i poziomy sukcesu', () => {
    const onCharacterUpdate = jest.fn();
    const onSendChat = jest.fn();

    const resolveSpy = jest.spyOn(magicEngine, 'resolveCasting').mockReturnValueOnce({
      spellId: 'wither-limb',
      success: true,
      isFirstCast: true,
      firstCastRoll: {
        roll: 22,
        threshold: 35,
        success: true,
        outcome: 'hard_success' as RollOutcome,
        pushedFailedCatastrophe: false,
      },
      opposedRoll: {
        casterRoll: 18,
        casterPow: 70,
        casterSuccessLevel: 3,
        casterOutcome: 'extreme_success' as RollOutcome,
        targetRoll: 45,
        targetPow: 55,
        targetSuccessLevel: 1,
        targetOutcome: 'regular_success' as RollOutcome,
        winner: 'caster',
        casterPowImprovementEligible: true,
      },
      costPaid: { mp: 8, hpFromMp: 0, san: 6, powPermanent: 0 },
      statChanges: { mpDelta: -8, hpDelta: 0, sanDelta: -6, powDelta: 0 },
      characterUpdates: { isFirstCastDone: true },
      message: {
        pl: 'Tomasz Nowicki z powodzeniem rzuca Pieśń Bólu. Cel ulega potędze woli.',
        en: 'Tomasz Nowicki successfully casts Song of Pain. Target succumbs.',
      },
      gmNarrativeContext: 'Test udany.',
    });

    render(
      <SpellCard
        spellEvent={spellEventWitherLimb}
        activeCharacter={baseCaster}
        onCharacterUpdate={onCharacterUpdate}
        onSendChat={onSendChat}
      />
    );

    const castBtn = screen.getByRole('button', { name: /Rzuć zaklęcie/i });
    fireEvent.click(castBtn);

    // Wyświetla kości K100 (1 dla opanowania + 2 dla starcia woli rzucający vs cel = 3 rzuty)
    expect(screen.getAllByText(/K100:/i).length).toBe(3);

    // Aktualizacja postaci (koszt 8 PM i 6 SAN)
    expect(onCharacterUpdate).toHaveBeenCalled();
    const updatedChar = onCharacterUpdate.mock.calls[0][0];
    expect(updatedChar.mp).toBe(6);
    expect(updatedChar.san).toBe(54);

    // Wysłanie raportu do czatu
    expect(onSendChat).toHaveBeenCalledWith(
      expect.stringContaining('[WYNIK_CZARU: id=spell-event-1 | spell=wither-limb')
    );

    resolveSpy.mockRestore();
  });

  it('obsługuje porażkę pierwszego rzucenia i pozwala na sforsowanie rzutu', () => {
    const onCharacterUpdate = jest.fn();
    const onSendChat = jest.fn();

    const resolveSpy = jest
      .spyOn(magicEngine, 'resolveCasting')
      .mockReturnValueOnce({
        spellId: 'wither-limb',
        success: false,
        isFirstCast: true,
        firstCastRoll: {
          roll: 55,
          threshold: 35,
          success: false,
          outcome: 'failure' as RollOutcome,
          pushedFailedCatastrophe: false,
        },
        opposedRoll: undefined,
        costPaid: { mp: 8, hpFromMp: 0, san: 6, powPermanent: 0 },
        statChanges: { mpDelta: -8, hpDelta: 0, sanDelta: -6, powDelta: 0 },
        characterUpdates: { isFirstCastDone: false },
        message: {
          pl: 'Inkantacja rwie się w gardle.',
          en: 'Incantation fails.',
        },
        gmNarrativeContext: 'Niepowodzenie pierwszego rzucenia.',
      })
      .mockReturnValueOnce({
        spellId: 'wither-limb',
        success: true,
        isFirstCast: true,
        firstCastRoll: {
          roll: 30,
          threshold: 35,
          success: true,
          outcome: 'hard_success' as RollOutcome,
          pushedFailedCatastrophe: false,
        },
        opposedRoll: {
          casterRoll: 12,
          casterPow: 70,
          casterSuccessLevel: 3,
          casterOutcome: 'extreme_success' as RollOutcome,
          targetRoll: 50,
          targetPow: 55,
          targetSuccessLevel: 1,
          targetOutcome: 'regular_success' as RollOutcome,
          winner: 'caster',
          casterPowImprovementEligible: true,
        },
        costPaid: { mp: 8, hpFromMp: 0, san: 6, powPermanent: 0 },
        statChanges: { mpDelta: -8, hpDelta: 0, sanDelta: -6, powDelta: 0 },
        characterUpdates: { isFirstCastDone: true },
        message: {
          pl: 'Forsowany rzut powiódł się.',
          en: 'Pushed roll succeeded.',
        },
        gmNarrativeContext: 'Sforsowany rzut.',
      });

    render(
      <SpellCard
        spellEvent={spellEventWitherLimb}
        activeCharacter={baseCaster}
        onCharacterUpdate={onCharacterUpdate}
        onSendChat={onSendChat}
      />
    );

    const castBtn = screen.getByRole('button', { name: /Rzuć zaklęcie/i });
    fireEvent.click(castBtn);

    // Pojawia się przycisk forsowania rzutu
    const pushBtn = screen.getByRole('button', { name: /Forsuj rzut/i });
    expect(pushBtn).toBeInTheDocument();

    // Forsowanie
    fireEvent.click(pushBtn);
    expect(resolveSpy).toHaveBeenCalledTimes(2);
    expect(resolveSpy.mock.calls[1][0].isPush).toBe(true);

    resolveSpy.mockRestore();
  });

  it('obsługuje brak PM i wymaga zgody na krwawą ofiarę z HP', () => {
    const lowMpCaster: Character = {
      ...baseCaster,
      mp: 2, // Za mało (wither-limb wymaga 8 PM)
      hp: 12,
    };

    render(<SpellCard spellEvent={spellEventWitherLimb} activeCharacter={lowMpCaster} />);

    // Wyświetla baner krwawej ofiary
    expect(screen.getByText(/Krwawa ofiara/i)).toBeInTheDocument();
    expect(screen.getByText(/Brakujące 6 PM zostanie wyszarpane z Twojego ciała/i)).toBeInTheDocument();

    const castBtn = screen.getByRole('button', { name: /Rzuć zaklęcie/i });
    expect(castBtn).toBeDisabled();

    // Zaznaczenie zgody na ofiarę
    const consentCheckbox = screen.getByRole('checkbox');
    fireEvent.click(consentCheckbox);

    expect(castBtn).not.toBeDisabled();
  });
});
