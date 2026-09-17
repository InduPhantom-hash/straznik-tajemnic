import type { EraManifestV1, EraRegionProfile } from './types';

const PENDING_SOURCE = {
  id: 'source-review-required',
  title: 'Źródła wymagają przeglądu i akceptacji PO',
  trustLevel: 'curated' as const,
  url: 'internal://historical-source-review-required',
  retrievedAt: '2026-08-31',
  contentHash: 'pending',
  usageRights: 'metadata-only',
  verificationStatus: 'pending' as const,
};

function draftManifest(
  id: string,
  title: string,
  validFrom: number,
  validTo: number,
  countryCode: string,
  regionProfile: EraRegionProfile,
  forbidden: string[],
  visualDirection: string[]
): EraManifestV1 {
  return {
    schemaVersion: 1,
    id,
    title,
    validFrom,
    validTo,
    exactYearRequired: validFrom !== validTo,
    countryCodes: [countryCode],
    regionProfiles: [regionProfile],
    economicBackground: [],
    socialAndClassStructure: [],
    politicalSituation: [],
    racismAndExclusion: [],
    genderRolesAndRights: [],
    technology: [],
    law: [],
    customs: [],
    occupations: [],
    communication: [],
    transport: [],
    architecture: [],
    periodKnowledgeAndLimits: [],
    language: [],
    visualDirection,
    forbidden,
    presentismRisks: [
      'Nie przedstawiaj współczesnych praw, kategorii społecznych ani dostępu do zawodów jako normy historycznej.',
      'Nietypową rolę społeczną opisuj przez realny kontekst, bariery i wyjątki danej epoki.',
    ],
    sources: [PENDING_SOURCE],
    approvalStatus: 'draft',
  };
}

const US_1920S_SOURCE = {
  id: 'keeper-rulebook-7e',
  title: 'Księga Strażnika, Zew Cthulhu 7. edycja, Black Monk Games (s. 43-45, 107, 206-226, 447-449)',
  trustLevel: 'primary' as const,
  url: 'internal://coc7e-keeper-rulebook-black-monk',
  retrievedAt: '2026-09-16',
  contentHash: 'black-monk-coc7e-raw-v1',
  usageRights: 'official-rules-reference',
  verificationStatus: 'verified' as const,
};

export const US_1920S_APPROVED_MANIFEST: EraManifestV1 = {
  schemaVersion: 1,
  id: 'us-1920s',
  title: 'USA 1920s (Classic Call of Cthulhu 7e RAW)',
  validFrom: 1920,
  validTo: 1929,
  exactYearRequired: false,
  countryCodes: ['US', 'USA'],
  regionProfiles: ['US'],
  economicBackground: [
    'Powojenny boom gospodarczy ("Roaring Twenties"), rosnący konsumpcjonizm i rozwój sprzedaży ratalnej.',
    'Standard życia badacza powiązany z cechą Majętność (Księga Strażnika CoC 7e, s. 43).',
    'Codzienne wydatki w ramach standardu życia nie wymagają drobiazgowego rozliczania każdego dolara (Księga Strażnika CoC 7e, s. 107).',
    'Waluta: Dolar amerykański (USD, $). Obieg gotówkowy i czeki bankowe.',
    'Ceny z epoki: gazeta $0.05, obiad w restauracji $0.50-$1.50, nocleg w hotelu $2-$5, garnitur $20-$40, Ford Model T $300-$400 (Księga Strażnika CoC 7e, s. 447-449).',
  ],
  socialAndClassStructure: [
    'Podział klasowy: elita Wschodniego Wybrzeża, klasa średnia, robotnicy fabryczni oraz społeczności imigranckie.',
    'Silna obecność społeczności imigranckich (irlandzkiej, włoskiej, żydowskiej, polskiej, niemieckiej) w miastach.',
    'Prohibicja (18. Poprawka, Ustawa Volsteada od 1920 r.) - nielegalny handel alkoholem, speakeasies, wojny gangów.',
  ],
  politicalSituation: [
    'Rządy republikańskie, izolacjonizm międzynarodowy i polityka leseferyzmu.',
    'Strach przed komunizmem i anarchizmem (Red Scare, naloty Palmera).',
    'Restrykcyjne ustawy imigracyjne (Emergency Quota Act 1921, Immigration Act 1924).',
  ],
  racismAndExclusion: [
    'Segregacja rasowa na Południu (prawa Jima Crowa) oraz uprzedzenia etniczne.',
    'Zgodnie z Księgą Strażnika CoC 7e (s. 206) uprzedzenia stanowią tło diegetyczne, a nie powód do mechanicznego karania postaci badaczy.',
  ],
  genderRolesAndRights: [
    '19. Poprawka do Konstytucji (1920 r.) gwarantuje kobietom prawo głosu w USA.',
    'Zjawisko Flapper w miastach; kobiety obecne na uniwersytetach i w wolnych zawodach (dziennikarki, badaczki, lekarki).',
  ],
  technology: [
    'Elektryczność powszechna w miastach; oświetlenie naftowe i gazowe na prowincji.',
    'Rozwój radia komercyjnego (od 1920 r.), gramofony płytowe 78 obr./min.',
    'Kino nieme niezwykle popularne; pierwsze filmy dźwiękowe pod koniec dekady (1927 r.).',
  ],
  law: [
    'Prohibicja federalna: posiadanie i obrót alkoholem to przestępstwo federalne.',
    'Policja miejska borykająca się z korupcją speakeasy; biura szeryfów w hrabstwach.',
    'BOI (Bureau of Investigation, zalążek FBI) od 1924 r. pod J. Edgarem Hooverem.',
  ],
  customs: [
    'Kultura jazzu, tańce Charleston, tajne kluby speakeasy z jazzbandami.',
    'Męskie kluby dżentelmeńskie, loże masońskie i stowarzyszenia braterskie.',
    'Etykieta wizytowa, kapelusze (fedora, panama) i garnitury noszone obowiązkowo w miejscach publicznych.',
  ],
  occupations: [
    'Zawody klasyczne CoC 7e (s. 44): Antykwariusz, Archeolog, Autor, Detektyw prywatny, Dziennikarz, Dylatant, Policjant, Lekarz, Prawnik, Profesor/Naukowiec.',
  ],
  communication: [
    'Telefon stacjonarny przez operatora/centralę ręczną; budki miejskie.',
    'Telegram Western Union - najszybsza komunikacja na dystans.',
    'Poczta tradycyjna i kolejowa (Railway Post Office) z doręczeniem 1-2 razy dziennie.',
  ],
  transport: [
    'Automobile powszechne (Ford Model T, Dodge, Buick, Packard). Prędkość 35-50 km/h.',
    'Kolej pasażerska parowa to krwioobieg kraju (komfortowe pociągi ekspresowe).',
    'Tramwaje miejskie elektryczne.',
    'Statki transatlantyckie parowe (5-7 dni do Europy).',
  ],
  architecture: [
    'Styl Art Déco i neogotyk w miastach; kamienice brownstones z klatkami pożarowymi.',
    'Miasteczka Nowej Anglii: drewniane domy kolonialne clapboard, strome dachy.',
  ],
  periodKnowledgeAndLimits: [
    'Medycyna sądowa: daktyloskopia tuszowa, grupy krwi A/B/O, sekcja zwłok. Brak badań DNA.',
    'Archiwa: katalogi fiszkowe w bibliotekach, mikrofilmy i roczniki prasowe.',
  ],
  language: [
    'Język z lat 20. XX w. bez współczesnych terminów cyfrowych czy slangu internetowego.',
    'Określenia z epoki: automobil, telegram, centrala, dżentelmen, speakeasy.',
  ],
  visualDirection: [
    'Dokumentalna fotografia z lat 20. XX w., sepiowe i czarno-białe kadry, światło żarowe i gazowe.',
    'Wełniane garnitury, kapelusze fedora, sukienki z obniżonym stanem.',
  ],
  forbidden: [
    'smartfon',
    'telefon komórkowy',
    'komputer osobisty',
    'laptop',
    'tablet',
    'internet',
    'wi-fi',
    'gps',
    'analiza DNA',
    'cyfrowy monitoring',
    'kamery CCTV',
    'tworzywa sztuczne ABS',
  ],
  presentismRisks: [
    'Nie przedstawiaj współczesnych praw, technologii cyfrowych ani natychmiastowego dostępu do danych.',
    'Poszlaki wymagają fizycznego zbadania: wizyty w archiwum, rozmowy ze świadkiem lub oględzin.',
    'Nie stosuj automatycznych kar mechanicznych za tożsamość historyczną badacza.',
  ],
  sources: [US_1920S_SOURCE],
  approvalStatus: 'approved',
};

