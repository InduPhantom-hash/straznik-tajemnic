/**
 * @file cheat-engine.ts
 * Retro Silnik Kodow i Testow Mechanik (Cheat Engine 90s/00s) dla Call of Cthulhu 7e.
 */

import type { Character, Message, SpellCastEventData, TomeStudyEventData, PendingMeleeAttack } from '@/lib/types';
import type { SkillTestData, HazardEventData } from '@/lib/parsers/types';
import { extractHazardEvents } from '@/lib/parsers/mechanics-parser';
import { resolveTestValue } from '@/lib/skill-test-resolver';
import { createEquipmentItem } from '@/lib/equipment-data';
import { rollDiceFormula } from '@/lib/dice-utils';

export interface CheatSuggestion {
  command: string;
  template: string;
  labelPl: string;
  labelEn: string;
  category: 'dice' | 'stats' | 'combat' | 'chase' | 'items' | 'world' | 'retro' | 'magic';
  descriptionPl: string;
  descriptionEn: string;
}

export interface CheatExecutionResult {
  isCheat: boolean;
  rawCommand?: string;
  assistantMessage?: Partial<Message>;
  characterUpdates?: Partial<Character>;
  openCombatModal?: {
    attackerName: string;
    attackerWeapon?: string;
    dodgeSkill: number;
    brawlSkill: number;
    playerBuild?: number;
    attackerBuild?: number;
  };
  openChaseModal?: boolean;
  toastMessage?: string;
}

