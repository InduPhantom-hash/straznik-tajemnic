/**
 * era-guardrail.ts - Lokalna bramka filtracji kosztów, zapytań mechanicznych i anachronizmów epoki (Issue #508)
 *
 * Odcina zbędne wywołania Gemini dla zapytań czysto technicznych (ekwipunek, zasięg broni, zasady)
 * oraz natychmiastowo koryguje twarde anachronizmy technologiczne epoki w czasie < 25 ms,
 * przy zerowym zużyciu tokenów i kosztów API.
 */

import type { Character } from '@/lib/types';
import type { ResolvedEraContext } from '@/lib/era/types';
import {
  isWeapon,
  inferWeaponSkill,
  inferWeaponDamage,
  isMeleeWeapon,
} from '@/lib/combat/weapon-context';
import { resolveTestValue } from '@/lib/skill-test-resolver';
import { formatEquipment } from '@/lib/command-handler';

export type EraGuardrailCategory =
  | 'anachronism'
  | 'equipment'
  | 'weapon_specs'
  | 'dice_rules';

export interface EraGuardrailResult {
  blocked: boolean;
  category: EraGuardrailCategory;
  response: string;
  matchedPattern?: string;
  alternatives?: string[];
  executionTimeMs: number;
}

export interface EvaluateEraGuardrailOptions {
  message: string;
  character?: Character | null;
  locale?: 'pl' | 'en';
  eraContext?: ResolvedEraContext | null;
}

// ============================================================================
// 1. WZORCE TWARDYCH ANACHRONIZMÓW TECHNOLOGICZNYCH
// ============================================================================

interface AnachronismPatternGroup {
  id: 'telecom' | 'internet' | 'transport' | 'finance' | 'modern_tech';
  labelPl: string;
  labelEn: string;
  regex: RegExp;
  alternativesPl: string[];
  alternativesEn: string[];
}

