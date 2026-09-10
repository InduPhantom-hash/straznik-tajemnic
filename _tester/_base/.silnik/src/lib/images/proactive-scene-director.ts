/**
 * proactive-scene-director.ts
 *
 * Proaktywny reżyser obrazów (DeepMind Proactive T2I Director).
 * Odpowiada za:
 * 1. Ocenę dramaturgiczną tury i tagów fabularnych (punkty zwrotne, nowa lokacja, ważny NPC, Mity).
 * 2. Autonomiczny dobór 1-3 kadrów w turach przełomowych z uwzględnieniem limitów budżetowych i Visual Belief Graph.
 * 3. Wzbogacenie promptów o kotwice epoki, eliminację anachronizmów oraz odpowiednie proporcje (16:9 dla scen/lokacji, 3:4 dla portretów, 1:1 dla przedmiotów).
 */

import type { ImageRequest } from '../parsers/types';
import { enrichImagePromptWithEraProps } from '../location-era-validator';
import type { VisualBeliefGraph } from './visual-belief-graph';

export interface SceneDirectorConfig {
  maxImagesPerMessage: number;
  imageFrequency: 'rare' | 'normal' | 'often';
  effectiveEraOrYear?: string;
  beliefGraph?: VisualBeliefGraph;
}

export interface CuratedSceneShot {
  request: ImageRequest;
  role: 'establishing_location' | 'character_portrait' | 'clue_artifact' | 'mythos_horror' | 'dramatic_scene';
  aspectRatio: '16:9' | '3:4' | '1:1';
  enrichedPrompt: string;
}

export interface SceneDirectorResult {
  shots: CuratedSceneShot[];
  explanation: string;
}

/**
 * Szacuje wagę dramaturgiczną pojedynczego żądania ilustracji.
 */
function scoreIllustrationPriority(req: ImageRequest): number {
  if (req.isMythos || req.type === 'monster' || req.type === 'vision') {
    return 100;
  }
  if (req.type === 'portrait' || req.portraitName) {
    return 80;
  }
  if (req.type === 'location' || req.locationName) {
    return 70;
  }
  if (req.type === 'item' || req.itemName) {
    return 60;
  }
  return 40;
}

/**
 * Reżyseruje listę ilustracji wyemitowanych przez model MG, dopełniając je o Visual Belief Graph.
 */
export function directSceneIllustrations(
  rawRequests: ImageRequest[],
  config: SceneDirectorConfig
): SceneDirectorResult {
  if (!rawRequests || rawRequests.length === 0) {
    return { shots: [], explanation: 'Brak żądań ilustracji w turze.' };
  }

  const { maxImagesPerMessage, effectiveEraOrYear = '1920s', beliefGraph } = config;

  // 1. Zabezpieczenie limitu budżetowego z zachowaniem reguły 1-3 kadrów
  // Domyślny limit to min(3, maxImagesPerMessage), chyba że maxImagesPerMessage wynosi 1.
  const targetCount = Math.min(3, Math.max(1, maxImagesPerMessage));

  // 2. Sortowanie wg hierarchii dramaturgicznej (Mity > Portrety NPC > Nowe Lokacje > Przedmioty > Tło)
  const sorted = [...rawRequests].sort((a, b) => scoreIllustrationPriority(b) - scoreIllustrationPriority(a));

  // 3. Wybór kadrów bez duplikatów typów (chyba że brakuje innych)
  const selected: ImageRequest[] = [];
  const usedTypes = new Set<string>();

  for (const req of sorted) {
    const typeKey = req.type || 'scene';
    if (!usedTypes.has(typeKey) || selected.length < targetCount) {
      selected.push(req);
      usedTypes.add(typeKey);
      if (selected.length >= targetCount) break;
    }
  }

  // 4. Wzbogacenie promptów z użyciem Visual Belief Graph i Strażnika Epoki
  const curatedShots: CuratedSceneShot[] = selected.map((req) => {
    let basePrompt = req.prompt.trim();
    let role: CuratedSceneShot['role'] = 'dramatic_scene';
    let defaultAspectRatio: CuratedSceneShot['aspectRatio'] = '16:9';

    if (req.type === 'portrait' || req.portraitName) {
      role = 'character_portrait';
      defaultAspectRatio = '3:4';
      if (beliefGraph && req.portraitName) {
        const charProfile = beliefGraph.getCharacterProfile(req.portraitName);
        if (charProfile) {
          basePrompt = `${req.portraitName}, ${charProfile.visualDnaPrompt}, ${basePrompt}`;
        }
      }
    } else if (req.type === 'location' || req.locationName) {
      role = 'establishing_location';
      defaultAspectRatio = '16:9';
      if (beliefGraph && req.locationName) {
        const locState = beliefGraph.getLocation(req.locationName);
        if (locState) {
          const locDetails: string[] = [];
          if (locState.lighting) locDetails.push(`lighting: ${locState.lighting}`);
          if (locState.atmosphere) locDetails.push(`atmosphere: ${locState.atmosphere}`);
          if (locState.battleDamage) locDetails.push(`damage: ${locState.battleDamage}`);
          if (locState.mythosCorruption) locDetails.push(`mythos corruption: ${locState.mythosCorruption}`);
          if (locDetails.length > 0) {
            basePrompt = `${basePrompt}, ${locDetails.join(', ')}`;
          }
        }
      }
    } else if (req.type === 'item' || req.itemName) {
      role = 'clue_artifact';
      defaultAspectRatio = '1:1';
    } else if (req.isMythos || req.type === 'monster' || req.type === 'vision') {
      role = 'mythos_horror';
      defaultAspectRatio = '16:9';
    }

    // Wzbogacenie o materialne rekwizyty epoki i oczyszczenie z anachronizmów
    const sceneHint = role === 'character_portrait' ? 'portrait' : 'interior';
    const enrichedPrompt = enrichImagePromptWithEraProps(basePrompt, effectiveEraOrYear, sceneHint);

    return {
      request: {
        ...req,
        prompt: enrichedPrompt,
        aspectRatio: req.aspectRatio || defaultAspectRatio,
      },
      role,
      aspectRatio: req.aspectRatio || defaultAspectRatio,
      enrichedPrompt,
    };
  });

  return {
    shots: curatedShots,
    explanation: `Proaktywny reżyser dobrał ${curatedShots.length} kadr(ów) dla sceny [era: ${effectiveEraOrYear}].`,
  };
}
