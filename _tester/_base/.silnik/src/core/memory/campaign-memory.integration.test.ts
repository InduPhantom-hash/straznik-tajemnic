import fs from 'fs';
import os from 'os';
import path from 'path';
import { CampaignMemoryLedgerStore } from './ledger-store';
import { searchCampaignMemory } from './retrieval';
import { embeddingService } from '@/lib/embedding-service';
import type { CampaignMemoryScope } from './types';

jest.mock('@/lib/embedding-service', () => ({ embeddingService: { generateEmbedding: jest.fn() } }));

const peru: CampaignMemoryScope = {
  schemaVersion: 1,
  campaignDefinitionId: 'masks-of-nyarlathotep',
  playthroughId: 'run-shared',
  adventureId: 'peru',
  kind: 'official',
};

describe('campaign memory across adventures', () => {
  it('recalls a revealed fact in the same playthrough and hides it from another run', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-integration-'));
    const ledger = new CampaignMemoryLedgerStore(path.join(directory, 'memory.sqlite3'));
    jest.mocked(embeddingService.generateEmbedding).mockResolvedValue(null);
    ledger.recordConversationTurn({
      scope: peru,
      sessionId: 'peru-session',
      messageId: 'peru-turn',
      userText: 'Czytam dokumenty Eliasa.',
      assistantText: 'Elias oznaczył londyński Hotel Victoria czerwonym atramentem.',
      facts: [{ kind: 'clue', text: 'Trop Eliasa: Hotel Victoria w Londynie' }],
    });

    const london = { ...peru, adventureId: 'london' };
    const sameRun = await searchCampaignMemory(london, 'Elias Hotel Victoria', ledger);
    const anotherRun = await searchCampaignMemory(
      { ...london, playthroughId: 'run-isolated' },
      'Elias Hotel Victoria',
      ledger
    );
    expect(sameRun.promptSection).toContain('Hotel Victoria');
    expect(anotherRun.results).toHaveLength(0);

    ledger.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });
});
