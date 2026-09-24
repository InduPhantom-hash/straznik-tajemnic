import {
  isVisualPromptLeak,
  sanitizeLocationName,
  extractLatestTagLocation,
  extractLocations,
} from './event-parser';

describe('event-parser (Visual Prompt Leak & Location Sanitization)', () => {
  describe('isVisualPromptLeak', () => {
    it('wykrywa wycieki technicznych promptów obrazów', () => {
      expect(
        isVisualPromptLeak(
          'Kowary Mountain Cafe, 1990s authentic Poland, interior of a modest roadside diner in winter, misty Sudetes mountains through foggy windows, cast iron radiator, vintage furniture, 35mm film photograph'
        )
      ).toBe(true);
      expect(
        isVisualPromptLeak('Scena #1: Kowary Mountain Cafe, 35mm film photograph')
      ).toBe(true);
      expect(isVisualPromptLeak('cinematic lighting, moody lighting, wide angle')).toBe(
        true
      );
    });

    it('zwraca false dla poprawnych nazw lokacji CoC', () => {
      expect(isVisualPromptLeak('Kawiarnia „Śnieżka” w Kowarach')).toBe(false);
      expect(isVisualPromptLeak('Warsztat Lucjana Łągiewki')).toBe(false);
      expect(isVisualPromptLeak('Sztolnia Podgórze')).toBe(false);
    });
  });

  describe('sanitizeLocationName', () => {
    it('usuwa prefiks Lokacja: oraz cudzysłowy i techniczne ogony', () => {
      expect(
        sanitizeLocationName('Lokacja: Kawiarnia „Śnieżka” w Kowarach')
      ).toBe('Kawiarnia Śnieżka w Kowarach');
      expect(
        sanitizeLocationName('Kawiarnia Śnieżka, 1990s authentic Poland, 35mm')
      ).toBe('Kawiarnia Śnieżka');
    });
  });

  describe('extractLatestTagLocation', () => {
    it('pomija tagi będące wyciekiem promptu i zachowuje prawidłową lokację', () => {
      const text = [
        '[LOKACJA: Kawiarnia „Śnieżka” w Kowarach: Skromny lokal]',
        '',
        '[LOKACJA: Kowary Mountain Cafe, 1990s authentic Poland, interior of a modest roadside diner in winter, misty Sudetes mountains through foggy windows, cast iron radiator, vintage furniture, 35mm film photograph]',
        '',
        'Narracja...',
      ].join('\n');

      const loc = extractLatestTagLocation(text);
      expect(loc).not.toBeNull();
      expect(loc?.name).toBe('Kawiarnia Śnieżka w Kowarach');
      expect(loc?.description).toBe('Skromny lokal');
    });
  });

  describe('extractLocations', () => {
    it('nie tworzy wydarzeń lokacyjnych dla wycieków promptów', () => {
      const text =
        'Przybywasz do Kowary Mountain Cafe, 1990s authentic Poland, 35mm film photograph.';
      const locs = extractLocations(text);
      expect(locs).toHaveLength(0);
    });
  });
});
