import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { uploadTextFileToGemini } from '@/lib/gemini-file-service';
import { getWritableDataDir } from '@/lib/paths';

// WERSJA LOKALNA (zew-app-local): instrukcje MG zapisywane na dysk
// (data/gm-instructions/) zamiast Google Cloud Storage. Treść pliku i tak wraca
// w polu `content` (klient zapisuje ją w localStorage jako mainPrompt - źródło
// prawdy). Upload do Gemini File API (geminiFileUri) zachowany - to NIE GCS,
// tylko warstwa potrzebna by prompt MG trafił do modelu.
const GM_INSTRUCTIONS_DIR = path.join(getWritableDataDir(), 'gm-instructions');

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(0, 128) || 'prompt.md';
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'Plik jest wymagany' },
        { status: 400 }
      );
    }

    const fileName = file.name.toLowerCase();
    if (
      !fileName.endsWith('.md') &&
      !fileName.endsWith('.markdown') &&
      !fileName.endsWith('.txt')
    ) {
      return NextResponse.json(
        { error: 'Tylko pliki .md, .markdown lub .txt są dozwolone' },
        { status: 400 }
      );
    }

    const fileContent = await file.text();

    // Zapis na dysk lokalny
    const timestamp = Date.now();
    const safeName = sanitizeFileName(file.name);
    const storedName = `${timestamp}_${safeName}`;
    fs.mkdirSync(GM_INSTRUCTIONS_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(GM_INSTRUCTIONS_DIR, storedName),
      fileContent,
      'utf-8'
    );
    const localPath = path.join('data', 'gm-instructions', storedName);

    console.log(`✅ Zapisano instrukcje MG lokalnie: ${storedName}`);

    // Upload do Gemini File API (jak PDF) - zachowane, to nie GCS
    let geminiFileUri: string | undefined;
    try {
      geminiFileUri = await uploadTextFileToGemini(
        fileContent,
        file.name,
        'text/markdown'
      );
      console.log(
        `✅ Instrukcje MG wgrane do Gemini File API: ${geminiFileUri}`
      );
    } catch (geminiError) {
      console.error(
        '⚠️ Nie udało się wgrać do Gemini File API (kontynuuję):',
        geminiError
      );
    }

    return NextResponse.json({
      success: true,
      url: localPath, // ścieżka lokalna (kompatybilność; treść w `content`)
      fileName: file.name,
      size: file.size,
      gcsPath: localPath,
      uploadType: type || 'gm-instructions',
      geminiFileUri,
      content: fileContent, // źródło prawdy - klient zapisuje w localStorage mainPrompt
    });
  } catch (error) {
    console.error('❌ Błąd podczas uploadu pliku:', error);
    return NextResponse.json(
      {
        error: 'Nie udało się wgrać pliku',
        details: error instanceof Error ? error.message : 'Nieznany błąd',
      },
      { status: 500 }
    );
  }
}

// GET - lista wgranych plików instrukcji MG (z dysku)
export async function GET(_request: NextRequest) {
  try {
    if (!fs.existsSync(GM_INSTRUCTIONS_DIR)) {
      return NextResponse.json({ success: true, files: [] });
    }

    const files = fs.readdirSync(GM_INSTRUCTIONS_DIR).map((name) => {
      const stat = fs.statSync(path.join(GM_INSTRUCTIONS_DIR, name));
      return {
        name: path.join('data', 'gm-instructions', name),
        size: stat.size,
        created: stat.birthtime.toISOString(),
        url: path.join('data', 'gm-instructions', name),
      };
    });

    return NextResponse.json({ success: true, files });
  } catch (error) {
    console.error('Błąd podczas pobierania listy plików:', error);
    return NextResponse.json(
      { error: 'Nie udało się pobrać listy plików' },
      { status: 500 }
    );
  }
}

// DELETE - usuń plik instrukcji MG (z dysku)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('filePath');

    if (!filePath) {
      return NextResponse.json(
        { error: 'Ścieżka do pliku jest wymagana' },
        { status: 400 }
      );
    }

    // Bierzemy tylko nazwę pliku - blokada path traversal
    const baseName = path.basename(filePath);
    const target = path.join(GM_INSTRUCTIONS_DIR, baseName);

    if (fs.existsSync(target)) {
      fs.rmSync(target, { force: true });
    }

    return NextResponse.json({
      success: true,
      message: 'Plik został usunięty',
    });
  } catch (error) {
    console.error('Błąd podczas usuwania pliku:', error);
    return NextResponse.json(
      { error: 'Nie udało się usunąć pliku' },
      { status: 500 }
    );
  }
}
