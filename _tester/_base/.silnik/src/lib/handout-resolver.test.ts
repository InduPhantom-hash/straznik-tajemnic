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
