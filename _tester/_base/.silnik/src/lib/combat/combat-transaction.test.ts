import type { Character } from '@/lib/types';
import type { PendingMeleeAttack } from './combat-resolver';
import {
  createCombatRoundJournal,
  loadCombatJournal,
  resolveCombatJournalEvent,
  saveCombatJournal,
} from './combat-transaction';

const defender = {
  id: 'char-1',
  name: 'Anna',
  hp: 10,
  maxHp: 10,
  con: 50,
  skills: { Unik: 50, 'Walka Wręcz': 50 },
  equipment: [],
  damageBonus: '0',
} as unknown as Character;

const attack: PendingMeleeAttack = {
  schemaVersion: 1,
  eventId: 'round-1:melee:0',
  roundId: 'round-1',
  ordinal: 0,
  intent: 'cios nożem',
  attacker: {
    id: 'npc-1', name: 'Kultysta', build: 0, hp: 10, maxHp: 10,
    armor: 0, attackSkill: 60, damageBonus: '0',
  },
  target: { characterId: 'char-1', name: 'Anna' },
  weapon: {
    attackOptionId: 'knife', name: 'Nóż', damageFormula: '1d4', damageClass: 'impaling',
  },
};

describe('combat round transaction', () => {
  it('ten sam event rozlicza tylko raz i daje ten sam wynik po wznowieniu', () => {
    const journal = createCombatRoundJournal({ attacks: [attack], roster: [defender], roundSeed: 'seed' });
    const once = resolveCombatJournalEvent({ journal, eventId: attack.eventId, choice: 'dodge' });
    const twice = resolveCombatJournalEvent({ journal: once, eventId: attack.eventId, choice: 'dodge' });
    expect(twice).toEqual(once);
    expect(twice.resolutions).toHaveLength(1);

    const storage = new Map<string, string>();
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => void storage.set(key, value),
      removeItem: (key: string) => void storage.delete(key),
    };
    saveCombatJournal(adapter, once);
    expect(loadCombatJournal(adapter)).toEqual(once);
  });

  it('kolejny atak na tego samego obrońcę dostaje przewagę liczebną', () => {
    const second = { ...attack, eventId: 'round-1:melee:1', ordinal: 1 };
    let journal = createCombatRoundJournal({ attacks: [attack, second], roster: [defender], roundSeed: 'seed' });
    journal = resolveCombatJournalEvent({ journal, eventId: attack.eventId, choice: 'dodge' });
    journal = resolveCombatJournalEvent({ journal, eventId: second.eventId, choice: 'dodge' });
    expect(journal.resolutions[0].attackerBonusDice).toBe(0);
    expect(journal.resolutions[1].attackerBonusDice).toBe(1);
  });
});
