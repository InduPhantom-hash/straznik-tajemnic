import {
  normalizePhoneticsForTts,
  enhanceAudioDirectionWithPhonetics,
  POLISH_PHONETIC_AUDIO_DIRECTIVE,
} from '@/lib/audio/polish-phonetics';

describe('Polish Phonetics & Pronunciation Normalizer (Issue #173)', () => {
  describe('normalizePhoneticsForTts', () => {
    it('zwraca nienaruszony tekst dla locale "en"', () => {
      const text = 'She stood by the lady at the counter with a pie.';
      expect(normalizePhoneticsForTts(text, 'en')).toBe(text);
    });

    it('zastępuje homograf "lady" sklepowej/barowej formą jednoznaczną fonetycznie', () => {
      const text1 = 'Sprzedawca stał zza lady i spoglądał podejrzliwie.';
      expect(normalizePhoneticsForTts(text1, 'pl')).toBe(
        'Sprzedawca stał zza laddy i spoglądał podejrzliwie.'
      );

      const text2 = 'Podejdź do lady i połóż rewolwer na blacie.';
      expect(normalizePhoneticsForTts(text2, 'pl')).toBe(
        'Podejdź do laddy i połóż rewolwer na blacie.'
      );

      const text3 = 'Oparł się o blat lady barowej.';
      expect(normalizePhoneticsForTts(text3, 'pl')).toBe(
        'Oparł się o blat laddy barowej.'
      );
    });

    it('zastępuje homograf "post" w kontekście postu/wstrzemięźliwości', () => {
      const text = 'W klasztorze obowiązywał ścisły post.';
      expect(normalizePhoneticsForTts(text, 'pl')).toBe(
        'W klasztorze obowiązywał ścisły posst.'
      );
    });

    it('zastępuje myślniki pauzy i półpauzy na standardowy myślnik ze spacją', () => {
      const text = 'Nagle—coś zachrobotało w ścianie–bardzo blisko.';
      expect(normalizePhoneticsForTts(text, 'pl')).toBe(
        'Nagle - coś zachrobotało w ścianie - bardzo blisko.'
      );
    });

    it('radzi sobie z pustym tekstem lub wartościami brzegowymi', () => {
      expect(normalizePhoneticsForTts('', 'pl')).toBe('');
    });
  });

  describe('enhanceAudioDirectionWithPhonetics', () => {
    it('zwraca niezmienione audioDirection dla locale "en"', () => {
      const direction = 'Read the following in an eerie voice:';
      expect(enhanceAudioDirectionWithPhonetics(direction, 'en')).toBe(direction);
    });

    it('dołącza twardą dyrektywę polskiej fonetyki dla locale "pl"', () => {
      const direction =
        'Read the following in a captivating, atmospheric storytelling voice:';
      const enhanced = enhanceAudioDirectionWithPhonetics(direction, 'pl');
      expect(enhanced).toContain(direction);
      expect(enhanced).toContain(POLISH_PHONETIC_AUDIO_DIRECTIVE);
      expect(enhanced).toContain('crisp, clear, and distinct articulation');
    });

    it('nie dubluje dyrektywy jeśli instrukcja już zawiera wskazówki polskiej fonetyki', () => {
      const directionWithPolish =
        'Read the following in clear Polish pronunciation with a female character voice:';
      const result = enhanceAudioDirectionWithPhonetics(directionWithPolish, 'pl');
      expect(result).toBe(directionWithPolish);
    });

    it('zwraca domyślną dyrektywę gdy audioDirection jest puste dla "pl"', () => {
      expect(enhanceAudioDirectionWithPhonetics('', 'pl')).toBe(
        POLISH_PHONETIC_AUDIO_DIRECTIVE
      );
    });
  });
});
