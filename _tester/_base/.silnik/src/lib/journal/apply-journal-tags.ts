import type { Character, JournalEntry, EquipmentItem, EquipmentCategory, SceneCaseCard, ActiveSceneState } from '@/lib/types';
import type { JournalTagEntry } from '@/lib/parsers/types';
import { parseRevealedTags,parseRevealedClue,findReplacedClue,resolveRevealedRecipient,revealedEntityId } from '@/core/memory/revealed-facts';
import {
  synthesizeClueFact,
  parseClueProvenance,
  inferClueProvenance,
  extractSceneChangeTag,
  extractSceneCardTag,
  extractLocationExhaustedTag,
  ExtractedNpcTag,
  ExtractedItemTag,
  ExtractedSceneChange,
  ExtractedSceneCard,
} from '@/lib/parsers/journal-parser';
import { extractLatestTagLocation } from '@/lib/parsers/event-parser';
import {
  ensureCharacterDossier,
  inferClueCategory,
} from '@/lib/journal/dossier-migration';
import { createEquipmentItem } from '@/lib/equipment-data';
import { safeResolveVisualEra } from '@/lib/equipment-catalog';
import {
  linkClueNpcLocation,
  type InvestigatorDossier,
  type NpcDossierEntry,
  type ClueEntry,
  type ClueProvenance,
  type LocationDossierEntry,
} from '@/lib/journal/dossier-types';

/**
 * Normalizuje kategorię przedmiotu z języka polskiego lub angielskiego do EquipmentCategory.
 */
export function normalizeEquipmentCategory(rawCategory?: string, isHandout?: boolean): EquipmentCategory {
  if (!rawCategory && isHandout) return 'document';
  if (!rawCategory) return 'personal';
  const c = rawCategory.toLowerCase().trim();
  if (['dokument', 'document', 'list', 'letter', 'pismo', 'bilet', 'ticket', 'newspaper', 'gazeta'].includes(c)) return 'document';
  if (['bron', 'broń', 'weapon', 'pistolet', 'gun', 'knife', 'nóż', 'noz'].includes(c)) return 'weapon';
  if (['narzedzie', 'narzędzie', 'tool', 'narzedzia', 'narzędzia'].includes(c)) return 'tool';
  if (['artefakt', 'artifact', 'amulet', 'relic'].includes(c)) return 'artifact';
  if (['ochrona', 'pancerz', 'armor'].includes(c)) return 'armor';
  if (['medycyna', 'medyczny', 'medical', 'apteczka', 'first_aid'].includes(c)) return 'medical';
  if (['okultyzm', 'okultystyczny', 'occult'].includes(c)) return 'occult';
  if (['personal', 'osobisty', 'osobiste'].includes(c)) return 'personal';
  return isHandout ? 'document' : 'personal';
}

/**
 * Most między parserem tagów MG a dziennikiem postaci i aktami śledczymi (Investigator Dossier).
 *
 * Issue #68: Dwukierunkowa pętla pamięci.
 * 1. Gdy MG opisuje NPC -> tworzy lub aktualizuje kartę w dossier (zamiast dodawać kolejny powtarzający się wpis kroniki).
 * 2. Gdy badacz odkrywa poszlakę -> syntetyzuje precyzyjny 1-zdaniowy fakt do dossier i dziennika.
 *
 * Typ `JournalEntry`:
 *  - `@/lib/types`            → `character.journal` (modal sesji, useSceneSummary)  ← SSOT
 */

/**
 * Mapuje tagi [DZIENNIK:typ:tytuł] na wpisy `character.journal`. Id jest deterministyczne
 * (`messageId` + index), więc dopisywanie jest idempotentne: ponowne przetworzenie tej samej
 * wiadomości nie tworzy duplikatów.
 */
export function buildJournalEntriesFromTags(
  tags: JournalTagEntry[],
  messageId: string
): JournalEntry[] {
  return tags.map((tag, index) => {
    const isClue = tag.type === 'clue' || tag.type === 'discovery';
    let cleanTitle = tag.title.trim();
    if (isClue && cleanTitle.includes('|')) {
      cleanTitle = cleanTitle.split('|')[0].trim();
    }
    const content = isClue
      ? synthesizeClueFact(cleanTitle, tag.content)
      : tag.content;

    return {
      id: `journal-${messageId}-${index}`,
      timestamp: new Date(),
      inGameDate: tag.inGameDate,
      type: tag.type,
      title: cleanTitle,
      content,
      tags: [],
      isBookmarked: false,
    };
  });
}

/**
 * IND-267: most `[LOKACJA: Nazwa: opis]` → wpis dziennika typu `location`.
 */
export function buildLocationEntryFromText(
  rawText: string,
  messageId: string
): JournalEntry | null {
  const location = extractLatestTagLocation(rawText);
  if (!location) return null;

  return {
    id: `location-${messageId}`,
    timestamp: new Date(),
    type: 'location',
    title: location.name,
    content: location.description,
    tags: [],
    isBookmarked: false,
  };
}

/**
 * Aktualizuje akta śledcze (dossier) oraz dziennik pojedynczej postaci na podstawie
 * tagów z tury narracji MG.
 */
