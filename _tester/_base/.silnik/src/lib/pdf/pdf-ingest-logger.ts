import fs from 'fs';
import path from 'path';
import { getWritableDataDir } from '@/lib/paths';

/**
 * Zapisuje zdarzenia i postęp parsowania PDF do rejestru logów sesyjnych logs/pdf-ingest.log
 * oraz do aktywnego pliku sesji procesu supervisora (ZEW_SESSION_LOG_FILE).
 */
export function appendPdfIngestLog(message: string): void {
  try {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [PDF-INGEST] ${message}\n`;

    // 1. Zapis do pliku sesyjnego supervisora (jeśli dostępny)
    const sessionLog = process.env.ZEW_SESSION_LOG_FILE;
    if (sessionLog) {
      try {
        fs.appendFileSync(sessionLog, line, 'utf-8');
      } catch {
        // Ignoruj błąd zapisu do pliku sesji
      }
    }

    // 2. Dedykowany log ingest w logs/
    const logsDir = process.env.ZEW_LOGS_DIR || path.join(getWritableDataDir(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const ingestLogPath = path.join(logsDir, 'pdf-ingest.log');
    fs.appendFileSync(ingestLogPath, line, 'utf-8');
  } catch (err) {
    console.warn('⚠️ Nie udało się zapisać do pliku pdf-ingest.log:', err);
  }
}
