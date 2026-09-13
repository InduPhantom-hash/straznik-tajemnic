import { getCampaignMemoryLedgerStore } from './ledger-store';
import type { CampaignMemoryScope } from './types';
import { embeddingService, getEmbeddingDimensions } from '@/lib/embedding-service';
import { localVectorStore } from '@/lib/vector-db/local-vector-store';
import { LOCAL_RAG_NAMESPACES } from '@/lib/vector-db/vector-types';
import { embeddingSignature } from '@/lib/vector-db/embedding-signature';
export { embeddingSignature } from '@/lib/vector-db/embedding-signature';

const running = new Set<string>();
/** Recoverable derived work: canonical text is available even if this process exits. */
export async function drainMemoryIndex(scope: CampaignMemoryScope): Promise<void> {
  if (running.has(scope.playthroughId)) return;
  running.add(scope.playthroughId);
  try {
    const ledger = getCampaignMemoryLedgerStore();
    const signature = embeddingSignature();
    ledger.ensureIndexSignature(scope, signature);
    for (const entry of ledger.pendingIndexEntries(scope)) {
      try {
        const values = await embeddingService.generateEmbedding(entry.text,'RETRIEVAL_DOCUMENT');
        if (!values || values.length !== getEmbeddingDimensions() || values.some(v => !Number.isFinite(v)) || signature !== embeddingSignature()) { ledger.finishIndexJob(entry.id,false); break; }
        await localVectorStore.upsert(LOCAL_RAG_NAMESPACES.campaign(scope.playthroughId), [{
          id:entry.id,values,text:entry.text,metadata:{contentType:entry.kind,summary:entry.text.slice(0,200),
            gameTimestamp:'',realTimestamp:entry.revealedAt,tags:JSON.stringify(entry.tags),
            sessionId:entry.sessionId,messageRange:'',embeddingSignature:signature,
            campaignDefinitionId:scope.campaignDefinitionId},
        }]);
        ledger.finishIndexJob(entry.id,true);
      } catch { ledger.finishIndexJob(entry.id,false); break; }
    }
  } finally { running.delete(scope.playthroughId); }
}
