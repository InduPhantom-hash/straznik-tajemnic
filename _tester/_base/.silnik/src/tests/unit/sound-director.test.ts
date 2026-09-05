import {
  buildAudioDirection,
  extractMoodFromText,
  extractSanLossFromText,
  getActiveCharacterSan,
} from '@/lib/audio/sound-director';

describe('Sound Director Service (Issue #162)', () => {
  beforeEach(() => {
    // Czyszczenie localStorage przed każdym testem
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
  });

  describe('buildAudioDirection - Kwestie Narratora', () => {
    it('zwraca posępny domyślny ton Lovecrafta przy stabilnej poczytalności i braku nastroju', () => {
      const direction = buildAudioDirection({ san: 75, maxSan: 80 });
      expect(direction).toBe(
        'Read the following in a slow, solemn, and ominous Lovecraftian cadence:'
      );
    });

    it('zwraca paranoiczny szept przy nagłej stracie SAN >= 5 (trauma CoC 7e)', () => {
      const direction = buildAudioDirection({
        san: 60,
        maxSan: 80,
        recentSanLoss: 5,
      });
      expect(direction).toContain('paranoid whisper');
      expect(direction).toContain('cosmic dread');
    });

    it('zwraca paranoiczny szept przy krytycznie niskiej poczytalności (SAN <= 25%)', () => {
      const direction = buildAudioDirection({ san: 15, maxSan: 80 }); // 15/80 = 18.75%
      expect(direction).toContain('paranoid whisper');
    });

    it('zwraca duszny, złowrogi ton przy obniżonej poczytalności (< 50%) w klaustrofobicznej scenie', () => {
      const direction = buildAudioDirection({
        san: 35,
        maxSan: 80,
        mood: 'klaustrofobiczny i duszny',
      });
      expect(direction).toContain('hushed, suffocating, ominous, and tense cadence');
    });

    it('zwraca niepokojący ton przy obniżonej poczytalności (< 50%) w standardowej scenie', () => {
      const direction = buildAudioDirection({
        san: 35,
        maxSan: 80,
        mood: 'tajemniczy',
      });
      expect(direction).toContain('nervous, uneasy, and dark Lovecraftian cadence');
    });

    it('dopasowuje tempo do nastroju walki lub pościgu przy wysokiej poczytalności', () => {
      const direction = buildAudioDirection({
        san: 70,
        maxSan: 80,
        mood: 'alarm, ucieczka przed kultystami',
      });
      expect(direction).toContain('intense, rapid, and thrilling cadence');
    });

    it('dopasowuje kadencję do onirycznego, zamglonego nastroju', () => {
      const direction = buildAudioDirection({
        san: 70,
        maxSan: 80,
        mood: 'oniryczny, mgła nad portem',
      });
      expect(direction).toContain('ethereal, measured, mysterious, and slow cadence');
    });

    it('obsługuje fałszywy spokój', () => {
      const direction = buildAudioDirection({
        san: 70,
        maxSan: 80,
        mood: 'fałszywy spokój w salonie',
      });
      expect(direction).toContain('calm but subtly eerie and watchful tone');
    });
  });

  describe('buildAudioDirection - Kwestie NPC', () => {
    it('zwraca nieludzki, chropowaty ton dla ról typu monster', () => {
      const direction = buildAudioDirection({
        isNpc: true,
        speakerName: 'Głębinowiec',
        npcRole: 'monster',
      });
      expect(direction).toContain('eerie, unsettling, rasping, and inhuman tone');
    });

    it('zwraca chrapliwy, zrównoważony głos dla starszych postaci (old)', () => {
      const direction = buildAudioDirection({
        isNpc: true,
        speakerName: 'Stary Zadok Allen',
        npcRole: 'old',
      });
      expect(direction).toContain('mature, weathered, gravelly, and deliberate voice');
    });

    it('zwraca młodzieńczy, emocjonalny głos dla młodych postaci (young)', () => {
      const direction = buildAudioDirection({
        isNpc: true,
        speakerName: 'Chłopiec gazeciarz',
        npcRole: 'young',
      });
      expect(direction).toContain('youthful, emotional, and expressive voice');
    });

    it('zwraca przerażony, drżący głos dla NPC w scenie grozy/paniki', () => {
      const direction = buildAudioDirection({
        isNpc: true,
        speakerName: 'Thomas Malone',
        mood: 'narastająca panika i strach',
      });
      expect(direction).toContain('terrified, trembling, and hurried voice');
    });

    it('zwraca naturalny dramatyczny głos dla standardowych NPC', () => {
      const direction = buildAudioDirection({
        isNpc: true,
        speakerName: 'Inspektor Legrasse',
      });
      expect(direction).toContain('natural, character-driven dramatic voice');
    });
  });

  describe('Ekstrakcja tagów i stanu', () => {
    it('wyciąga tag nastroju sceny z odpowiedzi MG', () => {
      const rawText = '[NASTRÓJ: klaustrofobiczny chłód piwnicy]\nWchodzisz powoli po schodach.';
      expect(extractMoodFromText(rawText)).toBe('klaustrofobiczny chłód piwnicy');
    });

    it('zwraca undefined gdy brak tagu nastroju', () => {
      expect(extractMoodFromText('Zwykły opis bez tagu.')).toBeUndefined();
    });

    it('wyciąga stratę SAN z tagu protokołu [SANITY: -X: powód]', () => {
      const text = '[SANITY: -6: widok rozczłonkowanych zwłok]\nŚciska cię w żołądku.';
      expect(extractSanLossFromText(text)).toBe(6);
    });

    it('wyciąga stratę SAN z naturalnego opisu w języku polskim', () => {
      const text = 'Nagle tracisz 5 punktów poczytalności na widok symbolu.';
      expect(extractSanLossFromText(text)).toBe(5);
    });

    it('odczytuje SAN i max SAN aktywnego badacza z localStorage', () => {
      const mockCharacters = [
        {
          id: 'char-1',
          name: 'Edward Pickman',
          san: 42,
          isActive: true,
          skills: {
            cthulhu_mythos: 15,
          },
        },
      ];
      window.localStorage.setItem('characters', JSON.stringify(mockCharacters));

      const sanData = getActiveCharacterSan();
      expect(sanData.san).toBe(42);
      expect(sanData.maxSan).toBe(84); // 99 - 15 = 84
    });
  });
});
