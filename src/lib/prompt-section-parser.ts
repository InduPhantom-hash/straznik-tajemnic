/**
 * Prompt Section Parser
 * Parses the GM prompt into sections for dynamic, context-aware loading
 *
 * Reduces token usage by ~30-47% by loading only relevant sections
 */

// Section metadata for context-aware selection
export interface PromptSection {
  id: string; // Unique section identifier
  title: string; // Original header (e.g., "CZĘŚĆ X: SCENY WALKI")
  content: string; // Section text content
  keywords: string[]; // Trigger words/phrases for context detection
  priority: 'core' | 'context' | 'rare'; // When to include
  tokenEstimate: number; // Approximate token count
}

// Game context for section selection
export interface GameContext {
  mode:
    | 'exploration'
    | 'combat'
    | 'chase'
    | 'dream'
    | 'ritual'
    | 'investigation'
    | 'social';
  hasNPCs: boolean;
  recentSANLoss: boolean;
  findingDocument: boolean;
  inDarkness: boolean;
  nightTime: boolean;
  /** War-room: gracze planują w kółko bez ruchu (anti-wzorzec z korpusu actual-play). */
  isStuck?: boolean;
}

// Section definitions with keywords and priorities
const SECTION_DEFINITIONS: Record<
  string,
  {
    keywords: string[];
    priority: 'core' | 'context' | 'rare';
    headerPattern: RegExp;
  }
> = {
  fundament: {
    keywords: [], // Always included
    priority: 'core',
    headerPattern: /^#\s*CZĘŚĆ I[:\s]/m,
  },
  atmosfera: {
    keywords: ['opis', 'lokacja', 'wchodzisz', 'widzisz'],
    priority: 'core',
    headerPattern: /^#\s*CZĘŚĆ II[:\s]/m,
  },
  mechanika: {
    keywords: [
      'rzut',
      'test',
      'umiejętność',
      'forsowanie',
      'sukces',
      'porażka',
    ],
    priority: 'context',
    headerPattern: /^#\s*CZĘŚĆ III[:\s]/m,
  },
  npc: {
    keywords: ['rozmowa', 'npc', 'świadek', 'dialog', 'mówi', 'pyta'],
    priority: 'context',
    headerPattern: /^#\s*CZĘŚĆ IV[:\s]/m,
  },
  handouty: {
    keywords: [
      'dokument',
      'list',
      'gazeta',
      'dziennik',
      'raport',
      'wycinek',
      'znajdujesz',
    ],
    priority: 'context',
    headerPattern: /^#\s*CZĘŚĆ V[:\s]/m,
  },
  szalenstwo: {
    keywords: [
      'san',
      'poczytalność',
      'szaleństwo',
      'fobia',
      'mania',
      'trauma',
      'koszmar',
    ],
    priority: 'context',
    headerPattern: /^#\s*CZĘŚĆ VI[:\s]/m,
  },
  tempo: {
    keywords: [], // Core narrative tool
    priority: 'core',
    headerPattern: /^#\s*CZĘŚĆ VII[:\s]/m,
  },
  prowadzenie: {
    keywords: [], // Core format rules
    priority: 'core',
    headerPattern: /^#\s*CZĘŚĆ VIII[:\s]/m,
  },
  walka: {
    keywords: [
      'atak',
      'walka',
      'broń',
      'strzał',
      'unik',
      'obrażenia',
      'hp',
      'rana',
      'krew',
    ],
    priority: 'context',
    headerPattern: /^#\s*CZĘŚĆ X[:\s]/m,
  },
  posciig: {
    keywords: ['ucieczka', 'pościg', 'biegnie', 'goni', 'gonitwa', 'korytarz'],
    priority: 'context',
    headerPattern: /^#\s*CZĘŚĆ XI[:\s]/m,
  },
  sny: {
    keywords: ['sen', 'koszmar', 'śpi', 'noc', 'wizja', 'marzenie'],
    priority: 'context',
    headerPattern: /^#\s*CZĘŚĆ XII[:\s]/m,
  },
  rytual: {
    keywords: ['rytuał', 'magia', 'zaklęcie', 'księga', 'inkantacja', 'ofiara'],
    priority: 'rare',
    headerPattern: /^#\s*CZĘŚĆ XIII[:\s]/m,
  },
};

/**
 * Parse the full prompt into sections
 */
