import {
  createAcquiredEquipmentSeed,
  extractAcquiredItemProposals,
} from './acquired-equipment';

describe('zdobyte przedmioty', () => {
  it('tworzy kartę tylko z jawnego tagu i wskazuje odbiorcę w duecie', () => {
    const proposals = extractAcquiredItemProposals(
      'Na stole leży klucz. [ZDOBYTY_PRZEDMIOT: @Eleonora | Latarka | Ciężka stalowa latarka z obtłuczoną obudową. | zwykly]',
      'msg-1'
    );

    expect(proposals).toEqual([
      expect.objectContaining({
        id: 'msg-1:acquired:0',
        recipientName: 'Eleonora',
        name: 'Latarka',
        visualTreatment: 'mundane',
        status: 'pending',
      }),
    ]);
  });

  it('przekazuje nadprzyrodzoność tylko z jawnej flagi', () => {
    const [proposal] = extractAcquiredItemProposals(
      '[ZDOBYTY_PRZEDMIOT: Kamień z piwnicy | Czarny kamień, który pulsuje w dłoni. | nadprzyrodzony]',
      'msg-2'
    );

    expect(proposal.visualTreatment).toBe('supernatural');
    expect(createAcquiredEquipmentSeed(proposal)).toMatchObject({
      category: 'artifact',
      visualTreatment: 'supernatural',
    });
  });

  it('nie zamienia samego tagu encyklopedii w zdobycie', () => {
    expect(
      extractAcquiredItemProposals(
        '[PRZEDMIOT: Latarka: Leży na stole.]',
        'msg-3'
      )
    ).toEqual([]);
  });
});
