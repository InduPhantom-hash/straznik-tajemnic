/**
 * location-era-validator.ts
 *
 * Automatyczny walidator opisów lokacji MG oraz wzbogacanie promptów obrazów:
 * 1. Materialnego User Story epoki (oświetlenie, ogrzewanie, łączność/technologia).
 * 2. Strażnika anachronizmów technologicznych dla danej ery.
 * 3. Zasady kontrastu (zwykłe tło vs flagowa anomalia Mitów).
 * 4. Auto-korekty i wzbogacania promptów obrazów o materialne rekwizyty epoki.
 *
 * @module location-era-validator
 */

import { resolveEraVisualProfile, type EraVisualProfile } from './era-visual-style';
import type { ResolvedEraContext } from '@/lib/era/types';

export interface LocationMaterialValidationResult {
  isValid: boolean;
  score: number; // 0 - 100
  era: EraVisualProfile;
  materialDetails: {
    hasLighting: boolean;
    hasHeatingOrSensory: boolean;
    hasPeriodInfrastructure: boolean;
    matchedTerms: string[];
  };
  detectedAnachronisms: string[];
  anomalyInflationDetected: boolean;
  issues: string[];
  recommendations: string[];
}

export interface ValidationOptions {
  isMythosSite?: boolean;
  strictMode?: boolean;
}

// ---------------------------------------------------------------------------
// Słowniki materialne epok z obsługą odmiany polskiej
// ---------------------------------------------------------------------------

const ERA_LIGHTING_PATTERNS: Record<EraVisualProfile, RegExp[]> = {
  '1890s': [/lamp[a-z]*\s+gazow[a-z]*/i, /lamp[a-z]*\s+naftow[a-z]*/i, /kinkiet[a-z]*/i, /świec[a-z]*/i, /płomie[a-z]*/i, /latarni[a-z]*\s+gazow[a-z]*/i, /żyrandol[a-z]*/i, /ogień|ognia/i],
  '1920s': [/lamp[a-z]*\s+naftow[a-z]*/i, /lamp[a-z]*\s+gazow[a-z]*/i, /żarów[a-z]*/i, /żarnik[a-z]*/i, /kinkiet[a-z]*/i, /abażur[a-z]*/i, /blask\s+lamp/i, /światł[ao]\s+latark/i, /świec[a-z]*/i, /lampa/i],
  '1930s': [/żarów[a-z]*/i, /lamp[a-z]*\s+biurkow[a-z]*/i, /neon[a-z]*/i, /kinkiet[a-z]*/i, /latark[a-z]*/i, /abażur[a-z]*/i, /świec[a-z]*/i],
  '1940s': [/żarów[a-z]*/i, /neon[a-z]*/i, /lamp[a-z]*\s+biurkow[a-z]*/i, /zaciemnieni[a-z]*/i, /latark[a-z]*/i, /kinkiet[a-z]*/i],
  '1950s': [/świetlów[a-z]*/i, /neon[a-z]*/i, /lamp[a-z]*\s+stojąc[a-z]*/i, /żarów[a-z]*/i, /abażur[a-z]*/i],
  'prl-1970s': [/świetlów[a-z]*/i, /neon[a-z]*/i, /żarów[a-z]*/i, /lamp[a-z]*\s+kreślarsk[a-z]*/i, /plafon[a-z]*/i, /matow[a-z]*\s+szkł[a-z]*/i],
  '1980s': [/świetlów[a-z]*/i, /halogen[a-z]*/i, /neon[a-z]*/i, /lamp[a-z]*\s+biurkow[a-z]*/i, /żarów[a-z]*/i],
  '1990s': [/halogen[a-z]*/i, /świetlów[a-z]*/i, /lampk[a-z]*/i, /żarów[a-z]*/i],
  '2000s': [/halogen[a-z]*/i, /świetlów[a-z]*/i, /diod[a-z]*/i, /żarów[a-z]*/i],
  modern: [/led[a-z]*/i, /halogen[a-z]*/i, /diod[a-z]*/i, /taśm[a-z]*\s+led/i, /reflektor[a-z]*/i, /światł[ao]\s+ekran/i],
};

