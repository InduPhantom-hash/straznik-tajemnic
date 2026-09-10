import {
  evaluateSanityFilter,
  buildConcordiaObservationDirective,
  filterRAGResultsByFogOfWar,
  formatKeeperSecretsSection,
  type MakeObservationContext,
} from './make-observation';
import type { RetrievalResult } from '../vector-db/retrieval-service';

describe('Concordia MakeObservation & Epistemic Fog of War', () => {
  describe('evaluateSanityFilter', () => {
    it('zwraca tier stable dla badacza ze stabilną poczytalnością', () => {
      const filter = evaluateSanityFilter({
        sanity: 65,
        maxSanity: 99,
        dailySanLoss: 0,
        recentSanityLoss: 0,
      });

      expect(filter.tier).toBe('stable');
      expect(filter.isBoutOfMadness).toBe(false);
      expect(filter.realityCheckRequired).toBe(false);
    });

    it('zwraca tier shaken dla niskiej poczytalności (SAN <= 35)', () => {
      const filter = evaluateSanityFilter({
        sanity: 25,
        maxSanity: 90,
        dailySanLoss: 4,
        phobias: ['Klaustrofobia'],
      });

      expect(filter.tier).toBe('shaken');
      expect(filter.isBoutOfMadness).toBe(false);
      expect(filter.sensoryDistortions).toContain('Fobia: Klaustrofobia');
      expect(filter.realityCheckRequired).toBe(false);
    });

    it('zwraca tier acute_insanity przy pojedynczej stracie >= 5 SAN (szok poznawczy RAW)', () => {
      const filter = evaluateSanityFilter({
        sanity: 45,
        maxSanity: 90,
        recentSanityLoss: 6,
      });

      expect(filter.tier).toBe('acute_insanity');
      expect(filter.isBoutOfMadness).toBe(true);
      expect(filter.realityCheckRequired).toBe(true);
      expect(filter.recommendedGuidance).toContain('Test Realności');
    });

    it('zwraca tier acute_insanity przy aktywnej fladze isBoutOfMadnessActive', () => {
      const filter = evaluateSanityFilter({
        sanity: 40,
        maxSanity: 80,
        isBoutOfMadnessActive: true,
      });

      expect(filter.tier).toBe('acute_insanity');
      expect(filter.isBoutOfMadness).toBe(true);
      expect(filter.realityCheckRequired).toBe(true);
    });

    it('zwraca tier permanent_insanity przy SAN <= 0 (utrata jaźni CoC 7e RAW)', () => {
      const filter = evaluateSanityFilter({
        sanity: 0,
        maxSanity: 90,
      });

      expect(filter.tier).toBe('permanent_insanity');
      expect(filter.isPermanentInsanity).toBe(true);
      expect(filter.realityCheckRequired).toBe(false);
      expect(filter.recommendedGuidance).toContain('Permanent Insanity');
    });

    it('zwraca tier acute_insanity przy utracie 1/5 dziennej poczytalności (dayStartSan RAW)', () => {
      const filter = evaluateSanityFilter({
        sanity: 40,
        maxSanity: 90,
        dayStartSan: 50,
        dailySanLoss: 10, // 10 >= 50/5 = 10
      });

      expect(filter.tier).toBe('acute_insanity');
      expect(filter.isBoutOfMadness).toBe(true);
      expect(filter.realityCheckRequired).toBe(true);
    });

    it('zwraca tier shaken dla badacza z flagą underlyingInsanity (stan po ataku szaleństwa)', () => {
      const filter = evaluateSanityFilter({
        sanity: 55,
        maxSanity: 90,
        underlyingInsanity: true,
      });

      expect(filter.tier).toBe('shaken');
      expect(filter.isBoutOfMadness).toBe(false);
      expect(filter.realityCheckRequired).toBe(false);
    });
  });

  describe('buildConcordiaObservationDirective', () => {
    it('buduje kompletną dyrektywę PL dla trybu solo', () => {
      const context: MakeObservationContext = {
        characters: [
          {
            id: 'char-1',
            name: 'Edward Carnby',
            sanity: 60,
            maxSanity: 90,
          },
        ],
        currentLocation: 'Biblioteka Orne',
        locale: 'pl',
      };

      const directive = buildConcordiaObservationDirective(context);

      expect(directive).toContain('EPISTEMICZNA MGŁA WOJNY & MAKEOBSERVATION');
      expect(directive).toContain('ZAPORA EPISTEMICZNA');
      expect(directive).toContain('[MYŚLI_MG]');
      expect(directive).toContain('WARUNKOWE UJAWNIANIE POSZLAK');
      expect(directive).not.toContain('SEPARACJA EPISTEMICZNA W TRYBIE DRUŻYNY');
    });

    it('buduje dyrektywę EN z poprawną terminologią angielską', () => {
      const context: MakeObservationContext = {
        characters: [
          {
            id: 'char-1',
            name: 'Arthur Pendelton',
            sanity: 55,
            maxSanity: 85,
          },
        ],
        locale: 'en',
      };

      const directive = buildConcordiaObservationDirective(context);

      expect(directive).toContain('EPISTEMIC FOG OF WAR & MAKEOBSERVATION');
      expect(directive).toContain('EPISTEMIC FIREWALL');
      expect(directive).toContain('CONDITIONAL SECRET INJECTION');
    });

    it('włącza separację epistemiczną w trybie Hot Seat z wieloma badaczami', () => {
      const context: MakeObservationContext = {
        characters: [
          { id: 'c1', name: 'Arthur', sanity: 50 },
          { id: 'c2', name: 'Eleanor', sanity: 30, isBoutOfMadnessActive: true },
        ],
        isHotSeat: true,
        locale: 'pl',
        truthAnchor: {
          unrevealedClueTitles: ['Zakrwawiony sztylet pod podłogą', 'Szyfr kultu'],
        },
      };

      const directive = buildConcordiaObservationDirective(context);

      expect(directive).toContain('SEPARACJA EPISTEMICZNA W TRYBIE DRUŻYNY / HOT SEAT');
      expect(directive).toContain('Arthur');
      expect(directive).toContain('Eleanor');
      expect(directive).toContain('@ImięPostaci:');
      expect(directive).toContain('AKTUALNIE NIEODKRYTE SEKRETY');
      expect(directive).toContain('Zakrwawiony sztylet pod podłogą');
    });

    it('podkreśla aktywnego badacza oraz rozdzielenie lokacji w Hot Seat', () => {
      const context: MakeObservationContext = {
        characters: [
          { id: 'c1', name: 'Arthur', sanity: 60, currentLocation: 'Gabinet dyrektora' },
          { id: 'c2', name: 'Eleanor', sanity: 55, currentLocation: 'Piwnica' },
        ],
        activeCharacterName: 'Arthur',
        isHotSeat: true,
        locale: 'pl',
      };

      const directive = buildConcordiaObservationDirective(context);

      expect(directive).toContain('Aktywny badacz w tej turze: **Arthur**');
      expect(directive).toContain('ROZDZIELENIE FIZYCZNE LOKACJI');
      expect(directive).toContain('Arthur: Gabinet dyrektora');
      expect(directive).toContain('Eleanor: Piwnica');
    });
  });

  describe('filterRAGResultsByFogOfWar & formatKeeperSecretsSection', () => {
    const mockResults: RetrievalResult[] = [
      {
        id: 'r1',
        score: 0.85,
        source: 'semantic',
        namespace: 'rules',
        contentType: 'rule',
        summary: 'Zasady testu Spostrzegawczości CoC 7e',
        gameTimestamp: '',
        tags: ['rules', 'skills'],
      },
      {
        id: 'r2',
        score: 0.82,
        source: 'semantic',
        namespace: 'adventures',
        contentType: 'adventure',
        summary: 'Prawda o mordercy: Kultysta Thomas zamordował profesora rytualnym sztyletem [SECRET]',
        gameTimestamp: '',
        tags: ['secret', 'keeper_truth', 'adventures'],
      },
      {
        id: 'r3',
        score: 0.75,
        source: 'semantic',
        namespace: 'adventures',
        contentType: 'adventure',
        summary: 'Opis fasady biblioteki uniwersytetu Miskatonic',
        gameTimestamp: '',
        tags: ['location', 'lore'],
      },
      {
        id: 'r4',
        score: 0.80,
        source: 'semantic',
        namespace: 'mythos',
        contentType: 'mythos',
        summary: 'Prawda o sekcie: Rytuał przebudzenia wymaga krwi niewinnego [SEKRET]',
        gameTimestamp: '',
        tags: ['tajemnica', 'mg_only'],
      },
    ];

    it('poprawnie separuje sekrety MG (w tym tagi PL i Mity) od wiedzy ogólnej', () => {
      const { publicResults, keeperSecrets } = filterRAGResultsByFogOfWar(mockResults);

      expect(publicResults.length).toBe(2);
      expect(publicResults.map((r) => r.id)).toEqual(['r1', 'r3']);

      expect(keeperSecrets.length).toBe(2);
      expect(keeperSecrets.map((r) => r.id)).toEqual(['r2', 'r4']);
    });

    it('formatuje sekcję sekretów MG z klauzulą ochronną', () => {
      const { keeperSecrets } = filterRAGResultsByFogOfWar(mockResults);
      const formattedPl = formatKeeperSecretsSection(keeperSecrets, 'pl');

      expect(formattedPl).toContain('SEKRETY STRÓŻA (KEEPER TRUTH - EPISTEMICZNA MGŁA WOJNY)');
      expect(formattedPl).toContain('BEZWZGLĘDNY ZAKAZ bezpośredniego ujawniania');
      expect(formattedPl).toContain('Prawda o mordercy');
      expect(formattedPl).toContain('Prawda o sekcie');

      const formattedEn = formatKeeperSecretsSection(keeperSecrets, 'en');
      expect(formattedEn).toContain('KEEPER SECRETS (KEEPER TRUTH - EPISTEMIC FOG OF WAR)');
      expect(formattedEn).toContain('STRICT DIRECTIVE');
    });

    it('zwraca pusty string gdy brak sekretów', () => {
      const formatted = formatKeeperSecretsSection([]);
      expect(formatted).toBe('');
    });
  });
});
