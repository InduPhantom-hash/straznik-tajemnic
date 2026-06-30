import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { generateTraceId, startTimer, logApiEvent } from '@/lib/telemetry';
import { getWritableDataDir } from '@/lib/paths';

// WERSJA LOKALNA (zew-app-local): obrazy save'ów trzymane na dysku OBOK save.json
// w data/saves/{userId}/{saveId}/images/ (getWritableDataDir - zapisywalny także
// w zainstalowanej apce, gdzie public/ bywa read-only). Serwowane przez API route
// /api/game-save/image (data/ nie jest serwowane statycznie przez Next).
const SAVES_ROOT = path.join(getWritableDataDir(), 'saves');

function sanitizeId(id: string, label: string): string {
  if (!id || typeof id !== 'string') throw new Error(`Nieprawidłowy ${label}`);
  const trimmed = id.trim();
  if (!/^[a-zA-Z0-9-_.]+$/.test(trimmed)) {
    throw new Error(`${label} zawiera niedozwolone znaki`);
  }
  if (trimmed.length > 128) throw new Error(`${label} jest zbyt długi`);
  return trimmed;
}

function imagesDir(userId: string, saveId: string): string {
  return path.join(
    SAVES_ROOT,
    sanitizeId(userId, 'userId'),
    sanitizeId(saveId, 'saveId'),
    'images'
  );
}

function publicUrl(userId: string, saveId: string, fileName: string): string {
  return `/api/game-save/image?userId=${encodeURIComponent(userId)}&saveId=${encodeURIComponent(saveId)}&file=${encodeURIComponent(fileName)}`;
}

/**
 * POST - Zapisz obrazy save'u na dysk lokalny
 * Query: saveId, userId. Body: FormData z plikami 'images' + opcjonalne 'metadata'.
 */
export async function POST(request: NextRequest) {
  // IND-257: telemetria uploadu obrazów save'u (storage I/O, costUsd 0).
  const traceId = generateTraceId();
  const timer = startTimer();
  const logUpload = (
    status: number,
    result: 'success' | 'error',
    opts: { errorMsg?: string; imageCount?: number } = {}
  ) =>
    logApiEvent({
      traceId,
      endpoint: '/api/game-save/upload-images',
      provider: 'storage',
      status,
      durationMs: timer.elapsed(),
      result,
      costUsd: 0,
      errorMsg: opts.errorMsg,
      meta:
        opts.imageCount != null ? { imageCount: opts.imageCount } : undefined,
    }).catch(() => {});

  try {
    const { searchParams } = new URL(request.url);
    const saveId = searchParams.get('saveId');
    const userId = searchParams.get('userId') || 'local';

    if (!saveId) {
      return NextResponse.json(
        { error: "ID save'u jest wymagane" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('images') as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'Brak plików do uploadu' },
        { status: 400 }
      );
    }

    const dir = imagesDir(userId, saveId);
    fs.mkdirSync(dir, { recursive: true });

    const uploadedImages: Array<{
      id: string;
      url: string;
      gcsPath: string;
      originalName: string;
      size: number;
    }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const imageId = `img_${i}_${file.name.replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 32) || 'image'}`;
      const extension = (file.name.split('.').pop() || 'png').replace(
        /[^a-zA-Z0-9]/g,
        ''
      );
      const fileName = `${imageId}.${extension}`;

      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(path.join(dir, fileName), buffer);

      uploadedImages.push({
        id: imageId,
        url: publicUrl(userId, saveId, fileName),
        gcsPath: publicUrl(userId, saveId, fileName),
        originalName: file.name,
        size: file.size,
      });
    }

    console.log(
      `✅ Zapisano ${uploadedImages.length} obrazów save'u na dysk: ${saveId}`
    );
    logUpload(200, 'success', { imageCount: uploadedImages.length });
    return NextResponse.json({
      success: true,
      images: uploadedImages,
      count: uploadedImages.length,
    });
  } catch (error) {
    console.error('❌ Błąd podczas zapisu obrazów:', error);
    logUpload(500, 'error', {
      errorMsg: error instanceof Error ? error.message : 'Nieznany błąd',
    });
    return NextResponse.json(
      {
        error: 'Nie udało się zapisać obrazów',
        details: error instanceof Error ? error.message : 'Nieznany błąd',
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Lista obrazów save'u (z dysku)
 * Query: saveId, userId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const saveId = searchParams.get('saveId');
    const userId = searchParams.get('userId') || 'local';

    if (!saveId) {
      return NextResponse.json(
        { error: "ID save'u jest wymagane" },
        { status: 400 }
      );
    }

    const dir = imagesDir(userId, saveId);
    if (!fs.existsSync(dir)) {
      return NextResponse.json({ success: true, images: [], count: 0 });
    }

    const images = fs.readdirSync(dir).map((fileName) => {
      const stat = fs.statSync(path.join(dir, fileName));
      return {
        id: fileName.replace(/\.[^.]+$/, ''),
        url: publicUrl(userId, saveId, fileName),
        gcsPath: publicUrl(userId, saveId, fileName),
        originalName: fileName,
        size: stat.size,
        uploadedAt: stat.mtime.toISOString(),
        type: 'illustration',
        prompt: '',
      };
    });

    return NextResponse.json({ success: true, images, count: images.length });
  } catch (error) {
    console.error('❌ Błąd podczas pobierania listy obrazów:', error);
    return NextResponse.json(
      {
        error: 'Nie udało się pobrać listy obrazów',
        details: error instanceof Error ? error.message : 'Nieznany błąd',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Usuń konkretny obraz save'u
 * Query: imageId, saveId, userId
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId');
    const saveId = searchParams.get('saveId');
    const userId = searchParams.get('userId') || 'local';

    if (!imageId || !saveId) {
      return NextResponse.json(
        { error: "ID obrazu i save'u są wymagane" },
        { status: 400 }
      );
    }

    const dir = imagesDir(userId, saveId);
    let deleted = false;
    if (fs.existsSync(dir)) {
      const safeImageId = sanitizeId(imageId, 'imageId');
      for (const fileName of fs.readdirSync(dir)) {
        if (fileName.startsWith(safeImageId)) {
          fs.rmSync(path.join(dir, fileName), { force: true });
          deleted = true;
        }
      }
    }

    if (!deleted) {
      return NextResponse.json(
        { error: 'Obraz nie został znaleziony' },
        { status: 404 }
      );
    }

    console.log(`✅ Usunięto obraz: ${imageId}`);
    return NextResponse.json({
      success: true,
      message: 'Obraz został usunięty',
    });
  } catch (error) {
    console.error('❌ Błąd podczas usuwania obrazu:', error);
    return NextResponse.json(
      {
        error: 'Nie udało się usunąć obrazu',
        details: error instanceof Error ? error.message : 'Nieznany błąd',
      },
      { status: 500 }
    );
  }
}
