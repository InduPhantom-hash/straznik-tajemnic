import {
  isCheatCommand,
  filterCheatSuggestions,
  executeCheatCommand,
  CHEAT_REGISTRY,
} from '@/lib/cheats/cheat-engine';
import type { Character } from '@/lib/types';

describe('Cheat Engine (Retro Kodów CoC 7e)', () => {
  const mockCharacter: Character = {
    id: 'char_test',
    name: 'Edward Carnby',
    str: 60,
    dex: 70,
    con: 65,
    app: 50,
    pow: 75,
    edu: 80,
    siz: 65,
    int: 85,
    luck: 55,
    hp: 12,
    maxHp: 12,
    san: 75,
    maxSan: 99,
    mp: 15,
    maxMp: 15,
    skills: {
      'Spostrzegawczość': 60,
      'Unik': 35,
      'Walka Wręcz (Bijatyka)': 50,
    },
    occupation: 'Prywatny Detektyw',
    age: 34,
    background: 'Bada zagadkowe zjawiska w Nowej Anglii.',
    playerName: 'Tester',
    isActive: true,
    lastUsed: new Date(),
    notes: '',
    experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0, maxEarnedThisSession: 10 },
    developmentHistory: [],
    equipment: [],
  };

  it('poprawnie wykrywa składnię kodów w nawiasach kwadratowych', () => {
    expect(isCheatCommand('[ROLL: Spostrzegawczość]')).toBe(true);
    expect(isCheatCommand('[IDDQD]')).toBe(true);
    expect(isCheatCommand('Zwykły tekst [nie cheat]')).toBe(false);
    expect(isCheatCommand('[ niedomknięty')).toBe(false);
  });

  it('filtruje podpowiedzi na podstawie wprowadzonego ciągu', () => {
    const all = filterCheatSuggestions('[');
    expect(all.length).toBe(CHEAT_REGISTRY.length);

    const filteredSan = filterCheatSuggestions('[SAN');
    expect(filteredSan.some((c) => c.command === 'SANITY')).toBe(true);

    const filteredRoll = filterCheatSuggestions('ROLL');
    expect(filteredRoll.some((c) => c.command === 'ROLL')).toBe(true);
  });

  it('wykonuje [HELP] zwracając spis komend w wiadomości asystenta', () => {
    const res = executeCheatCommand('[HELP]', mockCharacter, 'pl');
    expect(res.isCheat).toBe(true);
    expect(res.assistantMessage?.content).toContain('RETRO SILNIK KODÓW DEWELOPERSKICH');
  });

  it('wykonuje [IDDQD] przywracając pełne zdrowie, poczytalność i usuwając statusy ran', () => {
    const woundedChar: Character = {
      ...mockCharacter,
      hp: 3,
      san: 30,
      hasMajorWound: true,
      insanityState: 'temporary',
    };
    const res = executeCheatCommand('[IDDQD]', woundedChar, 'pl');
    expect(res.isCheat).toBe(true);
    expect(res.characterUpdates?.hp).toBe(12);
    expect(res.characterUpdates?.san).toBe(99);
    expect(res.characterUpdates?.luck).toBe(99);
    expect(res.characterUpdates?.hasMajorWound).toBe(false);
    expect(res.characterUpdates?.insanityState).toBe('none');
  });

  it('wykonuje [HP: -7] weryfikując Ciężką Ranę RAW', () => {
    const res = executeCheatCommand('[HP: -7: postrzał]', mockCharacter, 'pl');
    expect(res.isCheat).toBe(true);
    expect(res.characterUpdates?.hp).toBe(5);
    expect(res.characterUpdates?.hasMajorWound).toBe(true);
    expect(res.assistantMessage?.content).toContain('CIĘŻKA RANA');
  });

  it('wykonuje [SANITY: -6] sprawdzając wymóg testu INT RAW', () => {
    const res = executeCheatCommand('[SANITY: -6: widok potwora]', mockCharacter, 'pl');
    expect(res.isCheat).toBe(true);
    expect(res.characterUpdates?.san).toBe(69);
    expect(res.assistantMessage?.content).toContain('TEST INTELIGENCJI (RAW)');
  });

  it('wykonuje [COMBAT] i [CHASE] zwracając payloady otwarcia modali', () => {
    const combatRes = executeCheatCommand('[COMBAT: Zbój | nóż]', mockCharacter, 'pl');
    expect(combatRes.isCheat).toBe(true);
    expect(combatRes.openCombatModal).toBeDefined();
    expect(combatRes.openCombatModal?.attackerName).toBe('Zbój');

    const chaseRes = executeCheatCommand('[CHASE]', mockCharacter, 'pl');
    expect(chaseRes.isCheat).toBe(true);
    expect(chaseRes.openChaseModal).toBe(true);
  });
});
