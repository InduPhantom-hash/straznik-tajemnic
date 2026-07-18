import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DESKTOP_LAUNCHER_FLAG = 'STRAZNIK_DESKTOP_COLD_START';

export function GET() {
  return NextResponse.json({
    available: process.env[DESKTOP_LAUNCHER_FLAG] === '1',
  });
}

export async function POST(request: Request) {
  if (process.env[DESKTOP_LAUNCHER_FLAG] !== '1') {
    return NextResponse.json(
      {
        message:
          'Pełny zimny start jest dostępny tylko w aplikacji uruchomionej przez launcher.',
      },
      { status: 409 }
    );
  }

  const requestOrigin = new URL(request.url).origin;
  if (request.headers.get('origin') !== requestOrigin) {
    return NextResponse.json(
      { message: 'Polecenie zimnego startu zostało odrzucone.' },
      { status: 403 }
    );
  }

  try {
    // Serwer uruchamia się w podkatalogu _tester/_base/.silnik, a launcher nasłuchuje w głównym repozytorium.
    // Cofamy się o 3 poziomy w górę, aby zapisać flagę w głównym katalogu `.desktop` projektu.
    const projectRoot = path.resolve(process.cwd(), '../../..');
    const runtimeDirectory = path.join(projectRoot, '.desktop');
    await mkdir(runtimeDirectory, { recursive: true });
    await writeFile(
      path.join(runtimeDirectory, 'cold-start-requested'),
      new Date().toISOString(),
      'utf8'
    );

    return NextResponse.json(
      { message: 'Launcher przyjął polecenie zimnego startu.' },
      { status: 202 }
    );
  } catch (error) {
    console.error('Nie udało się zapisać sygnału zimnego startu:', error);
    return NextResponse.json(
      { message: 'Nie udało się przekazać polecenia do launchera.' },
      { status: 500 }
    );
  }
}
