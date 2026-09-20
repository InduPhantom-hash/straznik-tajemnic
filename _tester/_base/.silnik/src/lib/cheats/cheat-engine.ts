/**
 * @file cheat-engine.ts
 * Retro Silnik Kodow i Testow Mechanik (Cheat Engine 90s/00s) dla Call of Cthulhu 7e.
 */

import type { Character, Message, SpellCastEventData, TomeStudyEventData, PendingMeleeAttack, DiceRollEventData } from '@/lib/types';
import type { SkillTestData, HazardEventData } from '@/lib/parsers/types';
import { extractHazardEvents } from '@/lib/parsers/mechanics-parser';
import { resolveTestValue } from '@/lib/skill-test-resolver';
import { createEquipmentItem } from '@/lib/equipment-data';
import { rollDiceFormula } from '@/lib/dice-utils';
import { traceForFormula } from '@/lib/dice-roll-trace';

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
    labelPl: 'Rzut Procentowy k100',
    labelEn: 'Percentile d100 Roll',
    category: 'dice',
    descriptionPl: 'Rzut d100 na parze kości dziesiątek i jedności (test umiejętności/cech).',
    descriptionEn: 'd100 roll with tens and units dice (skill/stat test).',
  },
  {
    command: 'DICE_MELEE',
    template: '[DICE: 1d6 | Walka wręcz]',
    labelPl: 'Obrażenia: Walka Wręcz (1d6)',
    labelEn: 'Damage: Melee Combat (1d6)',
    category: 'combat',
    descriptionPl: 'Rzut obrażeń broni obuchowej, pałki lub walki wręcz z bonusem.',
    descriptionEn: 'Damage roll for blunt weapons, clubs, or unarmed brawl.',
  },
  {
    command: 'DICE_FIREARM',
    template: '[DICE: 1d10 | Rewolwer .38]',
    labelPl: 'Obrażenia: Broń Palna (1d10)',
    labelEn: 'Damage: Handgun .38 (1d10)',
    category: 'combat',
    descriptionPl: 'Standardowy rzut obrażeń pistoletu policyjnego lub rewolweru .38.',
    descriptionEn: 'Standard damage roll for police pistol or .38 revolver.',
  },
  {
    command: 'DICE_HEAVY',
    template: '[DICE: 2d6+3 | Strzelba / Shotgun]',
    labelPl: 'Obrażenia: Strzelba (2d6+3)',
    labelEn: 'Damage: Shotgun (2d6+3)',
    category: 'combat',
    descriptionPl: 'Ciężkie obrażenia z bliskiego zasięgu (dubeltówka, strzelba śrutowa).',
    descriptionEn: 'Heavy close-range damage (12-gauge shotgun blast).',
  },
  {
    command: 'DICE_SANITY',
    template: '[DICE: 1d6 | Utrata Poczytalności]',
    labelPl: 'Utrata SAN: Szok Mitów (1d6)',
    labelEn: 'SAN Loss: Mythos Shock (1d6)',
    category: 'stats',
    descriptionPl: 'Rzut utraty Poczytalności przy spotkaniu z potworem lub widoku makabry.',
    descriptionEn: 'Sanity loss roll when encountering horrors or witnessing macabre.',
  },
  {
    command: 'DICE_MYTHOS',
    template: '[DICE: 1d20 | Bestia Mitów]',
    labelPl: 'Obrażenia: Bestia Mitów (1d20)',
    labelEn: 'Damage: Mythos Creature (1d20)',
    category: 'combat',
    descriptionPl: 'Krytyczne obrażenia od potężnych istot Mitów Cthulhu.',
    descriptionEn: 'Critical damage from powerful Mythos monstrosities.',
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
    descriptionPl: 'Inicjuje starcie wręcz w czacie (CombatCard - Unik vs Kontratak vs Manewr).',
    descriptionEn: 'Initiates melee combat in chat (CombatCard - Dodge vs Fight Back vs Maneuver).',
  },
  {
    command: 'WALKA',
    template: '[WALKA: Bandyta z zaułka | nóż sprężynowy]',
    labelPl: 'Starcie Wręcz (CombatCard)',
    labelEn: 'Melee Combat (CombatCard)',
    category: 'combat',
    descriptionPl: 'Inicjuje starcie wręcz w czacie (CombatCard - Unik vs Kontratak vs Manewr).',
    descriptionEn: 'Initiates melee combat in chat (CombatCard - Dodge vs Fight Back vs Maneuver).',
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
    command: 'HANDOUT_DOC',
    template: '[HANDOUT_DOC]',
    labelPl: 'Czytnik Dokumentów (Deep Zoom / Sepia)',
    labelEn: 'Document Viewer (Deep Zoom / Aging)',
    category: 'items',
    descriptionPl: 'Otwiera interaktywny skan rekwizytu (OpenSeadragon) z lupą i filtrami lat 20./PRL.',
    descriptionEn: 'Opens interactive document viewer (OpenSeadragon) with deep zoom and 1920s/PRL filters.',
  },
  {
    command: 'HANDOUT_AUDIO',
    template: '[HANDOUT_AUDIO]',
    labelPl: 'Odtwarzacz Taśm (WaveSurfer / Szpule)',
    labelEn: 'Audio Tape Player (WaveSurfer / Reels)',
    category: 'items',
    descriptionPl: 'Uruchamia diegetyczny odtwarzacz szpulowy z falą dźwiękową i transkrypcją.',
    descriptionEn: 'Launches diegetic reel player with audio waveform visualization and transcript.',
  },
  {
    command: 'HANDOUTS',
    template: '[HANDOUTS]',
    labelPl: 'Komplet Rekwizytów (Dokument + Audio)',
    labelEn: 'Full Handouts Pack (Doc + Audio)',
    category: 'items',
    descriptionPl: 'Wyzwala jednocześnie czytnik dokumentów (skan) oraz odtwarzacz taśm szpulowych.',
    descriptionEn: 'Triggers both interactive document viewer and reel tape player in chat.',
  },
  {
    command: 'DOKUMENT',
    template: '[DOKUMENT]',
    labelPl: 'Czytnik Dokumentów (Alias PL)',
    labelEn: 'Document Viewer (PL Alias)',
    category: 'items',
    descriptionPl: 'Polski alias dla [HANDOUT_DOC] (opcje: [DOKUMENT: prl], [DOKUMENT: mapa], [DOKUMENT: 1920]).',
    descriptionEn: 'Polish alias for [HANDOUT_DOC] (options: [DOKUMENT: prl], [DOKUMENT: mapa], [DOKUMENT: 1920]).',
  },
  {
    command: 'TASMA',
    template: '[TASMA]',
    labelPl: 'Odtwarzacz Taśmy Szpulowej (Alias PL)',
    labelEn: 'Audio Reel Player (PL Alias)',
    category: 'items',
    descriptionPl: 'Polski alias dla [HANDOUT_AUDIO] (opcje: [TASMA: corbitt], [TASMA: radio], [TASMA: gramofon]).',
    descriptionEn: 'Polish alias for [HANDOUT_AUDIO] (options: [TASMA: corbitt], [TASMA: radio], [TASMA: gramofon]).',
  },
  {
    command: 'REKWIZYTY',
    template: '[REKWIZYTY]',
    labelPl: 'Zestaw Rekwizytów Śledczych (Alias PL)',
    labelEn: 'Investigator Handouts Set (PL Alias)',
    category: 'items',
    descriptionPl: 'Polski alias dla [HANDOUTS] (dokument ze skanem i nagranie dźwiękowe).',
    descriptionEn: 'Polish alias for [HANDOUTS] (scanned document and audio recording).',
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
  'KOSTKI',
  'K',
  'DOC',
  'SKAN',
  'TAŚMA',
  'MAGNETOFON',
  'AUDIO',
  'NAGRANIE',
]);

