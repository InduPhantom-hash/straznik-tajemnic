/**
 * GET /api/game-save/image - serwuje obraz save'u z katalogu zapisywalnego.
 *
 * Obrazy save'ów leżą w data/saves/{userId}/{saveId}/images/ (getWritableDataDir,
 * zapisywalny także w zainstalowanej apce gdzie public/ bywa read-only). Ten
 * katalog NIE jest serwowany statycznie przez Next, więc obrazy wchodzą przez
 * ten endpoint. Markdown w save.json odwołuje URL
 * `/api/game-save/image?userId=…&saveId=…&file=…`.
 *
 * Bezpieczeństwo: każdy segment ścieżki waliduje `safeSegment` (whitelist znaków +
 * zakaz `..`), a finalna ścieżka MUSI mieścić się w katalogu obrazów (resolve
 * containment) - obrona przed path traversal.
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getWritableDataDir } from '@/lib/paths';

const SAVES_ROOT = path.join(getWritableDataDir(), 'saves');

/** Whitelist znaków + zakaz `..` (path traversal). Zwraca przyciętą wartość lub null. */
function safeSegment(value: string | null): string | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 256) return null;
  if (trimmed.includes('..')) return null;
  if (!/^[a-zA-Z0-9-_.]+$/.test(trimmed)) return null;
  return trimmed;
}

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const userId = safeSegment(searchParams.get('userId') || 'local');
  const saveId = safeSegment(searchParams.get('saveId'));
  const file = safeSegment(searchParams.get('file'));

  if (!userId || !saveId || !file) {
    return NextResponse.json(
      { error: 'Wymagane: userId, saveId, file (bez niedozwolonych znaków)' },
      { status: 400 }
    );
  }

  const imagesDir = path.join(SAVES_ROOT, userId, saveId, 'images');
  const filePath = path.join(imagesDir, file);

  // Containment: finalna ścieżka musi leżeć w katalogu obrazów (anty-traversal).
  const resolvedDir = path.resolve(imagesDir);
  const resolvedFile = path.resolve(filePath);
  if (
    resolvedFile !== resolvedDir &&
    !resolvedFile.startsWith(resolvedDir + path.sep)
  ) {
    return NextResponse.json(
      { error: 'Niedozwolona ścieżka' },
      { status: 400 }
    );
  }

  if (!fs.existsSync(resolvedFile) || !fs.statSync(resolvedFile).isFile()) {
    return NextResponse.json({ error: 'Obraz nie istnieje' }, { status: 404 });
  }

  const ext = (file.split('.').pop() || '').toLowerCase();
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
  const data = fs.readFileSync(resolvedFile);

  // Nazwa pliku jest deterministyczna per (saveId, ref) - treść się nie zmienia.
  return new NextResponse(new Uint8Array(data), {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
