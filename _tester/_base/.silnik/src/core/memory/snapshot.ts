import type { Character } from '@/lib/types';
import { isCampaignMemoryScope } from './campaign-scope';
import type { CampaignMemoryScope, CampaignMemorySnapshot, MemoryLedgerEntry } from './types';
import { extractRevealedTurn } from './revealed-facts';
import { isClueEntry, isNpcDossierEntry, isLocationDossierEntry } from '@/lib/journal/dossier-types';

export function validateMemorySnapshot(value: unknown): asserts value is CampaignMemorySnapshot {
  if (!value || typeof value !== 'object') throw new Error('Invalid memory snapshot');
  const s = value as CampaignMemorySnapshot;
  if (s.schemaVersion !== 1 || !isCampaignMemoryScope(s.scope) || !Number.isSafeInteger(s.revision) || s.revision < 0 || !Array.isArray(s.entries) || !Array.isArray(s.checkpoints)) throw new Error('Invalid memory snapshot schema');
  const ids = new Set<string>();
  const sequences = new Set<number>();
  const validKinds = new Set(['conversation','clue','decision','npc','location','consequence','summary']);
  for (const e of s.entries) {
    if (!e || !isCampaignMemoryScope(e.scope) || e.scope.playthroughId !== s.scope.playthroughId || e.scope.campaignDefinitionId !== s.scope.campaignDefinitionId || typeof e.id !== 'string' || !e.id || ids.has(e.id) || !Number.isSafeInteger(e.sequence) || e.sequence < 1 || e.sequence > s.revision || sequences.has(e.sequence) || typeof e.text !== 'string' || typeof e.sessionId !== 'string' || !validKinds.has(e.kind) || !['user','assistant','system'].includes(e.role) || !Array.isArray(e.sourceMessageIds) || !e.sourceMessageIds.every(id=>typeof id === 'string') || !Array.isArray(e.tags) || !e.tags.every(t=>typeof t === 'string') || typeof e.active !== 'boolean' || typeof e.revealedAt !== 'string') throw new Error('Invalid memory snapshot entry');
    if (e.status && !['confirmed','unconfirmed','disproven','superseded'].includes(e.status)) throw new Error('Invalid fact status');
    for (const list of [e.recipients,e.relatedEntityIds]) if (list !== undefined && (!Array.isArray(list) || !list.every(x=>typeof x === 'string'))) throw new Error('Invalid fact references');
    ids.add(e.id); sequences.add(e.sequence);
  }
  const messageIds = new Set(s.entries.flatMap(e=>e.sourceMessageIds));
  for (const c of s.checkpoints) {
    if (!c || c.playthroughId !== s.scope.playthroughId || typeof c.id !== 'string' || typeof c.summary !== 'string' || !Number.isSafeInteger(c.version) || !Number.isSafeInteger(c.sourceStartSequence) || !Number.isSafeInteger(c.sourceEndSequence) || c.sourceStartSequence < 0 || c.sourceEndSequence < c.sourceStartSequence || !Array.isArray(c.sourceMessageIds) || !c.sourceMessageIds.every(id=>typeof id === 'string' && messageIds.has(id)) || typeof c.createdAt !== 'string') throw new Error('Invalid memory checkpoint');
  }
}

/** Old saves carry the evidence themselves; never read future server history. */
export function buildLegacySnapshot(scope: CampaignMemoryScope, messages: Array<{id:string;role:string;content:string}>, characters: Character[] = [], activeCharacterId?: string): CampaignMemorySnapshot {
  const entries: MemoryLedgerEntry[] = [];
  for (const message of messages) {
    if (!message || typeof message.id !== 'string' || typeof message.content !== 'string' || !['user','assistant'].includes(message.role)) continue;
    const revealed = message.role === 'assistant' ? extractRevealedTurn(message.content,message.id,characters,characters.find(c => c.id === activeCharacterId) ?? characters[0]) : {narrative:message.content,facts:[]};
    if (revealed.narrative.trim()) entries.push({id:`legacy:${message.id}`,scope,sessionId:scope.playthroughId,sequence:entries.length+1,role:message.role === 'user'?'user':'assistant',kind:'conversation',text:revealed.narrative,tags:[],sourceMessageIds:[message.id],revealedAt:new Date(0).toISOString(),active:true});
    for (const [i,fact] of revealed.facts.entries()) entries.push({...fact,id:`legacy:${message.id}:fact:${i}`,scope,sessionId:scope.playthroughId,sequence:entries.length+1,role:'assistant',text:fact.text,tags:fact.tags??[],sourceMessageIds:[message.id],revealedAt:new Date(0).toISOString(),active:true});
  }
  // A legacy export may already have cleaned its chat tags. Its revealed
  // Dossier is still evidence, including refutations, but never Keeper secrets.
  for (const character of characters) {
    if (!character || typeof character.id !== 'string') continue;
    const dossier = character.investigatorDossier;
    const add = (entityId: string, fact: Pick<MemoryLedgerEntry, 'kind' | 'text'> & Partial<MemoryLedgerEntry>) => {
      entries.push({ ...fact, id: `legacy:dossier:${character.id}:${fact.kind}:${entityId}`, entityId,
        scope, sessionId: scope.playthroughId, sequence: entries.length + 1,
        role: 'assistant', kind: fact.kind, text: fact.text, tags: fact.tags ?? [],
        recipients: [character.id], sourceMessageIds: [],
        revealedAt: new Date(0).toISOString(), active: true });
    };
    for (const clue of Array.isArray(dossier?.clues) ? dossier.clues.filter(isClueEntry) : []) {
      if (clue.discoveryStatus === 'unrevealed' || clue.epistemicLayer === 'keeper_truth') continue;
      add(clue.id, { kind: 'clue', text: `${clue.title}: ${clue.description}`, status: clue.status,
        sourceJournalEntryId: clue.sourceJournalEntryId, supersededBy: clue.supersededBy,
        provenance: clue.provenance, relatedEntityIds: [clue.sourceNpcId, clue.foundLocationId,
          ...(clue.linkedNodeIds ?? [])].filter((id): id is string => typeof id === 'string') });
    }
    for (const npc of Array.isArray(dossier?.npcs) ? dossier.npcs.filter(isNpcDossierEntry) : []) {
      add(npc.id, { kind: 'npc', text: `${npc.name}: ${npc.firstImpression ?? ''}`,
        status: 'confirmed', provenance: 'observed', sourceJournalEntryId: npc.sourceJournalEntryId });
    }
    for (const location of Array.isArray(dossier?.locations) ? dossier.locations.filter(isLocationDossierEntry) : []) {
      if (location.searchStatus === 'unvisited') continue;
      add(location.id, { kind: 'location', text: `${location.name}: ${location.description ?? ''}`,
        status: 'confirmed', provenance: 'observed', sourceJournalEntryId: location.sourceJournalEntryId });
    }
  }
  return {schemaVersion:1,scope,revision:entries.length,entries,checkpoints:[]};
}
