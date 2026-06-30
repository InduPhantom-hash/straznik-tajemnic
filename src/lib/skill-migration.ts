/**
 * Skill Migration Utility
 * Migruje stare postacie z formatu skills: { [name]: number }
 * do nowego formatu skills: { [name]: SkillData }
 * 
 * System rozwoju postaci CoC 7e wymaga śledzenia:
 * - markedForImprovement: czy umiejętność została użyta z sukcesem (bez Luck)
 * - lastUsedSuccessfully: data ostatniego udanego użycia
 * - improvementHistory: historia rozwoju umiejętności
 */

import { Character, SkillData, SkillValue, getSkillValue } from './types';

/**
 * Sprawdza czy postać wymaga migracji (używa starego formatu skills)
 */
export function needsMigration(character: Character): boolean {
    if (!character.skills || Object.keys(character.skills).length === 0) {
        return false;
    }

    // Sprawdź pierwszą umiejętność - jeśli jest liczbą, wymaga migracji
    const firstSkill = Object.values(character.skills)[0];
    return typeof firstSkill === 'number';
}

/**
 * Migruje postać ze starego formatu skills (number) na nowy (SkillData)
 * Zachowuje wsteczną kompatybilność - bezpieczne do wywołania wielokrotnie
 */
export function migrateCharacterSkills(character: Character): Character {
    // Jeśli nie wymaga migracji, zwróć bez zmian
    if (!needsMigration(character)) {
        return character;
    }

    const migratedSkills: { [key: string]: SkillData } = {};

    for (const [skillName, value] of Object.entries(character.skills)) {
        if (typeof value === 'number') {
            // Stary format - migruj do SkillData
            migratedSkills[skillName] = {
                value: value,
                markedForImprovement: false,
                improvementHistory: []
            };
        } else {
            // Już nowy format - zachowaj
            migratedSkills[skillName] = value as SkillData;
        }
    }

    return {
        ...character,
        skills: migratedSkills,
        luckSpentThisSession: character.luckSpentThisSession ?? 0,
        sessionStartTime: character.sessionStartTime ?? new Date()
    };
}

/**
 * Migruje tablicę postaci
 */
export function migrateAllCharacters(characters: Character[]): Character[] {
    return characters.map(migrateCharacterSkills);
}

/**
 * Konwertuje skills z nowego formatu z powrotem na stary (dla eksportu/kompatybilności)
 */
export function convertSkillsToLegacyFormat(skills: { [key: string]: SkillValue }): { [key: string]: number } {
    const legacy: { [key: string]: number } = {};

    for (const [skillName, skill] of Object.entries(skills)) {
        legacy[skillName] = getSkillValue(skill);
    }

    return legacy;
}

/**
 * Oznacza umiejętność do rozwoju (po udanym teście bez użycia Luck)
 * Zgodnie z zasadami CoC 7e:
 * - Tylko 1 oznaczenie per umiejętność per scenariusz
 * - Credit Rating i Cthulhu Mythos nie są oznaczane
 * - Sukces z użyciem Luck nie oznacza umiejętności
 */
export function markSkillForImprovement(
    character: Character,
    skillName: string
): Character {
    const skill = character.skills[skillName];

    if (!skill) {
        console.warn(`Skill ${skillName} not found on character`);
        return character;
    }

    // Jeśli stary format, najpierw migruj
    if (typeof skill === 'number') {
        const migrated = migrateCharacterSkills(character);
        return markSkillForImprovement(migrated, skillName);
    }

    // Już oznaczona? Nie oznaczaj ponownie
    if (skill.markedForImprovement) {
        return character;
    }

    // Wyjątki: Credit Rating i Cthulhu Mythos
    const excludedSkills = [
        'credit rating', 'zdolność kredytowa', 'kredyt',
        'cthulhu mythos', 'mity cthulhu', 'wiedza tajemna'
    ];
    if (excludedSkills.some(s => skillName.toLowerCase().includes(s))) {
        console.log(`Skill ${skillName} is excluded from improvement marking`);
        return character;
    }

    // Oznacz!
    const updatedSkills = {
        ...character.skills,
        [skillName]: {
            ...skill,
            markedForImprovement: true,
            lastUsedSuccessfully: new Date()
        }
    };

    console.log(`✅ Marked skill for improvement: ${skillName}`);

    return {
        ...character,
        skills: updatedSkills
    };
}

/**
 * Czyści wszystkie oznaczenia umiejętności (po Development Phase)
 */
export function clearAllSkillMarks(character: Character): Character {
    const clearedSkills: { [key: string]: SkillValue } = {};

    for (const [skillName, skill] of Object.entries(character.skills)) {
        if (typeof skill === 'number') {
            clearedSkills[skillName] = skill;
        } else {
            clearedSkills[skillName] = {
                ...skill,
                markedForImprovement: false
            };
        }
    }

    return {
        ...character,
        skills: clearedSkills,
        luckSpentThisSession: 0 // Reset też Luck
    };
}

/**
 * Pobiera listę umiejętności oznaczonych do rozwoju
 */
export function getMarkedSkills(character: Character): { name: string; value: number }[] {
    const marked: { name: string; value: number }[] = [];

    for (const [skillName, skill] of Object.entries(character.skills)) {
        if (typeof skill !== 'number' && skill.markedForImprovement) {
            marked.push({
                name: skillName,
                value: skill.value
            });
        }
    }

    return marked;
}

/**
 * Liczy ile umiejętności jest oznaczonych
 */
export function countMarkedSkills(character: Character): number {
    return getMarkedSkills(character).length;
}
