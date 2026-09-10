/**
 * Concordia MakeObservation & Epistemic Fog of War
 *
 * Inspirowane architekturą agentów i Game Mastera Google DeepMind Concordia
 * (google-deepmind/concordia: components/game_master/event_resolution.py oraz agent observation loops).
 *
 * Odpowiada za:
 * 1. Rozdzielenie obiektywnej Prawdy Świata / Ukrytych Myśli MG (Keeper Truth) od subiektywnej percepcji Badacza (MakeObservation).
 * 2. Zapewnienie horyzontu epistemicznego w trybie Solo oraz Hot Seat (separacja wiedzy i spostrzeżeń między graczami).
 * 3. Filtr zniekształceń sensorycznych przy naruszonej Poczytalności (SAN loss >= 5, Bout of Madness, fobie/manie, niski poziom SAN).
 * 4. Warunkowe odblokowywanie sekretów (Conditional Secret Injection) w RAG i aktach śledczych (unrevealed -> discovered -> verified).
 *
 * @module concordia/make-observation
 */

import type { RetrievalResult } from '../vector-db/retrieval-service';

export type EpistemicLayer = 'keeper_truth' | 'player_clue';
export type DiscoveryStatus = 'unrevealed' | 'discovered' | 'verified';

export type SanityPerceptionTier =
  | 'stable'
  | 'shaken'
  | 'acute_insanity'
  | 'permanent_insanity';

export interface SanityPerceptionFilter {
  tier: SanityPerceptionTier;
  isBoutOfMadness: boolean;
  isPermanentInsanity?: boolean;
  sensoryDistortions: string[];
  realityCheckRequired: boolean;
  recommendedGuidance: string;
}

export interface InvestigatorSubjectiveState {
  id: string;
  name: string;
  currentLocation?: string;
  sanity?: number;
  maxSanity?: number;
  dayStartSan?: number;
  dailySanLoss?: number;
  insanityState?: 'none' | 'temporary' | 'indefinite' | 'permanent' | string;
  underlyingInsanity?: boolean;
  isBoutOfMadnessActive?: boolean;
  phobias?: string[];
  manias?: string[];
  recentSanityLoss?: number;
  perceptualFocus?: string;
}

export interface EpistemicTruthAnchor {
  culprit?: string;
  motive?: string;
  murderWeapon?: string;
  keyAlibi?: string;
  immutableFacts?: string[];
  unrevealedClueTitles?: string[];
}

export interface MakeObservationContext {
  characters: InvestigatorSubjectiveState[];
  activeCharacterName?: string;
  currentLocation?: string;
  scenePresentNpcNames?: string[];
  truthAnchor?: EpistemicTruthAnchor;
  isHotSeat?: boolean;
  locale?: 'pl' | 'en';
}

/**
 * Ocenia stan psychiczny badacza i zwraca filtr percepcji sensorycznej wg zasad CoC 7e RAW.
 */