export function processCharacterJournalAndDossier(
  character: Character,
  tags: JournalTagEntry[],
  npcTags: ExtractedNpcTag[],
  locationEntry: JournalEntry | null,
  messageId: string,
  itemTags: ExtractedItemTag[] = [],
  sceneChange: ExtractedSceneChange | null = null,
  sceneCard: ExtractedSceneCard | null = null,
  sharedLocationName?: string,
  locationExhausted?: { locationName?: string } | null
): { character: Character; changed: boolean } {
  const charWithDossier = ensureCharacterDossier(character);
  const dossier: InvestigatorDossier = {
    ...charWithDossier.investigatorDossier,
    clues: [...charWithDossier.investigatorDossier.clues],
    npcs: [...charWithDossier.investigatorDossier.npcs],
    locations: [...charWithDossier.investigatorDossier.locations],
    notes: [...charWithDossier.investigatorDossier.notes],
  };

  const existingJournal = [...(charWithDossier.journal ?? [])];
  const existingJournalIds = new Set(existingJournal.map((e) => e.id));
  const existingEquipment: EquipmentItem[] = [...(charWithDossier.equipment ?? [])];
  const existingSceneCards: SceneCaseCard[] = [...(charWithDossier.sceneCards ?? [])];

  const currentLocName = locationEntry ? locationEntry.title : (sharedLocationName || 'Aktualna lokacja');

  let activeScene: ActiveSceneState = charWithDossier.activeScene
    ? {
        ...charWithDossier.activeScene,
        location:
          charWithDossier.activeScene.location === 'Aktualna lokacja' && (locationEntry?.title || sharedLocationName)
            ? (locationEntry?.title || sharedLocationName!)
            : charWithDossier.activeScene.location,
        people: [...(charWithDossier.activeScene.people || [])],
        findings: [...(charWithDossier.activeScene.findings || [])],
        notes: [...(charWithDossier.activeScene.notes || [])],
        isLocationExhausted: charWithDossier.activeScene.isLocationExhausted || false,
      }
    : {
        sceneNumber: existingSceneCards.length + 1,
        location: currentLocName,
        startedAt: new Date().toISOString(),
        people: [],
        findings: [],
        notes: [],
        isLocationExhausted: false,
      };

  let changed = false;
  let sceneSealedThisMessage = false;

  // Bramkowanie lokacji (anty-pixel-hunting) - oznaczenie w aktywnej scenie i dossier
  if (locationExhausted) {
    activeScene.isLocationExhausted = true;
    const targetLocName = locationExhausted.locationName || activeScene.location;
    if (targetLocName && targetLocName !== 'Aktualna lokacja') {
      const locIdx = dossier.locations.findIndex(
        (l) => l.name.toLowerCase() === targetLocName.toLowerCase()
      );
      if (locIdx >= 0) {
        dossier.locations[locIdx] = {
          ...dossier.locations[locIdx],
          searchStatus: 'thoroughly_searched',
        };
      } else {
        dossier.locations.push({
          id: `loc-${messageId}`,
          name: targetLocName,
          searchStatus: 'thoroughly_searched',
          timestamp: Date.now(),
        });
      }
    }
    changed = true;
  }

  // Automatyczne pieczętowanie poprzedniej sceny przy zmianie lokacji (Issue #471)
  const prevLocation = activeScene.location?.trim();
  const isLocationChange = Boolean(
    locationEntry &&
    prevLocation &&
    prevLocation !== '' &&
    prevLocation !== 'Aktualna lokacja' &&
    locationEntry.title.trim().toLowerCase() !== prevLocation.toLowerCase()
  );

  if (isLocationChange) {
    const cardId = sceneCard ? `scene-card-${messageId}` : `scene-card-auto-${messageId}`;
    if (!existingSceneCards.some((sc) => sc.id === cardId)) {
      const cardTitle =
        sceneCard?.title || activeScene.title || activeScene.location || `Scena ${activeScene.sceneNumber}`;
      const sealedTakeaways =
        sceneCard?.keyTakeaways && sceneCard.keyTakeaways.length > 0
          ? sceneCard.keyTakeaways
          : activeScene.notes.length > 0
            ? activeScene.notes
            : ['Zbadano lokację i zabezpieczono zebrane poszlaki.'];

      const sealedPeople =
        sceneCard?.people && sceneCard.people.length > 0
          ? sceneCard.people
          : activeScene.people;

      const sealedFindings =
        sceneCard?.findings && sceneCard.findings.length > 0
          ? sceneCard.findings
          : activeScene.findings;

      const nextStep =
        sceneCard?.nextStep ||
        (sceneChange?.newLocation
          ? `Udać się do: ${sceneChange.newLocation}`
          : `Udać się do: ${locationEntry!.title}`);

      const sealedCard: SceneCaseCard = {
        id: cardId,
        sceneNumber: activeScene.sceneNumber,
        location: activeScene.location,
        title: cardTitle,
        inGameDate: sceneCard?.inGameDate || activeScene.inGameDate || charWithDossier.activeScene?.inGameDate,
        timestamp: new Date().toISOString(),
        people: [...sealedPeople],
        findings: [...sealedFindings],
        keyTakeaways: [...sealedTakeaways],
        nextStep,
        isSealed: true,
        isLocationExhausted: activeScene.isLocationExhausted || false,
      };

      existingSceneCards.push(sealedCard);

      const journalSceneId = `journal-scene-${messageId}`;
      if (!existingJournalIds.has(journalSceneId)) {
        existingJournal.push({
          id: journalSceneId,
          timestamp: new Date(),
          inGameDate: sealedCard.inGameDate,
          type: 'scene',
          title: sceneCard?.title || `Scena #${sealedCard.sceneNumber}: ${sealedCard.location}`,
          content: sealedCard.keyTakeaways.join('\n'),
          tags: ['scena', 'akta-sprawy'],
          isBookmarked: false,
          sceneData: sealedCard,
        });
        existingJournalIds.add(journalSceneId);
      }

      activeScene = {
        sceneNumber: sealedCard.sceneNumber + 1,
        location: locationEntry!.title,
        startedAt: new Date().toISOString(),
        inGameDate: locationEntry!.inGameDate || activeScene.inGameDate,
        people: [],
        findings: [],
        notes: [],
        isLocationExhausted: false,
      };
      changed = true;
      sceneSealedThisMessage = true;
    }
  }

  // 1. Obsługa NPC (zarówno z [NPC: Imię: opis], jak i [DZIENNIK:npc:Imię])
  const combinedNpcs = [...npcTags];
  for (const t of tags) {
    if (t.type === 'npc' && t.title && t.content) {
      if (!combinedNpcs.some((n) => n.name.toLowerCase().trim() === t.title.toLowerCase().trim())) {
        combinedNpcs.push({
          name: t.title.trim(),
          description: t.content.trim(),
          who: t.who,
        });
      }
    }
  }

  for (const npc of combinedNpcs) {
    const normName = npc.name.trim();
    if (!normName) continue;
    const lowerName = normName.toLowerCase();

    if (!activeScene.people.includes(normName)) {
      activeScene.people.push(normName);
      changed = true;
    }

    const existingNpcIndex = dossier.npcs.findIndex(
      (n) => n.name.toLowerCase().trim() === lowerName
    );

    if (existingNpcIndex >= 0) {
      // NPC już istnieje: AKTUALIZUJEMY kartę w dossier bez tworzenia kolejnego wpisu w kronice
      const existing = dossier.npcs[existingNpcIndex];
      let npcUpdated = false;

      if (!existing.firstImpression && npc.description) {
        existing.firstImpression = npc.description;
        npcUpdated = true;
      } else if (npc.description) {
        // Dołącz nową informację, jeśli nie jest duplikatem
        const snippet = npc.description.slice(0, 30).toLowerCase();
        const currentKeyInfo = existing.keyInformation || '';
        if (!currentKeyInfo.toLowerCase().includes(snippet)) {
          existing.keyInformation = currentKeyInfo
            ? `${currentKeyInfo}; ${npc.description}`
            : npc.description;
          npcUpdated = true;
        }
      }

      if (locationEntry && !existing.location) {
        existing.location = locationEntry.title;
        existing.locationId = revealedEntityId('location', messageId, locationEntry.title);
        npcUpdated = true;
      }

      if (npcUpdated) {
        existing.timestamp = Date.now();
        dossier.npcs[existingNpcIndex] = { ...existing };
        changed = true;
      }
    } else {
      // Nowy NPC: twórz nową kartę w dossier + JEDEN wpis w kronice
      // Ekstrakcja trójwymiarowości Egriego jeśli podana w formacie [opis | ciało | status | cel]
      let firstImpression = npc.description;
      let physiologicalDetail: string | undefined;
      let sociologicalStatus: string | undefined;
      let psychologicalAgenda: string | undefined;

      if (npc.description.includes('|')) {
        const parts = npc.description.split('|').map((p) => p.trim());
        firstImpression = parts[0] || npc.description;
        if (parts.length >= 2) physiologicalDetail = parts[1];
        if (parts.length >= 3) sociologicalStatus = parts[2];
        if (parts.length >= 4) psychologicalAgenda = parts[3];
      }

      const newNpc: NpcDossierEntry = {
        id: revealedEntityId('npc',messageId,normName),
        name: normName,
        firstImpression,
        physiologicalDetail,
        sociologicalStatus,
        psychologicalAgenda,
        relationshipStatus: 'unknown',
        location: locationEntry ? locationEntry.title : undefined,
        locationId: locationEntry ? revealedEntityId('location', messageId, locationEntry.title) : undefined,
        timestamp: Date.now(),
      };
      dossier.npcs.push(newNpc);

      const jId = `journal-${messageId}-npc-${lowerName.replace(/[^a-z0-9]/g, '-')}`;
      if (!existingJournalIds.has(jId)) {
        existingJournal.push({
          id: jId,
          timestamp: new Date(),
          type: 'npc',
          title: normName,
          content: firstImpression,
          tags: [],
          isBookmarked: false,
        });
        existingJournalIds.add(jId);
      }
      changed = true;
    }
  }

  // 1.5. Obsługa przedmiotów i handoutów (Zero-Effort Ledger & Potrójny Byt Handoutów)
  const combinedItems = [...itemTags];
  for (const t of tags) {
    if (t.type === 'item' && t.title && t.content) {
      if (!combinedItems.some((i) => i.name.toLowerCase().trim() === t.title.toLowerCase().trim())) {
        combinedItems.push({
          name: t.title.trim(),
          description: t.content.trim(),
          who: t.who,
        });
      }
    }
  }

  for (const item of combinedItems) {
    const normName = item.name.trim();
    if (!normName) continue;
    const lowerName = normName.toLowerCase();

    if (!activeScene.findings.includes(normName)) {
      activeScene.findings.push(normName);
      changed = true;
    }
    const jId = `journal-${messageId}-item-${lowerName.replace(/[^a-z0-9]/g, '-')}`;

    if (!existingJournalIds.has(jId)) {
      existingJournal.push({
        id: jId,
        timestamp: new Date(),
        type: 'item',
        title: normName,
        content: item.description,
        tags: item.category ? [item.category] : [],
        isBookmarked: false,
      });
      existingJournalIds.add(jId);
      changed = true;
    }

    // Jeśli przedmiot jest dokumentem, listem, wycinkiem, gazetą, zdjęciem, taśmą lub księgą (Handout)
    // automatycznie generujemy potrójny byt: fizyczny rekwizyt w ekwipunku + czytnik + fakt w dossier!
    const isHandout =
      item.category === 'document' ||
      item.category === 'dokument' ||
      /dokument|list|wycinek|gazet|artykuł|pismo|fotografi|zdjęci|taśm|nagrani|książk|księg|pamiętnik|dziennik|notatk|raport|telegram|akt|akta|świadectwo|certyfikat|bilet|przepustk|document|letter|clipping|newspaper|article|photo|tape|recording|book|tome|diary|journal|notes|report|telegram|file|certificate|pass/i.test(
        `${normName} ${item.description} ${item.category || ''}`
      );

    // 2. Fizyczny rekwizyt w ekwipunku postaci (Karta Postaci / Torba / Kieszeń - Zero-Effort Ledger)
    const existingEqIndex = existingEquipment.findIndex(
      (eq) => (eq.name || '').toLowerCase().trim() === lowerName
    );

    const normCategory = normalizeEquipmentCategory(item.category, isHandout);

    if (existingEqIndex === -1) {
      const era = safeResolveVisualEra(character.era || '1920s');
      const baseEq = createEquipmentItem(
        {
          name: normName,
          category: normCategory,
          description: item.description,
        },
        'found',
        era
      );
      const newEqItem: EquipmentItem = {
        ...baseEq,
        category: isHandout ? 'document' : baseEq.category,
        condition: item.condition || baseEq.condition || 'used',
        isReadable: isHandout ? true : baseEq.isReadable,
        readableContent: isHandout ? item.description : baseEq.readableContent,
        readableContentStatus: isHandout ? 'ready' : baseEq.readableContentStatus,
      };
      existingEquipment.push(newEqItem);
      changed = true;
    } else if (isHandout) {
      const existingEq = existingEquipment[existingEqIndex];
      if (!existingEq.readableContent && item.description) {
        existingEquipment[existingEqIndex] = {
          ...existingEq,
          isReadable: true,
          readableContent: item.description,
          readableContentStatus: 'ready',
        };
        changed = true;
      }
    }

    // 3. Syntetyczny 1-zdaniowy fakt śledczy w Dossier (Dossier Clue)

    if (isHandout) {
      const existingClue = dossier.clues.find(
        (c) => c.title.toLowerCase().trim() === lowerName
      );
      const fact = synthesizeClueFact(normName, item.description);
      if (!existingClue) {
        dossier.clues.push({
          id: `clue-${messageId}-handout-${lowerName.replace(/[^a-z0-9]/g, '-')}`,
          title: normName,
          description: fact,
          category: 'document',
          status: 'confirmed',
          discoveryStatus: 'discovered',
          epistemicLayer: 'player_clue',
          provenance: 'handout',
          foundLocation: locationEntry?.title,
          foundLocationId: locationEntry ? revealedEntityId('location', messageId, locationEntry.title) : undefined,
          timestamp: Date.now(),
          sourceJournalEntryId: jId,
        });
        changed = true;
      } else {
        if (!existingClue.provenance) {
          existingClue.provenance = 'handout';
          existingClue.timestamp = Date.now();
          changed = true;
        }
        if (!existingClue.foundLocation && locationEntry) {
          existingClue.foundLocation = locationEntry.title;
          existingClue.foundLocationId = revealedEntityId('location', messageId, locationEntry.title);
          existingClue.timestamp = Date.now();
          changed = true;
        }
      }
    }
  }

  // 2. Obsługa pozostałych tagów dziennika (w tym poszlak z syntezą 1-zdaniową i wektorem M.I.C.E.)
  tags.forEach((tag, index) => {
    // Tagi typu 'npc' oraz 'item' zostały już obsłużone powyżej
    if (tag.type === 'npc' || tag.type === 'item') return;

    const isClue = tag.type === 'clue' || tag.type === 'discovery';
    let rawContent = tag.content;
    let explicitMiceType: import('@/lib/journal/dossier-types').MiceQuotientType | undefined;
    let miceObjective: string | undefined;
    let explicitProvenance: ClueProvenance | undefined;
    let cleanClueTitle = tag.title.trim();
    let clueInGameDate = tag.inGameDate;

    // Sprawdź czy w 4. argumencie / dacie nie podano proweniencji (np. [DZIENNIK:trop:Tytuł:obserwacja])
    if (isClue && clueInGameDate) {
      const provFromDate = parseClueProvenance(clueInGameDate);
      if (provFromDate) {
        explicitProvenance = provFromDate;
        clueInGameDate = undefined;
      }
    }

    // Sprawdź czy w tytule nie podano proweniencji (np. [DZIENNIK:trop:Tytuł|zeznanie])
    if (isClue && cleanClueTitle.includes('|')) {
      const titleParts = cleanClueTitle.split('|').map((p) => p.trim());
      cleanClueTitle = titleParts[0];
      for (let i = 1; i < titleParts.length; i++) {
        const prov = parseClueProvenance(titleParts[i]);
        if (prov) explicitProvenance = prov;
      }
    }

    if (isClue && tag.content.includes('|')) {
      const parts = tag.content.split('|').map((p) => p.trim());
      rawContent = parts[0] || tag.content;

      // Iteruj po kolejnych segmentach pipe (elastyczna kolejność tokenów proweniencji i M.I.C.E.)
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        if (!part) continue;

        // 1. Sprawdź proweniencję
        const detectedProv = parseClueProvenance(part);
        if (detectedProv) {
          explicitProvenance = detectedProv;
          continue;
        }

        // 2. Sprawdź M.I.C.E.
        const pLower = part.toLowerCase();
        if (['m', 'milieu', 'otoczenie', 'przestrzen'].includes(pLower)) {
          explicitMiceType = 'milieu';
          continue;
        }
        if (['i', 'inquiry', 'sledztwo', 'pytanie'].includes(pLower)) {
          explicitMiceType = 'inquiry';
          continue;
        }
        if (['c', 'character', 'postac', 'tozsamosc'].includes(pLower)) {
          explicitMiceType = 'character';
          continue;
        }
        if (['e', 'event', 'zagrozenie', 'wydarzenie', 'zdarzenie'].includes(pLower)) {
          explicitMiceType = 'event';
          continue;
        }

        // 3. Sprawdź czy to nie unieważnienie (np. zastępuje: ...)
        if (/(?:zastępuje|unieważnia|obala|supersedes|refutes):/i.test(part)) {
          continue;
        }

        // 4. Ignoruj metadane relacji (świadek, lokacja, data, status)
        if (
          /^(?:świadek|swiadek|witness|npc|źródło_npc|zrodlo_npc)\s*:/i.test(part) ||
          /^(?:lokacja|location|miejsce|place)\s*:/i.test(part) ||
          /^(?:data|date|czas|time|status)\s*:/i.test(part)
        ) {
          continue;
        }

        // 5. Fallback na miceObjective
        if (!miceObjective) {
          miceObjective = part;
        }
      }
    }

    const fact = isClue
      ? synthesizeClueFact(cleanClueTitle, rawContent)
      : tag.content;

    if (isClue && cleanClueTitle) {
      if (!activeScene.findings.includes(cleanClueTitle.trim())) {
        activeScene.findings.push(cleanClueTitle.trim());
        changed = true;
      }
    } else if (!isClue && tag.content) {
      const trimmedContent = tag.content.trim();
      if (!activeScene.notes.includes(trimmedContent)) {
        activeScene.notes.push(trimmedContent);
        changed = true;
      }
    }

    // Aktualizuj poszlaki w dossier
    if (isClue && cleanClueTitle) {
      const lowerTitle = cleanClueTitle.toLowerCase().trim();
      const existingClue = dossier.clues.find(
        (c) => c.title.toLowerCase().trim() === lowerTitle
      );

      // Wykrywanie unieważniania starszych poszlak
      const supersedesMatch = tag.content.match(/(?:zastępuje|unieważnia|obala|supersedes|refutes):\s*([^|\n\]]+)/i);
      const supersededTarget = supersedesMatch ? supersedesMatch[1].trim().toLowerCase() : null;
      const replaced = findReplacedClue(dossier.clues,supersededTarget ?? undefined);
      if (replaced && replaced !== existingClue) {
        replaced.status = parseRevealedClue(tag).replacementStatus;
        replaced.supersededBy = existingClue?.id ?? `clue-${messageId}-${index}`;
        changed = true;
      }

      const resolvedCategory = inferClueCategory({ title: cleanClueTitle, content: rawContent });
      const resolvedProvenance =
        explicitProvenance || inferClueProvenance(cleanClueTitle, rawContent, resolvedCategory);

      // Uszczelnianie relacji: wykrywanie powiązanego NPC i Lokacji
      let sourceNpc = tag.sourceNpc;
      let sourceNpcId: string | undefined;
      let foundLocation = tag.foundLocation;
      let foundLocationId: string | undefined;

      // 1. Ustalanie źródłowego NPC
      if (!sourceNpc) {
        if (combinedNpcs.length === 1) {
          sourceNpc = combinedNpcs[0].name;
        } else if (resolvedProvenance === 'testimony' && combinedNpcs.length > 0) {
          sourceNpc = combinedNpcs[0].name;
        } else {
          const allCandidateNpcs = [
            ...combinedNpcs.map((n) => ({ name: n.name, id: revealedEntityId('npc', messageId, n.name) })),
            ...dossier.npcs,
          ];
          const textToScan = `${cleanClueTitle} ${rawContent}`.toLowerCase();
          const matchedCandidate = allCandidateNpcs.find(
            (n) => n.name && textToScan.includes(n.name.toLowerCase().trim())
          );
          if (matchedCandidate) {
            sourceNpc = matchedCandidate.name;
            sourceNpcId = matchedCandidate.id;
          }
        }
      }

      if (sourceNpc && !sourceNpcId) {
        const m = dossier.npcs.find((n) => n.name.toLowerCase().trim() === sourceNpc!.toLowerCase().trim())
          || combinedNpcs.find((n) => n.name.toLowerCase().trim() === sourceNpc!.toLowerCase().trim());
        if (m) {
          sourceNpcId = 'id' in m && m.id ? m.id : revealedEntityId('npc', messageId, m.name);
        }
      }

      // 2. Ustalanie lokacji odnalezienia
      if (!foundLocation) {
        if (locationEntry) {
          foundLocation = locationEntry.title;
          foundLocationId = revealedEntityId('location', messageId, locationEntry.title);
        } else {
          const textToScan = `${cleanClueTitle} ${rawContent}`.toLowerCase();
          const matchedLoc = dossier.locations.find(
            (l) => l.name && textToScan.includes(l.name.toLowerCase().trim())
          );
          if (matchedLoc) {
            foundLocation = matchedLoc.name;
            foundLocationId = matchedLoc.id;
          }
        }
      }

      if (foundLocation && !foundLocationId) {
        const m = dossier.locations.find((l) => l.name.toLowerCase().trim() === foundLocation!.toLowerCase().trim());
        if (m) {
          foundLocationId = m.id;
        }
      }

      if (!existingClue) {
        const isKey = /klucz|core|key|główn/i.test(`${cleanClueTitle} ${tag.content}`);
        const resolvedMiceType = explicitMiceType || inferClueMiceType(cleanClueTitle, fact);
        const newClue: ClueEntry = {
          id: `clue-${messageId}-${index}`,
          title: cleanClueTitle,
          description: fact,
          category: resolvedCategory,
          status: parseRevealedClue(tag).status,
          discoveryStatus: 'discovered',
          epistemicLayer: 'player_clue',
          provenance: resolvedProvenance,
          sourceNpc,
          sourceNpcId,
          foundLocation,
          foundLocationId,
          isKeyClue: isKey,
          miceType: resolvedMiceType,
          miceObjective,
          inGameDate: clueInGameDate,
          timestamp: Date.now(),
          sourceJournalEntryId: `journal-${messageId}-${index}`,
        };
        dossier.clues.push(newClue);
        changed = true;
      } else {
        // Aktualizacja istniejącej poszlaki
        const explicitStatus=parseRevealedClue(tag).explicitStatus;
        if(explicitStatus && existingClue.status!==explicitStatus) {existingClue.status=explicitStatus;changed=true;}
        if (existingClue.description !== fact && fact) {
          existingClue.description = fact;
          existingClue.timestamp = Date.now();
          changed = true;
        }
        if (explicitProvenance && existingClue.provenance !== explicitProvenance) {
          existingClue.provenance = explicitProvenance;
          existingClue.timestamp = Date.now();
          changed = true;
        } else if (!existingClue.provenance && resolvedProvenance) {
          existingClue.provenance = resolvedProvenance;
          existingClue.timestamp = Date.now();
          changed = true;
        }
        if (!existingClue.sourceNpc && sourceNpc) {
          existingClue.sourceNpc = sourceNpc;
          existingClue.sourceNpcId = sourceNpcId;
          existingClue.timestamp = Date.now();
          changed = true;
        }
        if (!existingClue.foundLocation && foundLocation) {
          existingClue.foundLocation = foundLocation;
          existingClue.foundLocationId = foundLocationId;
          existingClue.timestamp = Date.now();
          changed = true;
        }
      }

      // Potrójny Byt Handoutów: jeśli poszlaka jest dokumentem/handoutem, dołącz rekwizyt fizyczny do ekwipunku postaci
      const isClueHandout =
        resolvedProvenance === 'handout' ||
        resolvedCategory === 'document' ||
        /dokument|list|wycinek|gazet|artykuł|pismo|fotografi|zdjęci|taśm|nagrani|książk|księg|pamiętnik|dziennik|notatk|raport|telegram|akt|akta|świadectwo|certyfikat|bilet|przepustk|document|letter|clipping|newspaper|article|photo|tape|recording|book|tome|diary|journal|notes|report|telegram|file|certificate|pass/i.test(
          `${cleanClueTitle} ${rawContent}`
        );

      if (isClueHandout) {
        const lowerClueName = cleanClueTitle.toLowerCase().trim();
        const existingEqIndex = existingEquipment.findIndex(
          (eq) => (eq.name || '').toLowerCase().trim() === lowerClueName
        );
        if (existingEqIndex === -1) {
          const era = safeResolveVisualEra(character.era || '1920s');
          const baseEq = createEquipmentItem(
            {
              name: cleanClueTitle,
              category: 'document',
              description: rawContent,
            },
            'found',
            era
          );
          const newEqItem: EquipmentItem = {
            ...baseEq,
            category: 'document',
            isReadable: true,
            readableContent: rawContent,
            readableContentStatus: 'ready',
          };
          existingEquipment.push(newEqItem);
          changed = true;
        } else {
          const existingEq = existingEquipment[existingEqIndex];
          if (!existingEq.readableContent && rawContent) {
            existingEquipment[existingEqIndex] = {
              ...existingEq,
              isReadable: true,
              readableContent: rawContent,
              readableContentStatus: 'ready',
            };
            changed = true;
          }
        }
      }
    }

    // Dopisz wpis do kroniki (z zachowaniem pełnej treści narracyjnej w content)
    const jId = `journal-${messageId}-${index}`;
    const mappedType = ['sprawa', 'case', 'cel'].includes(tag.type)
      ? 'case'
      : ['notatka', 'note'].includes(tag.type)
        ? 'note'
        : tag.type;

    if (!existingJournalIds.has(jId)) {
      existingJournal.push({
        id: jId,
        timestamp: new Date(),
        inGameDate: isClue ? clueInGameDate : tag.inGameDate,
        type: mappedType,
        title: isClue ? cleanClueTitle : tag.title,
        content: fact,
        tags: [],
        isBookmarked: false,
      });
      existingJournalIds.add(jId);
      changed = true;
    }
  });

  // 3. Obsługa lokacji
  if (locationEntry) {
    const lowerLoc = locationEntry.title.toLowerCase().trim();
    const existingLoc = dossier.locations.find(
      (l) => l.name.toLowerCase().trim() === lowerLoc
    );

    if (!existingLoc) {
      let locDesc = locationEntry.content;
      let lockedRoomMystery: LocationDossierEntry['lockedRoomMystery'];

      if (locationEntry.content.includes('|')) {
        const parts = locationEntry.content.split('|').map((p) => p.trim());
        locDesc = parts[0] || locationEntry.content;
        const typeToken = (parts[1] || '').toLowerCase();
        const validTypes: Record<string, import('@/lib/journal/dossier-types').LockedRoomMysteryType> = {
          typ1: 'accident_feigned_as_murder',
          wypadek: 'accident_feigned_as_murder',
          typ2: 'toxic_gas_or_paroxysm',
          gaz: 'toxic_gas_or_paroxysm',
          typ3: 'mechanical_trap',
          pulapka: 'mechanical_trap',
          typ4: 'suicide_framed_as_murder',
          samobojstwo: 'suicide_framed_as_murder',
          typ5: 'victim_impersonation',
          podszycie: 'victim_impersonation',
          typ6: 'strike_from_outside',
          zewnatrz: 'strike_from_outside',
          typ7: 'strike_during_break_in',
          wywazanie: 'strike_during_break_in',
        };

        const matchedType = validTypes[typeToken];
        if (matchedType) {
          lockedRoomMystery = {
            type: matchedType,
            anomalyDescription: parts[2] || 'Zamknięte od wewnątrz drzwi i brak śladów ucieczki.',
            investigationHint: parts[3] || undefined,
          };
        }
      }

      dossier.locations.push({
        id: revealedEntityId('location',messageId,locationEntry.title),
        name: locationEntry.title,
        description: locDesc,
        searchStatus: 'partially_searched',
        lockedRoomMystery,
        timestamp: Date.now(),
      });
      changed = true;
    }

    if (!existingJournalIds.has(locationEntry.id)) {
      existingJournal.push(locationEntry);
      existingJournalIds.add(locationEntry.id);
      changed = true;
    }
  }

  // 4. Uszczelnienie relacji dwukierunkowych (Fact <-> NPC <-> Location)
  if (linkClueNpcLocation(dossier)) {
    changed = true;
  }

  // 5. Obsługa zakończenia i pieczętowania sceny (Issue #402)
  if ((sceneCard || sceneChange) && !sceneSealedThisMessage) {
    const cardId = `scene-card-${messageId}`;
    if (!existingSceneCards.some((sc) => sc.id === cardId)) {
      const cardTitle = sceneCard?.title || activeScene.location || `Scena ${activeScene.sceneNumber}`;
      const cardLoc = sceneCard?.location || activeScene.location;
      const sealedTakeaways =
        sceneCard?.keyTakeaways && sceneCard.keyTakeaways.length > 0
          ? sceneCard.keyTakeaways
          : activeScene.notes.length > 0
          ? activeScene.notes
          : ['Zbadano lokację i zabezpieczono zebrane poszlaki.'];

      const sealedPeople =
        sceneCard?.people && sceneCard.people.length > 0
          ? sceneCard.people
          : activeScene.people;

      const sealedFindings =
        sceneCard?.findings && sceneCard.findings.length > 0
          ? sceneCard.findings
          : activeScene.findings;

      const nextStep =
        sceneCard?.nextStep ||
        (sceneChange?.newLocation ? `Udać się do: ${sceneChange.newLocation}` : undefined);

      const sealedCard: SceneCaseCard = {
        id: cardId,
        sceneNumber: activeScene.sceneNumber,
        location: cardLoc,
        title: cardTitle,
        inGameDate: sceneCard?.inGameDate || activeScene.inGameDate || locationEntry?.inGameDate,
        timestamp: new Date().toISOString(),
        people: sealedPeople,
        findings: sealedFindings,
        keyTakeaways: sealedTakeaways,
        nextStep,
        isSealed: true,
        isLocationExhausted: activeScene.isLocationExhausted || false,
      };

      existingSceneCards.push(sealedCard);

      const journalSceneId = `journal-scene-${messageId}`;
      if (!existingJournalIds.has(journalSceneId)) {
        existingJournal.push({
          id: journalSceneId,
          timestamp: new Date(),
          inGameDate: sealedCard.inGameDate,
          type: 'scene',
          title: sceneCard?.title || `Scena #${sealedCard.sceneNumber}: ${sealedCard.location}`,
          content: sealedCard.keyTakeaways.join('\n'),
          tags: ['scena', 'akta-sprawy'],
          isBookmarked: false,
          sceneData: sealedCard,
        });
        existingJournalIds.add(journalSceneId);
      }

      // Nowa aktywna scena po przejściu
      activeScene = {
        sceneNumber: sealedCard.sceneNumber + 1,
        location: sceneChange?.newLocation || 'Nowa lokacja',
        startedAt: new Date().toISOString(),
        people: [],
        findings: [],
        notes: [],
        isLocationExhausted: false,
      };
      changed = true;
    }
  }

  if (!changed) return { character, changed: false };

  dossier.lastUpdated = new Date().toISOString();
  return {
    character: {
      ...charWithDossier,
      journal: existingJournal,
      equipment: existingEquipment,
      investigatorDossier: dossier,
      sceneCards: existingSceneCards,
      activeScene,
    },
    changed: true,
  };
}

