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

  it('generuje właściwy opis telefonu i strażników dla roku 1983 oraz lat 20.', () => {
    const phone: EquipmentItem = {
      id: 'phone-1',
      name: 'Telefon',
      category: 'tool',
      source: 'starting',
    };

    const prompt1983 = buildEquipmentImagePrompt(phone, '1983');
    expect(prompt1983).toContain('rotary dial or mechanical push buttons');
    expect(prompt1983).toContain('strictly no screen');
    expect(prompt1983).toContain('no smartphones');
    expect(prompt1983).toContain('no powerbanks');

    const prompt1920 = buildEquipmentImagePrompt(phone, '1920s');
    expect(prompt1920).toContain('candlestick telephone');
  });

  it('dobiera precyzyjny opis dla elektroniki analogowej i rejestratorów zależnie od epoki', () => {
    const recorder: EquipmentItem = {
      id: 'recorder-1',
      name: 'Dyktafon kasetowy',
      category: 'tool',
      source: 'starting',
    };

    const prompt1974 = buildEquipmentImagePrompt(recorder, '1974');
    expect(prompt1974).toContain('Unitra');
    expect(prompt1974).toContain('mechanical push-buttons');
    expect(prompt1974).toContain('Poland in the 1970s');

    const prompt1920 = buildEquipmentImagePrompt(recorder, '1920s');
    expect(prompt1920).toContain('spring-wound portable gramophone');
    expect(prompt1920).toContain('no cassette tapes');

    const gramophone: EquipmentItem = {
      id: 'gramophone-1',
      name: 'Gramofon walizkowy',
      category: 'tool',
      source: 'starting',
    };
    const promptGramophone = buildEquipmentImagePrompt(gramophone, '1920s');
    expect(promptGramophone).toContain('spring-wound portable gramophone');
  });

  it('dobiera precyzyjny opis aparatów fotograficznych i optyki zależnie od epoki', () => {
    const camera: EquipmentItem = {
      id: 'camera-1',
      name: 'Aparat fotograficzny mieszkowy',
      category: 'tool',
      source: 'starting',
    };

    const prompt1920 = buildEquipmentImagePrompt(camera, '1920s');
    expect(prompt1920).toContain('vintage 1920s folding pocket camera');
    expect(prompt1920).toContain('accordion bellows');

    const prompt1946 = buildEquipmentImagePrompt(camera, '1946');
    expect(prompt1946).toContain('twin-lens reflex (TLR)');
  });

  it('wzbogaca dewocjonalia i akcesoria rytualne o autentyczne rzemiosło bez kiczu fantasy', () => {
    const crucifix: EquipmentItem = {
      id: 'cross-1',
      name: 'Srebrny krzyżyk na łańcuszku',
      category: 'occult',
      source: 'starting',
    };

    const prompt = buildEquipmentImagePrompt(crucifix, '1920s');
    expect(prompt).toContain('authentic liturgical devotional item');
    expect(prompt).toContain('sterling silver with natural dark tarnish');
    expect(prompt).toContain('zero fantasy embellishments');
    expect(prompt).toContain('no pentagrams');
    expect(prompt).toContain('no occult symbols');
  });

  it('wzbogaca odzież ochronną i akcesoria podróżne o autentyczne materiały', () => {
    const goggles: EquipmentItem = {
      id: 'goggles-1',
      name: 'Gogle pilotki',
      category: 'personal',
      source: 'starting',
    };

    const prompt = buildEquipmentImagePrompt(goggles, '1920s');
    expect(prompt).toContain('period protective or travel gear');
    expect(prompt).toContain('heavy stitched saddle leather');
    expect(prompt).toContain('optical glass');
  });

  it('wymusza studyjny kadr makro still-life na podłożu z epoki oraz brak ludzi i rąk w kadrze', () => {
    const knife: EquipmentItem = {
      id: 'knife-1',
      name: 'Nóż myśliwski',
      category: 'weapon',
      source: 'starting',
    };

    const prompt = buildEquipmentImagePrompt(knife, '1920s');
    expect(prompt).toContain('macro studio still-life photography');
    expect(prompt).toContain('distressed wooden desk, leather briefcase or heavy canvas field cloth');
    expect(prompt).toContain('no hands');
    expect(prompt).toContain('no people');
    expect(prompt).toContain('no fingers');
    expect(prompt).toContain('no brands');
    expect(prompt).toContain('no logos');
    expect(prompt).toContain('blued carbon steel');
  });
});