export function parsePromptSections(rawPrompt: string): PromptSection[] {
  const sections: PromptSection[] = [];

  // Find all section headers with their positions
  const sectionHeaders: {
    id: string;
    title: string;
    start: number;
    def: (typeof SECTION_DEFINITIONS)[string];
  }[] = [];

  for (const [id, def] of Object.entries(SECTION_DEFINITIONS)) {
    const match = rawPrompt.match(def.headerPattern);
    if (match && match.index !== undefined) {
      // Find the full header line
      const headerEnd = rawPrompt.indexOf('\n', match.index);
      const title = rawPrompt.substring(match.index, headerEnd).trim();

      sectionHeaders.push({
        id,
        title,
        start: match.index,
        def,
      });
    }
  }

  // Sort by position in document
  sectionHeaders.sort((a, b) => a.start - b.start);

  // Extract content for each section
  for (let i = 0; i < sectionHeaders.length; i++) {
    const current = sectionHeaders[i];
    const next = sectionHeaders[i + 1];

    const endPos = next ? next.start : rawPrompt.length;
    const content = rawPrompt.substring(current.start, endPos).trim();

    // Estimate tokens (~4 chars per token)
    const tokenEstimate = Math.ceil(content.length / 4);

    sections.push({
      id: current.id,
      title: current.title,
      content,
      keywords: current.def.keywords,
      priority: current.def.priority,
      tokenEstimate,
    });
  }

  // Add any content before first section as 'intro'
  if (sectionHeaders.length > 0 && sectionHeaders[0].start > 0) {
    const introContent = rawPrompt.substring(0, sectionHeaders[0].start).trim();
    if (introContent.length > 50) {
      // Only if substantial
      sections.unshift({
        id: 'intro',
        title: 'Wprowadzenie',
        content: introContent,
        keywords: [],
        priority: 'core',
        tokenEstimate: Math.ceil(introContent.length / 4),
      });
    }
  }

  return sections;
}

/**
 * Detect game context from message and conversation history
 */
export function detectGameContext(
  message: string,
  recentMessages: Array<{ content: string; role: string }> = [],
  character?: { san?: number; maxSan?: number } | null
): GameContext {
  const lowerMessage = message.toLowerCase();
  const recentContent = recentMessages
    .slice(-5)
    .map((m) => m.content.toLowerCase())
    .join(' ');
  const combinedContext = lowerMessage + ' ' + recentContent;

  // Detect combat
  const combatKeywords = [
    'atak',
    'strzel',
    'walcz',
    'uderz',
    'broń',
    'walka',
    'zabij',
  ];
  const isCombat = combatKeywords.some((k) => combinedContext.includes(k));

  // Detect chase
  const chaseKeywords = ['uciekaj', 'biegnij', 'pościg', 'goń', 'ucieczka'];
  const isChase = chaseKeywords.some((k) => combinedContext.includes(k));

  // Detect dream/nightmare
  const dreamKeywords = ['sen', 'śpi', 'koszmar', 'budzi się', 'noc'];
  const isDream = dreamKeywords.some((k) => combinedContext.includes(k));

  // Detect ritual
  const ritualKeywords = [
    'rytuał',
    'odpraw',
    'inkantacja',
    'zaklęcie',
    'księga',
  ];
  const isRitual = ritualKeywords.some((k) => combinedContext.includes(k));

  // Detect social/dialogue
  const socialKeywords = ['rozmawia', 'pyta', 'mówi', 'dialog'];
  const isSocial = socialKeywords.some((k) => combinedContext.includes(k));

  // Detect document finding
  const documentKeywords = [
    'znajduje',
    'list',
    'dziennik',
    'dokument',
    'gazeta',
    'czyta',
  ];
  const findingDocument = documentKeywords.some((k) =>
    combinedContext.includes(k)
  );

  // Detect recent SAN loss
  const sanKeywords = ['san', 'poczytalność', 'strach', 'przerażenie'];
  const recentSANLoss =
    sanKeywords.some((k) => combinedContext.includes(k)) ||
    Boolean(
      character?.san &&
      character?.maxSan &&
      character.san < character.maxSan * 0.7
    );

  // Detect NPC presence
  const npcKeywords = [
    'mówi:',
    '"',
    'świadek',
    'postać',
    'mężczyzna',
    'kobieta',
    'człowiek',
  ];
  const hasNPCs = npcKeywords.some((k) => combinedContext.includes(k));

  // Detect darkness/night
  const darkKeywords = ['ciemno', 'noc', 'latarka', 'świeca', 'mrok'];
  const inDarkness = darkKeywords.some((k) => combinedContext.includes(k));
  const nightTime = darkKeywords.some((k) => combinedContext.includes(k));

  // Detect war-room: gracze planują w kółko bez ruchu (anti-wzorzec z korpusu actual-play).
  // Ostatnie 3 tury gracza to sama deliberacja (słowa planowania, brak słów akcji).
  const planningKeywords = [
    'zastanaw',
    'może by',
    'powinniśmy',
    'powinienem',
    'co jeśli',
    'a gdyby',
    'plan',
    'myślę że',
    'pomysł',
    'debat',
    'dyskut',
    'rozważ',
    'zastanówmy',
  ];
  const actionKeywords = [
    'idę',
    'otwieram',
    'biorę',
    'rzucam',
    'atak',
    'pytam',
    'sprawdzam',
    'wchodzę',
    'strzel',
    'biegnę',
    'chwytam',
    'ruszam',
    'wychodzę',
    'podchodzę',
  ];
  const playerTurns = recentMessages
    .filter((m) => m.role === 'user')
    .slice(-3)
    .map((m) => m.content.toLowerCase());
  const isStuck =
    playerTurns.length >= 3 &&
    playerTurns.every(
      (t) =>
        planningKeywords.some((k) => t.includes(k)) &&
        !actionKeywords.some((k) => t.includes(k))
    );

  // Determine primary mode
  let mode: GameContext['mode'] = 'exploration';
  if (isCombat) mode = 'combat';
  else if (isChase) mode = 'chase';
  else if (isDream) mode = 'dream';
  else if (isRitual) mode = 'ritual';
  else if (isSocial) mode = 'social';
  else if (findingDocument) mode = 'investigation';

  return {
    mode,
    hasNPCs,
    recentSANLoss,
    findingDocument,
    inDarkness,
    nightTime,
    isStuck,
  };
}

