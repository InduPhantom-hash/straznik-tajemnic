import {
  buildAudioDirection,
  classifySentencePacing,
  extractMoodFromText,
  extractSanLossFromText,
  getActiveCharacterSan,
} from '@/lib/audio/sound-director';

describe('Sound Director Service (Issue #162 + Issue #463)', () => {
  beforeEach(() => {
    // Czyszczenie localStorage przed każdym testem
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
  });

  describe('buildAudioDirection - Kwestie Narratora', () => {
    it('zwraca dynamiczny, wciągający ton lektora audiobooka przy stabilnej poczytalności i braku nastroju', () => {
      const direction = buildAudioDirection({ san: 75, maxSan: 80 });
      expect(direction).toContain('engaging, articulate, and confident audiobook narrator voice');
      expect(direction).toContain('dynamic pacing, and crisp diction');
      expect(direction).not.toContain('slow');
    });

    it('zwraca paranoiczny szept przy nagłej stracie SAN >= 5 (trauma CoC 7e)', () => {
      const direction = buildAudioDirection({
        san: 60,
        maxSan: 80,
        recentSanLoss: 5,
      });
      expect(direction).toContain('urgent, tense, and paranoid whisper');
      expect(direction).toContain('cosmic dread');
      expect(direction).not.toContain('slow');
    });

    it('zwraca paranoiczny szept przy krytycznie niskiej poczytalności (SAN <= 25%)', () => {
      const direction = buildAudioDirection({ san: 15, maxSan: 80 }); // 15/80 = 18.75%
      expect(direction).toContain('urgent, tense, and paranoid whisper');
    });

    it('zwraca duszny, złowrogi ton przy obniżonej poczytalności (< 50%) w klaustrofobicznej scenie', () => {
      const direction = buildAudioDirection({
        san: 35,
        maxSan: 80,
        mood: 'klaustrofobiczny i duszny',
      });
      expect(direction).toContain('tense, dark, and uneasy cadence');
      expect(direction).toContain('captivating pace');
      expect(direction).not.toContain('slow');
    });

    it('zwraca niepokojący ton przy obniżonej poczytalności (< 50%) w standardowej scenie', () => {
      const direction = buildAudioDirection({
        san: 35,
        maxSan: 80,
        mood: 'tajemniczy',
      });
      expect(direction).toContain('tense, suspenseful, and engaging storytelling voice');
      expect(direction).toContain('natural pace');
    });

    it('dopasowuje tempo do nastroju walki lub pościgu przy wysokiej poczytalności', () => {
      const direction = buildAudioDirection({
        san: 70,
        maxSan: 80,
        mood: 'alarm, ucieczka przed kultystami',
      });
      expect(direction).toContain('intense, thrilling cadence');
    });

    it('dopasowuje kadencję do onirycznego, zamglonego nastroju', () => {
      const direction = buildAudioDirection({
        san: 70,
        maxSan: 80,
        mood: 'oniryczny, mgła nad portem',
      });
      expect(direction).toContain('ethereal, mysterious, and captivating cadence');
      expect(direction).toContain('fluid, measured pace');
      expect(direction).not.toContain('slow');
    });

    it('obsługuje fałszywy spokój', () => {
      const direction = buildAudioDirection({
        san: 70,
        maxSan: 80,
        mood: 'fałszywy spokój w salonie',
      });
      expect(direction).toContain('calm, crisp, but subtly eerie and watchful tone');
    });
  });

  describe('buildAudioDirection - Punktowa Modulacja Zdań (Issue #463)', () => {
    it('rozpoznaje zdanie szeptu przy bezpośrednim szoku lub paraliżującym lęku', () => {
      const direction = buildAudioDirection({
        san: 65,
        maxSan: 80,
        mood: 'tajemniczy',
        sentenceText: 'Wstrzymujesz oddech w absolutnej ciszy, czując jak coś przemyka tuż obok.',
      });
      expect(direction).toContain('urgent, tense, and paranoid whisper');
      expect(direction).toContain('cosmic dread');
    });

    it('rozpoznaje zdanie zrywu akcji / starcia przy ucieczce i nagłym ataku', () => {
      const direction = buildAudioDirection({
        san: 65,
        maxSan: 80,
        mood: 'tajemniczy',
        sentenceText: 'Gwałtownie rzuca się na ciebie, a wystrzał rozbija szybę w oknie!',
      });
      expect(direction).toContain('urgent and intense cadence');
      expect(direction).toContain('sharp, punchy diction');
    });

    it('rozpoznaje zdanie złowrogiej kulminacji i makabrycznego odkrycia', () => {
      const direction = buildAudioDirection({
        san: 65,
        maxSan: 80,
        mood: 'tajemniczy',
        sentenceText: 'Na kamiennym stole leżą zmasakrowane zwłoki, a obok wyryto pradawny symbol.',
      });
      expect(direction).toContain('measured, ominous, and deliberate voice of dark revelation');
    });

    it('zwraca dynamiczny ton bazowy dla neutralnego opisu w mrocznej scenie', () => {
      const direction = buildAudioDirection({
        san: 65,
        maxSan: 80,
        mood: 'klaustrofobiczny, mroczny',
        sentenceText: 'Podnosisz starą mosiężną lampę i oświetlasz regał z zakurzonymi książkami.',
      });
      expect(direction).toContain('clear Polish with a deep, atmospheric, and claustrophobic cadence');
      expect(direction).not.toContain('whisper');
      expect(direction).not.toContain('slow');
    });
  });

  describe('classifySentencePacing', () => {
    it('klasyfikuje kategorie zdań zgodnie z dramatyzmem', () => {
      expect(classifySentencePacing('Wstrzymujesz oddech na palcach.')).toBe('whisper');
      expect(classifySentencePacing('Kultysta nagle rzuca się z nożem!')).toBe('action');
      expect(classifySentencePacing('Odkrywasz rozczłonkowane ciało badacza.')).toBe('revelation');
      expect(classifySentencePacing('Przeglądasz rejestr gości hotelowych.')).toBe('baseline');
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

    it('zwraca dojrzały, chropowaty głos dla starszych postaci (old)', () => {
      const direction = buildAudioDirection({
        isNpc: true,
        speakerName: 'Stary Zadok Allen',
        npcRole: 'old',
      });
      expect(direction).toContain('mature, weathered, and gravelly character voice');
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
      expect(direction).toContain('terrified, trembling, and emotional voice');
    });

    it('zwraca naturalny dramatyczny głos dla standardowych NPC', () => {
      const direction = buildAudioDirection({
        isNpc: true,
        speakerName: 'Inspektor Legrasse',
      });
      expect(direction).toContain('natural, conversational character voice');
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
