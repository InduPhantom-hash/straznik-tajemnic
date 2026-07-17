import { SFXRequest } from './types';

// ============================================================================
// GM PROTOCOL TAGS (Priorytet wysoki - strukturalne tagi generowane przez AI)
// ============================================================================

/** [NPC: Imię: Opis] */
export const TAG_NPC_PATTERN = /\[NPC:\s*([^:\]]+):\s*([^\]]+)\]/gi;

/** [LOKACJA: Nazwa: Opis] */
export const TAG_LOCATION_PATTERN = /\[LOKACJA:\s*([^:\]]+):\s*([^\]]+)\]/gi;

/** [PRZEDMIOT: Nazwa: Opis] */
export const TAG_ITEM_PATTERN = /\[PRZEDMIOT:\s*([^:\]]+):\s*([^\]]+)\]/gi;

/** [MYŚLI_MG: treść] — ukryty monolog wewnętrzny AI (nie wyświetlany graczowi) */
export const TAG_GM_THOUGHTS_PATTERN = /\[MYŚLI_MG:\s*([^\]]+)\]/gi;

/** [NASTRÓJ: przymiotnik] — dyrektywa tonu sceny */
export const TAG_MOOD_PATTERN = /\[NASTRÓJ:\s*([^\]]+)\]/gi;

/** [CEL_NARRACYJNY: opis] — intencja narracyjna sceny */
export const TAG_NARRATIVE_GOAL_PATTERN = /\[CEL_NARRACYJNY:\s*([^\]]+)\]/gi;

/** [WALKA: START] lub [WALKA: KONIEC] */
export const TAG_COMBAT_PATTERN = /\[WALKA:\s*(START|KONIEC)\]/gi;

/** [SANITY: liczba: powód] */
export const TAG_SANITY_PATTERN = /\[SANITY:\s*(-?\d+):\s*([^\]]+)\]/gi;

// ============================================================================
// LEGACY PATTERNS (Fallback - wykrywanie z języka naturalnego)
// ============================================================================

// Wydarzenia - NPC
export const NPC_PATTERNS = [
    /spotykasz\s+([A-ZŻŹĆĄŚĘŁÓŃ][a-ząćęłńóśźż]+(?:\s+[A-ZŻŹĆĄŚĘŁÓŃ][a-ząćęłńóśźż]+)?)/gi,
    /poznajesc?\s+([A-ZŻŹĆĄŚĘŁÓŃ][a-ząćęłńóśźż]+(?:\s+[A-ZŻŹĆĄŚĘŁÓŃ][a-ząćęłńóśźż]+)?)/gi,
    /([A-ZŻŹĆĄŚĘŁÓŃ][a-ząćęłńóśźż]+(?:\s+[A-ZŻŹĆĄŚĘŁÓŃ][a-ząćęłńóśźż]+)?)\s+(?:mówi|pyta|odpowiada|szepcze|krzyczy)/gi,
    /(?:dr\.|doktor|profesor|pan|pani)\s+([A-ZŻŹĆĄŚĘŁÓŃ][a-ząćęłńóśźż]+)/gi,
];

// Wydarzenia - Lokacje
export const LOCATION_PATTERNS = [
    /(?:przybywacie?|wchodzisz|docierasz|znajdujesz się)\s+(?:do|w|na)\s+([A-ZŻŹĆĄŚĘŁÓŃ][^.!?]+)/gi,
    /(?:jesteś|znajdujesz się)\s+(?:w|na|przed)\s+([A-ZŻŹĆĄŚĘŁÓŃ][^.!?]+)/gi,
    /(?:Arkham|Innsmouth|Dunwich|Kingsport|Miskatonic)/gi,
];

// Wydarzenia - Przedmioty
export const ITEM_PATTERNS = [
    /znajdujesz\s+([^.!?]+)/gi,
    /otrzymujesz\s+([^.!?]+)/gi,
    /zabierasz\s+([^.!?]+)/gi,
    /(?:stary|tajemniczy|dziwny)\s+(notes|książk[ęa]|list|klucz|amulet|miecz|pistolet)/gi,
];

