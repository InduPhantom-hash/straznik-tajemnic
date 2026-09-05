import {
  inferGenderFromName,
  inferGenderFromNPC,
  buildNpcToneOfVoice,
  resolveDynamicNpcVoice,
  initializeAdventureNpcVoices,
  resolveNpcVoice,
} from '@/lib/npc-voice-mapping';
import type { NPC } from '@/lib/types';

describe('NPC Voice Mapping & Tone of Voice (Issue #170)', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
  });

  describe('inferGenderFromName', () => {
    it('poprawnie rozpoznaje imiona żeńskie z polską końcówką -a', () => {
      expect(inferGenderFromName('Anna')).toBe('female');
      expect(inferGenderFromName('Maria')).toBe('female');
      expect(inferGenderFromName('Katarzyna')).toBe('female');
      expect(inferGenderFromName('Eleonora')).toBe('female');
      expect(inferGenderFromName('Zofia Kowalska')).toBe('female');
    });

    it('poprawnie ignoruje męskie imiona kończące się na -a (wyjątki)', () => {
      expect(inferGenderFromName('Kuba')).not.toBe('female');
      expect(inferGenderFromName('Barnaba')).not.toBe('female');
      expect(inferGenderFromName('Kosma')).not.toBe('female');
      expect(inferGenderFromName('Sasza')).not.toBe('female');
      expect(inferGenderFromName('Luca')).not.toBe('female');
    });

    it('poprawnie rozpoznaje płeć na podstawie tytułów żeńskich', () => {
      expect(inferGenderFromName('Pani Smith')).toBe('female');
      expect(inferGenderFromName('Panna Williams')).toBe('female');
      expect(inferGenderFromName('Miss Marple')).toBe('female');
      expect(inferGenderFromName('Siostra Beatrice')).toBe('female');
      expect(inferGenderFromName('Wdowa Blackwood')).toBe('female');
    });

    it('poprawnie rozpoznaje płeć na podstawie tytułów męskich', () => {
      expect(inferGenderFromName('Pan Nowak')).toBe('male');
      expect(inferGenderFromName('Ojciec Brown')).toBe('male');
      expect(inferGenderFromName('Profesor Armitage')).toBe('male');
      expect(inferGenderFromName('Inspektor Legrasse')).toBe('male');
      expect(inferGenderFromName('Dr Watson')).toBe('male');
    });

    it('poprawnie rozpoznaje imiona żeńskie bez końcówki -a (znane imiona epoki i anglosaskie)', () => {
      expect(inferGenderFromName('Helen')).toBe('female');
      expect(inferGenderFromName('Ruth')).toBe('female');
      expect(inferGenderFromName('Alice')).toBe('female');
      expect(inferGenderFromName('Mary')).toBe('female');
      expect(inferGenderFromName('Agnes')).toBe('female');
    });

    it('zwraca null dla pustego lub nieznanego neutralnego ciągu', () => {
      expect(inferGenderFromName('')).toBeNull();
      expect(inferGenderFromName('xyz123')).toBeNull();
    });
  });

  describe('inferGenderFromNPC', () => {
    it('daje priorytet imieniu nad opisem', () => {
      const npc: Partial<NPC> = {
        name: 'Anna Kowalska',
        occupation: 'marynarz', // męskie słowo kluczowe
      };
      expect(inferGenderFromNPC(npc as NPC)).toBe('female');
    });

    it('rozpoznaje płeć z zawodu i opisu gdy imię jest neutralne', () => {
      const femaleNpc: Partial<NPC> = {
        name: 'Shadow',
        occupation: 'kelnerka w miejscowym barze',
      };
      expect(inferGenderFromNPC(femaleNpc as NPC)).toBe('female');

      const maleNpc: Partial<NPC> = {
        name: 'Shadow',
        occupation: 'kowal i żołnierz',
      };
      expect(inferGenderFromNPC(maleNpc as NPC)).toBe('male');
    });
  });

  describe('buildNpcToneOfVoice', () => {
    it('przypisuje kobiecy głos Aoede dla postaci żeńskiej', () => {
      const result = buildNpcToneOfVoice({
        name: 'Eleonora Vance',
        occupation: 'historyk sztuki',
      });
      expect(result.gender).toBe('female');
      expect(result.voiceId).toBe('Aoede');
      expect(result.audioDirection).toContain('clear, natural Polish pronunciation');
      expect(result.audioDirection).toContain('female character voice');
      expect(result.audioDirection).toContain('steady, engaging pace');
      expect(result.audioDirection).not.toContain('slow');
    });

    it('dobiera styl naukowy dla zawodu profesora / badacza', () => {
      const result = buildNpcToneOfVoice({
        name: 'Henry Armitage',
        occupation: 'profesor bibliotekoznawstwa',
      });
      expect(result.gender).toBe('male');
      expect(result.audioDirection).toContain('scholarly');
    });

    it('dobiera przerażony ton głosu przy panice/strachu w nastroju', () => {
      const result = buildNpcToneOfVoice(
        {
          name: 'Thomas',
          occupation: 'student',
        },
        { mood: 'panika i groza w piwnicy' }
      );
      expect(result.audioDirection).toContain('terrified');
    });
  });

  describe('resolveDynamicNpcVoice', () => {
    it('przypisuje żeński głos Aoede i poprawną reżyserię dla nowo napotkanej kobiety', () => {
      const voiceMap = new Map<string, string>();
      const cache = new Map<string, { voiceId: string; audioDirection: string }>();

      const resolved = resolveDynamicNpcVoice('Panna Emily', voiceMap, cache);
      expect(resolved.voiceId).toBe('Aoede');
      expect(resolved.audioDirection).toContain('female');
      expect(voiceMap.get('panna emily')).toBe('Aoede');
      expect(cache.has('panna emily')).toBe(true);
    });

    it('naprawia błąd starych danych: zastępuje basowy głos Charon głosem Aoede dla kobiety', () => {
      const voiceMap = new Map<string, string>();
      voiceMap.set('helena', 'Charon'); // błąd z przeszłości

      const resolved = resolveDynamicNpcVoice('Helena', voiceMap);
      expect(resolved.voiceId).toBe('Aoede');
    });

    it('zwraca męski głos Puck dla nowo napotkanego mężczyzny', () => {
      const voiceMap = new Map<string, string>();
      const resolved = resolveDynamicNpcVoice('Arthur Pendelton', voiceMap);
      expect(resolved.voiceId).toBe('Puck');
      expect(resolved.audioDirection).toContain('male');
    });
  });

  describe('initializeAdventureNpcVoices', () => {
    it('parsuje postacie ze scenariusza i zapisuje je w localStorage gm_npcs z odpowiednimi głosami', () => {
      const adventure = {
        title: 'Nawiedzony Dom',
        era: '1920s Classic',
        graph: {
          npcs: [
            {
              name: 'Pani Corbitt',
              description: 'Wdowa po poprzednim właścicielu domu',
            },
            {
              name: 'Inspektor Henderson',
              description: 'Lokalny oficer policji w Bostonie',
            },
          ],
        },
      };

      const result = initializeAdventureNpcVoices(adventure);
      expect(result.length).toBe(2);

      const savedRaw = window.localStorage.getItem('gm_npcs');
      expect(savedRaw).toBeTruthy();
      const savedNpcs = JSON.parse(savedRaw!);

      const corbitt = savedNpcs.find((n: Partial<NPC>) => n.name === 'Pani Corbitt');
      expect(corbitt).toBeDefined();
      expect(corbitt.voiceConfig?.voiceId).toBe('Aoede');
      expect(corbitt.voiceConfig?.rate).toBe(1.15);

      const henderson = savedNpcs.find((n: Partial<NPC>) => n.name === 'Inspektor Henderson');
      expect(henderson).toBeDefined();
      expect(henderson.voiceConfig?.voiceId).toBe('Puck');
    });
  });
});
