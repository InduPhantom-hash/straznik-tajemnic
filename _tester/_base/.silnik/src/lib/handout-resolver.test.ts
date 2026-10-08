/**
 * Testy jednostkowe dla deterministycznego resolvera handoutow (Issue #649 - Milestone M3).
 *
 * Przestrzega inwariantu typograficznego: wylacznie standardowy znak myslnika (-).
 */

import { resolveHandoutBySlug } from './handout-resolver';
import type { AdventureHandout, AdventureContext } from './adventures-data';

describe('resolveHandoutBySlug (Issue #649)', () => {
  const mockContext: AdventureContext = {
    id: 'test-scenario',
    title: 'Testowy Scenariusz',
    era: 'noir',
    eraLabel: 'Lata 30.',
    yearRange: '1930-1935',
    location: 'Warszawa',
    country: 'Polska',
    tone: 'noir',
    themes: ['Tajemnica'],
    suggestedOccupations: ['Detektyw'],
    suggestedArchetypes: ['investigator'],
    hook: 'Zlecenie',
    description: 'Opis',
    estimatedSessions: '1',
    playerCount: '1-4',
    difficulty: 'easy',
    handouts: [
      {
        slug: 'tajny-list-mecenasa',
        title: 'Poufny list mecenasa',
        image: '/handouts/list.webp',
        textContent: 'Tresc listu adwokata z 1932 roku.',
        handoutType: 'letter',
      },
      {
        slug: 'clue-mapa-piwnic',
        title: 'Plan piwnic kamienicy',
        image: '/handouts/plan.webp',
        handoutType: 'map',
      },
    ],
  };

  it('zwraca handout na podstawie dokladnego sluga z biezacego adventureContext', () => {
    const result = resolveHandoutBySlug('tajny-list-mecenasa', mockContext);
    expect(result).toBeDefined();
    expect(result?.title).toBe('Poufny list mecenasa');
    expect(result?.textContent).toContain('Tresc listu adwokata');
  });

  it('obsluguje case-insensitive slug', () => {
    const result = resolveHandoutBySlug('TAJNY-LIST-MECENASA', mockContext);
    expect(result).toBeDefined();
    expect(result?.title).toBe('Poufny list mecenasa');
  });

  it('obsluguje dopasowanie bez prefiksu clue-/map-', () => {
    const result = resolveHandoutBySlug('mapa-piwnic', mockContext);
    expect(result).toBeDefined();
    expect(result?.title).toBe('Plan piwnic kamienicy');
    expect(result?.handoutType).toBe('map');
  });

  it('rozwiazuje znane handouty z STREFA_11_ADVENTURES gdy brak w kontekscie', () => {
    const result = resolveHandoutBySlug('clue-photo-prabuty-1947', null);
    expect(result).toBeDefined();
    expect(result?.title).toContain('Prabutach');
  });

  it('rozwiazuje audio handout z STREFA_11_ADVENTURES', () => {
    const result = resolveHandoutBySlug('audio-sb-wiretap-elblag', null);
    expect(result).toBeDefined();
    expect(result?.audioUrl).toBeTruthy();
  });

  it('rozwiazuje fizyczne dowody ze Startera Nawiedzony Dom (Issue #661 / #700)', () => {
    const keys = resolveHandoutBySlug('clue-01-knott-keys', null);
    expect(keys).toBeDefined();
    expect(keys?.title).toContain('Knotta');
    expect(keys?.image).toBe('/adventure-packs/case-s11-01/clue-01-knott-keys.webp');

    const globe = resolveHandoutBySlug('boston-globe-1918', null);
    expect(globe).toBeDefined();
    expect(globe?.title).toContain('Boston Globe');
    expect(globe?.handoutType).toBe('newspaper');
    expect(globe?.audioUrl).toBe('/audio/handouts/nawiedzony-dom/audio-clue-02-boston-globe-pl.mp3');
    expect(globe?.audioUrlPl).toBe('/audio/handouts/nawiedzony-dom/audio-clue-02-boston-globe-pl.mp3');
    expect(globe?.audioUrlEn).toBe('/audio/handouts/nawiedzony-dom/audio-clue-02-boston-globe-en.mp3');
    expect(globe?.reelType).toBe('radio');

    const corbitt = resolveHandoutBySlug('clue-09-corbitt-journal', null);
    expect(corbitt).toBeDefined();
    expect(corbitt?.audioUrlPl).toBe('/audio/handouts/nawiedzony-dom/audio-clue-09-corbitt-journal-pl.mp3');
    expect(corbitt?.audioUrlEn).toBe('/audio/handouts/nawiedzony-dom/audio-clue-09-corbitt-journal-en.mp3');
    expect(corbitt?.reelType).toBe('gramophone');

    const macario = resolveHandoutBySlug('audio-gabriela-macario-plea', null);
    expect(macario).toBeDefined();
    expect(macario?.audioUrlPl).toBe('/audio/handouts/nawiedzony-dom/audio-gabriela-macario-plea-pl.mp3');
    expect(macario?.audioUrlEn).toBe('/audio/handouts/nawiedzony-dom/audio-gabriela-macario-plea-en.mp3');
    expect(macario?.reelType).toBe('gramophone');
  });

  it('zwraca null dla nieistniejacego sluga bez bledu krytycznego', () => {
    const result = resolveHandoutBySlug('nieistniejacy-rekvizyt-404', mockContext);
    expect(result).toBeNull();
  });

  it('zwraca null dla pustego, null lub undefined wejscia', () => {
    expect(resolveHandoutBySlug('', mockContext)).toBeNull();
    expect(resolveHandoutBySlug('   ', mockContext)).toBeNull();
    expect(resolveHandoutBySlug(null as unknown as string, mockContext)).toBeNull();
    expect(resolveHandoutBySlug(undefined as unknown as string, mockContext)).toBeNull();
  });
});
