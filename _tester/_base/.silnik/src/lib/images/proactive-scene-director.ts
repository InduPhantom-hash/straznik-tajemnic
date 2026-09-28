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
import type { VisualBeliefGraph, CharacterVisualProfile } from './visual-belief-graph';
import { extractCleanFirstName, extractStem, extractCleanTokens } from './visual-belief-graph';

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

const COMMON_WORD_STEMS = new Set([
  'stan',
  'kami',
  'grze',
  'bole',
  'mari',
  'roma',
  'artu',
  'zofi',
  'wita',
  'jasn',
  'dobr',
  'lesn',
  'nowa',
  'star',
  'krol',
  'ziem',
  'biel',
  'czar',
]);

/**
 * Wykrywa postacie (gracza lub zarejestrowanych NPC) biorące udział w scenie,
 * sprawdzając parametry żądania oraz treść promptu.
 */
function findParticipatingCharacters(
  prompt: string,
  req: ImageRequest,
  beliefGraph: VisualBeliefGraph
): CharacterVisualProfile[] {
  const matched: CharacterVisualProfile[] = [];
  const seenIds = new Set<string>();

  // 1. Jawny parametr nazwy postaci (jeśli podano)
  const explicitName =
    (req as { characterName?: string }).characterName || (req.type === 'scene' ? req.portraitName : undefined);
  if (explicitName) {
    const prof = beliefGraph.getCharacterProfile(explicitName);
    if (prof && !seenIds.has(prof.id)) {
      seenIds.add(prof.id);
      matched.push(prof);
    }
  }

  // 2. Analiza tekstu promptu pod kątem imion, zdrobnień, stemów lub obecności Badacza
  const allProfiles = Object.values(beliefGraph.getState().characters).filter(
    (c, idx, arr) => arr.findIndex((x) => x.id === c.id || x.name.toLowerCase() === c.name.toLowerCase()) === idx
  );

  const lowerPrompt = prompt.toLowerCase();

  for (const prof of allProfiles) {
    if (seenIds.has(prof.id)) continue;

    // A. Pełna nazwa (np. "Waldemar Kowalski", "Dr Henry Armitage")
    const lowerName = prof.name.toLowerCase().trim();
    if (lowerName && lowerPrompt.includes(lowerName)) {
      seenIds.add(prof.id);
      matched.push(prof);
      continue;
    }

    // B. Pierwsze imię z polską odmianą deklinacyjną (np. "Waldemar", "Waldemara", "Waldemarowi", "Eleonora", "Eleonorze")
    const firstName = extractCleanFirstName(prof.name).toLowerCase();
    if (firstName && firstName.length >= 3) {
      const fnBase = firstName.endsWith('a') ? firstName.slice(0, -1) : firstName;
      const fnInflectRegex = new RegExp(
        `(?<=^|[^\\p{L}\\p{N}])${fnBase}(?:a|owi|em|ie|e|y|u|ze|ą|ę)?(?=[^\\p{L}\\p{N}]|$)`,
        'iu'
      );
      if (fnInflectRegex.test(prompt)) {
        seenIds.add(prof.id);
        matched.push(prof);
        continue;
      }
    }

    // C. Nazwisko (np. "Kowalski", "Armitage", "Malone")
    const cleanTokens = extractCleanTokens(prof.name);
    if (cleanTokens.length > 1) {
      const lastName = cleanTokens[cleanTokens.length - 1];
      if (lastName.length >= 4 && !COMMON_WORD_STEMS.has(lastName.slice(0, 4))) {
        const lnBase =
          lastName.endsWith('ski') || lastName.endsWith('ska')
            ? lastName.slice(0, -3)
            : lastName.endsWith('i') || lastName.endsWith('a')
              ? lastName.slice(0, -1)
              : lastName;
        const lnRegex = new RegExp(
          `(?<=^|[^\\p{L}\\p{N}])${lnBase}(?:ski|ska|skiego|skiej|skiemu|skim|skich|skimi|a|owi|em|ie|e|y|u)?(?=[^\\p{L}\\p{N}]|$)`,
          'iu'
        );
        if (lnRegex.test(prompt)) {
          seenIds.add(prof.id);
          matched.push(prof);
          continue;
        }
      }
    }

    // D. Bezpieczne zdrobnienia i stemy (wykluczając powszechne słowa słownikowe 'stan', 'kami', itp.)
    const stem = extractStem(prof.name);
    if (stem.length >= 4 && !COMMON_WORD_STEMS.has(stem)) {
      const diminutiveRegex = new RegExp(
        `(?<=^|[^\\p{L}\\p{N}])${stem}(?:ek|k[a-ząćęłńóśźż]*|[a-ząćęłńóśźż]{1,4})?(?=[^\\p{L}\\p{N}]|$)`,
        'iu'
      );
      if (diminutiveRegex.test(prompt)) {
        seenIds.add(prof.id);
        matched.push(prof);
        continue;
      }
    }

    // Specjalne kanoniczne zdrobnienia dla imion ze stemami kolidującymi (Stanisław -> Staszek, Grzegorz -> Grzesiek)
    if (prof.name.toLowerCase().includes('stanisław')) {
      if (
        /(?<=^|[^\p{L}\p{N}])(staszek|staszka|staszkowi|staszkie|staszku|stasiek|stasiu)(?=[^\p{L}\p{N}]|$)/iu.test(
          prompt
        )
      ) {
        seenIds.add(prof.id);
        matched.push(prof);
        continue;
      }
    }
    if (prof.name.toLowerCase().includes('grzegorz')) {
      if (
        /(?<=^|[^\p{L}\p{N}])(grzesiek|grześ|grzesiu|grzesia)(?=[^\p{L}\p{N}]|$)/iu.test(prompt)
      ) {
        seenIds.add(prof.id);
        matched.push(prof);
        continue;
      }
    }

    // E. Obecność gracza w kadrze
    if (prof.isPlayer) {
      if (
        /(?<=^|[^\p{L}\p{N}])(badacz|badaczka|badacze|investigator|investigators|protagonista|gracz)(?=[^\p{L}\p{N}]|$)/iu.test(
          prompt
        )
      ) {
        seenIds.add(prof.id);
        matched.push(prof);
        continue;
      }
    }
  }

  return matched;
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
      defaultAspectRatio = '16:9';
    } else if (req.isMythos || req.type === 'monster' || req.type === 'vision') {
      role = 'mythos_horror';
      defaultAspectRatio = '16:9';
    }

    // Wstrzyknięcie kotwic Visual DNA postaci w kadrach sytuacyjnych (dramatic_scene)
    if (role === 'dramatic_scene' && beliefGraph) {
      const participating = findParticipatingCharacters(basePrompt, req, beliefGraph);
      if (participating.length > 0) {
        const dnaAnchors = participating
          .slice(0, 2)
          .map((p) => `${p.name} (${p.visualDnaPrompt})`)
          .join('; ');
        basePrompt = `${basePrompt}, visual consistency anchors: [${dnaAnchors}]`;
      }
    }

    // Wzbogacenie o materialne rekwizyty epoki i oczyszczenie z anachronizmów
    const sceneHint = role === 'character_portrait' ? 'portrait' : 'interior';
    const enrichedPrompt = enrichImagePromptWithEraProps(basePrompt, effectiveEraOrYear, sceneHint);

    const isPortrait = role === 'character_portrait';
    const effectiveAspectRatio: CuratedSceneShot['aspectRatio'] = isPortrait
      ? (req.aspectRatio || defaultAspectRatio)
      : '16:9';

    return {
      request: {
        ...req,
        prompt: enrichedPrompt,
        aspectRatio: effectiveAspectRatio,
      },
      role,
      aspectRatio: effectiveAspectRatio,
      enrichedPrompt,
    };
  });

  return {
    shots: curatedShots,
    explanation: `Proaktywny reżyser dobrał ${curatedShots.length} kadr(ów) dla sceny [era: ${effectiveEraOrYear}].`,
  };
}
