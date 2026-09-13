import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { getWritableDataDir } from '@/lib/paths';
import { getCampaignMemoryLedgerStore } from './ledger-store';
import { drainMemoryIndex } from './index-queue';
import type { MemoryCommit } from './types';

type Turn = Parameters<ReturnType<typeof getCampaignMemoryLedgerStore>['recordConversationTurn']>[0];
const pending = new Map<string, {turn:Turn;expires:number}>();
const retryFile = (token: string) => {
  if (!/^[a-f0-9-]{36}$/i.test(token)) throw new Error('INVALID_RETRY_TOKEN');
  return path.join(getWritableDataDir(), 'memory', 'pending-turns', `${token}.json`);
};

export function commitMemoryTurn(turn: Turn): MemoryCommit {
  const ledger = getCampaignMemoryLedgerStore();
  ledger.recordConversationTurn(turn);
  const revision = ledger.revision(turn.scope);
  void drainMemoryIndex(turn.scope).catch(()=>{});
  return {messageId:turn.messageId,status:'saved',revision};
}

export function retainFailedTurn(turn:Turn): string {
  for (const [id,item] of pending) if (item.expires < Date.now()) pending.delete(id);
  if (pending.size >= 100) pending.delete(pending.keys().next().value!);
  const token = randomUUID();
  const item = {turn,expires:Date.now()+30*60_000};
  pending.set(token,item);
  // A SQLite-specific failure should survive a process restart. If the entire
  // disk is unavailable, keep the in-process copy and still report failure.
  const file = retryFile(token);
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(`${file}.tmp`, JSON.stringify(item), { flag: 'wx', mode: 0o600 });
    fs.renameSync(`${file}.tmp`, file);
  } catch (error) {
    console.warn('Could not persist memory retry; retry is available in this process only:', error);
  }
  return token;
}

export function retryMemoryTurn(token:string): MemoryCommit {
  const file = retryFile(token);
  let item = pending.get(token);
  if (!item && fs.existsSync(file)) item = JSON.parse(fs.readFileSync(file, 'utf8')) as {turn:Turn;expires:number};
  if (!item || item.expires < Date.now()) throw new Error('MEMORY_RETRY_EXPIRED');
  // Keep the token until expiry: a lost HTTP response can safely be retried.
  return commitMemoryTurn(item.turn);
}
