import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { getWritableDataDir } from '@/lib/paths';
import type {
  CampaignMemoryScope,
  CampaignMemorySearchResult,
  CampaignCompressionCheckpoint,
  CampaignCompressionFailureState,
  MemoryLedgerEntry,
  MemoryLedgerKind,
  MemoryLedgerRole,
  RevealedMemoryFact,
} from './types';

const DB_FILE = 'campaign-memory.sqlite3';

type LedgerRow = {
  id: string;
  playthrough_id: string;
  campaign_definition_id: string;
  adventure_id: string;
  memory_kind: MemoryLedgerKind;
  session_id: string;
  sequence_no: number;
  role: MemoryLedgerRole;
  text: string;
  tags_json: string;
  source_message_ids_json: string;
  revealed_at: string;
  active: number;
};

function parseJsonArray(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export class CampaignMemoryLedgerStore {
  private db: Database.Database;
  private ftsAvailable = true;

  constructor(filePath: string = path.join(getWritableDataDir(), 'memory', DB_FILE)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    this.db = new Database(filePath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.initializeSchema();
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS memory_entries (
        rowid INTEGER PRIMARY KEY AUTOINCREMENT,
        id TEXT NOT NULL UNIQUE,
        playthrough_id TEXT NOT NULL,
        campaign_definition_id TEXT NOT NULL,
        adventure_id TEXT NOT NULL,
        memory_kind TEXT NOT NULL,
        session_id TEXT NOT NULL,
        sequence_no INTEGER NOT NULL,
        role TEXT NOT NULL,
        text TEXT NOT NULL,
        tags_json TEXT NOT NULL DEFAULT '[]',
        source_message_ids_json TEXT NOT NULL DEFAULT '[]',
        revealed_at TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        UNIQUE(playthrough_id, session_id, sequence_no, role, memory_kind)
      );
      CREATE INDEX IF NOT EXISTS idx_memory_scope_sequence
        ON memory_entries(playthrough_id, sequence_no DESC);
      CREATE TABLE IF NOT EXISTS compression_checkpoints (
        id TEXT PRIMARY KEY,
        playthrough_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        source_start_sequence INTEGER NOT NULL,
        source_end_sequence INTEGER NOT NULL,
        source_message_ids_json TEXT NOT NULL DEFAULT '[]',
        summary TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_compression_scope_version
        ON compression_checkpoints(playthrough_id, version DESC);
      CREATE TABLE IF NOT EXISTS compression_failures (
        playthrough_id TEXT PRIMARY KEY,
        failure_count INTEGER NOT NULL,
        retry_after TEXT
      );
    `);
    const checkpointColumns = this.db.pragma('table_info(compression_checkpoints)') as Array<{ name: string }>;
    if (!checkpointColumns.some((column) => column.name === 'source_message_ids_json')) {
      this.db.exec("ALTER TABLE compression_checkpoints ADD COLUMN source_message_ids_json TEXT NOT NULL DEFAULT '[]'");
    }
    this.ensureFts();
  }

  private ensureFts(): void {
    try {
      this.db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS memory_entries_fts USING fts5(
          text,
          tags_json,
          content='memory_entries',
          content_rowid='rowid',
          tokenize='unicode61 remove_diacritics 2'
        );
        CREATE TRIGGER IF NOT EXISTS memory_entries_ai AFTER INSERT ON memory_entries BEGIN
          INSERT INTO memory_entries_fts(rowid, text, tags_json)
          VALUES (new.rowid, new.text, new.tags_json);
        END;
        CREATE TRIGGER IF NOT EXISTS memory_entries_ad AFTER DELETE ON memory_entries BEGIN
          INSERT INTO memory_entries_fts(memory_entries_fts, rowid, text, tags_json)
          VALUES ('delete', old.rowid, old.text, old.tags_json);
        END;
        CREATE TRIGGER IF NOT EXISTS memory_entries_au AFTER UPDATE ON memory_entries BEGIN
          INSERT INTO memory_entries_fts(memory_entries_fts, rowid, text, tags_json)
          VALUES ('delete', old.rowid, old.text, old.tags_json);
          INSERT INTO memory_entries_fts(rowid, text, tags_json)
          VALUES (new.rowid, new.text, new.tags_json);
        END;
      `);
      this.ftsAvailable = true;
      this.setMeta('fts_stale', '0');
    } catch (error) {
      this.ftsAvailable = false;
      this.setMeta('fts_stale', '1');
      console.warn('Campaign memory FTS unavailable, using LIKE fallback:', error);
    }
  }

  private setMeta(key: string, value: string): void {
    this.db.prepare(`
      INSERT INTO memory_meta(key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, value);
  }

  append(entry: MemoryLedgerEntry): boolean {
    const insert = () => this.db.prepare(`
      INSERT OR IGNORE INTO memory_entries (
        id, playthrough_id, campaign_definition_id, adventure_id, memory_kind,
        session_id, sequence_no, role, text, tags_json,
        source_message_ids_json, revealed_at, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.id,
      entry.scope.playthroughId,
      entry.scope.campaignDefinitionId,
      entry.scope.adventureId,
      entry.kind,
      entry.sessionId,
      entry.sequence,
      entry.role,
      entry.text,
      JSON.stringify(entry.tags),
      JSON.stringify(entry.sourceMessageIds),
      entry.revealedAt,
      entry.active ? 1 : 0
    );
    let result: Database.RunResult;
    try {
      result = insert();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/fts|memory_entries_fts|malformed/i.test(message)) throw error;
      // The canonical table must remain writable even if a derived trigger or
      // virtual table is corrupt. Remove only the derived write hooks and retry.
      this.db.exec(`
        DROP TRIGGER IF EXISTS memory_entries_ai;
        DROP TRIGGER IF EXISTS memory_entries_ad;
        DROP TRIGGER IF EXISTS memory_entries_au;
      `);
      this.ftsAvailable = false;
      this.setMeta('fts_stale', '1');
      console.warn('Campaign memory FTS write failed, preserving canonical ledger:', error);
      result = insert();
    }
    return result.changes > 0;
  }

  appendMany(entries: MemoryLedgerEntry[]): number {
    const append = this.db.transaction((items: MemoryLedgerEntry[]) => {
      let inserted = 0;
      for (const entry of items) inserted += this.append(entry) ? 1 : 0;
      return inserted;
    });
    return append(entries);
  }

  recordConversationTurn(input: {
    scope: CampaignMemoryScope;
    sessionId: string;
    messageId: string;
    userMessageId?: string;
    userText: string;
    assistantText: string;
    revealedAt?: string;
    facts?: RevealedMemoryFact[];
  }): number {
    return this.db.transaction(() => {
      const nextSequence = (
        this.db.prepare(
          'SELECT COALESCE(MAX(sequence_no), 0) + 1 AS next_sequence FROM memory_entries WHERE playthrough_id = ?'
        ).get(input.scope.playthroughId) as { next_sequence: number }
      ).next_sequence;
      const revealedAt = input.revealedAt ?? new Date().toISOString();
      const entries: MemoryLedgerEntry[] = [{
        id: `${input.messageId}:user`,
        scope: input.scope,
        sessionId: input.sessionId,
        sequence: nextSequence,
        role: 'user',
        kind: 'conversation',
        text: input.userText,
        tags: [],
        sourceMessageIds: [input.userMessageId ?? `${input.messageId}:user`],
        revealedAt,
        active: true,
      }];
      if (input.assistantText.trim()) {
        entries.push({
          id: `${input.messageId}:assistant`,
          scope: input.scope,
          sessionId: input.sessionId,
          sequence: nextSequence + entries.length,
          role: 'assistant',
          kind: 'conversation',
          text: input.assistantText,
          tags: [],
          sourceMessageIds: [input.messageId],
          revealedAt,
          active: true,
        });
      }
      for (const [index, fact] of (input.facts ?? []).entries()) {
        const text = fact.text.trim();
        if (!text) continue;
        entries.push({
          id: `${input.messageId}:${fact.kind}:${index}`,
          scope: input.scope,
          sessionId: input.sessionId,
          sequence: nextSequence + entries.length,
          role: 'assistant',
          kind: fact.kind,
          text,
          tags: fact.tags ?? [],
          sourceMessageIds: [input.messageId],
          revealedAt,
          active: true,
        });
      }
      let inserted = 0;
      for (const entry of entries) inserted += this.append(entry) ? 1 : 0;
      return inserted;
    })();
  }

  search(scope: CampaignMemoryScope, query: string, limit = 20): CampaignMemorySearchResult[] {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const tokens = trimmed.match(/[\p{L}\p{N}]+/gu)?.slice(0, 12) ?? [];
    const ftsQuery = tokens.map((token) => `"${token}"`).join(' OR ');
    if (this.ftsAvailable && ftsQuery) {
      try {
        const rows = this.db.prepare(`
          SELECT e.*, bm25(memory_entries_fts) AS rank
          FROM memory_entries_fts
          JOIN memory_entries e ON e.rowid = memory_entries_fts.rowid
          WHERE memory_entries_fts MATCH ? AND e.playthrough_id = ?
          ORDER BY rank ASC, e.sequence_no DESC
          LIMIT ?
        `).all(ftsQuery, scope.playthroughId, limit) as Array<LedgerRow & { rank: number }>;
        return rows.map((row) => this.toSearchResult(row, 1 / (1 + Math.max(0, row.rank)), 'fts'));
      } catch (error) {
        this.ftsAvailable = false;
        this.setMeta('fts_stale', '1');
        console.warn('Campaign memory FTS query failed, using LIKE fallback:', error);
      }
    }

    const likeTokens = tokens.length > 0 ? tokens.slice(0, 8) : [trimmed];
    const clauses = likeTokens.map(() => `text LIKE ? ESCAPE '\\'`).join(' OR ');
    const patterns = likeTokens.map((token) => `%${token.replace(/[\\%_]/g, '\\$&')}%`);
    const rows = this.db.prepare(`
      SELECT * FROM memory_entries
      WHERE playthrough_id = ? AND (${clauses})
      ORDER BY sequence_no DESC
      LIMIT ?
    `).all(scope.playthroughId, ...patterns, limit) as LedgerRow[];
    return rows.map((row, index) => this.toSearchResult(row, 1 / (index + 1), 'like'));
  }

  rebuildFts(): boolean {
    try {
      // FTS is a derived index. Recreate the complete FTS schema so recovery
      // also works after a corrupt or manually removed virtual table.
      this.db.exec(`
        DROP TRIGGER IF EXISTS memory_entries_ai;
        DROP TRIGGER IF EXISTS memory_entries_ad;
        DROP TRIGGER IF EXISTS memory_entries_au;
        DROP TABLE IF EXISTS memory_entries_fts;
      `);
      this.ensureFts();
      if (!this.ftsAvailable) return false;
      this.db.exec(`INSERT INTO memory_entries_fts(memory_entries_fts) VALUES ('rebuild')`);
      this.ftsAvailable = true;
      this.setMeta('fts_stale', '0');
      return true;
    } catch (error) {
      this.ftsAvailable = false;
      this.setMeta('fts_stale', '1');
      console.warn('Campaign memory FTS rebuild failed:', error);
      return false;
    }
  }

  list(scope: CampaignMemoryScope): MemoryLedgerEntry[] {
    const rows = this.db.prepare(`
      SELECT * FROM memory_entries
      WHERE playthrough_id = ?
      ORDER BY sequence_no ASC, rowid ASC
    `).all(scope.playthroughId) as LedgerRow[];
    return rows.map((row) => this.toEntry(row, scope));
  }

  getLatestCheckpoint(playthroughId: string): CampaignCompressionCheckpoint | null {
    const row = this.db.prepare(`
      SELECT * FROM compression_checkpoints
      WHERE playthrough_id = ? ORDER BY version DESC LIMIT 1
    `).get(playthroughId) as {
      id: string;
      playthrough_id: string;
      version: number;
      source_start_sequence: number;
      source_end_sequence: number;
      source_message_ids_json: string;
      summary: string;
      created_at: string;
    } | undefined;
    if (!row) return null;
    const failure = this.getCompressionFailure(playthroughId);
    return {
      id: row.id,
      playthroughId: row.playthrough_id,
      version: row.version,
      sourceStartSequence: row.source_start_sequence,
      sourceEndSequence: row.source_end_sequence,
      sourceMessageIds: parseJsonArray(row.source_message_ids_json),
      summary: row.summary,
      createdAt: row.created_at,
      failureCount: failure.failureCount,
      retryAfter: failure.retryAfter,
    };
  }

  saveCheckpoint(input: Omit<CampaignCompressionCheckpoint, 'failureCount' | 'retryAfter'>): void {
    this.db.transaction(() => {
      this.db.prepare(`
        INSERT OR IGNORE INTO compression_checkpoints (
          id, playthrough_id, version, source_start_sequence,
          source_end_sequence, source_message_ids_json, summary, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        input.id,
        input.playthroughId,
        input.version,
        input.sourceStartSequence,
        input.sourceEndSequence,
        JSON.stringify(input.sourceMessageIds),
        input.summary,
        input.createdAt
      );
      const sourceIds = new Set(input.sourceMessageIds);
      if (sourceIds.size > 0) {
        const candidates = this.db.prepare(`
          SELECT id, source_message_ids_json FROM memory_entries WHERE playthrough_id = ?
        `).all(input.playthroughId) as Array<{ id: string; source_message_ids_json: string }>;
        const entryIds = candidates
          .filter((entry) => parseJsonArray(entry.source_message_ids_json).some((id) => sourceIds.has(id)))
          .map((entry) => entry.id);
        if (entryIds.length > 0) {
          const placeholders = entryIds.map(() => '?').join(', ');
          this.db.prepare(`UPDATE memory_entries SET active = 0 WHERE id IN (${placeholders})`).run(...entryIds);
        }
      }
      this.clearCompressionFailure(input.playthroughId);
    })();
  }

  getCompressionFailure(playthroughId: string): CampaignCompressionFailureState {
    const row = this.db.prepare(`
      SELECT failure_count, retry_after FROM compression_failures WHERE playthrough_id = ?
    `).get(playthroughId) as { failure_count: number; retry_after: string | null } | undefined;
    return {
      playthroughId,
      failureCount: row?.failure_count ?? 0,
      retryAfter: row?.retry_after ?? null,
    };
  }

  recordCompressionFailure(playthroughId: string, now = Date.now()): CampaignCompressionFailureState {
    const previous = this.getCompressionFailure(playthroughId);
    const failureCount = previous.failureCount + 1;
    const delays = [60, 300, 900];
    const delaySeconds = delays[Math.min(failureCount - 1, delays.length - 1)];
    const retryAfter = new Date(now + delaySeconds * 1000).toISOString();
    this.db.prepare(`
      INSERT INTO compression_failures(playthrough_id, failure_count, retry_after)
      VALUES (?, ?, ?)
      ON CONFLICT(playthrough_id) DO UPDATE SET
        failure_count = excluded.failure_count,
        retry_after = excluded.retry_after
    `).run(playthroughId, failureCount, retryAfter);
    return { playthroughId, failureCount, retryAfter };
  }

  clearCompressionFailure(playthroughId: string): void {
    this.db.prepare('DELETE FROM compression_failures WHERE playthrough_id = ?').run(playthroughId);
  }

  close(): void {
    this.db.close();
  }

  private toEntry(row: LedgerRow, scope: CampaignMemoryScope): MemoryLedgerEntry {
    return {
      id: row.id,
      scope,
      sessionId: row.session_id,
      sequence: row.sequence_no,
      role: row.role,
      kind: row.memory_kind,
      text: row.text,
      tags: parseJsonArray(row.tags_json),
      sourceMessageIds: parseJsonArray(row.source_message_ids_json),
      revealedAt: row.revealed_at,
      active: row.active === 1,
    };
  }

  private toSearchResult(
    row: LedgerRow,
    score: number,
    source: 'fts' | 'like'
  ): CampaignMemorySearchResult {
    return {
      id: row.id,
      text: row.text,
      score,
      kind: row.memory_kind,
      role: row.role,
      sequence: row.sequence_no,
      tags: parseJsonArray(row.tags_json),
      source,
    };
  }
}

let singleton: CampaignMemoryLedgerStore | null = null;

export function getCampaignMemoryLedgerStore(): CampaignMemoryLedgerStore {
  if (!singleton) singleton = new CampaignMemoryLedgerStore();
  return singleton;
}

export function _resetCampaignMemoryLedgerStore(): void {
  singleton?.close();
  singleton = null;
}
