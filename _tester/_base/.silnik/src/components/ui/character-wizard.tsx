'use client';

import { SafeImage } from '@/components/ui/safe-image';
import { Fragment, useState, useCallback, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import * as Sentry from '@sentry/nextjs';
import { Button } from './button';
import { HelpIcon } from './tooltip';
import { ImageLightbox } from './image-lightbox';
import { Character, EquipmentItem, EquipmentCategory } from '@/lib/types';
import {
  AdventureContext,
  CHARACTER_ARCHETYPES,
  getAdventureContextPrompt,
} from '@/lib/adventures-data';
import { fetchWithApiKeys } from '@/lib/api-keys-service';
import {
  findEquipmentByName,
  createEquipmentItem,
  splitTopLevel,
  withEquipmentDefaults,
  getStartingEquipmentForOccupation,
} from '@/lib/equipment-data';
import { collectSSEText } from '@/lib/sse-parser';
import { STAT_FULL_NAMES } from '@/components/ui/character-sheet/types';
import { buildRecommendedSkills } from '@/lib/character/normalize-skill-name';
import { distributeRecommendedSkillPoints } from '@/lib/character/distribute-skill-points';
import { toast } from '@/components/ui/use-toast';
import { resolveEraVisualProfile } from '@/lib/era-visual-style';
import {
  type CharacterStats,
  type DerivedStats,
  STAT_DESCRIPTIONS,
  DERIVED_DESCRIPTIONS,
  OCCUPATIONS,
  OCCUPATION_DESCRIPTIONS,
  SKILL_DESCRIPTIONS,
  BASE_SKILLS,
  SKILL_CREATION_LIMIT,
  SKILL_LIMIT_EXCEPTIONS,
  AGE_MODIFIERS,
  FIELD_PROMPTS,
} from '@/lib/data/character';
import {
  roll3d6x5,
  roll2d6plus6x5,
  half,
  fifth,
  calculateDerived as libCalculateDerived,
  getWealthInfo as libGetWealthInfo,
  calculateOccupationPoints as libCalculateOccupationPoints,
  generateVisualDescription,
  generateItemLore,
  categorizeItem,
  estimateWeight,
} from '@/lib/character';

// ============================================================================
// DANE REKOMENDACJI
// ============================================================================

/**
 * Mapowanie archetypów na kluczowe umiejętności CoC 7e. Module-level, by render
 * (highlight zielonych rekomendacji w kroku Umiejętności) i autoDistributeSkillsAI
 * korzystały z jednego źródła. Zero zmian logiki - wyniesione 1:1.
 */
/**
 * Nazwy umiejętności są kluczami danych aplikacji (BASE_SKILLS/OCCUPATIONS w
 * lib/data/character) i pozostają po polsku niezależnie od locale UI. Dlatego
 * literale zapisujemy z ucieczkami unicode - wartości runtime identyczne.
 */
const ARCHETYPE_SKILL_MAP: Record<string, string[]> = {
  investigator: [
    'Spostrzegawczo\u015b\u0107',
    'Biblioteka',
    'Psychologia',
    'Perswazja',
  ],
  scholar: ['Biblioteka', 'Historia', 'J\u0119zyk Obcy', 'Nauka'],
  action: ['Walka Wr\u0119cz', 'Bro\u0144 Palna', 'Unik', 'Atletyka'],
  trickster: ['Ukrywanie', 'Perswazja', 'Psychologia', 'Skradanie'],
  mystic: ['Occultyzm', 'Psychologia', 'Historia', 'Nas\u0142uchiwanie'],
  healer: ['Medycyna', 'Pierwsza Pomoc', 'Psychologia', 'Nauka (Biologia)'],
  custom: [],
};

/** Stabilne identyfikatory umiejętności specjalnych (dane aplikacji, nie UI). */
const NATIVE_LANGUAGE_SKILL = 'J\u0119zyk Ojczysty';
const CREDIT_RATING_SKILL = 'Maj\u0119tno\u015b\u0107';

// ============================================================================
// LOSOWANIE CECH (krok po kroku)
// ============================================================================

/** Klucze 9 cech CoC 7e w stałej kolejności wyświetlania. */
const STAT_KEYS = [
  'str',
  'con',
  'siz',
  'dex',
  'app',
  'int',
  'pow',
  'edu',
  'luck',
] as const;
type StatKey = (typeof STAT_KEYS)[number];

/**
 * Mapa cecha -> wzór rzutu (CoC 7e). SIZ/INT/EDU używają 2K6+6×5, reszta 3K6×5.
 * Spójne z generateRandomStats w @/lib/character/dice (jedno źródło logiki rzutu
 * - tutaj tylko etykieta wzoru i wybór funkcji per pojedynczą cechę).
 */
const STAT_DICE: Record<StatKey, { label: string; roll: () => number }> = {
  str: { label: '3K6×5', roll: roll3d6x5 },
  con: { label: '3K6×5', roll: roll3d6x5 },
  siz: { label: '2K6+6×5', roll: roll2d6plus6x5 },
  dex: { label: '3K6×5', roll: roll3d6x5 },
  app: { label: '3K6×5', roll: roll3d6x5 },
  int: { label: '2K6+6×5', roll: roll2d6plus6x5 },
  pow: { label: '3K6×5', roll: roll3d6x5 },
  edu: { label: '2K6+6×5', roll: roll2d6plus6x5 },
  luck: { label: '3K6×5', roll: roll3d6x5 },
};

/** Stan losowania jednej cechy: czy rzucono i czy zużyto jednorazowy przerzut. */
type StatRollState = { rolled: boolean; rerollUsed: boolean };
type StatRollMap = Record<StatKey, StatRollState>;

/**
 * Spłaszcza wartość pola tła od AI do czytelnego tekstu.
 * AI (Gemini) mimo prośby o string czasem zwraca obiekt/tablicę
 * (np. importantPeople jako [{name, relationship, whyImportant}]).
 * Taka wartość trafiałaby do pola string state i crashowała render
 * karty postaci (React #31 - obiekt jako dziecko JSX). Tu normalizujemy.
 */
function coerceFieldToText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  if (Array.isArray(value))
    return value
      .map((v) => coerceFieldToText(v))
      .filter(Boolean)
      .join('; ');
  if (typeof value === 'object')
    return Object.values(value as Record<string, unknown>)
      .map((v) => coerceFieldToText(v))
      .filter(Boolean)
      .join(', ');
  return '';
}

/** Świeża mapa stanu losowania - wszystkie cechy nierzucone, przerzut wolny. */
function createStatRollMap(): StatRollMap {
  return STAT_KEYS.reduce((acc, key) => {
    acc[key] = { rolled: false, rerollUsed: false };
    return acc;
  }, {} as StatRollMap);
}

// ============================================================================
// TYPY
// ============================================================================

interface WizardState {
  step: number;
  // Krok 1
  stats: CharacterStats;
  /**
   * Metoda przydziału charakterystyk (CoC 7e):
   * - 'roll'     - rzut kośćmi (3K6×5 / 2K6+6×5), suma BEZ sztucznego capa, brak
   *                walidacji przeciw budżetowi ~460.
   * - 'pointbuy' - rozdział punktów z TWARDYM capem sumy = 460 (zestaw RAW
   *                40/50/50/50/60/60/70/80), z walidacją.
   */
  statMethod: 'roll' | 'pointbuy';
  age: number;
  derived: DerivedStats;
  // Krok 2
  occupationId: string | null;
  occupationPoints: number;
  // Krok 3
  skills: Record<string, number>;
  occupationPointsUsed: number;
  interestPoints: number;
  interestPointsUsed: number;
  creditRating: number;
  // Krok 4
  name: string;
  gender: string;
  birthplace: string;
  description: string;
  ideology: string;
  importantPeople: string;
  significantPlaces: string;
  personalItems: string;
  traits: string;
  keyConnection: string;
  backstory: string;
  portraitUrl: string | null;
  isGeneratingPortrait: boolean;
  isGeneratingBackstory: boolean;
  isGeneratingNarrative: boolean;
  // Krok 5
  equipment: string;
}

interface Props {
  onCharacterCreated: (character: Character) => void;
  onClose: () => void;
  adventureContext?: AdventureContext; // Kontekst przygody dla AI
  /**
   * Re-roll: istniejąca postać do "rozdania statystyk od nowa". Zachowuje
   * imię/zawód/historię/dziennik (id), ale gracz rozdaje cechy i umiejętności
   * jeszcze raz. Gdy undefined - tryb tworzenia nowej postaci (bez zmian).
   */
  initialCharacter?: Character;
}

// ============================================================================
// GŁÓWNY KOMPONENT
// ============================================================================

