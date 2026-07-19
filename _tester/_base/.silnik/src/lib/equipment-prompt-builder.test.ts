import {
  buildEquipmentImagePrompt,
  isCharacterBoundEquipment,
} from './equipment-prompt-builder';
import type { Character, EquipmentItem } from './types';

const flashlight: EquipmentItem = {
  id: 'flashlight-1',
  name: 'Latarka elektryczna',
  category: 'tool',
  source: 'acquired',
  visualSource: 'generated',
};

const investigator = {
  name: 'Janina Różycka',
  occupation: 'Dziennikarka radiowa',
  age: 34,
  birthplace: 'Warszawa, Polska',
} as Character;

describe('buildEquipmentImagePrompt', () => {
  it('utrzymuje zwykły przedmiot poza estetyką Mythos', () => {
    const prompt = buildEquipmentImagePrompt(flashlight, '1920s');

    expect(prompt).toContain('1920s');
    expect(prompt).toContain('warm, slightly faded early color film');
    expect(prompt).toContain('no tentacles');
    expect(prompt).toContain('no pentagrams');
    expect(prompt.toLowerCase()).not.toContain('lovecraftian');
    expect(prompt).toContain('no supernatural glow');
  });

  it('dopuszcza anomalię tylko przy jawnej fladze', () => {
    const prompt = buildEquipmentImagePrompt(
      { ...flashlight, visualTreatment: 'supernatural' },
      '1940s'
    );

    expect(prompt).toContain('subtle and restrained anomaly');
    expect(prompt).not.toContain('no supernatural glow');
    expect(prompt).toContain('no gratuitous tentacles');
  });

  it('rozpoznaje konkretny rok PRL przekazany przez istniejące widoki UI', () => {
    const prompt = buildEquipmentImagePrompt(flashlight, '1974');
    expect(prompt).toContain('Poland in the 1970s');
    expect(prompt).toContain('Eastern European analog color');
  });

  it('traktuje dokument tożsamości jako indywidualny render z danymi i portretem badacza', () => {
    const badge = {
      ...flashlight,
      name: 'Legitymacja prasowa',
      category: 'document' as const,
    };

    expect(isCharacterBoundEquipment(badge)).toBe(true);
    expect(buildEquipmentImagePrompt(badge, '1946', undefined, investigator)).toContain(
      'Janina Różycka'
    );
    expect(buildEquipmentImagePrompt(badge, '1946', undefined, investigator)).toContain(
      'supplied owner portrait'
    );
  });
});