/**
 * Ekstrahuje tagi [DZIENNIK:], [NPC:], [PRZEDMIOT:], [LOKACJA:], [ZMIANA_SCENY:] oraz [KARTA_SCENY:]
 * z tekstu odpowiedzi MG, aktualizuje dossier, sceny i dopisuje wpisy do `character.journal`.
 */
export function appendJournalFromText(
  character: Character,
  rawText: string,
  messageId: string
): Character {
  const parsed = parseRevealedTags(rawText);
  const {journalTags:tags,npcTags,itemTags}=parsed;
  const locationEntry = buildLocationEntryFromText(parsed.text, messageId);
  const sceneChange = extractSceneChangeTag(rawText);
  const sceneCard = extractSceneCardTag(rawText);
  const locationExhausted = extractLocationExhaustedTag(rawText);

  if (
    tags.length === 0 &&
    npcTags.length === 0 &&
    itemTags.length === 0 &&
    !locationEntry &&
    !sceneChange &&
    !sceneCard &&
    !locationExhausted
  ) {
    return character;
  }

  const result = processCharacterJournalAndDossier(
    character,
    tags,
    npcTags,
    locationEntry,
    messageId,
    itemTags,
    sceneChange,
    sceneCard,
    undefined,
    locationExhausted
  );

  return result.character;
}

