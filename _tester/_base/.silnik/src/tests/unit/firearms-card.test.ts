/**
 * Testy jednostkowe dla parsera i integracji ataku bronią palną CoC 7e RAW (TASK-RAW-02 / Issue #640).
 * Księga Strażnika str. 123-128 (Zasięg, Point-Blank, Dive for Cover, seria, Malf).
 */

import { extractFirearmsAttackEvents } from '@/lib/parsers/mechanics-parser';

describe('FirearmsAttackEvent parser CoC 7e RAW (TASK-RAW-02)', () => {
  it('poprawnie parsuje znacznik [WALKA_STRZAŁ:...] w formacie klucz=wartość', () => {
    const text = 'Kultysta wyciąga rewolwer zza pazuchy!\n[WALKA_STRZAŁ: @Thomas: strzelec=Kultysta | skill=45 | bron=Rewolwer .38 | dystans=point_blank | obrazenia=1d10 | malf=98 | opis=Kultysta strzela prosto w pierś z odległości dwóch kroków!]';
    const events = extractFirearmsAttackEvents(text);

    expect(events.length).toBe(1);
    const event = events[0];
    expect(event.characterName).toBe('Thomas');
    expect(event.shooterName).toBe('Kultysta');
    expect(event.shooterSkill).toBe(45);
    expect(event.weaponName).toBe('Rewolwer .38');
    expect(event.distanceCategory).toBe('point_blank');
    expect(event.damageFormula).toBe('1d10');
    expect(event.malfunction).toBe(98);
    expect(event.description).toContain('Kultysta strzela prosto w pierś');
  });

  it('poprawnie parsuje atak z serią pocisków z broni maszynowej', () => {
    const text = 'Gangster otwiera ogień z Tommy Guna!\n[WALKA_STRZAŁ: @Harvey: strzelec=Gangster | skill=60 | bron=Pistolet maszynowy Thompson | dystans=normal | kule=6 | obrazenia=1d10+2 | malf=96]';
    const events = extractFirearmsAttackEvents(text);

    expect(events.length).toBe(1);
    const event = events[0];
    expect(event.bulletsFired).toBe(6);
    expect(event.distanceCategory).toBe('normal');
    expect(event.malfunction).toBe(96);
  });

  it('rozpoznaje różne warianty zapisu tagu (ATAK_STRZELANIE, FIREARMS_ATTACK)', () => {
    const text1 = '[ATAK_STRZELANIE: @Badacz: strzelec=Snajper | skill=75 | bron=Karabin | dystans=daleki | obrazenia=2d6+4]';
    const events1 = extractFirearmsAttackEvents(text1);
    expect(events1.length).toBe(1);
    expect(events1[0].distanceCategory).toBe('long');

    const text2 = '[FIREARMS_ATTACK: strzelec=Zbir | skill=40 | bron=Dubeltówka | dystans=bliski | obrazenia=4d6]';
    const events2 = extractFirearmsAttackEvents(text2);
    expect(events2.length).toBe(1);
    expect(events2[0].distanceCategory).toBe('point_blank');
  });
});
