import {
  VisualBeliefGraph,
  extractNPCVisualProfile,
  extractPlayerVisualProfile,
  extractCleanFirstName,
  extractStem,
} from '@/lib/images/visual-belief-graph';
import type { Character, NPC } from '@/lib/types';
import type { NpcDossierEntry } from '@/lib/journal/dossier-types';

describe('VisualBeliefGraph & Visual DNA', () => {
  describe('extractCleanFirstName & extractStem', () => {
    it('poprawnie wyciąga pierwsze imię pomijając honoryfikatywy', () => {
      expect(extractCleanFirstName('Dr Henry Armitage')).toBe('Henry');
      expect(extractCleanFirstName('Profesor Waldemar Kowalski')).toBe('Waldemar');
      expect(extractCleanFirstName('Kapitan Obed Marsh')).toBe('Obed');
      expect(extractCleanFirstName('Lord Henry')).toBe('Henry');
      expect(extractCleanFirstName('Eleonora Vance')).toBe('Eleonora');
      expect(extractCleanFirstName('Janusz')).toBe('Janusz');
    });

    it('poprawnie wylicza rdzeń imienia (stem >= 4 znaki)', () => {
      expect(extractStem('Waldemar Kowalski')).toBe('wald');
      expect(extractStem('Waldek')).toBe('wald');
      expect(extractStem('Waldku')).toBe('wald');
      expect(extractStem('Eleonora Vance')).toBe('eleo');
      expect(extractStem('Jan')).toBe(''); // < 4 znaki
    });
  });

  describe('extractNPCVisualProfile - Visual DNA derivation', () => {
    it('wydobywa kotwice ubioru z zawodu i manieryzm z nastawienia gdy brak jawnego wyglądu', () => {
      const npc: NpcDossierEntry = {
        id: 'npc-harding',
        name: 'Dr Eric Harding',
        occupation: 'lekarz psychiatra',
        relationshipStatus: 'suspicious',
        disposition: 'suspicious',
      };

      const profile = extractNPCVisualProfile(npc, '1920s');

      expect(profile.name).toBe('Dr Eric Harding');
      expect(profile.visualDnaPrompt).toContain('starched white clinical coat');
      expect(profile.visualDnaPrompt).toContain('pocket watch chain');
      expect(profile.visualDnaPrompt).toContain('guarded posture');
      expect(profile.visualDnaPrompt).toContain('authentic 1920s period clothing');
    });

    it('uwzględnia jawny wygląd gdy jest dostępny w karcie NPC', () => {
      const npc: Partial<NPC> & { name: string } = {
        name: 'Arthur Vance',
        occupation: 'Bibliotekarz',
        appearance: 'siwy mężczyzna w drucianych okularach',
        disposition: 'friendly',
      };

      const profile = extractNPCVisualProfile(npc as NPC, '1920s');

      expect(profile.visualDnaPrompt).toContain('siwy mężczyzna w drucianych okularach');
      expect(profile.visualDnaPrompt).toContain('tweed three-piece suit');
      expect(profile.visualDnaPrompt).toContain('open warm stance');
    });

    it('wydobywa zawód z opisu (description) gdy brak jawnego pola occupation', () => {
      const npc = {
        name: 'Arthur Vance',
        description: 'Bibliotekarz w Uniwersytecie Miskatonic, cichy i skupiony na starych księgach',
      };

      const profile = extractNPCVisualProfile(npc, '1920s');

      expect(profile.occupation).toBe('bibliotekarz');
      expect(profile.visualDnaPrompt).toContain('tweed three-piece suit');
      expect(profile.visualDnaPrompt).toContain('round wire-rimmed spectacles');
    });

    it('tworzy spójny profil Badacza z kotwicami ubioru i bliznami', () => {
      const char: Character = {
        id: 'player-1',
        name: 'Thomas Malone',
        age: 38,
        gender: 'male',
        occupation: 'Detektyw',
        appearance: 'zmęczony gliniarz',
        scars: ['postrzał w ramię'],
      } as unknown as Character;

      const profile = extractPlayerVisualProfile(char, '1920s');
      expect(profile.name).toBe('Thomas Malone');
      expect(profile.visualDnaPrompt).toContain('38-year-old man, detektyw');
      expect(profile.visualDnaPrompt).toContain('visible scars: postrzał w ramię');
      expect(profile.visualDnaPrompt).toContain('authentic 1920s attire');
    });
  });

  describe('VisualBeliefGraph registration & flexible matching', () => {
    let graph: VisualBeliefGraph;

    beforeEach(() => {
      graph = new VisualBeliefGraph();
    });

    it('rejestruje NPC pod pełną nazwą, ID, imieniem oraz stemem', () => {
      graph.registerNPC(
        {
          id: 'npc-waldemar',
          name: 'Waldemar Kowalski',
          occupation: 'Dziennikarz śledczy',
        },
        '1920s'
      );

      // Exact match
      expect(graph.getCharacterProfile('Waldemar Kowalski')).toBeDefined();
      expect(graph.getCharacterProfile('npc-waldemar')).toBeDefined();

      // Lowercase
      expect(graph.getCharacterProfile('waldemar kowalski')).toBeDefined();

      // First name match
      expect(graph.getCharacterProfile('Waldemar')).toBeDefined();

      // Substring match
      expect(graph.getCharacterProfile('Kowalski')).toBeDefined();

      // Stem match dla zdrobnień i odmian deklinacyjnych (Waldek, Waldku)
      expect(graph.getCharacterProfile('Waldek')).toBeDefined();
      expect(graph.getCharacterProfile('Waldku')).toBeDefined();
      expect(graph.getCharacterProfile('Waldkiem')).toBeDefined();
    });

    it('dopasowuje postacie z tytułami przez extractCleanFirstName', () => {
      graph.registerNPC(
        {
          id: 'npc-armitage',
          name: 'Dr Henry Armitage',
          occupation: 'Bibliotekarz',
        },
        '1920s'
      );

      expect(graph.getCharacterProfile('Dr Henry Armitage')).toBeDefined();
      expect(graph.getCharacterProfile('Henry')).toBeDefined();
      expect(graph.getCharacterProfile('Armitage')).toBeDefined();
      expect(graph.getCharacterProfile('Dr Armitage')).toBeDefined();
    });

    it('obsługuje tytuły grzecznościowe (Pan Kowalski, Profesor Kowalski) i odrzuca szum', () => {
      graph.registerNPC(
        {
          id: 'npc-waldemar',
          name: 'Waldemar Kowalski',
          occupation: 'Dziennikarz śledczy',
        },
        '1920s'
      );

      // Tytuły honorowe i zwroty grzecznościowe
      expect(graph.getCharacterProfile('Pan Kowalski')?.name).toBe('Waldemar Kowalski');
      expect(graph.getCharacterProfile('Profesor Kowalski')?.name).toBe('Waldemar Kowalski');
      expect(graph.getCharacterProfile('Redaktor Kowalski')?.name).toBe('Waldemar Kowalski');

      // Odrzucenie szumu (krótkie podciągi nie powinny dopasowywać losowych profili)
      expect(graph.getCharacterProfile('al')).toBeUndefined();
      expect(graph.getCharacterProfile('w')).toBeUndefined();
      expect(graph.getCharacterProfile('de')).toBeUndefined();
    });

    it('pozwala zapisać i pobrać wygenerowany portret przez setPortrait', () => {
      graph.registerNPC(
        {
          id: 'npc-eleonora',
          name: 'Eleonora Vance',
        },
        '1920s'
      );

      const updated = graph.setPortrait('Eleonora Vance', 'https://storage.local/portrait-eleonora.webp');
      expect(updated).toBe(true);

      const profile = graph.getCharacterProfile('Eleonora');
      expect(profile?.portraitUrl).toBe('https://storage.local/portrait-eleonora.webp');
    });

    it('rejestruje gracza i buduje spójną dyrektywę systemową bez duplikatów', () => {
      const player: Partial<Character> & { id: string; name: string } = {
        id: 'player-1',
        name: 'Thomas Malone',
        age: 38,
        gender: 'male',
        occupation: 'Detektyw policyjny',
        appearance: 'zmęczony gliniarz w prochowcu',
        scars: ['postrzał w ramię'],
      };

      graph.registerPlayer(player as Character, '1920s');

      expect(graph.getCharacterProfile('Thomas Malone')).toBeDefined();
      expect(graph.getCharacterProfile('Thomas')).toBeDefined();
      expect(graph.getCharacterProfile('Malone')).toBeDefined();

      const directive = graph.toPromptDirective('pl');
      expect(directive).toContain('### VISUAL BELIEF GRAPH (KOTWICE WIZUALNE POSTACI):');
      expect(directive).toContain('Thomas Malone');

      // Sprawdź brak duplikatów w dyrektywie
      const occurrences = (directive.match(/Thomas Malone/g) || []).length;
      expect(occurrences).toBe(1);
    });

    it('aktualizuje i formatuje stan lokacji', () => {
      graph.updateLocation('Miskatonic Library', {
        lighting: 'zielone lampy bankierskie',
        atmosphere: 'zapach starego pergaminu',
      });

      const loc = graph.getLocation('Miskatonic Library');
      expect(loc).toBeDefined();
      expect(loc?.visitedCount).toBe(1);

      const directive = graph.toPromptDirective('pl');
      expect(directive).toContain('Miskatonic Library');
      expect(directive).toContain('zielone lampy bankierskie');
    });
  });
});