const ERA_INFRASTRUCTURE_PATTERNS: Record<EraVisualProfile, RegExp[]> = {
  '1890s': [/telegraf[a-z]*/i, /powóz[a-z]*/i, /dorożk[a-z]*/i, /piec[a-z]*\s+kaflow[a-z]*/i, /kominek[a-z]*|kominku/i, /bali[a-z]*/i, /studni[a-z]*/i, /bruk[a-z]*/i, /drewnian[a-z]*/i],
  '1920s': [/telefon[a-z]*\s+(naścienn[a-z]*|tarczow[a-z]*|stacjonarn[a-z]*|z\s+słuchawk[a-z]*)/i, /telefon/i, /telegraf[a-z]*/i, /piec[a-z]*\s+kaflow[a-z]*/i, /żeliwn[a-z]*\s+kaloryfer[a-z]*/i, /kaloryfer/i, /maszyn[a-z]*\s+do\s+pisania/i, /gramofon[a-z]*/i, /radio[a-z]*\s+lampow[a-z]*/i, /automobil[a-z]*/i, /linoleum/i, /parkiet[a-z]*/i],
  '1930s': [/telefon[a-z]*/i, /radio[a-z]*/i, /maszyn[a-z]*\s+do\s+pisania/i, /kaloryfer[a-z]*/i, /piec[a-z]*/i, /wentylator[a-z]*/i],
  '1940s': [/radio[a-z]*/i, /telefon[a-z]*/i, /maszyn[a-z]*\s+do\s+pisania/i, /dalekopis[a-z]*/i, /kaloryfer[a-z]*/i],
  '1950s': [/telewizor[a-z]*/i, /radio[a-z]*/i, /telefon[a-z]*/i, /gramofon[a-z]*/i, /lodówk[a-z]*/i],
  'prl-1970s': [/telefon[a-z]*\s+tarczow[a-z]*/i, /telefon/i, /rwt/i, /aster/i, /meblościank[a-z]*/i, /paprotk[a-z]*/i, /lastryk[a-z]*/i, /syrenk[a-z]*/i, /fiat[a-z]*/i, /kaloryfer[a-z]*/i],
  '1980s': [/magnetofon[a-z]*/i, /kaset[a-z]*/i, /telefon[a-z]*/i, /telewizor[a-z]*/i, /radiomagnetofon[a-z]*/i],
  '1990s': [/faks[a-z]*/i, /komputer[a-z]*/i, /monitor[a-z]*\s+crt/i, /dyskietk[a-z]*/i, /telefon[a-z]*/i, /pager[a-z]*/i],
  '2000s': [/komputer[a-z]*/i, /telefon[a-z]*/i, /neostrad[a-z]*/i, /płyt[a-z]*\s+cd/i, /monitor[a-z]*/i],
  modern: [/smartfon[a-z]*/i, /laptop[a-z]*/i, /wi-?fi/i, /światłowód/i, /klimatyzacj[a-z]*/i, /terminal[a-z]*/i],
};

