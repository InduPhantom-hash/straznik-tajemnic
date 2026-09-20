import { parseIntoSections } from './parse-sections';

describe('parseIntoSections (Handouty, obrazy i nagrania audio)', () => {
  it('poprawnie parsuje blok handoutu z obrazem [OBRAZ: ...]', () => {
    const text = [
      'Odnajdujesz starą kopertę.',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '📜 DOKUMENT ŚLEDCZY: ZAPISKI Z ARCHIWUM',
      '',
      'Poufne notatki z Uniwersytetu Miskatonic.',
      '',
      '[OBRAZ: /equipment/catalog/letter-shared.webp]',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'Co robisz dalej?',
    ].join('\n');

    const sections = parseIntoSections(text);
    expect(sections).toHaveLength(3);
    expect(sections[0].type).toBe('narrative');
    expect(sections[1].type).toBe('handout');
    expect(sections[1].imageUrl).toBe('/equipment/catalog/letter-shared.webp');
    expect(sections[1].content).not.toContain('[OBRAZ:');
    expect(sections[1].content).toContain('Poufne notatki z Uniwersytetu Miskatonic.');
    expect(sections[2].type).toBe('narrative');
  });

  it('poprawnie parsuje blok handoutu z nagraniem [AUDIO: ...]', () => {
    const text = [
      'Włączasz stary magnetofon szpulowy.',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '🎙️ NAGRANIE DŹWIĘKOWE: TAŚMA SZPULOWA NR 1',
      '',
      '[00:02] Szum taśmy i trzask...',
      '[00:06] "Jeśli to słyszysz..."',
      '',
      '[AUDIO: /audio/handouts/starter_friend_letter.mp3]',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ].join('\n');

    const sections = parseIntoSections(text);
    expect(sections).toHaveLength(2);
    expect(sections[0].type).toBe('narrative');
    expect(sections[1].type).toBe('handout');
    expect(sections[1].audioUrl).toBe('/audio/handouts/starter_friend_letter.mp3');
    expect(sections[1].content).not.toContain('[AUDIO:');
    expect(sections[1].content).toContain('[00:06] "Jeśli to słyszysz..."');
  });

  it('poprawnie parsuje oba bloki rekwizytów (dokument i audio) w jednej wiadomości', () => {
    const text = [
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '📜 DOKUMENT ŚLEDCZY',
      'Treść dokumentu.',
      '[OBRAZ: /equipment/catalog/letter-shared.webp]',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '🎙️ NAGRANIE AUDIO',
      'Transkrypcja nagrania.',
      '[AUDIO: /audio/handouts/corbitt_journal.mp3]',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ].join('\n');

    const sections = parseIntoSections(text);
    const handouts = sections.filter((s) => s.type === 'handout');
    expect(handouts).toHaveLength(2);
    expect(handouts[0].imageUrl).toBe('/equipment/catalog/letter-shared.webp');
    expect(handouts[1].audioUrl).toBe('/audio/handouts/corbitt_journal.mp3');
  });
});
