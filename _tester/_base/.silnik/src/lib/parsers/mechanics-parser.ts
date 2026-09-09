import { CombatState, ParsedEvent, SkillTestData, SkillTestResult, SkillTestModifier, HazardEventData, HazardType, MeleeAttackReference, SpellCastEventData, TomeStudyEventData } from './types';
import { COMBAT_END_PATTERNS, COMBAT_START_PATTERNS, DAMAGE_PLAYER_PATTERNS, SANITY_PATTERNS } from './patterns';

// Wykrywanie walki
export function detectCombat(text: string): CombatState | null {
    // Sprawdź koniec walki
    for (const pattern of COMBAT_END_PATTERNS) {
        if (pattern.test(text)) {
            return {
                isActive: false,
                trigger: 'end',
                description: 'Walka zakończona',
            };
        }
    }

    // Sprawdź obrażenia gracza
    for (const pattern of DAMAGE_PLAYER_PATTERNS) {
        const match = pattern.exec(text);
        if (match) {
            const damage = parseInt(match[1]) || 0;
            if (damage > 0) {
                return {
                    isActive: true,
                    trigger: 'damage_player',
                    damage,
                    description: `Otrzymano ${damage} obrażeń`,
                };
            }
        }
    }

    // Sprawdź start walki
    for (const pattern of COMBAT_START_PATTERNS) {
        if (pattern.test(text)) {
            return {
                isActive: true,
                trigger: 'start',
                description: 'Walka rozpoczęta',
            };
        }
    }

    return null;
}

/**
 * Model wskazuje wyłącznie zapisany profil NPC, adresata i wariant ataku.
 * Każde dodatkowe pole odrzuca cały tag, aby LLM nie mógł podać mechaniki.
 */
export function extractMeleeAttackReferences(text: string): MeleeAttackReference[] {
    const attacks: MeleeAttackReference[] = [];
    const pattern = /\[ATAK_WRĘCZ:\s*([^\]]+)\]/gi;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
        const fields: Record<string, string> = {};
        let invalid = false;
        for (const rawPart of match[1].split('|')) {
            const separator = rawPart.indexOf('=');
            if (separator <= 0) {
                invalid = true;
                break;
            }
            const key = rawPart.slice(0, separator).trim().toLocaleLowerCase('pl-PL');
            const value = rawPart.slice(separator + 1).trim();
            if (!value || fields[key] !== undefined) {
                invalid = true;
                break;
            }
            fields[key] = value;
        }

        const allowed = new Set(['napastnik', 'cel', 'atak', 'zamiar']);
        if (
            invalid ||
            Object.keys(fields).length !== allowed.size ||
            Object.keys(fields).some((key) => !allowed.has(key))
        ) continue;

        const target = fields.cel.replace(/^@/, '').trim();
        if (!target) continue;
        attacks.push({
            attackerNpcId: fields.napastnik,
            targetCharacterName: target,
            attackOptionId: fields.atak,
            intent: fields.zamiar,
        });
    }
    return attacks;
}

/** Removes complete combat control tags and hides a trailing partial tag while SSE streams. */
export function stripMeleeAttackTags(text: string): string {
  const withoutComplete = text.replace(/\[ATAK_WRĘCZ:\s*[^\]]*\]/gi, '');
  const openBracket = withoutComplete.lastIndexOf('[');
  if (openBracket < 0) return withoutComplete.trimEnd();
  const trailing = withoutComplete.slice(openBracket).toLocaleUpperCase('pl-PL');
  const marker = '[ATAK_WRĘCZ:';
  if (marker.startsWith(trailing) || trailing.startsWith(marker)) {
    return withoutComplete.slice(0, openBracket).trimEnd();
  }
  return withoutComplete.trimEnd();
}

// Wykrywanie poczytalności
export function detectSanity(text: string): ParsedEvent | null {
    for (const pattern of SANITY_PATTERNS) {
        const match = pattern.exec(text);
        if (match) {
            const points = parseInt(match[1]) || 0;
            return {
                type: 'sanity',
                title: points > 0 ? `Utrata poczytalności: ${points}` : 'Test poczytalności',
                description: 'Wydarzenie wpływające na zdrowie psychiczne',
                timestamp: new Date().toISOString(),
            };
        }
    }
    return null;
}