export function isCheatCommand(text: string): boolean {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('/dice') ||
    lower.startsWith('/kostki') ||
    lower.startsWith('/k ') ||
    lower.startsWith('/roll')
  ) {
    return true;
  }
  if (trimmed.startsWith('[')) {
    const endBracket = trimmed.indexOf(']');
    if (endBracket !== -1) {
      const inside = trimmed.slice(1, endBracket).trim();
      const colonIndex = inside.indexOf(':');
      const command = (colonIndex === -1 ? inside : inside.slice(0, colonIndex)).trim().toUpperCase();
      if (CHEAT_COMMAND_SET.has(command)) {
        return true;
      }
    }
  }
  return false;
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

  let command = '';
  let args: string[] = [];
  let tail = '';

  if (trimmed.startsWith('/')) {
    const spaceIdx = trimmed.indexOf(' ');
    const slashCmd = (spaceIdx === -1 ? trimmed.slice(1) : trimmed.slice(1, spaceIdx)).toUpperCase();
    if (slashCmd === 'DICE' || slashCmd === 'KOSTKI' || slashCmd === 'K' || slashCmd === 'ROLL') {
      command = 'DICE';
      const remainder = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1).trim();
      if (remainder.includes('|')) {
        args = remainder.split('|').map((a) => a.trim());
      } else {
        const formulaMatch = remainder.match(/^([+-]?\s*(?:\d+)?(?:d|k)\d+(?:\s*[+-]\s*(?:\d+)?(?:d|k)\d+|\s*[+-]\s*\d+)*)(?:\s+(.+))?$/i);
        if (formulaMatch && formulaMatch[2]) {
          args = [formulaMatch[1].trim(), formulaMatch[2].trim()];
        } else {
          args = remainder ? [remainder] : [];
        }
      }
    }
  } else if (trimmed.startsWith('[')) {
    const endBracket = trimmed.indexOf(']');
    const inside = (endBracket === -1 ? trimmed.slice(1) : trimmed.slice(1, endBracket)).trim();
    tail = endBracket !== -1 ? trimmed.slice(endBracket + 1).trim() : '';

    const colonIndex = inside.indexOf(':');
    command = (colonIndex === -1 ? inside : inside.slice(0, colonIndex)).trim().toUpperCase();
    const argsString = colonIndex === -1 ? '' : inside.slice(colonIndex + 1).trim();
    args = argsString ? argsString.split('|').map((a) => a.trim()) : [];
  }

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

  if (command === 'DICE' || command === 'KOSTKI' || command === 'K' || command.startsWith('DICE_')) {
    const DICE_PRESETS: Record<string, { formula: string; labelPl: string; labelEn: string }> = {
      DICE_MELEE: { formula: '1d6', labelPl: 'Walka wręcz', labelEn: 'Melee Combat' },
      DICE_FIREARM: { formula: '1d10', labelPl: 'Rewolwer .38', labelEn: 'Handgun .38' },
      DICE_HEAVY: { formula: '2d6+3', labelPl: 'Strzelba / Shotgun', labelEn: 'Shotgun' },
      DICE_SANITY: { formula: '1d6', labelPl: 'Utrata Poczytalności', labelEn: 'Sanity Loss' },
      DICE_MYTHOS: { formula: '1d20', labelPl: 'Bestia Mitów', labelEn: 'Mythos Beast' },
    };

    const preset = DICE_PRESETS[command];
    let formula = args[0] || preset?.formula || '1d100';
    let label = args[1] || (preset ? (isPl ? preset.labelPl : preset.labelEn) : undefined);
    if (tail) {
      const pipeIdx = tail.indexOf('|');
      if (pipeIdx !== -1) {
        formula = tail.slice(0, pipeIdx).trim();
        label = tail.slice(pipeIdx + 1).trim();
      } else {
        formula = tail;
      }
    }
    const trace = traceForFormula(formula, 'cheat-dice');
    const rollEvent: DiceRollEventData = {
      id: 'dice_' + Date.now(),
      formula,
      label,
      trace,
      characterName: character?.name,
      timestamp: now.toISOString(),
    };

    const displayTitle = label ? `${formula} (${label})` : formula;

    return {
      isCheat: true,
      rawCommand: trimmed,
      assistantMessage: {
        id: 'cheat_msg_' + Date.now(),
        role: 'assistant',
        content: isPl
          ? `🎲 **Rzut Kością [${displayTitle}]:** Wynik = **${trace.total}**`
          : `🎲 **Dice Roll [${displayTitle}]:** Result = **${trace.total}**`,
        diceRollEvents: [rollEvent],
        timestamp: now,
      },
      toastMessage: isPl ? `Rzut kością: ${displayTitle}` : `Dice roll: ${displayTitle}`,
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

  if (command === 'COMBAT' || command === 'WALKA') {
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

  if (
    command === 'HANDOUT_DOC' ||
    command === 'DOKUMENT' ||
    command === 'DOC' ||
    command === 'SKAN'
  ) {
    const rawArg = (args[0] || '').toLowerCase().trim();
    let imageUrl = '/equipment/catalog/letter-shared.webp';
    let docTitle = isPl ? '📜 DOKUMENT ŚLEDCZY: ZAPISKI Z ARCHIWUM' : '📜 INVESTIGATOR DOCUMENT: ARCHIVE NOTES';
    let docDesc = isPl
      ? 'Poufne notatki odnalezione w prywatnej skrytce bankowej w Arkham.\nNa marginesie widoczne są odręczne dopiski wykonane atramentem żelazowo-galusowym.'
      : 'Confidential notes discovered in a private bank vault in Arkham.\nHandwritten annotations in iron-gall ink are visible along the margin.';
    let itemName = isPl ? 'Zapiski z Archiwum' : 'Archive Notes';
    let itemDesc = isPl ? 'Tajemniczy dokument ze skanem i odręcznymi notatkami.' : 'Mysterious document with handwritten annotations.';

    if (rawArg.includes('prl') || rawArg.includes('1970') || rawArg.includes('milicja') || rawArg.includes('raport') || rawArg.includes('akta')) {
      imageUrl = '/equipment/catalog/contacts-notebook-prl.webp';
      docTitle = isPl ? '📋 RAPORT SŁUŻBOWY: PROTOKÓŁ NR 14/77' : '📋 OFFICIAL REPORT: DOSSIER NO. 14/77';
      docDesc = isPl
        ? 'Odpis maszynowy ze śledztwa w sprawie incydentu w magazynach portowych.\nPieczęć nagłówkowa i adnotacja: DO UŻYTKU WEWNĘTRZNEGO.'
        : 'Typewritten transcript from the harbor warehouse investigation.\nOfficial stamp and annotation: FOR INTERNAL USE ONLY.';
      itemName = isPl ? 'Protokół MO nr 14/77' : 'Police Dossier No. 14/77';
      itemDesc = isPl ? 'Maszynopis z pieczęcią milicyjną i spisem kontaktów.' : 'Typewritten report with official police seal.';
    } else if (rawArg.includes('map') || rawArg.includes('plan')) {
      imageUrl = '/equipment/catalog/map-shared.webp';
      docTitle = isPl ? '🗺️ PLAN SYTUACYJNY: OKOLICE POSIADŁOŚCI' : '🗺️ SITUATION MAP: ESTATE SURROUNDINGS';
      docDesc = isPl
        ? 'Odręcznie sporządzona mapa topograficzna hrabstwa z zaznaczonymi traktami i bagnami.'
        : 'Hand-drawn topographic map of the county with marked trails and marshlands.';
      itemName = isPl ? 'Plan sytuacyjny okolicy' : 'Area Situation Map';
      itemDesc = isPl ? 'Topograficzna mapa ze szlakami i punktami orientacyjnymi.' : 'Topographic map with marked trails and landmarks.';
    } else if (rawArg.includes('foto') || rawArg.includes('photo') || rawArg.includes('zdj')) {
      imageUrl = '/equipment/catalog/photo-shared.webp';
      docTitle = isPl ? '📷 FOTOGRAFIA DOWODOWA: MIEJSCE ZDARZENIA' : '📷 EVIDENCE PHOTO: CRIME SCENE';
      docDesc = isPl
        ? 'Archiwalna odbitka srebrowa z miejsca zdarzenia. Na odwrocie zapisano datę i tajemnicze inicjały.'
        : 'Archival silver gelatin print from the crime scene. Date and initials recorded on the reverse.';
      itemName = isPl ? 'Fotografia dowodowa' : 'Evidence Photograph';
      itemDesc = isPl ? 'Czarno-biała odbitka ze śladami na miejscu zbrodni.' : 'Black and white photograph showing crime scene details.';
    } else if (rawArg.includes('scroll') || rawArg.includes('pergamin') || rawArg.includes('zwoj') || rawArg.includes('zwój')) {
      imageUrl = '/equipment/catalog/latin-scroll-vellum.webp';
      docTitle = isPl ? '📜 ŁACIŃSKI ZWÓJ PERGAMINOWY' : '📜 LATIN VELLUM SCROLL';
      docDesc = isPl
        ? 'Prastary zwój pergaminowy pokryty wyblakłą łaciną i tajemnymi diagramami astronomicznymi.'
        : 'Ancient vellum scroll covered with faded Latin script and esoteric celestial diagrams.';
      itemName = isPl ? 'Łaciński zwój pergaminowy' : 'Latin Vellum Scroll';
      itemDesc = isPl ? 'Prastary manuskrypt ze skanem pergaminu.' : 'Ancient manuscript scroll.';
    } else if (args[0] && (args[0].startsWith('/') || args[0].startsWith('http') || args[0].includes('.'))) {
      imageUrl = args[0].trim();
      docTitle = isPl ? '📜 DOKUMENT ŚLEDCZY' : '📜 INVESTIGATOR DOCUMENT';
      docDesc = isPl ? 'Odnaleziony rekwizyt archiwalny ze skanem dowodowym.' : 'Archival evidence prop with document scan.';
      itemName = isPl ? 'Dokument śledczy' : 'Investigator Document';
      itemDesc = isPl ? 'Rekwizyt ze skanem dokumentu.' : 'Prop with document scan.';
    }

    const content = [
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      docTitle,
      '',
      docDesc,
      '',
      `[OBRAZ: ${imageUrl}]`,
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ].join('\n');

    const item = createEquipmentItem({
      name: itemName,
      category: 'document',
      description: itemDesc,
      imageUrl,
    });

    const existingEquipment = character?.equipment || [];

    return {
      isCheat: true,
      rawCommand: trimmed,
      assistantMessage: {
        id: 'cheat_msg_' + Date.now(),
        role: 'assistant',
        content,
        timestamp: now,
      },
      characterUpdates: {
        equipment: [...existingEquipment, item],
      },
      toastMessage: isPl ? 'Wywołano czytnik dokumentów i dodano rekwizyt do ekwipunku' : 'Document viewer triggered and prop added to inventory',
    };
  }

  if (
    command === 'HANDOUT_AUDIO' ||
    command === 'TASMA' ||
    command === 'TAŚMA' ||
    command === 'MAGNETOFON' ||
    command === 'AUDIO' ||
    command === 'NAGRANIE'
  ) {
    const rawArg = (args[0] || '').toLowerCase().trim();
    let audioUrl = '/audio/handouts/starter_friend_letter.mp3';
    let audioTitle = isPl ? '🎙️ NAGRANIE DŹWIĘKOWE: TAŚMA SZPULOWA NR 1' : '🎙️ AUDIO RECORDING: REEL TAPE NO. 1';
    let transcript = isPl
      ? '[00:02] Trzask włącznika magnetofonu i niski szum przesuwającej się taśmy szpulowej...\n[00:06] "Jeśli to nagranie trafiło w twoje ręce, oznacza to, że stało się najgorsze..."\n[00:14] "Nie ufaj nikomu w porcie. Oni wiedzą, co zostało wyłowione z zatoki."\n[00:22] "Klucz do skrytki jest ukryty pod podłogą w gabinecie. Strzeż go!"'
      : '[00:02] Click of the recorder switch and low hiss of magnetic tape...\n[00:06] "If this recording reached you, the worst has already happened..."\n[00:14] "Trust no one at the docks. They know what was retrieved from the bay."\n[00:22] "The vault key is hidden under the study floorboards. Guard it well!"';
    let itemName = isPl ? 'Taśma szpulowa: Zeznanie' : 'Reel Tape: Testimony';
    let itemDesc = isPl ? 'Szpula magnetofonowa 1/4 cala z nagranym ostrzeżeniem.' : '1/4 inch magnetic reel tape containing recorded warning.';

    if (rawArg.includes('corbitt') || rawArg.includes('dziennik') || rawArg.includes('journal')) {
      audioUrl = '/audio/handouts/corbitt_journal.mp3';
      audioTitle = isPl ? '🎙️ NAGRANIE DŹWIĘKOWE: DZIENNIK CORBITTA' : '🎙️ AUDIO RECORDING: CORBITT JOURNAL';
      transcript = isPl
        ? '[00:02] Skrzypienie igły na woskowej płycie fonografu...\n[00:07] "Dzień dwudziesty trzeci. Głosy w ścianach nie cichną nawet w południe..."\n[00:16] "Corbitt... jego ciało nigdy nie opuściło tej piwnicy. On czeka w ciemności."'
        : '[00:02] Phonograph needle scratching across the wax cylinder...\n[00:07] "Day twenty-three. The voices in the walls do not cease even at noon..."\n[00:16] "Corbitt... his body never left that basement. He waits in the darkness."';
      itemName = isPl ? 'Płyta gramofonowa Corbitta' : 'Corbitt Phonograph Record';
      itemDesc = isPl ? 'Krucha płyta z monologiem badacza zjawisk nadprzyrodzonych.' : 'Fragile phonograph disc with an occult investigator recording.';
    } else if (rawArg.includes('radio') || rawArg.includes('boston') || rawArg.includes('audycja')) {
      audioUrl = '/audio/handouts/boston_globe_radio.mp3';
      audioTitle = isPl ? '📻 AUDYCJA RADIOWA: KOMUNIKAT BOSTON GLOBE' : '📻 RADIO BROADCAST: BOSTON GLOBE BULLETIN';
      transcript = isPl
        ? '[00:02] Pisk modulacji radiowej i trzaski eteru krótkofalowego...\n[00:08] "Tu rozgłośnia Boston Globe. Nadajemy komunikat specjalny dla okolic Arkham..."\n[00:17] "Policja stanowa ostrzega mieszkańców przed zbliżaniem się do wzgórz Sentinel..."'
        : '[00:02] Radio tuning whistle and shortwave static crackle...\n[00:08] "This is Boston Globe Radio with an emergency broadcast for the Arkham area..."\n[00:17] "State police warn residents to keep away from Sentinel Hill..."';
      itemName = isPl ? 'Nagranie audycji radiowej' : 'Radio Broadcast Recording';
      itemDesc = isPl ? 'Zapis audycji ostrzegawczej z odbiornika lampowego.' : 'Recording of an emergency vacuum-tube radio bulletin.';
    } else if (rawArg.includes('gramofon') || rawArg.includes('arkham') || rawArg.includes('plyta') || rawArg.includes('płyta')) {
      audioUrl = '/audio/handouts/arkham_phonograph_record.mp3';
      audioTitle = isPl ? '🎙️ PŁYTA SZELAKOWA: ARCHIWUM MISKATONIC' : '🎙️ SHELLAC RECORD: MISKATONIC ARCHIVES';
      transcript = isPl
        ? '[00:03] Monotonny szum płyty szelakowej 78 RPM...\n[00:09] "Rejestracja fonograficzna z archiwum Uniwersytetu Miskatonic, 1928 rok..."\n[00:18] "Słowa inkantacji wywołują drżenie membrany... słuchajcie na własną odpowiedzialność."'
        : '[00:03] Monotonous hiss of a 78 RPM shellac record...\n[00:09] "Phonograph archive recording from Miskatonic University, 1928..."\n[00:18] "The words of the chant rattle the diaphragm... listen at your own risk."';
      itemName = isPl ? 'Płyta szelakowa Miskatonic' : 'Miskatonic Shellac Record';
      itemDesc = isPl ? 'Archiwalna płyta gramofonowa 78 RPM z pieczęcią uniwersytetu.' : 'Archival 78 RPM record bearing the university seal.';
    } else if (args[0] && (args[0].startsWith('/') || args[0].startsWith('http') || args[0].includes('.'))) {
      audioUrl = args[0].trim();
      audioTitle = isPl ? '🎙️ NAGRANIE DŹWIĘKOWE' : '🎙️ AUDIO RECORDING';
      transcript = `[00:01] ${isPl ? 'Odtwarzanie ścieżki dźwiękowej...' : 'Playing audio track...'}`;
      itemName = isPl ? 'Nagranie dźwiękowe' : 'Audio Recording';
      itemDesc = isPl ? 'Taśma z zarejestrowanym materiałem audio.' : 'Tape with recorded audio material.';
    }

    const content = [
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      audioTitle,
      '',
      transcript,
      '',
      `[AUDIO: ${audioUrl}]`,
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ].join('\n');

    const item = createEquipmentItem({
      name: itemName,
      category: 'tool',
      description: itemDesc,
    });

    const existingEquipment = character?.equipment || [];

    return {
      isCheat: true,
      rawCommand: trimmed,
      assistantMessage: {
        id: 'cheat_msg_' + Date.now(),
        role: 'assistant',
        content,
        timestamp: now,
      },
      characterUpdates: {
        equipment: [...existingEquipment, item],
      },
      toastMessage: isPl ? 'Uruchomiono odtwarzacz taśm i dodano szpulę do ekwipunku' : 'Audio reel player triggered and tape added to inventory',
    };
  }

  if (
    command === 'HANDOUTS' ||
    command === 'REKWIZYTY'
  ) {
    const docTitle = isPl ? '📜 DOKUMENT ŚLEDCZY: ZAPISKI Z ARCHIWUM' : '📜 INVESTIGATOR DOCUMENT: ARCHIVE NOTES';
    const docDesc = isPl
      ? 'Poufne notatki odnalezione w prywatnej skrytce bankowej w Arkham.\nNa marginesie widoczne są odręczne dopiski wykonane atramentem żelazowo-galusowym.'
      : 'Confidential notes discovered in a private bank vault in Arkham.\nHandwritten annotations in iron-gall ink are visible along the margin.';
    const imageUrl = '/equipment/catalog/letter-shared.webp';

    const audioTitle = isPl ? '🎙️ NAGRANIE DŹWIĘKOWE: TAŚMA SZPULOWA NR 1' : '🎙️ AUDIO RECORDING: REEL TAPE NO. 1';
    const transcript = isPl
      ? '[00:02] Trzask włącznika magnetofonu i niski szum przesuwającej się taśmy szpulowej...\n[00:06] "Jeśli to nagranie trafiło w twoje ręce, oznacza to, że stało się najgorsze..."\n[00:14] "Nie ufaj nikomu w porcie. Oni wiedzą, co zostało wyłowione z zatoki."\n[00:22] "Klucz do skrytki jest ukryty pod podłogą w gabinecie. Strzeż go!"'
      : '[00:02] Click of the recorder switch and low hiss of magnetic tape...\n[00:06] "If this recording reached you, the worst has already happened..."\n[00:14] "Trust no one at the docks. They know what was retrieved from the bay."\n[00:22] "The vault key is hidden under the study floorboards. Guard it well!"';
    const audioUrl = '/audio/handouts/starter_friend_letter.mp3';

    const content = [
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      docTitle,
      '',
      docDesc,
      '',
      `[OBRAZ: ${imageUrl}]`,
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      audioTitle,
      '',
      transcript,
      '',
      `[AUDIO: ${audioUrl}]`,
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ].join('\n');

    const docItem = createEquipmentItem({
      name: isPl ? 'Zapiski z Archiwum' : 'Archive Notes',
      category: 'document',
      description: isPl ? 'Tajemniczy dokument ze skanem i odręcznymi notatkami.' : 'Mysterious document with handwritten annotations.',
      imageUrl,
    });

    const audioItem = createEquipmentItem({
      name: isPl ? 'Taśma szpulowa: Zeznanie' : 'Reel Tape: Testimony',
      category: 'tool',
      description: isPl ? 'Szpula magnetofonowa 1/4 cala z nagranym ostrzeżeniem.' : '1/4 inch magnetic reel tape containing recorded warning.',
    });

    const existingEquipment = character?.equipment || [];

    return {
      isCheat: true,
      rawCommand: trimmed,
      assistantMessage: {
        id: 'cheat_msg_' + Date.now(),
        role: 'assistant',
        content,
        timestamp: now,
      },
      characterUpdates: {
        equipment: [...existingEquipment, docItem, audioItem],
      },
      toastMessage: isPl ? 'Wywołano zestaw rekwizytów (dokument i nagranie audio)' : 'Triggered full handouts pack (document and audio recording)',
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
