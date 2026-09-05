import {
  getEraAudioRecordingVisualDescription,
  getEraCameraVisualDescription,
  getEraColorDirection,
  getEraDevotionalVisualDescription,
  getEraImageFilter,
  getEraPhoneVisualDescription,
  getEraProtectiveVisualDescription,
  getEraTechnologyGuardrails,
  getEraVehicleVisualDescription,
  resolveEraVisualProfile,
} from './era-visual-style';

describe('era visual style', () => {
  it('dobiera pełny kolor wyłącznie dla współczesności', () => {
    expect(getEraImageFilter('modern')).toBe('none');
    expect(getEraImageFilter('2026')).toBe('none');
    expect(getEraImageFilter('1925')).not.toBe('none');
  });

  it('rozróżnia lata 40. od PRL, także gdy UI przekazuje sam rok', () => {
    expect(resolveEraVisualProfile('1946')).toBe('1940s');
    expect(resolveEraVisualProfile('1974')).toBe('prl-1970s');
    expect(getEraColorDirection('1974')).toContain('Eastern European analog');
  });

  it('poprawnie mapuje lata 80., 90., 2000 i okres przedwojenny 1900-1919', () => {
    expect(resolveEraVisualProfile('1983')).toBe('1980s');
    expect(resolveEraVisualProfile('1995')).toBe('1990s');
    expect(resolveEraVisualProfile('2004')).toBe('2000s');
    expect(resolveEraVisualProfile('1912')).toBe('1890s');
    expect(resolveEraVisualProfile('1955')).toBe('1950s');
  });

  it('generuje twarde strażniki anachronizmów dla epok historycznych', () => {
    const guardrails1980s = getEraTechnologyGuardrails('1983');
    expect(guardrails1980s).toContain('no smartphones');
    expect(guardrails1980s).toContain('no iPhones');
    expect(guardrails1980s).toContain('no powerbanks');
    expect(guardrails1980s).toContain('no DVDs');
    expect(guardrails1980s).toContain('no USB');

    const guardrails1920s = getEraTechnologyGuardrails('1920s');
    expect(guardrails1920s).toContain('no cassette tapes');
    expect(guardrails1920s).toContain('no transistors');
    expect(guardrails1920s).toContain('no LED lights');

    const phone1980s = getEraPhoneVisualDescription('1983');
    expect(phone1980s).toContain('rotary dial or mechanical push buttons');
    expect(phone1980s).toContain('strictly no screen');

    const vehicle1970s = getEraVehicleVisualDescription('1974');
    expect(vehicle1970s).toContain('1970s Eastern European / European boxy sedan');
  });

  it('dobiera właściwy opis urządzeń rejestrujących i audio zależnie od epoki', () => {
    const audio1890 = getEraAudioRecordingVisualDescription('1890s');
    expect(audio1890).toContain('phonograph with hand-cranked clockwork motor');
    expect(audio1890).toContain('wax cylinder');

    const audio1920 = getEraAudioRecordingVisualDescription('1920s');
    expect(audio1920).toContain('spring-wound portable gramophone');
    expect(audio1920).toContain('vacuum tube radio receiver');

    const audio1974 = getEraAudioRecordingVisualDescription('1974');
    expect(audio1974).toContain('Eastern European portable reel-to-reel or cassette recorder');
    expect(audio1974).toContain('Unitra');

    const audio1983 = getEraAudioRecordingVisualDescription('1983');
    expect(audio1983).toContain('portable microcassette voice recorder');

    const audioModern = getEraAudioRecordingVisualDescription('modern');
    expect(audioModern).toContain('contemporary slim metal-body digital audio recorder');
  });

  it('dobiera właściwy opis aparatów i optyki zależnie od epoki', () => {
    const camera1890 = getEraCameraVisualDescription('1890s');
    expect(camera1890).toContain('large wooden folding field camera');
    expect(camera1890).toContain('pleated leather bellows');

    const camera1920 = getEraCameraVisualDescription('1920s');
    expect(camera1920).toContain('vintage 1920s folding pocket camera');
    expect(camera1920).toContain('accordion bellows');

    const camera1946 = getEraCameraVisualDescription('1946');
    expect(camera1946).toContain('twin-lens reflex (TLR)');

    const camera1974 = getEraCameraVisualDescription('1974');
    expect(camera1974).toContain('mechanical SLR (e.g. Zenit or Praktica)');
  });

  it('generuje wiarygodne opisy dewocjonaliów i odzieży ochronnej bez zanieczyszczeń fantasy', () => {
    const devotional = getEraDevotionalVisualDescription();
    expect(devotional).toContain('sterling silver with natural dark tarnish');
    expect(devotional).toContain('genuine beeswax');
    expect(devotional).toContain('zero fantasy embellishments');

    const protective = getEraProtectiveVisualDescription();
    expect(protective).toContain('heavy stitched saddle leather');
    expect(protective).toContain('tarnished brass roller buckles');
  });
});

