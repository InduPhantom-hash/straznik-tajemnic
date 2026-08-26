import { ImageRequest, SFXRequest, CombatState } from './types';
import { SFX_PATTERNS } from './patterns';

// Wykrywanie ilustracji
export function extractImages(text: string): ImageRequest[] {
    const images: ImageRequest[] = [];

    // Pattern: Tagi w nawiasach kwadratowych - rozszerzona lista synonimów
    const tagPattern = /\[(?:ILUSTRACJA|OBRAZ|GRAFIKA|RYSUNEK|ZDJĘCIE|SCENA|PORTRET|WIZUALIZACJA|IMAGE|PICTURE|ILLUSTRATION|SHOW|VISUALIZE|SCENE|PORTRAIT):\s*([^\]]+)\]/gi;
    let match;
    while ((match = tagPattern.exec(text)) !== null) {
        let prompt = match[1].trim();
        let isMythos = false;
        const mythosSuffix = /\s*\|\s*mythos\s*$/i;
        if (mythosSuffix.test(prompt)) {
            isMythos = true;
            prompt = prompt.replace(mythosSuffix, '').trim();
        }
        
        const rawTag = match[0].toUpperCase();
        const isPortrait = rawTag.includes('PORTRET') || rawTag.includes('PORTRAIT');
        const imgType = isPortrait ? 'portrait' : 'scene';
        const aspectRatio = isPortrait ? '3:4' : '16:9';

        let portraitName: string | undefined = undefined;
        const finalPrompt = prompt;

        if (isPortrait) {
            // Wzorzec: [PORTRET: Imię Postaci, opis]
            const commaIndex = prompt.indexOf(',');
            if (commaIndex !== -1 && commaIndex < 40) {
                portraitName = prompt.substring(0, commaIndex).trim();
            }
        }

        images.push({
            prompt: finalPrompt,
            style: isPortrait ? 'portrait' : 'horror', // portrety mogą używać stylu 'portrait', sceny 'horror'
            priority: 'normal',
            isMythos,
            type: imgType,
            aspectRatio,
            ...(portraitName ? { portraitName } : {})
        });
    }

    return images;
}

// Wykrywanie efektów dźwiękowych (SFX)
export function detectSFX(text: string, combat: CombatState | null): SFXRequest[] {
    const sfxRequests: SFXRequest[] = [];
    const addedPresets = new Set<string>();

    // Sprawdź patterny
    for (const { pattern, presetId, category } of SFX_PATTERNS) {
        const regex = new RegExp(pattern.source, pattern.flags);
        if (regex.test(text) && !addedPresets.has(presetId)) {
            addedPresets.add(presetId);
            sfxRequests.push({
                presetId,
                category,
                priority: 'normal',
            });
        }
    }

    // Automatyczne SFX dla walki
    if (combat?.isActive) {
        if (!addedPresets.has('combat_ambience')) {
            sfxRequests.unshift({
                presetId: 'combat_ambience',
                category: 'combat',
                priority: 'high',
            });
        }
    }

    // Limit do max 2 SFX na odpowiedź
    return sfxRequests.slice(0, 2);
}
