/**
 * Concordia EventResolution & Intent Adjudication (CoC 7e RAW)
 *
 * Inspirowane architekturą Game Mastera Google DeepMind Concordia
 * (google-deepmind/concordia: components/game_master/event_resolution.py).
 *
 * Odpowiada za:
 * 1. Putative Event (Deklaracja intencji): traktowanie wypowiedzi gracza jako zamiaru próby (action attempt), a nie ugruntowanego faktu w świecie gry.
 * 2. Adjudykacja Intencji (Intent Adjudicator): deterministyczna i ultraszybka (<400ms) ocena fizycznej możliwości, weryfikacja wymaganego ekwipunku, stanu postaci i lokacji.
 * 3. Identyfikacja testu CoC 7e RAW: wykrywanie konieczności rzutu kością (requiresCheck: true, poziom trudności, rzut przeciwstawny) i blokada autosukcesu.
 * 4. Real Event (Ugruntowany fakt): obiektywne rozstrzygnięcie wyniku akcji (sukces automatyczny, próba zawieszona przed rzutem, blokada niemożliwości sędziego).
 * 5. Keeper Storyteller Directive: dyrektywa promptu wymuszająca na modelu narracyjnym (Gemini) prozę osnutą WOKÓŁ Real Event z zakazem samowolnego auto-sukcesu gracza.
 *
 * @module concordia/event-resolution
 */

import type { Character, NPC } from '../types';
import { isWeapon, inferWeaponSkill, isMeleeWeapon } from '../combat/weapon-context';

export type AdjudicationPlausibility = 'plausible' | 'implausible' | 'impossible';

export type ActionCategory =
  | 'physical'
  | 'social'
  | 'investigative'
  | 'combat'
  | 'stealth'
  | 'occult'
  | 'mundane'
  | 'dialogue';

export interface CheckRequirement {
  requiresCheck: boolean;
  skillOrAttribute?: string;
  difficulty?: 'regular' | 'hard' | 'extreme';
  opposed?: boolean;
  opposedTarget?: string;
  opposedSkill?: string;
  reason?: string;
}

export interface PutativeEvent {
  id: string;
  actorName: string;
  rawText: string;
  actionAttempt: string;
  directQuote?: string;
  target?: string;
  location?: string;
  isDiceRoll?: boolean;
  isOoc?: boolean;
  timestamp: number;
}

export interface AdjudicationResult {
  eventId: string;
  plausibility: AdjudicationPlausibility;
  plausibilityReason?: string;
  category: ActionCategory;
  requiresCheck: boolean;
  checkRequirement?: CheckRequirement;
  missingRequirements?: string[];
  isAutosuccessAllowed: boolean;
  suggestedOutcome:
    | 'pending_check'
    | 'blocked_impossible'
    | 'auto_success'
    | 'refused_by_referee';
  confidence: number;
}

export interface RealEvent {
  id: string;
  putativeEventId: string;
  actorName: string;
  groundedFact: string;
  directQuote?: string;
  status: 'established' | 'blocked' | 'check_required';
  mechanicalDirective: string;
  checkRequirement?: CheckRequirement;
  timestamp: number;
}

export interface AdjudicationContext {
  character?: Character | null;
  characters?: Character[];
  currentLocation?: string;
  npcs?: NPC[];
  presentNpcNames?: string[];
  combatActive?: boolean;
  chaseActive?: boolean;
  locale?: 'pl' | 'en';
  gameContext?: string;
}

// ----------------------------------------------------------------------------
// REGEX PATTERNS & HEURISTICS (UNICODE / PL FRIENDLY, STATELESS WITHOUT /g)
// ----------------------------------------------------------------------------

/**
 * Wzorce wypowiedzi dosłownej bez flagi /g (stateless, brak błędów lastIndex na kolejnych wywołaniach).
 */
const DIRECT_QUOTE_PATTERNS: RegExp[] = [
  /["„]([^"”]+)["”]/,
  /[«]([^»]+)[»]/,
  /(?:mówię|krzyczę|szepczę|pytam|odpowiadam|warczy|cedzi|say|whisper|shout|ask)(?:\s+do\s+[^:]+)?:\s*["„]?([^"”\n]+)["”]?/i,
];

/**
 * Samowolne orzeczenia sukcesu w deklaracji gracza (stripping self-proclaimed success).
 */
const SELF_SUCCESS_PATTERNS: RegExp[] = [
  /(?:^|[\s,])(?:i\s+)?(?:zabijam|uśmiercam|likwiduję|powalam|roztrzaskuję)(?:$|[\s,.!])/gi,
  /(?:^|[\s,])(?:i\s+)?(?:bez\s+(?:problemu|trudu)|z\s+łatwością|natychmiast)\s+(?:otwieram|znajduję|pokonuję|uciekam)(?:$|[\s,.!])/gi,
  /(?:^|[\s,])(?:i\s+)?(?:udaje\s+mi\s+się|skutecznie|z\s+sukcesem)(?:$|[\s,.!])/gi,
  /(?:^|[\s,])(?:i\s+)?nikt\s+(?:mnie\s+nie\s+widzi|nie\s+zauważa)(?:$|[\s,.!])/gi,
  /(?:^|[\s,])(?:and\s+)?(?:I\s+kill|I\s+defeat|I\s+knock\s+out|I\s+instantly\s+find)(?:$|[\s,.!])/gi,
  /(?:^|[\s,])(?:and\s+)?(?:successfully|effortlessly|without\s+trouble)(?:$|[\s,.!])/gi,
  /(?:^|[\s,])(?:and\s+)?no\s+one\s+(?:notices|sees\s+me)(?:$|[\s,.!])/gi,
];

/**
 * Akcje niemożliwe fizycznie i anachroniczne (Twarde Weto Sędziego CoC 7e RAW s. 94, 218).
 */
