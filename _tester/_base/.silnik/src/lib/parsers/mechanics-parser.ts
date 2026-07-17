import { CombatState, ParsedEvent, SkillTestData, SkillTestResult, SkillTestModifier } from './types';
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
        const skillName = match[1].trim();
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
