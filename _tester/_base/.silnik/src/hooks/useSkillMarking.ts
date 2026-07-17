"use client";

import { useCallback, useMemo } from 'react';
import { Character } from '@/lib/types';
import { SkillTestResult } from '@/lib/response-parser';
import {
    markSkillForImprovement,
    getMarkedSkills,
    countMarkedSkills,
    clearAllSkillMarks,
    migrateCharacterSkills,
    needsMigration
} from '@/lib/skill-migration';

interface UseSkillMarkingResult {
    /** Przetwarza wyniki testów i automatycznie oznacza umiejętności */
    processSkillResults: (results: SkillTestResult[]) => void;
    /** Zwraca liczbę oznaczonych umiejętności */
    markedCount: number;
    /** Zwraca listę oznaczonych umiejętności */
    markedSkills: { name: string; value: number }[];
    /** Czyści wszystkie oznaczenia (po Development Phase) */
    clearMarks: () => void;
    /** Sprawdza czy postać wymaga migracji */
    needsMigration: boolean;
    /** Migruje postać do nowego formatu */
    migrateCharacter: () => void;
}

/**
 * Hook do automatycznego oznaczania umiejętności do rozwoju
 * Implementuje zasady CoC 7e:
 * - Tylko udane testy BEZ użycia Luck oznaczają umiejętność
 * - Credit Rating i Cthulhu Mythos nie są oznaczane
 * - Maksymalnie 1 oznaczenie per umiejętność per scenariusz
 */
export function useSkillMarking(
    character: Character | null,
    onCharacterUpdate: (char: Character) => void
): UseSkillMarkingResult {

    /**
     * Przetwarza wyniki testów z odpowiedzi AI i automatycznie oznacza umiejętności
     */
    const processSkillResults = useCallback((results: SkillTestResult[]) => {
        if (!character) return;

        let updatedCharacter = character;
        let anyMarked = false;

        for (const result of results) {
            if (!result.shouldMark) {
                console.log(`⏭️ Skill ${result.skillName}: nie oznaczam (${result.reason})`);
                continue;
            }

            // Oznacz umiejętność
            const beforeCount = countMarkedSkills(updatedCharacter);
            updatedCharacter = markSkillForImprovement(updatedCharacter, result.skillName);
            const afterCount = countMarkedSkills(updatedCharacter);

            if (afterCount > beforeCount) {
                anyMarked = true;
                console.log(`✅ Oznaczono do rozwoju: ${result.skillName}`);
            }
        }

        if (anyMarked) {
            onCharacterUpdate(updatedCharacter);
        }
    }, [character, onCharacterUpdate]);

    /**
     * Liczba oznaczonych umiejętności
     */
    const markedCount = useMemo(() => {
        if (!character) return 0;
        return countMarkedSkills(character);
    }, [character]);

    /**
     * Lista oznaczonych umiejętności
     */
    const markedSkills = useMemo(() => {
        if (!character) return [];
        return getMarkedSkills(character);
    }, [character]);

    /**
     * Czyści wszystkie oznaczenia (po Development Phase)
     */
    const clearMarks = useCallback(() => {
        if (!character) return;
        const clearedCharacter = clearAllSkillMarks(character);
        onCharacterUpdate(clearedCharacter);
        console.log('🧹 Wyczyszczono wszystkie oznaczenia umiejętności');
    }, [character, onCharacterUpdate]);

    /**
     * Sprawdza czy postać wymaga migracji do nowego formatu
     */
    const requiresMigration = useMemo(() => {
        if (!character) return false;
        return needsMigration(character);
    }, [character]);

    /**
     * Migruje postać do nowego formatu skills
     */
    const migrateCharacter = useCallback(() => {
        if (!character) return;
        if (!needsMigration(character)) return;

        const migratedCharacter = migrateCharacterSkills(character);
        onCharacterUpdate(migratedCharacter);
        console.log('📦 Postać zmigrowana do nowego formatu skills');
    }, [character, onCharacterUpdate]);

    return {
        processSkillResults,
        markedCount,
        markedSkills,
        clearMarks,
        needsMigration: requiresMigration,
        migrateCharacter
    };
}

export default useSkillMarking;
