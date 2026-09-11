import {
  OFFICIAL_CAMPAIGNS,
  isOfficialCampaign,
  findOfficialCampaign,
  classifyDocumentAsCampaign,
} from './official-campaigns';

describe('official-campaigns', () => {
  it('zawiera dokładnie 8 oficjalnych kampanii Zewu Cthulhu 7ed', () => {
    expect(OFFICIAL_CAMPAIGNS).toHaveLength(8);
  });

  it('poprawnie rozpoznaje kampanie Black Monk i Chaosium', () => {
    expect(isOfficialCampaign('Maski Nyarlathotepa')).toBe(true);
    expect(isOfficialCampaign('Horror w Orient Expressie')).toBe(true);
    expect(isOfficialCampaign('The Two-Headed Serpent')).toBe(true);
    expect(isOfficialCampaign('Czas Żniw')).toBe(true);
    expect(isOfficialCampaign('Wielki Terror')).toBe(true);
    expect(isOfficialCampaign('Zimne Płomienie')).toBe(true);
    expect(isOfficialCampaign('The Children of Fear')).toBe(true);
    expect(isOfficialCampaign('The Order of the Stone')).toBe(true);
  });

  it('rozpoznaje dedykowanych patronów kampanii (Caduceus, Miskatonic)', () => {
    const serpent = findOfficialCampaign('Dwugłowy Wąż');
    expect(serpent).toBeDefined();
    expect(serpent?.campaignPatron?.pl).toContain('Caduceus');

    const harvest = findOfficialCampaign('A Time to Harvest');
    expect(harvest).toBeDefined();
    expect(harvest?.campaignPatron?.pl).toContain('Miskatonic');
  });

  it('odrzuca oneshoty i antologie jako kampanie', () => {
    expect(isOfficialCampaign('Nawiedzony Dom')).toBe(false);
    expect(isOfficialCampaign('Cień nad Prabutami')).toBe(false);
    expect(isOfficialCampaign('Wrota Ciemności')).toBe(false);
    expect(isOfficialCampaign('Posiadłości Szaleństwa')).toBe(false);
    expect(isOfficialCampaign('Blackwater Creek')).toBe(false);
  });

  it('classifyDocumentAsCampaign poprawnie oznacza kampanie vs scenariusze', () => {
    const maskiRes = classifyDocumentAsCampaign('Zew Cthulhu: Maski Nyarlathotepa Tom 1');
    expect(maskiRes.isCampaign).toBe(true);
    expect(maskiRes.campaign?.id).toBe('masks-of-nyarlathotep');

    const oneshotRes = classifyDocumentAsCampaign('Cień nad Prabutami: Widzenie Ojca Klimuszki');
    expect(oneshotRes.isCampaign).toBe(false);

    const customCampaignRes = classifyDocumentAsCampaign(
      'Mroczna Kronika Massachusetts',
      'Wielka kampania śledcza. Rozdział 1: Początek. Rozdział 2: Otchłań. Akt II: Finał.'
    );
    expect(customCampaignRes.isCampaign).toBe(true);
  });
});