export const CHEAT_REGISTRY: CheatSuggestion[] = [
  {
    command: 'ROLL',
    template: '[ROLL: Spostrzegawczość]',
    labelPl: 'Test Umiejętności / Cechy',
    labelEn: 'Skill / Characteristic Test',
    category: 'dice',
    descriptionPl: 'Otwiera interaktywną tackę testu z kalkulacją progów sukcesu CoC 7e.',
    descriptionEn: 'Opens interactive test tray with CoC 7e success thresholds.',
  },
  {
    command: 'TEST',
    template: '[TEST: Spostrzegawczość | zwykly]',
    labelPl: 'Test z Trudnością',
    labelEn: 'Test with Difficulty',
    category: 'dice',
    descriptionPl: 'Wymusza test umiejętności z określoną trudnością (zwykly/trudny/ekstremalny).',
    descriptionEn: 'Forces a skill check with specific difficulty (regular/hard/extreme).',
  },
  {
    command: 'DICE',
    template: '[DICE: 1d100]',
    labelPl: 'Rzut Kością',
    labelEn: 'Dice Roll',
    category: 'dice',
    descriptionPl: 'Rzuca dowolną formułą kości (np. 1d100, 2d6+3, 1d10).',
    descriptionEn: 'Rolls any dice formula (e.g. 1d100, 2d6+3, 1d10).',
  },
  {
    command: 'HP',
    template: '[HP: -4: postrzał]',
    labelPl: 'Modyfikacja Zdrowia (HP)',
    labelEn: 'Health Modification (HP)',
    category: 'stats',
    descriptionPl: 'Zadaje obrażenia lub leczy punkty życia, weryfikując Ciężkie Rany RAW.',
    descriptionEn: 'Deals damage or restores HP, verifying RAW Major Wounds.',
  },
  {
    command: 'HEAL',
    template: '[HEAL]',
    labelPl: 'Pełne Uleczenie',
    labelEn: 'Full Heal',
    category: 'stats',
    descriptionPl: 'Przywraca 100% HP i usuwa statusy ciężkich ran i nieprzytomności.',
    descriptionEn: 'Restores 100% HP and clears major wounds and unconsciousness.',
  },
  {
    command: 'SANITY',
    template: '[SANITY: -5: makabra]',
    labelPl: 'Modyfikacja Poczytalności',
    labelEn: 'Sanity Modification',
    category: 'stats',
    descriptionPl: 'Odejmuje lub dodaje SAN, odpala test INT przy stracie >= 5 RAW.',
    descriptionEn: 'Alters SAN, triggers INT test on loss >= 5 RAW.',
  },
  {
    command: 'MADNESS',
    template: '[MADNESS]',
    labelPl: 'Atak Szaleństwa',
    labelEn: 'Bout of Madness',
    category: 'stats',
    descriptionPl: 'Natychmiastowo wprowadza badacza w stan Czasowej Niepoczytalności.',
    descriptionEn: 'Instantly inflicts Temporary Insanity / Bout of Madness.',
  },
  {
    command: 'ITEM',
    template: '[ITEM: Rewolwer Colt .38 | Broń boczna detektywa | mundane]',
    labelPl: 'Znaleziony Przedmiot',
    labelEn: 'Acquired Item Card',
    category: 'items',
    descriptionPl: 'Generuje interaktywną kartę z przyciskiem podniesienia przedmiotu.',
    descriptionEn: 'Generates interactive acquired item card with pick-up CTA.',
  },
  {
    command: 'GIVE',
    template: '[GIVE: Latarka elektryczna]',
    labelPl: 'Włóż do Ekwipunku',
    labelEn: 'Add Directly to Inventory',
    category: 'items',
    descriptionPl: 'Błyskawicznie umieszcza rekwizyt w plecaku bez pytań.',
    descriptionEn: 'Instantly puts the item into investigator inventory.',
  },
  {
    command: 'COMBAT',
    template: '[COMBAT: Bandyta z zaułka | nóż sprężynowy]',
    labelPl: 'Starcie Wręcz (Obrona)',
    labelEn: 'Melee Combat (Defense)',
    category: 'combat',
    descriptionPl: 'Otwiera dialog wyboru reakcji obrońcy (Unik vs Kontratak vs Manewr).',
    descriptionEn: 'Opens defender choice modal (Dodge vs Fight Back vs Maneuver).',
  },
  {
    command: 'CHASE',
    template: '[CHASE: Ucieczka z magazynu]',
    labelPl: 'Pościg Filmowy (Chase)',
    labelEn: 'Cinematic Chase Engine',
    category: 'chase',
    descriptionPl: 'Odpala interaktywny tor pościgu CoC 7e z przeszkodami i manewrami.',
    descriptionEn: 'Launches CoC 7e interactive chase track with obstacles & maneuvers.',
  },
  {
    command: 'HAZARD',
    template: '[HAZARD: upadek | wys=6m | podloze=normalne | opis=Krucha drabina na wieży]',
    labelPl: 'Zagrożenie RAW: Upadek',
    labelEn: 'RAW Hazard: Falling',
    category: 'combat',
    descriptionPl: 'Otwiera dialog upadku CoC 7e RAW (wysokość w metrach, rodzaj podłoża, amortyzacja Skakaniem).',
    descriptionEn: 'Opens CoC 7e RAW fall dialog (height in meters, surface type, Jump cushioning).',
  },
  {
    command: 'HAZARD_POISON',
    template: '[HAZARD: trucizna | kategoria=silna | nazwa=Arszenik | opis=Zatrute wino na bankiecie]',
    labelPl: 'Zagrożenie RAW: Trucizna',
    labelEn: 'RAW Hazard: Poison',
    category: 'combat',
    descriptionPl: 'Wstrzykuje kartę toksyny (kategoria łagodna/silna/śmiertelna, rzut obronny CON).',
    descriptionEn: 'Injects poison card (mild/strong/lethal severity, defensive CON check).',
  },
  {
    command: 'HAZARD_FIRE',
    template: '[HAZARD: ogien | intensywnosc=major | rundy=2 | opis=Płonąca biblioteka]',
    labelPl: 'Zagrożenie RAW: Ogień i Kwas',
    labelEn: 'RAW Hazard: Fire & Acid',
    category: 'combat',
    descriptionPl: 'Testuje obrażenia od ognia lub kwasu (tabela RAW, ominięcie pancerza).',
    descriptionEn: 'Tests fire or acid damage (RAW table, armor bypassed).',
  },
  {
    command: 'HAZARD_DROWN',
    template: '[HAZARD: toniecie | rodzaj=woda | opis=Zalewany korytarz podziemi]',
    labelPl: 'Zagrożenie RAW: Uduszenie / Tonięcie',
    labelEn: 'RAW Hazard: Suffocation / Drowning',
    category: 'combat',
    descriptionPl: 'Testuje rundy bez tchu (test CON co rundę, automatyczne obrażenia po porażce).',
    descriptionEn: 'Tests airless rounds (CON check each round, automatic damage on failure).',
  },
  {
    command: 'IMAGE',
    template: '[IMAGE: Mroczna aleja w deszczu, Arkham 1925 | scene]',
    labelPl: 'Generowanie Ilustracji',
    labelEn: 'Generate Scene Art',
    category: 'world',
    descriptionPl: 'Testuje renderowanie i lightbox karty obrazu w strumieniu czatu.',
    descriptionEn: 'Tests chat card image rendering and lightbox viewer.',
  },
  {
    command: 'SPELL',
    template: '[SPELL: wither-limb | cel=Kultysta]',
    labelPl: 'Rzucenie Zaklęcia (Magia RAW)',
    labelEn: 'Cast Spell (RAW Magic)',
    category: 'magic',
    descriptionPl: 'Otwiera interaktywną kartę rzucania czaru CoC 7e (Hard POW, koszty MP/SAN/POW, rzut sporny).',
    descriptionEn: 'Opens interactive CoC 7e spell casting card (Hard POW, MP/SAN/POW costs, opposed roll).',
  },
  {
    command: 'TOME',
    template: '[TOME: necronomicon-latin | akcja=skimming]',
    labelPl: 'Lektura i Studium Tomu Mitów',
    labelEn: 'Mythos Tome Study / Reading',
    category: 'magic',
    descriptionPl: 'Generuje kartę tomu (Wstępny przegląd, Sprawdzenie referencyjne, Pełne studium, Reguła Wiary).',
    descriptionEn: 'Generates mythos tome card (Initial Reading, Reference Check, Full Study, Belief rule).',
  },
  {
    command: 'IDDQD',
    template: '[IDDQD]',
    labelPl: 'God Mode (Nieśmiertelność)',
    labelEn: 'God Mode (Immortal)',
    category: 'retro',
    descriptionPl: '100% HP, 100% SAN, 99 Szczęścia, usunięcie wszystkich ran.',
    descriptionEn: '100% HP, 100% SAN, 99 Luck, all wounds cured.',
  },
  {
    command: 'IDKFA',
    template: '[IDKFA]',
    labelPl: 'Zestaw Śledczego (All Items)',
    labelEn: 'Investigator Kit (All Items)',
    category: 'retro',
    descriptionPl: 'Dodaje rewolwer, latarkę, wytrychy, notes i apteczkę.',
    descriptionEn: 'Adds revolver, flashlight, lockpicks, notebook and medkit.',
  },
  {
    command: 'HELP',
    template: '[HELP]',
    labelPl: 'Ściąga Kodów Retro',
    labelEn: 'Retro Cheats Cheat-Sheet',
    category: 'retro',
    descriptionPl: 'Wypisuje kompletną listę dostępnych kodów deweloperskich.',
    descriptionEn: 'Displays full reference guide for all developer commands.',
  },
];