const ANACHRONISM_GROUPS: AnachronismPatternGroup[] = [
  {
    id: 'telecom',
    labelPl: 'urządzenie mobilne / smartfon / nowoczesna łączność',
    labelEn: 'mobile device / smartphone / modern telecom',
    regex:
      /(?:\b|^|\s)(?:smartfon[a-z]*|smartphon[a-z]*|iphone[a-z]*|ajfon[a-z]*|android(?:a)?|tablet(?:em|u|y)?|ipad(?:a)?|laptop(?:em|a|y)?|smartwatch(?:em|a)?|smartband|powerbank[a-z]*|cell\s*phone|mobile\s*phone|sms(?:-?a|y|ów)?)(?:\b|$|\s)|(?:telefon(?:u|em|ie)?\s+komórkow[a-z]*)|(?:dzwoni[ęe]\s+z\s+komórki|wyciągam\s+(?:komórkę|telefon\s+komórkowy|smartfon|iphone)|wyjmuję\s+(?:komórkę|telefon\s+komórkowy|smartfon|iphone)|biorę\s+(?:komórkę|smartfon|iphone)|sprawdzam\s+w\s+(?:telefonie|smartfonie)|sprawdzam\s+komórk[ęe]|pisz[ęe]\s+sms|wysyłam\s+sms)/i,
    alternativesPl: [
      'Użyj telegrafu na poczcie miejskiej',
      'Zadzwoń z budki telefonicznej przez centralę operatora',
      'Wyślij posłańca z ekspresowym telegramem',
    ],
    alternativesEn: [
      'Use the municipal telegraph at the post office',
      'Call from a public telephone booth via switchboard operator',
      'Send a messenger boy with an urgent telegram',
    ],
  },
  {
    id: 'internet',
    labelPl: 'sieć internetowa / social media / wyszukiwarka',
    labelEn: 'internet / social media / search engine',
    regex:
      /(?:\b|^|\s)(?:wi[- ]?fi|hotspot|bluetooth|internet[a-z]*|sieci\s+internetowej|przeglądark[a-z]*|google|googluj[a-z]*|wygoogl[a-z]*|wikipedia|wikipedi[a-z]*|tik\s*tok|instagram[a-z]*|facebook[a-z]*|social\s*media|twitter|reddit|discord|youtube)(?:\b|$|\s)|(?:sprawdzam\s+w\s+(?:google|internecie|wikipedii)|wrzucam\s+(?:posta|filmik|na\s+tiktoka|na\s+insta))|(?:browse\s+the\s+web|search\s+online|google\s+it)/i,
    alternativesPl: [
      'Przeszukaj archiwum miejskiej gazety (np. Arkham Advertiser)',
      'Skorzystaj z katalogów i księgozbioru biblioteki uniwersyteckiej',
      'Zasięgnij języka u barmana lub w lokalnej kawiarni',
    ],
    alternativesEn: [
      'Search the municipal newspaper archives',
      'Consult the university library catalogs and reference books',
      'Inquire discreetly at a local cafe or speakeasy',
    ],
  },
  {
    id: 'transport',
    labelPl: 'współczesna usługa transportowa',
    labelEn: 'modern rideshare / transport service',
    regex:
      /(?:\b|^|\s)(?:uber(?:a|em)?|zamawiam\s+ubera|zamawiam\s+bolta|jadę\s+boltem|aplikacj[a-z]*\s+bolt|bolt\s+taxi|taxi\s+bolt|lyft(?:a|em)?|carsharing|taxi\s+z\s+aplikacji)(?:\b|$|\s)/i,
    alternativesPl: [
      'Złap miejską dorożkę (dryndę)',
      'Wynajmij żółtą taksówkę Ford T',
      'Wsiądź w tramwaj miejski lub pociąg (banę)',
    ],
    alternativesEn: [
      'Hail a horse-drawn cab',
      'Hire a yellow Ford Model T taxi',
      'Board the municipal streetcar or train',
    ],
  },
  {
    id: 'finance',
    labelPl: 'elektroniczne płatności / współczesny handel',
    labelEn: 'electronic payments / modern retail',
    regex:
      /(?:\b|^|\s)(?:blik(?:iem)?|płacę\s+blikiem|płatność\s+zbliżeniow[a-z]*|kart[aąę]\s+(?:zbliżeniow[a-z]*|płatnicz[a-z]*|bankomatow[a-z]*|kredytow[a-z]*)|terminal\s+płatnicz[a-z]*|bankomat(?:u|em|y)?|paczkomat[a-z]*|inpost|do\s+żabki|w\s+żabce|do\s+biedronki|w\s+biedronce|sklep(?:ie|u)?\s+(?:żabka|biedronka|lidl)|hot[- ]?dog\s+z\s+żabki|supermarket[a-z]*|hipermarket[a-z]*)(?:\b|$|\s)/i,
    alternativesPl: [
      'Zapłać brzęczącą gotówką (dolarami / złotymi) lub wypisz czek bankowy',
      'Odwiedź lokalny sklep kolonialny, aptekę lub zakład rzemieślniczy',
      'Kup zapasy na miejskim targowisku lub bazarze',
    ],
    alternativesEn: [
      'Pay with cash banknotes / silver coins or write a bank draft',
      'Visit a local dry goods store, apothecary, or corner mercantile',
      'Buy provisions at the open municipal market',
    ],
  },
  {
    id: 'modern_tech',
    labelPl: 'nowoczesna technologia / materiał anachroniczny',
    labelEn: 'modern technology / synthetic material',
    regex:
      /(?:\b|^|\s)(?:gps|nawigacj[aęeioóy]\s+gps|satelit[a-z]*|nylon[a-z]*|laser[a-z]*|celownik\s+laserow[a-z]*|dron(?:a|em|y|ów)?\s+z\s+kamerą|wypuszczam\s+drona|quadcopter|wsiadam\s+do\s+tesli|jadę\s+tesl[aąę]|samochód\s+tesla|auto\s+tesla|elektryczn[a-z]*\s+tesla|noktowizor\s+cyfrow[a-z]*|taser[a-z]*|paralizator[a-z]*)(?:\b|$|\s)/i,
    alternativesPl: [
      'Skorzystaj z papierowej mapy, planu miasta lub kompasu',
      'Użyj mosiężnej latarki naftowej lub elektrycznej latarki na baterie',
      'Użyj solidnej liny konopnej lub skórzanych rzemieni',
    ],
    alternativesEn: [
      'Consult a paper map, town street guide, or magnetic compass',
      'Use a brass kerosene lantern or early battery flashlight',
      'Use sturdy hemp rope or leather straps',
    ],
  },
];

