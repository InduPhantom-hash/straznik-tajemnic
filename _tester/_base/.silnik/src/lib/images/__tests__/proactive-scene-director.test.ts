import { directSceneIllustrations } from '../proactive-scene-director';
import { VisualBeliefGraph } from '../visual-belief-graph';
import type { ImageRequest } from '../../parsers/types';

describe('ProactiveSceneDirector (DeepMind Proactive T2I)', () => {
  it('selekcjonuje i wzbogaca 1-3 zróżnicowane kadry w turze kulminacyjnej', () => {
    const beliefGraph = new VisualBeliefGraph();
    beliefGraph.registerNPC({
      id: 'npc-armitage',
      name: 'Dr Henry Armitage',
      occupation: 'Librarian & Scholar',
      appearance: 'silver-bearded elderly scholar with spectacles and tweed vest',
      description: 'Chief librarian of Miskatonic University',
      type: 'friendly',
      str: 45,
      dex: 50,
      con: 55,
      app: 65,
      pow: 75,
      edu: 90,
      siz: 50,
      int: 85,
      luck: 60,
      hp: 10,
      maxHp: 10,
      san: 70,
      maxSan: 99,
      mp: 15,
      maxMp: 15,
      skills: {},
      personality: 'scholarly',
      motivations: 'preserve occult knowledge',
      relationshipWithPlayer: 'mentor',
      location: 'Miskatonic Library',
      status: 'alive',
      statusEffects: [],
      tags: [],
      gmNotes: '',
      createdAt: new Date('1925-10-01'),
      updatedAt: new Date('1925-10-01'),
      changeHistory: [],
    }, '1920s');

    beliefGraph.updateLocation('Miskatonic Library', {
      lighting: 'pale green reading lamps, dark mahogany shadows',
      atmosphere: 'chilly dust motes, smell of ancient parchment',
    });

    const rawRequests: ImageRequest[] = [
      {
        prompt: 'Miskatonic Library stacks with towering shelves',
        type: 'location',
        locationName: 'Miskatonic Library',
      },
      {
        prompt: 'Dr Henry Armitage looking alarmed at an open tome',
        type: 'portrait',
        portraitName: 'Dr Henry Armitage',
      },
      {
        prompt: 'Amphibious Deep One scratching at the window pane',
        type: 'monster',
        isMythos: true,
      },
      {
        prompt: 'Generic alleyway background',
        type: 'scene',
      },
    ];

    const result = directSceneIllustrations(rawRequests, {
      maxImagesPerMessage: 3,
      imageFrequency: 'often',
      effectiveEraOrYear: '1925',
      beliefGraph,
    });

    expect(result.shots.length).toBe(3);

    // Najwyższy priorytet: Monster/Mythos, Portrait NPC, Location
    const roles = result.shots.map((s) => s.role);
    expect(roles).toContain('mythos_horror');
    expect(roles).toContain('character_portrait');
    expect(roles).toContain('establishing_location');

    // Sprawdzenie wzbogacenia Visual DNA dla portretu
    const portraitShot = result.shots.find((s) => s.role === 'character_portrait');
    expect(portraitShot?.enrichedPrompt).toContain('Dr Henry Armitage');
    expect(portraitShot?.enrichedPrompt).toContain('silver-bearded');
    expect(portraitShot?.aspectRatio).toBe('3:4');

    // Sprawdzenie proporcji dla potwora i lokacji (16:9)
    const locationShot = result.shots.find((s) => s.role === 'establishing_location');
    expect(locationShot?.aspectRatio).toBe('16:9');
    expect(locationShot?.enrichedPrompt).toContain('pale green reading lamps');
  });

  it('respektuje ograniczenie maxImagesPerMessage = 1', () => {
    const rawRequests: ImageRequest[] = [
      { prompt: 'Room interior', type: 'location' },
      { prompt: 'Corpse on the floor', type: 'scene' },
    ];

    const result = directSceneIllustrations(rawRequests, {
      maxImagesPerMessage: 1,
      imageFrequency: 'normal',
      effectiveEraOrYear: '1920s',
    });

    expect(result.shots.length).toBe(1);
  });
});