const ERA_ANACHRONISM_RULES: Record<EraVisualProfile, { pattern: RegExp; name: string }[]> = {
  '1890s': [
    { pattern: /\b(smartfon[a-z]*|smartphon[a-z]*|iphone[a-z]*|komórk[a-z]*|telefon[a-z]*\s+komórkow[a-z]*)\b/i, name: 'Smartfon / telefon komórkowy' },
    { pattern: /\b(laptop[a-z]*|tablet[a-z]*|komputer[a-z]*|internet[a-z]*)\b/i, name: 'Komputery i Internet' },
    { pattern: /\b(wi-?fi|bluetooth|powerbank[a-z]*|usb)\b/i, name: 'Łączność cyfrowa' },
    { pattern: /\b(led|diod[a-z]*\s+led|taśm[a-z]*\s+led)\b/i, name: 'Diody LED' },
    { pattern: /\b(samochód|samochod[a-z]*|auto|pojazd\s+spalinow[a-z]*)\b/i, name: 'Powszechna motoryzacja w epoce wiktoriańskiej' },
  ],
  '1920s': [
    { pattern: /\b(smartfon[a-z]*|smartphon[a-z]*|iphone[a-z]*|android[a-z]*|komórk[a-z]*|telefon[a-z]*\s+komórkow[a-z]*)\b/i, name: 'Smartfon / telefon komórkowy' },
    { pattern: /\b(laptop[a-z]*|tablet[a-z]*|komputer[a-z]*\s+osobist[a-z]*|internet[a-z]*)\b/i, name: 'Komputery współczesne' },
    { pattern: /\b(wi-?fi|bluetooth|powerbank[a-z]*|usb|ekran[a-z]*\s+dotykow[a-z]*)\b/i, name: 'Współczesna elektronika cyfrowa' },
    { pattern: /\b(led|diod[a-z]*\s+led|taśm[a-z]*\s+led)\b/i, name: 'Oświetlenie LED' },
    { pattern: /\b(telewizor[a-z]*|telewizj[a-z]*|kineskop[a-z]*|radar[a-z]*|laser[a-z]*)\b/i, name: 'Technologia po 1930 roku' },
  ],
  '1930s': [
    { pattern: /\b(smartfon[a-z]*|iphone[a-z]*|laptop[a-z]*|wi-?fi|led|powerbank[a-z]*)\b/i, name: 'Współczesna elektronika' },
  ],
  '1940s': [
    { pattern: /\b(smartfon[a-z]*|iphone[a-z]*|laptop[a-z]*|wi-?fi|led|powerbank[a-z]*|internet)\b/i, name: 'Elektronika XXI wieku' },
  ],
  '1950s': [
    { pattern: /\b(smartfon[a-z]*|iphone[a-z]*|laptop[a-z]*|wi-?fi|internet|smartwatch)\b/i, name: 'Technologia XXI wieku' },
  ],
  'prl-1970s': [
    { pattern: /\b(smartfon[a-z]*|iphone[a-z]*|android[a-z]*|komórk[a-z]*)\b/i, name: 'Smartfony' },
    { pattern: /\b(laptop[a-z]*|tablet[a-z]*|smartwatch[a-z]*)\b/i, name: 'Laptopy i urządzenia mobilne' },
    { pattern: /\b(wi-?fi|wifi|powerbank[a-z]*|lcd|oled)\b/i, name: 'Sieci bezprzewodowe i ekrany współczesne' },
    { pattern: /\b(ford\s+t|dorożk[a-z]*|powóz\s+konn[a-z]*)\b/i, name: 'Anachronizm przedwojenny w latach 70.' },
  ],
  '1980s': [
    { pattern: /\b(smartfon[a-z]*|iphone[a-z]*|android[a-z]*|wi-?fi|ekran\s+dotykow[a-z]*|powerbank[a-z]*)\b/i, name: 'Technologia XXI wieku' },
  ],
  '1990s': [
    { pattern: /\b(smartfon[a-z]*|iphone[a-z]*|android[a-z]*|ekran\s+dotykow[a-z]*|powerbank[a-z]*|smartwatch)\b/i, name: 'Smartfony i technologia po 2007 roku' },
  ],
  '2000s': [
    { pattern: /\b(iphone\s+1[0-9]|5g|smartwatch[a-z]*|chatgpt|asystent\s+ai)\b/i, name: 'Technologia po 2015 roku' },
  ],
  modern: [],
};

const INFLATION_ANOMALY_PATTERNS = [
  /nieeuklidesow/i,
  /sprzeczn[a-z]*\s+kąt/i,
  /kąt[a-z]*\s+przecząc[a-z]*\s+geometri/i,
  /bluźniercz[a-z]*\s+geometri/i,
  /pulsując[a-z]*\s+ciemność/i,
  /rozpad\s+czasoprzestrz/i,
];

// ---------------------------------------------------------------------------
// Główna funkcja walidująca
// ---------------------------------------------------------------------------