// ============================================================================
// 2. WZORCE ZAPYTAŃ MECHANICZNYCH / TECHNICZNYCH
// ============================================================================

const NARRATIVE_ACTION_INDICATOR =
  /(?:\b(?:strzelam|atakuj[ęe]|celuj[ęe]|biegn[ęe]|uciekam|rzucam|otwieram|podnosz[ęe]|chowam|pakuj[ęe]|zabieram|bior[ęe]|wyjmuj[ęe]|wyciągam|shoot|fire|attack|aim|run|flee|throw|pack|take|grab|hide)\b)/i;

const EQUIPMENT_EXPLICIT_QUERY =
  /^(?:\/)?(?:mój\s+)?(?:inwentarz|ekwipunek|equipment|inventory)[\s?!.]*$/i;

const EQUIPMENT_QUERY_PATTERN =
  /(?:co\s+(?:ze\s+sobą\s+)?(?:nios[ęe]|mam)|co\s+mam\s+(?:w\s+kieszeniach|przy\s+sobie|w\s+ekwipunku|w\s+plecaku|ze\s+sobą|w\s+inwentarzu)|jaki\s+mam\s+ekwipunek|pokaż\s+(?:mój\s+)?ekwipunek|mój\s+ekwipunek|stan\s+ekwipunku|sprawdź\s+ekwipunek|sprawdzam\s+(?:swój\s+)?ekwipunek|sprawdzam\s+kieszenie|co\s+posiadam|lista\s+przedmiotów|what\s+(?:do\s+i\s+have|is\s+in\s+my\s+inventory|is\s+in\s+my\s+pockets)|show\s+(?:my\s+)?equipment|check\s+inventory)/i;

const WEAPON_SPECS_QUERY_PATTERN =
  /(?:jaki\s+(?:jest\s+|mam\s+)?zasięg|zasięg\s+(?:mojej\s+|mojego\s+)?(?:broni|pistoletu|rewolweru|karabinu|strzelby|colta)|zasięg\s+broni|ile\s+(?:metrów|jardów|kroków)\s+zasięgu|z\s+jakiej\s+odległości\s+mogę\s+strzelić|jakie\s+obrażenia\s+(?:ma|zadaje)\s+(?:moja\s+|mój\s+)?(?:broń|pistolet|rewolwer|karabin|strzelba|colt)?|obrażeni[a-z]*\s+(?:mojej\s+|mojego\s+)?(?:broni|pistoletu|rewolweru|karabinu|strzelby)|parametry\s+broni|statystyki\s+broni|weapon\s+range|range\s+of\s+(?:my\s+)?weapon|damage\s+of\s+(?:my\s+)?weapon|what\s+is\s+(?:my\s+|the\s+)?weapon\s+range)/i;

const DICE_RULES_QUERY_PATTERN =
  /(?:jak\s+(?:działają\s+rzuty|działa\s+rzut|rzucać\s+kośćmi|działa\s+test|działają\s+testy)|zasady\s+(?:rzutów|testów)|jak\s+wykonać\s+test|sukces\s+trudny|sukces\s+ekstremalny|forsowanie\s+rzutu|jak\s+forsować|kiedy\s+jest\s+pech|kiedy\s+jest\s+krytyk|co\s+to\s+jest\s+pech|jak\s+działa\s+szczęście|zasady\s+mechaniki|mechanika\s+rzutów|how\s+do\s+rolls\s+work|skill\s+check\s+rules|how\s+to\s+push\s+a\s+roll|fumble\s+rules)/i;

