import fs from 'fs';
import path from 'path';
import { InvestigatorBoardState, EvidenceNode } from '@/types/investigator-board';
import { JournalEntry } from '@/lib/types';

const JOURNALS_DIR = path.join(process.cwd(), 'data', 'journals');

function ensureDirectoryExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function getLocalJournalPath(userId: string, journalId: string): string {
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeJournalId = journalId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(JOURNALS_DIR, safeUserId, `${safeJournalId}.json`);
}

export function saveJournalLocally(userId: string, journalId: string, data: Record<string, unknown>): boolean {
  try {
    const userDir = path.join(JOURNALS_DIR, userId.replace(/[^a-zA-Z0-9_-]/g, '_'));
    ensureDirectoryExists(userDir);
    const filePath = getLocalJournalPath(userId, journalId);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Błąd zapisu lokalnego dziennika:', err);
    return false;
  }
}

export function loadJournalLocally(userId: string, journalId: string): Record<string, unknown> | null {
  try {
    const filePath = getLocalJournalPath(userId, journalId);
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Błąd odczytu lokalnego dziennika:', err);
    return null;
  }
}

/**
 * Konwertuje tradycyjne wpisy Dziennika (JournalEntry) na początkowe węzły Tablicy Badacza
 */
export function convertEntriesToBoardNodes(entries: JournalEntry[]): EvidenceNode[] {
  return entries.map((entry, idx) => {
    let nodeType: EvidenceNode['type'] = 'clue';
    const typeStr = (entry.type || '') as string;
    const catStr = ((entry as Record<string, unknown>).category || '') as string;
    if (typeStr === 'encyclopedia_character' || catStr === 'Spotkania') nodeType = 'suspect';
    else if (typeStr === 'encyclopedia_location' || catStr === 'Odkrycia') nodeType = 'location';
    else if (typeStr === 'encyclopedia_item' || catStr === 'Artefakty') nodeType = 'artifact';
    else if (typeStr === 'quest') nodeType = 'evidence';

    const col = idx % 4;
    const row = Math.floor(idx / 4);

    return {
      id: `node_${entry.id || idx}`,
      title: entry.title || 'Nieznany dowód',
      description: entry.content || '',
      type: nodeType,
      status: 'confirmed',
      position: { x: 50 + col * 260, y: 50 + row * 180 },
      tags: entry.tags || [],
      createdAt: entry.date || new Date().toISOString(),
    };
  });
}
