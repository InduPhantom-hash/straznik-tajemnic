/**
 * Response Parser - Legacy Redirect
 * @deprecated Use imports from '@/lib/parsers' instead.
 * This file is kept for backward compatibility.
 */

// Export everything from the new module
export * from './parsers/index';

// Re-construct _testExports for compatibility
import {
    extractNPCs, extractLocations, extractItems,
    detectCombat, detectSanity,
    extractDialogues, detectSpeakerGender,
    extractImages, detectSFX,
    extractSkillResults
} from './parsers/index';

export const _testExports = {
    extractNPCs,
    extractLocations,
    extractItems,
    detectCombat,
    detectSanity,
    extractDialogues,
    detectSpeakerGender,
    extractImages,
    detectSFX,
    extractSkillResults,
};
