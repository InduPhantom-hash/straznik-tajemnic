import { parseIntoSections, detectHandoutType } from './parse-sections';

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

  it('poprawnie parsuje [NOTATKA_BADACZA: ...] i tworzy obiekt stickyNote na sekcji handoutu', () => {
    const text = [
      'Na biurku profesora leży pożółkły dokument.',
      '[NOTATKA_BADACZA: Kto: Dr Henry Armitage | Dotyczy: Fragment dziennika Wilbura Whateleya | Trop: Ostrzeżenie przed formułą z 751 strony]',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '📜 DZIENNIK WILBURA WHATELEYA',
      'Dziś w nocy nadeszło wołanie z wzgórz...',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '[Co robisz?]',
    ].join('\n');

    const sections = parseIntoSections(text);
    expect(sections).toHaveLength(3);
    expect(sections[0].type).toBe('narrative');
    expect(sections[1].type).toBe('handout');
    expect(sections[1].stickyNote).toBeDefined();
    expect(sections[1].stickyNote?.who).toBe('Dr Henry Armitage');
    expect(sections[1].stickyNote?.about).toBe('Fragment dziennika Wilbura Whateleya');
    expect(sections[1].stickyNote?.clue).toBe('Ostrzeżenie przed formułą z 751 strony');
    expect(sections[1].content).not.toContain('[NOTATKA_BADACZA:');
    expect(sections[1].content).toContain('Dziś w nocy nadeszło wołanie z wzgórz...');
    expect(sections[2].type).toBe('whisper');
    expect(sections[2].content).toBe('Co robisz?');
  });

  it('poprawnie parsuje wariant angielski [STICKY_NOTE: Who: ... | About: ... | Clue: ...]', () => {
    const text = [
      '[STICKY_NOTE: Who: Inspector Legrasse | About: Raid in the swamps | Clue: Idol made of unknown stone]',
      '📰 ARKHAM ADVERTISER',
      'POLICE DISCOVER STRANGE CULT IN LOUISIANA BAYOUS',
    ].join('\n');

    const sections = parseIntoSections(text);
    expect(sections).toHaveLength(1);
    expect(sections[0].type).toBe('handout');
    expect(sections[0].stickyNote).toEqual({
      who: 'Inspector Legrasse',
      about: 'Raid in the swamps',
      clue: 'Idol made of unknown stone',
    });
    expect(sections[0].content).toContain('POLICE DISCOVER STRANGE CULT');
  });

  it('nie traktuje zwykłej prozy ze słowami Kurier, Telegram, Dziennik jako nagłówka handoutu', () => {
    const text = [
      'Kurier zapukał do drzwi i wręczył ci małą paczkę.',
      'Janusz podszedł bliżej:',
      'Janusz: „Co to jest?”',
      '[Co robisz?]',
    ].join('\n');

    const sections = parseIntoSections(text);
    expect(sections.some((s) => s.type === 'handout')).toBe(false);
    expect(sections[0].type).toBe('narrative');
    expect(sections[1].type).toBe('dialogue');
    expect(sections[1].speaker).toBe('Janusz');
    expect(sections[1].content).toBe('Co to jest?');
  });

  it('detectHandoutType nie traktuje słów SZANOWNY ani DROGI w zwykłym tekście jako listu', () => {
    expect(detectHandoutType('Drogi przyjacielu, musimy porozmawiać')).toBe('note');
    expect(detectHandoutType('Szanowny Pan Jan podszedł do okna')).toBe('note');
    expect(detectHandoutType('✉️ POUFNY LIST')).toBe('letter');
    expect(detectHandoutType('LIST Z MISKATONIC')).toBe('letter');
    expect(detectHandoutType('OFFICIAL LETTER')).toBe('letter');
  });

  it('nie połyka dialogów NPC wewnątrz listu lub niedomkniętego dokumentu', () => {
    const text = [
      'Otwierasz kopertę i czytasz:',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '📜 DOKUMENT ŚLEDCZY: LIST DO ARCHIWUM',
      'Spotkajmy się jutro o północy pod starym dębem.',
      'Janusz: „Nie podoba mi się to, doktorze.”',
      '[Co robisz?]',
    ].join('\n');

    const sections = parseIntoSections(text);
    const handout = sections.find((s) => s.type === 'handout');
    const dialogue = sections.find((s) => s.type === 'dialogue');

    expect(handout).toBeDefined();
    expect(handout?.content).toContain('Spotkajmy się jutro');
    expect(handout?.content).not.toContain('Janusz:');

    expect(dialogue).toBeDefined();
    expect(dialogue?.content).toContain('Nie podoba mi się to, doktorze.');
  });
});

