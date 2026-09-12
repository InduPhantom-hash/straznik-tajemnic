import {
  createCampaignMemoryScope,
  isCampaignMemoryScope,
  resolveCampaignDefinition,
} from './campaign-scope';

describe('campaign memory scope', () => {
  it('maps all eight official campaigns to stable definitions', () => {
    const titles = [
      ['Maski Nyarlathotepa', 'masks-of-nyarlathotep'],
      ['Horror w Orient Expressie', 'horror-on-the-orient-express'],
      ['Wielki Terror', 'reign-of-terror'],
      ['Zimne Płomienie', 'a-cold-fire-within'],
      ['The Two-Headed Serpent', 'the-two-headed-serpent'],
      ['A Time to Harvest', 'a-time-to-harvest'],
      ['The Children of Fear', 'the-children-of-fear'],
      ['The Order of the Stone', 'the-order-of-the-stone'],
    ] as const;

    for (const [title, expectedId] of titles) {
      expect(resolveCampaignDefinition({ id: title, title })).toEqual({
        campaignDefinitionId: expectedId,
        kind: 'official',
      });
    }
  });

  it('recognizes an official PDF by title when its uploaded adventure id is generated', () => {
    expect(resolveCampaignDefinition({
      id: 'custom-1723456789',
      title: 'Maski Nyarlathotepa',
      isCampaign: true,
    })).toEqual({ campaignDefinitionId: 'masks-of-nyarlathotep', kind: 'official' });
  });

  it('uses deterministic definitions for custom campaigns and scenarios', () => {
    expect(
      resolveCampaignDefinition({
        id: 'Moja Wielka Kampania',
        title: 'Moja Wielka Kampania',
        isCampaign: true,
      })
    ).toEqual({
      campaignDefinitionId: 'custom:moja-wielka-kampania',
      kind: 'custom',
    });
    expect(
      resolveCampaignDefinition({ id: 'Nawiedzony Dom', title: 'Nawiedzony Dom' })
    ).toEqual({
      campaignDefinitionId: 'scenario:nawiedzony-dom',
      kind: 'scenario',
    });
  });

  it('isolates two playthroughs of the same campaign', () => {
    const ids = ['first', 'second'];
    const first = createCampaignMemoryScope(
      { id: 'masks-of-nyarlathotep', title: 'Maski Nyarlathotepa' },
      () => ids.shift() as string
    );
    const second = createCampaignMemoryScope(
      { id: 'masks-of-nyarlathotep', title: 'Maski Nyarlathotepa' },
      () => ids.shift() as string
    );

    expect(first.campaignDefinitionId).toBe(second.campaignDefinitionId);
    expect(first.playthroughId).not.toBe(second.playthroughId);
    expect(isCampaignMemoryScope(first)).toBe(true);
  });
});