export function evaluateSanityFilter(
  char: Pick<
    InvestigatorSubjectiveState,
    | 'sanity'
    | 'maxSanity'
    | 'dayStartSan'
    | 'dailySanLoss'
    | 'insanityState'
    | 'underlyingInsanity'
    | 'isBoutOfMadnessActive'
    | 'phobias'
    | 'manias'
    | 'recentSanityLoss'
  >
): SanityPerceptionFilter {
  const currentSan = char.sanity ?? 50;
  const maxSan = char.maxSanity ?? 99;
  const recentLoss = char.recentSanityLoss ?? 0;
  const dailyLoss = char.dailySanLoss ?? 0;
  const isBout = Boolean(char.isBoutOfMadnessActive) || recentLoss >= 5;

  const distortions: string[] = [];

  if (char.phobias && char.phobias.length > 0) {
    distortions.push(`Fobia: ${char.phobias.join(', ')}`);
  }
  if (char.manias && char.manias.length > 0) {
    distortions.push(`Mania: ${char.manias.join(', ')}`);
  }

  // 1. Permanent Insanity (CoC 7e RAW s. 156): SAN <= 0 lub stan 'permanent'
  if (currentSan <= 0 || char.insanityState === 'permanent') {
    distortions.push('Trwały rozpad jaźni / umysł bezpowrotnie pochłonięty przez Mity (0 SAN)');
    return {
      tier: 'permanent_insanity',
      isBoutOfMadness: true,
      isPermanentInsanity: true,
      sensoryDistortions: distortions,
      realityCheckRequired: false,
      recommendedGuidance:
        'Trwały obłęd (Permanent Insanity - 0 SAN): badacz traci kontakt z obiektywną rzeczywistością. Zmysły są całkowicie opanowane przez koszmar Mitów. Postać przechodzi pod kontrolę MG jako NPC.',
    };
  }

  // 2. Indefinite Insanity próg 1/5 dziennej utraty (CoC 7e RAW s. 155):
  // Kalkulacja progu na bazie dayStartSan lub (currentSan + dailyLoss)
  const baseDaySan = char.dayStartSan ?? (currentSan + dailyLoss);
  const dayThreshold = Math.floor(baseDaySan / 5);
  const reachedDailyThreshold = dayThreshold > 0 && dailyLoss >= dayThreshold;

  // 3. Acute Insanity: aktywny atak szaleństwa, utrata >= 5 SAN na raz lub przekroczenie 1/5 w dobie
  if (isBout || reachedDailyThreshold) {
    distortions.push('Ostry paroksyzm obłędu / halucynacje zmysłowe (dźwięki, cienie, wypaczone proporcje)');
    return {
      tier: 'acute_insanity',
      isBoutOfMadness: true,
      sensoryDistortions: distortions,
      realityCheckRequired: true,
      recommendedGuidance:
        'Wypaczaj prozę zmysłową: badacz widzi lub słyszy zjawiska nieistniejące obiektywnie. Do rozwiania omamu gracz musi zdać Test Realności [TEST: Poczytalność | Test Realności].',
    };
  }

  // 4. Shaken: niska poczytalność, stan po ataku (underlyingInsanity) lub czasowa niepoczytalność
  const isLowSanity = currentSan <= Math.floor(maxSan * 0.2) || currentSan <= 35;
  const hasUnderlyingInsanity =
    Boolean(char.underlyingInsanity) ||
    char.insanityState === 'indefinite' ||
    char.insanityState === 'temporary';

  if (isLowSanity || hasUnderlyingInsanity) {
    distortions.push('Paranoja sensoryczna, chłód somatyczny, podejrzliwość wobec gestów NPC');
    return {
      tier: 'shaken',
      isBoutOfMadness: false,
      sensoryDistortions: distortions,
      realityCheckRequired: false,
      recommendedGuidance:
        'Nasyć opisy paranoją i wyczuleniem na nienaturalne detale (drobne dźwięki, chłodne powiewy, uciekający wzrok rozmówców).',
    };
  }

  return {
    tier: 'stable',
    isBoutOfMadness: false,
    sensoryDistortions: distortions,
    realityCheckRequired: false,
    recommendedGuidance: 'Percepcja stabilna: opisuj zmysły adekwatnie do obiektywnego otoczenia fizycznego.',
  };
}

/**
 * Buduje dyrektywę Epistemicznej Mgły Wojny i MakeObservation dla modelu narracyjnego (Gemini).
 */
