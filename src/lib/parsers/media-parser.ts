import { ImageRequest, SFXRequest, CombatState } from './types';
import { SFX_PATTERNS } from './patterns';

// Wykrywanie ilustracji
export function extractImages(text: string): ImageRequest[] {
    const images: ImageRequest[] = [];

    // Pattern: Tagi w nawiasach kwadratowych - rozszerzona lista synonimów
    const tagPattern = /\[(?:ILUSTRACJA|OBRAZ|GRAFIKA|RYSUNEK|ZDJĘCIE|SCENA|PORTRET|WIZUALIZACJA|IMAGE|PICTURE|ILLUSTRATION|SHOW|VISUALIZE|SCENE|PORTRAIT):\s*([^\]]+)\]/gi;
    let match;
    while ((match = tagPattern.exec(text)) !== null) {
        images.push({
            prompt: match[1].trim(),
            style: 'horror', // domyślny styl CoC
            priority: 'normal',
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