const CHEAT_COMMAND_SET = new Set([
  ...CHEAT_REGISTRY.map((c) => c.command.toUpperCase()),
  'CHEATS',
  'ZAGROŻENIE',
  'ZAGROZENIE',
  'CZAR',
  'CAST',
  'TOM',
  'STUDY',
]);

export function isCheatCommand(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    return false;
  }
  const content = trimmed.slice(1, -1).trim();
  const colonIndex = content.indexOf(':');
  const command = (colonIndex === -1 ? content : content.slice(0, colonIndex)).trim().toUpperCase();
  return CHEAT_COMMAND_SET.has(command);
}

export function filterCheatSuggestions(input: string): CheatSuggestion[] {
  let query = input.trim();
  if (query.startsWith('[')) {
    query = query.slice(1);
  }
  if (query.endsWith(']')) {
    query = query.slice(0, -1);
  }
  query = query.trim().toLowerCase();

  if (!query) {
    return CHEAT_REGISTRY;
  }

  return CHEAT_REGISTRY.filter((cheat) => {
    return (
      cheat.command.toLowerCase().includes(query) ||
      cheat.template.toLowerCase().includes(query) ||
      cheat.labelPl.toLowerCase().includes(query) ||
      cheat.labelEn.toLowerCase().includes(query)
    );
  });
}