// ============================================================================
// 3. DETEKCJA I GENERATORY ODPOWIEDZI
// ============================================================================

export function detectAnachronism(text: string): {
  detected: boolean;
  group?: AnachronismPatternGroup;
  matchedText?: string;
} {
  for (const group of ANACHRONISM_GROUPS) {
    const match = text.match(group.regex);
    if (match) {
      return {
        detected: true,
        group,
        matchedText: match[0].trim(),
      };
    }
  }
  return { detected: false };
}

export function detectEquipmentQuery(text: string): boolean {
  const trimmed = text.trim();
  if (EQUIPMENT_EXPLICIT_QUERY.test(trimmed)) {
    return true;
  }
  if (
    NARRATIVE_ACTION_INDICATOR.test(trimmed) &&
    !/^(?:sprawdź|sprawdzam|pokaż|show|check)\b/i.test(trimmed)
  ) {
    return false;
  }
  return EQUIPMENT_QUERY_PATTERN.test(trimmed);
}

export function detectWeaponSpecsQuery(text: string): boolean {
  const trimmed = text.trim();
  if (
    /(?:\b(?:strzelam|strzelać|atakuj[ęe]|celuj[ęe]|shoot|fire|aim|attack)\b)/i.test(
      trimmed
    )
  ) {
    return false;
  }
  return WEAPON_SPECS_QUERY_PATTERN.test(trimmed);
}

export function detectDiceRulesQuery(text: string): boolean {
  return DICE_RULES_QUERY_PATTERN.test(text);
}

export function buildAnachronismResponse(
  label: string,
  alternatives: string[],
  locale: 'pl' | 'en' = 'pl'
): string {
  if (locale === 'en') {
    return (
      `**[KEEPER OF ARCANE LORE — ERA REALITY CHECK]**\n\n` +
      `You are attempting to use an anachronism: *${label}*, which does not exist in the 1920s.\n\n` +
      `**Era-appropriate alternatives:**\n` +
      alternatives.map((alt) => `- ${alt}`).join('\n') +
      `\n\nPlease declare an action matching the historical setting.`
    );
  }

  return (
    `**[STRAŻNIK TAJEMNIC — KOREKTA REALIZMU EPOKI]**\n\n` +
    `Próbujesz skorzystać z anachronizmu: *${label}*, który nie istnieje w latach 20. XX wieku.\n\n` +
    `**Historyczne alternatywy w realiach epoki:**\n` +
    alternatives.map((alt) => `- ${alt}`).join('\n') +
    `\n\nZadeklaruj działanie zgodne z duchem i możliwościami lat 20.`
  );
}

export function buildEquipmentResponse(
  character: Character | null,
  locale: 'pl' | 'en' = 'pl'
): string {
  if (!character) {
    return locale === 'en'
      ? 'You do not have an active character selected.'
      : 'Nie masz aktywnej postaci.';
  }

  const items = character.equipment ?? [];
  if (items.length === 0) {
    return locale === 'en'
      ? `**Equipment: ${character.name}**\n\nYour inventory is empty. You search your pockets and belongings, but you are not carrying any special equipment.`
      : `**Ekwipunek: ${character.name}**\n\nTwój ekwipunek jest pusty. Przeszukujesz swoje kieszenie i bagaż, ale nie masz przy sobie żadnego szczególnego wyposażenia.`;
  }

  return formatEquipment(character);
}