export function buildConcordiaObservationDirective(
  context: MakeObservationContext
): string {
  const isEn = context.locale === 'en';
  const lines: string[] = [];

  const title = isEn
    ? '## EPISTEMIC FOG OF WAR & MAKEOBSERVATION (CONCORDIA PATTERN)'
    : '## EPISTEMICZNA MGŁA WOJNY & MAKEOBSERVATION (CONCORDIA PATTERN)';
  lines.push(title);

  // 1. ZAPORA EPISTEMICZNA (KEEPER TRUTH VS OBSERVATION)
  if (isEn) {
    lines.push(
      '1. EPISTEMIC FIREWALL (KEEPER TRUTH VS OBSERVATION):\n' +
      '   - [MYŚLI_MG] is your private cognitive scratchpad for objective world truth, NPC secrets, and plot threads.\n' +
      '   - Objective secrets in [MYŚLI_MG] and scenario lore MUST NEVER bleed directly into player narrative, dialogue, or descriptions. The player perceives the world SOLELY through subjective observation (MakeObservation).\n' +
      '   - Zero "thinking out loud", zero prophetic narrator hints, and zero spoilers without successful mechanical checks.'
    );
    if (context.activeCharacterName) {
      lines.push(
        `   - Active investigator this turn: **${context.activeCharacterName}**. Prioritize their direct sensory perspective and immediate declarations.`
      );
    }
  } else {
    lines.push(
      '1. ZAPORA EPISTEMICZNA (PRAWDA MG VS SUBIEKTYWNA OBSERWACJA):\n' +
      '   - [MYŚLI_MG] to Twój prywatny brudnopis poznawczy na obiektywną prawdę świata, sekrety NPC i intrygę.\n' +
      '   - Informacje z [MYŚLI_MG] oraz ukryte fakty scenariusza NIE MAJĄ PRAWA przenikać bezpośrednio do narracji, dialogu ani wiedzy badacza. Gracz poznaje świat WYŁĄCZNIE przez subiektywną obserwację postaci (MakeObservation).\n' +
      '   - Bezwzględny zakaz "myślenia na głos", proroczych podpowiedzi narratora i ujawniania sekretów bez zdanych testów kośćmi.'
    );
    if (context.activeCharacterName) {
      lines.push(
        `   - Aktywny badacz w tej turze: **${context.activeCharacterName}**. To jego działania i percepcja zmysłowa stanowią główny punkt odniesienia narracji.`
      );
    }
  }

  // 2. SUBIEKTYWNY FILTR PERCEPCJI I POCZYTALNOŚCI
  const charactersWithFilters = context.characters.map((c) => ({
    name: c.name,
    filter: evaluateSanityFilter(c),
  }));

  const disturbedChars = charactersWithFilters.filter(
    (cf) => cf.filter.tier !== 'stable' || cf.filter.sensoryDistortions.length > 0
  );

  if (isEn) {
    lines.push('2. SUBJECTIVE SENSORY & SANITY FILTER (SANITY DISTORTION):');
    lines.push(
      '   - The investigator is NOT an objective camera: observation is filtered by physical senses and Sanity.'
    );
    if (disturbedChars.length > 0) {
      lines.push('   - ACTIVE SANITY DISTORTIONS FOR CHARACTERS:');
      for (const dc of disturbedChars) {
        lines.push(`     * **${dc.name}** [Tier: ${dc.filter.tier.toUpperCase()}]: ${dc.filter.recommendedGuidance}`);
        if (dc.filter.sensoryDistortions.length > 0) {
          lines.push(`       Triggers: ${dc.filter.sensoryDistortions.join('; ')}`);
        }
      }
    } else {
      lines.push('   - Investigators currently have stable perception: ground observations in authentic sensory details (smell, temperature, acoustics).');
    }
  } else {
    lines.push('2. SUBIEKTYWNY FILTR PERCEPCJI I POCZYTALNOŚCI (SANITY DISTORTION):');
    lines.push(
      '   - Badacz NIE JEST obiektywną kamerą: percepcję kształtują fizyczne zmysły oraz aktualny stan Poczytalności.'
    );
    if (disturbedChars.length > 0) {
      lines.push('   - AKTYWNE ZNIEKSZTAŁCENIA POCZYTALNOŚCI BOHATERÓW:');
      for (const dc of disturbedChars) {
        lines.push(`     * **${dc.name}** [Stan: ${dc.filter.tier.toUpperCase()}]: ${dc.filter.recommendedGuidance}`);
        if (dc.filter.sensoryDistortions.length > 0) {
          lines.push(`       Elementy somatyczne/fobie: ${dc.filter.sensoryDistortions.join('; ')}`);
        }
      }
    } else {
      lines.push('   - Percepcja stabilna: osadzaj opisy w autentycznych szczegółach zmysłowych otoczenia (zapach, temperatura, akustyka).');
    }
  }

  // 3. SEPARACJA EPISTEMICZNA W HOT SEAT / DRUŻYNIE
  if (context.isHotSeat && context.characters.length >= 2) {
    const charNames = context.characters.map((c) => c.name);
    const locations = context.characters
      .filter((c) => Boolean(c.currentLocation))
      .map((c) => `${c.name}: ${c.currentLocation}`);
    const hasDifferentLocations =
      new Set(context.characters.map((c) => c.currentLocation).filter(Boolean)).size > 1;

    if (isEn) {
      lines.push('3. MULTI-INVESTIGATOR EPISTEMIC HORIZON (HOT SEAT SEPARATION):');
      lines.push(
        `   - Investigators (${charNames.join(', ')}) DO NOT possess shared telepathy or hivemind awareness.\n` +
        '   - When an event, clue, or observation is experienced by ONLY one character, address it explicitly using @CharacterName:.\n' +
        '   - If Character A inspects a secret drawer while Character B watches the corridor, Character B DOES NOT know what was found until told.\n' +
        '   - If Character A experiences an insanity hallucination, Character B only sees Character A sweating, staring blankly, or trembling.'
      );
      if (hasDifferentLocations && locations.length > 1) {
        lines.push(
          `   - PHYSICAL LOCATION ISOLATION: Investigators are in separate places (${locations.join(', ')}). They perceive ONLY their own physical surroundings and cannot observe each other's actions without moving to the same spot!`
        );
      }
    } else {
      lines.push('3. SEPARACJA EPISTEMICZNA W TRYBIE DRUŻYNY / HOT SEAT:');
      lines.push(
        `   - Badacze (${charNames.join(', ')}) NIE POSIADAJĄ wspólnej świadomości telepatycznej ani ula umysłów.\n` +
        '   - Gdy poszlaka lub zdarzenie dotyczy TYLKO jednej postaci, zaadresuj spostrzeżenie jawnie: @ImięPostaci:.\n' +
        '   - Jeśli Badacz A przeszukuje skrytkę, a Badacz B obserwuje korytarz, Badacz B NIE WIE o znalezionym dokumencie, dopóki Badacz A mu o tym nie powie w świecie gry.\n' +
        '   - Jeśli Badacz A ulega omamowi szaleństwa, Badacz B widzi jedynie jego zblednięcie, pot na czole, pusty wzrok lub drżenie dłoni, a nie potwory z jego wizji.'
      );
      if (hasDifferentLocations && locations.length > 1) {
        lines.push(
          `   - ROZDZIELENIE FIZYCZNE LOKACJI: Badacze przebywają w różnych miejscach (${locations.join(', ')}). Widzą i słyszą WYŁĄCZNIE własne otoczenie i nie wiedzą o zdarzeniach w innej lokacji bez fizycznego przemieszczenia!`
        );
      }
    }
  }

  // 4. WARUNKOWE UJAWNIANIE POSZLAK (CONDITIONAL SECRET INJECTION)
  if (isEn) {
    lines.push(
      '4. CONDITIONAL SECRET INJECTION & MECHANICAL GROUNDING:\n' +
      '   - Clues with status "unrevealed" remain in the fog of war. Simple entry into a room reveals only general topography and mood (Cadence Gear 2).\n' +
      '   - Secrets, locked compartments, microscopic clues, or psychological motives require deliberate action and a SUCCESSFUL roll: [TEST: Spot Hidden / Psychology / Library Use].\n' +
      '   - Failed rolls NEVER grant the secret for free (Fail-Forward applies: noise, delay, weapon damage, alarm, but the clue remains concealed).'
    );
  } else {
    lines.push(
      '4. WARUNKOWE UJAWNIANIE POSZLAK I ZAKOTWICZENIE W MECHANICE RAW:\n' +
      '   - Poszlaki o statusie "nieodkryte" (unrevealed) pozostają we mgle wojny. Zwykłe wejście do pokoju daje jedynie ogólny kadr topograficzny (Bieg 2).\n' +
      '   - Sekrety, ukryte schowki, mikroskopijne ślady i ukryte motywy NPC wymagają zadeklarowanego działania i ZDANEGO TESTU: [TEST: Spostrzegawczość / Psychologia / Biblioteka].\n' +
      '   - Porażka w teście kości NIGDY nie daje darmowego sekretu (Zasada Fail-Forward: komplikacja, upływ czasu, hałas, ale poszlaka pozostaje ukryta).'
    );
  }

  // 5. ZAMKNIĘTA KOPERTA DLA NIEODKRYTYCH POSZLAK
  if (context.truthAnchor?.unrevealedClueTitles && context.truthAnchor.unrevealedClueTitles.length > 0) {
    const list = context.truthAnchor.unrevealedClueTitles.join(', ');
    if (isEn) {
      lines.push(`5. CURRENT UNREVEALED SECRETS (STRICT FOG OF WAR):\n   - Hidden Clues: ${list}\n   - Keep these unrevealed until physically inspected and resolved via dice.`);
    } else {
      lines.push(`5. AKTUALNIE NIEODKRYTE SEKRETY (TWARDA MGŁA WOJNY):\n   - Ukryte tropy: ${list}\n   - ZAKAZ ich przedwczesnego ujawniania w narracji bez fizycznej eksploracji i zdanych rzutów.`);
    }
  }

  return `\n${lines.join('\n')}\n`;
}

