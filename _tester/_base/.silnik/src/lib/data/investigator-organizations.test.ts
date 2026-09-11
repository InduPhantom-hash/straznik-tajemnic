import {
  INVESTIGATOR_ORGANIZATIONS,
  getInvestigatorOrganization,
  getOrganizationsForEra,
  buildOrganizationPromptSection,
} from './investigator-organizations';

describe('investigator-organizations (CoC 7e RAW Chapter 6)', () => {
  it('zawiera dokladnie 9 kanonicznych Stowarzyszen Badaczy z Podrecznika Badacza', () => {
    expect(INVESTIGATOR_ORGANIZATIONS).toHaveLength(9);
  });

  it('kazda organizacja posiada wymagane pola profilu, zasobow i powiazan', () => {
    const requiredIds = [
      'the-cleaners',
      'wraths-circus',
      'curious-news',
      'precinct-13-south',
      'pfu-research-units',
      'novem-angelus',
      'ratcheds-children',
      'the-seekers',
      'society-exploration-unexplained',
    ];

    const presentIds = INVESTIGATOR_ORGANIZATIONS.map((o) => o.id);
    expect(presentIds).toEqual(expect.arrayContaining(requiredIds));

    for (const org of INVESTIGATOR_ORGANIZATIONS) {
      expect(org.id).toBeTruthy();
      expect(org.name.pl).toBeTruthy();
      expect(org.name.en).toBeTruthy();
      expect(org.tagline.pl).toBeTruthy();
      expect(org.tagline.en).toBeTruthy();
      expect(org.description.pl).toBeTruthy();
      expect(org.description.en).toBeTruthy();
      expect(org.memberProfile.pl).toBeTruthy();
      expect(org.memberProfile.en).toBeTruthy();
      expect(org.resources.pl.funds).toBeTruthy();
      expect(org.resources.pl.legal).toBeTruthy();
      expect(org.resources.pl.facilities).toBeTruthy();
      expect(org.resources.pl.contacts).toBeTruthy();
      expect(org.resources.en.funds).toBeTruthy();
      expect(org.resources.en.legal).toBeTruthy();
      expect(org.resources.en.facilities).toBeTruthy();
      expect(org.resources.en.contacts).toBeTruthy();
      expect(org.patronage.pl).toBeTruthy();
      expect(org.patronage.en).toBeTruthy();
      expect(org.suggestedOccupations.length).toBeGreaterThan(0);
      expect(org.suggestedConnections.pl.length).toBeGreaterThan(0);
      expect(org.suggestedConnections.en.length).toBeGreaterThan(0);
      expect(org.eraAvailability.length).toBeGreaterThan(0);
    }
  });

  describe('getInvestigatorOrganization', () => {
    it('wyszukuje organizacje po id (dokladnym i wielkimi literami)', () => {
      const org = getInvestigatorOrganization('the-cleaners');
      expect(org).toBeDefined();
      expect(org?.name.pl).toBe('Czyściciele');

      const upper = getInvestigatorOrganization('THE-CLEANERS');
      expect(upper).toBeDefined();
      expect(upper?.id).toBe('the-cleaners');
    });

    it('wyszukuje organizacje po polskiej nazwie', () => {
      const org = getInvestigatorOrganization('Cyrk Wratha');
      expect(org).toBeDefined();
      expect(org?.id).toBe('wraths-circus');
    });

    it('wyszukuje organizacje po angielskiej nazwie', () => {
      const org = getInvestigatorOrganization('Curious News');
      expect(org).toBeDefined();
      expect(org?.id).toBe('curious-news');
    });

    it('obsluguje aliasy dla SPWiP / PFU', () => {
      const org = getInvestigatorOrganization('spwip-pfu');
      expect(org).toBeDefined();
      expect(org?.id).toBe('pfu-research-units');
    });

    it('zwraca undefined dla nieznanej organizacji', () => {
      expect(getInvestigatorOrganization('nieistniejaca-organizacja')).toBeUndefined();
    });
  });

  describe('getOrganizationsForEra', () => {
    it('zwraca wszystkie organizacje gdy brak parametru epoki', () => {
      expect(getOrganizationsForEra()).toHaveLength(9);
    });

    it('filtruje organizacje dla ery 1920s oraz 1920s-poland', () => {
      const orgs1920 = getOrganizationsForEra('1920s');
      expect(orgs1920.length).toBeGreaterThanOrEqual(7);

      const orgsPoland = getOrganizationsForEra('1920s-poland');
      expect(orgsPoland.length).toBeGreaterThanOrEqual(7);
      expect(orgsPoland.map((o) => o.id)).toContain('pfu-research-units');
    });

    it('filtruje organizacje dla ery wspolczesnej', () => {
      const modernOrgs = getOrganizationsForEra('modern');
      expect(modernOrgs.length).toBeGreaterThan(0);
      expect(modernOrgs.map((o) => o.id)).toContain('the-cleaners');
    });
  });

  describe('buildOrganizationPromptSection', () => {
    it('buduje polska sekcje promptu z naglowkiem, tlem i mecenatem', () => {
      const prompt = buildOrganizationPromptSection('the-cleaners', 'pl');
      expect(prompt).toContain('## STOWARZYSZENIE BADACZY I MECENAT: CZYŚCICIELE');
      expect(prompt).toContain('Drużyna Badaczy działa pod auspicjami organizacji: Czyściciele');
      expect(prompt).toContain('Zasoby: Fundusze:');
      expect(prompt).toContain('Mecenat w kryzysie:');
      expect(prompt).toContain('Wytyczna dla MG:');
    });

    it('buduje angielska sekcje promptu z naglowkiem, tlem i mecenatem', () => {
      const prompt = buildOrganizationPromptSection('the-cleaners', 'en');
      expect(prompt).toContain('## INVESTIGATOR ORGANIZATION & PATRONAGE: THE CLEANERS');
      expect(prompt).toContain('The investigator team operates under the backing of The Cleaners');
      expect(prompt).toContain('Resources: Funds:');
      expect(prompt).toContain('Institutional Patronage:');
      expect(prompt).toContain('Keeper Guideline:');
    });

    it('zwraca pusty string gdy organizacja nie istnieje', () => {
      expect(buildOrganizationPromptSection('unknown-org')).toBe('');
    });
  });
});
