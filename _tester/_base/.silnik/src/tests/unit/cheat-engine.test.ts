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

  it('wykonuje [COMBAT] oraz alias [WALKA] i [CHASE] zwracając payloady Fiction First w czacie i pościgu', () => {
    const combatRes = executeCheatCommand('[COMBAT: Zbój | nóż]', mockCharacter, 'pl');
    expect(combatRes.isCheat).toBe(true);
    expect(combatRes.assistantMessage?.pendingMeleeAttacks).toBeDefined();
    expect(combatRes.assistantMessage?.pendingMeleeAttacks?.[0].attacker.name).toBe('Zbój');

    const walkaRes = executeCheatCommand('[WALKA: Bandyta | pałka]', mockCharacter, 'pl');
    expect(walkaRes.isCheat).toBe(true);
    expect(walkaRes.assistantMessage?.pendingMeleeAttacks).toBeDefined();
    expect(walkaRes.assistantMessage?.pendingMeleeAttacks?.[0].attacker.name).toBe('Bandyta');

    const chaseRes = executeCheatCommand('[CHASE]', mockCharacter, 'pl');
    expect(chaseRes.isCheat).toBe(true);
    expect(chaseRes.openChaseModal).toBe(true);
  });

  it('wykonuje [SPELL] oraz alias [CZAR] generując zdarzenie rzucania zaklęcia', () => {
    const spellRes = executeCheatCommand('[SPELL: wither-limb | cel=Kultysta | pow=65]', mockCharacter, 'pl');
    expect(spellRes.isCheat).toBe(true);
    expect(spellRes.assistantMessage?.spellCastEvents).toBeDefined();
    expect(spellRes.assistantMessage?.spellCastEvents?.[0].spellId).toBe('wither-limb');
    expect(spellRes.assistantMessage?.spellCastEvents?.[0].targetName).toBe('Kultysta');
    expect(spellRes.assistantMessage?.spellCastEvents?.[0].targetPow).toBe(65);

    const czarRes = executeCheatCommand('[CZAR: elder-sign]', mockCharacter, 'pl');
    expect(czarRes.isCheat).toBe(true);
    expect(czarRes.assistantMessage?.spellCastEvents?.[0].spellId).toBe('elder-sign');
  });

  it('wykonuje [TOME] oraz alias [TOM] generując zdarzenie lektury tomu', () => {
    const tomeRes = executeCheatCommand('[TOME: necronomicon-latin | akcja=study]', mockCharacter, 'pl');
    expect(tomeRes.isCheat).toBe(true);
    expect(tomeRes.assistantMessage?.tomeStudyEvents).toBeDefined();
    expect(tomeRes.assistantMessage?.tomeStudyEvents?.[0].tomeId).toBe('necronomicon-latin');
    expect(tomeRes.assistantMessage?.tomeStudyEvents?.[0].action).toBe('study');

    const tomRes = executeCheatCommand('[TOM: de-vermis-mysteriis | akcja=reference | temat=Nyarlathotep]', mockCharacter, 'pl');
    expect(tomRes.isCheat).toBe(true);
    expect(tomRes.assistantMessage?.tomeStudyEvents?.[0].tomeId).toBe('de-vermis-mysteriis');
    expect(tomRes.assistantMessage?.tomeStudyEvents?.[0].action).toBe('reference');
    expect(tomRes.assistantMessage?.tomeStudyEvents?.[0].topic).toBe('Nyarlathotep');
  });

  it('wykonuje [HAZARD] oraz warianty RAW (upadek, trucizna, ogień, tonięcie, ZAGROŻENIE)', () => {
    const fallRes = executeCheatCommand('[HAZARD: upadek | wys=6m | podloze=twarde | opis=Upadek z dachu]', mockCharacter, 'pl');
    expect(fallRes.isCheat).toBe(true);
    expect(fallRes.assistantMessage?.hazardEvents).toBeDefined();
    expect(fallRes.assistantMessage?.hazardEvents?.[0].type).toBe('falling');
    expect(fallRes.assistantMessage?.hazardEvents?.[0].fallHeightMeters).toBe(6);
    expect(fallRes.assistantMessage?.hazardEvents?.[0].surface).toBe('hard');
    expect(fallRes.assistantMessage?.hazardEvents?.[0].description).toBe('Upadek z dachu');

    const poisonRes = executeCheatCommand('[HAZARD_POISON: trucizna | kategoria=silna | nazwa=Cyjanek | opis=Zatrute wino]', mockCharacter, 'pl');
    expect(poisonRes.isCheat).toBe(true);
    expect(poisonRes.assistantMessage?.hazardEvents?.[0].type).toBe('poison');
    expect(poisonRes.assistantMessage?.hazardEvents?.[0].poisonSeverity).toBe('strong');
    expect(poisonRes.assistantMessage?.hazardEvents?.[0].poisonName).toBe('Cyjanek');

    const fireRes = executeCheatCommand('[HAZARD_FIRE: ogien | intensywnosc=major | rundy=2 | opis=Pożar]', mockCharacter, 'pl');
    expect(fireRes.isCheat).toBe(true);
    expect(fireRes.assistantMessage?.hazardEvents?.[0].type).toBe('fire');
    expect(fireRes.assistantMessage?.hazardEvents?.[0].fireIntensity).toBe('major');
    expect(fireRes.assistantMessage?.hazardEvents?.[0].fireRounds).toBe(2);

    const drownRes = executeCheatCommand('[HAZARD_DROWN: toniecie | rodzaj=woda | opis=Pod wodą]', mockCharacter, 'pl');
    expect(drownRes.isCheat).toBe(true);
    expect(drownRes.assistantMessage?.hazardEvents?.[0].type).toBe('drowning');
    expect(drownRes.assistantMessage?.hazardEvents?.[0].airlessKind).toBe('water');

    const plAliasRes = executeCheatCommand('[ZAGROŻENIE: typ=kwas | moc=silna | opis=Kwas siarkowy]', mockCharacter, 'pl');
    expect(plAliasRes.isCheat).toBe(true);
    expect(plAliasRes.assistantMessage?.hazardEvents?.[0].type).toBe('acid');
    expect(plAliasRes.assistantMessage?.hazardEvents?.[0].acidPotency).toBe('immersion');
  });
});