export function executeCheatCommand(
  rawInput: string,
  character: Character | null,
  locale: 'pl' | 'en' = 'pl'
): CheatExecutionResult {
  const isPl = locale === 'pl';
  const trimmed = rawInput.trim();
  if (!isCheatCommand(trimmed)) {
    return { isCheat: false };
  }

  const content = trimmed.slice(1, -1).trim();
  const colonIndex = content.indexOf(':');
  const command = (colonIndex === -1 ? content : content.slice(0, colonIndex)).trim().toUpperCase();
  const argsString = colonIndex === -1 ? '' : content.slice(colonIndex + 1).trim();
  const args = argsString ? argsString.split('|').map((a) => a.trim()) : [];

  const now = new Date();

  if (command === 'HELP' || command === 'CHEATS') {
    const list = CHEAT_REGISTRY.map(
      (c) => '• `' + c.template + '` - ' + (isPl ? c.labelPl : c.labelEn) + ': ' + (isPl ? c.descriptionPl : c.descriptionEn)
    ).join('\n');

    return {
      isCheat: true,
      rawCommand: trimmed,
      assistantMessage: {
        id: 'cheat_msg_' + Date.now(),
        role: 'assistant',
        content: isPl
          ? '### 🕹️ RETRO SILNIK KODÓW DEWELOPERSKICH (CoC 7e RAW)\n\nMożesz natychmiast wywołać i przetestować dowolną mechanikę wpisując poniższe kody w czacie:\n\n' + list + '\n\n*Wskazówka: Wpisz `[` w polu wiadomości, aby otworzyć wysuwane menu podpowiedzi.*'
          : '### 🕹️ RETRO DEVELOPER CHEAT ENGINE (CoC 7e RAW)\n\nYou can instantly trigger and test any game mechanic by entering codes below into the chat:\n\n' + list + '\n\n*Hint: Type `[` in the message box to open the autocomplete popup.*',
        timestamp: now,
      },
    };
  }

  if (command === 'IDDQD' || command === 'GODMODE') {
    const maxHp = character?.maxHp || 12;
    const maxSan = character?.maxSan || 99;
    return {
      isCheat: true,
      rawCommand: trimmed,
      characterUpdates: {
        hp: maxHp,
        san: maxSan,
        luck: 99,
        hasMajorWound: false,
        isUnconscious: false,
        isDying: false,
        insanityState: 'none',
        underlyingInsanity: false,
        activeBoutOfMadness: null,
      },
      assistantMessage: {
        id: 'cheat_msg_' + Date.now(),
        role: 'assistant',
        content: isPl
          ? '⚡ **[IDDQD - TRYB BOGA AKTYWOWANY]**\nPunkty Życia: **' + maxHp + '/' + maxHp + '**, Poczytalność: **' + maxSan + '/' + maxSan + '**, Szczęście: **99**. Wszystkie rany i zaburzenia psychiczne zostały uleczone.'
          : '⚡ **[IDDQD - GOD MODE ACTIVATED]**\nHit Points: **' + maxHp + '/' + maxHp + '**, Sanity: **' + maxSan + '/' + maxSan + '**, Luck: **99**. All wounds and psychological trauma cleared.',
        timestamp: now,
      },
      toastMessage: isPl ? 'IDDQD: Tryb Boga Aktywowany!' : 'IDDQD: God Mode Activated!',
    };
  }

  if (command === 'IDKFA') {
    const items = [
      createEquipmentItem({ name: 'Rewolwer .38', category: 'weapon', description: 'Niezawodny rewolwer policyjny.' }),
      createEquipmentItem({ name: 'Latarka elektryczna', category: 'tool', description: 'Solidna mosiężna latarka.' }),
      createEquipmentItem({ name: 'Wytrychy śledcze', category: 'tool', description: 'Zestaw wytrychów ze stali sprężynowej.' }),
      createEquipmentItem({ name: 'Skórzany notes z ołówkiem', category: 'document', description: 'Czysty notes do zapisków.' }),
      createEquipmentItem({ name: 'Podręczna apteczka', category: 'medical', description: 'Bandaże, jodyna i morfina.' }),
    ];
    const existing = character?.equipment || [];
    return {
      isCheat: true,
      rawCommand: trimmed,
      characterUpdates: {
        equipment: [...existing, ...items],
      },
      assistantMessage: {
        id: 'cheat_msg_' + Date.now(),
        role: 'assistant',
        content: isPl
          ? '🎒 **[IDKFA - PEŁNY EKWIPUNEK ŚLEDCZEGO]**\nDo Twojej teczki trafiły:\n• Rewolwer .38\n• Latarka elektryczna\n• Wytrychy śledcze\n• Skórzany notes\n• Podręczna apteczka'
          : '🎒 **[IDKFA - FULL INVESTIGATOR KIT]**\nAdded to your inventory:\n• .38 Revolver\n• Flashlight\n• Lockpicks\n• Leather notebook\n• First aid kit',
        timestamp: now,
      },
      toastMessage: isPl ? 'IDKFA: Ekwipunek załadowany!' : 'IDKFA: Inventory loaded!',
    };
  }

  if (command === 'ROLL' || command === 'TEST') {
    const skillName = args[0] || 'Spostrzegawczość';
    const rawDiff = args[1]?.toLowerCase() || 'zwykly';
    const difficulty: 'zwykly' | 'trudny' | 'ekstremalny' =
      rawDiff.includes('trud') || rawDiff.includes('hard')
        ? 'trudny'
        : rawDiff.includes('ekstr') || rawDiff.includes('extr')
        ? 'ekstremalny'
        : 'zwykly';

    const skillVal = (resolveTestValue(skillName, character) ?? 50);
    const testData: SkillTestData = {
      id: 'cheat_test_' + Date.now(),
      skillName,
      skillValue: skillVal,
      difficulty,
      modifiers: [],
      justification: args[2] || (isPl ? 'Kod deweloperski czatu' : 'Developer chat cheat'),
      characterId: character?.id,
      characterName: character?.name,
    };

    return {
      isCheat: true,
      rawCommand: trimmed,
      assistantMessage: {
        id: 'cheat_msg_' + Date.now(),
        role: 'assistant',
        content: isPl
          ? '🎲 **Test Umiejętności:** Wywołano test dla **' + skillName + '** (Wartość: ' + skillVal + '%, Trudność: ' + difficulty + ').'
          : '🎲 **Skill Check:** Triggered test for **' + skillName + '** (Value: ' + skillVal + '%, Difficulty: ' + difficulty + ').',
        skillTests: [testData],
        timestamp: now,
      },
    };
  }

  if (command === 'DICE') {
    const formula = args[0] || '1d100';
    const roll = rollDiceFormula(formula) ?? { results: [50], total: 50 };
    return {
      isCheat: true,
      rawCommand: trimmed,
      assistantMessage: {
        id: 'cheat_msg_' + Date.now(),
        role: 'assistant',
        content: isPl
          ? '🎲 **Rzut Kością (' + formula + '):** Wynik = **' + roll.total + '** (kości: [' + roll.results.join(', ') + '])'
          : '🎲 **Dice Roll (' + formula + '):** Result = **' + roll.total + '** (dice: [' + roll.results.join(', ') + '])',
        timestamp: now,
      },
    };
  }

  if (command === 'HP') {
    const deltaStr = args[0] || '-1';
    let delta = parseInt(deltaStr, 10);
    if (isNaN(delta)) {
      const parsedRoll = rollDiceFormula(deltaStr.replace(/[+-]/g, '')) ?? { results: [1], total: 1 };
      delta = deltaStr.startsWith('-') ? -parsedRoll.total : parsedRoll.total;
    }

    const currentHp = character?.hp ?? 10;
    const maxHp = character?.maxHp ?? 10;
    const newHp = Math.max(0, Math.min(maxHp, currentHp + delta));
    const isMajorWound = delta <= -Math.floor(maxHp / 2);

    return {
      isCheat: true,
      rawCommand: trimmed,
      characterUpdates: {
        hp: newHp,
        hasMajorWound: isMajorWound ? true : character?.hasMajorWound,
        isDying: newHp === 0 && (isMajorWound || character?.hasMajorWound),
        isUnconscious: newHp === 0,
      },
      assistantMessage: {
        id: 'cheat_msg_' + Date.now(),
        role: 'assistant',
        content: isPl
          ? '🩸 **[PUNKTY ŻYCIA]** ' + (delta >= 0 ? '+' + delta + ' (Leczenie)' : delta + ' (Obrażenia)') + ' -> Nowy stan: **' + newHp + '/' + maxHp + ' HP**' + (isMajorWound ? '\n⚠️ **UWAGA: CIĘŻKA RANA!** (Utrata ≥ połowy maksymalnego zdrowia)' : '')
          : '🩸 **[HIT POINTS]** ' + (delta >= 0 ? '+' + delta + ' (Heal)' : delta + ' (Damage)') + ' -> New state: **' + newHp + '/' + maxHp + ' HP**' + (isMajorWound ? '\n⚠️ **WARNING: MAJOR WOUND!** (Loss ≥ half of maximum health)' : ''),
        timestamp: now,
      },
    };
  }

  if (command === 'HEAL') {
    const maxHp = character?.maxHp ?? 12;
    return {
      isCheat: true,
      rawCommand: trimmed,
      characterUpdates: {
        hp: maxHp,
        hasMajorWound: false,
        isDying: false,
        isUnconscious: false,
      },
      assistantMessage: {
        id: 'cheat_msg_' + Date.now(),
        role: 'assistant',
        content: isPl
          ? '🩹 **[PEŁNE ULECZENIE]** Punkty życia przywrócone do maksimum (**' + maxHp + '/' + maxHp + ' HP**). Wszystkie rany opatrzone.'
          : '🩹 **[FULL HEAL]** Hit points restored to maximum (**' + maxHp + '/' + maxHp + ' HP**). All wounds treated.',
        timestamp: now,
      },
    };
  }

  if (command === 'SANITY') {
    const deltaStr = args[0] || '-1';
    let delta = parseInt(deltaStr, 10);
    if (isNaN(delta)) {
      const parsedRoll = rollDiceFormula(deltaStr.replace(/[+-]/g, '')) ?? { results: [1], total: 1 };
      delta = deltaStr.startsWith('-') ? -parsedRoll.total : parsedRoll.total;
    }

    const currentSan = character?.san ?? 50;
    const maxSan = character?.maxSan ?? 99;
    const newSan = Math.max(0, Math.min(maxSan, currentSan + delta));
    const requiresIntTest = delta <= -5;

    return {
      isCheat: true,
      rawCommand: trimmed,
      characterUpdates: {
        san: newSan,
      },
      assistantMessage: {
        id: 'cheat_msg_' + Date.now(),
        role: 'assistant',
        content: isPl
          ? '🧠 **[POCZYTALNOŚĆ]** ' + (delta >= 0 ? '+' + delta : delta) + ' -> Nowy stan: **' + newSan + '/' + maxSan + ' SAN**' + (requiresIntTest ? '\n🚨 **TEST INTELIGENCJI (RAW):** Utrata ≥ 5 SAN w jednym zdarzeniu. Sukces oznacza zrozumienie grozy i Atak Szaleństwa!' : '')
          : '🧠 **[SANITY]** ' + (delta >= 0 ? '+' + delta : delta) + ' -> New state: **' + newSan + '/' + maxSan + ' SAN**' + (requiresIntTest ? '\n🚨 **INT TEST REQUIRED (RAW):** Loss ≥ 5 SAN in a single event. Success means understanding horror and a Bout of Madness!' : ''),
        timestamp: now,
      },
    };
  }

  if (command === 'MADNESS' || command === 'BOUT') {
    return {
      isCheat: true,
      rawCommand: trimmed,
      characterUpdates: {
        insanityState: 'temporary',
      },
      assistantMessage: {
        id: 'cheat_msg_' + Date.now(),
        role: 'assistant',
        content: isPl
          ? '🌀 **[ATAK SZALEŃSTWA]** Badacz popada w Czasową Niepoczytalność (Bout of Madness). Świat wiruje, zmysły zawodzą, a umysł ogarnia panika lub amnezja.'
          : '🌀 **[BOUT OF MADNESS]** Investigator succumbs to Temporary Insanity. Panic or fugue state takes over.',
        timestamp: now,
      },
    };
  }

  if (command === 'ITEM') {
    const itemName = args[0] || 'Tajemniczy Artefakt';
    const itemDesc = args[1] || 'Przedmiot wygenerowany kodem deweloperskim.';
    const treatment = args[2]?.toLowerCase() === 'supernatural' ? 'supernatural' : 'mundane';

    const proposalId = 'cheat_prop_' + Date.now();
    return {
      isCheat: true,
      rawCommand: trimmed,
      assistantMessage: {
        id: 'cheat_msg_' + Date.now(),
        role: 'assistant',
        content: isPl
          ? 'Znajdujesz przedmiot: **' + itemName + '**. Możesz włożyć go do swojego ekwipunku.'
          : 'You discover an item: **' + itemName + '**. You can add it to your inventory.',
        acquiredItems: [
          {
            id: proposalId,
            name: itemName,
            description: itemDesc,
            visualTreatment: treatment,
            status: 'pending',
          },
        ],
        timestamp: now,
      },
    };
  }

  if (command === 'GIVE') {
    const itemName = args[0] || 'Przedmiot';
    const item = createEquipmentItem({
      name: itemName,
      category: 'personal',
      description: isPl ? 'Przedmiot dodany komendą [GIVE]' : 'Item added via [GIVE] cheat',
    });
    const existing = character?.equipment || [];
    return {
      isCheat: true,
      rawCommand: trimmed,
      characterUpdates: {
        equipment: [...existing, item],
      },
      assistantMessage: {
        id: 'cheat_msg_' + Date.now(),
        role: 'assistant',
        content: isPl
          ? '📦 Włożono do ekwipunku: **' + itemName + '**.'
          : '📦 Added to inventory: **' + itemName + '**.',
        timestamp: now,
      },
    };
  }

  if (command === 'COMBAT') {
    const attackerName = args[0] || (isPl ? 'Bandyta z zaułka' : 'Alley thug');
    const attackerWeapon = args[1] || (isPl ? 'nóż sprężynowy' : 'switchblade');

    const attack: PendingMeleeAttack = {
      schemaVersion: 1,
      eventId: 'cheat_combat_' + Date.now(),
      roundId: 'round_' + Date.now(),
      ordinal: 0,
      intent: isPl
        ? 'Wyprowadza zdradzieckie, prędkie pchnięcie prosto w pierś!'
        : 'Strikes with a swift, treacherous stab straight for your chest!',
      attacker: {
        id: 'npc_thug_' + Date.now(),
        name: attackerName,
        build: 0,
        hp: 9,
        maxHp: 9,
        armor: 0,
        attackSkill: 45,
        damageBonus: '0',
      },
      target: {
        characterId: character?.id || 'active_char',
        name: character?.name || (isPl ? 'Badacz' : 'Investigator'),
      },
      weapon: {
        attackOptionId: 'switchblade',
        name: attackerWeapon,
        damageFormula: '1d4',
        damageClass: 'impaling',
      },
    };

    return {
      isCheat: true,
      rawCommand: trimmed,
      assistantMessage: {
        id: 'cheat_msg_' + Date.now(),
        role: 'assistant',
        content: isPl
          ? `Z mroku wyłania się **${attackerName}**, błyskając w świetle latarni ostrzem (${attackerWeapon}) i biorąc zamach w Twoją stronę!`
          : `Emerging from the shadows, **${attackerName}** flashes a ${attackerWeapon} in the lantern light and lunges in your direction!`,
        timestamp: now,
        pendingMeleeAttacks: [attack],
      },
    };
  }

  if (command === 'CHASE') {
    return {
      isCheat: true,
      rawCommand: trimmed,
      openChaseModal: true,
      assistantMessage: {
        id: 'cheat_msg_' + Date.now(),
        role: 'assistant',
        content: isPl
          ? '🏃 **[POŚCIG FILMOWY]** Rozpoczyna się dynamiczny pościg ulicami Arkham! Uruchomiono panel manewrów i tor przeszkód.'
          : '🏃 **[CINEMATIC CHASE]** A thrilling chase begins! Obstacle track and maneuver panel initialized.',
        timestamp: now,
      },
    };
  }

  if (
    command === 'HAZARD' ||
    command === 'HAZARD_POISON' ||
    command === 'HAZARD_FIRE' ||
    command === 'HAZARD_DROWN' ||
    command === 'ZAGROŻENIE' ||
    command === 'ZAGROZENIE'
  ) {
    // Normalizujemy warianty komend (np. [HAZARD_POISON: ...] -> [HAZARD: ...]) pod kanoniczny parser CoC 7e RAW
    const normalizedInput = trimmed.replace(/^\[(HAZARD_[A-Z]+):/i, '[HAZARD:');
    const parsedHazards = extractHazardEvents(normalizedInput);
    const hazardData: HazardEventData = parsedHazards.length > 0
      ? parsedHazards[0]
      : {
          id: 'hazard_' + Date.now(),
          type: 'falling',
          description: args[2] || (isPl ? 'Zawalający się fragment podłogi' : 'Collapsing floor section'),
          fallHeightMeters: 3,
        };

    return {
      isCheat: true,
      rawCommand: trimmed,
      assistantMessage: {
        id: 'cheat_msg_' + Date.now(),
        role: 'assistant',
        content: isPl
          ? '⚠️ **[ZAGROŻENIE ŚRODOWISKOWE RAW]** ' + hazardData.description
          : '⚠️ **[RAW ENVIRONMENTAL HAZARD]** ' + hazardData.description,
        hazardEvents: [hazardData],
        timestamp: now,
      },
    };
  }

  if (command === 'SPELL' || command === 'CZAR' || command === 'CAST') {
    let spellId = 'wither-limb';
    let targetName: string | undefined;
    let targetPow: number | undefined;
    let alias: string | undefined;
    let description: string | undefined;

    if (args.length > 0 && args[0]) {
      const first = args[0];
      if (first.toLowerCase().startsWith('id=')) {
        spellId = first.slice(3).trim();
      } else {
        spellId = first;
      }
    }

    for (let i = 1; i < args.length; i++) {
      const part = args[i];
      const lower = part.toLowerCase();
      if (lower.startsWith('cel=') || lower.startsWith('target=')) {
        targetName = part.slice(part.indexOf('=') + 1).trim();
      } else if (lower.startsWith('pow=')) {
        targetPow = parseInt(part.slice(part.indexOf('=') + 1).trim(), 10) || undefined;
      } else if (lower.startsWith('alias=')) {
        alias = part.slice(part.indexOf('=') + 1).trim();
      } else if (lower.startsWith('opis=') || lower.startsWith('desc=')) {
        description = part.slice(part.indexOf('=') + 1).trim();
      } else if (!targetName) {
        targetName = part;
      }
    }

    const spellData: SpellCastEventData = {
      id: 'spell_test_' + Date.now(),
      spellId,
      characterName: character?.name,
      characterId: character?.id,
      targetName: targetName || (isPl ? 'Kultysta z nożem' : 'Cultist with dagger'),
      targetPow: targetPow ?? 55,
      alias,
      description,
    };

    return {
      isCheat: true,
      rawCommand: trimmed,
      assistantMessage: {
        id: 'cheat_msg_' + Date.now(),
        role: 'assistant',
        content: isPl
          ? '🔮 **[MAGIA MITÓW CoC 7e RAW]** Zainicjowano procedurę rzucania zaklęcia: **' + spellId + '**.'
          : '🔮 **[CTHULHU MYTHOS MAGIC RAW]** Initiated spell casting procedure: **' + spellId + '**.',
        spellCastEvents: [spellData],
        timestamp: now,
      },
      toastMessage: isPl ? 'Wywołano kartę czaru' : 'Spell card triggered',
    };
  }

  if (command === 'TOME' || command === 'TOM' || command === 'STUDY') {
    let tomeId = 'necronomicon-latin';
    let action: 'skimming' | 'study' | 'reference' = 'skimming';
    let topic: string | undefined;
    let title: string | undefined;

    if (args.length > 0 && args[0]) {
      const first = args[0];
      if (first.toLowerCase().startsWith('id=')) {
        tomeId = first.slice(3).trim();
      } else {
        tomeId = first;
      }
    }

    for (let i = 1; i < args.length; i++) {
      const part = args[i];
      const lower = part.toLowerCase();
      if (lower.startsWith('akcja=') || lower.startsWith('action=')) {
        const actVal = part.slice(part.indexOf('=') + 1).trim().toLowerCase();
        if (actVal === 'study' || actVal === 'studium' || actVal === 'pelne') action = 'study';
        else if (actVal === 'reference' || actVal === 'sprawdzenie' || actVal === 'ref') action = 'reference';
        else action = 'skimming';
      } else if (lower.startsWith('temat=') || lower.startsWith('topic=')) {
        topic = part.slice(part.indexOf('=') + 1).trim();
      } else if (lower.startsWith('tytul=') || lower.startsWith('title=')) {
        title = part.slice(part.indexOf('=') + 1).trim();
      } else if (!topic) {
        topic = part;
      }
    }

    const tomeData: TomeStudyEventData = {
      id: 'tome_test_' + Date.now(),
      tomeId,
      characterName: character?.name,
      characterId: character?.id,
      action,
      topic,
      title,
    };

    return {
      isCheat: true,
      rawCommand: trimmed,
      assistantMessage: {
        id: 'cheat_msg_' + Date.now(),
        role: 'assistant',
        content: isPl
          ? '📜 **[TOMISKO MITÓW CoC 7e RAW]** Otwarto wolumin tajemnej wiedzy: **' + tomeId + '**.'
          : '📜 **[CTHULHU MYTHOS TOME RAW]** Opened occult tome: **' + tomeId + '**.',
        tomeStudyEvents: [tomeData],
        timestamp: now,
      },
      toastMessage: isPl ? 'Wywołano kartę studium tomu' : 'Tome study card triggered',
    };
  }

  if (command === 'IMAGE') {
    const prompt = args[0] || 'Mroczny zaułek Arkham w deszczu, styl noir 1920s';

    return {
      isCheat: true,
      rawCommand: trimmed,
      assistantMessage: {
        id: 'cheat_msg_' + Date.now(),
        role: 'assistant',
        content: isPl ? '🎨 **[GENEROWANIE OBRAZU]** Prompt: *' + prompt + '*' : '🎨 **[IMAGE GENERATION]** Prompt: *' + prompt + '*',
        generatedImages: ['https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80'],
        timestamp: now,
      },
    };
  }

  return {
    isCheat: true,
    rawCommand: trimmed,
    assistantMessage: {
      id: 'cheat_msg_' + Date.now(),
      role: 'assistant',
      content: isPl
        ? '❓ Nieznany kod: `' + trimmed + '`. Wpisz `[HELP]`, aby zobaczyć spis komend.'
        : '❓ Unknown command: `' + trimmed + '`. Type `[HELP]` to view list of cheats.',
      timestamp: now,
    },
  };
}