/**
 * Wariant party-aware (duet / Hot Seat): wpis `[DZIENNIK:@Imię:...]` trafia do
 * dziennika postaci wskazanej prefiksem `@Imię` (fallback: aktywna postać).
 */
export function appendJournalToParty(
  characters: Character[],
  activeCharacter: Character,
  rawText: string,
  messageId: string
): { characters: Character[]; activeCharacter: Character; changed: boolean } {
  const parsed = parseRevealedTags(rawText);
  const {journalTags:tags,npcTags,itemTags}=parsed;
  const locationEntry = buildLocationEntryFromText(parsed.text, messageId);
  const sceneChange = extractSceneChangeTag(rawText);
  const sceneCard = extractSceneCardTag(rawText);
  const locationExhausted = extractLocationExhaustedTag(rawText);

  if (
    tags.length === 0 &&
    npcTags.length === 0 &&
    itemTags.length === 0 &&
    !locationEntry &&
    !sceneChange &&
    !sceneCard &&
    !locationExhausted
  ) {
    return { characters, activeCharacter, changed: false };
  }

  // Mapuj tagi na postacie
  const tagsByChar = new Map<string, JournalTagEntry[]>();
  const npcTagsByChar = new Map<string, ExtractedNpcTag[]>();
  const itemTagsByChar = new Map<string, ExtractedItemTag[]>();

  tags.forEach((tag) => {
    const target = resolveRevealedRecipient(characters, tag.who, activeCharacter);
    if(!target)return;
    const list = tagsByChar.get(target.id) ?? [];
    list.push(tag);
    tagsByChar.set(target.id, list);
  });

  npcTags.forEach((npc) => {
    const target = resolveRevealedRecipient(characters, npc.who, activeCharacter);
    if(!target)return;
    const list = npcTagsByChar.get(target.id) ?? [];
    list.push(npc);
    npcTagsByChar.set(target.id, list);
  });

  itemTags.forEach((item) => {
    const target = resolveRevealedRecipient(characters, item.who, activeCharacter);
    if(!target)return;
    const list = itemTagsByChar.get(target.id) ?? [];
    list.push(item);
    itemTagsByChar.set(target.id, list);
  });

  let changedAny = false;
  const apply = (c: Character): Character => {
    const cTags = tagsByChar.get(c.id) ?? [];
    const cNpcs = npcTagsByChar.get(c.id) ?? [];
    const cItems = itemTagsByChar.get(c.id) ?? [];
    const cLoc = c.id === activeCharacter.id ? locationEntry : null;

    if (
      cTags.length === 0 &&
      cNpcs.length === 0 &&
      cItems.length === 0 &&
      !cLoc &&
      !sceneChange &&
      !sceneCard &&
      !locationExhausted
    ) {
      return c;
    }

    const res = processCharacterJournalAndDossier(
      c,
      cTags,
      cNpcs,
      cLoc,
      messageId,
      cItems,
      sceneChange,
      sceneCard,
      locationEntry?.title,
      locationExhausted
    );
    if (res.changed) changedAny = true;
    return res.character;
  };

  const nextCharacters = characters.map(apply);
  const nextActive =
    nextCharacters.find((c) => c.id === activeCharacter.id) ??
    apply(activeCharacter);

  return {
    characters: nextCharacters,
    activeCharacter: nextActive,
    changed: changedAny,
  };
}

/**
 * Rozpoznaje wektor dramatyczny M.I.C.E. poszlaki na podstawie tytułu i treści.
 */
export function inferClueMiceType(
  title: string,
  content: string
): import('@/lib/journal/dossier-types').MiceQuotientType {
  const text = `${title} ${content}`.toLowerCase();
  if (/miejsce|lokacja|pokój|piwnica|krypta|tunel|drzwi|ucieczk|droga|wyjście|uwięzi|room|place|location|escape|door|tunnel|cell/i.test(text)) {
    return 'milieu';
  }
  if (/postać|świadek|podejrzan|relacj|psycholog|lęk|sekret|moral|osoba|npc|character|suspect|witness|fear|secret|guilt/i.test(text)) {
    return 'character';
  }
  if (/rytuał|kataklizm|zagrożeni|besti|potwór|eksplozj|zegar|pożar|czas|event|ritual|threat|monster|beast|countdown|fire/i.test(text)) {
    return 'event';
  }
  return 'inquiry';
}