// Wykrywanie testów umiejętności (żądania testów)
export function extractSkillTests(text: string): SkillTestData[] {
    const tests: SkillTestData[] = [];

    // Pattern: [TEST: Spostrzegawczość | trudny | Ciemność:-1, Skupienie:+1 | Szukasz ukrytych wskazówek]
    const testPattern = /\[TEST:\s*([^|]+)\|([^|]+)(?:\|([^|]*))?\|([^\]]+)\]/gi;

    let match;
    while ((match = testPattern.exec(text)) !== null) {
        const rawSkill = match[1].trim();
        // Duet: [TEST:@Margaret Sullivan: Spostrzegawczość | ...]
        // Stary format bez adresata pozostaje bez zmian.
        const addressed = rawSkill.match(/^@([^:]+):\s*(.+)$/);
        const characterName = addressed?.[1].trim();
        const skillName = (addressed?.[2] ?? rawSkill).trim();
        const difficultyRaw = match[2].trim().toLowerCase();
        const modifiersRaw = match[3]?.trim() || '';
        const justification = match[4].trim();

        // Parse difficulty
        let difficulty: SkillTestData['difficulty'] = 'zwykly';
        if (difficultyRaw.includes('trudn') || difficultyRaw.includes('hard')) {
            difficulty = 'trudny';
        } else if (difficultyRaw.includes('ekstrem') || difficultyRaw.includes('extreme')) {
            difficulty = 'ekstremalny';
        }

        // Parse modifiers: "Ciemność:-1, Skupienie:+1"
        const modifiers: SkillTestModifier[] = [];
        if (modifiersRaw) {
            const modParts = modifiersRaw.split(',');
            for (const modPart of modParts) {
                const modMatch = modPart.trim().match(/^([^:]+):\s*([+-]?\d+)$/);
                if (modMatch) {
                    const reason = modMatch[1].trim();
                    const value = parseInt(modMatch[2]);
                    modifiers.push({
                        type: value > 0 ? 'bonus' : 'penalty',
                        reason,
                        count: Math.abs(value)
                    });
                }
            }
        }

        tests.push({
            id: crypto.randomUUID(),
            skillName,
            skillValue: 0, // Będzie uzupełnione przez komponent z karty postaci
            difficulty,
            modifiers,
            justification,
            characterName
        });
    }

    // Wszystkie testy z jednej odpowiedzi MG tworzą grupę. Klient wyśle wyniki
    // dopiero po jej skompletowaniu. Pojedynczy test zachowuje dotychczasowy flow.
    if (tests.length > 1) {
        const groupId = crypto.randomUUID();
        tests.forEach((test) => {
            test.groupId = groupId;
        });
    }

    return tests;
}

