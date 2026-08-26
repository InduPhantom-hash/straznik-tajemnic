import { buildEquipmentImagePrompt } from '@/lib/equipment-prompt-builder';
import {
  enrichImagePromptWithEraProps,
  buildLocationEraGuidanceSection,
} from '@/lib/location-era-validator';
import {
  getEraPhoneVisualDescription,
  resolveEraVisualProfile,
} from '@/lib/era-visual-style';
import {
  buildEraNarrativeRules,
  createEraFingerprint,
  formatEraCurrency,
  getEraHandoutDefaults,
  resolveGameEraContext,
  validateEraAvailability,
} from '@/lib/era';
import type { EquipmentItem } from '@/lib/types';

const PHONE: EquipmentItem = {
  id: 'phone-2001',
  name: 'Telefon komórkowy z klawiaturą i zapasową baterią',
  category: 'tool',
  source: 'starting',
};

describe('przekrojowa spójność epoki', () => {
  it('utrzymuje jeden kontekst dla Polski 2001 w narracji, assetach, handoucie i cache', () => {
    const context = resolveGameEraContext({
      gameTime: { year: 2001, month: 9, day: 17 },
      adventure: {
        yearRange: '1920-1925',
        country: 'Polska',
        era: 'classic',
      },
    });
    const modern = resolveGameEraContext({
      gameTime: { year: 2026, month: 9, day: 17 },
      adventure: { yearRange: '2001', country: 'Polska' },
    });

    expect(context.effectiveYear).toBe(2001);
    expect(context.regionProfile).toBe('PL');
    expect(resolveEraVisualProfile(context)).toBe('2000s');
    expect(buildEraNarrativeRules(context)).not.toContain('rok 1920');

    const equipmentPrompt = buildEquipmentImagePrompt(PHONE, context);
    expect(equipmentPrompt).toContain('physical keypad');
    expect(equipmentPrompt).toContain('no modern full-screen smartphones');
    expect(equipmentPrompt).toContain('no modern powerbanks');
    expect(getEraPhoneVisualDescription(context)).toContain('physical keypad');

    const locationPrompt = enrichImagePromptWithEraProps(
      'Warsaw office in 2001 with smartphone and powerbank',
      context
    );
    expect(locationPrompt).not.toMatch(/with smartphone|and powerbank/i);
    expect(locationPrompt).toContain('no modern smartphones');
    expect(buildLocationEraGuidanceSection(context, 'Warszawa')).toContain(
      '2001, PL'
    );

    expect(getEraHandoutDefaults(context, 'Warszawa')).toMatchObject({
      date: '17 października 2001',
      location: 'Warszawa',
    });
    expect(formatEraCurrency(10, context)).toContain('zł');
    expect(createEraFingerprint(context)).not.toBe(
      createEraFingerprint(modern)
    );
  });

  it('zapis z 1983 nie dziedziczy technologii ani profilu współczesnego', () => {
    const context = resolveGameEraContext({
      gameTime: { year: 1983, month: 0, day: 14 },
      adventure: { yearRange: '1983', country: 'Polska', era: 'modern' },
    });

    expect(resolveEraVisualProfile(context)).toBe('1980s');
    expect(validateEraAvailability({ name: 'iPhone' }, context).allowed).toBe(
      false
    );
    expect(
      validateEraAvailability({ name: 'Powerbank USB' }, context).allowed
    ).toBe(false);
    expect(buildEraNarrativeRules(context)).toContain('rok 1983');
    expect(buildEraNarrativeRules(context)).not.toContain('rok 1920');
  });
});
