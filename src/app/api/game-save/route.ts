import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import FullGameSaveManager, {
  FullGameSave,
} from '@/lib/full-game-save-manager';
import { resolveUserId } from '@/lib/auth-user';
import { generateTraceId, startTimer, logApiEvent } from '@/lib/telemetry';
import { getWritableDataDir } from '@/lib/paths';

// WERSJA LOKALNA (zew-app-local): save'y gry trzymane na dysku zamiast w
// Google Cloud Storage. Struktura: data/saves/{userId}/{saveId}/
//   - save.json  - pełny FullGameSave (compressSave = JSON.stringify)
//   - meta.json  - lekkie metadane do szybkiej listy (bez parsowania całego save'u)
// Świadomie BEZ guardu produkcyjnego: to localhost, FS jest zapisywalny także
// gdy gra leci przez `npm start` (NODE_ENV=production lokalnie != Vercel).
const SAVES_ROOT = path.join(getWritableDataDir(), 'saves');

interface SaveMeta {
  id: string;
  name: string;
  createdAt: string;
  lastUpdated: string;
  userId: string;
  messageCount: number;
  imageCount: number;
  size: number;
  formattedSize: string;
  localPath: string;
  // === Bogata karta katalogu (makieta .agent/design/15) - wszystko opcjonalne,
  // by stare meta.json bez tych pól wciąż się parsowały. ===
  characterName?: string;
  thumbnail?: string; // URL ostatniej ilustracji (miniatura)
  sceneFragment?: string; // fragment ostatniej sceny (oczyszczony z tagów)
  chapterTitle?: string; // tytuł przygody / rozdziału z pdfMemory
  hp?: number;
  maxHp?: number;
  san?: number;
  maxSan?: number;
  durationMinutes?: number; // czas gry (sessionMetadata.duration)
}

/** Maks. długość miniatury w meta.json - chroni listę przed gigantycznym base64. */
const MAX_THUMBNAIL_CHARS = 1_500_000;

/**
 * Wyciąga z pełnego save'u pola na bogatą kartę katalogu (makieta 15).
 * Wszystkie pola opcjonalne - brak danych => pomijamy, karta degraduje się gracefully.
 */
function buildRichMeta(fullSave: FullGameSave): Partial<SaveMeta> {
  const rich: Partial<SaveMeta> = {};

  // Postać: aktywna (po activeCharacterId) lub pierwsza w katalogu.
  const active =
    fullSave.characters?.find((c) => c.id === fullSave.activeCharacterId) ||
    fullSave.characters?.[0];
  if (active) {
    rich.characterName = active.name;
    if (typeof active.hp === 'number') rich.hp = active.hp;
    if (typeof active.maxHp === 'number') rich.maxHp = active.maxHp;
    if (typeof active.san === 'number') rich.san = active.san;
    if (typeof active.maxSan === 'number') rich.maxSan = active.maxSan;
  }

  // Miniatura: ostatnia ilustracja (preferuj typ 'illustration', potem dowolna).
  const imgs = fullSave.images || [];
  const lastImg =
    [...imgs].reverse().find((i) => i.type === 'illustration' && i.url) ||
    [...imgs].reverse().find((i) => i.url);
  if (lastImg?.url && lastImg.url.length <= MAX_THUMBNAIL_CHARS) {
    rich.thumbnail = lastImg.url;
  }

  // Fragment sceny: ostatnia wiadomość MG (assistant), oczyszczona z tagów
  // [TEST:]/[DZIENNIK:]/itp. i markdown-obrazów, przycięta.
  const lastAssistant = [...(fullSave.messages || [])]
    .reverse()
    .find((m) => m.role === 'assistant' && m.content);
  if (lastAssistant?.content) {
    const cleaned = lastAssistant.content
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // markdown obrazy
      .replace(/\[[^\]]*\]/g, '') // tagi protokołu MG
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned) rich.sceneFragment = cleaned.slice(0, 160);
  }

  // Rozdział/przygoda: nazwa pliku przygody (bez .pdf), fallback nazwa zasad.
  const pdf = fullSave.pdfMemory || {};
  const chapter = pdf.adventureFileName || pdf.rulesFileName;
  if (chapter) rich.chapterTitle = chapter.replace(/\.pdf$/i, '').trim();

  // Czas gry: minuty sesji.
  if (typeof fullSave.sessionMetadata?.duration === 'number') {
    rich.durationMinutes = fullSave.sessionMetadata.duration;
  }

  return rich;
}