// Wykrywanie wyników rzutów i oznaczanie do rozwoju
export function extractSkillResults(text: string): SkillTestResult[] {
    const results: SkillTestResult[] = [];

    const resultPattern = /\[WYNIK:\s*([^|]+)\|([^|]+)\|([^|\]]+)(?:\|([^|\]]+))?\]/gi;

    let match;
    while ((match = resultPattern.exec(text)) !== null) {
        const rawSkill = match[1].trim();
        // Duet / Hot Seat: [WYNIK:@Margaret Sullivan: Spostrzegawczość | ...]
        const addressed = rawSkill.match(/^@([^:]+):\s*(.+)$/);
        const characterName = addressed?.[1]?.trim();
        const skillName = (addressed?.[2] ?? rawSkill).trim();
        const rollInfo = match[2].trim();
        const resultTypeRaw = match[3].trim().toLowerCase();
        const extras = match[4]?.trim().toLowerCase() || '';

        const rollMatch = rollInfo.match(/(\d+)\s*(?:≤|<=|<|\/|vs\.?)\s*(\d+)/i);
        const rollValue = rollMatch ? parseInt(rollMatch[1]) : 0;
        const threshold = rollMatch ? parseInt(rollMatch[2]) : 0;

        const usedLuck = extras.includes('luck') ||
            extras.includes('szczęście') ||
            extras.includes('szczescie') ||
            resultTypeRaw.includes('luck');

        const luckMatch = extras.match(/(?:luck|szczęście|szczescie)\s*[:\-]?\s*(\d+)/i);
        const luckSpent = luckMatch ? parseInt(luckMatch[1]) : (usedLuck ? 1 : 0);

        let result: SkillTestResult['result'] = 'failure';
        if (resultTypeRaw.includes('krytyczny') || resultTypeRaw.includes('critical') || resultTypeRaw.includes('01')) {
            result = 'critical';
        } else if (resultTypeRaw.includes('ekstremal') || resultTypeRaw.includes('extreme')) {
            result = 'extreme';
        } else if (resultTypeRaw.includes('trudn') || resultTypeRaw.includes('hard')) {
            result = 'hard';
        } else if (resultTypeRaw.includes('sukces') || resultTypeRaw.includes('success') || resultTypeRaw.includes('zwykły')) {
            result = 'regular';
        } else if (resultTypeRaw.includes('fumble') || resultTypeRaw.includes('100') || resultTypeRaw.includes('porażka krytyczna')) {
            result = 'fumble';
        }

        const isSuccess = ['critical', 'extreme', 'hard', 'regular'].includes(result);

        const excludedSkills = [
            'credit rating', 'zdolność kredytowa', 'kredyt',
            'cthulhu mythos', 'mity cthulhu', 'wiedza tajemna'
        ];
        const isExcluded = excludedSkills.some(s => skillName.toLowerCase().includes(s));

        let shouldMark = false;
        let reason = '';

        if (!isSuccess) {
            reason = 'Porażka testu';
        } else if (usedLuck) {
            reason = 'Sukces z użyciem Szczęścia - nie oznacza do rozwoju';
        } else if (isExcluded) {
            reason = `${skillName} nie podlega normalnemu oznaczaniu`;
        } else {
            shouldMark = true;
            reason = 'Sukces bez użycia Szczęścia - oznaczono do rozwoju';
        }

        results.push({
            skillName,
            characterName,
            result,
            rollValue,
            threshold,
            usedLuck,
            luckSpent: usedLuck ? luckSpent : undefined,
            shouldMark,
            reason
        });
    }

    return results;
}

