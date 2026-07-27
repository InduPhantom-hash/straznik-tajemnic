import fs from 'fs';
import path from 'path';

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

// Re-export z jednego źródła prawdy (SSOT) — nie duplikujemy logiki konwersji.
export { convertEntriesToBoardNodes } from '@/lib/journal/convert-entries';