// Walka - Start
export const COMBAT_START_PATTERNS = [
    /walka\s+(?:rozpoczyna|zaczyna)\s+się/gi,
    /atakuje?\s+(?:cię|was|ciebie)/gi,
    /(?:rzuć|rzucaj)\s+(?:na\s+)?inicjatyw[ęy]/gi,
    /(?:rozpoczyna|zaczyna)\s+się\s+starcie/gi,
    /(?:napada|napadają)\s+(?:na\s+)?(?:ciebie|was)/gi,
];

// Walka - Obrażenia gracza
export const DAMAGE_PLAYER_PATTERNS = [
    /tracisz\s+(\d+)\s+punkt[ówy]?\s+życia/gi,
    /otrzymujesz\s+(\d+)\s+(?:punkt[ówy]?\s+)?obrażeń/gi,
    /(?:cios|atak)\s+zadaje\s+(?:ci\s+)?(\d+)\s+obrażeń/gi,
    /(\d+)\s+obrażeń/gi,
];

// Walka - Koniec
export const COMBAT_END_PATTERNS = [
    /walka\s+(?:kończy|dobiega)\s+się/gi,
    /pokonujesz\s+/gi,
    /(?:przeciwnik|wróg|potwór)\s+(?:pada|upada|ginie)/gi,
    /(?:uciekasz|wycofujesz się)/gi,
];

// Poczytalność
export const SANITY_PATTERNS = [
    /tracisz\s+(\d+)\s+punkt[ówy]?\s+poczytalności/gi,
    /(?:twoja\s+)?poczytalność\s+spada\s+o\s+(\d+)/gi,
    /test\s+poczytalności/gi,
];

// SFX Patterns
export const SFX_PATTERNS: { pattern: RegExp; presetId: string; category: SFXRequest['category'] }[] = [
    // Horror
    { pattern: /skrzypią?ce?\s+(drzwi|podłog|schod)/gi, presetId: 'creaking_door', category: 'horror' },
    { pattern: /dzwonienie?\s+telefon/gi, presetId: 'old_phone', category: 'city_1920s' },
    { pattern: /kroki|stąpanie|kroczenie/gi, presetId: 'footsteps_wood', category: 'ambient' },
    { pattern: /krzyk|wrzask|wrzasnął/gi, presetId: 'distant_scream', category: 'horror' },
    { pattern: /szept|szepcze|szepnął/gi, presetId: 'whispers', category: 'supernatural' },
    { pattern: /grzmot|błyskawica|piorun/gi, presetId: 'thunder', category: 'nature' },
    { pattern: /deszcz|pada|ulewa/gi, presetId: 'rain_heavy', category: 'nature' },
    { pattern: /wiatr|wieje|szum/gi, presetId: 'wind_howling', category: 'nature' },
    { pattern: /strzał|wystrzał|pistolet|rewolwer/gi, presetId: 'gunshot', category: 'combat' },
    { pattern: /eksplozja|wybuch/gi, presetId: 'explosion', category: 'combat' },
    { pattern: /kościół|dzwon/gi, presetId: 'church_bell', category: 'city_1920s' },
    { pattern: /samochód|auto|motor/gi, presetId: 'car_engine_1920s', category: 'city_1920s' },
    { pattern: /zegar|tyka|wybija/gi, presetId: 'clock_ticking', category: 'ambient' },
    { pattern: /fale|morze|ocean/gi, presetId: 'ocean_waves', category: 'nature' },
    { pattern: /rytuał|zaklęcie|inkantacj/gi, presetId: 'ritual_chant', category: 'supernatural' },
    { pattern: /jęk|jęczy|stęka/gi, presetId: 'groan', category: 'horror' },
];