// Wykrywanie zagrożeń środowiskowych i trucizn (CoC 7e RAW Issue #60)
export function extractHazardEvents(text: string): HazardEventData[] {
    const hazards: HazardEventData[] = [];
    const pattern = /\[(?:ZAGROŻENIE|ZAGROZENIE|HAZARD):\s*(?:@([^:\]]+):\s*)?([^\]]+)\]/gi;

    let match;
    while ((match = pattern.exec(text)) !== null) {
        const characterName = match[1]?.trim();
        const content = match[2]?.trim() || '';
        const parts = content.split('|').map((p) => p.trim());

        // Parsowanie par klucz=wartość lub pozycji
        const kv: Record<string, string> = {};
        const positional: string[] = [];

        for (const part of parts) {
            const eqIdx = part.indexOf('=');
            if (eqIdx !== -1) {
                const k = part.slice(0, eqIdx).trim().toLowerCase();
                const v = part.slice(eqIdx + 1).trim();
                kv[k] = v;
            } else {
                positional.push(part);
            }
        }

        const rawType = (kv.typ || kv.type || positional[0] || '').toLowerCase();
        let type: HazardType = 'falling';
        if (rawType.includes('upad') || rawType.includes('fall')) {
            type = 'falling';
        } else if (rawType.includes('ogie') || rawType.includes('fire') || rawType.includes('płom')) {
            type = 'fire';
        } else if (rawType.includes('kwas') || rawType.includes('acid')) {
            type = 'acid';
        } else if (rawType.includes('ton') || rawType.includes('drown') || rawType.includes('woda')) {
            type = 'drowning';
        } else if (rawType.includes('dusz') || rawType.includes('suffocat') || rawType.includes('dym')) {
            type = 'suffocation';
        } else if (rawType.includes('truc') || rawType.includes('poison') || rawType.includes('jad') || rawType.includes('toksyn')) {
            type = 'poison';
        }

        // Parsowanie wysokości dla upadku
        let fallHeightMeters: number | undefined = undefined;
        if (type === 'falling') {
            const heightStr = kv.wys || kv.wysokosc || kv.height || (positional[1] && /\d+/.test(positional[1]) ? positional[1] : undefined);
            if (heightStr) {
                const m = heightStr.match(/(\d+)/);
                if (m) fallHeightMeters = parseInt(m[1], 10);
            }
            if (!fallHeightMeters) fallHeightMeters = 3;
        }

        // Parsowanie ognia
        let fireIntensity: 'minor' | 'moderate' | 'major' | 'inferno' | undefined = undefined;
        if (type === 'fire') {
            const rawInt = (kv.intensywnosc || kv.intensity || positional[1] || '').toLowerCase();
            if (rawInt.includes('piek') || rawInt.includes('inferno') || rawInt.includes('3d6')) {
                fireIntensity = 'inferno';
            } else if (rawInt.includes('duz') || rawInt.includes('major') || rawInt.includes('2d6')) {
                fireIntensity = 'major';
            } else if (rawInt.includes('sred') || rawInt.includes('moderate')) {
                fireIntensity = 'moderate';
            } else {
                fireIntensity = 'minor';
            }
        }

        const surfaceRaw = (kv.podloze || kv.surface || '').toLowerCase();
        const surface = type === 'falling'
            ? (surfaceRaw.includes('tward') || surfaceRaw.includes('hard')
                ? 'hard'
                : surfaceRaw.includes('miekk') || surfaceRaw.includes('miękk') || surfaceRaw.includes('soft')
                    ? 'soft'
                    : surfaceRaw.includes('wod') || surfaceRaw.includes('water')
                        ? 'water'
                        : 'normal')
            : undefined;

        const fireRoundsRaw = kv.rundy || kv.rounds;
        const fireRounds = type === 'fire' && fireRoundsRaw
            ? Math.max(1, Math.min(10, parseInt(fireRoundsRaw, 10) || 1))
            : undefined;

        const acidRaw = (kv.moc || kv.potency || kv.sila || '').toLowerCase();
        const acidPotency = type === 'acid'
            ? (acidRaw.includes('siln') || acidRaw.includes('strong') || acidRaw.includes('immersion')
                ? 'immersion'
                : 'splash')
            : undefined;

        const airlessKind = type === 'drowning'
            ? 'water'
            : type === 'suffocation'
                ? ((kv.rodzaj || kv.kind || '').toLowerCase().includes('vac') ? 'vacuum' : 'smoke')
                : undefined;
        const conFailed = (kv.confailed || kv.con_failed || '').toLowerCase() === 'true';

        // Parsowanie trucizny. POT pozostaje wyłącznie wejściem migracyjnym;
        // aktywny resolver używa kategorii RAW mild/strong/lethal.
        const poisonName = kv.nazwa || kv.name || (type === 'poison' ? positional[1] : undefined);
        let poisonPotency: number | undefined = undefined;
        if (type === 'poison') {
            const potStr = kv.potega || kv.potency || kv.moc || (positional[2] && /^\d+$/.test(positional[2]) ? positional[2] : undefined);
            if (potStr) poisonPotency = parseInt(potStr, 10);
        }
        const severityRaw = (kv.kategoria || kv.severity || kv.sila || '').toLowerCase();
        const poisonSeverity = type === 'poison'
            ? (severityRaw.includes('śmiert') || severityRaw.includes('smiert') || severityRaw.includes('lethal')
                ? 'lethal'
                : severityRaw.includes('siln') || severityRaw.includes('strong')
                    ? 'strong'
                    : severityRaw.includes('łagod') || severityRaw.includes('lagod') || severityRaw.includes('mild')
                        ? 'mild'
                        : undefined)
            : undefined;

        // Obrona
        let defensiveSkill = kv.obrona || kv.skill || kv.test;
        if (!defensiveSkill) {
            if (type === 'falling') defensiveSkill = 'Skakanie';
            else if (type === 'fire' || type === 'acid') defensiveSkill = 'Unik';
            else if (type === 'suffocation' || type === 'drowning' || type === 'poison') defensiveSkill = 'Kondycja';
        }

        // Opis
        let description = kv.opis || kv.desc || kv.description;
        if (!description) {
            description = positional[positional.length - 1] || 'Zagrożenie środowiskowe';
        }

        hazards.push({
            id: crypto.randomUUID(),
            type,
            description,
            characterName,
            fallHeightMeters,
            surface,
            fireIntensity,
            fireRounds,
            acidPotency,
            airlessKind,
            conFailed,
            poisonName,
            poisonPotency,
            poisonSeverity,
            defensiveSkill,
        });
    }

    return hazards;
}

