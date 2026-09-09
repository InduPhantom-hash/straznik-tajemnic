import type { Character, NPC } from '@/lib/types';
import {
  buildNpcMeleeOptionsContext,
  enrichMeleeAttackReferences,
} from './npc-combat-profile';

const investigator = {
  id: 'char-1',
  name: 'Anna Kowalska',
  hp: 10,
  maxHp: 10,
  skills: { Unik: 40, 'Walka Wręcz': 35 },
  equipment: [],
} as unknown as Character;

const cultist = {
  id: 'npc-1',
  name: 'Kultysta',
  str: 60,
  siz: 50,
  hp: 11,
  maxHp: 11,
  skills: { 'Walka Wręcz': 55 },
  combatProfile: {
    schemaVersion: 1,
    attacksPerRound: 1,
    attackOptions: [
      {
        kind: 'natural',
        attackOptionId: 'fist',
        name: 'Pięść',
        combatSkillId: 'Walka Wręcz',
        skillValue: 55,
        damageFormula: '1K3',
        damageClass: 'non_impaling',
      },
    ],
  },
} as unknown as NPC;

describe('NPC combat profile enrichment', () => {
  it('zamienia ścisły tag na zaufany atak bez przyjmowania liczb od modelu', () => {
    const result = enrichMeleeAttackReferences({
      references: [{
        attackerNpcId: 'npc-1',
        targetCharacterName: 'Anna Kowalska',
        attackOptionId: 'fist',
        intent: 'zamachuje się pięścią',
      }],
      npcs: [cultist],
      characters: [investigator],
      assistantMessageId: 'msg-1',
    });

    expect(result.rejected).toEqual([]);
    expect(result.attacks[0]).toMatchObject({
      eventId: 'msg-1:melee:0',
      roundId: 'msg-1',
      target: { characterId: 'char-1' },
      weapon: { damageFormula: '1d3' },
      attacker: { attackSkill: 55 },
    });
  });

  it('odrzuca nieznany atak i atak ponad limit rundy', () => {
    const references = [
      { attackerNpcId: 'npc-1', targetCharacterName: 'Anna Kowalska', attackOptionId: 'fist', intent: 'pierwszy' },
      { attackerNpcId: 'npc-1', targetCharacterName: 'Anna Kowalska', attackOptionId: 'fist', intent: 'drugi' },
      { attackerNpcId: 'npc-1', targetCharacterName: 'Anna Kowalska', attackOptionId: 'knife', intent: 'fałszywy' },
    ];
    const result = enrichMeleeAttackReferences({
      references,
      npcs: [cultist],
      characters: [investigator],
      assistantMessageId: 'msg-2',
    });
    expect(result.attacks).toHaveLength(1);
    expect(result.rejected.map((item) => item.reason)).toEqual([
      'attacks_per_round_exceeded',
      'attacks_per_round_exceeded',
    ]);
  });

  it('publikuje modelowi tylko identyfikatory z prawidłowego profilu', () => {
    expect(buildNpcMeleeOptionsContext([cultist])).toContain(
      'npcId=npc-1; Kultysta; attackOptionId=fist'
    );
  });
});