const IMPOSSIBLE_PATTERNS: RegExp[] = [
  /(?:unoszę\s+się\s+w\s+powietrzu|lewituj|latam\s+(?:bez\s+sprzętu|nad|po|jak)|teleportuj)/i,
  /(?:strzelam\s+laser|promienie\s+z\s+oczu|lasery?\s+z\s+oczu|siłą\s+woli\s+rozrywam)/i,
  /(?:podnoszę|unoszę|dźwigam|zatrzymuj[ęe]).*(?:lokomotyw|pociąg|czołg|kamienic|budynek|wieżowiec|10\s*[- ]?ton|wielotonow|głaz.*(?:10|ton))/i,
  /(?:biegnę\s+z\s+prędkością\s+światła|łapię\s+pocisk(?:i)?\s+w\s+(?:zęby|dłonie|ręce))/i,
  /(?:unikam\s+serii\s+z\s+km.*biegnąc\s+po\s+ścianie)/i,
  /(?:levitate|teleport|shoot\s+lasers|lift.*(?:locomotive|10\s*ton|tank)|catch\s+bullets\s+with\s+teeth)/i,
];

/**
 * Rutynowe czynności codzienne bez presji i bez ryzyka (autosukces dozwolony).
 */
const MUNDANE_PATTERNS: RegExp[] = [
  /(?:siadam|usiąść|opieram\s+się|wstaję|podchodzę|idę\s+do|wychodzę|pukam\s+do|czekam\s+na)/i,
  /(?:zapalam\s+(?:papierosa|cygaro|fajkę)|dmucham\s+dymem|gaszę\s+papierosa)/i,
  /(?:biorę\s+łyk|piję\s+(?:wodę|kawę|herbatę|whisky)|nalewam|płacę\s+za)/i,
  /(?:patrzę\s+przez\s+okno|spoglądam\s+na|wzdycham|kiwam\s+głową|rozglądam\s+się)/i,
  /(?:wyciągam\s+dłoń|poprawiam\s+kapelusz|otwieram\s+notes|zamykam\s+drzwi)/i,
  /(?:chowam\s+(?:notes|list|pieniądze|portfel|ołówek|dokument|rewolwer|broń)|wkładam\s+do\s+kieszeni|ukrywam\s+twarz)/i,
  /(?:sit\s+down|take\s+a\s+sip|light\s+a\s+cigarette|look\s+at|look\s+around|nod|sigh|walk\s+to)/i,
];

/**
 * Pytania gracza poza postacią (OOC / Meta / pytania do MG).
 */