/**
 * Sanityzacja ID (saveId / userId) - blokada path traversal.
 * Tylko znaki alfanumeryczne, myślnik, podkreślenie.
 */
function sanitizeId(id: string, label: string): string {
  if (!id || typeof id !== 'string') throw new Error(`Nieprawidłowy ${label}`);
  const trimmed = id.trim();
  if (!/^[a-zA-Z0-9-_]+$/.test(trimmed)) {
    throw new Error(`${label} zawiera niedozwolone znaki`);
  }
  if (trimmed.length > 128) throw new Error(`${label} jest zbyt długi`);
  return trimmed;
}

function getSaveDir(userId: string, saveId: string): string {
  return path.join(
    SAVES_ROOT,
    sanitizeId(userId, 'userId'),
    sanitizeId(saveId, 'saveId')
  );
}

function writeMeta(dir: string, meta: SaveMeta): void {
  fs.writeFileSync(
    path.join(dir, 'meta.json'),
    JSON.stringify(meta, null, 2),
    'utf-8'
  );
}

/**
 * POST - Zapisz pełny save gry na dysk lokalny
 */
export async function POST(request: NextRequest) {
  // IND-257: telemetria zapisu gry. /api/game-save w ogóle nie był logowany, więc
  // liczby/rozmiaru save'ów nie dało się mierzyć z telemetry.jsonl (raport
  // playtestu). provider 'storage' (I/O na dysk, nie AI → costUsd 0). traceId/timer
  // przed try, by catch też mógł zalogować błąd. Walidacja 400 (brak name) pominięta.
  const traceId = generateTraceId();
  const timer = startTimer();
  const logSave = (
    status: number,
    result: 'success' | 'error',
    opts: {
      errorMsg?: string;
      meta?: Record<string, string | number | boolean | null>;
    } = {}
  ) =>
    logApiEvent({
      traceId,
      endpoint: '/api/game-save',
      provider: 'storage',
      status,
      durationMs: timer.elapsed(),
      result,
      costUsd: 0,
      errorMsg: opts.errorMsg,
      meta: opts.meta,
    }).catch(() => {});

  try {
    const saveData = await request.json();

    if (!saveData || !saveData.name) {
      return NextResponse.json(
        { error: "Nazwa save'u jest wymagana" },
        { status: 400 }
      );
    }

    const sessionCost = saveData.sessionCost || 0;
    const fullSave = FullGameSaveManager.createFullSave({
      ...saveData,
      sessionCost,
    });

    const userId = await resolveUserId(fullSave.userId || 'local');
    fullSave.userId = userId;

    const dir = getSaveDir(userId, fullSave.id);
    fs.mkdirSync(dir, { recursive: true });

    const saveJson = FullGameSaveManager.compressSave(fullSave);
    fs.writeFileSync(path.join(dir, 'save.json'), saveJson, 'utf-8');

    const saveSize = FullGameSaveManager.getSaveSize(fullSave);
    const localPath = path.join(
      'data',
      'saves',
      userId,
      fullSave.id,
      'save.json'
    );

    writeMeta(dir, {
      id: fullSave.id,
      name: fullSave.name,
      createdAt: fullSave.createdAt,
      lastUpdated: fullSave.createdAt,
      userId: fullSave.userId,
      messageCount: fullSave.sessionMetadata.messageCount,
      imageCount: fullSave.sessionMetadata.imageCount,
      size: saveSize,
      formattedSize: FullGameSaveManager.formatSize(saveSize),
      localPath,
      ...buildRichMeta(fullSave),
    });

    // Lista save'ów po stronie klienta (localStorage) - server-side no-op.
    FullGameSaveManager.addToSavesList(fullSave);

    console.log(
      `✅ Zapisano save lokalnie: ${fullSave.name} (${FullGameSaveManager.formatSize(saveSize)})`
    );

    logSave(200, 'success', {
      meta: {
        sizeBytes: saveSize,
        imageCount: fullSave.sessionMetadata.imageCount,
      },
    });

    return NextResponse.json({
      success: true,
      saveId: fullSave.id,
      saveName: fullSave.name,
      size: saveSize,
      formattedSize: FullGameSaveManager.formatSize(saveSize),
      gcsPath: localPath, // pole zachowane dla kompatybilności klienta (ścieżka lokalna)
      messageCount: fullSave.sessionMetadata.messageCount,
      imageCount: fullSave.sessionMetadata.imageCount,
      createdAt: fullSave.createdAt,
    });
  } catch (error) {
    console.error("❌ Błąd podczas zapisywania save'u:", error);
    logSave(500, 'error', {
      errorMsg: error instanceof Error ? error.message : 'Nieznany błąd',
    });
    return NextResponse.json(
      {
        error: "Nie udało się zapisać save'u",
        details: error instanceof Error ? error.message : 'Nieznany błąd',
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Pobierz save lub listę save'ów
 * Query params: saveId, userId (domyślnie 'local'), list=true
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const saveId = searchParams.get('saveId');
    const userId = await resolveUserId(searchParams.get('userId') || 'local');
    const listOnly = searchParams.get('list') === 'true';

    // Lista save'ów (czyta lekkie meta.json, bez parsowania pełnych save'ów)
    if (listOnly || !saveId) {
      const userDir = path.join(SAVES_ROOT, sanitizeId(userId, 'userId'));
      if (!fs.existsSync(userDir)) {
        return NextResponse.json({ success: true, saves: [], count: 0 });
      }

      const saves: SaveMeta[] = [];
      for (const entry of fs.readdirSync(userDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const metaPath = path.join(userDir, entry.name, 'meta.json');
        const savePath = path.join(userDir, entry.name, 'save.json');
        try {
          if (fs.existsSync(metaPath)) {
            saves.push(
              JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as SaveMeta
            );
          } else if (fs.existsSync(savePath)) {
            // Fallback: brak meta.json - odtwórz z save.json
            const fullSave = FullGameSaveManager.decompressSave(
              fs.readFileSync(savePath, 'utf-8')
            );
            if (fullSave) {
              const size = FullGameSaveManager.getSaveSize(fullSave);
              saves.push({
                id: fullSave.id,
                name: fullSave.name,
                createdAt: fullSave.createdAt,
                lastUpdated: fullSave.lastUpdated || fullSave.createdAt,
                userId: fullSave.userId,
                messageCount: fullSave.sessionMetadata.messageCount,
                imageCount: fullSave.sessionMetadata.imageCount,
                size,
                formattedSize: FullGameSaveManager.formatSize(size),
                localPath: savePath,
                ...buildRichMeta(fullSave),
              });
            }
          }
        } catch (e) {
          console.warn(`⚠️ Pomijam uszkodzony save: ${entry.name}`, e);
        }
      }

      saves.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      );

      return NextResponse.json({ success: true, saves, count: saves.length });
    }

    // Pojedynczy save
    const savePath = path.join(getSaveDir(userId, saveId), 'save.json');
    if (!fs.existsSync(savePath)) {
      return NextResponse.json(
        { error: 'Save nie został znaleziony' },
        { status: 404 }
      );
    }

    const fullSave = FullGameSaveManager.decompressSave(
      fs.readFileSync(savePath, 'utf-8')
    );
    if (!fullSave) {
      return NextResponse.json(
        { error: "Nie udało się odczytać save'u" },
        { status: 500 }
      );
    }

    console.log(`✅ Wczytano save: ${fullSave.name}`);
    return NextResponse.json({ success: true, save: fullSave });
  } catch (error) {
    console.error("❌ Błąd podczas pobierania save'u:", error);
    return NextResponse.json(
      {
        error: "Nie udało się pobrać save'u",
        details: error instanceof Error ? error.message : 'Nieznany błąd',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Usuń save (cały folder save'u)
 * Query params: saveId, userId
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const saveId = searchParams.get('saveId');
    const userId = await resolveUserId(searchParams.get('userId') || 'local');

    if (!saveId) {
      return NextResponse.json(
        { error: "ID save'u jest wymagane" },
        { status: 400 }
      );
    }

    const dir = getSaveDir(userId, saveId);
    let deleted = false;
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      deleted = true;
    }

    FullGameSaveManager.removeFromSavesList(saveId);

    console.log(`✅ Usunięto save: ${saveId}`);
    return NextResponse.json({
      success: true,
      message: deleted ? 'Save został usunięty' : 'Save nie istniał',
    });
  } catch (error) {
    console.error("❌ Błąd podczas usuwania save'u:", error);
    return NextResponse.json(
      {
        error: "Nie udało się usunąć save'u",
        details: error instanceof Error ? error.message : 'Nieznany błąd',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT - Aktualizuj istniejący save
 */
export async function PUT(request: NextRequest) {
  try {
    const { saveId, userId, ...updateData } = await request.json();

    if (!saveId) {
      return NextResponse.json(
        { error: "ID save'u jest wymagane" },
        { status: 400 }
      );
    }

    const userIdStr = await resolveUserId(userId || 'local');
    const dir = getSaveDir(userIdStr, saveId);
    const savePath = path.join(dir, 'save.json');

    if (!fs.existsSync(savePath)) {
      return NextResponse.json(
        { error: 'Save nie został znaleziony' },
        { status: 404 }
      );
    }

    const fullSave = FullGameSaveManager.decompressSave(
      fs.readFileSync(savePath, 'utf-8')
    );
    if (!fullSave) {
      return NextResponse.json(
        { error: "Nie udało się odczytać save'u" },
        { status: 500 }
      );
    }

    const updatedSave = {
      ...fullSave,
      ...updateData,
      lastUpdated: new Date().toISOString(),
    };

    fs.writeFileSync(
      savePath,
      FullGameSaveManager.compressSave(updatedSave),
      'utf-8'
    );

    const saveSize = FullGameSaveManager.getSaveSize(updatedSave);
    writeMeta(dir, {
      id: updatedSave.id,
      name: updatedSave.name,
      createdAt: updatedSave.createdAt,
      lastUpdated: updatedSave.lastUpdated,
      userId: updatedSave.userId,
      messageCount: updatedSave.sessionMetadata.messageCount,
      imageCount: updatedSave.sessionMetadata.imageCount,
      size: saveSize,
      formattedSize: FullGameSaveManager.formatSize(saveSize),
      localPath: path.join('data', 'saves', userIdStr, saveId, 'save.json'),
      ...buildRichMeta(updatedSave),
    });

    console.log(`✅ Zaktualizowano save: ${updatedSave.name}`);
    return NextResponse.json({
      success: true,
      saveId: updatedSave.id,
      saveName: updatedSave.name,
      size: saveSize,
      formattedSize: FullGameSaveManager.formatSize(saveSize),
      lastUpdated: updatedSave.lastUpdated,
    });
  } catch (error) {
    console.error("❌ Błąd podczas aktualizacji save'u:", error);
    return NextResponse.json(
      {
        error: "Nie udało się zaktualizować save'u",
        details: error instanceof Error ? error.message : 'Nieznany błąd',
      },
      { status: 500 }
    );
  }
}
