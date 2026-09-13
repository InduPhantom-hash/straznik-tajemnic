import fs from 'fs';
import os from 'os';
import path from 'path';
import { CampaignMemoryLedgerStore } from './ledger-store';
import { commitMemoryTurn, retainFailedTurn, retryMemoryTurn } from './commit-turn';
import type { CampaignMemoryScope } from './types';

let mockLedger: CampaignMemoryLedgerStore;
jest.mock('./ledger-store', () => ({
  ...jest.requireActual('./ledger-store'),
  getCampaignMemoryLedgerStore: () => mockLedger,
}));
jest.mock('./index-queue', () => ({ drainMemoryIndex: jest.fn(async () => {}) }));
const scope: CampaignMemoryScope = { schemaVersion: 1, campaignDefinitionId: 'c', playthroughId: 'run-test', adventureId: 'a', kind: 'custom' };
const turn = { scope, sessionId: 's', messageId: 'm', userText: 'Question', assistantText: 'Answer' };

describe('canonical commit and recoverable retry', () => {
  let directory: string;
  const originalDataDir = process.env.ZEW_DATA_DIR;
  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-commit-'));
    process.env.ZEW_DATA_DIR = directory;
    mockLedger = new CampaignMemoryLedgerStore(path.join(directory, 'ledger.sqlite3'));
  });
  afterEach(() => {
    mockLedger.close();
    fs.rmSync(directory, { recursive: true, force: true });
    if (originalDataDir === undefined) delete process.env.ZEW_DATA_DIR;
    else process.env.ZEW_DATA_DIR = originalDataDir;
  });

  it('acknowledges only durable entries and makes the retry idempotent', () => {
    const saved = commitMemoryTurn(turn);
    expect(saved).toEqual({ messageId: 'm', status: 'saved', revision: 2 });
    expect(mockLedger.list(scope)).toHaveLength(2);
    const token = retainFailedTurn(turn);
    expect(retryMemoryTurn(token)).toEqual(saved);
    expect(retryMemoryTurn(token)).toEqual(saved);
    expect(mockLedger.list(scope)).toHaveLength(2);
  });

  it('recovers the exact failed turn after losing the in-process retry map', () => {
    const token = retainFailedTurn(turn);
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const freshModule: typeof import('./commit-turn') = require('./commit-turn');
      expect(freshModule.retryMemoryTurn(token).status).toBe('saved');
    });
    expect(mockLedger.list(scope).map(e => e.text)).toEqual(['Question', 'Answer']);
  });

  it('propagates ledger errors instead of acknowledging an unsaved turn', () => {
    jest.spyOn(mockLedger, 'recordConversationTurn').mockImplementationOnce(() => { throw new Error('disk failure'); });
    expect(() => commitMemoryTurn(turn)).toThrow('disk failure');
    expect(mockLedger.list(scope)).toEqual([]);
  });

  it('rejects arbitrary retry paths', () => {
    expect(() => retryMemoryTurn('../ledger.sqlite3')).toThrow('INVALID_RETRY_TOKEN');
  });
});