export function buildWeaponSpecsResponse(
  character: Character | null,
  message: string,
  locale: 'pl' | 'en' = 'pl',
  eraContext?: ResolvedEraContext | null
): string {
  const isEn = locale === 'en';
  if (!character) {
    return isEn
      ? 'You do not have an active character selected.'
      : 'Nie masz aktywnej postaci.';
  }

  const weapons = (character.equipment ?? []).filter(isWeapon);

  if (weapons.length === 0) {
    return isEn
      ? `**Weapons (${character.name}):**\n\n` +
          `You are not carrying any weapons. In combat, you can only rely on **Unarmed Fighting** (base 25%, damage 1d3 + damage bonus).`
      : `**Broń i uzbrojenie (${character.name}):**\n\n` +
          `Nie posiadasz przy sobie żadnej broni. W starciu możesz polegać jedynie na **Walce Wręcz (Bijatyka)** (baza 25%, obrażenia 1d3 + modyfikator obrażeń).`;
  }

  const lines = weapons.map((w) => {
    const skill = inferWeaponSkill(w);
    const skillVal = resolveTestValue(skill, character);
    const skillDisplay =
      skillVal !== null ? `${skillVal}%` : isEn ? 'base' : 'baza';
    const inferred = inferWeaponDamage(w);
    const damage = w.modifiers?.damage ?? inferred?.damage ?? '-';
    const range =
      w.modifiers?.range ??
      inferred?.range ??
      (isEn ? 'melee contact' : 'kontakt / wręcz');
    const malfunction = w.modifiers?.malfunction ?? 100;
    const isMelee = isMeleeWeapon(w);

    if (isEn) {
      const malfText = !isMelee ? `, Malfunction: ${malfunction}` : '';
      return `- **${w.name}**: base range ${range}, damage ${damage}, skill: ${skill} (${skillDisplay})${malfText}`;
    }
    const malfText = !isMelee ? `, zacięcie: ${malfunction}` : '';
    return `- **${w.name}**: zasięg bazowy ${range}, obrażenia ${damage}, test: ${skill} (${skillDisplay})${malfText}`;
  });

  if (isEn) {
    return (
      `**Weapons & Combat Ranges (${character.name}):**\n\n` +
      lines.join('\n') +
      `\n\n*Call of Cthulhu 7e Rule:* Within base range, attacks are Standard difficulty. Up to 2× base range requires a Hard Success (1/2 skill), up to 4× requires an Extreme Success (1/5 skill).`
    );
  }

  return (
    `**Zasięg i parametry broni (${character.name}):**\n\n` +
    lines.join('\n') +
    `\n\n*Zasada CoC 7e (RAW):* W zasięgu bazowym strzał wykonuje się ze standardową trudnością. Do podwojonego zasięgu (2×) test staje się Trudny (1/2 umiejętności), a do czterokrotnego (4×) – Ekstremalny (1/5 umiejętności).`
  );
}