/**
 * Filtruje wyniki RAG wg dwuwarstwowej mgły wojny (Two-Layer Fog of War).
 * Rozdziela wiedzę ogólną/odkrytą od chronionych tajemnic MG (Keeper Truth).
 */
export function filterRAGResultsByFogOfWar(
  results: RetrievalResult[]
): {
  publicResults: RetrievalResult[];
  keeperSecrets: RetrievalResult[];
} {
  const publicResults: RetrievalResult[] = [];
  const keeperSecrets: RetrievalResult[] = [];

  const SECRET_PATTERNS = [
    /\bsecret\b/i,
    /\bkeeper\b/i,
    /\bsekret\b/i,
    /\btajemnic[a-zęóąśłżźćń]+\b/i,
    /\bprawda\b/i,
    /\bmotyw\b/i,
    /\bsprawca\b/i,
    /\brytuał\b/i,
    /\bspoiler\b/i,
    /\bclue_secret\b/i,
    /\bkeeper_truth\b/i,
    /\bclosed_envelope\b/i,
  ];

  const SECRET_TAG_KEYWORDS = [
    'secret',
    'keeper',
    'spoiler',
    'sekret',
    'tajemnica',
    'spojler',
    'prawda',
    'keeper_truth',
    'gm_only',
    'mg_only',
  ];

  for (const item of results) {
    const tags = Array.isArray(item.tags) ? item.tags : [];
    const isSecretTag = tags.some((t) =>
      typeof t === 'string' &&
      SECRET_TAG_KEYWORDS.some((kw) => t.toLowerCase().includes(kw))
    );

    const isSecretText = SECRET_PATTERNS.some((p) => p.test(item.summary));

    const isSecretNamespace =
      item.namespace.startsWith('adventures') ||
      item.namespace.startsWith('mythos') ||
      item.contentType === 'adventure' ||
      item.contentType === 'mythos';

    const hasExplicitSecretMarker = /\[(?:SECRET|SEKRET|KEEPER|MG|TAJEMNICA)\]/i.test(item.summary);

    // Namespace 'adventures' / 'mythos' z treścią sekretów lub jawny znacznik/tag trafia do warstwy tajemnic
    if (isSecretTag || hasExplicitSecretMarker || (isSecretNamespace && isSecretText)) {
      keeperSecrets.push(item);
    } else {
      publicResults.push(item);
    }
  }

  return { publicResults, keeperSecrets };
}

