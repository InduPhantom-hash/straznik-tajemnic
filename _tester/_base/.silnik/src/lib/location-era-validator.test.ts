import {
  validateLocationMaterialDetails,
  enrichImagePromptWithEraProps,
  buildLocationEraGuidanceSection,
} from './location-era-validator';

describe('location-era-validator (Materialne User Story i Strażnik Epoki)', () => {
  describe('Lata 20. XX wieku (1920s / Klasyczne Call of Cthulhu)', () => {
    it('pozytywnie ocenia bogaty, zgodny historycznie opis lokacji z lat 20.', () => {
      const description = `
        Wchodzisz do zakurzonego gabinetu adwokata. Pomieszczenie oświetla pojedyncza lampa naftowa 
        z zielonym abażurem, rzucająca wąski snop światła na dębowe biurko. W rogu stoi czarny telefon naścienny 
        z mosiężnymi dzwonkami oraz stara maszyna do pisania Underwood. Z żeliwnego kaloryfera dobiega cichy stukot, 
        a w powietrzu unosi się chłód i woń starego papieru oraz tytoniu.
      `;

      const result = validateLocationMaterialDetails(description, '1925');

      expect(result.isValid).toBe(true);
      expect(result.score).toBe(100);
      expect(result.era).toBe('1920s');
      expect(result.materialDetails.hasLighting).toBe(true);
      expect(result.materialDetails.hasPeriodInfrastructure).toBe(true);
      expect(result.materialDetails.hasHeatingOrSensory).toBe(true);
      expect(result.detectedAnachronisms).toHaveLength(0);
      expect(result.anomalyInflationDetected).toBe(false);
    });

    it('wykrywa współczesne anachronizmy elektroniczne (smartfon, Wi-Fi, LED)', () => {
      const description = `
        Wchodzisz do gabinetu detektywa w Arkham. Na biurku leży smartfon oraz kabel USB podłączony do powerbanka. 
        Sufit oświetla nowoczesna taśma LED.
      `;

      const result = validateLocationMaterialDetails(description, '1920s');

      expect(result.isValid).toBe(false);
      expect(result.detectedAnachronisms.length).toBeGreaterThan(0);
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/anachronizm.*smartfon/i),
          expect.stringMatching(/anachronizm.*usb/i),
          expect.stringMatching(/anachronizm.*led/i),
        ])
      );
    });

    it('wykrywa inflację anomalii w zwykłej lokacji codziennej', () => {
      const description = `
        Wchodzisz do zwykłego sklepu spożywczego w Arkham. Lampa naftowa oświetla ladę. 
        Kąty pomieszczenia przeczą geometrii, a ściany mają nieeuklidesowe załamania. W powietrzu czuć chłód.
      `;

      const result = validateLocationMaterialDetails(description, '1920s', { isMythosSite: false });

      expect(result.anomalyInflationDetected).toBe(true);
      expect(result.score).toBeLessThan(100);
      expect(result.recommendations).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/zasadę kontrastu/i),
        ])
      );
    });

    it('zezwala na anomalie geometryczne w lokacjach jawnie mitycznych (isMythosSite: true)', () => {
      const description = `
        Schodzisz do pradawnej krypty pod bagnami. Światło latarki wydobywa nieeuklidesowe kąty bazaltowych bloków. 
        Czuć grobowy chłód i woń miazmatów.
      `;

      const result = validateLocationMaterialDetails(description, '1920s', { isMythosSite: true });

      expect(result.anomalyInflationDetected).toBe(false);
      expect(result.isValid).toBe(true);
    });
  });

  describe('PRL lata 70. (prl-1970s)', () => {
    it('weryfikuje specyfikę materialną PRL (telefon tarczowy RWT, lastryko, świetlówki)', () => {
      const description = `
        Wchodzisz do dyżurki milicji. Mrugająca świetlówka rzuca zimne światło na posadzkę z lastryko. 
        Na biurku stoi pomarańczowy telefon tarczowy RWT Aster oraz paprotka na lakierowanym kwietniku. 
        W kącie buczy żeberkowy kaloryfer, a w powietrzu unosi się woń papierosów Klubowych i wilgoci.
      `;

      const result = validateLocationMaterialDetails(description, 'prl-1970s');

      expect(result.isValid).toBe(true);
      expect(result.score).toBe(100);
      expect(result.era).toBe('prl-1970s');
      expect(result.detectedAnachronisms).toHaveLength(0);
    });

    it('wychwytuje anachronizmy w realiach PRL', () => {
      const description = `
        W pokoju hotelowym w Warszawie lat 70. gość sprawdza powiadomienia w laptopie przez Wi-Fi.
      `;

      const result = validateLocationMaterialDetails(description, 'prl-1970s');

      expect(result.isValid).toBe(false);
      expect(result.detectedAnachronisms.length).toBeGreaterThan(0);
    });
  });

  describe('Epoka wiktoriańska (1890s Gaslight)', () => {
    it('wymaga oświetlenia gazowego/naftowego i blokuje współczesną motoryzację', () => {
      const description = `
        Salon rozświetla blask lampy gazowej oraz trzaskający ogień w marmurowym kominku. 
        Za oknem słychać stukot kopyt dorożki na mokrym bruku. W sieni czuć chłód mglistego londyńskiego wieczoru.
      `;

      const result = validateLocationMaterialDetails(description, '1890s');

      expect(result.isValid).toBe(true);
      expect(result.score).toBe(100);
    });

    it('odrzuca samochody spalinowe w epoce wiktoriańskiej', () => {
      const description = `
        Przed wiktoriańską rezydencją parkuje nowoczesny samochód spalinowy. Lampa gazowa oświetla podjazd.
      `;

      const result = validateLocationMaterialDetails(description, '1890s');

      expect(result.isValid).toBe(false);
      expect(result.detectedAnachronisms).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/Powszechna motoryzacja w epoce wiktoriańskiej/i),
        ])
      );
    });
  });

  describe('Auto-korekta i wzbogacanie promptów obrazów (enrichImagePromptWithEraProps)', () => {
    it('wzbogaca prompt sceny o materialne rekwizyty lat 20. i usuwa smartfony', () => {
      const rawPrompt = 'Private investigator office at night, reading a secret dossier on desk with modern smartphone';
      const enriched = enrichImagePromptWithEraProps(rawPrompt, '1920s');

      expect(enriched).not.toMatch(/smartphone/i);
      expect(enriched).toMatch(/authentic 1920s interior details/i);
      expect(enriched).toMatch(/rotary or wall telephone/i);
      expect(enriched).toMatch(/cast iron radiator/i);
    });

    it('wzbogaca prompt lokacji dla realiów PRL lat 70.', () => {
      const rawPrompt = 'Police station reception desk, gray walls';
      const enriched = enrichImagePromptWithEraProps(rawPrompt, 'prl-1970s');

      expect(enriched).toMatch(/1970s Eastern European analog interior/i);
      expect(enriched).toMatch(/rotary phone/i);
      expect(enriched).toMatch(/period fluorescent lighting/i);
    });

    it('wzbogaca prompt lokacji wiktoriańskiej Gaslight', () => {
      const rawPrompt = 'Victorian study room with books';
      const enriched = enrichImagePromptWithEraProps(rawPrompt, '1890s');

      expect(enriched).toMatch(/Victorian setting/i);
      expect(enriched).toMatch(/gaslight or candle warmth/i);
      expect(enriched).toMatch(/open fireplace/i);
    });

    it('nie wstrzykuje mebli ani magnetofonów do scen plenerowych lat 80.', () => {
      const outdoorPrompt = 'Rural countryside landscape with old wooden barn in winter mist';
      const enriched = enrichImagePromptWithEraProps(outdoorPrompt, '1980s');

      expect(enriched).not.toMatch(/tape recorder/i);
      expect(enriched).not.toMatch(/interior/i);
      expect(enriched).not.toMatch(/cathode ray/i);
      expect(enriched).toMatch(/1980s analog exterior atmosphere/i);
    });

    it('stosuje profil portretowy dla portretów postaci', () => {
      const portraitPrompt = 'Portrait of weary priest with silver crucifix, head and shoulders shot';
      const enriched = enrichImagePromptWithEraProps(portraitPrompt, 'prl-1970s');

      expect(enriched).toMatch(/Eastern European portrait/i);
      expect(enriched).not.toMatch(/terrazzo|parquet|wall unit/i);
    });
  });

  describe('Generator instrukcji lokacji dla MG (buildLocationEraGuidanceSection)', () => {
    it('generuje wytyczne z nazwą lokacji i wymogiem materialnego tła', () => {
      const guidance = buildLocationEraGuidanceSection('1920s', 'Biblioteka Miskatonic');

      expect(guidance).toContain('Biblioteka Miskatonic');
      expect(guidance).toContain('MATERIALNE USER STORY');
      expect(guidance).toContain('ZASADA KONTRASTU');
      expect(guidance).toContain('STRAŻNIK ANACHRONIZMÓW');
      expect(guidance).toContain('ECHO AKCJI');
    });
  });
});

