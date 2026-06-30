/**
 * Cloud Context — shared types
 */

import type { KeyFact } from '../game-context';
import type { MessageIllustration } from '../types';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  illustrations?: MessageIllustration[];
  generatedImages?: string[];
}

export interface CloudContextChunk {
  id: string;
  userId: string;
  sessionId: string;
  chunkIndex: number;
  messages: Message[];
  summary?: string;
  keyFacts: Partial<KeyFact>[];
  mentionedNPCs: string[];
  mentionedLocations: string[];
  timestamp: Date;
  messageRange: { start: number; end: number };
  isArchived: boolean;
}

export interface CloudContextMetadata {
  userId: string;
  sessionId: string;
  totalChunks: number;
  totalMessages: number;
  lastChunkIndex: number;
  lastUpdated: Date;
  archivedChunks: number[];
}

export const GCS_PREFIX = 'context';
export const MEMORY_INDEX_FILE = 'memory_index.json';