export function validateLocationMaterialDetails(
  description: string,
  eraOrYear?: string,
  options: ValidationOptions = {}
): LocationMaterialValidationResult {
  const profile = resolveEraVisualProfile(eraOrYear);
  const text = description.trim();
  const matchedTerms: string[] = [];
  const detectedAnachronisms: string[] = [];
  const issues: string[] = [];
  const recommendations: string[] = [];

  // 1. Sprawdzenie oświetlenia
  const lightingPatterns = ERA_LIGHTING_PATTERNS[profile] || [];
  let hasLighting = false;
  for (const pattern of lightingPatterns) {
    const match = text.match(pattern);
    if (match) {
      hasLighting = true;
      matchedTerms.push(match[0]);
    }
  }

  // 2. Sprawdzenie infrastruktury materialnej epoki
  const infraPatterns = ERA_INFRASTRUCTURE_PATTERNS[profile] || [];
  let hasPeriodInfrastructure = false;
  for (const pattern of infraPatterns) {
    const match = text.match(pattern);
    if (match) {
      hasPeriodInfrastructure = true;
      matchedTerms.push(match[0]);
    }
  }

  // 3. Sprawdzenie sensoryki termicznej / materialnej
  const sensoryPattern = /(chłód|chłod|ciepł|wilgo|mróz|mroz|stęch|zapach|woń|won|kurz|dym|przeciąg|skrzyp|swąd|fetor)/i;
  const sensoryMatch = text.match(sensoryPattern);
  const hasHeatingOrSensory = !!sensoryMatch;
  if (sensoryMatch) {
    matchedTerms.push(sensoryMatch[0]);
  }

  // 4. Detekcja anachronizmów
  const anachronismRules = ERA_ANACHRONISM_RULES[profile] || [];
  for (const rule of anachronismRules) {
    const match = text.match(rule.pattern);
    if (match) {
      detectedAnachronisms.push(`${rule.name} (znaleziono: "${match[0]}")`);
      issues.push(`Wykryto anachronizm dla epoki ${profile}: ${match[0]}`);
    }
  }

  // 5. Weryfikacja zasady kontrastu (Inflacja anomalii)
  let anomalyInflationDetected = false;
  if (!options.isMythosSite) {
    for (const pattern of INFLATION_ANOMALY_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        anomalyInflationDetected = true;
        issues.push(`Inflacja anomalii w zwykłej lokacji: użyto "${match[0]}" bez oznaczenia strefy mitycznej`);
        recommendations.push('Zastosuj zasadę kontrastu: zachowaj 80% realistycznego tła epoki, a anomalię ogranicz do 1 subtelnego punktu zaczepienia.');
        break;
      }
    }
  }

  // 6. Punktacja jakości User Story miejsca
  let score = 100;

  if (!hasLighting) {
    score -= 25;
    issues.push('Brak określonego źródła światła charakterystycznego dla epoki.');
    recommendations.push(`Dodaj informację o oświetleniu (np. dla ${profile}: lampa naftowa/gazowa, kinkiet, świeca lub wczesna żarówka).`);
  }

  if (!hasPeriodInfrastructure && profile !== 'modern') {
    score -= 25;
    issues.push('Brak materialnych detali wyposażenia / logistyki codzienności epoki.');
    recommendations.push('Wprowadź materialny rekwizyt (np. piec kaflowy, telefon naścienny, żeliwny kaloryfer, maszynę do pisania).');
  }

  if (!hasHeatingOrSensory) {
    score -= 15;
    issues.push('Brak zakotwiczenia sensoryczno-termicznego (temperatura, zapach, wilgoć).');
    recommendations.push('Uzupełnij opis o wrażenie termiczne lub zapachowe (np. chłód sieni, woń wilgotnego tynku).');
  }

  if (detectedAnachronisms.length > 0) {
    score -= 40 * detectedAnachronisms.length;
  }

  if (anomalyInflationDetected) {
    score -= 30;
  }

  score = Math.max(0, Math.min(100, score));
  const isValid = detectedAnachronisms.length === 0 && (!options.strictMode || score >= 60);

  return {
    isValid,
    score,
    era: profile,
    materialDetails: {
      hasLighting,
      hasHeatingOrSensory,
      hasPeriodInfrastructure,
      matchedTerms: Array.from(new Set(matchedTerms)),
    },
    detectedAnachronisms,
    anomalyInflationDetected,
    issues,
    recommendations,
  };
}

// ---------------------------------------------------------------------------
// Auto-korekta i wzbogacanie promptów obrazów o rekwizyty epoki
// ---------------------------------------------------------------------------

const ERA_MATERIAL_IMAGE_PROPS: Record<EraVisualProfile, string> = {
  '1890s': 'Victorian setting, authentic gaslight or candle warmth, polished dark wood, brass fittings, open fireplace, no modern technology',
  '1920s': 'authentic 1920s interior details, period desk lamp with green glass shade, rotary or wall telephone, cast iron radiator, heavy oak furnishings, strictly no modern electronics',
  '1930s': '1930s period aesthetic, art deco or depression era furnishings, vintage bakelite fittings, authentic analog atmosphere',
  '1940s': '1940s wartime noir atmosphere, period furniture, vintage analog props, muted lighting, no modern gadgets',
  '1950s': '1950s mid-century aesthetic, authentic retro materials, analog television or radio period fixtures',
  'prl-1970s': '1970s Eastern European analog interior, authentic Polish period decor, terrazzo or parquet, rotary phone, period fluorescent lighting, wooden wall unit, no modern digital devices',
  '1980s': '1980s analog interior, period cathode ray monitor or tape recorder, boxy aesthetic, no modern smartphones',
  '1990s': '1990s period interior, CRT monitor, chunky electronics, 90s analog atmosphere, no modern touchscreens',
  '2000s': 'early 2000s Y2K transition aesthetic, CRT or early LCD screens, feature flip phones, no modern smartphones',
  modern: 'contemporary authentic interior and architecture',
};