/**
 * Formatuje sekcję sekretów MG z klauzulą zapory epistemicznej.
 */
export function formatKeeperSecretsSection(
  secrets: RetrievalResult[],
  locale: 'pl' | 'en' = 'pl'
): string {
  if (secrets.length === 0) return '';

  const isEn = locale === 'en';
  const header = isEn
    ? '### 🔒 KEEPER SECRETS (KEEPER TRUTH - EPISTEMIC FOG OF WAR)'
    : '### 🔒 SEKRETY STRÓŻA (KEEPER TRUTH - EPISTEMICZNA MGŁA WOJNY)';

  const directive = isEn
    ? 'STRICT DIRECTIVE: The following facts are objective ground truth for the Keeper only. STRICTLY PROHIBITED from directly revealing them in MakeObservation or narration until the investigator explicitly inspects the source and succeeds on the relevant CoC 7e roll.'
    : 'ŚCISŁA DYREKTYWA MG: Poniższe fakty to obiektywna prawda scenariusza dla Twojej wiedzy jako MG. BEZWZGLĘDNY ZAKAZ bezpośredniego ujawniania ich w MakeObservation lub narracji, dopóki badacz nie przeprowadzi eksploracji i nie zda odpowiedniego testu CoC 7e RAW.';

  const lines: string[] = [header, directive];
  for (const s of secrets) {
    lines.push(`- **[${Math.round(s.score * 100)}%]** ${s.summary}`);
  }

  return `\n${lines.join('\n')}\n`;
}