// Wykrywanie rzucania czarów i rytuałów CoC 7e RAW (Issue #252)
export function extractSpellCastEvents(text: string): SpellCastEventData[] {
    const spellEvents: SpellCastEventData[] = [];
    const pattern = /\[(?:CZAR|SPELL|MAGIA):\s*(?:@([^:\]]+):\s*)?([^\]]+)\]/gi;

    let match;
    while ((match = pattern.exec(text)) !== null) {
        const characterName = match[1]?.trim();
        const content = match[2]?.trim() || '';
        const parts = content.split('|').map((p) => p.trim());

        const kv: Record<string, string> = {};
        const positional: string[] = [];

        for (const part of parts) {
            const eqIdx = part.indexOf('=');
            if (eqIdx !== -1) {
                const k = part.slice(0, eqIdx).trim().toLowerCase();
                const v = part.slice(eqIdx + 1).trim();
                kv[k] = v;
            } else {
                positional.push(part);
            }
        }

        const spellId = (kv.id || kv.spell || kv.czar || positional[0] || '').trim().toLowerCase();
        if (!spellId) continue;

        const alias = kv.alias || kv.nazwa || kv.name || positional[1];
        const targetName = kv.cel || kv.target;
        const rawPow = kv.pow || kv.moc;
        const targetPow = rawPow ? parseInt(rawPow, 10) : undefined;
        const description = kv.opis || kv.desc || kv.description || (positional.length > 2 ? positional[2] : undefined);

        spellEvents.push({
            id: crypto.randomUUID(),
            spellId,
            characterName,
            alias,
            targetName,
            targetPow: Number.isFinite(targetPow) ? targetPow : undefined,
            description,
        });
    }

    return spellEvents;
}

// Wykrywanie lektury i badania tomów Mitów CoC 7e RAW (Issue #252)
export function extractTomeStudyEvents(text: string): TomeStudyEventData[] {
    const tomeEvents: TomeStudyEventData[] = [];
    const pattern = /\[(?:TOM|TOME|KSIĘGA|KSIEGA|STUDIUM):\s*(?:@([^:\]]+):\s*)?([^\]]+)\]/gi;

    let match;
    while ((match = pattern.exec(text)) !== null) {
        const characterName = match[1]?.trim();
        const content = match[2]?.trim() || '';
        const parts = content.split('|').map((p) => p.trim());

        const kv: Record<string, string> = {};
        const positional: string[] = [];

        for (const part of parts) {
            const eqIdx = part.indexOf('=');
            if (eqIdx !== -1) {
                const k = part.slice(0, eqIdx).trim().toLowerCase();
                const v = part.slice(eqIdx + 1).trim();
                kv[k] = v;
            } else {
                positional.push(part);
            }
        }

        const tomeId = (kv.id || kv.tome || kv.ksiega || kv.tom || positional[0] || '').trim().toLowerCase();
        if (!tomeId) continue;

        const rawAction = (kv.akcja || kv.action || positional[1] || '').trim().toLowerCase();
        let action: 'skimming' | 'study' | 'reference' | undefined;
        if (rawAction.includes('skim') || rawAction.includes('przeglad') || rawAction.includes('wstepn')) {
            action = 'skimming';
        } else if (rawAction.includes('stud') || rawAction.includes('pelne')) {
            action = 'study';
        } else if (rawAction.includes('ref') || rawAction.includes('odnies') || rawAction.includes('szukaj')) {
            action = 'reference';
        }

        const topic = kv.temat || kv.topic || kv.kwestia;
        const title = kv.tytul || kv.title || kv.nazwa;
        const description = kv.opis || kv.desc || kv.description || (positional.length > 2 ? positional[2] : undefined);

        tomeEvents.push({
            id: crypto.randomUUID(),
            tomeId,
            characterName,
            action,
            topic,
            title,
            description,
        });
    }

    return tomeEvents;
}