const ERA_OUTDOOR_IMAGE_PROPS: Record<EraVisualProfile, string> = {
  '1890s': 'Victorian setting, authentic late 19th century exterior architecture, cobblestone or dirt path, gas lamps or darkness, weathered brick or timber, no modern technology',
  '1920s': 'authentic 1920s exterior architecture, period streetlamps or natural moonlight, weathered period structures, strictly no modern electronics',
  '1930s': '1930s Great Depression era exterior architecture, weathered period structures, authentic analog atmosphere',
  '1940s': '1940s wartime noir exterior atmosphere, authentic period buildings, moody shadows, no modern gadgets',
  '1950s': '1950s mid-century exterior architecture, authentic vintage street textures, no modern electronics',
  'prl-1970s': '1970s Eastern European exterior atmosphere, authentic Polish period architecture, concrete, brick or rural wood, no modern digital devices',
  '1980s': '1980s analog exterior atmosphere, authentic period architecture, boxy geometry, no modern smartphones',
  '1990s': '1990s period exterior, authentic 90s analog atmosphere, authentic architecture, no modern touchscreens',
  '2000s': 'early 2000s transition exterior architecture, authentic early millennium atmosphere, no modern smartphones',
  modern: 'contemporary authentic exterior and architecture',
};

const ERA_PORTRAIT_IMAGE_PROPS: Record<EraVisualProfile, string> = {
  '1890s': 'Victorian era portrait, authentic late 19th century styling and clothing, period photographic character, no modern technology',
  '1920s': '1920s period portrait, authentic 1920s clothing and styling, vintage photographic plate character, strictly no modern electronics',
  '1930s': '1930s period portrait, Depression era attire, authentic analog portrait character',
  '1940s': '1940s noir portrait, wartime period attire, dramatic analog portrait lighting, no modern gadgets',
  '1950s': '1950s mid-century portrait, authentic retro styling, vintage portrait character',
  'prl-1970s': '1970s Eastern European portrait, authentic Polish period attire and styling, analog film character, no modern digital devices',
  '1980s': '1980s analog portrait, authentic period attire and styling, 35mm film character, no modern smartphones',
  '1990s': '1990s analog portrait, authentic 90s clothing and hair, authentic 90s film character, no modern touchscreens',
  '2000s': 'early 2000s portrait, authentic early millennium styling and clothing, no modern smartphones',
  modern: 'contemporary portrait photography, authentic styling',
};

const ENGLISH_ANACHRONISM_CLEANERS: Record<EraVisualProfile, RegExp[]> = {
  '1890s': [/\b(smartphone|iphone|cell phone|mobile phone|laptop|tablet|computer|led lights?|plastic|wifi|wi-fi)\b/gi, /\b(car|automobile|sedan|truck)\b/gi],
  '1920s': [/\b(smartphone|iphone|android|cell phone|mobile phone|laptop|tablet|pc|computer|led|leds|touchscreen|powerbank|usb|wifi|wi-fi|bluetooth)\b/gi, /\b(tv|television|laser|radar)\b/gi],
  '1930s': [/\b(smartphone|iphone|laptop|tablet|led|wifi|wi-fi|powerbank)\b/gi],
  '1940s': [/\b(smartphone|iphone|laptop|led|wifi|wi-fi|powerbank|internet)\b/gi],
  '1950s': [/\b(smartphone|iphone|laptop|wifi|wi-fi|smartwatch)\b/gi],
  'prl-1970s': [/\b(smartphone|iphone|android|laptop|tablet|smartwatch|wifi|wi-fi|lcd|oled|led)\b/gi, /\b(ford model t|horse carriage)\b/gi],
  '1980s': [/\b(smartphone|iphone|android|wifi|wi-fi|touchscreen|smartwatch)\b/gi],
  '1990s': [/\b(smartphone|iphone|android|touchscreen|smartwatch|5g)\b/gi],
  // Rok 2000-2007: smartphone/powerbank jeszcze nie istnieja (feature phones),
  // ale nowoczesne marki/standardy juz tak.
  '2000s': [/\b(smartphone|powerbank|android|iphone 1[0-9]|smartwatch|5g|chatgpt|ai assistant)\b/gi],
  modern: [],
};

