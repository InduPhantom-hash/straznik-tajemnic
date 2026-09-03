import { ImageRequest, ImageType, SFXRequest, CombatState } from './types';
import { SFX_PATTERNS } from './patterns';

// Wykrywanie ilustracji z dedykowaną taksonomią fabularną (Issue #114)
export function extractImages(text: string): ImageRequest[] {
    const images: ImageRequest[] = [];

    // Pattern: Tagi w nawiasach kwadratowych - rozszerzona taksonomia:
    // LOKACJA, PORTRET, PRZEDMIOT, ARTEFAKT, POTWÓR, ZJAWISKO, WIZJA, SCENA oraz ich synonimy EN/PL.
    const tagPattern = /\[(?:ILUSTRACJA|OBRAZ|GRAFIKA|RYSUNEK|ZDJĘCIE|SCENA|PORTRET|WIZUALIZACJA|LOKACJA|PRZEDMIOT|ARTEFAKT|POTWÓR|POTWOR|MONSTRUM|ZJAWISKO|WIZJA|ANOMALIA|IMAGE|PICTURE|ILLUSTRATION|SHOW|VISUALIZE|SCENE|PORTRAIT|LOCATION|ITEM|ARTIFACT|MONSTER|CREATURE|BEAST|VISION|PHENOMENON|HALLUCINATION):\s*([^\]]+)\]/gi;
    let match;
    while ((match = tagPattern.exec(text)) !== null) {
        let prompt = match[1].trim();
        let isMythos = false;
        const mythosSuffix = /\s*\|\s*mythos\s*$/i;
        if (mythosSuffix.test(prompt)) {
            isMythos = true;
            prompt = prompt.replace(mythosSuffix, '').trim();
        }
        
        const rawTag = match[0];
        const matchTag = rawTag.match(/\[([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż_]+):/i);
        const tagName = matchTag ? matchTag[1].toUpperCase() : '';

        let imgType: ImageType = 'scene';
        let style: ImageRequest['style'] = 'horror';
        let aspectRatio: ImageRequest['aspectRatio'] = '16:9';
        let priority: ImageRequest['priority'] = isMythos ? 'high' : 'normal';
        let portraitName: string | undefined = undefined;
        let itemName: string | undefined = undefined;
        let locationName: string | undefined = undefined;

        if (/^(PORTRET|PORTRAIT)$/i.test(tagName)) {
            imgType = 'portrait';
            style = 'portrait';
            aspectRatio = '3:4';
            const commaIndex = prompt.indexOf(',');
            if (commaIndex !== -1 && commaIndex < 40) {
                portraitName = prompt.substring(0, commaIndex).trim();
            }
        } else if (/^(LOKACJA|LOCATION)$/i.test(tagName)) {
            imgType = 'location';
            style = 'location';
            aspectRatio = '16:9';
            const commaIndex = prompt.indexOf(',');
            if (commaIndex !== -1 && commaIndex < 40) {
                locationName = prompt.substring(0, commaIndex).trim();
            }
        } else if (/^(PRZEDMIOT|ARTEFAKT|ITEM|ARTIFACT)$/i.test(tagName)) {
            imgType = 'item';
            style = 'item';
            aspectRatio = '1:1';
            const commaIndex = prompt.indexOf(',');
            if (commaIndex !== -1 && commaIndex < 40) {
                itemName = prompt.substring(0, commaIndex).trim();
            }
        } else if (/^(POTWÓR|POTWOR|MONSTRUM|MONSTER|CREATURE|BEAST)$/i.test(tagName)) {
            imgType = 'monster';
            style = 'horror';
            aspectRatio = '16:9';
            isMythos = true;
            priority = 'high';
        } else if (/^(ZJAWISKO|WIZJA|ANOMALIA|VISION|PHENOMENON|HALLUCINATION)$/i.test(tagName)) {
            imgType = 'vision';
            style = 'horror';
            aspectRatio = '16:9';
            isMythos = true;
            priority = 'high';
        } else {
            // SCENA / ILUSTRACJA / IMAGE / default
            imgType = 'scene';
            style = 'horror';
            aspectRatio = '16:9';
            priority = isMythos ? 'high' : 'normal';
        }

        images.push({
            prompt,
            style,
            priority,
            isMythos,
            type: imgType,
            aspectRatio,
            ...(portraitName ? { portraitName } : {}),
            ...(itemName ? { itemName } : {}),
            ...(locationName ? { locationName } : {}),
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