export function CharacterWizardV2({
  onCharacterCreated,
  onClose,
  adventureContext,
  initialCharacter,
}: Props) {
  const t = useTranslations('CharacterWizard');
  const dynamicT = t as unknown as ((key: string) => string) & { has?: (key: string) => boolean };
  const statShortDesc: Record<string, string> = {
    str: t('statShort.str'),
    con: t('statShort.con'),
    siz: t('statShort.siz'),
    dex: t('statShort.dex'),
    app: t('statShort.app'),
    int: t('statShort.int'),
    pow: t('statShort.pow'),
    edu: t('statShort.edu'),
    luck: t('statShort.luck'),
  };

  // Funkcja do obliczania umiejętności dynamicznych (Język Ojczysty = WYK, Unik = ZR/2)
  const getInitialSkills = (edu: number, dex: number) => ({
    ...BASE_SKILLS,
    [NATIVE_LANGUAGE_SKILL]: edu, // Język Ojczysty = WYK (zgodnie z CoC7)
    Unik: Math.floor(dex / 2), // Unik = ZR/2 (zgodnie z CoC7)
  });

  // Buduje stan startowy kreatora. Bez `char` - czysta nowa postać.
  // Z `char` (re-roll) - seed koncepcji/historii, statystyki rozdawane od nowa
  // (krok 1, cechy bazowe; zawód wybierany ponownie w kroku 2).
  const buildInitialState = (char?: Character): WizardState => {
    const base: WizardState = {
      step: 1,
      stats: {
        str: 50,
        con: 50,
        siz: 50,
        dex: 50,
        app: 50,
        int: 50,
        pow: 50,
        edu: 50,
        luck: 50,
      },
      statMethod: 'roll',
      age: 25,
      derived: {
        hp: 10,
        san: 50,
        mp: 10,
        damageBonus: '0',
        build: 0,
        movement: 8,
      },
      occupationId: null,
      occupationPoints: 0,
      skills: getInitialSkills(50, 50), // Dynamiczne wartości Język Ojczysty i Unik
      occupationPointsUsed: 0,
      interestPoints: 0,
      interestPointsUsed: 0,
      creditRating: 0,
      name: '',
      gender: '',
      birthplace: '',
      description: '',
      ideology: '',
      importantPeople: '',
      significantPlaces: '',
      personalItems: '',
      traits: '',
      keyConnection: '',
      backstory: '',
      portraitUrl: null,
      isGeneratingPortrait: false,
      isGeneratingBackstory: false,
      isGeneratingNarrative: false,
      equipment: '',
    };
    if (!char) return base;
    return {
      ...base,
      age: char.age ?? base.age,
      name: char.name ?? '',
      gender: char.gender ?? '',
      birthplace: char.birthplace ?? '',
      description: char.description ?? '',
      ideology: char.ideology ?? '',
      importantPeople: char.significantPerson ?? '',
      significantPlaces: char.meaningfulLocation ?? '',
      personalItems: char.treasuredPossession ?? '',
      traits: Array.isArray(char.traits) ? char.traits.join(', ') : '',
      keyConnection: char.background ?? '',
      backstory: char.backstory ?? '',
      portraitUrl: char.portraitUrl ?? null,
    };
  };

  const [state, setState] = useState<WizardState>(() =>
    buildInitialState(initialCharacter)
  );

  // Stan dla wybranego archetypu postaci
  const [selectedArchetypeId, setSelectedArchetypeId] = useState<string | null>(
    null
  );

  // Stan wyszukiwarki i filtra profesji (Krok 3)
  const [occupationSearchQuery, setOccupationSearchQuery] = useState('');
  const [occupationFilter, setOccupationFilter] = useState<
    'all' | 'recommended'
  >('all');

  // State for per-field AI generation
  const [generatingField, setGeneratingField] = useState<string | null>(null);

  // State for preventing double-click on character creation
  const [isCreating, setIsCreating] = useState(false);

  // Krok 2 (Cechy): wybrana metoda przydziału charakterystyk. JEDNO źródło prawdy =
  // `state.statMethod` (część głównego stanu kreatora, używana też przez walidację/zapis).
  // 'roll' = rzut kośćmi krok po kroku, 'pointbuy' = ręczny rozdział z puli 460.
  const statMethod = state.statMethod;
  const setStatMethod = useCallback(
    (method: 'roll' | 'pointbuy') =>
      setState((prev) => ({ ...prev, statMethod: method })),
    []
  );

  // Stan losowania per cecha (czy rzucona + czy zużyto jednorazowy przerzut).
  // Używany tylko w trybie statMethod === 'roll'.
  const [statRolls, setStatRolls] = useState<StatRollMap>(() =>
    createStatRollMap()
  );

  const TOTAL_STEPS = 6;

  // ============================================================================
  // FUNKCJE POMOCNICZE
  // ============================================================================

  // IND-178 (sesja 92) - pure helpers przeniesione do @/lib/character
  // (roll/roll3d6x5/roll2d6plus6x5/half/fifth/getDamageAndBuild/getMovement/calculateDerived/calculateOccupationPoints).
  // calculateDerived useCallback wrapper zachowuje stable reference dla useEffect deps.

  const calculateDerived = useCallback(
    (stats: CharacterStats, age: number): DerivedStats =>
      libCalculateDerived(stats, age),
    []
  );

  // Zapisuje nową wartość JEDNEJ cechy + przelicza cechy pochodne i dynamiczne
  // umiejętności (Język Ojczysty = WYK, Unik = ZR/2). Wspólna ścieżka dla rzutu,
  // przerzutu i ręcznej edycji - jedno miejsce trzyma spójność stanu.
  const applyStatValue = useCallback(
    (stat: StatKey, value: number) => {
      setState((prev) => {
        const stats = { ...prev.stats, [stat]: value };
        const derived = calculateDerived(stats, prev.age);
        const skills = { ...prev.skills };
        if (stat === 'edu') skills[NATIVE_LANGUAGE_SKILL] = stats.edu;
        if (stat === 'dex') skills.Unik = Math.floor(stats.dex / 2);
        return { ...prev, stats, derived, skills };
      });
    },
    [calculateDerived]
  );

  // 1C: pierwszy rzut dla jednej cechy. Oznacza ją jako rzuconą.
  const rollSingleStat = useCallback(
    (stat: StatKey) => {
      applyStatValue(stat, STAT_DICE[stat].roll());
      setStatRolls((prev) => ({
        ...prev,
        [stat]: { ...prev[stat], rolled: true },
      }));
    },
    [applyStatValue]
  );

  // 1D: jednorazowy przerzut cechy - dozwolony tylko po pierwszym rzucie i tylko
  // raz. Po użyciu cecha zostaje zablokowana (rerollUsed).
  const rerollSingleStat = useCallback(
    (stat: StatKey) => {
      const current = statRolls[stat];
      if (!current.rolled || current.rerollUsed) return;
      applyStatValue(stat, STAT_DICE[stat].roll());
      setStatRolls((prev) => ({
        ...prev,
        [stat]: { ...prev[stat], rerollUsed: true },
      }));
    },
    [statRolls, applyStatValue]
  );

  // 1C: skrót "rzuć wszystkie naraz" - losuje TYLKO cechy jeszcze nierzucone.
  // NIE konsumuje przerzutów (te działają wyłącznie na już rzucone cechy).
  const generateStats = useCallback(() => {
    // Wylosuj nowe wartości tylko dla nierzuconych cech (na podstawie aktualnego
    // statRolls z domknięcia). Setter stanu liczy z prev, więc nadpisuje punktowo.
    const rolledValues: Partial<Record<StatKey, number>> = {};
    for (const key of STAT_KEYS) {
      if (!statRolls[key].rolled) rolledValues[key] = STAT_DICE[key].roll();
    }
    if (Object.keys(rolledValues).length === 0) return;

    setState((prev) => {
      const stats = { ...prev.stats };
      for (const key of STAT_KEYS) {
        const v = rolledValues[key];
        if (v !== undefined) stats[key] = v;
      }
      const derived = calculateDerived(stats, prev.age);
      const skills = {
        ...prev.skills,
        [NATIVE_LANGUAGE_SKILL]: stats.edu,
        Unik: Math.floor(stats.dex / 2),
      };
      return { ...prev, stats, derived, skills };
    });
    setStatRolls((prev) => {
      const next = { ...prev };
      for (const key of STAT_KEYS) {
        if (rolledValues[key] !== undefined) {
          next[key] = { ...prev[key], rolled: true };
        }
      }
      return next;
    });
  }, [statRolls, calculateDerived]);

  const selectOccupation = (occupationId: string) => {
    const occ = OCCUPATIONS.find((o) => o.id === occupationId);
    if (!occ) return;
    const points = libCalculateOccupationPoints(occupationId, state.stats);
    // Ekwipunek startowy "na sztywno" wg zawodu (CoC 7e) - deterministycznie,
    // bez AI. Wybór zawodu wstawia jego standardowy zestaw przedmiotów.
    const startingEquipment =
      getStartingEquipmentForOccupation(occupationId).join(', ');
    setState((prev) => ({
      ...prev,
      occupationId,
      occupationPoints: points,
      occupationPointsUsed: 0,
      interestPointsUsed: 0,
      equipment: startingEquipment,
      // RAW: minimalna Majętność zawodu. Kosztuje z puli (creditMin punktów),
      // dlatego trzymamy też kopię w skills dla spójnego wyświetlania.
      creditRating: occ.creditMin,
      skills: { ...prev.skills, [CREDIT_RATING_SKILL]: occ.creditMin },
      interestPoints: prev.stats.int * 2,
    }));
  };

  const updateSkill = (skillName: string, value: number) => {
    // Dynamiczne wartości bazowe dla Język Ojczysty i Unik
    let baseValue = BASE_SKILLS[skillName] || 0;
    if (skillName === NATIVE_LANGUAGE_SKILL) baseValue = state.stats.edu;
    if (skillName === 'Unik') baseValue = Math.floor(state.stats.dex / 2);

    // Limit 75% podczas tworzenia postaci (wyjątki: Język Ojczysty, Majętność)
    const maxValue = SKILL_LIMIT_EXCEPTIONS.includes(skillName)
      ? 99
      : SKILL_CREATION_LIMIT;
    const newValue = Math.max(baseValue, Math.min(maxValue, value));
    const diff = newValue - (state.skills[skillName] || baseValue);

    // Sprawdź limit punktów. Majętność (creditRating) także zjada z puli (RAW),
    // więc wliczamy ją do wydanych punktów.
    const totalUsed =
      state.occupationPointsUsed +
      state.interestPointsUsed +
      state.creditRating +
      diff;
    const totalAvailable = state.occupationPoints + state.interestPoints;
    if (totalUsed > totalAvailable) return;

    setState((prev) => ({
      ...prev,
      skills: { ...prev.skills, [skillName]: newValue },
      occupationPointsUsed: prev.occupationPointsUsed + diff,
    }));
  };

  // Stan dla automatycznego rozdzielania punktów
  const [isDistributingSkills, setIsDistributingSkills] = useState(false);

  // Funkcja AI do automatycznego rozdzielania punktów umiejętności
  const autoDistributeSkillsAI = async () => {
    if (isDistributingSkills) return;
    setIsDistributingSkills(true);

    const selectedOcc = OCCUPATIONS.find((o) => o.id === state.occupationId);
    const selectedArchetype = CHARACTER_ARCHETYPES.find(
      (a) => a.id === selectedArchetypeId
    );
    // Majętność jest już opłacona z puli (creditRating punktów) - AI rozdziela
    // RESZTĘ punktów między pozostałe umiejętności (RAW: koszt Credit Rating
    // pomniejsza pulę dostępną na inne umiejętności).
    const totalPoints =
      state.occupationPoints + state.interestPoints - state.creditRating;
    const occupationalSkills = selectedOcc?.skills || [];

    // Mapowanie archetypów na kluczowe umiejętności (module-level ARCHETYPE_SKILL_MAP)
    const archetypeSkills = selectedArchetypeId
      ? ARCHETYPE_SKILL_MAP[selectedArchetypeId] || []
      : [];

    // JEDNO źródło prawdy dla rekomendowanych (highlight ★ ORAZ przydział):
    // archetyp ∪ zawód, specjalizacje znormalizowane (`Nauka (Biologia)` →
    // `Nauka`), `Dowolna` odrzucona. Bez tego punkty uciekały do kluczy-widm.
    const recommendedSkills = buildRecommendedSkills(
      archetypeSkills,
      occupationalSkills
    );

    // Helpery wartości bazowej / limitu - spójne z resztą funkcji.
    const resolveBaseValue = (skill: string): number => {
      if (skill === NATIVE_LANGUAGE_SKILL) return state.stats.edu;
      if (skill === 'Unik') return Math.floor(state.stats.dex / 2);
      return BASE_SKILLS[skill] || 1;
    };
    const resolveMaxValue = (skill: string): number =>
      SKILL_LIMIT_EXCEPTIONS.includes(skill) ? 99 : SKILL_CREATION_LIMIT;

    // KROK 1 (DETERMINISTYCZNY): zaspokój rekomendowane NAJPIERW, równo do
    // limitu 75%, zużywając pulę. Dopiero RESZTĘ oddamy AI/losowo niżej.
    const deterministic = distributeRecommendedSkillPoints({
      recommendedSkills,
      currentSkills: state.skills,
      totalPoints,
      getBaseValue: resolveBaseValue,
      getMaxValue: resolveMaxValue,
    });
    // Floor: po rozdaniu deterministycznym rekomendowane nie mogą zostać
    // obcięte przez normalizację nadmiaru AI poniżej tych wartości.
    const recommendedFloor: Record<string, number> = {};
    for (const skill of recommendedSkills) {
      recommendedFloor[skill] =
        deterministic.skills[skill] ?? resolveBaseValue(skill);
    }
    // Punkty pozostałe do rozdania przez AI (na pozostałe umiejętności).
    const remainingForAI = deterministic.remainingPoints;

    // Kontekst postaci dla AI
    const characterContext = [
      selectedArchetype &&
        t('ctxArchetype', {
          value: `${selectedArchetype.name} - ${selectedArchetype.description}`,
        }),
      state.name && t('ctxName', { value: state.name }),
      selectedOcc && t('ctxOccupation', { value: selectedOcc.name }),
      state.description && t('ctxDescription', { value: state.description }),
      state.traits && t('ctxTraits', { value: state.traits }),
      state.ideology && t('ctxIdeology', { value: state.ideology }),
    ]
      .filter(Boolean)
      .join('\n');

    const prompt = t('prompts.skills', {
      context: characterContext || t('investigator'),
      occupation: selectedOcc?.name || t('unknown'),
      occSkills: occupationalSkills.join(', '),
      archetypeBlock:
        archetypeSkills.length > 0
          ? t('archetypeKeySkills', {
              archetype: selectedArchetype?.name ?? '',
              skills: archetypeSkills.join(', '),
            })
          : '',
      recommended: recommendedSkills.join(', ') || t('noneFallback'),
      remaining: remainingForAI,
      limit: SKILL_CREATION_LIMIT,
      skillsList: Object.entries(BASE_SKILLS)
        .filter(
          ([name]) =>
            name !== CREDIT_RATING_SKILL &&
            name !== NATIVE_LANGUAGE_SKILL &&
            name !== 'Unik'
        )
        .map(([name, base]) => `${name}: ${base}%`)
        .join('\n'),
      recommendedTop:
        recommendedSkills.slice(0, 8).join(', ') || t('noneFallback'),
    });

    try {
      const response = await fetchWithApiKeys('/api/ai/utility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, messages: [] }),
      });

      if (!response.ok) {
        Sentry.captureMessage(
          `Character wizard skills API error: ${response.status} ${response.statusText}`,
          'error'
        );
        toast({
          variant: 'destructive',
          title: t('toasts.apiError'),
          description: `${response.status} ${response.statusText}`,
        });
        setIsDistributingSkills(false);
        return;
      }

      // === NOWA OBSŁUGA STRUMIENIOWANIA (SSE) ===
      const fullContent = await collectSSEText(response);

      if (!fullContent) {
        Sentry.captureMessage(
          'Character wizard: empty AI response (skills)',
          'error'
        );
        toast({
          variant: 'destructive',
          title: t('toasts.noAiResponseTitle'),
          description: t('toasts.noAiResponseDescription'),
        });
        setIsDistributingSkills(false);
        return;
      }

      // Wyczyść odpowiedź z markdown
      const cleanJson = fullContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/^\s*\n/gm, '')
        .trim();

      let parsed;
      try {
        parsed = JSON.parse(cleanJson);
      } catch (parseErr) {
        Sentry.captureException(parseErr, {
          extra: { rawResponse: cleanJson.substring(0, 500) },
        });
        toast({
          variant: 'destructive',
          title: t('toasts.parseErrorTitle'),
          description: t('toasts.parseErrorDescription'),
        });
        setIsDistributingSkills(false);
        return;
      }

      if (!parsed.skills || typeof parsed.skills !== 'object') {
        Sentry.captureMessage(
          'Character wizard: invalid skills format from AI',
          'error'
        );
        toast({
          variant: 'destructive',
          title: t('toasts.invalidFormatTitle'),
          description: t('toasts.invalidFormatDescription'),
        });
        setIsDistributingSkills(false);
        return;
      }

      // Oblicz zużyte punkty - START od deterministycznego rozdania
      // rekomendowanych (KROK 1). AI dokłada na pozostałe, nie ruszając ich.
      let pointsUsed = deterministic.pointsUsed;
      const newSkills = { ...deterministic.skills };

      for (const [skillName, value] of Object.entries(parsed.skills)) {
        if (typeof value !== 'number') continue;

        let baseValue = BASE_SKILLS[skillName] || 0;
        if (skillName === NATIVE_LANGUAGE_SKILL) baseValue = state.stats.edu;
        if (skillName === 'Unik') baseValue = Math.floor(state.stats.dex / 2);

        // Floor: nie pozwól AI obniżyć rekomendowanej poniżej jej
        // deterministycznej wartości (highlight ↔ przydział = ten sam zbiór).
        const lowerBound = recommendedFloor[skillName] ?? baseValue;

        const maxValue = SKILL_LIMIT_EXCEPTIONS.includes(skillName)
          ? 99
          : SKILL_CREATION_LIMIT;
        const clampedValue = Math.max(
          lowerBound,
          Math.min(maxValue, value as number)
        );

        const previousValue = newSkills[skillName] ?? baseValue;
        if (clampedValue > previousValue) {
          pointsUsed += clampedValue - previousValue;
          newSkills[skillName] = clampedValue;
        }
      }

      // Sprawdź czy nie przekroczono limitu
      if (pointsUsed <= totalPoints) {
        // === NOWE: Dopełnij pozostałe punkty automatycznie ===
        let remainingPoints = totalPoints - pointsUsed;

        if (remainingPoints > 0) {
          // Znajdź umiejętności zawodowe które można jeszcze podnieść
          const upgradableSkills = occupationalSkills.filter((skillName) => {
            const skillKey = skillName.replace(/\s*\(\d*\).*$/, '').trim(); // Usuń "(2)" itp.
            if (skillKey === 'Dowolna' || skillKey === CREDIT_RATING_SKILL)
              return false;

            let baseValue = BASE_SKILLS[skillKey] || 1;
            if (skillKey === NATIVE_LANGUAGE_SKILL) baseValue = state.stats.edu;
            if (skillKey === 'Unik')
              baseValue = Math.floor(state.stats.dex / 2);

            const currentValue = newSkills[skillKey] || baseValue;
            const maxValue = SKILL_LIMIT_EXCEPTIONS.includes(skillKey)
              ? 99
              : SKILL_CREATION_LIMIT;

            return currentValue < maxValue;
          });

          // Rozdziel pozostałe punkty między umiejętności zawodowe
          while (remainingPoints > 0 && upgradableSkills.length > 0) {
            for (const skillName of upgradableSkills) {
              if (remainingPoints <= 0) break;

              const skillKey = skillName.replace(/\s*\(\d*\).*$/, '').trim();
              let baseValue = BASE_SKILLS[skillKey] || 1;
              if (skillKey === NATIVE_LANGUAGE_SKILL) baseValue = state.stats.edu;
              if (skillKey === 'Unik')
                baseValue = Math.floor(state.stats.dex / 2);

              const currentValue = newSkills[skillKey] || baseValue;
              const maxValue = SKILL_LIMIT_EXCEPTIONS.includes(skillKey)
                ? 99
                : SKILL_CREATION_LIMIT;

              if (currentValue < maxValue) {
                const increment = Math.min(
                  remainingPoints,
                  10,
                  maxValue - currentValue
                );
                newSkills[skillKey] = currentValue + increment;
                remainingPoints -= increment;
                pointsUsed += increment;
              }
            }

            // Jeśli wszystkie zawodowe mają max, rozdziel do innych umiejętności
            if (remainingPoints > 0) {
              const anySkillOptions = Object.keys(BASE_SKILLS).filter(
                (skillKey) => {
                  if (skillKey === CREDIT_RATING_SKILL) return false;
                  const currentValue =
                    newSkills[skillKey] || BASE_SKILLS[skillKey] || 1;
                  const maxValue = SKILL_LIMIT_EXCEPTIONS.includes(skillKey)
                    ? 99
                    : SKILL_CREATION_LIMIT;
                  return currentValue < maxValue;
                }
              );

              if (anySkillOptions.length === 0) break; // Wszystko na max

              const randomSkill =
                anySkillOptions[
                  Math.floor(Math.random() * anySkillOptions.length)
                ];
              const baseValue = BASE_SKILLS[randomSkill] || 1;
              const currentValue = newSkills[randomSkill] || baseValue;
              const maxValue = SKILL_LIMIT_EXCEPTIONS.includes(randomSkill)
                ? 99
                : SKILL_CREATION_LIMIT;

              const increment = Math.min(
                remainingPoints,
                10,
                maxValue - currentValue
              );
              if (increment > 0) {
                newSkills[randomSkill] = currentValue + increment;
                remainingPoints -= increment;
                pointsUsed += increment;
              } else {
                break; // Nie da się więcej
              }
            }
          }
        }

        setState((prev) => ({
          ...prev,
          skills: newSkills,
          occupationPointsUsed: pointsUsed,
        }));
        // Sukces - pokaż krótki komunikat
        toast({
          variant: 'success',
          title: t('toasts.skillsAllocatedTitle'),
          description: t('toasts.skillsAllocatedDescription', {
            used: pointsUsed,
            total: totalPoints,
          }),
        });
      } else {
        // === AI przydzieliło za dużo - obetnij nadmiarowe punkty proporcjonalnie ===
        const excessPoints = pointsUsed - totalPoints;
        let pointsToRemove = excessPoints;

        // Sortuj umiejętności według wartości dodanej (od największej).
        // `floor` chroni rekomendowane przed obcięciem poniżej deterministyki:
        // dla nie-rekomendowanych floor = baza, więc reducible = pełne `added`.
        const skillsSortedByValue = Object.entries(newSkills)
          .map(([name, value]) => {
            let baseValue = BASE_SKILLS[name] || 0;
            if (name === NATIVE_LANGUAGE_SKILL) baseValue = state.stats.edu;
            if (name === 'Unik') baseValue = Math.floor(state.stats.dex / 2);
            const floor = recommendedFloor[name] ?? baseValue;
            return {
              name,
              value,
              floor,
              // Tylko punkty powyżej floor wolno obciąć (chroni rekomendowane).
              reducible: Math.max(0, (value as number) - floor),
            };
          })
          .filter((s) => s.reducible > 0)
          .sort((a, b) => b.reducible - a.reducible);

        // Obcinaj punkty od umiejętności z największą liczbą obcinalnych punktów
        for (const skill of skillsSortedByValue) {
          if (pointsToRemove <= 0) break;

          const reduction = Math.min(pointsToRemove, skill.reducible);
          newSkills[skill.name] = (skill.value as number) - reduction;
          pointsToRemove -= reduction;
          pointsUsed -= reduction;
        }

        setState((prev) => ({
          ...prev,
          skills: newSkills,
          occupationPointsUsed: pointsUsed,
        }));
        toast({
          variant: 'success',
          title: t('toasts.skillsAllocatedTitle'),
          // Po normalizacji suma = pełna pula, więc nie straszymy gracza
          // "obcięciem" - z jego perspektywy wszystkie punkty są wydane.
          description: t('toasts.skillsAllocatedDescription', {
            used: pointsUsed,
            total: totalPoints,
          }),
        });
      }
    } catch (err) {
      Sentry.captureException(err);
      toast({
        variant: 'destructive',
        title: t('toasts.aiConnectionErrorTitle'),
        description: err instanceof Error ? err.message : t('toasts.unknownError'),
      });
    }

    setIsDistributingSkills(false);
  };

  // Powiększenie portretu (lightbox) - klik na miniaturę otwiera pełny widok.
  const [showPortraitZoom, setShowPortraitZoom] = useState(false);

  const generatePortrait = async () => {
    // Zabezpieczenie: nie uruchamiaj jeśli już trwa generowanie
    if (state.isGeneratingPortrait) {
      return;
    }

    setState((prev) => ({ ...prev, isGeneratingPortrait: true }));
    const { name, gender, age, description } = state;
    const occupation =
      OCCUPATIONS.find((o) => o.id === state.occupationId)?.name || '';

    // Era z kontekstu przygody lub domyślna
    const rawEra = adventureContext
      ? (adventureContext.yearRange || adventureContext.eraLabel || adventureContext.era || '1920s')
      : '1920s';

    const prompt = `Portrait of a ${age} year old ${gender || 'person'}, ${occupation}, ${description || 'mysterious appearance'}, ${rawEra} period-accurate portrait, realistic, dramatic lighting, authentic period photograph aesthetic`;

    // A5: gdy portret JUŻ istnieje, to "Generuj ponownie" - dołączamy losowy
    // seed, by ominąć cache /api/imagen (klucz = md5(prompt+style+seed)).
    // Bez tego identyczny prompt dawał cache hit → ten sam obraz ("nie działa").
    // Pierwsza generacja (brak portretu) idzie bez seed - normalny cache.
    const isRegenerate = state.portraitUrl != null;
    const seed = isRegenerate
      ? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      : undefined;

    try {
      const response = await fetchWithApiKeys('/api/imagen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          style: 'portrait',
          era: rawEra,
          ...(seed && { seed }),
        }),
      });

      const data = await response.json();

      if (data.success && data.imageUrl) {
        setState((prev) => ({ ...prev, portraitUrl: data.imageUrl }));
      } else if (data.error) {
        Sentry.captureMessage(
          `Character wizard portrait error: ${data.error}`,
          'error'
        );
        toast({
          variant: 'destructive',
          title: t('toasts.portraitErrorTitle'),
          description: data.error,
        });
      } else {
        Sentry.captureMessage(
          'Character wizard: unknown portrait response',
          'error'
        );
        toast({
          variant: 'destructive',
          title: t('toasts.portraitErrorTitle'),
          description: t('toasts.portraitUnknownError'),
        });
      }
    } catch (err) {
      Sentry.captureException(err);
      toast({
        variant: 'destructive',
        title: t('toasts.connectionErrorTitle'),
        description: t('toasts.portraitConnectionError'),
      });
    } finally {
      // Zawsze resetuj stan, nawet przy niespodziewanych błędach
      setState((prev) => ({ ...prev, isGeneratingPortrait: false }));
    }
  };

  // AI Backstory Generation
  const generateBackstory = async () => {
    setState((prev) => ({ ...prev, isGeneratingBackstory: true }));

    const occupation = OCCUPATIONS.find((o) => o.id === state.occupationId);
    const occupationName = occupation?.name || t('researcherLowercase');

    // Buduj kontekst przygody dla promptu
    const adventurePrompt = adventureContext
      ? getAdventureContextPrompt(adventureContext)
      : t('defaultAdventureEra');

    // === LOSOWE ELEMENTY DLA RÓŻNORODNOŚCI (słowniki w messages/*.json) ===
    const personalitySeeds = t.raw('personalitySeeds') as string[];
    const backgroundFlavors = t.raw('backgroundFlavors') as string[];
    const motivations = t.raw('motivationSeeds') as string[];

    // Wybierz losowe elementy
    const randomPersonality =
      personalitySeeds[Math.floor(Math.random() * personalitySeeds.length)];
    const randomBackground =
      backgroundFlavors[Math.floor(Math.random() * backgroundFlavors.length)];
    const randomMotivation =
      motivations[Math.floor(Math.random() * motivations.length)];
    const randomSeed = Math.floor(Math.random() * 10000);

    const prompt = t('prompts.backstory', {
      adventure: adventurePrompt,
      gender: state.gender || t('person'),
      age: state.age,
      occupation: occupationName,
      personality: randomPersonality,
      background: randomBackground,
      motivation: randomMotivation,
      seed: randomSeed,
    });

    /* ORYGINALNA STRUKTURA PROMPTU (JSON schema w treści) - przeniesiona do
       messages/*.json (CharacterWizard.prompts.backstory). */


    try {
      const response = await fetchWithApiKeys('/api/ai/utility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          messages: [],
        }),
      });

      if (!response.ok) {
        throw new Error(
          t('apiErrorWithStatus', {
            status: response.status,
            statusText: response.statusText,
          })
        );
      }

      // === NOWA OBSŁUGA STRUMIENIOWANIA (SSE) ===
      const fullContent = await collectSSEText(response);

      if (fullContent) {
        try {
          // Extract JSON from response - ulepszony parser
          let jsonStr = fullContent;

          // 1. Usuń markdown code blocks
          jsonStr = jsonStr.replace(/```json\n?/gi, '').replace(/```\n?/g, '');

          // 2. Znajdź JSON w odpowiedzi (od { do })
          const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error(t('jsonNotFound'));
          }
          jsonStr = jsonMatch[0].trim();

          // 3. Napraw typowe błędy JSON
          jsonStr = jsonStr.replace(/,\s*}/g, '}');
          jsonStr = jsonStr.replace(/,\s*]/g, ']');

          const parsed = JSON.parse(jsonStr);

          setState((prev) => ({
            ...prev,
            // Walidacja nazwy: tylko imię i nazwisko (max 4 słowa)
            name: (() => {
              if (!parsed.name) return prev.name;
              // Usuń nadmiarowe spacje i znaki specjalne
              let cleanName = parsed.name
                .trim()
                .replace(/[\n\r\t]+/g, ' ')
                .replace(/\s+/g, ' ');
              // Jeśli nazwa ma więcej niż 4 słowa, prawdopodobnie AI wstawiło opis
              const words = cleanName.split(' ');
              if (words.length > 4) {
                cleanName = words.slice(0, 3).join(' ');
              }
              // Usuń znaki specjalne oprócz liter polskich, spacji i myślników
              cleanName = cleanName.replace(
                /[^a-zA-Z\u0105\u0107\u0119\u0142\u0144\u00f3\u015b\u017a\u017c\u0104\u0106\u0118\u0141\u0143\u00d3\u015a\u0179\u017b\s-]/g,
                ''
              );
              return cleanName || prev.name;
            })(),
            birthplace: coerceFieldToText(parsed.birthplace) || prev.birthplace,
            description:
              coerceFieldToText(parsed.description) || prev.description,
            ideology: coerceFieldToText(parsed.ideology) || prev.ideology,
            importantPeople:
              coerceFieldToText(parsed.importantPeople) || prev.importantPeople,
            significantPlaces:
              coerceFieldToText(parsed.significantPlaces) ||
              prev.significantPlaces,
            personalItems:
              coerceFieldToText(parsed.personalItems) || prev.personalItems,
            traits: coerceFieldToText(parsed.traits) || prev.traits,
            keyConnection:
              coerceFieldToText(parsed.keyConnection) || prev.keyConnection,
            isGeneratingBackstory: false,
          }));
        } catch (parseErr) {
          Sentry.captureException(parseErr);
          toast({
            variant: 'destructive',
            title: t('toasts.parseErrorTitle'),
            description: t('toasts.tryAgain'),
          });
          setState((prev) => ({ ...prev, isGeneratingBackstory: false }));
        }
      } else {
        Sentry.captureMessage(
          'Character wizard: empty AI response (backstory)',
          'error'
        );
        setState((prev) => ({ ...prev, isGeneratingBackstory: false }));
      }
    } catch (err) {
      Sentry.captureException(err);
      toast({
        variant: 'destructive',
        title: t('toasts.aiConnectionErrorTitle'),
        description: t('toasts.tryAgain'),
      });
      setState((prev) => ({ ...prev, isGeneratingBackstory: false }));
    }
  };

  const generateNarrativeBiography = async () => {
    setState((prev) => ({ ...prev, isGeneratingNarrative: true }));
    const occupation = OCCUPATIONS.find((o) => o.id === state.occupationId);
    const occupationName = occupation?.name || t('researcherLowercase');
    const adventurePrompt = adventureContext
      ? getAdventureContextPrompt(adventureContext)
      : t('defaultAdventureEra');

    const prompt = t('prompts.biography', {
      adventure: adventurePrompt,
      name: state.name,
      gender: state.gender,
      age: state.age,
      occupation: occupationName,
      birthplace: state.birthplace,
      appearance: state.description,
      ideology: state.ideology,
      people: state.importantPeople,
      places: state.significantPlaces,
      items: state.personalItems,
      traits: state.traits,
      connection: state.keyConnection,
    });

    try {
      const response = await fetchWithApiKeys('/api/ai/utility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          messages: [],
        }),
      });

      if (!response.ok) throw new Error('API Error');

      let fullContent = await collectSSEText(response);
      if (fullContent) {
        fullContent = fullContent.replace(/```(markdown|text)?\n?/gi, '').replace(/```\n?/g, '').trim();
        setState((prev) => ({ ...prev, backstory: fullContent, isGeneratingNarrative: false }));
      }
    } catch (err) {
      console.error(err);
      setState((prev) => ({ ...prev, isGeneratingNarrative: false }));
    }
  };

  const generateSingleField = async (fieldName: string) => {
    if (generatingField) return;
    setGeneratingField(fieldName);

    // Buduj kontekst z istniejących pól
    const contextParts: string[] = [];
    const occupation = OCCUPATIONS.find((o) => o.id === state.occupationId);
    if (occupation)
      contextParts.push(t('ctxOccupation', { value: occupation.name }));
    if (state.age) contextParts.push(t('ctxAge', { value: state.age }));
    if (state.gender) contextParts.push(t('ctxGender', { value: state.gender }));
    if (state.name && fieldName !== 'name')
      contextParts.push(t('ctxName', { value: state.name }));
    if (state.birthplace && fieldName !== 'birthplace')
      contextParts.push(t('ctxOrigin', { value: state.birthplace }));
    if (state.description && fieldName !== 'description')
      contextParts.push(t('ctxAppearance', { value: state.description }));
    if (state.ideology && fieldName !== 'ideology')
      contextParts.push(t('ctxIdeology', { value: state.ideology }));
    if (state.traits && fieldName !== 'traits')
      contextParts.push(t('ctxTraits', { value: state.traits }));
    if (state.importantPeople && fieldName !== 'importantPeople')
      contextParts.push(t('ctxImportantPeople', { value: state.importantPeople }));

    // Dodaj kontekst przygody jeśli dostępny
    const adventureInfo = adventureContext
      ? `\n\nKONTEKST PRZYGODY:\n- Lokalizacja: ${adventureContext.location}\n- Era: ${adventureContext.eraLabel} (${adventureContext.yearRange})\n- Motywy: ${adventureContext.themes.join(', ')}`
      : '';

    const prompt = t('prompts.field', {
      context:
        contextParts.length > 0
          ? contextParts.join('\n')
          : t('noAdditionalContext'),
      adventure: adventureInfo,
      field: FIELD_PROMPTS[fieldName] || fieldName,
      style: adventureContext
        ? t('fieldStyleAdventure', {
            location: adventureContext.location,
            years: adventureContext.yearRange,
          })
        : t('fieldStyleDefault'),
    });

    try {
      const response = await fetchWithApiKeys('/api/ai/utility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, messages: [] }),
      });

      if (!response.ok) {
        throw new Error(
          t('apiErrorWithStatus', {
            status: response.status,
            statusText: response.statusText,
          })
        );
      }

      // === NOWA OBSŁUGA STRUMIENIOWANIA (SSE) ===
      const fullContent = await collectSSEText(response);

      if (fullContent) {
        // Wyczyść odpowiedź z markdown artifacts
        const cleanValue = fullContent
          .replace(/```[a-z]*\n?|\n?```/gi, '')
          .replace(/^["']|["']$/g, '')
          .trim();

        // Ustaw wartość pola
        setState((prev) => ({ ...prev, [fieldName]: cleanValue }));
      }
    } catch (err) {
      Sentry.captureException(err);
    }

    setGeneratingField(null);
  };

  // IND-178 (sesja 92) - getWealthInfo przeniesione do @/lib/character (libGetWealthInfo, import na top).
  // Lokalny wrapper bez params zachowuje API callerów (state.creditRating capture).
  const getWealthInfo = () => libGetWealthInfo(state.creditRating);

  const nextStep = () => {
    // Kolejność: 1=Koncepcja, 2=Cechy, 3=Zawód, 4=Umiejętności, 5=Historia, 6=Wyposażenie
    if (state.step === 2) {
      // Po Cechach: przelicz cechy pochodne przed przejściem do Zawodu
      const derived = calculateDerived(state.stats, state.age);
      setState((prev) => ({ ...prev, derived, step: 3 }));
    } else if (state.step === 3) {
      // WALIDACJA: Nie pozwól przejść bez wyboru zawodu
      if (!state.occupationId) {
        toast({
          variant: 'destructive',
          title: t('toasts.chooseOccupationTitle'),
          description: t('toasts.chooseOccupationDescription'),
        });
        return;
      }
      // Po Zawodzie: przelicz punkty zawodowe (na wypadek zmiany cech) i punkty zainteresowań
      const occupationPoints = libCalculateOccupationPoints(
        state.occupationId,
        state.stats
      );
      const interestPoints = state.stats.int * 2;
      setState((prev) => ({
        ...prev,
        occupationPoints,
        interestPoints,
        step: 4,
      }));
    } else {
      setState((prev) => ({
        ...prev,
        step: Math.min(prev.step + 1, TOTAL_STEPS),
      }));
    }
  };

  const prevStep = () => {
    setState((prev) => ({ ...prev, step: Math.max(prev.step - 1, 1) }));
  };

  const finishCreation = () => {
    // Zabezpieczenie przed podwójnym kliknięciem
    if (isCreating) {
      return;
    }
    setIsCreating(true);

    const occupation = OCCUPATIONS.find((o) => o.id === state.occupationId);

    // IND-178 (sesja 92) - item helpers (generateVisualDescription/generateItemLore/categorizeItem/estimateWeight)
    // przeniesione do @/lib/character (import na top).

    // Parse equipment string into InventoryItem array (combines equipment + personalItems)
    const parseEquipment = (
      equipmentStr: string,
      personalItemsStr: string
    ): {
      id: string;
      name: string;
      description: string;
      category:
        | 'weapon'
        | 'tool'
        | 'document'
        | 'artifact'
        | 'consumable'
        | 'other';
      weight: number;
      quantity: number;
      equipped: boolean;
      imageUrl?: string;
      lore?: string;
      visualDescription?: string;
    }[] => {
      const result: {
        id: string;
        name: string;
        description: string;
        category:
          | 'weapon'
          | 'tool'
          | 'document'
          | 'artifact'
          | 'consumable'
          | 'other';
        weight: number;
        quantity: number;
        equipped: boolean;
        imageUrl?: string;
        lore?: string;
        visualDescription?: string;
      }[] = [];

      // 1. Equipment - dzielimy po przecinkach/średnikach (np. "rewolwer, latarka, notes")
      if (equipmentStr?.trim()) {
        const equipItems = equipmentStr
          .replace(/[\n\r]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .split(/[,;]+/)
          .map((item) => item.trim())
          .filter(Boolean);

        equipItems.forEach((itemName, index) => {
          const lore = generateItemLore(itemName);
          const category = categorizeItem(itemName);
          const weight = estimateWeight(itemName);
          const visualDescription = generateVisualDescription(itemName);

          result.push({
            id: `inv_equip_${Date.now()}_${index}`,
            name: itemName,
            description: lore.slice(0, 100) + (lore.length > 100 ? '...' : ''), // Krótki opis
            lore: lore, // Pełny opis fabularny
            visualDescription: visualDescription,
            category: category,
            weight: weight,
            quantity: 1,
            equipped: false,
          });
        });
      }

      // 2. PersonalItems - to JEDEN przedmiot fabularny, gdzie:
      //    - Pierwsze zdanie = nazwa
      //    - Pozostałe zdania = lore (historia fabularna)
      //    - visualDescription = generowany z kontekstu
      if (personalItemsStr?.trim()) {
        const cleaned = personalItemsStr
          .replace(/[\n\r]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        // Znajdź pierwsze zdanie (zakończone kropką, wykrzyknikiem lub znakiem zapytania)
        const sentenceMatch = cleaned.match(/^([^.!?]+[.!?])\s*(.*)$/);

        let name: string;
        let lore: string;
        let visualDescription: string;

        if (sentenceMatch) {
          // Mamy co najmniej jedno zdanie - użyj jako nazwy, resztę jako lore
          name = sentenceMatch[1].trim().replace(/[.!?]$/, ''); // Usuń interpunkcję z końca nazwy
          lore = sentenceMatch[2]?.trim() || t('personalItemLore');

          // Generuj visualDescription na podstawie nazwy
          visualDescription = generateVisualDescription(name);
        } else {
          // Brak zdania - cały tekst jako nazwa
          name = cleaned;
          lore = t('personalItemLoreExtended');
          visualDescription = generateVisualDescription(name);
        }

        // Ucięcie zbyt długiej nazwy
        if (name.length > 60) {
          const cutoff = name.lastIndexOf(' ', 60);
          if (cutoff > 20) {
            lore = name.substring(cutoff + 1) + '. ' + lore;
            name = name.substring(0, cutoff);
          }
        }

        result.push({
          id: `inv_personal_${Date.now()}`,
          name: name,
          description: t('keepsakeDescription', { name: name.slice(0, 50) }),
          lore: lore,
          visualDescription: visualDescription,
          category: 'other' as const,
          weight: 0.3,
          quantity: 1,
          equipped: false,
        });
      }

      return result;
    };

    // Konwersja equipment string na EquipmentItem[]
    const equipmentItems: EquipmentItem[] = [];
    if (state.equipment?.trim()) {
      // IND-233: split top-level (przecinki w nawiasach nie tną nazwy).
      const itemNames = splitTopLevel(state.equipment).map((s) =>
        s.replace(/\s+/g, ' ').trim()
      );

      itemNames.forEach((itemName) => {
        const template = findEquipmentByName(itemName);
        if (template) {
          equipmentItems.push(
            createEquipmentItem(
              template,
              'starting',
              resolveEraVisualProfile(adventureContext?.yearRange)
            )
          );
        } else {
          // Stwórz podstawowy przedmiot jeśli nie ma w bazie
          const category: EquipmentCategory = categorizeItem(
            itemName
          ) as EquipmentCategory;
          equipmentItems.push({
            id: `eq_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            name: itemName,
            category: [
              'weapon',
              'armor',
              'tool',
              'document',
              'artifact',
              'personal',
              'medical',
              'occult',
            ].includes(category)
              ? category
              : 'personal',
            description: generateItemLore(itemName),
            // Faza 4 (ekonomia RAW): waga NIE jest dopisywana (CoC 7e nie ma udźwigu).
            // value uzupełni withEquipmentDefaults przy zapisie (cena referencyjna).
            condition: 'used',
            source: 'starting',
            obtainedAt: new Date(),
          });
        }
      });
    }

    // Znajdź wybrany archetyp
    const selectedArchetype = CHARACTER_ARCHETYPES.find(
      (a) => a.id === selectedArchetypeId
    );

    const newCharacter: Character = {
      id: `char_${Date.now()}`,
      name: state.name || t('defaultCharacterName'),
      str: state.stats.str,
      con: state.stats.con,
      siz: state.stats.siz,
      dex: state.stats.dex,
      app: state.stats.app,
      int: state.stats.int,
      pow: state.stats.pow,
      edu: state.stats.edu,
      luck: state.stats.luck,
      hp: state.derived.hp,
      san: state.derived.san,
      mp: state.derived.mp,
      skills: state.skills,
      occupation: occupation?.name || t('unknown'),
      age: state.age,
      portraitUrl: state.portraitUrl || undefined,
      // === NOWE: Dedykowane pola biografii ===
      gender:
        state.gender === 'male'
          ? 'male'
          : state.gender === 'female'
            ? 'female'
            : undefined,
      birthplace: state.birthplace || undefined,
      description: state.description || undefined,
      ideology: state.ideology || undefined,
      significantPerson: state.importantPeople || undefined,
      meaningfulLocation: state.significantPlaces || undefined,
      treasuredPossession: state.personalItems || undefined,
      traits: Array.isArray(state.traits)
        ? state.traits
        : state.traits
          ? state.traits
              .split(/[,;]+/)
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
      backstory: state.backstory || state.keyConnection || undefined,
      characterConcept: selectedArchetype
        ? `${selectedArchetype.name}: ${selectedArchetype.description}`
        : undefined,
      // Background jako fallback pełny tekst
      background: [
        state.description || '',
        t('bgIdeology', { value: state.ideology || t('noneFallback') }),
        t('bgImportantPeople', {
          value: state.importantPeople || t('noneFallback'),
        }),
        t('bgSignificantPlaces', {
          value: state.significantPlaces || t('noneFallback'),
        }),
        t('bgTraits', { value: state.traits || t('noneFallback') }),
        t('bgKeyConnection', {
          value: state.keyConnection || t('noneFallback'),
        }),
      ].join('\n\n'),
      playerName: '',
      isActive: true,
      lastUsed: new Date(),
      notes: '',
      experience: {
        totalXP: 0,
        availableXP: 0,
        earnedThisSession: 0,
        maxEarnedThisSession: 6,
      },
      developmentHistory: [],
      // IND-233: withEquipmentDefaults gwarantuje weight/value > 0 (modal nie pokazuje "-").
      equipment:
        equipmentItems.length > 0
          ? withEquipmentDefaults(equipmentItems)
          : undefined,
    };

    // Re-roll: scal NOWE statystyki z istniejącą postacią. Zachowuje id, dziennik,
    // doświadczenie, historię i ekwipunek; nadpisuje tylko mechanikę (cechy/umiejętności).
    const finalCharacter: Character = initialCharacter
      ? {
          ...initialCharacter,
          str: state.stats.str,
          con: state.stats.con,
          siz: state.stats.siz,
          dex: state.stats.dex,
          app: state.stats.app,
          int: state.stats.int,
          pow: state.stats.pow,
          edu: state.stats.edu,
          luck: state.stats.luck,
          hp: state.derived.hp,
          san: state.derived.san,
          mp: state.derived.mp,
          maxHp: state.derived.hp,
          maxSan: state.derived.san,
          maxMp: state.derived.mp,
          move: state.derived.movement,
          damageBonus: state.derived.damageBonus,
          build: state.derived.build,
          skills: state.skills,
          occupation: occupation?.name || initialCharacter.occupation,
          luckSpentThisSession: 0,
          lastUsed: new Date(),
        }
      : newCharacter;
    onCharacterCreated(finalCharacter);
  };

  // ============================================================================
  // RENDEROWANIE KROKÓW
  // ============================================================================

  // Nagłówek kroku w stylu déco: tytuł (Cinzel złoty) + opis (Cormorant italic)
  // + opcjonalna akcja po prawej stronie.
  const StepHeading = ({
    title,
    subtitle,
    action,
  }: {
    title: string;
    subtitle?: string;
    action?: ReactNode;
  }) => (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <div className="font-display font-semibold uppercase tracking-[0.1em] text-2xl text-brass">
          {title}
        </div>
        {subtitle && (
          <div className="font-serif italic text-[17px] text-muted-foreground mt-0.5">
            {subtitle}
          </div>
        )}
      </div>
      {action && <div className="flex gap-3 flex-shrink-0">{action}</div>}
    </div>
  );

  // NOWY KROK: Koncepcja postaci - wybór archetypu
  const renderStepConcept = () => {
    const selectedArchetype = CHARACTER_ARCHETYPES.find(
      (a) => a.id === selectedArchetypeId
    );
    const archetypeDetails = t.raw('archetypeDetails') as Record<string, {
      suggestedOccupations: string[];
      suggestedTraits: string[];
      suggestedMotivations: string[];
    }>;
    const selectedDetails = selectedArchetype
      ? archetypeDetails[selectedArchetype.id]
      : undefined;

    return (
      <div className="space-y-6">
        <StepHeading
          title={t('stepConceptTitle')}
          subtitle={t('stepConceptSubtitle')}
        />
        {adventureContext && (
          <p className="font-special-elite text-xs uppercase tracking-[0.1em] text-brass -mt-2">
            {t('adventureLabel', {
              title: adventureContext.title,
              location: adventureContext.location,
            })}
          </p>
        )}

        {/* Siatka archetypów */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {CHARACTER_ARCHETYPES.map((archetype) => {
            const isSelected = selectedArchetypeId === archetype.id;
            return (
              <button
                key={archetype.id}
                onClick={() => setSelectedArchetypeId(archetype.id)}
                className={`p-4 border text-left transition-all duration-200 ${
                  isSelected
                    ? 'border-brass/30/50 bg-[#0e1413] shadow-[0_0_14px_rgba(13,148,136,.18)]'
                    : 'border-brass/28 bg-[#16130f] hover:border-brass/50'
                }`}
              >
                <div className="text-2xl mb-2">{archetype.icon}</div>
                <h4 className="font-display uppercase tracking-[0.08em] text-base text-foreground">
                  {dynamicT.has?.(`archetypes.${archetype.id}.name`) ? dynamicT(`archetypes.${archetype.id}.name`) : archetype.name}
                </h4>
                <p className="font-serif italic text-sm text-muted-foreground line-clamp-2 mt-1">
                  {dynamicT.has?.(`archetypes.${archetype.id}.description`) ? dynamicT(`archetypes.${archetype.id}.description`) : archetype.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Szczegóły wybranego archetypu */}
        {selectedArchetype && selectedArchetype.id !== 'custom' && (
          <div className="border border-brass/30/30 bg-[#0e1413] p-4">
            <h4 className="font-display uppercase tracking-[0.1em] text-sm text-brass/80 mb-2 flex items-center gap-2">
              {selectedArchetype.icon} {dynamicT(`archetypes.${selectedArchetype.id}.name`)}
            </h4>
            <p className="font-serif italic text-sm text-muted-foreground mb-3">
              {dynamicT(`archetypes.${selectedArchetype.id}.description`)}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground">
                  {t('suggestedOccupations')}
                </span>
                <div className="text-foreground">
                  {(selectedDetails?.suggestedOccupations || selectedArchetype.suggestedOccupations)
                    .slice(0, 3)
                    .join(', ')}
                </div>
              </div>
              <div>
                <span className="font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground">
                  {t('traits')}
                </span>
                <div className="text-foreground">
                  {(selectedDetails?.suggestedTraits || selectedArchetype.suggestedTraits).join(', ')}
                </div>
              </div>
              <div>
                <span className="font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground">
                  {t('motivations')}
                </span>
                <div className="text-foreground">
                  {(selectedDetails?.suggestedMotivations || selectedArchetype.suggestedMotivations)
                    .slice(0, 2)
                    .join(', ')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info gdy nie wybrano archetypu */}
        {!selectedArchetypeId && (
          <div className="font-serif italic text-center text-muted-foreground text-sm p-4 border border-brass/20 bg-[#16130f]">
            {t('selectArchetypeHint')}
          </div>
        )}
      </div>
    );
  };

  const renderStep1 = () => {
    const ageModifier = AGE_MODIFIERS.find(
      (m) => state.age >= m.min && state.age <= m.max
    );

    // CoC 7e: metoda "Rozdziel punkty" ma budżet sumy = 460 punktów na 8 cech
    // (zestaw 40/50/50/50/60/60/70/80). Szczęście jest losowane osobno (3K6×5)
    // i NIE wlicza się do budżetu. Budżet egzekwujemy WYŁĄCZNIE w trybie
    // 'pointbuy'. W trybie 'roll' suma rzutów może być dowolna (RAW).
    const STAT_POINT_BUDGET = 460;
    const CORE_STATS = [
      'str',
      'con',
      'siz',
      'dex',
      'app',
      'int',
      'pow',
      'edu',
    ] as const;
    const statSum = CORE_STATS.reduce(
      (sum, key) => sum + (state.stats[key] || 0),
      0
    );
    const statBudgetLeft = STAT_POINT_BUDGET - statSum;

    const allRolled = STAT_KEYS.every((k) => statRolls[k].rolled);

    return (
      <div className="space-y-6">
        <StepHeading
          title={t('stepStatsTitle')}
          subtitle={t('stepStatsSubtitle')}
        />

        {/* Onboarding: czym są cechy (własny opis, bez cytatów z podręcznika) */}
        <div className="border border-brass/20 bg-[#16130f] px-4 py-3">
          <p className="font-serif italic text-sm leading-relaxed text-muted-foreground">
            {t('statsIntro')}
          </p>
        </div>

        {/* Dwie karty metody przydziału charakterystyk */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Karta: rzut kośćmi (div - zawiera zagnieżdżony przycisk akcji) */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setStatMethod('roll')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setStatMethod('roll');
            }}
            className={`p-4 border text-left cursor-pointer transition-all duration-200 ${
              statMethod === 'roll'
                ? 'border-brass/30 bg-primary/15 shadow-[0_0_14px_rgba(13,148,136,.18)]'
                : 'border-brass/28 bg-[#16130f] hover:border-brass/50'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🎲</span>
              <h4 className="font-display uppercase tracking-[0.08em] text-base text-foreground">
                {t('rollDice')}
              </h4>
              <span className="font-special-elite text-[14px] uppercase tracking-[0.12em] text-brass/80 border border-brass/30/50 px-1.5 py-0.5">
                ✦ {t('recommended')}
              </span>
            </div>
            <p className="font-serif italic text-sm text-muted-foreground">
              {t('rollDiceDescription')}
            </p>
            {statMethod === 'roll' && (
              <div className="mt-3 flex items-center gap-3">
                <Button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    generateStats();
                  }}
                  disabled={allRolled}
                  size="sm"
                  className="font-display font-semibold uppercase tracking-[0.14em] text-[#04110f] bg-primary border border-brass/30 hover:brightness-110 shadow-[0_0_16px_rgba(13,148,136,.3)] px-4 py-2.5 disabled:opacity-50"
                >
                  {t('rollAll')}
                </Button>
                {allRolled && (
                  <span className="font-serif italic text-sm text-muted-foreground">
                    {t('allStatsRolled')}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Karta: rozdział punktów */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setStatMethod('pointbuy')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setStatMethod('pointbuy');
            }}
            className={`p-4 border text-left cursor-pointer transition-all duration-200 ${
              statMethod === 'pointbuy'
                ? 'border-brass/30 bg-primary/15 shadow-[0_0_14px_rgba(13,148,136,.18)]'
                : 'border-brass/28 bg-[#16130f] hover:border-brass/50'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🔢</span>
              <h4 className="font-display uppercase tracking-[0.08em] text-base text-foreground">
                {t('allocatePoints')}
              </h4>
            </div>
            <p className="font-serif italic text-sm text-muted-foreground">
              {t('allocatePointsDescription')}
            </p>
            {statMethod === 'pointbuy' && (
              <div className="mt-3 flex items-center gap-3">
                <span className="font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground">
                  {t('pointPool')}
                </span>
                <span
                  className={`font-display text-lg font-bold ${
                    statBudgetLeft < 0 ? 'text-destructive' : 'text-brass/80'
                  }`}
                >
                  {statSum} / {STAT_POINT_BUDGET}
                </span>
                {statBudgetLeft < 0 && (
                  <span className="text-destructive text-sm">
                    {t('overBudget', { count: -statBudgetLeft })}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="font-serif italic text-sm text-muted-foreground text-center max-w-md mx-auto">
          {t.rich('halfFifthHint', {
            half: (chunks) => (
              <span className="text-foreground">{chunks}</span>
            ),
            fifth: (chunks) => (
              <span className="text-foreground">{chunks}</span>
            ),
          })}
        </div>

        {/* Główne cechy */}
        {/*
          Highlight zielonych rekomendacji POMINIĘTY na kroku Cechy: brak danych
          mapujących archetyp -> sugerowaną cechę w kodzie (suggestedTraits to
          cechy osobowości, nie statystyki CoC). Nie wymyślamy mapowania.
        */}
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {STAT_KEYS.map((stat) => {
            const value = state.stats[stat];
            const rollState = statRolls[stat];
            return (
              <div
                key={stat}
                className="border border-brass/28 bg-[#16130f] p-4 text-center"
              >
                <label className="flex items-center justify-center font-display text-base uppercase tracking-[0.08em] text-foreground mb-1">
                  {STAT_FULL_NAMES[stat] || stat.toUpperCase()}
                  <HelpIcon content={STAT_DESCRIPTIONS[stat]} position="top" />
                </label>

                {statMethod === 'roll' ? (
                  <>
                    {/* Wartość: '-' dopóki nie rzucono */}
                    <div className="font-display text-[34px] leading-tight font-bold text-foreground py-1">
                      {rollState.rolled ? value : '-'}
                    </div>
                    {/* Wzór rzutu (mono detal - zostaje drobny) */}
                    <div className="font-special-elite text-[14px] tracking-[0.06em] text-brass mb-2">
                      {STAT_DICE[stat].label}
                    </div>
                    {!rollState.rolled ? (
                      <Button
                        type="button"
                        onClick={() => rollSingleStat(stat)}
                        size="sm"
                        className="w-full font-display font-semibold uppercase tracking-[0.1em] text-[#04110f] bg-primary border border-brass/30 hover:brightness-110 text-xs px-2 py-1.5"
                      >
                        {t('rollOne')}
                      </Button>
                    ) : !rollState.rerollUsed ? (
                      <Button
                        type="button"
                        onClick={() => rerollSingleStat(stat)}
                        size="sm"
                        variant="outline"
                        className="w-full font-display uppercase tracking-[0.1em] border-brass/50 text-foreground hover:border-brass text-xs px-2 py-1.5"
                      >
                        {t('rerollOnce')}
                      </Button>
                    ) : (
                      <div className="font-serif italic text-[14px] text-muted-foreground py-1.5">
                        {t('rerollUsed')}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => {
                        let nextVal = parseInt(e.target.value) || 0;
                        // Szczęście jest poza budżetem (losowane osobno). Dla 8
                        // cech głównych: zakres 15-90 i suma nie może przekroczyć
                        // 460.
                        if (stat !== 'luck') {
                          nextVal = Math.max(15, Math.min(90, nextVal));
                          const sumOthers = statSum - (state.stats[stat] || 0);
                          const maxForThis = STAT_POINT_BUDGET - sumOthers;
                          nextVal = Math.max(15, Math.min(nextVal, maxForThis));
                        }
                        const newStats = {
                          ...state.stats,
                          [stat]: nextVal,
                        };
                        const derived = calculateDerived(newStats, state.age);
                        // Aktualizuj dynamiczne umiejętności (Język Ojczysty =
                        // WYK, Unik = ZR/2)
                        const updatedSkills = { ...state.skills };
                        if (stat === 'edu')
                          updatedSkills[NATIVE_LANGUAGE_SKILL] = newStats.edu;
                        if (stat === 'dex')
                          updatedSkills['Unik'] = Math.floor(newStats.dex / 2);
                        setState((prev) => ({
                          ...prev,
                          stats: newStats,
                          derived,
                          skills: updatedSkills,
                        }));
                      }}
                      className="w-full bg-transparent border-none px-2 py-1 text-center font-display text-[34px] leading-tight font-bold text-foreground focus:outline-none"
                      min={15}
                      max={stat === 'luck' ? 99 : 90}
                    />
                  </>
                )}

                {(statMethod === 'pointbuy' || rollState.rolled) && (
                  <div className="font-special-elite text-xs tracking-[0.06em] text-muted-foreground mt-1">
                    ½:{half(value)} ⅕:{fifth(value)}
                  </div>
                )}

                {/* Onboarding: krótki opis cechy własnymi słowami (P2) */}
                <p className="font-serif text-xs leading-snug text-muted-foreground/80 mt-2">
                  {statShortDesc[stat]}
                </p>
              </div>
            );
          })}
        </div>

        {/* Onboarding: niskie cechy to nie wada (własny opis) */}
        <div className="flex items-start gap-3 border border-brass/30/30 bg-primary/5 px-4 py-3">
          <span aria-hidden="true" className="text-lg leading-none mt-0.5">
            🕯️
          </span>
          <p className="font-serif text-sm leading-relaxed text-muted-foreground">
            <span className="text-foreground">{t('lowStatHintTitle')}</span>{' '}
            {t('lowStatHintBody')}
          </p>
        </div>

        {/* Wiek */}
        <div className="border border-brass/28 bg-[#16130f] p-4">
          <label className="block font-special-elite text-xs uppercase tracking-[0.1em] text-foreground mb-2">
            Wiek: {state.age} lat
          </label>
          <input
            type="range"
            min={15}
            max={90}
            value={state.age}
            onChange={(e) => {
              const age = parseInt(e.target.value);
              const derived = calculateDerived(state.stats, age);
              setState((prev) => ({ ...prev, age, derived }));
            }}
            className="w-full"
          />
          {ageModifier && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-brass/80 font-medium">
                  {ageModifier.label}
                </span>
                {ageModifier.physPenalty > 0 && (
                  <span className="text-destructive text-sm">
                    -{ageModifier.physPenalty} (S/KON/ZR)
                  </span>
                )}
                {ageModifier.appPenalty > 0 && (
                  <span className="text-destructive text-sm">
                    -{ageModifier.appPenalty} WYG
                  </span>
                )}
                {ageModifier.eduChecks > 0 && (
                  <span className="text-brass/80 text-sm">
                    +{ageModifier.eduChecks} test WYK
                  </span>
                )}
                {ageModifier.luckReroll && (
                  <span className="text-muted-foreground text-sm">
                    {t('luckReroll')}
                  </span>
                )}
              </div>

              {/* Przycisk aplikowania modyfikatorów wieku */}
              {(ageModifier.physPenalty > 0 || ageModifier.appPenalty > 0) && (
                <div className="border border-destructive/50 bg-[#16130f] p-3 mt-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="text-sm">
                      <span className="text-destructive font-medium">
                        {t('ageModifiersWarning')}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        {t('agePenaltiesPending')}
                      </span>
                    </div>
                    <Button
                      onClick={() => {
                        // Aplikuj kary wieku do cech
                        const penalty = ageModifier.physPenalty;
                        const appPenalty = ageModifier.appPenalty;
                        const newStats = {
                          ...state.stats,
                          str: Math.max(15, state.stats.str - penalty),
                          con: Math.max(15, state.stats.con - penalty),
                          dex: Math.max(15, state.stats.dex - penalty),
                          app: Math.max(15, state.stats.app - appPenalty),
                        };
                        const derived = calculateDerived(newStats, state.age);
                        // Aktualizuj Unik bo ZR się zmieniło
                        const updatedSkills = {
                          ...state.skills,
                          Unik: Math.floor(newStats.dex / 2),
                        };
                        setState((prev) => ({
                          ...prev,
                          stats: newStats,
                          derived,
                          skills: updatedSkills,
                        }));
                      }}
                      size="sm"
                      className="font-display font-semibold uppercase tracking-[0.1em] bg-destructive hover:brightness-110 text-white"
                    >
                      {t('applyAgePenalties')}
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {t('agePenaltiesPreview', {
                      str: ageModifier.physPenalty,
                      con: ageModifier.physPenalty,
                      dex: ageModifier.physPenalty,
                      app: ageModifier.appPenalty,
                    })}
                  </div>
                </div>
              )}

              {/* Testy rozwoju WYK dla starszych postaci */}
              {ageModifier.eduChecks > 0 && (
                <div className="border border-brass/20 bg-[#0e1413] p-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="text-sm max-w-xl">
                      <span className="text-brass/80 font-medium">
                        {t('eduDevelopmentTest')}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        {t('eduDevelopmentDescription', {
                          count: ageModifier.eduChecks,
                        })}
                      </span>
                    </div>
                    <Button
                      onClick={() => {
                        // Wykonaj test rozwoju WYK: rzut K% > WYK = +1K10
                        const roll = Math.floor(Math.random() * 100) + 1;
                        if (roll > state.stats.edu) {
                          const bonus = Math.floor(Math.random() * 10) + 1;
                          const newEdu = Math.min(99, state.stats.edu + bonus);
                          const newStats = { ...state.stats, edu: newEdu };
                          const updatedSkills = {
                            ...state.skills,
                            [NATIVE_LANGUAGE_SKILL]: newEdu,
                          };
                          setState((prev) => ({
                            ...prev,
                            stats: newStats,
                            skills: updatedSkills,
                          }));
                          toast({
                            variant: 'success',
                            title: t('eduSuccess'),
                            description: t('eduRollSuccess', {
                              roll,
                              edu: state.stats.edu,
                              bonus,
                              newEdu,
                            }),
                          });
                        } else {
                          toast({
                            title: t('statShort.failure'),
                            description: t('eduRollFailure', {
                              roll,
                              edu: state.stats.edu,
                            }),
                          });
                        }
                      }}
                      size="sm"
                      className="font-display font-semibold uppercase tracking-[0.1em] text-[#04110f] bg-primary border border-brass/30 hover:brightness-110 shadow-[0_0_16px_rgba(13,148,136,.3)]"
                    >
                      {t('rollEduTest')}
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground mt-2 font-serif italic">
                    {t('eduTestHint')}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cechy pochodne */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="border border-[#b3322c]/40 bg-[#16130f] p-3 text-center">
            <div className="flex items-center justify-center font-special-elite text-xs uppercase tracking-[0.1em] text-[#d9685f]">
              ❤️ {t('hpAbbr')}{' '}
              <HelpIcon content={DERIVED_DESCRIPTIONS.hp} position="top" />
            </div>
            <div className="font-display text-2xl font-bold text-foreground">
              {state.derived.hp}
            </div>
          </div>
          <div className="border border-brass/40 bg-[#16130f] p-3 text-center">
            <div className="flex items-center justify-center font-special-elite text-xs uppercase tracking-[0.1em] text-brass">
              🧠 {t('sanAbbr')}{' '}
              <HelpIcon content={DERIVED_DESCRIPTIONS.san} position="top" />
            </div>
            <div className="font-display text-2xl font-bold text-foreground">
              {state.derived.san}
            </div>
          </div>
          <div className="border border-brass/30/50 bg-[#0e1413] p-3 text-center shadow-[0_0_14px_rgba(13,148,136,.14)]">
            <div className="flex items-center justify-center font-special-elite text-xs uppercase tracking-[0.1em] text-brass/80">
              ✨ {t('mpAbbr')}{' '}
              <HelpIcon content={DERIVED_DESCRIPTIONS.mp} position="top" />
            </div>
            <div className="font-display text-2xl font-bold text-foreground">
              {state.derived.mp}
            </div>
          </div>
          <div className="border border-brass/28 bg-[#16130f] p-3 text-center">
            <div className="flex items-center justify-center font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground">
              💪 {t('damageBonusAbbr')}{' '}
              <HelpIcon
                content={DERIVED_DESCRIPTIONS.damageBonus}
                position="top"
              />
            </div>
            <div className="font-display text-xl font-bold text-foreground">
              {state.derived.damageBonus}
            </div>
          </div>
          <div className="border border-brass/28 bg-[#16130f] p-3 text-center">
            <div className="flex items-center justify-center font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground">
              🏋️ {t('buildLabel')}{' '}
              <HelpIcon content={DERIVED_DESCRIPTIONS.build} position="top" />
            </div>
            <div className="font-display text-2xl font-bold text-foreground">
              {state.derived.build}
            </div>
          </div>
          <div className="border border-brass/28 bg-[#16130f] p-3 text-center">
            <div className="flex items-center justify-center font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground">
              🏃 {t('moveLabel')}{' '}
              <HelpIcon
                content={DERIVED_DESCRIPTIONS.movement}
                position="top"
              />
            </div>
            <div className="font-display text-2xl font-bold text-foreground">
              {state.derived.movement}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStep2 = () => {
    const selectedOcc = OCCUPATIONS.find((o) => o.id === state.occupationId);
    // Zielone rekomendacje: zawody sugerowane przez wybrany archetyp
    // (suggestedOccupations zawiera id zawodów, zgodne z occ.id).
    const selectedArchetype = CHARACTER_ARCHETYPES.find(
      (a) => a.id === selectedArchetypeId
    );
    const recommendedOccupationIds = new Set(
      selectedArchetype?.suggestedOccupations || []
    );

    const startingEquipmentList = selectedOcc
      ? getStartingEquipmentForOccupation(selectedOcc.id)
      : [];

    const filteredOccupations = OCCUPATIONS.filter((occ) => {
      if (
        occupationFilter === 'recommended' &&
        !recommendedOccupationIds.has(occ.id)
      ) {
        return false;
      }
      if (occupationSearchQuery.trim()) {
        const q = occupationSearchQuery.toLowerCase().trim();
        const matchesName = occ.name.toLowerCase().includes(q);
        const matchesSkill = occ.skills.some((s) =>
          s.toLowerCase().includes(q)
        );
        return matchesName || matchesSkill;
      }
      return true;
    });

    const recommendedCount = OCCUPATIONS.filter((o) =>
      recommendedOccupationIds.has(o.id)
    ).length;

    return (
      <div className="flex-1 min-h-0 flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 flex-shrink-0">
          <StepHeading
            title={t('stepOccupationTitle')}
            subtitle={t('stepOccupationSubtitle')}
          />

          {/* Filtry i wyszukiwarka */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center border border-brass/25 bg-[#120f0c] p-0.5">
              <button
                type="button"
                onClick={() => setOccupationFilter('all')}
                className={`font-special-elite text-xs uppercase tracking-[0.08em] px-3 py-1.5 transition-colors ${
                  occupationFilter === 'all'
                    ? 'bg-primary text-[#04110f] font-bold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('allFilter', { count: OCCUPATIONS.length })}
              </button>
              {recommendedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setOccupationFilter('recommended')}
                  className={`font-special-elite text-xs uppercase tracking-[0.08em] px-3 py-1.5 transition-colors ${
                    occupationFilter === 'recommended'
                      ? 'bg-primary text-[#04110f] font-bold shadow-sm'
                      : 'text-brass/90 hover:text-brass'
                  }`}
                >
                  {t('suggestedFilter', { count: recommendedCount })}
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                value={occupationSearchQuery}
                onChange={(e) => setOccupationSearchQuery(e.target.value)}
                placeholder={t('searchOccupationPlaceholder')}
                className="bg-[#120f0c] border border-brass/30 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-brass/80 font-special-elite w-56 tracking-[0.04em]"
              />
              {occupationSearchQuery && (
                <button
                  type="button"
                  onClick={() => setOccupationSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Układ Master-Detail: Siatka profesji (Lewa) + Akta Profesji (Prawa) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0 max-lg:min-h-fit">
          {/* Lewa kolumna: przewijalna lista profesji */}
          <div className="lg:col-span-7 flex flex-col min-h-0 max-lg:h-[420px] border border-brass/25 bg-[#120f0c]/60 p-2.5">
            <div className="flex-1 min-h-0 overflow-y-auto pr-1.5 p-1 custom-scrollbar scroll-py-2">
              {filteredOccupations.length === 0 ? (
                <div className="p-8 text-center font-serif italic text-sm text-muted-foreground">
                  {t('noOccupationsFound')}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {filteredOccupations.map((occ) => {
                    const isSelected = state.occupationId === occ.id;
                    const isRecommended =
                      !isSelected && recommendedOccupationIds.has(occ.id);
                    return (
                      <div
                        key={occ.id}
                        onClick={() => selectOccupation(occ.id)}
                        className={`p-3.5 border cursor-pointer transition-all duration-150 relative text-left flex flex-col justify-between ${
                          isSelected
                            ? 'border-brass bg-primary/20 shadow-[0_0_16px_rgba(13,148,136,.25)] ring-1 ring-brass/80'
                            : isRecommended
                              ? 'border-primary/50 bg-primary/[0.08] hover:border-primary/80 hover:bg-primary/[0.14] ring-1 ring-primary/30'
                              : 'border-brass/25 bg-[#16130f] hover:border-brass/50 hover:bg-[#1c1813]'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-display uppercase tracking-[0.08em] text-base text-foreground font-semibold">
                                {occ.name}
                              </span>
                              {isRecommended && (
                                <span
                                  className="text-brass text-sm"
                                  title={t('recommendedForArchetype')}
                                >
                                  ★
                                </span>
                              )}
                            </div>
                            <span className="font-special-elite text-[11px] text-brass/80 whitespace-nowrap bg-black/40 px-2 py-0.5 border border-brass/20">
                              CR: {occ.creditMin}-{occ.creditMax}
                            </span>
                          </div>
                          <div className="font-special-elite text-xs text-brass/90 mt-1.5">
                            {occ.formula}
                          </div>
                        </div>
                        <div className="font-special-elite text-[11px] text-muted-foreground/80 mt-2 flex items-center justify-between border-t border-brass/10 pt-1.5">
                          <span>
                            {occ.skills.length}{' '}
                            {t('skillsCount', { count: occ.skills.length })}
                          </span>
                          <span className="text-brass/60">
                            {isSelected ? '✓ ' + t('selected') : '›'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Prawa kolumna: Akta Profesji (Dossier) */}
          <div className="lg:col-span-5 flex flex-col min-h-0 max-lg:min-h-[300px] border border-brass/30 bg-[#15110d] p-5 overflow-y-auto custom-scrollbar">
            {selectedOcc ? (
              <div className="space-y-4">
                {/* Nagłówek akt */}
                <div>
                  <div className="font-special-elite uppercase tracking-[0.18em] text-[11px] text-brass/70">
                    {t('occupationDetailsEyebrow')}
                  </div>
                  <h3 className="font-display uppercase tracking-[0.08em] text-2xl text-foreground mt-0.5">
                    {selectedOcc.name}
                  </h3>
                  {recommendedOccupationIds.has(selectedOcc.id) && (
                    <div className="inline-flex items-center gap-1.5 mt-2 font-special-elite text-xs text-brass border border-primary/40 bg-primary/10 px-2.5 py-0.5">
                      ★ {t('recommendedByArchetypeOrOccupation')}
                      {selectedArchetype && ` (${selectedArchetype.name})`}
                    </div>
                  )}
                </div>

                <div className="h-px bg-brass/20" />

                {/* Opis fabularny */}
                <div className="bg-[#0c0a08]/70 border border-brass/20 p-3.5">
                  <div className="font-special-elite text-[11px] uppercase tracking-[0.1em] text-brass/70 mb-1">
                    {t('lore')}
                  </div>
                  <p className="font-serif italic text-sm text-foreground/90 leading-relaxed">
                    {OCCUPATION_DESCRIPTIONS[selectedOcc.id] ||
                      t('noDescription')}
                  </p>
                </div>

                {/* Metryka punktów i majętności */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-brass/25 bg-[#100d0a] p-3">
                    <div className="font-special-elite text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                      {t('occupationPointsLabel')}
                    </div>
                    <div className="font-display text-2xl font-bold text-brass/90 mt-0.5">
                      {state.occupationPoints}{' '}
                      <span className="text-xs text-muted-foreground font-normal">
                        pkt
                      </span>
                    </div>
                    <div className="font-special-elite text-[11px] text-brass/70 mt-1 truncate">
                      {selectedOcc.formula}
                    </div>
                  </div>

                  <div className="border border-brass/25 bg-[#100d0a] p-3">
                    <div className="font-special-elite text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                      {t('creditRating')}
                    </div>
                    <div className="font-display text-2xl font-bold text-foreground mt-0.5">
                      {selectedOcc.creditMin}–{selectedOcc.creditMax}%
                    </div>
                    <div className="font-special-elite text-[11px] text-muted-foreground mt-1">
                      {t('initialCreditRating', { val: selectedOcc.creditMin })}
                    </div>
                  </div>
                </div>

                {/* Umiejętności zawodowe */}
                <div>
                  <div className="font-special-elite text-xs uppercase tracking-[0.1em] text-brass/80 mb-2">
                    {t('occupationalSkillsList')} ({selectedOcc.skills.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedOcc.skills.map((skill, i) => (
                      <span
                        key={i}
                        className="font-special-elite text-xs uppercase tracking-[0.06em] px-2.5 py-1 bg-[#1a1611] border border-brass/30 text-brass/90 shadow-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Ekwipunek startowy */}
                {startingEquipmentList.length > 0 && (
                  <div>
                    <div className="font-special-elite text-xs uppercase tracking-[0.1em] text-brass/80 mb-2">
                      {t('startingEquipmentLabel')}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {startingEquipmentList.map((item, i) => (
                        <span
                          key={i}
                          className="font-special-elite text-xs px-2.5 py-1 bg-[#0a0c0f] border border-brass/20 text-muted-foreground"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 border border-dashed border-brass/20 min-h-[260px]">
                <span className="text-4xl mb-3 opacity-60">📜</span>
                <h4 className="font-display uppercase tracking-[0.08em] text-lg text-foreground mb-1">
                  {t('noOccupationSelectedTitle')}
                </h4>
                <p className="font-serif italic text-sm text-muted-foreground max-w-xs leading-relaxed">
                  {t('noOccupationSelectedHint')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderStep3 = () => {
    const selectedOcc = OCCUPATIONS.find((o) => o.id === state.occupationId);
    const totalPointsAvailable = state.occupationPoints + state.interestPoints;
    // Zielone rekomendacje umiejętności: kluczowe umiejętności archetypu
    // (ARCHETYPE_SKILL_MAP) + umiejętności zawodowe (OCCUPATIONS.skills).
    const recommendedSkills = new Set<string>([
      ...(selectedArchetypeId
        ? ARCHETYPE_SKILL_MAP[selectedArchetypeId] || []
        : []),
      ...(selectedOcc?.skills || []),
    ]);
    // Majętność (Credit Rating) to umiejętność zawodowa wg CoC 7e RAW: baza 0%,
    // a każdy punkt podniesienia kosztuje z puli punktów zawodowych. Dlatego
    // wliczamy creditRating do wydanych punktów - inaczej gracz dostaje
    // maksymalną Majętność za darmo (bez kosztu wobec umiejętności).
    const totalPointsUsed =
      state.occupationPointsUsed +
      state.interestPointsUsed +
      state.creditRating;

    return (
      <div className="space-y-4">
        <StepHeading
          title={t('stepSkillsTitle')}
          subtitle={t('stepSkillsSubtitle')}
          action={
            <Button
              onClick={autoDistributeSkillsAI}
              disabled={isDistributingSkills || totalPointsAvailable === 0}
              size="sm"
              className="font-display font-semibold uppercase tracking-[0.14em] text-[#04110f] bg-primary border border-brass/30 hover:brightness-110 shadow-[0_0_16px_rgba(13,148,136,.3)] px-4 py-2.5"
            >
              {isDistributingSkills
                ? t('distributing')
                : t('distributeWithAi')}
            </Button>
          }
        />

        {/* LEGENDA - wyjaśnienie systemu */}
        <div className="border border-brass/28 bg-[#16130f] p-4 text-sm space-y-2">
          <div className="font-display uppercase tracking-[0.1em] text-brass text-xs font-semibold mb-2">
            {t('howItWorks')}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-muted-foreground">
            <div>
              <span className="text-foreground font-special-elite text-xs uppercase tracking-[0.08em]">
                {t('occupationPointsLabel')}:
              </span>{' '}
              {state.occupationPoints} pkt
              <div className="font-serif italic text-sm mt-1">
                {selectedOcc
                  ? t('occupationFormula', { formula: selectedOcc.formula })
                  : t('occupationFormulaMissing')}
              </div>
            </div>
            <div>
              <span className="text-foreground font-special-elite text-xs uppercase tracking-[0.08em]">
                {t('interestPoints')}:
              </span>{' '}
              {state.interestPoints} pkt
              <div className="font-serif italic text-sm mt-1">
                {t('intFormula', { value: state.stats.int })}
              </div>
            </div>
          </div>
          <div className="border-t border-brass/20 pt-2 mt-1 font-serif italic text-sm text-muted-foreground">
            {t('aiSkillAllocationHelp')}
          </div>
          <div className="border-t border-brass/20 pt-2 mt-2 grid grid-cols-3 gap-2 text-sm">
            <div>
              <span className="text-brass/80">(X)</span> ={' '}
              {t('baseSkillValue')}
            </div>
            <div>
              <span className="text-foreground">25/12</span> ={' '}
              {t('halfAndFifth')}
            </div>
            <div>
              <span className="text-brass">★</span> ={' '}
              {t('aiRecommendedLegend')}
            </div>
          </div>
        </div>

        {/* Licznik punktów */}
        <div className="flex items-center gap-3 border border-brass/30 bg-[#1f1a14] px-4 py-2">
          <span className="font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground">
            {t('pointsRemaining')}
          </span>
          <div className="text-lg font-bold">
            <span
              className={`font-display ${
                totalPointsUsed <= totalPointsAvailable
                  ? 'text-brass/80'
                  : 'text-destructive'
              }`}
            >
              {totalPointsAvailable - totalPointsUsed}
            </span>
            <span className="text-muted-foreground text-sm ml-2">
              {t('pointsSpent', {
                used: totalPointsUsed,
                available: totalPointsAvailable,
              })}
            </span>
            {totalPointsUsed > totalPointsAvailable && (
              <span className="text-destructive text-sm ml-2">
                {t('overLimit')}
              </span>
            )}
          </div>
        </div>

        {/* Majętność */}
        {selectedOcc && (
          <div className="border border-brass/20 bg-[#0e1413] p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <label className="block font-display uppercase tracking-[0.1em] text-sm text-brass/80 mb-1">
                  💰 {t('creditRating')} (Credit Rating)
                </label>
                <p className="font-serif italic text-xs text-muted-foreground">
                  {t('occupationDefinesRange', {
                    occupation: selectedOcc.name,
                  })}{' '}
                  <span className="text-brass/80 font-medium">
                    {selectedOcc.creditMin}-{selectedOcc.creditMax}
                  </span>
                </p>
              </div>
              <input
                type="number"
                value={state.creditRating}
                onChange={(e) => {
                  const v = parseInt(e.target.value) || 0;
                  // 1) trzymaj się zakresu zawodu (creditMin..creditMax)
                  const inRange = Math.max(
                    selectedOcc.creditMin,
                    Math.min(selectedOcc.creditMax, v)
                  );
                  // 2) Majętność płaci z puli - nie pozwól wydać więcej niż
                  //    zostało po punktach już wydanych na umiejętności.
                  const spentOnSkills =
                    state.occupationPointsUsed + state.interestPointsUsed;
                  const maxAffordable = totalPointsAvailable - spentOnSkills;
                  const clamped = Math.max(
                    selectedOcc.creditMin,
                    Math.min(inRange, maxAffordable)
                  );
                  setState((prev) => ({
                    ...prev,
                    creditRating: clamped,
                    skills: { ...prev.skills, [CREDIT_RATING_SKILL]: clamped },
                  }));
                }}
                className="w-24 bg-[#16130f] border border-brass/30 px-3 py-2 text-center font-display text-2xl font-bold text-foreground focus:outline-none"
                min={selectedOcc.creditMin}
                max={selectedOcc.creditMax}
              />
            </div>
          </div>
        )}

        {/* Lista umiejętności */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[45vh] overflow-y-auto pr-2">
          {Object.entries(state.skills)
            .filter(([name]) => name !== CREDIT_RATING_SKILL)
            .map(([skillName, value]) => {
              const baseValue = BASE_SKILLS[skillName] || 0;
              const pointsAdded = value - baseValue;
              const isRecommended = recommendedSkills.has(skillName);
              return (
                <div
                  key={skillName}
                  className={`border p-4 ${
                    isRecommended
                      ? 'ring-1 ring-primary border-brass/30/50 bg-primary/10'
                      : 'border-brass/28 bg-[#16130f]'
                  }`}
                >
                  {/* Nazwa umiejętności */}
                  <div className="flex items-center gap-1 mb-2">
                    <span className="font-special-elite text-base uppercase tracking-[0.08em] text-foreground truncate">
                      {skillName}
                    </span>
                    {isRecommended && (
                      <span
                        className="text-brass/80"
                        title={t('recommendedByArchetypeOrOccupation')}
                      >
                        ★
                      </span>
                    )}
                    <HelpIcon
                      content={
                        SKILL_DESCRIPTIONS[skillName] ||
                        t('baseValue', { value: baseValue })
                      }
                      position="right"
                    />
                  </div>
                  {/* Wartości */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={value}
                        onChange={(e) =>
                          updateSkill(skillName, parseInt(e.target.value) || 0)
                        }
                        className="w-16 bg-[#0a0c0f] border border-brass/30 px-2 py-1.5 text-center font-display text-lg font-bold text-foreground focus:outline-none focus:border-brass/30"
                        min={baseValue}
                        max={99}
                      />
                      <div className="font-special-elite text-xs text-muted-foreground">
                        <div>
                          {t('baseShort')}{' '}
                          <span className="text-brass/80">{baseValue}</span>
                        </div>
                        <div className="text-foreground">
                          {half(value)}/{fifth(value)}
                        </div>
                      </div>
                    </div>
                    {pointsAdded > 0 && (
                      <span className="font-special-elite text-xs text-brass/80">
                        +{t('pointsAdded', { count: pointsAdded })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    );
  };

  const renderStep4 = () => (
    <div className="space-y-4">
      <StepHeading
        title={t('stepBiographyTitle')}
        subtitle={t('stepBiographySubtitle')}
        action={
          <Button
            onClick={generateBackstory}
            disabled={state.isGeneratingBackstory}
            size="sm"
            className="font-display font-semibold uppercase tracking-[0.14em] text-brass bg-brass/[0.06] border border-brass/40 hover:bg-brass/15 px-4 py-2.5"
          >
            {state.isGeneratingBackstory
              ? t('generating')
              : t('generateAiStory')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
        <div>
          <label className="block font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground mb-1">
            {t('fullName')}
          </label>
          <input
            type="text"
            value={state.name}
            onChange={(e) =>
              setState((prev) => ({ ...prev, name: e.target.value }))
            }
            className="w-full bg-[#0a0c0f] border border-brass/30 px-3 py-2 text-foreground focus:outline-none focus:border-brass/30"
            placeholder={t('namePlaceholder')}
          />
        </div>
        <div>
          <label className="block font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground mb-1">
            {t('gender')}
          </label>
          <select
            value={state.gender}
            onChange={(e) =>
              setState((prev) => ({ ...prev, gender: e.target.value }))
            }
            className="w-full bg-[#0a0c0f] border border-brass/30 px-3 py-2 text-foreground focus:outline-none focus:border-brass/30"
          >
            <option value="">{t('selectPlaceholder')}</option>
            <option value="male">{t('male')}</option>
            <option value="female">{t('female')}</option>
          </select>
        </div>
        <div>
          <label className="block font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground mb-1">
            {t('birthplace')}
          </label>
          <input
            type="text"
            value={state.birthplace}
            onChange={(e) =>
              setState((prev) => ({ ...prev, birthplace: e.target.value }))
            }
            className="w-full bg-[#0a0c0f] border border-brass/30 px-3 py-2 text-foreground focus:outline-none focus:border-brass/30"
            placeholder={t('birthplacePlaceholder')}
          />
        </div>
        <div>
          <label className="block font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground mb-1">
            {t('appearanceDescription')}
          </label>
          <input
            type="text"
            value={state.description}
            onChange={(e) =>
              setState((prev) => ({ ...prev, description: e.target.value }))
            }
            className="w-full bg-[#0a0c0f] border border-brass/30 px-3 py-2 text-foreground focus:outline-none focus:border-brass/30"
            placeholder={t('appearancePlaceholder')}
          />
        </div>
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <label className="font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground">
              {t('ideologyLabel')}
            </label>
            <button
              onClick={() => generateSingleField('ideology')}
              disabled={!!generatingField}
              className="font-display uppercase tracking-[0.1em] text-xs px-2 py-1 text-brass bg-brass/[0.06] border border-brass/40 hover:bg-brass/15 disabled:opacity-50"
            >
              {generatingField === 'ideology' ? t('generatingEllipsis') : t('generateButton')}
            </button>
          </div>
          <textarea
            value={state.ideology}
            onChange={(e) =>
              setState((prev) => ({ ...prev, ideology: e.target.value }))
            }
            className="w-full bg-[#0a0c0f] border border-brass/30 px-3 py-2 text-foreground h-24 focus:outline-none focus:border-brass/30"
            placeholder={t('ideologyPlaceholder')}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground">
              {t('importantPeople')}
            </label>
            <button
              onClick={() => generateSingleField('importantPeople')}
              disabled={!!generatingField}
              className="font-display uppercase tracking-[0.1em] text-xs px-2 py-1 text-brass bg-brass/[0.06] border border-brass/40 hover:bg-brass/15 disabled:opacity-50"
            >
              {generatingField === 'importantPeople' ? t('generatingEllipsis') : t('generateButton')}
            </button>
          </div>
          <textarea
            value={state.importantPeople}
            onChange={(e) =>
              setState((prev) => ({ ...prev, importantPeople: e.target.value }))
            }
            className="w-full bg-[#0a0c0f] border border-brass/30 px-3 py-2 text-foreground h-24 focus:outline-none focus:border-brass/30"
            placeholder={t('importantPeoplePlaceholder')}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground">
              {t('significantPlaces')}
            </label>
            <button
              onClick={() => generateSingleField('significantPlaces')}
              disabled={!!generatingField}
              className="font-display uppercase tracking-[0.1em] text-xs px-2 py-1 text-brass bg-brass/[0.06] border border-brass/40 hover:bg-brass/15 disabled:opacity-50"
            >
              {generatingField === 'significantPlaces' ? t('generatingEllipsis') : t('generateButton')}
            </button>
          </div>
          <textarea
            value={state.significantPlaces}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                significantPlaces: e.target.value,
              }))
            }
            className="w-full bg-[#0a0c0f] border border-brass/30 px-3 py-2 text-foreground h-24 focus:outline-none focus:border-brass/30"
            placeholder={t('significantPlacesPlaceholder')}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground">
              {t('personalItems')}
            </label>
            <button
              onClick={() => generateSingleField('personalItems')}
              disabled={!!generatingField}
              className="font-display uppercase tracking-[0.1em] text-xs px-2 py-1 text-brass bg-brass/[0.06] border border-brass/40 hover:bg-brass/15 disabled:opacity-50"
            >
              {generatingField === 'personalItems' ? t('generatingEllipsis') : t('generateButton')}
            </button>
          </div>
          <textarea
            value={state.personalItems}
            onChange={(e) =>
              setState((prev) => ({ ...prev, personalItems: e.target.value }))
            }
            className="w-full bg-[#0a0c0f] border border-brass/30 px-3 py-2 text-foreground h-24 focus:outline-none focus:border-brass/30"
            placeholder={t('personalItemsPlaceholder')}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground">
              {t('traitsLabel')}
            </label>
            <button
              onClick={() => generateSingleField('traits')}
              disabled={!!generatingField}
              className="font-display uppercase tracking-[0.1em] text-xs px-2 py-1 text-brass bg-brass/[0.06] border border-brass/40 hover:bg-brass/15 disabled:opacity-50"
            >
              {generatingField === 'traits' ? t('generatingEllipsis') : t('generateButton')}
            </button>
          </div>
          <textarea
            value={state.traits}
            onChange={(e) =>
              setState((prev) => ({ ...prev, traits: e.target.value }))
            }
            className="w-full bg-[#0a0c0f] border border-brass/30 px-3 py-2 text-foreground h-24 focus:outline-none focus:border-brass/30"
            placeholder={t('traitsPlaceholder')}
          />
        </div>
        <div className="md:col-span-2 border border-brass/20 bg-[#0e1413] p-3">
          <div className="flex items-center justify-between mb-1">
            <label className="font-display uppercase tracking-[0.1em] text-xs text-brass/80">
              ★ {t('keyConnection')}
            </label>
            <button
              onClick={() => generateSingleField('keyConnection')}
              disabled={!!generatingField}
              className="font-display uppercase tracking-[0.1em] text-xs px-2 py-1 text-brass bg-brass/[0.06] border border-brass/40 hover:bg-brass/15 disabled:opacity-50"
            >
              {generatingField === 'keyConnection' ? t('generatingEllipsis') : t('generateButton')}
            </button>
          </div>
          <textarea
            value={state.keyConnection}
            onChange={(e) =>
              setState((prev) => ({ ...prev, keyConnection: e.target.value }))
            }
            className="w-full bg-[#0a0c0f] border border-brass/30 px-3 py-2 text-foreground h-24 focus:outline-none"
            placeholder={t('keyConnectionPlaceholder')}
          />
        </div>
        
        {/* NOWE POLE: NARRACYJNA BIOGRAFIA */}
        <div className="md:col-span-2 mt-6 pt-6 border-t border-brass/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <label className="font-display uppercase tracking-[0.14em] text-sm text-brass font-bold flex items-center gap-2">
                📜 {t('biographyHeading')}
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                {t('biographyDescription')}
              </p>
            </div>
            <button
              onClick={generateNarrativeBiography}
              disabled={state.isGeneratingNarrative}
              className="font-display uppercase tracking-[0.1em] text-xs px-4 py-2 text-brass bg-brass/[0.06] border border-brass/40 hover:bg-brass/15 disabled:opacity-50 flex-shrink-0"
            >
              {state.isGeneratingNarrative ? t('generating') : t('generateAiSummary')}
            </button>
          </div>
          <textarea
            value={state.backstory}
            onChange={(e) =>
              setState((prev) => ({ ...prev, backstory: e.target.value }))
            }
            className="w-full bg-[#0a0c0f] border border-brass/30 px-4 py-3 text-foreground min-h-[200px] focus:outline-none leading-relaxed font-serif"
            placeholder={t('fullHistoryPlaceholder')}
          />
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => {
    const wealthInfo = getWealthInfo();

    return (
      <div className="space-y-6">
        <StepHeading
          title={t('stepEquipmentTitle')}
          subtitle={t('wealthSubtitle', { creditRating: state.creditRating })}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* LEWA KOLUMNA: Wizerunek i Akta Badacza */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Generator portretu */}
            <div className="border border-brass/28 bg-[#16130f] p-4">
              <label className="block font-display uppercase tracking-[0.1em] text-brass text-xs font-semibold mb-3">
                🎨 {t('characterPortrait')}
              </label>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                {state.portraitUrl ? (
                  <button
                    type="button"
                    onClick={() => setShowPortraitZoom(true)}
                    title={t('enlargePortrait')}
                    className="relative w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0 border border-brass/50 overflow-hidden cursor-zoom-in group p-0 shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                  >
                    <SafeImage
                      src={state.portraitUrl}
                      alt={t('portrait')}
                      className="w-full h-full object-cover"
                    />
                    <span
                      className="pointer-events-none absolute inset-0"
                      style={{
                        boxShadow: 'inset 0 0 70px 16px rgba(0,0,0,.7)',
                      }}
                    />
                    <span className="pointer-events-none absolute bottom-1 right-1 text-brass/90 text-xs opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 px-1 rounded">
                      🔍
                    </span>
                  </button>
                ) : (
                  <div
                    className="w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0 border border-dashed border-brass/40 flex items-center justify-center text-muted-foreground text-3xl"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(45deg, rgba(201,162,39,.03) 0, rgba(201,162,39,.03) 9px, transparent 9px, transparent 18px)',
                    }}
                  >
                    👤
                  </div>
                )}
                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <Button
                    onClick={generatePortrait}
                    disabled={state.isGeneratingPortrait}
                    size="sm"
                    className={
                      state.portraitUrl
                        ? 'w-full font-display font-semibold uppercase tracking-[0.12em] text-brass bg-brass/[0.04] border border-brass/45 hover:bg-brass/10 px-3 py-2 text-xs'
                        : 'w-full font-display font-semibold uppercase tracking-[0.12em] text-[#04110f] bg-primary border border-brass/30 hover:brightness-110 shadow-[0_0_16px_rgba(13,148,136,.3)] px-3 py-2 text-xs'
                    }
                  >
                    {state.isGeneratingPortrait
                      ? t('generating')
                      : state.portraitUrl
                        ? `🔄 ${t('generateAnotherPortrait')}`
                        : `🎨 ${t('generateAiPortrait')}`}
                  </Button>
                  <p className="font-serif italic text-xs text-muted-foreground leading-snug">
                    {state.portraitUrl
                      ? t('replacePortraitHint')
                      : t('portraitGenerationHint')}
                  </p>
                </div>
              </div>
            </div>

            {/* Podsumowanie postaci (Akta Badacza) */}
            <div className="border border-brass/20 bg-[#0e1413] p-4 shadow-[0_0_14px_rgba(13,148,136,.1)] flex-1 flex flex-col justify-between">
              <div>
                <div className="font-display uppercase tracking-[0.1em] text-brass/80 text-xs font-semibold mb-2">
                  ✓ {t('summary')}
                </div>
                <div className="text-sm text-foreground">
                  <strong className="text-brass/90 text-base">
                    {state.name || t('defaultCharacterName')}
                  </strong>
                  <span className="text-muted-foreground">
                    , {state.age} {t('yearsOld')},{' '}
                    {OCCUPATIONS.find((o) => o.id === state.occupationId)?.name ||
                      t('unknownOccupation')}
                  </span>
                </div>
              </div>

              {/* Siatka atrybutów */}
              <div className="grid grid-cols-4 gap-1.5 mt-3 pt-3 border-t border-brass/20 text-center font-special-elite text-xs">
                {STAT_KEYS.map((stat) => (
                  <div
                    key={stat}
                    className="bg-[#14110c] border border-brass/20 py-1 px-1"
                  >
                    <span className="text-muted-foreground text-[10px] uppercase block tracking-wider">
                      {stat.toUpperCase()}
                    </span>
                    <span className="text-brass font-bold">
                      {state.stats[stat]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PRAWA KOLUMNA: Status finansowy i Ekwipunek */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Tabela majątku */}
            <div className="border border-brass/28 bg-[#16130f] p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground">
                    {t('level')}
                  </div>
                  <div className="font-display text-foreground font-bold mt-1">
                    {wealthInfo.level}
                  </div>
                </div>
                <div>
                  <div className="font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground">
                    {t('cash')}
                  </div>
                  <div className="font-display text-brass/80 font-bold mt-1">
                    {wealthInfo.cash}
                  </div>
                </div>
                <div>
                  <div className="font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground">
                    {t('assets')}
                  </div>
                  <div className="font-display text-muted-foreground font-bold mt-1">
                    {wealthInfo.assets}
                  </div>
                </div>
                <div>
                  <div className="font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground">
                    {t('spendingPerDay')}
                  </div>
                  <div className="font-display text-brass/80 font-bold mt-1">
                    {wealthInfo.spending}
                  </div>
                </div>
              </div>
            </div>

            {/* Lista ekwipunku */}
            <div className="border border-brass/28 bg-[#16130f] p-4 flex-1 flex flex-col">
              <label className="block font-display uppercase tracking-[0.1em] text-brass text-xs font-semibold mb-1">
                {t('equipmentAndItems')}
              </label>
              <p className="font-serif italic text-xs text-muted-foreground mb-2">
                {t('equipmentDescription')}
              </p>
              <textarea
                value={state.equipment}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, equipment: e.target.value }))
                }
                className="w-full flex-1 min-h-[160px] bg-[#0a0c0f] border border-brass/30 p-3 text-foreground focus:outline-none focus:border-brass/50 font-mono text-xs leading-relaxed resize-y"
                placeholder={t('equipmentPlaceholder')}
              />
            </div>
          </div>
        </div>

        {showPortraitZoom && state.portraitUrl && (
          <ImageLightbox
            src={state.portraitUrl}
            alt={t('characterPortrait')}
            onClose={() => setShowPortraitZoom(false)}
          />
        )}
      </div>
    );
  };

  // ============================================================================
  // GŁÓWNY RENDER
  // ============================================================================

  // Kolejność: Koncepcja → Cechy → Zawód → Umiejętności → Historia → Wyposażenie
  const stepNames = [
    t('stepNameConcept'),
    t('stepNameStats'),
    t('stepNameOccupation'),
    t('stepNameSkills'),
    t('stepNameHistory'),
    t('stepNameEquipment'),
  ];

  const renderCurrentStep = () => {
    switch (state.step) {
      case 1:
        return renderStepConcept(); // Koncepcja postaci
      case 2:
        return renderStep1(); // Cechy
      case 3:
        return renderStep2(); // Zawód
      case 4:
        return renderStep3(); // Umiejętności
      case 5:
        return renderStep4(); // Historia (po mechanice)
      case 6:
        return renderStep5(); // Wyposażenie
      default:
        return null;
    }
  };

  return (
    <div
      data-testid="character-wizard"
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div className="relative bg-gradient-to-br from-[#14110c] to-[#0a0c0f] border border-brass/30 shadow-[0_30px_90px_rgba(0,0,0,.6)] w-[90vw] max-w-[1440px] h-[90vh] overflow-hidden flex flex-col">
        {/* Narożniki déco */}
        <span className="pointer-events-none absolute top-3 left-3 w-7 h-7 border-t-2 border-l-2 border-brass/55" />
        <span className="pointer-events-none absolute top-3 right-3 w-7 h-7 border-t-2 border-r-2 border-brass/55" />
        <span className="pointer-events-none absolute bottom-3 left-3 w-7 h-7 border-b-2 border-l-2 border-brass/55" />
        <span className="pointer-events-none absolute bottom-3 right-3 w-7 h-7 border-b-2 border-r-2 border-brass/55" />

        {/* Header - tytuł ekranu + stepper */}
        <div className="px-8 pt-7 pb-4 flex-shrink-0 border-b border-brass/20">
          <div className="flex justify-end -mt-2 -mr-4 mb-1">
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-brass h-7 w-7 p-0"
            >
              ✕
            </Button>
          </div>
          <div className="text-center mb-1">
            <div className="font-special-elite uppercase tracking-[0.2em] text-xs text-brass/80">
              {t('wizardEyebrow')}
            </div>
            <h2 className="mt-1 font-display-decorative uppercase tracking-[0.1em] text-2xl text-foreground">
              {t('wizardTitle')}
            </h2>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-between mt-6 px-2">
            {stepNames.map((name, idx) => {
              const stepNo = idx + 1;
              const done = stepNo < state.step;
              const active = stepNo === state.step;
              return (
                <Fragment key={idx}>
                  <div className="flex flex-col items-center gap-2 w-[120px]">
                    <div
                      className={`flex items-center justify-center font-display ${
                        active
                          ? 'w-[42px] h-[42px] font-bold text-[17px] border border-brass/30 bg-primary text-[#04110f] shadow-[0_0_18px_rgba(13,148,136,.5)] animate-emerald-pulse'
                          : done
                            ? 'w-[38px] h-[38px] text-[15px] border border-brass/30 bg-primary/[0.12] text-brass/80'
                            : 'w-[38px] h-[38px] text-[15px] border border-brass/40 text-muted-foreground'
                      }`}
                    >
                      {done ? '✓' : stepNo}
                    </div>
                    <div
                      className={`font-special-elite text-xs uppercase tracking-[0.1em] text-center ${
                        active
                          ? 'text-brass/80'
                          : done
                            ? 'text-muted-foreground'
                            : 'text-muted-foreground/70'
                      }`}
                    >
                      {name}
                    </div>
                  </div>
                  {idx < stepNames.length - 1 && (
                    <div
                      className={`flex-1 h-px -mx-2 mb-[22px] ${
                        stepNo < state.step ? 'bg-primary' : 'bg-brass/25'
                      }`}
                    />
                  )}
                </Fragment>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6 flex flex-col">
          {renderCurrentStep()}
        </div>

        {/* Footer - nawigacja */}
        <div className="flex-shrink-0 px-8 py-4 border-t border-brass/[0.22] bg-[#100d09] flex justify-between items-center">
          <Button
            onClick={prevStep}
            disabled={state.step === 1}
            variant="outline"
            size="sm"
            className="font-display font-semibold uppercase tracking-[0.16em] text-muted-foreground bg-transparent border-brass/30 hover:border-brass/60 hover:text-brass px-6 py-3 disabled:opacity-40"
          >
            ‹ {t('back')}
          </Button>

          <div className="font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground">
            {t('stepOf', { current: state.step, total: TOTAL_STEPS })}
          </div>

          {state.step < TOTAL_STEPS ? (
            <Button
              onClick={nextStep}
              disabled={
                (state.step === 1 && !selectedArchetypeId) ||
                (state.step === 3 && !state.occupationId)
              }
              size="sm"
              className="font-display font-semibold uppercase tracking-[0.16em] text-[#04110f] bg-primary border border-brass/30 hover:brightness-110 shadow-[0_0_16px_rgba(13,148,136,.3)] px-7 py-3"
            >
              {t('next')} ›
            </Button>
          ) : (
            <Button
              onClick={finishCreation}
              disabled={isCreating}
              size="sm"
              className="font-display font-semibold uppercase tracking-[0.16em] text-[#04110f] bg-primary border border-brass/30 hover:brightness-110 shadow-[0_0_16px_rgba(13,148,136,.3)] px-7 py-3"
            >
              {isCreating ? t('creating') : `✓ ${t('finishAndSave')}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
