import {
  createAcquiredEquipmentSeed,
  extractAcquiredItemProposals,
  inferDocumentType,
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

describe('inferDocumentType', () => {
  it('rozpoznaje przepustkę prasową', () => {
    expect(inferDocumentType({ name: 'Legitymacja prasowa' })).toBe('press_pass');
    expect(inferDocumentType({ name: 'Identyfikator', description: 'Karta reportera' })).toBe('press_pass');
  });

  it('rozpoznaje dokument tożsamości', () => {
    expect(inferDocumentType({ name: 'Dowód osobisty' })).toBe('id_card');
    expect(inferDocumentType({ name: 'Odznaka policyjna' })).toBe('id_card');
    expect(inferDocumentType({ name: 'Paszport' })).toBe('id_card');
  });

  it('rozpoznaje kopertę dowodową', () => {
    expect(inferDocumentType({ name: 'Koperta z aktami' })).toBe('evidence_envelope');
    expect(inferDocumentType({ name: 'Raport policji' })).toBe('evidence_envelope');
  });

  it('rozpoznaje wycinek z gazety', () => {
    expect(inferDocumentType({ name: 'Wycinek z Gazety' })).toBe('newspaper');
    expect(inferDocumentType({ name: 'Stary Kurier Warszawski' })).toBe('newspaper');
  });

  it('rozpoznaje oficjalne pismo', () => {
    expect(inferDocumentType({ name: 'Zaświadczenie lekarskie' })).toBe('official_document');
    expect(inferDocumentType({ name: 'Nakaz aresztowania' })).toBe('official_document');
  });

  it('rozpoznaje stronę z dziennika / notatki', () => {
    expect(inferDocumentType({ name: 'Dziennik badacza' })).toBe('journal_page');
    expect(inferDocumentType({ name: 'Stary notatnik' })).toBe('journal_page');
  });

  it('rozpoznaje list i telegram oraz stosuje domyślny fallback', () => {
    expect(inferDocumentType({ name: 'List od wuja' })).toBe('letter');
    expect(inferDocumentType({ name: 'Telegram z Londynu' })).toBe('letter');
    expect(inferDocumentType({ name: 'Tajemniczy zapisek bez słów kluczowych' })).toBe('letter');
  });
});

describe('createAcquiredEquipmentSeed - documentType', () => {
  it('przypisuje documentType dla przedmiotów będących dokumentami', () => {
    const proposal = {
      id: 'msg-1:acquired:0',
      name: 'Stary list',
      description: 'List od wuja Artura znaleziony w biurku.',
      visualTreatment: 'mundane' as const,
      status: 'pending' as const,
    };

    const seed = createAcquiredEquipmentSeed(proposal);
    expect(seed.category).toBe('document');
    expect((seed as any).documentType).toBe('letter');
  });

  it('nie dodaje documentType dla przedmiotów innych niż dokumenty', () => {
    const proposal = {
      id: 'msg-1:acquired:1',
      name: 'Pistolet Colt 1911',
      description: 'Ciężka broń palna.',
      visualTreatment: 'mundane' as const,
      status: 'pending' as const,
    };

    const seed = createAcquiredEquipmentSeed(proposal);
    expect((seed as any).documentType).toBeUndefined();
  });
});
