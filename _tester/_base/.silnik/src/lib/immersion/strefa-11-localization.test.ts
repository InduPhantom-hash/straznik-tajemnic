import { STREFA_11_ADVENTURES } from '@/lib/adventures-data';
import { STREFA_11_CHARACTERS } from './strefa-11-characters';
import {
  localizeStrefa11Adventure,
  localizeStrefa11Character,
} from './strefa-11-localization';

describe('Strefa 11 system preset localization', () => {
  it('uses English scenario copy for the Quick Setup catalogue', () => {
    const localized = STREFA_11_ADVENTURES.map((adventure) =>
      localizeStrefa11Adventure(adventure, 'en')
    );

    expect(localized.map((adventure) => adventure.title)).toEqual([
      "Shadow over Prabuty: Father Klimuszko's Vision",
      'The Drive Mystery: A Brilliant Inventor from Kowary',
      'The Children of Traszyn: The Key and the Inverted Cross',
      'The Visitor from the Matrix: Prophecy and the Głogów Phenomenon',
    ]);
    expect(localized.every((adventure) => adventure.description !== '')).toBe(true);
    expect(localized.every((adventure) => adventure.location !== '')).toBe(true);
  });

  it('uses English occupations for every Strefa 11 investigator', () => {
    const localized = STREFA_11_CHARACTERS.map((character) =>
      localizeStrefa11Character(character, 'en')
    );

    expect(localized).toHaveLength(16);
    expect(localized.every((character, index) => character.occupation !== STREFA_11_CHARACTERS[index].occupation)).toBe(true);
  });

  it('leaves Polish system presets unchanged', () => {
    const adventure = STREFA_11_ADVENTURES[0];
    const character = STREFA_11_CHARACTERS[0];

    expect(localizeStrefa11Adventure(adventure, 'pl')).toBe(adventure);
    expect(localizeStrefa11Character(character, 'pl')).toBe(character);
  });
});