/**
 * Automatyczna auto-korekta i wzbogacenie promptu obrazów o materialne rekwizyty epoki.
 * Usuwa ewentualne przypadkowe anachronizmy i dodaje charakterystyczne detale materialne
 * z uwzględnieniem typu sceny (plener vs wnętrze vs portret).
 */
export function enrichImagePromptWithEraProps(
  imagePrompt: string,
  eraOrYear?: string | ResolvedEraContext,
  sceneTypeHint?: 'interior' | 'exterior' | 'portrait'
): string {
  const profile = resolveEraVisualProfile(eraOrYear);
  let cleaned = imagePrompt.trim();

  // 1. Oczyszczanie ze słów-anachronizmów
  const cleaners = ENGLISH_ANACHRONISM_CLEANERS[profile] || [];
  for (const regex of cleaners) {
    cleaned = cleaned.replace(regex, '');
  }
  cleaned = cleaned.replace(/\s{2,}/g, ' ').replace(/,\s*,/g, ',').trim();
  if (cleaned.endsWith(',')) cleaned = cleaned.slice(0, -1).trim();

  // 2. Rozpoznanie typu sceny (interior vs exterior vs portrait)
  let eraProps: string | undefined;
  const isPortrait =
    sceneTypeHint === 'portrait' ||
    /\b(portrait|head and shoulders|close-up portrait|bust portrait|face of)\b/i.test(cleaned);

  const isInterior =
    sceneTypeHint === 'interior' ||
    (!isPortrait &&
      /\b(interior|office|desk|room|study|parlor|bedroom|kitchen|basement|attic|cellar|hall|corridor|library|laboratory|reception|clinic|hospital room|parish|cabin|apartment|flat|inside|indoor)\b/i.test(cleaned));

  if (isPortrait) {
    eraProps = ERA_PORTRAIT_IMAGE_PROPS[profile];
  } else if (isInterior) {
    eraProps = ERA_MATERIAL_IMAGE_PROPS[profile];
  } else {
    eraProps = ERA_OUTDOOR_IMAGE_PROPS[profile];
  }

  if (!eraProps) return cleaned;

  return `${cleaned}, ${eraProps}`;
}

/**
 * Generuje blok instrukcji dla MG dotyczący materialnego User Story i kontrastu epoki.
 */
export function buildLocationEraGuidanceSection(
  eraOrYear: string | ResolvedEraContext | undefined,
  currentLocation?: string
): string {
  const profile = resolveEraVisualProfile(eraOrYear);
  const locationTag = currentLocation ? ` w lokacji "${currentLocation}"` : '';

  // Z ResolvedEraContext kotwiczymy scenę w konkretnym roku i regionie -
  // bez tego wytyczne zostają ogólne i MG może dryfować poza erę przygody.
  const contextAnchor =
    eraOrYear && typeof eraOrYear === 'object'
      ? `0. KONTEKST SCENY: ${eraOrYear.effectiveYear}, ${eraOrYear.countryCode} - wszystkie realia materialne, technologia i marki kotwicz w tym roku i regionie.\n`
      : '';

  return (
    `\n## MATERIALNE USER STORY I KONTRAST EPOKI (${profile.toUpperCase()})\n` +
    contextAnchor +
    `1. MATERIALNE TŁO: Opisując przestrzeń${locationTag}, ZAWSZE zakotwicz scenę w realiach materialnych epoki (określ źródło światła: lampa naftowa/gazowa/żarówka, ogrzewanie: piec kaflowy/kaloryfer, oraz łączność: telefon naścienny/tarczowy/brak telefonu).\n` +
    `2. ZASADA KONTRASTU: Zachowaj 80% realistycznego, namacalnego tła. Anomalię i niepokój wprowadzaj jako JEDEN wyraźny punkt zaczepienia (flagowy trop), zamiast zniekształcać każdy zwykły pokój.\n` +
    `3. STRAŻNIK ANACHRONIZMÓW: Bezwzględny zakaz wtrącania technologii późniejszych (dla lat 20. brak smartfonów, plastiku, komputerów, LED; dla lat 70. brak smartfonów i ekranów LCD).\n` +
    `4. ECHO AKCJI: W [MYŚLI_MG] uwzględniaj, jak otoczenie, świadkowie i prasa zareagują na głośne czyny badacza.`
  );
}