const OOC_PATTERN = /^\s*(?:\(\(|\(ooc:?|\[ooc:?|\(mg:?)/i;

// ----------------------------------------------------------------------------
// DICE ROLL RECOGNITION & PARSING
// ----------------------------------------------------------------------------

/**
 * Sprawdza czy wiadomość to wynik rzutu kością wysłany z Tacki lub okna kości.
 */
export function isDiceRollMessage(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  return (
    trimmed.startsWith('[🎲') ||
    trimmed.startsWith('[DICE_ROLL]') ||
    trimmed.includes('Wyniki testów obojga badaczy:') ||
    /(?:^|\n)\[🎲\s*(?:Test|Rzut):/i.test(trimmed) ||
    /(?:^|\n)Wynik:\s*\d+/i.test(trimmed)
  );
}

export interface ParsedDiceRollInfo {
  isRoll: boolean;
  skillName?: string;
  outcomeLabel?: string;
  isSuccess?: boolean;
  isFumble?: boolean;
  isCritical?: boolean;
  characterName?: string;
  rawSummary: string;
}

/**
 * Parsuje kluczowe informacje z wiadomości z wynikiem rzutu kością.
 */
export function parseDiceRollMessage(text: string): ParsedDiceRollInfo {
  const isRoll = isDiceRollMessage(text);
  if (!isRoll) return { isRoll: false, rawSummary: '' };

  let skillName: string | undefined;
  let outcomeLabel: string | undefined;
  let characterName: string | undefined;

  // Format Tacki: [🎲 Test: Spostrzegawczość (65%)] lub [🎲 Test: @Arthur: Spostrzegawczość (65%)]
  const skillMatch = /\[🎲\s*Test:\s*(?:@([^:]+):\s*)?([^(\]\n]+)(?:\s*\(\d+%\))?/i.exec(text);
  if (skillMatch) {
    if (skillMatch[1]) characterName = skillMatch[1].trim();
    if (skillMatch[2]) skillName = skillMatch[2].trim();
  }

  // Format AI context: [DICE_ROLL] Edward Carnby wykonał test umiejętności "Spostrzegawczość"...
  const diceRollAiMatch =
    /\[DICE_ROLL\]\s*(?:([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+(?:\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)?)\s+wykonał\s+)?test\s+umiejętności\s+"([^"]+)"/i.exec(
      text
    );
  if (diceRollAiMatch) {
    if (diceRollAiMatch[1]) characterName = diceRollAiMatch[1].trim();
    if (diceRollAiMatch[2]) skillName = diceRollAiMatch[2].trim();
  }

  // Wynik i werdykt: Wynik: 23 → ✅ Zwykły sukces
  const outcomeMatch = /Wynik:\s*\d+\s*(?:→\s*([^\n]+))?/i.exec(text);
  if (outcomeMatch && outcomeMatch[1]) {
    outcomeLabel = outcomeMatch[1].trim();
  } else if (/SUKCES|SUCCESS|ZDANY|✅/i.test(text)) {
    outcomeLabel = 'Sukces';
  } else if (/PORAŻKA|FAIL|NIEZDANY|❌/i.test(text)) {
    outcomeLabel = 'Porażka';
  }

  const isCritical = /krytycz|critical/i.test(text);
  const isFumble = /pech|fumble/i.test(text);
  const isSuccess = /sukces|success|zdany|✅/i.test(text) && !isFumble;

  return {
    isRoll: true,
    skillName,
    outcomeLabel,
    isSuccess,
    isFumble,
    isCritical,
    characterName,
    rawSummary: text.trim().slice(0, 300),
  };
}

// ----------------------------------------------------------------------------
// EXTRACT PUTATIVE EVENT
// ----------------------------------------------------------------------------

/**
 * Ekstrahuje deklarację intencji (Putative Event) z surowej wypowiedzi gracza.
 * Izoluje bezpośrednią mowę (direct quote), wykrywa aktora z prefiksu @Name:
 * i oczyszcza deklarację z narzuconego autosukcesu.
 */
export function extractPutativeEvent(
  text: string,
  actorName: string = 'Badacz',
  location?: string
): PutativeEvent {
  let cleanRaw = (text || '').trim();
  let resolvedActor = actorName;
  const id = `pe_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  if (!cleanRaw) {
    return {
      id,
      actorName: resolvedActor,
      rawText: '',
      actionAttempt: 'brak deklaracji akcji (milczenie/oczekiwanie)',
      location,
      timestamp: Date.now(),
    };
  }

  // 1. Sprawdzenie czy to wynik rzutu kością
  const isRoll = isDiceRollMessage(cleanRaw);
  if (isRoll) {
    const rollInfo = parseDiceRollMessage(cleanRaw);
    return {
      id,
      actorName: rollInfo.characterName || resolvedActor,
      rawText: cleanRaw,
      actionAttempt: `Rozstrzygnięcie rzutu kością: ${rollInfo.skillName || 'test'} → ${rollInfo.outcomeLabel || 'rzut wykonany'}`,
      isDiceRoll: true,
      location,
      timestamp: Date.now(),
    };
  }

  // 2. Rozpoznanie aktora z prefiksu np. @Edward: lub @Margaret Sullivan:
  const actorPrefixMatch = /^@([^:]+):\s*([\s\S]*)$/.exec(cleanRaw);
  if (actorPrefixMatch) {
    resolvedActor = actorPrefixMatch[1].trim();
    cleanRaw = actorPrefixMatch[2].trim();
  }

  // 3. Sprawdzenie czy to pytanie OOC (Out-Of-Character)
  const isOoc = OOC_PATTERN.test(cleanRaw);

  // 4. Ekstrakcja wypowiedzi dosłownej (direct quote) - czysta, bezstanowa pętla
  let directQuote: string | undefined;
  for (const pattern of DIRECT_QUOTE_PATTERNS) {
    const match = pattern.exec(cleanRaw);
    if (match && match[1]?.trim()) {
      directQuote = match[1].trim();
      break;
    }
  }

  // 5. Oczyszczenie akcji z samowolnego autosukcesu (stripping self-success)
  let actionAttempt = cleanRaw;
  for (const sp of SELF_SUCCESS_PATTERNS) {
    actionAttempt = actionAttempt.replace(sp, ' [próbuje przeprowadzić akcję]');
  }
  actionAttempt = actionAttempt.replace(/\s+/g, ' ').trim();

  // 6. Rozpoznanie celu (target)
  let target: string | undefined;
  const targetMatch = /(?:do|w|na|wobec|przeciwko|target|at|towards)\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+(?:\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)?)/.exec(
    cleanRaw
  );
  if (targetMatch && targetMatch[1]) {
    target = targetMatch[1].trim();
  }

  return {
    id,
    actorName: resolvedActor,
    rawText: (text || '').trim(),
    actionAttempt,
    directQuote,
    target,
    location,
    isOoc,
    timestamp: Date.now(),
  };
}

// ----------------------------------------------------------------------------
// ADJUDICATE PUTATIVE EVENT (<400 ms DETERMINISTIC FAST-PATH)
// ----------------------------------------------------------------------------

/**
 * Weryfikuje czy ekwipunek postaci zawiera wymaganą kategorię przedmiotu.
 */
function hasRequiredEquipment(character: Character | null | undefined, query: RegExp): boolean {
  if (!character) return false;
  const eq = character.equipment || [];
  return eq.some((item) => query.test(item.name || '') || query.test(item.description || ''));
}

/**
 * Weryfikuje czy badacz posiada broń palną, korzystając z kanonicznego silnika uzbrojenia.
 */
function checkFirearmEquipment(character: Character | null | undefined): {
  hasGun: boolean;
  isLongGun: boolean;
  gunName?: string;
} {
  if (!character) return { hasGun: false, isLongGun: false };
  const eq = character.equipment || [];
  for (const item of eq) {
    if (isWeapon(item) && !isMeleeWeapon(item)) {
      const skill = inferWeaponSkill(item);
      const isLong =
        skill.includes('Karabin') ||
        /rifle|shotgun|strzelb|karabin|sztucer|dubeltów/i.test(item.name || '');
      return { hasGun: true, isLongGun: isLong, gunName: item.name };
    }
  }
  return { hasGun: false, isLongGun: false };
}

/**
 * Adjudykuje deklarację intencji gracza na podstawie reguł CoC 7e RAW,
 * ograniczeń fizycznych, ekwipunku postaci i otoczenia.
 */
export function adjudicatePutativeEvent(
  event: PutativeEvent,
  context: AdjudicationContext = {}
): AdjudicationResult {
  const text = event.actionAttempt.toLowerCase();
  const rawLower = event.rawText.toLowerCase();
  const char = context.character;
  const isEn = context.locale === 'en';

  // 0. WYNIK RZUTU KOŚCIĄ (TACKA / DICE ROLL RESOLUTION)
  if (event.isDiceRoll) {
    return {
      eventId: event.id,
      plausibility: 'plausible',
      category: 'mundane',
      requiresCheck: false,
      isAutosuccessAllowed: true,
      suggestedOutcome: 'auto_success',
      confidence: 1.0,
    };
  }

  // 0B. PYTANIE POZA POSTACIĄ (OOC / META-PYTANIE DO MG)
  if (event.isOoc || OOC_PATTERN.test(rawLower)) {
    return {
      eventId: event.id,
      plausibility: 'plausible',
      category: 'dialogue',
      requiresCheck: false,
      isAutosuccessAllowed: true,
      suggestedOutcome: 'auto_success',
      confidence: 1.0,
    };
  }

  // 1. KONDYCJA FIZYCZNA POSTACI (Paraliż, agonia, nieprzytomność)
  if (char?.hp !== undefined && char.hp <= 0) {
    return {
      eventId: event.id,
      plausibility: 'impossible',
      plausibilityReason: isEn
        ? 'The investigator is unconscious or dying (HP <= 0).'
        : 'Badacz jest nieprzytomny lub w stanie agonii (0 HP). Brak możliwości podjęcia działania fizycznego.',
      category: 'physical',
      requiresCheck: false,
      isAutosuccessAllowed: false,
      suggestedOutcome: 'blocked_impossible',
      confidence: 1.0,
    };
  }

  // 2. AKCJA NIEMOŻLIWA FIZYCZNIE / SĘDZIA RAW (VETO)
  for (const impPattern of IMPOSSIBLE_PATTERNS) {
    if (impPattern.test(text) || impPattern.test(rawLower)) {
      return {
        eventId: event.id,
        plausibility: 'impossible',
        plausibilityReason: isEn
          ? 'Action exceeds human physical capability and 1920s historical reality (Referee Veto CoC 7e RAW p. 94, 218).'
          : 'Akcja wykracza poza granice ludzkiej fizjologii i realia epoki (Twarde Weto Sędziego CoC 7e RAW s. 94, 218).',
        category: 'physical',
        requiresCheck: false,
        isAutosuccessAllowed: false,
        suggestedOutcome: 'blocked_impossible',
        confidence: 0.98,
      };
    }
  }

  // 3. STRZELANIE / BROŃ PALNA (Gating ekwipunku i amunicji)
  const isShooting =
    /(?:strzel|strzał|otwieram\s+ogień|pociągam\s+za\s+(?:spust|cyngiel)|wypalam|odbezpieczam\s+broń|celuj.*z\s+(?:rewolwer|pistolet|karabin|strzelb|broni)|shoot|fire\s+at|aim\s+and\s+shoot|open\s+fire)/i.test(
      text
    ) ||
    /(?:strzel|strzał|otwieram\s+ogień|pociągam\s+za\s+(?:spust|cyngiel)|wypalam)/i.test(rawLower);

  if (isShooting) {
    const gunInfo = checkFirearmEquipment(char);
    if (!gunInfo.hasGun && char) {
      return {
        eventId: event.id,
        plausibility: 'impossible',
        plausibilityReason: isEn
          ? 'The investigator does not have a firearm in their equipment.'
          : 'Badacz nie posiada broni palnej w swoim aktywnym ekwipunku ani uzbrojeniu.',
        category: 'combat',
        requiresCheck: false,
        missingRequirements: [isEn ? 'firearm' : 'broń palna'],
        isAutosuccessAllowed: false,
        suggestedOutcome: 'blocked_impossible',
        confidence: 0.95,
      };
    }

    const isLong = gunInfo.isLongGun || /karabin|strzelb|sztucer|dubeltów|rifle|shotgun/i.test(text);
    const skillName = isLong ? 'Broń Palna (Długa)' : 'Broń Palna (Krótka)';

    return {
      eventId: event.id,
      plausibility: 'plausible',
      category: 'combat',
      requiresCheck: true,
      checkRequirement: {
        requiresCheck: true,
        skillOrAttribute: skillName,
        difficulty: 'regular',
        opposed: false,
        reason: isEn ? 'Firearms attack under combat pressure' : 'Strzał z broni palnej pod presją',
      },
      isAutosuccessAllowed: false,
      suggestedOutcome: 'pending_check',
      confidence: 0.95,
    };
  }

  // 4. WALKA WRĘCZ / ATAK BEZPOŚREDNI
  const isMeleeCombat =
    /(?:walcz|bij[ęe]|bić|uderz|kopni[eę]|kopiąc|dźga[mć]|dźgnij|dusz[ęe]|wyprowadzam\s+cios|zadaj[ęe]\s+cios|ci[ęe]cie\s+nożem|atakuj|rzucam\s+się\s+na|punch|stab|slash|tackle|strike|brawl)/i.test(
      text
    ) ||
    /(?:walcz|bij[ęe]|uderz|zadaj[ęe]\s+cios)/i.test(rawLower);

  if (isMeleeCombat) {
    return {
      eventId: event.id,
      plausibility: 'plausible',
      category: 'combat',
      requiresCheck: true,
      checkRequirement: {
        requiresCheck: true,
        skillOrAttribute: 'Walka Wręcz (Bijatyka)',
        difficulty: 'regular',
        opposed: true,
        opposedSkill: 'Unik / Walka Wręcz',
        reason: isEn ? 'Opposed close combat exchange' : 'Zwarcie w walce wręcz (rzut przeciwstawny)',
      },
      isAutosuccessAllowed: false,
      suggestedOutcome: 'pending_check',
      confidence: 0.92,
    };
  }

  // 5. ŚLUSARSTWO / OTWIERANIE ZAMKÓW
  const isLockpicking =
    /(?:wytrych|otwieram\s+zamek|otworzyć\s+zamek|majstruj.*przy\s+zamku|dłubi.*w\s+zamku|manipuluj.*przy\s+zamku|pick\s+lock|lockpick)/i.test(
      text
    ) ||
    /wytrych/i.test(rawLower);

  if (isLockpicking) {
    const hasTools = hasRequiredEquipment(char, /wytrych|narzędzi|zestaw\s+ślusarsk|lockpick|tools/i);
    return {
      eventId: event.id,
      plausibility: 'plausible',
      plausibilityReason:
        !hasTools && char
          ? isEn
            ? 'Improvised lockpicking without locksmith tools increases difficulty.'
            : 'Brak profesjonalnych wytrychów (improwizowane narzędzia).'
          : undefined,
      category: 'investigative',
      requiresCheck: true,
      checkRequirement: {
        requiresCheck: true,
        skillOrAttribute: 'Ślusarstwo',
        difficulty: hasTools ? 'regular' : 'hard',
        reason: isEn ? 'Picking mechanical lock' : 'Otwieranie zamka mechanicznego',
      },
      missingRequirements: !hasTools && char ? [isEn ? 'lockpick set' : 'wytrychy'] : undefined,
      isAutosuccessAllowed: false,
      suggestedOutcome: 'pending_check',
      confidence: 0.94,
    };
  }

  // 6. WYWAŻANIE DRZWI / TEST SIŁY LUB KRZEPY
  const isForcingDoor =
    /(?:wyważ|wyłam|forsuj.*drzwi|napieram\s+ramieniem|rozwalam\s+drzwi|rozbijam\s+kłódk|smash\s+door|break\s+down\s+door|force\s+open)/i.test(
      text
    );
  if (isForcingDoor) {
    return {
      eventId: event.id,
      plausibility: 'plausible',
      category: 'physical',
      requiresCheck: true,
      checkRequirement: {
        requiresCheck: true,
        skillOrAttribute: 'Siła',
        difficulty: 'regular',
        reason: isEn ? 'Feat of strength: forcing barrier' : 'Test Siły (STR): wyważenie drzwi lub przeszkody',
      },
      isAutosuccessAllowed: false,
      suggestedOutcome: 'pending_check',
      confidence: 0.91,
    };
  }

  // 7. AKTYWNOŚĆ FIZYCZNA: WSPINACZKA, SKAKANIE, PŁYWANIE (ATHLETICS)
  const isClimbing = /(?:wspin|wdrapuj|drapać\s+się|po\s+rynnie|po\s+skale|climb)/i.test(text);
  if (isClimbing) {
    return {
      eventId: event.id,
      plausibility: 'plausible',
      category: 'physical',
      requiresCheck: true,
      checkRequirement: {
        requiresCheck: true,
        skillOrAttribute: 'Wspinaczka',
        difficulty: 'regular',
        reason: isEn ? 'Climbing vertical surface' : 'Wspinaczka po pionowej powierzchni',
      },
      isAutosuccessAllowed: false,
      suggestedOutcome: 'pending_check',
      confidence: 0.92,
    };
  }

  const isJumping = /(?:skacz[ęe]|przeskakuj[ęe]|skok\s+przez|skoczyć\s+przez|jump\s+across|leap)/i.test(text);
  if (isJumping) {
    return {
      eventId: event.id,
      plausibility: 'plausible',
      category: 'physical',
      requiresCheck: true,
      checkRequirement: {
        requiresCheck: true,
        skillOrAttribute: 'Skakanie',
        difficulty: 'regular',
        reason: isEn ? 'Feat of agility: jumping across chasm/obstacle' : 'Test Skakania: przeskok przez przeszkodę / rozpadlinę',
      },
      isAutosuccessAllowed: false,
      suggestedOutcome: 'pending_check',
      confidence: 0.91,
    };
  }

  const isSwimming = /(?:płyn[ęe]\s+wpław|pływać\s+w\s+rzece|zanurzam\s+się\s+w\s+wod|swim)/i.test(text);
  if (isSwimming) {
    return {
      eventId: event.id,
      plausibility: 'plausible',
      category: 'physical',
      requiresCheck: true,
      checkRequirement: {
        requiresCheck: true,
        skillOrAttribute: 'Pływanie',
        difficulty: 'regular',
        reason: isEn ? 'Swimming in treacherous water' : 'Test Pływania w trudnych warunkach',
      },
      isAutosuccessAllowed: false,
      suggestedOutcome: 'pending_check',
      confidence: 0.9,
    };
  }

  // 8. SKRADANIE SIĘ / UKRYWANIE POSTACI
  // Wymaga 'się' dla ukrywa/kryj, aby nie łapać 'ukrywam pistolet' ani 'ukrywam twarz'
  const isStealth =
    /(?:skrada|po\s+cichu|przemyka|chowam\s+się|chować\s+się|ukrywa(?:m|sz)?\s+się|kryj(?:ę|esz)?\s+się|sneak|creep|stealth|hide\s+(?:myself|in|behind))/i.test(
      text
    );
  if (isStealth) {
    const hasNpcs = (context.npcs && context.npcs.length > 0) || (context.presentNpcNames && context.presentNpcNames.length > 0);
    return {
      eventId: event.id,
      plausibility: 'plausible',
      category: 'stealth',
      requiresCheck: true,
      checkRequirement: {
        requiresCheck: true,
        skillOrAttribute: 'Skradanie',
        difficulty: 'regular',
        opposed: Boolean(hasNpcs),
        opposedSkill: 'Nasłuchiwanie / Spostrzegawczość',
        reason: isEn ? 'Moving silently / remaining undetected' : 'Ciche przemieszczanie się i unikanie wykrycia',
      },
      isAutosuccessAllowed: false,
      suggestedOutcome: 'pending_check',
      confidence: 0.93,
    };
  }

  // 9. OKULTYZM I MITY CTHULHU (Rytuały, zaklęcia, inkantacje, tomy)
  const isOccultOrMythos =
    /(?:rytuał|inkantacj|zaklęci|odprawiam|rzucam\s+czar|czaruj[ęe]|czarnoksięsk|necronomicon|grimoire|okultyzm|mity\s+cthulhu|runy|symbole\s+starszych|znaku\s+starszych|elder\s+sign|cast\s+spell|ritual|incantation|occult)/i.test(
      text
    );
  if (isOccultOrMythos) {
    const isMythos = /mity|mythos|necronomicon/i.test(text);
    const skill = isMythos ? 'Mity Cthulhu' : 'Okultyzm';
    return {
      eventId: event.id,
      plausibility: 'plausible',
      category: 'occult',
      requiresCheck: true,
      checkRequirement: {
        requiresCheck: true,
        skillOrAttribute: skill,
        difficulty: 'hard',
        reason: isEn ? 'Occult ritual / Cthulhu Mythos knowledge' : 'Rytuał okultystyczny / wiedza o Mitach Cthulhu',
      },
      isAutosuccessAllowed: false,
      suggestedOutcome: 'pending_check',
      confidence: 0.93,
    };
  }

  // 10. SOCIAL PUSHBACK & INTERPERSONAL CHECKS (Perswazja, Zastraszanie, Gadanina, Urok)
  const isPersuading = /(?:przekon|perswad|namawia|zmuszam\s+do\s+mówienia|persuade|convince)/i.test(text);
  const isIntimidating = /(?:zastrasz|groż|szantaż|przykładam\s+nóż|intimidate|threaten)/i.test(text);
  const isFastTalking = /(?:okłam|kłam|bajeruj|wciskam\s+kit|zmyślam|oszukuj|fast\s+talk|bluff|deceive|lie)/i.test(text);
  const isCharming = /(?:uwodzę|uwodzić|flirt|czaruj|zalotnie|charm)/i.test(text);

  if (isPersuading || isIntimidating || isFastTalking || isCharming) {
    let skill = 'Perswazja';
    if (isIntimidating) skill = 'Zastraszanie';
    else if (isFastTalking) skill = 'Gadanina';
    else if (isCharming) skill = 'Urok';

    return {
      eventId: event.id,
      plausibility: 'plausible',
      category: 'social',
      requiresCheck: true,
      checkRequirement: {
        requiresCheck: true,
        skillOrAttribute: skill,
        difficulty: 'regular',
        opposed: true,
        opposedSkill: 'Psychologia / Siła Woli (POW)',
        reason: isEn ? `Social influence check (${skill})` : `Test wpływu społecznego (${skill}) - Pushback NPC`,
      },
      isAutosuccessAllowed: false,
      suggestedOutcome: 'pending_check',
      confidence: 0.88,
    };
  }

  // 11. KIEROWANIE POJAZDAMI (Manewry pod presją)
  const isDriving =
    /(?:kieruj[ęe]\s+aut|za\s+kierownic|wyminąć.*(?:samochód|ciężarówk|auto)|ostry\s+skręt.*(?:samochodem|autem)|drive\s+fast|swerve|dodge.*(?:car|truck))/i.test(
      text
    );
  if (isDriving) {
    return {
      eventId: event.id,
      plausibility: 'plausible',
      category: 'physical',
      requiresCheck: true,
      checkRequirement: {
        requiresCheck: true,
        skillOrAttribute: 'Prowadzenie Samochodu',
        difficulty: 'regular',
        reason: isEn ? 'Evasive driving maneuver' : 'Manewr wymijania za kierownicą pojazdu',
      },
      isAutosuccessAllowed: false,
      suggestedOutcome: 'pending_check',
      confidence: 0.9,
    };
  }

  // 12. PRZESZUKIWANIE / DETEKCJA POSZLAK / SPOSTRZEGAWCZOŚĆ
  // Usunięto unadorned 'rozglądam' i 'oglądam', by zwykłe rozglądanie nie wymuszało testu!
  const isSearching =
    /(?:przeszuk|szukam|szukać|dokładnie\s+badam|dokładnie\s+oglądam|search|inspect|look\s+for\s+clues|spot\s+hidden)/i.test(
      text
    );
  if (isSearching) {
    return {
      eventId: event.id,
      plausibility: 'plausible',
      category: 'investigative',
      requiresCheck: true,
      checkRequirement: {
        requiresCheck: true,
        skillOrAttribute: 'Spostrzegawczość',
        difficulty: 'regular',
        reason: isEn ? 'Spot Hidden check for concealed clues' : 'Test Spostrzegawczości w poszukiwaniu ukrytych poszlak',
      },
      isAutosuccessAllowed: false,
      suggestedOutcome: 'pending_check',
      confidence: 0.9,
    };
  }

  // 13. BIBLIOTEKA / ARCHIWA / DOKUMENTY
  const isLibraryResearch = /(?:archiw|kartotek|księgach|stare\s+gazety|mikrofilm|bibliotek|library\s+use|search\s+archives)/i.test(text);
  if (isLibraryResearch) {
    return {
      eventId: event.id,
      plausibility: 'plausible',
      category: 'investigative',
      requiresCheck: true,
      checkRequirement: {
        requiresCheck: true,
        skillOrAttribute: 'Biblioteka',
        difficulty: 'regular',
        reason: isEn ? 'Library Use research through documents' : 'Kwerenda archiwalna (Korzystanie z Bibliotek)',
      },
      isAutosuccessAllowed: false,
      suggestedOutcome: 'pending_check',
      confidence: 0.89,
    };
  }

  // 14. PIERWSZA POMOC / MEDYCYNA
  const isMedical = /(?:tamuj|tamować|opatruj|opatrzyć|morfin|reanimuj|first\s+aid|bandage|treat\s+wound)/i.test(text);
  if (isMedical) {
    return {
      eventId: event.id,
      plausibility: 'plausible',
      category: 'physical',
      requiresCheck: true,
      checkRequirement: {
        requiresCheck: true,
        skillOrAttribute: 'Pierwsza Pomoc',
        difficulty: 'regular',
        reason: isEn ? 'First Aid check to stabilize investigator' : 'Test Pierwszej Pomocy na opatrzenie obrażeń',
      },
      isAutosuccessAllowed: false,
      suggestedOutcome: 'pending_check',
      confidence: 0.91,
    };
  }

  // 15. RUTYNOWE CZYNNOŚCI BEZ RYZYKA (AUTOSUCCESS DOZWOLONY)
  for (const mundPattern of MUNDANE_PATTERNS) {
    if (mundPattern.test(text) || mundPattern.test(rawLower)) {
      return {
        eventId: event.id,
        plausibility: 'plausible',
        category: 'mundane',
        requiresCheck: false,
        isAutosuccessAllowed: true,
        suggestedOutcome: 'auto_success',
        confidence: 0.95,
      };
    }
  }

  // 16. CZYSTY DIALOG / ROZMOWA (BEZ PRÓBY PRZEŁAMANIA WOLI NPC)
  if (event.directQuote || /(?:mówię|pytam|odpowiadam|witam|dzień\s+dobry|say|ask|hello)/i.test(text)) {
    return {
      eventId: event.id,
      plausibility: 'plausible',
      category: 'dialogue',
      requiresCheck: false,
      isAutosuccessAllowed: true,
      suggestedOutcome: 'auto_success',
      confidence: 0.92,
    };
  }

  // 17. DOMYŚLNY FALLBACK DLA ZWYKŁYCH DEKLARACJI
  return {
    eventId: event.id,
    plausibility: 'plausible',
    category: 'physical',
    requiresCheck: false,
    isAutosuccessAllowed: true,
    suggestedOutcome: 'auto_success',
    confidence: 0.7,
  };
}

// ----------------------------------------------------------------------------
// RESOLVE TO REAL EVENT
// ----------------------------------------------------------------------------

function formatDifficulty(
  diff?: 'regular' | 'hard' | 'extreme',
  isEn: boolean = false
): string {
  if (isEn) return diff || 'regular';
  if (diff === 'hard') return 'trudny';
  if (diff === 'extreme') return 'ekstremalny';
  return 'zwykły';
}

/**
 * Przekształca Putative Event i wynik adjudykacji w obiektywny Real Event (ugruntowany fakt).
 */
export function resolveToRealEvent(
  event: PutativeEvent,
  adjudication: AdjudicationResult,
  locale: 'pl' | 'en' = 'pl',
  isHotSeat: boolean = false
): RealEvent {
  const isEn = locale === 'en';
  const id = `re_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // 1. ZDARZENIE TO ROZSTRZYGNIĘTY RZUT KOŚCIĄ (TACKA / RESOLUTION)
  if (event.isDiceRoll) {
    const rollInfo = parseDiceRollMessage(event.rawText);
    const skillLabel = rollInfo.skillName ? ` (${rollInfo.skillName})` : '';
    const outcomeDesc = rollInfo.outcomeLabel || (rollInfo.isSuccess ? 'sukces' : 'porażka');

    const groundedFact = isEn
      ? `The investigator (${event.actorName}) completed a dice roll${skillLabel} on the tray: outcome is "${outcomeDesc}". The outcome is settled.`
      : `Badacz (${event.actorName}) wykonał rzut kością${skillLabel} na Tacce: wynik to "${outcomeDesc}". Rozstrzygnięcie jest dokonane.`;

    const mechanicalDirective = isEn
      ? `DICE ROLL RESOLUTION: The dice have spoken. Narrate the narrative outcome and consequences of this result (outcome: ${outcomeDesc}). STRICTLY FORBIDDEN to ask for another test on this same action!`
      : `ROZSTRZYGNIĘCIE RZUTU KOŚCIĄ: Kości zadecydowały. Opisz teraz fabularne skutki i konsekwencje tego wyniku (wynik: ${outcomeDesc}). BEZWZGLĘDNY ZAKAZ ponownego wzywania testu na tę samą akcję!`;

    return {
      id,
      putativeEventId: event.id,
      actorName: event.actorName,
      groundedFact,
      directQuote: event.directQuote,
      status: 'established',
      mechanicalDirective,
      timestamp: Date.now(),
    };
  }

  // 2. TWARDE WETO SĘDZIEGO (AKCJA NIEMOŻLIWA)
  if (adjudication.suggestedOutcome === 'blocked_impossible') {
    const groundedFact = isEn
      ? `The investigator (${event.actorName}) attempts: "${event.actionAttempt}", but it is physically or situationally impossible [${adjudication.plausibilityReason || 'Physical limitation / missing gear'}]. The action does not occur.`
      : `Badacz (${event.actorName}) próbuje podjąć akcję: "${event.actionAttempt}", lecz jest to fizycznie lub sytuacyjnie niemożliwe [${adjudication.plausibilityReason || 'Ograniczenie fizyczne / brak sprzętu'}]. Akcja nie dochodzi do skutku.`;

    const mechanicalDirective = isEn
      ? `STRICT REFEREE VETO (CoC 7e RAW): Firmly and diegetically explain in 1-2 concise sentences why this cannot be done. Do not call for a roll. Do not advance game clock. End with [What do you do?].`
      : `TWARDE WETO SĘDZIEGO (CoC 7e RAW): Wyjaśnij krótko i diegetycznie w 1-2 zdaniach z pozycji Sędziego dlaczego akcja jest niemożliwa. Nie wzywaj testu kością. Czas gry nie upływa. Zakończ pytaniem [Co robisz?].`;

    return {
      id,
      putativeEventId: event.id,
      actorName: event.actorName,
      groundedFact,
      directQuote: event.directQuote,
      status: 'blocked',
      mechanicalDirective,
      timestamp: Date.now(),
    };
  }

  // 3. WYMAGANY TEST MECHANIKI (AKCJA RYZYKOWNA)
  if (adjudication.suggestedOutcome === 'pending_check') {
    const checkReq = adjudication.checkRequirement;
    const skillName = checkReq?.skillOrAttribute || (isEn ? 'Relevant Skill' : 'Umiejętność');
    const diff = formatDifficulty(checkReq?.difficulty, isEn);

    const groundedFact = isEn
      ? `The investigator (${event.actorName}) initiates attempt: "${event.actionAttempt}". The outcome is uncertain and requires a rules check [TEST: ${skillName} | ${diff}]. Unverified autosuccess has NOT occurred.`
      : `Badacz (${event.actorName}) podejmuje próbę: "${event.actionAttempt}". Wynik akcji jest niepewny i wymaga rzutu na mechanikę [TEST: ${skillName} | ${diff}]. Samowolny sukces nie nastąpił.`;

    const actorPrefix = isHotSeat && event.actorName ? `@${event.actorName}: ` : '';
    const tagExample = `[TEST: ${actorPrefix}${skillName} | ${diff} | ${checkReq?.reason || event.actionAttempt}]`;

    const mechanicalDirective = isEn
      ? `NARRATIVE SUSPENSE & MECHANICAL CHECK REQUIRED: Weave atmospheric prose describing the beginning of the attempt. STRICTLY FORBIDDEN to narrate final success. You MUST emit the exact check tag: ${tagExample} and suspend the outcome until the player rolls!`
      : `ZAWIESZENIE NARRACYJNE & WYMAGANY TEST MECHANIKI: Opisz zmysłowy początek próby z zachowaniem suspensu. BEZWZGLĘDNY ZAKAZ opisywania finałowego sukcesu. MUSISZ wyemitować oficjalny tag: ${tagExample} i zawiesić wynik akcji do czasu rzutu kością na Tacce!`;

    return {
      id,
      putativeEventId: event.id,
      actorName: event.actorName,
      groundedFact,
      directQuote: event.directQuote,
      status: 'check_required',
      mechanicalDirective,
      checkRequirement: checkReq,
      timestamp: Date.now(),
    };
  }

  // 4. AUTOSUKCES / CZYNNOŚĆ RUTYNOWA
  const groundedFact = isEn
    ? `The investigator (${event.actorName}) performs routine action: "${event.actionAttempt}".`
    : `Badacz (${event.actorName}) wykonuje czynność rutynową: "${event.actionAttempt}".`;

  const mechanicalDirective = isEn
    ? `Weave the action organically into the scene narration.`
    : `Wpleć czynność organicznie w prozę sceny.`;

  return {
    id,
    putativeEventId: event.id,
    actorName: event.actorName,
    groundedFact,
    directQuote: event.directQuote,
    status: 'established',
    mechanicalDirective,
    timestamp: Date.now(),
  };
}

// ----------------------------------------------------------------------------
// BUILD CONCORDIA EVENT RESOLUTION DIRECTIVE
// ----------------------------------------------------------------------------

/**
 * Buduje sekcję dyrektywy Event Resolution do wstrzyknięcia w prompt systemowy (run-chat-pipeline).
 */
export function buildConcordiaEventResolutionDirective(
  realEvent: RealEvent,
  locale: 'pl' | 'en' = 'pl',
  isDiceRoll: boolean = false
): string {
  const isEn = locale === 'en';
  const lines: string[] = [];

  const header = isEn
    ? '## EVENT RESOLUTION & INTENT ADJUDICATION (CONCORDIA GM PATTERN)'
    : '## ADJUDYKACJA ZDARZEŃ I INTENCJI GRACZA (CONCORDIA EVENT RESOLUTION)';
  lines.push(header);

  if (isDiceRoll) {
    if (isEn) {
      lines.push(
        `1. GROUNDED FACT (DICE ROLL RESOLUTION): ${realEvent.groundedFact}\n` +
        `   - Event Status: ${realEvent.status.toUpperCase()}\n` +
        `   - Directive: ${realEvent.mechanicalDirective}\n`
      );
      lines.push(
        '2. ANTI-LOOP & RESOLUTION INVARIANT:\n' +
        '   - The player message was a completed dice roll resolution, NOT a new action attempt.\n' +
        '   - Narrate the dramatic outcome (success or failure) immediately into the fiction.\n' +
        '   - Do NOT call for a new test or emit [TEST:] for this completed check.'
      );
    } else {
      lines.push(
        `1. UGRUNTOWANY FAKT (ROZSTRZYGNIĘCIE RZUTU): ${realEvent.groundedFact}\n` +
        `   - Status Zdarzenia: ${realEvent.status.toUpperCase()}\n` +
        `   - Dyrektywa dla MG: ${realEvent.mechanicalDirective}\n`
      );
      lines.push(
        '2. INWARIANT DOMKNIĘCIA RZUTU (ZAKAZ ZAPĘTLANIA TESTÓW):\n' +
        '   - Wiadomość gracza zawiera oficjalne rozstrzygnięcie rzutu z Tacki, a NIE nową deklarację akcji.\n' +
        '   - Wprowadź ostateczny wynik rzutu (sukces lub porażkę) bezpośrednio do fabuły.\n' +
        '   - BEZWZGLĘDNY ZAKAZ ponownego emitowania tagu [TEST:] na tę samą czynność.'
      );
    }
    return `\n${lines.join('\n')}\n`;
  }

  if (isEn) {
    lines.push(
      `1. GROUNDED FACT (REAL EVENT): ${realEvent.groundedFact}\n` +
      `   - Event Status: ${realEvent.status.toUpperCase()}\n` +
      `   - Directive: ${realEvent.mechanicalDirective}\n`
    );
    if (realEvent.directQuote) {
      lines.push(`   - Verbatim Investigator Dialogue: "${realEvent.directQuote}" (Keep character voice consistent)`);
    }
    lines.push(
      '2. ANTI-AUTOSUCCESS INVARIANT:\n' +
      '   - The player message was a Putative Event (intention), NOT an established fact.\n' +
      '   - If Event Status is CHECK_REQUIRED: Never narrate that the investigator opened the door, subdued the foe, or uncovered the secret. Narrate the attempt and call for the dice test!\n' +
      '   - If Event Status is BLOCKED: State the physical/historical barrier diegetically and prompt [What do you do?].\n' +
      '   - If Event Status is ESTABLISHED: Action succeeds normally as a routine action.'
    );
  } else {
    lines.push(
      `1. UGRUNTOWANY FAKT (REAL EVENT): ${realEvent.groundedFact}\n` +
      `   - Status Zdarzenia: ${realEvent.status.toUpperCase()}\n` +
      `   - Dyrektywa dla MG: ${realEvent.mechanicalDirective}\n`
    );
    if (realEvent.directQuote) {
      lines.push(`   - Wypowiedź dosłowna gracza: "${realEvent.directQuote}" (Zachowaj w dialogu)`);
    }
    lines.push(
      '2. ŻELAZNY ZAKAZ AUTOSUKCESU (INWARIANT CONCORDIA):\n' +
      '   - Wypowiedź gracza w czacie to wyłącznie deklaracja intencji (Putative Event), a NIE dokonany fakt.\n' +
      '   - Gdy Status Zdarzenia to CHECK_REQUIRED: Pod żadnym pozorem nie opisuj samowolnego sukcesu akcji! Opisz wyłącznie podjęcie próby i wyzwij odpowiedni [TEST: ...].\n' +
      '   - Gdy Status Zdarzenia to BLOCKED: Zastosuj Twarde Weto Sędziego CoC 7e RAW (odmów wykonania niemożliwej akcji w 1-2 zdaniach) i zakończ pytaniem [Co robisz?].\n' +
      '   - Gdy Status Zdarzenia to ESTABLISHED: Akcja rutynowa lub dialog powiodły się zwyczajnie w fikcji.'
    );
  }

  return `\n${lines.join('\n')}\n`;
}

// ----------------------------------------------------------------------------
// UNIFIED PIPELINE ENTRY POINT
// ----------------------------------------------------------------------------

export interface EventResolutionPipelineOutput {
  putativeEvent: PutativeEvent;
  adjudication: AdjudicationResult;
  realEvent: RealEvent;
  directive: string;
}

/**
 * Uruchamia pełny deterministyczny potok Event Resolution w <1 ms:
 * Ekstrakcja intencji -> Adjudykacja -> Ugruntowany fakt -> Dyrektywa dla MG.
 */
export function adjudicateEventPipeline(
  message: string,
  context: AdjudicationContext = {}
): EventResolutionPipelineOutput {
  const isHotSeat = Boolean(context.characters && context.characters.length >= 2);
  const defaultActor = context.character?.name || context.characters?.[0]?.name || 'Badacz';
  const putativeEvent = extractPutativeEvent(message, defaultActor, context.currentLocation);

  // Jeśli prefiks @Name: wskaże innego badacza w drużynie, dobierz jego profil
  const activeChar =
    (putativeEvent.actorName ? context.characters?.find((c) => c.name === putativeEvent.actorName) : undefined) ??
    context.character ??
    context.characters?.[0] ??
    null;

  const adjContext: AdjudicationContext = {
    ...context,
    character: activeChar,
  };

  const adjudication = adjudicatePutativeEvent(putativeEvent, adjContext);
  const realEvent = resolveToRealEvent(putativeEvent, adjudication, context.locale, isHotSeat);
  const directive = buildConcordiaEventResolutionDirective(realEvent, context.locale, Boolean(putativeEvent.isDiceRoll));

  return {
    putativeEvent,
    adjudication,
    realEvent,
    directive,
  };
}
