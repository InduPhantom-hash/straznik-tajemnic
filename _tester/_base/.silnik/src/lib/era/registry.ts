import type {
  EraAvailabilityWindow,
  EraRegionProfile,
  EraRuleProfile,
} from './types';

const PENDING_SOURCE = {
  id: 'historical-source-required',
  title: 'Do uzupełnienia źródłem historycznym przed publikacją',
  kind: 'internal' as const,
  verificationStatus: 'pending' as const,
};

/**
 * Profile startowe służą do zatwierdzenia struktury rejestru w Fazie 1.
 * Ich status pozostaje draft, dopóki PO nie zatwierdzi treści i źródeł.
 */
export const ERA_RULE_PROFILES: EraRuleProfile[] = [
  {
    id: 'us-1920',
    title: 'USA, rok 1920',
    validFrom: 1920,
    validTo: 1929,
    regions: ['US'],
    technology: [
      'elektryczność miejska',
      'radio jako rozwijająca się technologia',
    ],
    communication: ['telefon stacjonarny', 'telegram', 'list'],
    transport: ['pociąg', 'samochód z epoki', 'statek parowy'],
    clothing: [
      'garnitury i płaszcze z początku lat 20.',
      'kapelusze codzienne',
    ],
    architecture: [
      'kamienica miejska',
      'drewniana zabudowa regionalna',
      'wczesne instalacje elektryczne',
    ],
    mediaAndDocuments: ['gazeta drukowana', 'telegram', 'maszynopis'],
    institutionsAndLanguage: [
      'policja lokalna',
      'prasa drukowana',
      'język bez współczesnych terminów cyfrowych',
    ],
    visualDirection: ['fotografia z epoki', 'materiały i kroje z lat 20.'],
    forbidden: [
      'telefon komórkowy',
      'smartfon',
      'powerbank',
      'komputer osobisty',
    ],
    sources: [PENDING_SOURCE],
    confidence: 'medium',
    approvalStatus: 'draft',
  },
  {
    id: 'pl-1973',
    title: 'Polska, rok 1973',
    validFrom: 1973,
    validTo: 1974,
    regions: ['PL'],
    technology: [
      'analogowy sprzęt domowy',
      'telewizor kineskopowy',
      'radio tranzystorowe',
    ],
    communication: ['telefon stacjonarny', 'telegram', 'list'],
    transport: ['kolej', 'PKS', 'samochód z epoki PRL'],
    clothing: [
      'kroje i materiały początku lat 70.',
      'brak współczesnej odzieży technicznej',
    ],
    architecture: [
      'blok mieszkalny PRL',
      'zakład pracy',
      'starsza zabudowa miejska i wiejska',
    ],
    mediaAndDocuments: [
      'prasa drukowana',
      'legitymacja',
      'maszynopis urzędowy',
    ],
    institutionsAndLanguage: ['milicja', 'zakład pracy', 'urząd państwowy'],
    visualDirection: [
      'analogowa fotografia kolorowa lub czarno-biała',
      'polskie rekwizyty regionalne',
    ],
    forbidden: [
      'telefon komórkowy',
      'smartfon',
      'powerbank',
      'internet',
      'laptop',
    ],
    sources: [PENDING_SOURCE],
    confidence: 'medium',
    approvalStatus: 'draft',
  },
  {
    id: 'pl-2001',
    title: 'Polska, rok 2001',
    validFrom: 2000,
    validTo: 2006,
    regions: ['PL'],
    technology: [
      'komputer stacjonarny CRT',
      'VHS',
      'aparat analogowy lub wczesny cyfrowy',
    ],
    communication: [
      'telefon stacjonarny',
      'telefon komórkowy z klawiaturą',
      'SMS',
      'internet modemowy',
    ],
    transport: ['samochód z przełomu lat 90. i 2000', 'kolej', 'autobus'],
    clothing: ['kroje końca lat 90. i początku lat 2000.'],
    architecture: [
      'wnętrza po transformacji ustrojowej',
      'reklamy i szyldy z początku lat 2000.',
    ],
    mediaAndDocuments: [
      'gazeta drukowana',
      'kaseta VHS',
      'dyskietka',
      'wydruk komputerowy',
    ],
    institutionsAndLanguage: [
      'policja',
      'lokalna prasa i telewizja',
      'bez terminów mediów społecznościowych',
    ],
    visualDirection: [
      'wczesna fotografia cyfrowa lub analogowa',
      'brak współczesnych urządzeń dotykowych',
    ],
    forbidden: [
      'smartfon',
      'iPhone',
      'powerbank',
      'tablet',
      'współczesny laptop ultrabook',
    ],
    sources: [PENDING_SOURCE],
    confidence: 'medium',
    approvalStatus: 'draft',
  },
];

export function isAvailableInEra(
  window: EraAvailabilityWindow,
  year: number,
  region: EraRegionProfile
): boolean {
  const yearMatches = year >= window.validFrom && year <= window.validTo;
  const regionMatches =
    !window.regions?.length ||
    window.regions.includes('GLOBAL') ||
    window.regions.includes(region);
  return yearMatches && regionMatches;
}

export function findEraRuleProfiles(
  year: number,
  region: EraRegionProfile
): EraRuleProfile[] {
  return ERA_RULE_PROFILES.filter((profile) =>
    isAvailableInEra(profile, year, region)
  );
}