/**
 * Select sections based on context
 */
export function selectSectionsForContext(
  sections: PromptSection[],
  context: GameContext
): PromptSection[] {
  const selected: PromptSection[] = [];

  for (const section of sections) {
    // Always include core sections
    if (section.priority === 'core') {
      selected.push(section);
      continue;
    }

    // Context-based inclusion
    let include = false;

    switch (section.id) {
      case 'walka':
        include = context.mode === 'combat';
        break;
      case 'posciig':
        include = context.mode === 'chase';
        break;
      case 'sny':
        include = context.mode === 'dream' || context.nightTime;
        break;
      case 'rytual':
        include = context.mode === 'ritual';
        break;
      case 'npc':
        include = context.hasNPCs || context.mode === 'social';
        break;
      case 'szalenstwo':
        include = context.recentSANLoss;
        break;
      case 'handouty':
        include = context.findingDocument || context.mode === 'investigation';
        break;
      case 'mechanika':
        // Include for any active gameplay
        include = ['combat', 'chase', 'investigation'].includes(context.mode);
        break;
    }

    if (include) {
      selected.push(section);
    }
  }

  return selected;
}

/**
 * Build optimized prompt from sections
 */
export function buildOptimizedPrompt(
  sections: PromptSection[],
  context: GameContext
): string {
  const selectedSections = selectSectionsForContext(sections, context);

  // Calculate total tokens
  const totalTokens = selectedSections.reduce(
    (sum, s) => sum + s.tokenEstimate,
    0
  );

  console.log(
    `📝 Dynamic prompt: ${selectedSections.length}/${sections.length} sections, ~${totalTokens} tokens (mode: ${context.mode})`
  );

  // Combine section contents
  return selectedSections.map((s) => s.content).join('\n\n---\n\n');
}

// Cache for parsed sections (avoid re-parsing on every request)
let cachedSections: PromptSection[] | null = null;
let cachedPromptHash: string | null = null;

/**
 * OPT-05: Reliable hash for cache invalidation.
 * Previous hash used length+substring(0,100) which caused collisions
 * for prompts with same length and start but different content.
 * Now uses djb2 hash over full content - fast O(n) string hash.
 */
function fastHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return hash.toString(36);
}

/**
 * Get or parse sections with caching
 */
export function getCachedSections(rawPrompt: string): PromptSection[] {
  // OPT-05: Reliable hash - full content djb2 instead of length+prefix
  const hash = fastHash(rawPrompt);

  if (cachedSections && cachedPromptHash === hash) {
    return cachedSections;
  }

  cachedSections = parsePromptSections(rawPrompt);
  cachedPromptHash = hash;

  console.log(
    `🔄 Parsed prompt into ${cachedSections.length} sections:`,
    cachedSections.map((s) => `${s.id}(${s.tokenEstimate}t)`).join(', ')
  );

  return cachedSections;
}