export function buildDiceRulesResponse(locale: 'pl' | 'en' = 'pl'): string {
  if (locale === 'en') {
    return (
      `**Call of Cthulhu 7th Edition — Skill Tests & Dice Rules (RAW):**\n\n` +
      `All characteristic and skill checks use percentile dice (**1d100** — tens and units):\n\n` +
      `- **Regular Success:** Roll result is **less than or equal** to your skill rating (1d100 ≤ Skill).\n` +
      `- **Hard Success:** Roll result is ≤ **half (1/2)** of your skill rating (rounded down).\n` +
      `- **Extreme Success:** Roll result is ≤ **one-fifth (1/5)** of your skill rating (rounded down).\n` +
      `- **Critical Success:** Rolling an **01** is always a critical triumph.\n` +
      `- **Fumble (Mishap):** Rolling **100** (or **96–100** if skill is under 50%) causes disastrous complications.\n` +
      `- **Pushed Roll:** When a test fails, you can justify a second attempt with raised stakes and extra effort. Failure on a pushed roll leads to dire consequences! *(Cannot push combat rolls or Sanity checks).* \n` +
      `- **Luck Points:** Spend Luck points 1-for-1 to lower your roll result and turn failure into success *(cannot spend on fumbles or Sanity checks).*`
    );
  }

  return (
    `**Zasady testów i rzutów kośćmi (Call of Cthulhu 7e RAW):**\n\n` +
    `Wszystkie testy cech i umiejętności wykonuje się kością stugrafitową (**k100** — dziesiątki i jedności):\n\n` +
    `- **Sukces zwykły:** Wynik na kości jest **mniejszy lub równy** wartości Twojej umiejętności (k100 ≤ umiejętność).\n` +
    `- **Sukces trudny:** Wynik ≤ **połowa (1/2)** wartości umiejętności (zaokrąglona w dół).\n` +
    `- **Sukces ekstremalny:** Wynik ≤ **jedna piąta (1/5)** wartości umiejętności (zaokrąglona w dół).\n` +
    `- **Sukces krytyczny:** Wyrzucenie **01** to spektakularny sukces niezależnie od poziomu umiejętności.\n` +
    `- **Pech (Fumble):** Wyrzucenie **100** (lub **96–100**, gdy umiejętność wynosi poniżej 50%) — bolesna wpadka z natychmiastową komplikacją fabularną.\n` +
    `- **Forsowanie rzutu (Pushed Roll):** Po nieudanym teście możesz podjąć drugą próbę, jeśli masz uzasadnienie narracyjne i podniesiesz stawkę. Porażka przy forsowaniu oznacza katastrofę! *(Testów w walce i na Poczytalność nie można forsować).* \n` +
    `- **Punkty Szczęścia:** Możesz wydać punkty Szczęścia w stosunku 1:1, by obniżyć wynik rzutu i zamienić porażkę w sukces *(nie dotyczy pecha ani testów Poczytalności).*`
  );
}

// ============================================================================
// 4. GŁÓWNA FUNKCJA EWALUACJI BRAMKI GUARDRAIL
// ============================================================================

export function evaluateEraGuardrail(
  options: EvaluateEraGuardrailOptions
): EraGuardrailResult | null {
  const startTime = performance.now();
  const { message, character = null, locale = 'pl' } = options;

  if (!message || typeof message !== 'string') {
    return null;
  }

  const trimmed = message.trim();
  if (trimmed.length === 0) {
    return null;
  }

  // 1. Sprawdź anachronizmy technologiczne
  const anach = detectAnachronism(trimmed);
  if (anach.detected && anach.group) {
    const label = locale === 'en' ? anach.group.labelEn : anach.group.labelPl;
    const alternatives =
      locale === 'en'
        ? anach.group.alternativesEn
        : anach.group.alternativesPl;
    const response = buildAnachronismResponse(label, alternatives, locale);
    const executionTimeMs = performance.now() - startTime;
    return {
      blocked: true,
      category: 'anachronism',
      response,
      matchedPattern: anach.matchedText,
      alternatives,
      executionTimeMs,
    };
  }

  // 2. Sprawdź zapytania o zasięg i parametry broni
  if (detectWeaponSpecsQuery(trimmed)) {
    const response = buildWeaponSpecsResponse(
      character,
      trimmed,
      locale,
      options.eraContext
    );
    const executionTimeMs = performance.now() - startTime;
    return {
      blocked: true,
      category: 'weapon_specs',
      response,
      executionTimeMs,
    };
  }

  // 3. Sprawdź zapytania o zasady rzutów kośćmi
  if (detectDiceRulesQuery(trimmed)) {
    const response = buildDiceRulesResponse(locale);
    const executionTimeMs = performance.now() - startTime;
    return {
      blocked: true,
      category: 'dice_rules',
      response,
      executionTimeMs,
    };
  }

  // 4. Sprawdź zapytania o stan ekwipunku
  if (detectEquipmentQuery(trimmed)) {
    const response = buildEquipmentResponse(character, locale);
    const executionTimeMs = performance.now() - startTime;
    return {
      blocked: true,
      category: 'equipment',
      response,
      executionTimeMs,
    };
  }

  return null;
}