export const ERA_MANIFESTS_V1: readonly EraManifestV1[] = [
  draftManifest(
    'gb-1890s',
    'Wielka Brytania 1890s',
    1890,
    1899,
    'GB',
    'GB',
    ['smartfon', 'samochód produkowany seryjnie jako powszechny środek transportu', 'radio domowe'],
    ['dokumentalny realizm późnej epoki wiktoriańskiej', 'materiały i konstrukcje właściwe dokładnemu rokowi']
  ),
  US_1920S_APPROVED_MANIFEST,
  draftManifest(
    'pl-1973-1974',
    'Polska 1973-1974',
    1973,
    1974,
    'PL',
    'PL',
    ['smartfon', 'internet', 'laptop', 'współczesne polskie oznakowanie'],
    ['analogowa fotografia', 'polskie rekwizyty i architektura początku lat 70.']
  ),
  draftManifest(
    'pl-1980s',
    'Polska 1980s',
    1980,
    1989,
    'PL',
    'PL',
    ['smartfon', 'internet konsumencki', 'współczesny laptop', 'współczesne samochody'],
    ['fotografia analogowa', 'polskie realia konkretnego roku lat 80.']
  ),
  draftManifest(
    'pl-1990s',
    'Polska 1990s',
    1990,
    1999,
    'PL',
    'PL',
    ['smartfon', 'media społecznościowe', 'współczesny ultrabook', 'samochody po roku sceny'],
    ['fotografia analogowa lub wczesna cyfrowa', 'realia transformacji właściwe dokładnemu rokowi']
  ),
  draftManifest(
    'pl-2000-2005',
    'Polska 2000-2005',
    2000,
    2005,
    'PL',
    'PL',
    ['smartfon', 'tablet', 'powerbank', 'współczesny ultrabook', 'media społecznościowe przed ich dostępnością'],
    ['wczesna fotografia cyfrowa lub analogowa', 'sprzęt i samochody dostępne w dokładnym roku']
  ),
  draftManifest(
    'global-contemporary',
    'Współczesność',
    2006,
    2026,
    'ZZ',
    'GLOBAL',
    ['technologia wprowadzona po dokładnym roku sceny'],
    ['współczesny dokumentalny realizm', 'region i rok ważniejsze od ogólnej etykiety modern']
  ),
] as const;

export function findEraManifest(
  year: number,
  countryCode: string,
  regionProfile: EraRegionProfile
): EraManifestV1 | null {
  return (
    ERA_MANIFESTS_V1.find(
      (manifest) =>
        year >= manifest.validFrom &&
        year <= manifest.validTo &&
        (manifest.countryCodes.includes(countryCode) ||
          manifest.regionProfiles.includes(regionProfile))
    ) ?? null
  );
}
